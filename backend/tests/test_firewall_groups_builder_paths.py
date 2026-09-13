"""Golden (method, args, op, expected_path) cases for FirewallGroupsBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #711; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.firewall.groups import FirewallGroupsBatchBuilder


COMMON_CASES = [
    ('delete_address_group', ('G1',), 'delete', ['firewall', 'group', 'address-group', 'G1']),
    ('delete_address_group_address', ('G1', '203.0.113.10'), 'delete', ['firewall', 'group', 'address-group', 'G1', 'address', '203.0.113.10']),
    ('delete_address_group_description', ('G1',), 'delete', ['firewall', 'group', 'address-group', 'G1', 'description']),
    ('delete_address_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'address-group', 'G1', 'include', 'G2']),
    ('delete_interface_group', ('G1',), 'delete', ['firewall', 'group', 'interface-group', 'G1']),
    ('delete_interface_group_description', ('G1',), 'delete', ['firewall', 'group', 'interface-group', 'G1', 'description']),
    ('delete_interface_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'interface-group', 'G1', 'include', 'G2']),
    ('delete_interface_group_interface', ('G1', 'eth1'), 'delete', ['firewall', 'group', 'interface-group', 'G1', 'interface', 'eth1']),
    ('delete_ipv6_address_group', ('G1',), 'delete', ['firewall', 'group', 'ipv6-address-group', 'G1']),
    ('delete_ipv6_address_group_address', ('G1', '203.0.113.10'), 'delete', ['firewall', 'group', 'ipv6-address-group', 'G1', 'address', '203.0.113.10']),
    ('delete_ipv6_address_group_description', ('G1',), 'delete', ['firewall', 'group', 'ipv6-address-group', 'G1', 'description']),
    ('delete_ipv6_address_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'ipv6-address-group', 'G1', 'include', 'G2']),
    ('delete_ipv6_network_group', ('G1',), 'delete', ['firewall', 'group', 'ipv6-network-group', 'G1']),
    ('delete_ipv6_network_group_description', ('G1',), 'delete', ['firewall', 'group', 'ipv6-network-group', 'G1', 'description']),
    ('delete_ipv6_network_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'ipv6-network-group', 'G1', 'include', 'G2']),
    ('delete_ipv6_network_group_network', ('G1', '203.0.113.0/24'), 'delete', ['firewall', 'group', 'ipv6-network-group', 'G1', 'network', '203.0.113.0/24']),
    ('delete_mac_group', ('G1',), 'delete', ['firewall', 'group', 'mac-group', 'G1']),
    ('delete_mac_group_description', ('G1',), 'delete', ['firewall', 'group', 'mac-group', 'G1', 'description']),
    ('delete_mac_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'mac-group', 'G1', 'include', 'G2']),
    ('delete_mac_group_mac', ('G1', '00:11:22:33:44:55'), 'delete', ['firewall', 'group', 'mac-group', 'G1', 'mac-address', '00:11:22:33:44:55']),
    ('delete_network_group', ('G1',), 'delete', ['firewall', 'group', 'network-group', 'G1']),
    ('delete_network_group_description', ('G1',), 'delete', ['firewall', 'group', 'network-group', 'G1', 'description']),
    ('delete_network_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'network-group', 'G1', 'include', 'G2']),
    ('delete_network_group_network', ('G1', '203.0.113.0/24'), 'delete', ['firewall', 'group', 'network-group', 'G1', 'network', '203.0.113.0/24']),
    ('delete_port_group', ('G1',), 'delete', ['firewall', 'group', 'port-group', 'G1']),
    ('delete_port_group_description', ('G1',), 'delete', ['firewall', 'group', 'port-group', 'G1', 'description']),
    ('delete_port_group_include', ('G1', 'G2'), 'delete', ['firewall', 'group', 'port-group', 'G1', 'include', 'G2']),
    ('delete_port_group_port', ('G1', '443'), 'delete', ['firewall', 'group', 'port-group', 'G1', 'port', '443']),
    ('set_address_group', ('G1',), 'set', ['firewall', 'group', 'address-group', 'G1']),
    ('set_address_group_address', ('G1', '203.0.113.10'), 'set', ['firewall', 'group', 'address-group', 'G1', 'address', '203.0.113.10']),
    ('set_address_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'address-group', 'G1', 'description', 'd']),
    ('set_address_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'address-group', 'G1', 'include', 'G2']),
    ('set_interface_group', ('G1',), 'set', ['firewall', 'group', 'interface-group', 'G1']),
    ('set_interface_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'interface-group', 'G1', 'description', 'd']),
    ('set_interface_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'interface-group', 'G1', 'include', 'G2']),
    ('set_interface_group_interface', ('G1', 'eth1'), 'set', ['firewall', 'group', 'interface-group', 'G1', 'interface', 'eth1']),
    ('set_ipv6_address_group', ('G1',), 'set', ['firewall', 'group', 'ipv6-address-group', 'G1']),
    ('set_ipv6_address_group_address', ('G1', '203.0.113.10'), 'set', ['firewall', 'group', 'ipv6-address-group', 'G1', 'address', '203.0.113.10']),
    ('set_ipv6_address_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'ipv6-address-group', 'G1', 'description', 'd']),
    ('set_ipv6_address_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'ipv6-address-group', 'G1', 'include', 'G2']),
    ('set_ipv6_network_group', ('G1',), 'set', ['firewall', 'group', 'ipv6-network-group', 'G1']),
    ('set_ipv6_network_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'ipv6-network-group', 'G1', 'description', 'd']),
    ('set_ipv6_network_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'ipv6-network-group', 'G1', 'include', 'G2']),
    ('set_ipv6_network_group_network', ('G1', '203.0.113.0/24'), 'set', ['firewall', 'group', 'ipv6-network-group', 'G1', 'network', '203.0.113.0/24']),
    ('set_mac_group', ('G1',), 'set', ['firewall', 'group', 'mac-group', 'G1']),
    ('set_mac_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'mac-group', 'G1', 'description', 'd']),
    ('set_mac_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'mac-group', 'G1', 'include', 'G2']),
    ('set_mac_group_mac', ('G1', '00:11:22:33:44:55'), 'set', ['firewall', 'group', 'mac-group', 'G1', 'mac-address', '00:11:22:33:44:55']),
    ('set_network_group', ('G1',), 'set', ['firewall', 'group', 'network-group', 'G1']),
    ('set_network_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'network-group', 'G1', 'description', 'd']),
    ('set_network_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'network-group', 'G1', 'include', 'G2']),
    ('set_network_group_network', ('G1', '203.0.113.0/24'), 'set', ['firewall', 'group', 'network-group', 'G1', 'network', '203.0.113.0/24']),
    ('set_port_group', ('G1',), 'set', ['firewall', 'group', 'port-group', 'G1']),
    ('set_port_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'port-group', 'G1', 'description', 'd']),
    ('set_port_group_include', ('G1', 'G2'), 'set', ['firewall', 'group', 'port-group', 'G1', 'include', 'G2']),
    ('set_port_group_port', ('G1', '443'), 'set', ['firewall', 'group', 'port-group', 'G1', 'port', '443']),
]

V15_ONLY_CASES = [
    ('delete_domain_group', ('G1',), 'delete', ['firewall', 'group', 'domain-group', 'G1']),
    ('delete_domain_group_address', ('G1', '203.0.113.10'), 'delete', ['firewall', 'group', 'domain-group', 'G1', 'address', '203.0.113.10']),
    ('delete_domain_group_description', ('G1',), 'delete', ['firewall', 'group', 'domain-group', 'G1', 'description']),
    ('delete_remote_group', ('G1',), 'delete', ['firewall', 'group', 'remote-group', 'G1']),
    ('delete_remote_group_description', ('G1',), 'delete', ['firewall', 'group', 'remote-group', 'G1', 'description']),
    ('delete_remote_group_url', ('G1', 'https://example.com/list.txt'), 'delete', ['firewall', 'group', 'remote-group', 'G1', 'url', 'https://example.com/list.txt']),
    ('set_domain_group', ('G1',), 'set', ['firewall', 'group', 'domain-group', 'G1']),
    ('set_domain_group_address', ('G1', '203.0.113.10'), 'set', ['firewall', 'group', 'domain-group', 'G1', 'address', '203.0.113.10']),
    ('set_domain_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'domain-group', 'G1', 'description', 'd']),
    ('set_remote_group', ('G1',), 'set', ['firewall', 'group', 'remote-group', 'G1']),
    ('set_remote_group_description', ('G1', 'd'), 'set', ['firewall', 'group', 'remote-group', 'G1', 'description', 'd']),
    ('set_remote_group_url', ('G1', 'https://example.com/list.txt'), 'set', ['firewall', 'group', 'remote-group', 'G1', 'url', 'https://example.com/list.txt']),
]


def _run(version, method, args, op, expected_path):
    builder = FirewallGroupsBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_groups_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_groups_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)

