"""
Static Routes Router

API endpoints for managing VyOS static route configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import StaticRoutesBatchBuilder
import inspect

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
    bfd_enable: bool = False
    bfd_profile: Optional[str] = None


class InterfaceRoute(BaseModel):
    """Interface route configuration"""
    interface: str
    distance: Optional[int] = None
    disable: bool = False


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
    dhcp_interface: Optional[str] = None  # 1.4 only
    route_type: str = "ipv4"  # ipv4 or ipv6


class RoutingTable(BaseModel):
    """Custom routing table"""
    table_id: int
    description: Optional[str] = None
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []


class StaticRoutesConfig(BaseModel):
    """Complete static routes configuration"""
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []
    routing_tables: List[RoutingTable] = []
    route_map: Optional[str] = None


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
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        service = get_session_vyos_service(http_request)
        full_config = service.get_full_config(refresh=refresh)

        # Navigate to protocols -> static
        static_config = full_config.get("protocols", {}).get("static", {})

        if not static_config:
            return StaticRoutesConfig(
                ipv4_routes=[],
                ipv6_routes=[],
                routing_tables=[],
                route_map=None
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

        return StaticRoutesConfig(
            ipv4_routes=ipv4_routes,
            ipv6_routes=ipv6_routes,
            routing_tables=routing_tables,
            route_map=route_map
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_route_config(destination: str, route_config: dict, route_type: str) -> StaticRoute:
    """Parse route configuration from VyOS format to generalized format."""
    description = route_config.get("description")

    # Parse next-hops
    next_hops = []
    next_hops_raw = route_config.get("next-hop", {})
    if next_hops_raw:
        for nh_address, nh_config in next_hops_raw.items():
            next_hop = NextHop(
                address=nh_address,
                distance=int(nh_config.get("distance")) if nh_config.get("distance") else None,
                disable="disable" in nh_config,
                vrf=nh_config.get("vrf"),
                bfd_enable="bfd" in nh_config,
                bfd_profile=nh_config.get("bfd", {}).get("profile") if isinstance(nh_config.get("bfd"), dict) else None
            )
            next_hops.append(next_hop)

    # Parse interface routes
    interfaces = []
    interfaces_raw = route_config.get("interface", {})
    if interfaces_raw:
        for iface_name, iface_config in interfaces_raw.items():
            interface_route = InterfaceRoute(
                interface=iface_name,
                distance=int(iface_config.get("distance")) if iface_config.get("distance") else None,
                disable="disable" in iface_config
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

    # Parse DHCP interface (1.4 only)
    dhcp_interface = None
    dhcp_iface_raw = route_config.get("dhcp-interface")
    if dhcp_iface_raw:
        # dhcp-interface can be a string or dict
        if isinstance(dhcp_iface_raw, str):
            dhcp_interface = dhcp_iface_raw
        elif isinstance(dhcp_iface_raw, dict):
            # Get first interface name
            dhcp_interface = list(dhcp_iface_raw.keys())[0] if dhcp_iface_raw else None

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
        dhcp_interface=dhcp_interface,
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


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def static_routes_batch_configure(request: StaticRoutesBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = StaticRoutesBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add destination
            if "destination" in params:
                args.append(request.destination)

            # Add table_id if specified and method accepts it
            if request.table_id and "table_id" in params:
                args.append(str(request.table_id))

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
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Additional Helper Endpoints
# ============================================================================
# All operations use the batch endpoint above
# No direct DELETE or specialized POST endpoints - use /batch for all operations
# ============================================================================
