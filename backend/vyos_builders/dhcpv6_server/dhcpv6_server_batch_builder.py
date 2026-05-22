"""DHCPv6 Server Batch Builder.

Generates VyOS set/delete operations for the dhcpv6-server service.

Config root: service dhcpv6-server

Version differences handled transparently via the mapper:
  - 1.4: common-options/, address-range/start/<s>/stop, pd/start/<s>/..., 'identifier' field
  - 1.5: option/, range/<name>/..., pd/prefix/<p>/..., 'duid' + 'mac' fields,
          listen-interface, disable-route-autoinstall, subnet-id
"""
from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPv6ServerBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["dhcpv6_server"]

    # -------------------------------------------------------------------------
    # Core helpers
    # -------------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "DHCPv6ServerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPv6ServerBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -------------------------------------------------------------------------
    # Capabilities
    # -------------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4
        return {
            "version": self.version,
            "features": {
                "disable": {"supported": True, "description": "Globally disable DHCPv6 server"},
                "preference": {"supported": True, "description": "Server preference (0-255)", "min": 0, "max": 255},
                "global_name_servers": {"supported": True, "description": "Global DNS name servers"},
                "disable_route_autoinstall": {
                    "supported": is_1_5,
                    "description": "Do not install routes for delegated prefixes (1.5+)",
                },
                "listen_interface": {
                    "supported": is_1_5,
                    "description": "Interface(s) to listen on (1.5+)",
                },
                "shared_networks": {"supported": True, "description": "Shared network configurations"},
                "network_common_options": {
                    "supported": True,
                    "description": "Network-level DHCPv6 options (name-server, domain-search, info-refresh-time)",
                },
                "subnet_lease_times": {"supported": True, "description": "Subnet lease time controls"},
                "subnet_options": {
                    "supported": True,
                    "description": "Subnet-level DHCPv6 options (name-server, domain-search, NIS, SIP, SNTP, TFTP)",
                },
                "address_ranges_named": {
                    "supported": is_1_5,
                    "description": "Named address ranges with start/stop/prefix (1.5+)",
                },
                "address_ranges_classic": {
                    "supported": is_1_4,
                    "description": "Classic address-range start/stop and prefix entries (1.4)",
                },
                "prefix_delegation_v15": {
                    "supported": is_1_5,
                    "description": "Prefix delegation with prefix/<p>/delegated-length|excluded-prefix|... (1.5+)",
                },
                "prefix_delegation_v14": {
                    "supported": is_1_4,
                    "description": "Prefix delegation with start/<s>/stop|prefix-length (1.4)",
                },
                "static_mappings": {"supported": True, "description": "Static IPv6 address/prefix assignments"},
                "static_mapping_duid": {"supported": True, "description": "DUID-based static mappings"},
                "static_mapping_mac": {
                    "supported": is_1_5,
                    "description": "MAC-based static mappings (1.5+)",
                },
                "subnet_id": {
                    "supported": is_1_5,
                    "description": "Subnet ID (1.5+)",
                },
                "vendor_options_cisco": {"supported": True, "description": "Cisco vendor-specific options (TFTP)"},
            },
            "version_info": {"is_1_4": is_1_4, "is_1_5": is_1_5},
        }

    # -------------------------------------------------------------------------
    # Global server operations
    # -------------------------------------------------------------------------

    def set_disable(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_global_disable())

    def delete_disable(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_global_disable())

    def delete_dhcpv6_server(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_dhcpv6_server_delete())

    def set_preference(self, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_global_preference(value))

    def delete_preference(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_global_preference_delete())

    def set_global_name_server(self, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_global_name_server(ns))

    def delete_global_name_server(self, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_global_name_server_delete(ns))

    # 1.5-only global options (no-op on 1.4 since mapper returns [])
    def set_disable_route_autoinstall(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_disable_route_autoinstall())

    def delete_disable_route_autoinstall(self) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_disable_route_autoinstall())

    def set_listen_interface(self, iface: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_listen_interface(iface))

    def delete_listen_interface(self, iface: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_listen_interface_delete(iface))

    # -------------------------------------------------------------------------
    # Shared network operations
    # -------------------------------------------------------------------------

    def set_shared_network(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_shared_network(name))

    def delete_shared_network(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_shared_network_delete(name))

    def set_network_description(self, name: str, desc: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_shared_network_description(name, desc))

    def delete_network_description(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_shared_network_description_delete(name))

    def set_network_disable(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_shared_network_disable(name))

    def delete_network_disable(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_shared_network_disable(name))

    # Network-level options
    def set_network_name_server(self, name: str, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_network_option_name_server(name, ns))

    def delete_network_name_server(self, name: str, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_network_option_name_server_delete(name, ns))

    def set_network_domain_search(self, name: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_network_option_domain_search(name, domain))

    def delete_network_domain_search(self, name: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_network_option_domain_search_delete(name, domain))

    def set_network_info_refresh_time(self, name: str, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_network_option_info_refresh_time(name, value))

    def delete_network_info_refresh_time(self, name: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_network_option_info_refresh_time_delete(name))

    # -------------------------------------------------------------------------
    # Subnet operations
    # -------------------------------------------------------------------------

    def set_subnet(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet(name, subnet))

    def delete_subnet(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_delete(name, subnet))

    def set_subnet_disable(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_disable(name, subnet))

    def delete_subnet_disable(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_disable(name, subnet))

    # Lease times
    def set_subnet_lease_default(self, name: str, subnet: str, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_lease_default(name, subnet, value))

    def delete_subnet_lease_default(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_lease_default_delete(name, subnet))

    def set_subnet_lease_minimum(self, name: str, subnet: str, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_lease_minimum(name, subnet, value))

    def delete_subnet_lease_minimum(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_lease_minimum_delete(name, subnet))

    def set_subnet_lease_maximum(self, name: str, subnet: str, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_lease_maximum(name, subnet, value))

    def delete_subnet_lease_maximum(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_lease_maximum_delete(name, subnet))

    # Subnet options
    def set_subnet_name_server(self, name: str, subnet: str, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_name_server(name, subnet, ns))

    def delete_subnet_name_server(self, name: str, subnet: str, ns: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_name_server_delete(name, subnet, ns))

    def set_subnet_domain_search(self, name: str, subnet: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_domain_search(name, subnet, domain))

    def delete_subnet_domain_search(self, name: str, subnet: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_domain_search_delete(name, subnet, domain))

    def set_subnet_info_refresh_time(self, name: str, subnet: str, value: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_info_refresh_time(name, subnet, value))

    def delete_subnet_info_refresh_time(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_info_refresh_time_delete(name, subnet))

    def set_subnet_nis_domain(self, name: str, subnet: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_nis_domain(name, subnet, domain))

    def delete_subnet_nis_domain(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_nis_domain_delete(name, subnet))

    def set_subnet_nisplus_domain(self, name: str, subnet: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_nisplus_domain(name, subnet, domain))

    def delete_subnet_nisplus_domain(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_nisplus_domain_delete(name, subnet))

    def set_subnet_nis_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_nis_server(name, subnet, server))

    def delete_subnet_nis_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_nis_server_delete(name, subnet, server))

    def set_subnet_nisplus_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_nisplus_server(name, subnet, server))

    def delete_subnet_nisplus_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_nisplus_server_delete(name, subnet, server))

    def set_subnet_sip_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_sip_server(name, subnet, server))

    def delete_subnet_sip_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_sip_server_delete(name, subnet, server))

    def set_subnet_sntp_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_option_sntp_server(name, subnet, server))

    def delete_subnet_sntp_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_option_sntp_server_delete(name, subnet, server))

    def set_subnet_cisco_tftp_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_cisco_tftp_server(name, subnet, server))

    def delete_subnet_cisco_tftp_server(self, name: str, subnet: str, server: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_cisco_tftp_server_delete(name, subnet, server))

    # 1.5-only: subnet-id
    def set_subnet_id(self, name: str, subnet: str, sid: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_id(name, subnet, sid))

    def delete_subnet_id(self, name: str, subnet: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_id_delete(name, subnet))

    # -------------------------------------------------------------------------
    # Address ranges — 1.5 named ranges
    # -------------------------------------------------------------------------

    def set_subnet_range(self, name: str, subnet: str, range_id: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_range(name, subnet, range_id))

    def delete_subnet_range(self, name: str, subnet: str, range_id: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_range_delete(name, subnet, range_id))

    def set_subnet_range_start(self, name: str, subnet: str, range_id: str, start: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_range_start(name, subnet, range_id, start))

    def set_subnet_range_stop(self, name: str, subnet: str, range_id: str, stop: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_range_stop(name, subnet, range_id, stop))

    def set_subnet_range_prefix(self, name: str, subnet: str, range_id: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_range_prefix(name, subnet, range_id, prefix))

    # -------------------------------------------------------------------------
    # Address ranges — 1.4 classic
    # -------------------------------------------------------------------------

    def set_subnet_addr_range_start_stop(self, name: str, subnet: str, start: str, stop: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_addr_range_start_stop(name, subnet, start, stop))

    def delete_subnet_addr_range_start(self, name: str, subnet: str, start: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_addr_range_start_delete(name, subnet, start))

    def set_subnet_addr_range_prefix(self, name: str, subnet: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_addr_range_prefix(name, subnet, prefix))

    def set_subnet_addr_range_prefix_temporary(self, name: str, subnet: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_addr_range_prefix_temporary(name, subnet, prefix))

    def delete_subnet_addr_range_prefix(self, name: str, subnet: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_addr_range_prefix_delete(name, subnet, prefix))

    # -------------------------------------------------------------------------
    # Prefix delegation — 1.5
    # -------------------------------------------------------------------------

    def set_subnet_pd_prefix(self, name: str, subnet: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_prefix(name, subnet, prefix))

    def delete_subnet_pd_prefix(self, name: str, subnet: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_pd_prefix_delete(name, subnet, prefix))

    def set_subnet_pd_prefix_delegated_length(self, name: str, subnet: str, prefix: str, length: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_prefix_delegated_length(name, subnet, prefix, length))

    def set_subnet_pd_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_prefix_length(name, subnet, prefix, length))

    def set_subnet_pd_prefix_excluded_prefix(self, name: str, subnet: str, prefix: str, excl: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_prefix_excluded_prefix(name, subnet, prefix, excl))

    def set_subnet_pd_prefix_excluded_prefix_length(self, name: str, subnet: str, prefix: str, length: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_prefix_excluded_prefix_length(name, subnet, prefix, length))

    # -------------------------------------------------------------------------
    # Prefix delegation — 1.4
    # -------------------------------------------------------------------------

    def set_subnet_pd_start_stop(self, name: str, subnet: str, start: str, stop: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_start_stop(name, subnet, start, stop))

    def set_subnet_pd_start_prefix_length(self, name: str, subnet: str, start: str, length: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_subnet_pd_start_prefix_length(name, subnet, start, length))

    def delete_subnet_pd_start(self, name: str, subnet: str, start: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_subnet_pd_start_delete(name, subnet, start))

    # -------------------------------------------------------------------------
    # Static mappings
    # -------------------------------------------------------------------------

    def set_static_mapping(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping(name, subnet, mapping))

    def delete_static_mapping(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_delete(name, subnet, mapping))

    def set_static_mapping_disable(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping_disable(name, subnet, mapping))

    def delete_static_mapping_disable(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_disable(name, subnet, mapping))

    def set_static_mapping_duid(self, name: str, subnet: str, mapping: str, duid: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping_duid(name, subnet, mapping, duid))

    def delete_static_mapping_duid(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_duid_delete(name, subnet, mapping))

    def set_static_mapping_ipv6_address(self, name: str, subnet: str, mapping: str, addr: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping_ipv6_address(name, subnet, mapping, addr))

    def delete_static_mapping_ipv6_address(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_ipv6_address_delete(name, subnet, mapping))

    def set_static_mapping_ipv6_prefix(self, name: str, subnet: str, mapping: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping_ipv6_prefix(name, subnet, mapping, prefix))

    def delete_static_mapping_ipv6_prefix(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_ipv6_prefix_delete(name, subnet, mapping))

    # 1.5-only
    def set_static_mapping_mac(self, name: str, subnet: str, mapping: str, mac: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_set(self.m.get_static_mapping_mac(name, subnet, mapping, mac))

    def delete_static_mapping_mac(self, name: str, subnet: str, mapping: str) -> "DHCPv6ServerBatchBuilder":
        return self.add_delete(self.m.get_static_mapping_mac_delete(name, subnet, mapping))
