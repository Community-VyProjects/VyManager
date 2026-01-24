"""
Bridge Firewall Router

API endpoints for managing VyOS bridge (layer 2) firewall.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import BridgeFirewallBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission, FeatureGroup

router = APIRouter(prefix="/vyos/firewall/bridge", tags=["firewall-bridge"])


# Stub functions for backwards compatibility
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


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
    source_mac: Optional[str] = None
    destination_mac: Optional[str] = None
    vlan_id: Optional[str] = None
    vlan_priority: Optional[str] = None
    inbound_interface: Optional[str] = None
    inbound_interface_group: Optional[str] = None
    outbound_interface: Optional[str] = None
    outbound_interface_group: Optional[str] = None
    ethernet_type: Optional[str] = None
    jump_target: Optional[str] = None
    set_dscp: Optional[str] = None
    set_mark: Optional[str] = None
    set_vlan_priority: Optional[str] = None


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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

        interfaces_config = full_config.get("interfaces", {})
        interfaces: List[InterfaceOption] = []

        # All VyOS interface types
        interface_types = [
            "bonding",          # Bonding Interface/Link Aggregation
            "bridge",           # Bridge Interface
            "dummy",            # Dummy Interface
            "ethernet",         # Ethernet Interface
            "geneve",           # Generic Network Virtualization Encapsulation (GENEVE)
            "input",            # Input Functional Block (IFB)
            "l2tpv3",           # Layer 2 Tunnel Protocol Version 3
            "loopback",         # Loopback Interface
            "macsec",           # MACsec Interface (802.1ae)
            "openvpn",          # OpenVPN Tunnel Interface
            "pppoe",            # Point-to-Point Protocol over Ethernet
            "pseudo-ethernet",  # Pseudo Ethernet Interface (Macvlan)
            "sstpc",            # Secure Socket Tunneling Protocol (SSTP) client
            "tunnel",           # Tunnel interface
            "virtual-ethernet", # Virtual Ethernet (veth)
            "vti",              # Virtual Tunnel Interface (XFRM)
            "vxlan",            # Virtual Extensible LAN (VXLAN)
            "wireguard",        # WireGuard Interface
            "wireless",         # Wireless (WiFi/WLAN)
            "wwan",             # Wireless Modem (WWAN)
        ]

        # Parse all interface types from config
        for iface_type in interface_types:
            type_config = interfaces_config.get(iface_type, {})
            if not isinstance(type_config, dict):
                continue

            for iface_name, iface_data in type_config.items():
                description = iface_data.get("description") if isinstance(iface_data, dict) else None
                interfaces.append(InterfaceOption(name=iface_name, type=iface_type, description=description))

                # Add VLAN sub-interfaces (vif) for interface types that support them
                if isinstance(iface_data, dict) and "vif" in iface_data:
                    vif_config = iface_data["vif"]
                    if isinstance(vif_config, dict):
                        for vlan_id, vlan_data in vif_config.items():
                            vlan_desc = vlan_data.get("description") if isinstance(vlan_data, dict) else None
                            interfaces.append(InterfaceOption(
                                name=f"{iface_name}.{vlan_id}",
                                type=iface_type,
                                description=vlan_desc or f"VLAN {vlan_id}"
                            ))

                # Add QinQ service VLANs (vif-s) and customer VLANs (vif-c)
                if isinstance(iface_data, dict) and "vif-s" in iface_data:
                    vif_s_config = iface_data["vif-s"]
                    if isinstance(vif_s_config, dict):
                        for s_vlan_id, s_vlan_data in vif_s_config.items():
                            s_vlan_desc = s_vlan_data.get("description") if isinstance(s_vlan_data, dict) else None
                            interfaces.append(InterfaceOption(
                                name=f"{iface_name}.{s_vlan_id}",
                                type=iface_type,
                                description=s_vlan_desc or f"Service VLAN {s_vlan_id}"
                            ))
                            # Check for customer VLANs within service VLAN
                            if isinstance(s_vlan_data, dict) and "vif-c" in s_vlan_data:
                                vif_c_config = s_vlan_data["vif-c"]
                                if isinstance(vif_c_config, dict):
                                    for c_vlan_id, c_vlan_data in vif_c_config.items():
                                        c_vlan_desc = c_vlan_data.get("description") if isinstance(c_vlan_data, dict) else None
                                        interfaces.append(InterfaceOption(
                                            name=f"{iface_name}.{s_vlan_id}.{c_vlan_id}",
                                            type=iface_type,
                                            description=c_vlan_desc or f"Customer VLAN {c_vlan_id}"
                                        ))

        # Sort by name
        interfaces.sort(key=lambda x: x.name)

        return InterfaceListResponse(interfaces=interfaces, total=len(interfaces))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

        if not full_config or "firewall" not in full_config or "bridge" not in full_config["firewall"]:
            return BridgeConfigResponse(total_rules=0)

        bridge_config = full_config["firewall"]["bridge"]
        version = service.get_version()
        is_v15 = "1.5" in version

        # Define base chains to look for
        base_chain_names = ["forward"]
        if is_v15:
            base_chain_names = ["forward", "input", "output", "prerouting"]

        chains = []
        total_rules = 0

        # Parse base chains
        for chain_name in base_chain_names:
            if chain_name in bridge_config:
                raw_chain_data = bridge_config[chain_name]
                # VyOS 1.5 uses filter table structure
                if is_v15 and isinstance(raw_chain_data, dict) and "filter" in raw_chain_data:
                    chain_data = raw_chain_data["filter"]
                else:
                    chain_data = raw_chain_data
                chain = parse_chain(chain_name, chain_data)
                chains.append(chain)
                total_rules += chain.rule_count

        # Parse custom chains (both VyOS 1.4 and 1.5)
        custom_chains = []
        if "name" in bridge_config:
            for chain_name, chain_data in bridge_config["name"].items():
                chain = parse_chain(chain_name, chain_data)
                custom_chains.append(chain)
                total_rules += chain.rule_count

        return BridgeConfigResponse(
            chains=chains,
            custom_chains=custom_chains,
            total_rules=total_rules
        )

    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_chain(chain_name: str, chain_data: dict) -> BridgeChain:
    """Parse a chain configuration from VyOS config."""
    rules = []

    rules_config = chain_data.get("rule", {})
    if isinstance(rules_config, dict):
        for rule_num, rule_config in rules_config.items():
            rule = parse_rule(int(rule_num), rule_config)
            rules.append(rule)

    # Sort rules by rule number
    rules.sort(key=lambda r: r.rule_number)

    return BridgeChain(
        name=chain_name,
        default_action=chain_data.get("default-action"),
        description=chain_data.get("description"),
        rules=rules,
        rule_count=len(rules)
    )


def parse_rule(rule_number: int, rule_config: dict) -> BridgeRule:
    """Parse a rule configuration from VyOS config."""
    # Handle source
    source = rule_config.get("source", {})
    source_mac = source.get("mac-address") if isinstance(source, dict) else None

    # Handle destination
    destination = rule_config.get("destination", {})
    dest_mac = destination.get("mac-address") if isinstance(destination, dict) else None

    # Handle VLAN
    vlan = rule_config.get("vlan", {})
    vlan_id = vlan.get("id") if isinstance(vlan, dict) else None
    vlan_priority = vlan.get("priority") if isinstance(vlan, dict) else None

    # Handle interfaces
    inbound = rule_config.get("inbound-interface", {})
    outbound = rule_config.get("outbound-interface", {})

    # Handle set options
    set_opts = rule_config.get("set", {})

    return BridgeRule(
        rule_number=rule_number,
        action=rule_config.get("action"),
        description=rule_config.get("description"),
        disabled="disable" in rule_config,
        log="log" in rule_config,
        source_mac=source_mac,
        destination_mac=dest_mac,
        vlan_id=vlan_id,
        vlan_priority=vlan_priority,
        inbound_interface=inbound.get("name") if isinstance(inbound, dict) else None,
        inbound_interface_group=inbound.get("group") if isinstance(inbound, dict) else None,
        outbound_interface=outbound.get("name") if isinstance(outbound, dict) else None,
        outbound_interface_group=outbound.get("group") if isinstance(outbound, dict) else None,
        ethernet_type=rule_config.get("ethernet-type"),
        jump_target=rule_config.get("jump-target"),
        set_dscp=set_opts.get("dscp") if isinstance(set_opts, dict) else None,
        set_mark=set_opts.get("mark") if isinstance(set_opts, dict) else None,
        set_vlan_priority=set_opts.get("vlan-priority") if isinstance(set_opts, dict) else None,
    )


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
    | `set_rule_action` | Yes | Set action (accept, drop, continue, jump, notrack) |
    | `delete_rule_action` | No | Delete action |
    | `set_rule_description` | Yes | Set rule description |
    | `delete_rule_description` | No | Delete rule description |
    | `set_rule_disable` | No | Disable rule |
    | `delete_rule_disable` | No | Enable rule |
    | `set_rule_log` | No | Enable logging |
    | `delete_rule_log` | No | Disable logging |

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
    | `set_rule_jump_target` | Yes | Set jump target chain |
    | `delete_rule_jump_target` | No | Remove jump target |
    | `set_rule_set_dscp` | Yes | Set DSCP value (0-63) |
    | `delete_rule_set_dscp` | No | Remove DSCP modification |
    | `set_rule_set_mark` | Yes | Set packet mark |
    | `delete_rule_set_mark` | No | Remove packet mark |
    | `set_rule_set_vlan_priority` | Yes | Set VLAN priority (0-7) |
    | `delete_rule_set_vlan_priority` | No | Remove VLAN priority modification |

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

        # Validate chain is valid for this VyOS version
        is_v15 = "1.5" in version

        # VyOS 1.5-only base chains that are NOT valid on 1.4
        v15_only_base_chains = ["input", "output", "prerouting"]

        # If trying to use a 1.5-only base chain on 1.4, reject it
        # Custom chains (any name not in v15_only_base_chains and not "forward") are allowed on BOTH versions
        if not is_v15 and chain in v15_only_base_chains:
            raise HTTPException(
                status_code=400,
                detail=f"Chain '{chain}' is only available in VyOS 1.5+. On VyOS 1.4, only 'forward' base chain and custom chains are supported."
            )

        # Process each operation
        for operation in request.operations:
            op_type = operation.op
            value = operation.value

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Chain operations (don't require rule_number)
            if op_type == "set_chain":
                batch.set_chain(chain)
            elif op_type == "delete_chain":
                batch.delete_chain(chain)
            elif op_type == "set_chain_default_action":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_chain_default_action(chain, value)
            elif op_type == "delete_chain_default_action":
                batch.delete_chain_default_action(chain)
            elif op_type == "set_chain_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_chain_description(chain, value)
            elif op_type == "delete_chain_description":
                batch.delete_chain_description(chain)

            # Rule operations (require rule_number)
            elif op_type == "set_rule":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule(chain, rule_number)
            elif op_type == "delete_rule":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule(chain, rule_number)
            elif op_type == "set_rule_action":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_action(chain, rule_number, value)
            elif op_type == "delete_rule_action":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_action(chain, rule_number)
            elif op_type == "set_rule_description":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_description(chain, rule_number, value)
            elif op_type == "delete_rule_description":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_description(chain, rule_number)
            elif op_type == "set_rule_disable":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_disable(chain, rule_number)
            elif op_type == "delete_rule_disable":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_disable(chain, rule_number)
            elif op_type == "set_rule_log":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_log(chain, rule_number)
            elif op_type == "delete_rule_log":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_log(chain, rule_number)

            # Source MAC
            elif op_type == "set_rule_source_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_mac(chain, rule_number, value)
            elif op_type == "delete_rule_source_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_source_mac(chain, rule_number)
            elif op_type == "delete_rule_source":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_source(chain, rule_number)

            # Destination MAC
            elif op_type == "set_rule_destination_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_mac(chain, rule_number, value)
            elif op_type == "delete_rule_destination_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_destination_mac(chain, rule_number)
            elif op_type == "delete_rule_destination":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_destination(chain, rule_number)

            # VLAN
            elif op_type == "set_rule_vlan_id":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_vlan_id(chain, rule_number, value)
            elif op_type == "delete_rule_vlan_id":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_vlan_id(chain, rule_number)
            elif op_type == "set_rule_vlan_priority":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_vlan_priority(chain, rule_number, value)
            elif op_type == "delete_rule_vlan_priority":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_vlan_priority(chain, rule_number)
            elif op_type == "delete_rule_vlan":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_vlan(chain, rule_number)

            # Interface
            elif op_type == "set_rule_inbound_interface":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_inbound_interface(chain, rule_number, value)
            elif op_type == "delete_rule_inbound_interface":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_inbound_interface(chain, rule_number)
            elif op_type == "set_rule_inbound_interface_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_inbound_interface_group(chain, rule_number, value)
            elif op_type == "delete_rule_inbound_interface_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_inbound_interface_group(chain, rule_number)
            elif op_type == "set_rule_outbound_interface":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_outbound_interface(chain, rule_number, value)
            elif op_type == "delete_rule_outbound_interface":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_outbound_interface(chain, rule_number)
            elif op_type == "set_rule_outbound_interface_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_outbound_interface_group(chain, rule_number, value)
            elif op_type == "delete_rule_outbound_interface_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_outbound_interface_group(chain, rule_number)

            # Ethernet Type (VyOS 1.5+ only)
            elif op_type == "set_rule_ethernet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_ethernet_type(chain, rule_number, value)
            elif op_type == "delete_rule_ethernet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_ethernet_type(chain, rule_number)

            # Jump Target
            elif op_type == "set_rule_jump_target":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_jump_target(chain, rule_number, value)
            elif op_type == "delete_rule_jump_target":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_jump_target(chain, rule_number)

            # Set options (VyOS 1.5+ only)
            elif op_type == "set_rule_set_dscp":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_dscp(chain, rule_number, value)
            elif op_type == "delete_rule_set_dscp":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set_dscp(chain, rule_number)
            elif op_type == "set_rule_set_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_mark(chain, rule_number, value)
            elif op_type == "delete_rule_set_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set_mark(chain, rule_number)
            elif op_type == "set_rule_set_vlan_priority":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_vlan_priority(chain, rule_number, value)
            elif op_type == "delete_rule_set_vlan_priority":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set_vlan_priority(chain, rule_number)
            elif op_type == "delete_rule_set":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set(chain, rule_number)

            # Protocol (VyOS 1.5+ only)
            elif op_type == "set_rule_protocol":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_protocol(chain, rule_number, value)
            elif op_type == "delete_rule_protocol":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_protocol(chain, rule_number)

            # Source/Destination IP Address (VyOS 1.5+ only)
            elif op_type == "set_rule_source_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_address(chain, rule_number, value)
            elif op_type == "delete_rule_source_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_source_address(chain, rule_number)
            elif op_type == "set_rule_destination_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_address(chain, rule_number, value)
            elif op_type == "delete_rule_destination_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_destination_address(chain, rule_number)

            # Source/Destination Port (VyOS 1.5+ only)
            elif op_type == "set_rule_source_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_port(chain, rule_number, value)
            elif op_type == "delete_rule_source_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_source_port(chain, rule_number)
            elif op_type == "set_rule_destination_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_port(chain, rule_number, value)
            elif op_type == "delete_rule_destination_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_destination_port(chain, rule_number)

            # Source Groups (VyOS 1.5+ only)
            elif op_type == "set_rule_source_group_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_group_address(chain, rule_number, value)
            elif op_type == "set_rule_source_group_network":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_group_network(chain, rule_number, value)
            elif op_type == "set_rule_source_group_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_group_port(chain, rule_number, value)
            elif op_type == "set_rule_source_group_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_source_group_mac(chain, rule_number, value)

            # Destination Groups (VyOS 1.5+ only)
            elif op_type == "set_rule_destination_group_address":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_group_address(chain, rule_number, value)
            elif op_type == "set_rule_destination_group_network":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_group_network(chain, rule_number, value)
            elif op_type == "set_rule_destination_group_port":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_group_port(chain, rule_number, value)
            elif op_type == "set_rule_destination_group_mac":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_destination_group_mac(chain, rule_number, value)

            # ICMP (VyOS 1.5+ only)
            elif op_type == "set_rule_icmp_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmp_type(chain, rule_number, value)
            elif op_type == "set_rule_icmp_code":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmp_code(chain, rule_number, value)
            elif op_type == "set_rule_icmp_type_name":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmp_type_name(chain, rule_number, value)

            # ICMPv6 (VyOS 1.5+ only)
            elif op_type == "set_rule_icmpv6_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmpv6_type(chain, rule_number, value)
            elif op_type == "set_rule_icmpv6_code":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmpv6_code(chain, rule_number, value)
            elif op_type == "set_rule_icmpv6_type_name":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_icmpv6_type_name(chain, rule_number, value)

            # TCP Flags (VyOS 1.5+ only)
            elif op_type == "set_rule_tcp_flags":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_tcp_flags(chain, rule_number, value)
            elif op_type == "set_rule_tcp_flags_not":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_tcp_flags_not(chain, rule_number, value)
            elif op_type == "set_rule_tcp_mss":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_tcp_mss(chain, rule_number, value)

            # Rate Limiting (VyOS 1.5+ only)
            elif op_type == "set_rule_limit_rate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_limit_rate(chain, rule_number, value)
            elif op_type == "set_rule_limit_burst":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_limit_burst(chain, rule_number, value)
            elif op_type == "delete_rule_limit_rate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_limit(chain, rule_number)
            elif op_type == "delete_rule_limit_burst":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_limit(chain, rule_number)

            # Log Options (VyOS 1.5+ only)
            elif op_type == "set_rule_log_options_level":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_log_options_level(chain, rule_number, value)
            elif op_type == "set_rule_log_options_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_log_options_group(chain, rule_number, value)
            elif op_type == "delete_rule_log_options_level":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_log_options(chain, rule_number)
            elif op_type == "delete_rule_log_options_group":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_log_options(chain, rule_number)

            # Mark Matching (VyOS 1.5+ only)
            elif op_type == "set_rule_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_mark(chain, rule_number, value)
            elif op_type == "delete_rule_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_mark(chain, rule_number)
            elif op_type == "set_rule_connection_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_connection_mark(chain, rule_number, value)
            elif op_type == "delete_rule_connection_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_mark(chain, rule_number)

            # DSCP Matching (VyOS 1.5+ only)
            elif op_type == "set_rule_dscp":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_dscp(chain, rule_number, value)
            elif op_type == "delete_rule_dscp":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_mark(chain, rule_number)
            elif op_type == "set_rule_dscp_exclude":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_dscp_exclude(chain, rule_number, value)
            elif op_type == "delete_rule_dscp_exclude":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_mark(chain, rule_number)

            # Fragment Matching (VyOS 1.5+ only)
            elif op_type == "set_rule_fragment_match_frag":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_fragment_match_frag(chain, rule_number)
            elif op_type == "delete_rule_fragment_match_frag":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_fragment_match_frag(chain, rule_number)
            elif op_type == "set_rule_fragment_match_non_frag":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_fragment_match_non_frag(chain, rule_number)
            elif op_type == "delete_rule_fragment_match_non_frag":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_fragment_match_non_frag(chain, rule_number)

            # IPsec Matching (VyOS 1.5+ only)
            elif op_type == "set_rule_ipsec_match_ipsec_in":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_ipsec_in(chain, rule_number)
            elif op_type == "delete_rule_ipsec_match_ipsec_in":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_ipsec_in(chain, rule_number)
            elif op_type == "set_rule_ipsec_match_ipsec_out":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_ipsec_out(chain, rule_number)
            elif op_type == "delete_rule_ipsec_match_ipsec_out":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_ipsec_out(chain, rule_number)
            elif op_type == "set_rule_ipsec_match_none_in":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_none_in(chain, rule_number)
            elif op_type == "delete_rule_ipsec_match_none_in":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_none_in(chain, rule_number)
            elif op_type == "set_rule_ipsec_match_none_out":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_none_out(chain, rule_number)
            elif op_type == "delete_rule_ipsec_match_none_out":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ipsec_match_none_out(chain, rule_number)

            # TTL/Hop-Limit Matching (VyOS 1.5+ only)
            elif op_type == "set_rule_ttl_eq":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_ttl_eq(chain, rule_number, value)
            elif op_type == "delete_rule_ttl_eq":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ttl_eq(chain, rule_number, "0")
            elif op_type == "set_rule_ttl_gt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_ttl_gt(chain, rule_number, value)
            elif op_type == "delete_rule_ttl_gt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ttl_gt(chain, rule_number, "0")
            elif op_type == "set_rule_ttl_lt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_ttl_lt(chain, rule_number, value)
            elif op_type == "delete_rule_ttl_lt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_ttl_lt(chain, rule_number, "0")
            elif op_type == "set_rule_hop_limit_eq":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_hop_limit_eq(chain, rule_number, value)
            elif op_type == "delete_rule_hop_limit_eq":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_hop_limit_eq(chain, rule_number, "0")
            elif op_type == "set_rule_hop_limit_gt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_hop_limit_gt(chain, rule_number, value)
            elif op_type == "delete_rule_hop_limit_gt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_hop_limit_gt(chain, rule_number, "0")
            elif op_type == "set_rule_hop_limit_lt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_hop_limit_lt(chain, rule_number, value)
            elif op_type == "delete_rule_hop_limit_lt":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_hop_limit_lt(chain, rule_number, "0")

            # Packet Type (VyOS 1.5+ only)
            elif op_type == "set_rule_packet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_packet_type(chain, rule_number, value)
            elif op_type == "delete_rule_packet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_packet_type(chain, rule_number, "")
            elif op_type == "set_rule_packet_length":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_packet_length(chain, rule_number, value)
            elif op_type == "delete_rule_packet_length":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_packet_length(chain, rule_number, "")

            # Time-based Rules (VyOS 1.5+ only)
            elif op_type == "set_rule_time_startdate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_time_startdate(chain, rule_number, value)
            elif op_type == "delete_rule_time_startdate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_time(chain, rule_number)
            elif op_type == "set_rule_time_stopdate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_time_stopdate(chain, rule_number, value)
            elif op_type == "delete_rule_time_stopdate":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_time(chain, rule_number)
            elif op_type == "set_rule_time_starttime":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_time_starttime(chain, rule_number, value)
            elif op_type == "delete_rule_time_starttime":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_time(chain, rule_number)
            elif op_type == "set_rule_time_stoptime":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_time_stoptime(chain, rule_number, value)
            elif op_type == "delete_rule_time_stoptime":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_time(chain, rule_number)
            elif op_type == "set_rule_time_weekdays":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_time_weekdays(chain, rule_number, value)
            elif op_type == "delete_rule_time_weekdays":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_time(chain, rule_number)

            # Queue Action (VyOS 1.5+ only)
            elif op_type == "set_rule_queue":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_queue(chain, rule_number, value)
            elif op_type == "delete_rule_queue":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_queue(chain, rule_number, "")

            # VLAN Ethernet Type (VyOS 1.5+ only)
            elif op_type == "set_rule_vlan_ethernet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_vlan_ethernet_type(chain, rule_number, value)
            elif op_type == "delete_rule_vlan_ethernet_type":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.set_rule_vlan_ethernet_type(chain, rule_number, "")

            # Additional Set operations (VyOS 1.5+ only)
            elif op_type == "set_rule_set_connection_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_connection_mark(chain, rule_number, value)
            elif op_type == "delete_rule_set_connection_mark":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set(chain, rule_number)
            elif op_type == "set_rule_set_ttl":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_ttl(chain, rule_number, value)
            elif op_type == "delete_rule_set_ttl":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set(chain, rule_number)
            elif op_type == "set_rule_set_hop_limit":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_hop_limit(chain, rule_number, value)
            elif op_type == "delete_rule_set_hop_limit":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set(chain, rule_number)
            elif op_type == "set_rule_set_tcp_mss":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_rule_set_tcp_mss(chain, rule_number, value)
            elif op_type == "delete_rule_set_tcp_mss":
                if rule_number is None:
                    raise HTTPException(status_code=400, detail="rule_number required for rule operations")
                batch.delete_rule_set(chain, rule_number)

            # Custom chain operations (VyOS 1.5+ only)
            elif op_type == "set_custom_chain":
                batch.set_custom_chain(chain)
            elif op_type == "delete_custom_chain":
                batch.delete_custom_chain(chain)
            elif op_type == "set_custom_chain_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_custom_chain_description(chain, value)
            elif op_type == "delete_custom_chain_description":
                batch.delete_custom_chain_description(chain)
            elif op_type == "set_custom_chain_default_action":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_custom_chain_default_action(chain, value)
            elif op_type == "delete_custom_chain_default_action":
                batch.delete_custom_chain_default_action(chain)

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # Execute the batch
        response = service.execute_batch(batch)

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
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

            # VyOS 1.5+ features
            if rule.ethernet_type:
                batch.set_rule_ethernet_type(chain, new_number, rule.ethernet_type)

            if rule.jump_target:
                batch.set_rule_jump_target(chain, new_number, rule.jump_target)

            if rule.set_dscp:
                batch.set_rule_set_dscp(chain, new_number, rule.set_dscp)

            if rule.set_mark:
                batch.set_rule_set_mark(chain, new_number, rule.set_mark)

            if rule.set_vlan_priority:
                batch.set_rule_set_vlan_priority(chain, new_number, rule.set_vlan_priority)

        # Execute the batch
        response = service.execute_batch(batch)

        return VyOSResponse(
            success=response.status == 200,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
