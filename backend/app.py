import urllib3
urllib3.disable_warnings()

from dotenv import load_dotenv
load_dotenv()

import os
import asyncpg
import asyncio
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from middleware.auth import AuthenticationMiddleware
from middleware.session import SessionMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.csrf import CSRFMiddleware, get_csrf_enabled
from middleware.security_headers import SecurityHeadersMiddleware, get_hsts_enabled
from services.cache import cache_service
from services.alert_engine import start_alert_engine, stop_alert_engine

# Import routers
from routers.session import session as session_router
from routers.interfaces import ethernet, dummy, bonding, bridge, tunnel, vlan, vxlan
from routers.firewall import groups
from routers.firewall import ipv4 as firewall_ipv4
from routers.firewall import ipv6 as firewall_ipv6
from routers.firewall import zones as zones_router
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
from routers.firewall_global_options import firewall_global_options
from routers.wireguard import wireguard
from routers.protocols import bgp as bgp_router
from routers.protocols import ospf as ospf_router
from routers.protocols import ospfv3 as ospfv3_router
from routers.protocols import rip as rip_router
from routers.protocols import ripng as ripng_router
from routers.protocols import isis as isis_router
from routers.protocols import babel as babel_router
from routers.protocols import openfabric as openfabric_router
from routers.vpn import ipsec as ipsec_router
from routers.vpn import openvpn as openvpn_router
from routers.ha import vrrp as vrrp_router
from routers import vrf as vrf_router
from routers import qos as qos_router
from routers.services import dns as dns_router
from routers.services import ntp as ntp_router
from routers.services import ssh as ssh_router
from routers.services import dhcp_relay as dhcp_relay_router
from routers import system
from routers import power as power_router
from routers.config import config as config_router
from routers.config import templates as templates_router
from routers import show as show_router
from routers import logs as logs_router
from routers import dashboard as dashboard_router
from routers import user_management as user_management_router
from routers import search as search_router
from routers.monitoring import metrics_router, interfaces_router, conntrack_router, alerts_router, history_router

# Global variables
db_pool: Optional[asyncpg.Pool] = None
scheduler: Optional[AsyncIOScheduler] = None

# Configuration
SESSION_INACTIVITY_TIMEOUT = int(os.getenv("SESSION_INACTIVITY_TIMEOUT", "30"))  # Minutes
CLEANUP_INTERVAL = int(os.getenv("SESSION_CLEANUP_INTERVAL", "5"))  # Minutes


async def cleanup_inactive_sessions():
    """
    Scheduled task to clean up inactive sessions.

    Cleans up two types of sessions:
    1. VyOS instance sessions (active_sessions table)
    2. Authentication sessions (sessions table)

    Runs periodically and removes sessions that have been inactive
    for longer than SESSION_INACTIVITY_TIMEOUT minutes.
    """
    global db_pool

    if not db_pool:
        return

    try:
        cutoff_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=SESSION_INACTIVITY_TIMEOUT)

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
                print(f"[SessionCleanup] Removed {len(vyos_sessions)} inactive VyOS instance session(s)")
                for row in vyos_sessions:
                    # Invalidate cache for affected users
                    await cache_service.invalidate_user_cache(row["userId"])

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
                print(f"[SessionCleanup] Removed {len(auth_sessions)} inactive authentication session(s) - users logged out")

    except Exception as e:
        print(f"[SessionCleanup] Error during cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan event handler.
    Manages database connections, cache, and scheduled tasks.
    """
    global db_pool, scheduler

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
    except Exception as e:
        print(f"  ✗ Failed to create database connection pool: {e}")
        raise RuntimeError(f"Database connection required but failed: {e}")

    # Initialize Redis cache
    print("\n🔴 Initializing Redis cache...")
    redis_connected = await cache_service.connect()
    app.state.cache = cache_service
    if redis_connected:
        print("  ✓ Redis cache connected")
    else:
        print("  ⚠ Redis not available - caching disabled")

    # Initialize APScheduler for background tasks
    print("\n⏰ Initializing background task scheduler...")
    scheduler = AsyncIOScheduler()

    # Add session cleanup job
    scheduler.add_job(
        cleanup_inactive_sessions,
        trigger=IntervalTrigger(minutes=CLEANUP_INTERVAL),
        id="session_cleanup",
        name="Clean up inactive sessions",
        replace_existing=True,
    )

    scheduler.start()
    print(f"  ✓ Scheduler started (cleanup every {CLEANUP_INTERVAL} min)")

    # Initialize Alert Engine background task
    print("\n🔔 Initializing alert engine...")
    try:
        alert_interval = int(os.getenv("ALERT_ENGINE_INTERVAL", "30"))  # Seconds
        await start_alert_engine(db_pool=db_pool, interval_seconds=alert_interval)
        print(f"  ✓ Alert engine started (evaluation every {alert_interval}s)")
    except Exception as e:
        print(f"  ⚠ Alert engine failed to start: {e}")

    # Print middleware status
    print("\n🛡️ Security middleware enabled:")
    print("  ✓ Authentication middleware")
    print("  ✓ Session middleware")
    print("  ✓ CSRF protection")
    print("  ✓ Rate limiting")
    print("  ✓ Security headers")

    print("\n" + "=" * 60)
    print("✓ API Ready")
    print("=" * 60)
    print("\nVyOS instances are managed through the database.")
    print("Users connect to instances via the web UI (/sites page).\n")

    # Yield control to the application
    yield

    # Shutdown
    print("\n🛑 Shutting down VyManager API...")

    # Stop alert engine
    await stop_alert_engine()
    print("  ✓ Alert engine stopped")

    # Stop scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        print("  ✓ Scheduler stopped")

    # Disconnect Redis
    if cache_service.is_connected:
        await cache_service.disconnect()
        print("  ✓ Redis cache disconnected")

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
    allow_headers=["Content-Type", "Authorization", "Cookie", "X-Requested-With", "X-CSRF-Token"],
    expose_headers=["Content-Type", "Content-Length", "Content-Disposition"],
)

# Session Middleware - Resolves active VyOS instance for authenticated users
app.add_middleware(SessionMiddleware)

# CSRF Middleware - Protects against Cross-Site Request Forgery
# Can be disabled with CSRF_ENABLED=false environment variable
app.add_middleware(CSRFMiddleware, enabled=get_csrf_enabled())

# Authentication Middleware - Validates session tokens
# The middleware will get db_pool from app.state when processing requests
app.add_middleware(AuthenticationMiddleware)

# Rate Limiting Middleware - Protects against brute force and DoS
# Added LAST but runs FIRST (middleware executes in reverse order)
app.add_middleware(RateLimitMiddleware)

# Security Headers Middleware - Adds CSP, X-Frame-Options, etc.
# Enable HSTS in production with ENABLE_HSTS=true
app.add_middleware(SecurityHeadersMiddleware, enable_hsts=get_hsts_enabled())


# ============================================================================
# Application Setup
# ============================================================================

# Include routers
app.include_router(session_router.router)
app.include_router(ethernet.router)
app.include_router(dummy.router)
app.include_router(bonding.router)
app.include_router(bridge.router)
app.include_router(tunnel.router)
app.include_router(vlan.router)
app.include_router(vxlan.router)
app.include_router(groups.router)
app.include_router(firewall_ipv4.router)
app.include_router(firewall_ipv6.router)
app.include_router(zones_router.router)
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
app.include_router(firewall_global_options.router)
app.include_router(wireguard.router)
app.include_router(bgp_router.router)
app.include_router(ospf_router.router)
app.include_router(ospfv3_router.router)
app.include_router(rip_router.router)
app.include_router(ripng_router.router)
app.include_router(isis_router.router)
app.include_router(babel_router.router)
app.include_router(openfabric_router.router)
app.include_router(ipsec_router.router)
app.include_router(openvpn_router.router)
app.include_router(vrrp_router.router)
app.include_router(vrf_router.router)
app.include_router(qos_router.router)
app.include_router(dns_router.router)
app.include_router(ntp_router.router)
app.include_router(ssh_router.router)
app.include_router(dhcp_relay_router.router)
app.include_router(system.router)
app.include_router(power_router.router)
app.include_router(config_router.router)
app.include_router(templates_router.router)
app.include_router(show_router.router)
app.include_router(logs_router.router)
app.include_router(dashboard_router.router)
app.include_router(user_management_router.router)
app.include_router(metrics_router)
app.include_router(interfaces_router)
app.include_router(conntrack_router)
app.include_router(alerts_router)
app.include_router(history_router)
app.include_router(search_router.router)


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
            "firewall-global-options",
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
