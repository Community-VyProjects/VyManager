import urllib3
urllib3.disable_warnings()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Literal

from vyos_service import VyOSDeviceConfig, VyOSDeviceRegistry
from config_loader import load_device_from_env

# Import routers
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
from routers import system
from routers.config import config as config_router

# Global variable to store the configured device name
CONFIGURED_DEVICE_NAME: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan event handler.
    Runs on startup and shutdown to manage device registration and caching.
    """
    global CONFIGURED_DEVICE_NAME

    # Startup: Load device from .env and cache its config
    print("\n" + "=" * 60)
    print("🚀 Starting VyOS Management API")
    print("=" * 60)

    # Load device from .env file
    device_config = load_device_from_env()

    if device_config:
        print(f"\n📋 Registering device from .env file...")

        try:
            # Convert to VyOSDeviceConfig and register
            name, config = device_config.to_vyos_config()
            device_registry.register(name, config)
            CONFIGURED_DEVICE_NAME = name

            # Set device name in routers
            ethernet.set_configured_device_name(name)
            dummy.set_configured_device_name(name)
            groups.set_configured_device_name(name)
            firewall_ipv4.set_configured_device_name(name)
            firewall_ipv6.set_configured_device_name(name)
            nat.set_configured_device_name(name)
            dhcp.set_configured_device_name(name)
            static_routes.set_configured_device_name(name)
            route_map.set_configured_device_name(name)
            access_list.set_configured_device_name(name)
            prefix_list.set_configured_device_name(name)
            local_route.set_configured_device_name(name)
            route.set_configured_device_name(name)
            system.set_configured_device_name(name)
            config_router.set_configured_device_name(name)

            print(f"  ✓ Registered: {name}")

            # Pre-cache the full configuration
            service = device_registry.get(name)
            print(f"    └─ Fetching full config...")
            full_config = service.get_full_config()
            print(f"    └─ ✓ Cached config ({len(full_config)} top-level keys)")

            # Initialize config snapshot
            print(f"    └─ Initializing config snapshot...")
            config_router._saved_config_snapshot = full_config
            print(f"    └─ ✓ Snapshot initialized")

            print(f"\n✓ Successfully initialized device '{name}'")

        except Exception as e:
            print(f"  ✗ Failed to register {device_config.name}: {e}")
            print("  ⚠ API will start but device operations will fail")

    else:
        print("\n✗ No device configuration found in .env file")
        print("  Please create a .env file with VYOS_* variables (see .env.example)")
        print("  ⚠ API will start but device operations will fail")

    print("=" * 60)
    print("✓ API Ready\n")

    # Yield control to the application
    yield

    # Shutdown: Cleanup (if needed)
    print("\n🛑 Shutting down VyOS Management API...")
    device_registry.clear()
    CONFIGURED_DEVICE_NAME = None
    ethernet.set_configured_device_name(None)
    dummy.set_configured_device_name(None)
    groups.set_configured_device_name(None)
    firewall_ipv4.set_configured_device_name(None)
    firewall_ipv6.set_configured_device_name(None)
    nat.set_configured_device_name(None)
    dhcp.set_configured_device_name(None)
    static_routes.set_configured_device_name(None)
    route_map.set_configured_device_name(None)
    access_list.set_configured_device_name(None)
    prefix_list.set_configured_device_name(None)
    local_route.set_configured_device_name(None)
    route.set_configured_device_name(None)
    system.set_configured_device_name(None)
    config_router.set_configured_device_name(None)
    print("✓ Cleanup complete\n")


app = FastAPI(
    title="VyOS Management API",
    version="1.0.0",
    description="FastAPI backend for managing VyOS devices with version-aware commands",
    lifespan=lifespan,
)


# ============================================================================
# Pydantic Models - Device Management
# ============================================================================


class DeviceRegistration(BaseModel):
    """Model for registering a VyOS device."""

    name: str = Field(..., description="Unique identifier for the device")
    hostname: str = Field(..., description="IP address or hostname of VyOS device")
    apikey: str = Field(..., description="API key for authentication")
    version: Literal["1.4", "1.5"] = Field(..., description="VyOS version")
    protocol: Literal["http", "https"] = Field(
        default="https", description="Protocol to use"
    )
    port: int = Field(default=443, ge=1, le=65535, description="Port number")
    verify_ssl: bool = Field(
        default=False, description="Whether to verify SSL certificates"
    )
    timeout: int = Field(default=10, ge=1, description="Request timeout in seconds")


# ============================================================================
# Application Setup
# ============================================================================

# Device registry
device_registry = VyOSDeviceRegistry()

# Set device registry for routers
ethernet.set_device_registry(device_registry)
dummy.set_device_registry(device_registry)
groups.set_device_registry(device_registry)
firewall_ipv4.set_device_registry(device_registry)
firewall_ipv6.set_device_registry(device_registry)
nat.set_device_registry(device_registry)
dhcp.set_device_registry(device_registry)
static_routes.set_device_registry(device_registry)
route_map.set_device_registry(device_registry)
access_list.set_device_registry(device_registry)
prefix_list.set_device_registry(device_registry)
local_route.set_device_registry(device_registry)
route.set_device_registry(device_registry)
system.set_device_registry(device_registry)
config_router.set_device_registry(device_registry)

# Include routers
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
app.include_router(system.router)
app.include_router(config_router.router)


# ============================================================================
# Root Endpoint
# ============================================================================


@app.get("/", tags=["root"])
async def read_root() -> dict:
    """API root endpoint with basic information."""
    return {
        "message": "VyOS Management API",
        "docs": "/docs",
        "supported_versions": ["1.4", "1.5"],
        "features": ["ethernet-interface", "dummy-interface", "firewall-groups", "firewall-ipv4", "nat", "dhcp-server"],
    }


# ============================================================================
# Device Management Endpoints
# ============================================================================


@app.post("/devices/register", tags=["device-management"], status_code=201)
async def register_device(device: DeviceRegistration) -> dict:
    """
    Register a VyOS device with its configuration and version.

    This allows the API to use version-aware commands when communicating
    with the device.
    """
    try:
        config = VyOSDeviceConfig(
            hostname=device.hostname,
            apikey=device.apikey,
            version=device.version,
            protocol=device.protocol,
            port=device.port,
            verify=device.verify_ssl,
            timeout=device.timeout,
        )
        device_registry.register(device.name, config)
        return {
            "success": True,
            "message": f"Device '{device.name}' registered successfully",
            "version": device.version,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/device", tags=["device-management"])
async def get_device_info() -> dict:
    """Get information about the configured VyOS device."""
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        return {
            "name": CONFIGURED_DEVICE_NAME,
            "version": service.get_version(),
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")


# ============================================================================
# Configuration Management Endpoints
# ============================================================================


@app.post("/vyos/config/refresh", tags=["config-management"])
async def refresh_device_config() -> dict:
    """
    Force refresh the full configuration from VyOS device and cache it.

    This endpoint will:
    1. Make an API call to VyOS to retrieve the full configuration
    2. Store it in the cache for faster subsequent reads
    3. Return summary information about the config

    Use this endpoint when you want to ensure you have the latest configuration.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        config = service.refresh_config()

        # Return summary info
        return {
            "success": True,
            "message": f"Configuration refreshed for device '{CONFIGURED_DEVICE_NAME}'",
            "cached": True,
            "config_keys": list(config.keys()) if config else [],
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/vyos/config", tags=["config-management"])
async def get_device_config(refresh: bool = False) -> dict:
    """
    Get the full VyOS configuration (cached or fresh).

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Full VyOS configuration as JSON
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        config = service.get_full_config(refresh=refresh)

        return {
            "success": True,
            "device": CONFIGURED_DEVICE_NAME,
            "cached": not refresh,
            "config": config,
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Note: Feature-specific endpoints (Ethernet, Dummy, etc.) are in routers/
# ============================================================================
