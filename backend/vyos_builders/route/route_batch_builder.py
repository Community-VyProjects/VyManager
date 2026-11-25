"""
Policy Route Batch Builder

Provides all batch operations for policy route and route6 configuration.
The mapper allowlist (versioned_nodes) decides which version-only nodes this
device has; a 1.5-only op raises ValueError on 1.4, and so does a value a
value list does not hold.
"""

from typing import Any, Dict, List, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.route.route import RouteMapper

# Lab syntax bounds (the same on 1.4 and 1.5 unless the leaf is 1.5 only).
RANGES: Dict[str, Dict[str, int]] = {
    "rule": {"min": 1, "max": 999999},
    "ttl": {"min": 0, "max": 255},
    "icmp_code": {"min": 0, "max": 255},
    "icmp_type": {"min": 0, "max": 255},
    "packet_length": {"min": 1, "max": 65535},
    "dscp": {"min": 0, "max": 63},
    "mark": {"min": 0, "max": 2147483647},
    "connection_mark": {"min": 0, "max": 2147483647},
    "limit_burst": {"min": 0, "max": 4294967295},
    "limit_rate": {"min": 0, "max": 4294967295},
    "recent_count": {"min": 1, "max": 255},
    "recent_time": {"min": 0, "max": 4294967295},
    "tcp_mss": {"min": 1, "max": 16384},
    "geoip_asn": {"min": 1, "max": 4294967294},
    "set_connection_mark": {"min": 0, "max": 2147483647},
    "set_dscp": {"min": 0, "max": 63},
    "set_mark": {"min": 1, "max": 2147483647},
    "set_table": {"min": 1, "max": 200},
    "set_tcp_mss": {"min": 500, "max": 1460},
}
DESCRIPTION_MAX_LENGTH = 255


class RouteBatchBuilder(BatchBuilder):
    """Complete batch builder for policy route operations."""

    # Not a batch op: reorder calls it with a raw config subtree.
    _INTERNAL_BUILDER_METHODS = frozenset({"restore_rule"})

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "route"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> RouteMapper:
        return cast(RouteMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a node only one VyOS version has; ValueError elsewhere."""
        mapper = self._mapper()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Policy
    # ========================================================================

    def create_policy(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_policy_path(policy_type, name))

    def delete_policy(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_policy_path(policy_type, name))

    def set_policy_description(self, policy_type: str, name: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_policy_description(policy_type, name, value))

    def delete_policy_description(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_policy_description_path(policy_type, name))

    def set_policy_default_log(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_policy_default_log(policy_type, name))

    def delete_policy_default_log(self, policy_type: str, name: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_policy_default_log(policy_type, name))

    def set_interface_policy(self, policy_type: str, name: str, interface: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_interface_policy(policy_type, name, interface))

    def delete_interface_policy(self, policy_type: str, name: str, interface: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_interface_policy(policy_type, name, interface))

    # ========================================================================
    # Rule
    # ========================================================================

    def create_rule(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_rule_path(policy_type, name, rule))

    def delete_rule(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_rule_path(policy_type, name, rule))

    def restore_rule(self, policy_type: str, name: str, rule: str, tree: Any) -> "RouteBatchBuilder":
        """Recreate a rule under a new number from its config subtree (reorder)."""
        for path in self._mapper().rule_tree_paths(policy_type, name, rule, tree):
            self.add_set(path)
        return self

    # ========================================================================
    # Rule leaves
    # ========================================================================

    def set_rule_description(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_rule_description(policy_type, name, rule, value))

    def delete_rule_description(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_rule_description_path(policy_type, name, rule))

    def set_rule_disable(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_rule_disable(policy_type, name, rule))

    def delete_rule_disable(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_rule_disable(policy_type, name, rule))

    def set_rule_log(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_rule_log(policy_type, name, rule))

    def delete_rule_log(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_rule_log(policy_type, name, rule))

    def set_rule_action(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_rule_action(policy_type, name, rule, value))

    def delete_rule_action(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_rule_action_path(policy_type, name, rule))

    # ========================================================================
    # Match - source
    # ========================================================================

    def delete_match_source(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_path(policy_type, name, rule))

    def set_match_source_address(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_address(policy_type, name, rule, value))

    def delete_match_source_address(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_address_path(policy_type, name, rule))

    def set_match_source_mac_address(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_mac_address(policy_type, name, rule, value))

    def delete_match_source_mac_address(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_mac_address_path(policy_type, name, rule))

    def set_match_source_port(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_port(policy_type, name, rule, value))

    def delete_match_source_port(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_port_path(policy_type, name, rule))

    def delete_match_source_group(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_path(policy_type, name, rule))

    def set_match_source_group_address(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_group_address(policy_type, name, rule, value))

    def delete_match_source_group_address(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_address_path(policy_type, name, rule))

    def set_match_source_group_domain(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_group_domain(policy_type, name, rule, value))

    def delete_match_source_group_domain(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_domain_path(policy_type, name, rule))

    def set_match_source_group_mac(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_group_mac(policy_type, name, rule, value))

    def delete_match_source_group_mac(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_mac_path(policy_type, name, rule))

    def set_match_source_group_network(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_group_network(policy_type, name, rule, value))

    def delete_match_source_group_network(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_network_path(policy_type, name, rule))

    def set_match_source_group_port(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_source_group_port(policy_type, name, rule, value))

    def delete_match_source_group_port(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_source_group_port_path(policy_type, name, rule))

    def delete_match_source_geoip(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_source_geoip_path", policy_type, name, rule))

    def set_match_source_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_source_geoip_country_code", policy_type, name, rule, value))

    def delete_match_source_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_source_geoip_country_code", policy_type, name, rule, value))

    def set_match_source_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_source_geoip_asn", policy_type, name, rule, value))

    def delete_match_source_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_source_geoip_asn", policy_type, name, rule, value))

    def set_match_source_geoip_inverse(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_source_geoip_inverse", policy_type, name, rule))

    def delete_match_source_geoip_inverse(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_source_geoip_inverse", policy_type, name, rule))

    # ========================================================================
    # Match - destination
    # ========================================================================

    def delete_match_destination(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_path(policy_type, name, rule))

    def set_match_destination_address(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_address(policy_type, name, rule, value))

    def delete_match_destination_address(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_address_path(policy_type, name, rule))

    def set_match_destination_port(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_port(policy_type, name, rule, value))

    def delete_match_destination_port(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_port_path(policy_type, name, rule))

    def delete_match_destination_group(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_path(policy_type, name, rule))

    def set_match_destination_group_address(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_group_address(policy_type, name, rule, value))

    def delete_match_destination_group_address(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_address_path(policy_type, name, rule))

    def set_match_destination_group_domain(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_group_domain(policy_type, name, rule, value))

    def delete_match_destination_group_domain(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_domain_path(policy_type, name, rule))

    def set_match_destination_group_mac(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_group_mac(policy_type, name, rule, value))

    def delete_match_destination_group_mac(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_mac_path(policy_type, name, rule))

    def set_match_destination_group_network(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_group_network(policy_type, name, rule, value))

    def delete_match_destination_group_network(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_network_path(policy_type, name, rule))

    def set_match_destination_group_port(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_destination_group_port(policy_type, name, rule, value))

    def delete_match_destination_group_port(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_destination_group_port_path(policy_type, name, rule))

    def delete_match_destination_geoip(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_destination_geoip_path", policy_type, name, rule))

    def set_match_destination_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_destination_geoip_country_code", policy_type, name, rule, value))

    def delete_match_destination_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_destination_geoip_country_code", policy_type, name, rule, value))

    def set_match_destination_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_destination_geoip_asn", policy_type, name, rule, value))

    def delete_match_destination_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_destination_geoip_asn", policy_type, name, rule, value))

    def set_match_destination_geoip_inverse(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("geoip", "get_match_destination_geoip_inverse", policy_type, name, rule))

    def delete_match_destination_geoip_inverse(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("geoip", "get_match_destination_geoip_inverse", policy_type, name, rule))

    # ========================================================================
    # Match - protocol and TCP
    # ========================================================================

    def set_match_protocol(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_protocol(policy_type, name, rule, value))

    def delete_match_protocol(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_protocol_path(policy_type, name, rule))

    def delete_match_tcp(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_tcp_path(policy_type, name, rule))

    def delete_match_tcp_flags(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_tcp_flags_path(policy_type, name, rule))

    def delete_match_tcp_flags_not(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_tcp_flags_not_path(policy_type, name, rule))

    def set_match_tcp_mss(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("tcp mss", "get_match_tcp_mss", policy_type, name, rule, value))

    def delete_match_tcp_mss(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("tcp mss", "get_match_tcp_mss_path", policy_type, name, rule))

    def set_match_tcp_flag(self, policy_type: str, name: str, rule: str, flag: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_tcp_flag(policy_type, name, rule, flag))

    def delete_match_tcp_flag(self, policy_type: str, name: str, rule: str, flag: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_tcp_flag(policy_type, name, rule, flag))

    def set_match_tcp_flag_not(self, policy_type: str, name: str, rule: str, flag: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_tcp_flag_not(policy_type, name, rule, flag))

    def delete_match_tcp_flag_not(self, policy_type: str, name: str, rule: str, flag: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_tcp_flag_not(policy_type, name, rule, flag))

    # ========================================================================
    # Match - ICMP (route) and ICMPv6 (route6)
    # ========================================================================

    def delete_match_icmp(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmp_path(policy_type, name, rule))

    def set_match_icmp_code(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_icmp_code(policy_type, name, rule, value))

    def delete_match_icmp_code(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmp_code_path(policy_type, name, rule))

    def set_match_icmp_type(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_icmp_type(policy_type, name, rule, value))

    def delete_match_icmp_type(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmp_type_path(policy_type, name, rule))

    def set_match_icmp_type_name(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_icmp_type_name(policy_type, name, rule, value))

    def delete_match_icmp_type_name(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmp_type_name_path(policy_type, name, rule))

    def delete_match_icmpv6(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmpv6_path(policy_type, name, rule))

    def set_match_icmpv6_type(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_icmpv6_type(policy_type, name, rule, value))

    def delete_match_icmpv6_type(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_icmpv6_type_path(policy_type, name, rule))

    def set_match_ttl(self, policy_type: str, name: str, rule: str, op: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_ttl(policy_type, name, rule, op, value))

    def delete_match_ttl(self, policy_type: str, name: str, rule: str, op: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_ttl_path(policy_type, name, rule, op))

    def delete_match_ttl_node(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_ttl_node_path(policy_type, name, rule))

    def set_match_hop_limit(self, policy_type: str, name: str, rule: str, op: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_hop_limit(policy_type, name, rule, op, value))

    def delete_match_hop_limit(self, policy_type: str, name: str, rule: str, op: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_hop_limit_path(policy_type, name, rule, op))

    def delete_match_hop_limit_node(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_hop_limit_node_path(policy_type, name, rule))

    # ========================================================================
    # Match - packet, DSCP, state and marks
    # ========================================================================

    def set_match_packet_type(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_packet_type(policy_type, name, rule, value))

    def delete_match_packet_type(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_packet_type_path(policy_type, name, rule))

    def set_match_fragment(self, policy_type: str, name: str, rule: str, leaf: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_fragment(policy_type, name, rule, leaf))

    def delete_match_fragment(self, policy_type: str, name: str, rule: str, leaf: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_fragment(policy_type, name, rule, leaf))

    def delete_match_fragment_node(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_fragment_path(policy_type, name, rule))

    def set_match_ipsec(self, policy_type: str, name: str, rule: str, leaf: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_ipsec(policy_type, name, rule, leaf))

    def delete_match_ipsec(self, policy_type: str, name: str, rule: str, leaf: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_ipsec(policy_type, name, rule, leaf))

    def delete_match_ipsec_node(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_ipsec_path(policy_type, name, rule))

    def set_match_packet_length(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_packet_length(policy_type, name, rule, value))

    def delete_match_packet_length(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_packet_length(policy_type, name, rule, value))

    def set_match_packet_length_exclude(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_packet_length_exclude(policy_type, name, rule, value))

    def delete_match_packet_length_exclude(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_packet_length_exclude(policy_type, name, rule, value))

    def set_match_dscp(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_dscp(policy_type, name, rule, value))

    def delete_match_dscp(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_dscp(policy_type, name, rule, value))

    def set_match_dscp_exclude(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_dscp_exclude(policy_type, name, rule, value))

    def delete_match_dscp_exclude(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_dscp_exclude(policy_type, name, rule, value))

    def set_match_state(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_state(policy_type, name, rule, value))

    def delete_match_state(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_state(policy_type, name, rule, value))

    def set_match_mark(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_mark(policy_type, name, rule, value))

    def delete_match_mark(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_mark_path(policy_type, name, rule))

    def set_match_connection_mark(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_connection_mark(policy_type, name, rule, value))

    def delete_match_connection_mark(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_connection_mark(policy_type, name, rule, value))

    # ========================================================================
    # Match - time
    # ========================================================================

    def delete_match_time(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_path(policy_type, name, rule))

    def set_match_time_monthdays(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_monthdays(policy_type, name, rule, value))

    def delete_match_time_monthdays(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_monthdays_path(policy_type, name, rule))

    def set_match_time_startdate(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_startdate(policy_type, name, rule, value))

    def delete_match_time_startdate(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_startdate_path(policy_type, name, rule))

    def set_match_time_starttime(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_starttime(policy_type, name, rule, value))

    def delete_match_time_starttime(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_starttime_path(policy_type, name, rule))

    def set_match_time_stopdate(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_stopdate(policy_type, name, rule, value))

    def delete_match_time_stopdate(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_stopdate_path(policy_type, name, rule))

    def set_match_time_stoptime(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_stoptime(policy_type, name, rule, value))

    def delete_match_time_stoptime(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_stoptime_path(policy_type, name, rule))

    def set_match_time_weekdays(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_weekdays(policy_type, name, rule, value))

    def delete_match_time_weekdays(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_weekdays_path(policy_type, name, rule))

    def set_match_time_utc(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_time_utc(policy_type, name, rule))

    def delete_match_time_utc(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_time_utc(policy_type, name, rule))

    # ========================================================================
    # Match - rate limiting
    # ========================================================================

    def delete_match_limit(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_limit_path(policy_type, name, rule))

    def set_match_limit_burst(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_limit_burst(policy_type, name, rule, value))

    def delete_match_limit_burst(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_limit_burst_path(policy_type, name, rule))

    def set_match_limit_rate(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_limit_rate(policy_type, name, rule, value))

    def delete_match_limit_rate(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_limit_rate_path(policy_type, name, rule))

    def delete_match_recent(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_recent_path(policy_type, name, rule))

    def set_match_recent_count(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_recent_count(policy_type, name, rule, value))

    def delete_match_recent_count(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_recent_count_path(policy_type, name, rule))

    def set_match_recent_time(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_match_recent_time(policy_type, name, rule, value))

    def delete_match_recent_time(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_match_recent_time_path(policy_type, name, rule))

    # ========================================================================
    # Set actions
    # ========================================================================

    def delete_set(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_path(policy_type, name, rule))

    def set_connection_mark(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_set_connection_mark(policy_type, name, rule, value))

    def delete_connection_mark(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_connection_mark_path(policy_type, name, rule))

    def set_dscp(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_set_dscp(policy_type, name, rule, value))

    def delete_dscp(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_dscp_path(policy_type, name, rule))

    def set_mark(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_set_mark(policy_type, name, rule, value))

    def delete_mark(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_mark_path(policy_type, name, rule))

    def set_table(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_set_table(policy_type, name, rule, value))

    def delete_table(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_table_path(policy_type, name, rule))

    def set_tcp_mss(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._mapper().get_set_tcp_mss(policy_type, name, rule, value))

    def delete_tcp_mss(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._mapper().get_set_tcp_mss_path(policy_type, name, rule))

    def set_vrf(self, policy_type: str, name: str, rule: str, value: str) -> "RouteBatchBuilder":
        return self.add_set(self._versioned_path("set vrf", "get_set_vrf", policy_type, name, rule, value))

    def delete_vrf(self, policy_type: str, name: str, rule: str) -> "RouteBatchBuilder":
        return self.add_delete(self._versioned_path("set vrf", "get_set_vrf_path", policy_type, name, rule))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        mapper = self._mapper()
        nodes = mapper.versioned_nodes()

        return {
            "version": self.version,
            "features": {
                "ipv4_policy_route": {"supported": True},
                "ipv6_policy_route": {"supported": True},
                "geoip_matching": {
                    "supported": "geoip" in nodes,
                    "country_codes": list(mapper.geoip_country_codes()),
                },
                "tcp_mss_matching": {"supported": "tcp mss" in nodes},
                "vrf_routing": {"supported": "set vrf" in nodes},
                "ipsec_matching": {"supported": True, "values": list(mapper.ipsec_values())},
                "limit_rate": {"supported": True, "units": list(mapper.limit_rate_units())},
            },
            "values": {
                "rule_actions": list(mapper.rule_action_values()),
                "packet_types": list(mapper.packet_type_values()),
                "states": list(mapper.state_values()),
                "fragments": list(mapper.fragment_values()),
                "weekdays": list(mapper.weekday_values()),
                "tcp_flags": list(mapper.tcp_flag_values()),
                "compare_ops": list(mapper.compare_op_values()),
                "protocols": list(mapper.protocol_values()),
                "icmp_type_names": list(mapper.icmp_type_name_values()),
                "icmpv6_types": list(mapper.icmpv6_type_values()),
            },
            "ranges": RANGES,
            "description_max_length": DESCRIPTION_MAX_LENGTH,
        }
