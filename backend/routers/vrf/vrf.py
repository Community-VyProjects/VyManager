"""
VRF Router

API endpoints for managing VyOS VRF (Virtual Routing and Forwarding) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

Includes full protocol subtree management:
- Static routes (IPv4/IPv6)
- RPKI (VyOS 1.5+)
- Failover (VyOS 1.5+)
- OSPF, OSPFv3, IS-IS, BGP
- DHCP server, DHCPv6 server (VyOS 1.5+)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import VrfBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vrf", tags=["vrf"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ============================================================================
# Pydantic Models — Core VRF
# ============================================================================


class VrfIpProtocolRouteMap(BaseModel):
    """Per-protocol route-map assignment."""
    protocol: str
    route_map: str


class VrfIpSettings(BaseModel):
    """IP/IPv6 settings for a VRF instance."""
    disable_forwarding: bool = False
    nht_no_resolve_via_default: bool = False
    protocol_route_maps: List[VrfIpProtocolRouteMap] = []


# ============================================================================
# Pydantic Models — Static Routes
# ============================================================================


class VrfStaticRouteBfd(BaseModel):
    """BFD configuration for a static route next-hop."""
    profile: Optional[str] = None
    multi_hop_source: Optional[str] = None


class VrfStaticRouteNextHop(BaseModel):
    """Next-hop for a static route."""
    address: str
    disable: bool = False
    distance: Optional[int] = None
    interface: Optional[str] = None
    vrf: Optional[str] = None
    bfd: Optional[VrfStaticRouteBfd] = None
    segments: Optional[str] = None


class VrfStaticRouteInterface(BaseModel):
    """Interface route for a static route."""
    name: str
    disable: bool = False
    distance: Optional[int] = None
    vrf: Optional[str] = None
    segments: Optional[str] = None


class VrfStaticRouteBlackhole(BaseModel):
    """Blackhole/reject settings."""
    distance: Optional[int] = None
    tag: Optional[int] = None


class VrfStaticRoute(BaseModel):
    """A single static route (IPv4 or IPv6)."""
    destination: str
    description: Optional[str] = None
    dhcp_interface: Optional[str] = None
    next_hops: List[VrfStaticRouteNextHop] = []
    interfaces: List[VrfStaticRouteInterface] = []
    blackhole: Optional[VrfStaticRouteBlackhole] = None
    reject: Optional[VrfStaticRouteBlackhole] = None


class VrfStaticConfig(BaseModel):
    """Static route configuration within a VRF."""
    routes: List[VrfStaticRoute] = []
    routes6: List[VrfStaticRoute] = []


# ============================================================================
# Pydantic Models — RPKI
# ============================================================================


class VrfRpkiCacheSsh(BaseModel):
    """RPKI cache SSH configuration."""
    key: Optional[str] = None
    username: Optional[str] = None


class VrfRpkiCache(BaseModel):
    """RPKI cache configuration."""
    name: str
    port: Optional[int] = None
    preference: Optional[int] = None
    source_address: Optional[str] = None
    ssh: Optional[VrfRpkiCacheSsh] = None


class VrfRpkiConfig(BaseModel):
    """RPKI configuration within a VRF."""
    caches: List[VrfRpkiCache] = []
    expire_interval: Optional[int] = None
    polling_period: Optional[int] = None
    retry_interval: Optional[int] = None


# ============================================================================
# Pydantic Models — Failover
# ============================================================================


class VrfFailoverCheckTarget(BaseModel):
    """Failover check target."""
    address: str
    interface: Optional[str] = None
    vrf: Optional[str] = None


class VrfFailoverCheck(BaseModel):
    """Failover check configuration."""
    policy: Optional[str] = None
    port: Optional[int] = None
    targets: List[VrfFailoverCheckTarget] = []
    timeout: Optional[int] = None
    type: Optional[str] = None


class VrfFailoverNextHop(BaseModel):
    """Failover route next-hop."""
    address: str
    check: Optional[VrfFailoverCheck] = None
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class VrfFailoverDhcpInterface(BaseModel):
    """Failover route DHCP interface."""
    name: str
    check: Optional[VrfFailoverCheck] = None
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class VrfFailoverRoute(BaseModel):
    """A single failover route."""
    destination: str
    next_hops: List[VrfFailoverNextHop] = []
    dhcp_interfaces: List[VrfFailoverDhcpInterface] = []


class VrfFailoverConfig(BaseModel):
    """Failover configuration within a VRF."""
    routes: List[VrfFailoverRoute] = []


# ============================================================================
# Pydantic Models — Protocol Summaries (for OSPF, OSPFv3, ISIS, BGP)
# These are intentionally kept as summary-level models. The full config
# is returned as raw dicts to avoid enormous model definitions for deeply
# nested protocol configs. The batch API handles detailed operations.
# ============================================================================


class VrfOspfSummary(BaseModel):
    """OSPF summary within a VRF."""
    configured: bool = False
    router_id: Optional[str] = None
    areas: List[str] = []
    interfaces: List[str] = []
    redistribute: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfOspfv3Summary(BaseModel):
    """OSPFv3 summary within a VRF."""
    configured: bool = False
    router_id: Optional[str] = None
    areas: List[str] = []
    interfaces: List[str] = []
    redistribute: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfIsisSummary(BaseModel):
    """IS-IS summary within a VRF."""
    configured: bool = False
    net: Optional[str] = None
    interfaces: List[str] = []
    redistribute_ipv4: List[str] = []
    redistribute_ipv6: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfBgpSummary(BaseModel):
    """BGP summary within a VRF."""
    configured: bool = False
    system_as: Optional[int] = None
    router_id: Optional[str] = None
    neighbors: List[str] = []
    peer_groups: List[str] = []
    address_families: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — DHCP / DHCPv6 Summaries
# ============================================================================


class VrfDhcpSubnetSummary(BaseModel):
    """DHCP subnet summary."""
    prefix: str
    default_router: Optional[str] = None
    ranges: int = 0
    static_mappings: int = 0


class VrfDhcpNetworkSummary(BaseModel):
    """DHCP shared network summary."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    subnets: List[VrfDhcpSubnetSummary] = []


class VrfDhcpConfig(BaseModel):
    """DHCP server configuration within a VRF."""
    configured: bool = False
    disabled: bool = False
    shared_networks: List[VrfDhcpNetworkSummary] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfDhcpv6SubnetSummary(BaseModel):
    """DHCPv6 subnet summary."""
    prefix: str
    ranges: int = 0
    static_mappings: int = 0


class VrfDhcpv6NetworkSummary(BaseModel):
    """DHCPv6 shared network summary."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    subnets: List[VrfDhcpv6SubnetSummary] = []


class VrfDhcpv6Config(BaseModel):
    """DHCPv6 server configuration within a VRF."""
    configured: bool = False
    disabled: bool = False
    shared_networks: List[VrfDhcpv6NetworkSummary] = []
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — VRF Instance (extended)
# ============================================================================


class VrfInstance(BaseModel):
    """VRF instance configuration."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    table: Optional[int] = None
    vni: Optional[int] = None
    ip: VrfIpSettings = VrfIpSettings()
    ipv6: VrfIpSettings = VrfIpSettings()
    protocols: List[str] = []
    services: List[str] = []
    static: Optional[VrfStaticConfig] = None
    rpki: Optional[VrfRpkiConfig] = None
    failover: Optional[VrfFailoverConfig] = None
    ospf: Optional[VrfOspfSummary] = None
    ospfv3: Optional[VrfOspfv3Summary] = None
    isis: Optional[VrfIsisSummary] = None
    bgp: Optional[VrfBgpSummary] = None
    dhcp: Optional[VrfDhcpConfig] = None
    dhcpv6: Optional[VrfDhcpv6Config] = None


class VrfConfig(BaseModel):
    """Complete VRF configuration."""
    bind_to_all: bool = False
    instances: List[VrfInstance] = []


class VrfBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class VrfBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[VrfBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_vrf_capabilities(request: Request):
    """Get VRF feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)
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


@router.get("/config", response_model=VrfConfig)
async def get_vrf_config(http_request: Request, refresh: bool = False):
    """Get all VRF configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        vrf_config = full_config.get("vrf", {})

        if not vrf_config:
            return VrfConfig()

        bind_to_all = "bind-to-all" in vrf_config
        instances = parse_vrf_instances(vrf_config.get("name", {}))

        return VrfConfig(bind_to_all=bind_to_all, instances=instances)
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers — Core
# ============================================================================


def parse_ip_settings(config: dict, family: str) -> VrfIpSettings:
    """Parse IP or IPv6 settings from VRF config."""
    family_config = config.get(family, {})
    if not family_config:
        return VrfIpSettings()

    disable_forwarding = "disable-forwarding" in family_config
    nht_no_resolve = "no-resolve-via-default" in family_config.get("nht", {})

    protocol_route_maps = []
    protocol_config = family_config.get("protocol", {})
    for proto_name, proto_settings in protocol_config.items():
        if proto_settings and isinstance(proto_settings, dict):
            route_map = proto_settings.get("route-map")
            if route_map:
                protocol_route_maps.append(VrfIpProtocolRouteMap(
                    protocol=proto_name,
                    route_map=route_map,
                ))

    return VrfIpSettings(
        disable_forwarding=disable_forwarding,
        nht_no_resolve_via_default=nht_no_resolve,
        protocol_route_maps=protocol_route_maps,
    )


# ============================================================================
# Config Parsers — Static Routes
# ============================================================================


def _parse_bfd(nh_config: dict) -> Optional[VrfStaticRouteBfd]:
    """Parse BFD config from a next-hop."""
    bfd_config = nh_config.get("bfd", {})
    if not bfd_config:
        return None

    profile = bfd_config.get("profile")
    multi_hop = bfd_config.get("multi-hop", {})

    # VyOS 1.5: source-address (flat leaf)
    multi_hop_source = multi_hop.get("source-address")

    # VyOS 1.4: source/<tag>/profile (tagged node)
    if not multi_hop_source:
        source_config = multi_hop.get("source", {})
        if isinstance(source_config, dict):
            for addr in source_config:
                multi_hop_source = addr
                break

    if not profile and not multi_hop_source:
        return None

    return VrfStaticRouteBfd(
        profile=profile,
        multi_hop_source=multi_hop_source,
    )


def _parse_static_routes(route_config: dict, route_type: str = "route") -> List[VrfStaticRoute]:
    """Parse static routes (route or route6) from VRF config."""
    routes = []
    raw = route_config.get(route_type, {})
    if not isinstance(raw, dict):
        return routes

    for dest, dest_config in raw.items():
        if dest_config is None:
            dest_config = {}

        # Next-hops
        next_hops = []
        for nh_addr, nh_config in (dest_config.get("next-hop", {}) or {}).items():
            if nh_config is None:
                nh_config = {}
            next_hops.append(VrfStaticRouteNextHop(
                address=nh_addr,
                disable="disable" in nh_config,
                distance=int(nh_config["distance"]) if nh_config.get("distance") else None,
                interface=nh_config.get("interface"),
                vrf=nh_config.get("vrf"),
                bfd=_parse_bfd(nh_config),
                segments=nh_config.get("segments"),
            ))

        # Interface routes
        interfaces = []
        for iface_name, iface_config in (dest_config.get("interface", {}) or {}).items():
            if iface_config is None:
                iface_config = {}
            interfaces.append(VrfStaticRouteInterface(
                name=iface_name,
                disable="disable" in iface_config,
                distance=int(iface_config["distance"]) if iface_config.get("distance") else None,
                vrf=iface_config.get("vrf"),
                segments=iface_config.get("segments"),
            ))

        # Blackhole
        blackhole = None
        bh = dest_config.get("blackhole")
        if bh is not None:
            if isinstance(bh, dict):
                blackhole = VrfStaticRouteBlackhole(
                    distance=int(bh["distance"]) if bh.get("distance") else None,
                    tag=int(bh["tag"]) if bh.get("tag") else None,
                )
            else:
                blackhole = VrfStaticRouteBlackhole()

        # Reject
        reject = None
        rj = dest_config.get("reject")
        if rj is not None:
            if isinstance(rj, dict):
                reject = VrfStaticRouteBlackhole(
                    distance=int(rj["distance"]) if rj.get("distance") else None,
                    tag=int(rj["tag"]) if rj.get("tag") else None,
                )
            else:
                reject = VrfStaticRouteBlackhole()

        routes.append(VrfStaticRoute(
            destination=dest,
            description=dest_config.get("description"),
            dhcp_interface=dest_config.get("dhcp-interface"),
            next_hops=next_hops,
            interfaces=interfaces,
            blackhole=blackhole,
            reject=reject,
        ))

    return routes


def parse_static_config(protocols_config: dict) -> Optional[VrfStaticConfig]:
    """Parse static route configuration from VRF protocols."""
    static_config = protocols_config.get("static", {})
    if not static_config:
        return None

    routes = _parse_static_routes(static_config, "route")
    routes6 = _parse_static_routes(static_config, "route6")

    if not routes and not routes6:
        return VrfStaticConfig()

    return VrfStaticConfig(routes=routes, routes6=routes6)


# ============================================================================
# Config Parsers — RPKI
# ============================================================================


def parse_rpki_config(protocols_config: dict) -> Optional[VrfRpkiConfig]:
    """Parse RPKI configuration from VRF protocols."""
    rpki_config = protocols_config.get("rpki", {})
    if not rpki_config:
        return None

    caches = []
    for cache_name, cache_data in (rpki_config.get("cache", {}) or {}).items():
        if cache_data is None:
            cache_data = {}
        ssh = None
        ssh_data = cache_data.get("ssh", {})
        if ssh_data:
            ssh = VrfRpkiCacheSsh(
                key=ssh_data.get("key"),
                username=ssh_data.get("username"),
            )
        caches.append(VrfRpkiCache(
            name=cache_name,
            port=int(cache_data["port"]) if cache_data.get("port") else None,
            preference=int(cache_data["preference"]) if cache_data.get("preference") else None,
            source_address=cache_data.get("source-address"),
            ssh=ssh,
        ))

    return VrfRpkiConfig(
        caches=caches,
        expire_interval=int(rpki_config["expire-interval"]) if rpki_config.get("expire-interval") else None,
        polling_period=int(rpki_config["polling-period"]) if rpki_config.get("polling-period") else None,
        retry_interval=int(rpki_config["retry-interval"]) if rpki_config.get("retry-interval") else None,
    )


# ============================================================================
# Config Parsers — Failover
# ============================================================================


def _parse_failover_check(check_config: dict) -> Optional[VrfFailoverCheck]:
    """Parse failover check configuration."""
    if not check_config:
        return None

    targets = []
    for addr, target_data in (check_config.get("target", {}) or {}).items():
        if target_data is None:
            target_data = {}
        targets.append(VrfFailoverCheckTarget(
            address=addr,
            interface=target_data.get("interface"),
            vrf=target_data.get("vrf"),
        ))

    return VrfFailoverCheck(
        policy=check_config.get("policy"),
        port=int(check_config["port"]) if check_config.get("port") else None,
        targets=targets,
        timeout=int(check_config["timeout"]) if check_config.get("timeout") else None,
        type=check_config.get("type"),
    )


def parse_failover_config(protocols_config: dict) -> Optional[VrfFailoverConfig]:
    """Parse failover configuration from VRF protocols."""
    failover_config = protocols_config.get("failover", {})
    if not failover_config:
        return None

    routes = []
    for dest, dest_data in (failover_config.get("route", {}) or {}).items():
        if dest_data is None:
            dest_data = {}

        next_hops = []
        for nh_addr, nh_data in (dest_data.get("next-hop", {}) or {}).items():
            if nh_data is None:
                nh_data = {}
            next_hops.append(VrfFailoverNextHop(
                address=nh_addr,
                check=_parse_failover_check(nh_data.get("check", {})),
                interface=nh_data.get("interface"),
                metric=int(nh_data["metric"]) if nh_data.get("metric") else None,
                onlink="onlink" in nh_data,
            ))

        dhcp_interfaces = []
        for iface_name, iface_data in (dest_data.get("dhcp-interface", {}) or {}).items():
            if iface_data is None:
                iface_data = {}
            dhcp_interfaces.append(VrfFailoverDhcpInterface(
                name=iface_name,
                check=_parse_failover_check(iface_data.get("check", {})),
                interface=iface_data.get("interface"),
                metric=int(iface_data["metric"]) if iface_data.get("metric") else None,
                onlink="onlink" in iface_data,
            ))

        routes.append(VrfFailoverRoute(
            destination=dest,
            next_hops=next_hops,
            dhcp_interfaces=dhcp_interfaces,
        ))

    return VrfFailoverConfig(routes=routes)


# ============================================================================
# Config Parsers — OSPF
# ============================================================================


def parse_ospf_summary(protocols_config: dict) -> Optional[VrfOspfSummary]:
    """Parse OSPF summary from VRF protocols."""
    ospf_config = protocols_config.get("ospf", {})
    if not ospf_config:
        return None

    router_id = None
    params = ospf_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    areas = list(ospf_config.get("area", {}).keys()) if isinstance(ospf_config.get("area"), dict) else []
    interfaces = list(ospf_config.get("interface", {}).keys()) if isinstance(ospf_config.get("interface"), dict) else []
    redistribute = list(ospf_config.get("redistribute", {}).keys()) if isinstance(ospf_config.get("redistribute"), dict) else []

    return VrfOspfSummary(
        configured=True,
        router_id=router_id,
        areas=areas,
        interfaces=interfaces,
        redistribute=redistribute,
        raw_config=ospf_config,
    )


# ============================================================================
# Config Parsers — OSPFv3
# ============================================================================


def parse_ospfv3_summary(protocols_config: dict) -> Optional[VrfOspfv3Summary]:
    """Parse OSPFv3 summary from VRF protocols."""
    ospfv3_config = protocols_config.get("ospfv3", {})
    if not ospfv3_config:
        return None

    router_id = None
    params = ospfv3_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    areas = list(ospfv3_config.get("area", {}).keys()) if isinstance(ospfv3_config.get("area"), dict) else []
    interfaces = list(ospfv3_config.get("interface", {}).keys()) if isinstance(ospfv3_config.get("interface"), dict) else []
    redistribute = list(ospfv3_config.get("redistribute", {}).keys()) if isinstance(ospfv3_config.get("redistribute"), dict) else []

    return VrfOspfv3Summary(
        configured=True,
        router_id=router_id,
        areas=areas,
        interfaces=interfaces,
        redistribute=redistribute,
        raw_config=ospfv3_config,
    )


# ============================================================================
# Config Parsers — ISIS
# ============================================================================


def parse_isis_summary(protocols_config: dict) -> Optional[VrfIsisSummary]:
    """Parse IS-IS summary from VRF protocols."""
    isis_config = protocols_config.get("isis", {})
    if not isis_config:
        return None

    net = isis_config.get("net")
    interfaces = list(isis_config.get("interface", {}).keys()) if isinstance(isis_config.get("interface"), dict) else []

    redistribute_ipv4 = []
    redistribute_ipv6 = []
    redist = isis_config.get("redistribute", {})
    if isinstance(redist, dict):
        ipv4_redist = redist.get("ipv4", {})
        if isinstance(ipv4_redist, dict):
            redistribute_ipv4 = list(ipv4_redist.keys())
        ipv6_redist = redist.get("ipv6", {})
        if isinstance(ipv6_redist, dict):
            redistribute_ipv6 = list(ipv6_redist.keys())

    return VrfIsisSummary(
        configured=True,
        net=net,
        interfaces=interfaces,
        redistribute_ipv4=redistribute_ipv4,
        redistribute_ipv6=redistribute_ipv6,
        raw_config=isis_config,
    )


# ============================================================================
# Config Parsers — BGP
# ============================================================================


def parse_bgp_summary(protocols_config: dict) -> Optional[VrfBgpSummary]:
    """Parse BGP summary from VRF protocols."""
    bgp_config = protocols_config.get("bgp", {})
    if not bgp_config:
        return None

    system_as = None
    as_val = bgp_config.get("system-as")
    if as_val:
        try:
            system_as = int(as_val)
        except (ValueError, TypeError):
            pass

    router_id = None
    params = bgp_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    neighbors = list(bgp_config.get("neighbor", {}).keys()) if isinstance(bgp_config.get("neighbor"), dict) else []
    peer_groups = list(bgp_config.get("peer-group", {}).keys()) if isinstance(bgp_config.get("peer-group"), dict) else []
    address_families = list(bgp_config.get("address-family", {}).keys()) if isinstance(bgp_config.get("address-family"), dict) else []

    return VrfBgpSummary(
        configured=True,
        system_as=system_as,
        router_id=router_id,
        neighbors=neighbors,
        peer_groups=peer_groups,
        address_families=address_families,
        raw_config=bgp_config,
    )


# ============================================================================
# Config Parsers — DHCP
# ============================================================================


def parse_dhcp_config(service_config: dict) -> Optional[VrfDhcpConfig]:
    """Parse DHCP server configuration from VRF service."""
    dhcp_config = service_config.get("dhcp-server", {})
    if not dhcp_config:
        return None

    shared_networks = []
    for net_name, net_data in (dhcp_config.get("shared-network-name", {}) or {}).items():
        if net_data is None:
            net_data = {}

        subnets = []
        for prefix, subnet_data in (net_data.get("subnet", {}) or {}).items():
            if subnet_data is None:
                subnet_data = {}
            subnets.append(VrfDhcpSubnetSummary(
                prefix=prefix,
                default_router=subnet_data.get("default-router") or (subnet_data.get("option", {}) or {}).get("default-router"),
                ranges=len(subnet_data.get("range", {})) if isinstance(subnet_data.get("range"), dict) else 0,
                static_mappings=len(subnet_data.get("static-mapping", {})) if isinstance(subnet_data.get("static-mapping"), dict) else 0,
            ))

        shared_networks.append(VrfDhcpNetworkSummary(
            name=net_name,
            description=net_data.get("description"),
            disabled="disable" in net_data,
            subnets=subnets,
        ))

    return VrfDhcpConfig(
        configured=True,
        disabled="disable" in dhcp_config,
        shared_networks=shared_networks,
        raw_config=dhcp_config,
    )


# ============================================================================
# Config Parsers — DHCPv6
# ============================================================================


def parse_dhcpv6_config(service_config: dict) -> Optional[VrfDhcpv6Config]:
    """Parse DHCPv6 server configuration from VRF service."""
    dhcpv6_config = service_config.get("dhcpv6-server", {})
    if not dhcpv6_config:
        return None

    shared_networks = []
    for net_name, net_data in (dhcpv6_config.get("shared-network-name", {}) or {}).items():
        if net_data is None:
            net_data = {}

        subnets = []
        for prefix, subnet_data in (net_data.get("subnet", {}) or {}).items():
            if subnet_data is None:
                subnet_data = {}
            subnets.append(VrfDhcpv6SubnetSummary(
                prefix=prefix,
                ranges=len(subnet_data.get("range", {})) if isinstance(subnet_data.get("range"), dict) else 0,
                static_mappings=len(subnet_data.get("static-mapping", {})) if isinstance(subnet_data.get("static-mapping"), dict) else 0,
            ))

        shared_networks.append(VrfDhcpv6NetworkSummary(
            name=net_name,
            description=net_data.get("description"),
            disabled="disable" in net_data,
            subnets=subnets,
        ))

    return VrfDhcpv6Config(
        configured=True,
        disabled="disable" in dhcpv6_config,
        shared_networks=shared_networks,
        raw_config=dhcpv6_config,
    )


# ============================================================================
# Config Parsers — VRF Instances (main parser)
# ============================================================================


def parse_vrf_instances(names_raw: dict) -> List[VrfInstance]:
    """Parse VRF instance configurations."""
    instances = []

    for vrf_name, vrf_config in names_raw.items():
        if vrf_config is None:
            vrf_config = {}

        # Detect which protocol subtrees are configured
        protocols = []
        protocols_config = vrf_config.get("protocols", {})
        if isinstance(protocols_config, dict):
            protocols = list(protocols_config.keys())

        # Detect which service subtrees are configured
        services = []
        service_config = vrf_config.get("service", {})
        if isinstance(service_config, dict):
            services = list(service_config.keys())

        # Parse protocol subtrees
        static = parse_static_config(protocols_config) if isinstance(protocols_config, dict) else None
        rpki = parse_rpki_config(protocols_config) if isinstance(protocols_config, dict) else None
        failover = parse_failover_config(protocols_config) if isinstance(protocols_config, dict) else None
        ospf = parse_ospf_summary(protocols_config) if isinstance(protocols_config, dict) else None
        ospfv3 = parse_ospfv3_summary(protocols_config) if isinstance(protocols_config, dict) else None
        isis = parse_isis_summary(protocols_config) if isinstance(protocols_config, dict) else None
        bgp = parse_bgp_summary(protocols_config) if isinstance(protocols_config, dict) else None

        # Parse service subtrees
        dhcp = parse_dhcp_config(service_config) if isinstance(service_config, dict) else None
        dhcpv6 = parse_dhcpv6_config(service_config) if isinstance(service_config, dict) else None

        instances.append(VrfInstance(
            name=vrf_name,
            description=vrf_config.get("description"),
            disabled="disable" in vrf_config,
            table=int(vrf_config["table"]) if vrf_config.get("table") else None,
            vni=int(vrf_config["vni"]) if vrf_config.get("vni") else None,
            ip=parse_ip_settings(vrf_config, "ip"),
            ipv6=parse_ip_settings(vrf_config, "ipv6"),
            protocols=protocols,
            services=services,
            static=static,
            rpki=rpki,
            failover=failover,
            ospf=ospf,
            ospfv3=ospfv3,
            isis=isis,
            bgp=bgp,
            dhcp=dhcp,
            dhcpv6=dhcpv6,
        ))

    return instances


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def vrf_batch_configure(http_request: Request, body: VrfBatchRequest):
    """Execute a batch of VRF configuration operations."""
    await require_write_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")
            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.op}")
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

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "VRF configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
