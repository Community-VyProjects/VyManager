"""IPv6 next-hop match leaves on a route-map rule.

access-list, prefix-list, and type blackhole are valid on 1.4 and 1.5.
prefix-len is not a node on either version, so it must not be emitted.
"""

import pytest

from routers.route_map.route_map import parse_match_conditions
from vyos_builders.route_map.route_map_batch_builder import RouteMapBatchBuilder
from vyos_mappers import CommandMapperRegistry


NAME = "RM"
RULE = "10"
NODE = ["policy", "route-map", NAME, "rule", RULE, "match", "ipv6", "nexthop"]

CASES = [
    (
        "set_match_ipv6_nexthop_access_list",
        (NAME, RULE, "ACL6"),
        "set",
        NODE + ["access-list", "ACL6"],
    ),
    (
        "set_match_ipv6_nexthop_prefix_list",
        (NAME, RULE, "PL6"),
        "set",
        NODE + ["prefix-list", "PL6"],
    ),
    (
        "set_match_ipv6_nexthop_type",
        (NAME, RULE, "blackhole"),
        "set",
        NODE + ["type", "blackhole"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_ipv6_nexthop_match_paths(method, args, op, expected_path, version):
    builder = RouteMapBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


def test_ipv6_nexthop_prefix_len_is_not_a_mapper_path():
    mapper = CommandMapperRegistry.get_mapper("route_map", "1.5")
    assert not hasattr(mapper, "get_match_ipv6_nexthop_prefix_len")


def test_parse_ipv6_nexthop_match_leaves():
    match = parse_match_conditions(
        {
            "ipv6": {
                "nexthop": {
                    "access-list": "ACL6",
                    "address": "2001:db8::1",
                    "prefix-list": "PL6",
                    "type": "blackhole",
                }
            }
        }
    )
    assert match.ipv6_nexthop_access_list == "ACL6"
    assert match.ipv6_nexthop_address == "2001:db8::1"
    assert match.ipv6_nexthop_prefix_list == "PL6"
    assert match.ipv6_nexthop_type == "blackhole"
    assert not hasattr(match, "ipv6_nexthop_prefix_len")
