"""
Route Policy Router

API endpoints for managing VyOS policy route and route6 configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
Handles both IPv4 (route) and IPv6 (route6) policies.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import RouteBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/route", tags=["route"])

# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Pydantic Models - Match Conditions
# ============================================================================

class MatchConditions(BaseModel):
    """Match conditions for a policy route rule."""
    # Address
    source_address: Optional[str] = None
    destination_address: Optional[str] = None
    source_mac_address: Optional[str] = None
    destination_mac_address: Optional[str] = None
    
    # Groups
    source_group_address: Optional[str] = None
    source_group_domain: Optional[str] = None
    source_group_mac: Optional[str] = None
    source_group_network: Optional[str] = None
    source_group_port: Optional[str] = None
    destination_group_address: Optional[str] = None
    destination_group_domain: Optional[str] = None
    destination_group_mac: Optional[str] = None
    destination_group_network: Optional[str] = None
    destination_group_port: Optional[str] = None
    
    # Port
    source_port: Optional[str] = None
    destination_port: Optional[str] = None
    
    # Protocol
    protocol: Optional[str] = None
    tcp_flags: Optional[str] = None
    
    # ICMP (IPv4)
    icmp_code: Optional[str] = None
    icmp_type: Optional[str] = None
    icmp_type_name: Optional[str] = None
    
    # ICMPv6 (IPv6)
    icmpv6_code: Optional[str] = None
    icmpv6_type: Optional[str] = None
    icmpv6_type_name: Optional[str] = None
    
    # Packet characteristics
    fragment: Optional[str] = None  # match-frag or match-non-frag
    packet_type: Optional[str] = None  # broadcast, host, multicast, other
    packet_length: Optional[str] = None
    packet_length_exclude: Optional[str] = None
    dscp: Optional[str] = None
    dscp_exclude: Optional[str] = None
    
    # State & marks
    state: Optional[str] = None  # established, invalid, new, related
    ipsec: Optional[str] = None  # match-ipsec or match-none
    mark: Optional[str] = None
    connection_mark: Optional[str] = None
    
    # TTL/Hop limit
    ttl_eq: Optional[str] = None
    ttl_gt: Optional[str] = None
    ttl_lt: Optional[str] = None
    hop_limit_eq: Optional[str] = None
    hop_limit_gt: Optional[str] = None
    hop_limit_lt: Optional[str] = None
    
    # Time-based
    time_monthdays: Optional[str] = None
    time_startdate: Optional[str] = None
    time_starttime: Optional[str] = None
    time_stopdate: Optional[str] = None
    time_stoptime: Optional[str] = None
    time_utc: bool = False
    time_weekdays: Optional[str] = None
    
    # Rate limiting
    limit_burst: Optional[str] = None
    limit_rate: Optional[str] = None
    recent_count: Optional[str] = None
    recent_time: Optional[str] = None


class SetActions(BaseModel):
    """Set actions for a policy route rule."""
    action_drop: bool = False
    connection_mark: Optional[str] = None
    dscp: Optional[str] = None
    mark: Optional[str] = None
    table: Optional[str] = None
    tcp_mss: Optional[str] = None
    vrf: Optional[str] = None  # 1.5+ only


# ============================================================================
# Pydantic Models - Rule
# ============================================================================

class PolicyRouteRule(BaseModel):
    """A single rule in a policy route."""
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    log: Optional[str] = None  # enable or disable
    match: MatchConditions
    set: SetActions


# ============================================================================
# Pydantic Models - Policy
# ============================================================================

class PolicyRoute(BaseModel):
    """A policy route (IPv4 or IPv6)."""
    name: str
    policy_type: str  # "route" or "route6"
    description: Optional[str] = None
    default_log: bool = False
    rules: List[PolicyRouteRule] = []
    interfaces: List[Dict[str, str]] = []


# ============================================================================
# Pydantic Models - Requests/Responses
# ============================================================================

class RouteBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class RouteBatchRequest(BaseModel):
    """Model for batch configuration."""
    policy_type: str = Field(..., description="Policy type (route or route6)")
    name: str = Field(..., description="Policy name")
    rule_number: Optional[int] = Field(None, description="Rule number if applicable")
    operations: List[RouteBatchOperation]


class RouteConfigResponse(BaseModel):
    """Response containing configuration data."""
    ipv4_policies: List[PolicyRoute] = []
    ipv6_policies: List[PolicyRoute] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================

@router.get("/capabilities")
async def get_route_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = RouteBatchBuilder(version=version)
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

@router.get("/config", response_model=RouteConfigResponse)
async def get_route_config(http_request: Request, refresh: bool = False):
    """
    Get all policy route configurations from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Both IPv4 (route) and IPv6 (route6) policies
    """
    try:
        service = get_session_vyos_service(http_request)
        full_config = service.get_full_config(refresh=refresh)

        ipv4_policies = []
        ipv6_policies = []

        # Parse IPv4 policies (route)
        if "policy" in full_config and "route" in full_config["policy"]:
            for policy_name, policy_data in full_config["policy"]["route"].items():
                policy = parse_policy("route", policy_name, policy_data, full_config)
                ipv4_policies.append(policy)

        # Parse IPv6 policies (route6)
        if "policy" in full_config and "route6" in full_config["policy"]:
            for policy_name, policy_data in full_config["policy"]["route6"].items():
                policy = parse_policy("route6", policy_name, policy_data, full_config)
                ipv6_policies.append(policy)

        return RouteConfigResponse(
            ipv4_policies=ipv4_policies,
            ipv6_policies=ipv6_policies,
            total_ipv4=len(ipv4_policies),
            total_ipv6=len(ipv6_policies)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_policy(policy_type: str, policy_name: str, policy_data: dict, full_config: dict = None) -> PolicyRoute:
    """Parse a policy from VyOS config."""
    policy = PolicyRoute(
        name=policy_name,
        policy_type=policy_type,
        description=policy_data.get("description"),
        default_log="default-log" in policy_data,
        rules=[],
        interfaces=[]
    )

    if "rule" in policy_data:
        for rule_num, rule_data in policy_data["rule"].items():
            rule = parse_rule(int(rule_num), rule_data)
            policy.rules.append(rule)

    # Sort rules by rule number
    policy.rules.sort(key=lambda r: r.rule_number)

    # Find interfaces that use this policy
    # In VyOS, interfaces are listed in: policy route <name> interface <interface>
    if policy_data and "interface" in policy_data:
        interfaces = policy_data["interface"]
        # Can be a single string or a list
        if isinstance(interfaces, str):
            interfaces = [interfaces]
        elif isinstance(interfaces, list):
            pass
        else:
            interfaces = []

        for interface_name in interfaces:
            # Determine interface type from name
            if interface_name.startswith("eth"):
                interface_type = "ethernet"
            elif interface_name.startswith("bond"):
                interface_type = "bonding"
            elif interface_name.startswith("dum"):
                interface_type = "dummy"
            elif interface_name.startswith("br"):
                interface_type = "bridge"
            else:
                interface_type = "unknown"

            policy.interfaces.append({
                "name": interface_name,
                "type": interface_type
            })

    return policy


def parse_rule(rule_number: int, rule_data: dict) -> PolicyRouteRule:
    """Parse a single rule from VyOS config."""
    match = MatchConditions()
    set_actions = SetActions()

    # Basic rule properties
    description = rule_data.get("description")
    disable = "disable" in rule_data
    log = rule_data.get("log")

    # Parse match conditions
    parse_match_conditions(rule_data, match)

    # Parse set actions
    if "set" in rule_data:
        parse_set_actions(rule_data["set"], set_actions)
    if "action" in rule_data and rule_data["action"] == "drop":
        set_actions.action_drop = True

    return PolicyRouteRule(
        rule_number=rule_number,
        description=description,
        disable=disable,
        log=log,
        match=match,
        set=set_actions
    )


def parse_match_conditions(rule_data: dict, match: MatchConditions):
    """Parse match conditions from rule data."""
    # Helper function to handle list or string values
    def get_value(data, key):
        value = data.get(key)
        if isinstance(value, list):
            return value[0] if value else None
        return value

    # Source
    if "source" in rule_data:
        src = rule_data["source"]
        match.source_address = get_value(src, "address")
        match.source_mac_address = get_value(src, "mac-address")
        match.source_port = get_value(src, "port")

        if "group" in src:
            grp = src["group"]
            match.source_group_address = get_value(grp, "address-group")
            match.source_group_domain = get_value(grp, "domain-group")
            match.source_group_mac = get_value(grp, "mac-group")
            match.source_group_network = get_value(grp, "network-group")
            match.source_group_port = get_value(grp, "port-group")

    # Destination
    if "destination" in rule_data:
        dst = rule_data["destination"]
        match.destination_address = get_value(dst, "address")
        match.destination_mac_address = get_value(dst, "mac-address")
        match.destination_port = get_value(dst, "port")

        if "group" in dst:
            grp = dst["group"]
            match.destination_group_address = get_value(grp, "address-group")
            match.destination_group_domain = get_value(grp, "domain-group")
            match.destination_group_mac = get_value(grp, "mac-group")
            match.destination_group_network = get_value(grp, "network-group")
            match.destination_group_port = get_value(grp, "port-group")

    # Protocol (can be string or list)
    protocol_value = rule_data.get("protocol")
    if isinstance(protocol_value, list):
        match.protocol = protocol_value[0] if protocol_value else None
    else:
        match.protocol = protocol_value

    # TCP
    if "tcp" in rule_data:
        tcp_flags_value = rule_data["tcp"].get("flags")
        if isinstance(tcp_flags_value, list):
            match.tcp_flags = tcp_flags_value[0] if tcp_flags_value else None
        else:
            match.tcp_flags = tcp_flags_value

    # ICMP (IPv4)
    if "icmp" in rule_data:
        icmp = rule_data["icmp"]
        icmp_code_value = icmp.get("code")
        if isinstance(icmp_code_value, list):
            match.icmp_code = icmp_code_value[0] if icmp_code_value else None
        else:
            match.icmp_code = icmp_code_value

        icmp_type_value = icmp.get("type")
        if isinstance(icmp_type_value, list):
            match.icmp_type = icmp_type_value[0] if icmp_type_value else None
        else:
            match.icmp_type = icmp_type_value

        icmp_type_name_value = icmp.get("type-name")
        if isinstance(icmp_type_name_value, list):
            match.icmp_type_name = icmp_type_name_value[0] if icmp_type_name_value else None
        else:
            match.icmp_type_name = icmp_type_name_value

    # ICMPv6 (IPv6)
    if "icmpv6" in rule_data:
        icmpv6 = rule_data["icmpv6"]
        icmpv6_code_value = icmpv6.get("code")
        if isinstance(icmpv6_code_value, list):
            match.icmpv6_code = icmpv6_code_value[0] if icmpv6_code_value else None
        else:
            match.icmpv6_code = icmpv6_code_value

        icmpv6_type_value = icmpv6.get("type")
        if isinstance(icmpv6_type_value, list):
            match.icmpv6_type = icmpv6_type_value[0] if icmpv6_type_value else None
        else:
            match.icmpv6_type = icmpv6_type_value

        icmpv6_type_name_value = icmpv6.get("type-name")
        if isinstance(icmpv6_type_name_value, list):
            match.icmpv6_type_name = icmpv6_type_name_value[0] if icmpv6_type_name_value else None
        else:
            match.icmpv6_type_name = icmpv6_type_name_value

    # Packet characteristics
    # Fragment can be: string, list, or dict with keys like "match-frag": {}
    fragment_value = rule_data.get("fragment")
    if isinstance(fragment_value, dict):
        # Extract which fragment option is set
        # Note: VyOS may show both keys, but we prioritize match-frag over match-non-frag
        if "match-frag" in fragment_value:
            match.fragment = "match-frag"
        elif "match-non-frag" in fragment_value:
            match.fragment = "match-non-frag"
        else:
            match.fragment = None
    elif isinstance(fragment_value, list):
        frag_val = fragment_value[0] if fragment_value else None
        if isinstance(frag_val, dict):
            # Handle list of dicts
            if "match-frag" in frag_val:
                match.fragment = "match-frag"
            elif "match-non-frag" in frag_val:
                match.fragment = "match-non-frag"
            else:
                match.fragment = None
        else:
            match.fragment = frag_val
    else:
        match.fragment = fragment_value

    packet_type_value = rule_data.get("packet-type")
    if isinstance(packet_type_value, list):
        match.packet_type = packet_type_value[0] if packet_type_value else None
    else:
        match.packet_type = packet_type_value

    packet_length_value = rule_data.get("packet-length")
    if isinstance(packet_length_value, list):
        match.packet_length = packet_length_value[0] if packet_length_value else None
    else:
        match.packet_length = packet_length_value

    packet_length_exclude_value = rule_data.get("packet-length-exclude")
    if isinstance(packet_length_exclude_value, list):
        match.packet_length_exclude = packet_length_exclude_value[0] if packet_length_exclude_value else None
    else:
        match.packet_length_exclude = packet_length_exclude_value

    dscp_value = rule_data.get("dscp")
    if isinstance(dscp_value, list):
        match.dscp = dscp_value[0] if dscp_value else None
    else:
        match.dscp = dscp_value

    dscp_exclude_value = rule_data.get("dscp-exclude")
    if isinstance(dscp_exclude_value, list):
        match.dscp_exclude = dscp_exclude_value[0] if dscp_exclude_value else None
    else:
        match.dscp_exclude = dscp_exclude_value

    # State & marks
    # Handle state (can be string or list)
    state_value = rule_data.get("state")
    if isinstance(state_value, list):
        match.state = ",".join(state_value) if state_value else None
    else:
        match.state = state_value

    match.ipsec = rule_data.get("ipsec")

    # Handle mark (can be string or list)
    mark_value = rule_data.get("mark")
    if isinstance(mark_value, list):
        match.mark = mark_value[0] if mark_value else None
    else:
        match.mark = mark_value

    # Handle connection-mark (can be string or list)
    conn_mark_value = rule_data.get("connection-mark")
    if isinstance(conn_mark_value, list):
        match.connection_mark = conn_mark_value[0] if conn_mark_value else None
    else:
        match.connection_mark = conn_mark_value

    # TTL/Hop limit (can be string or list)
    if "ttl" in rule_data:
        ttl = rule_data["ttl"]
        ttl_eq_value = ttl.get("eq")
        match.ttl_eq = ttl_eq_value[0] if isinstance(ttl_eq_value, list) and ttl_eq_value else ttl_eq_value

        ttl_gt_value = ttl.get("gt")
        match.ttl_gt = ttl_gt_value[0] if isinstance(ttl_gt_value, list) and ttl_gt_value else ttl_gt_value

        ttl_lt_value = ttl.get("lt")
        match.ttl_lt = ttl_lt_value[0] if isinstance(ttl_lt_value, list) and ttl_lt_value else ttl_lt_value

    if "hop-limit" in rule_data:
        hop = rule_data["hop-limit"]
        hop_eq_value = hop.get("eq")
        match.hop_limit_eq = hop_eq_value[0] if isinstance(hop_eq_value, list) and hop_eq_value else hop_eq_value

        hop_gt_value = hop.get("gt")
        match.hop_limit_gt = hop_gt_value[0] if isinstance(hop_gt_value, list) and hop_gt_value else hop_gt_value

        hop_lt_value = hop.get("lt")
        match.hop_limit_lt = hop_lt_value[0] if isinstance(hop_lt_value, list) and hop_lt_value else hop_lt_value

    # Time-based (can be string or list)
    if "time" in rule_data:
        time = rule_data["time"]
        monthdays_value = time.get("monthdays")
        match.time_monthdays = monthdays_value[0] if isinstance(monthdays_value, list) and monthdays_value else monthdays_value

        startdate_value = time.get("startdate")
        match.time_startdate = startdate_value[0] if isinstance(startdate_value, list) and startdate_value else startdate_value

        starttime_value = time.get("starttime")
        match.time_starttime = starttime_value[0] if isinstance(starttime_value, list) and starttime_value else starttime_value

        stopdate_value = time.get("stopdate")
        match.time_stopdate = stopdate_value[0] if isinstance(stopdate_value, list) and stopdate_value else stopdate_value

        stoptime_value = time.get("stoptime")
        match.time_stoptime = stoptime_value[0] if isinstance(stoptime_value, list) and stoptime_value else stoptime_value

        match.time_utc = "utc" in time

        weekdays_value = time.get("weekdays")
        match.time_weekdays = weekdays_value[0] if isinstance(weekdays_value, list) and weekdays_value else weekdays_value

    # Rate limiting (can be string or list)
    if "limit" in rule_data:
        limit = rule_data["limit"]
        burst_value = limit.get("burst")
        match.limit_burst = burst_value[0] if isinstance(burst_value, list) and burst_value else burst_value

        rate_value = limit.get("rate")
        match.limit_rate = rate_value[0] if isinstance(rate_value, list) and rate_value else rate_value

    if "recent" in rule_data:
        recent = rule_data["recent"]
        count_value = recent.get("count")
        match.recent_count = count_value[0] if isinstance(count_value, list) and count_value else count_value

        time_value = recent.get("time")
        match.recent_time = time_value[0] if isinstance(time_value, list) and time_value else time_value


def parse_set_actions(set_data: dict, set_actions: SetActions):
    """Parse set actions from rule data."""
    # Handle connection-mark (can be string or list)
    conn_mark_value = set_data.get("connection-mark")
    if isinstance(conn_mark_value, list):
        set_actions.connection_mark = conn_mark_value[0] if conn_mark_value else None
    else:
        set_actions.connection_mark = conn_mark_value

    # Handle dscp (can be string or list)
    dscp_value = set_data.get("dscp")
    if isinstance(dscp_value, list):
        set_actions.dscp = dscp_value[0] if dscp_value else None
    else:
        set_actions.dscp = dscp_value

    # Handle mark (can be string or list)
    mark_value = set_data.get("mark")
    if isinstance(mark_value, list):
        set_actions.mark = mark_value[0] if mark_value else None
    else:
        set_actions.mark = mark_value

    # Handle table (can be string or list)
    table_value = set_data.get("table")
    if isinstance(table_value, list):
        set_actions.table = table_value[0] if table_value else None
    else:
        set_actions.table = table_value

    # Handle tcp-mss (can be string or list)
    tcp_mss_value = set_data.get("tcp-mss")
    if isinstance(tcp_mss_value, list):
        set_actions.tcp_mss = tcp_mss_value[0] if tcp_mss_value else None
    else:
        set_actions.tcp_mss = tcp_mss_value

    # Handle vrf (can be string or list)
    vrf_value = set_data.get("vrf")
    if isinstance(vrf_value, list):
        set_actions.vrf = vrf_value[0] if vrf_value else None
    else:
        set_actions.vrf = vrf_value


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================

@router.post("/batch")
async def route_batch_configure(request: RouteBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = RouteBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            # Special handling for interface policy operations
            if operation.op in ["set_interface_policy", "delete_interface_policy"]:
                if operation.value:
                    # Interface name can be eth0, eth1.7 (VLAN), dum0, etc.
                    # VyOS command: set policy route <name> interface <interface>
                    interface_name = operation.value

                    if operation.op == "set_interface_policy":
                        builder.set_interface_policy(request.policy_type, request.name, interface_name)
                    else:
                        builder.delete_interface_policy(request.policy_type, request.name, interface_name)
                continue

            # Special handling for TTL and hop-limit operations (format: "op value" e.g., "eq 10")
            if operation.op in ["set_match_ttl", "set_match_hop_limit"]:
                if operation.value and " " in operation.value:
                    parts = operation.value.split(" ", 1)
                    op_type = parts[0]  # eq, gt, or lt
                    op_value = parts[1]
                    if operation.op == "set_match_ttl":
                        builder.set_match_ttl(request.policy_type, request.name, str(request.rule_number), op_type, op_value)
                    else:
                        builder.set_match_hop_limit(request.policy_type, request.name, str(request.rule_number), op_type, op_value)
                continue

            # Special handling for state operation (format: comma-separated "established,related")
            if operation.op == "set_match_state":
                if operation.value:
                    # Split comma-separated states and set each one individually
                    states = [s.strip() for s in operation.value.split(",")]
                    for state in states:
                        if state:  # Only add if not empty
                            builder.set_match_state(request.policy_type, request.name, str(request.rule_number), state)
                continue

            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add policy_type
            if "policy_type" in params:
                args.append(request.policy_type)

            # Add name
            if "name" in params:
                args.append(request.name)

            # Add rule number if specified
            if request.rule_number and "rule" in params:
                args.append(str(request.rule_number))

            # Add operation value if provided
            if operation.value and len(params) > len(args):
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


# ========================================================================
# Endpoint 4: Reorder Rules - Helper Functions
# ========================================================================

def _get_value(data, key):
    """Helper to get value from dict, handling both strings and single-element arrays."""
    value = data.get(key)
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _recreate_match_conditions(builder, policy_type: str, policy_name: str, rule_num: str, rule_data: dict):
    """Recreate all match conditions for a rule during reorder.

    Note: In VyOS config, match conditions are at the root level of rule_data,
    not under a 'match' key.
    """

    # Source conditions
    if "source" in rule_data:
        src = rule_data["source"]
        if "address" in src:
            addr = _get_value(src, "address")
            if addr:
                builder.set_match_source_address(policy_type, policy_name, rule_num, addr)
        if "mac-address" in src:
            mac = _get_value(src, "mac-address")
            if mac:
                builder.set_match_source_mac_address(policy_type, policy_name, rule_num, mac)
        if "port" in src:
            port = _get_value(src, "port")
            if port:
                builder.set_match_source_port(policy_type, policy_name, rule_num, port)
        if "group" in src:
            grp = src["group"]
            if "address-group" in grp:
                g = _get_value(grp, "address-group")
                if g:
                    builder.set_match_source_group_address(policy_type, policy_name, rule_num, g)
            if "domain-group" in grp:
                g = _get_value(grp, "domain-group")
                if g:
                    builder.set_match_source_group_domain(policy_type, policy_name, rule_num, g)
            if "mac-group" in grp:
                g = _get_value(grp, "mac-group")
                if g:
                    builder.set_match_source_group_mac(policy_type, policy_name, rule_num, g)
            if "network-group" in grp:
                g = _get_value(grp, "network-group")
                if g:
                    builder.set_match_source_group_network(policy_type, policy_name, rule_num, g)
            if "port-group" in grp:
                g = _get_value(grp, "port-group")
                if g:
                    builder.set_match_source_group_port(policy_type, policy_name, rule_num, g)

    # Destination conditions
    if "destination" in rule_data:
        dst = rule_data["destination"]
        if "address" in dst:
            addr = _get_value(dst, "address")
            if addr:
                builder.set_match_destination_address(policy_type, policy_name, rule_num, addr)
        if "mac-address" in dst:
            mac = _get_value(dst, "mac-address")
            if mac:
                builder.set_match_destination_mac_address(policy_type, policy_name, rule_num, mac)
        if "port" in dst:
            port = _get_value(dst, "port")
            if port:
                builder.set_match_destination_port(policy_type, policy_name, rule_num, port)
        if "group" in dst:
            grp = dst["group"]
            if "address-group" in grp:
                g = _get_value(grp, "address-group")
                if g:
                    builder.set_match_destination_group_address(policy_type, policy_name, rule_num, g)
            if "domain-group" in grp:
                g = _get_value(grp, "domain-group")
                if g:
                    builder.set_match_destination_group_domain(policy_type, policy_name, rule_num, g)
            if "mac-group" in grp:
                g = _get_value(grp, "mac-group")
                if g:
                    builder.set_match_destination_group_mac(policy_type, policy_name, rule_num, g)
            if "network-group" in grp:
                g = _get_value(grp, "network-group")
                if g:
                    builder.set_match_destination_group_network(policy_type, policy_name, rule_num, g)
            if "port-group" in grp:
                g = _get_value(grp, "port-group")
                if g:
                    builder.set_match_destination_group_port(policy_type, policy_name, rule_num, g)

    # Protocol
    if "protocol" in rule_data:
        proto = _get_value(rule_data, "protocol")
        if proto:
            builder.set_match_protocol(policy_type, policy_name, rule_num, proto)

    # TCP
    if "tcp" in rule_data:
        tcp = rule_data["tcp"]
        if "flags" in tcp:
            flags = _get_value(tcp, "flags")
            if flags:
                builder.set_match_tcp_flags(policy_type, policy_name, rule_num, flags)

    # ICMP
    if "icmp" in rule_data:
        icmp = rule_data["icmp"]
        if "code" in icmp:
            code = _get_value(icmp, "code")
            if code:
                builder.set_match_icmp_code(policy_type, policy_name, rule_num, code)
        if "type" in icmp:
            icmp_type = _get_value(icmp, "type")
            if icmp_type:
                builder.set_match_icmp_type(policy_type, policy_name, rule_num, icmp_type)
        if "type-name" in icmp:
            type_name = _get_value(icmp, "type-name")
            if type_name:
                builder.set_match_icmp_type_name(policy_type, policy_name, rule_num, type_name)

    # ICMPv6
    if "icmpv6" in rule_data:
        icmpv6 = rule_data["icmpv6"]
        if "code" in icmpv6:
            code = _get_value(icmpv6, "code")
            if code:
                builder.set_match_icmpv6_code(policy_type, policy_name, rule_num, code)
        if "type" in icmpv6:
            icmpv6_type = _get_value(icmpv6, "type")
            if icmpv6_type:
                builder.set_match_icmpv6_type(policy_type, policy_name, rule_num, icmpv6_type)
        if "type-name" in icmpv6:
            type_name = _get_value(icmpv6, "type-name")
            if type_name:
                builder.set_match_icmpv6_type_name(policy_type, policy_name, rule_num, type_name)

    # Packet characteristics
    if "fragment" in rule_data:
        frag = rule_data.get("fragment")
        if frag:
            # Fragment can be a string or an object with keys like "match-frag": {}
            if isinstance(frag, dict):
                # Extract the key name (match-frag or match-non-frag)
                if "match-frag" in frag:
                    builder.set_match_fragment(policy_type, policy_name, rule_num, "match-frag")
                elif "match-non-frag" in frag:
                    builder.set_match_fragment(policy_type, policy_name, rule_num, "match-non-frag")
            elif isinstance(frag, str):
                builder.set_match_fragment(policy_type, policy_name, rule_num, frag)
            elif isinstance(frag, list) and frag:
                # Handle array case
                frag_val = frag[0]
                if isinstance(frag_val, dict):
                    if "match-frag" in frag_val:
                        builder.set_match_fragment(policy_type, policy_name, rule_num, "match-frag")
                    elif "match-non-frag" in frag_val:
                        builder.set_match_fragment(policy_type, policy_name, rule_num, "match-non-frag")
                else:
                    builder.set_match_fragment(policy_type, policy_name, rule_num, frag_val)

    if "packet-type" in rule_data:
        pkt_type = _get_value(rule_data, "packet-type")
        if pkt_type:
            builder.set_match_packet_type(policy_type, policy_name, rule_num, pkt_type)

    if "packet-length" in rule_data:
        pkt_len = _get_value(rule_data, "packet-length")
        if pkt_len:
            builder.set_match_packet_length(policy_type, policy_name, rule_num, pkt_len)

    if "packet-length-exclude" in rule_data:
        pkt_len_exc = _get_value(rule_data, "packet-length-exclude")
        if pkt_len_exc:
            builder.set_match_packet_length_exclude(policy_type, policy_name, rule_num, pkt_len_exc)

    if "dscp" in rule_data:
        dscp = _get_value(rule_data, "dscp")
        if dscp:
            builder.set_match_dscp(policy_type, policy_name, rule_num, dscp)

    if "dscp-exclude" in rule_data:
        dscp_exc = _get_value(rule_data, "dscp-exclude")
        if dscp_exc:
            builder.set_match_dscp_exclude(policy_type, policy_name, rule_num, dscp_exc)

    # State
    if "state" in rule_data:
        state_value = rule_data["state"]
        if isinstance(state_value, list):
            # Send each state individually
            for s in state_value:
                if s:
                    builder.set_match_state(policy_type, policy_name, rule_num, s)
        elif isinstance(state_value, str):
            # Already comma-separated or single value
            if "," in state_value:
                for s in state_value.split(","):
                    s = s.strip()
                    if s:
                        builder.set_match_state(policy_type, policy_name, rule_num, s)
            else:
                builder.set_match_state(policy_type, policy_name, rule_num, state_value)

    # IPsec
    if "ipsec" in rule_data:
        ipsec = _get_value(rule_data, "ipsec")
        if ipsec:
            builder.set_match_ipsec(policy_type, policy_name, rule_num, ipsec)

    # Marks
    if "mark" in rule_data:
        mark = _get_value(rule_data, "mark")
        if mark:
            builder.set_match_mark(policy_type, policy_name, rule_num, mark)

    if "connection-mark" in rule_data:
        conn_mark = _get_value(rule_data, "connection-mark")
        if conn_mark:
            builder.set_match_connection_mark(policy_type, policy_name, rule_num, conn_mark)

    # TTL
    if "ttl" in rule_data:
        ttl = rule_data["ttl"]
        if "eq" in ttl:
            val = _get_value(ttl, "eq")
            if val:
                builder.set_match_ttl(policy_type, policy_name, rule_num, "eq", val)
        if "gt" in ttl:
            val = _get_value(ttl, "gt")
            if val:
                builder.set_match_ttl(policy_type, policy_name, rule_num, "gt", val)
        if "lt" in ttl:
            val = _get_value(ttl, "lt")
            if val:
                builder.set_match_ttl(policy_type, policy_name, rule_num, "lt", val)

    # Hop limit (IPv6 TTL)
    if "hop-limit" in rule_data:
        hop = rule_data["hop-limit"]
        if "eq" in hop:
            val = _get_value(hop, "eq")
            if val:
                builder.set_match_hop_limit(policy_type, policy_name, rule_num, "eq", val)
        if "gt" in hop:
            val = _get_value(hop, "gt")
            if val:
                builder.set_match_hop_limit(policy_type, policy_name, rule_num, "gt", val)
        if "lt" in hop:
            val = _get_value(hop, "lt")
            if val:
                builder.set_match_hop_limit(policy_type, policy_name, rule_num, "lt", val)

    # Time-based
    if "time" in rule_data:
        time = rule_data["time"]
        if "monthdays" in time:
            val = _get_value(time, "monthdays")
            if val:
                builder.set_match_time_monthdays(policy_type, policy_name, rule_num, val)
        if "startdate" in time:
            val = _get_value(time, "startdate")
            if val:
                builder.set_match_time_startdate(policy_type, policy_name, rule_num, val)
        if "starttime" in time:
            val = _get_value(time, "starttime")
            if val:
                builder.set_match_time_starttime(policy_type, policy_name, rule_num, val)
        if "stopdate" in time:
            val = _get_value(time, "stopdate")
            if val:
                builder.set_match_time_stopdate(policy_type, policy_name, rule_num, val)
        if "stoptime" in time:
            val = _get_value(time, "stoptime")
            if val:
                builder.set_match_time_stoptime(policy_type, policy_name, rule_num, val)
        if "utc" in time:
            builder.set_match_time_utc(policy_type, policy_name, rule_num)
        if "weekdays" in time:
            val = _get_value(time, "weekdays")
            if val:
                builder.set_match_time_weekdays(policy_type, policy_name, rule_num, val)

    # Rate limiting
    if "limit" in rule_data:
        limit = rule_data["limit"]
        if "burst" in limit:
            val = _get_value(limit, "burst")
            if val:
                builder.set_match_limit_burst(policy_type, policy_name, rule_num, val)
        if "rate" in limit:
            val = _get_value(limit, "rate")
            if val:
                builder.set_match_limit_rate(policy_type, policy_name, rule_num, val)

    if "recent" in rule_data:
        recent = rule_data["recent"]
        if "count" in recent:
            val = _get_value(recent, "count")
            if val:
                builder.set_match_recent_count(policy_type, policy_name, rule_num, val)
        if "time" in recent:
            val = _get_value(recent, "time")
            if val:
                builder.set_match_recent_time(policy_type, policy_name, rule_num, val)


def _recreate_set_actions(builder, policy_type: str, policy_name: str, rule_num: str, set_data: dict):
    """Recreate all set actions for a rule during reorder."""

    # Connection mark
    if "connection-mark" in set_data:
        val = _get_value(set_data, "connection-mark")
        if val:
            builder.set_connection_mark(policy_type, policy_name, rule_num, val)

    # Mark
    if "mark" in set_data:
        val = _get_value(set_data, "mark")
        if val:
            builder.set_mark(policy_type, policy_name, rule_num, val)

    # DSCP
    if "dscp" in set_data:
        val = _get_value(set_data, "dscp")
        if val:
            builder.set_dscp(policy_type, policy_name, rule_num, val)

    # Table
    if "table" in set_data:
        val = _get_value(set_data, "table")
        if val:
            builder.set_table(policy_type, policy_name, rule_num, val)

    # TCP MSS
    if "tcp-mss" in set_data:
        val = _get_value(set_data, "tcp-mss")
        if val:
            builder.set_tcp_mss(policy_type, policy_name, rule_num, val)

    # VRF
    if "vrf" in set_data:
        val = _get_value(set_data, "vrf")
        if val:
            builder.set_vrf(policy_type, policy_name, rule_num, val)


# ========================================================================
# Endpoint 4: Reorder Rules
# ========================================================================

class ReorderRequest(BaseModel):
    """Request model for reordering rules."""
    policy_type: str = Field(..., description="Policy type (route or route6)")
    policy_name: str = Field(..., description="Policy name")
    rule_numbers: List[int] = Field(..., description="New order of rule numbers")


@router.post("/reorder")
async def reorder_rules(request: ReorderRequest):
    """
    Reorder rules within a policy.

    Deletes all rules and recreates them in the new order using batch operations.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = RouteBatchBuilder(version=version)

        # Get current configuration to retrieve full rule data
        full_config = service.get_full_config(refresh=True)

        # Navigate to the policy
        policy_path = ["policy", request.policy_type, request.policy_name]
        policy_config = full_config
        for key in policy_path:
            if key in policy_config:
                policy_config = policy_config[key]
            else:
                raise HTTPException(status_code=404, detail=f"Policy {request.policy_name} not found")

        # Get all rules
        rules_config = policy_config.get("rule", {})

        # Build rule data map
        rules_map = {}
        for rule_num_str, rule_data in rules_config.items():
            rule_num = int(rule_num_str)
            rules_map[rule_num] = rule_data

        # Get the sorted list of rule numbers (this is the target numbering)
        sorted_rule_numbers = sorted(request.rule_numbers)

        # Delete all rules in reverse order
        for rule_num in reversed(request.rule_numbers):
            builder.delete_rule(request.policy_type, request.policy_name, str(rule_num))

        # Recreate rules with NEW numbers based on desired order
        # The rule at position 0 in the request should get the lowest number
        # The rule at position 1 should get the next number, etc.
        for index, old_rule_num in enumerate(request.rule_numbers):
            new_rule_num = sorted_rule_numbers[index]
            if old_rule_num not in rules_map:
                continue

            rule_data = rules_map[old_rule_num]

            # Create rule with NEW number
            builder.create_rule(request.policy_type, request.policy_name, str(new_rule_num))

            # Add description if exists
            if "description" in rule_data:
                builder.set_rule_description(request.policy_type, request.policy_name, str(new_rule_num), rule_data["description"])

            # Add disable if exists
            if "disable" in rule_data:
                builder.set_rule_disable(request.policy_type, request.policy_name, str(new_rule_num))

            # Add log if exists
            if "log" in rule_data:
                builder.set_rule_log(request.policy_type, request.policy_name, str(new_rule_num))

            # Recreate match conditions (they are at root level, not under 'match' key)
            _recreate_match_conditions(builder, request.policy_type, request.policy_name, str(new_rule_num), rule_data)

            # Recreate set actions
            if "set" in rule_data:
                _recreate_set_actions(builder, request.policy_type, request.policy_name, str(new_rule_num), rule_data["set"])

            # Handle action drop (can be at root level)
            if "action" in rule_data and rule_data["action"] == "drop":
                # TODO: Add set_action_drop method to builder
                pass

        # Execute batch
        response = service.execute_batch(builder)

        # Refresh config cache
        service.get_full_config(refresh=True)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered successfully"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
