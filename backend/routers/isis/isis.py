"""
IS-IS Protocol Router

API endpoints for managing VyOS IS-IS (Intermediate System to Intermediate
System) routing protocol configuration.  Supports version-aware configuration
for VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/isis/capabilities  — version-aware feature flags
  GET  /vyos/isis/config        — normalized IS-IS configuration
  POST /vyos/isis/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.isis import IsisBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
import vyos_mappers  # noqa: F401  registers CommandMapperRegistry features
from vyos_mappers.base import CommandMapperRegistry
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/isis", tags=["isis"])


# ============================================================================
# Pydantic Models
# ============================================================================


class IsisSpfDelayIetf(BaseModel):
    """SPF IETF delay algorithm parameters."""
    init_delay: Optional[int] = None
    short_delay: Optional[int] = None
    long_delay: Optional[int] = None
    holddown: Optional[int] = None
    time_to_learn: Optional[int] = None


class IsisGlobalConfig(BaseModel):
    """IS-IS global process settings."""
    net: List[str] = []
    level: Optional[str] = None
    metric_style: Optional[str] = None
    dynamic_hostname: bool = False
    purge_originator: bool = False
    advertise_passive_only: bool = False
    advertise_high_metrics: bool = False
    set_attached_bit: bool = False
    set_overload_bit: bool = False
    log_adjacency_changes: bool = False
    topology: Optional[str] = None
    lsp_mtu: Optional[int] = None
    lsp_gen_interval: Optional[int] = None
    lsp_refresh_interval: Optional[int] = None
    max_lsp_lifetime: Optional[int] = None
    spf_interval: Optional[int] = None
    area_password_md5: Optional[str] = None
    area_password_plaintext: Optional[str] = None
    domain_password_md5: Optional[str] = None
    domain_password_plaintext: Optional[str] = None
    ldp_sync_holddown: Optional[int] = None
    spf_delay_ietf: IsisSpfDelayIetf = IsisSpfDelayIetf()


class IsisInterfaceLfa(BaseModel):
    """LFA fast-reroute settings for an interface."""
    level1_enabled: bool = False
    level1_exclude_interfaces: List[str] = []
    level2_enabled: bool = False
    level2_exclude_interfaces: List[str] = []


class IsisInterfaceTiLfa(BaseModel):
    """TI-LFA settings for an interface (VyOS 1.5+)."""
    enabled: bool = False
    level1_enabled: bool = False
    level1_node_protection: bool = False
    level1_link_fallback: bool = False
    level2_enabled: bool = False
    level2_node_protection: bool = False
    level2_link_fallback: bool = False


class IsisInterfaceRemoteLfa(BaseModel):
    """Remote LFA settings for an interface (VyOS 1.5+)."""
    level1_enabled: bool = False
    level1_max_metric: Optional[int] = None
    level1_tunnel_mpls_ldp: bool = False
    level2_enabled: bool = False
    level2_max_metric: Optional[int] = None
    level2_tunnel_mpls_ldp: bool = False


class IsisInterface(BaseModel):
    """IS-IS interface configuration."""
    name: str
    circuit_type: Optional[str] = None
    metric: Optional[int] = None
    hello_interval: Optional[int] = None
    hello_multiplier: Optional[int] = None
    hello_padding: bool = False
    passive: bool = False
    point_to_point: bool = False
    priority: Optional[int] = None
    psnp_interval: Optional[int] = None
    no_three_way_handshake: bool = False
    password_md5: Optional[str] = None
    password_plaintext: Optional[str] = None
    bfd: bool = False
    bfd_profile: Optional[str] = None
    ldp_sync_holddown: Optional[int] = None
    ldp_sync_disable: bool = False
    lfa: IsisInterfaceLfa = IsisInterfaceLfa()
    ti_lfa: IsisInterfaceTiLfa = IsisInterfaceTiLfa()
    remote_lfa: IsisInterfaceRemoteLfa = IsisInterfaceRemoteLfa()


class IsisRedistributeEntry(BaseModel):
    """A single redistribute source (protocol + level)."""
    protocol: str
    level: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class IsisDefaultInfoEntry(BaseModel):
    """Default-information originate for a single level."""
    level: str
    always: bool = False
    metric: Optional[int] = None
    route_map: Optional[str] = None


class IsisSrPrefix(BaseModel):
    """Segment Routing prefix-SID entry."""
    prefix: str
    index_value: Optional[int] = None
    index_explicit_null: bool = False
    index_no_php: bool = False
    absolute_value: Optional[int] = None
    absolute_explicit_null: bool = False
    absolute_no_php: bool = False


class IsisSegmentRouting(BaseModel):
    """Segment Routing (SR-MPLS) configuration."""
    global_block_low: Optional[int] = None
    global_block_high: Optional[int] = None
    local_block_low: Optional[int] = None
    local_block_high: Optional[int] = None
    maximum_label_depth: Optional[int] = None
    prefixes: List[IsisSrPrefix] = []
    srv6_locator: Optional[str] = None


class IsisTrafficEngineering(BaseModel):
    """Traffic Engineering configuration."""
    enabled: bool = False
    address: Optional[str] = None
    export: bool = False


class IsisFrrPriorityLimit(BaseModel):
    """Global LFA local priority-limit entry."""
    priority: str
    level: str


class IsisFrrTiebreaker(BaseModel):
    """Global LFA local tiebreaker entry."""
    tb_type: str
    index: str
    level: str


class IsisFrrRemotePrefixList(BaseModel):
    """Global LFA remote prefix-list entry."""
    prefix_list: str
    level: str


class IsisFrrGlobal(BaseModel):
    """Global Fast Reroute LFA configuration."""
    lfa_load_sharing_disable_level1: bool = False
    lfa_load_sharing_disable_level2: bool = False
    lfa_priority_limit: List[IsisFrrPriorityLimit] = []
    lfa_tiebreaker: List[IsisFrrTiebreaker] = []
    lfa_remote_prefix_list: List[IsisFrrRemotePrefixList] = []


class IsisConfig(BaseModel):
    """Complete IS-IS configuration."""
    enabled: bool = False
    global_config: IsisGlobalConfig = IsisGlobalConfig()
    interfaces: List[IsisInterface] = []
    redistribute_ipv4: List[IsisRedistributeEntry] = []
    redistribute_ipv6: List[IsisRedistributeEntry] = []
    default_info_ipv4: List[IsisDefaultInfoEntry] = []
    default_info_ipv6: List[IsisDefaultInfoEntry] = []
    segment_routing: IsisSegmentRouting = IsisSegmentRouting()
    traffic_engineering: IsisTrafficEngineering = IsisTrafficEngineering()
    fast_reroute: IsisFrrGlobal = IsisFrrGlobal()


class IsisBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Two-arg methods: 'arg1,arg2' (comma-separated). "
            "Compound keys (protocol+level): 'bgp|level-1'."
        ),
    )


class IsisBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[IsisBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_isis_capabilities(request: Request):
    """Return IS-IS feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(request)
        builder = IsisBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=IsisConfig)
async def get_isis_config(http_request: Request, refresh: bool = False):
    """Return the full IS-IS configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("isis", service.get_version())
        return IsisConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def isis_batch_configure(http_request: Request, body: IsisBatchRequest):
    """Execute a batch of IS-IS configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        builder = IsisBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IS-IS configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
