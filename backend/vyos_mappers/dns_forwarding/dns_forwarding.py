"""DNS Forwarding Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "dns", "forwarding"]

AUTH_RECORD_TYPES = frozenset({
    "a", "aaaa", "cname", "mx", "txt", "ns", "ptr", "naptr", "spf", "srv",
})


class DNSForwardingMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global delete
    # ========================================================================

    def get_forwarding_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Listen address (multi-value)
    # ========================================================================

    def get_listen_address(self, addr: str) -> List[str]:
        return BASE + ["listen-address", addr]

    def get_listen_address_delete(self, addr: str) -> List[str]:
        return BASE + ["listen-address", addr]

    def get_listen_addresses_delete(self) -> List[str]:
        return BASE + ["listen-address"]

    # ========================================================================
    # Allow-from (multi-value)
    # ========================================================================

    def get_allow_from(self, network: str) -> List[str]:
        return BASE + ["allow-from", network]

    def get_allow_from_delete(self, network: str) -> List[str]:
        return BASE + ["allow-from", network]

    def get_allow_from_all_delete(self) -> List[str]:
        return BASE + ["allow-from"]

    # ========================================================================
    # Name servers (tagged with optional port)
    # ========================================================================

    def get_name_server(self, ip: str) -> List[str]:
        return BASE + ["name-server", ip]

    def get_name_server_port(self, ip: str, port: str) -> List[str]:
        return BASE + ["name-server", ip, "port", port]

    def get_name_server_port_delete(self, ip: str) -> List[str]:
        return BASE + ["name-server", ip, "port"]

    def get_name_server_delete(self, ip: str) -> List[str]:
        return BASE + ["name-server", ip]

    def get_name_servers_delete(self) -> List[str]:
        return BASE + ["name-server"]

    # ========================================================================
    # Scalar settings
    # ========================================================================

    def get_port(self, value: str) -> List[str]:
        return BASE + ["port", value]

    def get_port_delete(self) -> List[str]:
        return BASE + ["port"]

    def get_cache_size(self, value: str) -> List[str]:
        return BASE + ["cache-size", value]

    def get_cache_size_delete(self) -> List[str]:
        return BASE + ["cache-size"]

    def get_dnssec(self, mode: str) -> List[str]:
        return BASE + ["dnssec", mode]

    def get_dnssec_delete(self) -> List[str]:
        return BASE + ["dnssec"]

    def get_negative_ttl(self, value: str) -> List[str]:
        return BASE + ["negative-ttl", value]

    def get_negative_ttl_delete(self) -> List[str]:
        return BASE + ["negative-ttl"]

    def get_timeout(self, value: str) -> List[str]:
        return BASE + ["timeout", value]

    def get_timeout_delete(self) -> List[str]:
        return BASE + ["timeout"]

    def get_serve_stale_extension(self, value: str) -> List[str]:
        return BASE + ["serve-stale-extension", value]

    def get_serve_stale_extension_delete(self) -> List[str]:
        return BASE + ["serve-stale-extension"]

    def get_dns64_prefix(self, prefix: str) -> List[str]:
        return BASE + ["dns64-prefix", prefix]

    def get_dns64_prefix_delete(self) -> List[str]:
        return BASE + ["dns64-prefix"]

    # ========================================================================
    # Presence flags
    # ========================================================================

    def get_system(self) -> List[str]:
        return BASE + ["system"]

    def get_ignore_hosts_file(self) -> List[str]:
        return BASE + ["ignore-hosts-file"]

    def get_no_serve_rfc1918(self) -> List[str]:
        return BASE + ["no-serve-rfc1918"]

    # ========================================================================
    # DHCP interfaces (multi-value)
    # ========================================================================

    def get_dhcp_interface(self, iface: str) -> List[str]:
        return BASE + ["dhcp", iface]

    def get_dhcp_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["dhcp", iface]

    def get_dhcp_interfaces_delete(self) -> List[str]:
        return BASE + ["dhcp"]

    # ========================================================================
    # Source address (multi-value)
    # ========================================================================

    def get_source_address(self, addr: str) -> List[str]:
        return BASE + ["source-address", addr]

    def get_source_address_delete(self, addr: str) -> List[str]:
        return BASE + ["source-address", addr]

    def get_source_addresses_delete(self) -> List[str]:
        return BASE + ["source-address"]

    # ========================================================================
    # Exclude throttle address (multi-value)
    # ========================================================================

    def get_exclude_throttle_address(self, addr: str) -> List[str]:
        return BASE + ["exclude-throttle-address", addr]

    def get_exclude_throttle_address_delete(self, addr: str) -> List[str]:
        return BASE + ["exclude-throttle-address", addr]

    def get_exclude_throttle_addresses_delete(self) -> List[str]:
        return BASE + ["exclude-throttle-address"]

    # ========================================================================
    # Domain forwarders (tagged)
    # ========================================================================

    def get_domain(self, domain: str) -> List[str]:
        return BASE + ["domain", domain]

    def get_domain_name_server(self, domain: str, ip: str) -> List[str]:
        return BASE + ["domain", domain, "name-server", ip]

    def get_domain_name_server_port(self, domain: str, ip: str, port: str) -> List[str]:
        return BASE + ["domain", domain, "name-server", ip, "port", port]

    def get_domain_name_server_port_delete(self, domain: str, ip: str) -> List[str]:
        return BASE + ["domain", domain, "name-server", ip, "port"]

    def get_domain_name_server_delete(self, domain: str, ip: str) -> List[str]:
        return BASE + ["domain", domain, "name-server", ip]

    def get_domain_addnta(self, domain: str) -> List[str]:
        return BASE + ["domain", domain, "addnta"]

    def get_domain_recursion_desired(self, domain: str) -> List[str]:
        return BASE + ["domain", domain, "recursion-desired"]

    def get_domain_delete(self, domain: str) -> List[str]:
        return BASE + ["domain", domain]

    def get_domains_delete(self) -> List[str]:
        return BASE + ["domain"]

    # ========================================================================
    # Authoritative domains (tagged)
    # ========================================================================

    def get_authoritative_domain(self, domain: str) -> List[str]:
        return BASE + ["authoritative-domain", domain]

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "disable"]

    def get_authoritative_domain_delete(self, domain: str) -> List[str]:
        return BASE + ["authoritative-domain", domain]

    def get_authoritative_domains_delete(self) -> List[str]:
        return BASE + ["authoritative-domain"]

    # A records
    def get_auth_a_address(self, domain: str, hostname: str, addr: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "a", hostname, "address", addr]

    def get_auth_a_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "a", hostname, "ttl", ttl]

    def get_auth_a_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "a", hostname, "disable"]

    def get_auth_a_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "a", hostname]

    # AAAA records
    def get_auth_aaaa_address(self, domain: str, hostname: str, addr: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "aaaa", hostname, "address", addr]

    def get_auth_aaaa_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "aaaa", hostname, "ttl", ttl]

    def get_auth_aaaa_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "aaaa", hostname, "disable"]

    def get_auth_aaaa_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "aaaa", hostname]

    # CNAME records
    def get_auth_cname_target(self, domain: str, hostname: str, target: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "cname", hostname, "target", target]

    def get_auth_cname_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "cname", hostname, "ttl", ttl]

    def get_auth_cname_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "cname", hostname, "disable"]

    def get_auth_cname_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "cname", hostname]

    # MX records
    def get_auth_mx_server_priority(self, domain: str, hostname: str, server: str, priority: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "mx", hostname, "server", server, "priority", priority]

    def get_auth_mx_server_delete(self, domain: str, hostname: str, server: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "mx", hostname, "server", server]

    def get_auth_mx_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "mx", hostname, "ttl", ttl]

    def get_auth_mx_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "mx", hostname, "disable"]

    def get_auth_mx_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "mx", hostname]

    # TXT records
    def get_auth_txt_value(self, domain: str, hostname: str, value: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "txt", hostname, "value", value]

    def get_auth_txt_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "txt", hostname, "ttl", ttl]

    def get_auth_txt_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "txt", hostname, "disable"]

    def get_auth_txt_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "txt", hostname]

    # NS records
    def get_auth_ns_target(self, domain: str, hostname: str, target: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ns", hostname, "target", target]

    def get_auth_ns_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ns", hostname, "ttl", ttl]

    def get_auth_ns_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ns", hostname, "disable"]

    def get_auth_ns_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ns", hostname]

    # PTR records
    def get_auth_ptr_target(self, domain: str, hostname: str, target: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ptr", hostname, "target", target]

    def get_auth_ptr_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ptr", hostname, "ttl", ttl]

    def get_auth_ptr_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ptr", hostname, "disable"]

    def get_auth_ptr_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "ptr", hostname]

    def supports_auth_record(self, kind: str) -> bool:
        return kind in AUTH_RECORD_TYPES

    # NAPTR records
    def get_auth_naptr_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "ttl", ttl]

    def get_auth_naptr_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "disable"]

    def get_auth_naptr_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname]

    def get_auth_naptr_rule_order(self, domain: str, hostname: str, rule: str, order: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "order", order]

    def get_auth_naptr_rule_preference(self, domain: str, hostname: str, rule: str, preference: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "preference", preference]

    def get_auth_naptr_rule_lookup_a(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "lookup-a"]

    def get_auth_naptr_rule_lookup_srv(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "lookup-srv"]

    def get_auth_naptr_rule_protocol_specific(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "protocol-specific"]

    def get_auth_naptr_rule_resolve_uri(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "resolve-uri"]

    def get_auth_naptr_rule_regexp(self, domain: str, hostname: str, rule: str, regexp: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "regexp", regexp]

    def get_auth_naptr_rule_replacement(self, domain: str, hostname: str, rule: str, replacement: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "replacement", replacement]

    def get_auth_naptr_rule_service(self, domain: str, hostname: str, rule: str, service: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule, "service", service]

    def get_auth_naptr_rule_delete(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule]

    def get_auth_naptr_rule(self, domain: str, hostname: str, rule: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "naptr", hostname, "rule", rule]

    # SPF records
    def get_auth_spf_value(self, domain: str, hostname: str, value: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "spf", hostname, "value", value]

    def get_auth_spf_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "spf", hostname, "ttl", ttl]

    def get_auth_spf_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "spf", hostname, "disable"]

    def get_auth_spf_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "spf", hostname]

    # SRV records
    def get_auth_srv_ttl(self, domain: str, hostname: str, ttl: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "ttl", ttl]

    def get_auth_srv_disable(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "disable"]

    def get_auth_srv_delete(self, domain: str, hostname: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname]

    def get_auth_srv_entry_hostname(self, domain: str, hostname: str, entry: str, target: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry, "hostname", target]

    def get_auth_srv_entry_port(self, domain: str, hostname: str, entry: str, port: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry, "port", port]

    def get_auth_srv_entry_priority(self, domain: str, hostname: str, entry: str, priority: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry, "priority", priority]

    def get_auth_srv_entry_weight(self, domain: str, hostname: str, entry: str, weight: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry, "weight", weight]

    def get_auth_srv_entry_delete(self, domain: str, hostname: str, entry: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry]

    def get_auth_srv_entry(self, domain: str, hostname: str, entry: str) -> List[str]:
        return BASE + ["authoritative-domain", domain, "records", "srv", hostname, "entry", entry]

    # ========================================================================
    # Zone cache (1.5 only — 1.4 mapper overrides set methods to raise)
    # ========================================================================

    def get_zone_cache_url(self, zone: str, url: str) -> List[str]:
        return BASE + ["zone-cache", zone, "source", "url", url]

    def get_zone_cache_axfr(self, zone: str, ip: str) -> List[str]:
        return BASE + ["zone-cache", zone, "source", "axfr", ip]

    def get_zone_cache_dnssec(self, zone: str, mode: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "dnssec", mode]

    def get_zone_cache_max_zone_size(self, zone: str, size: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "max-zone-size", size]

    def get_zone_cache_refresh_interval(self, zone: str, interval: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "refresh", "interval", interval]

    def get_zone_cache_refresh_on_reload(self, zone: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "refresh", "on-reload"]

    def get_zone_cache_refresh_on_reload_delete(self, zone: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "refresh", "on-reload"]

    def get_zone_cache_retry_interval(self, zone: str, interval: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "retry-interval", interval]

    def get_zone_cache_timeout(self, zone: str, timeout: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "timeout", timeout]

    def get_zone_cache_zonemd(self, zone: str, mode: str) -> List[str]:
        return BASE + ["zone-cache", zone, "options", "zonemd", mode]

    def get_zone_cache_delete(self, zone: str) -> List[str]:
        return BASE + ["zone-cache", zone]

    def get_zone_caches_delete(self) -> List[str]:
        return BASE + ["zone-cache"]

    def supports_zone_cache(self) -> bool:
        return True

    # ========================================================================
    # Options / ECS
    # ========================================================================

    def get_options_ecs_add_for(self, network: str) -> List[str]:
        return BASE + ["options", "ecs-add-for", network]

    def get_options_ecs_add_for_delete(self, network: str) -> List[str]:
        return BASE + ["options", "ecs-add-for", network]

    def get_options_ecs_add_for_all_delete(self) -> List[str]:
        return BASE + ["options", "ecs-add-for"]

    def get_options_ecs_ipv4_bits(self, bits: str) -> List[str]:
        return BASE + ["options", "ecs-ipv4-bits", bits]

    def get_options_ecs_ipv4_bits_delete(self) -> List[str]:
        return BASE + ["options", "ecs-ipv4-bits"]

    def get_options_edns_subnet_allow_list(self, item: str) -> List[str]:
        return BASE + ["options", "edns-subnet-allow-list", item]

    def get_options_edns_subnet_allow_list_delete(self, item: str) -> List[str]:
        return BASE + ["options", "edns-subnet-allow-list", item]

    def get_options_edns_subnet_allow_list_all_delete(self) -> List[str]:
        return BASE + ["options", "edns-subnet-allow-list"]
