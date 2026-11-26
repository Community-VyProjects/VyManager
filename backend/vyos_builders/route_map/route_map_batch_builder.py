"""Route-map batch builder.

Every op takes the route-map name first and, for a rule op, the rule number.
A name, rule number, or value the lab node.def rejects raises ValueError
before the op is queued; a version-only node (``match rpki-extcommunity``,
``match source-peer``) raises ValueError on a device that lacks it. Checks
that need the whole rule (an action, goto/continue above the rule number,
exclusive leaves) are the client's: the builder sees one op at a time.
"""

import ipaddress
import re
from typing import Any, Dict, List, Tuple, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.route_map.route_map import (
    MATCH_RPKI_EXTCOMMUNITY,
    MATCH_SOURCE_PEER,
    RouteMapMapper,
)

U32_MAX = 4294967295

# Lab syntax bounds (the same on 1.4 and 1.5). ``set table`` and ``match evpn
# vni`` come from the mapper.
RANGES: Dict[str, Dict[str, int]] = {
    "rule": {"min": 1, "max": 65535},
    "continue": {"min": 1, "max": 65535},
    "on_match_goto": {"min": 1, "max": 65535},
    "match_local_preference": {"min": 0, "max": U32_MAX},
    "match_metric": {"min": 1, "max": 65535},
    "match_tag": {"min": 1, "max": 65535},
    "ip_prefix_len": {"min": 0, "max": 32},
    "ipv6_prefix_len": {"min": 0, "max": 128},
    "aggregator_as": {"min": 1, "max": U32_MAX},
    "as_number": {"min": 1, "max": U32_MAX},
    "as_path_prepend_last_as": {"min": 1, "max": 10},
    "distance": {"min": 0, "max": 255},
    "local_preference": {"min": 0, "max": U32_MAX},
    "weight": {"min": 0, "max": U32_MAX},
    "metric": {"min": 0, "max": U32_MAX},
    "tag": {"min": 1, "max": 65535},
    "extcommunity_bandwidth": {"min": 1, "max": 25600},
    "community_part": {"min": 0, "max": 65535},
    "large_community_part": {"min": 0, "max": U32_MAX},
    "extcommunity_asn": {"min": 0, "max": 65535},
    "extcommunity_asn_value": {"min": 0, "max": U32_MAX},
    "extcommunity_ip_value": {"min": 0, "max": 65535},
    # ``match ip address|nexthop|route-source access-list``: an IPv4
    # access-list is a u32 tag. The val_help ranges are a hint; the labs
    # commit numbers outside them (500, 2700).
    "ip_access_list": {"min": 0, "max": U32_MAX},
}
DESCRIPTION_MAX_LENGTH = 255

# Lab route-map name regex.
_NAME = re.compile(r"[-_a-zA-Z0-9][\w\-\.\+]*", re.ASCII)
# ASCII: a Unicode digit is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,10}", re.ASCII)
_AS_LIST = re.compile(r"\d{1,10}(?: \d{1,10})*", re.ASCII)
_METRIC = re.compile(r"[+-]?(?:\d{1,10}|rtt)", re.ASCII)
_COMMUNITY = re.compile(r"(\d{1,5}):(\d{1,5})", re.ASCII)
_LARGE_COMMUNITY = re.compile(r"(\d{1,10}):(\d{1,10}):(\d{1,10})", re.ASCII)


def _in_range(label: str, value: str, low: int, high: int) -> str:
    if not _DECIMAL.fullmatch(value) or not low <= int(value) <= high:
        raise ValueError(f"{label} must be a number from {low} to {high}")
    return value


def _number(key: str, label: str, value: str) -> str:
    bounds = RANGES[key]
    return _in_range(label, value, bounds["min"], bounds["max"])


def _part(key: str, value: str) -> bool:
    bounds = RANGES[key]
    return bounds["min"] <= int(value) <= bounds["max"]


def _choice(label: str, value: str, allowed: Tuple[str, ...]) -> str:
    if value not in allowed:
        raise ValueError(f"{label} must be one of: {', '.join(allowed)}")
    return value


def _name(value: str) -> str:
    if not _NAME.fullmatch(value):
        raise ValueError("route-map name must start with a letter, digit, hyphen or underscore "
                         "and contain only letters, digits, hyphens, underscores, dots and plus signs")
    return value


def _description(value: str) -> str:
    # Lab regex `.{0,255}`: `.` takes no line break.
    if len(value) > DESCRIPTION_MAX_LENGTH or "\n" in value or "\r" in value:
        raise ValueError(f"description must be one line of at most {DESCRIPTION_MAX_LENGTH} characters")
    return value


def _ipv4(label: str, value: str) -> str:
    try:
        ipaddress.IPv4Address(value)
    except ValueError:
        raise ValueError(f"{label} must be an IPv4 address") from None
    return value


def _ipv6(label: str, value: str) -> str:
    try:
        if "%" in value:
            raise ValueError
        ipaddress.IPv6Address(value)
    except ValueError:
        raise ValueError(f"{label} must be an IPv6 address") from None
    return value


def _ip(label: str, value: str) -> str:
    try:
        if "%" in value:
            raise ValueError
        ipaddress.ip_address(value)
    except ValueError:
        raise ValueError(f"{label} must be an IPv4 or IPv6 address") from None
    return value


def _as_list(label: str, value: str) -> str:
    """One value holding space-separated AS numbers (the lab rejects commas)."""
    if not _AS_LIST.fullmatch(value) or not all(_part("as_number", asn) for asn in value.split(" ")):
        raise ValueError(f"{label} must be AS numbers from 1 to {U32_MAX} separated by spaces")
    return value


def _ip_access_list(label: str, value: str) -> str:
    """An IPv4 access-list number: any u32 (ASCII digits)."""
    return _number("ip_access_list", label, value)


def _metric(value: str) -> str:
    digits = value.lstrip("+-")
    if not _METRIC.fullmatch(value) or (digits != "rtt" and not _part("metric", digits)):
        raise ValueError(f"set metric must be [+-]0-{U32_MAX} or [+-]rtt")
    return value


def _bandwidth(value: str, keywords: Tuple[str, ...]) -> str:
    if value in keywords:
        return value
    bounds = RANGES["extcommunity_bandwidth"]
    if not _DECIMAL.fullmatch(value) or not bounds["min"] <= int(value) <= bounds["max"]:
        raise ValueError(
            f"set extcommunity bandwidth must be {bounds['min']}-{bounds['max']} or one of: {', '.join(keywords)}"
        )
    return value


def _extcommunity(label: str, value: str) -> str:
    """``ASN:NN`` (0-65535:0-4294967295) or ``IPv4:NN`` (0-65535)."""
    head, sep, tail = value.rpartition(":")
    ok = False
    if sep and _DECIMAL.fullmatch(tail):
        if _DECIMAL.fullmatch(head):
            ok = _part("extcommunity_asn", head) and _part("extcommunity_asn_value", tail)
        else:
            try:
                ipaddress.IPv4Address(head)
                ok = _part("extcommunity_ip_value", tail)
            except ValueError:
                ok = False
    if not ok:
        raise ValueError(f"{label} must be ASN:NN (0-65535:0-{U32_MAX}) or IPv4:NN (0-65535)")
    return value


def _community(label: str, value: str, well_known: Tuple[str, ...]) -> str:
    if value in well_known:
        return value
    match = _COMMUNITY.fullmatch(value)
    if not match or not all(_part("community_part", part) for part in match.groups()):
        raise ValueError(f"{label} must be AA:NN (0-65535:0-65535) or a well-known community")
    return value


def _large_community(label: str, value: str) -> str:
    match = _LARGE_COMMUNITY.fullmatch(value)
    if not match or not all(_part("large_community_part", part) for part in match.groups()):
        raise ValueError(f"{label} must be GA:LD1:LD2 with each part 0-{U32_MAX}")
    return value


class RouteMapBatchBuilder(BatchBuilder):
    """Complete batch builder for route-map operations."""

    # Not a batch op: reorder calls it with a raw config subtree.
    _INTERNAL_BUILDER_METHODS = frozenset({"restore_rule"})

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "route_map"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> RouteMapMapper:
        return cast(RouteMapMapper, self.mappers[self.mapper_key])

    def _map(self, name: str) -> RouteMapMapper:
        _name(name)
        return self._mapper()

    def _rule(self, name: str, rule: str) -> RouteMapMapper:
        mapper = self._map(name)
        _number("rule", "rule", rule)
        return mapper

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a node only one VyOS version has; ValueError elsewhere."""
        mapper = self._mapper()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Route-map
    # ========================================================================

    def set_route_map(self, name: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._map(name).get_route_map_path(name))

    def delete_route_map(self, name: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._map(name).get_route_map_path(name))

    def set_route_map_description(self, name: str, description: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._map(name).get_route_map_description(name, _description(description)))

    def delete_route_map_description(self, name: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._map(name).get_route_map_description_path(name))

    # ========================================================================
    # Rule
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_rule_path(name, rule))

    def delete_rule(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_path(name, rule))

    def restore_rule(self, name: str, rule: str, tree: Any) -> "RouteMapBatchBuilder":
        """Recreate a rule under a new number from its config subtree (reorder)."""
        for path in self._rule(name, rule).rule_tree_paths(name, rule, tree):
            self.add_set(path)
        return self

    def set_rule_description(self, name: str, rule: str, description: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_rule_description(name, rule, _description(description)))

    def delete_rule_description(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_description_path(name, rule))

    def set_rule_action(self, name: str, rule: str, action: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_rule_action(name, rule, _choice("action", action, mapper.rule_actions())))

    def delete_rule_action(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_action_path(name, rule))

    def set_rule_call(self, name: str, rule: str, call_map: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_rule_call(name, rule, call_map))

    def delete_rule_call(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_call_path(name, rule))

    def set_rule_continue(self, name: str, rule: str, continue_rule: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_rule_continue(name, rule, _number("continue", "continue", continue_rule)))

    def delete_rule_continue(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_continue_path(name, rule))

    def set_rule_on_match_goto(self, name: str, rule: str, goto_rule: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("on_match_goto", "on-match goto", goto_rule)
        return self.add_set(mapper.get_rule_on_match_goto(name, rule, value))

    def delete_rule_on_match_goto(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_on_match_goto_path(name, rule))

    def delete_rule_on_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete the whole ``on-match`` node (goto and next)."""
        return self.add_delete(self._rule(name, rule).get_rule_on_match_path(name, rule))

    def set_rule_on_match_next(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_rule_on_match_next_path(name, rule))

    def delete_rule_on_match_next(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_rule_on_match_next_path(name, rule))

    # ========================================================================
    # Match - BGP attributes
    # ========================================================================

    def delete_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete the rule ``match`` node and every match condition."""
        return self.add_delete(self._rule(name, rule).get_match_path(name, rule))

    def delete_match_ip(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete ``match ip`` (address, nexthop and route-source)."""
        return self.add_delete(self._rule(name, rule).get_match_ip_path(name, rule))

    def delete_match_ipv6(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete ``match ipv6`` (address and nexthop)."""
        return self.add_delete(self._rule(name, rule).get_match_ipv6_path(name, rule))

    def set_match_as_path(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_as_path(name, rule, as_path))

    def delete_match_as_path(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_as_path_path(name, rule))

    def set_match_community(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_community(name, rule, community))

    def delete_match_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete ``match community`` (its list and exact-match)."""
        return self.add_delete(self._rule(name, rule).get_match_community_path(name, rule))

    def delete_match_community_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_community_list_path(name, rule))

    def set_match_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_community_exact_match_path(name, rule))

    def delete_match_community_exact_match(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_community_exact_match_path(name, rule))

    def set_match_extcommunity(self, name: str, rule: str, extcommunity: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_extcommunity(name, rule, extcommunity))

    def delete_match_extcommunity(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_extcommunity_path(name, rule))

    def set_match_large_community(self, name: str, rule: str, large_community: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_large_community(name, rule, large_community))

    def delete_match_large_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_large_community_path(name, rule))

    def delete_match_large_community_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_large_community_list_path(name, rule))

    def set_match_local_preference(self, name: str, rule: str, local_pref: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("match_local_preference", "match local-preference", local_pref)
        return self.add_set(mapper.get_match_local_preference(name, rule, value))

    def delete_match_local_preference(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_local_preference_path(name, rule))

    def set_match_metric(self, name: str, rule: str, metric: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_match_metric(name, rule, _number("match_metric", "match metric", metric)))

    def delete_match_metric(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_metric_path(name, rule))

    def set_match_origin(self, name: str, rule: str, origin: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_match_origin(name, rule, _choice("match origin", origin, mapper.origins())))

    def delete_match_origin(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_origin_path(name, rule))

    def set_match_peer(self, name: str, rule: str, peer: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_peer(name, rule, _ip("match peer", peer)))

    def delete_match_peer(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_peer_path(name, rule))

    def set_match_rpki(self, name: str, rule: str, rpki: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_match_rpki(name, rule, _choice("match rpki", rpki, mapper.rpki_states())))

    def delete_match_rpki(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_rpki_path(name, rule))

    def set_match_rpki_extcommunity(self, name: str, rule: str, state: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        # The node check runs first, so 1.4 names the missing node.
        path = self._versioned_path(MATCH_RPKI_EXTCOMMUNITY, "get_match_rpki_extcommunity", name, rule, state)
        _choice("match rpki-extcommunity", state, mapper.rpki_states())
        return self.add_set(path)

    def delete_match_rpki_extcommunity(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        self._rule(name, rule)
        return self.add_delete(
            self._versioned_path(MATCH_RPKI_EXTCOMMUNITY, "get_match_rpki_extcommunity_path", name, rule)
        )

    def set_match_source_peer(self, name: str, rule: str, peer: str) -> "RouteMapBatchBuilder":
        self._rule(name, rule)
        return self.add_set(self._versioned_path(MATCH_SOURCE_PEER, "get_match_source_peer", name, rule, peer))

    def delete_match_source_peer(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        self._rule(name, rule)
        return self.add_delete(self._versioned_path(MATCH_SOURCE_PEER, "get_match_source_peer_path", name, rule))

    # ========================================================================
    # Match - EVPN
    # ========================================================================

    def delete_match_evpn(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every EVPN match condition."""
        return self.add_delete(self._rule(name, rule).get_match_evpn_path(name, rule))

    def set_match_evpn_default_route(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_evpn_default_route_path(name, rule))

    def delete_match_evpn_default_route(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_evpn_default_route_path(name, rule))

    def set_match_evpn_rd(self, name: str, rule: str, rd: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_evpn_rd(name, rule, rd))

    def delete_match_evpn_rd(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_evpn_rd_path(name, rule))

    def set_match_evpn_route_type(self, name: str, rule: str, route_type: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _choice("match evpn route-type", route_type, mapper.evpn_route_types())
        return self.add_set(mapper.get_match_evpn_route_type(name, rule, value))

    def delete_match_evpn_route_type(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_evpn_route_type_path(name, rule))

    def set_match_evpn_vni(self, name: str, rule: str, vni: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        low, high = mapper.evpn_vni_range()
        return self.add_set(mapper.get_match_evpn_vni(name, rule, _in_range("match evpn vni", vni, low, high)))

    def delete_match_evpn_vni(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_evpn_vni_path(name, rule))

    # ========================================================================
    # Match - IP / IPv6 address
    # ========================================================================

    def delete_match_ip_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``match ip address`` leaf."""
        return self.add_delete(self._rule(name, rule).get_match_ip_address_path(name, rule))

    def set_match_ip_address_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ip_access_list("match ip address access-list", access_list)
        return self.add_set(mapper.get_match_ip_address_access_list(name, rule, value))

    def delete_match_ip_address_access_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_address_access_list_path(name, rule))

    def set_match_ip_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ip_address_prefix_list(name, rule, prefix_list))

    def delete_match_ip_address_prefix_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_address_prefix_list_path(name, rule))

    def set_match_ip_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("ip_prefix_len", "match ip address prefix-len", prefix_len)
        return self.add_set(mapper.get_match_ip_address_prefix_len(name, rule, value))

    def delete_match_ip_address_prefix_len(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_address_prefix_len_path(name, rule))

    def delete_match_ipv6_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``match ipv6 address`` leaf."""
        return self.add_delete(self._rule(name, rule).get_match_ipv6_address_path(name, rule))

    def set_match_ipv6_address_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ipv6_address_access_list(name, rule, access_list))

    def delete_match_ipv6_address_access_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_address_access_list_path(name, rule))

    def set_match_ipv6_address_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ipv6_address_prefix_list(name, rule, prefix_list))

    def delete_match_ipv6_address_prefix_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_address_prefix_list_path(name, rule))

    def set_match_ipv6_address_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("ipv6_prefix_len", "match ipv6 address prefix-len", prefix_len)
        return self.add_set(mapper.get_match_ipv6_address_prefix_len(name, rule, value))

    def delete_match_ipv6_address_prefix_len(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_address_prefix_len_path(name, rule))

    # ========================================================================
    # Match - next-hop
    # ========================================================================

    def delete_match_ip_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``match ip nexthop`` leaf."""
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_path(name, rule))

    def set_match_ip_nexthop_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ip_access_list("match ip nexthop access-list", access_list)
        return self.add_set(mapper.get_match_ip_nexthop_access_list(name, rule, value))

    def delete_match_ip_nexthop_access_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_access_list_path(name, rule))

    def set_match_ip_nexthop_address(self, name: str, rule: str, address: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv4("match ip nexthop address", address)
        return self.add_set(mapper.get_match_ip_nexthop_address(name, rule, value))

    def delete_match_ip_nexthop_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_address_path(name, rule))

    def set_match_ip_nexthop_prefix_len(self, name: str, rule: str, prefix_len: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("ip_prefix_len", "match ip nexthop prefix-len", prefix_len)
        return self.add_set(mapper.get_match_ip_nexthop_prefix_len(name, rule, value))

    def delete_match_ip_nexthop_prefix_len(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_prefix_len_path(name, rule))

    def set_match_ip_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ip_nexthop_prefix_list(name, rule, prefix_list))

    def delete_match_ip_nexthop_prefix_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_prefix_list_path(name, rule))

    def set_match_ip_nexthop_type(self, name: str, rule: str, nh_type: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _choice("match ip nexthop type", nh_type, mapper.nexthop_types())
        return self.add_set(mapper.get_match_ip_nexthop_type(name, rule, value))

    def delete_match_ip_nexthop_type(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_nexthop_type_path(name, rule))

    def delete_match_ipv6_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``match ipv6 nexthop`` leaf."""
        return self.add_delete(self._rule(name, rule).get_match_ipv6_nexthop_path(name, rule))

    def set_match_ipv6_nexthop_access_list(self, name: str, rule: str, access_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ipv6_nexthop_access_list(name, rule, access_list))

    def delete_match_ipv6_nexthop_access_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_nexthop_access_list_path(name, rule))

    def set_match_ipv6_nexthop_address(self, name: str, rule: str, address: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv6("match ipv6 nexthop address", address)
        return self.add_set(mapper.get_match_ipv6_nexthop_address(name, rule, value))

    def delete_match_ipv6_nexthop_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_nexthop_address_path(name, rule))

    def set_match_ipv6_nexthop_prefix_list(self, name: str, rule: str, prefix_list: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ipv6_nexthop_prefix_list(name, rule, prefix_list))

    def delete_match_ipv6_nexthop_prefix_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_nexthop_prefix_list_path(name, rule))

    def set_match_ipv6_nexthop_type(self, name: str, rule: str, nh_type: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _choice("match ipv6 nexthop type", nh_type, mapper.nexthop_types())
        return self.add_set(mapper.get_match_ipv6_nexthop_type(name, rule, value))

    def delete_match_ipv6_nexthop_type(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ipv6_nexthop_type_path(name, rule))

    # ========================================================================
    # Match - route source
    # ========================================================================

    def delete_match_ip_route_source(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``match ip route-source`` leaf."""
        return self.add_delete(self._rule(name, rule).get_match_ip_route_source_path(name, rule))

    def set_match_ip_route_source_access_list(
        self, name: str, rule: str, access_list: str
    ) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ip_access_list("match ip route-source access-list", access_list)
        return self.add_set(mapper.get_match_ip_route_source_access_list(name, rule, value))

    def delete_match_ip_route_source_access_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_route_source_access_list_path(name, rule))

    def set_match_ip_route_source_prefix_list(
        self, name: str, rule: str, prefix_list: str
    ) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_ip_route_source_prefix_list(name, rule, prefix_list))

    def delete_match_ip_route_source_prefix_list(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_ip_route_source_prefix_list_path(name, rule))

    # ========================================================================
    # Match - other
    # ========================================================================

    def set_match_interface(self, name: str, rule: str, interface: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_interface(name, rule, interface))

    def delete_match_interface(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_interface_path(name, rule))

    def set_match_protocol(self, name: str, rule: str, protocol: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _choice("match protocol", protocol, mapper.protocols())
        return self.add_set(mapper.get_match_protocol(name, rule, value))

    def delete_match_protocol(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_protocol_path(name, rule))

    def set_match_source_vrf(self, name: str, rule: str, vrf: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_match_source_vrf(name, rule, vrf))

    def delete_match_source_vrf(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_source_vrf_path(name, rule))

    def set_match_tag(self, name: str, rule: str, tag: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_match_tag(name, rule, _number("match_tag", "match tag", tag)))

    def delete_match_tag(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_match_tag_path(name, rule))

    # ========================================================================
    # Set - AS path
    # ========================================================================

    def delete_set(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete the rule ``set`` node and every set action."""
        return self.add_delete(self._rule(name, rule).get_set_path(name, rule))

    def delete_set_as_path(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete ``set as-path`` (exclude, prepend and prepend-last-as)."""
        return self.add_delete(self._rule(name, rule).get_set_as_path_path(name, rule))

    def set_as_path_exclude(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = as_path if as_path == "all" else _as_list("set as-path exclude", as_path)
        return self.add_set(mapper.get_set_as_path_exclude(name, rule, value))

    def delete_set_as_path_exclude(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_as_path_exclude_path(name, rule))

    def set_as_path_prepend(self, name: str, rule: str, as_path: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_as_path_prepend(name, rule, _as_list("set as-path prepend", as_path)))

    def delete_set_as_path_prepend(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_as_path_prepend_path(name, rule))

    def set_as_path_prepend_last_as(self, name: str, rule: str, count: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("as_path_prepend_last_as", "set as-path prepend-last-as", count)
        return self.add_set(mapper.get_set_as_path_prepend_last_as(name, rule, value))

    def delete_set_as_path_prepend_last_as(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_as_path_prepend_last_as_path(name, rule))

    # ========================================================================
    # Set - community
    # ========================================================================

    def delete_set_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``set community`` leaf."""
        return self.add_delete(self._rule(name, rule).get_set_community_path(name, rule))

    def set_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set community add``."""
        mapper = self._rule(name, rule)
        value = _community("set community add", community, mapper.community_well_known())
        return self.add_set(mapper.get_set_community_add(name, rule, value))

    def delete_set_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Remove one value from ``set community add``."""
        return self.add_delete(self._rule(name, rule).get_set_community_add(name, rule, community))

    def set_community_replace(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set community replace``."""
        mapper = self._rule(name, rule)
        value = _community("set community replace", community, mapper.community_well_known())
        return self.add_set(mapper.get_set_community_replace(name, rule, value))

    def delete_set_community_replace(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Remove one value from ``set community replace``."""
        return self.add_delete(self._rule(name, rule).get_set_community_replace(name, rule, community))

    def set_community_delete(self, name: str, rule: str, community_list: str) -> "RouteMapBatchBuilder":
        """``set community delete <community-list>``: one value leaf naming a list."""
        return self.add_set(self._rule(name, rule).get_set_community_delete(name, rule, community_list))

    def delete_set_community_delete(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_community_delete_path(name, rule))

    def set_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_community_none_path(name, rule))

    def delete_set_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_community_none_path(name, rule))

    # ========================================================================
    # Set - large-community
    # ========================================================================

    def delete_set_large_community(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``set large-community`` leaf."""
        return self.add_delete(self._rule(name, rule).get_set_large_community_path(name, rule))

    def set_large_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set large-community add``."""
        mapper = self._rule(name, rule)
        value = _large_community("set large-community add", community)
        return self.add_set(mapper.get_set_large_community_add(name, rule, value))

    def delete_set_large_community_add(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Remove one value from ``set large-community add``."""
        return self.add_delete(self._rule(name, rule).get_set_large_community_add(name, rule, community))

    def set_large_community_replace(self, name: str, rule: str, community: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set large-community replace``."""
        mapper = self._rule(name, rule)
        value = _large_community("set large-community replace", community)
        return self.add_set(mapper.get_set_large_community_replace(name, rule, value))

    def delete_set_large_community_replace(
        self, name: str, rule: str, community: str
    ) -> "RouteMapBatchBuilder":
        """Remove one value from ``set large-community replace``."""
        return self.add_delete(self._rule(name, rule).get_set_large_community_replace(name, rule, community))

    def set_large_community_delete(self, name: str, rule: str, community_list: str) -> "RouteMapBatchBuilder":
        """``set large-community delete <large-community-list>``: one value leaf naming a list."""
        return self.add_set(self._rule(name, rule).get_set_large_community_delete(name, rule, community_list))

    def delete_set_large_community_delete(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_large_community_delete_path(name, rule))

    def set_large_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_large_community_none_path(name, rule))

    def delete_set_large_community_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_large_community_none_path(name, rule))

    # ========================================================================
    # Set - extcommunity
    # ========================================================================

    def delete_set_extcommunity(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``set extcommunity`` leaf."""
        return self.add_delete(self._rule(name, rule).get_set_extcommunity_path(name, rule))

    def set_extcommunity_bandwidth(self, name: str, rule: str, bandwidth: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _bandwidth(bandwidth, mapper.extcommunity_bandwidth_keywords())
        return self.add_set(mapper.get_set_extcommunity_bandwidth(name, rule, value))

    def delete_set_extcommunity_bandwidth(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_extcommunity_bandwidth_path(name, rule))

    def set_extcommunity_bandwidth_non_transitive(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Encode the extcommunity bandwidth as non-transitive (needs bandwidth too)."""
        return self.add_set(self._rule(name, rule).get_set_extcommunity_bandwidth_non_transitive_path(name, rule))

    def delete_set_extcommunity_bandwidth_non_transitive(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(
            self._rule(name, rule).get_set_extcommunity_bandwidth_non_transitive_path(name, rule)
        )

    def set_extcommunity_rt(self, name: str, rule: str, rt: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set extcommunity rt``."""
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_extcommunity_rt(name, rule, _extcommunity("set extcommunity rt", rt)))

    def delete_set_extcommunity_rt(self, name: str, rule: str, rt: str) -> "RouteMapBatchBuilder":
        """Remove one value from ``set extcommunity rt``."""
        return self.add_delete(self._rule(name, rule).get_set_extcommunity_rt(name, rule, rt))

    def set_extcommunity_soo(self, name: str, rule: str, soo: str) -> "RouteMapBatchBuilder":
        """Add one value to the ``multi:`` leaf ``set extcommunity soo``."""
        mapper = self._rule(name, rule)
        value = _extcommunity("set extcommunity soo", soo)
        return self.add_set(mapper.get_set_extcommunity_soo(name, rule, value))

    def delete_set_extcommunity_soo(self, name: str, rule: str, soo: str) -> "RouteMapBatchBuilder":
        """Remove one value from ``set extcommunity soo``."""
        return self.add_delete(self._rule(name, rule).get_set_extcommunity_soo(name, rule, soo))

    def set_extcommunity_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_extcommunity_none_path(name, rule))

    def delete_set_extcommunity_none(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_extcommunity_none_path(name, rule))

    # ========================================================================
    # Set - BGP attributes
    # ========================================================================

    def set_atomic_aggregate(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_atomic_aggregate_path(name, rule))

    def delete_set_atomic_aggregate(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_atomic_aggregate_path(name, rule))

    def delete_set_aggregator(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete ``set aggregator`` (as and ip)."""
        return self.add_delete(self._rule(name, rule).get_set_aggregator_path(name, rule))

    def set_aggregator_as(self, name: str, rule: str, as_number: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("aggregator_as", "set aggregator as", as_number)
        return self.add_set(mapper.get_set_aggregator_as(name, rule, value))

    def delete_set_aggregator_as(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_aggregator_as_path(name, rule))

    def set_aggregator_ip(self, name: str, rule: str, ip: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_aggregator_ip(name, rule, _ipv4("set aggregator ip", ip)))

    def delete_set_aggregator_ip(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_aggregator_ip_path(name, rule))

    def set_local_preference(self, name: str, rule: str, local_pref: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _number("local_preference", "set local-preference", local_pref)
        return self.add_set(mapper.get_set_local_preference(name, rule, value))

    def delete_set_local_preference(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_local_preference_path(name, rule))

    def set_origin(self, name: str, rule: str, origin: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_origin(name, rule, _choice("set origin", origin, mapper.origins())))

    def delete_set_origin(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_origin_path(name, rule))

    def set_originator_id(self, name: str, rule: str, originator_id: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv4("set originator-id", originator_id)
        return self.add_set(mapper.get_set_originator_id(name, rule, value))

    def delete_set_originator_id(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_originator_id_path(name, rule))

    def set_weight(self, name: str, rule: str, weight: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_weight(name, rule, _number("weight", "set weight", weight)))

    def delete_set_weight(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_weight_path(name, rule))

    # ========================================================================
    # Set - next-hop
    # ========================================================================

    # ``set ip-next-hop`` is one value leaf; a set replaces the value, so
    # switching between an address and a keyword needs no delete.

    def set_ip_nexthop(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_ip_nexthop(name, rule, _ipv4("set ip-next-hop", nexthop)))

    def set_ip_nexthop_peer_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_ip_nexthop_peer_address(name, rule))

    def set_ip_nexthop_unchanged(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_ip_nexthop_unchanged(name, rule))

    def delete_set_ip_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_ip_nexthop_path(name, rule))

    def delete_set_ipv6_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every ``set ipv6-next-hop`` leaf."""
        return self.add_delete(self._rule(name, rule).get_set_ipv6_nexthop_path(name, rule))

    def set_ipv6_nexthop_global(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv6("set ipv6-next-hop global", nexthop)
        return self.add_set(mapper.get_set_ipv6_nexthop_global(name, rule, value))

    def delete_set_ipv6_nexthop_global(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_ipv6_nexthop_global_path(name, rule))

    def set_ipv6_nexthop_local(self, name: str, rule: str, nexthop: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv6("set ipv6-next-hop local", nexthop)
        return self.add_set(mapper.get_set_ipv6_nexthop_local(name, rule, value))

    def delete_set_ipv6_nexthop_local(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_ipv6_nexthop_local_path(name, rule))

    def set_ipv6_nexthop_peer_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_ipv6_nexthop_peer_address_path(name, rule))

    def delete_set_ipv6_nexthop_peer_address(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_ipv6_nexthop_peer_address_path(name, rule))

    def set_ipv6_nexthop_prefer_global(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_ipv6_nexthop_prefer_global_path(name, rule))

    def delete_set_ipv6_nexthop_prefer_global(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_ipv6_nexthop_prefer_global_path(name, rule))

    def delete_set_l3vpn_nexthop(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete the whole ``set l3vpn-nexthop`` subtree."""
        return self.add_delete(self._rule(name, rule).get_set_l3vpn_nexthop_path(name, rule))

    def set_l3vpn_nexthop_encapsulation_gre(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_l3vpn_nexthop_encapsulation_gre_path(name, rule))

    def delete_set_l3vpn_nexthop_encapsulation_gre(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_l3vpn_nexthop_encapsulation_gre_path(name, rule))

    # ========================================================================
    # Set - EVPN
    # ========================================================================

    def delete_set_evpn(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        """Delete every EVPN set action."""
        return self.add_delete(self._rule(name, rule).get_set_evpn_path(name, rule))

    def set_evpn_gateway_ipv4(self, name: str, rule: str, gateway: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv4("set evpn gateway ipv4", gateway)
        return self.add_set(mapper.get_set_evpn_gateway_ipv4(name, rule, value))

    def delete_set_evpn_gateway_ipv4(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_evpn_gateway_ipv4_path(name, rule))

    def set_evpn_gateway_ipv6(self, name: str, rule: str, gateway: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _ipv6("set evpn gateway ipv6", gateway)
        return self.add_set(mapper.get_set_evpn_gateway_ipv6(name, rule, value))

    def delete_set_evpn_gateway_ipv6(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_evpn_gateway_ipv6_path(name, rule))

    # ========================================================================
    # Set - route properties
    # ========================================================================

    def set_distance(self, name: str, rule: str, distance: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_distance(name, rule, _number("distance", "set distance", distance)))

    def delete_set_distance(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_distance_path(name, rule))

    def set_metric(self, name: str, rule: str, metric: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_metric(name, rule, _metric(metric)))

    def delete_set_metric(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_metric_path(name, rule))

    def set_metric_type(self, name: str, rule: str, metric_type: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        value = _choice("set metric-type", metric_type, mapper.metric_types())
        return self.add_set(mapper.get_set_metric_type(name, rule, value))

    def delete_set_metric_type(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_metric_type_path(name, rule))

    def set_src(self, name: str, rule: str, src: str) -> "RouteMapBatchBuilder":
        return self.add_set(self._rule(name, rule).get_set_src(name, rule, _ip("set src", src)))

    def delete_set_src(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_src_path(name, rule))

    def set_table(self, name: str, rule: str, table: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        low, high = mapper.table_range()
        return self.add_set(mapper.get_set_table(name, rule, _in_range("set table", table, low, high)))

    def delete_set_table(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_table_path(name, rule))

    def set_tag(self, name: str, rule: str, tag: str) -> "RouteMapBatchBuilder":
        mapper = self._rule(name, rule)
        return self.add_set(mapper.get_set_tag(name, rule, _number("tag", "set tag", tag)))

    def delete_set_tag(self, name: str, rule: str) -> "RouteMapBatchBuilder":
        return self.add_delete(self._rule(name, rule).get_set_tag_path(name, rule))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        mapper = self._mapper()
        nodes = mapper.versioned_nodes()
        vni_min, vni_max = mapper.evpn_vni_range()
        table_min, table_max = mapper.table_range()
        evpn_route_types = list(mapper.evpn_route_types())
        return {
            "version": self.version,
            "features": {
                "basic": {"supported": True, "description": "Basic route-map configuration"},
                "rules": {"supported": True, "description": "Route-map rules with permit/deny"},
                "match_conditions": {
                    "supported": True,
                    "description": "Match conditions (AS path, community, IP, etc.)",
                },
                "match_rpki_extcommunity": {
                    "supported": MATCH_RPKI_EXTCOMMUNITY in nodes,
                    "description": "Match RPKI origin validation extended community",
                },
                "match_source_peer": {
                    "supported": MATCH_SOURCE_PEER in nodes,
                    "description": "Match BGP source peer",
                },
                "match_evpn": {
                    "supported": True,
                    "description": "Match EVPN default route, RD, route type and VNI",
                    "route_types": evpn_route_types,
                    "vni_min": vni_min,
                    "vni_max": vni_max,
                },
                "set_actions": {
                    "supported": True,
                    "description": "Set actions (local-pref, metric, next-hop, etc.)",
                },
                "bgp_attributes": {"supported": True, "description": "BGP-specific attributes and communities"},
                "call_continue": {"supported": True, "description": "Call and continue to other route-maps"},
                "on_match": {"supported": True, "description": "On-match actions (goto, next)"},
            },
            "values": {
                "rule_actions": list(mapper.rule_actions()),
                "origins": list(mapper.origins()),
                "rpki_states": list(mapper.rpki_states()),
                "metric_types": list(mapper.metric_types()),
                "protocols": list(mapper.protocols()),
                "nexthop_types": list(mapper.nexthop_types()),
                "evpn_route_types": evpn_route_types,
                "extcommunity_bandwidth_keywords": list(mapper.extcommunity_bandwidth_keywords()),
                "community_well_known": list(mapper.community_well_known()),
            },
            "ranges": {
                **RANGES,
                "evpn_vni": {"min": vni_min, "max": vni_max},
                "table": {"min": table_min, "max": table_max},
            },
            "description_max_length": DESCRIPTION_MAX_LENGTH,
            # 1.5 rejects ``set as-path prepend`` together with ``prepend-last-as``.
            "as_path_prepend_exclusive": mapper.as_path_prepend_exclusive(),
        }
