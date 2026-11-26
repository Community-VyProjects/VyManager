"""Golden paths for every route-map builder op, and the builder value checks.

Each path matches a ``policy route-map`` node.def read on the 1.4
(100.64.64.4) and 1.5 (100.64.64.5) labs. The trees are the same except
``match rpki-extcommunity`` and ``match source-peer``, which only 1.5 has.
"""

import inspect
import re
from pathlib import Path

import pytest

from vyos_builders.route_map.route_map_batch_builder import (
    DESCRIPTION_MAX_LENGTH,
    RANGES,
    RouteMapBatchBuilder,
)
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.route_map import RouteMapMapper, get_route_map_mapper
from vyos_mappers.route_map.route_map import COMMUNITY_WELL_KNOWN
from vyos_mappers.route_map.route_map_versions import RouteMapMapperV1_5

V14 = "1.4.3"
V15 = ("1.5", "1.5-rolling-202511010000", "2025.11.01-0021-rolling", "latest")
VERSIONS = (V14,) + V15

N = "RM-1"
RM = ["policy", "route-map", N]
R = RM + ["rule", "10"]
M = R + ["match"]
S = R + ["set"]

# method, args (after name), op, path: leaves both labs have.
CASES = [
    # route-map
    ("set_route_map", (), "set", RM),
    ("delete_route_map", (), "delete", RM),
    ("set_route_map_description", ("corp out",), "set", RM + ["description", "corp out"]),
    ("delete_route_map_description", (), "delete", RM + ["description"]),
    # rule
    ("set_rule", ("10",), "set", R),
    ("delete_rule", ("10",), "delete", R),
    ("set_rule_description", ("10", "deny bogons"), "set", R + ["description", "deny bogons"]),
    ("delete_rule_description", ("10",), "delete", R + ["description"]),
    ("set_rule_action", ("10", "permit"), "set", R + ["action", "permit"]),
    ("set_rule_action", ("10", "deny"), "set", R + ["action", "deny"]),
    ("delete_rule_action", ("10",), "delete", R + ["action"]),
    ("set_rule_call", ("10", "OTHER"), "set", R + ["call", "OTHER"]),
    ("delete_rule_call", ("10",), "delete", R + ["call"]),
    ("set_rule_continue", ("10", "20"), "set", R + ["continue", "20"]),
    ("delete_rule_continue", ("10",), "delete", R + ["continue"]),
    ("set_rule_on_match_goto", ("10", "30"), "set", R + ["on-match", "goto", "30"]),
    ("delete_rule_on_match_goto", ("10",), "delete", R + ["on-match", "goto"]),
    # Deleting a plain node's last child leaves the empty node on both labs;
    # deleting the node itself commits.
    ("delete_rule_on_match", ("10",), "delete", R + ["on-match"]),
    ("delete_match", ("10",), "delete", M),
    ("delete_set", ("10",), "delete", S),
    ("delete_match_ip", ("10",), "delete", M + ["ip"]),
    ("delete_match_ipv6", ("10",), "delete", M + ["ipv6"]),
    ("delete_set_as_path", ("10",), "delete", S + ["as-path"]),
    ("set_rule_on_match_next", ("10",), "set", R + ["on-match", "next"]),
    ("delete_rule_on_match_next", ("10",), "delete", R + ["on-match", "next"]),
    # match - BGP attributes
    ("set_match_as_path", ("10", "AS-LIST"), "set", M + ["as-path", "AS-LIST"]),
    ("delete_match_as_path", ("10",), "delete", M + ["as-path"]),
    ("set_match_community", ("10", "CL"), "set", M + ["community", "community-list", "CL"]),
    ("delete_match_community", ("10",), "delete", M + ["community"]),
    ("delete_match_community_list", ("10",), "delete", M + ["community", "community-list"]),
    ("set_match_community_exact_match", ("10",), "set", M + ["community", "exact-match"]),
    ("delete_match_community_exact_match", ("10",), "delete", M + ["community", "exact-match"]),
    ("set_match_extcommunity", ("10", "ECL"), "set", M + ["extcommunity", "ECL"]),
    ("delete_match_extcommunity", ("10",), "delete", M + ["extcommunity"]),
    ("set_match_large_community", ("10", "LCL"), "set", M + ["large-community", "large-community-list", "LCL"]),
    ("delete_match_large_community", ("10",), "delete", M + ["large-community"]),
    ("delete_match_large_community_list", ("10",), "delete", M + ["large-community", "large-community-list"]),
    ("set_match_local_preference", ("10", "0"), "set", M + ["local-preference", "0"]),
    ("delete_match_local_preference", ("10",), "delete", M + ["local-preference"]),
    ("set_match_metric", ("10", "100"), "set", M + ["metric", "100"]),
    ("delete_match_metric", ("10",), "delete", M + ["metric"]),
    ("set_match_origin", ("10", "incomplete"), "set", M + ["origin", "incomplete"]),
    ("delete_match_origin", ("10",), "delete", M + ["origin"]),
    ("set_match_peer", ("10", "192.0.2.1"), "set", M + ["peer", "192.0.2.1"]),
    ("set_match_peer", ("10", "2001:db8::1"), "set", M + ["peer", "2001:db8::1"]),
    ("delete_match_peer", ("10",), "delete", M + ["peer"]),
    ("set_match_rpki", ("10", "notfound"), "set", M + ["rpki", "notfound"]),
    ("delete_match_rpki", ("10",), "delete", M + ["rpki"]),
    # match - EVPN
    ("delete_match_evpn", ("10",), "delete", M + ["evpn"]),
    ("set_match_evpn_default_route", ("10",), "set", M + ["evpn", "default-route"]),
    ("delete_match_evpn_default_route", ("10",), "delete", M + ["evpn", "default-route"]),
    ("set_match_evpn_rd", ("10", "65000:100"), "set", M + ["evpn", "rd", "65000:100"]),
    ("set_match_evpn_rd", ("10", "192.0.2.1:100"), "set", M + ["evpn", "rd", "192.0.2.1:100"]),
    ("set_match_evpn_rd", ("10", "0:0"), "set", M + ["evpn", "rd", "0:0"]),
    ("set_match_evpn_rd", ("10", "65535:4294967295"), "set", M + ["evpn", "rd", "65535:4294967295"]),
    ("set_match_evpn_rd", ("10", "65536:0"), "set", M + ["evpn", "rd", "65536:0"]),
    ("set_match_evpn_rd", ("10", "4294967295:65535"), "set", M + ["evpn", "rd", "4294967295:65535"]),
    ("set_match_evpn_rd", ("10", "0.0.0.0:65535"), "set", M + ["evpn", "rd", "0.0.0.0:65535"]),
    ("delete_match_evpn_rd", ("10",), "delete", M + ["evpn", "rd"]),
    ("set_match_evpn_route_type", ("10", "macip"), "set", M + ["evpn", "route-type", "macip"]),
    ("set_match_evpn_route_type", ("10", "prefix"), "set", M + ["evpn", "route-type", "prefix"]),
    ("delete_match_evpn_route_type", ("10",), "delete", M + ["evpn", "route-type"]),
    ("set_match_evpn_vni", ("10", "1"), "set", M + ["evpn", "vni", "1"]),
    ("set_match_evpn_vni", ("10", "16777214"), "set", M + ["evpn", "vni", "16777214"]),
    ("delete_match_evpn_vni", ("10",), "delete", M + ["evpn", "vni"]),
    # match - IP / IPv6 address
    ("delete_match_ip_address", ("10",), "delete", M + ["ip", "address"]),
    ("set_match_ip_address_access_list", ("10", "1"), "set", M + ["ip", "address", "access-list", "1"]),
    ("set_match_ip_address_access_list", ("10", "2699"), "set", M + ["ip", "address", "access-list", "2699"]),
    ("delete_match_ip_address_access_list", ("10",), "delete", M + ["ip", "address", "access-list"]),
    ("set_match_ip_address_prefix_list", ("10", "PL"), "set", M + ["ip", "address", "prefix-list", "PL"]),
    ("delete_match_ip_address_prefix_list", ("10",), "delete", M + ["ip", "address", "prefix-list"]),
    ("set_match_ip_address_prefix_len", ("10", "24"), "set", M + ["ip", "address", "prefix-len", "24"]),
    ("delete_match_ip_address_prefix_len", ("10",), "delete", M + ["ip", "address", "prefix-len"]),
    ("delete_match_ipv6_address", ("10",), "delete", M + ["ipv6", "address"]),
    ("set_match_ipv6_address_access_list", ("10", "ACL6"), "set", M + ["ipv6", "address", "access-list", "ACL6"]),
    ("delete_match_ipv6_address_access_list", ("10",), "delete", M + ["ipv6", "address", "access-list"]),
    ("set_match_ipv6_address_prefix_list", ("10", "PL6"), "set", M + ["ipv6", "address", "prefix-list", "PL6"]),
    ("delete_match_ipv6_address_prefix_list", ("10",), "delete", M + ["ipv6", "address", "prefix-list"]),
    ("set_match_ipv6_address_prefix_len", ("10", "128"), "set", M + ["ipv6", "address", "prefix-len", "128"]),
    ("delete_match_ipv6_address_prefix_len", ("10",), "delete", M + ["ipv6", "address", "prefix-len"]),
    # match - next-hop
    ("delete_match_ip_nexthop", ("10",), "delete", M + ["ip", "nexthop"]),
    ("set_match_ip_nexthop_access_list", ("10", "100"), "set", M + ["ip", "nexthop", "access-list", "100"]),
    ("delete_match_ip_nexthop_access_list", ("10",), "delete", M + ["ip", "nexthop", "access-list"]),
    ("set_match_ip_nexthop_address", ("10", "192.0.2.9"), "set", M + ["ip", "nexthop", "address", "192.0.2.9"]),
    ("delete_match_ip_nexthop_address", ("10",), "delete", M + ["ip", "nexthop", "address"]),
    ("set_match_ip_nexthop_prefix_len", ("10", "32"), "set", M + ["ip", "nexthop", "prefix-len", "32"]),
    ("delete_match_ip_nexthop_prefix_len", ("10",), "delete", M + ["ip", "nexthop", "prefix-len"]),
    ("set_match_ip_nexthop_prefix_list", ("10", "PL"), "set", M + ["ip", "nexthop", "prefix-list", "PL"]),
    ("delete_match_ip_nexthop_prefix_list", ("10",), "delete", M + ["ip", "nexthop", "prefix-list"]),
    ("set_match_ip_nexthop_type", ("10", "blackhole"), "set", M + ["ip", "nexthop", "type", "blackhole"]),
    ("delete_match_ip_nexthop_type", ("10",), "delete", M + ["ip", "nexthop", "type"]),
    ("delete_match_ipv6_nexthop", ("10",), "delete", M + ["ipv6", "nexthop"]),
    ("set_match_ipv6_nexthop_access_list", ("10", "ACL6"), "set", M + ["ipv6", "nexthop", "access-list", "ACL6"]),
    ("delete_match_ipv6_nexthop_access_list", ("10",), "delete", M + ["ipv6", "nexthop", "access-list"]),
    ("set_match_ipv6_nexthop_address", ("10", "2001:db8::9"), "set", M + ["ipv6", "nexthop", "address", "2001:db8::9"]),
    ("delete_match_ipv6_nexthop_address", ("10",), "delete", M + ["ipv6", "nexthop", "address"]),
    ("set_match_ipv6_nexthop_prefix_list", ("10", "PL6"), "set", M + ["ipv6", "nexthop", "prefix-list", "PL6"]),
    ("delete_match_ipv6_nexthop_prefix_list", ("10",), "delete", M + ["ipv6", "nexthop", "prefix-list"]),
    ("set_match_ipv6_nexthop_type", ("10", "blackhole"), "set", M + ["ipv6", "nexthop", "type", "blackhole"]),
    ("delete_match_ipv6_nexthop_type", ("10",), "delete", M + ["ipv6", "nexthop", "type"]),
    # match - route source
    ("delete_match_ip_route_source", ("10",), "delete", M + ["ip", "route-source"]),
    ("set_match_ip_route_source_access_list", ("10", "1300"), "set", M + ["ip", "route-source", "access-list", "1300"]),
    ("delete_match_ip_route_source_access_list", ("10",), "delete", M + ["ip", "route-source", "access-list"]),
    ("set_match_ip_route_source_prefix_list", ("10", "PL"), "set", M + ["ip", "route-source", "prefix-list", "PL"]),
    ("delete_match_ip_route_source_prefix_list", ("10",), "delete", M + ["ip", "route-source", "prefix-list"]),
    # match - other
    ("set_match_interface", ("10", "eth0"), "set", M + ["interface", "eth0"]),
    ("delete_match_interface", ("10",), "delete", M + ["interface"]),
    ("set_match_protocol", ("10", "ospfv3"), "set", M + ["protocol", "ospfv3"]),
    ("delete_match_protocol", ("10",), "delete", M + ["protocol"]),
    ("set_match_source_vrf", ("10", "default"), "set", M + ["source-vrf", "default"]),
    ("delete_match_source_vrf", ("10",), "delete", M + ["source-vrf"]),
    ("set_match_tag", ("10", "65535"), "set", M + ["tag", "65535"]),
    ("delete_match_tag", ("10",), "delete", M + ["tag"]),
    # set - AS path
    ("set_as_path_exclude", ("10", "all"), "set", S + ["as-path", "exclude", "all"]),
    ("set_as_path_exclude", ("10", "65001 65002"), "set", S + ["as-path", "exclude", "65001 65002"]),
    ("delete_set_as_path_exclude", ("10",), "delete", S + ["as-path", "exclude"]),
    ("set_as_path_prepend", ("10", "65001 65002"), "set", S + ["as-path", "prepend", "65001 65002"]),
    ("set_as_path_prepend", ("10", "4294967295"), "set", S + ["as-path", "prepend", "4294967295"]),
    ("delete_set_as_path_prepend", ("10",), "delete", S + ["as-path", "prepend"]),
    ("set_as_path_prepend_last_as", ("10", "10"), "set", S + ["as-path", "prepend-last-as", "10"]),
    ("delete_set_as_path_prepend_last_as", ("10",), "delete", S + ["as-path", "prepend-last-as"]),
    # set - community
    ("delete_set_community", ("10",), "delete", S + ["community"]),
    ("set_community_add", ("10", "65000:100"), "set", S + ["community", "add", "65000:100"]),
    ("set_community_add", ("10", "no-export"), "set", S + ["community", "add", "no-export"]),
    ("delete_set_community_add", ("10", "65000:100"), "delete", S + ["community", "add", "65000:100"]),
    ("set_community_replace", ("10", "0:65535"), "set", S + ["community", "replace", "0:65535"]),
    ("delete_set_community_replace", ("10", "0:65535"), "delete", S + ["community", "replace", "0:65535"]),
    ("set_community_delete", ("10", "CL"), "set", S + ["community", "delete", "CL"]),
    ("delete_set_community_delete", ("10",), "delete", S + ["community", "delete"]),
    ("set_community_none", ("10",), "set", S + ["community", "none"]),
    ("delete_set_community_none", ("10",), "delete", S + ["community", "none"]),
    # set - large-community
    ("delete_set_large_community", ("10",), "delete", S + ["large-community"]),
    ("set_large_community_add", ("10", "65000:1:2"), "set", S + ["large-community", "add", "65000:1:2"]),
    ("delete_set_large_community_add", ("10", "65000:1:2"), "delete", S + ["large-community", "add", "65000:1:2"]),
    ("set_large_community_replace", ("10", "4294967295:0:1"), "set",
     S + ["large-community", "replace", "4294967295:0:1"]),
    ("delete_set_large_community_replace", ("10", "4294967295:0:1"), "delete",
     S + ["large-community", "replace", "4294967295:0:1"]),
    ("set_large_community_delete", ("10", "LCL"), "set", S + ["large-community", "delete", "LCL"]),
    ("delete_set_large_community_delete", ("10",), "delete", S + ["large-community", "delete"]),
    ("set_large_community_none", ("10",), "set", S + ["large-community", "none"]),
    ("delete_set_large_community_none", ("10",), "delete", S + ["large-community", "none"]),
    # set - extcommunity
    ("delete_set_extcommunity", ("10",), "delete", S + ["extcommunity"]),
    ("set_extcommunity_bandwidth", ("10", "25600"), "set", S + ["extcommunity", "bandwidth", "25600"]),
    ("set_extcommunity_bandwidth", ("10", "num-multipaths"), "set", S + ["extcommunity", "bandwidth", "num-multipaths"]),
    ("delete_set_extcommunity_bandwidth", ("10",), "delete", S + ["extcommunity", "bandwidth"]),
    ("set_extcommunity_bandwidth_non_transitive", ("10",), "set", S + ["extcommunity", "bandwidth-non-transitive"]),
    ("delete_set_extcommunity_bandwidth_non_transitive", ("10",), "delete",
     S + ["extcommunity", "bandwidth-non-transitive"]),
    ("set_extcommunity_rt", ("10", "65000:4294967295"), "set", S + ["extcommunity", "rt", "65000:4294967295"]),
    ("set_extcommunity_rt", ("10", "192.0.2.1:65535"), "set", S + ["extcommunity", "rt", "192.0.2.1:65535"]),
    ("delete_set_extcommunity_rt", ("10", "65000:1"), "delete", S + ["extcommunity", "rt", "65000:1"]),
    ("set_extcommunity_soo", ("10", "65000:2"), "set", S + ["extcommunity", "soo", "65000:2"]),
    ("delete_set_extcommunity_soo", ("10", "65000:2"), "delete", S + ["extcommunity", "soo", "65000:2"]),
    ("set_extcommunity_none", ("10",), "set", S + ["extcommunity", "none"]),
    ("delete_set_extcommunity_none", ("10",), "delete", S + ["extcommunity", "none"]),
    # set - BGP attributes
    ("set_atomic_aggregate", ("10",), "set", S + ["atomic-aggregate"]),
    ("delete_set_atomic_aggregate", ("10",), "delete", S + ["atomic-aggregate"]),
    ("delete_set_aggregator", ("10",), "delete", S + ["aggregator"]),
    ("set_aggregator_as", ("10", "4294967295"), "set", S + ["aggregator", "as", "4294967295"]),
    ("delete_set_aggregator_as", ("10",), "delete", S + ["aggregator", "as"]),
    ("set_aggregator_ip", ("10", "192.0.2.7"), "set", S + ["aggregator", "ip", "192.0.2.7"]),
    ("delete_set_aggregator_ip", ("10",), "delete", S + ["aggregator", "ip"]),
    ("set_local_preference", ("10", "200"), "set", S + ["local-preference", "200"]),
    ("delete_set_local_preference", ("10",), "delete", S + ["local-preference"]),
    ("set_origin", ("10", "igp"), "set", S + ["origin", "igp"]),
    ("delete_set_origin", ("10",), "delete", S + ["origin"]),
    ("set_originator_id", ("10", "10.0.0.1"), "set", S + ["originator-id", "10.0.0.1"]),
    ("delete_set_originator_id", ("10",), "delete", S + ["originator-id"]),
    ("set_weight", ("10", "0"), "set", S + ["weight", "0"]),
    ("delete_set_weight", ("10",), "delete", S + ["weight"]),
    # set - next-hop
    ("set_ip_nexthop", ("10", "192.0.2.1"), "set", S + ["ip-next-hop", "192.0.2.1"]),
    ("set_ip_nexthop_peer_address", ("10",), "set", S + ["ip-next-hop", "peer-address"]),
    ("set_ip_nexthop_unchanged", ("10",), "set", S + ["ip-next-hop", "unchanged"]),
    ("delete_set_ip_nexthop", ("10",), "delete", S + ["ip-next-hop"]),
    ("delete_set_ipv6_nexthop", ("10",), "delete", S + ["ipv6-next-hop"]),
    ("set_ipv6_nexthop_global", ("10", "2001:db8::1"), "set", S + ["ipv6-next-hop", "global", "2001:db8::1"]),
    ("delete_set_ipv6_nexthop_global", ("10",), "delete", S + ["ipv6-next-hop", "global"]),
    ("set_ipv6_nexthop_local", ("10", "fe80::1"), "set", S + ["ipv6-next-hop", "local", "fe80::1"]),
    ("delete_set_ipv6_nexthop_local", ("10",), "delete", S + ["ipv6-next-hop", "local"]),
    ("set_ipv6_nexthop_peer_address", ("10",), "set", S + ["ipv6-next-hop", "peer-address"]),
    ("delete_set_ipv6_nexthop_peer_address", ("10",), "delete", S + ["ipv6-next-hop", "peer-address"]),
    ("set_ipv6_nexthop_prefer_global", ("10",), "set", S + ["ipv6-next-hop", "prefer-global"]),
    ("delete_set_ipv6_nexthop_prefer_global", ("10",), "delete", S + ["ipv6-next-hop", "prefer-global"]),
    ("delete_set_l3vpn_nexthop", ("10",), "delete", S + ["l3vpn-nexthop"]),
    ("set_l3vpn_nexthop_encapsulation_gre", ("10",), "set", S + ["l3vpn-nexthop", "encapsulation", "gre"]),
    ("delete_set_l3vpn_nexthop_encapsulation_gre", ("10",), "delete", S + ["l3vpn-nexthop", "encapsulation", "gre"]),
    # set - EVPN
    ("delete_set_evpn", ("10",), "delete", S + ["evpn"]),
    ("set_evpn_gateway_ipv4", ("10", "192.0.2.1"), "set", S + ["evpn", "gateway", "ipv4", "192.0.2.1"]),
    ("delete_set_evpn_gateway_ipv4", ("10",), "delete", S + ["evpn", "gateway", "ipv4"]),
    ("set_evpn_gateway_ipv6", ("10", "2001:db8::1"), "set", S + ["evpn", "gateway", "ipv6", "2001:db8::1"]),
    ("delete_set_evpn_gateway_ipv6", ("10",), "delete", S + ["evpn", "gateway", "ipv6"]),
    # set - route properties
    ("set_distance", ("10", "255"), "set", S + ["distance", "255"]),
    ("delete_set_distance", ("10",), "delete", S + ["distance"]),
    ("set_metric", ("10", "+10"), "set", S + ["metric", "+10"]),
    ("set_metric", ("10", "-rtt"), "set", S + ["metric", "-rtt"]),
    ("set_metric", ("10", "4294967295"), "set", S + ["metric", "4294967295"]),
    ("delete_set_metric", ("10",), "delete", S + ["metric"]),
    ("set_metric_type", ("10", "type-2"), "set", S + ["metric-type", "type-2"]),
    ("delete_set_metric_type", ("10",), "delete", S + ["metric-type"]),
    ("set_src", ("10", "192.0.2.1"), "set", S + ["src", "192.0.2.1"]),
    ("set_src", ("10", "2001:db8::1"), "set", S + ["src", "2001:db8::1"]),
    ("delete_set_src", ("10",), "delete", S + ["src"]),
    ("set_table", ("10", "200"), "set", S + ["table", "200"]),
    ("delete_set_table", ("10",), "delete", S + ["table"]),
    ("set_tag", ("10", "1"), "set", S + ["tag", "1"]),
    ("delete_set_tag", ("10",), "delete", S + ["tag"]),
]

# Leaves only the 1.5 lab has.
V15_CASES = [
    ("set_match_rpki_extcommunity", ("10", "valid"), "set", M + ["rpki-extcommunity", "valid"]),
    ("set_match_rpki_extcommunity", ("10", "invalid"), "set", M + ["rpki-extcommunity", "invalid"]),
    ("delete_match_rpki_extcommunity", ("10",), "delete", M + ["rpki-extcommunity"]),
    ("set_match_source_peer", ("10", "192.0.2.1"), "set", M + ["source-peer", "192.0.2.1"]),
    ("set_match_source_peer", ("10", "eth0"), "set", M + ["source-peer", "eth0"]),
    ("delete_match_source_peer", ("10",), "delete", M + ["source-peer"]),
]
GATED = sorted({case[0] for case in V15_CASES})

# Ops whose value the lab takes as plain txt (a list, interface or VRF name,
# or a per-value delete of a multi: leaf): one CLI word, no whitespace and no
# control character.
WORD_OPS = (
    "set_match_as_path",
    "set_match_community",
    "set_match_extcommunity",
    "set_match_large_community",
    "set_match_ip_address_prefix_list",
    "set_match_ipv6_address_access_list",
    "set_match_ipv6_address_prefix_list",
    "set_match_ip_nexthop_prefix_list",
    "set_match_ipv6_nexthop_access_list",
    "set_match_ipv6_nexthop_prefix_list",
    "set_match_ip_route_source_prefix_list",
    "set_match_interface",
    "set_match_source_vrf",
    "set_community_delete",
    "set_large_community_delete",
    "delete_set_community_add",
    "delete_set_community_replace",
    "delete_set_large_community_add",
    "delete_set_large_community_replace",
    "delete_set_extcommunity_rt",
    "delete_set_extcommunity_soo",
)
BAD_WORDS = ("", "A B", "AB\n", "A\tB", "A\x01B", "A\x7fB", "A\u00a0B", " AB", "AB ")

# ``match ip ... access-list`` numbers both labs committed, including 500 and
# 2700 outside the val_help ranges, and the u32 bounds.
IP_ACCESS_LIST_NUMBERS = ("0", "1", "99", "500", "1299", "2700", "65536", "4294967295")

# Parent deletes: a plain node the device keeps empty after its last child
# goes. Each one is the node the child paths hang off.
PARENT_DELETES = {
    "delete_match": M,
    "delete_set": S,
    "delete_match_ip": M + ["ip"],
    "delete_match_ipv6": M + ["ipv6"],
    "delete_set_as_path": S + ["as-path"],
    "delete_rule_on_match": R + ["on-match"],
}

# Values only the 1.5 lab takes.
V15_VALUES = [
    ("set_match_evpn_route_type", ("10", "ead"), "set", M + ["evpn", "route-type", "ead"]),
    ("set_match_evpn_route_type", ("10", "5"), "set", M + ["evpn", "route-type", "5"]),
    ("set_table", ("10", "4294967295"), "set", S + ["table", "4294967295"]),
]


def _public_ops():
    return sorted(
        name
        for name, _ in inspect.getmembers(RouteMapBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method,args,op,path", CASES)
def test_op_path(version, method, args, op, path):
    builder = RouteMapBatchBuilder(version)
    getattr(builder, method)(N, *args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("version", V15)
@pytest.mark.parametrize("method,args,op,path", V15_CASES + V15_VALUES)
def test_v15_only_path(version, method, args, op, path):
    builder = RouteMapBatchBuilder(version)
    getattr(builder, method)(N, *args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("method,args,op,path", V15_CASES)
def test_gated_op_raises_on_1_4(method, args, op, path):
    builder = RouteMapBatchBuilder(V14)
    with pytest.raises(ValueError, match=r"^route-map rule match .* is not supported on this device$"):
        getattr(builder, method)(N, *args)
    assert builder.get_operations() == []


def test_gated_op_with_a_bad_value_names_the_missing_node_on_1_4():
    with pytest.raises(ValueError, match="not supported on this device"):
        RouteMapBatchBuilder(V14).set_match_rpki_extcommunity(N, "10", "bogus")


@pytest.mark.parametrize("method,args", [(case[0], case[1]) for case in V15_VALUES])
def test_v15_only_value_raises_on_1_4(method, args):
    builder = RouteMapBatchBuilder(V14)
    with pytest.raises(ValueError):
        getattr(builder, method)(N, *args)
    assert builder.get_operations() == []


def test_every_op_has_a_golden_path():
    covered = {case[0] for case in CASES} | {case[0] for case in V15_CASES}
    assert covered == set(_public_ops())
    assert not {case[0] for case in CASES} & set(GATED)


def test_every_op_takes_name_then_rule():
    # The router binds item_name to name and the request rule_number to rule.
    for name in _public_ops():
        params = list(inspect.signature(getattr(RouteMapBatchBuilder, name)).parameters)[1:]
        assert params[0] == "name", name
        assert len(params) <= 3, name
        if len(params) == 3:
            assert params[1] == "rule", name


def test_removed_large_community_exact_match_is_gone():
    # The lab rejects `match large-community exact-match` ("is not valid") on both.
    assert not hasattr(RouteMapBatchBuilder, "set_match_large_community_exact_match")
    assert not hasattr(RouteMapBatchBuilder, "delete_match_large_community_exact_match")
    assert not hasattr(RouteMapMapper, "get_match_large_community_exact_match")
    # Neither lab has `match ipv6 nexthop prefix-len`.
    assert not hasattr(RouteMapMapper, "get_match_ipv6_nexthop_prefix_len")


@pytest.mark.parametrize("method,args", [
    # route-map name: lab regex [-_a-zA-Z0-9][\w\-\.\+]*
    ("set_route_map", ()),
    ("delete_rule", ("10",)),
])
@pytest.mark.parametrize("name", ["", ".RM", "+RM", "R M", "RM/1", "RM\n", "R\u00e9M", "\u0661RM"])
def test_bad_name_raises(method, args, name):
    builder = RouteMapBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(name, *args)
    assert builder.get_operations() == []


def test_lab_names_are_accepted():
    builder = RouteMapBatchBuilder(V14)
    for name in ("RM", "-x", "_x", "9a", "a.b+c-d_e", "A" * 64):
        builder.set_route_map(name)
    assert len(builder.get_operations()) == 6


@pytest.mark.parametrize("method,args", [
    # rule number
    ("set_rule", ("0",)), ("set_rule", ("65536",)), ("set_rule", ("1.5",)), ("delete_rule", ("-1",)),
    ("set_rule_on_match_next", ("\u0663",)), ("set_rule", ("",)),
    # description
    ("set_route_map_description", ("x" * (DESCRIPTION_MAX_LENGTH + 1),)),
    ("set_rule_description", ("10", "two\nlines")),
    ("set_rule_description", ("10", "x\r")),
    # action
    ("set_rule_action", ("10", "accept")), ("set_rule_action", ("10", "Permit")),
    # continue / on-match goto
    ("set_rule_continue", ("10", "0")), ("set_rule_continue", ("10", "65536")),
    ("set_rule_on_match_goto", ("10", "abc")), ("set_rule_on_match_goto", ("10", "0")),
    # match numbers
    ("set_match_local_preference", ("10", "4294967296")), ("set_match_local_preference", ("10", "-1")),
    ("set_match_metric", ("10", "0")), ("set_match_metric", ("10", "65536")),
    ("set_match_tag", ("10", "0")), ("set_match_tag", ("10", "65536")),
    ("set_match_ip_address_prefix_len", ("10", "33")), ("set_match_ip_nexthop_prefix_len", ("10", "33")),
    ("set_match_ipv6_address_prefix_len", ("10", "129")),
    # choices
    ("set_match_origin", ("10", "bgp")), ("set_origin", ("10", "IGP")),
    ("set_match_rpki", ("10", "unknown")), ("set_metric_type", ("10", "type-3")),
    ("set_match_protocol", ("10", "eigrp")), ("set_match_ip_nexthop_type", ("10", "null")),
    ("set_match_ipv6_nexthop_type", ("10", "reject")),
    # addresses
    ("set_match_ip_nexthop_address", ("10", "2001:db8::1")), ("set_match_ip_nexthop_address", ("10", "010.0.0.1")),
    ("set_match_ipv6_nexthop_address", ("10", "192.0.2.1")), ("set_match_ipv6_nexthop_address", ("10", "fe80::1%eth0")),
    ("set_match_peer", ("10", "peer1")), ("set_match_peer", ("10", "192.0.2.0/24")),
    ("set_aggregator_ip", ("10", "2001:db8::1")), ("set_originator_id", ("10", "1.2.3")),
    ("set_src", ("10", "eth0")), ("set_evpn_gateway_ipv4", ("10", "2001:db8::1")),
    ("set_evpn_gateway_ipv6", ("10", "192.0.2.1")), ("set_ipv6_nexthop_global", ("10", "x")),
    ("set_ipv6_nexthop_local", ("10", "192.0.2.1")),
    # set ip-next-hop: the keywords are their own ops
    ("set_ip_nexthop", ("10", "peer-address")), ("set_ip_nexthop", ("10", "unchanged")),
    ("set_ip_nexthop", ("10", "2001:db8::1")),
    # ip access-list numbers: a u32 tag in ASCII digits
    ("set_match_ip_address_access_list", ("10", "4294967296")), ("set_match_ip_address_access_list", ("10", "-1")),
    ("set_match_ip_nexthop_access_list", ("10", "\u0661\u0660\u0660")),
    ("set_match_ip_route_source_access_list", ("10", "1.5")),
    ("set_match_ip_address_access_list", ("10", "ACL")), ("set_match_ip_nexthop_access_list", ("10", "")),
    ("set_match_ip_route_source_access_list", ("10", "+5")),
    # evpn
    ("set_match_evpn_vni", ("10", "0")), ("set_match_evpn_vni", ("10", "16777215")),
    ("set_match_evpn_vni", ("10", "\u0661")), ("set_match_evpn_route_type", ("10", "bogus")),
    # evpn rd: ASN:NN, ASN4:NN or IPv4:NN
    ("set_match_evpn_rd", ("10", "65536:65536")), ("set_match_evpn_rd", ("10", "4294967296:0")),
    ("set_match_evpn_rd", ("10", "0:4294967296")), ("set_match_evpn_rd", ("10", "192.0.2.1:65536")),
    ("set_match_evpn_rd", ("10", "65000")), ("set_match_evpn_rd", ("10", "65000:")),
    ("set_match_evpn_rd", ("10", ":1")), ("set_match_evpn_rd", ("10", "2001:db8::1:1")),
    ("set_match_evpn_rd", ("10", "1.2.3:4")), ("set_match_evpn_rd", ("10", "a:1")),
    ("set_match_evpn_rd", ("10", "1:1:1")), ("set_match_evpn_rd", ("10", "\u0661:1")),
    ("set_match_evpn_rd", ("10", "65000: 1")), ("set_match_evpn_rd", ("10", "")),
    # call: the route-map name regex
    *[("set_rule_call", ("10", value)) for value in ("", ".RM", "R M", "RM\n", "R\tM", "R\x01M", "R/M")],
    # list, peer, interface and VRF names: no whitespace or control characters
    *[(method, ("10", value)) for method in WORD_OPS for value in BAD_WORDS],
    # as-path
    ("set_as_path_exclude", ("10", "0")), ("set_as_path_exclude", ("10", "65001,65002")),
    ("set_as_path_exclude", ("10", "ALL")), ("set_as_path_prepend", ("10", "all")),
    ("set_as_path_prepend", ("10", "65001  65002")), ("set_as_path_prepend", ("10", "4294967296")),
    ("set_as_path_prepend", ("10", " 65001")), ("set_as_path_prepend_last_as", ("10", "11")),
    ("set_as_path_prepend_last_as", ("10", "0")),
    # attributes
    ("set_aggregator_as", ("10", "0")), ("set_distance", ("10", "256")), ("set_local_preference", ("10", "x")),
    ("set_weight", ("10", "4294967296")), ("set_tag", ("10", "0")), ("set_table", ("10", "0")),
    ("set_table", ("10", "201")),
    ("set_metric", ("10", "4294967296")), ("set_metric", ("10", "+-1")), ("set_metric", ("10", "rtt+")),
    ("set_metric", ("10", "")),
    # extcommunity
    ("set_extcommunity_bandwidth", ("10", "0")), ("set_extcommunity_bandwidth", ("10", "25601")),
    ("set_extcommunity_bandwidth", ("10", "max")),
    ("set_extcommunity_rt", ("10", "65536:1")), ("set_extcommunity_rt", ("10", "65000:4294967296")),
    ("set_extcommunity_rt", ("10", "192.0.2.1:65536")), ("set_extcommunity_rt", ("10", "65000")),
    ("set_extcommunity_soo", ("10", "2001:db8::1:1")), ("set_extcommunity_soo", ("10", "a:b")),
    # communities
    ("set_community_add", ("10", "internet")), ("set_community_replace", ("10", "internet")),
    ("set_community_add", ("10", "65536:1")), ("set_community_add", ("10", "1:2:3")),
    ("set_community_replace", ("10", "no-exp")),
    ("set_large_community_add", ("10", "1:2")), ("set_large_community_add", ("10", "4294967296:0:0")),
    ("set_large_community_replace", ("10", "no-export")),
])
def test_bad_value_raises_before_any_op(method, args):
    # 1.4: the table bound is 1-200 there.
    builder = RouteMapBatchBuilder(V14)
    with pytest.raises(ValueError):
        getattr(builder, method)(N, *args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("value", BAD_WORDS)
def test_source_peer_rejects_a_bad_word_on_1_5(value):
    builder = RouteMapBatchBuilder("1.5")
    with pytest.raises(ValueError, match="match source-peer must not be empty"):
        builder.set_match_source_peer(N, "10", value)
    assert builder.get_operations() == []


def _value_ops():
    """Ops that take a value after name and rule."""
    return [
        name for name in _public_ops()
        if list(inspect.signature(getattr(RouteMapBatchBuilder, name)).parameters)[1:3] == ["name", "rule"]
        and len(inspect.signature(getattr(RouteMapBatchBuilder, name)).parameters) == 4
    ]


# Free text: the lab regex `.{0,255}` takes spaces (line breaks are checked).
FREE_TEXT_OPS = {"set_rule_description"}


@pytest.mark.parametrize("value", ["A B", "A\x01B", "A\nB"])
def test_every_value_op_checks_its_value(value):
    """No value op passes whitespace or a control character through unchecked."""
    ops = _value_ops()
    assert "set_rule_call" in ops and "set_match_source_peer" in ops and len(ops) > 60
    for method in ops:
        if method in FREE_TEXT_OPS and value != "A\nB":
            continue
        builder = RouteMapBatchBuilder("1.5")
        with pytest.raises(ValueError):
            getattr(builder, method)(N, "10", value)
        assert builder.get_operations() == [], method


def test_lab_bounds_are_accepted():
    builder = RouteMapBatchBuilder(V14)
    builder.set_rule(N, "1").set_rule(N, "65535")
    builder.set_rule_description(N, "1", "x" * DESCRIPTION_MAX_LENGTH)
    builder.set_route_map_description(N, "")
    # The labs commit 500 and 2700, outside the val_help ranges.
    for number in IP_ACCESS_LIST_NUMBERS:
        builder.set_match_ip_address_access_list(N, "1", number)
        builder.set_match_ip_nexthop_access_list(N, "1", number)
        builder.set_match_ip_route_source_access_list(N, "1", number)
    for community in COMMUNITY_WELL_KNOWN:
        builder.set_community_add(N, "1", community)
    builder.set_match_ip_address_prefix_len(N, "1", "0").set_match_ipv6_address_prefix_len(N, "1", "0")
    builder.set_metric(N, "1", "-0").set_metric(N, "1", "rtt").set_metric(N, "1", "+rtt")
    builder.set_extcommunity_rt(N, "1", "0:0").set_extcommunity_bandwidth(N, "1", "cumulative")
    builder.set_large_community_add(N, "1", "0:0:0").set_as_path_exclude(N, "1", "1")
    builder.set_distance(N, "1", "0").set_table(N, "1", "1")
    assert len(builder.get_operations()) == 4 + 3 * len(IP_ACCESS_LIST_NUMBERS) + len(COMMUNITY_WELL_KNOWN) + 11


def test_internet_is_not_offered():
    # 1.4 validates it and fails the commit; 1.5 rejects it.
    assert "internet" not in COMMUNITY_WELL_KNOWN
    for version in VERSIONS:
        assert "internet" not in RouteMapBatchBuilder(version).get_capabilities()["values"]["community_well_known"]


def test_restore_rule_recreates_every_leaf():
    tree = {
        "action": "permit",
        "match": {"community": {"community-list": "CL", "exact-match": {}}},
        "set": {
            "community": {"add": ["65000:1", "65000:2"]},
            "extcommunity": {"rt": "65000:9"},
            "ipv6-next-hop": {"peer-address": {}, "prefer-global": {}},
            "ip-next-hop": "unchanged",
        },
    }
    builder = RouteMapBatchBuilder("1.5").restore_rule(N, "20", tree)
    base = RM + ["rule", "20"]
    assert [path for _op, path in _ops(builder)] == [
        base,
        base + ["action", "permit"],
        base + ["match", "community", "community-list", "CL"],
        base + ["match", "community", "exact-match"],
        base + ["set", "community", "add", "65000:1"],
        base + ["set", "community", "add", "65000:2"],
        base + ["set", "extcommunity", "rt", "65000:9"],
        base + ["set", "ipv6-next-hop", "peer-address"],
        base + ["set", "ipv6-next-hop", "prefer-global"],
        base + ["set", "ip-next-hop", "unchanged"],
    ]
    assert {op for op, _path in _ops(builder)} == {"set"}


def test_restore_rule_checks_name_and_rule():
    with pytest.raises(ValueError):
        RouteMapBatchBuilder("1.5").restore_rule(N, "0", {})
    with pytest.raises(ValueError):
        RouteMapBatchBuilder("1.5").restore_rule("bad name", "1", {})


@pytest.mark.parametrize("version", VERSIONS)
def test_restore_rule_resets_an_empty_plain_container(version):
    """A ``{}`` the device left behind after its last child was deleted.

    ``match ip address {}``, ``set as-path {}``, ``on-match {}`` and the rest
    are plain nodes, not flags, but the move re-sets each bare node so the
    renumbered rule matches what the device held.
    """
    tree = {
        "action": "permit",
        "match": {"ip": {"address": {}}, "large-community": {}},
        "on-match": {},
        "set": {
            "as-path": {},
            "community": {},
            "evpn": {"gateway": {}},
            "extcommunity": {},
            "l3vpn-nexthop": {"encapsulation": {}},
        },
    }
    builder = RouteMapBatchBuilder(version).restore_rule(N, "20", tree)
    base = RM + ["rule", "20"]
    assert _ops(builder) == [
        ("set", base),
        ("set", base + ["action", "permit"]),
        ("set", base + ["match", "ip", "address"]),
        ("set", base + ["match", "large-community"]),
        ("set", base + ["on-match"]),
        ("set", base + ["set", "as-path"]),
        ("set", base + ["set", "community"]),
        ("set", base + ["set", "evpn", "gateway"]),
        ("set", base + ["set", "extcommunity"]),
        ("set", base + ["set", "l3vpn-nexthop", "encapsulation"]),
    ]
    # An empty top-level ``match {}`` / ``set {}`` is re-set as the bare node too.
    bare = RouteMapBatchBuilder(version).restore_rule(N, "20", {"match": {}, "set": {}})
    assert _ops(bare) == [("set", base), ("set", base + ["match"]), ("set", base + ["set"])]


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method", sorted(PARENT_DELETES))
def test_parent_delete_is_the_prefix_of_its_children(version, method):
    """Each parent op deletes the node that its child ops' paths start with."""
    builder = RouteMapBatchBuilder(version)
    getattr(builder, method)(N, "10")
    ((op, path),) = _ops(builder)
    assert (op, path) == ("delete", PARENT_DELETES[method])
    children = [case for case in CASES if case[0] != method and case[3][: len(path)] == path and len(case[3]) > len(path)]
    assert children


@pytest.mark.parametrize("method", sorted(PARENT_DELETES))
def test_parent_delete_checks_name_and_rule(method):
    builder = RouteMapBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(N, "0")
    with pytest.raises(ValueError):
        getattr(builder, method)("bad name", "10")
    assert builder.get_operations() == []


# ---------------------------------------------------------------- capabilities


def test_capabilities_per_version():
    old = RouteMapBatchBuilder(V14).get_capabilities()
    new = RouteMapBatchBuilder("1.5").get_capabilities()
    for caps, flag in ((old, False), (new, True)):
        assert caps["features"]["match_rpki_extcommunity"]["supported"] is flag
        assert caps["features"]["match_source_peer"]["supported"] is flag
        assert caps["as_path_prepend_exclusive"] is flag
        assert "version_info" not in caps
        assert "match_large_community_exact_match" not in caps["features"]
    assert old["values"]["evpn_route_types"] == ["macip", "multicast", "prefix"]
    assert new["values"]["evpn_route_types"] == ["ead", "macip", "multicast", "es", "prefix", "1", "2", "3", "4", "5"]
    for caps in (old, new):
        assert set(caps["features"]["match_evpn"]) == {"supported", "description"}
        assert caps["features"]["match_evpn"]["supported"] is True
    assert old["ranges"]["table"] == {"min": 1, "max": 200}
    assert new["ranges"]["table"] == {"min": 1, "max": 4294967295}
    for caps in (old, new):
        assert caps["ranges"]["evpn_vni"] == {"min": 1, "max": 16777214}
        assert caps["ranges"]["evpn_rd_asn4"] == {"min": 65536, "max": 4294967295}
        assert caps["ranges"]["evpn_rd_asn4_value"] == {"min": 0, "max": 65535}
        assert {k: v for k, v in caps["ranges"].items() if k not in ("table", "evpn_vni")} == RANGES
        assert "ip_access_list_ranges" not in caps
        assert caps["ranges"]["ip_access_list"] == {"min": 0, "max": 4294967295}
        assert caps["description_max_length"] == 255
        assert caps["values"]["protocols"] == [
            "babel", "bgp", "connected", "isis", "kernel", "ospf", "ospfv3", "rip", "ripng", "static", "table", "vnc",
        ]


def test_capabilities_read_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore these."""
    monkeypatch.setattr(RouteMapMapper, "versioned_nodes", lambda self: frozenset({"match source-peer"}))
    monkeypatch.setattr(RouteMapMapper, "evpn_route_types", lambda self: ("prefix",))
    monkeypatch.setattr(RouteMapMapper, "table_range", lambda self: (1, 7))
    monkeypatch.setattr(RouteMapMapper, "as_path_prepend_exclusive", lambda self: True)
    caps = RouteMapBatchBuilder(V14).get_capabilities()
    assert caps["features"]["match_source_peer"]["supported"] is True
    assert caps["features"]["match_rpki_extcommunity"]["supported"] is False
    assert caps["values"]["evpn_route_types"] == ["prefix"]
    assert caps["ranges"]["table"] == {"min": 1, "max": 7}
    assert caps["as_path_prepend_exclusive"] is True


def test_builder_checks_read_the_mapper(monkeypatch):
    monkeypatch.setattr(RouteMapMapper, "evpn_route_types", lambda self: ("es",))
    monkeypatch.setattr(RouteMapMapper, "table_range", lambda self: (1, 300))
    builder = RouteMapBatchBuilder(V14)
    builder.set_match_evpn_route_type(N, "1", "es").set_table(N, "1", "300")
    with pytest.raises(ValueError):
        builder.set_match_evpn_route_type(N, "1", "prefix")


# ---------------------------------------------------------------- mapper factory


@pytest.mark.parametrize("version", ["1.4", "1.4.3", "1.4-rolling-202401"])
def test_factory_returns_the_shared_class_on_1_4(version):
    mapper = get_route_map_mapper(version)
    assert type(mapper) is RouteMapMapper
    assert type(CommandMapperRegistry.get_mapper("route_map", version)) is RouteMapMapper
    assert mapper.versioned_nodes() == frozenset()


@pytest.mark.parametrize("version", ["1.5", "1.5-rolling-202511010000", "2025.11.01-0021-rolling", "latest"])
def test_factory_returns_the_subclass_elsewhere(version):
    mapper = get_route_map_mapper(version)
    assert type(mapper) is RouteMapMapperV1_5
    assert type(CommandMapperRegistry.get_mapper("route_map", version)) is RouteMapMapperV1_5
    assert mapper.versioned_nodes() == frozenset({"match rpki-extcommunity", "match source-peer"})


def test_version_only_paths_live_on_the_subclass():
    for method in RouteMapMapper._VERSIONED_NODES.values():
        assert not hasattr(RouteMapMapper, method)
        assert method in RouteMapMapperV1_5.__dict__
    assert "__init__" not in RouteMapMapper.__dict__
    assert "__init__" not in RouteMapMapperV1_5.__dict__


def test_versions_package_has_no_1_4_file():
    # A file check: a stale __pycache__/ could still resolve the old module.
    package = Path(inspect.getfile(RouteMapMapperV1_5)).parent
    assert sorted(p.name for p in package.glob("*.py")) == ["__init__.py", "v1_5.py"]


def test_mapper_does_not_read_the_version():
    for cls in (RouteMapMapper, RouteMapMapperV1_5):
        assert not re.search(r"self\.version\b", inspect.getsource(cls))
