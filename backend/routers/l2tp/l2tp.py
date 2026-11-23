"""
L2TP VPN Router

API endpoints for managing VyOS L2TP remote-access VPN configuration.

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.l2tp import L2TPBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.l2tp import L2TPMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_item_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vpn/l2tp", tags=["l2tp"])


# ========================================================================
# Pydantic Models
# ========================================================================

class L2TPBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., set_outside_address, create_local_user)")
    value: Optional[str] = Field(None, description="Operation value")


class L2TPBatchRequest(BaseModel):
    """Batch request for L2TP configuration changes."""
    item_name: str = Field(..., min_length=1, description="Primary item name (e.g., username, pool name, or placeholder for global ops)")
    operations: List[L2TPBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_l2tp_capabilities(request: Request):
    """
    Get L2TP capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    await require_read_permission(request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = L2TPBatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config")
async def get_l2tp_config(request: Request, refresh: bool = False):
    """Get L2TP remote-access configuration from VyOS, secrets masked."""
    await require_read_permission(request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        mapper = cast(L2TPMapper, CommandMapperRegistry.get_mapper("l2tp", version))
        return mapper.parse_config(full_config)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def l2tp_batch_configure(http_request: Request, request: L2TPBatchRequest):
    """
    Execute a batch of L2TP configuration operations in one VyOS commit.

    Each operation's `op` names a method on L2TPBatchBuilder. The first
    parameter is bound to `item_name` (a username, a pool name, or a
    placeholder such as "l2tp" for global settings); further parameters
    come from `value`, split on "|".
    """
    await require_write_permission(http_request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        builder = L2TPBatchBuilder(version=version)

        try:
            for operation in request.operations:
                # Passwords and secrets accept spaces, so a whitespace-only
                # value is sent to the device as typed.
                call_item_batch_op(
                    builder,
                    operation.op,
                    request.item_name,
                    operation.value,
                    blank_is_missing=False,
                )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No operations to execute"},
            )

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "L2TP configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
