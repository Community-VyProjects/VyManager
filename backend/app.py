import urllib3
urllib3.disable_warnings()

import os
import asyncpg
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from middleware.auth import AuthenticationMiddleware
from middleware.session import SessionMiddleware
from middleware.csrf import CSRFMiddleware
from utils.logging import get_logger

logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Import routers
from routers.session import session as session_router
from routers.interfaces import ethernet, dummy
from routers.firewall import groups
from routers.firewall import ipv4 as firewall_ipv4
from routers.firewall import ipv6 as firewall_ipv6
from routers.nat import nat
from routers.dhcp import dhcp
from routers.static_routes import static_routes
from routers.route_map import route_map
from routers.access_list import access_list
from routers.prefix_list import prefix_list
from routers.local_route import local_route
from routers.route import route
from routers.as_path_list import as_path_list
from routers.community_list import community_list
from routers.extcommunity_list import extcommunity_list
from routers.large_community_list import large_community_list
from routers import system
from routers import power as power_router
from routers.config import config as config_router
from routers import show as show_router
from routers import dashboard as dashboard_router

# Global variables
db_pool: Optional[asyncpg.Pool] = None
cleanup_task: Optional[asyncio.Task] = None

# Configuration
SESSION_INACTIVITY_TIMEOUT = int(os.getenv("SESSION_INACTIVITY_TIMEOUT", "30"))  # Minutes
CLEANUP_INTERVAL = int(os.getenv("SESSION_CLEANUP_INTERVAL", "5"))  # Minutes


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Headers added:
    - X-Content-Type-Options: Prevents MIME-type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Enables XSS filtering
    - Strict-Transport-Security: Enforces HTTPS
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Restricts browser features
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # HSTS only in production (when HTTPS is used)
        if os.getenv("ENABLE_HSTS", "false").lower() == "true":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


async def cleanup_inactive_sessions():
    """
    Background task to clean up inactive sessions.

    Cleans up two types of sessions:
    1. VyOS instance sessions (active_sessions table)
    2. Authentication sessions (sessions table)

    Runs periodically and removes sessions that have been inactive
    for longer than SESSION_INACTIVITY_TIMEOUT minutes.
    """
    global db_pool

    logger.info(f"Session cleanup task started (timeout: {SESSION_INACTIVITY_TIMEOUT}min, interval: {CLEANUP_INTERVAL}min)")

    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL * 60)  # Convert minutes to seconds

            if not db_pool:
                continue

            cutoff_time = datetime.utcnow() - timedelta(minutes=SESSION_INACTIVITY_TIMEOUT)

            async with db_pool.acquire() as conn:
                # 1. Clean up inactive VyOS instance sessions
                vyos_sessions = await conn.fetch(
                    """
                    DELETE FROM active_sessions
                    WHERE "lastActivityAt" < $1
                    RETURNING "userId", "instanceId", "lastActivityAt"
                    """,
                    cutoff_time
                )

                if vyos_sessions:
                    logger.info(f"Removed {len(vyos_sessions)} inactive VyOS instance session(s)")
                    for row in vyos_sessions:
                        inactive_duration = datetime.utcnow() - row["lastActivityAt"]
                        logger.debug(f"VyOS session cleanup: User {row['userId']} (inactive for {inactive_duration})")

                # 2. Clean up inactive authentication sessions (logs user out completely)
                auth_sessions = await conn.fetch(
                    """
                    DELETE FROM sessions
                    WHERE "lastActivityAt" < $1
                    RETURNING "userId", token, "lastActivityAt"
                    """,
                    cutoff_time
                )

                if auth_sessions:
                    logger.info(f"Removed {len(auth_sessions)} inactive authentication session(s)")
                    for row in auth_sessions:
                        inactive_duration = datetime.utcnow() - row["lastActivityAt"]
                        logger.debug(f"Auth session cleanup: User {row['userId']} (inactive for {inactive_duration})")

        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}")
            # Continue running despite errors


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan event handler.
    Manages database connections and application startup/shutdown.
    """
    global db_pool, cleanup_task

    # Startup
    logger.info("=" * 60)
    logger.info("Starting VyManager API (Multi-Instance Architecture)")
    logger.info("=" * 60)

    # Initialize database connection pool
    logger.info("Initializing database connection...")
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        db_pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        # Store in app state for middleware access
        app.state.db_pool = db_pool
        logger.info("Database connection pool created")
        logger.info("Authentication middleware enabled")
        logger.info("Session middleware enabled")
        logger.info("Security headers middleware enabled")
        logger.info("Rate limiting enabled")
    except Exception as e:
        logger.error(f"Failed to create database connection pool: {e}")
        logger.warning("API will start but authentication will fail")
        app.state.db_pool = None

    # Start background cleanup task
    if db_pool:
        cleanup_task = asyncio.create_task(cleanup_inactive_sessions())
        logger.info("Session cleanup task started")
    else:
        logger.warning("Session cleanup task not started (no database)")

    logger.info("=" * 60)
    logger.info("API Ready")
    logger.info("=" * 60)
    logger.info("VyOS instances are managed through the database.")
    logger.info("Users connect to instances via the web UI (/sites page).")

    # Yield control to the application
    yield

    # Shutdown
    logger.info("Shutting down VyManager API...")

    # Stop cleanup task
    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        logger.info("Session cleanup task stopped")

    # Close database connection pool
    if hasattr(app.state, "db_pool") and app.state.db_pool:
        await app.state.db_pool.close()
        app.state.db_pool = None
        logger.info("Database connection pool closed")

    logger.info("Shutdown complete")


app = FastAPI(
    title="VyOS Management API",
    version="1.0.0",
    description="FastAPI backend for managing VyOS devices with version-aware commands",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================================
# Middleware Configuration
# ============================================================================

# Security Headers Middleware - Adds security headers to all responses
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware - Must be added BEFORE authentication middleware
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Parse allowed headers from environment or use secure defaults
allowed_headers = [
    "Accept",
    "Accept-Language",
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=allowed_headers,
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Session Middleware - Resolves active VyOS instance for authenticated users
app.add_middleware(SessionMiddleware)

# Authentication Middleware - Validates session tokens
app.add_middleware(AuthenticationMiddleware)

# CSRF Middleware - Validates Origin/Referer for state-changing requests
# Runs after authentication to protect authenticated endpoints
app.add_middleware(CSRFMiddleware)


# ============================================================================
# Application Setup
# ============================================================================

# Include routers
app.include_router(session_router.router)
app.include_router(ethernet.router)
app.include_router(dummy.router)
app.include_router(groups.router)
app.include_router(firewall_ipv4.router)
app.include_router(firewall_ipv6.router)
app.include_router(nat.router)
app.include_router(dhcp.router)
app.include_router(static_routes.router)
app.include_router(route_map.router)
app.include_router(access_list.router)
app.include_router(prefix_list.router)
app.include_router(local_route.router)
app.include_router(route.router)
app.include_router(as_path_list.router)
app.include_router(community_list.router)
app.include_router(extcommunity_list.router)
app.include_router(large_community_list.router)
app.include_router(system.router)
app.include_router(power_router.router)
app.include_router(config_router.router)
app.include_router(show_router.router)
app.include_router(dashboard_router.router)


# ============================================================================
# Root Endpoint
# ============================================================================


@app.get("/", tags=["root"])
async def read_root() -> dict:
    """API root endpoint with basic information."""
    return {
        "message": "VyManager API - Multi-Instance VyOS Management",
        "docs": "/docs",
        "supported_versions": ["1.4", "1.5"],
        "architecture": "Multi-Instance (Database-Managed)",
        "features": [
            "ethernet-interface",
            "dummy-interface",
            "firewall-groups",
            "firewall-ipv4",
            "firewall-ipv6",
            "nat",
            "dhcp-server",
            "static-routes",
            "route-map",
            "access-list",
            "prefix-list",
            "bgp-policies"
        ],
    }


# ============================================================================
# Note: All VyOS feature endpoints are in routers/
# Instances are managed through /session endpoints and the database
# ============================================================================
