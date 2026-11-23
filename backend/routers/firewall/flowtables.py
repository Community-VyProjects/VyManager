"""
Firewall Flowtables Router

API endpoints for managing VyOS firewall flowtables.
Flowtables enable fast-path packet processing by offloading established connections.
"""

import logging
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field
from session_vyos_service import get_session_vyos_service
from vyos_builders.firewall import FlowtablesBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall import FlowtablesMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import call_item_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/flowtables", tags=["firewall-flowtables"])


# ============================================================================
# Request/Response Models
# ============================================================================


class FlowtableBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class FlowtableBatchRequest(BaseModel):
    """Model for batch flowtable configuration."""
    flowtable_name: str = Field(..., min_length=1, description="Flowtable name")
    operations: List[FlowtableBatchOperation] = Field(
        ..., description="List of operations to perform"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "flowtable_name": "FT_LAN",
                "operations": [
                    {"op": "set_flowtable"},
                    {"op": "set_flowtable_description", "value": "LAN flowtable"},
                    {"op": "set_flowtable_interface", "value": "eth0"},
                    {"op": "set_flowtable_interface", "value": "eth1"},
                    {"op": "set_flowtable_offload", "value": "software"},
                ]
            }
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class Flowtable(BaseModel):
    """Flowtable configuration."""
    name: str
    description: Optional[str] = None
    interfaces: List[str] = []
    offload: Optional[str] = None  # "hardware" or "software"


class FlowtablesConfigResponse(BaseModel):
    """Response containing all flowtables."""
    flowtables: List[Flowtable] = []
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_flowtables_capabilities(request: Request):
    """
    Get flowtables capabilities based on device VyOS version.

    Returns feature flags indicating supported operations.

    Requires READ permission on FIREWALL_FLOWTABLES feature.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_FLOWTABLES)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = FlowtablesBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=FlowtablesConfigResponse)
async def get_flowtables_config(request: Request, refresh: bool = False):
    """
    Get all flowtable configurations from VyOS.

    Args:
        request: FastAPI request object (contains active session)
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all flowtables

    Requires READ permission on FIREWALL_FLOWTABLES feature.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_FLOWTABLES)

    try:
        service = get_session_vyos_service(request)
        mapper = cast(
            FlowtablesMapper,
            CommandMapperRegistry.get_mapper("firewall_flowtables", service.get_version()),
        )
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return FlowtablesConfigResponse(**mapper.parse_config(full_config))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure_flowtable(request: Request, batch_request: FlowtableBatchRequest):
    """
    Execute batch flowtable operations.

    This endpoint allows configuring flowtables through a series of operations.
    All operations are executed in a single transaction.

    Args:
        request: FastAPI request object
        batch_request: Batch request containing flowtable name and operations

    Returns:
        VyOSResponse with success/failure information

    Requires WRITE permission on FIREWALL_FLOWTABLES feature.
    """
    await require_write_permission(request, FeatureGroup.FIREWALL_FLOWTABLES)

    try:
        service = get_session_vyos_service(request)
        batch = FlowtablesBatchBuilder(version=service.get_version())

        # Every op takes the flowtable name; a value op also takes the op
        # value (test_firewall_flowtables_batch_router locks the arity).
        for operation in batch_request.operations:
            call_item_batch_op(
                batch, operation.op, batch_request.flowtable_name, operation.value
            )

        if batch.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "Configuration updated"} if ok else None,
            error=None if ok else response.error,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{flowtable_name}", response_model=VyOSResponse)
async def delete_flowtable(request: Request, flowtable_name: str):
    """
    Delete a flowtable.

    Args:
        request: FastAPI request object
        flowtable_name: Name of the flowtable to delete

    Returns:
        VyOSResponse with success/failure information

    Requires WRITE permission on FIREWALL_FLOWTABLES feature.
    """
    await require_write_permission(request, FeatureGroup.FIREWALL_FLOWTABLES)

    try:
        service = get_session_vyos_service(request)
        batch = FlowtablesBatchBuilder(version=service.get_version())
        batch.delete_flowtable(flowtable_name)

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(success=ok, error=None if ok else response.error)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
