"""
Route Map Router

API endpoints for managing VyOS route-map configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5 (identical feature sets).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from vyos_service import VyOSDeviceRegistry
from vyos_builders import RouteMapBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/route-map", tags=["route-map"])

# Module-level variables for device registry
device_registry: VyOSDeviceRegistry = None
CONFIGURED_DEVICE_NAME: Optional[str] = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


def set_configured_device_name(name: str):
    """Set the configured device name for this router."""
    global CONFIGURED_DEVICE_NAME
    CONFIGURED_DEVICE_NAME = name


# ============================================================================
# Pydantic Models
# ============================================================================


class MatchConditions(BaseModel):
    """Match conditions for route-map rule"""
    # BGP Attributes
    as_path: Optional[str] = None
    community_list: Optional[str] = None
    community_exact_match: bool = False
    extcommunity: Optional[str] = None
    large_community_list: Optional[str] = None
    large_community_exact_match: bool = False
    local_preference: Optional[int] = None
    metric: Optional[int] = None
    origin: Optional[str] = None  # egp|igp|incomplete
    peer: Optional[str] = None
    rpki: Optional[str] = None  # invalid|notfound|valid

    # IP/IPv6 Address
    ip_address_access_list: Optional[str] = None
    ip_address_prefix_list: Optional[str] = None
    ip_address_prefix_len: Optional[int] = None
    ipv6_address_access_list: Optional[str] = None
    ipv6_address_prefix_list: Optional[str] = None
    ipv6_address_prefix_len: Optional[int] = None

    # Next-Hop
    ip_nexthop_access_list: Optional[str] = None
    ip_nexthop_address: Optional[str] = None
    ip_nexthop_prefix_len: Optional[int] = None
    ip_nexthop_prefix_list: Optional[str] = None
    ip_nexthop_type: Optional[str] = None
    ipv6_nexthop_address: Optional[str] = None

    # Route Source
    ip_route_source_access_list: Optional[str] = None
    ip_route_source_prefix_list: Optional[str] = None

    # Other
    interface: Optional[str] = None
    protocol: Optional[str] = None  # babel|bgp|connected|isis|kernel|ospf|ospfv3|rip|ripng|static|table|vnc
    source_vrf: Optional[str] = None
    tag: Optional[int] = None


class SetActions(BaseModel):
    """Set actions for route-map rule"""
    # BGP AS Path
    as_path_exclude: Optional[str] = None
    as_path_prepend: Optional[str] = None
    as_path_prepend_last_as: Optional[int] = None

    # BGP Communities
    community_value: Optional[str] = None
    community_action: Optional[str] = None  # add|replace|delete|none
    large_community_value: Optional[str] = None
    large_community_action: Optional[str] = None  # add|replace|delete|none
    extcommunity_bandwidth: Optional[str] = None
    extcommunity_rt: Optional[str] = None
    extcommunity_soo: Optional[str] = None
    extcommunity_none: bool = False

    # BGP Attributes
    atomic_aggregate: bool = False
    aggregator_as: Optional[str] = None
    aggregator_ip: Optional[str] = None
    local_preference: Optional[int] = None
    origin: Optional[str] = None  # egp|igp|incomplete
    originator_id: Optional[str] = None
    weight: Optional[int] = None

    # Next-Hop
    ip_nexthop: Optional[str] = None
    ip_nexthop_peer_address: bool = False
    ip_nexthop_unchanged: bool = False
    ipv6_nexthop_global: Optional[str] = None
    ipv6_nexthop_local: Optional[str] = None
    ipv6_nexthop_peer_address: bool = False
    ipv6_nexthop_prefer_global: bool = False

    # Route Properties
    distance: Optional[int] = None
    metric: Optional[str] = None  # Can be +/- or absolute
    metric_type: Optional[str] = None  # type-1|type-2
    src: Optional[str] = None
    table: Optional[int] = None
    tag: Optional[int] = None


class RouteMapRule(BaseModel):
    """Route-map rule"""
    rule_number: int
    description: Optional[str] = None
    action: str = "permit"  # permit|deny
    call: Optional[str] = None
    continue_rule: Optional[int] = None
    on_match_goto: Optional[int] = None
    on_match_next: bool = False
    match: MatchConditions = MatchConditions()
    set: SetActions = SetActions()


class RouteMap(BaseModel):
    """Complete route-map configuration"""
    name: str
    description: Optional[str] = None
    rules: List[RouteMapRule] = []


class RouteMapConfig(BaseModel):
    """Response containing all route-maps"""
    route_maps: List[RouteMap] = []
    total: int = 0


class RouteMapBatchOperation(BaseModel):
    """Single operation in a batch request"""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class RouteMapBatchRequest(BaseModel):
    """Model for batch configuration"""
    name: str = Field(..., description="Route-map name")
    rule_number: Optional[int] = Field(None, description="Rule number (optional)")
    operations: List[RouteMapBatchOperation]


class ReorderRuleItem(BaseModel):
    """Single rule in a reorder request"""
    old_number: int = Field(..., description="Original rule number")
    new_number: int = Field(..., description="New rule number after reorder")
    rule_data: RouteMapRule = Field(..., description="Complete rule configuration")


class ReorderRouteMapRequest(BaseModel):
    """Model for reordering route-map rules"""
    route_map_name: str = Field(..., description="Route-map name")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with new order")


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_route_map_capabilities():
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = RouteMapBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        capabilities["device_name"] = CONFIGURED_DEVICE_NAME
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=RouteMapConfig)
async def get_route_map_config(refresh: bool = False):
    """
    Get all route-map configuration from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(status_code=503, detail="No device configured.")

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        full_config = service.get_full_config(refresh=refresh)

        # Navigate to policy -> route-map
        route_map_config = full_config.get("policy", {}).get("route-map", {})

        if not route_map_config:
            return RouteMapConfig(route_maps=[], total=0)

        # Parse route-maps
        route_maps = []
        for name, rm_data in route_map_config.items():
            route_map = parse_route_map(name, rm_data)
            route_maps.append(route_map)

        return RouteMapConfig(route_maps=route_maps, total=len(route_maps))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_route_map(name: str, rm_data: dict) -> RouteMap:
    """Parse route-map configuration from VyOS format."""
    description = rm_data.get("description")

    rules = []
    rules_raw = rm_data.get("rule", {})
    if rules_raw:
        for rule_num, rule_data in rules_raw.items():
            rule = parse_rule(int(rule_num), rule_data)
            rules.append(rule)

    return RouteMap(
        name=name,
        description=description,
        rules=sorted(rules, key=lambda r: r.rule_number)
    )


def parse_rule(rule_number: int, rule_data: dict) -> RouteMapRule:
    """Parse route-map rule from VyOS format."""
    description = rule_data.get("description")
    action = rule_data.get("action", "permit")
    call = rule_data.get("call")
    continue_rule = int(rule_data["continue"]) if "continue" in rule_data else None

    # On-match
    on_match_goto = None
    on_match_next = False
    if "on-match" in rule_data:
        on_match = rule_data["on-match"]
        if "goto" in on_match:
            on_match_goto = int(on_match["goto"])
        if "next" in on_match:
            on_match_next = True

    # Parse match conditions
    match = parse_match_conditions(rule_data.get("match", {}))

    # Parse set actions
    set_actions = parse_set_actions(rule_data.get("set", {}))

    return RouteMapRule(
        rule_number=rule_number,
        description=description,
        action=action,
        call=call,
        continue_rule=continue_rule,
        on_match_goto=on_match_goto,
        on_match_next=on_match_next,
        match=match,
        set=set_actions
    )


def parse_match_conditions(match_data: dict) -> MatchConditions:
    """Parse match conditions from VyOS format."""
    match = MatchConditions()

    # BGP Attributes
    match.as_path = match_data.get("as-path")
    if "community" in match_data:
        comm_data = match_data["community"]
        match.community_list = comm_data.get("community-list")
        match.community_exact_match = "exact-match" in comm_data
    match.extcommunity = match_data.get("extcommunity")
    if "large-community" in match_data:
        lc_data = match_data["large-community"]
        match.large_community_list = lc_data.get("large-community-list")
        match.large_community_exact_match = "exact-match" in lc_data
    match.local_preference = int(match_data["local-preference"]) if "local-preference" in match_data else None
    match.metric = int(match_data["metric"]) if "metric" in match_data else None
    match.origin = match_data.get("origin")
    match.peer = match_data.get("peer")
    match.rpki = match_data.get("rpki")

    # IP Address
    if "ip" in match_data and "address" in match_data["ip"]:
        ip_addr = match_data["ip"]["address"]
        match.ip_address_access_list = ip_addr.get("access-list")
        match.ip_address_prefix_list = ip_addr.get("prefix-list")
        match.ip_address_prefix_len = int(ip_addr["prefix-len"]) if "prefix-len" in ip_addr else None

    # IPv6 Address
    if "ipv6" in match_data and "address" in match_data["ipv6"]:
        ipv6_addr = match_data["ipv6"]["address"]
        match.ipv6_address_access_list = ipv6_addr.get("access-list")
        match.ipv6_address_prefix_list = ipv6_addr.get("prefix-list")
        match.ipv6_address_prefix_len = int(ipv6_addr["prefix-len"]) if "prefix-len" in ipv6_addr else None

    # IP Next-Hop
    if "ip" in match_data and "nexthop" in match_data["ip"]:
        ip_nh = match_data["ip"]["nexthop"]
        match.ip_nexthop_access_list = ip_nh.get("access-list")
        match.ip_nexthop_address = ip_nh.get("address")
        match.ip_nexthop_prefix_len = int(ip_nh["prefix-len"]) if "prefix-len" in ip_nh else None
        match.ip_nexthop_prefix_list = ip_nh.get("prefix-list")
        match.ip_nexthop_type = ip_nh.get("type")

    # IPv6 Next-Hop
    if "ipv6" in match_data and "nexthop" in match_data["ipv6"]:
        ipv6_nh = match_data["ipv6"]["nexthop"]
        match.ipv6_nexthop_address = ipv6_nh.get("address")

    # IP Route Source
    if "ip" in match_data and "route-source" in match_data["ip"]:
        route_src = match_data["ip"]["route-source"]
        match.ip_route_source_access_list = route_src.get("access-list")
        match.ip_route_source_prefix_list = route_src.get("prefix-list")

    # Other
    match.interface = match_data.get("interface")
    match.protocol = match_data.get("protocol")
    match.source_vrf = match_data.get("source-vrf")
    match.tag = int(match_data["tag"]) if "tag" in match_data else None

    return match


def parse_set_actions(set_data: dict) -> SetActions:
    """Parse set actions from VyOS format."""
    set_actions = SetActions()

    # BGP AS Path
    if "as-path" in set_data:
        as_path = set_data["as-path"]
        set_actions.as_path_exclude = as_path.get("exclude")
        set_actions.as_path_prepend = as_path.get("prepend")
        set_actions.as_path_prepend_last_as = int(as_path["prepend-last-as"]) if "prepend-last-as" in as_path else None

    # Communities
    if "community" in set_data:
        comm = set_data["community"]
        if "none" in comm:
            set_actions.community_action = "none"
        else:
            for comm_val, comm_data in comm.items():
                set_actions.community_value = comm_val
                if isinstance(comm_data, dict):
                    if "add" in comm_data:
                        set_actions.community_action = "add"
                    elif "replace" in comm_data:
                        set_actions.community_action = "replace"
                    elif "delete" in comm_data:
                        set_actions.community_action = "delete"

    # Large Communities
    if "large-community" in set_data:
        lc = set_data["large-community"]
        if "none" in lc:
            set_actions.large_community_action = "none"
        else:
            for lc_val, lc_data in lc.items():
                set_actions.large_community_value = lc_val
                if isinstance(lc_data, dict):
                    if "add" in lc_data:
                        set_actions.large_community_action = "add"
                    elif "replace" in lc_data:
                        set_actions.large_community_action = "replace"
                    elif "delete" in lc_data:
                        set_actions.large_community_action = "delete"

    # Extcommunity
    if "extcommunity" in set_data:
        extc = set_data["extcommunity"]
        set_actions.extcommunity_bandwidth = extc.get("bandwidth")
        set_actions.extcommunity_rt = extc.get("rt")
        set_actions.extcommunity_soo = extc.get("soo")
        set_actions.extcommunity_none = "none" in extc

    # BGP Attributes
    set_actions.atomic_aggregate = "atomic-aggregate" in set_data
    if "aggregator" in set_data:
        agg = set_data["aggregator"]
        set_actions.aggregator_as = agg.get("as")
        set_actions.aggregator_ip = agg.get("ip")
    set_actions.local_preference = int(set_data["local-preference"]) if "local-preference" in set_data else None
    set_actions.origin = set_data.get("origin")
    set_actions.originator_id = set_data.get("originator-id")
    set_actions.weight = int(set_data["weight"]) if "weight" in set_data else None

    # Next-Hop
    if "ip-next-hop" in set_data:
        ip_nh = set_data["ip-next-hop"]
        if isinstance(ip_nh, str):
            set_actions.ip_nexthop = ip_nh
        elif isinstance(ip_nh, dict):
            if "peer-address" in ip_nh:
                set_actions.ip_nexthop_peer_address = True
            if "unchanged" in ip_nh:
                set_actions.ip_nexthop_unchanged = True

    if "ipv6-next-hop" in set_data:
        ipv6_nh = set_data["ipv6-next-hop"]
        set_actions.ipv6_nexthop_global = ipv6_nh.get("global")
        set_actions.ipv6_nexthop_local = ipv6_nh.get("local")
        set_actions.ipv6_nexthop_peer_address = "peer-address" in ipv6_nh
        set_actions.ipv6_nexthop_prefer_global = "prefer-global" in ipv6_nh

    # Route Properties
    set_actions.distance = int(set_data["distance"]) if "distance" in set_data else None
    set_actions.metric = set_data.get("metric")
    set_actions.metric_type = set_data.get("metric-type")
    set_actions.src = set_data.get("src")
    set_actions.table = int(set_data["table"]) if "table" in set_data else None
    set_actions.tag = int(set_data["tag"]) if "tag" in set_data else None

    return set_actions


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def route_map_batch_configure(request: RouteMapBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(status_code=503, detail="No device configured.")

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = RouteMapBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add route-map name
            if "name" in params:
                args.append(request.name)

            # Add rule number if specified and method accepts it
            if request.rule_number and "rule" in params:
                args.append(str(request.rule_number))

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
# No direct DELETE endpoints - use /batch for all operations
# ============================================================================


# ============================================================================
# Reorder Endpoint
# ============================================================================


@router.post("/reorder")
async def reorder_route_map_rules(request: ReorderRouteMapRequest):
    """
    Reorder route-map rules by deleting and recreating them in a single commit.

    This endpoint efficiently reorders multiple rules by:
    1. Deleting all specified rules in reverse order
    2. Recreating them with new rule numbers
    All operations are executed in a single VyOS commit.

    Args:
        request: Reorder request containing route-map name and list of rules

    Returns:
        VyOSResponse with success/failure information
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(status_code=503, detail="No device configured.")

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = RouteMapBatchBuilder(version=version)

        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted([r.old_number for r in request.rules], reverse=True)
        for old_number in rules_to_delete:
            builder.delete_rule(request.route_map_name, str(old_number))

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_number = rule_item.new_number
            rule_data = rule_item.rule_data

            # Create the rule
            builder.set_rule(request.route_map_name, str(new_number))

            # Set action
            if rule_data.action:
                builder.set_rule_action(request.route_map_name, str(new_number), rule_data.action)

            # Set description
            if rule_data.description:
                builder.set_rule_description(request.route_map_name, str(new_number), rule_data.description)

            # Set flow control
            if rule_data.call:
                builder.set_rule_call(request.route_map_name, str(new_number), rule_data.call)
            if rule_data.continue_rule:
                builder.set_rule_continue(request.route_map_name, str(new_number), str(rule_data.continue_rule))
            if rule_data.on_match_goto:
                builder.set_rule_on_match_goto(request.route_map_name, str(new_number), str(rule_data.on_match_goto))
            if rule_data.on_match_next:
                builder.set_rule_on_match_next(request.route_map_name, str(new_number))

            # Set match conditions
            match = rule_data.match
            if match.as_path:
                builder.set_match_as_path(request.route_map_name, str(new_number), match.as_path)
            if match.community_list:
                builder.set_match_community_list(request.route_map_name, str(new_number), match.community_list)
                if match.community_exact_match:
                    builder.set_match_community_exact_match(request.route_map_name, str(new_number))
            if match.extcommunity:
                builder.set_match_extcommunity(request.route_map_name, str(new_number), match.extcommunity)
            if match.large_community_list:
                builder.set_match_large_community_list(request.route_map_name, str(new_number), match.large_community_list)
                if match.large_community_exact_match:
                    builder.set_match_large_community_exact_match(request.route_map_name, str(new_number))
            if match.local_preference is not None:
                builder.set_match_local_preference(request.route_map_name, str(new_number), str(match.local_preference))
            if match.metric is not None:
                builder.set_match_metric(request.route_map_name, str(new_number), str(match.metric))
            if match.origin:
                builder.set_match_origin(request.route_map_name, str(new_number), match.origin)
            if match.peer:
                builder.set_match_peer(request.route_map_name, str(new_number), match.peer)
            if match.rpki:
                builder.set_match_rpki(request.route_map_name, str(new_number), match.rpki)

            # IP/IPv6 Address matches
            if match.ip_address_access_list:
                builder.set_match_ip_address_access_list(request.route_map_name, str(new_number), match.ip_address_access_list)
            if match.ip_address_prefix_list:
                builder.set_match_ip_address_prefix_list(request.route_map_name, str(new_number), match.ip_address_prefix_list)
            if match.ip_address_prefix_len is not None:
                builder.set_match_ip_address_prefix_len(request.route_map_name, str(new_number), str(match.ip_address_prefix_len))
            if match.ipv6_address_access_list:
                builder.set_match_ipv6_address_access_list(request.route_map_name, str(new_number), match.ipv6_address_access_list)
            if match.ipv6_address_prefix_list:
                builder.set_match_ipv6_address_prefix_list(request.route_map_name, str(new_number), match.ipv6_address_prefix_list)
            if match.ipv6_address_prefix_len is not None:
                builder.set_match_ipv6_address_prefix_len(request.route_map_name, str(new_number), str(match.ipv6_address_prefix_len))

            # Next-hop matches
            if match.ip_nexthop_access_list:
                builder.set_match_ip_nexthop_access_list(request.route_map_name, str(new_number), match.ip_nexthop_access_list)
            if match.ip_nexthop_address:
                builder.set_match_ip_nexthop_address(request.route_map_name, str(new_number), match.ip_nexthop_address)
            if match.ip_nexthop_prefix_len is not None:
                builder.set_match_ip_nexthop_prefix_len(request.route_map_name, str(new_number), str(match.ip_nexthop_prefix_len))
            if match.ip_nexthop_prefix_list:
                builder.set_match_ip_nexthop_prefix_list(request.route_map_name, str(new_number), match.ip_nexthop_prefix_list)
            if match.ip_nexthop_type:
                builder.set_match_ip_nexthop_type(request.route_map_name, str(new_number), match.ip_nexthop_type)
            if match.ipv6_nexthop_address:
                builder.set_match_ipv6_nexthop_address(request.route_map_name, str(new_number), match.ipv6_nexthop_address)

            # Route source matches
            if match.ip_route_source_access_list:
                builder.set_match_ip_route_source_access_list(request.route_map_name, str(new_number), match.ip_route_source_access_list)
            if match.ip_route_source_prefix_list:
                builder.set_match_ip_route_source_prefix_list(request.route_map_name, str(new_number), match.ip_route_source_prefix_list)

            # Other matches
            if match.interface:
                builder.set_match_interface(request.route_map_name, str(new_number), match.interface)
            if match.protocol:
                builder.set_match_protocol(request.route_map_name, str(new_number), match.protocol)
            if match.source_vrf:
                builder.set_match_source_vrf(request.route_map_name, str(new_number), match.source_vrf)
            if match.tag is not None:
                builder.set_match_tag(request.route_map_name, str(new_number), str(match.tag))

            # Set actions
            set_actions = rule_data.set
            if set_actions.as_path_exclude:
                builder.set_as_path_exclude(request.route_map_name, str(new_number), set_actions.as_path_exclude)
            if set_actions.as_path_prepend:
                builder.set_as_path_prepend(request.route_map_name, str(new_number), set_actions.as_path_prepend)
            if set_actions.as_path_prepend_last_as is not None:
                builder.set_as_path_prepend_last_as(request.route_map_name, str(new_number), str(set_actions.as_path_prepend_last_as))

            # Communities
            if set_actions.community_value:
                action = set_actions.community_action or "add"
                if action == "add":
                    builder.set_community_add(request.route_map_name, str(new_number), set_actions.community_value)
                elif action == "replace":
                    builder.set_community_replace(request.route_map_name, str(new_number), set_actions.community_value)
                elif action == "delete":
                    builder.set_community_delete(request.route_map_name, str(new_number), set_actions.community_value)
                elif action == "none":
                    builder.set_community_none(request.route_map_name, str(new_number))

            if set_actions.large_community_value:
                action = set_actions.large_community_action or "add"
                if action == "add":
                    builder.set_large_community_add(request.route_map_name, str(new_number), set_actions.large_community_value)
                elif action == "replace":
                    builder.set_large_community_replace(request.route_map_name, str(new_number), set_actions.large_community_value)
                elif action == "delete":
                    builder.set_large_community_delete(request.route_map_name, str(new_number), set_actions.large_community_value)

            if set_actions.extcommunity_bandwidth:
                builder.set_extcommunity_bandwidth(request.route_map_name, str(new_number), set_actions.extcommunity_bandwidth)
            if set_actions.extcommunity_rt:
                builder.set_extcommunity_rt(request.route_map_name, str(new_number), set_actions.extcommunity_rt)
            if set_actions.extcommunity_soo:
                builder.set_extcommunity_soo(request.route_map_name, str(new_number), set_actions.extcommunity_soo)
            if set_actions.extcommunity_none:
                builder.set_extcommunity_none(request.route_map_name, str(new_number))

            # BGP attributes
            if set_actions.atomic_aggregate:
                builder.set_atomic_aggregate(request.route_map_name, str(new_number))
            if set_actions.aggregator_as:
                builder.set_aggregator_as(request.route_map_name, str(new_number), set_actions.aggregator_as)
            if set_actions.aggregator_ip:
                builder.set_aggregator_ip(request.route_map_name, str(new_number), set_actions.aggregator_ip)
            if set_actions.local_preference is not None:
                builder.set_local_preference(request.route_map_name, str(new_number), str(set_actions.local_preference))
            if set_actions.origin:
                builder.set_origin(request.route_map_name, str(new_number), set_actions.origin)
            if set_actions.originator_id:
                builder.set_originator_id(request.route_map_name, str(new_number), set_actions.originator_id)
            if set_actions.weight is not None:
                builder.set_weight(request.route_map_name, str(new_number), str(set_actions.weight))

            # Next-hop
            if set_actions.ip_nexthop:
                builder.set_ip_nexthop(request.route_map_name, str(new_number), set_actions.ip_nexthop)
            if set_actions.ipv6_nexthop_global:
                builder.set_ipv6_nexthop_global(request.route_map_name, str(new_number), set_actions.ipv6_nexthop_global)
            if set_actions.ipv6_nexthop_local:
                builder.set_ipv6_nexthop_local(request.route_map_name, str(new_number), set_actions.ipv6_nexthop_local)
            if set_actions.ipv6_nexthop_prefer_global:
                builder.set_ipv6_nexthop_prefer_global(request.route_map_name, str(new_number))

            # Route properties
            if set_actions.distance is not None:
                builder.set_distance(request.route_map_name, str(new_number), str(set_actions.distance))
            if set_actions.metric is not None:
                builder.set_metric(request.route_map_name, str(new_number), str(set_actions.metric))
            if set_actions.metric_type:
                builder.set_metric_type(request.route_map_name, str(new_number), set_actions.metric_type)
            if set_actions.src:
                builder.set_src(request.route_map_name, str(new_number), set_actions.src)
            if set_actions.table is not None:
                builder.set_table(request.route_map_name, str(new_number), str(set_actions.table))
            if set_actions.tag is not None:
                builder.set_tag(request.route_map_name, str(new_number), str(set_actions.tag))

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Successfully reordered {len(request.rules)} rules in route-map {request.route_map_name}"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
