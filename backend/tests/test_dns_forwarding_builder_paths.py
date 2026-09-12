"""Golden (method, args, expected_path) cases for DNSForwardingBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every valueless set_* leaf has a matching delete_*.
Version-gated methods are in CASES_15; mapper raises are in
test_dns_forwarding_version_gates.py.
"""

import pytest

from vyos_builders.dns_forwarding.dns_forwarding_batch_builder import (
    DNSForwardingBatchBuilder,
)

BASE = ["service", "dns", "forwarding"]
DOMAIN = "example.com"
HOST = "www"
AUTH = BASE + ["authoritative-domain", DOMAIN]
REC = AUTH + ["records"]

CASES = [
    ("delete_forwarding", (), "delete", BASE),
    ("set_listen_address", ("192.0.2.1",), "set", BASE + ["listen-address", "192.0.2.1"]),
    ("delete_listen_address", ("192.0.2.1",), "delete", BASE + ["listen-address", "192.0.2.1"]),
    ("delete_listen_addresses", (), "delete", BASE + ["listen-address"]),
    ("set_allow_from", ("192.0.2.0/24",), "set", BASE + ["allow-from", "192.0.2.0/24"]),
    ("delete_allow_from", ("192.0.2.0/24",), "delete", BASE + ["allow-from", "192.0.2.0/24"]),
    ("delete_allow_from_all", (), "delete", BASE + ["allow-from"]),
    ("set_name_server", ("192.0.2.53",), "set", BASE + ["name-server", "192.0.2.53"]),
    ("set_name_server_port", ("192.0.2.53", "5353"), "set", BASE + ["name-server", "192.0.2.53", "port", "5353"]),
    ("delete_name_server_port", ("192.0.2.53",), "delete", BASE + ["name-server", "192.0.2.53", "port"]),
    ("delete_name_server", ("192.0.2.53",), "delete", BASE + ["name-server", "192.0.2.53"]),
    ("delete_name_servers", (), "delete", BASE + ["name-server"]),
    ("set_port", ("53",), "set", BASE + ["port", "53"]),
    ("delete_port", (), "delete", BASE + ["port"]),
    ("set_cache_size", ("10000",), "set", BASE + ["cache-size", "10000"]),
    ("delete_cache_size", (), "delete", BASE + ["cache-size"]),
    ("set_dnssec", ("process",), "set", BASE + ["dnssec", "process"]),
    ("delete_dnssec", (), "delete", BASE + ["dnssec"]),
    ("set_negative_ttl", ("3600",), "set", BASE + ["negative-ttl", "3600"]),
    ("delete_negative_ttl", (), "delete", BASE + ["negative-ttl"]),
    ("set_timeout", ("1500",), "set", BASE + ["timeout", "1500"]),
    ("delete_timeout", (), "delete", BASE + ["timeout"]),
    ("set_serve_stale_extension", ("0",), "set", BASE + ["serve-stale-extension", "0"]),
    ("delete_serve_stale_extension", (), "delete", BASE + ["serve-stale-extension"]),
    ("set_dns64_prefix", ("64:ff9b::/96",), "set", BASE + ["dns64-prefix", "64:ff9b::/96"]),
    ("delete_dns64_prefix", (), "delete", BASE + ["dns64-prefix"]),
    ("set_system", (), "set", BASE + ["system"]),
    ("delete_system", (), "delete", BASE + ["system"]),
    ("set_ignore_hosts_file", (), "set", BASE + ["ignore-hosts-file"]),
    ("delete_ignore_hosts_file", (), "delete", BASE + ["ignore-hosts-file"]),
    ("set_no_serve_rfc1918", (), "set", BASE + ["no-serve-rfc1918"]),
    ("delete_no_serve_rfc1918", (), "delete", BASE + ["no-serve-rfc1918"]),
    ("set_dhcp_interface", ("eth0",), "set", BASE + ["dhcp", "eth0"]),
    ("delete_dhcp_interface", ("eth0",), "delete", BASE + ["dhcp", "eth0"]),
    ("delete_dhcp_interfaces", (), "delete", BASE + ["dhcp"]),
    ("set_source_address", ("192.0.2.1",), "set", BASE + ["source-address", "192.0.2.1"]),
    ("delete_source_address", ("192.0.2.1",), "delete", BASE + ["source-address", "192.0.2.1"]),
    ("delete_source_addresses", (), "delete", BASE + ["source-address"]),
    ("set_exclude_throttle_address", ("192.0.2.0/24",), "set", BASE + ["exclude-throttle-address", "192.0.2.0/24"]),
    ("delete_exclude_throttle_address", ("192.0.2.0/24",), "delete", BASE + ["exclude-throttle-address", "192.0.2.0/24"]),
    ("delete_exclude_throttle_addresses", (), "delete", BASE + ["exclude-throttle-address"]),
    ("set_domain_name_server", (DOMAIN, "192.0.2.53"), "set", BASE + ["domain", DOMAIN, "name-server", "192.0.2.53"]),
    ("set_domain_name_server_port", (DOMAIN, "192.0.2.53", "5353"), "set", BASE + ["domain", DOMAIN, "name-server", "192.0.2.53", "port", "5353"]),
    ("delete_domain_name_server_port", (DOMAIN, "192.0.2.53"), "delete", BASE + ["domain", DOMAIN, "name-server", "192.0.2.53", "port"]),
    ("delete_domain_name_server", (DOMAIN, "192.0.2.53"), "delete", BASE + ["domain", DOMAIN, "name-server", "192.0.2.53"]),
    ("set_domain_addnta", (DOMAIN,), "set", BASE + ["domain", DOMAIN, "addnta"]),
    ("delete_domain_addnta", (DOMAIN,), "delete", BASE + ["domain", DOMAIN, "addnta"]),
    ("set_domain_recursion_desired", (DOMAIN,), "set", BASE + ["domain", DOMAIN, "recursion-desired"]),
    ("delete_domain_recursion_desired", (DOMAIN,), "delete", BASE + ["domain", DOMAIN, "recursion-desired"]),
    ("delete_domain", (DOMAIN,), "delete", BASE + ["domain", DOMAIN]),
    ("delete_domains", (), "delete", BASE + ["domain"]),
    ("set_authoritative_domain", (DOMAIN,), "set", AUTH),
    ("set_authoritative_domain_disable", (DOMAIN,), "set", AUTH + ["disable"]),
    ("delete_authoritative_domain_disable", (DOMAIN,), "delete", AUTH + ["disable"]),
    ("delete_authoritative_domain", (DOMAIN,), "delete", AUTH),
    ("delete_authoritative_domains", (), "delete", BASE + ["authoritative-domain"]),
    ("set_auth_a_address", (DOMAIN, HOST, "192.0.2.10"), "set", REC + ["a", HOST, "address", "192.0.2.10"]),
    ("set_auth_a_ttl", (DOMAIN, HOST, "300"), "set", REC + ["a", HOST, "ttl", "300"]),
    ("set_auth_a_disable", (DOMAIN, HOST), "set", REC + ["a", HOST, "disable"]),
    ("delete_auth_a_disable", (DOMAIN, HOST), "delete", REC + ["a", HOST, "disable"]),
    ("delete_auth_a", (DOMAIN, HOST), "delete", REC + ["a", HOST]),
    ("set_auth_aaaa_address", (DOMAIN, HOST, "2001:db8::10"), "set", REC + ["aaaa", HOST, "address", "2001:db8::10"]),
    ("set_auth_aaaa_ttl", (DOMAIN, HOST, "300"), "set", REC + ["aaaa", HOST, "ttl", "300"]),
    ("set_auth_aaaa_disable", (DOMAIN, HOST), "set", REC + ["aaaa", HOST, "disable"]),
    ("delete_auth_aaaa_disable", (DOMAIN, HOST), "delete", REC + ["aaaa", HOST, "disable"]),
    ("delete_auth_aaaa", (DOMAIN, HOST), "delete", REC + ["aaaa", HOST]),
    ("set_auth_cname_target", (DOMAIN, HOST, "www.example.com"), "set", REC + ["cname", HOST, "target", "www.example.com"]),
    ("set_auth_cname_ttl", (DOMAIN, HOST, "300"), "set", REC + ["cname", HOST, "ttl", "300"]),
    ("set_auth_cname_disable", (DOMAIN, HOST), "set", REC + ["cname", HOST, "disable"]),
    ("delete_auth_cname_disable", (DOMAIN, HOST), "delete", REC + ["cname", HOST, "disable"]),
    ("delete_auth_cname", (DOMAIN, HOST), "delete", REC + ["cname", HOST]),
    ("set_auth_mx_server_priority", (DOMAIN, HOST, "mail.example.com", "10"), "set", REC + ["mx", HOST, "server", "mail.example.com", "priority", "10"]),
    ("delete_auth_mx_server", (DOMAIN, HOST, "mail.example.com"), "delete", REC + ["mx", HOST, "server", "mail.example.com"]),
    ("set_auth_mx_ttl", (DOMAIN, HOST, "300"), "set", REC + ["mx", HOST, "ttl", "300"]),
    ("set_auth_mx_disable", (DOMAIN, HOST), "set", REC + ["mx", HOST, "disable"]),
    ("delete_auth_mx_disable", (DOMAIN, HOST), "delete", REC + ["mx", HOST, "disable"]),
    ("delete_auth_mx", (DOMAIN, HOST), "delete", REC + ["mx", HOST]),
    ("set_auth_txt_value", (DOMAIN, HOST, "v=spf1"), "set", REC + ["txt", HOST, "value", "v=spf1"]),
    ("set_auth_txt_ttl", (DOMAIN, HOST, "300"), "set", REC + ["txt", HOST, "ttl", "300"]),
    ("set_auth_txt_disable", (DOMAIN, HOST), "set", REC + ["txt", HOST, "disable"]),
    ("delete_auth_txt_disable", (DOMAIN, HOST), "delete", REC + ["txt", HOST, "disable"]),
    ("delete_auth_txt", (DOMAIN, HOST), "delete", REC + ["txt", HOST]),
    ("set_auth_ns_target", (DOMAIN, HOST, "ns1.example.com"), "set", REC + ["ns", HOST, "target", "ns1.example.com"]),
    ("set_auth_ns_ttl", (DOMAIN, HOST, "300"), "set", REC + ["ns", HOST, "ttl", "300"]),
    ("set_auth_ns_disable", (DOMAIN, HOST), "set", REC + ["ns", HOST, "disable"]),
    ("delete_auth_ns_disable", (DOMAIN, HOST), "delete", REC + ["ns", HOST, "disable"]),
    ("delete_auth_ns", (DOMAIN, HOST), "delete", REC + ["ns", HOST]),
    ("set_auth_ptr_target", (DOMAIN, HOST, "host.example.com"), "set", REC + ["ptr", HOST, "target", "host.example.com"]),
    ("set_auth_ptr_ttl", (DOMAIN, HOST, "300"), "set", REC + ["ptr", HOST, "ttl", "300"]),
    ("set_auth_ptr_disable", (DOMAIN, HOST), "set", REC + ["ptr", HOST, "disable"]),
    ("delete_auth_ptr_disable", (DOMAIN, HOST), "delete", REC + ["ptr", HOST, "disable"]),
    ("delete_auth_ptr", (DOMAIN, HOST), "delete", REC + ["ptr", HOST]),
    ("set_options_ecs_add_for", ("192.0.2.0/24",), "set", BASE + ["options", "ecs-add-for", "192.0.2.0/24"]),
    ("delete_options_ecs_add_for", ("192.0.2.0/24",), "delete", BASE + ["options", "ecs-add-for", "192.0.2.0/24"]),
    ("delete_options_ecs_add_for_all", (), "delete", BASE + ["options", "ecs-add-for"]),
    ("set_options_ecs_ipv4_bits", ("24",), "set", BASE + ["options", "ecs-ipv4-bits", "24"]),
    ("delete_options_ecs_ipv4_bits", (), "delete", BASE + ["options", "ecs-ipv4-bits"]),
    ("set_options_edns_subnet_allow_list", ("192.0.2.0/24",), "set", BASE + ["options", "edns-subnet-allow-list", "192.0.2.0/24"]),
    ("delete_options_edns_subnet_allow_list", ("192.0.2.0/24",), "delete", BASE + ["options", "edns-subnet-allow-list", "192.0.2.0/24"]),
    ("delete_options_edns_subnet_allow_list_all", (), "delete", BASE + ["options", "edns-subnet-allow-list"]),
]

CASES_15 = [
    ("set_zone_cache_url", ("example.com", "https://example.com/zone"), "set", BASE + ["zone-cache", "example.com", "source", "url", "https://example.com/zone"]),
    ("set_zone_cache_axfr", ("example.com", "192.0.2.53"), "set", BASE + ["zone-cache", "example.com", "source", "axfr", "192.0.2.53"]),
    ("set_zone_cache_dnssec", ("example.com", "validate"), "set", BASE + ["zone-cache", "example.com", "options", "dnssec", "validate"]),
    ("set_zone_cache_max_zone_size", ("example.com", "10"), "set", BASE + ["zone-cache", "example.com", "options", "max-zone-size", "10"]),
    ("set_zone_cache_refresh_interval", ("example.com", "3600"), "set", BASE + ["zone-cache", "example.com", "options", "refresh", "interval", "3600"]),
    ("set_zone_cache_refresh_on_reload", ("example.com",), "set", BASE + ["zone-cache", "example.com", "options", "refresh", "on-reload"]),
    ("delete_zone_cache_refresh_on_reload", ("example.com",), "delete", BASE + ["zone-cache", "example.com", "options", "refresh", "on-reload"]),
    ("set_zone_cache_retry_interval", ("example.com", "60"), "set", BASE + ["zone-cache", "example.com", "options", "retry-interval", "60"]),
    ("set_zone_cache_timeout", ("example.com", "10"), "set", BASE + ["zone-cache", "example.com", "options", "timeout", "10"]),
    ("set_zone_cache_zonemd", ("example.com", "ignore"), "set", BASE + ["zone-cache", "example.com", "options", "zonemd", "ignore"]),
    ("delete_zone_cache", ("example.com",), "delete", BASE + ["zone-cache", "example.com"]),
    ("delete_zone_caches", (), "delete", BASE + ["zone-cache"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dns_forwarding_builder_paths(method, args, op, expected_path, version):
    builder = DNSForwardingBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", CASES_15)
def test_dns_forwarding_builder_paths_15(method, args, op, expected_path):
    builder = DNSForwardingBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
