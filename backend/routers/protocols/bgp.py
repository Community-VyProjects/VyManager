"""
BGP Protocol Configuration Endpoints

All BGP (Border Gateway Protocol) configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for BGP protocol endpoints
router = APIRouter(prefix="/vyos/bgp", tags=["bgp-protocol"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class BGPBatchRequest(BaseModel):
    """Model for batch BGP configuration."""

    asn: str = Field(..., description="BGP Autonomous System Number")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of BGP operations",
        json_schema_extra={
            "example": [
                {"op": "set_router_id", "value": "10.0.0.1"},
                {"op": "add_neighbor", "neighbor": "10.0.0.2", "remote_as": "65001"},
                {"op": "add_network", "family": "ipv4-unicast", "network": "10.0.0.0/24"}
            ]
        }
    )


class NeighborRequest(BaseModel):
    """Model for adding/updating a BGP neighbor."""

    asn: str = Field(..., description="Local ASN")
    neighbor: str = Field(..., description="Neighbor address")
    remote_as: str = Field(..., description="Neighbor remote AS")
    description: Optional[str] = None
    update_source: Optional[str] = None
    ebgp_multihop: Optional[int] = None
    password: Optional[str] = None
    peer_group: Optional[str] = None
    shutdown: bool = False


class NetworkRequest(BaseModel):
    """Model for advertising a network."""

    asn: str = Field(..., description="Local ASN")
    family: str = Field(..., description="Address family (ipv4-unicast, ipv6-unicast)")
    network: str = Field(..., description="Network prefix to advertise")
    route_map: Optional[str] = None


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models (for READ operations)
# ============================================================================


class BGPTimers(BaseModel):
    """BGP neighbor timers."""
    holdtime: Optional[str] = None
    keepalive: Optional[str] = None


class BGPBFD(BaseModel):
    """BGP BFD configuration."""
    enabled: bool = False
    check_control_plane_failure: bool = False


class BGPNeighborResponse(BaseModel):
    """BGP neighbor configuration."""
    address: str
    remote_as: Optional[str] = None
    description: Optional[str] = None
    shutdown: bool = False
    update_source: Optional[str] = None
    ebgp_multihop: Optional[str] = None
    password: Optional[str] = None
    passive: bool = False
    disable_connected_check: bool = False
    peer_group: Optional[str] = None
    timers: Optional[BGPTimers] = None
    bfd: Optional[BGPBFD] = None


class BGPPeerGroupResponse(BaseModel):
    """BGP peer group configuration."""
    name: str
    remote_as: Optional[str] = None
    description: Optional[str] = None
    update_source: Optional[str] = None
    ebgp_multihop: Optional[str] = None
    passive: bool = False


class BGPNetwork(BaseModel):
    """BGP advertised network."""
    prefix: str
    route_map: Optional[str] = None


class BGPRedistribution(BaseModel):
    """BGP redistribution configuration."""
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[str] = None


class BGPAggregate(BaseModel):
    """BGP aggregate address."""
    prefix: str
    summary_only: bool = False
    as_set: bool = False


class BGPAddressFamilyNeighbor(BaseModel):
    """BGP neighbor settings within address family."""
    address: str
    route_map_import: Optional[str] = None
    route_map_export: Optional[str] = None
    prefix_list_import: Optional[str] = None
    prefix_list_export: Optional[str] = None
    soft_reconfiguration_inbound: bool = False
    maximum_prefix: Optional[str] = None
    default_originate: bool = False
    route_reflector_client: bool = False
    next_hop_self: bool = False
    remove_private_as: bool = False
    as_override: bool = False


class BGPAddressFamilyResponse(BaseModel):
    """BGP address family configuration."""
    networks: List[BGPNetwork] = Field(default_factory=list)
    redistributions: List[BGPRedistribution] = Field(default_factory=list)
    aggregates: List[BGPAggregate] = Field(default_factory=list)
    neighbors: List[BGPAddressFamilyNeighbor] = Field(default_factory=list)


class BGPConfigResponse(BaseModel):
    """Full BGP configuration response."""

    configured: bool = False
    asn: Optional[str] = None
    router_id: Optional[str] = None
    log_neighbor_changes: bool = False
    no_fast_external_failover: bool = False
    neighbors: List[BGPNeighborResponse] = Field(default_factory=list)
    peer_groups: List[BGPPeerGroupResponse] = Field(default_factory=list)
    address_families: Dict[str, BGPAddressFamilyResponse] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "configured": True,
                "asn": "65000",
                "router_id": "10.0.0.1",
                "neighbors": [
                    {
                        "address": "10.0.0.2",
                        "remote_as": "65001",
                        "description": "Transit Provider"
                    }
                ],
                "address_families": {
                    "ipv4-unicast": {
                        "networks": [{"prefix": "10.0.0.0/24"}],
                        "redistributions": [{"protocol": "connected"}]
                    }
                }
            }
        }
    )


# ============================================================================
# BGP Status Response Models (for real-time monitoring)
# ============================================================================


class BGPNeighborStatus(BaseModel):
    """Real-time BGP neighbor status from 'show ip bgp summary'."""

    neighbor: str
    remote_as: str
    msg_rcvd: int = 0
    msg_sent: int = 0
    up_down: str = "never"  # Uptime or "never"
    state: str = "Idle"  # Established, Active, Idle, Connect, OpenSent, OpenConfirm
    pfx_rcvd: int = 0  # Prefixes received (only when Established)
    description: Optional[str] = None


class BGPStatusResponse(BaseModel):
    """Parsed BGP summary status."""

    local_as: Optional[str] = None
    router_id: Optional[str] = None
    total_neighbors: int = 0
    established_count: int = 0
    neighbors: List[BGPNeighborStatus] = Field(default_factory=list)
    raw_output: Optional[str] = None  # For debugging


class BGPRoute(BaseModel):
    """A single BGP route entry."""

    network: str  # Network prefix
    next_hop: str  # Next hop IP
    metric: Optional[str] = None
    local_pref: Optional[str] = None
    weight: Optional[str] = None
    as_path: str = ""  # AS path as string
    origin: str = "?"  # i=IGP, e=EGP, ?=incomplete
    best: bool = False  # Is this the best path?
    valid: bool = True


class BGPRoutesResponse(BaseModel):
    """Parsed BGP routing table."""

    total_routes: int = 0
    best_routes: int = 0
    routes: List[BGPRoute] = Field(default_factory=list)
    raw_output: Optional[str] = None  # For debugging


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=BGPConfigResponse)
async def get_bgp_config(http_request: Request) -> BGPConfigResponse:
    """
    Get full BGP configuration from VyOS.

    Returns configuration details including ASN, neighbors, address families, etc.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.bgp import BGPMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("bgp", {})

        mapper = BGPMapper(service.get_version())
        parsed_data = mapper.parse_bgp_config(raw_config)

        return BGPConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_bgp_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get BGP capabilities for the connected VyOS version.

    Returns supported address families, timers, and other options.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        address_families = [
            {"value": "ipv4-unicast", "label": "IPv4 Unicast", "description": "Standard IPv4 unicast routing"},
            {"value": "ipv6-unicast", "label": "IPv6 Unicast", "description": "Standard IPv6 unicast routing"},
            {"value": "l2vpn-evpn", "label": "L2VPN EVPN", "description": "Ethernet VPN for VXLAN"},
        ]

        redistribute_protocols = [
            {"value": "connected", "label": "Connected", "description": "Directly connected routes"},
            {"value": "static", "label": "Static", "description": "Static routes"},
            {"value": "ospf", "label": "OSPF", "description": "OSPF routes"},
            {"value": "rip", "label": "RIP", "description": "RIP routes"},
            {"value": "kernel", "label": "Kernel", "description": "Kernel routes"},
        ]

        return {
            "address_families": address_families,
            "redistribute_protocols": redistribute_protocols,
            "default_timers": {
                "holdtime": 180,
                "keepalive": 60,
            },
            "ebgp_multihop_max": 255,
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_bgp_summary(http_request: Request) -> Dict[str, Any]:
    """
    Get BGP summary (neighbor states) from VyOS.

    Returns neighbor states and statistics similar to 'show ip bgp summary'.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        # Execute show command
        response = await run_in_threadpool(
            service.execute_show_command,
            ["show", "ip", "bgp", "summary"]
        )

        return {
            "success": True,
            "data": response if response else {},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/neighbors/{neighbor}/routes")
async def get_bgp_neighbor_routes(http_request: Request, neighbor: str) -> Dict[str, Any]:
    """
    Get routes from a specific BGP neighbor.

    Returns routes received from the specified neighbor.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.execute_show_command,
            ["show", "ip", "bgp", "neighbors", neighbor, "routes"]
        )

        return {
            "success": True,
            "neighbor": neighbor,
            "data": response if response else {},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=BGPStatusResponse)
async def get_bgp_status(http_request: Request) -> BGPStatusResponse:
    """
    Get parsed BGP neighbor status for real-time monitoring.

    Parses 'show ip bgp summary' output into structured data showing:
    - Neighbor states (Established, Active, Idle, etc.)
    - Message counters (received/sent)
    - Uptime
    - Prefix counts

    This endpoint is ideal for monitoring dashboards and alerting.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        # Get raw summary output
        response = await run_in_threadpool(
            service.execute_show_command,
            ["show", "ip", "bgp", "summary"]
        )

        # Also get config for descriptions
        full_config = await run_in_threadpool(service.get_full_config)
        bgp_config = full_config.get("protocols", {}).get("bgp", {})

        # Parse the summary output
        neighbors = _parse_bgp_summary(response, bgp_config)

        # Get local AS and router ID from config
        local_as = None
        router_id = None
        if bgp_config:
            # VyOS 1.4+ uses system-as, older uses local-as
            local_as = bgp_config.get("system-as") or bgp_config.get("local-as")
            # Router ID might be in parameters
            params = bgp_config.get("parameters", {})
            router_id = params.get("router-id")

        established_count = sum(1 for n in neighbors if n.state == "Established")

        return BGPStatusResponse(
            local_as=local_as,
            router_id=router_id,
            total_neighbors=len(neighbors),
            established_count=established_count,
            neighbors=neighbors,
            raw_output=str(response) if response else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/routes", response_model=BGPRoutesResponse)
async def get_bgp_routes(http_request: Request, family: str = "ipv4") -> BGPRoutesResponse:
    """
    Get parsed BGP routing table.

    Returns structured BGP routes including:
    - Network prefixes
    - Next hops
    - AS paths
    - Best path indicators
    - Origin codes

    Query params:
    - family: ipv4 or ipv6 (default: ipv4)
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        # Build show command based on family
        if family == "ipv6":
            cmd = ["show", "bgp", "ipv6", "unicast"]
        else:
            cmd = ["show", "ip", "bgp"]

        response = await run_in_threadpool(
            service.execute_show_command,
            cmd
        )

        # Parse the routing table output
        routes = _parse_bgp_routes(response)

        best_count = sum(1 for r in routes if r.best)

        return BGPRoutesResponse(
            total_routes=len(routes),
            best_routes=best_count,
            routes=routes,
            raw_output=str(response) if response else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_bgp_summary(response: Any, bgp_config: Dict) -> List[BGPNeighborStatus]:
    """
    Parse 'show ip bgp summary' output into structured neighbor status.

    The output format typically looks like:
    IPv4 Unicast Summary:
    BGP router identifier 10.0.0.1, local AS number 65000 vrf-id 0
    ...
    Neighbor        V         AS MsgRcvd MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd
    10.0.0.2        4      65001     123     456        0    0    0 01:23:45          100
    10.0.0.3        4      65002      10      20        0    0    0    never       Active
    """
    neighbors = []

    if not response:
        return neighbors

    # Convert response to string if needed
    raw_text = ""
    if isinstance(response, dict):
        raw_text = response.get("result", "") or str(response)
    elif isinstance(response, str):
        raw_text = response
    else:
        raw_text = str(response)

    # Get neighbor descriptions from config
    neighbor_descriptions = {}
    if bgp_config:
        config_neighbors = bgp_config.get("neighbor", {})
        for addr, config in config_neighbors.items():
            if isinstance(config, dict):
                desc = config.get("description")
                if desc:
                    neighbor_descriptions[addr] = desc

    # Parse lines looking for neighbor entries
    lines = raw_text.split("\n")
    in_neighbor_section = False

    for line in lines:
        line = line.strip()

        # Look for the header line
        if "Neighbor" in line and "State/PfxRcd" in line:
            in_neighbor_section = True
            continue

        if not in_neighbor_section:
            continue

        # Skip empty lines
        if not line:
            continue

        # Try to parse neighbor line
        # Format: Neighbor V AS MsgRcvd MsgSent TblVer InQ OutQ Up/Down State/PfxRcd
        parts = line.split()
        if len(parts) < 9:
            continue

        # First part should be an IP address
        neighbor_ip = parts[0]
        if not _is_ip_address(neighbor_ip):
            continue

        try:
            remote_as = parts[2]
            msg_rcvd = int(parts[3]) if parts[3].isdigit() else 0
            msg_sent = int(parts[4]) if parts[4].isdigit() else 0
            up_down = parts[8]

            # State/PfxRcd is the last column - could be a number (prefixes) or a state name
            state_or_pfx = parts[9] if len(parts) > 9 else parts[8]

            if state_or_pfx.isdigit():
                # It's a prefix count, meaning state is Established
                state = "Established"
                pfx_rcvd = int(state_or_pfx)
            else:
                # It's a state name (Active, Idle, Connect, etc.)
                state = state_or_pfx
                pfx_rcvd = 0

            neighbors.append(BGPNeighborStatus(
                neighbor=neighbor_ip,
                remote_as=remote_as,
                msg_rcvd=msg_rcvd,
                msg_sent=msg_sent,
                up_down=up_down,
                state=state,
                pfx_rcvd=pfx_rcvd,
                description=neighbor_descriptions.get(neighbor_ip),
            ))
        except (ValueError, IndexError):
            continue

    return neighbors


def _parse_bgp_routes(response: Any) -> List[BGPRoute]:
    """
    Parse 'show ip bgp' output into structured routes.

    Output format example:
    BGP table version is 5, local router ID is 10.0.0.1
    Status codes: s suppressed, d damped, h history, * valid, > best, ...
    Origin codes: i - IGP, e - EGP, ? - incomplete

       Network          Next Hop            Metric LocPrf Weight Path
    *> 10.0.0.0/24      0.0.0.0                  0         32768 i
    *> 192.168.1.0/24   10.0.0.2                           0 65001 i
    *  192.168.1.0/24   10.0.0.3                           0 65002 65001 i
    """
    routes = []

    if not response:
        return routes

    # Convert response to string
    raw_text = ""
    if isinstance(response, dict):
        raw_text = response.get("result", "") or str(response)
    elif isinstance(response, str):
        raw_text = response
    else:
        raw_text = str(response)

    lines = raw_text.split("\n")
    in_route_section = False

    for line in lines:
        # Look for the header line indicating route section start
        if "Network" in line and "Next Hop" in line:
            in_route_section = True
            continue

        if not in_route_section:
            continue

        if not line.strip():
            continue

        # Parse route line
        # Status codes are at the start: *, >, s, d, h, etc.
        # Format: Status Network NextHop Metric LocPrf Weight Path Origin

        # Check for status codes at start
        best = ">" in line[:3]
        valid = "*" in line[:3]

        # Remove status codes (first 3 chars typically)
        route_part = line[3:] if len(line) > 3 else line
        parts = route_part.split()

        if len(parts) < 2:
            continue

        try:
            # First part could be network or continuation
            network = ""
            next_hop = ""
            metric = None
            local_pref = None
            weight = None
            as_path = ""
            origin = "?"

            # Try to identify network (has / for CIDR)
            idx = 0
            if "/" in parts[0] or _is_ip_address(parts[0].split("/")[0]):
                network = parts[0]
                idx = 1
            else:
                # This might be a continuation line, skip for now
                continue

            # Next hop
            if idx < len(parts) and _is_ip_address(parts[idx]):
                next_hop = parts[idx]
                idx += 1

            # The rest are metric, locprf, weight, path, origin
            # These are optional and positional
            remaining = parts[idx:]

            # Last char is typically origin (i, e, ?)
            if remaining and remaining[-1] in ("i", "e", "?"):
                origin = remaining[-1]
                remaining = remaining[:-1]

            # Try to extract numeric values and AS path
            numeric_values = []
            as_path_parts = []

            for val in remaining:
                if val.isdigit():
                    numeric_values.append(val)
                else:
                    as_path_parts.append(val)

            # Assign numeric values (metric, locprf, weight)
            if len(numeric_values) >= 1:
                metric = numeric_values[0]
            if len(numeric_values) >= 2:
                local_pref = numeric_values[1]
            if len(numeric_values) >= 3:
                weight = numeric_values[2]

            # AS path from remaining parts
            as_path = " ".join(as_path_parts)

            routes.append(BGPRoute(
                network=network,
                next_hop=next_hop,
                metric=metric,
                local_pref=local_pref,
                weight=weight,
                as_path=as_path,
                origin=origin,
                best=best,
                valid=valid,
            ))
        except (ValueError, IndexError):
            continue

    return routes


def _is_ip_address(s: str) -> bool:
    """Check if string looks like an IP address (IPv4 or IPv6)."""
    if not s:
        return False
    # Simple check - contains dots for IPv4 or colons for IPv6
    if "." in s:
        parts = s.split(".")
        if len(parts) == 4:
            return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts if p.isdigit())
    if ":" in s:
        # IPv6 - simplified check
        return True
    return False


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_bgp_batch(http_request: Request, request: BGPBatchRequest) -> VyOSResponse:
    """
    Configure BGP using batch operations.

    **Supported Operations:**

    | Operation | Required Params | Description |
    |-----------|-----------------|-------------|
    | `set_router_id` | value | Set BGP router ID |
    | `delete_router_id` | - | Remove router ID |
    | `enable_log_neighbor_changes` | - | Enable neighbor change logging |
    | `disable_log_neighbor_changes` | - | Disable neighbor change logging |
    | `add_neighbor` | neighbor, remote_as | Add a BGP neighbor |
    | `delete_neighbor` | neighbor | Remove a BGP neighbor |
    | `set_neighbor_description` | neighbor, value | Set neighbor description |
    | `set_neighbor_update_source` | neighbor, value | Set update source |
    | `set_neighbor_ebgp_multihop` | neighbor, value | Set eBGP multihop |
    | `set_neighbor_password` | neighbor, value | Set MD5 password |
    | `set_neighbor_peer_group` | neighbor, value | Assign to peer group |
    | `shutdown_neighbor` | neighbor | Shutdown neighbor |
    | `enable_neighbor` | neighbor | Enable neighbor |
    | `set_neighbor_timers` | neighbor, holdtime, keepalive | Set timers |
    | `enable_neighbor_bfd` | neighbor | Enable BFD |
    | `add_peer_group` | group, remote_as | Add peer group |
    | `delete_peer_group` | group | Remove peer group |
    | `add_network` | family, network | Advertise network |
    | `delete_network` | family, network | Remove network |
    | `add_redistribute` | family, protocol | Redistribute protocol |
    | `delete_redistribute` | family, protocol | Remove redistribution |
    | `set_af_neighbor_route_map_in` | family, neighbor, value | Set import route-map |
    | `set_af_neighbor_route_map_out` | family, neighbor, value | Set export route-map |
    | `enable_af_neighbor_next_hop_self` | family, neighbor | Enable next-hop-self |
    | `enable_af_neighbor_rr_client` | family, neighbor | Set as RR client |
    | `delete_bgp` | - | Delete entire BGP configuration |

    **Example Request:**
    ```json
    {
        "asn": "65000",
        "operations": [
            {"op": "set_router_id", "value": "10.0.0.1"},
            {"op": "add_neighbor", "neighbor": "10.0.0.2", "remote_as": "65001"},
            {"op": "set_neighbor_description", "neighbor": "10.0.0.2", "value": "Transit"},
            {"op": "add_network", "family": "ipv4-unicast", "network": "10.0.0.0/24"}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.bgp import BGPMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = BGPMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Basic BGP operations
            if op_type == "set_router_id":
                value = operation.get("value")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_router_id(request.asn, value))

            elif op_type == "delete_router_id":
                delete_commands.append(mapper.get_router_id_path(request.asn))

            elif op_type == "enable_log_neighbor_changes":
                set_commands.append(mapper.get_log_neighbor_changes(request.asn))

            elif op_type == "disable_log_neighbor_changes":
                delete_commands.append(mapper.get_log_neighbor_changes(request.asn))

            # Neighbor operations
            elif op_type == "add_neighbor":
                neighbor = operation.get("neighbor")
                remote_as = operation.get("remote_as")
                if not neighbor or not remote_as:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and remote_as")
                set_commands.append(mapper.get_neighbor_remote_as(request.asn, neighbor, remote_as))

            elif op_type == "delete_neighbor":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor(request.asn, neighbor))

            elif op_type == "set_neighbor_description":
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and value")
                set_commands.append(mapper.get_neighbor_description(request.asn, neighbor, value))

            elif op_type == "delete_neighbor_description":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_description_path(request.asn, neighbor))

            elif op_type == "set_neighbor_update_source":
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and value")
                set_commands.append(mapper.get_neighbor_update_source(request.asn, neighbor, value))

            elif op_type == "delete_neighbor_update_source":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_update_source_path(request.asn, neighbor))

            elif op_type == "set_neighbor_ebgp_multihop":
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and value")
                set_commands.append(mapper.get_neighbor_ebgp_multihop(request.asn, neighbor, str(value)))

            elif op_type == "delete_neighbor_ebgp_multihop":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_ebgp_multihop_path(request.asn, neighbor))

            elif op_type == "set_neighbor_password":
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and value")
                set_commands.append(mapper.get_neighbor_password(request.asn, neighbor, value))

            elif op_type == "delete_neighbor_password":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_password_path(request.asn, neighbor))

            elif op_type == "set_neighbor_peer_group":
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor and value")
                set_commands.append(mapper.get_neighbor_peer_group(request.asn, neighbor, value))

            elif op_type == "shutdown_neighbor":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                set_commands.append(mapper.get_neighbor_shutdown(request.asn, neighbor))

            elif op_type == "enable_neighbor":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_shutdown(request.asn, neighbor))

            elif op_type == "set_neighbor_timers":
                neighbor = operation.get("neighbor")
                holdtime = operation.get("holdtime")
                keepalive = operation.get("keepalive")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                if holdtime:
                    set_commands.append(mapper.get_neighbor_timers_holdtime(request.asn, neighbor, str(holdtime)))
                if keepalive:
                    set_commands.append(mapper.get_neighbor_timers_keepalive(request.asn, neighbor, str(keepalive)))

            elif op_type == "delete_neighbor_timers":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_timers_path(request.asn, neighbor))

            elif op_type == "enable_neighbor_bfd":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                set_commands.append(mapper.get_neighbor_bfd(request.asn, neighbor))

            elif op_type == "disable_neighbor_bfd":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_bfd(request.asn, neighbor))

            elif op_type == "enable_neighbor_passive":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                set_commands.append(mapper.get_neighbor_passive(request.asn, neighbor))

            elif op_type == "disable_neighbor_passive":
                neighbor = operation.get("neighbor")
                if not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires neighbor")
                delete_commands.append(mapper.get_neighbor_passive(request.asn, neighbor))

            # Peer group operations
            elif op_type == "add_peer_group":
                group = operation.get("group")
                remote_as = operation.get("remote_as")
                if not group:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group")
                set_commands.append(mapper.get_peer_group(request.asn, group))
                if remote_as:
                    set_commands.append(mapper.get_peer_group_remote_as(request.asn, group, remote_as))

            elif op_type == "delete_peer_group":
                group = operation.get("group")
                if not group:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group")
                delete_commands.append(mapper.get_peer_group(request.asn, group))

            elif op_type == "set_peer_group_description":
                group = operation.get("group")
                value = operation.get("value")
                if not group or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group and value")
                set_commands.append(mapper.get_peer_group_description(request.asn, group, value))

            elif op_type == "set_peer_group_update_source":
                group = operation.get("group")
                value = operation.get("value")
                if not group or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group and value")
                set_commands.append(mapper.get_peer_group_update_source(request.asn, group, value))

            elif op_type == "set_peer_group_ebgp_multihop":
                group = operation.get("group")
                value = operation.get("value")
                if not group or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group and value")
                set_commands.append(mapper.get_peer_group_ebgp_multihop(request.asn, group, str(value)))

            elif op_type == "enable_peer_group_passive":
                group = operation.get("group")
                if not group:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group")
                set_commands.append(mapper.get_peer_group_passive(request.asn, group))

            elif op_type == "disable_peer_group_passive":
                group = operation.get("group")
                if not group:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires group")
                delete_commands.append(mapper.get_peer_group_passive(request.asn, group))

            # Address family operations
            elif op_type == "add_network":
                family = operation.get("family")
                network = operation.get("network")
                if not family or not network:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and network")
                set_commands.append(mapper.get_af_network(request.asn, family, network))
                route_map = operation.get("route_map")
                if route_map:
                    set_commands.append(mapper.get_af_network_route_map(request.asn, family, network, route_map))

            elif op_type == "delete_network":
                family = operation.get("family")
                network = operation.get("network")
                if not family or not network:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and network")
                delete_commands.append(mapper.get_af_network(request.asn, family, network))

            elif op_type == "add_redistribute":
                family = operation.get("family")
                protocol = operation.get("protocol")
                if not family or not protocol:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and protocol")
                set_commands.append(mapper.get_af_redistribute(request.asn, family, protocol))
                route_map = operation.get("route_map")
                if route_map:
                    set_commands.append(mapper.get_af_redistribute_route_map(request.asn, family, protocol, route_map))
                metric = operation.get("metric")
                if metric:
                    set_commands.append(mapper.get_af_redistribute_metric(request.asn, family, protocol, str(metric)))

            elif op_type == "delete_redistribute":
                family = operation.get("family")
                protocol = operation.get("protocol")
                if not family or not protocol:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and protocol")
                delete_commands.append(mapper.get_af_redistribute(request.asn, family, protocol))

            elif op_type == "add_aggregate_address":
                family = operation.get("family")
                prefix = operation.get("prefix")
                if not family or not prefix:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and prefix")
                set_commands.append(mapper.get_af_aggregate_address(request.asn, family, prefix))
                if operation.get("summary_only"):
                    set_commands.append(mapper.get_af_aggregate_address_summary_only(request.asn, family, prefix))
                if operation.get("as_set"):
                    set_commands.append(mapper.get_af_aggregate_address_as_set(request.asn, family, prefix))

            elif op_type == "delete_aggregate_address":
                family = operation.get("family")
                prefix = operation.get("prefix")
                if not family or not prefix:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and prefix")
                delete_commands.append(mapper.get_af_aggregate_address(request.asn, family, prefix))

            # Address family neighbor settings
            elif op_type == "set_af_neighbor_route_map_in":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_route_map_import(request.asn, family, neighbor, value))

            elif op_type == "set_af_neighbor_route_map_out":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_route_map_export(request.asn, family, neighbor, value))

            elif op_type == "set_af_neighbor_prefix_list_in":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_prefix_list_import(request.asn, family, neighbor, value))

            elif op_type == "set_af_neighbor_prefix_list_out":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_prefix_list_export(request.asn, family, neighbor, value))

            elif op_type == "enable_af_neighbor_soft_reconfig":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_soft_reconfiguration_inbound(request.asn, family, neighbor))

            elif op_type == "set_af_neighbor_maximum_prefix":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_maximum_prefix(request.asn, family, neighbor, str(value)))

            elif op_type == "enable_af_neighbor_default_originate":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_default_originate(request.asn, family, neighbor))

            elif op_type == "disable_af_neighbor_default_originate":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                delete_commands.append(mapper.get_af_neighbor_default_originate(request.asn, family, neighbor))

            elif op_type == "enable_af_neighbor_rr_client":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_route_reflector_client(request.asn, family, neighbor))

            elif op_type == "disable_af_neighbor_rr_client":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                delete_commands.append(mapper.get_af_neighbor_route_reflector_client(request.asn, family, neighbor))

            elif op_type == "enable_af_neighbor_next_hop_self":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_next_hop_self(request.asn, family, neighbor))

            elif op_type == "disable_af_neighbor_next_hop_self":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                delete_commands.append(mapper.get_af_neighbor_next_hop_self(request.asn, family, neighbor))

            elif op_type == "enable_af_neighbor_remove_private_as":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_remove_private_as(request.asn, family, neighbor))

            elif op_type == "disable_af_neighbor_remove_private_as":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                delete_commands.append(mapper.get_af_neighbor_remove_private_as(request.asn, family, neighbor))

            elif op_type == "enable_af_neighbor_as_override":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                set_commands.append(mapper.get_af_neighbor_as_override(request.asn, family, neighbor))

            elif op_type == "disable_af_neighbor_as_override":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                if not family or not neighbor:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family and neighbor")
                delete_commands.append(mapper.get_af_neighbor_as_override(request.asn, family, neighbor))

            elif op_type == "set_af_neighbor_allowas_in":
                family = operation.get("family")
                neighbor = operation.get("neighbor")
                value = operation.get("value")
                if not family or not neighbor or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires family, neighbor, and value")
                set_commands.append(mapper.get_af_neighbor_allowas_in(request.asn, family, neighbor, str(value)))

            # Delete entire BGP configuration
            elif op_type == "delete_bgp":
                delete_commands.append(mapper.get_bgp_delete(request.asn))

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # For VyOS 1.4+, ensure system-as is set first when configuring BGP
        if set_commands and mapper._use_new_syntax:
            # Insert system-as command at the beginning to create BGP process
            set_commands.insert(0, mapper.get_system_as(request.asn))

        # Execute commands
        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=delete_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            data=response.result if hasattr(response, 'result') else None,
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/neighbor")
async def add_bgp_neighbor(http_request: Request, request: NeighborRequest) -> VyOSResponse:
    """
    Add or update a BGP neighbor.

    This is a convenience endpoint for adding a neighbor with common settings.
    For more complex configurations, use the batch endpoint.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.bgp import BGPMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = BGPMapper(service.get_version())

        set_commands = [
            mapper.get_neighbor_remote_as(request.asn, request.neighbor, request.remote_as)
        ]

        if request.description:
            set_commands.append(mapper.get_neighbor_description(request.asn, request.neighbor, request.description))

        if request.update_source:
            set_commands.append(mapper.get_neighbor_update_source(request.asn, request.neighbor, request.update_source))

        if request.ebgp_multihop:
            set_commands.append(mapper.get_neighbor_ebgp_multihop(request.asn, request.neighbor, str(request.ebgp_multihop)))

        if request.password:
            set_commands.append(mapper.get_neighbor_password(request.asn, request.neighbor, request.password))

        if request.peer_group:
            set_commands.append(mapper.get_neighbor_peer_group(request.asn, request.neighbor, request.peer_group))

        delete_commands = []
        if request.shutdown:
            set_commands.append(mapper.get_neighbor_shutdown(request.asn, request.neighbor))
        else:
            delete_commands.append(mapper.get_neighbor_shutdown(request.asn, request.neighbor))

        # For VyOS 1.4+, ensure system-as is set first
        if mapper._use_new_syntax:
            set_commands.insert(0, mapper.get_system_as(request.asn))

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=delete_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            data=response.result if hasattr(response, 'result') else None,
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/network")
async def add_bgp_network(http_request: Request, request: NetworkRequest) -> VyOSResponse:
    """
    Advertise a network in BGP.

    This is a convenience endpoint for advertising a network.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.bgp import BGPMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = BGPMapper(service.get_version())

        set_commands = [
            mapper.get_af_network(request.asn, request.family, request.network)
        ]

        if request.route_map:
            set_commands.append(mapper.get_af_network_route_map(request.asn, request.family, request.network, request.route_map))

        # For VyOS 1.4+, ensure system-as is set first
        if mapper._use_new_syntax:
            set_commands.insert(0, mapper.get_system_as(request.asn))

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=[]
        )

        return VyOSResponse(
            success=response.status == 200,
            data=response.result if hasattr(response, 'result') else None,
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
