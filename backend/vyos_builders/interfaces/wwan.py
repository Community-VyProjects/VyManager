"""
WWAN Interface Batch Builder

Provides all WWAN interface batch operations covering:
- Basic interface settings (address, description, disable, mtu, vrf)
- WWAN-specific: APN, authentication (username/password), connect-on-demand, disable-link-detect
- DHCP options (client-id, default-route-distance, host-name, mtu, no-default-route, reject, user-class, vendor-class-id)
- DHCPv6 options (duid, no-release, parameters-only, rapid-commit, temporary, pd prefix delegation)
- IP/IPv6 settings, mirror, redirect
- Version-specific: no-request-dns/no-request-domain-name, interface-identifier (v1.5)
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class WwanInterfaceBatchBuilder:
    """Complete batch builder for WWAN interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "interface_wwan"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "WwanInterfaceBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "WwanInterfaceBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "WwanInterfaceBatchBuilder":
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "features": {
                "address": {"supported": True, "description": "IPv4/IPv6 address or DHCP/DHCPv6"},
                "apn": {"supported": True, "description": "Access Point Name (APN) for cellular connection"},
                "authentication": {"supported": True, "description": "APN username and password"},
                "connect_on_demand": {"supported": True, "description": "Establish connection when traffic is sent"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "disable_link_detect": {"supported": True, "description": "Disable link state change detection"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit (68-1500, default 1430)"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to another interface"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic to another interface"},
                "dhcp_options": {"supported": True, "description": "DHCP client options (client-id, host-name, etc.)"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options including prefix delegation"},
                "dhcpv6_pd": {"supported": True, "description": "DHCPv6 prefix delegation"},
                "ip_settings": {"supported": True, "description": "IPv4 ARP, forwarding, and MSS settings"},
                "ipv6_settings": {"supported": True, "description": "IPv6 DAD, EUI-64, forwarding, and MSS settings"},
                "dhcpv6_no_request_dns": {"supported": is_v15, "description": "Do not request DNS servers via DHCPv6 (VyOS 1.5+)"},
                "dhcpv6_no_request_domain_name": {"supported": is_v15, "description": "Do not request domain name via DHCPv6 (VyOS 1.5+)"},
                "ipv6_interface_identifier": {"supported": is_v15, "description": "SLAAC interface identifier override (VyOS 1.5+)"},
            },
        }

    # ========================================================================
    # Basic Interface Settings
    # ========================================================================

    def set_interface(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface(interface))

    def delete_interface(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface(interface))

    def set_description(self, interface: str, description: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_description(interface, description))

    def delete_description(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_description_path(interface))

    def set_address(self, interface: str, address: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_address(interface, address))

    def delete_address(self, interface: str, address: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address(interface, address))

    def delete_address_all(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address_path(interface))

    def set_disable(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable(interface))

    def delete_disable(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable(interface))

    def set_disable_link_detect(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable_link_detect(interface))

    def delete_disable_link_detect(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable_link_detect(interface))

    def set_connect_on_demand(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_connect_on_demand(interface))

    def delete_connect_on_demand(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_connect_on_demand(interface))

    def set_mtu(self, interface: str, mtu: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mtu(interface, mtu))

    def delete_mtu(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mtu_path(interface))

    def set_vrf(self, interface: str, vrf: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrf_path(interface))

    # ========================================================================
    # APN / Authentication
    # ========================================================================

    def set_apn(self, interface: str, apn: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_apn(interface, apn))

    def delete_apn(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_apn_path(interface))

    def set_auth_username(self, interface: str, username: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_authentication_username(interface, username))

    def delete_auth_username(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_authentication_username_path(interface))

    def set_auth_password(self, interface: str, password: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_authentication_password(interface, password))

    def delete_auth_password(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_authentication_password_path(interface))

    def delete_authentication(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_authentication_path(interface))

    # ========================================================================
    # DHCP Options
    # ========================================================================

    def set_dhcp_client_id(self, interface: str, client_id: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_client_id(interface, client_id))

    def delete_dhcp_client_id(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_client_id_path(interface))

    def set_dhcp_default_route_distance(self, interface: str, distance: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_default_route_distance(interface, distance))

    def delete_dhcp_default_route_distance(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_default_route_distance_path(interface))

    def set_dhcp_host_name(self, interface: str, hostname: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_host_name(interface, hostname))

    def delete_dhcp_host_name(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_host_name_path(interface))

    def set_dhcp_mtu(self, interface: str, mtu: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_mtu(interface, mtu))

    def delete_dhcp_mtu(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_mtu_path(interface))

    def set_dhcp_no_default_route(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_no_default_route(interface))

    def delete_dhcp_no_default_route(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_no_default_route(interface))

    def set_dhcp_reject(self, interface: str, reject: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_reject(interface, reject))

    def delete_dhcp_reject(self, interface: str, reject: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_reject(interface, reject))

    def delete_dhcp_reject_all(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_reject_path(interface))

    def set_dhcp_user_class(self, interface: str, user_class: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_user_class(interface, user_class))

    def delete_dhcp_user_class(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_user_class_path(interface))

    def set_dhcp_vendor_class_id(self, interface: str, vendor_class_id: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcp_vendor_class_id(interface, vendor_class_id))

    def delete_dhcp_vendor_class_id(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_vendor_class_id_path(interface))

    def delete_dhcp_options(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcp_options_path(interface))

    # ========================================================================
    # DHCPv6 Options
    # ========================================================================

    def set_dhcpv6_duid(self, interface: str, duid: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_duid(interface, duid))

    def delete_dhcpv6_duid(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_duid_path(interface))

    def set_dhcpv6_no_release(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_no_release(interface))

    def delete_dhcpv6_no_release(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_no_release(interface))

    def set_dhcpv6_parameters_only(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_parameters_only(interface))

    def delete_dhcpv6_parameters_only(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_parameters_only(interface))

    def set_dhcpv6_rapid_commit(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_rapid_commit(interface))

    def delete_dhcpv6_rapid_commit(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_rapid_commit(interface))

    def set_dhcpv6_temporary(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_temporary(interface))

    def delete_dhcpv6_temporary(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_temporary(interface))

    def set_dhcpv6_pd_instance(self, interface: str, instance: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_pd_instance(interface, instance))

    def delete_dhcpv6_pd_instance(self, interface: str, instance: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_pd_instance(interface, instance))

    def delete_dhcpv6_pd_all(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_pd_path(interface))

    def delete_dhcpv6_options(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_options_path(interface))

    # VyOS 1.5 only
    def set_dhcpv6_no_request_dns(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_no_request_dns(interface))

    def delete_dhcpv6_no_request_dns(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_no_request_dns(interface))

    def set_dhcpv6_no_request_domain_name(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_dhcpv6_no_request_domain_name(interface))

    def delete_dhcpv6_no_request_domain_name(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_dhcpv6_no_request_domain_name(interface))

    # ========================================================================
    # Mirror / Redirect
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_redirect(interface, destination))

    def delete_redirect(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_redirect_path(interface))

    def set_mirror_ingress(self, interface: str, destination: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_ingress(interface, destination))

    def delete_mirror_ingress(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, destination: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_egress(interface, destination))

    def delete_mirror_egress(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_egress_path(interface))

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, value: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_adjust_mss(interface, value))

    def delete_ip_adjust_mss(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_arp_cache_timeout(interface, timeout))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, mode: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_source_validation(interface, mode))

    def delete_ip_source_validation(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_source_validation_path(interface))

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, value: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_accept_dad(interface, value))

    def delete_ipv6_accept_dad(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_accept_dad_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64_all(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64_path(interface))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local(interface))

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_adjust_mss(interface, value))

    def delete_ipv6_adjust_mss(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, value: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_base_reachable_time(interface, value))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits(interface, value))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_source_validation(interface, mode))

    def delete_ipv6_source_validation(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_source_validation_path(interface))

    # VyOS 1.5 only
    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "WwanInterfaceBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_interface_identifier(interface, identifier))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "WwanInterfaceBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_interface_identifier_path(interface))
