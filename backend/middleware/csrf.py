"""
CSRF Protection Middleware

Implements the Double Submit Cookie pattern for CSRF protection.
State-changing requests (POST, PUT, DELETE, PATCH) must include
an X-CSRF-Token header that matches the csrf_token cookie.
"""

import os
import secrets
from typing import Set
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware for CSRF protection using Double Submit Cookie pattern.

    How it works:
    1. On any request, if no CSRF token cookie exists, one is created
    2. For state-changing requests (POST, PUT, DELETE, PATCH):
       - Requires X-CSRF-Token header matching the cookie value
       - Returns 403 if header is missing or doesn't match
    3. GET/HEAD/OPTIONS requests don't require CSRF validation

    The frontend should:
    1. Read the csrf_token cookie
    2. Include it as X-CSRF-Token header in all state-changing requests
    """

    # Methods that require CSRF validation
    PROTECTED_METHODS: Set[str] = {"POST", "PUT", "DELETE", "PATCH"}

    # Paths exempt from CSRF protection (e.g., authentication endpoints)
    EXEMPT_PATHS: Set[str] = {
        "/api/auth/sign-in",
        "/api/auth/sign-up",
        "/api/auth/sign-out",
        "/api/auth/session",
        "/api/auth/callback",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/",
    }

    # Path prefixes exempt from CSRF protection
    EXEMPT_PREFIXES: tuple = (
        "/api/auth/",  # All auth endpoints
        "/docs/",
    )

    # Cookie configuration
    COOKIE_NAME = "csrf_token"
    HEADER_NAME = "X-CSRF-Token"
    TOKEN_LENGTH = 32  # 32 bytes = 64 hex characters

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

    def _generate_token(self) -> str:
        """Generate a secure random CSRF token."""
        return secrets.token_hex(self.TOKEN_LENGTH)

    def _is_exempt(self, path: str) -> bool:
        """Check if the path is exempt from CSRF protection."""
        if path in self.EXEMPT_PATHS:
            return True
        for prefix in self.EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return True
        return False

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process the request with CSRF protection."""

        # Skip if CSRF protection is disabled
        if not self.enabled:
            return await call_next(request)

        path = request.url.path
        method = request.method

        # Skip OPTIONS requests (CORS preflight)
        if method == "OPTIONS":
            return await call_next(request)

        # Get or create CSRF token
        csrf_token = request.cookies.get(self.COOKIE_NAME)
        token_was_missing = csrf_token is None

        if token_was_missing:
            csrf_token = self._generate_token()

        # Validate CSRF for protected methods on non-exempt paths
        if method in self.PROTECTED_METHODS and not self._is_exempt(path):
            # Get token from header
            header_token = request.headers.get(self.HEADER_NAME)

            # Check if token is missing
            if not header_token:
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "CSRF token missing. Include X-CSRF-Token header.",
                        "error": "csrf_missing"
                    }
                )

            # Check if token matches
            if not secrets.compare_digest(header_token, csrf_token or ""):
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "CSRF token invalid. Token mismatch.",
                        "error": "csrf_invalid"
                    }
                )

        # Process the request
        response = await call_next(request)

        # Set CSRF cookie if it was missing
        if token_was_missing:
            # Determine if we're in secure context (HTTPS)
            is_secure = request.url.scheme == "https"

            response.set_cookie(
                key=self.COOKIE_NAME,
                value=csrf_token,
                httponly=False,  # Must be readable by JavaScript
                secure=is_secure,
                samesite="strict",
                max_age=86400 * 7,  # 7 days
                path="/",
            )

        return response


def get_csrf_enabled() -> bool:
    """Check if CSRF protection should be enabled."""
    # Enable by default in production, can be disabled for testing
    csrf_enabled = os.getenv("CSRF_ENABLED", "true").lower()
    return csrf_enabled in ("true", "1", "yes")
