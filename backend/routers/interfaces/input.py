"""
Input (IFB) Interface Configuration Endpoints

All input (IFB) interface endpoints for VyOS configuration.
Input interfaces support description, disable, and redirect to a destination interface.
"""

import inspect
import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/input", tags=["input-interface"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., ifb0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


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
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.input import InputInterfaceBuilderMixin
    builder = InputInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=InputInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> InputInterfacesConfigResponse:
    """Get all input (IFB) interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
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
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_input_batch()

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
