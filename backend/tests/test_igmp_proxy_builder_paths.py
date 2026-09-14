"""Golden (method, args, op, expected_path) cases for IgmpProxyBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #720; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.igmp_proxy.igmp_proxy_batch_builder import IgmpProxyBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = IgmpProxyBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_disable', (), 'delete', ['protocols', 'igmp-proxy', 'disable']),
    ('delete_disable_quickleave', (), 'delete', ['protocols', 'igmp-proxy', 'disable-quickleave']),
    ('delete_interface', ('eth0',), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0']),
    ('delete_interface_all_alt_subnets', ('eth0',), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'alt-subnet']),
    ('delete_interface_all_whitelists', ('eth0',), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'whitelist']),
    ('delete_interface_alt_subnet', ('eth0', '5'), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'alt-subnet', '5']),
    ('delete_interface_role', ('eth0',), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'role']),
    ('delete_interface_threshold', ('eth0',), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'threshold']),
    ('delete_interface_whitelist', ('eth0', '5'), 'delete', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'whitelist', '5']),
    ('set_disable', (), 'set', ['protocols', 'igmp-proxy', 'disable']),
    ('set_disable_quickleave', (), 'set', ['protocols', 'igmp-proxy', 'disable-quickleave']),
    ('set_interface', ('eth0',), 'set', ['protocols', 'igmp-proxy', 'interface', 'eth0']),
    ('set_interface_alt_subnet', ('eth0', '5'), 'set', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'alt-subnet', '5']),
    ('set_interface_role', ('eth0', '5'), 'set', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'role', '5']),
    ('set_interface_threshold', ('eth0', '5'), 'set', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'threshold', '5']),
    ('set_interface_whitelist', ('eth0', '5'), 'set', ['protocols', 'igmp-proxy', 'interface', 'eth0', 'whitelist', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_igmp_proxy_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
