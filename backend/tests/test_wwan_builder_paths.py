"""Golden (method, args, op, expected_path) cases for WwanInterfaceBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.wwan import WwanInterfaceBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = WwanInterfaceBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_address', ('wwan0', '192.0.2.1'), 'delete', ['interfaces', 'wwan', 'wwan0', 'address', '192.0.2.1']),
    ('delete_address_all', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'address']),
    ('delete_apn', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'apn']),
    ('delete_auth_password', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'authentication', 'password']),
    ('delete_auth_username', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'authentication', 'username']),
    ('delete_authentication', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'authentication']),
    ('delete_connect_on_demand', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'connect-on-demand']),
    ('delete_description', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'description']),
    ('delete_dhcp_client_id', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'client-id']),
    ('delete_dhcp_default_route_distance', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'default-route-distance']),
    ('delete_dhcp_host_name', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'host-name']),
    ('delete_dhcp_no_default_route', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'no-default-route']),
    ('delete_dhcp_options', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options']),
    ('delete_dhcp_reject', ('wwan0', '5'), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'reject', '5']),
    ('delete_dhcp_reject_all', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'reject']),
    ('delete_dhcp_user_class', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'user-class']),
    ('delete_dhcp_vendor_class_id', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'vendor-class-id']),
    ('delete_dhcpv6_duid', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'duid']),
    ('delete_dhcpv6_no_release', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'no-release']),
    ('delete_dhcpv6_options', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options']),
    ('delete_dhcpv6_parameters_only', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'parameters-only']),
    ('delete_dhcpv6_pd_all', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'pd']),
    ('delete_dhcpv6_pd_instance', ('wwan0', '5'), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'pd', '5']),
    ('delete_dhcpv6_rapid_commit', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'rapid-commit']),
    ('delete_dhcpv6_temporary', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'temporary']),
    ('delete_disable', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'disable']),
    ('delete_disable_link_detect', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'disable-link-detect']),
    ('delete_interface', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0']),
    ('delete_ip_adjust_mss', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'adjust-mss']),
    ('delete_ip_arp_cache_timeout', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'arp-cache-timeout']),
    ('delete_ip_disable_arp_filter', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'disable-arp-filter']),
    ('delete_ip_disable_forwarding', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'disable-forwarding']),
    ('delete_ip_enable_arp_accept', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-accept']),
    ('delete_ip_enable_arp_announce', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-announce']),
    ('delete_ip_enable_arp_ignore', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-ignore']),
    ('delete_ip_enable_directed_broadcast', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-directed-broadcast']),
    ('delete_ip_enable_proxy_arp', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-proxy-arp']),
    ('delete_ip_proxy_arp_pvlan', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'proxy-arp-pvlan']),
    ('delete_ip_source_validation', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ip', 'source-validation']),
    ('delete_ipv6_accept_dad', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'accept-dad']),
    ('delete_ipv6_address_autoconf', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'autoconf']),
    ('delete_ipv6_address_eui64', ('wwan0', '2001:db8::/32'), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('delete_ipv6_address_eui64_all', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'eui64']),
    ('delete_ipv6_address_no_default_link_local', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_adjust_mss', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'adjust-mss']),
    ('delete_ipv6_base_reachable_time', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'base-reachable-time']),
    ('delete_ipv6_disable_forwarding', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'disable-forwarding']),
    ('delete_ipv6_dup_addr_detect_transmits', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'dup-addr-detect-transmits']),
    ('delete_ipv6_source_validation', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'source-validation']),
    ('delete_mirror_egress', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'mirror', 'ingress']),
    ('delete_mtu', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'mtu']),
    ('delete_redirect', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'redirect']),
    ('delete_vrf', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'vrf']),
    ('set_address', ('wwan0', '192.0.2.1'), 'set', ['interfaces', 'wwan', 'wwan0', 'address', '192.0.2.1']),
    ('set_apn', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'apn', '5']),
    ('set_auth_password', ('wwan0', 'secret'), 'set', ['interfaces', 'wwan', 'wwan0', 'authentication', 'password', 'secret']),
    ('set_auth_username', ('wwan0', 'user1'), 'set', ['interfaces', 'wwan', 'wwan0', 'authentication', 'username', 'user1']),
    ('set_connect_on_demand', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'connect-on-demand']),
    ('set_description', ('wwan0', 'lab'), 'set', ['interfaces', 'wwan', 'wwan0', 'description', 'lab']),
    ('set_dhcp_client_id', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'client-id', '5']),
    ('set_dhcp_default_route_distance', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'default-route-distance', '5']),
    ('set_dhcp_host_name', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'host-name', '5']),
    ('set_dhcp_no_default_route', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'no-default-route']),
    ('set_dhcp_reject', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'reject', '5']),
    ('set_dhcp_user_class', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'user-class', '5']),
    ('set_dhcp_vendor_class_id', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcp-options', 'vendor-class-id', '5']),
    ('set_dhcpv6_duid', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'duid', '5']),
    ('set_dhcpv6_no_release', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'no-release']),
    ('set_dhcpv6_parameters_only', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'parameters-only']),
    ('set_dhcpv6_pd_instance', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'pd', '5']),
    ('set_dhcpv6_rapid_commit', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'rapid-commit']),
    ('set_dhcpv6_temporary', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'dhcpv6-options', 'temporary']),
    ('set_disable', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'disable']),
    ('set_disable_link_detect', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'disable-link-detect']),
    ('set_interface', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0']),
    ('set_ip_adjust_mss', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'adjust-mss', '5']),
    ('set_ip_arp_cache_timeout', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'arp-cache-timeout', '5']),
    ('set_ip_disable_arp_filter', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'disable-arp-filter']),
    ('set_ip_disable_forwarding', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'disable-forwarding']),
    ('set_ip_enable_arp_accept', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-accept']),
    ('set_ip_enable_arp_announce', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-announce']),
    ('set_ip_enable_arp_ignore', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-arp-ignore']),
    ('set_ip_enable_directed_broadcast', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-directed-broadcast']),
    ('set_ip_enable_proxy_arp', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'enable-proxy-arp']),
    ('set_ip_proxy_arp_pvlan', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'proxy-arp-pvlan']),
    ('set_ip_source_validation', ('wwan0', 'nat'), 'set', ['interfaces', 'wwan', 'wwan0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_accept_dad', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'accept-dad', '5']),
    ('set_ipv6_address_autoconf', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_address_eui64', ('wwan0', '2001:db8::/32'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_adjust_mss', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_base_reachable_time', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'base-reachable-time', '5']),
    ('set_ipv6_disable_forwarding', ('wwan0',), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'disable-forwarding']),
    ('set_ipv6_dup_addr_detect_transmits', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'dup-addr-detect-transmits', '5']),
    ('set_ipv6_source_validation', ('wwan0', 'nat'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'source-validation', 'nat']),
    ('set_mirror_egress', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'mirror', 'ingress', '5']),
    ('set_mtu', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'mtu', '5']),
    ('set_redirect', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'redirect', '5']),
    ('set_vrf', ('wwan0', 'red'), 'set', ['interfaces', 'wwan', 'wwan0', 'vrf', 'red']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_wwan_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_ipv6_address_interface_identifier', ('wwan0',), 'delete', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'interface-identifier']),
    ('set_ipv6_address_interface_identifier', ('wwan0', '5'), 'set', ['interfaces', 'wwan', 'wwan0', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_wwan_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
