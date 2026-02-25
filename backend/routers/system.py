"""
System Information Endpoints

API endpoints for retrieving system information about the VyOS device.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from vyos_mappers import CommandMapperRegistry
import logging
logger = logging.getLogger(__name__)

# Router for system endpoints
router = APIRouter(prefix="/vyos/system", tags=["system"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


class SystemInfo(BaseModel):
    """System information response model."""
    instance_id: str
    instance_name: str
    site_name: str
    vyos_version: str
    connection_host: str
    connected: bool


class SystemConfig(BaseModel):
    """System configuration response model."""
    hostname: Optional[str] = None
    timezone: Optional[str] = None
    name_servers: list[str] = Field(default_factory=list)
    domain_name: Optional[str] = None
    performance: Optional[str] = Field(
        None,
        description="System option performance profile (VyOS 1.5)",
    )
    raw_config: Dict[str, Any] = Field(default_factory=dict)


class PerformanceUpdateRequest(BaseModel):
    """Request to update system option performance. Valid values depend on VyOS version (1.4: throughput, latency; 1.5: five profiles)."""
    performance: Optional[str] = Field(
        None,
        description="Performance profile. Use GET /capabilities for allowed values per version. Null to clear.",
    )


class PerformanceUpdateResponse(BaseModel):
    """Response from performance update."""
    success: bool
    message: str
    error: Optional[str] = None


@router.get("/info", response_model=SystemInfo)
async def get_system_info(request: Request) -> SystemInfo:
    """
    Get system information about the active VyOS instance.

    Returns:
    - instance_id: The ID of the connected instance
    - instance_name: The name of the instance
    - site_name: The site the instance belongs to
    - vyos_version: VyOS version (e.g., "1.4", "1.5")
    - connection_host: The hostname/IP we're connected to
    - connected: Whether we can connect to the device
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        instance = request.state.instance

        version = service.get_version()
        hostname = service.config.hostname

        # Try to get config to verify connection
        try:
            await run_in_threadpool(service.get_full_config)
            connected = True
        except Exception:
            connected = False

        site = getattr(request.state, "site", None)

        return SystemInfo(
            instance_id=instance['id'],
            instance_name=instance['name'],
            site_name=site["name"] if site and site.get("name") else "Unknown",
            vyos_version=version,
            connection_host=hostname,
            connected=connected,
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=SystemConfig)
async def get_system_config(request: Request, refresh: bool = False) -> SystemConfig:
    """
    Get system configuration from VyOS (hostname, timezone, name servers, etc.).

    This endpoint retrieves system-level configuration that may differ between
    VyOS versions 1.4 and 1.5, and returns it in a generalized format.

    Args:
        request: FastAPI request object (contains user session)
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        SystemConfig with generalized system settings
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)

        # Get full config (will use cache unless refresh=True)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        # Extract system configuration
        system_config = full_config.get("system", {})

        # Parse hostname
        hostname = system_config.get("host-name")

        # Parse timezone
        timezone = system_config.get("time-zone")

        # Parse name servers (can be string or list depending on version)
        name_servers = []
        ns_value = system_config.get("name-server")
        if ns_value:
            if isinstance(ns_value, list):
                name_servers = ns_value
            elif isinstance(ns_value, str):
                name_servers = [ns_value]

        # Parse domain name
        domain_name = system_config.get("domain-name")

        # Parse system option performance (version-aware via mapper)
        version = service.get_version()
        perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
        option = system_config.get("option") or {}
        performance = perf_mapper.parse_performance(option)

        return SystemConfig(
            hostname=hostname,
            timezone=timezone,
            name_servers=name_servers,
            domain_name=domain_name,
            performance=performance,
            raw_config=system_config,
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/capabilities")
async def get_system_capabilities(request: Request) -> Dict[str, Any]:
    """
    Get system-related capabilities for the active instance (e.g. performance options per VyOS version).
    Frontend uses this to adapt UI (e.g. show only throughput/latency on 1.4, all five on 1.5).
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
        options = perf_mapper.get_valid_performance_options()
        performance_options = [
            {"value": v, "label": label, "description": desc}
            for v, label, desc in options
        ]
        return {
            "version": version,
            "performance_options": performance_options,
        }
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/config/performance", response_model=PerformanceUpdateResponse)
async def update_system_performance(request: Request, body: PerformanceUpdateRequest) -> PerformanceUpdateResponse:
    """
    Set or clear system option performance profile.
    Valid values depend on VyOS version (see GET /capabilities).
    """
    await require_write_permission(request, FeatureGroup.SYSTEM)

    value = body.performance
    stripped = (value or "").strip()

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
        valid_values = perf_mapper.get_valid_performance_values()

        if stripped and stripped not in valid_values:
            return PerformanceUpdateResponse(
                success=False,
                message="Invalid performance profile",
                error=f"Must be one of: {', '.join(valid_values)}",
            )

        batch = service.create_system_performance_batch()
        if not stripped:
            batch.delete_performance()
        else:
            batch.set_performance(stripped)

        response = await run_in_threadpool(service.execute_batch, batch)

        if response.status != 200:
            return PerformanceUpdateResponse(
                success=False,
                message="Failed to update performance option",
                error=response.error or "Unknown error",
            )

        await run_in_threadpool(service.get_full_config, True)
        return PerformanceUpdateResponse(
            success=True,
            message="Performance option updated. Save config to make persistent.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
