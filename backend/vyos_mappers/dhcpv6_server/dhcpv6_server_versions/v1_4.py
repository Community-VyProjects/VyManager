"""DHCPv6 Server mapper — VyOS 1.4 overrides.

1.4 differences vs 1.5:
  - Network-level options live under common-options/
  - Subnet-level options are direct (no option/ container)
  - Address ranges: address-range/start/<start>/stop  OR  address-range/prefix/<prefix>/[temporary]
  - Prefix delegation: prefix-delegation/start/<start>/stop + prefix-length
  - Static mapping DUID field is 'identifier' (not 'duid')
  - No listen-interface, no disable-route-autoinstall, no subnet-id, no range named node
"""
from typing import List

SNN = ["service", "dhcpv6-server", "shared-network-name"]


class DHCPv6ServerMapperV1_4:

    # =========================================================================
    # Network-level options (1.4 uses common-options/)
    # =========================================================================

    def get_network_option_name_server(self, name: str, ns: str) -> List[str]:
        return SNN + [name, "common-options", "name-server", ns]

    def get_network_option_name_server_delete(self, name: str, ns: str) -> List[str]:
        return SNN + [name, "common-options", "name-server", ns]

    def get_network_option_domain_search(self, name: str, domain: str) -> List[str]:
        return SNN + [name, "common-options", "domain-search", domain]

    def get_network_option_domain_search_delete(self, name: str, domain: str) -> List[str]:
        return SNN + [name, "common-options", "domain-search", domain]

    def get_network_option_info_refresh_time(self, name: str, value: str) -> List[str]:
        return SNN + [name, "common-options", "info-refresh-time", value]

    def get_network_option_info_refresh_time_delete(self, name: str) -> List[str]:
        return SNN + [name, "common-options", "info-refresh-time"]

    # =========================================================================
    # Subnet-level options (1.4 direct, no option/ container)
    # =========================================================================

    def get_subnet_option_name_server(self, name: str, subnet: str, ns: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "name-server", ns]

    def get_subnet_option_name_server_delete(self, name: str, subnet: str, ns: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "name-server", ns]

    def get_subnet_option_domain_search(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "domain-search", domain]

    def get_subnet_option_domain_search_delete(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "domain-search", domain]

    def get_subnet_option_info_refresh_time(self, name: str, subnet: str, value: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "info-refresh-time", value]

    def get_subnet_option_info_refresh_time_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "info-refresh-time"]

    def get_subnet_option_nis_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nis-domain", domain]

    def get_subnet_option_nis_domain_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nis-domain"]

    def get_subnet_option_nisplus_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nisplus-domain", domain]

    def get_subnet_option_nisplus_domain_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nisplus-domain"]

    def get_subnet_option_nis_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nis-server", server]

    def get_subnet_option_nis_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nis-server", server]

    def get_subnet_option_nisplus_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nisplus-server", server]

    def get_subnet_option_nisplus_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "nisplus-server", server]

    def get_subnet_option_sip_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "sip-server", server]

    def get_subnet_option_sip_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "sip-server", server]

    def get_subnet_option_sntp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "sntp-server", server]

    def get_subnet_option_sntp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "sntp-server", server]

    def get_subnet_cisco_tftp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "vendor-option", "cisco", "tftp-server", server]

    def get_subnet_cisco_tftp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "vendor-option", "cisco", "tftp-server", server]

    # =========================================================================
    # Address ranges (1.4: address-range/start/<start>/stop)
    # =========================================================================

    def get_subnet_addr_range_start(self, name: str, subnet: str, start: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "start", start]

    def get_subnet_addr_range_start_stop(self, name: str, subnet: str, start: str, stop: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "start", start, "stop", stop]

    def get_subnet_addr_range_start_delete(self, name: str, subnet: str, start: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "start", start]

    def get_subnet_addr_range_prefix(self, name: str, subnet: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "prefix", prefix]

    def get_subnet_addr_range_prefix_temporary(self, name: str, subnet: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "prefix", prefix, "temporary"]

    def get_subnet_addr_range_prefix_delete(self, name: str, subnet: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "address-range", "prefix", prefix]

    # =========================================================================
    # Prefix delegation (1.4: start/<start>/stop|prefix-length)
    # =========================================================================

    def get_subnet_pd_start(self, name: str, subnet: str, start: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "start", start]

    def get_subnet_pd_start_stop(self, name: str, subnet: str, start: str, stop: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "start", start, "stop", stop]

    def get_subnet_pd_start_prefix_length(self, name: str, subnet: str, start: str, length: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "start", start, "prefix-length", length]

    def get_subnet_pd_start_delete(self, name: str, subnet: str, start: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "start", start]

    # =========================================================================
    # Static mapping DUID (1.4 uses 'identifier')
    # =========================================================================

    def get_static_mapping_duid(self, name: str, subnet: str, mapping: str, duid: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "identifier", duid]

    def get_static_mapping_duid_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "identifier"]
