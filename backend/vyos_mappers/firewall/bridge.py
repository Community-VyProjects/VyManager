"""
Bridge Firewall Command Mapper

Handles command path generation for bridge (layer 2) firewall rules.
Version-specific logic handles differences between VyOS 1.4 and 1.5:
- 1.4: Only forward chain
- 1.5: Adds prerouting, input, output chains + ethernet-type matching + set options
"""

from typing import List
from ..base import BaseFeatureMapper


class BridgeFirewallMapper(BaseFeatureMapper):
    """Mapper for bridge firewall operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self._is_v15 = "1.5" in version

    def is_v15(self) -> bool:
        """Check if this is VyOS 1.5+"""
        return self._is_v15

    def get_supported_chains(self) -> List[str]:
        """Get list of supported chains for this version."""
        if self._is_v15:
            return ["forward", "input", "output", "prerouting"]
        return ["forward"]

    # ========================================================================
    # Chain Operations
    # ========================================================================

    def _is_base_chain(self, chain: str) -> bool:
        """Check if chain is a base chain (forward, input, output, prerouting)."""
        base_chains = ["forward", "input", "output", "prerouting"]
        return chain in base_chains

    def _get_chain_base(self, chain: str, is_custom: bool = False) -> List[str]:
        """Get base path for a chain. Base chains sit under the 'filter' table."""
        # Check if it's a custom chain (either explicitly flagged or not a base chain name)
        if is_custom or not self._is_base_chain(chain):
            # Custom chains use: firewall bridge name <chain-name>
            return ["firewall", "bridge", "name", chain]

        # Base chains use: firewall bridge <chain> filter — on both 1.4 and
        # 1.5; sagitta rejects the path without the filter keyword.
        return ["firewall", "bridge", chain, "filter"]

    def get_chain_path(self, chain: str) -> List[str]:
        """Get command path for a chain."""
        return self._get_chain_base(chain)

    def get_chain_default_action(self, chain: str, action: str) -> List[str]:
        """Get command path for setting default action on a chain."""
        return self._get_chain_base(chain) + ["default-action", action]

    def get_chain_default_action_path(self, chain: str) -> List[str]:
        """Get command path for default action (for deletion)."""
        return self._get_chain_base(chain) + ["default-action"]

    def get_chain_description(self, chain: str, description: str) -> List[str]:
        """Get command path for setting chain description."""
        return self._get_chain_base(chain) + ["description", description]

    def get_chain_description_path(self, chain: str) -> List[str]:
        """Get command path for chain description (for deletion)."""
        return self._get_chain_base(chain) + ["description"]

    def get_chain_default_log(self, chain: str) -> List[str]:
        """Get command path for enabling default-log on a chain."""
        return self._get_chain_base(chain) + ["default-log"]

    def get_chain_default_log_path(self, chain: str) -> List[str]:
        """Get command path for default-log (for deletion)."""
        return self._get_chain_base(chain) + ["default-log"]

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def _get_rule_base(self, chain: str, rule_number: int) -> List[str]:
        """Get base path for a rule."""
        return self._get_chain_base(chain) + ["rule", str(rule_number)]

    def get_rule_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for a rule."""
        return self._get_rule_base(chain, rule_number)

    def get_rule_action(self, chain: str, rule_number: int, action: str) -> List[str]:
        """Get command path for setting rule action."""
        return self._get_rule_base(chain, rule_number) + ["action", action]

    def get_rule_action_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule action (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["action"]

    def get_rule_description(self, chain: str, rule_number: int, description: str) -> List[str]:
        """Get command path for setting rule description."""
        return self._get_rule_base(chain, rule_number) + ["description", description]

    def get_rule_description_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule description (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["description"]

    def get_rule_disable(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for disabling a rule."""
        return self._get_rule_base(chain, rule_number) + ["disable"]

    def get_rule_disable_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule disable (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["disable"]

    def get_rule_log(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for enabling rule logging."""
        return self._get_rule_base(chain, rule_number) + ["log"]

    def get_rule_log_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule log (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["log"]

    # ========================================================================
    # Rule Properties - Source MAC
    # ========================================================================

    def get_rule_source_mac(self, chain: str, rule_number: int, mac: str) -> List[str]:
        """Get command path for setting source MAC address."""
        return self._get_rule_base(chain, rule_number) + ["source", "mac-address", mac]

    def get_rule_source_mac_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["source", "mac-address"]

    def get_rule_source_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire source node (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["source"]

    # ========================================================================
    # Rule Properties - Destination MAC
    # ========================================================================

    def get_rule_destination_mac(self, chain: str, rule_number: int, mac: str) -> List[str]:
        """Get command path for setting destination MAC address."""
        return self._get_rule_base(chain, rule_number) + ["destination", "mac-address", mac]

    def get_rule_destination_mac_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination MAC address (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "mac-address"]

    def get_rule_destination_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire destination node (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["destination"]

    # ========================================================================
    # Rule Properties - VLAN
    # ========================================================================

    def get_rule_vlan_id(self, chain: str, rule_number: int, vlan_id: str) -> List[str]:
        """Get command path for setting VLAN ID matching."""
        return self._get_rule_base(chain, rule_number) + ["vlan", "id", vlan_id]

    def get_rule_vlan_id_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for VLAN ID (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["vlan", "id"]

    def get_rule_vlan_priority(self, chain: str, rule_number: int, priority: str) -> List[str]:
        """Get command path for setting VLAN priority matching."""
        return self._get_rule_base(chain, rule_number) + ["vlan", "priority", priority]

    def get_rule_vlan_priority_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for VLAN priority (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["vlan", "priority"]

    def get_rule_vlan_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire VLAN node (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["vlan"]

    # ========================================================================
    # Rule Properties - Interface
    # ========================================================================

    def get_rule_inbound_interface(self, chain: str, rule_number: int, interface: str) -> List[str]:
        """Get command path for setting inbound interface."""
        return self._get_rule_base(chain, rule_number) + ["inbound-interface", "name", interface]

    def get_rule_inbound_interface_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for inbound interface (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["inbound-interface"]

    def get_rule_inbound_interface_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for setting inbound interface group."""
        return self._get_rule_base(chain, rule_number) + ["inbound-interface", "group", group]

    def get_rule_inbound_interface_group_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for inbound interface group (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["inbound-interface", "group"]

    def get_rule_outbound_interface(self, chain: str, rule_number: int, interface: str) -> List[str]:
        """Get command path for setting outbound interface."""
        return self._get_rule_base(chain, rule_number) + ["outbound-interface", "name", interface]

    def get_rule_outbound_interface_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for outbound interface (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["outbound-interface"]

    def get_rule_outbound_interface_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for setting outbound interface group."""
        return self._get_rule_base(chain, rule_number) + ["outbound-interface", "group", group]

    def get_rule_outbound_interface_group_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for outbound interface group (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["outbound-interface", "group"]

    # ========================================================================
    # Rule Properties - Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> List[str]:
        """Get command path for setting ethernet type (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ethernet-type", eth_type]

    def get_rule_ethernet_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for ethernet type (for deletion) (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ethernet-type"]

    # ========================================================================
    # Rule Properties - Jump Target
    # ========================================================================

    def get_rule_jump_target(self, chain: str, rule_number: int, target: str) -> List[str]:
        """Get command path for setting jump target."""
        return self._get_rule_base(chain, rule_number) + ["jump-target", target]

    def get_rule_jump_target_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for jump target (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["jump-target"]

    # ========================================================================
    # Rule Properties - Protocol (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_protocol(self, chain: str, rule_number: int, protocol: str) -> List[str]:
        """Get command path for setting protocol (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["protocol", protocol]

    def get_rule_protocol_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for protocol (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["protocol"]

    # ========================================================================
    # Rule Properties - Source/Destination IP Address (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_source_address(self, chain: str, rule_number: int, address: str) -> List[str]:
        """Get command path for source IP address (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "address", address]

    def get_rule_source_address_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source address (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["source", "address"]

    def get_rule_source_port(self, chain: str, rule_number: int, port: str) -> List[str]:
        """Get command path for source port (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "port", port]

    def get_rule_source_port_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source port (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["source", "port"]

    def get_rule_destination_address(self, chain: str, rule_number: int, address: str) -> List[str]:
        """Get command path for destination IP address (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "address", address]

    def get_rule_destination_address_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination address (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "address"]

    def get_rule_destination_port(self, chain: str, rule_number: int, port: str) -> List[str]:
        """Get command path for destination port (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "port", port]

    def get_rule_destination_port_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination port (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "port"]

    # ========================================================================
    # Rule Properties - Source/Destination Groups (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_source_group_address(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source address group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "group", "address-group", group]

    def get_rule_source_group_network(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source network group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "group", "network-group", group]

    def get_rule_source_group_port(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source port group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "group", "port-group", group]

    def get_rule_source_group_mac(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source MAC group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["source", "group", "mac-group", group]

    def get_rule_destination_group_address(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination address group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "group", "address-group", group]

    def get_rule_destination_group_network(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination network group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "group", "network-group", group]

    def get_rule_destination_group_port(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination port group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "group", "port-group", group]

    def get_rule_destination_group_mac(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination MAC group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["destination", "group", "mac-group", group]

    # ========================================================================
    # Rule Properties - ICMP (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_icmp_type(self, chain: str, rule_number: int, icmp_type: str) -> List[str]:
        """Get command path for ICMP type (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmp", "type", icmp_type]

    def get_rule_icmp_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for ICMP type (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["icmp", "type"]

    def get_rule_icmp_code(self, chain: str, rule_number: int, code: str) -> List[str]:
        """Get command path for ICMP code (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmp", "code", code]

    def get_rule_icmp_type_name(self, chain: str, rule_number: int, type_name: str) -> List[str]:
        """Get command path for ICMP type-name (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmp", "type-name", type_name]

    def get_rule_icmpv6_type(self, chain: str, rule_number: int, icmp_type: str) -> List[str]:
        """Get command path for ICMPv6 type (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmpv6", "type", icmp_type]

    def get_rule_icmpv6_code(self, chain: str, rule_number: int, code: str) -> List[str]:
        """Get command path for ICMPv6 code (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmpv6", "code", code]

    def get_rule_icmpv6_type_name(self, chain: str, rule_number: int, type_name: str) -> List[str]:
        """Get command path for ICMPv6 type-name (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["icmpv6", "type-name", type_name]

    # ========================================================================
    # Rule Properties - TCP Flags (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_tcp_flags(self, chain: str, rule_number: int, flag: str) -> List[str]:
        """Get command path for TCP flag (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["tcp", "flags", flag]

    def get_rule_tcp_flags_not(self, chain: str, rule_number: int, flag: str) -> List[str]:
        """Get command path for TCP flag negation (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["tcp", "flags", "not", flag]

    def get_rule_tcp_mss(self, chain: str, rule_number: int, mss: str) -> List[str]:
        """Get command path for TCP MSS matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["tcp", "mss", mss]

    # ========================================================================
    # Rule Properties - Rate Limiting (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_limit_rate(self, chain: str, rule_number: int, rate: str) -> List[str]:
        """Get command path for rate limit (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["limit", "rate", rate]

    def get_rule_limit_burst(self, chain: str, rule_number: int, burst: str) -> List[str]:
        """Get command path for rate limit burst (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["limit", "burst", burst]

    def get_rule_limit_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for limit (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["limit"]

    # ========================================================================
    # Rule Properties - Log Options (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_log_options_level(self, chain: str, rule_number: int, level: str) -> List[str]:
        """Get command path for log level (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["log-options", "level", level]

    def get_rule_log_options_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for log group (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["log-options", "group", group]

    def get_rule_log_options_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for log-options (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["log-options"]

    # ========================================================================
    # Rule Properties - Mark Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for firewall mark matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["mark", mark]

    def get_rule_mark_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for mark (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["mark"]

    def get_rule_connection_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for connection mark matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["connection-mark", mark]

    # ========================================================================
    # Rule Properties - DSCP Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_dscp(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for DSCP matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["dscp", dscp]

    def get_rule_dscp_exclude(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for DSCP exclusion matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["dscp-exclude", dscp]

    # ========================================================================
    # Rule Properties - Fragment Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_fragment_match_frag(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for fragment matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["fragment", "match-frag"]

    def get_rule_fragment_match_non_frag(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-fragment matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["fragment", "match-non-frag"]

    # ========================================================================
    # Rule Properties - IPsec Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for IPsec inbound matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ipsec", "match-ipsec-in"]

    def get_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for IPsec outbound matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ipsec", "match-ipsec-out"]

    def get_rule_ipsec_match_none_in(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-IPsec inbound matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ipsec", "match-none-in"]

    def get_rule_ipsec_match_none_out(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-IPsec outbound matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ipsec", "match-none-out"]

    # ========================================================================
    # Rule Properties - TTL/Hop-Limit Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ttl_eq(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL equal matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ttl", "eq", value]

    def get_rule_ttl_gt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL greater-than matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ttl", "gt", value]

    def get_rule_ttl_lt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL less-than matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["ttl", "lt", value]

    def get_rule_hop_limit_eq(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit equal matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["hop-limit", "eq", value]

    def get_rule_hop_limit_gt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit greater-than matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["hop-limit", "gt", value]

    def get_rule_hop_limit_lt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit less-than matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["hop-limit", "lt", value]

    # ========================================================================
    # Rule Properties - Packet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_packet_type(self, chain: str, rule_number: int, pkt_type: str) -> List[str]:
        """Get command path for packet type matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["packet-type", pkt_type]

    def get_rule_packet_length(self, chain: str, rule_number: int, length: str) -> List[str]:
        """Get command path for packet length matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["packet-length", length]

    # ========================================================================
    # Rule Properties - Time-based (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_time_startdate(self, chain: str, rule_number: int, date: str) -> List[str]:
        """Get command path for time start date (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["time", "startdate", date]

    def get_rule_time_stopdate(self, chain: str, rule_number: int, date: str) -> List[str]:
        """Get command path for time stop date (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["time", "stopdate", date]

    def get_rule_time_starttime(self, chain: str, rule_number: int, time: str) -> List[str]:
        """Get command path for time start time (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["time", "starttime", time]

    def get_rule_time_stoptime(self, chain: str, rule_number: int, time: str) -> List[str]:
        """Get command path for time stop time (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["time", "stoptime", time]

    def get_rule_time_weekdays(self, chain: str, rule_number: int, weekdays: str) -> List[str]:
        """Get command path for time weekdays (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["time", "weekdays", weekdays]

    def get_rule_time_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for time (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["time"]

    # ========================================================================
    # Rule Properties - Queue Action (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_queue(self, chain: str, rule_number: int, queue: str) -> List[str]:
        """Get command path for queue target (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["queue", queue]

    # ========================================================================
    # Rule Properties - VLAN Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_vlan_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> List[str]:
        """Get command path for VLAN ethernet type matching (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["vlan", "ethernet-type", eth_type]

    # ========================================================================
    # Rule Properties - Packet Modifications (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_set_dscp(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for setting DSCP value (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "dscp", dscp]

    def get_rule_set_dscp_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for DSCP (for deletion) (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "dscp"]

    def get_rule_set_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for setting packet mark (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "mark", mark]

    def get_rule_set_mark_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for packet mark (for deletion) (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "mark"]

    def get_rule_set_connection_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for setting connection mark (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "connection-mark", mark]

    def get_rule_set_ttl(self, chain: str, rule_number: int, ttl: str) -> List[str]:
        """Get command path for setting TTL (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "ttl", ttl]

    def get_rule_set_hop_limit(self, chain: str, rule_number: int, hop_limit: str) -> List[str]:
        """Get command path for setting hop-limit (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "hop-limit", hop_limit]

    def get_rule_set_tcp_mss(self, chain: str, rule_number: int, mss: str) -> List[str]:
        """Get command path for setting TCP MSS (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "tcp-mss", mss]

    def get_rule_set_vlan_priority(self, chain: str, rule_number: int, priority: str) -> List[str]:
        """Get command path for setting VLAN priority (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "vlan-priority", priority]

    def get_rule_set_vlan_priority_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for set VLAN priority (for deletion) (VyOS 1.5+ only)."""
        return self._get_rule_base(chain, rule_number) + ["set", "vlan-priority"]

    def get_rule_set_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire set node (for deletion)."""
        return self._get_rule_base(chain, rule_number) + ["set"]

    # ========================================================================
    # Custom Chain Operations (VyOS 1.4+)
    # ========================================================================

    def get_custom_chain(self, chain_name: str) -> List[str]:
        """Get command path for creating a custom chain."""
        return ["firewall", "bridge", "name", chain_name]

    def get_custom_chain_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain (for deletion)."""
        return ["firewall", "bridge", "name", chain_name]

    def get_custom_chain_description(self, chain_name: str, description: str) -> List[str]:
        """Get command path for setting custom chain description."""
        return ["firewall", "bridge", "name", chain_name, "description", description]

    def get_custom_chain_description_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain description (for deletion)."""
        return ["firewall", "bridge", "name", chain_name, "description"]

    def get_custom_chain_default_action(self, chain_name: str, action: str) -> List[str]:
        """Get command path for setting default action on custom chain."""
        return ["firewall", "bridge", "name", chain_name, "default-action", action]

    def get_custom_chain_default_action_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain default action (for deletion)."""
        return ["firewall", "bridge", "name", chain_name, "default-action"]

    def get_custom_chain_rule_path(self, chain_name: str, rule_number: int) -> List[str]:
        """Get command path for a rule in a custom chain."""
        return ["firewall", "bridge", "name", chain_name, "rule", str(rule_number)]

    # ========================================================================
    # Config Parsing Helpers
    # ========================================================================

    def parse_chain_config(self, chain_name: str, chain_config: dict) -> dict:
        """Parse a chain configuration from VyOS config."""
        result = {
            "name": chain_name,
            "default_action": chain_config.get("default-action"),
            "description": chain_config.get("description"),
            "rules": [],
        }

        rules_config = chain_config.get("rule", {})
        if isinstance(rules_config, dict):
            for rule_num, rule_config in rules_config.items():
                result["rules"].append(self.parse_rule_config(rule_num, rule_config))

        return result

    def parse_rule_config(self, rule_number: str, rule_config: dict) -> dict:
        """Parse a rule configuration from VyOS config."""
        # Handle source
        source = rule_config.get("source", {})
        source_mac = source.get("mac-address") if isinstance(source, dict) else None
        source_address = source.get("address") if isinstance(source, dict) else None
        source_port = source.get("port") if isinstance(source, dict) else None
        source_group = source.get("group", {}) if isinstance(source, dict) else {}

        # Handle destination
        destination = rule_config.get("destination", {})
        dest_mac = destination.get("mac-address") if isinstance(destination, dict) else None
        dest_address = destination.get("address") if isinstance(destination, dict) else None
        dest_port = destination.get("port") if isinstance(destination, dict) else None
        dest_group = destination.get("group", {}) if isinstance(destination, dict) else {}

        # Handle VLAN
        vlan = rule_config.get("vlan", {})
        vlan_id = vlan.get("id") if isinstance(vlan, dict) else None
        vlan_priority = vlan.get("priority") if isinstance(vlan, dict) else None
        vlan_ethernet_type = vlan.get("ethernet-type") if isinstance(vlan, dict) else None

        # Handle interfaces
        inbound = rule_config.get("inbound-interface", {})
        outbound = rule_config.get("outbound-interface", {})

        # Handle set options (1.5+)
        set_opts = rule_config.get("set", {})

        # Handle ICMP (1.5+)
        icmp = rule_config.get("icmp", {})
        icmpv6 = rule_config.get("icmpv6", {})

        # Handle TCP (1.5+)
        tcp = rule_config.get("tcp", {})
        tcp_flags = tcp.get("flags", {}) if isinstance(tcp, dict) else {}

        # Handle limit (1.5+)
        limit = rule_config.get("limit", {})

        # Handle log options (1.5+)
        log_options = rule_config.get("log-options", {})

        # Handle time (1.5+)
        time_opts = rule_config.get("time", {})

        # Handle fragment (1.5+)
        fragment = rule_config.get("fragment", {})

        # Handle ipsec (1.5+)
        ipsec = rule_config.get("ipsec", {})

        # Handle ttl (1.5+)
        ttl = rule_config.get("ttl", {})

        # Handle hop-limit (1.5+)
        hop_limit = rule_config.get("hop-limit", {})

        # Handle connection-status (1.5+)
        connection_status = rule_config.get("connection-status", {})

        # Convert TCP flags dict to list of enabled flags
        enabled_tcp_flags = []
        disabled_tcp_flags = []
        if isinstance(tcp_flags, dict):
            not_flags = tcp_flags.get("not", {})
            for flag in ["syn", "ack", "fin", "rst", "urg", "psh"]:
                if flag in tcp_flags:
                    enabled_tcp_flags.append(flag)
                if isinstance(not_flags, dict) and flag in not_flags:
                    disabled_tcp_flags.append(flag)

        return {
            "rule_number": int(rule_number),
            "action": rule_config.get("action"),
            "description": rule_config.get("description"),
            "disabled": "disable" in rule_config,
            "log": "log" in rule_config,
            # MAC addresses (1.4+)
            "source_mac": source_mac,
            "destination_mac": dest_mac,
            # IP addresses (1.5+)
            "source_address": source_address,
            "destination_address": dest_address,
            # Ports (1.5+)
            "source_port": source_port,
            "destination_port": dest_port,
            # Source groups (1.5+)
            "source_group_address": source_group.get("address-group") if isinstance(source_group, dict) else None,
            "source_group_network": source_group.get("network-group") if isinstance(source_group, dict) else None,
            "source_group_port": source_group.get("port-group") if isinstance(source_group, dict) else None,
            "source_group_mac": source_group.get("mac-group") if isinstance(source_group, dict) else None,
            # Destination groups (1.5+)
            "destination_group_address": dest_group.get("address-group") if isinstance(dest_group, dict) else None,
            "destination_group_network": dest_group.get("network-group") if isinstance(dest_group, dict) else None,
            "destination_group_port": dest_group.get("port-group") if isinstance(dest_group, dict) else None,
            "destination_group_mac": dest_group.get("mac-group") if isinstance(dest_group, dict) else None,
            # VLAN (1.4+)
            "vlan_id": vlan_id,
            "vlan_priority": vlan_priority,
            "vlan_ethernet_type": vlan_ethernet_type,
            # Interfaces (1.4+)
            "inbound_interface": inbound.get("name") if isinstance(inbound, dict) else None,
            "inbound_interface_group": inbound.get("group") if isinstance(inbound, dict) else None,
            "outbound_interface": outbound.get("name") if isinstance(outbound, dict) else None,
            "outbound_interface_group": outbound.get("group") if isinstance(outbound, dict) else None,
            # Protocol (1.5+)
            "protocol": rule_config.get("protocol"),
            # Ethernet type (1.5+)
            "ethernet_type": rule_config.get("ethernet-type"),
            # Jump target
            "jump_target": rule_config.get("jump-target"),
            "queue": rule_config.get("queue"),
            # ICMP (1.5+)
            "icmp_type": icmp.get("type") if isinstance(icmp, dict) else None,
            "icmp_code": icmp.get("code") if isinstance(icmp, dict) else None,
            "icmp_type_name": icmp.get("type-name") if isinstance(icmp, dict) else None,
            # ICMPv6 (1.5+)
            "icmpv6_type": icmpv6.get("type") if isinstance(icmpv6, dict) else None,
            "icmpv6_code": icmpv6.get("code") if isinstance(icmpv6, dict) else None,
            "icmpv6_type_name": icmpv6.get("type-name") if isinstance(icmpv6, dict) else None,
            # TCP (1.5+)
            "tcp_flags": enabled_tcp_flags if enabled_tcp_flags else None,
            "tcp_flags_not": disabled_tcp_flags if disabled_tcp_flags else None,
            "tcp_mss": tcp.get("mss") if isinstance(tcp, dict) else None,
            # Rate limiting (1.5+)
            "limit_rate": limit.get("rate") if isinstance(limit, dict) else None,
            "limit_burst": limit.get("burst") if isinstance(limit, dict) else None,
            # Log options (1.5+)
            "log_level": log_options.get("level") if isinstance(log_options, dict) else None,
            "log_group": log_options.get("group") if isinstance(log_options, dict) else None,
            # Mark matching (1.5+)
            "mark": rule_config.get("mark"),
            "connection_mark": rule_config.get("connection-mark"),
            # DSCP matching (1.5+)
            "dscp": rule_config.get("dscp"),
            "dscp_exclude": rule_config.get("dscp-exclude"),
            # Fragment matching (1.5+)
            "fragment_match_frag": "match-frag" in fragment if isinstance(fragment, dict) else False,
            "fragment_match_non_frag": "match-non-frag" in fragment if isinstance(fragment, dict) else False,
            # IPsec matching (1.5+)
            "ipsec_match_ipsec_in": "match-ipsec-in" in ipsec if isinstance(ipsec, dict) else False,
            "ipsec_match_ipsec_out": "match-ipsec-out" in ipsec if isinstance(ipsec, dict) else False,
            "ipsec_match_none_in": "match-none-in" in ipsec if isinstance(ipsec, dict) else False,
            "ipsec_match_none_out": "match-none-out" in ipsec if isinstance(ipsec, dict) else False,
            # TTL matching (1.5+)
            "ttl_eq": ttl.get("eq") if isinstance(ttl, dict) else None,
            "ttl_gt": ttl.get("gt") if isinstance(ttl, dict) else None,
            "ttl_lt": ttl.get("lt") if isinstance(ttl, dict) else None,
            # Hop-limit matching (1.5+)
            "hop_limit_eq": hop_limit.get("eq") if isinstance(hop_limit, dict) else None,
            "hop_limit_gt": hop_limit.get("gt") if isinstance(hop_limit, dict) else None,
            "hop_limit_lt": hop_limit.get("lt") if isinstance(hop_limit, dict) else None,
            # Packet type/length (1.5+)
            "packet_type": rule_config.get("packet-type"),
            "packet_length": rule_config.get("packet-length"),
            # Time-based rules (1.5+)
            "time_startdate": time_opts.get("startdate") if isinstance(time_opts, dict) else None,
            "time_stopdate": time_opts.get("stopdate") if isinstance(time_opts, dict) else None,
            "time_starttime": time_opts.get("starttime") if isinstance(time_opts, dict) else None,
            "time_stoptime": time_opts.get("stoptime") if isinstance(time_opts, dict) else None,
            "time_weekdays": time_opts.get("weekdays") if isinstance(time_opts, dict) else None,
            # Connection status (1.5+)
            "connection_status_new": "new" in connection_status if isinstance(connection_status, dict) else False,
            "connection_status_established": "established" in connection_status if isinstance(connection_status, dict) else False,
            "connection_status_related": "related" in connection_status if isinstance(connection_status, dict) else False,
            "connection_status_invalid": "invalid" in connection_status if isinstance(connection_status, dict) else False,
            # Set options (1.5+)
            "set_dscp": set_opts.get("dscp") if isinstance(set_opts, dict) else None,
            "set_mark": set_opts.get("mark") if isinstance(set_opts, dict) else None,
            "set_connection_mark": set_opts.get("connection-mark") if isinstance(set_opts, dict) else None,
            "set_ttl": set_opts.get("ttl") if isinstance(set_opts, dict) else None,
            "set_hop_limit": set_opts.get("hop-limit") if isinstance(set_opts, dict) else None,
            "set_tcp_mss": set_opts.get("tcp-mss") if isinstance(set_opts, dict) else None,
            "set_vlan_priority": set_opts.get("vlan-priority") if isinstance(set_opts, dict) else None,
        }
