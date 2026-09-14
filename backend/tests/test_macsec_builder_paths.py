"""Golden (method, args, op, expected_path) cases for MacsecInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.macsec import MacsecInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = MacsecInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_dhcp_options', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'dhcp-options']),
    ('delete_dhcpv6_options', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options']),
    ('delete_interface', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0']),
    ('delete_interface_address', ('macsec0', '192.0.2.1'), 'delete', ['interfaces', 'macsec', 'macsec0', 'address', '192.0.2.1']),
    ('delete_interface_description', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'description']),
    ('delete_interface_disable', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'disable']),
    ('delete_ip_disable_forwarding', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ip', 'disable-forwarding']),
    ('delete_ip_settings', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ip']),
    ('delete_ip_source_validation', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ip', 'source-validation']),
    ('delete_ipv6_address_no_default_link_local', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_settings', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ipv6']),
    ('delete_ipv6_source_validation', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'source-validation']),
    ('delete_mirror_egress', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'mirror', 'ingress']),
    ('delete_mtu', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'mtu']),
    ('delete_redirect', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'redirect']),
    ('delete_security_cipher', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'cipher']),
    ('delete_security_encrypt', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'encrypt']),
    ('delete_security_mka_cak', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'cak']),
    ('delete_security_mka_ckn', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'ckn']),
    ('delete_security_mka_priority', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'priority']),
    ('delete_security_replay_window', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'replay-window']),
    ('delete_security_static_key', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'key']),
    ('delete_security_static_peer', ('macsec0', 'G0'), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0']),
    ('delete_security_static_peer_disable', ('macsec0', 'G0'), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'disable']),
    ('delete_security_static_peer_key', ('macsec0', 'G0'), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'key']),
    ('delete_security_static_peer_mac', ('macsec0', 'G0'), 'delete', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'mac']),
    ('delete_source_interface', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'source-interface']),
    ('delete_vrf', ('macsec0',), 'delete', ['interfaces', 'macsec', 'macsec0', 'vrf']),
    ('set_dhcp_options_client_id', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'client-id', '5']),
    ('set_dhcp_options_default_route_distance', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'default-route-distance', '5']),
    ('set_dhcp_options_host_name', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'host-name', '5']),
    ('set_dhcp_options_mtu', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'mtu']),
    ('set_dhcp_options_no_default_route', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'no-default-route']),
    ('set_dhcp_options_reject', ('macsec0', '192.0.2.1'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'reject', '192.0.2.1']),
    ('set_dhcp_options_user_class', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'user-class', '5']),
    ('set_dhcp_options_vendor_class_id', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcp-options', 'vendor-class-id', '5']),
    ('set_dhcpv6_options_duid', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'duid', '5']),
    ('set_dhcpv6_options_no_release', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'no-release']),
    ('set_dhcpv6_options_parameters_only', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'parameters-only']),
    ('set_dhcpv6_options_pd', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'pd', '5']),
    ('set_dhcpv6_options_pd_interface', ('macsec0', '5', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'pd', '5', 'interface', '5']),
    ('set_dhcpv6_options_pd_interface_address', ('macsec0', '5', '5', '192.0.2.1'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'address', '192.0.2.1']),
    ('set_dhcpv6_options_pd_interface_sla_id', ('macsec0', '5', '5', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'sla-id', '5']),
    ('set_dhcpv6_options_pd_length', ('macsec0', '5', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'pd', '5', 'length', '5']),
    ('set_dhcpv6_options_rapid_commit', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'rapid-commit']),
    ('set_dhcpv6_options_temporary', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'dhcpv6-options', 'temporary']),
    ('set_interface_address', ('macsec0', '192.0.2.1'), 'set', ['interfaces', 'macsec', 'macsec0', 'address', '192.0.2.1']),
    ('set_interface_description', ('macsec0', 'lab'), 'set', ['interfaces', 'macsec', 'macsec0', 'description', 'lab']),
    ('set_interface_disable', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'disable']),
    ('set_ip_adjust_mss', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'adjust-mss', '5']),
    ('set_ip_adjust_mss_clamp_to_pmtu', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'adjust-mss', 'clamp-mss-to-pmtu']),
    ('set_ip_arp_cache_timeout', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'arp-cache-timeout', '5']),
    ('set_ip_disable_arp_filter', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'disable-arp-filter']),
    ('set_ip_disable_forwarding', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'disable-forwarding']),
    ('set_ip_enable_arp_accept', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'enable-arp-accept']),
    ('set_ip_enable_arp_announce', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'enable-arp-announce']),
    ('set_ip_enable_arp_ignore', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'enable-arp-ignore']),
    ('set_ip_enable_directed_broadcast', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'enable-directed-broadcast']),
    ('set_ip_enable_proxy_arp', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'enable-proxy-arp']),
    ('set_ip_proxy_arp_pvlan', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'proxy-arp-pvlan']),
    ('set_ip_source_validation', ('macsec0', 'nat'), 'set', ['interfaces', 'macsec', 'macsec0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_accept_dad', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'accept-dad', '5']),
    ('set_ipv6_address_autoconf', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_address_eui64', ('macsec0', '2001:db8::/32'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_adjust_mss', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_adjust_mss_clamp_to_pmtu', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'adjust-mss', 'clamp-mss-to-pmtu']),
    ('set_ipv6_base_reachable_time', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'base-reachable-time', '5']),
    ('set_ipv6_disable_forwarding', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'disable-forwarding']),
    ('set_ipv6_dup_addr_detect_transmits', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'dup-addr-detect-transmits', '5']),
    ('set_ipv6_source_validation', ('macsec0', 'nat'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'source-validation', 'nat']),
    ('set_mirror_egress', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'mirror', 'ingress', '5']),
    ('set_mtu', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'mtu', '5']),
    ('set_redirect', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'redirect', '5']),
    ('set_security_cipher', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'cipher', '5']),
    ('set_security_encrypt', ('macsec0',), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'encrypt']),
    ('set_security_mka_cak', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'cak', '5']),
    ('set_security_mka_ckn', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'ckn', '5']),
    ('set_security_mka_priority', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'mka', 'priority', '5']),
    ('set_security_replay_window', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'replay-window', '5']),
    ('set_security_static_key', ('macsec0', 'secret'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'key', 'secret']),
    ('set_security_static_peer', ('macsec0', 'G0'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0']),
    ('set_security_static_peer_disable', ('macsec0', 'G0'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'disable']),
    ('set_security_static_peer_key', ('macsec0', 'G0', 'secret'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'key', 'secret']),
    ('set_security_static_peer_mac', ('macsec0', 'G0', '00:11:22:33:44:55'), 'set', ['interfaces', 'macsec', 'macsec0', 'security', 'static', 'peer', 'G0', 'mac', '00:11:22:33:44:55']),
    ('set_source_interface', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'source-interface', '5']),
    ('set_vrf', ('macsec0', 'red'), 'set', ['interfaces', 'macsec', 'macsec0', 'vrf', 'red']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_macsec_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('set_ipv6_address_interface_identifier', ('macsec0', '5'), 'set', ['interfaces', 'macsec', 'macsec0', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_macsec_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
