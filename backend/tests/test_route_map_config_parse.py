"""RouteMapMapper.parse_config, rule_trees and rule_tree_paths.

The sample holds every leaf both labs have plus the two 1.5-only matches.
``multi:`` leaves appear with two values and with one plain string (the
device returns one value as a string).
"""

import copy
from typing import Any, Dict, List, Tuple, cast

import pytest

from routers.route_map.route_map import RouteMapConfig
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.route_map import RouteMapMapper

VERSIONS = ("1.4.3", "1.5", "2025.11.01-0021-rolling")

FULL_RULE = {
    "action": "deny",
    "description": "every leaf",
    "call": "OTHER",
    "continue": "30",
    "on-match": {"goto": "40", "next": {}},
    "match": {
        "as-path": "ASP",
        "community": {"community-list": "CL", "exact-match": {}},
        "extcommunity": "ECL",
        "large-community": {"large-community-list": "LCL"},
        "local-preference": "100",
        "metric": "5",
        "origin": "igp",
        "peer": "192.0.2.1",
        "rpki": "valid",
        "rpki-extcommunity": "notfound",
        "source-peer": "eth0",
        "evpn": {"default-route": {}, "rd": "65000:1", "route-type": "prefix", "vni": "100"},
        "ip": {
            "address": {"access-list": "1", "prefix-list": "PL", "prefix-len": "24"},
            "nexthop": {
                "access-list": "100",
                "address": "192.0.2.9",
                "prefix-len": "32",
                "prefix-list": "PLN",
                "type": "blackhole",
            },
            "route-source": {"access-list": "1300", "prefix-list": "PLR"},
        },
        "ipv6": {
            "address": {"access-list": "ACL6", "prefix-list": "PL6", "prefix-len": "64"},
            "nexthop": {"access-list": "ACL6N", "address": "2001:db8::9", "prefix-list": "PL6N", "type": "blackhole"},
        },
        "interface": "eth1",
        "protocol": "bgp",
        "source-vrf": "default",
        "tag": "7",
    },
    "set": {
        "as-path": {"exclude": "65001 65002", "prepend": "65003 65004", "prepend-last-as": "2"},
        "community": {"add": ["65000:1", "no-export"], "replace": "65000:9", "delete": "CL-DEL", "none": {}},
        "large-community": {"add": "1:2:3", "replace": ["4:5:6", "7:8:9"], "delete": "LCL-DEL", "none": {}},
        "extcommunity": {
            "bandwidth": "200",
            "bandwidth-non-transitive": {},
            "rt": ["65000:1", "192.0.2.1:5"],
            "soo": "65000:2",
            "none": {},
        },
        "atomic-aggregate": {},
        "aggregator": {"as": "65010", "ip": "192.0.2.10"},
        "local-preference": "300",
        "origin": "egp",
        "originator-id": "10.0.0.1",
        "weight": "50",
        "ip-next-hop": "192.0.2.254",
        "ipv6-next-hop": {"global": "2001:db8::1", "local": "fe80::1", "peer-address": {}, "prefer-global": {}},
        "l3vpn-nexthop": {"encapsulation": {"gre": {}}},
        "evpn": {"gateway": {"ipv4": "192.0.2.20", "ipv6": "2001:db8::20"}},
        "distance": "20",
        "metric": "+10",
        "metric-type": "type-1",
        "src": "2001:db8::30",
        "table": "100",
        "tag": "9",
    },
}

TREE = {
    "policy": {
        "route-map": {
            "ZED": {
                "description": "out",
                "rule": {
                    "20": {"action": "permit", "set": {"ip-next-hop": "peer-address"}},
                    "10": FULL_RULE,
                    "30": {"action": "permit", "set": {"ip-next-hop": "unchanged"}},
                },
            },
            "ALPHA": {},
        }
    }
}

FULL_MATCH = {
    "as_path": "ASP",
    "community_list": "CL",
    "community_exact_match": True,
    "extcommunity": "ECL",
    "large_community_list": "LCL",
    "local_preference": 100,
    "metric": 5,
    "origin": "igp",
    "peer": "192.0.2.1",
    "rpki": "valid",
    "rpki_extcommunity": "notfound",
    "source_peer": "eth0",
    "evpn_default_route": True,
    "evpn_rd": "65000:1",
    "evpn_route_type": "prefix",
    "evpn_vni": 100,
    "ip_address_access_list": "1",
    "ip_address_prefix_list": "PL",
    "ip_address_prefix_len": 24,
    "ipv6_address_access_list": "ACL6",
    "ipv6_address_prefix_list": "PL6",
    "ipv6_address_prefix_len": 64,
    "ip_nexthop_access_list": "100",
    "ip_nexthop_address": "192.0.2.9",
    "ip_nexthop_prefix_len": 32,
    "ip_nexthop_prefix_list": "PLN",
    "ip_nexthop_type": "blackhole",
    "ipv6_nexthop_access_list": "ACL6N",
    "ipv6_nexthop_address": "2001:db8::9",
    "ipv6_nexthop_prefix_list": "PL6N",
    "ipv6_nexthop_type": "blackhole",
    "ip_route_source_access_list": "1300",
    "ip_route_source_prefix_list": "PLR",
    "interface": "eth1",
    "protocol": "bgp",
    "source_vrf": "default",
    "tag": 7,
}

FULL_SET = {
    "as_path_exclude": "65001 65002",
    "as_path_prepend": "65003 65004",
    "as_path_prepend_last_as": 2,
    "community_add_values": ["65000:1", "no-export"],
    "community_replace_values": ["65000:9"],
    "community_delete": "CL-DEL",
    "community_remove_all": True,
    "large_community_add_values": ["1:2:3"],
    "large_community_replace_values": ["4:5:6", "7:8:9"],
    "large_community_delete": "LCL-DEL",
    "large_community_remove_all": True,
    "extcommunity_bandwidth": "200",
    "extcommunity_bandwidth_non_transitive": True,
    "extcommunity_rt": ["65000:1", "192.0.2.1:5"],
    "extcommunity_soo": ["65000:2"],
    "extcommunity_none": True,
    "atomic_aggregate": True,
    "aggregator_as": "65010",
    "aggregator_ip": "192.0.2.10",
    "local_preference": 300,
    "origin": "egp",
    "originator_id": "10.0.0.1",
    "weight": 50,
    "ip_nexthop": "192.0.2.254",
    "ip_nexthop_peer_address": False,
    "ip_nexthop_unchanged": False,
    "ipv6_nexthop_global": "2001:db8::1",
    "ipv6_nexthop_local": "fe80::1",
    "ipv6_nexthop_peer_address": True,
    "ipv6_nexthop_prefer_global": True,
    "l3vpn_nexthop_encapsulation_gre": True,
    "evpn_gateway_ipv4": "192.0.2.20",
    "evpn_gateway_ipv6": "2001:db8::20",
    "distance": 20,
    "metric": "+10",
    "metric_type": "type-1",
    "src": "2001:db8::30",
    "table": 100,
    "tag": 9,
}


def _mapper(version: str = "1.5") -> RouteMapMapper:
    return cast(RouteMapMapper, CommandMapperRegistry.get_mapper("route_map", version))


def _unset(section: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in section.items():
        if isinstance(value, bool):
            out[key] = False
        elif isinstance(value, list):
            out[key] = []
        else:
            out[key] = None
    return out


@pytest.mark.parametrize("version", VERSIONS)
def test_parse_config_every_leaf(version):
    parsed = _mapper(version).parse_config(TREE)
    assert parsed["total"] == 2
    # Device order is kept; rules sort by number.
    assert [item["name"] for item in parsed["route_maps"]] == ["ZED", "ALPHA"]
    zed, alpha = parsed["route_maps"]
    assert alpha == {"name": "ALPHA", "description": None, "rules": []}
    assert zed["description"] == "out"
    assert [rule["rule_number"] for rule in zed["rules"]] == [10, 20, 30]

    full, peer, unchanged = zed["rules"]
    assert {key: value for key, value in full.items() if key not in ("match", "set")} == {
        "rule_number": 10,
        "description": "every leaf",
        "action": "deny",
        "call": "OTHER",
        "continue_rule": 30,
        "on_match_goto": 40,
        "on_match_next": True,
    }
    assert full["match"] == FULL_MATCH
    assert full["set"] == FULL_SET

    # ``set ip-next-hop`` is one value leaf; its keywords read as the flags.
    assert (peer["set"]["ip_nexthop"], peer["set"]["ip_nexthop_peer_address"], peer["set"]["ip_nexthop_unchanged"]) == (
        None, True, False,
    )
    assert (
        unchanged["set"]["ip_nexthop"],
        unchanged["set"]["ip_nexthop_peer_address"],
        unchanged["set"]["ip_nexthop_unchanged"],
    ) == (None, False, True)
    assert peer["match"] == _unset(FULL_MATCH)
    assert {k: v for k, v in peer["set"].items() if k != "ip_nexthop_peer_address"} == {
        k: v for k, v in _unset(FULL_SET).items() if k != "ip_nexthop_peer_address"
    }

    # The router model takes the parse unchanged.
    assert RouteMapConfig(**parsed).model_dump() == parsed


def test_parse_keys_are_the_model_fields():
    from routers.route_map.route_map import MatchConditions, RouteMapRule, SetActions

    assert set(FULL_MATCH) == set(MatchConditions.model_fields)
    assert set(FULL_SET) == set(SetActions.model_fields)
    parsed_rule = _mapper().parse_config(TREE)["route_maps"][0]["rules"][0]
    assert set(parsed_rule) == set(RouteMapRule.model_fields)
    assert "large_community_exact_match" not in MatchConditions.model_fields
    assert "community_delete_values" not in SetActions.model_fields


@pytest.mark.parametrize("tree", [{}, {"policy": {}}, {"policy": {"route-map": {}}}, {"policy": "x"}])
def test_unconfigured_is_the_same_shape_empty(tree):
    assert _mapper().parse_config(tree) == {"route_maps": [], "total": 0}
    assert RouteMapConfig(**_mapper().parse_config(tree)).model_dump() == {"route_maps": [], "total": 0}


def test_bad_shapes_read_as_unset():
    tree = {"policy": {"route-map": {"RM": {"rule": {"x": {}, "5": {"match": "x", "set": {"metric-type": {}}}}}}}}
    (only,) = _mapper().parse_config(tree)["route_maps"]
    (rule,) = only["rules"]
    assert rule["rule_number"] == 5
    assert rule["match"] == _unset(FULL_MATCH)
    assert rule["set"]["metric_type"] is None
    assert RouteMapConfig(**_mapper().parse_config(tree))


def test_rule_trees():
    mapper = _mapper("1.4.3")
    trees = mapper.rule_trees(TREE, "ZED")
    assert trees is not None
    assert sorted(trees) == [10, 20, 30]
    assert trees[10] is FULL_RULE
    assert mapper.rule_trees(TREE, "ALPHA") == {}
    assert mapper.rule_trees(TREE, "NOPE") is None
    assert mapper.rule_trees({}, "ZED") is None


def _value_nodes(node: Any, prefix: Tuple[str, ...] = ()) -> List[Tuple[str, ...]]:
    """Paths of value and ``multi:`` leaves in a raw tree (the device schema)."""
    found: List[Tuple[str, ...]] = []
    for key, child in node.items():
        path = prefix + (key,)
        if isinstance(child, dict):
            found += _value_nodes(child, path)
        else:
            found.append(path)
    return found


def _apply(paths: List[List[str]], base: List[str], value_nodes: List[Tuple[str, ...]]) -> Dict[str, Any]:
    """Apply set paths the way the device stores them."""
    tree: Dict[str, Any] = {}
    for path in paths:
        rel = path[len(base):]
        assert path[: len(base)] == base
        if tuple(rel[:-1]) in value_nodes:
            *parents, leaf, value = rel
            node = tree
            for word in parents:
                node = node.setdefault(word, {})
            current = node.get(leaf)
            node[leaf] = value if current is None else (current if isinstance(current, list) else [current]) + [value]
        else:
            node = tree
            for word in rel:
                node = node.setdefault(word, {})
    return tree


@pytest.mark.parametrize("number", ["10", "20", "30"])
def test_parse_rule_tree_paths_round_trip(number):
    mapper = _mapper()
    original = TREE["policy"]["route-map"]["ZED"]["rule"][number]
    base = ["policy", "route-map", "ZED", "rule", "99"]
    paths = mapper.rule_tree_paths("ZED", "99", original)
    assert paths[0] == base
    rebuilt = _apply(paths[1:], base, _value_nodes(original))
    moved = copy.deepcopy(TREE)
    moved["policy"]["route-map"]["ZED"]["rule"] = {"99": rebuilt}
    (before,) = [r for r in mapper.parse_config(TREE)["route_maps"][0]["rules"] if r["rule_number"] == int(number)]
    (after,) = mapper.parse_config(moved)["route_maps"][0]["rules"]
    assert {**before, "rule_number": 99} == after


def test_rule_tree_paths_keep_multi_values_and_flags():
    paths = _mapper().rule_tree_paths("ZED", "1", FULL_RULE)
    base = ["policy", "route-map", "ZED", "rule", "1"]
    assert base + ["set", "community", "add", "65000:1"] in paths
    assert base + ["set", "community", "add", "no-export"] in paths
    assert base + ["set", "community", "replace", "65000:9"] in paths
    assert base + ["set", "ipv6-next-hop", "peer-address"] in paths
    assert base + ["on-match", "next"] in paths
    assert base + ["match", "evpn", "default-route"] in paths
    assert len(paths) == len(set(map(tuple, paths)))
