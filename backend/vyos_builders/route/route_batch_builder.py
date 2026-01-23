"""
Route Policy Batch Builder

Provides all batch operations for policy route and route6 configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RouteBatchBuilder:
    """Complete batch builder for route policy operations."""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "route"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RouteBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RouteBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
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
    # Policy Management
    # ========================================================================

    def create_policy(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        """Create a new policy (route or route6)."""
        path = self.mappers[self.mapper_key].get_policy_path(policy_type, name)
        return self.add_set(path)

    def delete_policy(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        """Delete entire policy."""
        path = self.mappers[self.mapper_key].get_delete_policy(policy_type, name)
        return self.add_delete(path)

    def set_policy_description(self, policy_type: str, name: str, description: str) -> "RouteBatchBuilder":
        """Set policy description."""
        path = self.mappers[self.mapper_key].get_policy_description(policy_type, name, description)
        return self.add_set(path)

    def set_policy_default_log(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        """Enable default logging."""
        path = self.mappers[self.mapper_key].get_policy_default_log(policy_type, name)
        return self.add_set(path)

    def delete_policy_default_log(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        """Disable default logging."""
        path = self.mappers[self.mapper_key].get_policy_default_log(policy_type, name)
        return self.add_delete(path)

    # ========================================================================
    # Rule Management
    # ========================================================================

    def create_rule(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Create a new rule."""
        path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule)
        return self.add_set(path)

    def delete_rule(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete a rule."""
        path = self.mappers[self.mapper_key].get_delete_rule(policy_type, name, rule)
        return self.add_delete(path)

    def set_rule_description(self, policy_type: str, name: str, rule: str, description: str) -> "RouteBatchBuilder":
        """Set rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(policy_type, name, rule, description)
        return self.add_set(path)

    def delete_rule_description(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete rule description."""
        path = self.mappers[self.mapper_key].get_delete_rule_description(policy_type, name, rule)
        return self.add_delete(path)

    def set_rule_disable(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Disable rule."""
        path = self.mappers[self.mapper_key].get_rule_disable(policy_type, name, rule)
        return self.add_set(path)

    def delete_rule_disable(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Enable rule."""
        path = self.mappers[self.mapper_key].get_rule_disable(policy_type, name, rule)
        return self.add_delete(path)

    def set_rule_log(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        """Set rule logging."""
        path = self.mappers[self.mapper_key].get_rule_log(policy_type, name, rule, value)
        return self.add_set(path)

    # ========================================================================
    # Match - Address
    # ========================================================================

    def set_match_source_address(self, policy_type: str, name: str, rule: str, address: str) -> "RouteBatchBuilder":
        """Match source address."""
        path = self.mappers[self.mapper_key].get_match_source_address(policy_type, name, rule, address)
        return self.add_set(path)

    def set_match_destination_address(self, policy_type: str, name: str, rule: str, address: str) -> "RouteBatchBuilder":
        """Match destination address."""
        path = self.mappers[self.mapper_key].get_match_destination_address(policy_type, name, rule, address)
        return self.add_set(path)

    def set_match_source_mac_address(self, policy_type: str, name: str, rule: str, mac: str) -> "RouteBatchBuilder":
        """Match source MAC address."""
        path = self.mappers[self.mapper_key].get_match_source_mac_address(policy_type, name, rule, mac)
        return self.add_set(path)

    def set_match_destination_mac_address(self, policy_type: str, name: str, rule: str, mac: str) -> "RouteBatchBuilder":
        """Match destination MAC address."""
        path = self.mappers[self.mapper_key].get_match_destination_mac_address(policy_type, name, rule, mac)
        return self.add_set(path)

    # ========================================================================
    # Match - Groups
    # ========================================================================

    def set_match_source_group_address(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match source address-group."""
        path = self.mappers[self.mapper_key].get_match_source_group_address(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_source_group_domain(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match source domain-group."""
        path = self.mappers[self.mapper_key].get_match_source_group_domain(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_source_group_mac(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match source mac-group."""
        path = self.mappers[self.mapper_key].get_match_source_group_mac(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_source_group_network(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match source network-group."""
        path = self.mappers[self.mapper_key].get_match_source_group_network(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_source_group_port(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match source port-group."""
        path = self.mappers[self.mapper_key].get_match_source_group_port(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_destination_group_address(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match destination address-group."""
        path = self.mappers[self.mapper_key].get_match_destination_group_address(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_destination_group_domain(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match destination domain-group."""
        path = self.mappers[self.mapper_key].get_match_destination_group_domain(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_destination_group_mac(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match destination mac-group."""
        path = self.mappers[self.mapper_key].get_match_destination_group_mac(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_destination_group_network(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match destination network-group."""
        path = self.mappers[self.mapper_key].get_match_destination_group_network(policy_type, name, rule, group)
        return self.add_set(path)

    def set_match_destination_group_port(self, policy_type: str, name: str, rule: str, group: str) -> "RouteBatchBuilder":
        """Match destination port-group."""
        path = self.mappers[self.mapper_key].get_match_destination_group_port(policy_type, name, rule, group)
        return self.add_set(path)

    # ========================================================================
    # Match - Port
    # ========================================================================

    def set_match_destination_port(self, policy_type: str, name: str, rule: str, port: str) -> "RouteBatchBuilder":
        """Match destination port."""
        path = self.mappers[self.mapper_key].get_match_destination_port(policy_type, name, rule, port)
        return self.add_set(path)

    def set_match_source_port(self, policy_type: str, name: str, rule: str, port: str) -> "RouteBatchBuilder":
        """Match source port."""
        path = self.mappers[self.mapper_key].get_match_source_port(policy_type, name, rule, port)
        return self.add_set(path)

    # ========================================================================
    # Match - Protocol
    # ========================================================================

    def set_match_protocol(self, policy_type: str, name: str, rule: str, protocol: str) -> "RouteBatchBuilder":
        """Match protocol."""
        path = self.mappers[self.mapper_key].get_match_protocol(policy_type, name, rule, protocol)
        return self.add_set(path)

    def set_match_tcp_flags(self, policy_type: str, name: str, rule: str, flags: str) -> "RouteBatchBuilder":
        """Match TCP flags."""
        path = self.mappers[self.mapper_key].get_match_tcp_flags(policy_type, name, rule, flags)
        return self.add_set(path)

    # ========================================================================
    # Match - ICMP (IPv4)
    # ========================================================================

    def set_match_icmp_code(self, policy_type: str, name: str, rule: str, code: str) -> "RouteBatchBuilder":
        """Match ICMP code."""
        path = self.mappers[self.mapper_key].get_match_icmp_code(policy_type, name, rule, code)
        return self.add_set(path)

    def set_match_icmp_type(self, policy_type: str, name: str, rule: str, type_val: str) -> "RouteBatchBuilder":
        """Match ICMP type."""
        path = self.mappers[self.mapper_key].get_match_icmp_type(policy_type, name, rule, type_val)
        return self.add_set(path)

    def set_match_icmp_type_name(self, policy_type: str, name: str, rule: str, type_name: str) -> "RouteBatchBuilder":
        """Match ICMP type-name."""
        path = self.mappers[self.mapper_key].get_match_icmp_type_name(policy_type, name, rule, type_name)
        return self.add_set(path)

    # ========================================================================
    # Match - ICMPv6 (IPv6)
    # ========================================================================

    def set_match_icmpv6_code(self, policy_type: str, name: str, rule: str, code: str) -> "RouteBatchBuilder":
        """Match ICMPv6 code."""
        path = self.mappers[self.mapper_key].get_match_icmpv6_code(policy_type, name, rule, code)
        return self.add_set(path)

    def set_match_icmpv6_type(self, policy_type: str, name: str, rule: str, type_val: str) -> "RouteBatchBuilder":
        """Match ICMPv6 type."""
        path = self.mappers[self.mapper_key].get_match_icmpv6_type(policy_type, name, rule, type_val)
        return self.add_set(path)

    def set_match_icmpv6_type_name(self, policy_type: str, name: str, rule: str, type_name: str) -> "RouteBatchBuilder":
        """Match ICMPv6 type-name."""
        path = self.mappers[self.mapper_key].get_match_icmpv6_type_name(policy_type, name, rule, type_name)
        return self.add_set(path)

    # ========================================================================
    # Match - Fragment
    # ========================================================================

    def set_match_fragment(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        """Match fragment."""
        path = self.mappers[self.mapper_key].get_match_fragment(policy_type, name, rule, value)
        return self.add_set(path)

    # ========================================================================
    # Match - Packet Type
    # ========================================================================

    def set_match_packet_type(self, policy_type: str, name: str, rule: str, ptype: str) -> "RouteBatchBuilder":
        """Match packet-type."""
        path = self.mappers[self.mapper_key].get_match_packet_type(policy_type, name, rule, ptype)
        return self.add_set(path)

    # ========================================================================
    # Match - Packet Length
    # ========================================================================

    def set_match_packet_length(self, policy_type: str, name: str, rule: str, length: str) -> "RouteBatchBuilder":
        """Match packet-length."""
        path = self.mappers[self.mapper_key].get_match_packet_length(policy_type, name, rule, length)
        return self.add_set(path)

    def set_match_packet_length_exclude(self, policy_type: str, name: str, rule: str, length: str) -> "RouteBatchBuilder":
        """Match packet-length exclude."""
        path = self.mappers[self.mapper_key].get_match_packet_length_exclude(policy_type, name, rule, length)
        return self.add_set(path)

    # ========================================================================
    # Match - DSCP
    # ========================================================================

    def set_match_dscp(self, policy_type: str, name: str, rule: str, dscp: str) -> "RouteBatchBuilder":
        """Match DSCP."""
        path = self.mappers[self.mapper_key].get_match_dscp(policy_type, name, rule, dscp)
        return self.add_set(path)

    def set_match_dscp_exclude(self, policy_type: str, name: str, rule: str, dscp: str) -> "RouteBatchBuilder":
        """Match DSCP exclude."""
        path = self.mappers[self.mapper_key].get_match_dscp_exclude(policy_type, name, rule, dscp)
        return self.add_set(path)

    # ========================================================================
    # Match - State & Marks
    # ========================================================================

    def set_match_state(self, policy_type: str, name: str, rule: str, state: str) -> "RouteBatchBuilder":
        """Match connection state."""
        path = self.mappers[self.mapper_key].get_match_state(policy_type, name, rule, state)
        return self.add_set(path)

    def set_match_ipsec(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        """Match IPsec."""
        path = self.mappers[self.mapper_key].get_match_ipsec(policy_type, name, rule, value)
        return self.add_set(path)

    def set_match_mark(self, policy_type: str, name: str, rule: str, mark: str) -> "RouteBatchBuilder":
        """Match firewall mark."""
        path = self.mappers[self.mapper_key].get_match_mark(policy_type, name, rule, mark)
        return self.add_set(path)

    def set_match_connection_mark(self, policy_type: str, name: str, rule: str, mark: str) -> "RouteBatchBuilder":
        """Match connection mark."""
        path = self.mappers[self.mapper_key].get_match_connection_mark(policy_type, name, rule, mark)
        return self.add_set(path)

    # ========================================================================
    # Match - TTL/Hop Limit
    # ========================================================================

    def set_match_ttl(self, policy_type: str, name: str, rule: str, op: str, value: str) -> "RouteBatchBuilder":
        """Match TTL (IPv4)."""
        path = self.mappers[self.mapper_key].get_match_ttl(policy_type, name, rule, op, value)
        return self.add_set(path)

    def set_match_hop_limit(self, policy_type: str, name: str, rule: str, op: str, value: str) -> "RouteBatchBuilder":
        """Match hop-limit (IPv6)."""
        path = self.mappers[self.mapper_key].get_match_hop_limit(policy_type, name, rule, op, value)
        return self.add_set(path)

    # ========================================================================
    # Match - Time-based
    # ========================================================================

    def set_match_time_monthdays(self, policy_type: str, name: str, rule: str, days: str) -> "RouteBatchBuilder":
        """Match monthdays."""
        path = self.mappers[self.mapper_key].get_match_time_monthdays(policy_type, name, rule, days)
        return self.add_set(path)

    def set_match_time_startdate(self, policy_type: str, name: str, rule: str, date: str) -> "RouteBatchBuilder":
        """Match start date."""
        path = self.mappers[self.mapper_key].get_match_time_startdate(policy_type, name, rule, date)
        return self.add_set(path)

    def set_match_time_starttime(self, policy_type: str, name: str, rule: str, time: str) -> "RouteBatchBuilder":
        """Match start time."""
        path = self.mappers[self.mapper_key].get_match_time_starttime(policy_type, name, rule, time)
        return self.add_set(path)

    def set_match_time_stopdate(self, policy_type: str, name: str, rule: str, date: str) -> "RouteBatchBuilder":
        """Match stop date."""
        path = self.mappers[self.mapper_key].get_match_time_stopdate(policy_type, name, rule, date)
        return self.add_set(path)

    def set_match_time_stoptime(self, policy_type: str, name: str, rule: str, time: str) -> "RouteBatchBuilder":
        """Match stop time."""
        path = self.mappers[self.mapper_key].get_match_time_stoptime(policy_type, name, rule, time)
        return self.add_set(path)

    def set_match_time_utc(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Use UTC for time matching."""
        path = self.mappers[self.mapper_key].get_match_time_utc(policy_type, name, rule)
        return self.add_set(path)

    def set_match_time_weekdays(self, policy_type: str, name: str, rule: str, days: str) -> "RouteBatchBuilder":
        """Match weekdays."""
        path = self.mappers[self.mapper_key].get_match_time_weekdays(policy_type, name, rule, days)
        return self.add_set(path)

    # ========================================================================
    # Match - Rate Limiting
    # ========================================================================

    def set_match_limit_burst(self, policy_type: str, name: str, rule: str, burst: str) -> "RouteBatchBuilder":
        """Match limit burst."""
        path = self.mappers[self.mapper_key].get_match_limit_burst(policy_type, name, rule, burst)
        return self.add_set(path)

    def set_match_limit_rate(self, policy_type: str, name: str, rule: str, rate: str) -> "RouteBatchBuilder":
        """Match limit rate."""
        path = self.mappers[self.mapper_key].get_match_limit_rate(policy_type, name, rule, rate)
        return self.add_set(path)

    def set_match_recent_count(self, policy_type: str, name: str, rule: str, count: str) -> "RouteBatchBuilder":
        """Match recent count."""
        path = self.mappers[self.mapper_key].get_match_recent_count(policy_type, name, rule, count)
        return self.add_set(path)

    def set_match_recent_time(self, policy_type: str, name: str, rule: str, time: str) -> "RouteBatchBuilder":
        """Match recent time."""
        path = self.mappers[self.mapper_key].get_match_recent_time(policy_type, name, rule, time)
        return self.add_set(path)

    # ========================================================================
    # Set Actions
    # ========================================================================

    def set_action_drop(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Set action to drop."""
        path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule) + ["action", "drop"]
        return self.add_set(path)

    def set_connection_mark(self, policy_type: str, name: str, rule: str, mark: str) -> "RouteBatchBuilder":
        """Set connection-mark."""
        path = self.mappers[self.mapper_key].get_set_connection_mark(policy_type, name, rule, mark)
        return self.add_set(path)

    def set_dscp(self, policy_type: str, name: str, rule: str, dscp: str) -> "RouteBatchBuilder":
        """Set DSCP."""
        path = self.mappers[self.mapper_key].get_set_dscp(policy_type, name, rule, dscp)
        return self.add_set(path)

    def set_mark(self, policy_type: str, name: str, rule: str, mark: str) -> "RouteBatchBuilder":
        """Set firewall mark."""
        path = self.mappers[self.mapper_key].get_set_mark(policy_type, name, rule, mark)
        return self.add_set(path)

    def set_table(self, policy_type: str, name: str, rule: str, table: str) -> "RouteBatchBuilder":
        """Set routing table."""
        path = self.mappers[self.mapper_key].get_set_table(policy_type, name, rule, table)
        return self.add_set(path)

    def set_tcp_mss(self, policy_type: str, name: str, rule: str, mss: str) -> "RouteBatchBuilder":
        """Set TCP MSS."""
        path = self.mappers[self.mapper_key].get_set_tcp_mss(policy_type, name, rule, mss)
        return self.add_set(path)

    def set_vrf(self, policy_type: str, name: str, rule: str, vrf: str) -> "RouteBatchBuilder":
        """Set VRF (1.5+ only)."""
        path = self.mappers[self.mapper_key].get_set_vrf(policy_type, name, rule, vrf)
        return self.add_set(path)

    # ========================================================================
    # Delete Match Conditions
    # ========================================================================

    def delete_match_source(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete all source match conditions."""
        path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule) + ["source"]
        return self.add_delete(path)

    def delete_match_destination(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete all destination match conditions."""
        path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule) + ["destination"]
        return self.add_delete(path)

    def delete_match(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete all match conditions for rule."""
        # Delete only common match sections to avoid VyOS errors on non-existent fields
        # VyOS 1.5 is stricter and returns 400 when trying to delete fields that don't exist
        # We delete the major grouping sections which will cascade to their child fields
        base_path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule)
        match_sections = [
            "source",        # Groups: address, mac-address, port, group{address-group, domain-group, mac-group, network-group, port-group}
            "destination",   # Groups: address, mac-address, port, group{address-group, domain-group, mac-group, network-group, port-group}
        ]
        for section in match_sections:
            self.add_delete(base_path + [section])
        return self

    def delete_set(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        """Delete all set actions for rule."""
        path = self.mappers[self.mapper_key].get_rule_path(policy_type, name, rule) + ["set"]
        return self.add_delete(path)

    # ========================================================================
    # Interface Policy Application
    # ========================================================================

    def set_interface_policy(self, policy_type: str, policy_name: str, interface_name: str) -> "RouteBatchBuilder":
        """Apply policy route to an interface.
        Command: set policy route <name> interface <interface>
        """
        path = self.mappers[self.mapper_key].get_interface_policy(policy_type, policy_name, interface_name)
        return self.add_set(path)

    def delete_interface_policy(self, policy_type: str, policy_name: str, interface_name: str) -> "RouteBatchBuilder":
        """Remove policy route from an interface.
        Command: delete policy route <name> interface <interface>
        """
        path = self.mappers[self.mapper_key].get_delete_interface_policy(policy_type, policy_name, interface_name)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        supports_vrf = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "features": {
                "ipv4_policy_route": {
                    "supported": True,
                    "description": "IPv4 policy route support",
                },
                "ipv6_policy_route": {
                    "supported": True,
                    "description": "IPv6 policy route6 support",
                },
                "vrf_routing": {
                    "supported": supports_vrf,
                    "description": "VRF routing (VyOS 1.5+ only)",
                },
                "time_based_matching": {
                    "supported": True,
                    "description": "Time-based rule matching",
                },
                "rate_limiting": {
                    "supported": True,
                    "description": "Rate limiting with burst and average rate",
                },
                "firewall_groups": {
                    "supported": True,
                    "description": "Match against firewall groups",
                },
            },
            "version_notes": {
                "vrf_available": supports_vrf,
            },
        }
