"""
Route Policy Command Mapper

Handles command path generation for VyOS policy route and route6 configuration.
Supports both IPv4 (route) and IPv6 (route6) policies.
"""

from typing import List
from ..base import BaseFeatureMapper


class RouteMapper(BaseFeatureMapper):
    """Base mapper for route policy commands."""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Policy Paths
    # ========================================================================

    def get_policy_path(self, policy_type: str, name: str) -> List[str]:
        """Get base policy path (route or route6)."""
        return ["policy", policy_type, name]

    def get_rule_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        """Get rule path."""
        return ["policy", policy_type, name, "rule", rule]

    # ========================================================================
    # Policy-Level Configuration
    # ========================================================================

    def get_policy_description(self, policy_type: str, name: str, description: str) -> List[str]:
        """Set policy description."""
        return ["policy", policy_type, name, "description", description]

    def get_policy_default_log(self, policy_type: str, name: str) -> List[str]:
        """Enable default logging for unmatched packets."""
        return ["policy", policy_type, name, "default-log"]

    # ========================================================================
    # Rule Basic Configuration
    # ========================================================================

    def get_rule_description(self, policy_type: str, name: str, rule: str, description: str) -> List[str]:
        """Set rule description."""
        return ["policy", policy_type, name, "rule", rule, "description", description]

    def get_delete_rule_description(self, policy_type: str, name: str, rule: str) -> List[str]:
        """Delete rule description."""
        return ["policy", policy_type, name, "rule", rule, "description"]

    def get_rule_disable(self, policy_type: str, name: str, rule: str) -> List[str]:
        """Disable rule."""
        return ["policy", policy_type, name, "rule", rule, "disable"]

    def get_rule_log(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """Set rule logging."""
        return ["policy", policy_type, name, "rule", rule, "log", value]

    # ========================================================================
    # Match Conditions - Address
    # ========================================================================

    def get_match_source_address(self, policy_type: str, name: str, rule: str, address: str) -> List[str]:
        """Match source address."""
        return ["policy", policy_type, name, "rule", rule, "source", "address", address]

    def get_match_destination_address(self, policy_type: str, name: str, rule: str, address: str) -> List[str]:
        """Match destination address."""
        return ["policy", policy_type, name, "rule", rule, "destination", "address", address]

    def get_match_source_mac_address(self, policy_type: str, name: str, rule: str, mac: str) -> List[str]:
        """Match source MAC address."""
        return ["policy", policy_type, name, "rule", rule, "source", "mac-address", mac]

    def get_match_destination_mac_address(self, policy_type: str, name: str, rule: str, mac: str) -> List[str]:
        """Match destination MAC address."""
        return ["policy", policy_type, name, "rule", rule, "destination", "mac-address", mac]

    # ========================================================================
    # Match Conditions - Groups
    # ========================================================================

    def get_match_source_group_address(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match source address-group."""
        return ["policy", policy_type, name, "rule", rule, "source", "group", "address-group", group]

    def get_match_source_group_domain(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match source domain-group."""
        return ["policy", policy_type, name, "rule", rule, "source", "group", "domain-group", group]

    def get_match_source_group_mac(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match source mac-group."""
        return ["policy", policy_type, name, "rule", rule, "source", "group", "mac-group", group]

    def get_match_source_group_network(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match source network-group."""
        return ["policy", policy_type, name, "rule", rule, "source", "group", "network-group", group]

    def get_match_source_group_port(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match source port-group."""
        return ["policy", policy_type, name, "rule", rule, "source", "group", "port-group", group]

    def get_match_destination_group_address(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match destination address-group."""
        return ["policy", policy_type, name, "rule", rule, "destination", "group", "address-group", group]

    def get_match_destination_group_domain(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match destination domain-group."""
        return ["policy", policy_type, name, "rule", rule, "destination", "group", "domain-group", group]

    def get_match_destination_group_mac(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match destination mac-group."""
        return ["policy", policy_type, name, "rule", rule, "destination", "group", "mac-group", group]

    def get_match_destination_group_network(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match destination network-group."""
        return ["policy", policy_type, name, "rule", rule, "destination", "group", "network-group", group]

    def get_match_destination_group_port(self, policy_type: str, name: str, rule: str, group: str) -> List[str]:
        """Match destination port-group."""
        return ["policy", policy_type, name, "rule", rule, "destination", "group", "port-group", group]

    # ========================================================================
    # Match Conditions - Port
    # ========================================================================

    def get_match_destination_port(self, policy_type: str, name: str, rule: str, port: str) -> List[str]:
        """Match destination port."""
        return ["policy", policy_type, name, "rule", rule, "destination", "port", port]

    def get_match_source_port(self, policy_type: str, name: str, rule: str, port: str) -> List[str]:
        """Match source port."""
        return ["policy", policy_type, name, "rule", rule, "source", "port", port]

    # ========================================================================
    # Match Conditions - Protocol
    # ========================================================================

    def get_match_protocol(self, policy_type: str, name: str, rule: str, protocol: str) -> List[str]:
        """Match protocol."""
        return ["policy", policy_type, name, "rule", rule, "protocol", protocol]

    def get_match_tcp_flags(self, policy_type: str, name: str, rule: str, flags: str) -> List[str]:
        """Match TCP flags."""
        return ["policy", policy_type, name, "rule", rule, "tcp", "flags", flags]

    # ========================================================================
    # Match Conditions - ICMP (IPv4)
    # ========================================================================

    def get_match_icmp_code(self, policy_type: str, name: str, rule: str, code: str) -> List[str]:
        """Match ICMP code."""
        return ["policy", policy_type, name, "rule", rule, "icmp", "code", code]

    def get_match_icmp_type(self, policy_type: str, name: str, rule: str, type_val: str) -> List[str]:
        """Match ICMP type."""
        return ["policy", policy_type, name, "rule", rule, "icmp", "type", type_val]

    def get_match_icmp_type_name(self, policy_type: str, name: str, rule: str, type_name: str) -> List[str]:
        """Match ICMP type-name."""
        return ["policy", policy_type, name, "rule", rule, "icmp", "type-name", type_name]

    # ========================================================================
    # Match Conditions - ICMPv6 (IPv6)
    # ========================================================================

    def get_match_icmpv6_code(self, policy_type: str, name: str, rule: str, code: str) -> List[str]:
        """Match ICMPv6 code."""
        return ["policy", policy_type, name, "rule", rule, "icmpv6", "code", code]

    def get_match_icmpv6_type(self, policy_type: str, name: str, rule: str, type_val: str) -> List[str]:
        """Match ICMPv6 type."""
        return ["policy", policy_type, name, "rule", rule, "icmpv6", "type", type_val]

    def get_match_icmpv6_type_name(self, policy_type: str, name: str, rule: str, type_name: str) -> List[str]:
        """Match ICMPv6 type-name."""
        return ["policy", policy_type, name, "rule", rule, "icmpv6", "type-name", type_name]

    # ========================================================================
    # Match Conditions - Fragment
    # ========================================================================

    def get_match_fragment(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """Match fragment (match-frag or match-non-frag)."""
        return ["policy", policy_type, name, "rule", rule, "fragment", value]

    # ========================================================================
    # Match Conditions - Packet Type
    # ========================================================================

    def get_match_packet_type(self, policy_type: str, name: str, rule: str, ptype: str) -> List[str]:
        """Match packet-type (broadcast, host, multicast, other)."""
        return ["policy", policy_type, name, "rule", rule, "packet-type", ptype]

    # ========================================================================
    # Match Conditions - Packet Length
    # ========================================================================

    def get_match_packet_length(self, policy_type: str, name: str, rule: str, length: str) -> List[str]:
        """Match packet-length."""
        return ["policy", policy_type, name, "rule", rule, "packet-length", length]

    def get_match_packet_length_exclude(self, policy_type: str, name: str, rule: str, length: str) -> List[str]:
        """Match packet-length exclude."""
        return ["policy", policy_type, name, "rule", rule, "packet-length-exclude", length]

    # ========================================================================
    # Match Conditions - DSCP
    # ========================================================================

    def get_match_dscp(self, policy_type: str, name: str, rule: str, dscp: str) -> List[str]:
        """Match DSCP."""
        return ["policy", policy_type, name, "rule", rule, "dscp", dscp]

    def get_match_dscp_exclude(self, policy_type: str, name: str, rule: str, dscp: str) -> List[str]:
        """Match DSCP exclude."""
        return ["policy", policy_type, name, "rule", rule, "dscp-exclude", dscp]

    # ========================================================================
    # Match Conditions - State & Marks
    # ========================================================================

    def get_match_state(self, policy_type: str, name: str, rule: str, state: str) -> List[str]:
        """Match connection state."""
        return ["policy", policy_type, name, "rule", rule, "state", state]

    def get_match_ipsec(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """Match IPsec (match-ipsec or match-none)."""
        return ["policy", policy_type, name, "rule", rule, "ipsec", value]

    def get_match_mark(self, policy_type: str, name: str, rule: str, mark: str) -> List[str]:
        """Match firewall mark."""
        return ["policy", policy_type, name, "rule", rule, "mark", mark]

    def get_match_connection_mark(self, policy_type: str, name: str, rule: str, mark: str) -> List[str]:
        """Match connection mark."""
        return ["policy", policy_type, name, "rule", rule, "connection-mark", mark]

    # ========================================================================
    # Match Conditions - TTL/Hop Limit
    # ========================================================================

    def get_match_ttl(self, policy_type: str, name: str, rule: str, op: str, value: str) -> List[str]:
        """Match TTL (IPv4) - op: eq, gt, lt."""
        return ["policy", policy_type, name, "rule", rule, "ttl", op, value]

    def get_match_hop_limit(self, policy_type: str, name: str, rule: str, op: str, value: str) -> List[str]:
        """Match hop-limit (IPv6) - op: eq, gt, lt."""
        return ["policy", policy_type, name, "rule", rule, "hop-limit", op, value]

    # ========================================================================
    # Match Conditions - Time-based
    # ========================================================================

    def get_match_time_monthdays(self, policy_type: str, name: str, rule: str, days: str) -> List[str]:
        """Match monthdays."""
        return ["policy", policy_type, name, "rule", rule, "time", "monthdays", days]

    def get_match_time_startdate(self, policy_type: str, name: str, rule: str, date: str) -> List[str]:
        """Match start date."""
        return ["policy", policy_type, name, "rule", rule, "time", "startdate", date]

    def get_match_time_starttime(self, policy_type: str, name: str, rule: str, time: str) -> List[str]:
        """Match start time."""
        return ["policy", policy_type, name, "rule", rule, "time", "starttime", time]

    def get_match_time_stopdate(self, policy_type: str, name: str, rule: str, date: str) -> List[str]:
        """Match stop date."""
        return ["policy", policy_type, name, "rule", rule, "time", "stopdate", date]

    def get_match_time_stoptime(self, policy_type: str, name: str, rule: str, time: str) -> List[str]:
        """Match stop time."""
        return ["policy", policy_type, name, "rule", rule, "time", "stoptime", time]

    def get_match_time_utc(self, policy_type: str, name: str, rule: str) -> List[str]:
        """Use UTC for time matching."""
        return ["policy", policy_type, name, "rule", rule, "time", "utc"]

    def get_match_time_weekdays(self, policy_type: str, name: str, rule: str, days: str) -> List[str]:
        """Match weekdays."""
        return ["policy", policy_type, name, "rule", rule, "time", "weekdays", days]

    # ========================================================================
    # Match Conditions - Rate Limiting
    # ========================================================================

    def get_match_limit_burst(self, policy_type: str, name: str, rule: str, burst: str) -> List[str]:
        """Match limit burst."""
        return ["policy", policy_type, name, "rule", rule, "limit", "burst", burst]

    def get_match_limit_rate(self, policy_type: str, name: str, rule: str, rate: str) -> List[str]:
        """Match limit rate."""
        return ["policy", policy_type, name, "rule", rule, "limit", "rate", rate]

    def get_match_recent_count(self, policy_type: str, name: str, rule: str, count: str) -> List[str]:
        """Match recent count."""
        return ["policy", policy_type, name, "rule", rule, "recent", "count", count]

    def get_match_recent_time(self, policy_type: str, name: str, rule: str, time: str) -> List[str]:
        """Match recent time."""
        return ["policy", policy_type, name, "rule", rule, "recent", "time", time]

    # ========================================================================
    # Set Actions
    # ========================================================================

    def get_set_connection_mark(self, policy_type: str, name: str, rule: str, mark: str) -> List[str]:
        """Set connection-mark."""
        return ["policy", policy_type, name, "rule", rule, "set", "connection-mark", mark]

    def get_set_dscp(self, policy_type: str, name: str, rule: str, dscp: str) -> List[str]:
        """Set DSCP."""
        return ["policy", policy_type, name, "rule", rule, "set", "dscp", dscp]

    def get_set_mark(self, policy_type: str, name: str, rule: str, mark: str) -> List[str]:
        """Set firewall mark."""
        return ["policy", policy_type, name, "rule", rule, "set", "mark", mark]

    def get_set_table(self, policy_type: str, name: str, rule: str, table: str) -> List[str]:
        """Set routing table."""
        return ["policy", policy_type, name, "rule", rule, "set", "table", table]

    def get_set_tcp_mss(self, policy_type: str, name: str, rule: str, mss: str) -> List[str]:
        """Set TCP MSS."""
        return ["policy", policy_type, name, "rule", rule, "set", "tcp-mss", mss]

    # ========================================================================
    # Delete Operations
    # ========================================================================

    def get_delete_policy(self, policy_type: str, name: str) -> List[str]:
        """Delete entire policy."""
        return ["policy", policy_type, name]

    def get_delete_rule(self, policy_type: str, name: str, rule: str) -> List[str]:
        """Delete rule."""
        return ["policy", policy_type, name, "rule", rule]

    # ========================================================================
    # Interface Policy Application
    # ========================================================================

    def get_interface_policy(self, policy_type: str, policy_name: str, interface_name: str) -> List[str]:
        """Apply policy route to an interface.
        Command: set policy route <name> interface <interface>
        """
        return ["policy", policy_type, policy_name, "interface", interface_name]

    def get_delete_interface_policy(self, policy_type: str, policy_name: str, interface_name: str) -> List[str]:
        """Remove policy route from an interface.
        Command: delete policy route <name> interface <interface>
        """
        return ["policy", policy_type, policy_name, "interface", interface_name]
