"""Read-model for policy route-map config.

Mappers own VyOS tree shape. The router builds its response model from this
dict unchanged. A flag is read by key membership, a value leaf as its string
(or int where the model declares one), and a ``multi:`` leaf as a list
(``[]`` when absent; the device returns one value as a plain string).
"""

from typing import Any, Dict, List, Optional


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _str(value: Any) -> Optional[str]:
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        return str(value)
    return None


def _int(value: Any) -> Optional[int]:
    text = _str(value)
    if text is not None and text.isascii() and text.isdigit():
        return int(text)
    return None


def _list(value: Any) -> List[str]:
    items = value if isinstance(value, list) else [value]
    return [text for text in (_str(item) for item in items) if text is not None]


def _parse_match(raw: Any) -> Dict[str, Any]:
    match = _dict(raw)
    community = _dict(match.get("community"))
    large_community = _dict(match.get("large-community"))
    evpn = _dict(match.get("evpn"))
    ip = _dict(match.get("ip"))
    ipv6 = _dict(match.get("ipv6"))
    ip_address = _dict(ip.get("address"))
    ipv6_address = _dict(ipv6.get("address"))
    ip_nexthop = _dict(ip.get("nexthop"))
    ipv6_nexthop = _dict(ipv6.get("nexthop"))
    route_source = _dict(ip.get("route-source"))
    return {
        "as_path": _str(match.get("as-path")),
        "community_list": _str(community.get("community-list")),
        "community_exact_match": "exact-match" in community,
        "extcommunity": _str(match.get("extcommunity")),
        "large_community_list": _str(large_community.get("large-community-list")),
        "local_preference": _int(match.get("local-preference")),
        "metric": _int(match.get("metric")),
        "origin": _str(match.get("origin")),
        "peer": _str(match.get("peer")),
        "rpki": _str(match.get("rpki")),
        "rpki_extcommunity": _str(match.get("rpki-extcommunity")),
        "source_peer": _str(match.get("source-peer")),
        "evpn_default_route": "default-route" in evpn,
        "evpn_rd": _str(evpn.get("rd")),
        "evpn_route_type": _str(evpn.get("route-type")),
        "evpn_vni": _int(evpn.get("vni")),
        "ip_address_access_list": _str(ip_address.get("access-list")),
        "ip_address_prefix_list": _str(ip_address.get("prefix-list")),
        "ip_address_prefix_len": _int(ip_address.get("prefix-len")),
        "ipv6_address_access_list": _str(ipv6_address.get("access-list")),
        "ipv6_address_prefix_list": _str(ipv6_address.get("prefix-list")),
        "ipv6_address_prefix_len": _int(ipv6_address.get("prefix-len")),
        "ip_nexthop_access_list": _str(ip_nexthop.get("access-list")),
        "ip_nexthop_address": _str(ip_nexthop.get("address")),
        "ip_nexthop_prefix_len": _int(ip_nexthop.get("prefix-len")),
        "ip_nexthop_prefix_list": _str(ip_nexthop.get("prefix-list")),
        "ip_nexthop_type": _str(ip_nexthop.get("type")),
        "ipv6_nexthop_access_list": _str(ipv6_nexthop.get("access-list")),
        "ipv6_nexthop_address": _str(ipv6_nexthop.get("address")),
        "ipv6_nexthop_prefix_list": _str(ipv6_nexthop.get("prefix-list")),
        "ipv6_nexthop_type": _str(ipv6_nexthop.get("type")),
        "ip_route_source_access_list": _str(route_source.get("access-list")),
        "ip_route_source_prefix_list": _str(route_source.get("prefix-list")),
        "interface": _str(match.get("interface")),
        "protocol": _str(match.get("protocol")),
        "source_vrf": _str(match.get("source-vrf")),
        "tag": _int(match.get("tag")),
    }


def _parse_set(raw: Any) -> Dict[str, Any]:
    actions = _dict(raw)
    as_path = _dict(actions.get("as-path"))
    community = _dict(actions.get("community"))
    large_community = _dict(actions.get("large-community"))
    extcommunity = _dict(actions.get("extcommunity"))
    aggregator = _dict(actions.get("aggregator"))
    ipv6_nexthop = _dict(actions.get("ipv6-next-hop"))
    l3vpn_encapsulation = _dict(_dict(actions.get("l3vpn-nexthop")).get("encapsulation"))
    evpn_gateway = _dict(_dict(actions.get("evpn")).get("gateway"))
    # ``set ip-next-hop`` is one value leaf: an IPv4 address or a keyword.
    ip_nexthop = _str(actions.get("ip-next-hop"))
    return {
        "as_path_exclude": _str(as_path.get("exclude")),
        "as_path_prepend": _str(as_path.get("prepend")),
        "as_path_prepend_last_as": _int(as_path.get("prepend-last-as")),
        "community_add_values": _list(community.get("add")),
        "community_replace_values": _list(community.get("replace")),
        "community_delete": _str(community.get("delete")),
        "community_remove_all": "none" in community,
        "large_community_add_values": _list(large_community.get("add")),
        "large_community_replace_values": _list(large_community.get("replace")),
        "large_community_delete": _str(large_community.get("delete")),
        "large_community_remove_all": "none" in large_community,
        "extcommunity_bandwidth": _str(extcommunity.get("bandwidth")),
        "extcommunity_bandwidth_non_transitive": "bandwidth-non-transitive" in extcommunity,
        "extcommunity_rt": _list(extcommunity.get("rt")),
        "extcommunity_soo": _list(extcommunity.get("soo")),
        "extcommunity_none": "none" in extcommunity,
        "atomic_aggregate": "atomic-aggregate" in actions,
        "aggregator_as": _str(aggregator.get("as")),
        "aggregator_ip": _str(aggregator.get("ip")),
        "local_preference": _int(actions.get("local-preference")),
        "origin": _str(actions.get("origin")),
        "originator_id": _str(actions.get("originator-id")),
        "weight": _int(actions.get("weight")),
        "ip_nexthop": ip_nexthop if ip_nexthop not in (None, "peer-address", "unchanged") else None,
        "ip_nexthop_peer_address": ip_nexthop == "peer-address",
        "ip_nexthop_unchanged": ip_nexthop == "unchanged",
        "ipv6_nexthop_global": _str(ipv6_nexthop.get("global")),
        "ipv6_nexthop_local": _str(ipv6_nexthop.get("local")),
        "ipv6_nexthop_peer_address": "peer-address" in ipv6_nexthop,
        "ipv6_nexthop_prefer_global": "prefer-global" in ipv6_nexthop,
        "l3vpn_nexthop_encapsulation_gre": "gre" in l3vpn_encapsulation,
        "evpn_gateway_ipv4": _str(evpn_gateway.get("ipv4")),
        "evpn_gateway_ipv6": _str(evpn_gateway.get("ipv6")),
        "distance": _int(actions.get("distance")),
        "metric": _str(actions.get("metric")),
        "metric_type": _str(actions.get("metric-type")),
        "src": _str(actions.get("src")),
        "table": _int(actions.get("table")),
        "tag": _int(actions.get("tag")),
    }


def _parse_rule(number: str, raw: Any) -> Dict[str, Any]:
    rule = _dict(raw)
    on_match = _dict(rule.get("on-match"))
    return {
        "rule_number": int(number),
        "description": _str(rule.get("description")),
        # The lab verify requires an action, so a committed rule has one.
        "action": _str(rule.get("action")) or "permit",
        "call": _str(rule.get("call")),
        "continue_rule": _int(rule.get("continue")),
        "on_match_goto": _int(on_match.get("goto")),
        "on_match_next": "next" in on_match,
        "match": _parse_match(rule.get("match")),
        "set": _parse_set(rule.get("set")),
    }


def _parse_route_map(name: str, raw: Any) -> Dict[str, Any]:
    route_map = _dict(raw)
    rules = [
        _parse_rule(str(number), tree)
        for number, tree in _dict(route_map.get("rule")).items()
        if str(number).isascii() and str(number).isdigit()
    ]
    rules.sort(key=lambda item: item["rule_number"])
    return {"name": name, "description": _str(route_map.get("description")), "rules": rules}


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ``policy route-map`` into the shape the client reads (device order)."""
    route_maps = _dict(_dict(_dict(full_config).get("policy")).get("route-map"))
    parsed = [_parse_route_map(str(name), raw) for name, raw in route_maps.items()]
    return {"route_maps": parsed, "total": len(parsed)}


def rule_trees(full_config: Dict[str, Any], name: str) -> Optional[Dict[int, Any]]:
    """Raw rule subtrees of one route-map keyed by number, or None when it is absent."""
    route_maps = _dict(_dict(_dict(full_config).get("policy")).get("route-map"))
    if name not in route_maps:
        return None
    rules = _dict(_dict(route_maps[name]).get("rule"))
    return {int(number): tree for number, tree in rules.items() if str(number).isascii() and str(number).isdigit()}
