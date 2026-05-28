"""
PPPoE Server Router

API endpoints for managing VyOS PPPoE server configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.pppoe_server import PPPoEServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from starlette.concurrency import run_in_threadpool
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pppoe-server", tags=["pppoe-server"])

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear",
    "operation_count", "get_capabilities",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class PPPoEBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (use | as separator for multi-arg)")


class PPPoEBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary identifier (interface, pool name, username, RADIUS server IP, or 'pppoe' for global ops)")
    operations: List[PPPoEBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_pppoe_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(request)
        builder = PPPoEServerBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config
# ========================================================================

@router.get("/config")
async def get_pppoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        from vyos_mappers.pppoe_server import PPPoEServerMapper
        mapper = PPPoEServerMapper(service.get_version())
        return mapper.parse_config(full_config)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def pppoe_batch_configure(http_request: Request, body: PPPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        builder = PPPoEServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.op}")

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            args = []
            if len(params) >= 1:
                args.append(body.item_name)
            if len(params) >= 2 and operation.value is not None:
                if len(params) >= 3:
                    parts = operation.value.split("|", len(params) - 2)
                    args.extend(parts)
                else:
                    args.append(operation.value)

            method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PPPoE server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pppoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")
