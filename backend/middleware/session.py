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

            # Debug logging
            print(f"[SessionMiddleware] User: {user_id}, Current auth token: {current_session_token}")

            async with db_pool.acquire() as conn:
                # Look up active session with instance and site details
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
                        s.name as site_name,
                        p.role as user_role
                    FROM active_sessions a
                    JOIN instances i ON a."instanceId" = i.id
                    JOIN sites s ON i."siteId" = s.id
                    JOIN permissions p ON s.id = p."siteId" AND p."userId" = $1
                    WHERE a."userId" = $1
                    """,
                    user_id,
                )

                # Check if active session exists but belongs to a different auth session
                # This means the user logged in from a different device
                if session:
                    stored_session_token = session.get("session_token")
                    print(f"[SessionMiddleware] Stored VyOS session token: {stored_session_token}")

                    # If the session tokens don't match, clear the VyOS connection
                    # This forces the user to reconnect to a VyOS instance after logging in from a new device
                    if stored_session_token and current_session_token and stored_session_token != current_session_token:
                        print(f"[SessionMiddleware] ⚠️  User {user_id} logged in from new device/session!")
                        print(f"[SessionMiddleware]    Stored token: {stored_session_token}")
                        print(f"[SessionMiddleware]    Current token: {current_session_token}")
                        print(f"[SessionMiddleware]    Clearing VyOS connection...")
                        await conn.execute(
                            """
                            DELETE FROM active_sessions
                            WHERE "userId" = $1
                            """,
                            user_id,
                        )
                        # Set session to None to indicate no active VyOS connection
                        session = None
                        print(f"[SessionMiddleware]    ✓ VyOS connection cleared")
                    elif stored_session_token and current_session_token and stored_session_token == current_session_token:
                        print(f"[SessionMiddleware] ✓ Session tokens match - same device/session")
                    else:
                        print(f"[SessionMiddleware] ⚠️  Missing token data - stored: {stored_session_token}, current: {current_session_token}")

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
            # Log error but don't fail the request
            print(f"[SessionMiddleware] Error resolving active session: {type(e).__name__}: {str(e)}")
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
