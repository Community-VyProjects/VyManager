"""Golden (method, args, op, expected_path) cases for SstpcInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.sstpc import SstpcInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = SstpcInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_authentication', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'authentication']),
    ('delete_authentication_password', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'authentication', 'password']),
    ('delete_authentication_username', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'authentication', 'username']),
    ('delete_default_route_distance', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'default-route-distance']),
    ('delete_interface', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0']),
    ('delete_interface_description', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'description']),
    ('delete_interface_disable', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'disable']),
    ('delete_mtu', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'mtu']),
    ('delete_no_default_route', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'no-default-route']),
    ('delete_no_peer_dns', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'no-peer-dns']),
    ('delete_port', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'port']),
    ('delete_server', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'server']),
    ('delete_ssl', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'ssl']),
    ('delete_ssl_ca_certificate', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'ssl', 'ca-certificate']),
    ('delete_vrf', ('sstpc0',), 'delete', ['interfaces', 'sstpc', 'sstpc0', 'vrf']),
    ('set_authentication_password', ('sstpc0', 'secret'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'authentication', 'password', 'secret']),
    ('set_authentication_username', ('sstpc0', 'user1'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'authentication', 'username', 'user1']),
    ('set_default_route_distance', ('sstpc0', '5'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'default-route-distance', '5']),
    ('set_interface_description', ('sstpc0', 'lab'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'description', 'lab']),
    ('set_interface_disable', ('sstpc0',), 'set', ['interfaces', 'sstpc', 'sstpc0', 'disable']),
    ('set_mtu', ('sstpc0', '5'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'mtu', '5']),
    ('set_no_default_route', ('sstpc0',), 'set', ['interfaces', 'sstpc', 'sstpc0', 'no-default-route']),
    ('set_no_peer_dns', ('sstpc0',), 'set', ['interfaces', 'sstpc', 'sstpc0', 'no-peer-dns']),
    ('set_port', ('sstpc0', '8080'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'port', '8080']),
    ('set_server', ('sstpc0', '192.0.2.1'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'server', '192.0.2.1']),
    ('set_ssl_ca_certificate', ('sstpc0', 'G0'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'ssl', 'ca-certificate', 'G0']),
    ('set_vrf', ('sstpc0', 'red'), 'set', ['interfaces', 'sstpc', 'sstpc0', 'vrf', 'red']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_sstpc_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
