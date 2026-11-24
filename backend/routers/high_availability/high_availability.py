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


class VrrpAddress(BaseModel):
    address: str
    interface: Optional[str] = None


class VrrpAuthentication(BaseModel):
    type: Optional[str] = None
    password: Optional[str] = None  # "***" when stored; never the secret


class VrrpHealthCheck(BaseModel):
    failure_count: Optional[str] = None
    interval: Optional[str] = None
    ping: Optional[str] = None
    script: Optional[str] = None
    timeout: Optional[str] = None


class VrrpTransitionScript(BaseModel):
    backup: Optional[str] = None
    fault: Optional[str] = None
    master: Optional[str] = None
    stop: Optional[str] = None


class VrrpGarp(BaseModel):
    interval: Optional[str] = None
    master_delay: Optional[str] = None
    master_refresh: Optional[str] = None
    master_refresh_repeat: Optional[str] = None
    master_repeat: Optional[str] = None


class VrrpTrack(BaseModel):
    interfaces: List[str]
    exclude_vrrp_interface: bool


class VrrpGroup(BaseModel):
    name: str
    vrid: Optional[str] = None
    interface: Optional[str] = None
    addresses: List[VrrpAddress]
    excluded_addresses: List[VrrpAddress]
    priority: Optional[str] = None
    advertise_interval: Optional[str] = None
    authentication: Optional[VrrpAuthentication] = None
    preempt_delay: Optional[str] = None
    no_preempt: bool
    peer_addresses: List[str]
    hello_source_address: Optional[str] = None
    rfc3768_compatibility: bool
    disabled: bool
    description: Optional[str] = None
    garp: VrrpGarp
    health_check: VrrpHealthCheck
    track: VrrpTrack
    transition_script: VrrpTransitionScript


class VrrpSyncGroup(BaseModel):
    name: str
    members: List[str]
    health_check: VrrpHealthCheck
    transition_script: VrrpTransitionScript


class VrrpGlobalParameters(BaseModel):
    startup_delay: Optional[str] = None
    version: Optional[str] = None
    garp: VrrpGarp


class VrrpConfig(BaseModel):
    global_parameters: VrrpGlobalParameters
    snmp: bool
    snmp_trap: bool
    groups: List[VrrpGroup]
    sync_groups: List[VrrpSyncGroup]


class HARealServer(BaseModel):
    address: str
    port: Optional[str] = None
    connection_timeout: Optional[str] = None
    health_check_script: Optional[str] = None


class HAVirtualServer(BaseModel):
    name: str
    address: Optional[str] = None
    algorithm: Optional[str] = None
    delay_loop: Optional[str] = None
    forward_method: Optional[str] = None
    fwmark: Optional[str] = None
    persistence_timeout: Optional[str] = None
    port: Optional[str] = None
    protocol: Optional[str] = None
    real_servers: List[HARealServer]


class HAConfig(BaseModel):
    disabled: bool
    vrrp: VrrpConfig
    virtual_servers: List[HAVirtualServer]


@router.get("/capabilities")
async def get_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(request)
    builder = HighAvailabilityBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=HAConfig)
async def get_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.HIGH_AVAILABILITY)
    service = get_session_vyos_service(request)
    full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
    mapper = cast(
        HighAvailabilityMapper,
        CommandMapperRegistry.get_mapper("high_availability", service.get_version()),
    )
    return HAConfig(**mapper.parse_config(full_config))


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
