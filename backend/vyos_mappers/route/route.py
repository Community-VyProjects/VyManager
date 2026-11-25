"""Policy route command mapper.

One class holds the ``policy route`` / ``policy route6`` commands both VyOS
versions have. Source/destination ``geoip``, ``tcp mss`` and ``set vrf``
exist only on 1.5; those paths live on
``route_versions.v1_5.RouteMapperV1_5``. The IPsec match leaves and the
``limit rate`` format differ by version and are value lists here.

``icmp`` and ``ttl`` exist only under ``route``; ``icmpv6`` and
``hop-limit`` only under ``route6``.
"""

from typing import Any, Dict, FrozenSet, List, Optional, Tuple

from ..base import BaseFeatureMapper

FAMILIES = ("route", "route6")

# Lab `allowed:` lines, the same on 1.4 and 1.5.
RULE_ACTIONS = ("accept", "reject", "return", "drop")
PACKET_TYPES = ("broadcast", "host", "multicast", "other")
STATES = ("established", "invalid", "new", "related")
FRAGMENTS = ("match-frag", "match-non-frag")
TCP_FLAGS = ("ack", "cwr", "ecn", "fin", "psh", "rst", "syn", "urg")
COMPARE_OPS = ("eq", "gt", "lt")
# `time weekdays` is one comma-separated value; both labs commit full day
# names (1.4 rejects "Mon").
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
# `protocol` completes from /etc/protocols (the same list on both labs) minus
# "ethernet" and "mptcp", which the ip-protocol validator rejects; the
# validator also takes "all", "tcp_udp" and "icmpv6" (an icmpv6 match in
# route6 commits only with protocol icmpv6, not ipv6-icmp or 58).
PROTOCOLS = (
    "all", "tcp_udp", "icmpv6", "ip", "hopopt", "icmp", "igmp", "ggp", "ipencap", "st", "tcp", "egp", "igp",
    "pup", "udp", "hmp", "xns-idp", "rdp", "iso-tp4", "dccp", "xtp", "ddp", "idpr-cmtp", "ipv6",
    "ipv6-route", "ipv6-frag", "idrp", "rsvp", "gre", "esp", "ah", "skip", "ipv6-icmp",
    "ipv6-nonxt", "ipv6-opts", "rspf", "vmtp", "eigrp", "ospf", "ax.25", "ipip", "etherip",
    "encap", "pim", "ipcomp", "vrrp", "l2tp", "isis", "sctp", "fc", "mobility-header", "udplite",
    "mpls-in-ip", "manet", "hip", "shim6", "wesp", "rohc",
)
ICMP_TYPE_NAMES = (
    "echo-reply", "destination-unreachable", "source-quench", "redirect", "echo-request",
    "router-advertisement", "router-solicitation", "time-exceeded", "parameter-problem",
    "timestamp-request", "timestamp-reply", "info-request", "info-reply", "address-mask-request",
    "address-mask-reply",
)
# icmpv6 type `allowed:`; the lab entry "TOS host-redirect" holds a space and
# cannot be one value, so it is left out.
ICMPV6_TYPES = (
    "any", "echo-reply", "pong", "destination-unreachable", "network-unreachable",
    "host-unreachable", "protocol-unreachable", "port-unreachable", "fragmentation-needed",
    "source-route-failed", "network-unknown", "host-unknown", "network-prohibited",
    "host-prohibited", "TOS-network-unreachable", "TOS-host-unreachable",
    "communication-prohibited", "host-precedence-violation", "precedence-cutoff", "source-quench",
    "redirect", "network-redirect", "host-redirect", "TOS-network-redirect", "echo-request",
    "ping", "router-advertisement", "router-solicitation", "time-exceeded", "ttl-exceeded",
    "ttl-zero-during-transit", "ttl-zero-during-reassembly", "parameter-problem", "ip-header-bad",
    "required-option-missing", "timestamp-request", "timestamp-reply", "address-mask-request",
    "address-mask-reply", "packet-too-big",
)
IPSEC_LEAVES = ("match-ipsec", "match-none")


class RouteMapper(BaseFeatureMapper):
    """Policy route paths shared by VyOS 1.4 and 1.5."""

    # Version-only CLI node -> every path method under it (on the subclass).
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        "geoip": (
            "get_match_source_geoip_path",
            "get_match_source_geoip_country_code",
            "get_match_source_geoip_asn",
            "get_match_source_geoip_inverse",
            "get_match_destination_geoip_path",
            "get_match_destination_geoip_country_code",
            "get_match_destination_geoip_asn",
            "get_match_destination_geoip_inverse",
        ),
        "tcp mss": (
            "get_match_tcp_mss",
            "get_match_tcp_mss_path",
        ),
        "set vrf": (
            "get_set_vrf",
            "get_set_vrf_path",
        ),
    }

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Policy route nodes only some VyOS versions have.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"policy route {node} is not supported on this device")

    # ========================================================================
    # Value lists
    # ========================================================================

    def rule_action_values(self) -> Tuple[str, ...]:
        return RULE_ACTIONS

    def packet_type_values(self) -> Tuple[str, ...]:
        return PACKET_TYPES

    def state_values(self) -> Tuple[str, ...]:
        return STATES

    def fragment_values(self) -> Tuple[str, ...]:
        return FRAGMENTS

    def weekday_values(self) -> Tuple[str, ...]:
        return WEEKDAYS

    def tcp_flag_values(self) -> Tuple[str, ...]:
        return TCP_FLAGS

    def compare_op_values(self) -> Tuple[str, ...]:
        """``ttl`` / ``hop-limit`` children."""
        return COMPARE_OPS

    def protocol_values(self) -> Tuple[str, ...]:
        return PROTOCOLS

    def icmp_type_name_values(self) -> Tuple[str, ...]:
        return ICMP_TYPE_NAMES

    def icmpv6_type_values(self) -> Tuple[str, ...]:
        return ICMPV6_TYPES

    def ipsec_values(self) -> Tuple[str, ...]:
        """1.4 ``ipsec`` children; 1.5 splits them by direction."""
        return IPSEC_LEAVES

    def limit_rate_units(self) -> Tuple[str, ...]:
        """1.4 ``limit rate`` is a plain number; 1.5 takes ``<n>/<unit>``."""
        return ()

    def geoip_country_codes(self) -> Tuple[str, ...]:
        """``geoip country-code`` exists only on 1.5."""
        return ()

    def _require_value(self, kind: str, value: str, allowed: Tuple[str, ...]) -> str:
        if value not in allowed:
            raise ValueError(f"policy route {kind} {value} is not supported on this device")
        return value

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_route_config

        return parse_route_config(self, full_config)

    def rule_trees(self, full_config: Dict[str, Any], policy_type: str, name: str) -> Optional[Dict[int, Any]]:
        """Raw rule subtrees of one policy (reorder), or None when the policy is absent."""
        from .config_parse import rule_trees

        self.get_policy_path(policy_type, name)
        return rule_trees(full_config, policy_type, name)

    def rule_tree_paths(self, policy_type: str, name: str, rule: str, tree: Any) -> List[List[str]]:
        """Set paths that recreate a rule from its config subtree (reorder)."""
        paths: List[List[str]] = []

        def walk(prefix: List[str], node: Any) -> None:
            if isinstance(node, dict):
                if not node and prefix:
                    paths.append(prefix)
                for key, child in node.items():
                    walk(prefix + [str(key)], child)
            elif isinstance(node, list):
                for item in node:
                    paths.append(prefix + [str(item)])
            elif node is not None:
                paths.append(prefix + [str(node)])

        base = self.get_rule_path(policy_type, name, rule)
        walk([], tree if isinstance(tree, dict) else {})
        return [base] + [base + path for path in paths]

    # ========================================================================
    # Policy
    # ========================================================================

    def get_policy_path(self, policy_type: str, name: str) -> List[str]:
        if policy_type not in FAMILIES:
            raise ValueError(f"policy {policy_type} is not a policy route family")
        return ["policy", policy_type, name]

    def get_policy_description(self, policy_type: str, name: str, value: str) -> List[str]:
        return self.get_policy_path(policy_type, name) + ["description", value]

    def get_policy_description_path(self, policy_type: str, name: str) -> List[str]:
        return self.get_policy_path(policy_type, name) + ["description"]

    def get_policy_default_log(self, policy_type: str, name: str) -> List[str]:
        """``default-log`` is a valueless flag; set and delete share the path."""
        return self.get_policy_path(policy_type, name) + ["default-log"]

    def get_interface_policy(self, policy_type: str, name: str, interface: str) -> List[str]:
        """One value of the ``multi:`` interface leaf (set or delete)."""
        return self.get_policy_path(policy_type, name) + ["interface", interface]

    # ========================================================================
    # Rule
    # ========================================================================

    def get_rule_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self.get_policy_path(policy_type, name) + ["rule", rule]

    def _rule(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(policy_type, name, rule)

    def _family_rule(self, policy_type: str, name: str, rule: str, family: str) -> List[str]:
        """Rule path for a leaf only one family has (icmp/ttl vs icmpv6/hop-limit)."""
        if policy_type != family:
            raise ValueError(f"this match is not available in policy {policy_type}")
        return self.get_rule_path(policy_type, name, rule)

    def get_rule_description(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["description", value]

    def get_rule_description_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["description"]

    def get_rule_disable(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["disable"]

    def get_rule_log(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["log"]

    def get_rule_action(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["action", value]

    def get_rule_action_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["action"]

    def get_match_source_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source"]

    def get_match_source_address(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "address", value]

    def get_match_source_address_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "address"]

    def get_match_source_mac_address(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "mac-address", value]

    def get_match_source_mac_address_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "mac-address"]

    def get_match_source_port(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "port", value]

    def get_match_source_port_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "port"]

    def get_match_source_group_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group"]

    def get_match_source_group_address(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "address-group", value]

    def get_match_source_group_address_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "address-group"]

    def get_match_source_group_domain(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "domain-group", value]

    def get_match_source_group_domain_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "domain-group"]

    def get_match_source_group_mac(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "mac-group", value]

    def get_match_source_group_mac_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "mac-group"]

    def get_match_source_group_network(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "network-group", value]

    def get_match_source_group_network_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "network-group"]

    def get_match_source_group_port(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "port-group", value]

    def get_match_source_group_port_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "group", "port-group"]

    def get_match_destination_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination"]

    def get_match_destination_address(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "address", value]

    def get_match_destination_address_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "address"]

    def get_match_destination_port(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "port", value]

    def get_match_destination_port_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "port"]

    def get_match_destination_group_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group"]

    def get_match_destination_group_address(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "address-group", value]

    def get_match_destination_group_address_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "address-group"]

    def get_match_destination_group_domain(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "domain-group", value]

    def get_match_destination_group_domain_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "domain-group"]

    def get_match_destination_group_mac(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "mac-group", value]

    def get_match_destination_group_mac_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "mac-group"]

    def get_match_destination_group_network(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "network-group", value]

    def get_match_destination_group_network_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "network-group"]

    def get_match_destination_group_port(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "port-group", value]

    def get_match_destination_group_port_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "group", "port-group"]

    def get_match_protocol(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["protocol", value]

    def get_match_protocol_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["protocol"]

    def get_match_tcp_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["tcp"]

    def get_match_tcp_flags_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["tcp", "flags"]

    def get_match_tcp_flags_not_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["tcp", "flags", "not"]

    def get_match_icmp_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp"]

    def get_match_icmp_code(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "code", value]

    def get_match_icmp_code_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "code"]

    def get_match_icmp_type(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "type", value]

    def get_match_icmp_type_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "type"]

    def get_match_icmp_type_name(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "type-name", value]

    def get_match_icmp_type_name_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["icmp", "type-name"]

    def get_match_icmpv6_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route6") + ["icmpv6"]

    def get_match_icmpv6_type(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route6") + ["icmpv6", "type", value]

    def get_match_icmpv6_type_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route6") + ["icmpv6", "type"]

    def get_match_packet_type(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["packet-type", value]

    def get_match_packet_type_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["packet-type"]

    def get_match_packet_length(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["packet-length", value]

    def get_match_packet_length_exclude(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["packet-length-exclude", value]

    def get_match_dscp(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["dscp", value]

    def get_match_dscp_exclude(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["dscp-exclude", value]

    def get_match_state(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["state", value]

    def get_match_mark(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["mark", value]

    def get_match_mark_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["mark"]

    def get_match_connection_mark(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["connection-mark", value]

    def get_match_time_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time"]

    def get_match_time_monthdays(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "monthdays", value]

    def get_match_time_monthdays_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "monthdays"]

    def get_match_time_startdate(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "startdate", value]

    def get_match_time_startdate_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "startdate"]

    def get_match_time_starttime(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "starttime", value]

    def get_match_time_starttime_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "starttime"]

    def get_match_time_stopdate(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "stopdate", value]

    def get_match_time_stopdate_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "stopdate"]

    def get_match_time_stoptime(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "stoptime", value]

    def get_match_time_stoptime_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "stoptime"]

    def get_match_time_weekdays(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "weekdays", value]

    def get_match_time_weekdays_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "weekdays"]

    def get_match_time_utc(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["time", "utc"]

    def get_match_limit_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["limit"]

    def get_match_limit_burst(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["limit", "burst", value]

    def get_match_limit_burst_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["limit", "burst"]

    def get_match_limit_rate(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["limit", "rate", value]

    def get_match_limit_rate_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["limit", "rate"]

    def get_match_recent_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["recent"]

    def get_match_recent_count(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["recent", "count", value]

    def get_match_recent_count_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["recent", "count"]

    def get_match_recent_time(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["recent", "time", value]

    def get_match_recent_time_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["recent", "time"]

    def get_set_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set"]

    def get_set_connection_mark(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "connection-mark", value]

    def get_set_connection_mark_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "connection-mark"]

    def get_set_dscp(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "dscp", value]

    def get_set_dscp_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "dscp"]

    def get_set_mark(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "mark", value]

    def get_set_mark_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "mark"]

    def get_set_table(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "table", value]

    def get_set_table_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "table"]

    def get_set_tcp_mss(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "tcp-mss", value]

    def get_set_tcp_mss_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "tcp-mss"]

    # ========================================================================
    # Leaves named by a value list (flags under a node)
    # ========================================================================

    def get_match_tcp_flag(self, policy_type: str, name: str, rule: str, flag: str) -> List[str]:
        """``tcp flags <flag>``: a valueless flag; set and delete share the path."""
        flag = self._require_value("tcp flag", flag, self.tcp_flag_values())
        return self._rule(policy_type, name, rule) + ["tcp", "flags", flag]

    def get_match_tcp_flag_not(self, policy_type: str, name: str, rule: str, flag: str) -> List[str]:
        """``tcp flags not <flag>``: a valueless flag; set and delete share the path."""
        flag = self._require_value("tcp flag", flag, self.tcp_flag_values())
        return self._rule(policy_type, name, rule) + ["tcp", "flags", "not", flag]

    def get_match_fragment(self, policy_type: str, name: str, rule: str, leaf: str) -> List[str]:
        """A ``fragment`` child flag; set and delete share the path."""
        leaf = self._require_value("fragment", leaf, self.fragment_values())
        return self._rule(policy_type, name, rule) + ["fragment", leaf]

    def get_match_fragment_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["fragment"]

    def get_match_ipsec(self, policy_type: str, name: str, rule: str, leaf: str) -> List[str]:
        """An ``ipsec`` child flag; set and delete share the path."""
        leaf = self._require_value("ipsec", leaf, self.ipsec_values())
        return self._rule(policy_type, name, rule) + ["ipsec", leaf]

    def get_match_ipsec_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["ipsec"]

    def get_match_ttl(self, policy_type: str, name: str, rule: str, op: str, value: str) -> List[str]:
        op = self._require_value("ttl", op, self.compare_op_values())
        return self._family_rule(policy_type, name, rule, "route") + ["ttl", op, value]

    def get_match_ttl_path(self, policy_type: str, name: str, rule: str, op: str) -> List[str]:
        op = self._require_value("ttl", op, self.compare_op_values())
        return self._family_rule(policy_type, name, rule, "route") + ["ttl", op]

    def get_match_ttl_node_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route") + ["ttl"]

    def get_match_hop_limit(self, policy_type: str, name: str, rule: str, op: str, value: str) -> List[str]:
        op = self._require_value("hop-limit", op, self.compare_op_values())
        return self._family_rule(policy_type, name, rule, "route6") + ["hop-limit", op, value]

    def get_match_hop_limit_path(self, policy_type: str, name: str, rule: str, op: str) -> List[str]:
        op = self._require_value("hop-limit", op, self.compare_op_values())
        return self._family_rule(policy_type, name, rule, "route6") + ["hop-limit", op]

    def get_match_hop_limit_node_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._family_rule(policy_type, name, rule, "route6") + ["hop-limit"]
