import os
import asyncpg
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from middleware.auth import AuthenticationMiddleware
from middleware.session import SessionMiddleware
from fastapi_permissions import get_user_feature_permissions

# Import routers
from routers.session import session as session_router
from routers.interfaces import ethernet, dummy, bonding, bridge, geneve, input, l2tpv3, loopback, macsec, openvpn, pppoe, pseudo_ethernet, sstpc, virtual_ethernet, vpp, vti, wireless, wwan
from routers.firewall import groups
from routers.firewall import ipv4 as firewall_ipv4
from routers.firewall import ipv6 as firewall_ipv6
from routers.firewall import bridge as firewall_bridge
from routers.firewall import flowtables as firewall_flowtables
from routers.firewall import zones as firewall_zones
from routers.nat import nat
from routers.nat64 import nat64
from routers.nat66 import nat66
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
from routers.babel import babel
from routers.bfd import bfd
from routers.bgp import bgp
from routers.failover import failover
from routers.igmp_proxy import igmp_proxy
from routers.ospf import ospf
from routers.ospfv3 import ospfv3
from routers.vrf import vrf
from routers import system
from routers import power as power_router
from routers.config import config as config_router
from routers import show as show_router
from routers import dashboard as dashboard_router
from routers import user_management as user_management_router
from routers.monitoring import monitoring as monitoring_router
from routers.high_availability import high_availability as high_availability_router
from routers.load_balancing import load_balancing as load_balancing_router
from routers.isis import isis as isis_router
from routers.openfabric import openfabric as openfabric_router
from routers.mpls import mpls as mpls_router
from routers.ipsec import ipsec as ipsec_router
from routers.l2tp import l2tp as l2tp_router
from routers.pki import pki as pki_router
from routers.tunnel import tunnel as tunnel_router
from routers.vxlan import vxlan as vxlan_router
from routers.nhrp import nhrp as nhrp_router
from routers.pim import pim as pim_router
from routers.pim6 import pim6 as pim6_router
from routers.rip import rip as rip_router
from routers.ripng import ripng as ripng_router
from routers.rpki import rpki as rpki_router
from routers.traffic_engineering import traffic_engineering as te_router
from routers import version as version_router
from routers import events as events_router
from routers.events import start_poller, stop_poller

# Global variables
db_pool: Optional[asyncpg.Pool] = None
cleanup_task: Optional[asyncio.Task] = None
poller_task: Optional[asyncio.Task] = None

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
    global db_pool, cleanup_task, poller_task

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

    # Start SSE banner poller
    poller_task = start_poller(app.state)
    print("  ✓ SSE banner poller started")

    print("\n" + "=" * 60)
    print("✓ API Ready")
    print("=" * 60)
    print("\nVyOS instances are managed through the database.")
    print("Users connect to instances via the web UI (/sites page).\n")

    # Yield control to the application
    yield

    # Shutdown
    print("\n🛑 Shutting down VyManager API...")

    # Stop SSE banner poller
    stop_poller()
    if poller_task and not poller_task.done():
        try:
            await poller_task
        except asyncio.CancelledError:
            pass
        print("  ✓ SSE banner poller stopped")

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
    version=os.environ.get("VYMANAGER_VERSION", "dev"),
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
# Permissions Endpoint
# ============================================================================

@app.get("/vyos/permissions", tags=["permissions"])
async def get_permissions(request: Request) -> dict:
    """
    Get all feature permissions for the authenticated user on their active instance.
    Used by the frontend to conditionally show/hide UI elements based on permissions.
    """
    return await get_user_feature_permissions(request)


# ============================================================================
# Application Setup
# ============================================================================

# Include routers
app.include_router(session_router.router)
app.include_router(ethernet.router)
app.include_router(dummy.router)
app.include_router(bonding.router)
app.include_router(bridge.router)
app.include_router(geneve.router)
app.include_router(input.router)
app.include_router(l2tpv3.router)
app.include_router(loopback.router)
app.include_router(macsec.router)
app.include_router(openvpn.router)
app.include_router(pppoe.router)
app.include_router(pseudo_ethernet.router)
app.include_router(sstpc.router)
app.include_router(virtual_ethernet.router)
app.include_router(vpp.router)
app.include_router(vti.router)
app.include_router(wireless.router)
app.include_router(wwan.router)
app.include_router(groups.router)
app.include_router(firewall_ipv4.router)
app.include_router(firewall_ipv6.router)
app.include_router(firewall_bridge.router)
app.include_router(firewall_flowtables.router)
app.include_router(firewall_zones.router)
app.include_router(nat.router)
app.include_router(nat64.router)
app.include_router(nat66.router)
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
app.include_router(babel.router)
app.include_router(bfd.router)
app.include_router(bgp.router)
app.include_router(failover.router)
app.include_router(igmp_proxy.router)
app.include_router(ospf.router)
app.include_router(ospfv3.router)
app.include_router(vrf.router)
app.include_router(system.router)
app.include_router(power_router.router)
app.include_router(config_router.router)
app.include_router(show_router.router)
app.include_router(dashboard_router.router)
app.include_router(user_management_router.router)
app.include_router(monitoring_router.router)
app.include_router(high_availability_router.router)
app.include_router(load_balancing_router.router)
app.include_router(isis_router.router)
app.include_router(openfabric_router.router)
app.include_router(mpls_router.router)
app.include_router(ipsec_router.router)
app.include_router(l2tp_router.router)
app.include_router(pki_router.router)
app.include_router(tunnel_router.router)
app.include_router(vxlan_router.router)
app.include_router(nhrp_router.router)
app.include_router(pim_router.router)
app.include_router(pim6_router.router)
app.include_router(rip_router.router)
app.include_router(ripng_router.router)
app.include_router(rpki_router.router)
app.include_router(te_router.router)
app.include_router(version_router.router)
app.include_router(events_router.router)


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
            "loopback-interface",
            "openvpn-interface",
            "pppoe-interface",
            "pseudo-ethernet-interface",
            "sstpc-interface",
            "virtual-ethernet-interface",
            "vpp-interface",
            "vti-interface",
            "firewall-groups",
            "firewall-ipv4",
            "firewall-ipv6",
            "firewall-global-options",
            "nat",
            "nat64",
            "nat66",
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
