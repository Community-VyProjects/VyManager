"""
Bridge Firewall Command Mapper

Handles command path generation for bridge (layer 2) firewall rules.
The mapper owns which bridge nodes exist on each VyOS version. Every
path it emits is checked against those tables, and the builder's
capabilities payload reads the same tables.
"""

from typing import Any, Dict, List, Tuple
from ..base import BaseFeatureMapper

_BASE_CHAINS = ("forward", "input", "output", "prerouting")

# Base chains per version (validateTmplPath on 1.4 and 1.5).
_BASE_CHAINS_V14 = ("forward",)
_BASE_CHAINS_V15 = _BASE_CHAINS

# Rule actions (rule action node.def on both builds). Every chain on 1.4
# and 1.5 takes these. Only the 1.5 prerouting chain adds notrack and
# reject.
_RULE_ACTIONS = ("accept", "continue", "jump", "return", "drop", "queue")
_PREROUTING_RULE_ACTIONS_V15 = _RULE_ACTIONS + ("notrack", "reject")

# Rule subtrees that exist on 1.5 and not on 1.4 (validateTmplPath on
# both). Each entry is a path prefix under ``rule <n>``.
_V15_ONLY_RULE_NODES: Tuple[Tuple[str, ...], ...] = (
    ("description",),
    ("ethernet-type",),
    ("protocol",),
    ("source", "address"),
    ("source", "port"),
    ("source", "group"),
    ("destination", "address"),
    ("destination", "port"),
    ("destination", "group"),
    ("icmp",),
    ("icmpv6",),
    ("tcp",),
    ("limit",),
    ("mark",),
    ("connection-mark",),
    ("dscp",),
    ("dscp-exclude",),
    ("fragment",),
    ("ipsec",),
    ("ttl",),
    ("hop-limit",),
    ("packet-type",),
    ("packet-length",),
    ("time",),
    ("vlan", "ethernet-type"),
    ("set",),
)

# Presence-node names under tcp flags and tcp flags not. 1.4 has no tcp node.
TCP_FLAG_NAMES = ("syn", "ack", "fin", "rst", "psh", "urg", "ecn", "cwr")
PACKET_TYPE_VALUES = ("broadcast", "host", "multicast", "other")
ETHERNET_TYPE_VALUES = ("802.1q", "802.1ad", "arp", "ipv4", "ipv6")
LOG_LEVEL_VALUES = ("emerg", "alert", "crit", "err", "warn", "notice", "info", "debug")
ICMP_TYPE_NAMES = (
    "echo-reply",
    "destination-unreachable",
    "source-quench",
    "redirect",
    "echo-request",
    "router-advertisement",
    "router-solicitation",
    "time-exceeded",
    "parameter-problem",
    "timestamp-request",
    "timestamp-reply",
    "info-request",
    "info-reply",
    "address-mask-request",
    "address-mask-reply",
)
ICMPV6_TYPE_NAMES = (
    "destination-unreachable",
    "packet-too-big",
    "time-exceeded",
    "parameter-problem",
    "echo-request",
    "echo-reply",
    "mld-listener-query",
    "mld-listener-report",
    "mld-listener-reduction",
    "nd-router-solicit",
    "nd-router-advert",
    "nd-neighbor-solicit",
    "nd-neighbor-advert",
    "nd-redirect",
    "router-renumbering",
    "ind-neighbor-solicit",
    "ind-neighbor-advert",
    "mld2-listener-report",
)


class BridgeFirewallMapper(BaseFeatureMapper):
    """Mapper for bridge firewall operations.

    This class is the 1.4 tree. The 1.5 subclass overrides the version
    methods. Path methods stay here and ask ``has_rule_node``.
    """

    def get_supported_chains(self) -> List[str]:
        """Base chains this device has."""
        return list(_BASE_CHAINS_V14)

    def get_supported_rule_actions(self, chain: str) -> List[str]:
        """Rule actions this device accepts on ``chain`` (base or custom)."""
        return list(_RULE_ACTIONS)

    def has_rule_node(self, *tail: str) -> bool:
        """Whether ``rule <n> <tail...>`` exists on this device."""
        return not any(tail[:len(prefix)] == prefix for prefix in _V15_ONLY_RULE_NODES)

    def tcp_flag_names(self) -> List[str]:
        """TCP flag names. 1.4 has no tcp flags node."""
        return []

    def packet_type_values(self) -> List[str]:
        """packet-type allowed values. 1.4 has no packet-type node."""
        return []

    def ethernet_type_values(self) -> List[str]:
        """ethernet-type allowed values. 1.4 has no ethernet-type node."""
        return []

    def icmp_type_names(self) -> List[str]:
        """icmp type-name allowed values. 1.4 has no icmp node."""
        return []

    def icmpv6_type_names(self) -> List[str]:
        """icmpv6 type-name allowed values. 1.4 has no icmpv6 node."""
        return []

    def log_level_values(self) -> List[str]:
        """log-options level allowed values. Both labs use the same list."""
        return list(LOG_LEVEL_VALUES)

    def base_default_actions(self) -> List[str]:
        """default-action on a base chain. Both labs allow drop and accept."""
        return ["drop", "accept"]

    def custom_default_actions(self) -> List[str]:
        """default-action values a named chain can set alone.

        jump is a lab value, but the commit rejects it without
        default-jump-target. That pair is a separate control.
        """
        return ["drop", "reject", "return", "accept", "continue"]

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .bridge_config_parse import parse_config as parse_bridge_config

        return parse_bridge_config(self, full_config)

    def interface_options(self, full_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        from .bridge_config_parse import interface_options as parse_interface_options

        return parse_interface_options(full_config)

    # ========================================================================
    # Chain Operations
    # ========================================================================

    def _is_base_chain(self, chain: str) -> bool:
        """Check if chain is a base chain (forward, input, output, prerouting)."""
        return chain in _BASE_CHAINS

    def _get_chain_base(self, chain: str, is_custom: bool = False) -> List[str]:
        """Get base path for a chain. Base chains sit under the 'filter' table."""
        # Check if it's a custom chain (either explicitly flagged or not a base chain name)
        if is_custom or not self._is_base_chain(chain):
            # Custom chains use: firewall bridge name <chain-name>
            return ["firewall", "bridge", "name", chain]

        if chain not in self.get_supported_chains():
            raise ValueError(f"Bridge firewall {chain} chain is not supported on this device")

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

    def _rule(self, chain: str, rule_number: int, *tail: str) -> List[str]:
        """Path under ``rule <n>``. Raises when this device has no such node."""
        if not self.has_rule_node(*tail):
            raise ValueError(
                f"Bridge firewall rule {' '.join(tail)} is not supported on this device"
            )
        return self._get_rule_base(chain, rule_number) + list(tail)

    def get_rule_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for a rule."""
        return self._get_rule_base(chain, rule_number)

    def get_rule_action(self, chain: str, rule_number: int, action: str) -> List[str]:
        """Get command path for setting rule action."""
        if action not in self.get_supported_rule_actions(chain):
            raise ValueError(
                f"Bridge firewall rule action {action} is not supported on the {chain} chain of this device"
            )
        return self._rule(chain, rule_number, "action", action)

    def get_rule_action_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule action (for deletion)."""
        return self._rule(chain, rule_number, "action")

    def get_rule_description(self, chain: str, rule_number: int, description: str) -> List[str]:
        """Get command path for setting rule description."""
        return self._rule(chain, rule_number, "description", description)

    def get_rule_description_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule description (for deletion)."""
        return self._rule(chain, rule_number, "description")

    def get_rule_disable(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for disabling a rule."""
        return self._rule(chain, rule_number, "disable")

    def get_rule_disable_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule disable (for deletion)."""
        return self._rule(chain, rule_number, "disable")

    def get_rule_log(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for enabling rule logging."""
        return self._rule(chain, rule_number, "log")

    def get_rule_log_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for rule log (for deletion)."""
        return self._rule(chain, rule_number, "log")

    # ========================================================================
    # Rule Properties - Source MAC
    # ========================================================================

    def get_rule_source_mac(self, chain: str, rule_number: int, mac: str) -> List[str]:
        """Get command path for setting source MAC address."""
        return self._rule(chain, rule_number, "source", "mac-address", mac)

    def get_rule_source_mac_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        return self._rule(chain, rule_number, "source", "mac-address")

    def get_rule_source_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire source node (for deletion)."""
        return self._rule(chain, rule_number, "source")

    # ========================================================================
    # Rule Properties - Destination MAC
    # ========================================================================

    def get_rule_destination_mac(self, chain: str, rule_number: int, mac: str) -> List[str]:
        """Get command path for setting destination MAC address."""
        return self._rule(chain, rule_number, "destination", "mac-address", mac)

    def get_rule_destination_mac_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination MAC address (for deletion)."""
        return self._rule(chain, rule_number, "destination", "mac-address")

    def get_rule_destination_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire destination node (for deletion)."""
        return self._rule(chain, rule_number, "destination")

    # ========================================================================
    # Rule Properties - VLAN
    # ========================================================================

    def get_rule_vlan_id(self, chain: str, rule_number: int, vlan_id: str) -> List[str]:
        """Get command path for setting VLAN ID matching."""
        return self._rule(chain, rule_number, "vlan", "id", vlan_id)

    def get_rule_vlan_id_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for VLAN ID (for deletion)."""
        return self._rule(chain, rule_number, "vlan", "id")

    def get_rule_vlan_priority(self, chain: str, rule_number: int, priority: str) -> List[str]:
        """Get command path for setting VLAN priority matching."""
        return self._rule(chain, rule_number, "vlan", "priority", priority)

    def get_rule_vlan_priority_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for VLAN priority (for deletion)."""
        return self._rule(chain, rule_number, "vlan", "priority")

    def get_rule_vlan_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire VLAN node (for deletion)."""
        return self._rule(chain, rule_number, "vlan")

    # ========================================================================
    # Rule Properties - Interface
    # ========================================================================

    def get_rule_inbound_interface(self, chain: str, rule_number: int, interface: str) -> List[str]:
        """Get command path for setting inbound interface."""
        return self._rule(chain, rule_number, "inbound-interface", "name", interface)

    def get_rule_inbound_interface_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for inbound interface (for deletion)."""
        return self._rule(chain, rule_number, "inbound-interface", "name")

    def get_rule_inbound_interface_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for setting inbound interface group."""
        return self._rule(chain, rule_number, "inbound-interface", "group", group)

    def get_rule_inbound_interface_group_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for inbound interface group (for deletion)."""
        return self._rule(chain, rule_number, "inbound-interface", "group")

    def get_rule_outbound_interface(self, chain: str, rule_number: int, interface: str) -> List[str]:
        """Get command path for setting outbound interface."""
        return self._rule(chain, rule_number, "outbound-interface", "name", interface)

    def get_rule_outbound_interface_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for outbound interface (for deletion)."""
        return self._rule(chain, rule_number, "outbound-interface", "name")

    def get_rule_outbound_interface_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for setting outbound interface group."""
        return self._rule(chain, rule_number, "outbound-interface", "group", group)

    def get_rule_outbound_interface_group_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for outbound interface group (for deletion)."""
        return self._rule(chain, rule_number, "outbound-interface", "group")

    # ========================================================================
    # Rule Properties - Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> List[str]:
        """Get command path for setting ethernet type (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ethernet-type", eth_type)

    def get_rule_ethernet_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for ethernet type (for deletion) (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ethernet-type")

    # ========================================================================
    # Rule Properties - Jump Target
    # ========================================================================

    def get_rule_jump_target(self, chain: str, rule_number: int, target: str) -> List[str]:
        """Get command path for setting jump target."""
        return self._rule(chain, rule_number, "jump-target", target)

    def get_rule_jump_target_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for jump target (for deletion)."""
        return self._rule(chain, rule_number, "jump-target")

    # ========================================================================
    # Rule Properties - Protocol (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_protocol(self, chain: str, rule_number: int, protocol: str) -> List[str]:
        """Get command path for setting protocol (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "protocol", protocol)

    def get_rule_protocol_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for protocol (for deletion)."""
        return self._rule(chain, rule_number, "protocol")

    # ========================================================================
    # Rule Properties - Source/Destination IP Address (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_source_address(self, chain: str, rule_number: int, address: str) -> List[str]:
        """Get command path for source IP address (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "address", address)

    def get_rule_source_address_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source address (for deletion)."""
        return self._rule(chain, rule_number, "source", "address")

    def get_rule_source_port(self, chain: str, rule_number: int, port: str) -> List[str]:
        """Get command path for source port (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "port", port)

    def get_rule_source_port_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for source port (for deletion)."""
        return self._rule(chain, rule_number, "source", "port")

    def get_rule_destination_address(self, chain: str, rule_number: int, address: str) -> List[str]:
        """Get command path for destination IP address (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "address", address)

    def get_rule_destination_address_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination address (for deletion)."""
        return self._rule(chain, rule_number, "destination", "address")

    def get_rule_destination_port(self, chain: str, rule_number: int, port: str) -> List[str]:
        """Get command path for destination port (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "port", port)

    def get_rule_destination_port_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for destination port (for deletion)."""
        return self._rule(chain, rule_number, "destination", "port")

    # ========================================================================
    # Rule Properties - Source/Destination Groups (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_source_group_address(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source address group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "group", "address-group", group)

    def get_rule_source_group_network(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source network group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "group", "network-group", group)

    def get_rule_source_group_port(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source port group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "group", "port-group", group)

    def get_rule_source_group_mac(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for source MAC group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "source", "group", "mac-group", group)

    def get_rule_destination_group_address(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination address group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "group", "address-group", group)

    def get_rule_destination_group_network(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination network group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "group", "network-group", group)

    def get_rule_destination_group_port(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination port group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "group", "port-group", group)

    def get_rule_destination_group_mac(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for destination MAC group (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "destination", "group", "mac-group", group)

    # ========================================================================
    # Rule Properties - ICMP (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_icmp_type(self, chain: str, rule_number: int, icmp_type: str) -> List[str]:
        """Get command path for ICMP type (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmp", "type", icmp_type)

    def get_rule_icmp_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for ICMP type (for deletion)."""
        return self._rule(chain, rule_number, "icmp", "type")

    def get_rule_icmp_code(self, chain: str, rule_number: int, code: str) -> List[str]:
        """Get command path for ICMP code (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmp", "code", code)

    def get_rule_icmp_code_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_icmp_code."""
        return self._rule(chain, rule_number, "icmp", "code")

    def get_rule_icmp_type_name(self, chain: str, rule_number: int, type_name: str) -> List[str]:
        """Get command path for ICMP type-name (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmp", "type-name", type_name)

    def get_rule_icmp_type_name_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_icmp_type_name."""
        return self._rule(chain, rule_number, "icmp", "type-name")

    def get_rule_icmpv6_type(self, chain: str, rule_number: int, icmp_type: str) -> List[str]:
        """Get command path for ICMPv6 type (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmpv6", "type", icmp_type)

    def get_rule_icmpv6_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_icmpv6_type."""
        return self._rule(chain, rule_number, "icmpv6", "type")

    def get_rule_icmpv6_code(self, chain: str, rule_number: int, code: str) -> List[str]:
        """Get command path for ICMPv6 code (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmpv6", "code", code)

    def get_rule_icmpv6_code_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_icmpv6_code."""
        return self._rule(chain, rule_number, "icmpv6", "code")

    def get_rule_icmpv6_type_name(self, chain: str, rule_number: int, type_name: str) -> List[str]:
        """Get command path for ICMPv6 type-name (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "icmpv6", "type-name", type_name)

    def get_rule_icmpv6_type_name_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_icmpv6_type_name."""
        return self._rule(chain, rule_number, "icmpv6", "type-name")

    # ========================================================================
    # Rule Properties - TCP Flags (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_tcp_flags(self, chain: str, rule_number: int, flag: str) -> List[str]:
        """Get command path for TCP flag (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "tcp", "flags", flag)

    def get_rule_tcp_flags_not(self, chain: str, rule_number: int, flag: str) -> List[str]:
        """Get command path for TCP flag negation (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "tcp", "flags", "not", flag)

    def get_rule_tcp_mss(self, chain: str, rule_number: int, mss: str) -> List[str]:
        """Get command path for TCP MSS matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "tcp", "mss", mss)

    def get_rule_tcp_mss_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_tcp_mss."""
        return self._rule(chain, rule_number, "tcp", "mss")

    # ========================================================================
    # Rule Properties - Rate Limiting (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_limit_rate(self, chain: str, rule_number: int, rate: str) -> List[str]:
        """Get command path for rate limit (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "limit", "rate", rate)

    def get_rule_limit_rate_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_limit_rate."""
        return self._rule(chain, rule_number, "limit", "rate")

    def get_rule_limit_burst(self, chain: str, rule_number: int, burst: str) -> List[str]:
        """Get command path for rate limit burst (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "limit", "burst", burst)

    def get_rule_limit_burst_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_limit_burst."""
        return self._rule(chain, rule_number, "limit", "burst")

    def get_rule_limit_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for limit (for deletion)."""
        return self._rule(chain, rule_number, "limit")

    # ========================================================================
    # Rule Properties - Log Options (both labs)
    # ========================================================================

    def get_rule_log_options_level(self, chain: str, rule_number: int, level: str) -> List[str]:
        """Get command path for log level. Both labs have this leaf."""
        return self._rule(chain, rule_number, "log-options", "level", level)

    def get_rule_log_options_level_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_log_options_level."""
        return self._rule(chain, rule_number, "log-options", "level")

    def get_rule_log_options_group(self, chain: str, rule_number: int, group: str) -> List[str]:
        """Get command path for log group. Both labs have this leaf."""
        return self._rule(chain, rule_number, "log-options", "group", group)

    def get_rule_log_options_group_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_log_options_group."""
        return self._rule(chain, rule_number, "log-options", "group")

    def get_rule_log_options_queue_threshold(self, chain: str, rule_number: int, value: str) -> List[str]:
        """log-options queue-threshold. Both labs have this leaf."""
        return self._rule(chain, rule_number, "log-options", "queue-threshold", value)

    def get_rule_log_options_queue_threshold_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_log_options_queue_threshold."""
        return self._rule(chain, rule_number, "log-options", "queue-threshold")

    def get_rule_log_options_snapshot_length(self, chain: str, rule_number: int, value: str) -> List[str]:
        """log-options snapshot-length. Both labs have this leaf."""
        return self._rule(chain, rule_number, "log-options", "snapshot-length", value)

    def get_rule_log_options_snapshot_length_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_log_options_snapshot_length."""
        return self._rule(chain, rule_number, "log-options", "snapshot-length")

    def get_rule_log_options_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for log-options (for deletion)."""
        return self._rule(chain, rule_number, "log-options")

    # ========================================================================
    # Rule Properties - Mark Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for firewall mark matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "mark", mark)

    def get_rule_mark_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for mark (for deletion)."""
        return self._rule(chain, rule_number, "mark")

    def get_rule_connection_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for connection mark matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "connection-mark", mark)

    # ========================================================================
    # Rule Properties - DSCP Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_dscp(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for DSCP matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "dscp", dscp)

    def get_rule_dscp_exclude(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for DSCP exclusion matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "dscp-exclude", dscp)

    # ========================================================================
    # Rule Properties - Fragment Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_fragment_match_frag(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for fragment matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "fragment", "match-frag")

    def get_rule_fragment_match_non_frag(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-fragment matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "fragment", "match-non-frag")

    # ========================================================================
    # Rule Properties - IPsec Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for IPsec inbound matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ipsec", "match-ipsec-in")

    def get_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for IPsec outbound matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ipsec", "match-ipsec-out")

    def get_rule_ipsec_match_none_in(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-IPsec inbound matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ipsec", "match-none-in")

    def get_rule_ipsec_match_none_out(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for non-IPsec outbound matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ipsec", "match-none-out")

    # ========================================================================
    # Rule Properties - TTL/Hop-Limit Matching (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_ttl_eq(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL equal matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ttl", "eq", value)

    def get_rule_ttl_eq_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_ttl_eq."""
        return self._rule(chain, rule_number, "ttl", "eq")

    def get_rule_ttl_gt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL greater-than matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ttl", "gt", value)

    def get_rule_ttl_gt_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_ttl_gt."""
        return self._rule(chain, rule_number, "ttl", "gt")

    def get_rule_ttl_lt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for TTL less-than matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "ttl", "lt", value)

    def get_rule_ttl_lt_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_ttl_lt."""
        return self._rule(chain, rule_number, "ttl", "lt")

    def get_rule_hop_limit_eq(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit equal matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "hop-limit", "eq", value)

    def get_rule_hop_limit_eq_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_hop_limit_eq."""
        return self._rule(chain, rule_number, "hop-limit", "eq")

    def get_rule_hop_limit_gt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit greater-than matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "hop-limit", "gt", value)

    def get_rule_hop_limit_gt_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_hop_limit_gt."""
        return self._rule(chain, rule_number, "hop-limit", "gt")

    def get_rule_hop_limit_lt(self, chain: str, rule_number: int, value: str) -> List[str]:
        """Get command path for hop-limit less-than matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "hop-limit", "lt", value)

    def get_rule_hop_limit_lt_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_hop_limit_lt."""
        return self._rule(chain, rule_number, "hop-limit", "lt")

    # ========================================================================
    # Rule Properties - Packet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_packet_type(self, chain: str, rule_number: int, pkt_type: str) -> List[str]:
        """Get command path for packet type matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "packet-type", pkt_type)

    def get_rule_packet_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_packet_type."""
        return self._rule(chain, rule_number, "packet-type")

    def get_rule_packet_length(self, chain: str, rule_number: int, length: str) -> List[str]:
        """Get command path for packet length matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "packet-length", length)

    # ========================================================================
    # Rule Properties - Time-based (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_time_startdate(self, chain: str, rule_number: int, date: str) -> List[str]:
        """Get command path for time start date (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "time", "startdate", date)

    def get_rule_time_startdate_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_time_startdate."""
        return self._rule(chain, rule_number, "time", "startdate")

    def get_rule_time_stopdate(self, chain: str, rule_number: int, date: str) -> List[str]:
        """Get command path for time stop date (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "time", "stopdate", date)

    def get_rule_time_stopdate_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_time_stopdate."""
        return self._rule(chain, rule_number, "time", "stopdate")

    def get_rule_time_starttime(self, chain: str, rule_number: int, time: str) -> List[str]:
        """Get command path for time start time (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "time", "starttime", time)

    def get_rule_time_starttime_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_time_starttime."""
        return self._rule(chain, rule_number, "time", "starttime")

    def get_rule_time_stoptime(self, chain: str, rule_number: int, time: str) -> List[str]:
        """Get command path for time stop time (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "time", "stoptime", time)

    def get_rule_time_stoptime_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_time_stoptime."""
        return self._rule(chain, rule_number, "time", "stoptime")

    def get_rule_time_weekdays(self, chain: str, rule_number: int, weekdays: str) -> List[str]:
        """Get command path for time weekdays (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "time", "weekdays", weekdays)

    def get_rule_time_weekdays_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_time_weekdays."""
        return self._rule(chain, rule_number, "time", "weekdays")

    def get_rule_time_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for time (for deletion)."""
        return self._rule(chain, rule_number, "time")

    # ========================================================================
    # Rule Properties - Queue Action (both labs)
    # ========================================================================

    def get_rule_queue(self, chain: str, rule_number: int, queue: str) -> List[str]:
        """Get command path for queue target. Both labs have this leaf."""
        return self._rule(chain, rule_number, "queue", queue)

    def get_rule_queue_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_queue."""
        return self._rule(chain, rule_number, "queue")

    # ========================================================================
    # Rule Properties - VLAN Ethernet Type (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_vlan_ethernet_type(self, chain: str, rule_number: int, eth_type: str) -> List[str]:
        """Get command path for VLAN ethernet type matching (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "vlan", "ethernet-type", eth_type)

    def get_rule_vlan_ethernet_type_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_vlan_ethernet_type."""
        return self._rule(chain, rule_number, "vlan", "ethernet-type")

    # ========================================================================
    # Rule Properties - Packet Modifications (VyOS 1.5+ only)
    # ========================================================================

    def get_rule_set_dscp(self, chain: str, rule_number: int, dscp: str) -> List[str]:
        """Get command path for setting DSCP value (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "dscp", dscp)

    def get_rule_set_dscp_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for DSCP (for deletion) (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "dscp")

    def get_rule_set_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for setting packet mark (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "mark", mark)

    def get_rule_set_mark_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for packet mark (for deletion) (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "mark")

    def get_rule_set_connection_mark(self, chain: str, rule_number: int, mark: str) -> List[str]:
        """Get command path for setting connection mark (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "connection-mark", mark)

    def get_rule_set_connection_mark_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_set_connection_mark."""
        return self._rule(chain, rule_number, "set", "connection-mark")

    def get_rule_set_ttl(self, chain: str, rule_number: int, ttl: str) -> List[str]:
        """Get command path for setting TTL (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "ttl", ttl)

    def get_rule_set_ttl_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_set_ttl."""
        return self._rule(chain, rule_number, "set", "ttl")

    def get_rule_set_hop_limit(self, chain: str, rule_number: int, hop_limit: str) -> List[str]:
        """Get command path for setting hop-limit (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "hop-limit", hop_limit)

    def get_rule_set_hop_limit_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_set_hop_limit."""
        return self._rule(chain, rule_number, "set", "hop-limit")

    def get_rule_set_tcp_mss(self, chain: str, rule_number: int, mss: str) -> List[str]:
        """Get command path for setting TCP MSS (VyOS 1.5+ only)."""
        return self._rule(chain, rule_number, "set", "tcp-mss", mss)

    def get_rule_set_tcp_mss_path(self, chain: str, rule_number: int) -> List[str]:
        """Delete path for rule_set_tcp_mss."""
        return self._rule(chain, rule_number, "set", "tcp-mss")

    def get_rule_set_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for entire set node (for deletion)."""
        return self._rule(chain, rule_number, "set")

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
