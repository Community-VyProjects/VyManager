"""
DNS Forwarding Command Mapper

Handles DNS forwarding service commands for VyOS.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class DNSForwardingMapper(BaseFeatureMapper):
    """DNS Forwarding mapper with all DNS forwarding operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Path
    # ========================================================================

    def get_base(self) -> List[str]:
        """Get base path for DNS forwarding."""
        return ["service", "dns", "forwarding"]

    # ========================================================================
    # Listen Address & Access Control
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        """Get command path for listen address."""
        return ["service", "dns", "forwarding", "listen-address", address]

    def get_allow_from(self, network: str) -> List[str]:
        """Get command path for allowed network."""
        return ["service", "dns", "forwarding", "allow-from", network]

    def get_source_address(self, address: str) -> List[str]:
        """Get command path for source address."""
        return ["service", "dns", "forwarding", "source-address", address]

    # ========================================================================
    # Name Servers
    # ========================================================================

    def get_system(self) -> List[str]:
        """Get command path for using system nameservers."""
        return ["service", "dns", "forwarding", "system"]

    def get_name_server(self, address: str) -> List[str]:
        """Get command path for name server."""
        return ["service", "dns", "forwarding", "name-server", address]

    def get_name_server_port(self, address: str, port: str) -> List[str]:
        """Get command path for name server port."""
        return ["service", "dns", "forwarding", "name-server", address, "port", port]

    def get_dhcp_interface(self, interface: str) -> List[str]:
        """Get command path for DHCP nameserver interface."""
        return ["service", "dns", "forwarding", "dhcp", interface]

    # ========================================================================
    # Domain-specific Forwarding
    # ========================================================================

    def get_domain(self, domain: str) -> List[str]:
        """Get command path for domain."""
        return ["service", "dns", "forwarding", "domain", domain]

    def get_domain_name_server(self, domain: str, server: str) -> List[str]:
        """Get command path for domain-specific name server."""
        return ["service", "dns", "forwarding", "domain", domain, "name-server", server]

    def get_domain_addnta(self, domain: str) -> List[str]:
        """Get command path for domain addnta (negative trust anchor)."""
        return ["service", "dns", "forwarding", "domain", domain, "addnta"]

    def get_domain_recursion_desired(self, domain: str) -> List[str]:
        """Get command path for domain recursion-desired."""
        return ["service", "dns", "forwarding", "domain", domain, "recursion-desired"]

    # ========================================================================
    # Cache & Performance
    # ========================================================================

    def get_cache_size(self, size: str) -> List[str]:
        """Get command path for cache size."""
        return ["service", "dns", "forwarding", "cache-size", size]

    def get_negative_ttl(self, ttl: str) -> List[str]:
        """Get command path for negative TTL."""
        return ["service", "dns", "forwarding", "negative-ttl", ttl]

    def get_timeout(self, timeout: str) -> List[str]:
        """Get command path for timeout."""
        return ["service", "dns", "forwarding", "timeout", timeout]

    # ========================================================================
    # Security & DNSSEC
    # ========================================================================

    def get_dnssec(self, mode: str) -> List[str]:
        """Get command path for DNSSEC mode."""
        return ["service", "dns", "forwarding", "dnssec", mode]

    def get_ignore_hosts_file(self) -> List[str]:
        """Get command path for ignore-hosts-file."""
        return ["service", "dns", "forwarding", "ignore-hosts-file"]

    def get_no_serve_rfc1918(self) -> List[str]:
        """Get command path for no-serve-rfc1918."""
        return ["service", "dns", "forwarding", "no-serve-rfc1918"]

    # ========================================================================
    # Authoritative Domains (Local Records)
    # ========================================================================

    def get_authoritative_domain(self, domain: str) -> List[str]:
        """Get command path for authoritative domain."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain]

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        """Get command path for disabling authoritative domain."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "disable"]

    def get_authoritative_domain_record_a(self, domain: str, name: str, address: str) -> List[str]:
        """Get command path for A record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "a", name, "address", address]

    def get_authoritative_domain_record_aaaa(self, domain: str, name: str, address: str) -> List[str]:
        """Get command path for AAAA record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "aaaa", name, "address", address]

    def get_authoritative_domain_record_cname(self, domain: str, name: str, target: str) -> List[str]:
        """Get command path for CNAME record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "cname", name, "target", target]

    def get_authoritative_domain_record_mx(self, domain: str, name: str, server: str, priority: str) -> List[str]:
        """Get command path for MX record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "mx", name, "server", server, "priority", priority]

    def get_authoritative_domain_record_txt(self, domain: str, name: str, value: str) -> List[str]:
        """Get command path for TXT record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "txt", name, "value", value]

    def get_authoritative_domain_record_ptr(self, domain: str, name: str, target: str) -> List[str]:
        """Get command path for PTR record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "ptr", name, "target", target]

    def get_authoritative_domain_record_ns(self, domain: str, name: str, target: str) -> List[str]:
        """Get command path for NS record."""
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "records", "ns", name, "target", target]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_name_servers(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse name servers from config."""
        servers = []
        ns_config = config.get("name-server", {})

        if isinstance(ns_config, dict):
            for address, ns_data in ns_config.items():
                server = {"address": address}
                if isinstance(ns_data, dict):
                    server["port"] = ns_data.get("port")
                servers.append(server)
        elif isinstance(ns_config, list):
            for address in ns_config:
                servers.append({"address": address})

        return servers

    def parse_domains(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse domain-specific forwarding from config."""
        domains = []
        domain_config = config.get("domain", {})

        for domain_name, domain_data in domain_config.items() if isinstance(domain_config, dict) else []:
            if not isinstance(domain_data, dict):
                continue

            # Parse domain name servers
            domain_servers = []
            ns = domain_data.get("name-server", [])
            if isinstance(ns, list):
                domain_servers = ns
            elif isinstance(ns, str):
                domain_servers = [ns]

            domains.append({
                "name": domain_name,
                "name_servers": domain_servers,
                "addnta": "addnta" in domain_data,
                "recursion_desired": "recursion-desired" in domain_data,
            })

        return domains

    def parse_authoritative_domains(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse authoritative domains from config."""
        auth_domains = []
        auth_config = config.get("authoritative-domain", {})

        for domain_name, domain_data in auth_config.items() if isinstance(auth_config, dict) else []:
            if not isinstance(domain_data, dict):
                continue

            records = []
            records_config = domain_data.get("records", {})

            if isinstance(records_config, dict):
                # Parse A records
                for name, a_data in records_config.get("a", {}).items() if isinstance(records_config.get("a"), dict) else []:
                    if isinstance(a_data, dict):
                        addresses = a_data.get("address", [])
                        if isinstance(addresses, str):
                            addresses = [addresses]
                        for addr in addresses:
                            records.append({"type": "A", "name": name, "value": addr})

                # Parse AAAA records
                for name, aaaa_data in records_config.get("aaaa", {}).items() if isinstance(records_config.get("aaaa"), dict) else []:
                    if isinstance(aaaa_data, dict):
                        addresses = aaaa_data.get("address", [])
                        if isinstance(addresses, str):
                            addresses = [addresses]
                        for addr in addresses:
                            records.append({"type": "AAAA", "name": name, "value": addr})

                # Parse CNAME records
                for name, cname_data in records_config.get("cname", {}).items() if isinstance(records_config.get("cname"), dict) else []:
                    if isinstance(cname_data, dict):
                        records.append({"type": "CNAME", "name": name, "value": cname_data.get("target")})

                # Parse MX records
                for name, mx_data in records_config.get("mx", {}).items() if isinstance(records_config.get("mx"), dict) else []:
                    if isinstance(mx_data, dict):
                        records.append({
                            "type": "MX",
                            "name": name,
                            "value": mx_data.get("server"),
                            "priority": mx_data.get("priority"),
                        })

                # Parse TXT records
                for name, txt_data in records_config.get("txt", {}).items() if isinstance(records_config.get("txt"), dict) else []:
                    if isinstance(txt_data, dict):
                        values = txt_data.get("value", [])
                        if isinstance(values, str):
                            values = [values]
                        for val in values:
                            records.append({"type": "TXT", "name": name, "value": val})

                # Parse PTR records
                for name, ptr_data in records_config.get("ptr", {}).items() if isinstance(records_config.get("ptr"), dict) else []:
                    if isinstance(ptr_data, dict):
                        records.append({"type": "PTR", "name": name, "value": ptr_data.get("target")})

                # Parse NS records
                for name, ns_data in records_config.get("ns", {}).items() if isinstance(records_config.get("ns"), dict) else []:
                    if isinstance(ns_data, dict):
                        records.append({"type": "NS", "name": name, "value": ns_data.get("target")})

            auth_domains.append({
                "name": domain_name,
                "disable": "disable" in domain_data,
                "records": records,
            })

        return auth_domains

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full DNS forwarding configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed DNS forwarding configuration
        """
        dns_config = full_config.get("service", {}).get("dns", {}).get("forwarding", {})

        if not dns_config:
            return {
                "configured": False,
                "listen_addresses": [],
                "allow_from": [],
                "name_servers": [],
                "domains": [],
                "authoritative_domains": [],
                "dhcp_interfaces": [],
                "cache_size": None,
                "negative_ttl": None,
                "timeout": None,
                "dnssec": None,
                "system": False,
                "ignore_hosts_file": False,
                "no_serve_rfc1918": False,
                "source_address": None,
            }

        # Parse listen addresses
        listen_addresses = dns_config.get("listen-address", [])
        if isinstance(listen_addresses, str):
            listen_addresses = [listen_addresses]

        # Parse allow-from networks
        allow_from = dns_config.get("allow-from", [])
        if isinstance(allow_from, str):
            allow_from = [allow_from]

        # Parse DHCP interfaces
        dhcp_interfaces = dns_config.get("dhcp", [])
        if isinstance(dhcp_interfaces, str):
            dhcp_interfaces = [dhcp_interfaces]

        # Parse source address
        source_address = dns_config.get("source-address")
        if isinstance(source_address, list) and len(source_address) > 0:
            source_address = source_address[0]

        return {
            "configured": True,
            "listen_addresses": listen_addresses if isinstance(listen_addresses, list) else [],
            "allow_from": allow_from if isinstance(allow_from, list) else [],
            "name_servers": self.parse_name_servers(dns_config),
            "domains": self.parse_domains(dns_config),
            "authoritative_domains": self.parse_authoritative_domains(dns_config),
            "dhcp_interfaces": dhcp_interfaces if isinstance(dhcp_interfaces, list) else [],
            "cache_size": dns_config.get("cache-size"),
            "negative_ttl": dns_config.get("negative-ttl"),
            "timeout": dns_config.get("timeout"),
            "dnssec": dns_config.get("dnssec"),
            "system": "system" in dns_config,
            "ignore_hosts_file": "ignore-hosts-file" in dns_config,
            "no_serve_rfc1918": "no-serve-rfc1918" in dns_config,
            "source_address": source_address,
        }
