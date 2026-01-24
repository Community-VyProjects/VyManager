"""
Bridge Firewall Batch Builder

Provides batch operations for bridge (layer 2) firewall configuration.
Version-aware for VyOS 1.4 and 1.5 differences.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BridgeFirewallBatchBuilder:
    """Batch builder for bridge firewall operations"""

    def __init__(self, version: str):
        """Initialize bridge firewall batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get bridge firewall mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_bridge"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BridgeFirewallBatchBuilder":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BridgeFirewallBatchBuilder":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Chain Operations
    # ========================================================================

    def set_chain(self, chain: str) -> "BridgeFirewallBatchBuilder":
        """Create a chain."""
        path = self.mappers[self.mapper_key].get_chain_path(chain)
        return self.add_set(path)

    def delete_chain(self, chain: str) -> "BridgeFirewallBatchBuilder":
        """Delete a chain."""
        path = self.mappers[self.mapper_key].get_chain_path(chain)
        return self.add_delete(path)

    def set_chain_default_action(self, chain: str, action: str) -> "BridgeFirewallBatchBuilder":
        """Set default action for a chain."""
        path = self.mappers[self.mapper_key].get_chain_default_action(chain, action)
        return self.add_set(path)

    def delete_chain_default_action(self, chain: str) -> "BridgeFirewallBatchBuilder":
        """Delete default action for a chain."""
        path = self.mappers[self.mapper_key].get_chain_default_action_path(chain)
        return self.add_delete(path)

    def set_chain_description(self, chain: str, description: str) -> "BridgeFirewallBatchBuilder":
        """Set description for a chain."""
        path = self.mappers[self.mapper_key].get_chain_description(chain, description)
        return self.add_set(path)

    def delete_chain_description(self, chain: str) -> "BridgeFirewallBatchBuilder":
        """Delete description for a chain."""
        path = self.mappers[self.mapper_key].get_chain_description_path(chain)
        return self.add_delete(path)

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def set_rule(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Create a rule."""
        path = self.mappers[self.mapper_key].get_rule_path(chain, rule_number)
        return self.add_set(path)

    def delete_rule(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete a rule."""
        path = self.mappers[self.mapper_key].get_rule_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_action(self, chain: str, rule_number: int, action: str) -> "BridgeFirewallBatchBuilder":
        """Set rule action."""
        path = self.mappers[self.mapper_key].get_rule_action(chain, rule_number, action)
        return self.add_set(path)

    def delete_rule_action(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete rule action."""
        path = self.mappers[self.mapper_key].get_rule_action_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_description(self, chain: str, rule_number: int, description: str) -> "BridgeFirewallBatchBuilder":
        """Set rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(chain, rule_number, description)
        return self.add_set(path)

    def delete_rule_description(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete rule description."""
        path = self.mappers[self.mapper_key].get_rule_description_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_disable(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Disable a rule."""
        path = self.mappers[self.mapper_key].get_rule_disable(chain, rule_number)
        return self.add_set(path)

    def delete_rule_disable(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Enable a rule (remove disable)."""
        path = self.mappers[self.mapper_key].get_rule_disable_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_log(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Enable logging for a rule."""
        path = self.mappers[self.mapper_key].get_rule_log(chain, rule_number)
        return self.add_set(path)

    def delete_rule_log(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Disable logging for a rule."""
        path = self.mappers[self.mapper_key].get_rule_log_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Source MAC
    # ========================================================================

    def set_rule_source_mac(self, chain: str, rule_number: int, mac: str) -> "BridgeFirewallBatchBuilder":
        """Set source MAC address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_source_mac(chain, rule_number, mac)
        return self.add_set(path)

    def delete_rule_source_mac(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete source MAC address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_source_mac_path(chain, rule_number)
        return self.add_delete(path)

    def delete_rule_source(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete entire source node for a rule."""
        path = self.mappers[self.mapper_key].get_rule_source_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Destination MAC
    # ========================================================================

    def set_rule_destination_mac(self, chain: str, rule_number: int, mac: str) -> "BridgeFirewallBatchBuilder":
        """Set destination MAC address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_destination_mac(chain, rule_number, mac)
        return self.add_set(path)

    def delete_rule_destination_mac(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete destination MAC address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_destination_mac_path(chain, rule_number)
        return self.add_delete(path)

    def delete_rule_destination(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete entire destination node for a rule."""
        path = self.mappers[self.mapper_key].get_rule_destination_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule VLAN
    # ========================================================================

    def set_rule_vlan_id(self, chain: str, rule_number: int, vlan_id: str) -> "BridgeFirewallBatchBuilder":
        """Set VLAN ID for a rule."""
        path = self.mappers[self.mapper_key].get_rule_vlan_id(chain, rule_number, vlan_id)
        return self.add_set(path)

    def delete_rule_vlan_id(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete VLAN ID for a rule."""
        path = self.mappers[self.mapper_key].get_rule_vlan_id_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_vlan_priority(self, chain: str, rule_number: int, priority: str) -> "BridgeFirewallBatchBuilder":
        """Set VLAN priority for a rule."""
        path = self.mappers[self.mapper_key].get_rule_vlan_priority(chain, rule_number, priority)
        return self.add_set(path)

    def delete_rule_vlan_priority(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete VLAN priority for a rule."""
        path = self.mappers[self.mapper_key].get_rule_vlan_priority_path(chain, rule_number)
        return self.add_delete(path)

    def delete_rule_vlan(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete entire VLAN node for a rule."""
        path = self.mappers[self.mapper_key].get_rule_vlan_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Interface
    # ========================================================================

    def set_rule_inbound_interface(self, chain: str, rule_number: int, interface: str) -> "BridgeFirewallBatchBuilder":
        """Set inbound interface for a rule."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface(chain, rule_number, interface)
        return self.add_set(path)

    def delete_rule_inbound_interface(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete inbound interface for a rule."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_inbound_interface_group(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set inbound interface group for a rule."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_group(chain, rule_number, group)
        return self.add_set(path)

    def delete_rule_inbound_interface_group(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete inbound interface group for a rule."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_group_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_outbound_interface(self, chain: str, rule_number: int, interface: str) -> "BridgeFirewallBatchBuilder":
        """Set outbound interface for a rule."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface(chain, rule_number, interface)
        return self.add_set(path)

    def delete_rule_outbound_interface(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete outbound interface for a rule."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_outbound_interface_group(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set outbound interface group for a rule."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_group(chain, rule_number, group)
        return self.add_set(path)

    def delete_rule_outbound_interface_group(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete outbound interface group for a rule."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_group_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> "BridgeFirewallBatchBuilder":
        """Set ethernet type for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ethernet_type(chain, rule_number, eth_type)
        return self.add_set(path)

    def delete_rule_ethernet_type(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete ethernet type for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ethernet_type_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Jump Target
    # ========================================================================

    def set_rule_jump_target(self, chain: str, rule_number: int, target: str) -> "BridgeFirewallBatchBuilder":
        """Set jump target for a rule."""
        path = self.mappers[self.mapper_key].get_rule_jump_target(chain, rule_number, target)
        return self.add_set(path)

    def delete_rule_jump_target(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete jump target for a rule."""
        path = self.mappers[self.mapper_key].get_rule_jump_target_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Set Options (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_set_dscp(self, chain: str, rule_number: int, dscp: str) -> "BridgeFirewallBatchBuilder":
        """Set DSCP value for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_dscp(chain, rule_number, dscp)
        return self.add_set(path)

    def delete_rule_set_dscp(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete DSCP value for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_dscp_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_set_mark(self, chain: str, rule_number: int, mark: str) -> "BridgeFirewallBatchBuilder":
        """Set packet mark for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_mark(chain, rule_number, mark)
        return self.add_set(path)

    def delete_rule_set_mark(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete packet mark for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_mark_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_set_vlan_priority(self, chain: str, rule_number: int, priority: str) -> "BridgeFirewallBatchBuilder":
        """Set VLAN priority modification for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_vlan_priority(chain, rule_number, priority)
        return self.add_set(path)

    def delete_rule_set_vlan_priority(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete VLAN priority modification for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_vlan_priority_path(chain, rule_number)
        return self.add_delete(path)

    def delete_rule_set(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete entire set node for a rule."""
        path = self.mappers[self.mapper_key].get_rule_set_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_set_connection_mark(self, chain: str, rule_number: int, mark: str) -> "BridgeFirewallBatchBuilder":
        """Set connection mark for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_connection_mark(chain, rule_number, mark)
        return self.add_set(path)

    def set_rule_set_ttl(self, chain: str, rule_number: int, ttl: str) -> "BridgeFirewallBatchBuilder":
        """Set TTL for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_ttl(chain, rule_number, ttl)
        return self.add_set(path)

    def set_rule_set_hop_limit(self, chain: str, rule_number: int, hop_limit: str) -> "BridgeFirewallBatchBuilder":
        """Set hop-limit for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_hop_limit(chain, rule_number, hop_limit)
        return self.add_set(path)

    def set_rule_set_tcp_mss(self, chain: str, rule_number: int, mss: str) -> "BridgeFirewallBatchBuilder":
        """Set TCP MSS for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_set_tcp_mss(chain, rule_number, mss)
        return self.add_set(path)

    # ========================================================================
    # Rule Protocol (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_protocol(self, chain: str, rule_number: int, protocol: str) -> "BridgeFirewallBatchBuilder":
        """Set protocol for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_protocol(chain, rule_number, protocol)
        return self.add_set(path)

    def delete_rule_protocol(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete protocol for a rule."""
        path = self.mappers[self.mapper_key].get_rule_protocol_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Source/Destination IP Address and Port (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_source_address(self, chain: str, rule_number: int, address: str) -> "BridgeFirewallBatchBuilder":
        """Set source IP address for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_address(chain, rule_number, address)
        return self.add_set(path)

    def delete_rule_source_address(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete source IP address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_source_address_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_source_port(self, chain: str, rule_number: int, port: str) -> "BridgeFirewallBatchBuilder":
        """Set source port for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_port(chain, rule_number, port)
        return self.add_set(path)

    def delete_rule_source_port(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete source port for a rule."""
        path = self.mappers[self.mapper_key].get_rule_source_port_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_destination_address(self, chain: str, rule_number: int, address: str) -> "BridgeFirewallBatchBuilder":
        """Set destination IP address for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_address(chain, rule_number, address)
        return self.add_set(path)

    def delete_rule_destination_address(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete destination IP address for a rule."""
        path = self.mappers[self.mapper_key].get_rule_destination_address_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_destination_port(self, chain: str, rule_number: int, port: str) -> "BridgeFirewallBatchBuilder":
        """Set destination port for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_port(chain, rule_number, port)
        return self.add_set(path)

    def delete_rule_destination_port(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete destination port for a rule."""
        path = self.mappers[self.mapper_key].get_rule_destination_port_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Source/Destination Groups (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_source_group_address(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set source address group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_address(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_source_group_network(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set source network group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_network(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_source_group_port(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set source port group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_port(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_source_group_mac(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set source MAC group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_mac(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_destination_group_address(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set destination address group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_address(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_destination_group_network(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set destination network group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_network(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_destination_group_port(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set destination port group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_port(chain, rule_number, group)
        return self.add_set(path)

    def set_rule_destination_group_mac(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set destination MAC group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_mac(chain, rule_number, group)
        return self.add_set(path)

    # ========================================================================
    # Rule ICMP/ICMPv6 (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_icmp_type(self, chain: str, rule_number: int, icmp_type: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMP type for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmp_type(chain, rule_number, icmp_type)
        return self.add_set(path)

    def set_rule_icmp_code(self, chain: str, rule_number: int, code: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMP code for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmp_code(chain, rule_number, code)
        return self.add_set(path)

    def set_rule_icmp_type_name(self, chain: str, rule_number: int, type_name: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMP type-name for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmp_type_name(chain, rule_number, type_name)
        return self.add_set(path)

    def set_rule_icmpv6_type(self, chain: str, rule_number: int, icmp_type: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMPv6 type for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type(chain, rule_number, icmp_type)
        return self.add_set(path)

    def set_rule_icmpv6_code(self, chain: str, rule_number: int, code: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMPv6 code for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_code(chain, rule_number, code)
        return self.add_set(path)

    def set_rule_icmpv6_type_name(self, chain: str, rule_number: int, type_name: str) -> "BridgeFirewallBatchBuilder":
        """Set ICMPv6 type-name for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type_name(chain, rule_number, type_name)
        return self.add_set(path)

    # ========================================================================
    # Rule TCP Flags (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_tcp_flags(self, chain: str, rule_number: int, flag: str) -> "BridgeFirewallBatchBuilder":
        """Set TCP flag for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_tcp_flags(chain, rule_number, flag)
        return self.add_set(path)

    def set_rule_tcp_flags_not(self, chain: str, rule_number: int, flag: str) -> "BridgeFirewallBatchBuilder":
        """Set TCP flag negation for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_tcp_flags_not(chain, rule_number, flag)
        return self.add_set(path)

    def set_rule_tcp_mss(self, chain: str, rule_number: int, mss: str) -> "BridgeFirewallBatchBuilder":
        """Set TCP MSS matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_tcp_mss(chain, rule_number, mss)
        return self.add_set(path)

    # ========================================================================
    # Rule Rate Limiting (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_limit_rate(self, chain: str, rule_number: int, rate: str) -> "BridgeFirewallBatchBuilder":
        """Set rate limit for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_limit_rate(chain, rule_number, rate)
        return self.add_set(path)

    def set_rule_limit_burst(self, chain: str, rule_number: int, burst: str) -> "BridgeFirewallBatchBuilder":
        """Set rate limit burst for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_limit_burst(chain, rule_number, burst)
        return self.add_set(path)

    def delete_rule_limit(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete limit for a rule."""
        path = self.mappers[self.mapper_key].get_rule_limit_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Log Options (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_log_options_level(self, chain: str, rule_number: int, level: str) -> "BridgeFirewallBatchBuilder":
        """Set log level for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_log_options_level(chain, rule_number, level)
        return self.add_set(path)

    def set_rule_log_options_group(self, chain: str, rule_number: int, group: str) -> "BridgeFirewallBatchBuilder":
        """Set log group for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_log_options_group(chain, rule_number, group)
        return self.add_set(path)

    def delete_rule_log_options(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete log options for a rule."""
        path = self.mappers[self.mapper_key].get_rule_log_options_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Mark Matching (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_mark(self, chain: str, rule_number: int, mark: str) -> "BridgeFirewallBatchBuilder":
        """Set firewall mark matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_mark(chain, rule_number, mark)
        return self.add_set(path)

    def delete_rule_mark(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete mark matching for a rule."""
        path = self.mappers[self.mapper_key].get_rule_mark_path(chain, rule_number)
        return self.add_delete(path)

    def set_rule_connection_mark(self, chain: str, rule_number: int, mark: str) -> "BridgeFirewallBatchBuilder":
        """Set connection mark matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_connection_mark(chain, rule_number, mark)
        return self.add_set(path)

    # ========================================================================
    # Rule DSCP Matching (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_dscp(self, chain: str, rule_number: int, dscp: str) -> "BridgeFirewallBatchBuilder":
        """Set DSCP matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_dscp(chain, rule_number, dscp)
        return self.add_set(path)

    def set_rule_dscp_exclude(self, chain: str, rule_number: int, dscp: str) -> "BridgeFirewallBatchBuilder":
        """Set DSCP exclusion matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_dscp_exclude(chain, rule_number, dscp)
        return self.add_set(path)

    # ========================================================================
    # Rule Fragment Matching (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_fragment_match_frag(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set fragment matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_frag(chain, rule_number)
        return self.add_set(path)

    def set_rule_fragment_match_non_frag(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set non-fragment matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_non_frag(chain, rule_number)
        return self.add_set(path)

    # ========================================================================
    # Rule IPsec Matching (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set IPsec inbound matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_in(chain, rule_number)
        return self.add_set(path)

    def set_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set IPsec outbound matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_out(chain, rule_number)
        return self.add_set(path)

    def set_rule_ipsec_match_none_in(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set non-IPsec inbound matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_in(chain, rule_number)
        return self.add_set(path)

    def set_rule_ipsec_match_none_out(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Set non-IPsec outbound matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_out(chain, rule_number)
        return self.add_set(path)

    # ========================================================================
    # Rule TTL/Hop-Limit Matching (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_ttl_eq(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set TTL equal matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ttl_eq(chain, rule_number, value)
        return self.add_set(path)

    def set_rule_ttl_gt(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set TTL greater-than matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ttl_gt(chain, rule_number, value)
        return self.add_set(path)

    def set_rule_ttl_lt(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set TTL less-than matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ttl_lt(chain, rule_number, value)
        return self.add_set(path)

    def set_rule_hop_limit_eq(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set hop-limit equal matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_eq(chain, rule_number, value)
        return self.add_set(path)

    def set_rule_hop_limit_gt(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set hop-limit greater-than matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_gt(chain, rule_number, value)
        return self.add_set(path)

    def set_rule_hop_limit_lt(self, chain: str, rule_number: int, value: str) -> "BridgeFirewallBatchBuilder":
        """Set hop-limit less-than matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_lt(chain, rule_number, value)
        return self.add_set(path)

    # ========================================================================
    # Rule Packet Type (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_packet_type(self, chain: str, rule_number: int, pkt_type: str) -> "BridgeFirewallBatchBuilder":
        """Set packet type matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_packet_type(chain, rule_number, pkt_type)
        return self.add_set(path)

    def set_rule_packet_length(self, chain: str, rule_number: int, length: str) -> "BridgeFirewallBatchBuilder":
        """Set packet length matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_packet_length(chain, rule_number, length)
        return self.add_set(path)

    # ========================================================================
    # Rule Time-based (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_time_startdate(self, chain: str, rule_number: int, date: str) -> "BridgeFirewallBatchBuilder":
        """Set time start date for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_time_startdate(chain, rule_number, date)
        return self.add_set(path)

    def set_rule_time_stopdate(self, chain: str, rule_number: int, date: str) -> "BridgeFirewallBatchBuilder":
        """Set time stop date for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_time_stopdate(chain, rule_number, date)
        return self.add_set(path)

    def set_rule_time_starttime(self, chain: str, rule_number: int, time: str) -> "BridgeFirewallBatchBuilder":
        """Set time start time for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_time_starttime(chain, rule_number, time)
        return self.add_set(path)

    def set_rule_time_stoptime(self, chain: str, rule_number: int, time: str) -> "BridgeFirewallBatchBuilder":
        """Set time stop time for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_time_stoptime(chain, rule_number, time)
        return self.add_set(path)

    def set_rule_time_weekdays(self, chain: str, rule_number: int, weekdays: str) -> "BridgeFirewallBatchBuilder":
        """Set time weekdays for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_time_weekdays(chain, rule_number, weekdays)
        return self.add_set(path)

    def delete_rule_time(self, chain: str, rule_number: int) -> "BridgeFirewallBatchBuilder":
        """Delete time for a rule."""
        path = self.mappers[self.mapper_key].get_rule_time_path(chain, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Queue Action (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_queue(self, chain: str, rule_number: int, queue: str) -> "BridgeFirewallBatchBuilder":
        """Set queue target for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_queue(chain, rule_number, queue)
        return self.add_set(path)

    # ========================================================================
    # Rule VLAN Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_vlan_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> "BridgeFirewallBatchBuilder":
        """Set VLAN ethernet type matching for a rule (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_vlan_ethernet_type(chain, rule_number, eth_type)
        return self.add_set(path)

    # ========================================================================
    # Custom Chain Operations (VyOS 1.5+ only)
    # ========================================================================

    def set_custom_chain(self, chain_name: str) -> "BridgeFirewallBatchBuilder":
        """Create a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain(chain_name)
        return self.add_set(path)

    def delete_custom_chain(self, chain_name: str) -> "BridgeFirewallBatchBuilder":
        """Delete a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_description(self, chain_name: str, description: str) -> "BridgeFirewallBatchBuilder":
        """Set description for a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain_description(chain_name, description)
        return self.add_set(path)

    def delete_custom_chain_description(self, chain_name: str) -> "BridgeFirewallBatchBuilder":
        """Delete description for a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain_description_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_default_action(self, chain_name: str, action: str) -> "BridgeFirewallBatchBuilder":
        """Set default action for a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_action(chain_name, action)
        return self.add_set(path)

    def delete_custom_chain_default_action(self, chain_name: str) -> "BridgeFirewallBatchBuilder":
        """Delete default action for a custom chain (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_action_path(chain_name)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get capabilities for the current VyOS version.

        Returns:
            Dictionary of supported features and operations
        """
        is_v15 = "1.5" in self.version

        # Supported chains differ by version
        supported_chains = ["forward"]
        if is_v15:
            supported_chains = ["forward", "input", "output", "prerouting"]

        # Actions supported
        base_actions = ["accept", "drop"]
        if is_v15:
            base_actions.extend(["continue", "jump", "return", "queue", "notrack"])

        capabilities = {
            "version": self.version,
            "features": {
                "bridge_firewall": {
                    "supported": True,
                    "description": "Layer 2 bridge firewall"
                },
                "forward_chain": {
                    "supported": True,
                    "description": "Forward chain filtering"
                },
                "input_chain": {
                    "supported": is_v15,
                    "description": "Input chain (VyOS 1.5+)"
                },
                "output_chain": {
                    "supported": is_v15,
                    "description": "Output chain (VyOS 1.5+)"
                },
                "prerouting_chain": {
                    "supported": is_v15,
                    "description": "Prerouting chain (VyOS 1.5+)"
                },
                "custom_chains": {
                    "supported": True,
                    "description": "Custom named chains"
                },
                "ethernet_type_matching": {
                    "supported": is_v15,
                    "description": "Match by ethernet type (VyOS 1.5+)"
                },
                "packet_modifications": {
                    "supported": is_v15,
                    "description": "DSCP, mark, TTL, hop-limit, TCP MSS, VLAN priority modifications (VyOS 1.5+)"
                },
                "notrack_action": {
                    "supported": is_v15,
                    "description": "notrack action for connection tracking bypass (VyOS 1.5+)"
                },
                "protocol_matching": {
                    "supported": is_v15,
                    "description": "Match by protocol (tcp, udp, icmp, etc.) (VyOS 1.5+)"
                },
                "ip_matching": {
                    "supported": is_v15,
                    "description": "Match by source/destination IP address (VyOS 1.5+)"
                },
                "port_matching": {
                    "supported": is_v15,
                    "description": "Match by source/destination port (VyOS 1.5+)"
                },
                "firewall_groups": {
                    "supported": is_v15,
                    "description": "Match by firewall groups (address, network, port, MAC) (VyOS 1.5+)"
                },
                "icmp_matching": {
                    "supported": is_v15,
                    "description": "Match by ICMP/ICMPv6 type and code (VyOS 1.5+)"
                },
                "tcp_flags": {
                    "supported": is_v15,
                    "description": "Match by TCP flags (syn, ack, rst, etc.) (VyOS 1.5+)"
                },
                "rate_limiting": {
                    "supported": is_v15,
                    "description": "Rate limiting rules (VyOS 1.5+)"
                },
                "time_based": {
                    "supported": is_v15,
                    "description": "Time-based rules (VyOS 1.5+)"
                },
                "mark_matching": {
                    "supported": is_v15,
                    "description": "Match by firewall mark (VyOS 1.5+)"
                },
                "dscp_matching": {
                    "supported": is_v15,
                    "description": "Match by DSCP value (VyOS 1.5+)"
                },
                "fragment_matching": {
                    "supported": is_v15,
                    "description": "Match fragmented packets (VyOS 1.5+)"
                },
                "ipsec_matching": {
                    "supported": is_v15,
                    "description": "Match IPsec encapsulated packets (VyOS 1.5+)"
                },
                "ttl_matching": {
                    "supported": is_v15,
                    "description": "Match by TTL/hop-limit (VyOS 1.5+)"
                },
                "packet_type": {
                    "supported": is_v15,
                    "description": "Match by packet type (broadcast, multicast, etc.) (VyOS 1.5+)"
                },
                "log_options": {
                    "supported": is_v15,
                    "description": "Advanced logging options (VyOS 1.5+)"
                }
            },
            "supported_chains": supported_chains,
            "supported_actions": base_actions,
            "matching_criteria": {
                "source_mac": {
                    "supported": True,
                    "description": "Match by source MAC address"
                },
                "destination_mac": {
                    "supported": True,
                    "description": "Match by destination MAC address"
                },
                "vlan_id": {
                    "supported": True,
                    "description": "Match by VLAN ID"
                },
                "vlan_priority": {
                    "supported": True,
                    "description": "Match by VLAN priority (0-7)"
                },
                "inbound_interface": {
                    "supported": True,
                    "description": "Match by inbound interface"
                },
                "outbound_interface": {
                    "supported": True,
                    "description": "Match by outbound interface"
                },
                "ethernet_type": {
                    "supported": is_v15,
                    "description": "Match by ethernet type (VyOS 1.5+)"
                },
                "protocol": {
                    "supported": is_v15,
                    "description": "Match by protocol (VyOS 1.5+)"
                },
                "source_address": {
                    "supported": is_v15,
                    "description": "Match by source IP address (VyOS 1.5+)"
                },
                "destination_address": {
                    "supported": is_v15,
                    "description": "Match by destination IP address (VyOS 1.5+)"
                },
                "source_port": {
                    "supported": is_v15,
                    "description": "Match by source port (VyOS 1.5+)"
                },
                "destination_port": {
                    "supported": is_v15,
                    "description": "Match by destination port (VyOS 1.5+)"
                },
                "icmp": {
                    "supported": is_v15,
                    "description": "Match by ICMP type/code (VyOS 1.5+)"
                },
                "tcp_flags": {
                    "supported": is_v15,
                    "description": "Match by TCP flags (VyOS 1.5+)"
                },
                "limit": {
                    "supported": is_v15,
                    "description": "Rate limiting (VyOS 1.5+)"
                },
                "time": {
                    "supported": is_v15,
                    "description": "Time-based matching (VyOS 1.5+)"
                }
            },
            "version_notes": {
                "full_support": is_v15,
                "v14_limitations": [] if is_v15 else [
                    "Only forward chain supported",
                    "No ethernet-type matching",
                    "No protocol/IP/port matching",
                    "No packet modifications (dscp, mark, vlan-priority)",
                    "No ICMP/ICMPv6 matching",
                    "No TCP flags matching",
                    "No rate limiting",
                    "No time-based rules"
                ]
            }
        }

        return capabilities


__all__ = ["BridgeFirewallBatchBuilder"]
