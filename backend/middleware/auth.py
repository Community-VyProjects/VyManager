"""
Authentication Middleware

Validates session tokens from better-auth and protects API endpoints.
Integrates with PostgreSQL-based session storage.
"""

import os
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from datetime import datetime
import asyncpg


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
    }

    # Endpoints that should NOT update activity timestamp
    # These are background polling endpoints - not real user activity
    POLLING_ENDPOINTS = {
        "/vyos/config/diff",
        "/vyos/config/snapshots",
        "/session/current",
        "/vyos/power/status",  # Polls for scheduled reboot/poweroff status
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

        if not session_token:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. No session token provided."
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            # Better-auth uses session tokens (not JWTs)
            # The cookie contains: token.signature, but database only stores token
            # Extract the token part (before the first dot)
            token_parts = session_token.split('.')
            token_id = token_parts[0] if len(token_parts) > 0 else session_token

            print("[AuthMiddleware] Validating session token")

            # Validate session in database
            db_pool = self.get_db_pool(request)
            async with db_pool.acquire() as conn:
                session = await conn.fetchrow(
                    """
                    SELECT s.id, s."userId", s."expiresAt", s.token, u.email, u.name
                    FROM sessions s
                    JOIN users u ON s."userId" = u.id
                    WHERE s.token = $1
                    """,
                    token_id
                )

                if session:
                    print("[AuthMiddleware] ✓ Session found")
                else:
                    print("[AuthMiddleware] ✗ Session not found")

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
                    print("[AuthMiddleware] ✓ Activity timestamp updated (user action)")
                else:
                    print("[AuthMiddleware] ✓ Activity timestamp not updated (polling)")

                # Attach user information to request state
                request.state.user_id = session["userId"]
                request.state.session_id = session["id"]
                request.state.user_email = session["email"]
                request.state.user_name = session["name"]
                request.state.user = {
                    "id": session["userId"],
                    "email": session["email"],
                    "name": session["name"]
                }

        except HTTPException as e:
            # Pass through HTTPException (from get_db_pool)
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            # Log error but don't expose internal details to client
            # In production, use proper logging (e.g., structlog, python logging)
            print(f"Authentication error: {type(e).__name__}: {str(e)}")
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
