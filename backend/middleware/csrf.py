"""
CSRF Protection Middleware

Validates Origin/Referer headers for state-changing requests
to prevent Cross-Site Request Forgery attacks.
"""

import os
from urllib.parse import urlparse
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from utils.logging import get_logger, log_security_event

logger = get_logger(__name__)


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware to protect against CSRF attacks.

    For state-changing requests (POST, PUT, DELETE, PATCH),
    validates that the Origin or Referer header matches
    the allowed origins.

    This complements SameSite cookies and CORS protection.
    """

    # Methods that require CSRF validation
    STATE_CHANGING_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

    # Paths that are exempt from CSRF checks (e.g., public auth endpoints)
    EXEMPT_PATHS = {
        "/",
        "/docs",
        "/openapi.json",
        "/redoc",
    }

    def __init__(self, app):
        super().__init__(app)
        # Get allowed origin from environment
        self.allowed_origin = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.allowed_host = urlparse(self.allowed_origin).netloc

    async def dispatch(self, request: Request, call_next):
        """Validate CSRF for state-changing requests."""

        # Skip for safe methods (GET, HEAD, OPTIONS)
        if request.method not in self.STATE_CHANGING_METHODS:
            return await call_next(request)

        # Skip for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Skip OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Get Origin header (preferred) or Referer header (fallback)
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")

        # Validate origin
        if origin:
            origin_host = urlparse(origin).netloc
            if origin_host != self.allowed_host:
                log_security_event(
                    "csrf_origin_mismatch",
                    details={"origin": origin, "expected": self.allowed_host, "path": request.url.path}
                )
                logger.warning(f"CSRF: Origin mismatch - got {origin_host}, expected {self.allowed_host}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF validation failed: Origin mismatch"}
                )
        elif referer:
            # Fallback to referer if no origin
            referer_host = urlparse(referer).netloc
            if referer_host != self.allowed_host:
                log_security_event(
                    "csrf_referer_mismatch",
                    details={"referer": referer, "expected": self.allowed_host, "path": request.url.path}
                )
                logger.warning(f"CSRF: Referer mismatch - got {referer_host}, expected {self.allowed_host}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF validation failed: Referer mismatch"}
                )
        else:
            # No Origin or Referer - this is suspicious for browser requests
            # But allow it for API clients (curl, etc.) that don't send these headers
            # The authentication middleware will still validate the session
            logger.debug("CSRF: No Origin or Referer header (API client?)")

        return await call_next(request)
