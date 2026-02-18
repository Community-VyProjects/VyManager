import inspect
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

from session_vyos_service import get_session_vyos_service
from vyos_builders.load_balancing import LoadBalancingBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/load-balancing", tags=["load-balancing"])


class BatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name to call")
    value: Optional[str] = Field(
        None,
        description=(
            "Value argument. Use '|' as separator for composite values. "
            "Examples: 'facility|level' for logging, 'server_name|address' for backend servers, "
            "'rule_id|domain' for rule operations."
        ),
    )


class BatchRequest(BaseModel):
    item_name: str = Field(
        ...,
        description=(
            "Name of the primary entity being configured. "
            "Use the backend name for RP backend operations, "
            "service name for RP service operations, "
            "interface name for WAN interface-health operations, "
            "rule number (string) for WAN rule operations, "
            "or empty string '' for global/timeout settings."
        ),
    )
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.get("/capabilities")
async def get_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(request)
    builder = LoadBalancingBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config")
async def get_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(request)
    full_config = service.get_full_config(refresh=refresh)
    from vyos_mappers import CommandMapperRegistry
    mappers = CommandMapperRegistry.get_all_mappers(service.get_version())
    return mappers["load_balancing"].parse_config(full_config)


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest):
    await require_write_permission(http_request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(http_request)
    batch = LoadBalancingBatchBuilder(version=service.get_version())

    for op in request.operations:
        method = getattr(batch, op.op, None)
        if method is None:
            return VyOSResponse(success=False, error=f"Unknown operation: {op.op}")

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
