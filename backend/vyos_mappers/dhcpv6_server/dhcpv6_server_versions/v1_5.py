"""DHCPv6 Server mapper — VyOS 1.5 overrides.

1.5 differences vs 1.4:
  - Network-level options live under option/
  - Subnet-level options live under option/ container
  - Address ranges: named range/<name>/start|stop|prefix
  - Prefix delegation: prefix-delegation/prefix/<prefix>/delegated-length|excluded-prefix|...|prefix-length
  - Static mapping DUID field is 'duid' (not 'identifier')
  - MAC address field available on static mappings
  - listen-interface and disable-route-autoinstall supported
  - subnet-id supported
"""
from typing import List

BASE = ["service", "dhcpv6-server"]
SNN = BASE + ["shared-network-name"]


class DHCPv6ServerMapperV1_5:

    # =========================================================================
    # Global (1.5 only)
    # =========================================================================

    def get_disable_route_autoinstall(self) -> List[str]:
        return BASE + ["disable-route-autoinstall"]

    def get_listen_interface(self, iface: str) -> List[str]:
        return BASE + ["listen-interface", iface]

    def get_listen_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["listen-interface", iface]

    # =========================================================================
    # Network-level options (1.5 uses option/)
    # =========================================================================

    def get_network_option_name_server(self, name: str, ns: str) -> List[str]:
        return SNN + [name, "option", "name-server", ns]

    def get_network_option_name_server_delete(self, name: str, ns: str) -> List[str]:
        return SNN + [name, "option", "name-server", ns]

    def get_network_option_domain_search(self, name: str, domain: str) -> List[str]:
        return SNN + [name, "option", "domain-search", domain]

    def get_network_option_domain_search_delete(self, name: str, domain: str) -> List[str]:
        return SNN + [name, "option", "domain-search", domain]

    def get_network_option_info_refresh_time(self, name: str, value: str) -> List[str]:
        return SNN + [name, "option", "info-refresh-time", value]

    def get_network_option_info_refresh_time_delete(self, name: str) -> List[str]:
        return SNN + [name, "option", "info-refresh-time"]

    # =========================================================================
    # Subnet-level options (1.5 uses option/ container)
    # =========================================================================

    def get_subnet_option_name_server(self, name: str, subnet: str, ns: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "name-server", ns]

    def get_subnet_option_name_server_delete(self, name: str, subnet: str, ns: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "name-server", ns]

    def get_subnet_option_domain_search(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "domain-search", domain]

    def get_subnet_option_domain_search_delete(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "domain-search", domain]

    def get_subnet_option_info_refresh_time(self, name: str, subnet: str, value: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "info-refresh-time", value]

    def get_subnet_option_info_refresh_time_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "info-refresh-time"]

    def get_subnet_option_nis_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nis-domain", domain]

    def get_subnet_option_nis_domain_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nis-domain"]

    def get_subnet_option_nisplus_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nisplus-domain", domain]

    def get_subnet_option_nisplus_domain_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nisplus-domain"]

    def get_subnet_option_nis_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nis-server", server]

    def get_subnet_option_nis_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nis-server", server]

    def get_subnet_option_nisplus_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nisplus-server", server]

    def get_subnet_option_nisplus_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "nisplus-server", server]

    def get_subnet_option_sip_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "sip-server", server]

    def get_subnet_option_sip_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "sip-server", server]

    def get_subnet_option_sntp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "sntp-server", server]

    def get_subnet_option_sntp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "sntp-server", server]

    def get_subnet_cisco_tftp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "vendor-option", "cisco", "tftp-server", server]

    def get_subnet_cisco_tftp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "option", "vendor-option", "cisco", "tftp-server", server]

    # =========================================================================
    # Address ranges (1.5: named range/<name>/start|stop|prefix)
    # =========================================================================

    def get_subnet_range(self, name: str, subnet: str, range_id: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "range", range_id]

    def get_subnet_range_delete(self, name: str, subnet: str, range_id: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "range", range_id]

    def get_subnet_range_start(self, name: str, subnet: str, range_id: str, start: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "range", range_id, "start", start]

    def get_subnet_range_stop(self, name: str, subnet: str, range_id: str, stop: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "range", range_id, "stop", stop]

    def get_subnet_range_prefix(self, name: str, subnet: str, range_id: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "range", range_id, "prefix", prefix]

    # =========================================================================
    # Prefix delegation (1.5: prefix-delegation/prefix/<prefix>/...)
    # =========================================================================

    def get_subnet_pd_prefix(self, name: str, subnet: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix]

    def get_subnet_pd_prefix_delete(self, name: str, subnet: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix]

    def get_subnet_pd_prefix_delegated_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix, "delegated-length", length]

    def get_subnet_pd_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix, "prefix-length", length]

    def get_subnet_pd_prefix_excluded_prefix(self, name: str, subnet: str, prefix: str, excl: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix, "excluded-prefix", excl]

    def get_subnet_pd_prefix_excluded_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "prefix-delegation", "prefix", prefix, "excluded-prefix-length", length]

    # =========================================================================
    # Subnet-id (1.5 only)
    # =========================================================================

    def get_subnet_id(self, name: str, subnet: str, sid: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "subnet-id", sid]

    def get_subnet_id_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "subnet-id"]

    # =========================================================================
    # Static mapping DUID (1.5 uses 'duid') + MAC
    # =========================================================================

    def get_static_mapping_duid(self, name: str, subnet: str, mapping: str, duid: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "duid", duid]

    def get_static_mapping_duid_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "duid"]

    def get_static_mapping_mac(self, name: str, subnet: str, mapping: str, mac: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "mac", mac]

    def get_static_mapping_mac_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "mac"]
