"""
Session Middleware

Resolves the user's active VyOS instance and injects it into request state.
This middleware runs after AuthenticationMiddleware and makes the active
instance available to all route handlers.
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import asyncpg
from typing import Optional


class SessionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to resolve active VyOS instance for authenticated users.

    After authentication, this middleware:
    1. Checks if user has an active session
    2. Loads instance details from database
    3. Injects instance info into request.state

    Protected routes can then access request.state.instance to know
    which VyOS device the user is currently managing.
    """

    # Endpoints that should NOT update activity timestamp
    # These are background polling endpoints - not real user activity
    POLLING_ENDPOINTS = {
        "/vyos/config/diff",
        "/vyos/config/snapshots",
        "/session/current",
        "/vyos/power/status",
    }

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        """Process the request and resolve active instance."""

        # Skip session resolution for public routes
        path = request.url.path
        public_paths = [
            "/",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]

        # Skip for session management endpoints (they handle their own lookups)
        if path.startswith("/session"):
            return await call_next(request)

        if path in public_paths or path.startswith("/docs"):
            return await call_next(request)

        # Only resolve session for authenticated users
        if not hasattr(request.state, "user") or not request.state.user:
            # No user - authentication middleware will handle this
            return await call_next(request)

        # Get user ID
        user_id = request.state.user["id"]

        # Get database pool from app state
        db_pool: Optional[asyncpg.Pool] = getattr(request.app.state, "db_pool", None)

        if not db_pool:
            # Database not available - continue without instance resolution
            request.state.instance = None
            request.state.site = None
            return await call_next(request)

        try:
            # Get current auth session token from cookie
            cookie_token = request.cookies.get("better-auth.session_token")
            # Extract session ID (everything before the first dot)
            current_session_token = cookie_token.split(".")[0] if cookie_token else None

            async with db_pool.acquire() as conn:
                # Look up active session with instance and site details
                # Uses new RBAC system (user_instance_roles)
                session = await conn.fetchrow(
                    """
                    SELECT
                        a."instanceId" as instance_id,
                        a."sessionToken" as session_token,
                        i.name as instance_name,
                        i.host,
                        i.port,
                        i.username,
                        i.password,
                        i."apiKey" as api_key,
                        i."isActive" as is_active,
                        i."siteId" as site_id,
                        i."vyosVersion" as vyos_version,
                        i.protocol,
                        i."verifySsl" as verify_ssl,
                        s.name as site_name,
                        uir."builtInRole" as user_role
                    FROM active_sessions a
                    JOIN instances i ON a."instanceId" = i.id
                    JOIN sites s ON i."siteId" = s.id
                    JOIN user_instance_roles uir ON i.id = uir."instanceId" AND uir."userId" = $1
                    WHERE a."userId" = $1
                    """,
                    user_id,
                )

                # Check if active session exists but belongs to a different auth session
                # This means the user logged in from a different device
                if session:
                    stored_session_token = session.get("session_token")

                    # If the session tokens don't match, clear the VyOS connection
                    # This forces the user to reconnect to a VyOS instance after logging in from a new device
                    if stored_session_token and current_session_token and stored_session_token != current_session_token:
                        await conn.execute(
                            """
                            DELETE FROM active_sessions
                            WHERE "userId" = $1
                            """,
                            user_id,
                        )
                        # Set session to None to indicate no active VyOS connection
                        session = None
                    else:
                        # Session tokens match - update last activity timestamp
                        # But only if this is NOT a polling endpoint (real user activity only)
                        is_polling = path in self.POLLING_ENDPOINTS

                        if not is_polling:
                            await conn.execute(
                                """
                                UPDATE active_sessions
                                SET "lastActivityAt" = NOW()
                                WHERE "userId" = $1
                                """,
                                user_id,
                            )

                if session:
                    # User has an active session - inject instance details
                    request.state.instance = {
                        "id": session["instance_id"],
                        "name": session["instance_name"],
                        "host": session["host"],
                        "port": session["port"],
                        "username": session["username"],
                        "password": session["password"],  # API key
                        "api_key": session["api_key"],
                        "is_active": session["is_active"],
                        "vyos_version": session.get("vyos_version"),
                        "protocol": session.get("protocol"),
                        "verify_ssl": session.get("verify_ssl"),
                    }
                    request.state.site = {
                        "id": session["site_id"],
                        "name": session["site_name"],
                        "user_role": session["user_role"],
                    }
                else:
                    # No active session
                    request.state.instance = None
                    request.state.site = None

        except Exception as e:
            # Error resolving active session - set to None and continue
            request.state.instance = None
            request.state.site = None

        # Continue with the request
        response = await call_next(request)
        return response


def require_active_instance(request: Request):
    """
    Helper function to require an active instance.

    Use this in route handlers that need an active VyOS instance.

    Example:
        @router.get("/interfaces")
        async def get_interfaces(request: Request):
            instance = require_active_instance(request)
            # Use instance details...
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "No active instance",
                "message": "You must connect to a VyOS instance first. Use POST /session/connect.",
            },
        )

    if not request.state.instance["is_active"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Instance is inactive",
                "message": f"Instance '{request.state.instance['name']}' is currently inactive.",
            },
        )

    return request.state.instance
