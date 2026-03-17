import inspect
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

from session_vyos_service import get_session_vyos_service
from vyos_builders.high_availability import HighAvailabilityBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/high-availability", tags=["high-availability"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


class BatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name to call")
    value: Optional[str] = Field(None, description="Value argument (use '|' as separator for composite values)")


class BatchRequest(BaseModel):
    item_name: str = Field(..., description="Name of the entity being configured (group, sync-group, virtual-server name, or empty string for globals)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.get("/capabilities")
async def get_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(request)
    builder = HighAvailabilityBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config")
async def get_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(request)
    full_config = service.get_full_config(refresh=refresh)
    from vyos_mappers import CommandMapperRegistry
    mappers = CommandMapperRegistry.get_all_mappers(service.get_version())
    return mappers["high_availability"].parse_config(full_config)


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest):
    await require_write_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(http_request)
    batch = HighAvailabilityBatchBuilder(version=service.get_version())

    for op in request.operations:
        if op.op.startswith("_") or op.op in _INTERNAL_BUILDER_METHODS:
            raise HTTPException(status_code=400, detail=f"Invalid operation: {op.op}")
        method = getattr(batch, op.op, None)
        if not callable(method):
            raise HTTPException(status_code=400, detail=f"Unknown operation: {op.op}")

        sig = inspect.signature(method)
        params = [p for p in sig.parameters.keys() if p != "self"]

        if len(params) == 0:
            method()
        elif len(params) == 1:
            method(request.item_name)
        elif len(params) == 2 and op.value is not None:
            method(request.item_name, op.value)
        elif len(params) == 2:
            method(request.item_name)

    if batch.is_empty():
        return VyOSResponse(success=True)

    response = service.execute_batch(batch)
    return VyOSResponse(
        success=response.status == 200,
        error=response.error if response.status != 200 else None,
    )
