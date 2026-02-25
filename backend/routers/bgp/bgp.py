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
from vyos_builders import BgpBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
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

        bgp_config = full_config.get("protocols", {}).get("bgp", {})

        if not bgp_config:
            return BgpConfig()

        return BgpConfig(
            system_as=bgp_config.get("system-as"),
            timers=parse_timers(bgp_config.get("timers", {})),
            parameters=parse_parameters(bgp_config.get("parameters", {})),
            neighbors=parse_neighbors(bgp_config.get("neighbor", {})),
            peer_groups=parse_peer_groups(bgp_config.get("peer-group", {})),
            address_families=parse_address_families(bgp_config.get("address-family", {})),
            listen=parse_listen(bgp_config.get("listen", {})),
            srv6_locator=bgp_config.get("srv6", {}).get("locator") if bgp_config.get("srv6") else None,
            sid_vpn_per_vrf_export=_deep_get(bgp_config, "sid", "vpn", "per-vrf", "export"),
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _deep_get(d: dict, *keys):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(key)
        if d is None:
            return None
    return d


def _safe_int(value) -> Optional[int]:
    """Safely convert to int."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_list(value) -> List[str]:
    """Convert VyOS config value to list (handles string or list)."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def parse_timers(raw: dict) -> BgpTimers:
    if not raw:
        return BgpTimers()
    return BgpTimers(
        keepalive=_safe_int(raw.get("keepalive")),
        holdtime=_safe_int(raw.get("holdtime")),
    )


def parse_parameters(raw: dict) -> BgpParameters:
    if not raw:
        return BgpParameters()

    bestpath_raw = raw.get("bestpath", {}) or {}
    as_path_raw = bestpath_raw.get("as-path", {}) or {}
    # as-path can be a dict of flags or a list
    if isinstance(as_path_raw, dict):
        as_path_confed = "confed" in as_path_raw
        as_path_ignore = "ignore" in as_path_raw
        as_path_multipath_relax = "multipath-relax" in as_path_raw
    elif isinstance(as_path_raw, list):
        as_path_confed = "confed" in as_path_raw
        as_path_ignore = "ignore" in as_path_raw
        as_path_multipath_relax = "multipath-relax" in as_path_raw
    else:
        as_path_confed = as_path_ignore = as_path_multipath_relax = False

    med_raw = bestpath_raw.get("med")
    med_list = _to_list(med_raw) if med_raw else None

    dampening_raw = raw.get("dampening", {}) or {}
    confederation_raw = raw.get("confederation", {}) or {}
    distance_raw = raw.get("distance", {}).get("global", {}) if raw.get("distance") else {}
    tcp_raw = raw.get("tcp-keepalive", {}) or {}
    gr_raw = raw.get("graceful-restart", {}) or {}

    confederation_peers = confederation_raw.get("peers")
    if confederation_peers is not None:
        confederation_peers = _to_list(confederation_peers)

    return BgpParameters(
        router_id=raw.get("router-id"),
        cluster_id=raw.get("cluster-id"),
        default_local_pref=_safe_int(_deep_get(raw, "default", "local-pref")),
        minimum_holdtime=_safe_int(raw.get("minimum-holdtime")),
        labeled_unicast=raw.get("labeled-unicast"),
        log_neighbor_changes="log-neighbor-changes" in raw,
        always_compare_med="always-compare-med" in raw,
        deterministic_med="deterministic-med" in raw,
        ebgp_requires_policy="ebgp-requires-policy" in raw,
        graceful_shutdown="graceful-shutdown" in raw,
        no_client_to_client_reflection="no-client-to-client-reflection" in raw,
        no_fast_external_failover="no-fast-external-failover" in raw,
        allow_martian_nexthop="allow-martian-nexthop" in raw,
        disable_ebgp_connected_route_check="disable-ebgp-connected-route-check" in raw,
        fast_convergence="fast-convergence" in raw,
        network_import_check="network-import-check" in raw,
        reject_as_sets="reject-as-sets" in raw,
        route_reflector_allow_outbound_policy="route-reflector-allow-outbound-policy" in raw,
        suppress_fib_pending="suppress-fib-pending" in raw,
        shutdown="shutdown" in raw,
        no_hard_administrative_reset="no-hard-administrative-reset" in raw,
        no_suppress_duplicates="no-suppress-duplicates" in raw,
        bestpath=BgpBestpath(
            as_path_confed=as_path_confed,
            as_path_ignore=as_path_ignore,
            as_path_multipath_relax=as_path_multipath_relax,
            bandwidth=bestpath_raw.get("bandwidth"),
            compare_routerid="compare-routerid" in bestpath_raw,
            med=med_list,
            peer_type_multipath_relax="multipath-relax" in (bestpath_raw.get("peer-type", {}) or {}),
        ),
        dampening=BgpDampening(
            half_life=_safe_int(dampening_raw.get("half-life")),
            re_use=_safe_int(dampening_raw.get("re-use")),
            start_suppress_time=_safe_int(dampening_raw.get("start-suppress-time")),
            max_suppress_time=_safe_int(dampening_raw.get("max-suppress-time")),
        ),
        confederation=BgpConfederation(
            identifier=_safe_int(confederation_raw.get("identifier")),
            peers=confederation_peers,
        ),
        distance_global=BgpDistanceGlobal(
            external=_safe_int(distance_raw.get("external")) if distance_raw else None,
            internal=_safe_int(distance_raw.get("internal")) if distance_raw else None,
            local=_safe_int(distance_raw.get("local")) if distance_raw else None,
        ),
        graceful_restart_stalepath_time=_safe_int(gr_raw.get("stalepath-time")) if gr_raw else None,
        conditional_advertisement_timer=_safe_int(
            _deep_get(raw, "conditional-advertisement", "timer")
        ),
        tcp_keepalive=BgpTcpKeepalive(
            idle=_safe_int(tcp_raw.get("idle")),
            interval=_safe_int(tcp_raw.get("interval")),
            probes=_safe_int(tcp_raw.get("probes")),
        ),
    )


def parse_neighbor_af_config(af_raw: dict) -> BgpNeighborAddressFamilyConfig:
    """Parse per-AFI neighbor/peer-group address-family config."""
    if not af_raw:
        return BgpNeighborAddressFamilyConfig()

    rm = af_raw.get("route-map", {}) or {}
    pl = af_raw.get("prefix-list", {}) or {}
    fl = af_raw.get("filter-list", {}) or {}
    dl = af_raw.get("distribute-list", {}) or {}
    au = af_raw.get("attribute-unchanged", {}) or {}
    dsc = af_raw.get("disable-send-community", {}) or {}
    do = af_raw.get("default-originate", {}) or {}
    rpa = af_raw.get("remove-private-as", {}) or {}
    ns = af_raw.get("nexthop-self", {}) or {}

    # default-originate is either a flag (empty dict) or has route-map
    do_enabled = "default-originate" in af_raw
    do_route_map = do.get("route-map") if isinstance(do, dict) else None

    return BgpNeighborAddressFamilyConfig(
        route_map_export=rm.get("export"),
        route_map_import=rm.get("import"),
        prefix_list_export=pl.get("export"),
        prefix_list_import=pl.get("import"),
        filter_list_export=fl.get("export"),
        filter_list_import=fl.get("import"),
        distribute_list_export=dl.get("export") if isinstance(dl.get("export"), str) else (_safe_int(dl.get("export")) if dl.get("export") else None),
        distribute_list_import=dl.get("import") if isinstance(dl.get("import"), str) else (_safe_int(dl.get("import")) if dl.get("import") else None),
        soft_reconfiguration_inbound="inbound" in (af_raw.get("soft-reconfiguration", {}) or {}),
        route_reflector_client="route-reflector-client" in af_raw,
        route_server_client="route-server-client" in af_raw,
        nexthop_self="nexthop-self" in af_raw,
        nexthop_self_force="force" in ns if isinstance(ns, dict) else False,
        addpath_tx_all="addpath-tx-all" in af_raw,
        addpath_tx_per_as="addpath-tx-per-as" in af_raw,
        allowas_in_number=_safe_int(_deep_get(af_raw, "allowas-in", "number")),
        as_override="as-override" in af_raw,
        attribute_unchanged_as_path="as-path" in au if isinstance(au, dict) else False,
        attribute_unchanged_med="med" in au if isinstance(au, dict) else False,
        attribute_unchanged_next_hop="next-hop" in au if isinstance(au, dict) else False,
        default_originate=do_enabled,
        default_originate_route_map=do_route_map,
        maximum_prefix=_safe_int(af_raw.get("maximum-prefix")),
        maximum_prefix_out=_safe_int(af_raw.get("maximum-prefix-out")),
        remove_private_as="remove-private-as" in af_raw,
        remove_private_as_all="all" in rpa if isinstance(rpa, dict) else False,
        disable_send_community_extended="extended" in dsc if isinstance(dsc, dict) else False,
        disable_send_community_standard="standard" in dsc if isinstance(dsc, dict) else False,
        weight=_safe_int(af_raw.get("weight")),
        unsuppress_map=af_raw.get("unsuppress-map"),
    )


def parse_neighbor_address_families(neighbor_config: dict) -> Dict[str, BgpNeighborAddressFamilyConfig]:
    """Parse all address-families for a neighbor or peer-group."""
    af_raw = neighbor_config.get("address-family", {})
    if not af_raw:
        return {}

    result = {}
    for afi, afi_config in af_raw.items():
        if afi_config is None:
            afi_config = {}
        result[afi] = parse_neighbor_af_config(afi_config)
    return result


def parse_neighbors(raw: dict) -> List[BgpNeighbor]:
    """Parse BGP neighbor configurations."""
    neighbors = []

    for addr, config in raw.items():
        if config is None:
            config = {}

        bfd_raw = config.get("bfd", {}) or {}
        cap_raw = config.get("capability", {}) or {}
        timers_raw = config.get("timers", {}) or {}
        local_as_raw = config.get("local-as", {}) or {}
        local_role_raw = config.get("local-role", {}) or {}

        # local-as is a tag node: {"65000": {"no-prepend": {"replace-as": {}}}}
        local_as_asn = None
        local_as_no_prepend = False
        if local_as_raw:
            for asn, asn_config in local_as_raw.items():
                local_as_asn = str(asn)
                if isinstance(asn_config, dict):
                    local_as_no_prepend = "replace-as" in (asn_config.get("no-prepend", {}) or {})
                break

        # local-role is a tag node: {"customer": {"strict": {}}} or just "customer"
        local_role_value = None
        local_role_strict = False
        if local_role_raw:
            if isinstance(local_role_raw, str):
                local_role_value = local_role_raw
            elif isinstance(local_role_raw, dict):
                for role, role_config in local_role_raw.items():
                    local_role_value = role
                    if isinstance(role_config, dict):
                        local_role_strict = "strict" in role_config
                    break

        neighbors.append(BgpNeighbor(
            address=addr,
            remote_as=config.get("remote-as"),
            description=config.get("description"),
            peer_group=config.get("peer-group"),
            update_source=config.get("update-source"),
            password=config.get("password"),
            port=_safe_int(config.get("port")),
            shutdown="shutdown" in config,
            passive="passive" in config,
            solo="solo" in config,
            enforce_first_as="enforce-first-as" in config,
            override_capability="override-capability" in config,
            strict_capability_match="strict-capability-match" in config,
            disable_capability_negotiation="disable-capability-negotiation" in config,
            disable_connected_check="disable-connected-check" in config,
            ebgp_multihop=_safe_int(config.get("ebgp-multihop")),
            advertisement_interval=_safe_int(config.get("advertisement-interval")),
            graceful_restart=config.get("graceful-restart"),
            local_as=BgpNeighborLocalAs(
                asn=local_as_asn,
                no_prepend_replace_as=local_as_no_prepend,
            ),
            local_role=local_role_value,
            local_role_strict=local_role_strict,
            bfd=BgpNeighborBfd(
                enabled=bool(bfd_raw) or "bfd" in config,
                check_control_plane_failure="check-control-plane-failure" in bfd_raw if isinstance(bfd_raw, dict) else False,
                profile=bfd_raw.get("profile") if isinstance(bfd_raw, dict) else None,
            ),
            capability=BgpNeighborCapability(
                dynamic="dynamic" in cap_raw if isinstance(cap_raw, dict) else False,
                extended_nexthop="extended-nexthop" in cap_raw if isinstance(cap_raw, dict) else False,
                software_version="software-version" in cap_raw if isinstance(cap_raw, dict) else False,
            ),
            timers=BgpNeighborTimers(
                connect=_safe_int(timers_raw.get("connect")),
                keepalive=_safe_int(timers_raw.get("keepalive")),
                holdtime=_safe_int(timers_raw.get("holdtime")),
            ),
            ttl_security_hops=_safe_int(_deep_get(config, "ttl-security", "hops")),
            address_families=parse_neighbor_address_families(config),
        ))

    return neighbors


def parse_peer_groups(raw: dict) -> List[BgpPeerGroup]:
    """Parse BGP peer-group configurations."""
    peer_groups = []

    for name, config in raw.items():
        if config is None:
            config = {}

        bfd_raw = config.get("bfd", {}) or {}
        cap_raw = config.get("capability", {}) or {}
        local_as_raw = config.get("local-as", {}) or {}
        local_role_raw = config.get("local-role", {}) or {}

        local_as_asn = None
        local_as_no_prepend = False
        if local_as_raw:
            for asn, asn_config in local_as_raw.items():
                local_as_asn = str(asn)
                if isinstance(asn_config, dict):
                    local_as_no_prepend = "replace-as" in (asn_config.get("no-prepend", {}) or {})
                break

        local_role_value = None
        local_role_strict = False
        if local_role_raw:
            if isinstance(local_role_raw, str):
                local_role_value = local_role_raw
            elif isinstance(local_role_raw, dict):
                for role, role_config in local_role_raw.items():
                    local_role_value = role
                    if isinstance(role_config, dict):
                        local_role_strict = "strict" in role_config
                    break

        peer_groups.append(BgpPeerGroup(
            name=name,
            remote_as=config.get("remote-as"),
            description=config.get("description"),
            update_source=config.get("update-source"),
            password=config.get("password"),
            shutdown="shutdown" in config,
            passive="passive" in config,
            override_capability="override-capability" in config,
            disable_capability_negotiation="disable-capability-negotiation" in config,
            disable_connected_check="disable-connected-check" in config,
            ebgp_multihop=_safe_int(config.get("ebgp-multihop")),
            graceful_restart=config.get("graceful-restart"),
            local_as=BgpNeighborLocalAs(
                asn=local_as_asn,
                no_prepend_replace_as=local_as_no_prepend,
            ),
            local_role=local_role_value,
            local_role_strict=local_role_strict,
            bfd=BgpNeighborBfd(
                enabled=bool(bfd_raw) or "bfd" in config,
                check_control_plane_failure="check-control-plane-failure" in bfd_raw if isinstance(bfd_raw, dict) else False,
                profile=bfd_raw.get("profile") if isinstance(bfd_raw, dict) else None,
            ),
            capability=BgpNeighborCapability(
                dynamic="dynamic" in cap_raw if isinstance(cap_raw, dict) else False,
                extended_nexthop="extended-nexthop" in cap_raw if isinstance(cap_raw, dict) else False,
                software_version="software-version" in cap_raw if isinstance(cap_raw, dict) else False,
            ),
            ttl_security_hops=_safe_int(_deep_get(config, "ttl-security", "hops")),
            address_families=parse_neighbor_address_families(config),
        ))

    return peer_groups


def parse_address_families(raw: dict) -> List[BgpAddressFamily]:
    """Parse global address-family configurations."""
    families = []

    for afi, afi_config in raw.items():
        if afi_config is None:
            afi_config = {}

        # Skip L2VPN-EVPN for now (complex, separate handling)
        if afi == "l2vpn-evpn":
            continue

        networks = []
        for prefix, net_config in (afi_config.get("network", {}) or {}).items():
            if net_config is None:
                net_config = {}
            networks.append(BgpNetwork(
                prefix=prefix,
                route_map=net_config.get("route-map"),
                backdoor="backdoor" in net_config,
                path_limit=_safe_int(net_config.get("path-limit")),
                label=net_config.get("label"),
                rd=net_config.get("rd"),
            ))

        aggregates = []
        for prefix, agg_config in (afi_config.get("aggregate-address", {}) or {}).items():
            if agg_config is None:
                agg_config = {}
            aggregates.append(BgpAggregateAddress(
                prefix=prefix,
                as_set="as-set" in agg_config,
                summary_only="summary-only" in agg_config,
                route_map=agg_config.get("route-map"),
            ))

        redistribute = []
        for protocol, redist_config in (afi_config.get("redistribute", {}) or {}).items():
            if redist_config is None:
                redist_config = {}
            if protocol == "table":
                # table is a tag node
                for table_id, table_config in (redist_config if isinstance(redist_config, dict) else {}).items():
                    if table_config is None:
                        table_config = {}
                    redistribute.append(BgpRedistribute(
                        protocol="table",
                        metric=table_config.get("metric"),
                        route_map=table_config.get("route-map"),
                        table=str(table_id),
                    ))
            else:
                redistribute.append(BgpRedistribute(
                    protocol=protocol,
                    metric=redist_config.get("metric") if isinstance(redist_config, dict) else None,
                    route_map=redist_config.get("route-map") if isinstance(redist_config, dict) else None,
                ))

        max_paths = afi_config.get("maximum-paths", {}) or {}

        families.append(BgpAddressFamily(
            afi=afi,
            networks=networks,
            aggregate_addresses=aggregates,
            redistribute=redistribute,
            maximum_paths_ebgp=_safe_int(max_paths.get("ebgp")),
            maximum_paths_ibgp=_safe_int(max_paths.get("ibgp")),
        ))

    return families


def parse_listen(raw: dict) -> BgpListen:
    """Parse BGP listen (dynamic neighbors) configuration."""
    if not raw:
        return BgpListen()

    ranges = []
    for prefix, range_config in (raw.get("range", {}) or {}).items():
        if range_config is None:
            range_config = {}
        ranges.append(BgpListenRange(
            prefix=prefix,
            peer_group=range_config.get("peer-group"),
        ))

    return BgpListen(
        limit=_safe_int(raw.get("limit")),
        ranges=ranges,
    )


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
            method = getattr(builder, operation.op)
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
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
