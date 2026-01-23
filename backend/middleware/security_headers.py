"""
Security Headers Middleware

Adds security headers to all responses including:
- Content-Security-Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)
"""

import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    These headers help protect against various web vulnerabilities
    including XSS, clickjacking, MIME sniffing, and more.
    """

    def __init__(self, app, enable_hsts: bool = False):
        """
        Initialize the security headers middleware.

        Args:
            app: The ASGI application
            enable_hsts: Whether to enable HSTS (only for HTTPS production)
        """
        super().__init__(app)
        self.enable_hsts = enable_hsts

    async def dispatch(self, request: Request, call_next) -> Response:
        """Add security headers to the response."""

        # Process the request
        response = await call_next(request)

        # X-Content-Type-Options
        # Prevents MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-Frame-Options
        # Prevents clickjacking by disallowing framing
        response.headers["X-Frame-Options"] = "DENY"

        # X-XSS-Protection
        # Legacy XSS protection for older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy
        # Controls how much referrer information is sent
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy
        # Restricts browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )

        # Strict-Transport-Security (HSTS)
        # Only enable in production with HTTPS
        if self.enable_hsts:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Content-Security-Policy
        # This is a relatively permissive CSP suitable for an API
        # For a more restrictive policy, adjust based on your needs
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # May need adjustment for your frontend
            "style-src 'self' 'unsafe-inline'",  # Allow inline styles
            "img-src 'self' data: blob:",  # Allow data URIs and blobs for images
            "font-src 'self'",
            "connect-src 'self'",  # API connections
            "frame-ancestors 'none'",  # Equivalent to X-Frame-Options DENY
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",  # Upgrade HTTP to HTTPS
        ]

        # Only add CSP for non-documentation endpoints
        # Swagger/ReDoc need more permissive CSP
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
            response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Cache-Control for security-sensitive responses
        # Prevent caching of authenticated content
        if request.url.path.startswith("/session") or request.url.path.startswith("/vyos"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response


def get_hsts_enabled() -> bool:
    """Check if HSTS should be enabled based on environment."""
    # Only enable HSTS in production with HTTPS
    hsts_enabled = os.getenv("ENABLE_HSTS", "false").lower()
    return hsts_enabled in ("true", "1", "yes")
