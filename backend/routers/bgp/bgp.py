"""
BGP Protocol Router

API endpoints for managing VyOS BGP (Border Gateway Protocol) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.bgp import BgpBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/bgp", tags=["bgp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BgpTimers(BaseModel):
    """BGP global timers."""
    keepalive: Optional[int] = None
    holdtime: Optional[int] = None


class BgpBestpath(BaseModel):
    """BGP bestpath configuration."""
    as_path_confed: bool = False
    as_path_ignore: bool = False
    as_path_multipath_relax: bool = False
    bandwidth: Optional[str] = None
    compare_routerid: bool = False
    med: Optional[List[str]] = None
    peer_type_multipath_relax: bool = False


class BgpDampening(BaseModel):
    """BGP dampening configuration."""
    half_life: Optional[int] = None
    re_use: Optional[int] = None
    start_suppress_time: Optional[int] = None
    max_suppress_time: Optional[int] = None


class BgpConfederation(BaseModel):
    """BGP confederation settings."""
    identifier: Optional[int] = None
    peers: Optional[List[str]] = None


class BgpDistanceGlobal(BaseModel):
    """BGP admin distance global settings."""
    external: Optional[int] = None
    internal: Optional[int] = None
    local: Optional[int] = None


class BgpTcpKeepalive(BaseModel):
    """BGP TCP keepalive settings."""
    idle: Optional[int] = None
    interval: Optional[int] = None
    probes: Optional[int] = None


class BgpParameters(BaseModel):
    """BGP global parameters."""
    router_id: Optional[str] = None
    cluster_id: Optional[str] = None
    default_local_pref: Optional[int] = None
    minimum_holdtime: Optional[int] = None
    labeled_unicast: Optional[str] = None
    log_neighbor_changes: bool = False
    always_compare_med: bool = False
    deterministic_med: bool = False
    ebgp_requires_policy: bool = False
    graceful_shutdown: bool = False
    no_client_to_client_reflection: bool = False
    no_fast_external_failover: bool = False
    allow_martian_nexthop: bool = False
    disable_ebgp_connected_route_check: bool = False
    fast_convergence: bool = False
    network_import_check: bool = False
    reject_as_sets: bool = False
    route_reflector_allow_outbound_policy: bool = False
    suppress_fib_pending: bool = False
    shutdown: bool = False
    no_hard_administrative_reset: bool = False
    no_suppress_duplicates: bool = False
    no_ipv6_auto_ra: bool = False
    bestpath: BgpBestpath = BgpBestpath()
    dampening: BgpDampening = BgpDampening()
    confederation: BgpConfederation = BgpConfederation()
    distance_global: BgpDistanceGlobal = BgpDistanceGlobal()
    graceful_restart_stalepath_time: Optional[int] = None
    conditional_advertisement_timer: Optional[int] = None
    tcp_keepalive: BgpTcpKeepalive = BgpTcpKeepalive()


class BgpNeighborBfd(BaseModel):
    """BGP neighbor BFD settings."""
    enabled: bool = False
    check_control_plane_failure: bool = False
    profile: Optional[str] = None


class BgpNeighborCapability(BaseModel):
    """BGP neighbor capability settings."""
    dynamic: bool = False
    extended_nexthop: bool = False
    software_version: bool = False


class BgpNeighborTimers(BaseModel):
    """BGP per-neighbor timers."""
    connect: Optional[int] = None
    keepalive: Optional[int] = None
    holdtime: Optional[int] = None


class BgpNeighborLocalAs(BaseModel):
    """BGP neighbor local-as settings."""
    asn: Optional[str] = None
    no_prepend_replace_as: bool = False


class BgpNeighborAddressFamilyConfig(BaseModel):
    """Per-AFI configuration for a neighbor or peer-group."""
    route_map_export: Optional[str] = None
    route_map_import: Optional[str] = None
    prefix_list_export: Optional[str] = None
    prefix_list_import: Optional[str] = None
    filter_list_export: Optional[str] = None
    filter_list_import: Optional[str] = None
    distribute_list_export: Optional[str] = None
    distribute_list_import: Optional[str] = None
    soft_reconfiguration_inbound: bool = False
    route_reflector_client: bool = False
    route_server_client: bool = False
    nexthop_self: bool = False
    nexthop_self_force: bool = False
    addpath_tx_all: bool = False
    addpath_tx_per_as: bool = False
    allowas_in_number: Optional[int] = None
    as_override: bool = False
    attribute_unchanged_as_path: bool = False
    attribute_unchanged_med: bool = False
    attribute_unchanged_next_hop: bool = False
    default_originate: bool = False
    default_originate_route_map: Optional[str] = None
    maximum_prefix: Optional[int] = None
    maximum_prefix_out: Optional[int] = None
    remove_private_as: bool = False
    remove_private_as_all: bool = False
    disable_send_community_extended: bool = False
    disable_send_community_standard: bool = False
    weight: Optional[int] = None
    unsuppress_map: Optional[str] = None


class BgpNeighbor(BaseModel):
    """BGP neighbor configuration."""
    address: str
    remote_as: Optional[str] = None
    description: Optional[str] = None
    peer_group: Optional[str] = None
    update_source: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    shutdown: bool = False
    passive: bool = False
    solo: bool = False
    enforce_first_as: bool = False
    override_capability: bool = False
    strict_capability_match: bool = False
    disable_capability_negotiation: bool = False
    disable_connected_check: bool = False
    ebgp_multihop: Optional[int] = None
    advertisement_interval: Optional[int] = None
    graceful_restart: Optional[str] = None
    local_as: BgpNeighborLocalAs = BgpNeighborLocalAs()
    local_role: Optional[str] = None
    local_role_strict: bool = False
    bfd: BgpNeighborBfd = BgpNeighborBfd()
    capability: BgpNeighborCapability = BgpNeighborCapability()
    timers: BgpNeighborTimers = BgpNeighborTimers()
    ttl_security_hops: Optional[int] = None
    address_families: Dict[str, BgpNeighborAddressFamilyConfig] = {}


class BgpPeerGroup(BaseModel):
    """BGP peer-group configuration."""
    name: str
    remote_as: Optional[str] = None
    description: Optional[str] = None
    update_source: Optional[str] = None
    password: Optional[str] = None
    shutdown: bool = False
    passive: bool = False
    override_capability: bool = False
    disable_capability_negotiation: bool = False
    disable_connected_check: bool = False
    ebgp_multihop: Optional[int] = None
    graceful_restart: Optional[str] = None
    local_as: BgpNeighborLocalAs = BgpNeighborLocalAs()
    local_role: Optional[str] = None
    local_role_strict: bool = False
    bfd: BgpNeighborBfd = BgpNeighborBfd()
    capability: BgpNeighborCapability = BgpNeighborCapability()
    ttl_security_hops: Optional[int] = None
    address_families: Dict[str, BgpNeighborAddressFamilyConfig] = {}


class BgpNetwork(BaseModel):
    """BGP network advertisement."""
    prefix: str
    route_map: Optional[str] = None
    backdoor: bool = False
    path_limit: Optional[int] = None
    label: Optional[str] = None
    rd: Optional[str] = None


class BgpAggregateAddress(BaseModel):
    """BGP aggregate address."""
    prefix: str
    as_set: bool = False
    summary_only: bool = False
    route_map: Optional[str] = None


class BgpRedistribute(BaseModel):
    """BGP redistribute entry."""
    protocol: str
    metric: Optional[str] = None
    route_map: Optional[str] = None
    table: Optional[str] = None


class BgpAddressFamily(BaseModel):
    """Global address-family configuration."""
    afi: str
    networks: List[BgpNetwork] = []
    aggregate_addresses: List[BgpAggregateAddress] = []
    redistribute: List[BgpRedistribute] = []
    maximum_paths_ebgp: Optional[int] = None
    maximum_paths_ibgp: Optional[int] = None
    evpn_flags: List[str] = []


class BgpListenRange(BaseModel):
    """BGP dynamic neighbor listen range."""
    prefix: str
    peer_group: Optional[str] = None


class BgpListen(BaseModel):
    """BGP listen (dynamic neighbors) configuration."""
    limit: Optional[int] = None
    ranges: List[BgpListenRange] = []


class BgpConfig(BaseModel):
    """Complete BGP configuration."""
    system_as: Optional[str] = None
    timers: BgpTimers = BgpTimers()
    parameters: BgpParameters = BgpParameters()
    neighbors: List[BgpNeighbor] = []
    peer_groups: List[BgpPeerGroup] = []
    address_families: List[BgpAddressFamily] = []
    listen: BgpListen = BgpListen()
    srv6_locator: Optional[str] = None
    sid_vpn_per_vrf_export: Optional[str] = None


class BgpBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class BgpBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[BgpBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_bgp_capabilities(request: Request):
    """Get BGP feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.BGP)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BgpBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BgpConfig)
async def get_bgp_config(http_request: Request, refresh: bool = False):
    """Get all BGP configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.BGP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("bgp", service.get_version())
        return BgpConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def bgp_batch_configure(http_request: Request, body: BgpBatchRequest):
    """Execute a batch of BGP configuration operations."""
    await require_write_permission(http_request, FeatureGroup.BGP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = BgpBatchBuilder(version=version)

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1 and operation.value:
                method(operation.value)
            elif len(params) == 2 and operation.value:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value)
            elif len(params) == 3 and operation.value:
                values = operation.value.split(",", 2)
                if len(values) == 3:
                    method(values[0], values[1], values[2])
                elif len(values) == 2:
                    method(values[0], values[1])

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "BGP configuration updated"},
            error=response.error if response.error else None
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
