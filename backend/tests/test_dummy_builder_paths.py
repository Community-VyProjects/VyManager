"""Golden (method, args, op, expected_path) cases for DummyInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.dummy import DummyInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = DummyInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_interface', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0']),
    ('delete_interface_address', ('dum0', '192.0.2.1'), 'delete', ['interfaces', 'dummy', 'dum0', 'address', '192.0.2.1']),
    ('delete_interface_description', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'description']),
    ('delete_interface_disable', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'disable']),
    ('delete_interface_mtu', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'mtu']),
    ('delete_interface_vrf', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'vrf']),
    ('delete_ip_disable_forwarding', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'ip', 'disable-forwarding']),
    ('delete_ip_source_validation', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'ip', 'source-validation']),
    ('delete_ipv6_address_eui64', ('dum0', '2001:db8::/32'), 'delete', ['interfaces', 'dummy', 'dum0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('delete_ipv6_address_no_default_link_local', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_disable_forwarding', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'ipv6', 'disable-forwarding']),
    ('delete_mirror_egress', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'mirror', 'ingress']),
    ('delete_redirect', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'redirect']),
    ('set_interface_address', ('dum0', '192.0.2.1'), 'set', ['interfaces', 'dummy', 'dum0', 'address', '192.0.2.1']),
    ('set_interface_description', ('dum0', 'lab'), 'set', ['interfaces', 'dummy', 'dum0', 'description', 'lab']),
    ('set_interface_disable', ('dum0',), 'set', ['interfaces', 'dummy', 'dum0', 'disable']),
    ('set_interface_mtu', ('dum0', '5'), 'set', ['interfaces', 'dummy', 'dum0', 'mtu', '5']),
    ('set_interface_vrf', ('dum0', 'red'), 'set', ['interfaces', 'dummy', 'dum0', 'vrf', 'red']),
    ('set_ip_disable_forwarding', ('dum0',), 'set', ['interfaces', 'dummy', 'dum0', 'ip', 'disable-forwarding']),
    ('set_ip_source_validation', ('dum0', 'nat'), 'set', ['interfaces', 'dummy', 'dum0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_address_eui64', ('dum0', '2001:db8::/32'), 'set', ['interfaces', 'dummy', 'dum0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('dum0',), 'set', ['interfaces', 'dummy', 'dum0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_disable_forwarding', ('dum0',), 'set', ['interfaces', 'dummy', 'dum0', 'ipv6', 'disable-forwarding']),
    ('set_mirror_egress', ('dum0', '5'), 'set', ['interfaces', 'dummy', 'dum0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('dum0', '5'), 'set', ['interfaces', 'dummy', 'dum0', 'mirror', 'ingress', '5']),
    ('set_redirect', ('dum0', '5'), 'set', ['interfaces', 'dummy', 'dum0', 'redirect', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dummy_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_mac', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'mac']),
    ('delete_netns', ('dum0',), 'delete', ['interfaces', 'dummy', 'dum0', 'netns']),
    ('set_mac', ('dum0', '00:11:22:33:44:55'), 'set', ['interfaces', 'dummy', 'dum0', 'mac', '00:11:22:33:44:55']),
    ('set_netns', ('dum0', '5'), 'set', ['interfaces', 'dummy', 'dum0', 'netns', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_dummy_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
