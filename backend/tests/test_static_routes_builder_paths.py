"""Golden (method, args, verb, path) rows for StaticRoutesBatchBuilder.

Every path was checked against the lab template trees under
``protocols static`` on 1.4 (100.64.64.4) and 1.5 (100.64.64.5) and the
set/delete leaves were committed on both labs.
"""

import inspect

import pytest

from vyos_builders.static_routes.static_routes_batch_builder import StaticRoutesBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.static_routes.static_routes import (
    IPV4_SEGMENTS,
    MROUTE,
    SOURCE_PROFILE,
    StaticRoutesMapper,
)
from vyos_mappers.static_routes.static_routes_versions.v1_4 import StaticRoutesMapperV1_4
from vyos_mappers.static_routes.static_routes_versions.v1_5 import StaticRoutesMapperV1_5

CASES_BOTH = [
    ('delete_arp_entry', ('eth1', '192.0.2.5'), 'delete', ['protocols', 'static', 'arp', 'interface', 'eth1', 'address', '192.0.2.5']),
    ('delete_arp_entry_description', ('eth1', '192.0.2.5'), 'delete', ['protocols', 'static', 'arp', 'interface', 'eth1', 'address', '192.0.2.5', 'description']),
    ('delete_arp_interface', ('eth1',), 'delete', ['protocols', 'static', 'arp', 'interface', 'eth1']),
    ('delete_ipv4_route', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24']),
    ('delete_ipv4_route_blackhole', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole']),
    ('delete_ipv4_route_blackhole_distance', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole', 'distance']),
    ('delete_ipv4_route_blackhole_tag', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole', 'tag']),
    ('delete_ipv4_route_description', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'description']),
    ('delete_ipv4_route_dhcp_interface', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'dhcp-interface', 'eth1']),
    ('delete_ipv4_route_interface', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1']),
    ('delete_ipv4_route_interface_disable', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'disable']),
    ('delete_ipv4_route_interface_distance', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'distance']),
    ('delete_ipv4_route_interface_vrf', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'vrf']),
    ('delete_ipv4_route_next_hop', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1']),
    ('delete_ipv4_route_next_hop_bfd', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd']),
    ('delete_ipv4_route_next_hop_bfd_multi_hop', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop']),
    ('delete_ipv4_route_next_hop_bfd_profile', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'profile']),
    ('delete_ipv4_route_next_hop_disable', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('delete_ipv4_route_next_hop_distance', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'distance']),
    ('delete_ipv4_route_next_hop_interface', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'interface']),
    ('delete_ipv4_route_next_hop_vrf', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'vrf']),
    ('delete_ipv4_route_reject', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject']),
    ('delete_ipv4_route_reject_distance', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject', 'distance']),
    ('delete_ipv4_route_reject_tag', ('198.51.100.0/24',), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject', 'tag']),
    ('delete_ipv6_route', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48']),
    ('delete_ipv6_route_blackhole', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole']),
    ('delete_ipv6_route_blackhole_distance', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole', 'distance']),
    ('delete_ipv6_route_blackhole_tag', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole', 'tag']),
    ('delete_ipv6_route_description', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'description']),
    ('delete_ipv6_route_interface', ('2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1']),
    ('delete_ipv6_route_interface_disable', ('2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'disable']),
    ('delete_ipv6_route_interface_distance', ('2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'distance']),
    ('delete_ipv6_route_interface_segments', ('2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'segments']),
    ('delete_ipv6_route_interface_vrf', ('2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'vrf']),
    ('delete_ipv6_route_next_hop', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1']),
    ('delete_ipv6_route_next_hop_bfd', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd']),
    ('delete_ipv6_route_next_hop_bfd_multi_hop', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop']),
    ('delete_ipv6_route_next_hop_bfd_profile', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'profile']),
    ('delete_ipv6_route_next_hop_disable', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'disable']),
    ('delete_ipv6_route_next_hop_distance', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'distance']),
    ('delete_ipv6_route_next_hop_interface', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'interface']),
    ('delete_ipv6_route_next_hop_segments', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'segments']),
    ('delete_ipv6_route_next_hop_vrf', ('2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'vrf']),
    ('delete_ipv6_route_reject', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject']),
    ('delete_ipv6_route_reject_distance', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject', 'distance']),
    ('delete_ipv6_route_reject_tag', ('2001:db8:100::/48',), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject', 'tag']),
    ('delete_neighbor_proxy_arp', ('192.0.2.5',), 'delete', ['protocols', 'static', 'neighbor-proxy', 'arp', '192.0.2.5']),
    ('delete_neighbor_proxy_arp_interface', ('192.0.2.5', 'eth1'), 'delete', ['protocols', 'static', 'neighbor-proxy', 'arp', '192.0.2.5', 'interface', 'eth1']),
    ('delete_neighbor_proxy_nd', ('2001:db8::5',), 'delete', ['protocols', 'static', 'neighbor-proxy', 'nd', '2001:db8::5']),
    ('delete_neighbor_proxy_nd_interface', ('2001:db8::5', 'eth1'), 'delete', ['protocols', 'static', 'neighbor-proxy', 'nd', '2001:db8::5', 'interface', 'eth1']),
    ('delete_route_map', (), 'delete', ['protocols', 'static', 'route-map']),
    ('delete_table', ('10',), 'delete', ['protocols', 'static', 'table', '10']),
    ('delete_table_description', ('10',), 'delete', ['protocols', 'static', 'table', '10', 'description']),
    ('delete_table_ipv4_route', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24']),
    ('delete_table_ipv4_route_blackhole', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole']),
    ('delete_table_ipv4_route_blackhole_distance', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole', 'distance']),
    ('delete_table_ipv4_route_blackhole_tag', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole', 'tag']),
    ('delete_table_ipv4_route_description', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'description']),
    ('delete_table_ipv4_route_dhcp_interface', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'dhcp-interface', 'eth1']),
    ('delete_table_ipv4_route_interface', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1']),
    ('delete_table_ipv4_route_interface_disable', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'disable']),
    ('delete_table_ipv4_route_interface_distance', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'distance']),
    ('delete_table_ipv4_route_interface_vrf', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'vrf']),
    ('delete_table_ipv4_route_next_hop', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1']),
    ('delete_table_ipv4_route_next_hop_bfd', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd']),
    ('delete_table_ipv4_route_next_hop_bfd_multi_hop', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop']),
    ('delete_table_ipv4_route_next_hop_bfd_profile', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'profile']),
    ('delete_table_ipv4_route_next_hop_disable', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('delete_table_ipv4_route_next_hop_distance', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'distance']),
    ('delete_table_ipv4_route_next_hop_interface', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'interface']),
    ('delete_table_ipv4_route_next_hop_vrf', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'vrf']),
    ('delete_table_ipv4_route_reject', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject']),
    ('delete_table_ipv4_route_reject_distance', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject', 'distance']),
    ('delete_table_ipv4_route_reject_tag', ('10', '198.51.100.0/24'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject', 'tag']),
    ('delete_table_ipv6_route', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48']),
    ('delete_table_ipv6_route_blackhole', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole']),
    ('delete_table_ipv6_route_blackhole_distance', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole', 'distance']),
    ('delete_table_ipv6_route_blackhole_tag', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole', 'tag']),
    ('delete_table_ipv6_route_description', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'description']),
    ('delete_table_ipv6_route_interface', ('10', '2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1']),
    ('delete_table_ipv6_route_interface_disable', ('10', '2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'disable']),
    ('delete_table_ipv6_route_interface_distance', ('10', '2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'distance']),
    ('delete_table_ipv6_route_interface_segments', ('10', '2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'segments']),
    ('delete_table_ipv6_route_interface_vrf', ('10', '2001:db8:100::/48', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'vrf']),
    ('delete_table_ipv6_route_next_hop', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1']),
    ('delete_table_ipv6_route_next_hop_bfd', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd']),
    ('delete_table_ipv6_route_next_hop_bfd_multi_hop', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop']),
    ('delete_table_ipv6_route_next_hop_bfd_profile', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'profile']),
    ('delete_table_ipv6_route_next_hop_disable', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'disable']),
    ('delete_table_ipv6_route_next_hop_distance', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'distance']),
    ('delete_table_ipv6_route_next_hop_interface', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'interface']),
    ('delete_table_ipv6_route_next_hop_segments', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'segments']),
    ('delete_table_ipv6_route_next_hop_vrf', ('10', '2001:db8:100::/48', '2001:db8::1'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'vrf']),
    ('delete_table_ipv6_route_reject', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject']),
    ('delete_table_ipv6_route_reject_distance', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject', 'distance']),
    ('delete_table_ipv6_route_reject_tag', ('10', '2001:db8:100::/48'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject', 'tag']),
    ('set_arp_entry', ('eth1', '192.0.2.5', '00:11:22:33:44:55'), 'set', ['protocols', 'static', 'arp', 'interface', 'eth1', 'address', '192.0.2.5', 'mac', '00:11:22:33:44:55']),
    ('set_arp_entry_description', ('eth1', '192.0.2.5', 'T-desc'), 'set', ['protocols', 'static', 'arp', 'interface', 'eth1', 'address', '192.0.2.5', 'description', 'T-desc']),
    ('set_arp_interface', ('eth1',), 'set', ['protocols', 'static', 'arp', 'interface', 'eth1']),
    ('set_ipv4_route', ('198.51.100.0/24',), 'set', ['protocols', 'static', 'route', '198.51.100.0/24']),
    ('set_ipv4_route_blackhole', ('198.51.100.0/24',), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole']),
    ('set_ipv4_route_blackhole_distance', ('198.51.100.0/24', '10'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole', 'distance', '10']),
    ('set_ipv4_route_blackhole_tag', ('198.51.100.0/24', '7'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'blackhole', 'tag', '7']),
    ('set_ipv4_route_description', ('198.51.100.0/24', 'T-desc'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'description', 'T-desc']),
    ('set_ipv4_route_dhcp_interface', ('198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'dhcp-interface', 'eth1']),
    ('set_ipv4_route_interface', ('198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1']),
    ('set_ipv4_route_interface_disable', ('198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'disable']),
    ('set_ipv4_route_interface_distance', ('198.51.100.0/24', 'eth1', '10'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'distance', '10']),
    ('set_ipv4_route_interface_vrf', ('198.51.100.0/24', 'eth1', 'T-V'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'vrf', 'T-V']),
    ('set_ipv4_route_next_hop', ('198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1']),
    ('set_ipv4_route_next_hop_bfd', ('198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd']),
    ('set_ipv4_route_next_hop_bfd_multi_hop', ('198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop']),
    ('set_ipv4_route_next_hop_bfd_profile', ('198.51.100.0/24', '192.0.2.1', 'T-P'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'profile', 'T-P']),
    ('set_ipv4_route_next_hop_disable', ('198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('set_ipv4_route_next_hop_distance', ('198.51.100.0/24', '192.0.2.1', '10'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'distance', '10']),
    ('set_ipv4_route_next_hop_interface', ('198.51.100.0/24', '192.0.2.1', 'eth0'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'interface', 'eth0']),
    ('set_ipv4_route_next_hop_vrf', ('198.51.100.0/24', '192.0.2.1', 'T-V'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'vrf', 'T-V']),
    ('set_ipv4_route_reject', ('198.51.100.0/24',), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject']),
    ('set_ipv4_route_reject_distance', ('198.51.100.0/24', '10'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject', 'distance', '10']),
    ('set_ipv4_route_reject_tag', ('198.51.100.0/24', '7'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'reject', 'tag', '7']),
    ('set_ipv6_route', ('2001:db8:100::/48',), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48']),
    ('set_ipv6_route_blackhole', ('2001:db8:100::/48',), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole']),
    ('set_ipv6_route_blackhole_distance', ('2001:db8:100::/48', '10'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole', 'distance', '10']),
    ('set_ipv6_route_blackhole_tag', ('2001:db8:100::/48', '7'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'blackhole', 'tag', '7']),
    ('set_ipv6_route_description', ('2001:db8:100::/48', 'T-desc'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'description', 'T-desc']),
    ('set_ipv6_route_interface', ('2001:db8:100::/48', 'eth1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1']),
    ('set_ipv6_route_interface_disable', ('2001:db8:100::/48', 'eth1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'disable']),
    ('set_ipv6_route_interface_distance', ('2001:db8:100::/48', 'eth1', '10'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'distance', '10']),
    ('set_ipv6_route_interface_segments', ('2001:db8:100::/48', 'eth1', 'fc00::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'segments', 'fc00::1']),
    ('set_ipv6_route_interface_vrf', ('2001:db8:100::/48', 'eth1', 'T-V'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'vrf', 'T-V']),
    ('set_ipv6_route_next_hop', ('2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1']),
    ('set_ipv6_route_next_hop_bfd', ('2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd']),
    ('set_ipv6_route_next_hop_bfd_multi_hop', ('2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop']),
    ('set_ipv6_route_next_hop_bfd_profile', ('2001:db8:100::/48', '2001:db8::1', 'T-P'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'profile', 'T-P']),
    ('set_ipv6_route_next_hop_disable', ('2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'disable']),
    ('set_ipv6_route_next_hop_distance', ('2001:db8:100::/48', '2001:db8::1', '10'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'distance', '10']),
    ('set_ipv6_route_next_hop_interface', ('2001:db8:100::/48', '2001:db8::1', 'eth0'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'interface', 'eth0']),
    ('set_ipv6_route_next_hop_segments', ('2001:db8:100::/48', '2001:db8::1', 'fc00::1'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'segments', 'fc00::1']),
    ('set_ipv6_route_next_hop_vrf', ('2001:db8:100::/48', '2001:db8::1', 'T-V'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'vrf', 'T-V']),
    ('set_ipv6_route_reject', ('2001:db8:100::/48',), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject']),
    ('set_ipv6_route_reject_distance', ('2001:db8:100::/48', '10'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject', 'distance', '10']),
    ('set_ipv6_route_reject_tag', ('2001:db8:100::/48', '7'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'reject', 'tag', '7']),
    ('set_neighbor_proxy_arp', ('192.0.2.5', 'eth1'), 'set', ['protocols', 'static', 'neighbor-proxy', 'arp', '192.0.2.5', 'interface', 'eth1']),
    ('set_neighbor_proxy_nd', ('2001:db8::5', 'eth1'), 'set', ['protocols', 'static', 'neighbor-proxy', 'nd', '2001:db8::5', 'interface', 'eth1']),
    ('set_route_map', ('T-RM',), 'set', ['protocols', 'static', 'route-map', 'T-RM']),
    ('set_table', ('10',), 'set', ['protocols', 'static', 'table', '10']),
    ('set_table_description', ('10', 'T-desc'), 'set', ['protocols', 'static', 'table', '10', 'description', 'T-desc']),
    ('set_table_ipv4_route', ('10', '198.51.100.0/24'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24']),
    ('set_table_ipv4_route_blackhole', ('10', '198.51.100.0/24'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole']),
    ('set_table_ipv4_route_blackhole_distance', ('10', '198.51.100.0/24', '10'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole', 'distance', '10']),
    ('set_table_ipv4_route_blackhole_tag', ('10', '198.51.100.0/24', '7'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'blackhole', 'tag', '7']),
    ('set_table_ipv4_route_description', ('10', '198.51.100.0/24', 'T-desc'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'description', 'T-desc']),
    ('set_table_ipv4_route_dhcp_interface', ('10', '198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'dhcp-interface', 'eth1']),
    ('set_table_ipv4_route_interface', ('10', '198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1']),
    ('set_table_ipv4_route_interface_disable', ('10', '198.51.100.0/24', 'eth1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'disable']),
    ('set_table_ipv4_route_interface_distance', ('10', '198.51.100.0/24', 'eth1', '10'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'distance', '10']),
    ('set_table_ipv4_route_interface_vrf', ('10', '198.51.100.0/24', 'eth1', 'T-V'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'vrf', 'T-V']),
    ('set_table_ipv4_route_next_hop', ('10', '198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1']),
    ('set_table_ipv4_route_next_hop_bfd', ('10', '198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd']),
    ('set_table_ipv4_route_next_hop_bfd_multi_hop', ('10', '198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop']),
    ('set_table_ipv4_route_next_hop_bfd_profile', ('10', '198.51.100.0/24', '192.0.2.1', 'T-P'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'profile', 'T-P']),
    ('set_table_ipv4_route_next_hop_disable', ('10', '198.51.100.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('set_table_ipv4_route_next_hop_distance', ('10', '198.51.100.0/24', '192.0.2.1', '10'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'distance', '10']),
    ('set_table_ipv4_route_next_hop_interface', ('10', '198.51.100.0/24', '192.0.2.1', 'eth0'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'interface', 'eth0']),
    ('set_table_ipv4_route_next_hop_vrf', ('10', '198.51.100.0/24', '192.0.2.1', 'T-V'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'vrf', 'T-V']),
    ('set_table_ipv4_route_reject', ('10', '198.51.100.0/24'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject']),
    ('set_table_ipv4_route_reject_distance', ('10', '198.51.100.0/24', '10'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject', 'distance', '10']),
    ('set_table_ipv4_route_reject_tag', ('10', '198.51.100.0/24', '7'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'reject', 'tag', '7']),
    ('set_table_ipv6_route', ('10', '2001:db8:100::/48'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48']),
    ('set_table_ipv6_route_blackhole', ('10', '2001:db8:100::/48'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole']),
    ('set_table_ipv6_route_blackhole_distance', ('10', '2001:db8:100::/48', '10'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole', 'distance', '10']),
    ('set_table_ipv6_route_blackhole_tag', ('10', '2001:db8:100::/48', '7'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'blackhole', 'tag', '7']),
    ('set_table_ipv6_route_description', ('10', '2001:db8:100::/48', 'T-desc'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'description', 'T-desc']),
    ('set_table_ipv6_route_interface', ('10', '2001:db8:100::/48', 'eth1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1']),
    ('set_table_ipv6_route_interface_disable', ('10', '2001:db8:100::/48', 'eth1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'disable']),
    ('set_table_ipv6_route_interface_distance', ('10', '2001:db8:100::/48', 'eth1', '10'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'distance', '10']),
    ('set_table_ipv6_route_interface_segments', ('10', '2001:db8:100::/48', 'eth1', 'fc00::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'segments', 'fc00::1']),
    ('set_table_ipv6_route_interface_vrf', ('10', '2001:db8:100::/48', 'eth1', 'T-V'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'interface', 'eth1', 'vrf', 'T-V']),
    ('set_table_ipv6_route_next_hop', ('10', '2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1']),
    ('set_table_ipv6_route_next_hop_bfd', ('10', '2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd']),
    ('set_table_ipv6_route_next_hop_bfd_multi_hop', ('10', '2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop']),
    ('set_table_ipv6_route_next_hop_bfd_profile', ('10', '2001:db8:100::/48', '2001:db8::1', 'T-P'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'profile', 'T-P']),
    ('set_table_ipv6_route_next_hop_disable', ('10', '2001:db8:100::/48', '2001:db8::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'disable']),
    ('set_table_ipv6_route_next_hop_distance', ('10', '2001:db8:100::/48', '2001:db8::1', '10'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'distance', '10']),
    ('set_table_ipv6_route_next_hop_interface', ('10', '2001:db8:100::/48', '2001:db8::1', 'eth0'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'interface', 'eth0']),
    ('set_table_ipv6_route_next_hop_segments', ('10', '2001:db8:100::/48', '2001:db8::1', 'fc00::1'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'segments', 'fc00::1']),
    ('set_table_ipv6_route_next_hop_vrf', ('10', '2001:db8:100::/48', '2001:db8::1', 'T-V'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'vrf', 'T-V']),
    ('set_table_ipv6_route_reject', ('10', '2001:db8:100::/48'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject']),
    ('set_table_ipv6_route_reject_distance', ('10', '2001:db8:100::/48', '10'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject', 'distance', '10']),
    ('set_table_ipv6_route_reject_tag', ('10', '2001:db8:100::/48', '7'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'reject', 'tag', '7']),
]

CASES_1_5 = [
    ('delete_ipv4_route_interface_segments', ('198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'segments']),
    ('delete_ipv4_route_next_hop_bfd_multi_hop_source', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source-address', '192.0.2.9']),
    ('delete_ipv4_route_next_hop_segments', ('198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'segments']),
    ('delete_ipv6_route_next_hop_bfd_multi_hop_source', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source-address', '2001:db8::9']),
    ('delete_mroute', ('233.252.0.0/24',), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24']),
    ('delete_mroute_interface', ('233.252.0.0/24', 'eth1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1']),
    ('delete_mroute_interface_disable', ('233.252.0.0/24', 'eth1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1', 'disable']),
    ('delete_mroute_interface_distance', ('233.252.0.0/24', 'eth1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1', 'distance']),
    ('delete_mroute_interfaces', ('233.252.0.0/24',), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface']),
    ('delete_mroute_next_hop', ('233.252.0.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1']),
    ('delete_mroute_next_hop_disable', ('233.252.0.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('delete_mroute_next_hop_distance', ('233.252.0.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'distance']),
    ('delete_mroute_next_hops', ('233.252.0.0/24',), 'delete', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop']),
    ('delete_table_ipv4_route_interface_segments', ('10', '198.51.100.0/24', 'eth1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'segments']),
    ('delete_table_ipv4_route_next_hop_bfd_multi_hop_source', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source-address', '192.0.2.9']),
    ('delete_table_ipv4_route_next_hop_segments', ('10', '198.51.100.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'segments']),
    ('delete_table_ipv6_route_next_hop_bfd_multi_hop_source', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source-address', '2001:db8::9']),
    ('set_ipv4_route_interface_segments', ('198.51.100.0/24', 'eth1', 'fc00::1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'interface', 'eth1', 'segments', 'fc00::1']),
    ('set_ipv4_route_next_hop_bfd_multi_hop_source', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source-address', '192.0.2.9']),
    ('set_ipv4_route_next_hop_segments', ('198.51.100.0/24', '192.0.2.1', 'fc00::1'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'segments', 'fc00::1']),
    ('set_ipv6_route_next_hop_bfd_multi_hop_source', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source-address', '2001:db8::9']),
    ('set_mroute', ('233.252.0.0/24',), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24']),
    ('set_mroute_interface', ('233.252.0.0/24', 'eth1'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1']),
    ('set_mroute_interface_disable', ('233.252.0.0/24', 'eth1'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1', 'disable']),
    ('set_mroute_interface_distance', ('233.252.0.0/24', 'eth1', '10'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'interface', 'eth1', 'distance', '10']),
    ('set_mroute_next_hop', ('233.252.0.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1']),
    ('set_mroute_next_hop_disable', ('233.252.0.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'disable']),
    ('set_mroute_next_hop_distance', ('233.252.0.0/24', '192.0.2.1', '10'), 'set', ['protocols', 'static', 'mroute', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'distance', '10']),
    ('set_table_ipv4_route_interface_segments', ('10', '198.51.100.0/24', 'eth1', 'fc00::1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'interface', 'eth1', 'segments', 'fc00::1']),
    ('set_table_ipv4_route_next_hop_bfd_multi_hop_source', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source-address', '192.0.2.9']),
    ('set_table_ipv4_route_next_hop_segments', ('10', '198.51.100.0/24', '192.0.2.1', 'fc00::1'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'segments', 'fc00::1']),
    ('set_table_ipv6_route_next_hop_bfd_multi_hop_source', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source-address', '2001:db8::9']),
]

CASES_1_4 = [
    ('delete_ipv4_route_next_hop_bfd_multi_hop_source', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9']),
    ('delete_ipv4_route_next_hop_bfd_multi_hop_source_profile', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9', 'profile']),
    ('delete_ipv6_route_next_hop_bfd_multi_hop_source', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9']),
    ('delete_ipv6_route_next_hop_bfd_multi_hop_source_profile', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9', 'profile']),
    ('delete_mroute_interface', ('233.252.0.0/24', 'eth1'), 'delete', ['protocols', 'static', 'multicast', 'interface-route', '233.252.0.0/24', 'next-hop-interface', 'eth1']),
    ('delete_mroute_interface_distance', ('233.252.0.0/24', 'eth1'), 'delete', ['protocols', 'static', 'multicast', 'interface-route', '233.252.0.0/24', 'next-hop-interface', 'eth1', 'distance']),
    ('delete_mroute_interfaces', ('233.252.0.0/24',), 'delete', ['protocols', 'static', 'multicast', 'interface-route', '233.252.0.0/24']),
    ('delete_mroute_next_hop', ('233.252.0.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'multicast', 'route', '233.252.0.0/24', 'next-hop', '192.0.2.1']),
    ('delete_mroute_next_hop_distance', ('233.252.0.0/24', '192.0.2.1'), 'delete', ['protocols', 'static', 'multicast', 'route', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'distance']),
    ('delete_mroute_next_hops', ('233.252.0.0/24',), 'delete', ['protocols', 'static', 'multicast', 'route', '233.252.0.0/24']),
    ('delete_table_ipv4_route_next_hop_bfd_multi_hop_source', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9']),
    ('delete_table_ipv4_route_next_hop_bfd_multi_hop_source_profile', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'delete', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9', 'profile']),
    ('delete_table_ipv6_route_next_hop_bfd_multi_hop_source', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9']),
    ('delete_table_ipv6_route_next_hop_bfd_multi_hop_source_profile', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'delete', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9', 'profile']),
    ('set_ipv4_route_next_hop_bfd_multi_hop_source', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9']),
    ('set_ipv4_route_next_hop_bfd_multi_hop_source_profile', ('198.51.100.0/24', '192.0.2.1', '192.0.2.9', 'T-P'), 'set', ['protocols', 'static', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9', 'profile', 'T-P']),
    ('set_ipv6_route_next_hop_bfd_multi_hop_source', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9']),
    ('set_ipv6_route_next_hop_bfd_multi_hop_source_profile', ('2001:db8:100::/48', '2001:db8::1', '2001:db8::9', 'T-P'), 'set', ['protocols', 'static', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9', 'profile', 'T-P']),
    ('set_mroute_interface', ('233.252.0.0/24', 'eth1'), 'set', ['protocols', 'static', 'multicast', 'interface-route', '233.252.0.0/24', 'next-hop-interface', 'eth1']),
    ('set_mroute_interface_distance', ('233.252.0.0/24', 'eth1', '10'), 'set', ['protocols', 'static', 'multicast', 'interface-route', '233.252.0.0/24', 'next-hop-interface', 'eth1', 'distance', '10']),
    ('set_mroute_next_hop', ('233.252.0.0/24', '192.0.2.1'), 'set', ['protocols', 'static', 'multicast', 'route', '233.252.0.0/24', 'next-hop', '192.0.2.1']),
    ('set_mroute_next_hop_distance', ('233.252.0.0/24', '192.0.2.1', '10'), 'set', ['protocols', 'static', 'multicast', 'route', '233.252.0.0/24', 'next-hop', '192.0.2.1', 'distance', '10']),
    ('set_table_ipv4_route_next_hop_bfd_multi_hop_source', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9']),
    ('set_table_ipv4_route_next_hop_bfd_multi_hop_source_profile', ('10', '198.51.100.0/24', '192.0.2.1', '192.0.2.9', 'T-P'), 'set', ['protocols', 'static', 'table', '10', 'route', '198.51.100.0/24', 'next-hop', '192.0.2.1', 'bfd', 'multi-hop', 'source', '192.0.2.9', 'profile', 'T-P']),
    ('set_table_ipv6_route_next_hop_bfd_multi_hop_source', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9']),
    ('set_table_ipv6_route_next_hop_bfd_multi_hop_source_profile', ('10', '2001:db8:100::/48', '2001:db8::1', '2001:db8::9', 'T-P'), 'set', ['protocols', 'static', 'table', '10', 'route6', '2001:db8:100::/48', 'next-hop', '2001:db8::1', 'bfd', 'multi-hop', 'source', '2001:db8::9', 'profile', 'T-P']),
]


def _path(version, method, args):
    builder = StaticRoutesBatchBuilder(version=version)
    getattr(builder, method)(*args)
    ops = builder.get_operations()
    assert len(ops) == 1
    return ops[0]["op"], ops[0]["path"]


@pytest.mark.parametrize("version", ["1.4", "1.5", "rolling-202611"])
@pytest.mark.parametrize("method,args,verb,path", CASES_BOTH, ids=[c[0] for c in CASES_BOTH])
def test_shared_paths(version, method, args, verb, path):
    assert _path(version, method, args) == (verb, path)


@pytest.mark.parametrize("version", ["1.5", "rolling-202611"])
@pytest.mark.parametrize("method,args,verb,path", CASES_1_5, ids=[c[0] for c in CASES_1_5])
def test_1_5_paths(version, method, args, verb, path):
    assert _path(version, method, args) == (verb, path)


@pytest.mark.parametrize("method,args,verb,path", CASES_1_4, ids=[c[0] for c in CASES_1_4])
def test_1_4_paths(method, args, verb, path):
    assert _path("1.4", method, args) == (verb, path)


ONLY_1_5 = {c[0] for c in CASES_1_5} - {c[0] for c in CASES_1_4}
ONLY_1_4 = {c[0] for c in CASES_1_4} - {c[0] for c in CASES_1_5}


@pytest.mark.parametrize("method", sorted(ONLY_1_5))
def test_1_5_only_ops_raise_on_1_4(method):
    args = next(c[1] for c in CASES_1_5 if c[0] == method)
    builder = StaticRoutesBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("method", sorted(ONLY_1_4))
def test_1_4_only_ops_raise_on_1_5(method):
    args = next(c[1] for c in CASES_1_4 if c[0] == method)
    builder = StaticRoutesBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(StaticRoutesBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {c[0] for c in CASES_BOTH + CASES_1_5 + CASES_1_4}
    assert ops == covered


def test_factory_returns_version_subclasses():
    assert type(CommandMapperRegistry.get_mapper("static_routes", "1.4")) is StaticRoutesMapperV1_4
    for version in ("1.5", "rolling-202611", "latest"):
        assert type(CommandMapperRegistry.get_mapper("static_routes", version)) is StaticRoutesMapperV1_5


def _features(version):
    return StaticRoutesBatchBuilder(version=version).get_capabilities()["features"]


def _vrf_features(version):
    return VrfBatchBuilder(version).get_capabilities()["features"]


def test_capabilities_follow_the_labs():
    assert {k: v["supported"] for k, v in _features("1.4").items()} == {
        "route_ipv4_segments": False,
        "next_hop_bfd_source_profile": True,
        "multicast_mroute": False,
        "route_dhcp_interface_multi": False,
    }
    assert {k: v["supported"] for k, v in _features("1.5").items()} == {
        "route_ipv4_segments": True,
        "next_hop_bfd_source_profile": False,
        "multicast_mroute": True,
        "route_dhcp_interface_multi": True,
    }
    for version, segments, profile, multi in (("1.4", False, True, False), ("1.5", True, False, True)):
        vrf = _vrf_features(version)
        assert vrf["static_route_ipv4_segments"]["supported"] is segments
        assert vrf["static_route_bfd_source_profile"]["supported"] is profile
        assert vrf["static_route_dhcp_interface_multi"]["supported"] is multi


def test_versioned_nodes_are_the_subclass_path_methods():
    """The allowlist is derived from which subclass defines each path method."""
    v14 = CommandMapperRegistry.get_mapper("static_routes", "1.4")
    v15 = CommandMapperRegistry.get_mapper("static_routes", "1.5")
    assert isinstance(v14, StaticRoutesMapper) and isinstance(v15, StaticRoutesMapper)
    assert v14.versioned_nodes() == {SOURCE_PROFILE}
    assert v15.versioned_nodes() == {IPV4_SEGMENTS, MROUTE}
    assert not hasattr(v14, "get_route_next_hop_segments")
    assert not hasattr(v14, "get_route_interface_segments")
    assert not hasattr(v15, "get_route_next_hop_bfd_multi_hop_source_profile")


def test_gates_read_the_mapper_not_the_version(monkeypatch):
    """Removing the 1.5 path method hides and rejects it on a 1.5 string;
    adding it to the 1.4 class allows it on a 1.4 string. A version check in
    the builder or the capabilities fails this."""
    segments = StaticRoutesMapperV1_5.get_route_next_hop_segments
    monkeypatch.delattr(StaticRoutesMapperV1_5, "get_route_next_hop_segments")
    assert _features("1.5")["route_ipv4_segments"]["supported"] is False
    assert _vrf_features("1.5")["static_route_ipv4_segments"]["supported"] is False
    with pytest.raises(ValueError, match="route segments is not supported"):
        StaticRoutesBatchBuilder(version="1.5").set_ipv4_route_next_hop_segments(
            "198.51.100.0/24", "192.0.2.1", "fc00::1"
        )
    with pytest.raises(ValueError, match="route segments is not supported"):
        VrfBatchBuilder("1.5").set_vrf_static_route_next_hop_segments("T-V", "198.51.100.0/24,192.0.2.1,fc00::1")

    monkeypatch.setattr(StaticRoutesMapperV1_4, "get_route_next_hop_segments", segments, raising=False)
    assert _features("1.4")["route_ipv4_segments"]["supported"] is True
    assert _vrf_features("1.4")["static_route_ipv4_segments"]["supported"] is True
    builder = StaticRoutesBatchBuilder(version="1.4")
    builder.set_ipv4_route_next_hop_segments("198.51.100.0/24", "192.0.2.1", "fc00::1")
    assert builder.get_operations()[0]["path"][-2:] == ["segments", "fc00::1"]
