"""
Route Map Batch Builder

Provides all batch operations for route-map configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RouteMapBatchBuilder:
    """Complete batch builder for route-map operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "route_map"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RouteMapBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RouteMapBatchBuilder":
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
    # Route Map Operations
    # ========================================================================

    def set_route_map(self, name: str) -> "RouteMapBatchBuilder":
        """Create route-map."""
        path = self.mappers[self.mapper_key].get_route_map_path(name)
        return self.add_set(path)

    def delete_route_map(self, name: str) -> "RouteMapBatchBuilder":
        """Delete route-map."""
        path = self.mappers[self.mapper_key].get_route_map_path(name)
        return self.add_delete(path)

    def set_route_map_description(self, name: str, description: str) -> "RouteMapBatchBuilder":
        """Set route-map description."""
        path = self.mappers[self.mapper_key].get_route_map_description(name, description)
        return self.add_set(path)

    def delete_route_map_description(self, name: str) -> "RouteMapBatchBuilder":
        """Delete route-map description."""
        path = self.mappers[self.mapper_key].get_route_map_path(name) + ["description"]
        return self.add_delete(path)

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Create rule."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule)
        return self.add_set(path)

    def delete_rule(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule)
        return self.add_delete(path)

    def set_rule_description(self, name: str, rule: str, description: str) -> "RouteMapBatchBuilder":
        """Set rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(name, rule, description)
        return self.add_set(path)

    def delete_rule_description(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule description."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["description"]
        return self.add_delete(path)

    def set_rule_action(self, name: str, rule: str, action: str) -> "RouteMapBatchBuilder":
        """Set rule action."""
        path = self.mappers[self.mapper_key].get_rule_action(name, rule, action)
        return self.add_set(path)

    def delete_rule_action(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule action."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["action"]
        return self.add_delete(path)

    def set_rule_call(self, name: str, rule: str, call_map: str) -> "RouteMapBatchBuilder":
        """Set rule call."""
        path = self.mappers[self.mapper_key].get_rule_call(name, rule, call_map)
        return self.add_set(path)

    def delete_rule_call(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule call."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["call"]
        return self.add_delete(path)

    def set_rule_continue(self, name: str, rule: str, continue_rule: str) -> "RouteMapBatchBuilder":
        """Set rule continue."""
        path = self.mappers[self.mapper_key].get_rule_continue(name, rule, continue_rule)
        return self.add_set(path)

    def delete_rule_continue(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule continue."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["continue"]
        return self.add_delete(path)

    def set_rule_on_match_goto(self, name: str, rule: str, goto_rule: str) -> "RouteMapBatchBuilder":
        """Set rule on-match goto."""
        path = self.mappers[self.mapper_key].get_rule_on_match_goto(name, rule, goto_rule)
        return self.add_set(path)

    def delete_rule_on_match_goto(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule on-match goto."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["on-match", "goto"]
        return self.add_delete(path)

    def set_rule_on_match_next(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set rule on-match next."""
        path = self.mappers[self.mapper_key].get_rule_on_match_next(name, rule)
        return self.add_set(path)

    def delete_rule_on_match_next(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete rule on-match next."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["on-match", "next"]
        return self.add_delete(path)

    # ========================================================================
    # Match Conditions - BGP Attributes
    # ========================================================================

    def set_match_as_path(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        """Set match AS path."""
        path = self.mappers[self.mapper_key].get_match_as_path(name, rule, as_path)
        return self.add_set(path)

    def delete_match_as_path(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match AS path."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "as-path"]
        return self.add_delete(path)

    def set_match_community(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set match community."""
        path = self.mappers[self.mapper_key].get_match_community(name, rule, community)
        return self.add_set(path)

    def delete_match_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match community."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "community"]
        return self.add_delete(path)

    def set_match_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set match community exact-match."""
        path = self.mappers[self.mapper_key].get_match_community_exact_match(name, rule)
        return self.add_set(path)

    def delete_match_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match community exact-match."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "community", "exact-match"]
        return self.add_delete(path)

    def set_match_extcommunity(self, name: str, rule: str, extcommunity: str) -> "RouteMapBatchBuilder":
        """Set match extcommunity."""
        path = self.mappers[self.mapper_key].get_match_extcommunity(name, rule, extcommunity)
        return self.add_set(path)

    def delete_match_extcommunity(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match extcommunity."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "extcommunity"]
        return self.add_delete(path)

    def set_match_large_community(self, name: str, rule: str, large_community: str) -> "RouteMapBatchBuilder":
        """Set match large-community."""
        path = self.mappers[self.mapper_key].get_match_large_community(name, rule, large_community)
        return self.add_set(path)

    def delete_match_large_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match large-community."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "large-community"]
        return self.add_delete(path)

    def set_match_large_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set match large-community exact-match."""
        path = self.mappers[self.mapper_key].get_match_large_community_exact_match(name, rule)
        return self.add_set(path)

    def delete_match_large_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match large-community exact-match."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "large-community", "exact-match"]
        return self.add_delete(path)

    def set_match_local_preference(self, name: str, rule: str, local_pref: str) -> "RouteMapBatchBuilder":
        """Set match local-preference."""
        path = self.mappers[self.mapper_key].get_match_local_preference(name, rule, local_pref)
        return self.add_set(path)

    def delete_match_local_preference(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match local-preference."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "local-preference"]
        return self.add_delete(path)

    def set_match_metric(self, name: str, rule: str, metric: str) -> "RouteMapBatchBuilder":
        """Set match metric."""
        path = self.mappers[self.mapper_key].get_match_metric(name, rule, metric)
        return self.add_set(path)

    def delete_match_metric(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match metric."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "metric"]
        return self.add_delete(path)

    def set_match_origin(self, name: str, rule: str, origin: str) -> "RouteMapBatchBuilder":
        """Set match origin."""
        path = self.mappers[self.mapper_key].get_match_origin(name, rule, origin)
        return self.add_set(path)

    def delete_match_origin(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match origin."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "origin"]
        return self.add_delete(path)

    def set_match_peer(self, name: str, rule: str, peer: str) -> "RouteMapBatchBuilder":
        """Set match peer."""
        path = self.mappers[self.mapper_key].get_match_peer(name, rule, peer)
        return self.add_set(path)

    def delete_match_peer(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match peer."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "peer"]
        return self.add_delete(path)

    def set_match_rpki(self, name: str, rule: str, rpki: str) -> "RouteMapBatchBuilder":
        """Set match RPKI."""
        path = self.mappers[self.mapper_key].get_match_rpki(name, rule, rpki)
        return self.add_set(path)

    def delete_match_rpki(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match RPKI."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "rpki"]
        return self.add_delete(path)

    # ========================================================================
    # Match Conditions - IP/IPv6 Address
    # ========================================================================

    def set_match_ip_address_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        """Set match IP address via access-list."""
        path = self.mappers[self.mapper_key].get_match_ip_address_access_list(name, rule, access_list)
        return self.add_set(path)

    def delete_match_ip_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match IP address."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "ip", "address"]
        return self.add_delete(path)

    def set_match_ip_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        """Set match IP address via prefix-list."""
        path = self.mappers[self.mapper_key].get_match_ip_address_prefix_list(name, rule, prefix_list)
        return self.add_set(path)

    def set_match_ip_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        """Set match IP address prefix length."""
        path = self.mappers[self.mapper_key].get_match_ip_address_prefix_len(name, rule, prefix_len)
        return self.add_set(path)

    def set_match_ipv6_address_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        """Set match IPv6 address via access-list."""
        path = self.mappers[self.mapper_key].get_match_ipv6_address_access_list(name, rule, access_list)
        return self.add_set(path)

    def delete_match_ipv6_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match IPv6 address."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "ipv6", "address"]
        return self.add_delete(path)

    def set_match_ipv6_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        """Set match IPv6 address via prefix-list."""
        path = self.mappers[self.mapper_key].get_match_ipv6_address_prefix_list(name, rule, prefix_list)
        return self.add_set(path)

    def set_match_ipv6_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        """Set match IPv6 address prefix length."""
        path = self.mappers[self.mapper_key].get_match_ipv6_address_prefix_len(name, rule, prefix_len)
        return self.add_set(path)

    # ========================================================================
    # Match Conditions - Next-Hop
    # ========================================================================

    def set_match_ip_nexthop_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        """Set match IP next-hop via access-list."""
        path = self.mappers[self.mapper_key].get_match_ip_nexthop_access_list(name, rule, access_list)
        return self.add_set(path)

    def set_match_ip_nexthop_address(self, name: str, rule: str, address: str) -> "RouteMapBatchBuilder":
        """Set match IP next-hop address."""
        path = self.mappers[self.mapper_key].get_match_ip_nexthop_address(name, rule, address)
        return self.add_set(path)

    def set_match_ip_nexthop_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        """Set match IP next-hop prefix length."""
        path = self.mappers[self.mapper_key].get_match_ip_nexthop_prefix_len(name, rule, prefix_len)
        return self.add_set(path)

    def set_match_ip_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        """Set match IP next-hop via prefix-list."""
        path = self.mappers[self.mapper_key].get_match_ip_nexthop_prefix_list(name, rule, prefix_list)
        return self.add_set(path)

    def set_match_ip_nexthop_type(self, name: str, rule: str, nh_type: str) -> "RouteMapBatchBuilder":
        """Set match IP next-hop type."""
        path = self.mappers[self.mapper_key].get_match_ip_nexthop_type(name, rule, nh_type)
        return self.add_set(path)

    def delete_match_ip_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match IP next-hop."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "ip", "nexthop"]
        return self.add_delete(path)

    def set_match_ipv6_nexthop_address(self, name: str, rule: str, address: str) -> "RouteMapBatchBuilder":
        """Set match IPv6 next-hop address."""
        path = self.mappers[self.mapper_key].get_match_ipv6_nexthop_address(name, rule, address)
        return self.add_set(path)

    def delete_match_ipv6_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match IPv6 next-hop."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "ipv6", "nexthop"]
        return self.add_delete(path)

    # ========================================================================
    # Match Conditions - Route Source
    # ========================================================================

    def set_match_ip_route_source_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        """Set match IP route source via access-list."""
        path = self.mappers[self.mapper_key].get_match_ip_route_source_access_list(name, rule, access_list)
        return self.add_set(path)

    def set_match_ip_route_source_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        """Set match IP route source via prefix-list."""
        path = self.mappers[self.mapper_key].get_match_ip_route_source_prefix_list(name, rule, prefix_list)
        return self.add_set(path)

    def delete_match_ip_route_source(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match IP route source."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "ip", "route-source"]
        return self.add_delete(path)

    # ========================================================================
    # Match Conditions - Other
    # ========================================================================

    def set_match_interface(self, name: str, rule: str, interface: str) -> "RouteMapBatchBuilder":
        """Set match interface."""
        path = self.mappers[self.mapper_key].get_match_interface(name, rule, interface)
        return self.add_set(path)

    def delete_match_interface(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match interface."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "interface"]
        return self.add_delete(path)

    def set_match_protocol(self, name: str, rule: str, protocol: str) -> "RouteMapBatchBuilder":
        """Set match protocol."""
        path = self.mappers[self.mapper_key].get_match_protocol(name, rule, protocol)
        return self.add_set(path)

    def delete_match_protocol(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match protocol."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "protocol"]
        return self.add_delete(path)

    def set_match_source_vrf(self, name: str, rule: str, vrf: str) -> "RouteMapBatchBuilder":
        """Set match source VRF."""
        path = self.mappers[self.mapper_key].get_match_source_vrf(name, rule, vrf)
        return self.add_set(path)

    def delete_match_source_vrf(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match source VRF."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "source-vrf"]
        return self.add_delete(path)

    def set_match_tag(self, name: str, rule: str, tag: str) -> "RouteMapBatchBuilder":
        """Set match tag."""
        path = self.mappers[self.mapper_key].get_match_tag(name, rule, tag)
        return self.add_set(path)

    def delete_match_tag(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete match tag."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["match", "tag"]
        return self.add_delete(path)

    # ========================================================================
    # Set Actions - BGP AS Path
    # ========================================================================

    def set_as_path_exclude(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        """Set AS path exclude."""
        path = self.mappers[self.mapper_key].get_set_as_path_exclude(name, rule, as_path)
        return self.add_set(path)

    def delete_set_as_path_exclude(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set AS path exclude."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "as-path", "exclude"]
        return self.add_delete(path)

    def set_as_path_prepend(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        """Set AS path prepend."""
        path = self.mappers[self.mapper_key].get_set_as_path_prepend(name, rule, as_path)
        return self.add_set(path)

    def delete_set_as_path_prepend(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set AS path prepend."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "as-path", "prepend"]
        return self.add_delete(path)

    def set_as_path_prepend_last_as(self, name: str, rule: str, count: str) -> "RouteMapBatchBuilder":
        """Set AS path prepend last-as."""
        path = self.mappers[self.mapper_key].get_set_as_path_prepend_last_as(name, rule, count)
        return self.add_set(path)

    def delete_set_as_path_prepend_last_as(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set AS path prepend last-as."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "as-path", "prepend-last-as"]
        return self.add_delete(path)

    # ========================================================================
    # Set Actions - BGP Communities
    # ========================================================================

    def set_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set community add."""
        path = self.mappers[self.mapper_key].get_set_community_add(name, rule, community)
        return self.add_set(path)

    def set_community_replace(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set community replace."""
        path = self.mappers[self.mapper_key].get_set_community_replace(name, rule, community)
        return self.add_set(path)

    def set_community_delete(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set community delete."""
        path = self.mappers[self.mapper_key].get_set_community_delete(name, rule, community)
        return self.add_set(path)

    def set_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set community none."""
        path = self.mappers[self.mapper_key].get_set_community_none(name, rule)
        return self.add_set(path)

    def delete_set_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set community."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "community"]
        return self.add_delete(path)

    def set_large_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set large-community add."""
        path = self.mappers[self.mapper_key].get_set_large_community_add(name, rule, community)
        return self.add_set(path)

    def set_large_community_replace(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set large-community replace."""
        path = self.mappers[self.mapper_key].get_set_large_community_replace(name, rule, community)
        return self.add_set(path)

    def set_large_community_delete(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Set large-community delete."""
        path = self.mappers[self.mapper_key].get_set_large_community_delete(name, rule, community)
        return self.add_set(path)

    def set_large_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set large-community none."""
        path = self.mappers[self.mapper_key].get_set_large_community_none(name, rule)
        return self.add_set(path)

    def delete_set_large_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set large-community."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "large-community"]
        return self.add_delete(path)

    def set_extcommunity_bandwidth(self, name: str, rule: str, bandwidth: str) -> "RouteMapBatchBuilder":
        """Set extcommunity bandwidth."""
        path = self.mappers[self.mapper_key].get_set_extcommunity_bandwidth(name, rule, bandwidth)
        return self.add_set(path)

    def set_extcommunity_rt(self, name: str, rule: str, rt: str) -> "RouteMapBatchBuilder":
        """Set extcommunity RT."""
        path = self.mappers[self.mapper_key].get_set_extcommunity_rt(name, rule, rt)
        return self.add_set(path)

    def set_extcommunity_soo(self, name: str, rule: str, soo: str) -> "RouteMapBatchBuilder":
        """Set extcommunity SOO."""
        path = self.mappers[self.mapper_key].get_set_extcommunity_soo(name, rule, soo)
        return self.add_set(path)

    def set_extcommunity_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set extcommunity none."""
        path = self.mappers[self.mapper_key].get_set_extcommunity_none(name, rule)
        return self.add_set(path)

    def delete_set_extcommunity(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set extcommunity."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "extcommunity"]
        return self.add_delete(path)

    # ========================================================================
    # Set Actions - BGP Attributes
    # ========================================================================

    def set_atomic_aggregate(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set atomic aggregate."""
        path = self.mappers[self.mapper_key].get_set_atomic_aggregate(name, rule)
        return self.add_set(path)

    def delete_set_atomic_aggregate(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set atomic aggregate."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "atomic-aggregate"]
        return self.add_delete(path)

    def set_aggregator_as(self, name: str, rule: str, as_number: str) -> "RouteMapBatchBuilder":
        """Set aggregator AS."""
        path = self.mappers[self.mapper_key].get_set_aggregator_as(name, rule, as_number)
        return self.add_set(path)

    def set_aggregator_ip(self, name: str, rule: str, ip: str) -> "RouteMapBatchBuilder":
        """Set aggregator IP."""
        path = self.mappers[self.mapper_key].get_set_aggregator_ip(name, rule, ip)
        return self.add_set(path)

    def delete_set_aggregator(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set aggregator."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "aggregator"]
        return self.add_delete(path)

    def set_local_preference(self, name: str, rule: str, local_pref: str) -> "RouteMapBatchBuilder":
        """Set local preference."""
        path = self.mappers[self.mapper_key].get_set_local_preference(name, rule, local_pref)
        return self.add_set(path)

    def delete_set_local_preference(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set local preference."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "local-preference"]
        return self.add_delete(path)

    def set_origin(self, name: str, rule: str, origin: str) -> "RouteMapBatchBuilder":
        """Set origin."""
        path = self.mappers[self.mapper_key].get_set_origin(name, rule, origin)
        return self.add_set(path)

    def delete_set_origin(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set origin."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "origin"]
        return self.add_delete(path)

    def set_originator_id(self, name: str, rule: str, originator_id: str) -> "RouteMapBatchBuilder":
        """Set originator ID."""
        path = self.mappers[self.mapper_key].get_set_originator_id(name, rule, originator_id)
        return self.add_set(path)

    def delete_set_originator_id(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set originator ID."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "originator-id"]
        return self.add_delete(path)

    def set_weight(self, name: str, rule: str, weight: str) -> "RouteMapBatchBuilder":
        """Set weight."""
        path = self.mappers[self.mapper_key].get_set_weight(name, rule, weight)
        return self.add_set(path)

    def delete_set_weight(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set weight."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "weight"]
        return self.add_delete(path)

    # ========================================================================
    # Set Actions - Next-Hop
    # ========================================================================

    def set_ip_nexthop(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        """Set IP next-hop."""
        path = self.mappers[self.mapper_key].get_set_ip_nexthop(name, rule, nexthop)
        return self.add_set(path)

    def set_ip_nexthop_peer_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set IP next-hop to peer address."""
        path = self.mappers[self.mapper_key].get_set_ip_nexthop_peer_address(name, rule)
        return self.add_set(path)

    def set_ip_nexthop_unchanged(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set IP next-hop unchanged."""
        path = self.mappers[self.mapper_key].get_set_ip_nexthop_unchanged(name, rule)
        return self.add_set(path)

    def delete_set_ip_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set IP next-hop."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "ip-next-hop"]
        return self.add_delete(path)

    def set_ipv6_nexthop_global(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        """Set IPv6 next-hop global."""
        path = self.mappers[self.mapper_key].get_set_ipv6_nexthop_global(name, rule, nexthop)
        return self.add_set(path)

    def set_ipv6_nexthop_local(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        """Set IPv6 next-hop local."""
        path = self.mappers[self.mapper_key].get_set_ipv6_nexthop_local(name, rule, nexthop)
        return self.add_set(path)

    def set_ipv6_nexthop_peer_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set IPv6 next-hop to peer address."""
        path = self.mappers[self.mapper_key].get_set_ipv6_nexthop_peer_address(name, rule)
        return self.add_set(path)

    def set_ipv6_nexthop_prefer_global(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Set IPv6 next-hop prefer global."""
        path = self.mappers[self.mapper_key].get_set_ipv6_nexthop_prefer_global(name, rule)
        return self.add_set(path)

    def delete_set_ipv6_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set IPv6 next-hop."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "ipv6-next-hop"]
        return self.add_delete(path)

    # ========================================================================
    # Set Actions - Route Properties
    # ========================================================================

    def set_distance(self, name: str, rule: str, distance: str) -> "RouteMapBatchBuilder":
        """Set distance."""
        path = self.mappers[self.mapper_key].get_set_distance(name, rule, distance)
        return self.add_set(path)

    def delete_set_distance(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set distance."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "distance"]
        return self.add_delete(path)

    def set_metric(self, name: str, rule: str, metric: str) -> "RouteMapBatchBuilder":
        """Set metric."""
        path = self.mappers[self.mapper_key].get_set_metric(name, rule, metric)
        return self.add_set(path)

    def delete_set_metric(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set metric."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "metric"]
        return self.add_delete(path)

    def set_metric_type(self, name: str, rule: str, metric_type: str) -> "RouteMapBatchBuilder":
        """Set metric type."""
        path = self.mappers[self.mapper_key].get_set_metric_type(name, rule, metric_type)
        return self.add_set(path)

    def delete_set_metric_type(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set metric type."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "metric-type"]
        return self.add_delete(path)

    def set_src(self, name: str, rule: str, src: str) -> "RouteMapBatchBuilder":
        """Set source."""
        path = self.mappers[self.mapper_key].get_set_src(name, rule, src)
        return self.add_set(path)

    def delete_set_src(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set source."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "src"]
        return self.add_delete(path)

    def set_table(self, name: str, rule: str, table: str) -> "RouteMapBatchBuilder":
        """Set table."""
        path = self.mappers[self.mapper_key].get_set_table(name, rule, table)
        return self.add_set(path)

    def delete_set_table(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set table."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "table"]
        return self.add_delete(path)

    def set_tag(self, name: str, rule: str, tag: str) -> "RouteMapBatchBuilder":
        """Set tag."""
        path = self.mappers[self.mapper_key].get_set_tag(name, rule, tag)
        return self.add_set(path)

    def delete_set_tag(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete set tag."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule) + ["set", "tag"]
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # Both 1.4 and 1.5 have identical route-map support
        return {
            "version": self.version,
            "features": {
                "basic": {
                    "supported": True,
                    "description": "Basic route-map configuration",
                },
                "rules": {
                    "supported": True,
                    "description": "Route-map rules with permit/deny",
                },
                "match_conditions": {
                    "supported": True,
                    "description": "Match conditions (AS path, community, IP, etc.)",
                },
                "set_actions": {
                    "supported": True,
                    "description": "Set actions (local-pref, metric, next-hop, etc.)",
                },
                "bgp_attributes": {
                    "supported": True,
                    "description": "BGP-specific attributes and communities",
                },
                "call_continue": {
                    "supported": True,
                    "description": "Call and continue to other route-maps",
                },
                "on_match": {
                    "supported": True,
                    "description": "On-match actions (goto, next)",
                },
            },
            "version_notes": {
                "identical_versions": "VyOS 1.4 and 1.5 have identical route-map support",
            },
        }
