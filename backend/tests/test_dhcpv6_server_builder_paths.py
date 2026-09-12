"""Golden (method, args, expected_path) cases for DHCPv6ServerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every valueless set_* leaf has a matching delete_*.
Version-gated methods are in CASES_14 / CASES_15; mapper raises are in
test_dhcpv6_version_gates.py.
"""

import pytest

from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import (
    DHCPv6ServerBatchBuilder,
)

BASE = ["service", "dhcpv6-server"]
LAN = BASE + ["shared-network-name", "LAN"]
SUB = LAN + ["subnet", "2001:db8::/64"]
MAP = SUB + ["static-mapping", "host1"]

CASES = [
    ("set_disable", (), "set", BASE + ["disable"]),
    ("delete_disable", (), "delete", BASE + ["disable"]),
    ("delete_dhcpv6_server", (), "delete", BASE),
    ("set_preference", ("255",), "set", BASE + ["preference", "255"]),
    ("delete_preference", (), "delete", BASE + ["preference"]),
    ("set_global_name_server", ("2001:db8::1",), "set", BASE + ["global-parameters", "name-server", "2001:db8::1"]),
    ("delete_global_name_server", ("2001:db8::1",), "delete", BASE + ["global-parameters", "name-server", "2001:db8::1"]),
    ("set_shared_network", ("LAN",), "set", LAN),
    ("delete_shared_network", ("LAN",), "delete", LAN),
    ("set_network_description", ("LAN", "lan"), "set", LAN + ["description", "lan"]),
    ("delete_network_description", ("LAN",), "delete", LAN + ["description"]),
    ("set_network_disable", ("LAN",), "set", LAN + ["disable"]),
    ("delete_network_disable", ("LAN",), "delete", LAN + ["disable"]),
    ("set_subnet", ("LAN", "2001:db8::/64"), "set", SUB),
    ("delete_subnet", ("LAN", "2001:db8::/64"), "delete", SUB),
    ("set_subnet_lease_default", ("LAN", "2001:db8::/64", "86400"), "set", SUB + ["lease-time", "default", "86400"]),
    ("delete_subnet_lease_default", ("LAN", "2001:db8::/64"), "delete", SUB + ["lease-time", "default"]),
    ("set_subnet_lease_minimum", ("LAN", "2001:db8::/64", "3600"), "set", SUB + ["lease-time", "minimum", "3600"]),
    ("delete_subnet_lease_minimum", ("LAN", "2001:db8::/64"), "delete", SUB + ["lease-time", "minimum"]),
    ("set_subnet_lease_maximum", ("LAN", "2001:db8::/64", "172800"), "set", SUB + ["lease-time", "maximum", "172800"]),
    ("delete_subnet_lease_maximum", ("LAN", "2001:db8::/64"), "delete", SUB + ["lease-time", "maximum"]),
    ("set_static_mapping", ("LAN", "2001:db8::/64", "host1"), "set", MAP),
    ("delete_static_mapping", ("LAN", "2001:db8::/64", "host1"), "delete", MAP),
    ("set_static_mapping_disable", ("LAN", "2001:db8::/64", "host1"), "set", MAP + ["disable"]),
    ("delete_static_mapping_disable", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["disable"]),
    ("set_static_mapping_ipv6_address", ("LAN", "2001:db8::/64", "host1", "2001:db8::10"), "set", MAP + ["ipv6-address", "2001:db8::10"]),
    ("delete_static_mapping_ipv6_address", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["ipv6-address"]),
    ("set_static_mapping_ipv6_prefix", ("LAN", "2001:db8::/64", "host1", "2001:db8:1::/64"), "set", MAP + ["ipv6-prefix", "2001:db8:1::/64"]),
    ("delete_static_mapping_ipv6_prefix", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["ipv6-prefix"]),
]

CASES_14 = [
    ("set_network_name_server", ("LAN", "2001:db8::1"), "set", LAN + ["common-options", "name-server", "2001:db8::1"]),
    ("delete_network_name_server", ("LAN", "2001:db8::1"), "delete", LAN + ["common-options", "name-server", "2001:db8::1"]),
    ("set_network_domain_search", ("LAN", "example.com"), "set", LAN + ["common-options", "domain-search", "example.com"]),
    ("delete_network_domain_search", ("LAN", "example.com"), "delete", LAN + ["common-options", "domain-search", "example.com"]),
    ("set_network_info_refresh_time", ("LAN", "600"), "set", LAN + ["common-options", "info-refresh-time", "600"]),
    ("delete_network_info_refresh_time", ("LAN",), "delete", LAN + ["common-options", "info-refresh-time"]),
    ("set_subnet_name_server", ("LAN", "2001:db8::/64", "2001:db8::1"), "set", SUB + ["name-server", "2001:db8::1"]),
    ("delete_subnet_name_server", ("LAN", "2001:db8::/64", "2001:db8::1"), "delete", SUB + ["name-server", "2001:db8::1"]),
    ("set_subnet_domain_search", ("LAN", "2001:db8::/64", "example.com"), "set", SUB + ["domain-search", "example.com"]),
    ("delete_subnet_domain_search", ("LAN", "2001:db8::/64", "example.com"), "delete", SUB + ["domain-search", "example.com"]),
    ("set_subnet_nis_domain", ("LAN", "2001:db8::/64", "nis.example"), "set", SUB + ["nis-domain", "nis.example"]),
    ("delete_subnet_nis_domain", ("LAN", "2001:db8::/64"), "delete", SUB + ["nis-domain"]),
    ("set_subnet_addr_range_start_stop", ("LAN", "2001:db8::/64", "2001:db8::10", "2001:db8::20"), "set", SUB + ["address-range", "start", "2001:db8::10", "stop", "2001:db8::20"]),
    ("delete_subnet_addr_range_start", ("LAN", "2001:db8::/64", "2001:db8::10"), "delete", SUB + ["address-range", "start", "2001:db8::10"]),
    ("set_subnet_addr_range_prefix", ("LAN", "2001:db8::/64", "2001:db8:1::/64"), "set", SUB + ["address-range", "prefix", "2001:db8:1::/64"]),
    ("set_subnet_addr_range_prefix_temporary", ("LAN", "2001:db8::/64", "2001:db8:1::/64"), "set", SUB + ["address-range", "prefix", "2001:db8:1::/64", "temporary"]),
    ("delete_subnet_addr_range_prefix", ("LAN", "2001:db8::/64", "2001:db8:1::/64"), "delete", SUB + ["address-range", "prefix", "2001:db8:1::/64"]),
    ("set_subnet_pd_start_stop", ("LAN", "2001:db8::/64", "2001:db8:10::", "2001:db8:20::"), "set", SUB + ["prefix-delegation", "start", "2001:db8:10::", "stop", "2001:db8:20::"]),
    ("set_subnet_pd_start_prefix_length", ("LAN", "2001:db8::/64", "2001:db8:10::", "56"), "set", SUB + ["prefix-delegation", "start", "2001:db8:10::", "prefix-length", "56"]),
    ("delete_subnet_pd_start", ("LAN", "2001:db8::/64", "2001:db8:10::"), "delete", SUB + ["prefix-delegation", "start", "2001:db8:10::"]),
    ("set_static_mapping_duid", ("LAN", "2001:db8::/64", "host1", "00:01:00:01:00:00"), "set", MAP + ["identifier", "00:01:00:01:00:00"]),
    ("delete_static_mapping_duid", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["identifier"]),
    ("set_subnet_cisco_tftp_server", ("LAN", "2001:db8::/64", "2001:db8::9"), "set", SUB + ["vendor-option", "cisco", "tftp-server", "2001:db8::9"]),
    ("delete_subnet_cisco_tftp_server", ("LAN", "2001:db8::/64", "2001:db8::9"), "delete", SUB + ["vendor-option", "cisco", "tftp-server", "2001:db8::9"]),
]

CASES_15 = [
    ("set_disable_route_autoinstall", (), "set", BASE + ["disable-route-autoinstall"]),
    ("delete_disable_route_autoinstall", (), "delete", BASE + ["disable-route-autoinstall"]),
    ("set_listen_interface", ("eth0",), "set", BASE + ["listen-interface", "eth0"]),
    ("delete_listen_interface", ("eth0",), "delete", BASE + ["listen-interface", "eth0"]),
    ("set_network_interface", ("LAN", "eth0"), "set", LAN + ["interface", "eth0"]),
    ("delete_network_interface", ("LAN", "eth0"), "delete", LAN + ["interface", "eth0"]),
    ("set_network_name_server", ("LAN", "2001:db8::1"), "set", LAN + ["option", "name-server", "2001:db8::1"]),
    ("delete_network_name_server", ("LAN", "2001:db8::1"), "delete", LAN + ["option", "name-server", "2001:db8::1"]),
    ("set_network_domain_search", ("LAN", "example.com"), "set", LAN + ["option", "domain-search", "example.com"]),
    ("delete_network_domain_search", ("LAN", "example.com"), "delete", LAN + ["option", "domain-search", "example.com"]),
    ("set_network_info_refresh_time", ("LAN", "600"), "set", LAN + ["option", "info-refresh-time", "600"]),
    ("delete_network_info_refresh_time", ("LAN",), "delete", LAN + ["option", "info-refresh-time"]),
    ("set_network_capwap_controller", ("LAN", "192.0.2.1"), "set", LAN + ["option", "capwap-controller", "192.0.2.1"]),
    ("delete_network_capwap_controller", ("LAN",), "delete", LAN + ["option", "capwap-controller"]),
    ("set_subnet_interface", ("LAN", "2001:db8::/64", "eth0"), "set", SUB + ["interface", "eth0"]),
    ("delete_subnet_interface", ("LAN", "2001:db8::/64", "eth0"), "delete", SUB + ["interface", "eth0"]),
    ("set_subnet_id", ("LAN", "2001:db8::/64", "1"), "set", SUB + ["subnet-id", "1"]),
    ("delete_subnet_id", ("LAN", "2001:db8::/64"), "delete", SUB + ["subnet-id"]),
    ("set_subnet_name_server", ("LAN", "2001:db8::/64", "2001:db8::1"), "set", SUB + ["option", "name-server", "2001:db8::1"]),
    ("delete_subnet_name_server", ("LAN", "2001:db8::/64", "2001:db8::1"), "delete", SUB + ["option", "name-server", "2001:db8::1"]),
    ("set_subnet_capwap_controller", ("LAN", "2001:db8::/64", "192.0.2.1"), "set", SUB + ["option", "capwap-controller", "192.0.2.1"]),
    ("delete_subnet_capwap_controller", ("LAN", "2001:db8::/64"), "delete", SUB + ["option", "capwap-controller"]),
    ("set_subnet_nis_domain", ("LAN", "2001:db8::/64", "nis.example"), "set", SUB + ["option", "nis-domain", "nis.example"]),
    ("delete_subnet_nis_domain", ("LAN", "2001:db8::/64"), "delete", SUB + ["option", "nis-domain"]),
    ("set_subnet_cisco_tftp_server", ("LAN", "2001:db8::/64", "2001:db8::9"), "set", SUB + ["option", "vendor-option", "cisco", "tftp-server", "2001:db8::9"]),
    ("delete_subnet_cisco_tftp_server", ("LAN", "2001:db8::/64", "2001:db8::9"), "delete", SUB + ["option", "vendor-option", "cisco", "tftp-server", "2001:db8::9"]),
    ("set_subnet_range", ("LAN", "2001:db8::/64", "r1"), "set", SUB + ["range", "r1"]),
    ("delete_subnet_range", ("LAN", "2001:db8::/64", "r1"), "delete", SUB + ["range", "r1"]),
    ("set_subnet_range_start", ("LAN", "2001:db8::/64", "r1", "2001:db8::10"), "set", SUB + ["range", "r1", "start", "2001:db8::10"]),
    ("set_subnet_range_stop", ("LAN", "2001:db8::/64", "r1", "2001:db8::20"), "set", SUB + ["range", "r1", "stop", "2001:db8::20"]),
    ("set_subnet_range_prefix", ("LAN", "2001:db8::/64", "r1", "2001:db8:1::/64"), "set", SUB + ["range", "r1", "prefix", "2001:db8:1::/64"]),
    ("set_subnet_pd_prefix", ("LAN", "2001:db8::/64", "2001:db8:10::/48"), "set", SUB + ["prefix-delegation", "prefix", "2001:db8:10::/48"]),
    ("delete_subnet_pd_prefix", ("LAN", "2001:db8::/64", "2001:db8:10::/48"), "delete", SUB + ["prefix-delegation", "prefix", "2001:db8:10::/48"]),
    ("set_subnet_pd_prefix_delegated_length", ("LAN", "2001:db8::/64", "2001:db8:10::/48", "56"), "set", SUB + ["prefix-delegation", "prefix", "2001:db8:10::/48", "delegated-length", "56"]),
    ("set_static_mapping_duid", ("LAN", "2001:db8::/64", "host1", "00:01:00:01:00:00"), "set", MAP + ["duid", "00:01:00:01:00:00"]),
    ("delete_static_mapping_duid", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["duid"]),
    ("set_static_mapping_mac", ("LAN", "2001:db8::/64", "host1", "00:11:22:33:44:55"), "set", MAP + ["mac", "00:11:22:33:44:55"]),
    ("delete_static_mapping_mac", ("LAN", "2001:db8::/64", "host1"), "delete", MAP + ["mac"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcpv6_server_builder_paths(method, args, op, expected_path, version):
    builder = DHCPv6ServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", CASES_14)
def test_dhcpv6_server_builder_paths_14(method, args, op, expected_path):
    builder = DHCPv6ServerBatchBuilder(version="1.4")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", CASES_15)
def test_dhcpv6_server_builder_paths_15(method, args, op, expected_path):
    builder = DHCPv6ServerBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
