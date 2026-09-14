"""Golden (method, args, op, expected_path) cases for VtiInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.vti import VtiInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = VtiInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_interface', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0']),
    ('delete_interface_address', ('vti0', '192.0.2.1'), 'delete', ['interfaces', 'vti', 'vti0', 'address', '192.0.2.1']),
    ('delete_interface_addresses', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'address']),
    ('delete_interface_description', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'description']),
    ('delete_interface_disable', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'disable']),
    ('delete_interface_mtu', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'mtu']),
    ('delete_interface_vrf', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'vrf']),
    ('delete_ip_adjust_mss', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'adjust-mss']),
    ('delete_ip_arp_cache_timeout', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'arp-cache-timeout']),
    ('delete_ip_disable_arp_filter', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'disable-arp-filter']),
    ('delete_ip_disable_forwarding', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'disable-forwarding']),
    ('delete_ip_enable_arp_accept', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-accept']),
    ('delete_ip_enable_arp_announce', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-announce']),
    ('delete_ip_enable_arp_ignore', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-ignore']),
    ('delete_ip_enable_directed_broadcast', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'enable-directed-broadcast']),
    ('delete_ip_enable_proxy_arp', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'enable-proxy-arp']),
    ('delete_ip_proxy_arp_pvlan', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'proxy-arp-pvlan']),
    ('delete_ip_source_validation', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ip', 'source-validation']),
    ('delete_ipv6_accept_dad', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'accept-dad']),
    ('delete_ipv6_address_autoconf', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'autoconf']),
    ('delete_ipv6_address_eui64', ('vti0', '2001:db8::/32'), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('delete_ipv6_address_eui64_all', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'eui64']),
    ('delete_ipv6_address_no_default_link_local', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_adjust_mss', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'adjust-mss']),
    ('delete_ipv6_base_reachable_time', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'base-reachable-time']),
    ('delete_ipv6_disable_forwarding', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'disable-forwarding']),
    ('delete_ipv6_dup_addr_detect_transmits', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'dup-addr-detect-transmits']),
    ('delete_ipv6_source_validation', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'ipv6', 'source-validation']),
    ('delete_mirror_egress', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'mirror', 'ingress']),
    ('delete_redirect', ('vti0',), 'delete', ['interfaces', 'vti', 'vti0', 'redirect']),
    ('set_interface_address', ('vti0', '192.0.2.1'), 'set', ['interfaces', 'vti', 'vti0', 'address', '192.0.2.1']),
    ('set_interface_description', ('vti0', 'lab'), 'set', ['interfaces', 'vti', 'vti0', 'description', 'lab']),
    ('set_interface_disable', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'disable']),
    ('set_interface_mtu', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'mtu', '5']),
    ('set_interface_vrf', ('vti0', 'red'), 'set', ['interfaces', 'vti', 'vti0', 'vrf', 'red']),
    ('set_ip_adjust_mss', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'adjust-mss', '5']),
    ('set_ip_arp_cache_timeout', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'arp-cache-timeout', '5']),
    ('set_ip_disable_arp_filter', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'disable-arp-filter']),
    ('set_ip_disable_forwarding', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'disable-forwarding']),
    ('set_ip_enable_arp_accept', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-accept']),
    ('set_ip_enable_arp_announce', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-announce']),
    ('set_ip_enable_arp_ignore', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'enable-arp-ignore']),
    ('set_ip_enable_directed_broadcast', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'enable-directed-broadcast']),
    ('set_ip_enable_proxy_arp', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'enable-proxy-arp']),
    ('set_ip_proxy_arp_pvlan', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'proxy-arp-pvlan']),
    ('set_ip_source_validation', ('vti0', 'nat'), 'set', ['interfaces', 'vti', 'vti0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_accept_dad', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'accept-dad', '5']),
    ('set_ipv6_address_autoconf', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_address_eui64', ('vti0', '2001:db8::/32'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_adjust_mss', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_base_reachable_time', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'base-reachable-time', '5']),
    ('set_ipv6_disable_forwarding', ('vti0',), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'disable-forwarding']),
    ('set_ipv6_dup_addr_detect_transmits', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'dup-addr-detect-transmits', '5']),
    ('set_ipv6_source_validation', ('vti0', 'nat'), 'set', ['interfaces', 'vti', 'vti0', 'ipv6', 'source-validation', 'nat']),
    ('set_mirror_egress', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'mirror', 'ingress', '5']),
    ('set_redirect', ('vti0', '5'), 'set', ['interfaces', 'vti', 'vti0', 'redirect', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_vti_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
