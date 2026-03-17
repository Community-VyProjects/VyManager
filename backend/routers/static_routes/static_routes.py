"""
Static Routes Router

API endpoints for managing VyOS static route configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import StaticRoutesBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/static-routes", tags=["static-routes"])

# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Pydantic Models
# ============================================================================


class NextHop(BaseModel):
    """Next-hop configuration"""
    address: str
    distance: Optional[int] = None
    disable: bool = False
    vrf: Optional[str] = None
    interface: Optional[str] = None
    bfd_enable: bool = False
    bfd_profile: Optional[str] = None
    bfd_multi_hop: bool = False
    bfd_multi_hop_source: Optional[str] = None
    segments: Optional[str] = None  # SRv6 segments (IPv6 only)


class InterfaceRoute(BaseModel):
    """Interface route configuration"""
    interface: str
    distance: Optional[int] = None
    disable: bool = False
    vrf: Optional[str] = None
    segments: Optional[str] = None  # SRv6 segments (IPv6 only)


class StaticRoute(BaseModel):
    """Static route (IPv4 or IPv6)"""
    destination: str
    description: Optional[str] = None
    next_hops: List[NextHop] = []
    interfaces: List[InterfaceRoute] = []
    blackhole: bool = False
    blackhole_distance: Optional[int] = None
    blackhole_tag: Optional[int] = None
    reject: bool = False
    reject_distance: Optional[int] = None
    reject_tag: Optional[int] = None
    dhcp_interfaces: List[str] = []  # DHCP interfaces (multi)
    route_type: str = "ipv4"  # ipv4 or ipv6


class RoutingTable(BaseModel):
    """Custom routing table"""
    table_id: int
    description: Optional[str] = None
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []


# ============================================================================
# Static ARP Models
# ============================================================================


class ArpEntry(BaseModel):
    """Static ARP entry"""
    ip_address: str
    mac_address: str
    description: Optional[str] = None


class ArpInterface(BaseModel):
    """ARP entries for an interface"""
    interface: str
    entries: List[ArpEntry] = []


# ============================================================================
# Multicast Route Models
# ============================================================================


class MrouteNextHop(BaseModel):
    """Multicast route next-hop"""
    address: str
    distance: Optional[int] = None
    disable: bool = False


class MrouteInterface(BaseModel):
    """Multicast route interface"""
    interface: str
    distance: Optional[int] = None
    disable: bool = False


class MulticastRoute(BaseModel):
    """Multicast route entry"""
    prefix: str
    next_hops: List[MrouteNextHop] = []
    interfaces: List[MrouteInterface] = []


# ============================================================================
# Neighbor Proxy Models
# ============================================================================


class NeighborProxyArp(BaseModel):
    """Neighbor proxy ARP entry"""
    ip_address: str
    interfaces: List[str] = []


class NeighborProxyNd(BaseModel):
    """Neighbor proxy ND (IPv6) entry"""
    ipv6_address: str
    interfaces: List[str] = []


class NeighborProxy(BaseModel):
    """Neighbor proxy configuration"""
    arp_entries: List[NeighborProxyArp] = []
    nd_entries: List[NeighborProxyNd] = []


# ============================================================================
# Complete Configuration Model
# ============================================================================


class StaticRoutesConfig(BaseModel):
    """Complete static routes configuration"""
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []
    routing_tables: List[RoutingTable] = []
    route_map: Optional[str] = None
    arp_interfaces: List[ArpInterface] = []
    multicast_routes: List[MulticastRoute] = []
    neighbor_proxy: NeighborProxy = NeighborProxy()


class StaticRoutesBatchOperation(BaseModel):
    """Single operation in a batch request"""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class StaticRoutesBatchRequest(BaseModel):
    """Model for batch configuration"""
    destination: str = Field(..., description="Route destination (CIDR)")
    route_type: str = Field("ipv4", description="Route type: ipv4 or ipv6")
    table_id: Optional[int] = Field(None, description="Routing table ID (optional)")
    operations: List[StaticRoutesBatchOperation]


class ArpBatchRequest(BaseModel):
    """Model for ARP batch configuration"""
    interface: str = Field(..., description="Interface name")
    ip_address: Optional[str] = Field(None, description="IP address for the ARP entry")
    operations: List[StaticRoutesBatchOperation]


class MrouteBatchRequest(BaseModel):
    """Model for multicast route batch configuration"""
    prefix: str = Field(..., description="Multicast route prefix (CIDR)")
    operations: List[StaticRoutesBatchOperation]


class NeighborProxyBatchRequest(BaseModel):
    """Model for neighbor proxy batch configuration"""
    address: str = Field(..., description="IP address (IPv4 for ARP, IPv6 for ND)")
    proxy_type: str = Field("arp", description="Proxy type: arp or nd")
    operations: List[StaticRoutesBatchOperation]


class RoutingTableBatchRequest(BaseModel):
    """Model for routing table batch configuration"""
    table_id: int = Field(..., description="Routing table ID (1-200)")
    operations: List[StaticRoutesBatchOperation]


class TableRouteBatchRequest(BaseModel):
    """Model for table route batch configuration"""
    table_id: int = Field(..., description="Routing table ID (1-200)")
    destination: str = Field(..., description="Route destination (CIDR)")
    route_type: str = Field("ipv4", description="Route type: ipv4 or ipv6")
    operations: List[StaticRoutesBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_static_routes_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    # Check RBAC permission
    await require_read_permission(request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=StaticRoutesConfig)
async def get_static_routes_config(http_request: Request, refresh: bool = False):
    """
    Get all static routes configuration from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        # Navigate to protocols -> static
        static_config = full_config.get("protocols", {}).get("static", {})

        if not static_config:
            return StaticRoutesConfig(
                ipv4_routes=[],
                ipv6_routes=[],
                routing_tables=[],
                route_map=None,
                arp_interfaces=[],
                multicast_routes=[],
                neighbor_proxy=NeighborProxy()
            )

        # Parse IPv4 routes
        ipv4_routes = []
        ipv4_routes_raw = static_config.get("route", {})
        if ipv4_routes_raw:
            for destination, route_config in ipv4_routes_raw.items():
                route = parse_route_config(destination, route_config, "ipv4")
                ipv4_routes.append(route)

        # Parse IPv6 routes
        ipv6_routes = []
        ipv6_routes_raw = static_config.get("route6", {})
        if ipv6_routes_raw:
            for destination, route_config in ipv6_routes_raw.items():
                route = parse_route_config(destination, route_config, "ipv6")
                ipv6_routes.append(route)

        # Parse routing tables
        routing_tables = []
        tables_raw = static_config.get("table", {})
        if tables_raw:
            for table_id, table_config in tables_raw.items():
                table = parse_routing_table(table_id, table_config)
                routing_tables.append(table)

        # Get route-map
        route_map = static_config.get("route-map")

        # Parse static ARP
        arp_interfaces = []
        arp_raw = static_config.get("arp", {})
        if arp_raw:
            arp_interfaces = parse_arp_config(arp_raw)

        # Parse multicast routes - check both "mroute" (1.5) and "multicast" (1.4)
        multicast_routes = []
        mroute_raw = static_config.get("mroute", {})
        multicast_raw = static_config.get("multicast", {})

        if mroute_raw:
            # VyOS 1.5 format
            multicast_routes = parse_mroute_config_v1_5(mroute_raw)
        elif multicast_raw:
            # VyOS 1.4 format
            multicast_routes = parse_mroute_config_v1_4(multicast_raw)

        # Parse neighbor proxy
        neighbor_proxy = NeighborProxy()
        neighbor_proxy_raw = static_config.get("neighbor-proxy", {})
        if neighbor_proxy_raw:
            neighbor_proxy = parse_neighbor_proxy_config(neighbor_proxy_raw)

        return StaticRoutesConfig(
            ipv4_routes=ipv4_routes,
            ipv6_routes=ipv6_routes,
            routing_tables=routing_tables,
            route_map=route_map,
            arp_interfaces=arp_interfaces,
            multicast_routes=multicast_routes,
            neighbor_proxy=neighbor_proxy
        )

    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def parse_route_config(destination: str, route_config: dict, route_type: str) -> StaticRoute:
    """Parse route configuration from VyOS format to generalized format."""
    description = route_config.get("description")

    # Parse next-hops
    next_hops = []
    next_hops_raw = route_config.get("next-hop", {})
    if next_hops_raw:
        for nh_address, nh_config in next_hops_raw.items():
            # Handle empty config (just the next-hop address)
            if nh_config is None:
                nh_config = {}

            # Parse BFD settings
            bfd_config = nh_config.get("bfd", {})
            bfd_enable = "bfd" in nh_config
            bfd_profile = None
            bfd_multi_hop = False
            bfd_multi_hop_source = None

            if isinstance(bfd_config, dict):
                bfd_profile = bfd_config.get("profile")
                if "multi-hop" in bfd_config:
                    bfd_multi_hop = True
                    multi_hop_config = bfd_config.get("multi-hop", {})
                    if isinstance(multi_hop_config, dict):
                        bfd_multi_hop_source = multi_hop_config.get("source-address")

            next_hop = NextHop(
                address=nh_address,
                distance=int(nh_config.get("distance")) if nh_config.get("distance") else None,
                disable="disable" in nh_config,
                vrf=nh_config.get("vrf"),
                interface=nh_config.get("interface"),
                bfd_enable=bfd_enable,
                bfd_profile=bfd_profile,
                bfd_multi_hop=bfd_multi_hop,
                bfd_multi_hop_source=bfd_multi_hop_source,
                segments=nh_config.get("segments")
            )
            next_hops.append(next_hop)

    # Parse interface routes
    interfaces = []
    interfaces_raw = route_config.get("interface", {})
    if interfaces_raw:
        for iface_name, iface_config in interfaces_raw.items():
            # Handle empty config
            if iface_config is None:
                iface_config = {}

            interface_route = InterfaceRoute(
                interface=iface_name,
                distance=int(iface_config.get("distance")) if iface_config.get("distance") else None,
                disable="disable" in iface_config,
                vrf=iface_config.get("vrf"),
                segments=iface_config.get("segments")
            )
            interfaces.append(interface_route)

    # Parse blackhole
    blackhole = "blackhole" in route_config
    blackhole_distance = None
    blackhole_tag = None
    if blackhole and isinstance(route_config.get("blackhole"), dict):
        blackhole_distance = int(route_config["blackhole"].get("distance")) if route_config["blackhole"].get("distance") else None
        blackhole_tag = int(route_config["blackhole"].get("tag")) if route_config["blackhole"].get("tag") else None

    # Parse reject
    reject = "reject" in route_config
    reject_distance = None
    reject_tag = None
    if reject and isinstance(route_config.get("reject"), dict):
        reject_distance = int(route_config["reject"].get("distance")) if route_config["reject"].get("distance") else None
        reject_tag = int(route_config["reject"].get("tag")) if route_config["reject"].get("tag") else None

    # Parse DHCP interfaces (can be multi)
    dhcp_interfaces = []
    dhcp_iface_raw = route_config.get("dhcp-interface")
    if dhcp_iface_raw:
        if isinstance(dhcp_iface_raw, str):
            dhcp_interfaces = [dhcp_iface_raw]
        elif isinstance(dhcp_iface_raw, list):
            dhcp_interfaces = dhcp_iface_raw
        elif isinstance(dhcp_iface_raw, dict):
            dhcp_interfaces = list(dhcp_iface_raw.keys())

    return StaticRoute(
        destination=destination,
        description=description,
        next_hops=next_hops,
        interfaces=interfaces,
        blackhole=blackhole,
        blackhole_distance=blackhole_distance,
        blackhole_tag=blackhole_tag,
        reject=reject,
        reject_distance=reject_distance,
        reject_tag=reject_tag,
        dhcp_interfaces=dhcp_interfaces,
        route_type=route_type
    )


def parse_routing_table(table_id: str, table_config: dict) -> RoutingTable:
    """Parse routing table configuration."""
    description = table_config.get("description")

    # Parse IPv4 routes in table
    ipv4_routes = []
    ipv4_routes_raw = table_config.get("route", {})
    if ipv4_routes_raw:
        for destination, route_config in ipv4_routes_raw.items():
            route = parse_route_config(destination, route_config, "ipv4")
            ipv4_routes.append(route)

    # Parse IPv6 routes in table
    ipv6_routes = []
    ipv6_routes_raw = table_config.get("route6", {})
    if ipv6_routes_raw:
        for destination, route_config in ipv6_routes_raw.items():
            route = parse_route_config(destination, route_config, "ipv6")
            ipv6_routes.append(route)

    return RoutingTable(
        table_id=int(table_id),
        description=description,
        ipv4_routes=ipv4_routes,
        ipv6_routes=ipv6_routes
    )


def parse_arp_config(arp_config: dict) -> List[ArpInterface]:
    """Parse static ARP configuration."""
    arp_interfaces = []

    # ARP config structure: arp -> interface -> <name> -> address -> <ip> -> mac
    interface_raw = arp_config.get("interface", {})
    if interface_raw:
        for iface_name, iface_config in interface_raw.items():
            entries = []
            if iface_config is None:
                iface_config = {}

            address_raw = iface_config.get("address", {})
            if address_raw:
                for ip_addr, addr_config in address_raw.items():
                    if addr_config is None:
                        addr_config = {}
                    entry = ArpEntry(
                        ip_address=ip_addr,
                        mac_address=addr_config.get("mac", ""),
                        description=addr_config.get("description")
                    )
                    entries.append(entry)

            arp_interfaces.append(ArpInterface(
                interface=iface_name,
                entries=entries
            ))

    return arp_interfaces


def parse_mroute_config_v1_5(mroute_config: dict) -> List[MulticastRoute]:
    """
    Parse multicast route configuration for VyOS 1.5.

    VyOS 1.5 structure:
        mroute <prefix> next-hop <ip> [distance <n>] [disable]
        mroute <prefix> interface <interface> [distance <n>] [disable]
    """
    mroutes = []

    for prefix, config in mroute_config.items():
        if config is None:
            config = {}

        # Parse next-hops
        next_hops = []
        next_hop_raw = config.get("next-hop", {})
        if next_hop_raw:
            for nh_addr, nh_config in next_hop_raw.items():
                if nh_config is None:
                    nh_config = {}
                next_hops.append(MrouteNextHop(
                    address=nh_addr,
                    distance=int(nh_config.get("distance")) if nh_config.get("distance") else None,
                    disable="disable" in nh_config
                ))

        # Parse interfaces
        interfaces = []
        interface_raw = config.get("interface", {})
        if interface_raw:
            for iface_name, iface_config in interface_raw.items():
                if iface_config is None:
                    iface_config = {}
                interfaces.append(MrouteInterface(
                    interface=iface_name,
                    distance=int(iface_config.get("distance")) if iface_config.get("distance") else None,
                    disable="disable" in iface_config
                ))

        mroutes.append(MulticastRoute(
            prefix=prefix,
            next_hops=next_hops,
            interfaces=interfaces
        ))

    return mroutes


def parse_mroute_config_v1_4(multicast_config: dict) -> List[MulticastRoute]:
    """
    Parse multicast route configuration for VyOS 1.4.

    VyOS 1.4 structure:
        multicast route <prefix> next-hop <ip> [distance <n>]
        multicast interface-route <prefix> next-hop-interface <interface> [distance <n>]
    """
    mroutes = []
    mroute_map = {}  # Combine routes and interface-routes by prefix

    # Parse "route" entries (next-hop based)
    route_raw = multicast_config.get("route", {})
    if route_raw:
        for prefix, config in route_raw.items():
            if config is None:
                config = {}

            if prefix not in mroute_map:
                mroute_map[prefix] = {"next_hops": [], "interfaces": []}

            # Parse next-hops
            next_hop_raw = config.get("next-hop", {})
            if next_hop_raw:
                for nh_addr, nh_config in next_hop_raw.items():
                    if nh_config is None:
                        nh_config = {}
                    mroute_map[prefix]["next_hops"].append(MrouteNextHop(
                        address=nh_addr,
                        distance=int(nh_config.get("distance")) if nh_config.get("distance") else None,
                        disable=False  # VyOS 1.4 doesn't have disable for multicast routes
                    ))

    # Parse "interface-route" entries
    interface_route_raw = multicast_config.get("interface-route", {})
    if interface_route_raw:
        for prefix, config in interface_route_raw.items():
            if config is None:
                config = {}

            if prefix not in mroute_map:
                mroute_map[prefix] = {"next_hops": [], "interfaces": []}

            # Parse next-hop-interface
            next_hop_iface_raw = config.get("next-hop-interface", {})
            if next_hop_iface_raw:
                for iface_name, iface_config in next_hop_iface_raw.items():
                    if iface_config is None:
                        iface_config = {}
                    mroute_map[prefix]["interfaces"].append(MrouteInterface(
                        interface=iface_name,
                        distance=int(iface_config.get("distance")) if iface_config.get("distance") else None,
                        disable=False  # VyOS 1.4 doesn't have disable for multicast routes
                    ))

    # Convert to list of MulticastRoute
    for prefix, data in mroute_map.items():
        mroutes.append(MulticastRoute(
            prefix=prefix,
            next_hops=data["next_hops"],
            interfaces=data["interfaces"]
        ))

    return mroutes


def parse_neighbor_proxy_config(neighbor_proxy_config: dict) -> NeighborProxy:
    """Parse neighbor proxy configuration."""
    arp_entries = []
    nd_entries = []

    # Parse ARP proxy entries
    arp_raw = neighbor_proxy_config.get("arp", {})
    if arp_raw:
        for ip_addr, config in arp_raw.items():
            if config is None:
                config = {}

            # Get interfaces (can be multi)
            interfaces = []
            iface_raw = config.get("interface")
            if iface_raw:
                if isinstance(iface_raw, str):
                    interfaces = [iface_raw]
                elif isinstance(iface_raw, list):
                    interfaces = iface_raw
                elif isinstance(iface_raw, dict):
                    interfaces = list(iface_raw.keys())

            arp_entries.append(NeighborProxyArp(
                ip_address=ip_addr,
                interfaces=interfaces
            ))

    # Parse ND (IPv6) proxy entries
    nd_raw = neighbor_proxy_config.get("nd", {})
    if nd_raw:
        for ipv6_addr, config in nd_raw.items():
            if config is None:
                config = {}

            # Get interfaces (can be multi)
            interfaces = []
            iface_raw = config.get("interface")
            if iface_raw:
                if isinstance(iface_raw, str):
                    interfaces = [iface_raw]
                elif isinstance(iface_raw, list):
                    interfaces = iface_raw
                elif isinstance(iface_raw, dict):
                    interfaces = list(iface_raw.keys())

            nd_entries.append(NeighborProxyNd(
                ipv6_address=ipv6_addr,
                interfaces=interfaces
            ))

    return NeighborProxy(
        arp_entries=arp_entries,
        nd_entries=nd_entries
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def static_routes_batch_configure(http_request: Request, body: StaticRoutesBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add destination
            if "destination" in params:
                args.append(body.destination)

            # Add table_id if specified and method accepts it
            if body.table_id and "table_id" in params:
                args.append(str(body.table_id))

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                # Check remaining parameters
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# ARP Batch Endpoint
# ============================================================================


@router.post("/arp/batch")
async def arp_batch_configure(http_request: Request, body: ArpBatchRequest):
    """
    Execute a batch of ARP configuration operations.
    """
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            args = []

            # Add interface
            if "interface" in params:
                args.append(body.interface)

            # Add ip_address if provided
            if body.ip_address and "ip_address" in params:
                args.append(body.ip_address)

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "ARP configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Multicast Route Batch Endpoint
# ============================================================================


@router.post("/mroute/batch")
async def mroute_batch_configure(http_request: Request, body: MrouteBatchRequest):
    """
    Execute a batch of multicast route configuration operations.
    """
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            args = []

            # Add prefix
            if "prefix" in params:
                args.append(body.prefix)

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Multicast route configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Neighbor Proxy Batch Endpoint
# ============================================================================


@router.post("/neighbor-proxy/batch")
async def neighbor_proxy_batch_configure(http_request: Request, body: NeighborProxyBatchRequest):
    """
    Execute a batch of neighbor proxy configuration operations.
    """
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            args = []

            # Add address (ip_address for ARP, ipv6_address for ND)
            if body.proxy_type == "arp" and "ip_address" in params:
                args.append(body.address)
            elif body.proxy_type == "nd" and "ipv6_address" in params:
                args.append(body.address)

            # Add operation value (usually interface)
            if operation.value and len(params) > len(args):
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Neighbor proxy configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Routing Table Batch Endpoint
# ============================================================================


@router.post("/table/batch")
async def table_batch_configure(http_request: Request, body: RoutingTableBatchRequest):
    """
    Execute a batch of routing table configuration operations.
    """
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            args = []

            # Add table_id
            if "table_id" in params:
                args.append(str(body.table_id))

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Routing table configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Table Route Batch Endpoint
# ============================================================================


@router.post("/table/route/batch")
async def table_route_batch_configure(http_request: Request, body: TableRouteBatchRequest):
    """
    Execute a batch of route configuration operations within a routing table.
    """
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            args = []

            # Add table_id
            if "table_id" in params:
                args.append(str(body.table_id))

            # Add destination
            if "destination" in params:
                args.append(body.destination)

            # Add operation value if provided (could be next-hop, interface, distance, etc.)
            if operation.value and len(params) > len(args):
                # Handle comma-separated values for multi-parameter operations
                values = operation.value.split(",") if "," in operation.value else [operation.value]
                remaining_params = params[len(args):]
                for i, param in enumerate(remaining_params):
                    if param != "self" and i < len(values):
                        args.append(values[i])

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Table route configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
