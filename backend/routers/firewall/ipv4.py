"""
Firewall IPv4 Router

API endpoints for managing VyOS IPv4 firewall configuration.
Supports both base chains (forward, input, output) and custom named chains.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import FirewallIPv4BatchBuilder
import inspect

router = APIRouter(prefix="/vyos/firewall/ipv4", tags=["firewall_ipv4"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ========================================================================
# Pydantic Models
# ========================================================================

class FirewallRuleGeoIP(BaseModel):
    """GeoIP configuration for firewall rule."""
    country_code: Optional[List[str]] = None  # List of country codes
    inverse_match: Optional[bool] = None


class FirewallRuleSource(BaseModel):
    """Source configuration for firewall rule."""
    address: Optional[str] = None
    port: Optional[str] = None
    mac_address: Optional[str] = None
    geoip: Optional[FirewallRuleGeoIP] = None
    group: Optional[Dict[str, str]] = None  # {type: name} e.g. {"address-group": "LAN"}


class FirewallRuleDestination(BaseModel):
    """Destination configuration for firewall rule."""
    address: Optional[str] = None
    port: Optional[str] = None
    geoip: Optional[FirewallRuleGeoIP] = None
    group: Optional[Dict[str, str]] = None


class FirewallRuleState(BaseModel):
    """Connection state configuration for firewall rule."""
    established: Optional[bool] = None
    new: Optional[bool] = None
    related: Optional[bool] = None
    invalid: Optional[bool] = None


class FirewallRuleInterface(BaseModel):
    """Interface configuration for firewall rule."""
    inbound: Optional[str] = None
    outbound: Optional[str] = None


class FirewallRulePacketMods(BaseModel):
    """Packet modification configuration for firewall rule."""
    dscp: Optional[str] = None
    mark: Optional[str] = None
    ttl: Optional[str] = None


class FirewallRule(BaseModel):
    """Complete firewall rule configuration."""
    rule_number: int
    chain: str  # e.g., "forward", "input", "output", or custom chain name
    is_custom_chain: bool = False
    description: Optional[str] = None
    action: Optional[str] = None  # accept, drop, reject, continue, return, jump, queue, synproxy
    protocol: Optional[str] = None
    source: Optional[FirewallRuleSource] = None
    destination: Optional[FirewallRuleDestination] = None
    state: Optional[FirewallRuleState] = None
    interface: Optional[FirewallRuleInterface] = None
    packet_mods: Optional[FirewallRulePacketMods] = None
    tcp_flags: Optional[List[str]] = None
    icmp_type_name: Optional[str] = None
    jump_target: Optional[str] = None
    disable: bool = False
    log: bool = False


class CustomChain(BaseModel):
    """Custom firewall chain configuration."""
    name: str
    description: Optional[str] = None
    default_action: Optional[str] = None
    rules: List[FirewallRule] = []


class FirewallBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class FirewallBatchRequest(BaseModel):
    """Model for batch firewall rule configuration."""
    chain: str = Field(..., description="Chain name (forward, input, output, or custom chain)")
    rule_number: Optional[int] = Field(None, description="Rule number (not needed for chain operations)")
    is_custom_chain: bool = Field(False, description="Whether this is a custom chain")
    operations: List[FirewallBatchOperation] = Field(..., description="List of operations to perform")


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int
    new_number: int
    rule_data: Dict[str, Any]


class ReorderFirewallRequest(BaseModel):
    """Request model for reordering firewall rules."""
    chain: str = Field(..., description="Chain name")
    is_custom_chain: bool = Field(False, description="Whether this is a custom chain")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with their old and new numbers")


class FirewallConfigResponse(BaseModel):
    """Response containing firewall configuration data."""
    forward_rules: List[FirewallRule] = []
    input_rules: List[FirewallRule] = []
    output_rules: List[FirewallRule] = []
    custom_chains: List[CustomChain] = []
    total_rules: int = 0


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_firewall_ipv4_capabilities(request: Request):
    """
    Get firewall IPv4 capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = FirewallIPv4BatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config", response_model=FirewallConfigResponse)
async def get_firewall_ipv4_config(http_request: Request, refresh: bool = False):
    """
    Get all IPv4 firewall configurations from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    try:
        service = get_session_vyos_service(http_request)
        full_config = service.get_full_config(refresh=refresh)

        forward_rules = []
        input_rules = []
        output_rules = []
        custom_chains = []

        # Parse firewall IPv4 configuration
        firewall_config = full_config.get("firewall", {}).get("ipv4", {})

        # Helper function to parse a rule
        def parse_rule(rule_num: str, rule_data: dict, chain: str, is_custom: bool = False) -> FirewallRule:
            """Parse a single firewall rule."""
            # Parse source
            source = None
            source_data = rule_data.get("source", {})
            if source_data:
                # Parse GeoIP
                geoip = None
                geoip_data = source_data.get("geoip", {})
                if geoip_data:
                    country_codes = geoip_data.get("country-code")
                    # Ensure it's always a list
                    if country_codes and not isinstance(country_codes, list):
                        country_codes = [country_codes]

                    geoip = FirewallRuleGeoIP(
                        country_code=country_codes,
                        inverse_match="inverse-match" in geoip_data or geoip_data.get("inverse-match") == ""
                    )

                source = FirewallRuleSource(
                    address=source_data.get("address"),
                    port=source_data.get("port"),
                    mac_address=source_data.get("mac-address"),
                    geoip=geoip,
                    group=source_data.get("group")
                )

            # Parse destination
            destination = None
            dest_data = rule_data.get("destination", {})
            if dest_data:
                # Parse GeoIP
                dest_geoip = None
                dest_geoip_data = dest_data.get("geoip", {})
                if dest_geoip_data:
                    dest_country_codes = dest_geoip_data.get("country-code")
                    # Ensure it's always a list
                    if dest_country_codes and not isinstance(dest_country_codes, list):
                        dest_country_codes = [dest_country_codes]

                    dest_geoip = FirewallRuleGeoIP(
                        country_code=dest_country_codes,
                        inverse_match="inverse-match" in dest_geoip_data or dest_geoip_data.get("inverse-match") == ""
                    )

                destination = FirewallRuleDestination(
                    address=dest_data.get("address"),
                    port=dest_data.get("port"),
                    geoip=dest_geoip,
                    group=dest_data.get("group")
                )

            # Parse state
            state = None
            state_data = rule_data.get("state")
            if state_data:
                # State can be either a list ["established", "related"] or a dict
                if isinstance(state_data, list):
                    state = FirewallRuleState(
                        established="established" in state_data,
                        new="new" in state_data,
                        related="related" in state_data,
                        invalid="invalid" in state_data
                    )
                elif isinstance(state_data, dict):
                    state = FirewallRuleState(
                        established="established" in state_data or state_data.get("established") == "",
                        new="new" in state_data or state_data.get("new") == "",
                        related="related" in state_data or state_data.get("related") == "",
                        invalid="invalid" in state_data or state_data.get("invalid") == ""
                    )

            # Parse interface
            interface = None
            inbound_iface = None
            outbound_iface = None

            if "inbound-interface" in rule_data:
                inbound_data = rule_data["inbound-interface"]
                if isinstance(inbound_data, dict):
                    inbound_iface = inbound_data.get("name")
                    if not inbound_iface and "interface-name" in inbound_data:
                        inbound_iface = inbound_data.get("interface-name")

            if "outbound-interface" in rule_data:
                outbound_data = rule_data["outbound-interface"]
                if isinstance(outbound_data, dict):
                    outbound_iface = outbound_data.get("name")
                    if not outbound_iface and "interface-name" in outbound_data:
                        outbound_iface = outbound_data.get("interface-name")

            if inbound_iface or outbound_iface:
                interface = FirewallRuleInterface(
                    inbound=inbound_iface,
                    outbound=outbound_iface
                )

            # Parse packet modifications
            packet_mods = None
            set_data = rule_data.get("set", {})
            if set_data:
                packet_mods = FirewallRulePacketMods(
                    dscp=set_data.get("dscp"),
                    mark=set_data.get("mark"),
                    ttl=set_data.get("ttl")
                )

            # Parse TCP flags
            tcp_flags = None
            tcp_data = rule_data.get("tcp", {})
            if tcp_data and "flags" in tcp_data:
                flags_data = tcp_data["flags"]
                tcp_flags = []
                if isinstance(flags_data, dict):
                    for flag_key, flag_value in flags_data.items():
                        if flag_key == "not":
                            # Handle inverted flags: {"not": {"fin": {}, "rst": {}}}
                            if isinstance(flag_value, dict):
                                for inverted_flag in flag_value.keys():
                                    tcp_flags.append(f"not {inverted_flag}")
                        else:
                            # Regular flag: {"syn": {}, "ack": {}}
                            tcp_flags.append(flag_key)
                elif isinstance(flags_data, list):
                    tcp_flags = flags_data

                # Only set tcp_flags if we found any
                if not tcp_flags:
                    tcp_flags = None

            # Parse ICMP
            icmp_type_name = None
            icmp_data = rule_data.get("icmp", {})
            if icmp_data:
                icmp_type_name = icmp_data.get("type-name")

            return FirewallRule(
                rule_number=int(rule_num),
                chain=chain,
                is_custom_chain=is_custom,
                description=rule_data.get("description"),
                action=rule_data.get("action"),
                protocol=rule_data.get("protocol"),
                source=source,
                destination=destination,
                state=state,
                interface=interface,
                packet_mods=packet_mods,
                tcp_flags=tcp_flags,
                icmp_type_name=icmp_type_name,
                jump_target=rule_data.get("jump-target"),
                disable="disable" in rule_data or rule_data.get("disable") == "",
                log="log" in rule_data or rule_data.get("log") == ""
            )

        # Parse base chains (forward, input, output)
        for chain_name in ["forward", "input", "output"]:
            if chain_name in firewall_config:
                chain_data = firewall_config[chain_name]
                filter_data = chain_data.get("filter", {})
                rules_data = filter_data.get("rule", {})

                if isinstance(rules_data, dict):
                    for rule_num, rule_data in rules_data.items():
                        rule = parse_rule(rule_num, rule_data, chain_name, is_custom=False)
                        if chain_name == "forward":
                            forward_rules.append(rule)
                        elif chain_name == "input":
                            input_rules.append(rule)
                        elif chain_name == "output":
                            output_rules.append(rule)

        # Parse custom chains
        name_data = firewall_config.get("name", {})
        if isinstance(name_data, dict):
            for chain_name, chain_config in name_data.items():
                rules = []
                rules_data = chain_config.get("rule", {})

                if isinstance(rules_data, dict):
                    for rule_num, rule_data in rules_data.items():
                        rule = parse_rule(rule_num, rule_data, chain_name, is_custom=True)
                        rules.append(rule)

                custom_chain = CustomChain(
                    name=chain_name,
                    description=chain_config.get("description"),
                    default_action=chain_config.get("default-action"),
                    rules=sorted(rules, key=lambda r: r.rule_number)
                )
                custom_chains.append(custom_chain)

        # Sort rules by rule number
        forward_rules.sort(key=lambda r: r.rule_number)
        input_rules.sort(key=lambda r: r.rule_number)
        output_rules.sort(key=lambda r: r.rule_number)
        custom_chains.sort(key=lambda c: c.name)

        total_rules = len(forward_rules) + len(input_rules) + len(output_rules)
        for chain in custom_chains:
            total_rules += len(chain.rules)

        return FirewallConfigResponse(
            forward_rules=forward_rules,
            input_rules=input_rules,
            output_rules=output_rules,
            custom_chains=custom_chains,
            total_rules=total_rules
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch")
async def firewall_ipv4_batch_configure(http_request: Request, request: FirewallBatchRequest):
    """
    Execute a batch of firewall configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = FirewallIPv4BatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method_name = operation.op
            if not hasattr(builder, method_name):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {method_name}"
                )

            method = getattr(builder, method_name)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically based on method signature order
            args = []

            # Add chain parameter if method expects it
            if "chain" in params or "chain_name" in params:
                args.append(request.chain)

            # Add rule_number parameter if method expects it and we have it
            if "rule_number" in params and request.rule_number is not None:
                args.append(request.rule_number)

            # Add value parameter BEFORE is_custom if both are expected
            # This matches the typical signature: (chain, rule_number, value, is_custom)
            # Also check for group_name which is used in group operations
            if operation.value and any(p in params for p in ["value", "description", "address", "port", "protocol", "action", "interface_name", "dscp", "mark", "ttl", "icmp_type", "target", "flag", "group_name", "mac_address", "country_code"]):
                args.append(operation.value)

            # Add is_custom parameter if method expects it
            if "is_custom" in params:
                args.append(request.is_custom_chain)

            # Call the method
            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Firewall configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Endpoint 4: Reorder Rules
# ========================================================================

@router.post("/reorder")
async def firewall_ipv4_reorder_rules(http_request: Request, request: ReorderFirewallRequest):
    """
    Reorder firewall rules within a chain.

    This operation deletes all rules in reverse order, then recreates them
    with new rule numbers in a single commit.
    """
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = FirewallIPv4BatchBuilder(version=version)

        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted([r.old_number for r in request.rules], reverse=True)
        for old_number in rules_to_delete:
            if request.is_custom_chain:
                builder.delete_custom_chain_rule(request.chain, old_number)
            else:
                builder.delete_base_chain_rule(request.chain, old_number)

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_number = rule_item.new_number
            rule_data = rule_item.rule_data

            # Create the rule
            if request.is_custom_chain:
                builder.set_custom_chain_rule(request.chain, new_number)
            else:
                builder.set_base_chain_rule(request.chain, new_number)

            # Set all rule properties
            if rule_data.get("action"):
                builder.set_rule_action(request.chain, new_number, rule_data["action"], request.is_custom_chain)

            if rule_data.get("description"):
                builder.set_rule_description(request.chain, new_number, rule_data["description"], request.is_custom_chain)

            if rule_data.get("protocol"):
                builder.set_rule_protocol(request.chain, new_number, rule_data["protocol"], request.is_custom_chain)

            # Source
            if rule_data.get("source"):
                source = rule_data["source"]
                if source.get("address"):
                    builder.set_rule_source_address(request.chain, new_number, source["address"], request.is_custom_chain)
                if source.get("port"):
                    builder.set_rule_source_port(request.chain, new_number, source["port"], request.is_custom_chain)
                if source.get("mac_address"):
                    builder.set_rule_source_mac(request.chain, new_number, source["mac_address"], request.is_custom_chain)
                if source.get("group"):
                    group = source["group"]
                    for group_type, group_name in group.items():
                        if "address" in group_type:
                            builder.set_rule_source_group_address(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "network" in group_type:
                            builder.set_rule_source_group_network(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "port" in group_type:
                            builder.set_rule_source_group_port(request.chain, new_number, group_name, request.is_custom_chain)

            # Destination
            if rule_data.get("destination"):
                dest = rule_data["destination"]
                if dest.get("address"):
                    builder.set_rule_destination_address(request.chain, new_number, dest["address"], request.is_custom_chain)
                if dest.get("port"):
                    builder.set_rule_destination_port(request.chain, new_number, dest["port"], request.is_custom_chain)
                if dest.get("group"):
                    group = dest["group"]
                    for group_type, group_name in group.items():
                        if "address" in group_type:
                            builder.set_rule_destination_group_address(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "network" in group_type:
                            builder.set_rule_destination_group_network(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "port" in group_type:
                            builder.set_rule_destination_group_port(request.chain, new_number, group_name, request.is_custom_chain)

            # State
            if rule_data.get("state"):
                state = rule_data["state"]
                if state.get("established"):
                    builder.set_rule_state_established(request.chain, new_number, request.is_custom_chain)
                if state.get("new"):
                    builder.set_rule_state_new(request.chain, new_number, request.is_custom_chain)
                if state.get("related"):
                    builder.set_rule_state_related(request.chain, new_number, request.is_custom_chain)
                if state.get("invalid"):
                    builder.set_rule_state_invalid(request.chain, new_number, request.is_custom_chain)

            # Interface
            if rule_data.get("interface"):
                interface = rule_data["interface"]
                if interface.get("inbound"):
                    builder.set_rule_inbound_interface(request.chain, new_number, interface["inbound"], request.is_custom_chain)
                if interface.get("outbound"):
                    builder.set_rule_outbound_interface(request.chain, new_number, interface["outbound"], request.is_custom_chain)

            # Packet modifications
            if rule_data.get("packet_mods"):
                mods = rule_data["packet_mods"]
                if mods.get("dscp"):
                    builder.set_rule_set_dscp(request.chain, new_number, mods["dscp"], request.is_custom_chain)
                if mods.get("mark"):
                    builder.set_rule_set_mark(request.chain, new_number, mods["mark"], request.is_custom_chain)
                if mods.get("ttl"):
                    builder.set_rule_set_ttl(request.chain, new_number, mods["ttl"], request.is_custom_chain)

            # TCP flags
            if rule_data.get("tcp_flags"):
                for flag in rule_data["tcp_flags"]:
                    builder.set_rule_tcp_flags(request.chain, new_number, flag, request.is_custom_chain)

            # ICMP type
            if rule_data.get("icmp_type_name"):
                builder.set_rule_icmp_type_name(request.chain, new_number, rule_data["icmp_type_name"], request.is_custom_chain)

            # Jump target
            if rule_data.get("jump_target"):
                builder.set_rule_jump_target(request.chain, new_number, rule_data["jump_target"], request.is_custom_chain)

            # Flags
            if rule_data.get("disable"):
                builder.set_rule_disable(request.chain, new_number, request.is_custom_chain)

            if rule_data.get("log"):
                builder.set_rule_log(request.chain, new_number, request.is_custom_chain)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered successfully"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
