"""Golden (method, args, op, expected_path) cases for FirewallZonesBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #711; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.firewall.zones import FirewallZonesBatchBuilder


COMMON_CASES = [
    ('delete_zone', ('LAN',), 'delete', ['firewall', 'zone', 'LAN']),
    ('delete_zone_default_action', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'default-action']),
    ('delete_zone_default_log', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'default-log']),
    ('delete_zone_description', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'description']),
    ('delete_zone_from', ('LAN', 'WAN'), 'delete', ['firewall', 'zone', 'LAN', 'from', 'WAN']),
    ('delete_zone_from_firewall_ipv6_name', ('LAN', 'WAN'), 'delete', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'ipv6-name']),
    ('delete_zone_from_firewall_name', ('LAN', 'WAN'), 'delete', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'name']),
    ('delete_zone_intra_zone_action', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'action']),
    ('delete_zone_intra_zone_firewall_ipv6_name', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'firewall', 'ipv6-name']),
    ('delete_zone_intra_zone_firewall_name', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'firewall', 'name']),
    ('delete_zone_local_zone', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'local-zone']),
    ('set_zone', ('LAN',), 'set', ['firewall', 'zone', 'LAN']),
    ('set_zone_default_action', ('LAN', 'accept'), 'set', ['firewall', 'zone', 'LAN', 'default-action', 'accept']),
    ('set_zone_default_log', ('LAN',), 'set', ['firewall', 'zone', 'LAN', 'default-log']),
    ('set_zone_description', ('LAN', 'd'), 'set', ['firewall', 'zone', 'LAN', 'description', 'd']),
    ('set_zone_from', ('LAN', 'WAN'), 'set', ['firewall', 'zone', 'LAN', 'from', 'WAN']),
    ('set_zone_from_firewall_ipv6_name', ('LAN', 'WAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'ipv6-name', 'RS1']),
    ('set_zone_from_firewall_name', ('LAN', 'WAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'name', 'RS1']),
    ('set_zone_from_ipv4', ('LAN', 'WAN:RS1'), 'set', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'name', 'RS1']),
    ('set_zone_from_ipv6', ('LAN', 'WAN:RS1'), 'set', ['firewall', 'zone', 'LAN', 'from', 'WAN', 'firewall', 'ipv6-name', 'RS1']),
    ('set_zone_intra_zone_action', ('LAN', 'accept'), 'set', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'action', 'accept']),
    ('set_zone_intra_zone_firewall_ipv6_name', ('LAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'firewall', 'ipv6-name', 'RS1']),
    ('set_zone_intra_zone_firewall_name', ('LAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'intra-zone-filtering', 'firewall', 'name', 'RS1']),
    ('set_zone_local_zone', ('LAN',), 'set', ['firewall', 'zone', 'LAN', 'local-zone']),
]

V15_ONLY_CASES = [
    ('delete_zone_default_firewall_ipv6_name', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'default-firewall', 'ipv6-name']),
    ('delete_zone_default_firewall_name', ('LAN',), 'delete', ['firewall', 'zone', 'LAN', 'default-firewall', 'name']),
    ('delete_zone_interface', ('LAN', 'eth1'), 'delete', ['firewall', 'zone', 'LAN', 'member', 'interface', 'eth1']),
    ('delete_zone_member_vrf', ('LAN', 'VRFA'), 'delete', ['firewall', 'zone', 'LAN', 'member', 'vrf', 'VRFA']),
    ('set_zone_default_firewall_ipv6_name', ('LAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'default-firewall', 'ipv6-name', 'RS1']),
    ('set_zone_default_firewall_name', ('LAN', 'RS1'), 'set', ['firewall', 'zone', 'LAN', 'default-firewall', 'name', 'RS1']),
    ('set_zone_interface', ('LAN', 'eth1'), 'set', ['firewall', 'zone', 'LAN', 'member', 'interface', 'eth1']),
    ('set_zone_member_vrf', ('LAN', 'VRFA'), 'set', ['firewall', 'zone', 'LAN', 'member', 'vrf', 'VRFA']),
]

V14_ONLY_CASES = [
    ('delete_zone_interface', ('LAN', 'eth1'), 'delete', ['firewall', 'zone', 'LAN', 'interface', 'eth1']),
    ('delete_zone_member_vrf', ('LAN', 'VRFA'), 'delete', ['firewall', 'zone', 'LAN', 'interface', 'VRFA']),
    ('set_zone_interface', ('LAN', 'eth1'), 'set', ['firewall', 'zone', 'LAN', 'interface', 'eth1']),
    ('set_zone_member_vrf', ('LAN', 'VRFA'), 'set', ['firewall', 'zone', 'LAN', 'interface', 'VRFA']),
]


def _run(version, method, args, op, expected_path):
    builder = FirewallZonesBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_zones_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_zones_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V14_ONLY_CASES)
def test_zones_v1_4_only_paths(method, args, op, expected_path):
    _run("1.4", method, args, op, expected_path)
