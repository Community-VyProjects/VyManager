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
from session_cookie import get_session_cookie, verify_session_cookie
from api_token_crypto import hash_api_token, looks_like_api_token

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
        "/oauth-config/public",  # Login page lists enabled providers before auth
        "/vyos/monitoring/ws/monitor",  # WebSocket auth handled inside handler
        "/vyos/version/check",  # Version check is public
        "/internal/sso-reconcile",  # Internal shared-secret auth (not a session)
    }

    # Endpoints that authenticate if a session is present but are NOT rejected
    # when it is absent/invalid — the handler decides (e.g. backup restore is
    # allowed for ADMINs, or for anyone when the system has no users yet).
    OPTIONAL_AUTH_PATHS = {
        "/session/restore",
        "/session/restore/preview",
    }

    # Endpoints that should NOT update activity timestamp
    # These are background polling endpoints - not real user activity
    POLLING_ENDPOINTS = {
        "/vyos/config/diff",
        "/vyos/config/snapshot",
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

    async def _authenticate_api_token(self, request: Request, presented: str) -> bool:
        """
        Validate a Personal Access Token and attach its owner to request.state.

        Returns True if the token is valid and identity was attached, False if the
        token is unknown, revoked, or expired. Mirrors the cookie path so that all
        downstream code (RBAC, audit) sees the same request.state.user shape.
        """
        token_hash = hash_api_token(presented)
        db_pool = self.get_db_pool(request)

        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT t.id, t."userId", t.scopes,
                       t."allowedInstanceIds", t."allowedSiteIds",
                       t."expiresAt", t."revokedAt",
                       u.email, u.name
                FROM api_tokens t
                JOIN users u ON t."userId" = u.id
                WHERE t."tokenHash" = $1
                """,
                token_hash,
            )

            if not row:
                return False
            if row["revokedAt"] is not None:
                return False
            if row["expiresAt"] is not None and row["expiresAt"] < datetime.utcnow():
                return False

            await conn.execute(
                'UPDATE api_tokens SET "lastUsedAt" = NOW() WHERE id = $1',
                row["id"],
            )

        # Attach identity identically to the cookie path. There is no browser
        # session, so session_id is None.
        request.state.user_id = row["userId"]
        request.state.session_id = None
        request.state.user_email = row["email"]
        request.state.user_name = row["name"]
        request.state.user = {
            "id": row["userId"],
            "email": row["email"],
            "name": row["name"],
        }
        # Provenance for downstream slices (instance selection, scopes, audit).
        request.state.auth_method = "api_token"
        request.state.api_token_id = row["id"]
        request.state.api_token_scopes = list(row["scopes"] or [])
        request.state.api_token_allowed_instance_ids = list(row["allowedInstanceIds"] or [])
        request.state.api_token_allowed_site_ids = list(row["allowedSiteIds"] or [])
        return True

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

        # Some paths authenticate only if a session is supplied; the handler
        # enforces its own authorization (and may allow anonymous access).
        optional_auth = request.url.path in self.OPTIONAL_AUTH_PATHS

        # Personal Access Token path (non-cookie clients, e.g. the MCP server).
        # An Authorization: Bearer vym_... header authenticates as the token's
        # owner; identity is attached to request.state exactly like a cookie
        # session so RBAC and audit behave identically downstream.
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            presented = auth_header[len("Bearer "):].strip()
            if looks_like_api_token(presented):
                try:
                    authenticated = await self._authenticate_api_token(request, presented)
                except HTTPException as e:
                    return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
                except Exception:
                    logger.warning("API token authentication error")
                    return JSONResponse(
                        status_code=500,
                        content={"detail": "Authentication validation failed"},
                    )
                if not authenticated:
                    if optional_auth:
                        return await call_next(request)
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid or expired API token"},
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                return await call_next(request)
            # A non-vym Bearer credential falls through to cookie handling below.

        # Extract session token from cookie
        session_token = get_session_cookie(request)

        if not session_token:
            if optional_auth:
                return await call_next(request)
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. No session token provided."
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_to_use = session_token

        try:
            # Better-auth uses signed session cookies: {session_id}.{base64(HMAC-SHA256)}
            # Verify the signature and extract the session ID
            token_id = verify_session_cookie(token_to_use)
            if not token_id:
                if optional_auth:
                    return await call_next(request)
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
                    SELECT s.id, s."userId", s."expiresAt", s.token, u.email, u.name
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
                    if optional_auth:
                        return await call_next(request)
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Session not found or expired"}
                    )

                # Check if session is expired
                expires_at = session["expiresAt"]
                now = datetime.utcnow()

                if expires_at < now:
                    if optional_auth:
                        return await call_next(request)
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
