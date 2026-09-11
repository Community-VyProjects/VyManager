"""
Loopback Interface Configuration Endpoints

All loopback interface endpoints for VyOS configuration.
Loopback interfaces are limited to a single instance (lo) and support
address, description, ip source-validation, mirror, and redirect.
"""

import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from routers.interfaces.interface_batch import (
    BatchRequest,
    VyOSResponse,
    run_interface_batch,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/loopback", tags=["loopback-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class LoopbackInterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    ip_source_validation: Optional[str] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    redirect: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class LoopbackInterfacesConfigResponse(BaseModel):
    interfaces: List[LoopbackInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for loopback interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.loopback import LoopbackInterfaceBuilderMixin
    builder = LoopbackInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=LoopbackInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> LoopbackInterfacesConfigResponse:
    """Get all loopback interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("loopback", {})

        from vyos_mappers.interfaces.loopback_versions import get_loopback_mapper
        mapper = get_loopback_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return LoopbackInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a loopback interface using batch operations.

    **Supported operations:**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_ip_source_validation` | Yes | Source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_mirror_ingress` | Yes | Mirror ingress to interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress to interface |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `set_redirect` | Yes | Redirect incoming packets |
    | `delete_redirect` | No | Remove redirect |
    | `delete_interface` | No | Delete entire interface |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    service = get_session_vyos_service(http_request)
    batch = service.create_loopback_batch()
    return run_interface_batch(service, batch, request)
