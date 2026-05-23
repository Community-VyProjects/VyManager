"""DNS Forwarding Service Batch Builder.

Generates VyOS set/delete operations for the dns forwarding service.

Configuration lives under: service dns forwarding

Key sections:
  - Global settings: listen-address, allow-from, port, cache-size, dnssec, etc.
  - Name servers: upstream DNS servers with optional per-server port
  - Domain forwarders: per-domain upstream resolvers
  - Authoritative domains: local DNS zones with A/AAAA/CNAME/MX/TXT/NS/PTR records
  - Zone cache (1.5 only): cached remote zones via URL or AXFR
  - Options/ECS (1.5 only): EDNS Client Subnet settings

Version differences:
  - zone-cache and options (ECS) subtrees are only available on VyOS 1.5
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DNSForwardingBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["dns_forwarding"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "DNSForwardingBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DNSForwardingBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "listen_address": {
                    "supported": True,
                    "description": "Local IP addresses to listen on (multi-value)",
                },
                "allow_from": {
                    "supported": True,
                    "description": "Networks allowed to query this server (multi-value)",
                },
                "name_server": {
                    "supported": True,
                    "description": "Upstream DNS servers to forward queries to (tagged, optional port)",
                },
                "port": {
                    "supported": True,
                    "description": "Listening port (default: 53)",
                    "default": 53,
                    "min": 1,
                    "max": 65535,
                },
                "cache_size": {
                    "supported": True,
                    "description": "DNS cache size (default: 10000)",
                    "default": 10000,
                    "min": 0,
                    "max": 2147483647,
                },
                "dnssec": {
                    "supported": True,
                    "description": "DNSSEC validation mode",
                    "options": ["off", "process-no-validate", "process", "log-fail", "validate"],
                    "default": "process-no-validate",
                },
                "system": {
                    "supported": True,
                    "description": "Use system name servers",
                },
                "negative_ttl": {
                    "supported": True,
                    "description": "Maximum time negative entries are cached in seconds (default: 3600)",
                    "default": 3600,
                    "min": 0,
                    "max": 7200,
                },
                "timeout": {
                    "supported": True,
                    "description": "Timeout waiting for remote authoritative server in milliseconds (default: 1500)",
                    "default": 1500,
                    "min": 10,
                    "max": 60000,
                },
                "dhcp": {
                    "supported": True,
                    "description": "Interfaces whose DHCP client nameservers to forward to (multi-value)",
                },
                "ignore_hosts_file": {
                    "supported": True,
                    "description": "Do not use local /etc/hosts file",
                },
                "no_serve_rfc1918": {
                    "supported": True,
                    "description": "Authoritatively not aware of RFC1918 addresses",
                },
                "source_address": {
                    "supported": True,
                    "description": "Source IP address for outbound queries (multi-value, default: 0.0.0.0/::)",
                },
                "serve_stale_extension": {
                    "supported": True,
                    "description": "Times to extend expired TTL by 30s when serving stale (default: 0)",
                    "default": 0,
                    "min": 0,
                    "max": 65535,
                },
                "dns64_prefix": {
                    "supported": True,
                    "description": "DNS64 prefix for IPv6-only to IPv4-only communication (/96 only)",
                },
                "exclude_throttle_address": {
                    "supported": True,
                    "description": "IP addresses/subnets excluded from throttling (multi-value)",
                },
                "domain": {
                    "supported": True,
                    "description": "Per-domain DNS forwarders",
                },
                "authoritative_domain": {
                    "supported": True,
                    "description": "Local authoritative DNS zones with A/AAAA/CNAME/MX/TXT/NS/PTR records",
                },
                "zone_cache": {
                    "supported": is_1_5,
                    "description": "Cached remote zones loaded via URL or AXFR (VyOS 1.5 only)",
                },
                "options_ecs": {
                    "supported": is_1_5,
                    "description": "EDNS Client Subnet options (VyOS 1.5 only)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global delete
    # -----------------------------------------------------------------------

    def delete_forwarding(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_forwarding_delete())

    # -----------------------------------------------------------------------
    # Listen address
    # -----------------------------------------------------------------------

    def set_listen_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_listen_address(addr))

    def delete_listen_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(addr))

    def delete_listen_addresses(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_listen_addresses_delete())

    # -----------------------------------------------------------------------
    # Allow-from
    # -----------------------------------------------------------------------

    def set_allow_from(self, network: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_allow_from(network))

    def delete_allow_from(self, network: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_allow_from_delete(network))

    def delete_allow_from_all(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_allow_from_all_delete())

    # -----------------------------------------------------------------------
    # Name servers
    # -----------------------------------------------------------------------

    def set_name_server(self, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_name_server(ip))

    def set_name_server_port(self, ip: str, port: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_name_server_port(ip, port))

    def delete_name_server_port(self, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_name_server_port_delete(ip))

    def delete_name_server(self, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_name_server_delete(ip))

    def delete_name_servers(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_name_servers_delete())

    # -----------------------------------------------------------------------
    # Scalar settings
    # -----------------------------------------------------------------------

    def set_port(self, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_port(value))

    def delete_port(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_port_delete())

    def set_cache_size(self, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_cache_size(value))

    def delete_cache_size(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_cache_size_delete())

    def set_dnssec(self, mode: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_dnssec(mode))

    def delete_dnssec(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_dnssec_delete())

    def set_negative_ttl(self, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_negative_ttl(value))

    def delete_negative_ttl(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_negative_ttl_delete())

    def set_timeout(self, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_timeout(value))

    def delete_timeout(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_timeout_delete())

    def set_serve_stale_extension(self, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_serve_stale_extension(value))

    def delete_serve_stale_extension(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_serve_stale_extension_delete())

    def set_dns64_prefix(self, prefix: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_dns64_prefix(prefix))

    def delete_dns64_prefix(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_dns64_prefix_delete())

    # -----------------------------------------------------------------------
    # Presence flags
    # -----------------------------------------------------------------------

    def set_system(self) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_system())

    def delete_system(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_system())

    def set_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_ignore_hosts_file())

    def delete_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_ignore_hosts_file())

    def set_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_no_serve_rfc1918())

    def delete_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_no_serve_rfc1918())

    # -----------------------------------------------------------------------
    # DHCP interfaces
    # -----------------------------------------------------------------------

    def set_dhcp_interface(self, iface: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_dhcp_interface(iface))

    def delete_dhcp_interface(self, iface: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_dhcp_interface_delete(iface))

    def delete_dhcp_interfaces(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_dhcp_interfaces_delete())

    # -----------------------------------------------------------------------
    # Source address
    # -----------------------------------------------------------------------

    def set_source_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_source_address(addr))

    def delete_source_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_source_address_delete(addr))

    def delete_source_addresses(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_source_addresses_delete())

    # -----------------------------------------------------------------------
    # Exclude throttle address
    # -----------------------------------------------------------------------

    def set_exclude_throttle_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_exclude_throttle_address(addr))

    def delete_exclude_throttle_address(self, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_exclude_throttle_address_delete(addr))

    def delete_exclude_throttle_addresses(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_exclude_throttle_addresses_delete())

    # -----------------------------------------------------------------------
    # Domain forwarders
    # -----------------------------------------------------------------------

    def set_domain_name_server(self, domain: str, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_domain_name_server(domain, ip))

    def set_domain_name_server_port(self, domain: str, ip: str, port: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_domain_name_server_port(domain, ip, port))

    def delete_domain_name_server_port(self, domain: str, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domain_name_server_port_delete(domain, ip))

    def delete_domain_name_server(self, domain: str, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domain_name_server_delete(domain, ip))

    def set_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_domain_addnta(domain))

    def delete_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domain_addnta(domain))

    def set_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_domain_recursion_desired(domain))

    def delete_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domain_recursion_desired(domain))

    def delete_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domain_delete(domain))

    def delete_domains(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_domains_delete())

    # -----------------------------------------------------------------------
    # Authoritative domains
    # -----------------------------------------------------------------------

    def set_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_authoritative_domain(domain))

    def set_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_authoritative_domain_disable(domain))

    def delete_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_authoritative_domain_disable(domain))

    def delete_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_authoritative_domain_delete(domain))

    def delete_authoritative_domains(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_authoritative_domains_delete())

    # A records
    def set_auth_a_address(self, domain: str, hostname: str, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_a_address(domain, hostname, addr))

    def set_auth_a_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_a_ttl(domain, hostname, ttl))

    def set_auth_a_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_a_disable(domain, hostname))

    def delete_auth_a_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_a_disable(domain, hostname))

    def delete_auth_a(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_a_delete(domain, hostname))

    # AAAA records
    def set_auth_aaaa_address(self, domain: str, hostname: str, addr: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_aaaa_address(domain, hostname, addr))

    def set_auth_aaaa_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_aaaa_ttl(domain, hostname, ttl))

    def set_auth_aaaa_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_aaaa_disable(domain, hostname))

    def delete_auth_aaaa_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_aaaa_disable(domain, hostname))

    def delete_auth_aaaa(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_aaaa_delete(domain, hostname))

    # CNAME records
    def set_auth_cname_target(self, domain: str, hostname: str, target: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_cname_target(domain, hostname, target))

    def set_auth_cname_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_cname_ttl(domain, hostname, ttl))

    def set_auth_cname_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_cname_disable(domain, hostname))

    def delete_auth_cname_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_cname_disable(domain, hostname))

    def delete_auth_cname(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_cname_delete(domain, hostname))

    # MX records
    def set_auth_mx_server_priority(self, domain: str, hostname: str, server: str, priority: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_mx_server_priority(domain, hostname, server, priority))

    def delete_auth_mx_server(self, domain: str, hostname: str, server: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_mx_server_delete(domain, hostname, server))

    def set_auth_mx_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_mx_ttl(domain, hostname, ttl))

    def set_auth_mx_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_mx_disable(domain, hostname))

    def delete_auth_mx_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_mx_disable(domain, hostname))

    def delete_auth_mx(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_mx_delete(domain, hostname))

    # TXT records
    def set_auth_txt_value(self, domain: str, hostname: str, value: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_txt_value(domain, hostname, value))

    def set_auth_txt_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_txt_ttl(domain, hostname, ttl))

    def set_auth_txt_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_txt_disable(domain, hostname))

    def delete_auth_txt_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_txt_disable(domain, hostname))

    def delete_auth_txt(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_txt_delete(domain, hostname))

    # NS records
    def set_auth_ns_target(self, domain: str, hostname: str, target: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ns_target(domain, hostname, target))

    def set_auth_ns_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ns_ttl(domain, hostname, ttl))

    def set_auth_ns_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ns_disable(domain, hostname))

    def delete_auth_ns_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_ns_disable(domain, hostname))

    def delete_auth_ns(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_ns_delete(domain, hostname))

    # PTR records
    def set_auth_ptr_target(self, domain: str, hostname: str, target: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ptr_target(domain, hostname, target))

    def set_auth_ptr_ttl(self, domain: str, hostname: str, ttl: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ptr_ttl(domain, hostname, ttl))

    def set_auth_ptr_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_auth_ptr_disable(domain, hostname))

    def delete_auth_ptr_disable(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_ptr_disable(domain, hostname))

    def delete_auth_ptr(self, domain: str, hostname: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_auth_ptr_delete(domain, hostname))

    # -----------------------------------------------------------------------
    # Zone cache (1.5 only)
    # -----------------------------------------------------------------------

    def set_zone_cache_url(self, zone: str, url: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_url(zone, url))

    def set_zone_cache_axfr(self, zone: str, ip: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_axfr(zone, ip))

    def set_zone_cache_dnssec(self, zone: str, mode: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_dnssec(zone, mode))

    def set_zone_cache_max_zone_size(self, zone: str, size: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_max_zone_size(zone, size))

    def set_zone_cache_refresh_interval(self, zone: str, interval: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_refresh_interval(zone, interval))

    def set_zone_cache_refresh_on_reload(self, zone: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_refresh_on_reload(zone))

    def delete_zone_cache_refresh_on_reload(self, zone: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_zone_cache_refresh_on_reload(zone))

    def set_zone_cache_retry_interval(self, zone: str, interval: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_retry_interval(zone, interval))

    def set_zone_cache_timeout(self, zone: str, timeout: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_timeout(zone, timeout))

    def set_zone_cache_zonemd(self, zone: str, mode: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_zone_cache_zonemd(zone, mode))

    def delete_zone_cache(self, zone: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_zone_cache_delete(zone))

    def delete_zone_caches(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_zone_caches_delete())

    # -----------------------------------------------------------------------
    # Options / ECS (1.5 only)
    # -----------------------------------------------------------------------

    def set_options_ecs_add_for(self, network: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_options_ecs_add_for(network))

    def delete_options_ecs_add_for(self, network: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_options_ecs_add_for_delete(network))

    def delete_options_ecs_add_for_all(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_options_ecs_add_for_all_delete())

    def set_options_ecs_ipv4_bits(self, bits: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_options_ecs_ipv4_bits(bits))

    def delete_options_ecs_ipv4_bits(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_options_ecs_ipv4_bits_delete())

    def set_options_edns_subnet_allow_list(self, item: str) -> "DNSForwardingBatchBuilder":
        return self.add_set(self.m.get_options_edns_subnet_allow_list(item))

    def delete_options_edns_subnet_allow_list(self, item: str) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_options_edns_subnet_allow_list_delete(item))

    def delete_options_edns_subnet_allow_list_all(self) -> "DNSForwardingBatchBuilder":
        return self.add_delete(self.m.get_options_edns_subnet_allow_list_all_delete())
