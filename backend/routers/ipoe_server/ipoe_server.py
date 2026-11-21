"""
IPoE Server Router

API endpoints for managing VyOS IPoE (IP over Ethernet) server configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.ipoe_server import IPoEServerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ipoe_server import IPoEServerMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from starlette.concurrency import run_in_threadpool
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ipoe-server", tags=["ipoe-server"])


# ========================================================================
# Pydantic Models
# ========================================================================

class IPoEBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (use | as separator for multi-arg)")


class IPoEBatchRequest(BaseModel):
    item_name: str = Field(..., min_length=1, description="Primary identifier (interface, pool name, RADIUS server IP, or 'ipoe' for global ops)")
    operations: List[IPoEBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_ipoe_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = IPoEServerBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config
# ========================================================================

@router.get("/config")
async def get_ipoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            IPoEServerMapper,
            CommandMapperRegistry.get_mapper("ipoe_server", service.get_version()),
        )
        return mapper.parse_config(full_config)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def ipoe_batch_configure(http_request: Request, body: IPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = IPoEServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            # Every op takes the request item; a value op also takes the op
            # value as one string (test_ipoe_server_router locks the arity).
            if len(inspect.signature(method).parameters) == 1:
                method(body.item_name)
                continue
            if not operation.value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} requires a value",
                )
            try:
                method(body.item_name, operation.value)
            except ValueError:
                # A composite value the builder splits itself (mac|ip) is short.
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} has an invalid value",
                )

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IPoE server configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")
