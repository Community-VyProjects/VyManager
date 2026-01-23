"""
Route Map Command Mapper

Handles command path generation for route-map configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class RouteMapMapper(BaseFeatureMapper):
    """Base mapper with common operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Core Route Map Paths
    # ========================================================================

    def get_route_map_path(self, name: str) -> List[str]:
        """Get command path for route-map."""
        return ["policy", "route-map", name]

    def get_route_map_description(self, name: str, description: str) -> List[str]:
        """Get command path for route-map description."""
        return ["policy", "route-map", name, "description", description]

    # ========================================================================
    # Rule Paths
    # ========================================================================

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        """Get command path for rule."""
        return ["policy", "route-map", name, "rule", rule]

    def get_rule_description(self, name: str, rule: str, description: str) -> List[str]:
        """Get command path for rule description."""
        return ["policy", "route-map", name, "rule", rule, "description", description]

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        """Get command path for rule action (permit/deny)."""
        return ["policy", "route-map", name, "rule", rule, "action", action]

    def get_rule_call(self, name: str, rule: str, call_map: str) -> List[str]:
        """Get command path for calling another route-map."""
        return ["policy", "route-map", name, "rule", rule, "call", call_map]

    def get_rule_continue(self, name: str, rule: str, continue_rule: str) -> List[str]:
        """Get command path for continue to another rule."""
        return ["policy", "route-map", name, "rule", rule, "continue", continue_rule]

    def get_rule_on_match_goto(self, name: str, rule: str, goto_rule: str) -> List[str]:
        """Get command path for on-match goto."""
        return ["policy", "route-map", name, "rule", rule, "on-match", "goto", goto_rule]

    def get_rule_on_match_next(self, name: str, rule: str) -> List[str]:
        """Get command path for on-match next."""
        return ["policy", "route-map", name, "rule", rule, "on-match", "next"]

    # ========================================================================
    # Match Conditions - BGP Attributes
    # ========================================================================

    def get_match_as_path(self, name: str, rule: str, as_path: str) -> List[str]:
        """Match BGP AS path list."""
        return ["policy", "route-map", name, "rule", rule, "match", "as-path", as_path]

    def get_match_community(self, name: str, rule: str, community: str) -> List[str]:
        """Match BGP community list."""
        return ["policy", "route-map", name, "rule", rule, "match", "community", "community-list", community]

    def get_match_community_exact_match(self, name: str, rule: str) -> List[str]:
        """Match BGP community exact match."""
        return ["policy", "route-map", name, "rule", rule, "match", "community", "exact-match"]

    def get_match_extcommunity(self, name: str, rule: str, extcommunity: str) -> List[str]:
        """Match BGP extended community list."""
        return ["policy", "route-map", name, "rule", rule, "match", "extcommunity", extcommunity]

    def get_match_large_community(self, name: str, rule: str, large_community: str) -> List[str]:
        """Match BGP large community list."""
        return ["policy", "route-map", name, "rule", rule, "match", "large-community", "large-community-list", large_community]

    def get_match_large_community_exact_match(self, name: str, rule: str) -> List[str]:
        """Match BGP large community exact match."""
        return ["policy", "route-map", name, "rule", rule, "match", "large-community", "exact-match"]

    def get_match_local_preference(self, name: str, rule: str, local_pref: str) -> List[str]:
        """Match BGP local preference."""
        return ["policy", "route-map", name, "rule", rule, "match", "local-preference", local_pref]

    def get_match_metric(self, name: str, rule: str, metric: str) -> List[str]:
        """Match metric."""
        return ["policy", "route-map", name, "rule", rule, "match", "metric", metric]

    def get_match_origin(self, name: str, rule: str, origin: str) -> List[str]:
        """Match BGP origin (egp/igp/incomplete)."""
        return ["policy", "route-map", name, "rule", rule, "match", "origin", origin]

    def get_match_peer(self, name: str, rule: str, peer: str) -> List[str]:
        """Match peer address."""
        return ["policy", "route-map", name, "rule", rule, "match", "peer", peer]

    def get_match_rpki(self, name: str, rule: str, rpki: str) -> List[str]:
        """Match RPKI validation state."""
        return ["policy", "route-map", name, "rule", rule, "match", "rpki", rpki]

    # ========================================================================
    # Match Conditions - IP/IPv6 Address
    # ========================================================================

    def get_match_ip_address_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        """Match IP address via access-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "address", "access-list", access_list]

    def get_match_ip_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        """Match IP address via prefix-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "address", "prefix-list", prefix_list]

    def get_match_ip_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        """Match IP address prefix length."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "address", "prefix-len", prefix_len]

    def get_match_ipv6_address_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        """Match IPv6 address via access-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "address", "access-list", access_list]

    def get_match_ipv6_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        """Match IPv6 address via prefix-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "address", "prefix-list", prefix_list]

    def get_match_ipv6_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        """Match IPv6 address prefix length."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "address", "prefix-len", prefix_len]

    # ========================================================================
    # Match Conditions - Next-Hop
    # ========================================================================

    def get_match_ip_nexthop_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        """Match IP next-hop via access-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "nexthop", "access-list", access_list]

    def get_match_ip_nexthop_address(self, name: str, rule: str, address: str) -> List[str]:
        """Match IP next-hop address."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "nexthop", "address", address]

    def get_match_ip_nexthop_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        """Match IP next-hop prefix length."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "nexthop", "prefix-len", prefix_len]

    def get_match_ip_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        """Match IP next-hop via prefix-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "nexthop", "prefix-list", prefix_list]

    def get_match_ip_nexthop_type(self, name: str, rule: str, nh_type: str) -> List[str]:
        """Match IP next-hop type."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "nexthop", "type", nh_type]

    def get_match_ipv6_nexthop_address(self, name: str, rule: str, address: str) -> List[str]:
        """Match IPv6 next-hop address."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "nexthop", "address", address]

    def get_match_ipv6_nexthop_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        """Match IPv6 next-hop via access-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "nexthop", "access-list", access_list]

    def get_match_ipv6_nexthop_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        """Match IPv6 next-hop prefix length."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "nexthop", "prefix-len", prefix_len]

    def get_match_ipv6_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        """Match IPv6 next-hop via prefix-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "nexthop", "prefix-list", prefix_list]

    def get_match_ipv6_nexthop_type(self, name: str, rule: str, nh_type: str) -> List[str]:
        """Match IPv6 next-hop type."""
        return ["policy", "route-map", name, "rule", rule, "match", "ipv6", "nexthop", "type", nh_type]

    # ========================================================================
    # Match Conditions - Route Source
    # ========================================================================

    def get_match_ip_route_source_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        """Match IP route source via access-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "route-source", "access-list", access_list]

    def get_match_ip_route_source_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        """Match IP route source via prefix-list."""
        return ["policy", "route-map", name, "rule", rule, "match", "ip", "route-source", "prefix-list", prefix_list]

    # ========================================================================
    # Match Conditions - Other
    # ========================================================================

    def get_match_interface(self, name: str, rule: str, interface: str) -> List[str]:
        """Match interface."""
        return ["policy", "route-map", name, "rule", rule, "match", "interface", interface]

    def get_match_protocol(self, name: str, rule: str, protocol: str) -> List[str]:
        """Match protocol."""
        return ["policy", "route-map", name, "rule", rule, "match", "protocol", protocol]

    def get_match_source_vrf(self, name: str, rule: str, vrf: str) -> List[str]:
        """Match source VRF."""
        return ["policy", "route-map", name, "rule", rule, "match", "source-vrf", vrf]

    def get_match_tag(self, name: str, rule: str, tag: str) -> List[str]:
        """Match tag."""
        return ["policy", "route-map", name, "rule", rule, "match", "tag", tag]

    # ========================================================================
    # Set Actions - BGP AS Path
    # ========================================================================

    def get_set_as_path_exclude(self, name: str, rule: str, as_path: str) -> List[str]:
        """Set AS path exclude."""
        return ["policy", "route-map", name, "rule", rule, "set", "as-path", "exclude", as_path]

    def get_set_as_path_prepend(self, name: str, rule: str, as_path: str) -> List[str]:
        """Set AS path prepend."""
        return ["policy", "route-map", name, "rule", rule, "set", "as-path", "prepend", as_path]

    def get_set_as_path_prepend_last_as(self, name: str, rule: str, count: str) -> List[str]:
        """Set AS path prepend last-as."""
        return ["policy", "route-map", name, "rule", rule, "set", "as-path", "prepend-last-as", count]

    # ========================================================================
    # Set Actions - BGP Communities
    # ========================================================================

    def get_set_community_add(self, name: str, rule: str, community: str) -> List[str]:
        """Set community add."""
        return ["policy", "route-map", name, "rule", rule, "set", "community", "add", community]

    def get_set_community_replace(self, name: str, rule: str, community: str) -> List[str]:
        """Set community replace."""
        return ["policy", "route-map", name, "rule", rule, "set", "community", "replace", community]

    def get_set_community_delete(self, name: str, rule: str, community: str) -> List[str]:
        """Set community delete."""
        return ["policy", "route-map", name, "rule", rule, "set", "community", "delete", community]

    def get_set_community_none(self, name: str, rule: str) -> List[str]:
        """Set community none."""
        return ["policy", "route-map", name, "rule", rule, "set", "community", "none"]

    def get_set_large_community_add(self, name: str, rule: str, community: str) -> List[str]:
        """Set large-community add."""
        return ["policy", "route-map", name, "rule", rule, "set", "large-community", "add", community]

    def get_set_large_community_replace(self, name: str, rule: str, community: str) -> List[str]:
        """Set large-community replace."""
        return ["policy", "route-map", name, "rule", rule, "set", "large-community", "replace", community]

    def get_set_large_community_delete(self, name: str, rule: str, community: str) -> List[str]:
        """Set large-community delete."""
        return ["policy", "route-map", name, "rule", rule, "set", "large-community", "delete", community]

    def get_set_large_community_none(self, name: str, rule: str) -> List[str]:
        """Set large-community none."""
        return ["policy", "route-map", name, "rule", rule, "set", "large-community", "none"]

    def get_set_extcommunity_bandwidth(self, name: str, rule: str, bandwidth: str) -> List[str]:
        """Set extcommunity bandwidth."""
        return ["policy", "route-map", name, "rule", rule, "set", "extcommunity", "bandwidth", bandwidth]

    def get_set_extcommunity_rt(self, name: str, rule: str, rt: str) -> List[str]:
        """Set extcommunity RT."""
        return ["policy", "route-map", name, "rule", rule, "set", "extcommunity", "rt", rt]

    def get_set_extcommunity_soo(self, name: str, rule: str, soo: str) -> List[str]:
        """Set extcommunity SOO."""
        return ["policy", "route-map", name, "rule", rule, "set", "extcommunity", "soo", soo]

    def get_set_extcommunity_none(self, name: str, rule: str) -> List[str]:
        """Set extcommunity none."""
        return ["policy", "route-map", name, "rule", rule, "set", "extcommunity", "none"]

    # ========================================================================
    # Set Actions - BGP Attributes
    # ========================================================================

    def get_set_atomic_aggregate(self, name: str, rule: str) -> List[str]:
        """Set atomic aggregate."""
        return ["policy", "route-map", name, "rule", rule, "set", "atomic-aggregate"]

    def get_set_aggregator_as(self, name: str, rule: str, as_number: str) -> List[str]:
        """Set aggregator AS."""
        return ["policy", "route-map", name, "rule", rule, "set", "aggregator", "as", as_number]

    def get_set_aggregator_ip(self, name: str, rule: str, ip: str) -> List[str]:
        """Set aggregator IP."""
        return ["policy", "route-map", name, "rule", rule, "set", "aggregator", "ip", ip]

    def get_set_local_preference(self, name: str, rule: str, local_pref: str) -> List[str]:
        """Set local preference."""
        return ["policy", "route-map", name, "rule", rule, "set", "local-preference", local_pref]

    def get_set_origin(self, name: str, rule: str, origin: str) -> List[str]:
        """Set origin."""
        return ["policy", "route-map", name, "rule", rule, "set", "origin", origin]

    def get_set_originator_id(self, name: str, rule: str, originator_id: str) -> List[str]:
        """Set originator ID."""
        return ["policy", "route-map", name, "rule", rule, "set", "originator-id", originator_id]

    def get_set_weight(self, name: str, rule: str, weight: str) -> List[str]:
        """Set weight."""
        return ["policy", "route-map", name, "rule", rule, "set", "weight", weight]

    # ========================================================================
    # Set Actions - Next-Hop
    # ========================================================================

    def get_set_ip_nexthop(self, name: str, rule: str, nexthop: str) -> List[str]:
        """Set IP next-hop."""
        return ["policy", "route-map", name, "rule", rule, "set", "ip-next-hop", nexthop]

    def get_set_ip_nexthop_peer_address(self, name: str, rule: str) -> List[str]:
        """Set IP next-hop to peer address."""
        return ["policy", "route-map", name, "rule", rule, "set", "ip-next-hop", "peer-address"]

    def get_set_ip_nexthop_unchanged(self, name: str, rule: str) -> List[str]:
        """Set IP next-hop unchanged."""
        return ["policy", "route-map", name, "rule", rule, "set", "ip-next-hop", "unchanged"]

    def get_set_ipv6_nexthop_global(self, name: str, rule: str, nexthop: str) -> List[str]:
        """Set IPv6 next-hop global."""
        return ["policy", "route-map", name, "rule", rule, "set", "ipv6-next-hop", "global", nexthop]

    def get_set_ipv6_nexthop_local(self, name: str, rule: str, nexthop: str) -> List[str]:
        """Set IPv6 next-hop local."""
        return ["policy", "route-map", name, "rule", rule, "set", "ipv6-next-hop", "local", nexthop]

    def get_set_ipv6_nexthop_peer_address(self, name: str, rule: str) -> List[str]:
        """Set IPv6 next-hop to peer address."""
        return ["policy", "route-map", name, "rule", rule, "set", "ipv6-next-hop", "peer-address"]

    def get_set_ipv6_nexthop_prefer_global(self, name: str, rule: str) -> List[str]:
        """Set IPv6 next-hop prefer global."""
        return ["policy", "route-map", name, "rule", rule, "set", "ipv6-next-hop", "prefer-global"]

    # ========================================================================
    # Set Actions - Route Properties
    # ========================================================================

    def get_set_distance(self, name: str, rule: str, distance: str) -> List[str]:
        """Set distance."""
        return ["policy", "route-map", name, "rule", rule, "set", "distance", distance]

    def get_set_metric(self, name: str, rule: str, metric: str) -> List[str]:
        """Set metric."""
        return ["policy", "route-map", name, "rule", rule, "set", "metric", metric]

    def get_set_metric_type(self, name: str, rule: str, metric_type: str) -> List[str]:
        """Set metric type."""
        return ["policy", "route-map", name, "rule", rule, "set", "metric-type", metric_type]

    def get_set_src(self, name: str, rule: str, src: str) -> List[str]:
        """Set source."""
        return ["policy", "route-map", name, "rule", rule, "set", "src", src]

    def get_set_table(self, name: str, rule: str, table: str) -> List[str]:
        """Set table."""
        return ["policy", "route-map", name, "rule", rule, "set", "table", table]

    def get_set_tag(self, name: str, rule: str, tag: str) -> List[str]:
        """Set tag."""
        return ["policy", "route-map", name, "rule", rule, "set", "tag", tag]
