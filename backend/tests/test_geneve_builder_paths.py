"""Golden (method, args, op, expected_path) cases for GeneveInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.geneve import GeneveInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = GeneveInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_interface', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0']),
    ('delete_interface_address', ('gnv0', '192.0.2.1'), 'delete', ['interfaces', 'geneve', 'gnv0', 'address', '192.0.2.1']),
    ('delete_interface_description', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'description']),
    ('delete_interface_disable', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'disable']),
    ('delete_interface_mtu', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'mtu']),
    ('delete_interface_vrf', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'vrf']),
    ('delete_ip_adjust_mss', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'adjust-mss']),
    ('delete_ip_arp_cache_timeout', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'arp-cache-timeout']),
    ('delete_ip_disable_arp_filter', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'disable-arp-filter']),
    ('delete_ip_disable_forwarding', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'disable-forwarding']),
    ('delete_ip_enable_arp_accept', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-accept']),
    ('delete_ip_enable_arp_announce', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-announce']),
    ('delete_ip_enable_arp_ignore', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-ignore']),
    ('delete_ip_enable_directed_broadcast', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-directed-broadcast']),
    ('delete_ip_enable_proxy_arp', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-proxy-arp']),
    ('delete_ip_proxy_arp_pvlan', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'proxy-arp-pvlan']),
    ('delete_ip_source_validation', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ip', 'source-validation']),
    ('delete_ipv6_accept_dad', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'accept-dad']),
    ('delete_ipv6_address_autoconf', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'autoconf']),
    ('delete_ipv6_address_eui64', ('gnv0', '2001:db8::/32'), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('delete_ipv6_address_no_default_link_local', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'no-default-link-local']),
    ('delete_ipv6_adjust_mss', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'adjust-mss']),
    ('delete_ipv6_base_reachable_time', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'base-reachable-time']),
    ('delete_ipv6_disable_forwarding', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'disable-forwarding']),
    ('delete_ipv6_dup_addr_detect_transmits', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'dup-addr-detect-transmits']),
    ('delete_ipv6_source_validation', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'source-validation']),
    ('delete_mac', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'mac']),
    ('delete_mirror_egress', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'mirror', 'ingress']),
    ('delete_parameters_ip_df', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'df']),
    ('delete_parameters_ip_innerproto', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'innerproto']),
    ('delete_parameters_ip_tos', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'tos']),
    ('delete_parameters_ip_ttl', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'ttl']),
    ('delete_parameters_ipv6_flowlabel', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ipv6', 'flowlabel']),
    ('delete_port', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'port']),
    ('delete_redirect', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'redirect']),
    ('delete_remote', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'remote']),
    ('delete_vni', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'vni']),
    ('set_interface_address', ('gnv0', '192.0.2.1'), 'set', ['interfaces', 'geneve', 'gnv0', 'address', '192.0.2.1']),
    ('set_interface_description', ('gnv0', 'lab'), 'set', ['interfaces', 'geneve', 'gnv0', 'description', 'lab']),
    ('set_interface_disable', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'disable']),
    ('set_interface_mtu', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'mtu', '5']),
    ('set_interface_vrf', ('gnv0', 'red'), 'set', ['interfaces', 'geneve', 'gnv0', 'vrf', 'red']),
    ('set_ip_adjust_mss', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'adjust-mss', '5']),
    ('set_ip_arp_cache_timeout', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'arp-cache-timeout', '5']),
    ('set_ip_disable_arp_filter', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'disable-arp-filter']),
    ('set_ip_disable_forwarding', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'disable-forwarding']),
    ('set_ip_enable_arp_accept', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-accept']),
    ('set_ip_enable_arp_announce', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-announce']),
    ('set_ip_enable_arp_ignore', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-arp-ignore']),
    ('set_ip_enable_directed_broadcast', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-directed-broadcast']),
    ('set_ip_enable_proxy_arp', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'enable-proxy-arp']),
    ('set_ip_proxy_arp_pvlan', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'proxy-arp-pvlan']),
    ('set_ip_source_validation', ('gnv0', 'nat'), 'set', ['interfaces', 'geneve', 'gnv0', 'ip', 'source-validation', 'nat']),
    ('set_ipv6_accept_dad', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'accept-dad', '5']),
    ('set_ipv6_address_autoconf', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'autoconf']),
    ('set_ipv6_address_eui64', ('gnv0', '2001:db8::/32'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'eui64', '2001:db8::/32']),
    ('set_ipv6_address_no_default_link_local', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'no-default-link-local']),
    ('set_ipv6_adjust_mss', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'adjust-mss', '5']),
    ('set_ipv6_base_reachable_time', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'base-reachable-time', '5']),
    ('set_ipv6_disable_forwarding', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'disable-forwarding']),
    ('set_ipv6_dup_addr_detect_transmits', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'dup-addr-detect-transmits', '5']),
    ('set_ipv6_source_validation', ('gnv0', 'nat'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'source-validation', 'nat']),
    ('set_mac', ('gnv0', '00:11:22:33:44:55'), 'set', ['interfaces', 'geneve', 'gnv0', 'mac', '00:11:22:33:44:55']),
    ('set_mirror_egress', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'mirror', 'ingress', '5']),
    ('set_parameters_ip_df', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'df', '5']),
    ('set_parameters_ip_innerproto', ('gnv0',), 'set', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'innerproto']),
    ('set_parameters_ip_tos', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'tos', '5']),
    ('set_parameters_ip_ttl', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ip', 'ttl', '5']),
    ('set_parameters_ipv6_flowlabel', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'parameters', 'ipv6', 'flowlabel', '5']),
    ('set_port', ('gnv0', '8080'), 'set', ['interfaces', 'geneve', 'gnv0', 'port', '8080']),
    ('set_redirect', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'redirect', '5']),
    ('set_remote', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'remote', '5']),
    ('set_vni', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'vni', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_geneve_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_ipv6_address_interface_identifier', ('gnv0',), 'delete', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'interface-identifier']),
    ('set_ipv6_address_interface_identifier', ('gnv0', '5'), 'set', ['interfaces', 'geneve', 'gnv0', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_geneve_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
