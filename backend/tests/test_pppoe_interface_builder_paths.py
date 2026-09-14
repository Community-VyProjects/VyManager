"""Golden (method, args, op, expected_path) cases for PppoeInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.pppoe import PppoeInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = PppoeInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_access_concentrator', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'access-concentrator']),
    ('delete_authentication', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'authentication']),
    ('delete_authentication_password', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'authentication', 'password']),
    ('delete_authentication_username', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'authentication', 'username']),
    ('delete_connect_on_demand', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'connect-on-demand']),
    ('delete_default_route_distance', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'default-route-distance']),
    ('delete_dhcpv6_duid', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'duid']),
    ('delete_dhcpv6_no_release', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'no-release']),
    ('delete_dhcpv6_options', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options']),
    ('delete_dhcpv6_parameters_only', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'parameters-only']),
    ('delete_dhcpv6_pd', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd']),
    ('delete_dhcpv6_pd_instance', ('pppoe0', '5'), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5']),
    ('delete_dhcpv6_pd_interface', ('pppoe0', '5', '5'), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5']),
    ('delete_dhcpv6_pd_interface_address', ('pppoe0', '5', '5'), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'address']),
    ('delete_dhcpv6_pd_interface_sla_id', ('pppoe0', '5', '5'), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'sla-id']),
    ('delete_dhcpv6_pd_length', ('pppoe0', '5'), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'length']),
    ('delete_dhcpv6_rapid_commit', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'rapid-commit']),
    ('delete_dhcpv6_temporary', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'temporary']),
    ('delete_holdoff', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'holdoff']),
    ('delete_host_uniq', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'host-uniq']),
    ('delete_idle_timeout', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'idle-timeout']),
    ('delete_interface', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0']),
    ('delete_interface_description', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'description']),
    ('delete_interface_disable', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'disable']),
    ('delete_ip_adjust_mss', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'adjust-mss']),
    ('delete_ip_disable_forwarding', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'disable-forwarding']),
    ('delete_ip_settings', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ip']),
    ('delete_ip_source_validation', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'source-validation']),
    ('delete_ipv6_address_autoconf', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'address', 'autoconf']),
    ('delete_ipv6_adjust_mss', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'adjust-mss']),
    ('delete_ipv6_disable_forwarding', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'disable-forwarding']),
    ('delete_ipv6_settings', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ipv6']),
    ('delete_local_address', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'local-address']),
    ('delete_mirror_egress', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'mirror', 'ingress']),
    ('delete_mru', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'mru']),
    ('delete_mtu', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'mtu']),
    ('delete_no_default_route', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'no-default-route']),
    ('delete_no_peer_dns', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'no-peer-dns']),
    ('delete_redirect', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'redirect']),
    ('delete_remote_address', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'remote-address']),
    ('delete_service_name', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'service-name']),
    ('delete_source_interface', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'source-interface']),
    ('delete_vrf', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'vrf']),
    ('set_access_concentrator', ('pppoe0', 'G0'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'access-concentrator', 'G0']),
    ('set_authentication_password', ('pppoe0', 'secret'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'authentication', 'password', 'secret']),
    ('set_authentication_username', ('pppoe0', 'user1'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'authentication', 'username', 'user1']),
    ('set_connect_on_demand', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'connect-on-demand']),
    ('set_default_route_distance', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'default-route-distance', '5']),
    ('set_dhcpv6_duid', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'duid', '5']),
    ('set_dhcpv6_no_release', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'no-release']),
    ('set_dhcpv6_parameters_only', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'parameters-only']),
    ('set_dhcpv6_pd_instance', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5']),
    ('set_dhcpv6_pd_interface', ('pppoe0', '5', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5']),
    ('set_dhcpv6_pd_interface_address', ('pppoe0', '5', '5', '192.0.2.1'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'address', '192.0.2.1']),
    ('set_dhcpv6_pd_interface_sla_id', ('pppoe0', '5', '5', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'sla-id', '5']),
    ('set_dhcpv6_pd_length', ('pppoe0', '5', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'pd', '5', 'length', '5']),
    ('set_dhcpv6_rapid_commit', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'rapid-commit']),
    ('set_dhcpv6_temporary', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'dhcpv6-options', 'temporary']),
    ('set_holdoff', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'holdoff', '5']),
    ('set_host_uniq', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'host-uniq', '5']),
    ('set_idle_timeout', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'idle-timeout', '5']),
    ('set_interface_description', ('pppoe0', 'lab'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'description', 'lab']),
    ('set_interface_disable', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'disable']),
    ('set_ip_adjust_mss', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'adjust-mss', '5']),
    ('set_ip_adjust_mss_clamp_to_pmtu', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'adjust-mss', 'clamp-mss-to-pmtu']),
    ('set_ip_disable_forwarding', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'disable-forwarding']),
    ('set_ip_source_validation', ('pppoe0', 'nat'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_address_autoconf', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_adjust_mss', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_adjust_mss_clamp_to_pmtu', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'adjust-mss', 'clamp-mss-to-pmtu']),
    ('set_ipv6_disable_forwarding', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'disable-forwarding']),
    ('set_local_address', ('pppoe0', '192.0.2.1'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'local-address', '192.0.2.1']),
    ('set_mirror_egress', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'mirror', 'ingress', '5']),
    ('set_mru', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'mru', '5']),
    ('set_mtu', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'mtu', '5']),
    ('set_no_default_route', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'no-default-route']),
    ('set_no_peer_dns', ('pppoe0',), 'set', ['interfaces', 'pppoe', 'pppoe0', 'no-peer-dns']),
    ('set_redirect', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'redirect', '5']),
    ('set_remote_address', ('pppoe0', '192.0.2.1'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'remote-address', '192.0.2.1']),
    ('set_service_name', ('pppoe0', 'G0'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'service-name', 'G0']),
    ('set_source_interface', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'source-interface', '5']),
    ('set_vrf', ('pppoe0', 'red'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'vrf', 'red']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_pppoe_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_ipv6_address_interface_identifier', ('pppoe0',), 'delete', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'address', 'interface-identifier']),
    ('set_ipv6_address_interface_identifier', ('pppoe0', '5'), 'set', ['interfaces', 'pppoe', 'pppoe0', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_pppoe_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
