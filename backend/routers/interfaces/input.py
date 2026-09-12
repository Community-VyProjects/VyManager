"""
Input (IFB) Interface Configuration Endpoints

All input (IFB) interface endpoints for VyOS configuration.
Input interfaces support description, disable, and redirect to a destination interface.
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

router = APIRouter(prefix="/vyos/input", tags=["input-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class InputInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disable: Optional[bool] = None
    redirect: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class InputInterfacesConfigResponse(BaseModel):
    interfaces: List[InputInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for input interfaces."""
    await require_read_permission(request, FeatureGroup.INPUT_IFACE)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.input import InputInterfaceBuilderMixin
    builder = InputInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=InputInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> InputInterfacesConfigResponse:
    """Get all input (IFB) interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INPUT_IFACE)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("input", {})

        from vyos_mappers.interfaces.input_versions import get_input_mapper
        mapper = get_input_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return InputInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure an input (IFB) interface using batch operations.

    **Supported operations:**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_disable` | No | Administratively disable |
    | `delete_interface_disable` | No | Re-enable interface |
    | `set_redirect` | Yes | Redirect incoming packets to destination interface |
    | `delete_redirect` | No | Remove redirect |
    | `delete_interface` | No | Delete entire interface |
    """
    await require_write_permission(http_request, FeatureGroup.INPUT_IFACE)

    service = get_session_vyos_service(http_request)
    batch = service.create_input_batch()
    return run_interface_batch(service, batch, request)
