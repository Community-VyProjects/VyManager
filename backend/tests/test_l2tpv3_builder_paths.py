"""Golden (method, args, op, expected_path) cases for L2TPv3InterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.l2tpv3 import L2TPv3InterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = L2TPv3InterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_destination_port', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'destination-port']),
    ('delete_encapsulation', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'encapsulation']),
    ('delete_interface', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0']),
    ('delete_interface_address', ('l2tpeth0', '192.0.2.1'), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'address', '192.0.2.1']),
    ('delete_interface_description', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'description']),
    ('delete_interface_disable', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'disable']),
    ('delete_interface_mtu', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mtu']),
    ('delete_interface_vrf', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'vrf']),
    ('delete_ip_adjust_mss', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'adjust-mss']),
    ('delete_ip_arp_cache_timeout', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'arp-cache-timeout']),
    ('delete_ip_disable_arp_filter', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'disable-arp-filter']),
    ('delete_ip_disable_forwarding', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'disable-forwarding']),
    ('delete_ip_enable_arp_accept', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-accept']),
    ('delete_ip_enable_arp_announce', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-announce']),
    ('delete_ip_enable_arp_ignore', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-ignore']),
    ('delete_ip_enable_directed_broadcast', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-directed-broadcast']),
    ('delete_ip_enable_proxy_arp', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-proxy-arp']),
    ('delete_ip_proxy_arp_pvlan', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'proxy-arp-pvlan']),
    ('delete_ip_source_validation', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'source-validation']),
    ('delete_ipv6_accept_dad', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'accept-dad']),
    ('delete_ipv6_address_autoconf', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'autoconf']),
    ('delete_ipv6_address_eui64', ('l2tpeth0', '2001:db8::/32'), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('delete_ipv6_address_no_default_link_local', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_adjust_mss', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'adjust-mss']),
    ('delete_ipv6_base_reachable_time', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'base-reachable-time']),
    ('delete_ipv6_disable_forwarding', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'disable-forwarding']),
    ('delete_ipv6_dup_addr_detect_transmits', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'dup-addr-detect-transmits']),
    ('delete_ipv6_source_validation', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'source-validation']),
    ('delete_mirror_egress', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mirror', 'ingress']),
    ('delete_peer_session_id', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'peer-session-id']),
    ('delete_peer_tunnel_id', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'peer-tunnel-id']),
    ('delete_remote', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'remote']),
    ('delete_session_id', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'session-id']),
    ('delete_source_address', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'source-address']),
    ('delete_source_port', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'source-port']),
    ('delete_tunnel_id', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'tunnel-id']),
    ('set_destination_port', ('l2tpeth0', '8080'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'destination-port', '8080']),
    ('set_encapsulation', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'encapsulation', '5']),
    ('set_interface_address', ('l2tpeth0', '192.0.2.1'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'address', '192.0.2.1']),
    ('set_interface_description', ('l2tpeth0', 'lab'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'description', 'lab']),
    ('set_interface_disable', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'disable']),
    ('set_interface_mtu', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mtu', '5']),
    ('set_interface_vrf', ('l2tpeth0', 'red'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'vrf', 'red']),
    ('set_ip_adjust_mss', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'adjust-mss', '5']),
    ('set_ip_arp_cache_timeout', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'arp-cache-timeout', '5']),
    ('set_ip_disable_arp_filter', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'disable-arp-filter']),
    ('set_ip_disable_forwarding', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'disable-forwarding']),
    ('set_ip_enable_arp_accept', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-accept']),
    ('set_ip_enable_arp_announce', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-announce']),
    ('set_ip_enable_arp_ignore', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-arp-ignore']),
    ('set_ip_enable_directed_broadcast', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-directed-broadcast']),
    ('set_ip_enable_proxy_arp', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'enable-proxy-arp']),
    ('set_ip_proxy_arp_pvlan', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'proxy-arp-pvlan']),
    ('set_ip_source_validation', ('l2tpeth0', 'nat'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_accept_dad', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'accept-dad', '5']),
    ('set_ipv6_address_autoconf', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_address_eui64', ('l2tpeth0', '2001:db8::/32'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_adjust_mss', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_base_reachable_time', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'base-reachable-time', '5']),
    ('set_ipv6_disable_forwarding', ('l2tpeth0',), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'disable-forwarding']),
    ('set_ipv6_dup_addr_detect_transmits', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'dup-addr-detect-transmits', '5']),
    ('set_ipv6_source_validation', ('l2tpeth0', 'nat'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'source-validation', 'nat']),
    ('set_mirror_egress', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'mirror', 'ingress', '5']),
    ('set_peer_session_id', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'peer-session-id', '5']),
    ('set_peer_tunnel_id', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'peer-tunnel-id', '5']),
    ('set_remote', ('l2tpeth0', '192.0.2.1'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'remote', '192.0.2.1']),
    ('set_session_id', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'session-id', '5']),
    ('set_source_address', ('l2tpeth0', '192.0.2.1'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'source-address', '192.0.2.1']),
    ('set_source_port', ('l2tpeth0', '8080'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'source-port', '8080']),
    ('set_tunnel_id', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'tunnel-id', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_l2tpv3_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_ipv6_address_interface_identifier', ('l2tpeth0',), 'delete', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'interface-identifier']),
    ('set_ipv6_address_interface_identifier', ('l2tpeth0', '5'), 'set', ['interfaces', 'l2tpv3', 'l2tpeth0', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_l2tpv3_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
