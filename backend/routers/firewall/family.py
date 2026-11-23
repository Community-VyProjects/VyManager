"""
Firewall address-family router.

One implementation parameterized by family (ipv4 or ipv6).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.firewall.family_batch_builder import FirewallFamilyBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.family import FirewallFamilyMapper
from vyos_mappers.firewall.family_config_parse import multi_text
from fastapi_permissions import require_read_permission, require_write_permission, FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

# Builder parameter names the batch handler fills from the operation value.
VALUE_PARAMS = (
    "value", "description", "address", "port", "protocol", "action",
    "interface", "dscp", "mark", "ttl", "hop_limit",
    "icmp_type", "icmpv6_type", "target", "flag", "group_name",
    "mac_address", "country_code", "mac",
)


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
    inbound_group: Optional[str] = None
    outbound: Optional[str] = None
    outbound_group: Optional[str] = None


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
    icmp_code: Optional[str] = None
    icmp_type: Optional[str] = None
    jump_target: Optional[str] = None
    offload_target: Optional[str] = None
    # New matching fields
    connection_mark: Optional[List[str]] = None
    connection_status: Optional[FirewallRuleConnectionStatus] = None
    conntrack_helper: Optional[List[str]] = None
    dscp_match: Optional[List[str]] = None  # match dscp (vs set dscp)
    dscp_exclude: Optional[List[str]] = None
    fragment: Optional[FirewallRuleFragment] = None
    gre: Optional[FirewallRuleGRE] = None
    ipsec: Optional[FirewallRuleIPsec] = None
    limit: Optional[FirewallRuleLimit] = None
    log_options: Optional[FirewallRuleLogOptions] = None
    mark_match: Optional[str] = None  # match mark (vs set mark)
    packet_length: Optional[List[str]] = None
    packet_length_exclude: Optional[List[str]] = None
    packet_type: Optional[str] = None
    queue_number: Optional[str] = None
    queue_options: Optional[List[str]] = None
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
    chain: str = Field(..., description="Chain name (forward, input, output, prerouting_raw on 1.5, or a custom chain)")
    rule_number: Optional[int] = Field(None, description="Rule number (not needed for chain operations)")
    is_custom_chain: bool = Field(False, description="Whether this is a custom chain")
    operations: List[FirewallBatchOperation] = Field(..., description="List of operations to perform")


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int
    new_number: Optional[int] = None  # None = delete-only (removed, not recreated)
    rule_data: Dict[str, Any]


class ReorderFirewallRequest(BaseModel):
    """Request model for reordering firewall rules."""
    chain: str = Field(..., description="Chain name")
    is_custom_chain: bool = Field(False, description="Whether this is a custom chain")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with their old and new numbers")

    @model_validator(mode="after")
    def _numbers_are_unique(self) -> "ReorderFirewallRequest":
        """Two rules on one number would merge their leaves in the commit."""
        olds = [rule.old_number for rule in self.rules]
        if len(olds) != len(set(olds)):
            raise ValueError("old_number values must be unique")
        news = [rule.new_number for rule in self.rules if rule.new_number is not None]
        if len(news) != len(set(news)):
            raise ValueError("new_number values must be unique")
        return self


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


def build_router(family: str) -> APIRouter:
    if family not in ("ipv4", "ipv6"):
        raise ValueError(f"unsupported firewall family: {family}")
    router = APIRouter(prefix=f"/vyos/firewall/{family}", tags=[f"firewall_{family}"])

    @router.get("/capabilities", operation_id=f"get_firewall_{family}_capabilities")
    async def get_capabilities(request: Request):
        """
        Get firewall capabilities based on device VyOS version.

        Returns feature flags indicating which operations are supported.
        Allows frontends to conditionally enable/disable features.

        Requires READ permission on FIREWALL_POLICIES feature.
        """
        # Check user has READ permission for firewall policies
        await require_read_permission(request, FeatureGroup.FIREWALL_POLICIES)

        try:
            service = get_session_vyos_service(request)
            version = service.get_version()
            builder = FirewallFamilyBatchBuilder(version=version, family=family)
            capabilities = builder.get_capabilities()

            # Add instance info
            if hasattr(request.state, "instance") and request.state.instance:
                capabilities["instance_name"] = request.state.instance.get("name")
                capabilities["instance_id"] = request.state.instance.get("id")

            return capabilities
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")


    # ========================================================================
    # Endpoint 2: Config (Generalized Data)
    # ========================================================================

    @router.get("/config", response_model=FirewallConfigResponse, operation_id=f"get_firewall_{family}_config")
    async def get_config(http_request: Request, refresh: bool = False):
        """
        Get all firewall configurations from VyOS in a generalized format.

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
            mapper = cast(
                FirewallFamilyMapper,
                CommandMapperRegistry.get_mapper(f"firewall_{family}", service.get_version()),
            )
            full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
            return FirewallConfigResponse(**mapper.parse_config(full_config))
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")


    # ========================================================================
    # Endpoint 3: Batch Operations
    # ========================================================================

    @router.post("/batch", operation_id=f"firewall_{family}_batch_configure")
    async def batch_configure(http_request: Request, request: FirewallBatchRequest):
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
            builder = FirewallFamilyBatchBuilder(version=version, family=family)

            # The checks below bind every op argument (each op takes at most one
            # value). ValueError is a missing node, an unknown base chain, or a
            # bad value; the catch does not wrap execute_batch, so an empty
            # batch stays a 500.
            try:
                for operation in request.operations:
                    method_name = operation.op

                    method = resolve_batch_method(builder, method_name)
                    sig = inspect.signature(method)
                    params = list(sig.parameters.keys())
                    required = [
                        name
                        for name, param in sig.parameters.items()
                        if param.default is inspect.Parameter.empty
                    ]

                    if "rule_number" in required and request.rule_number is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"{operation.op} requires a rule number",
                        )
                    if any(name in required for name in VALUE_PARAMS) and not operation.value:
                        raise HTTPException(
                            status_code=400,
                            detail=f"{operation.op} requires a value",
                        )

                    # Build arguments dynamically based on method signature order.
                    # Value goes before is_custom: (chain, rule_number, value, is_custom).
                    args = []
                    if "chain" in params or "chain_name" in params:
                        args.append(request.chain)
                    if "rule_number" in params and request.rule_number is not None:
                        args.append(request.rule_number)
                    if operation.value and any(p in params for p in VALUE_PARAMS):
                        args.append(operation.value)
                    if "is_custom" in params:
                        args.append(request.is_custom_chain)

                    method(*args)
            except ValueError as e:
                # The mapper raises ValueError for a node this version lacks,
                # a base chain that does not exist, or a bad tcp flag.
                raise HTTPException(status_code=400, detail=str(e))

            response = await run_in_threadpool(service.execute_batch, builder)
            committed = response.status == 200 and not response.error

            return VyOSResponse(
                success=committed,
                data={"message": "Firewall configuration updated"} if committed else None,
                error=response.error or None,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")


    # ========================================================================
    # Endpoint 4: Reorder Rules
    # ========================================================================

    @router.post("/reorder", operation_id=f"firewall_{family}_reorder_rules")
    async def reorder_rules(http_request: Request, request: ReorderFirewallRequest):
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
            builder = FirewallFamilyBatchBuilder(version=version, family=family)

            try:
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
                    if new_number is None:
                        continue  # delete-only item: removed above, not recreated
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
                                if group_type == "dynamic-address-group":
                                    builder.set_rule_source_group_dynamic_address(request.chain, new_number, group_name, request.is_custom_chain)
                                elif "address" in group_type:
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
                                if group_type == "dynamic-address-group":
                                    builder.set_rule_destination_group_dynamic_address(request.chain, new_number, group_name, request.is_custom_chain)
                                elif "address" in group_type:
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
                        if interface.get("inbound_group"):
                            builder.set_rule_inbound_interface_group(request.chain, new_number, interface["inbound_group"], request.is_custom_chain)
                        if interface.get("outbound"):
                            builder.set_rule_outbound_interface(request.chain, new_number, interface["outbound"], request.is_custom_chain)
                        if interface.get("outbound_group"):
                            builder.set_rule_outbound_interface_group(request.chain, new_number, interface["outbound_group"], request.is_custom_chain)

                    # Packet modifications
                    if rule_data.get("packet_mods"):
                        mods = rule_data["packet_mods"]
                        if mods.get("dscp"):
                            builder.set_rule_set_dscp(request.chain, new_number, mods["dscp"], request.is_custom_chain)
                        if mods.get("mark"):
                            builder.set_rule_set_mark(request.chain, new_number, mods["mark"], request.is_custom_chain)
                        hop_val = mods.get("ttl") or mods.get("hop_limit")
                        if hop_val:
                            builder.set_rule_set_ttl(request.chain, new_number, hop_val, request.is_custom_chain)

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
                    for value in multi_text(rule_data.get("connection_mark")) or []:
                        builder.set_rule_connection_mark(request.chain, new_number, value, request.is_custom_chain)

                    # Connection status
                    if rule_data.get("connection_status"):
                        cs = rule_data["connection_status"]
                        if cs.get("nat"):
                            builder.set_rule_connection_status_nat(request.chain, new_number, cs["nat"], request.is_custom_chain)

                    # Conntrack helper
                    for value in multi_text(rule_data.get("conntrack_helper")) or []:
                        builder.set_rule_conntrack_helper(request.chain, new_number, value, request.is_custom_chain)

                    # DSCP match
                    for value in multi_text(rule_data.get("dscp_match")) or []:
                        builder.set_rule_dscp(request.chain, new_number, value, request.is_custom_chain)
                    for value in multi_text(rule_data.get("dscp_exclude")) or []:
                        builder.set_rule_dscp_exclude(request.chain, new_number, value, request.is_custom_chain)

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
                    for value in multi_text(rule_data.get("packet_length")) or []:
                        builder.set_rule_packet_length(request.chain, new_number, value, request.is_custom_chain)
                    for value in multi_text(rule_data.get("packet_length_exclude")) or []:
                        builder.set_rule_packet_length_exclude(request.chain, new_number, value, request.is_custom_chain)

                    # Packet type
                    if rule_data.get("packet_type"):
                        builder.set_rule_packet_type(request.chain, new_number, rule_data["packet_type"], request.is_custom_chain)

                    # Queue
                    if rule_data.get("queue_number"):
                        builder.set_rule_queue(request.chain, new_number, rule_data["queue_number"], request.is_custom_chain)
                    for value in multi_text(rule_data.get("queue_options")) or []:
                        builder.set_rule_queue_options(request.chain, new_number, value, request.is_custom_chain)

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
                    icmp_type = rule_data.get("icmp_type")
                    if icmp_type:
                        builder.set_rule_icmp_type(request.chain, new_number, icmp_type, request.is_custom_chain)

            except ValueError as e:
                # The mapper raises ValueError for a node this version lacks,
                # a base chain that does not exist, or a bad tcp flag.
                raise HTTPException(status_code=400, detail=str(e))

            response = await run_in_threadpool(service.execute_batch, builder)
            committed = response.status == 200 and not response.error

            return VyOSResponse(
                success=committed,
                data={"message": "Rules reordered successfully"} if committed else None,
                error=response.error or None,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Unhandled error")
            raise HTTPException(status_code=500, detail="Internal server error")
    return router
