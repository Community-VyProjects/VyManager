"""DHCPv6 Server command path mapper (base — version-agnostic paths)."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "dhcpv6-server"]
SNN = BASE + ["shared-network-name"]


class DHCPv6ServerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # =========================================================================
    # Global server
    # =========================================================================

    def get_dhcpv6_server_delete(self) -> List[str]:
        return BASE

    def get_global_disable(self) -> List[str]:
        return BASE + ["disable"]

    def get_global_preference(self, value: str) -> List[str]:
        return BASE + ["preference", value]

    def get_global_preference_delete(self) -> List[str]:
        return BASE + ["preference"]

    def get_global_name_server(self, ns: str) -> List[str]:
        return BASE + ["global-parameters", "name-server", ns]

    def get_global_name_server_delete(self, ns: str) -> List[str]:
        return BASE + ["global-parameters", "name-server", ns]

    # 1.5-only — version mapper overrides return [] on 1.4
    def get_disable_route_autoinstall(self) -> List[str]:
        return []

    def get_listen_interface(self, iface: str) -> List[str]:
        return []

    def get_listen_interface_delete(self, iface: str) -> List[str]:
        return []

    # =========================================================================
    # Shared network
    # =========================================================================

    def get_shared_network(self, name: str) -> List[str]:
        return SNN + [name]

    def get_shared_network_delete(self, name: str) -> List[str]:
        return SNN + [name]

    def get_shared_network_description(self, name: str, desc: str) -> List[str]:
        return SNN + [name, "description", desc]

    def get_shared_network_description_delete(self, name: str) -> List[str]:
        return SNN + [name, "description"]

    def get_shared_network_disable(self, name: str) -> List[str]:
        return SNN + [name, "disable"]

    # Network-level options — version-specific (overridden in v1_4/v1_5)
    def get_network_option_name_server(self, name: str, ns: str) -> List[str]:
        return []

    def get_network_option_name_server_delete(self, name: str, ns: str) -> List[str]:
        return []

    def get_network_option_domain_search(self, name: str, domain: str) -> List[str]:
        return []

    def get_network_option_domain_search_delete(self, name: str, domain: str) -> List[str]:
        return []

    def get_network_option_info_refresh_time(self, name: str, value: str) -> List[str]:
        return []

    def get_network_option_info_refresh_time_delete(self, name: str) -> List[str]:
        return []

    # =========================================================================
    # Subnet
    # =========================================================================

    def get_subnet(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet]

    def get_subnet_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet]

    def get_subnet_disable(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "disable"]

    # Subnet lease times
    def get_subnet_lease_default(self, name: str, subnet: str, value: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "default", value]

    def get_subnet_lease_default_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "default"]

    def get_subnet_lease_minimum(self, name: str, subnet: str, value: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "minimum", value]

    def get_subnet_lease_minimum_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "minimum"]

    def get_subnet_lease_maximum(self, name: str, subnet: str, value: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "maximum", value]

    def get_subnet_lease_maximum_delete(self, name: str, subnet: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "lease-time", "maximum"]

    # Subnet-level options — version-specific (overridden in v1_4/v1_5)
    def get_subnet_option_name_server(self, name: str, subnet: str, ns: str) -> List[str]:
        return []

    def get_subnet_option_name_server_delete(self, name: str, subnet: str, ns: str) -> List[str]:
        return []

    def get_subnet_option_domain_search(self, name: str, subnet: str, domain: str) -> List[str]:
        return []

    def get_subnet_option_domain_search_delete(self, name: str, subnet: str, domain: str) -> List[str]:
        return []

    def get_subnet_option_info_refresh_time(self, name: str, subnet: str, value: str) -> List[str]:
        return []

    def get_subnet_option_info_refresh_time_delete(self, name: str, subnet: str) -> List[str]:
        return []

    def get_subnet_option_nis_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return []

    def get_subnet_option_nis_domain_delete(self, name: str, subnet: str) -> List[str]:
        return []

    def get_subnet_option_nisplus_domain(self, name: str, subnet: str, domain: str) -> List[str]:
        return []

    def get_subnet_option_nisplus_domain_delete(self, name: str, subnet: str) -> List[str]:
        return []

    def get_subnet_option_nis_server(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_nis_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_nisplus_server(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_nisplus_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_sip_server(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_sip_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_sntp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_option_sntp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_cisco_tftp_server(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    def get_subnet_cisco_tftp_server_delete(self, name: str, subnet: str, server: str) -> List[str]:
        return []

    # 1.5-only
    def get_subnet_id(self, name: str, subnet: str, sid: str) -> List[str]:
        return []

    def get_subnet_id_delete(self, name: str, subnet: str) -> List[str]:
        return []

    # =========================================================================
    # Address ranges — version-specific
    # =========================================================================

    # 1.5: named range
    def get_subnet_range(self, name: str, subnet: str, range_id: str) -> List[str]:
        return []

    def get_subnet_range_delete(self, name: str, subnet: str, range_id: str) -> List[str]:
        return []

    def get_subnet_range_start(self, name: str, subnet: str, range_id: str, start: str) -> List[str]:
        return []

    def get_subnet_range_stop(self, name: str, subnet: str, range_id: str, stop: str) -> List[str]:
        return []

    def get_subnet_range_prefix(self, name: str, subnet: str, range_id: str, prefix: str) -> List[str]:
        return []

    # 1.4: address-range start/stop
    def get_subnet_addr_range_start(self, name: str, subnet: str, start: str) -> List[str]:
        return []

    def get_subnet_addr_range_start_stop(self, name: str, subnet: str, start: str, stop: str) -> List[str]:
        return []

    def get_subnet_addr_range_start_delete(self, name: str, subnet: str, start: str) -> List[str]:
        return []

    # 1.4: address-range prefix
    def get_subnet_addr_range_prefix(self, name: str, subnet: str, prefix: str) -> List[str]:
        return []

    def get_subnet_addr_range_prefix_temporary(self, name: str, subnet: str, prefix: str) -> List[str]:
        return []

    def get_subnet_addr_range_prefix_delete(self, name: str, subnet: str, prefix: str) -> List[str]:
        return []

    # =========================================================================
    # Prefix delegation — version-specific
    # =========================================================================

    # 1.5: prefix-delegation prefix/<prefix>/...
    def get_subnet_pd_prefix(self, name: str, subnet: str, prefix: str) -> List[str]:
        return []

    def get_subnet_pd_prefix_delete(self, name: str, subnet: str, prefix: str) -> List[str]:
        return []

    def get_subnet_pd_prefix_delegated_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return []

    def get_subnet_pd_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return []

    def get_subnet_pd_prefix_excluded_prefix(self, name: str, subnet: str, prefix: str, excl: str) -> List[str]:
        return []

    def get_subnet_pd_prefix_excluded_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> List[str]:
        return []

    # 1.4: prefix-delegation start/<start>/...
    def get_subnet_pd_start(self, name: str, subnet: str, start: str) -> List[str]:
        return []

    def get_subnet_pd_start_stop(self, name: str, subnet: str, start: str, stop: str) -> List[str]:
        return []

    def get_subnet_pd_start_prefix_length(self, name: str, subnet: str, start: str, length: str) -> List[str]:
        return []

    def get_subnet_pd_start_delete(self, name: str, subnet: str, start: str) -> List[str]:
        return []

    # =========================================================================
    # Static mappings
    # =========================================================================

    def get_static_mapping(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping]

    def get_static_mapping_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping]

    def get_static_mapping_disable(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "disable"]

    def get_static_mapping_ipv6_address(self, name: str, subnet: str, mapping: str, addr: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "ipv6-address", addr]

    def get_static_mapping_ipv6_address_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "ipv6-address"]

    def get_static_mapping_ipv6_prefix(self, name: str, subnet: str, mapping: str, prefix: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "ipv6-prefix", prefix]

    def get_static_mapping_ipv6_prefix_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return SNN + [name, "subnet", subnet, "static-mapping", mapping, "ipv6-prefix"]

    # DUID field differs: 1.4 = identifier, 1.5 = duid — overridden in version mappers
    def get_static_mapping_duid(self, name: str, subnet: str, mapping: str, duid: str) -> List[str]:
        return []

    def get_static_mapping_duid_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return []

    # MAC address — 1.5 only
    def get_static_mapping_mac(self, name: str, subnet: str, mapping: str, mac: str) -> List[str]:
        return []

    def get_static_mapping_mac_delete(self, name: str, subnet: str, mapping: str) -> List[str]:
        return []
