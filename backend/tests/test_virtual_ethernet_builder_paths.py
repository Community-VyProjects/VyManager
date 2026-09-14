"""Golden (method, args, op, expected_path) cases for VirtualEthernetInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.virtual_ethernet import VirtualEthernetInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = VirtualEthernetInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_address', ('veth0', '192.0.2.1'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'address', '192.0.2.1']),
    ('delete_addresses', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'address']),
    ('delete_description', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'description']),
    ('delete_dhcp_options', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options']),
    ('delete_dhcp_options_client_id', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'client-id']),
    ('delete_dhcp_options_no_default_route', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'no-default-route']),
    ('delete_dhcp_options_reject', ('veth0', '192.0.2.1'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'reject', '192.0.2.1']),
    ('delete_dhcpv6_options', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options']),
    ('delete_dhcpv6_options_no_release', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'no-release']),
    ('delete_dhcpv6_options_parameters_only', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'parameters-only']),
    ('delete_dhcpv6_options_pd_instance', ('veth0', '5'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5']),
    ('delete_dhcpv6_options_rapid_commit', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'rapid-commit']),
    ('delete_dhcpv6_options_temporary', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'temporary']),
    ('delete_disable', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'disable']),
    ('delete_interface', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0']),
    ('delete_mtu', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'mtu']),
    ('delete_peer_name', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'peer-name']),
    ('delete_vif', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10']),
    ('delete_vif_address', ('veth0', '10', '192.0.2.1'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'address', '192.0.2.1']),
    ('delete_vif_addresses', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'address']),
    ('delete_vif_c', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10']),
    ('delete_vif_c_address', ('veth0', '10', '10', '192.0.2.1'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'address', '192.0.2.1']),
    ('delete_vif_c_addresses', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'address']),
    ('delete_vif_c_description', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'description']),
    ('delete_vif_c_disable', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'disable']),
    ('delete_vif_c_disable_link_detect', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'disable-link-detect']),
    ('delete_vif_c_mac', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mac']),
    ('delete_vif_c_mirror_egress', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mirror', 'egress']),
    ('delete_vif_c_mirror_ingress', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mirror', 'ingress']),
    ('delete_vif_c_mtu', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mtu']),
    ('delete_vif_c_redirect', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'redirect']),
    ('delete_vif_c_vrf', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'vrf']),
    ('delete_vif_description', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'description']),
    ('delete_vif_disable', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'disable']),
    ('delete_vif_disable_link_detect', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'disable-link-detect']),
    ('delete_vif_egress_qos', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'egress-qos']),
    ('delete_vif_ingress_qos', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'ingress-qos']),
    ('delete_vif_mac', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mac']),
    ('delete_vif_mirror_egress', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mirror', 'egress']),
    ('delete_vif_mirror_ingress', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mirror', 'ingress']),
    ('delete_vif_mtu', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mtu']),
    ('delete_vif_redirect', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'redirect']),
    ('delete_vif_s', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10']),
    ('delete_vif_s_address', ('veth0', '10', '192.0.2.1'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'address', '192.0.2.1']),
    ('delete_vif_s_addresses', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'address']),
    ('delete_vif_s_description', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'description']),
    ('delete_vif_s_disable', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'disable']),
    ('delete_vif_s_disable_link_detect', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'disable-link-detect']),
    ('delete_vif_s_mac', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mac']),
    ('delete_vif_s_mirror_egress', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mirror', 'egress']),
    ('delete_vif_s_mirror_ingress', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mirror', 'ingress']),
    ('delete_vif_s_mtu', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mtu']),
    ('delete_vif_s_protocol', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'protocol']),
    ('delete_vif_s_redirect', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'redirect']),
    ('delete_vif_s_vrf', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vrf']),
    ('delete_vif_vrf', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'vrf']),
    ('delete_vrf', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vrf']),
    ('set_address', ('veth0', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'address', '192.0.2.1']),
    ('set_description', ('veth0', 'lab'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'description', 'lab']),
    ('set_dhcp_options_client_id', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'client-id', '5']),
    ('set_dhcp_options_default_route_distance', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'default-route-distance', '5']),
    ('set_dhcp_options_host_name', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'host-name', '5']),
    ('set_dhcp_options_mtu', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'mtu']),
    ('set_dhcp_options_no_default_route', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'no-default-route']),
    ('set_dhcp_options_reject', ('veth0', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'reject', '192.0.2.1']),
    ('set_dhcp_options_user_class', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'user-class', '5']),
    ('set_dhcp_options_vendor_class_id', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcp-options', 'vendor-class-id', '5']),
    ('set_dhcpv6_options_duid', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'duid', '5']),
    ('set_dhcpv6_options_no_release', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'no-release']),
    ('set_dhcpv6_options_parameters_only', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'parameters-only']),
    ('set_dhcpv6_options_pd_instance', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5']),
    ('set_dhcpv6_options_pd_interface', ('veth0', '5', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5', 'interface', '5']),
    ('set_dhcpv6_options_pd_interface_address', ('veth0', '5', '5', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'address', '192.0.2.1']),
    ('set_dhcpv6_options_pd_interface_sla_id', ('veth0', '5', '5', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5', 'interface', '5', 'sla-id', '5']),
    ('set_dhcpv6_options_pd_length', ('veth0', '5', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'pd', '5', 'length', '5']),
    ('set_dhcpv6_options_rapid_commit', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'rapid-commit']),
    ('set_dhcpv6_options_temporary', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'dhcpv6-options', 'temporary']),
    ('set_disable', ('veth0',), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'disable']),
    ('set_mtu', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'mtu', '5']),
    ('set_peer_name', ('veth0', 'G0'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'peer-name', 'G0']),
    ('set_vif', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10']),
    ('set_vif_address', ('veth0', '10', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'address', '192.0.2.1']),
    ('set_vif_c', ('veth0', '10', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10']),
    ('set_vif_c_address', ('veth0', '10', '10', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'address', '192.0.2.1']),
    ('set_vif_c_description', ('veth0', '10', '10', 'lab'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'description', 'lab']),
    ('set_vif_c_disable', ('veth0', '10', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'disable']),
    ('set_vif_c_disable_link_detect', ('veth0', '10', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'disable-link-detect']),
    ('set_vif_c_mac', ('veth0', '10', '10', '00:11:22:33:44:55'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mac', '00:11:22:33:44:55']),
    ('set_vif_c_mirror_egress', ('veth0', '10', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mirror', 'egress', '5']),
    ('set_vif_c_mirror_ingress', ('veth0', '10', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mirror', 'ingress', '5']),
    ('set_vif_c_mtu', ('veth0', '10', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'mtu', '5']),
    ('set_vif_c_redirect', ('veth0', '10', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'redirect', '5']),
    ('set_vif_c_vrf', ('veth0', '10', '10', 'red'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'vrf', 'red']),
    ('set_vif_description', ('veth0', '10', 'lab'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'description', 'lab']),
    ('set_vif_disable', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'disable']),
    ('set_vif_disable_link_detect', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'disable-link-detect']),
    ('set_vif_egress_qos', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'egress-qos', '5']),
    ('set_vif_ingress_qos', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'ingress-qos', '5']),
    ('set_vif_mac', ('veth0', '10', '00:11:22:33:44:55'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mac', '00:11:22:33:44:55']),
    ('set_vif_mirror_egress', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mirror', 'egress', '5']),
    ('set_vif_mirror_ingress', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mirror', 'ingress', '5']),
    ('set_vif_mtu', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'mtu', '5']),
    ('set_vif_redirect', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'redirect', '5']),
    ('set_vif_s', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10']),
    ('set_vif_s_address', ('veth0', '10', '192.0.2.1'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'address', '192.0.2.1']),
    ('set_vif_s_description', ('veth0', '10', 'lab'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'description', 'lab']),
    ('set_vif_s_disable', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'disable']),
    ('set_vif_s_disable_link_detect', ('veth0', '10'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'disable-link-detect']),
    ('set_vif_s_mac', ('veth0', '10', '00:11:22:33:44:55'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mac', '00:11:22:33:44:55']),
    ('set_vif_s_mirror_egress', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mirror', 'egress', '5']),
    ('set_vif_s_mirror_ingress', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mirror', 'ingress', '5']),
    ('set_vif_s_mtu', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'mtu', '5']),
    ('set_vif_s_protocol', ('veth0', '10', 'tcp'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'protocol', 'tcp']),
    ('set_vif_s_redirect', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'redirect', '5']),
    ('set_vif_s_vrf', ('veth0', '10', 'red'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vrf', 'red']),
    ('set_vif_vrf', ('veth0', '10', 'red'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'vrf', 'red']),
    ('set_vrf', ('veth0', 'red'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vrf', 'red']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_virtual_ethernet_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_netns', ('veth0',), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'netns']),
    ('delete_vif_c_ipv6_address_interface_identifier', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'ipv6', 'address', 'interface-identifier']),
    ('delete_vif_c_ipv6_settings', ('veth0', '10', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'ipv6']),
    ('delete_vif_ipv6_address_interface_identifier', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'ipv6', 'address', 'interface-identifier']),
    ('delete_vif_ipv6_settings', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'ipv6']),
    ('delete_vif_s_ipv6_address_interface_identifier', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'ipv6', 'address', 'interface-identifier']),
    ('delete_vif_s_ipv6_settings', ('veth0', '10'), 'delete', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'ipv6']),
    ('set_netns', ('veth0', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'netns', '5']),
    ('set_vif_c_ipv6_address_interface_identifier', ('veth0', '10', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'vif-c', '10', 'ipv6', 'address', 'interface-identifier', '5']),
    ('set_vif_ipv6_address_interface_identifier', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif', '10', 'ipv6', 'address', 'interface-identifier', '5']),
    ('set_vif_s_ipv6_address_interface_identifier', ('veth0', '10', '5'), 'set', ['interfaces', 'virtual-ethernet', 'veth0', 'vif-s', '10', 'ipv6', 'address', 'interface-identifier', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_virtual_ethernet_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
