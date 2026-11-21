"""Golden reads of ``protocols static`` for both labs.

The trees follow the lab ``node.def`` shapes: 1.4 spells multicast routes as
``multicast route`` / ``interface-route ... next-hop-interface`` and the BFD
multi-hop source as ``source <addr> [profile]`` tags; 1.5 uses ``mroute`` and a
single ``source-address`` leaf. ``dhcp-interface`` is single on 1.4 and multi on
1.5 (a multi leaf loads as a string for one value and a list for several).
"""

from vyos_mappers.static_routes.config_parse import parse_config
from vyos_mappers.static_routes.static_routes_versions import get_static_routes_mapper

D4 = "198.51.100.0/24"
D6 = "2001:db8:100::/48"
NH = "192.0.2.1"
NH6 = "2001:db8::1"


def _route_tree(source_form):
    return {
        D4: {
            "description": "T-desc",
            "next-hop": {
                NH: {
                    "distance": "20",
                    "vrf": "T-V",
                    "interface": "eth1",
                    "bfd": {"profile": "T-P", "multi-hop": source_form},
                },
                "192.0.2.2": {"disable": {}},
            },
            "interface": {"eth2": {"distance": "30", "disable": {}}},
        },
        "203.0.113.0/24": {"blackhole": {"distance": "200", "tag": "7"}},
        "203.0.113.128/25": {"reject": {"distance": "210"}},
    }


def _static(version):
    if version == "1.4":
        source = {"source": {"192.0.2.9": {"profile": "T-P"}, "192.0.2.8": {}}}
        mcast = {
            "multicast": {
                "route": {"224.1.0.0/16": {"next-hop": {NH: {"distance": "5"}}}},
                "interface-route": {
                    "224.1.0.0/16": {"next-hop-interface": {"eth1": {"distance": "6"}}},
                    "224.2.0.0/16": {"next-hop-interface": {"eth2": {}}},
                },
            }
        }
        dhcp = "eth3"
    else:
        source = {"source-address": "192.0.2.9"}
        mcast = {
            "mroute": {
                "224.1.0.0/16": {
                    "next-hop": {NH: {"distance": "5"}},
                    "interface": {"eth1": {"distance": "6"}},
                },
                "224.2.0.0/16": {"interface": {"eth2": {"disable": {}}}},
            }
        }
        dhcp = ["eth3", "eth4"]
    routes = _route_tree(source)
    routes["192.0.2.128/25"] = {"dhcp-interface": dhcp}
    return {
        "route": routes,
        "route6": {D6: {"next-hop": {NH6: {}}}},
        "table": {
            "10": {
                "description": "T-table",
                "route": {D4: {"blackhole": {}}},
                "route6": {D6: {"interface": {"eth1": {}}}},
            }
        },
        "route-map": "T-RM",
        "arp": {
            "interface": {
                "eth1": {"address": {"192.0.2.5": {"mac": "00:11:22:33:44:55", "description": "T-arp"}}}
            }
        },
        "neighbor-proxy": {
            "arp": {"192.0.2.6": {"interface": "eth1"}},
            "nd": {"2001:db8::6": {"interface": ["eth1", "eth2"]}},
        },
        **mcast,
    }


def _parse(version):
    return parse_config(get_static_routes_mapper(version), {"protocols": {"static": _static(version)}})


def _route(routes, destination):
    return next(r for r in routes if r["destination"] == destination)


def test_route_fields_read_the_same_on_both_versions():
    for version in ("1.4", "1.5"):
        route = _route(_parse(version)["ipv4_routes"], D4)
        assert route["description"] == "T-desc"
        hop = next(h for h in route["next_hops"] if h["address"] == NH)
        assert (hop["distance"], hop["vrf"], hop["interface"]) == (20, "T-V", "eth1")
        assert hop["bfd_enable"] and hop["bfd_multi_hop"] and hop["bfd_profile"] == "T-P"
        assert next(h for h in route["next_hops"] if h["address"] == "192.0.2.2")["disable"] is True
        assert route["interfaces"] == [
            {"interface": "eth2", "distance": 30, "disable": True, "vrf": None, "segments": None}
        ]
        assert route["route_type"] == "ipv4"


def test_blackhole_and_reject():
    config = _parse("1.5")
    blackhole = _route(config["ipv4_routes"], "203.0.113.0/24")
    assert (blackhole["blackhole"], blackhole["blackhole_distance"], blackhole["blackhole_tag"]) == (True, 200, 7)
    assert blackhole["reject"] is False
    reject = _route(config["ipv4_routes"], "203.0.113.128/25")
    assert (reject["reject"], reject["reject_distance"], reject["reject_tag"]) == (True, 210, None)


def test_bfd_multi_hop_sources_follow_the_version_form():
    hop14 = _route(_parse("1.4")["ipv4_routes"], D4)["next_hops"][0]
    assert hop14["bfd_multi_hop_sources"] == [
        {"address": "192.0.2.9", "profile": "T-P"},
        {"address": "192.0.2.8", "profile": None},
    ]
    hop15 = _route(_parse("1.5")["ipv4_routes"], D4)["next_hops"][0]
    assert hop15["bfd_multi_hop_sources"] == [{"address": "192.0.2.9", "profile": None}]


def test_each_mapper_reads_only_its_own_source_form():
    """A 1.5 mapper does not read 1.4 ``source`` tags, and the reverse."""
    tree14 = {"protocols": {"static": _static("1.4")}}
    tree15 = {"protocols": {"static": _static("1.5")}}
    on15 = _route(parse_config(get_static_routes_mapper("1.5"), tree14)["ipv4_routes"], D4)
    on14 = _route(parse_config(get_static_routes_mapper("1.4"), tree15)["ipv4_routes"], D4)
    assert on15["next_hops"][0]["bfd_multi_hop_sources"] == []
    assert on14["next_hops"][0]["bfd_multi_hop_sources"] == []


def test_dhcp_interface_reads_single_and_multi():
    assert _route(_parse("1.4")["ipv4_routes"], "192.0.2.128/25")["dhcp_interfaces"] == ["eth3"]
    assert _route(_parse("1.5")["ipv4_routes"], "192.0.2.128/25")["dhcp_interfaces"] == ["eth3", "eth4"]


def test_1_4_multicast_route_and_interface_route_merge_per_prefix():
    rows = {r["prefix"]: r for r in _parse("1.4")["multicast_routes"]}
    assert rows["224.1.0.0/16"] == {
        "prefix": "224.1.0.0/16",
        "next_hops": [{"address": NH, "distance": 5, "disable": False}],
        "interfaces": [{"interface": "eth1", "distance": 6, "disable": False}],
        "next_hops_configured": True,
        "interfaces_configured": True,
    }
    assert rows["224.2.0.0/16"]["next_hops_configured"] is False
    assert rows["224.2.0.0/16"]["interfaces_configured"] is True
    assert rows["224.2.0.0/16"]["interfaces"] == [{"interface": "eth2", "distance": None, "disable": False}]


def test_1_5_mroute_flags_name_the_configured_lists():
    rows = {r["prefix"]: r for r in _parse("1.5")["multicast_routes"]}
    assert rows["224.1.0.0/16"]["next_hops_configured"] and rows["224.1.0.0/16"]["interfaces_configured"]
    assert rows["224.1.0.0/16"]["next_hops"] == [{"address": NH, "distance": 5, "disable": False}]
    assert rows["224.2.0.0/16"]["next_hops_configured"] is False
    assert rows["224.2.0.0/16"]["interfaces"] == [{"interface": "eth2", "distance": None, "disable": True}]


def test_each_mapper_reads_only_its_own_multicast_form():
    tree14 = {"protocols": {"static": _static("1.4")}}
    tree15 = {"protocols": {"static": _static("1.5")}}
    assert parse_config(get_static_routes_mapper("1.5"), tree14)["multicast_routes"] == []
    assert parse_config(get_static_routes_mapper("1.4"), tree15)["multicast_routes"] == []


def test_tables_ipv6_route_map_arp_and_neighbor_proxy():
    for version in ("1.4", "1.5"):
        config = _parse(version)
        assert config["ipv6_routes"][0]["destination"] == D6
        assert config["ipv6_routes"][0]["route_type"] == "ipv6"
        assert config["ipv6_routes"][0]["next_hops"][0]["address"] == NH6
        [table] = config["routing_tables"]
        assert (table["table_id"], table["description"]) == (10, "T-table")
        assert table["ipv4_routes"][0]["blackhole"] is True
        assert table["ipv6_routes"][0]["interfaces"][0]["interface"] == "eth1"
        assert config["route_map"] == "T-RM"
        assert config["arp_interfaces"] == [
            {
                "interface": "eth1",
                "entries": [{"ip_address": "192.0.2.5", "mac_address": "00:11:22:33:44:55", "description": "T-arp"}],
            }
        ]
        assert config["neighbor_proxy"] == {
            "arp_entries": [{"ip_address": "192.0.2.6", "interfaces": ["eth1"]}],
            "nd_entries": [{"ipv6_address": "2001:db8::6", "interfaces": ["eth1", "eth2"]}],
        }


def test_empty_config():
    for version in ("1.4", "1.5"):
        config = parse_config(get_static_routes_mapper(version), {})
        assert config["ipv4_routes"] == [] and config["multicast_routes"] == []
        assert config["route_map"] is None
        assert config["neighbor_proxy"] == {"arp_entries": [], "nd_entries": []}
