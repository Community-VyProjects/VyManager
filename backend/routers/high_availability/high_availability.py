import inspect
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from session_vyos_service import get_session_vyos_service
from vyos_builders.high_availability import HighAvailabilityBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.high_availability import HighAvailabilityMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import call_item_batch_op, resolve_batch_method

router = APIRouter(prefix="/vyos/high-availability", tags=["high-availability"])


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
    full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
    mapper = cast(
        HighAvailabilityMapper,
        CommandMapperRegistry.get_mapper("high_availability", service.get_version()),
    )
    return mapper.parse_config(full_config)


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest):
    """Run a batch of high-availability ops in one commit.

    Each op's first parameter is bound to ``item_name`` and the value fills
    the rest, split on ``|``; an item-only op takes no value. Global ops name
    their first parameter ``_name`` and ignore ``item_name``; every other op
    needs one.
    """
    await require_write_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(http_request)
    batch = HighAvailabilityBatchBuilder(version=service.get_version())

    try:
        for op in request.operations:
            params = list(inspect.signature(resolve_batch_method(batch, op.op)).parameters)
            if params and params[0] != "_name" and not request.item_name.strip():
                raise HTTPException(status_code=400, detail=f"Operation {op.op} requires item_name")
            # The VRRP password validator (.{1,8}) accepts spaces, so a
            # whitespace-only password is sent to the device as typed.
            call_item_batch_op(
                batch,
                op.op,
                request.item_name,
                op.value,
                blank_is_missing=op.op != "set_vrrp_group_auth_password",
            )
    except ValueError as e:
        # The mapper rejects a leaf this version does not have (1.5-only VRRP
        # leaves on 1.4) and a forward-method value neither version accepts.
        raise HTTPException(status_code=400, detail=str(e))

    if batch.is_empty():
        return VyOSResponse(success=True)

    response = await run_in_threadpool(service.execute_batch, batch)
    ok = response.status == 200 and not response.error
    return VyOSResponse(success=ok, error=None if ok else response.error)
