"""
Authentication Middleware

Validates session tokens from better-auth and protects API endpoints.
Integrates with PostgreSQL-based session storage.
"""

import logging
import os
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from datetime import datetime
import asyncpg
from session_cookie import verify_session_cookie

logger = logging.getLogger(__name__)


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate session tokens and protect API endpoints.

    Validates session tokens from better-auth by looking them up in the
    PostgreSQL database. Better-auth uses session tokens (not JWTs).
    """

    # Public endpoints that don't require authentication
    PUBLIC_PATHS = {
        "/",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api/auth/sign-in",
        "/api/auth/sign-up",
        "/api/auth/sign-out",
        "/api/auth/session",
        "/session/onboarding-status",  # Must be public to check if first-time setup is needed
        "/vyos/monitoring/ws/monitor",  # WebSocket auth handled inside handler
        "/vyos/version/check",  # Version check is public
    }

    # Endpoints that should NOT update activity timestamp
    # These are background polling endpoints - not real user activity
    POLLING_ENDPOINTS = {
        "/vyos/config/diff",
        "/vyos/config/snapshots",
        "/session/current",
        "/vyos/power/status",  # Polls for scheduled reboot/poweroff status
        "/vyos/events/banners",  # SSE stream - long-lived connection
    }

    def __init__(self, app):
        super().__init__(app)

    def get_db_pool(self, request: Request) -> asyncpg.Pool:
        """Get database pool from app state."""
        if not hasattr(request.app.state, "db_pool") or request.app.state.db_pool is None:
            raise HTTPException(
                status_code=503,
                detail="Database connection not available"
            )
        return request.app.state.db_pool

    async def dispatch(self, request: Request, call_next):
        """
        Validate authentication for protected endpoints.

        Flow:
        1. Check if path is public (allow without auth)
        2. Extract session token from cookie
        3. Look up session token in database
        4. Verify session is not expired
        5. Attach user info to request state
        """
        # Allow public paths
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        # Allow OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Extract session token from cookie
        session_token = request.cookies.get("better-auth.session_token")
        session_token2 = request.cookies.get("__Secure-better-auth.session_token")

        if not session_token and not session_token2:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. No session token provided."
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_to_use = session_token if session_token else session_token2

        try:
            # Better-auth uses signed session cookies: {session_id}.{base64(HMAC-SHA256)}
            # Verify the signature and extract the session ID
            token_id = verify_session_cookie(token_to_use)
            if not token_id:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid session token"},
                    headers={"WWW-Authenticate": "Bearer"},
                )

            logger.debug("Validating session token")

            # Validate session in database
            db_pool = self.get_db_pool(request)
            async with db_pool.acquire() as conn:
                session = await conn.fetchrow(
                    """
                    SELECT s.id, s."userId", s."expiresAt", s.token, u.email, u.name, u.role, u."isDemo"  -- DEMO: u.role and u."isDemo" added for org resolution
                    FROM sessions s
                    JOIN users u ON s."userId" = u.id
                    WHERE s.token = $1
                    """,
                    token_id
                )

                if session:
                    logger.debug("Session found")
                else:
                    logger.debug("Session not found")

                if not session:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Session not found or expired"}
                    )

                # Check if session is expired
                expires_at = session["expiresAt"]
                now = datetime.utcnow()

                if expires_at < now:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Session expired. Please log in again."}
                    )

                # Update last activity timestamp for inactivity timeout
                # But only if this is NOT a polling endpoint (real user activity only)
                is_polling = request.url.path in self.POLLING_ENDPOINTS

                if not is_polling:
                    await conn.execute(
                        """
                        UPDATE sessions
                        SET "lastActivityAt" = NOW()
                        WHERE token = $1
                        """,
                        token_id
                    )
                    logger.debug("Activity timestamp updated (user action)")
                else:
                    logger.debug("Activity timestamp not updated (polling)")

                # Attach user information to request state
                request.state.user_id = session["userId"]
                request.state.session_id = session["id"]
                request.state.user_email = session["email"]
                request.state.user_name = session["name"]
                request.state.user_role = session["role"]  # DEMO: user_role added for org/demo
                request.state.user = {
                    "id": session["userId"],
                    "email": session["email"],
                    "name": session["name"],
                    "role": session["role"],  # DEMO: role added for org/demo
                }

                # DEMO: Resolve current organization from X-Org-Id header (see DEMO.md for removal)
                is_demo_user = session["isDemo"]
                org_id = request.headers.get("X-Org-Id")

                if is_demo_user:
                    # Demo users are locked to their own org - ignore X-Org-Id header
                    request.state.org_id = await conn.fetchval(
                        'SELECT "orgId" FROM org_members WHERE "userId" = $1 LIMIT 1',
                        session["userId"]
                    )
                elif org_id:
                    # Verify user has access to this org
                    if session["role"] == "ADMIN":
                        # Site admins can access any org
                        org_exists = await conn.fetchval(
                            'SELECT EXISTS(SELECT 1 FROM organizations WHERE id = $1)',
                            org_id
                        )
                        request.state.org_id = org_id if org_exists else None
                    else:
                        has_access = await conn.fetchval(
                            'SELECT EXISTS(SELECT 1 FROM org_members WHERE "orgId" = $1 AND "userId" = $2)',
                            org_id, session["userId"]
                        )
                        request.state.org_id = org_id if has_access else None
                else:
                    # Fall back to user's first org
                    default_org = await conn.fetchval(
                        'SELECT "orgId" FROM org_members WHERE "userId" = $1 ORDER BY "createdAt" LIMIT 1',
                        session["userId"]
                    )
                    request.state.org_id = default_org
                # DEMO: End org resolution block

        except HTTPException as e:
            # Pass through HTTPException (from get_db_pool)
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            # Log error but don't expose internal details to client
            # In production, use proper logging (e.g., structlog, python logging)
            logger.warning("Authentication error: %s", type(e).__name__)
            return JSONResponse(
                status_code=500,
                content={"detail": "Authentication validation failed"}
            )

        # Proceed with request
        response = await call_next(request)
        return response


def get_current_user(request: Request) -> dict:
    """
    Dependency to get current user from request state.

    Usage in endpoints:
        @router.get("/protected")
        async def protected_endpoint(request: Request):
            user = get_current_user(request)
            return {"user_id": user["id"], "email": user["email"]}

    Returns:
        dict with user_id, session_id, email, name
    """
    if not hasattr(request.state, "user_id"):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    return {
        "id": request.state.user_id,
        "session_id": request.state.session_id,
        "email": request.state.user_email,
        "name": request.state.user_name,
    }
