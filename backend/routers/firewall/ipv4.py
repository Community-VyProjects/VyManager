"""
Firewall IPv4 Router

API endpoints for managing VyOS IPv4 firewall configuration.
Supports both base chains (forward, input, output) and custom named chains.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import FirewallIPv4BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission, FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

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


class FirewallRuleConnectionStatus(BaseModel):
    """Connection status configuration."""
    nat: Optional[str] = None  # destination, source


class FirewallRuleFragment(BaseModel):
    """Fragment matching configuration."""
    match_frag: Optional[bool] = None
    match_non_frag: Optional[bool] = None


class FirewallRuleIPsec(BaseModel):
    """IPsec matching configuration."""
    # VyOS 1.4
    match_ipsec: Optional[bool] = None
    match_none: Optional[bool] = None
    # VyOS 1.5
    match_ipsec_in: Optional[bool] = None
    match_ipsec_out: Optional[bool] = None
    match_none_in: Optional[bool] = None
    match_none_out: Optional[bool] = None


class FirewallRuleLimit(BaseModel):
    """Rate limit configuration."""
    rate: Optional[str] = None
    burst: Optional[str] = None


class FirewallRuleLogOptions(BaseModel):
    """Log options configuration."""
    group: Optional[str] = None
    level: Optional[str] = None
    queue_threshold: Optional[str] = None
    snapshot_length: Optional[str] = None


class FirewallRuleRecent(BaseModel):
    """Recent matching configuration."""
    count: Optional[str] = None
    time: Optional[str] = None


class FirewallRuleTime(BaseModel):
    """Time-based matching configuration."""
    startdate: Optional[str] = None
    starttime: Optional[str] = None
    stopdate: Optional[str] = None
    stoptime: Optional[str] = None
    weekdays: Optional[str] = None


class FirewallRuleTTLMatch(BaseModel):
    """TTL matching configuration."""
    eq: Optional[str] = None
    gt: Optional[str] = None
    lt: Optional[str] = None


class FirewallRuleGRE(BaseModel):
    """GRE matching configuration (VyOS 1.5 only)."""
    key: Optional[str] = None
    version: Optional[str] = None
    inner_proto: Optional[str] = None
    flags_checksum: Optional[bool] = None
    flags_checksum_unset: Optional[bool] = None
    flags_key: Optional[bool] = None
    flags_key_unset: Optional[bool] = None
    flags_sequence: Optional[bool] = None
    flags_sequence_unset: Optional[bool] = None


class FirewallRuleSynproxy(BaseModel):
    """Synproxy configuration."""
    tcp_mss: Optional[str] = None
    tcp_window_scale: Optional[str] = None


class FirewallRuleAddAddressToGroup(BaseModel):
    """Add address to group configuration."""
    source_address_group: Optional[str] = None
    source_timeout: Optional[str] = None
    destination_address_group: Optional[str] = None
    destination_timeout: Optional[str] = None


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
    offload_target: Optional[str] = None
    # New matching fields
    connection_mark: Optional[str] = None
    connection_status: Optional[FirewallRuleConnectionStatus] = None
    conntrack_helper: Optional[str] = None
    dscp_match: Optional[str] = None  # match dscp (vs set dscp)
    dscp_exclude: Optional[str] = None
    fragment: Optional[FirewallRuleFragment] = None
    gre: Optional[FirewallRuleGRE] = None
    ipsec: Optional[FirewallRuleIPsec] = None
    limit: Optional[FirewallRuleLimit] = None
    log_options: Optional[FirewallRuleLogOptions] = None
    mark_match: Optional[str] = None  # match mark (vs set mark)
    packet_length: Optional[str] = None
    packet_length_exclude: Optional[str] = None
    packet_type: Optional[str] = None
    queue_number: Optional[str] = None
    queue_options: Optional[str] = None
    recent: Optional[FirewallRuleRecent] = None
    synproxy_config: Optional[FirewallRuleSynproxy] = None
    tcp_mss: Optional[str] = None  # match tcp mss
    time: Optional[FirewallRuleTime] = None
    ttl_match: Optional[FirewallRuleTTLMatch] = None
    add_address_to_group: Optional[FirewallRuleAddAddressToGroup] = None
    # Additional source/destination fields
    source_fqdn: Optional[str] = None
    source_address_mask: Optional[str] = None
    destination_fqdn: Optional[str] = None
    destination_address_mask: Optional[str] = None
    destination_mac_address: Optional[str] = None
    # Set/modify additions
    set_connection_mark: Optional[str] = None
    set_tcp_mss: Optional[str] = None
    disable: bool = False
    log: bool = False


class CustomChain(BaseModel):
    """Custom firewall chain configuration."""
    name: str
    description: Optional[str] = None
    default_action: Optional[str] = None
    default_log: Optional[bool] = None
    default_jump_target: Optional[str] = None
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


class BaseChainConfig(BaseModel):
    """Base chain configuration with default action."""
    default_action: Optional[str] = None
    description: Optional[str] = None
    default_log: Optional[bool] = None
    rules: List[FirewallRule] = []


class PreroutingRawConfig(BaseModel):
    """Prerouting raw chain configuration (VyOS 1.5 only)."""
    default_action: Optional[str] = None
    description: Optional[str] = None
    default_log: Optional[bool] = None
    default_jump_target: Optional[str] = None
    rules: List[FirewallRule] = []


class FirewallConfigResponse(BaseModel):
    """Response containing firewall configuration data."""
    forward: BaseChainConfig = BaseChainConfig()
    input: BaseChainConfig = BaseChainConfig()
    output: BaseChainConfig = BaseChainConfig()
    # Legacy fields for backward compatibility
    forward_rules: List[FirewallRule] = []
    input_rules: List[FirewallRule] = []
    output_rules: List[FirewallRule] = []
    custom_chains: List[CustomChain] = []
    prerouting_raw: Optional[PreroutingRawConfig] = None
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

    Requires READ permission on FIREWALL_POLICIES feature.
    """
    # Check user has READ permission for firewall policies
    await require_read_permission(request, FeatureGroup.FIREWALL_POLICIES)

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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


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

    Requires READ permission on FIREWALL_POLICIES feature.
    """
    # Check user has READ permission for firewall policies
    await require_read_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

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

            # Parse connection mark
            connection_mark = rule_data.get("connection-mark")

            # Parse connection status
            connection_status = None
            conn_status_data = rule_data.get("connection-status", {})
            if conn_status_data:
                connection_status = FirewallRuleConnectionStatus(
                    nat=conn_status_data.get("nat")
                )

            # Parse conntrack helper
            conntrack_helper = rule_data.get("conntrack-helper")

            # Parse DSCP match
            dscp_match = rule_data.get("dscp")
            dscp_exclude = rule_data.get("dscp-exclude")

            # Parse fragment
            fragment = None
            fragment_data = rule_data.get("fragment", {})
            if fragment_data:
                fragment = FirewallRuleFragment(
                    match_frag="match-frag" in fragment_data or fragment_data.get("match-frag") == "",
                    match_non_frag="match-non-frag" in fragment_data or fragment_data.get("match-non-frag") == ""
                )

            # Parse GRE (VyOS 1.5 only)
            gre = None
            gre_data = rule_data.get("gre", {})
            if gre_data:
                flags_data = gre_data.get("flags", {})
                gre = FirewallRuleGRE(
                    key=gre_data.get("key"),
                    version=gre_data.get("version"),
                    inner_proto=gre_data.get("inner-proto"),
                    flags_checksum="checksum" in flags_data and "unset" not in flags_data.get("checksum", {}),
                    flags_checksum_unset="checksum" in flags_data and "unset" in flags_data.get("checksum", {}),
                    flags_key="key" in flags_data and "unset" not in flags_data.get("key", {}),
                    flags_key_unset="key" in flags_data and "unset" in flags_data.get("key", {}),
                    flags_sequence="sequence" in flags_data and "unset" not in flags_data.get("sequence", {}),
                    flags_sequence_unset="sequence" in flags_data and "unset" in flags_data.get("sequence", {}),
                )

            # Parse IPsec
            ipsec = None
            ipsec_data = rule_data.get("ipsec", {})
            if ipsec_data:
                ipsec = FirewallRuleIPsec(
                    # VyOS 1.4
                    match_ipsec="match-ipsec" in ipsec_data or ipsec_data.get("match-ipsec") == "",
                    match_none="match-none" in ipsec_data or ipsec_data.get("match-none") == "",
                    # VyOS 1.5
                    match_ipsec_in="match-ipsec-in" in ipsec_data or ipsec_data.get("match-ipsec-in") == "",
                    match_ipsec_out="match-ipsec-out" in ipsec_data or ipsec_data.get("match-ipsec-out") == "",
                    match_none_in="match-none-in" in ipsec_data or ipsec_data.get("match-none-in") == "",
                    match_none_out="match-none-out" in ipsec_data or ipsec_data.get("match-none-out") == "",
                )

            # Parse limit
            limit = None
            limit_data = rule_data.get("limit", {})
            if limit_data:
                limit = FirewallRuleLimit(
                    rate=limit_data.get("rate"),
                    burst=limit_data.get("burst")
                )

            # Parse log options
            log_options = None
            log_options_data = rule_data.get("log-options", {})
            if log_options_data:
                log_options = FirewallRuleLogOptions(
                    group=log_options_data.get("group"),
                    level=log_options_data.get("level"),
                    queue_threshold=log_options_data.get("queue-threshold"),
                    snapshot_length=log_options_data.get("snapshot-length")
                )

            # Parse mark (match)
            mark_match = rule_data.get("mark")

            # Parse packet length
            packet_length = rule_data.get("packet-length")
            packet_length_exclude = rule_data.get("packet-length-exclude")

            # Parse packet type
            packet_type = rule_data.get("packet-type")

            # Parse queue
            queue_number = rule_data.get("queue")
            queue_options_val = rule_data.get("queue-options")

            # Parse recent
            recent = None
            recent_data = rule_data.get("recent", {})
            if recent_data:
                recent = FirewallRuleRecent(
                    count=recent_data.get("count"),
                    time=recent_data.get("time")
                )

            # Parse synproxy
            synproxy_config = None
            synproxy_data = rule_data.get("synproxy", {})
            if synproxy_data:
                tcp_synproxy = synproxy_data.get("tcp", {})
                synproxy_config = FirewallRuleSynproxy(
                    tcp_mss=tcp_synproxy.get("mss"),
                    tcp_window_scale=tcp_synproxy.get("window-scale")
                )

            # Parse TCP MSS (match)
            tcp_mss_match = None
            if tcp_data:
                tcp_mss_match = tcp_data.get("mss")

            # Parse time
            time_config = None
            time_data = rule_data.get("time", {})
            if time_data:
                time_config = FirewallRuleTime(
                    startdate=time_data.get("startdate"),
                    starttime=time_data.get("starttime"),
                    stopdate=time_data.get("stopdate"),
                    stoptime=time_data.get("stoptime"),
                    weekdays=time_data.get("weekdays")
                )

            # Parse TTL match
            ttl_match = None
            ttl_data = rule_data.get("ttl", {})
            if ttl_data:
                ttl_match = FirewallRuleTTLMatch(
                    eq=ttl_data.get("eq"),
                    gt=ttl_data.get("gt"),
                    lt=ttl_data.get("lt")
                )

            # Parse add-address-to-group
            add_address_to_group = None
            aatg_data = rule_data.get("add-address-to-group", {})
            if aatg_data:
                src_aatg = aatg_data.get("source-address", {})
                dst_aatg = aatg_data.get("destination-address", {})
                add_address_to_group = FirewallRuleAddAddressToGroup(
                    source_address_group=src_aatg.get("address-group") if src_aatg else None,
                    source_timeout=src_aatg.get("timeout") if src_aatg else None,
                    destination_address_group=dst_aatg.get("address-group") if dst_aatg else None,
                    destination_timeout=dst_aatg.get("timeout") if dst_aatg else None,
                )

            # Parse additional source fields
            source_fqdn = source_data.get("fqdn") if source_data else None
            source_address_mask = source_data.get("address-mask") if source_data else None

            # Parse additional destination fields
            destination_fqdn = dest_data.get("fqdn") if dest_data else None
            destination_address_mask = dest_data.get("address-mask") if dest_data else None
            destination_mac_address = dest_data.get("mac-address") if dest_data else None

            # Parse set additions
            set_connection_mark_val = set_data.get("connection-mark") if set_data else None
            set_tcp_mss_val = set_data.get("tcp-mss") if set_data else None

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
                offload_target=rule_data.get("offload-target"),
                connection_mark=connection_mark,
                connection_status=connection_status,
                conntrack_helper=conntrack_helper,
                dscp_match=dscp_match,
                dscp_exclude=dscp_exclude,
                fragment=fragment,
                gre=gre,
                ipsec=ipsec,
                limit=limit,
                log_options=log_options,
                mark_match=mark_match,
                packet_length=packet_length,
                packet_length_exclude=packet_length_exclude,
                packet_type=packet_type,
                queue_number=queue_number,
                queue_options=queue_options_val,
                recent=recent,
                synproxy_config=synproxy_config,
                tcp_mss=tcp_mss_match,
                time=time_config,
                ttl_match=ttl_match,
                add_address_to_group=add_address_to_group,
                source_fqdn=source_fqdn,
                source_address_mask=source_address_mask,
                destination_fqdn=destination_fqdn,
                destination_address_mask=destination_address_mask,
                destination_mac_address=destination_mac_address,
                set_connection_mark=set_connection_mark_val,
                set_tcp_mss=set_tcp_mss_val,
                disable="disable" in rule_data or rule_data.get("disable") == "",
                log="log" in rule_data or rule_data.get("log") == ""
            )

        # Parse base chains (forward, input, output)
        forward_default_action = None
        input_default_action = None
        output_default_action = None
        forward_description = None
        input_description = None
        output_description = None
        forward_default_log = None
        input_default_log = None
        output_default_log = None

        for chain_name in ["forward", "input", "output"]:
            if chain_name in firewall_config:
                chain_data = firewall_config[chain_name]
                filter_data = chain_data.get("filter", {})
                rules_data = filter_data.get("rule", {})

                # Get default action for this chain
                default_action = filter_data.get("default-action")
                default_log = "default-log" in filter_data or filter_data.get("default-log") == ""
                chain_description = filter_data.get("description")
                if chain_name == "forward":
                    forward_default_action = default_action
                    forward_description = chain_description
                    forward_default_log = default_log if default_log else None
                elif chain_name == "input":
                    input_default_action = default_action
                    input_description = chain_description
                    input_default_log = default_log if default_log else None
                elif chain_name == "output":
                    output_default_action = default_action
                    output_description = chain_description
                    output_default_log = default_log if default_log else None

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

                default_log = "default-log" in chain_config or chain_config.get("default-log") == ""
                default_jump_target = chain_config.get("default-jump-target")

                custom_chain = CustomChain(
                    name=chain_name,
                    description=chain_config.get("description"),
                    default_action=chain_config.get("default-action"),
                    default_log=default_log if default_log else None,
                    default_jump_target=default_jump_target,
                    rules=sorted(rules, key=lambda r: r.rule_number)
                )
                custom_chains.append(custom_chain)

        # Sort rules by rule number
        forward_rules.sort(key=lambda r: r.rule_number)
        input_rules.sort(key=lambda r: r.rule_number)
        output_rules.sort(key=lambda r: r.rule_number)
        custom_chains.sort(key=lambda c: c.name)

        # Parse prerouting raw chain (VyOS 1.5 only)
        prerouting_raw = None
        prerouting_data = firewall_config.get("prerouting", {})
        if prerouting_data:
            raw_data = prerouting_data.get("raw", {})
            if raw_data:
                prerouting_rules = []
                prerouting_rules_data = raw_data.get("rule", {})
                if isinstance(prerouting_rules_data, dict):
                    for rule_num, rule_data in prerouting_rules_data.items():
                        rule = parse_rule(rule_num, rule_data, "prerouting", is_custom=False)
                        prerouting_rules.append(rule)
                prerouting_rules.sort(key=lambda r: r.rule_number)

                prerouting_raw = PreroutingRawConfig(
                    default_action=raw_data.get("default-action"),
                    description=raw_data.get("description"),
                    default_log="default-log" in raw_data or raw_data.get("default-log") == "" or None,
                    default_jump_target=raw_data.get("default-jump-target"),
                    rules=prerouting_rules,
                )

        total_rules = len(forward_rules) + len(input_rules) + len(output_rules)
        for chain in custom_chains:
            total_rules += len(chain.rules)
        if prerouting_raw:
            total_rules += len(prerouting_raw.rules)

        return FirewallConfigResponse(
            forward=BaseChainConfig(default_action=forward_default_action, description=forward_description, default_log=forward_default_log, rules=forward_rules),
            input=BaseChainConfig(default_action=input_default_action, description=input_description, default_log=input_default_log, rules=input_rules),
            output=BaseChainConfig(default_action=output_default_action, description=output_description, default_log=output_default_log, rules=output_rules),
            # Legacy fields for backward compatibility
            forward_rules=forward_rules,
            input_rules=input_rules,
            output_rules=output_rules,
            custom_chains=custom_chains,
            prerouting_raw=prerouting_raw,
            total_rules=total_rules
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch")
async def firewall_ipv4_batch_configure(http_request: Request, request: FirewallBatchRequest):
    """
    Execute a batch of firewall configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.

    Requires WRITE permission on FIREWALL_POLICIES feature.
    """
    # Check user has WRITE permission for firewall policies
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

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
            if operation.value and any(p in params for p in ["value", "description", "address", "port", "protocol", "action", "interface", "interface_name", "dscp", "mark", "ttl", "icmp_type", "target", "flag", "group_name", "mac_address", "country_code", "mac", "rate", "burst", "level", "count"]):
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 4: Reorder Rules
# ========================================================================

@router.post("/reorder")
async def firewall_ipv4_reorder_rules(http_request: Request, request: ReorderFirewallRequest):
    """
    Reorder firewall rules within a chain.

    This operation deletes all rules in reverse order, then recreates them
    with new rule numbers in a single commit.

    Requires WRITE permission on FIREWALL_POLICIES feature.
    """
    # Check user has WRITE permission for firewall policies
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

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
                if source.get("geoip"):
                    geoip = source["geoip"]
                    for code in (geoip.get("country_code") or []):
                        builder.set_rule_source_geoip_country(request.chain, new_number, code, request.is_custom_chain)
                    if geoip.get("inverse_match"):
                        builder.set_rule_source_geoip_inverse(request.chain, new_number, request.is_custom_chain)
                if source.get("group"):
                    group = source["group"]
                    for group_type, group_name in group.items():
                        if "address" in group_type:
                            builder.set_rule_source_group_address(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "network" in group_type:
                            builder.set_rule_source_group_network(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "port" in group_type:
                            builder.set_rule_source_group_port(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "mac" in group_type:
                            builder.set_rule_source_group_mac(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "domain" in group_type:
                            builder.set_rule_source_group_domain(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "remote" in group_type:
                            builder.set_rule_source_group_remote(request.chain, new_number, group_name, request.is_custom_chain)

            # Destination
            if rule_data.get("destination"):
                dest = rule_data["destination"]
                if dest.get("address"):
                    builder.set_rule_destination_address(request.chain, new_number, dest["address"], request.is_custom_chain)
                if dest.get("port"):
                    builder.set_rule_destination_port(request.chain, new_number, dest["port"], request.is_custom_chain)
                if dest.get("geoip"):
                    geoip = dest["geoip"]
                    for code in (geoip.get("country_code") or []):
                        builder.set_rule_destination_geoip_country(request.chain, new_number, code, request.is_custom_chain)
                    if geoip.get("inverse_match"):
                        builder.set_rule_destination_geoip_inverse(request.chain, new_number, request.is_custom_chain)
                if dest.get("group"):
                    group = dest["group"]
                    for group_type, group_name in group.items():
                        if "address" in group_type:
                            builder.set_rule_destination_group_address(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "network" in group_type:
                            builder.set_rule_destination_group_network(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "port" in group_type:
                            builder.set_rule_destination_group_port(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "mac" in group_type:
                            builder.set_rule_destination_group_mac(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "domain" in group_type:
                            builder.set_rule_destination_group_domain(request.chain, new_number, group_name, request.is_custom_chain)
                        elif "remote" in group_type:
                            builder.set_rule_destination_group_remote(request.chain, new_number, group_name, request.is_custom_chain)

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

            # Offload target
            if rule_data.get("offload_target"):
                builder.set_rule_offload_target(request.chain, new_number, rule_data["offload_target"], request.is_custom_chain)

            # Flags
            if rule_data.get("disable"):
                builder.set_rule_disable(request.chain, new_number, request.is_custom_chain)

            if rule_data.get("log"):
                builder.set_rule_log(request.chain, new_number, request.is_custom_chain)

            # Connection mark
            if rule_data.get("connection_mark"):
                builder.set_rule_connection_mark(request.chain, new_number, rule_data["connection_mark"], request.is_custom_chain)

            # Connection status
            if rule_data.get("connection_status"):
                cs = rule_data["connection_status"]
                if cs.get("nat"):
                    builder.set_rule_connection_status_nat(request.chain, new_number, cs["nat"], request.is_custom_chain)

            # Conntrack helper
            if rule_data.get("conntrack_helper"):
                builder.set_rule_conntrack_helper(request.chain, new_number, rule_data["conntrack_helper"], request.is_custom_chain)

            # DSCP match
            if rule_data.get("dscp_match"):
                builder.set_rule_dscp(request.chain, new_number, rule_data["dscp_match"], request.is_custom_chain)
            if rule_data.get("dscp_exclude"):
                builder.set_rule_dscp_exclude(request.chain, new_number, rule_data["dscp_exclude"], request.is_custom_chain)

            # Fragment
            if rule_data.get("fragment"):
                frag = rule_data["fragment"]
                if frag.get("match_frag"):
                    builder.set_rule_fragment_match_frag(request.chain, new_number, request.is_custom_chain)
                if frag.get("match_non_frag"):
                    builder.set_rule_fragment_match_non_frag(request.chain, new_number, request.is_custom_chain)

            # GRE
            if rule_data.get("gre"):
                gre = rule_data["gre"]
                if gre.get("key"):
                    builder.set_rule_gre_key(request.chain, new_number, gre["key"], request.is_custom_chain)
                if gre.get("version"):
                    builder.set_rule_gre_version(request.chain, new_number, gre["version"], request.is_custom_chain)
                if gre.get("inner_proto"):
                    builder.set_rule_gre_inner_proto(request.chain, new_number, gre["inner_proto"], request.is_custom_chain)
                if gre.get("flags_checksum"):
                    builder.set_rule_gre_flags_checksum(request.chain, new_number, request.is_custom_chain)
                if gre.get("flags_checksum_unset"):
                    builder.set_rule_gre_flags_checksum_unset(request.chain, new_number, request.is_custom_chain)
                if gre.get("flags_key"):
                    builder.set_rule_gre_flags_key(request.chain, new_number, request.is_custom_chain)
                if gre.get("flags_key_unset"):
                    builder.set_rule_gre_flags_key_unset(request.chain, new_number, request.is_custom_chain)
                if gre.get("flags_sequence"):
                    builder.set_rule_gre_flags_sequence(request.chain, new_number, request.is_custom_chain)
                if gre.get("flags_sequence_unset"):
                    builder.set_rule_gre_flags_sequence_unset(request.chain, new_number, request.is_custom_chain)

            # IPsec
            if rule_data.get("ipsec"):
                ipsec = rule_data["ipsec"]
                if ipsec.get("match_ipsec"):
                    builder.set_rule_ipsec_match_ipsec(request.chain, new_number, request.is_custom_chain)
                if ipsec.get("match_none"):
                    builder.set_rule_ipsec_match_none(request.chain, new_number, request.is_custom_chain)
                if ipsec.get("match_ipsec_in"):
                    builder.set_rule_ipsec_match_ipsec_in(request.chain, new_number, request.is_custom_chain)
                if ipsec.get("match_ipsec_out"):
                    builder.set_rule_ipsec_match_ipsec_out(request.chain, new_number, request.is_custom_chain)
                if ipsec.get("match_none_in"):
                    builder.set_rule_ipsec_match_none_in(request.chain, new_number, request.is_custom_chain)
                if ipsec.get("match_none_out"):
                    builder.set_rule_ipsec_match_none_out(request.chain, new_number, request.is_custom_chain)

            # Limit
            if rule_data.get("limit"):
                lim = rule_data["limit"]
                if lim.get("rate"):
                    builder.set_rule_limit_rate(request.chain, new_number, lim["rate"], request.is_custom_chain)
                if lim.get("burst"):
                    builder.set_rule_limit_burst(request.chain, new_number, lim["burst"], request.is_custom_chain)

            # Log options
            if rule_data.get("log_options"):
                lo = rule_data["log_options"]
                if lo.get("group"):
                    builder.set_rule_log_options_group(request.chain, new_number, lo["group"], request.is_custom_chain)
                if lo.get("level"):
                    builder.set_rule_log_options_level(request.chain, new_number, lo["level"], request.is_custom_chain)
                if lo.get("queue_threshold"):
                    builder.set_rule_log_options_queue_threshold(request.chain, new_number, lo["queue_threshold"], request.is_custom_chain)
                if lo.get("snapshot_length"):
                    builder.set_rule_log_options_snapshot_length(request.chain, new_number, lo["snapshot_length"], request.is_custom_chain)

            # Mark match
            if rule_data.get("mark_match"):
                builder.set_rule_mark(request.chain, new_number, rule_data["mark_match"], request.is_custom_chain)

            # Packet length
            if rule_data.get("packet_length"):
                builder.set_rule_packet_length(request.chain, new_number, rule_data["packet_length"], request.is_custom_chain)
            if rule_data.get("packet_length_exclude"):
                builder.set_rule_packet_length_exclude(request.chain, new_number, rule_data["packet_length_exclude"], request.is_custom_chain)

            # Packet type
            if rule_data.get("packet_type"):
                builder.set_rule_packet_type(request.chain, new_number, rule_data["packet_type"], request.is_custom_chain)

            # Queue
            if rule_data.get("queue_number"):
                builder.set_rule_queue(request.chain, new_number, rule_data["queue_number"], request.is_custom_chain)
            if rule_data.get("queue_options"):
                builder.set_rule_queue_options(request.chain, new_number, rule_data["queue_options"], request.is_custom_chain)

            # Recent
            if rule_data.get("recent"):
                rec = rule_data["recent"]
                if rec.get("count"):
                    builder.set_rule_recent_count(request.chain, new_number, rec["count"], request.is_custom_chain)
                if rec.get("time"):
                    builder.set_rule_recent_time(request.chain, new_number, rec["time"], request.is_custom_chain)

            # Synproxy
            if rule_data.get("synproxy_config"):
                sp = rule_data["synproxy_config"]
                if sp.get("tcp_mss"):
                    builder.set_rule_synproxy_tcp_mss(request.chain, new_number, sp["tcp_mss"], request.is_custom_chain)
                if sp.get("tcp_window_scale"):
                    builder.set_rule_synproxy_tcp_window_scale(request.chain, new_number, sp["tcp_window_scale"], request.is_custom_chain)

            # TCP MSS match
            if rule_data.get("tcp_mss"):
                builder.set_rule_tcp_mss(request.chain, new_number, rule_data["tcp_mss"], request.is_custom_chain)

            # Time
            if rule_data.get("time"):
                t = rule_data["time"]
                if t.get("startdate"):
                    builder.set_rule_time_startdate(request.chain, new_number, t["startdate"], request.is_custom_chain)
                if t.get("starttime"):
                    builder.set_rule_time_starttime(request.chain, new_number, t["starttime"], request.is_custom_chain)
                if t.get("stopdate"):
                    builder.set_rule_time_stopdate(request.chain, new_number, t["stopdate"], request.is_custom_chain)
                if t.get("stoptime"):
                    builder.set_rule_time_stoptime(request.chain, new_number, t["stoptime"], request.is_custom_chain)
                if t.get("weekdays"):
                    builder.set_rule_time_weekdays(request.chain, new_number, t["weekdays"], request.is_custom_chain)

            # TTL match
            if rule_data.get("ttl_match"):
                ttl = rule_data["ttl_match"]
                if ttl.get("eq"):
                    builder.set_rule_ttl_eq(request.chain, new_number, ttl["eq"], request.is_custom_chain)
                if ttl.get("gt"):
                    builder.set_rule_ttl_gt(request.chain, new_number, ttl["gt"], request.is_custom_chain)
                if ttl.get("lt"):
                    builder.set_rule_ttl_lt(request.chain, new_number, ttl["lt"], request.is_custom_chain)

            # Add address to group
            if rule_data.get("add_address_to_group"):
                aatg = rule_data["add_address_to_group"]
                if aatg.get("source_address_group"):
                    builder.set_rule_add_address_to_group_src_group(request.chain, new_number, aatg["source_address_group"], request.is_custom_chain)
                if aatg.get("source_timeout"):
                    builder.set_rule_add_address_to_group_src_timeout(request.chain, new_number, aatg["source_timeout"], request.is_custom_chain)
                if aatg.get("destination_address_group"):
                    builder.set_rule_add_address_to_group_dst_group(request.chain, new_number, aatg["destination_address_group"], request.is_custom_chain)
                if aatg.get("destination_timeout"):
                    builder.set_rule_add_address_to_group_dst_timeout(request.chain, new_number, aatg["destination_timeout"], request.is_custom_chain)

            # Source FQDN & address mask
            if rule_data.get("source_fqdn"):
                builder.set_rule_source_fqdn(request.chain, new_number, rule_data["source_fqdn"], request.is_custom_chain)
            if rule_data.get("source_address_mask"):
                builder.set_rule_source_address_mask(request.chain, new_number, rule_data["source_address_mask"], request.is_custom_chain)

            # Destination FQDN, address mask, MAC
            if rule_data.get("destination_fqdn"):
                builder.set_rule_destination_fqdn(request.chain, new_number, rule_data["destination_fqdn"], request.is_custom_chain)
            if rule_data.get("destination_address_mask"):
                builder.set_rule_destination_address_mask(request.chain, new_number, rule_data["destination_address_mask"], request.is_custom_chain)
            if rule_data.get("destination_mac_address"):
                builder.set_rule_destination_mac_address(request.chain, new_number, rule_data["destination_mac_address"], request.is_custom_chain)

            # Set connection mark & TCP MSS
            if rule_data.get("set_connection_mark"):
                builder.set_rule_set_connection_mark(request.chain, new_number, rule_data["set_connection_mark"], request.is_custom_chain)
            if rule_data.get("set_tcp_mss"):
                builder.set_rule_set_tcp_mss(request.chain, new_number, rule_data["set_tcp_mss"], request.is_custom_chain)

            # ICMP code and type (numeric)
            if rule_data.get("icmp_code"):
                builder.set_rule_icmp_code(request.chain, new_number, rule_data["icmp_code"], request.is_custom_chain)
            if rule_data.get("icmp_type"):
                builder.set_rule_icmp_type(request.chain, new_number, rule_data["icmp_type"], request.is_custom_chain)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered successfully"},
            error=response.error if response.error else None
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
