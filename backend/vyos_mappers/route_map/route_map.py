"""Route-map command mapper.

One class holds the ``policy route-map`` commands both VyOS versions have,
with the 1.4 values. ``match rpki-extcommunity`` and ``match source-peer``
exist only on 1.5; their path methods live on the 1.5 subclass, and
``_VERSIONED_NODES`` maps each node to the path method that defines it.
Value lists that differ by version (EVPN route types, the table range, and
whether ``set as-path prepend`` excludes ``prepend-last-as``) are methods the
subclass overrides.

Every leaf has a ``*_path`` method (the node, used to delete it) and, for a
value leaf, a value form (the node plus the value, used to set it). A flag is
set and deleted on the same path.
"""

from typing import Any, Dict, FrozenSet, List, Optional, Tuple

from ..base import BaseFeatureMapper

# Version-only rule nodes (keys of RouteMapMapper._VERSIONED_NODES).
MATCH_RPKI_EXTCOMMUNITY = "match rpki-extcommunity"
MATCH_SOURCE_PEER = "match source-peer"

# Lab `allowed:` / validator lists, the same on 1.4 and 1.5.
RULE_ACTIONS: Tuple[str, ...] = ("permit", "deny")
ORIGINS: Tuple[str, ...] = ("egp", "igp", "incomplete")
RPKI_STATES: Tuple[str, ...] = ("invalid", "notfound", "valid")
METRIC_TYPES: Tuple[str, ...] = ("type-1", "type-2")
PROTOCOLS: Tuple[str, ...] = (
    "babel", "bgp", "connected", "isis", "kernel", "ospf", "ospfv3", "rip", "ripng", "static", "table", "vnc",
)
NEXTHOP_TYPES: Tuple[str, ...] = ("blackhole",)
EXTCOMMUNITY_BANDWIDTH_KEYWORDS: Tuple[str, ...] = ("cumulative", "num-multipaths")
# ``set community add|replace`` well-known names. ``internet`` is left out:
# the 1.4 validator takes it but the commit fails, and 1.5 rejects it.
COMMUNITY_WELL_KNOWN: Tuple[str, ...] = (
    "local-as", "no-advertise", "no-export", "graceful-shutdown", "accept-own",
    "route-filter-translated-v4", "route-filter-v4", "route-filter-translated-v6", "route-filter-v6",
    "llgr-stale", "no-llgr", "accept-own-nexthop", "blackhole", "no-peer",
)
# ``match evpn route-type`` on 1.4.
EVPN_ROUTE_TYPES: Tuple[str, ...] = ("macip", "multicast", "prefix")
# ``match evpn vni``: the node.def takes 0-16777214 on both builds and FRR's
# grammar takes 1-16777215, so only the overlap commits.
EVPN_VNI_RANGE: Tuple[int, int] = (1, 16777214)
# ``set table`` on 1.4.
TABLE_RANGE: Tuple[int, int] = (1, 200)


class RouteMapMapper(BaseFeatureMapper):
    """Route-map commands both VyOS versions have."""

    _VERSIONED_NODES: Dict[str, str] = {
        MATCH_RPKI_EXTCOMMUNITY: "get_match_rpki_extcommunity_path",
        MATCH_SOURCE_PEER: "get_match_source_peer_path",
    }

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only rule nodes this device has.

        Each one is a path method on the version subclass. Capabilities and
        the builder read this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"route-map rule {node} is not supported on this device")

    # ========================================================================
    # Value lists
    # ========================================================================

    def rule_actions(self) -> Tuple[str, ...]:
        return RULE_ACTIONS

    def origins(self) -> Tuple[str, ...]:
        return ORIGINS

    def rpki_states(self) -> Tuple[str, ...]:
        return RPKI_STATES

    def metric_types(self) -> Tuple[str, ...]:
        return METRIC_TYPES

    def protocols(self) -> Tuple[str, ...]:
        return PROTOCOLS

    def nexthop_types(self) -> Tuple[str, ...]:
        return NEXTHOP_TYPES

    def extcommunity_bandwidth_keywords(self) -> Tuple[str, ...]:
        return EXTCOMMUNITY_BANDWIDTH_KEYWORDS

    def community_well_known(self) -> Tuple[str, ...]:
        return COMMUNITY_WELL_KNOWN

    def evpn_route_types(self) -> Tuple[str, ...]:
        """Values this device accepts for ``match evpn route-type``."""
        return EVPN_ROUTE_TYPES

    def evpn_vni_range(self) -> Tuple[int, int]:
        return EVPN_VNI_RANGE

    def table_range(self) -> Tuple[int, int]:
        """Range this device accepts for ``set table``."""
        return TABLE_RANGE

    def as_path_prepend_exclusive(self) -> bool:
        """Whether ``set as-path prepend`` and ``prepend-last-as`` fail together."""
        return False

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_route_map_config

        return parse_route_map_config(self, full_config)

    def rule_trees(self, full_config: Dict[str, Any], name: str) -> Optional[Dict[int, Any]]:
        """Raw rule subtrees of one route-map (reorder), or None when it is absent."""
        from .config_parse import rule_trees

        return rule_trees(full_config, name)

    def rule_tree_paths(self, name: str, rule: str, tree: Any) -> List[List[str]]:
        """Set paths that recreate a rule from its config subtree (reorder).

        A value leaf is one path with its value, a ``multi:`` leaf one path
        per value, and a flag (``{}``) the path itself, so every leaf the
        device holds is kept.
        """
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

        base = self.get_rule_path(name, rule)
        walk([], tree if isinstance(tree, dict) else {})
        return [base] + [base + path for path in paths]

    # ========================================================================
    # Route-map
    # ========================================================================

    def get_route_map_path(self, name: str) -> List[str]:
        return ["policy", "route-map", name]

    def get_route_map_description_path(self, name: str) -> List[str]:
        return self.get_route_map_path(name) + ["description"]

    def get_route_map_description(self, name: str, description: str) -> List[str]:
        return self.get_route_map_description_path(name) + [description]

    # ========================================================================
    # Rule
    # ========================================================================

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        return self.get_route_map_path(name) + ["rule", rule]

    def _rule_node(self, name: str, rule: str, *words: str) -> List[str]:
        return self.get_rule_path(name, rule) + list(words)

    def get_rule_description_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "description")

    def get_rule_description(self, name: str, rule: str, description: str) -> List[str]:
        return self.get_rule_description_path(name, rule) + [description]

    def get_rule_action_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "action")

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        return self.get_rule_action_path(name, rule) + [action]

    def get_rule_call_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "call")

    def get_rule_call(self, name: str, rule: str, call_map: str) -> List[str]:
        return self.get_rule_call_path(name, rule) + [call_map]

    def get_rule_continue_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "continue")

    def get_rule_continue(self, name: str, rule: str, continue_rule: str) -> List[str]:
        return self.get_rule_continue_path(name, rule) + [continue_rule]

    def get_rule_on_match_goto_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "on-match", "goto")

    def get_rule_on_match_goto(self, name: str, rule: str, goto_rule: str) -> List[str]:
        return self.get_rule_on_match_goto_path(name, rule) + [goto_rule]

    def get_rule_on_match_next_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "on-match", "next")

    # ========================================================================
    # Match - BGP attributes
    # ========================================================================

    def get_match_as_path_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "as-path")

    def get_match_as_path(self, name: str, rule: str, as_path: str) -> List[str]:
        return self.get_match_as_path_path(name, rule) + [as_path]

    def get_match_community_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "community")

    def get_match_community_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_community_path(name, rule) + ["community-list"]

    def get_match_community(self, name: str, rule: str, community: str) -> List[str]:
        return self.get_match_community_list_path(name, rule) + [community]

    def get_match_community_exact_match_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_community_path(name, rule) + ["exact-match"]

    def get_match_extcommunity_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "extcommunity")

    def get_match_extcommunity(self, name: str, rule: str, extcommunity: str) -> List[str]:
        return self.get_match_extcommunity_path(name, rule) + [extcommunity]

    def get_match_large_community_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "large-community")

    def get_match_large_community_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_large_community_path(name, rule) + ["large-community-list"]

    def get_match_large_community(self, name: str, rule: str, large_community: str) -> List[str]:
        return self.get_match_large_community_list_path(name, rule) + [large_community]

    def get_match_local_preference_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "local-preference")

    def get_match_local_preference(self, name: str, rule: str, local_pref: str) -> List[str]:
        return self.get_match_local_preference_path(name, rule) + [local_pref]

    def get_match_metric_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "metric")

    def get_match_metric(self, name: str, rule: str, metric: str) -> List[str]:
        return self.get_match_metric_path(name, rule) + [metric]

    def get_match_origin_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "origin")

    def get_match_origin(self, name: str, rule: str, origin: str) -> List[str]:
        return self.get_match_origin_path(name, rule) + [origin]

    def get_match_peer_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "peer")

    def get_match_peer(self, name: str, rule: str, peer: str) -> List[str]:
        return self.get_match_peer_path(name, rule) + [peer]

    def get_match_rpki_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "rpki")

    def get_match_rpki(self, name: str, rule: str, rpki: str) -> List[str]:
        return self.get_match_rpki_path(name, rule) + [rpki]

    # ========================================================================
    # Match - EVPN
    # ========================================================================

    def get_match_evpn_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "evpn")

    def get_match_evpn_default_route_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_evpn_path(name, rule) + ["default-route"]

    def get_match_evpn_rd_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_evpn_path(name, rule) + ["rd"]

    def get_match_evpn_rd(self, name: str, rule: str, rd: str) -> List[str]:
        return self.get_match_evpn_rd_path(name, rule) + [rd]

    def get_match_evpn_route_type_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_evpn_path(name, rule) + ["route-type"]

    def get_match_evpn_route_type(self, name: str, rule: str, route_type: str) -> List[str]:
        return self.get_match_evpn_route_type_path(name, rule) + [route_type]

    def get_match_evpn_vni_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_evpn_path(name, rule) + ["vni"]

    def get_match_evpn_vni(self, name: str, rule: str, vni: str) -> List[str]:
        return self.get_match_evpn_vni_path(name, rule) + [vni]

    # ========================================================================
    # Match - IP / IPv6 address
    # ========================================================================

    def get_match_ip_address_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "ip", "address")

    def get_match_ip_address_access_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_address_path(name, rule) + ["access-list"]

    def get_match_ip_address_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        return self.get_match_ip_address_access_list_path(name, rule) + [access_list]

    def get_match_ip_address_prefix_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_address_path(name, rule) + ["prefix-list"]

    def get_match_ip_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        return self.get_match_ip_address_prefix_list_path(name, rule) + [prefix_list]

    def get_match_ip_address_prefix_len_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_address_path(name, rule) + ["prefix-len"]

    def get_match_ip_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        return self.get_match_ip_address_prefix_len_path(name, rule) + [prefix_len]

    def get_match_ipv6_address_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "ipv6", "address")

    def get_match_ipv6_address_access_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_address_path(name, rule) + ["access-list"]

    def get_match_ipv6_address_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        return self.get_match_ipv6_address_access_list_path(name, rule) + [access_list]

    def get_match_ipv6_address_prefix_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_address_path(name, rule) + ["prefix-list"]

    def get_match_ipv6_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        return self.get_match_ipv6_address_prefix_list_path(name, rule) + [prefix_list]

    def get_match_ipv6_address_prefix_len_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_address_path(name, rule) + ["prefix-len"]

    def get_match_ipv6_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        return self.get_match_ipv6_address_prefix_len_path(name, rule) + [prefix_len]

    # ========================================================================
    # Match - next-hop
    # ========================================================================

    def get_match_ip_nexthop_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "ip", "nexthop")

    def get_match_ip_nexthop_access_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_nexthop_path(name, rule) + ["access-list"]

    def get_match_ip_nexthop_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        return self.get_match_ip_nexthop_access_list_path(name, rule) + [access_list]

    def get_match_ip_nexthop_address_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_nexthop_path(name, rule) + ["address"]

    def get_match_ip_nexthop_address(self, name: str, rule: str, address: str) -> List[str]:
        return self.get_match_ip_nexthop_address_path(name, rule) + [address]

    def get_match_ip_nexthop_prefix_len_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_nexthop_path(name, rule) + ["prefix-len"]

    def get_match_ip_nexthop_prefix_len(self, name: str, rule: str, prefix_len: str) -> List[str]:
        return self.get_match_ip_nexthop_prefix_len_path(name, rule) + [prefix_len]

    def get_match_ip_nexthop_prefix_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_nexthop_path(name, rule) + ["prefix-list"]

    def get_match_ip_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        return self.get_match_ip_nexthop_prefix_list_path(name, rule) + [prefix_list]

    def get_match_ip_nexthop_type_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_nexthop_path(name, rule) + ["type"]

    def get_match_ip_nexthop_type(self, name: str, rule: str, nh_type: str) -> List[str]:
        return self.get_match_ip_nexthop_type_path(name, rule) + [nh_type]

    def get_match_ipv6_nexthop_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "ipv6", "nexthop")

    def get_match_ipv6_nexthop_access_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_nexthop_path(name, rule) + ["access-list"]

    def get_match_ipv6_nexthop_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        return self.get_match_ipv6_nexthop_access_list_path(name, rule) + [access_list]

    def get_match_ipv6_nexthop_address_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_nexthop_path(name, rule) + ["address"]

    def get_match_ipv6_nexthop_address(self, name: str, rule: str, address: str) -> List[str]:
        return self.get_match_ipv6_nexthop_address_path(name, rule) + [address]

    def get_match_ipv6_nexthop_prefix_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_nexthop_path(name, rule) + ["prefix-list"]

    def get_match_ipv6_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        return self.get_match_ipv6_nexthop_prefix_list_path(name, rule) + [prefix_list]

    def get_match_ipv6_nexthop_type_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ipv6_nexthop_path(name, rule) + ["type"]

    def get_match_ipv6_nexthop_type(self, name: str, rule: str, nh_type: str) -> List[str]:
        return self.get_match_ipv6_nexthop_type_path(name, rule) + [nh_type]

    # ========================================================================
    # Match - route source
    # ========================================================================

    def get_match_ip_route_source_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "ip", "route-source")

    def get_match_ip_route_source_access_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_route_source_path(name, rule) + ["access-list"]

    def get_match_ip_route_source_access_list(self, name: str, rule: str, access_list: str) -> List[str]:
        return self.get_match_ip_route_source_access_list_path(name, rule) + [access_list]

    def get_match_ip_route_source_prefix_list_path(self, name: str, rule: str) -> List[str]:
        return self.get_match_ip_route_source_path(name, rule) + ["prefix-list"]

    def get_match_ip_route_source_prefix_list(self, name: str, rule: str, prefix_list: str) -> List[str]:
        return self.get_match_ip_route_source_prefix_list_path(name, rule) + [prefix_list]

    # ========================================================================
    # Match - other
    # ========================================================================

    def get_match_interface_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "interface")

    def get_match_interface(self, name: str, rule: str, interface: str) -> List[str]:
        return self.get_match_interface_path(name, rule) + [interface]

    def get_match_protocol_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "protocol")

    def get_match_protocol(self, name: str, rule: str, protocol: str) -> List[str]:
        return self.get_match_protocol_path(name, rule) + [protocol]

    def get_match_source_vrf_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "source-vrf")

    def get_match_source_vrf(self, name: str, rule: str, vrf: str) -> List[str]:
        return self.get_match_source_vrf_path(name, rule) + [vrf]

    def get_match_tag_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "match", "tag")

    def get_match_tag(self, name: str, rule: str, tag: str) -> List[str]:
        return self.get_match_tag_path(name, rule) + [tag]

    # ========================================================================
    # Set - AS path
    # ========================================================================

    def get_set_as_path_exclude_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "as-path", "exclude")

    def get_set_as_path_exclude(self, name: str, rule: str, as_path: str) -> List[str]:
        return self.get_set_as_path_exclude_path(name, rule) + [as_path]

    def get_set_as_path_prepend_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "as-path", "prepend")

    def get_set_as_path_prepend(self, name: str, rule: str, as_path: str) -> List[str]:
        return self.get_set_as_path_prepend_path(name, rule) + [as_path]

    def get_set_as_path_prepend_last_as_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "as-path", "prepend-last-as")

    def get_set_as_path_prepend_last_as(self, name: str, rule: str, count: str) -> List[str]:
        return self.get_set_as_path_prepend_last_as_path(name, rule) + [count]

    # ========================================================================
    # Set - communities
    # ========================================================================

    def get_set_community_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "community")

    def get_set_community_add_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_community_path(name, rule) + ["add"]

    def get_set_community_add(self, name: str, rule: str, community: str) -> List[str]:
        return self.get_set_community_add_path(name, rule) + [community]

    def get_set_community_replace_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_community_path(name, rule) + ["replace"]

    def get_set_community_replace(self, name: str, rule: str, community: str) -> List[str]:
        return self.get_set_community_replace_path(name, rule) + [community]

    def get_set_community_delete_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_community_path(name, rule) + ["delete"]

    def get_set_community_delete(self, name: str, rule: str, community_list: str) -> List[str]:
        return self.get_set_community_delete_path(name, rule) + [community_list]

    def get_set_community_none_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_community_path(name, rule) + ["none"]

    def get_set_large_community_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "large-community")

    def get_set_large_community_add_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_large_community_path(name, rule) + ["add"]

    def get_set_large_community_add(self, name: str, rule: str, community: str) -> List[str]:
        return self.get_set_large_community_add_path(name, rule) + [community]

    def get_set_large_community_replace_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_large_community_path(name, rule) + ["replace"]

    def get_set_large_community_replace(self, name: str, rule: str, community: str) -> List[str]:
        return self.get_set_large_community_replace_path(name, rule) + [community]

    def get_set_large_community_delete_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_large_community_path(name, rule) + ["delete"]

    def get_set_large_community_delete(self, name: str, rule: str, community_list: str) -> List[str]:
        return self.get_set_large_community_delete_path(name, rule) + [community_list]

    def get_set_large_community_none_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_large_community_path(name, rule) + ["none"]

    def get_set_extcommunity_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "extcommunity")

    def get_set_extcommunity_bandwidth_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_extcommunity_path(name, rule) + ["bandwidth"]

    def get_set_extcommunity_bandwidth(self, name: str, rule: str, bandwidth: str) -> List[str]:
        return self.get_set_extcommunity_bandwidth_path(name, rule) + [bandwidth]

    def get_set_extcommunity_bandwidth_non_transitive_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_extcommunity_path(name, rule) + ["bandwidth-non-transitive"]

    def get_set_extcommunity_rt_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_extcommunity_path(name, rule) + ["rt"]

    def get_set_extcommunity_rt(self, name: str, rule: str, rt: str) -> List[str]:
        return self.get_set_extcommunity_rt_path(name, rule) + [rt]

    def get_set_extcommunity_soo_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_extcommunity_path(name, rule) + ["soo"]

    def get_set_extcommunity_soo(self, name: str, rule: str, soo: str) -> List[str]:
        return self.get_set_extcommunity_soo_path(name, rule) + [soo]

    def get_set_extcommunity_none_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_extcommunity_path(name, rule) + ["none"]

    # ========================================================================
    # Set - BGP attributes
    # ========================================================================

    def get_set_atomic_aggregate_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "atomic-aggregate")

    def get_set_aggregator_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "aggregator")

    def get_set_aggregator_as_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_aggregator_path(name, rule) + ["as"]

    def get_set_aggregator_as(self, name: str, rule: str, as_number: str) -> List[str]:
        return self.get_set_aggregator_as_path(name, rule) + [as_number]

    def get_set_aggregator_ip_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_aggregator_path(name, rule) + ["ip"]

    def get_set_aggregator_ip(self, name: str, rule: str, ip: str) -> List[str]:
        return self.get_set_aggregator_ip_path(name, rule) + [ip]

    def get_set_local_preference_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "local-preference")

    def get_set_local_preference(self, name: str, rule: str, local_pref: str) -> List[str]:
        return self.get_set_local_preference_path(name, rule) + [local_pref]

    def get_set_origin_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "origin")

    def get_set_origin(self, name: str, rule: str, origin: str) -> List[str]:
        return self.get_set_origin_path(name, rule) + [origin]

    def get_set_originator_id_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "originator-id")

    def get_set_originator_id(self, name: str, rule: str, originator_id: str) -> List[str]:
        return self.get_set_originator_id_path(name, rule) + [originator_id]

    def get_set_weight_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "weight")

    def get_set_weight(self, name: str, rule: str, weight: str) -> List[str]:
        return self.get_set_weight_path(name, rule) + [weight]

    # ========================================================================
    # Set - next-hop
    # ========================================================================

    def get_set_ip_nexthop_path(self, name: str, rule: str) -> List[str]:
        """``set ip-next-hop``: one value leaf (an IPv4 address, unchanged, or peer-address)."""
        return self._rule_node(name, rule, "set", "ip-next-hop")

    def get_set_ip_nexthop(self, name: str, rule: str, nexthop: str) -> List[str]:
        return self.get_set_ip_nexthop_path(name, rule) + [nexthop]

    def get_set_ip_nexthop_peer_address(self, name: str, rule: str) -> List[str]:
        return self.get_set_ip_nexthop(name, rule, "peer-address")

    def get_set_ip_nexthop_unchanged(self, name: str, rule: str) -> List[str]:
        return self.get_set_ip_nexthop(name, rule, "unchanged")

    def get_set_ipv6_nexthop_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "ipv6-next-hop")

    def get_set_ipv6_nexthop_global_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_ipv6_nexthop_path(name, rule) + ["global"]

    def get_set_ipv6_nexthop_global(self, name: str, rule: str, nexthop: str) -> List[str]:
        return self.get_set_ipv6_nexthop_global_path(name, rule) + [nexthop]

    def get_set_ipv6_nexthop_local_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_ipv6_nexthop_path(name, rule) + ["local"]

    def get_set_ipv6_nexthop_local(self, name: str, rule: str, nexthop: str) -> List[str]:
        return self.get_set_ipv6_nexthop_local_path(name, rule) + [nexthop]

    def get_set_ipv6_nexthop_peer_address_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_ipv6_nexthop_path(name, rule) + ["peer-address"]

    def get_set_ipv6_nexthop_prefer_global_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_ipv6_nexthop_path(name, rule) + ["prefer-global"]

    def get_set_l3vpn_nexthop_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "l3vpn-nexthop")

    def get_set_l3vpn_nexthop_encapsulation_gre_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_l3vpn_nexthop_path(name, rule) + ["encapsulation", "gre"]

    # ========================================================================
    # Set - EVPN
    # ========================================================================

    def get_set_evpn_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "evpn")

    def get_set_evpn_gateway_ipv4_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_evpn_path(name, rule) + ["gateway", "ipv4"]

    def get_set_evpn_gateway_ipv4(self, name: str, rule: str, gateway: str) -> List[str]:
        return self.get_set_evpn_gateway_ipv4_path(name, rule) + [gateway]

    def get_set_evpn_gateway_ipv6_path(self, name: str, rule: str) -> List[str]:
        return self.get_set_evpn_path(name, rule) + ["gateway", "ipv6"]

    def get_set_evpn_gateway_ipv6(self, name: str, rule: str, gateway: str) -> List[str]:
        return self.get_set_evpn_gateway_ipv6_path(name, rule) + [gateway]

    # ========================================================================
    # Set - route properties
    # ========================================================================

    def get_set_distance_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "distance")

    def get_set_distance(self, name: str, rule: str, distance: str) -> List[str]:
        return self.get_set_distance_path(name, rule) + [distance]

    def get_set_metric_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "metric")

    def get_set_metric(self, name: str, rule: str, metric: str) -> List[str]:
        return self.get_set_metric_path(name, rule) + [metric]

    def get_set_metric_type_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "metric-type")

    def get_set_metric_type(self, name: str, rule: str, metric_type: str) -> List[str]:
        return self.get_set_metric_type_path(name, rule) + [metric_type]

    def get_set_src_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "src")

    def get_set_src(self, name: str, rule: str, src: str) -> List[str]:
        return self.get_set_src_path(name, rule) + [src]

    def get_set_table_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "table")

    def get_set_table(self, name: str, rule: str, table: str) -> List[str]:
        return self.get_set_table_path(name, rule) + [table]

    def get_set_tag_path(self, name: str, rule: str) -> List[str]:
        return self._rule_node(name, rule, "set", "tag")

    def get_set_tag(self, name: str, rule: str, tag: str) -> List[str]:
        return self.get_set_tag_path(name, rule) + [tag]
