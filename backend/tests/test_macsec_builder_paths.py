"""Golden (method, args, op, expected_path) cases for MacsecInterfaceBuilderMixin.

Every set in COMMON_CASES (plus the V15_ONLY_CASES sets on 1.5) committed in
one batch on 1.4 (100.64.64.4) and 1.5 (100.64.64.5), and every delete row
committed on both labs except the required leaves (cipher, source-interface,
static key while ``static`` exists). Sample values are lab-valid.
"""

import inspect

import pytest

from vyos_builders.interfaces.macsec import MacsecInterfaceBuilderMixin

IF = "macsec0"
B = ["interfaces", "macsec", IF]
KEY = "0123456789abcdef0123456789abcdef"
MAC = "00:11:22:33:44:55"


def _run(version, method, args, op, expected_path):
    builder = MacsecInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    # Basic
    ("set_interface_description", (IF, "lab"), "set", B + ["description", "lab"]),
    ("delete_interface_description", (IF,), "delete", B + ["description"]),
    ("set_interface_address", (IF, "192.0.2.1/24"), "set", B + ["address", "192.0.2.1/24"]),
    ("delete_interface_address", (IF, "192.0.2.1/24"), "delete", B + ["address", "192.0.2.1/24"]),
    ("set_interface_disable", (IF,), "set", B + ["disable"]),
    ("delete_interface_disable", (IF,), "delete", B + ["disable"]),
    ("set_mtu", (IF, "1460"), "set", B + ["mtu", "1460"]),
    ("delete_mtu", (IF,), "delete", B + ["mtu"]),
    ("set_source_interface", (IF, "eth1"), "set", B + ["source-interface", "eth1"]),
    ("delete_source_interface", (IF,), "delete", B + ["source-interface"]),
    ("set_vrf", (IF, "red"), "set", B + ["vrf", "red"]),
    ("delete_vrf", (IF,), "delete", B + ["vrf"]),
    ("delete_interface", (IF,), "delete", B),
    # Security
    ("set_security_cipher", (IF, "gcm-aes-128"), "set", B + ["security", "cipher", "gcm-aes-128"]),
    ("delete_security_cipher", (IF,), "delete", B + ["security", "cipher"]),
    ("set_security_encrypt", (IF,), "set", B + ["security", "encrypt"]),
    ("delete_security_encrypt", (IF,), "delete", B + ["security", "encrypt"]),
    ("set_security_replay_window", (IF, "0"), "set", B + ["security", "replay-window", "0"]),
    ("delete_security_replay_window", (IF,), "delete", B + ["security", "replay-window"]),
    ("delete_security_mka", (IF,), "delete", B + ["security", "mka"]),
    ("set_security_mka_cak", (IF, KEY), "set", B + ["security", "mka", "cak", KEY]),
    ("delete_security_mka_cak", (IF,), "delete", B + ["security", "mka", "cak"]),
    ("set_security_mka_ckn", (IF, "00112233"), "set", B + ["security", "mka", "ckn", "00112233"]),
    ("delete_security_mka_ckn", (IF,), "delete", B + ["security", "mka", "ckn"]),
    ("set_security_mka_priority", (IF, "10"), "set", B + ["security", "mka", "priority", "10"]),
    ("delete_security_mka_priority", (IF,), "delete", B + ["security", "mka", "priority"]),
    ("delete_security_static", (IF,), "delete", B + ["security", "static"]),
    ("set_security_static_key", (IF, KEY), "set", B + ["security", "static", "key", KEY]),
    ("delete_security_static_key", (IF,), "delete", B + ["security", "static", "key"]),
    ("set_security_static_peer", (IF, "P0"), "set", B + ["security", "static", "peer", "P0"]),
    ("delete_security_static_peer", (IF, "P0"), "delete", B + ["security", "static", "peer", "P0"]),
    ("set_security_static_peer_disable", (IF, "P0"), "set", B + ["security", "static", "peer", "P0", "disable"]),
    ("delete_security_static_peer_disable", (IF, "P0"), "delete", B + ["security", "static", "peer", "P0", "disable"]),
    ("set_security_static_peer_key", (IF, "P0", KEY), "set", B + ["security", "static", "peer", "P0", "key", KEY]),
    ("delete_security_static_peer_key", (IF, "P0"), "delete", B + ["security", "static", "peer", "P0", "key"]),
    ("set_security_static_peer_mac", (IF, "P0", MAC), "set", B + ["security", "static", "peer", "P0", "mac", MAC]),
    ("delete_security_static_peer_mac", (IF, "P0"), "delete", B + ["security", "static", "peer", "P0", "mac"]),
    # IP
    ("set_ip_adjust_mss", (IF, "1400"), "set", B + ["ip", "adjust-mss", "1400"]),
    ("set_ip_adjust_mss_clamp_to_pmtu", (IF,), "set", B + ["ip", "adjust-mss", "clamp-mss-to-pmtu"]),
    ("delete_ip_adjust_mss", (IF,), "delete", B + ["ip", "adjust-mss"]),
    ("set_ip_arp_cache_timeout", (IF, "30"), "set", B + ["ip", "arp-cache-timeout", "30"]),
    ("delete_ip_arp_cache_timeout", (IF,), "delete", B + ["ip", "arp-cache-timeout"]),
    ("set_ip_disable_arp_filter", (IF,), "set", B + ["ip", "disable-arp-filter"]),
    ("delete_ip_disable_arp_filter", (IF,), "delete", B + ["ip", "disable-arp-filter"]),
    ("set_ip_disable_forwarding", (IF,), "set", B + ["ip", "disable-forwarding"]),
    ("delete_ip_disable_forwarding", (IF,), "delete", B + ["ip", "disable-forwarding"]),
    ("set_ip_enable_arp_accept", (IF,), "set", B + ["ip", "enable-arp-accept"]),
    ("delete_ip_enable_arp_accept", (IF,), "delete", B + ["ip", "enable-arp-accept"]),
    ("set_ip_enable_arp_announce", (IF,), "set", B + ["ip", "enable-arp-announce"]),
    ("delete_ip_enable_arp_announce", (IF,), "delete", B + ["ip", "enable-arp-announce"]),
    ("set_ip_enable_arp_ignore", (IF,), "set", B + ["ip", "enable-arp-ignore"]),
    ("delete_ip_enable_arp_ignore", (IF,), "delete", B + ["ip", "enable-arp-ignore"]),
    ("set_ip_enable_directed_broadcast", (IF,), "set", B + ["ip", "enable-directed-broadcast"]),
    ("delete_ip_enable_directed_broadcast", (IF,), "delete", B + ["ip", "enable-directed-broadcast"]),
    ("set_ip_enable_proxy_arp", (IF,), "set", B + ["ip", "enable-proxy-arp"]),
    ("delete_ip_enable_proxy_arp", (IF,), "delete", B + ["ip", "enable-proxy-arp"]),
    ("set_ip_proxy_arp_pvlan", (IF,), "set", B + ["ip", "proxy-arp-pvlan"]),
    ("delete_ip_proxy_arp_pvlan", (IF,), "delete", B + ["ip", "proxy-arp-pvlan"]),
    ("set_ip_source_validation", (IF, "strict"), "set", B + ["ip", "source-validation", "strict"]),
    ("delete_ip_source_validation", (IF,), "delete", B + ["ip", "source-validation"]),
    ("delete_ip_settings", (IF,), "delete", B + ["ip"]),
    # IPv6
    ("set_ipv6_accept_dad", (IF, "1"), "set", B + ["ipv6", "accept-dad", "1"]),
    ("delete_ipv6_accept_dad", (IF,), "delete", B + ["ipv6", "accept-dad"]),
    ("set_ipv6_address_autoconf", (IF,), "set", B + ["ipv6", "address", "autoconf"]),
    ("delete_ipv6_address_autoconf", (IF,), "delete", B + ["ipv6", "address", "autoconf"]),
    ("set_ipv6_address_eui64", (IF, "2001:db8::/64"), "set", B + ["ipv6", "address", "eui64", "2001:db8::/64"]),
    ("delete_ipv6_address_eui64", (IF, "2001:db8::/64"), "delete", B + ["ipv6", "address", "eui64", "2001:db8::/64"]),
    ("set_ipv6_address_no_default_link_local", (IF,), "set", B + ["ipv6", "address", "no-default-link-local"]),
    ("delete_ipv6_address_no_default_link_local", (IF,), "delete", B + ["ipv6", "address", "no-default-link-local"]),
    ("set_ipv6_adjust_mss", (IF, "1400"), "set", B + ["ipv6", "adjust-mss", "1400"]),
    ("set_ipv6_adjust_mss_clamp_to_pmtu", (IF,), "set", B + ["ipv6", "adjust-mss", "clamp-mss-to-pmtu"]),
    ("delete_ipv6_adjust_mss", (IF,), "delete", B + ["ipv6", "adjust-mss"]),
    ("set_ipv6_base_reachable_time", (IF, "30"), "set", B + ["ipv6", "base-reachable-time", "30"]),
    ("delete_ipv6_base_reachable_time", (IF,), "delete", B + ["ipv6", "base-reachable-time"]),
    ("set_ipv6_disable_forwarding", (IF,), "set", B + ["ipv6", "disable-forwarding"]),
    ("delete_ipv6_disable_forwarding", (IF,), "delete", B + ["ipv6", "disable-forwarding"]),
    ("set_ipv6_dup_addr_detect_transmits", (IF, "1"), "set", B + ["ipv6", "dup-addr-detect-transmits", "1"]),
    ("delete_ipv6_dup_addr_detect_transmits", (IF,), "delete", B + ["ipv6", "dup-addr-detect-transmits"]),
    ("set_ipv6_source_validation", (IF, "loose"), "set", B + ["ipv6", "source-validation", "loose"]),
    ("delete_ipv6_source_validation", (IF,), "delete", B + ["ipv6", "source-validation"]),
    ("delete_ipv6_settings", (IF,), "delete", B + ["ipv6"]),
    # DHCP
    ("set_dhcp_options_client_id", (IF, "host1"), "set", B + ["dhcp-options", "client-id", "host1"]),
    ("delete_dhcp_options_client_id", (IF,), "delete", B + ["dhcp-options", "client-id"]),
    ("set_dhcp_options_host_name", (IF, "host1"), "set", B + ["dhcp-options", "host-name", "host1"]),
    ("delete_dhcp_options_host_name", (IF,), "delete", B + ["dhcp-options", "host-name"]),
    ("set_dhcp_options_vendor_class_id", (IF, "vendor1"), "set", B + ["dhcp-options", "vendor-class-id", "vendor1"]),
    ("delete_dhcp_options_vendor_class_id", (IF,), "delete", B + ["dhcp-options", "vendor-class-id"]),
    ("set_dhcp_options_no_default_route", (IF,), "set", B + ["dhcp-options", "no-default-route"]),
    ("delete_dhcp_options_no_default_route", (IF,), "delete", B + ["dhcp-options", "no-default-route"]),
    ("set_dhcp_options_default_route_distance", (IF, "210"), "set", B + ["dhcp-options", "default-route-distance", "210"]),
    ("delete_dhcp_options_default_route_distance", (IF,), "delete", B + ["dhcp-options", "default-route-distance"]),
    ("set_dhcp_options_reject", (IF, "192.0.2.9"), "set", B + ["dhcp-options", "reject", "192.0.2.9"]),
    ("delete_dhcp_options_reject", (IF, "192.0.2.9"), "delete", B + ["dhcp-options", "reject", "192.0.2.9"]),
    ("set_dhcp_options_user_class", (IF, "class1"), "set", B + ["dhcp-options", "user-class", "class1"]),
    ("delete_dhcp_options_user_class", (IF,), "delete", B + ["dhcp-options", "user-class"]),
    ("set_dhcp_options_mtu", (IF,), "set", B + ["dhcp-options", "mtu"]),
    ("delete_dhcp_options_mtu", (IF,), "delete", B + ["dhcp-options", "mtu"]),
    ("delete_dhcp_options", (IF,), "delete", B + ["dhcp-options"]),
    # DHCPv6
    ("set_dhcpv6_options_duid", (IF, "00:01:00:01"), "set", B + ["dhcpv6-options", "duid", "00:01:00:01"]),
    ("delete_dhcpv6_options_duid", (IF,), "delete", B + ["dhcpv6-options", "duid"]),
    ("set_dhcpv6_options_rapid_commit", (IF,), "set", B + ["dhcpv6-options", "rapid-commit"]),
    ("delete_dhcpv6_options_rapid_commit", (IF,), "delete", B + ["dhcpv6-options", "rapid-commit"]),
    ("set_dhcpv6_options_no_release", (IF,), "set", B + ["dhcpv6-options", "no-release"]),
    ("delete_dhcpv6_options_no_release", (IF,), "delete", B + ["dhcpv6-options", "no-release"]),
    ("set_dhcpv6_options_parameters_only", (IF,), "set", B + ["dhcpv6-options", "parameters-only"]),
    ("delete_dhcpv6_options_parameters_only", (IF,), "delete", B + ["dhcpv6-options", "parameters-only"]),
    ("set_dhcpv6_options_temporary", (IF,), "set", B + ["dhcpv6-options", "temporary"]),
    ("delete_dhcpv6_options_temporary", (IF,), "delete", B + ["dhcpv6-options", "temporary"]),
    ("set_dhcpv6_options_pd", (IF, "0"), "set", B + ["dhcpv6-options", "pd", "0"]),
    ("delete_dhcpv6_options_pd", (IF, "0"), "delete", B + ["dhcpv6-options", "pd", "0"]),
    ("set_dhcpv6_options_pd_length", (IF, "0", "56"), "set", B + ["dhcpv6-options", "pd", "0", "length", "56"]),
    ("delete_dhcpv6_options_pd_length", (IF, "0"), "delete", B + ["dhcpv6-options", "pd", "0", "length"]),
    ("set_dhcpv6_options_pd_interface", (IF, "0", "eth1"), "set", B + ["dhcpv6-options", "pd", "0", "interface", "eth1"]),
    ("delete_dhcpv6_options_pd_interface", (IF, "0", "eth1"), "delete", B + ["dhcpv6-options", "pd", "0", "interface", "eth1"]),
    ("set_dhcpv6_options_pd_interface_address", (IF, "0", "eth1", "1"), "set", B + ["dhcpv6-options", "pd", "0", "interface", "eth1", "address", "1"]),
    ("delete_dhcpv6_options_pd_interface_address", (IF, "0", "eth1"), "delete", B + ["dhcpv6-options", "pd", "0", "interface", "eth1", "address"]),
    ("set_dhcpv6_options_pd_interface_sla_id", (IF, "0", "eth1", "1"), "set", B + ["dhcpv6-options", "pd", "0", "interface", "eth1", "sla-id", "1"]),
    ("delete_dhcpv6_options_pd_interface_sla_id", (IF, "0", "eth1"), "delete", B + ["dhcpv6-options", "pd", "0", "interface", "eth1", "sla-id"]),
    ("delete_dhcpv6_options", (IF,), "delete", B + ["dhcpv6-options"]),
    # Mirror / redirect
    ("delete_mirror", (IF,), "delete", B + ["mirror"]),
    ("set_mirror_ingress", (IF, "eth1"), "set", B + ["mirror", "ingress", "eth1"]),
    ("delete_mirror_ingress", (IF,), "delete", B + ["mirror", "ingress"]),
    ("set_mirror_egress", (IF, "eth1"), "set", B + ["mirror", "egress", "eth1"]),
    ("delete_mirror_egress", (IF,), "delete", B + ["mirror", "egress"]),
    ("set_redirect", (IF, "eth1"), "set", B + ["redirect", "eth1"]),
    ("delete_redirect", (IF,), "delete", B + ["redirect"]),
]

V15_ONLY_CASES = [
    ("set_ipv6_address_interface_identifier", (IF, "::1"), "set", B + ["ipv6", "address", "interface-identifier", "::1"]),
    ("delete_ipv6_address_interface_identifier", (IF,), "delete", B + ["ipv6", "address", "interface-identifier"]),
    ("set_dhcpv6_options_no_request_dns", (IF,), "set", B + ["dhcpv6-options", "no-request-dns"]),
    ("delete_dhcpv6_options_no_request_dns", (IF,), "delete", B + ["dhcpv6-options", "no-request-dns"]),
    ("set_dhcpv6_options_no_request_domain_name", (IF,), "set", B + ["dhcpv6-options", "no-request-domain-name"]),
    ("delete_dhcpv6_options_no_request_domain_name", (IF,), "delete", B + ["dhcpv6-options", "no-request-domain-name"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_macsec_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_macsec_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_macsec_v1_5_only_ops_rejected_on_1_4(method, args, op, expected_path):
    builder = MacsecInterfaceBuilderMixin(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_every_builder_op_has_a_golden_row():
    ops = {
        name for name, _ in inspect.getmembers(MacsecInterfaceBuilderMixin, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    rows = [row[0] for row in COMMON_CASES + V15_ONLY_CASES]
    assert len(rows) == len(set(rows))
    assert ops == set(rows)
