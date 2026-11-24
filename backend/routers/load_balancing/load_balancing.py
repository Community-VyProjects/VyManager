import inspect
from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, cast

from session_vyos_service import get_session_vyos_service
from vyos_builders.load_balancing import LoadBalancingBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.load_balancing import LoadBalancingMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import call_item_batch_op, resolve_batch_method

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
    item_name: Optional[str] = Field(
        None,
        description=(
            "Per-operation entity name override. When set, this takes precedence over the "
            "request-level item_name for this specific operation. Allows a single batch "
            "request to operate on multiple entities (e.g., create backend + service together)."
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


class LBLogLevel(BaseModel):
    level: Optional[str] = None


class LBUrlPath(BaseModel):
    begin: List[str]
    end: List[str]
    exact: List[str]


class LBBackendRuleSet(BaseModel):
    redirect_location: Optional[str] = None
    server: Optional[str] = None


class LBBackendRule(BaseModel):
    rule_id: str
    domain_name: List[str]
    wildcard_domain: bool
    ssl: Optional[str] = None
    url_path: LBUrlPath
    set: LBBackendRuleSet


class LBServiceRuleSet(BaseModel):
    redirect_location: Optional[str] = None
    backend: Optional[str] = None


class LBServiceRule(BaseModel):
    rule_id: str
    domain_name: List[str]
    wildcard_domain: bool
    ssl: Optional[str] = None
    url_path: LBUrlPath
    set: LBServiceRuleSet


class LBServer(BaseModel):
    name: str
    address: Optional[str] = None
    port: Optional[str] = None
    backup: bool
    check: bool
    check_port: Optional[str] = None
    send_proxy: bool
    send_proxy_v2: bool


class LBHttpCheckExpect(BaseModel):
    status: Optional[str] = None
    string: Optional[str] = None


class LBHttpCheck(BaseModel):
    method: Optional[str] = None
    uri: Optional[str] = None
    expect: LBHttpCheckExpect


class LBBackendSsl(BaseModel):
    ca_certificate: Optional[str] = None
    no_verify: bool


class LBBackendTimeout(BaseModel):
    check: Optional[str] = None
    connect: Optional[str] = None
    server: Optional[str] = None


class LBBackend(BaseModel):
    name: str
    description: Optional[str] = None
    balance: Optional[str] = None
    mode: Optional[str] = None
    health_check: Optional[str] = None
    http_check: Optional[LBHttpCheck] = None
    http_response_headers: Dict[str, Optional[str]]
    logging: Dict[str, LBLogLevel]
    ssl: Optional[LBBackendSsl] = None
    timeout: LBBackendTimeout
    servers: List[LBServer]
    rules: List[LBBackendRule]


class LBListenAddress(BaseModel):
    address: str
    accept_proxy: bool


class LBServiceSsl(BaseModel):
    certificates: List[str]


class LBHttpCompression(BaseModel):
    algorithm: Optional[str] = None
    mime_types: List[str]


class LBTcpRequest(BaseModel):
    inspect_delay: Optional[str] = None


class LBServiceTimeout(BaseModel):
    client: Optional[str] = None


class LBService(BaseModel):
    name: str
    description: Optional[str] = None
    mode: Optional[str] = None
    port: Optional[str] = None
    listen_addresses: List[LBListenAddress]
    backends: List[str]
    redirect_http_to_https: bool
    ssl: Optional[LBServiceSsl] = None
    http_compression: Optional[LBHttpCompression] = None
    http_response_headers: Dict[str, Optional[str]]
    logging: Dict[str, LBLogLevel]
    tcp_request: Optional[LBTcpRequest] = None
    timeout: LBServiceTimeout
    rules: List[LBServiceRule]


class LBGlobalParameters(BaseModel):
    max_connections: Optional[str] = None
    ssl_bind_ciphers: List[str]
    tls_version_min: Optional[str] = None
    logging: Dict[str, LBLogLevel]


class LBTimeout(BaseModel):
    check: Optional[str] = None
    client: Optional[str] = None
    connect: Optional[str] = None
    server: Optional[str] = None


class LBReverseProxy(BaseModel):
    global_parameters: LBGlobalParameters
    timeout: LBTimeout
    vrf: Optional[str] = None
    backends: List[LBBackend]
    services: List[LBService]


class LBWanHealthTest(BaseModel):
    test_id: str
    type: Optional[str] = None
    target: Optional[str] = None
    resp_time: Optional[str] = None
    ttl_limit: Optional[str] = None
    test_script: Optional[str] = None


class LBWanInterfaceHealth(BaseModel):
    interface: str
    nexthop: Optional[str] = None
    failure_count: Optional[str] = None
    success_count: Optional[str] = None
    tests: List[LBWanHealthTest]


class LBWanRuleInterface(BaseModel):
    interface: str
    weight: Optional[str] = None


class LBWanRuleLimit(BaseModel):
    burst: Optional[str] = None
    period: Optional[str] = None
    rate: Optional[str] = None
    threshold: Optional[str] = None


class LBWanRuleGroup(BaseModel):
    address_group: Optional[str] = None
    network_group: Optional[str] = None
    domain_group: Optional[str] = None
    port_group: Optional[str] = None


class LBWanRuleEndpoint(BaseModel):
    address: Optional[str] = None
    port: Optional[str] = None
    group: Optional[LBWanRuleGroup] = None


class LBWanRule(BaseModel):
    rule_id: str
    description: Optional[str] = None
    inbound_interface: Optional[str] = None
    exclude: bool
    failover: bool
    per_packet_balancing: bool
    protocol: Optional[str] = None
    interfaces: List[LBWanRuleInterface]
    limit: Optional[LBWanRuleLimit] = None
    source: Optional[LBWanRuleEndpoint] = None
    destination: Optional[LBWanRuleEndpoint] = None


class LBWanStickyConnections(BaseModel):
    inbound: bool


class LBWanConfig(BaseModel):
    disable_source_nat: bool
    enable_local_traffic: bool
    flush_connections: bool
    hook: Optional[str] = None
    sticky_connections: LBWanStickyConnections
    interface_health: List[LBWanInterfaceHealth]
    rules: List[LBWanRule]


class LBConfig(BaseModel):
    reverse_proxy: LBReverseProxy
    wan: LBWanConfig


@router.get("/capabilities")
async def get_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(request)
    builder = LoadBalancingBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=LBConfig)
async def get_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(request)
    full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
    mapper = cast(
        LoadBalancingMapper,
        CommandMapperRegistry.get_mapper("load_balancing", service.get_version()),
    )
    return LBConfig(**mapper.parse_config(full_config))


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest):
    await require_write_permission(http_request, FeatureGroup.LOAD_BALANCING)
    service = get_session_vyos_service(http_request)
    batch = LoadBalancingBatchBuilder(version=service.get_version())

    try:
        for op in request.operations:
            params = list(inspect.signature(resolve_batch_method(batch, op.op)).parameters)
            # Per-operation item_name overrides the request-level item_name.
            # Global ops name their first parameter ``_name`` and ignore it;
            # every other op names the object it edits.
            effective_name = op.item_name if op.item_name is not None else request.item_name
            if params and params[0] != "_name" and not effective_name.strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {op.op} requires an item name",
                )
            call_item_batch_op(batch, op.op, effective_name, op.value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if batch.is_empty():
        return VyOSResponse(success=True)

    response = await run_in_threadpool(service.execute_batch, batch)
    return VyOSResponse(
        success=response.status == 200,
        error=response.error if response.status != 200 else None,
    )
