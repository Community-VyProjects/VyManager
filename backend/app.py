import urllib3
urllib3.disable_warnings()

import os
import asyncpg
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from middleware.auth import AuthenticationMiddleware
from middleware.session import SessionMiddleware

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

    print(f"\n🧹 Session cleanup task started (timeout: {SESSION_INACTIVITY_TIMEOUT}min, interval: {CLEANUP_INTERVAL}min)")

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
                    print(f"[SessionCleanup] Removed {len(vyos_sessions)} inactive VyOS instance session(s):")
                    for row in vyos_sessions:
                        inactive_duration = datetime.utcnow() - row["lastActivityAt"]
                        print(f"  - VyOS: User {row['userId']} (inactive for {inactive_duration})")

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
                    print(f"[SessionCleanup] Removed {len(auth_sessions)} inactive authentication session(s):")
                    for row in auth_sessions:
                        inactive_duration = datetime.utcnow() - row["lastActivityAt"]
                        print(f"  - Auth: User {row['userId']} (inactive for {inactive_duration}) - LOGGED OUT")

        except asyncio.CancelledError:
            print("[SessionCleanup] Cleanup task cancelled")
            break
        except Exception as e:
            print(f"[SessionCleanup] Error during cleanup: {e}")
            # Continue running despite errors


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan event handler.
    Manages database connections and application startup/shutdown.
    """
    global db_pool, cleanup_task

    # Startup
    print("\n" + "=" * 60)
    print("🚀 Starting VyManager API (Multi-Instance Architecture)")
    print("=" * 60)

    # Initialize database connection pool
    print("\n📦 Initializing database connection...")
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
        print("  ✓ Database connection pool created")
        print("  ✓ Authentication middleware enabled")
        print("  ✓ Session middleware enabled")
    except Exception as e:
        print(f"  ✗ Failed to create database connection pool: {e}")
        print("  ⚠ API will start but authentication will fail")
        app.state.db_pool = None

    # Start background cleanup task
    if db_pool:
        cleanup_task = asyncio.create_task(cleanup_inactive_sessions())
        print(f"  ✓ Session cleanup task started")
    else:
        print("  ⚠ Session cleanup task not started (no database)")

    print("\n" + "=" * 60)
    print("✓ API Ready")
    print("=" * 60)
    print("\nVyOS instances are managed through the database.")
    print("Users connect to instances via the web UI (/sites page).\n")

    # Yield control to the application
    yield

    # Shutdown
    print("\n🛑 Shutting down VyManager API...")

    # Stop cleanup task
    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        print("  ✓ Session cleanup task stopped")

    # Close database connection pool
    if hasattr(app.state, "db_pool") and app.state.db_pool:
        await app.state.db_pool.close()
        app.state.db_pool = None
        print("  ✓ Database connection pool closed")

    print("✓ Shutdown complete\n")


app = FastAPI(
    title="VyOS Management API",
    version="1.0.0",
    description="FastAPI backend for managing VyOS devices with version-aware commands",
    lifespan=lifespan,
)

# ============================================================================
# Middleware Configuration
# ============================================================================

# CORS Middleware - Must be added BEFORE authentication middleware
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Session Middleware - Resolves active VyOS instance for authenticated users
# Added FIRST but runs SECOND (middleware executes in reverse order)
app.add_middleware(SessionMiddleware)

# Authentication Middleware - Validates session tokens
# Added SECOND but runs FIRST (middleware executes in reverse order)
# The middleware will get db_pool from app.state when processing requests
app.add_middleware(AuthenticationMiddleware)


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
