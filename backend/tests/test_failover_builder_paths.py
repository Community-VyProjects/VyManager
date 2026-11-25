"""Golden (method, args, op, expected_path) cases for FailoverBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.4) and 1.5 (100.64.64.5).
Sample values are ones the lab `allowed:` and syntax lines accept.
"""

import inspect

import pytest

from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder

ROLLING = "2026.09.23-0027-rolling"


COMMON_CASES = [
    ('delete_next_hop', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1']),
    ('delete_next_hop_check_policy', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'policy']),
    ('delete_next_hop_check_port', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'port']),
    ('delete_next_hop_check_target', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5']),
    ('delete_next_hop_check_target_all', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target']),
    ('delete_next_hop_check_timeout', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'timeout']),
    ('delete_next_hop_check_type', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'type']),
    ('delete_next_hop_interface', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'interface']),
    ('delete_next_hop_metric', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'metric']),
    ('delete_next_hop_onlink', ('10.0.0.0/8', '192.0.2.1'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'onlink']),
    ('delete_route', ('10.0.0.0/8',), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8']),
    ('set_next_hop', ('10.0.0.0/8', '192.0.2.1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1']),
    ('set_next_hop_check_policy', ('10.0.0.0/8', '192.0.2.1', 'any-available'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'policy', 'any-available']),
    ('set_next_hop_check_port', ('10.0.0.0/8', '192.0.2.1', '8080'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'port', '8080']),
    ('set_next_hop_check_target', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5']),
    ('set_next_hop_check_timeout', ('10.0.0.0/8', '192.0.2.1', '5'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'timeout', '5']),
    ('set_next_hop_check_type', ('10.0.0.0/8', '192.0.2.1', 'icmp'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'type', 'icmp']),
    ('set_next_hop_interface', ('10.0.0.0/8', '192.0.2.1', 'eth1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'interface', 'eth1']),
    ('set_next_hop_metric', ('10.0.0.0/8', '192.0.2.1', '10'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'metric', '10']),
    ('set_next_hop_onlink', ('10.0.0.0/8', '192.0.2.1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'onlink']),
    ('set_route', ('10.0.0.0/8',), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8']),
]

V15_ONLY_CASES = [
    ('delete_dhcp_interface', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0']),
    ('delete_dhcp_interface_check_policy', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'policy']),
    ('delete_dhcp_interface_check_port', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'port']),
    ('delete_dhcp_interface_check_target', ('10.0.0.0/8', 'eth0', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5']),
    ('delete_dhcp_interface_check_target_all', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target']),
    ('delete_dhcp_interface_check_target_interface', ('10.0.0.0/8', 'eth0', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5', 'interface']),
    ('delete_dhcp_interface_check_target_vrf', ('10.0.0.0/8', 'eth0', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5', 'vrf']),
    ('delete_dhcp_interface_check_timeout', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'timeout']),
    ('delete_dhcp_interface_check_type', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'type']),
    ('delete_dhcp_interface_interface', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'interface']),
    ('delete_dhcp_interface_metric', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'metric']),
    ('delete_dhcp_interface_onlink', ('10.0.0.0/8', 'eth0'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'onlink']),
    ('delete_next_hop_check_target_interface', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5', 'interface']),
    ('delete_next_hop_check_target_vrf', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5'), 'delete', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5', 'vrf']),
    ('set_dhcp_interface', ('10.0.0.0/8', 'eth0'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0']),
    ('set_dhcp_interface_check_policy', ('10.0.0.0/8', 'eth0', 'any-available'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'policy', 'any-available']),
    ('set_dhcp_interface_check_port', ('10.0.0.0/8', 'eth0', '8080'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'port', '8080']),
    ('set_dhcp_interface_check_target', ('10.0.0.0/8', 'eth0', '203.0.113.5'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5']),
    ('set_dhcp_interface_check_target_interface', ('10.0.0.0/8', 'eth0', '203.0.113.5', 'eth1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5', 'interface', 'eth1']),
    ('set_dhcp_interface_check_target_vrf', ('10.0.0.0/8', 'eth0', '203.0.113.5', 'blue'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'target', '203.0.113.5', 'vrf', 'blue']),
    ('set_dhcp_interface_check_timeout', ('10.0.0.0/8', 'eth0', '5'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'timeout', '5']),
    ('set_dhcp_interface_check_type', ('10.0.0.0/8', 'eth0', 'icmp'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'check', 'type', 'icmp']),
    ('set_dhcp_interface_interface', ('10.0.0.0/8', 'eth0', 'eth1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'interface', 'eth1']),
    ('set_dhcp_interface_metric', ('10.0.0.0/8', 'eth0', '10'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'metric', '10']),
    ('set_dhcp_interface_onlink', ('10.0.0.0/8', 'eth0'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'dhcp-interface', 'eth0', 'onlink']),
    ('set_next_hop_check_target_interface', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5', 'eth1'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5', 'interface', 'eth1']),
    ('set_next_hop_check_target_vrf', ('10.0.0.0/8', '192.0.2.1', '203.0.113.5', 'blue'), 'set', ['protocols', 'failover', 'route', '10.0.0.0/8', 'next-hop', '192.0.2.1', 'check', 'target', '203.0.113.5', 'vrf', 'blue']),
]


def _run(version, method, args, op, expected_path):
    builder = FailoverBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5", ROLLING])
def test_failover_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
@pytest.mark.parametrize("version", ["1.5", ROLLING])
def test_failover_v1_5_only_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, _op, _path", V15_ONLY_CASES)
def test_failover_v1_4_rejects_version_only_ops(method, args, _op, _path):
    """Missing 1.4 nodes must raise ValueError, not AttributeError into a 500."""
    builder = FailoverBatchBuilder(version="1.4")
    builder.set_route("10.0.0.0/8")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    paths = [item["path"] for item in builder.get_operations()]
    assert paths == [["protocols", "failover", "route", "10.0.0.0/8"]]


def test_every_builder_op_has_a_golden_row():
    builder = FailoverBatchBuilder(version="1.5")
    ops = {
        name
        for name, _member in inspect.getmembers(builder, predicate=inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    rows = {row[0] for row in COMMON_CASES + V15_ONLY_CASES}
    assert ops == rows
