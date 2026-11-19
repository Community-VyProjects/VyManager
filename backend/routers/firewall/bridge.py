"""
Bridge Firewall Router

API endpoints for managing VyOS bridge (layer 2) firewall.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Optional, Any
import inspect
from session_vyos_service import get_session_vyos_service
from batch_dispatch import resolve_batch_method
from vyos_builders.firewall import BridgeFirewallBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.bridge import BridgeFirewallMapper
from fastapi_permissions import require_read_permission, require_write_permission, FeatureGroup
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/bridge", tags=["firewall-bridge"])


# Request/Response Models
class BridgeBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class BridgeBatchRequest(BaseModel):
    """Model for batch bridge firewall configuration."""
    chain: str = Field(..., description="Chain name (forward, input, output, prerouting)")
    rule_number: Optional[int] = Field(None, description="Rule number (required for rule operations)")
    operations: List[BridgeBatchOperation] = Field(..., description="List of operations to perform")

    class Config:
        json_schema_extra = {
            "example": {
                "chain": "forward",
                "rule_number": 10,
                "operations": [
                    {"op": "set_rule"},
                    {"op": "set_rule_action", "value": "accept"},
                    {"op": "set_rule_source_mac", "value": "00:11:22:33:44:55"},
                    {"op": "set_rule_description", "value": "Allow trusted MAC"}
                ]
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BridgeRule(BaseModel):
    """Bridge firewall rule configuration."""
    rule_number: int
    action: Optional[str] = None
    description: Optional[str] = None
    disabled: bool = False
    log: bool = False
    # Source fields
    source_mac: Optional[str] = None
    source_address: Optional[str] = None
    source_port: Optional[str] = None
    source_group_address: Optional[str] = None
    source_group_network: Optional[str] = None
    source_group_port: Optional[str] = None
    source_group_mac: Optional[str] = None
    # Destination fields
    destination_mac: Optional[str] = None
    destination_address: Optional[str] = None
    destination_port: Optional[str] = None
    destination_group_address: Optional[str] = None
    destination_group_network: Optional[str] = None
    destination_group_port: Optional[str] = None
    destination_group_mac: Optional[str] = None
    # VLAN fields
    vlan_id: Optional[str] = None
    vlan_priority: Optional[str] = None
    vlan_ethernet_type: Optional[str] = None
    # Interface fields
    inbound_interface: Optional[str] = None
    inbound_interface_group: Optional[str] = None
    outbound_interface: Optional[str] = None
    outbound_interface_group: Optional[str] = None
    # Protocol fields
    protocol: Optional[str] = None
    ethernet_type: Optional[str] = None
    # ICMP fields
    icmp_type: Optional[str] = None
    icmp_code: Optional[str] = None
    icmp_type_name: Optional[str] = None
    icmpv6_type: Optional[str] = None
    icmpv6_code: Optional[str] = None
    icmpv6_type_name: Optional[str] = None
    # TCP fields
    tcp_flags: Optional[str] = None
    tcp_flags_not: Optional[str] = None
    tcp_mss: Optional[str] = None
    # Rate limit fields
    limit_rate: Optional[str] = None
    limit_burst: Optional[str] = None
    # Time fields (VyOS 1.5+)
    time_startdate: Optional[str] = None
    time_stopdate: Optional[str] = None
    time_starttime: Optional[str] = None
    time_stoptime: Optional[str] = None
    time_weekdays: Optional[str] = None
    # Mark/DSCP matching fields
    mark: Optional[str] = None
    connection_mark: Optional[str] = None
    dscp: Optional[str] = None
    dscp_exclude: Optional[str] = None
    # TTL/Hop-Limit fields
    ttl_eq: Optional[str] = None
    ttl_gt: Optional[str] = None
    ttl_lt: Optional[str] = None
    hop_limit_eq: Optional[str] = None
    hop_limit_gt: Optional[str] = None
    hop_limit_lt: Optional[str] = None
    # Packet fields
    packet_type: Optional[str] = None
    packet_length: Optional[str] = None
    # Fragment matching
    fragment_match_frag: bool = False
    fragment_match_non_frag: bool = False
    # IPsec matching
    ipsec_match_ipsec_in: bool = False
    ipsec_match_ipsec_out: bool = False
    ipsec_match_none_in: bool = False
    ipsec_match_none_out: bool = False
    # Log options
    log_options_level: Optional[str] = None
    log_options_group: Optional[str] = None
    log_options_queue_threshold: Optional[str] = None
    log_options_snapshot_length: Optional[str] = None
    # Jump target
    jump_target: Optional[str] = None
    # Queue
    queue: Optional[str] = None
    # Set options (action modifications)
    set_dscp: Optional[str] = None
    set_mark: Optional[str] = None
    set_connection_mark: Optional[str] = None
    set_ttl: Optional[str] = None
    set_hop_limit: Optional[str] = None
    set_tcp_mss: Optional[str] = None


class BridgeChain(BaseModel):
    """Bridge firewall chain configuration."""
    name: str
    default_action: Optional[str] = None
    description: Optional[str] = None
    rules: List[BridgeRule] = []
    rule_count: int = 0


class BridgeConfigResponse(BaseModel):
    """Response containing bridge firewall configuration."""
    chains: List[BridgeChain] = []
    custom_chains: List[BridgeChain] = []
    total_rules: int = 0


class InterfaceOption(BaseModel):
    """Interface option for dropdowns."""
    name: str
    type: str
    description: Optional[str] = None


class InterfaceListResponse(BaseModel):
    """Response containing available interfaces."""
    interfaces: List[InterfaceOption] = []
    total: int = 0


@router.get("/capabilities")
async def get_bridge_capabilities(request: Request):
    """
    Get bridge firewall capabilities based on device VyOS version.

    Returns feature flags indicating which chains and operations are supported.
    VyOS 1.4 only supports forward chain.
    VyOS 1.5+ supports forward, input, output, prerouting chains plus additional features.

    Requires READ permission on FIREWALL_BRIDGE feature.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_BRIDGE)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BridgeFirewallBatchBuilder(version=version)
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


@router.get("/interfaces", response_model=InterfaceListResponse)
async def get_available_interfaces(request: Request):
    """
    Get available interfaces for inbound/outbound interface dropdowns.

    Returns a list of all interfaces (ethernet, dummy, bridge, wireguard, etc.)
    that can be used in firewall rules.

    Requires READ permission on FIREWALL_BRIDGE feature.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_BRIDGE)

    try:
        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        mapper = CommandMapperRegistry.get_mapper("firewall_bridge", service.get_version())
        if not isinstance(mapper, BridgeFirewallMapper):
            raise HTTPException(status_code=500, detail="Internal server error")
        rows = mapper.interface_options(full_config)
        interfaces = [InterfaceOption(**row) for row in rows]
        return InterfaceListResponse(interfaces=interfaces, total=len(interfaces))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=BridgeConfigResponse)
async def get_bridge_config(request: Request, refresh: bool = False):
    """
    Get bridge firewall configuration from VyOS.

    Args:
        request: FastAPI request object (contains active session)
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all bridge firewall chains and rules

    Requires READ permission on FIREWALL_BRIDGE feature.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_BRIDGE)

    try:
        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("firewall_bridge", service.get_version())
        if not isinstance(mapper, BridgeFirewallMapper):
            raise HTTPException(status_code=500, detail="Internal server error")
        parsed = mapper.parse_config(full_config)
        return BridgeConfigResponse(
            chains=[BridgeChain(**row) for row in parsed["chains"]],
            custom_chains=[BridgeChain(**row) for row in parsed["custom_chains"]],
            total_rules=parsed["total_rules"],
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def configure_bridge_batch(http_request: Request, request: BridgeBatchRequest):
    """
    Configure bridge firewall using batch operations.

    This is the main endpoint for configuring bridge firewall rules. All operations
    are version-aware and sent to VyOS in a single batch for efficiency.

    **Chain Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_chain` | No | Create/enable chain |
    | `delete_chain` | No | Delete chain |
    | `set_chain_default_action` | Yes | Set default action (accept, drop) |
    | `delete_chain_default_action` | No | Delete default action |
    | `set_chain_description` | Yes | Set chain description |
    | `delete_chain_description` | No | Delete chain description |

    **Rule Operations (require rule_number):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_rule` | No | Create rule |
    | `delete_rule` | No | Delete rule |
    | `set_rule_action` | Yes | Set action (accept, drop, continue, jump, return, queue, reject, notrack) |
    | `delete_rule_action` | No | Delete action |
    | `set_rule_description` | Yes | Set rule description |
    | `delete_rule_description` | No | Delete rule description |
    | `set_rule_disable` | No | Disable rule |
    | `delete_rule_disable` | No | Enable rule |
    | `set_rule_log` | No | Enable logging |
    | `delete_rule_log` | No | Disable logging |
    | `set_rule_jump_target` | Yes | Set jump target chain |
    | `delete_rule_jump_target` | No | Remove jump target |

    **Source/Destination MAC:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_rule_source_mac` | Yes | Match source MAC (e.g., 00:11:22:33:44:55) |
    | `delete_rule_source_mac` | No | Remove source MAC filter |
    | `set_rule_destination_mac` | Yes | Match destination MAC |
    | `delete_rule_destination_mac` | No | Remove destination MAC filter |

    **VLAN Matching:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_rule_vlan_id` | Yes | Match VLAN ID (1-4094) |
    | `delete_rule_vlan_id` | No | Remove VLAN ID filter |
    | `set_rule_vlan_priority` | Yes | Match VLAN priority (0-7) |
    | `delete_rule_vlan_priority` | No | Remove VLAN priority filter |

    **Interface Matching:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_rule_inbound_interface` | Yes | Match inbound interface name |
    | `delete_rule_inbound_interface` | No | Remove inbound interface filter |
    | `set_rule_inbound_interface_group` | Yes | Match inbound interface group |
    | `delete_rule_inbound_interface_group` | No | Remove inbound interface group |
    | `set_rule_outbound_interface` | Yes | Match outbound interface name |
    | `delete_rule_outbound_interface` | No | Remove outbound interface filter |
    | `set_rule_outbound_interface_group` | Yes | Match outbound interface group |
    | `delete_rule_outbound_interface_group` | No | Remove outbound interface group |

    **VyOS 1.5+ Only:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_rule_ethernet_type` | Yes | Match ethernet type (arp, ipv4, ipv6, 802.1q) |
    | `delete_rule_ethernet_type` | No | Remove ethernet type filter |
    | `set_rule_set_dscp` | Yes | Set DSCP value (0-63) |
    | `delete_rule_set_dscp` | No | Remove DSCP modification |
    | `set_rule_set_mark` | Yes | Set packet mark |
    | `delete_rule_set_mark` | No | Remove packet mark |

    **Custom Chain Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_custom_chain` | No | Create custom chain |
    | `delete_custom_chain` | No | Delete custom chain |
    | `set_custom_chain_description` | Yes | Set custom chain description |
    | `delete_custom_chain_description` | No | Delete custom chain description |
    | `set_custom_chain_default_action` | Yes | Set custom chain default action |
    | `delete_custom_chain_default_action` | No | Delete custom chain default action |

    Requires WRITE permission on FIREWALL_BRIDGE feature.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_BRIDGE)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        batch = BridgeFirewallBatchBuilder(version=version)

        chain = request.chain
        rule_number = request.rule_number

        # The mapper raises ValueError (400 below) for a base chain this
        # device does not have.

        # ValueError is a missing leaf. A short call is a missing value.
        # Neither wraps execute_batch: an empty batch stays a 500.
        value_params = (
            "value", "description", "action", "mac", "vlan_id", "priority",
            "interface", "group", "eth_type", "target", "dscp", "mark",
            "protocol", "address", "port", "icmp_type", "code", "type_name",
            "flag", "mss", "rate", "burst", "level", "pkt_type", "length",
            "date", "time", "weekdays", "queue", "ttl", "hop_limit",
        )
        try:
            for operation in request.operations:
                method = resolve_batch_method(batch, operation.op)
                sig = inspect.signature(method)
                params = list(sig.parameters.keys())
                required = [
                    name
                    for name, param in sig.parameters.items()
                    if param.default is inspect.Parameter.empty
                ]
                if "rule_number" in required and rule_number is None:
                    raise HTTPException(
                        status_code=400,
                        detail="rule_number required for rule operations",
                    )
                if any(name in required for name in value_params) and not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{operation.op} requires a value",
                    )
                args = []
                if "chain" in params or "chain_name" in params:
                    args.append(chain)
                if "rule_number" in params and rule_number is not None:
                    args.append(rule_number)
                if operation.value and any(name in params for name in value_params):
                    args.append(operation.value)
                try:
                    method(*args)
                except TypeError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{operation.op} requires a value",
                    )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, batch)

        # Handle empty string result
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = None
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data}

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# Reorder request models
class ReorderRuleItem(BaseModel):
    """Single rule in a reorder request."""
    old_number: int
    new_number: int
    rule_data: BridgeRule


class ReorderRequest(BaseModel):
    """Request model for reordering rules."""
    chain: str = Field(..., description="Chain name")
    rules: List[ReorderRuleItem] = Field(..., description="Rules with old and new numbers")

    @model_validator(mode="after")
    def _numbers_are_unique(self) -> "ReorderRequest":
        """Two rules on one number would merge their leaves in the commit."""
        olds = [rule.old_number for rule in self.rules]
        if len(olds) != len(set(olds)):
            raise ValueError("old_number values must be unique")
        news = [rule.new_number for rule in self.rules]
        if len(news) != len(set(news)):
            raise ValueError("new_number values must be unique")
        return self


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_bridge_rules(http_request: Request, request: ReorderRequest):
    """
    Reorder rules in a bridge firewall chain.

    This endpoint deletes all specified rules and recreates them with new rule numbers,
    preserving all rule properties. This is an atomic operation.

    Requires WRITE permission on FIREWALL_BRIDGE feature.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_BRIDGE)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        batch = BridgeFirewallBatchBuilder(version=version)

        chain = request.chain

        try:
            # Step 1: Delete all rules in reverse order (to preserve indices)
            rules_to_delete = sorted([item.old_number for item in request.rules], reverse=True)
            for old_number in rules_to_delete:
                batch.delete_rule(chain, old_number)

            # Step 2: Recreate rules with new numbers
            for item in request.rules:
                rule = item.rule_data
                new_number = item.new_number

                # Create the rule
                batch.set_rule(chain, new_number)

                # Set action
                if rule.action:
                    batch.set_rule_action(chain, new_number, rule.action)

                # Set description
                if rule.description:
                    batch.set_rule_description(chain, new_number, rule.description)

                # Set log
                if rule.log:
                    batch.set_rule_log(chain, new_number)

                # Set disabled
                if rule.disabled:
                    batch.set_rule_disable(chain, new_number)

                # Set source MAC
                if rule.source_mac:
                    batch.set_rule_source_mac(chain, new_number, rule.source_mac)

                # Set destination MAC
                if rule.destination_mac:
                    batch.set_rule_destination_mac(chain, new_number, rule.destination_mac)

                # Set VLAN ID
                if rule.vlan_id:
                    batch.set_rule_vlan_id(chain, new_number, rule.vlan_id)

                # Set VLAN priority
                if rule.vlan_priority:
                    batch.set_rule_vlan_priority(chain, new_number, rule.vlan_priority)

                # Set inbound interface
                if rule.inbound_interface:
                    batch.set_rule_inbound_interface(chain, new_number, rule.inbound_interface)

                # Set inbound interface group
                if rule.inbound_interface_group:
                    batch.set_rule_inbound_interface_group(chain, new_number, rule.inbound_interface_group)

                # Set outbound interface
                if rule.outbound_interface:
                    batch.set_rule_outbound_interface(chain, new_number, rule.outbound_interface)

                # Set outbound interface group
                if rule.outbound_interface_group:
                    batch.set_rule_outbound_interface_group(chain, new_number, rule.outbound_interface_group)

                # Source/Destination addresses (VyOS 1.5+)
                if rule.source_address:
                    batch.set_rule_source_address(chain, new_number, rule.source_address)
                if rule.destination_address:
                    batch.set_rule_destination_address(chain, new_number, rule.destination_address)

                # Source/Destination ports (VyOS 1.5+)
                if rule.source_port:
                    batch.set_rule_source_port(chain, new_number, rule.source_port)
                if rule.destination_port:
                    batch.set_rule_destination_port(chain, new_number, rule.destination_port)

                # Source groups (VyOS 1.5+)
                if rule.source_group_address:
                    batch.set_rule_source_group_address(chain, new_number, rule.source_group_address)
                if rule.source_group_network:
                    batch.set_rule_source_group_network(chain, new_number, rule.source_group_network)
                if rule.source_group_port:
                    batch.set_rule_source_group_port(chain, new_number, rule.source_group_port)
                if rule.source_group_mac:
                    batch.set_rule_source_group_mac(chain, new_number, rule.source_group_mac)

                # Destination groups (VyOS 1.5+)
                if rule.destination_group_address:
                    batch.set_rule_destination_group_address(chain, new_number, rule.destination_group_address)
                if rule.destination_group_network:
                    batch.set_rule_destination_group_network(chain, new_number, rule.destination_group_network)
                if rule.destination_group_port:
                    batch.set_rule_destination_group_port(chain, new_number, rule.destination_group_port)
                if rule.destination_group_mac:
                    batch.set_rule_destination_group_mac(chain, new_number, rule.destination_group_mac)

                # VLAN ethernet type
                if rule.vlan_ethernet_type:
                    batch.set_rule_vlan_ethernet_type(chain, new_number, rule.vlan_ethernet_type)

                # Protocol (VyOS 1.5+)
                if rule.protocol:
                    batch.set_rule_protocol(chain, new_number, rule.protocol)

                # Ethernet type
                if rule.ethernet_type:
                    batch.set_rule_ethernet_type(chain, new_number, rule.ethernet_type)

                # ICMP (VyOS 1.5+)
                if rule.icmp_type:
                    batch.set_rule_icmp_type(chain, new_number, rule.icmp_type)
                if rule.icmp_code:
                    batch.set_rule_icmp_code(chain, new_number, rule.icmp_code)
                if rule.icmp_type_name:
                    batch.set_rule_icmp_type_name(chain, new_number, rule.icmp_type_name)

                # ICMPv6 (VyOS 1.5+)
                if rule.icmpv6_type:
                    batch.set_rule_icmpv6_type(chain, new_number, rule.icmpv6_type)
                if rule.icmpv6_code:
                    batch.set_rule_icmpv6_code(chain, new_number, rule.icmpv6_code)
                if rule.icmpv6_type_name:
                    batch.set_rule_icmpv6_type_name(chain, new_number, rule.icmpv6_type_name)

                # TCP (VyOS 1.5+)
                if rule.tcp_flags:
                    for flag in rule.tcp_flags.split(","):
                        if flag.strip():
                            batch.set_rule_tcp_flags(chain, new_number, flag.strip())
                if rule.tcp_flags_not:
                    for flag in rule.tcp_flags_not.split(","):
                        if flag.strip():
                            batch.set_rule_tcp_flags_not(chain, new_number, flag.strip())
                if rule.tcp_mss:
                    batch.set_rule_tcp_mss(chain, new_number, rule.tcp_mss)

                # Rate limit (VyOS 1.5+)
                if rule.limit_rate:
                    batch.set_rule_limit_rate(chain, new_number, rule.limit_rate)
                if rule.limit_burst:
                    batch.set_rule_limit_burst(chain, new_number, rule.limit_burst)

                # Time-based rules (VyOS 1.5+)
                if rule.time_startdate:
                    batch.set_rule_time_startdate(chain, new_number, rule.time_startdate)
                if rule.time_stopdate:
                    batch.set_rule_time_stopdate(chain, new_number, rule.time_stopdate)
                if rule.time_starttime:
                    batch.set_rule_time_starttime(chain, new_number, rule.time_starttime)
                if rule.time_stoptime:
                    batch.set_rule_time_stoptime(chain, new_number, rule.time_stoptime)
                if rule.time_weekdays:
                    batch.set_rule_time_weekdays(chain, new_number, rule.time_weekdays)

                # Mark matching (VyOS 1.5+)
                if rule.mark:
                    batch.set_rule_mark(chain, new_number, rule.mark)
                if rule.connection_mark:
                    batch.set_rule_connection_mark(chain, new_number, rule.connection_mark)

                # DSCP matching (VyOS 1.5+)
                if rule.dscp:
                    batch.set_rule_dscp(chain, new_number, rule.dscp)
                if rule.dscp_exclude:
                    batch.set_rule_dscp_exclude(chain, new_number, rule.dscp_exclude)

                # TTL/Hop-limit (VyOS 1.5+)
                if rule.ttl_eq:
                    batch.set_rule_ttl_eq(chain, new_number, rule.ttl_eq)
                if rule.ttl_gt:
                    batch.set_rule_ttl_gt(chain, new_number, rule.ttl_gt)
                if rule.ttl_lt:
                    batch.set_rule_ttl_lt(chain, new_number, rule.ttl_lt)
                if rule.hop_limit_eq:
                    batch.set_rule_hop_limit_eq(chain, new_number, rule.hop_limit_eq)
                if rule.hop_limit_gt:
                    batch.set_rule_hop_limit_gt(chain, new_number, rule.hop_limit_gt)
                if rule.hop_limit_lt:
                    batch.set_rule_hop_limit_lt(chain, new_number, rule.hop_limit_lt)

                # Packet fields (VyOS 1.5+)
                if rule.packet_type:
                    batch.set_rule_packet_type(chain, new_number, rule.packet_type)
                if rule.packet_length:
                    batch.set_rule_packet_length(chain, new_number, rule.packet_length)

                # Fragment matching (VyOS 1.5+)
                if rule.fragment_match_frag:
                    batch.set_rule_fragment_match_frag(chain, new_number)
                if rule.fragment_match_non_frag:
                    batch.set_rule_fragment_match_non_frag(chain, new_number)

                # IPsec matching (VyOS 1.5+)
                if rule.ipsec_match_ipsec_in:
                    batch.set_rule_ipsec_match_ipsec_in(chain, new_number)
                if rule.ipsec_match_ipsec_out:
                    batch.set_rule_ipsec_match_ipsec_out(chain, new_number)
                if rule.ipsec_match_none_in:
                    batch.set_rule_ipsec_match_none_in(chain, new_number)
                if rule.ipsec_match_none_out:
                    batch.set_rule_ipsec_match_none_out(chain, new_number)

                # Log options
                if rule.log_options_level:
                    batch.set_rule_log_options_level(chain, new_number, rule.log_options_level)
                if rule.log_options_group:
                    batch.set_rule_log_options_group(chain, new_number, rule.log_options_group)
                if rule.log_options_queue_threshold:
                    batch.set_rule_log_options_queue_threshold(chain, new_number, rule.log_options_queue_threshold)
                if rule.log_options_snapshot_length:
                    batch.set_rule_log_options_snapshot_length(chain, new_number, rule.log_options_snapshot_length)

                # Jump target
                if rule.jump_target:
                    batch.set_rule_jump_target(chain, new_number, rule.jump_target)

                # Queue
                if rule.queue:
                    batch.set_rule_queue(chain, new_number, rule.queue)

                # Set options (VyOS 1.5+)
                if rule.set_dscp:
                    batch.set_rule_set_dscp(chain, new_number, rule.set_dscp)
                if rule.set_mark:
                    batch.set_rule_set_mark(chain, new_number, rule.set_mark)
                if rule.set_connection_mark:
                    batch.set_rule_set_connection_mark(chain, new_number, rule.set_connection_mark)
                if rule.set_ttl:
                    batch.set_rule_set_ttl(chain, new_number, rule.set_ttl)
                if rule.set_hop_limit:
                    batch.set_rule_set_hop_limit(chain, new_number, rule.set_hop_limit)
                if rule.set_tcp_mss:
                    batch.set_rule_set_tcp_mss(chain, new_number, rule.set_tcp_mss)

        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, batch)

        return VyOSResponse(
            success=response.status == 200,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
