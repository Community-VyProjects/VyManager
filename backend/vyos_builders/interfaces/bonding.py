"""
Bonding Interface Batch Builder

Provides all bonding interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BondingInterfaceBuilderMixin:
    """Complete batch builder for bonding interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_bonding"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BondingInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BondingInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "BondingInterfaceBuilderMixin":
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
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_disable_link_detect(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable_link_detect(interface)
        return self.add_set(path)

    def delete_interface_disable_link_detect(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable_link_detect(interface)
        return self.add_delete(path)

    def set_interface_mac(self, interface: str, mac: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac(interface, mac)
        return self.add_set(path)

    def delete_interface_mac(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac_path(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    def set_interface_redirect(self, interface: str, target: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, target)
        return self.add_set(path)

    def delete_interface_redirect(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Bonding-Specific Operations
    # ========================================================================

    def set_mode(self, interface: str, mode: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mode(interface, mode)
        return self.add_set(path)

    def delete_mode(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mode_path(interface)
        return self.add_delete(path)

    def set_hash_policy(self, interface: str, policy: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_hash_policy(interface, policy)
        return self.add_set(path)

    def delete_hash_policy(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_hash_policy_path(interface)
        return self.add_delete(path)

    def set_lacp_rate(self, interface: str, rate: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_lacp_rate(interface, rate)
        return self.add_set(path)

    def delete_lacp_rate(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_lacp_rate_path(interface)
        return self.add_delete(path)

    def set_min_links(self, interface: str, min_links: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_min_links(interface, min_links)
        return self.add_set(path)

    def delete_min_links(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_min_links_path(interface)
        return self.add_delete(path)

    def set_mii_mon_interval(self, interface: str, interval: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mii_mon_interval(interface, interval)
        return self.add_set(path)

    def delete_mii_mon_interval(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mii_mon_interval_path(interface)
        return self.add_delete(path)

    def set_primary(self, interface: str, primary: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_primary(interface, primary)
        return self.add_set(path)

    def delete_primary(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_primary_path(interface)
        return self.add_delete(path)

    def set_system_mac(self, interface: str, mac: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_system_mac(interface, mac)
        return self.add_set(path)

    def delete_system_mac(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_system_mac_path(interface)
        return self.add_delete(path)

    # --- Member interfaces ---
    def add_member_interface(self, interface: str, member: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_member_interface(interface, member)
        return self.add_set(path)

    def delete_member_interface(self, interface: str, member: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_member_interface(interface, member)
        return self.add_delete(path)

    def delete_all_members(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_member_interface_path(interface)
        return self.add_delete(path)

    # --- ARP monitor ---
    def set_arp_monitor_interval(self, interface: str, interval: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_arp_monitor_interval(interface, interval)
        return self.add_set(path)

    def delete_arp_monitor_interval(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_arp_monitor_interval_path(interface)
        return self.add_delete(path)

    def add_arp_monitor_target(self, interface: str, target: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_arp_monitor_target(interface, target)
        return self.add_set(path)

    def delete_arp_monitor_target(self, interface: str, target: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_arp_monitor_target(interface, target)
        return self.add_delete(path)

    def delete_arp_monitor(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_arp_monitor_path(interface)
        return self.add_delete(path)

    # --- EVPN ---
    def set_evpn_es_df_pref(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_df_pref(interface, value)
        return self.add_set(path)

    def delete_evpn_es_df_pref(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_df_pref_path(interface)
        return self.add_delete(path)

    def set_evpn_es_id(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_id(interface, value)
        return self.add_set(path)

    def delete_evpn_es_id(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_id_path(interface)
        return self.add_delete(path)

    def set_evpn_es_sys_mac(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_sys_mac(interface, value)
        return self.add_set(path)

    def delete_evpn_es_sys_mac(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_es_sys_mac_path(interface)
        return self.add_delete(path)

    def set_evpn_uplink(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_uplink(interface)
        return self.add_set(path)

    def delete_evpn_uplink(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_uplink(interface)
        return self.add_delete(path)

    def delete_evpn(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_evpn_path(interface)
        return self.add_delete(path)

    # --- Mirror ---
    def set_mirror_ingress(self, interface: str, target: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, target)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, target: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, target)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "BondingInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    # --- IP settings ---
    def set_ip_adjust_mss(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, value))

    def delete_ip_adjust_mss(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, value))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, value))

    def delete_ip_source_validation(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface))

    # --- IPv6 settings ---
    def set_ipv6_accept_dad(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_accept_dad(interface, value))

    def delete_ipv6_accept_dad(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_accept_dad_path(interface))

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, value))

    def delete_ipv6_adjust_mss(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time(interface, value))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, value))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_source_validation(interface, value))

    def delete_ipv6_source_validation(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_source_validation_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, value))

    def delete_ipv6_address_eui64(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_eui64_path(interface))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface))

    # --- DHCP options ---
    def set_dhcp_options_client_id(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_client_id(interface, value))

    def delete_dhcp_options_client_id(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_client_id_path(interface))

    def set_dhcp_options_default_route_distance(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance(interface, value))

    def delete_dhcp_options_default_route_distance(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance_path(interface))

    def set_dhcp_options_host_name(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_host_name(interface, value))

    def delete_dhcp_options_host_name(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_host_name_path(interface))

    def set_dhcp_options_mtu(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_mtu(interface))

    def delete_dhcp_options_mtu(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_mtu(interface))

    def set_dhcp_options_no_default_route(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface))

    def delete_dhcp_options_no_default_route(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface))

    def set_dhcp_options_reject(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_reject(interface, value))

    def delete_dhcp_options_reject(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_reject(interface, value))

    def delete_all_dhcp_options(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_path(interface))

    # --- DHCPv6 options ---
    def set_dhcpv6_options_duid(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid(interface, value))

    def delete_dhcpv6_options_duid(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid_path(interface))

    def set_dhcpv6_options_no_release(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_release(interface))

    def delete_dhcpv6_options_no_release(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_release(interface))

    def set_dhcpv6_options_parameters_only(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_parameters_only(interface))

    def delete_dhcpv6_options_parameters_only(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_parameters_only(interface))

    def set_dhcpv6_options_rapid_commit(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface))

    def delete_dhcpv6_options_rapid_commit(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface))

    def set_dhcpv6_options_temporary(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_temporary(interface))

    def delete_dhcpv6_options_temporary(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_temporary(interface))

    def delete_all_dhcpv6_options(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_path(interface))

    # ------------------------------------------------------------------
    # VIF sub-interface operations
    # ------------------------------------------------------------------
    def set_vif(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id))
    def delete_vif(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id))
    def set_vif_address(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "address", value))
    def delete_vif_address(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "address", value))
    def set_vif_description(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "description", value))
    def delete_vif_description(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "description"))
    def set_vif_mtu(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mtu", value))
    def delete_vif_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mtu"))
    def set_vif_mac(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mac", value))
    def delete_vif_mac(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mac"))
    def set_vif_vrf(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "vrf", value))
    def delete_vif_vrf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "vrf"))
    def set_vif_redirect(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "redirect", value))
    def delete_vif_redirect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "redirect"))
    def set_vif_disable(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "disable"))
    def delete_vif_disable(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "disable"))
    def set_vif_disable_link_detect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "disable-link-detect"))
    def delete_vif_disable_link_detect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "disable-link-detect"))
    def set_vif_mirror_ingress(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mirror", "ingress", value))
    def delete_vif_mirror_ingress(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mirror", "ingress"))
    def set_vif_mirror_egress(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mirror", "egress", value))
    def delete_vif_mirror_egress(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mirror", "egress"))
    def delete_vif_mirror(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "mirror"))
    def set_vif_ip_adjust_mss(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "adjust-mss", value))
    def delete_vif_ip_adjust_mss(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "adjust-mss"))
    def set_vif_ip_arp_cache_timeout(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "arp-cache-timeout", value))
    def delete_vif_ip_arp_cache_timeout(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "arp-cache-timeout"))
    def set_vif_ip_source_validation(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "source-validation", value))
    def delete_vif_ip_source_validation(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "source-validation"))
    def set_vif_ip_disable_arp_filter(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "disable-arp-filter"))
    def delete_vif_ip_disable_arp_filter(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "disable-arp-filter"))
    def set_vif_ip_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "disable-forwarding"))
    def delete_vif_ip_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "disable-forwarding"))
    def set_vif_ip_enable_arp_accept(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-accept"))
    def delete_vif_ip_enable_arp_accept(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-accept"))
    def set_vif_ip_enable_arp_announce(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-announce"))
    def delete_vif_ip_enable_arp_announce(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-announce"))
    def set_vif_ip_enable_arp_ignore(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-ignore"))
    def delete_vif_ip_enable_arp_ignore(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-arp-ignore"))
    def set_vif_ip_enable_directed_broadcast(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-directed-broadcast"))
    def delete_vif_ip_enable_directed_broadcast(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-directed-broadcast"))
    def set_vif_ip_enable_proxy_arp(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-proxy-arp"))
    def delete_vif_ip_enable_proxy_arp(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "enable-proxy-arp"))
    def set_vif_ip_proxy_arp_pvlan(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_ip_proxy_arp_pvlan(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_ip(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ip"))
    def set_vif_ipv6_accept_dad(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "accept-dad", value))
    def delete_vif_ipv6_accept_dad(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "accept-dad"))
    def set_vif_ipv6_adjust_mss(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "adjust-mss", value))
    def delete_vif_ipv6_adjust_mss(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "adjust-mss"))
    def set_vif_ipv6_base_reachable_time(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "base-reachable-time", value))
    def delete_vif_ipv6_base_reachable_time(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "base-reachable-time"))
    def set_vif_ipv6_dup_addr_detect_transmits(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "dup-addr-detect-transmits", value))
    def delete_vif_ipv6_dup_addr_detect_transmits(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "dup-addr-detect-transmits"))
    def set_vif_ipv6_source_validation(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "source-validation", value))
    def delete_vif_ipv6_source_validation(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "source-validation"))
    def set_vif_ipv6_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "disable-forwarding"))
    def delete_vif_ipv6_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "disable-forwarding"))
    def set_vif_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "autoconf"))
    def delete_vif_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "autoconf"))
    def set_vif_ipv6_address_eui64(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "eui64", value))
    def delete_vif_ipv6_address_eui64(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "eui64", value))
    def set_vif_ipv6_address_no_default_link_local(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "no-default-link-local"))
    def delete_vif_ipv6_address_no_default_link_local(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "no-default-link-local"))
    def set_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "interface-identifier", value))
    def delete_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6", "address", "interface-identifier"))
    def delete_vif_ipv6(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ipv6"))
    def set_vif_dhcp_options_client_id(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "client-id", value))
    def delete_vif_dhcp_options_client_id(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "client-id"))
    def set_vif_dhcp_options_default_route_distance(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "default-route-distance", value))
    def delete_vif_dhcp_options_default_route_distance(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "default-route-distance"))
    def set_vif_dhcp_options_host_name(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "host-name", value))
    def delete_vif_dhcp_options_host_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "host-name"))
    def set_vif_dhcp_options_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "mtu"))
    def delete_vif_dhcp_options_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "mtu"))
    def set_vif_dhcp_options_no_default_route(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "no-default-route"))
    def delete_vif_dhcp_options_no_default_route(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "no-default-route"))
    def set_vif_dhcp_options_reject(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "reject", value))
    def delete_vif_dhcp_options_reject(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "reject", value))
    def set_vif_dhcp_options_user_class(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "user-class", value))
    def delete_vif_dhcp_options_user_class(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "user-class"))
    def set_vif_dhcp_options_vendor_class_id(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "vendor-class-id", value))
    def delete_vif_dhcp_options_vendor_class_id(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options", "vendor-class-id"))
    def delete_vif_dhcp_options(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcp-options"))
    def set_vif_dhcpv6_options_duid(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "duid", value))
    def delete_vif_dhcpv6_options_duid(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "duid"))
    def set_vif_dhcpv6_options_no_release(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-release"))
    def delete_vif_dhcpv6_options_no_release(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-release"))
    def set_vif_dhcpv6_options_parameters_only(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "parameters-only"))
    def delete_vif_dhcpv6_options_parameters_only(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "parameters-only"))
    def set_vif_dhcpv6_options_rapid_commit(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "rapid-commit"))
    def delete_vif_dhcpv6_options_rapid_commit(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "rapid-commit"))
    def set_vif_dhcpv6_options_temporary(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "temporary"))
    def delete_vif_dhcpv6_options_temporary(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "temporary"))
    def set_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-request-dns"))
    def delete_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-request-dns"))
    def set_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_dhcpv6_options(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options"))
    def set_vif_egress_qos(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "egress-qos", value))
    def delete_vif_egress_qos(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "egress-qos"))
    def set_vif_ingress_qos(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ingress-qos", value))
    def delete_vif_ingress_qos(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "ingress-qos"))
    def set_vif_dhcpv6_options_pd_length(self, interface: str, vlan_id: str, pd_id: str, length: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "length", length))
    def set_vif_dhcpv6_options_pd_interface_address(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str, address: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "address", address))
    def set_vif_dhcpv6_options_pd_interface_sla_id(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str, sla_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "sla-id", sla_id))
    def delete_vif_dhcpv6_options_pd(self, interface: str, vlan_id: str, pd_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id))
    def delete_vif_dhcpv6_options_pd_interface(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface))

    # ------------------------------------------------------------------
    # VIF-S sub-interface operations
    # ------------------------------------------------------------------
    def set_vif_s(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id))
    def delete_vif_s(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id))
    def set_vif_s_address(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "address", value))
    def delete_vif_s_address(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "address", value))
    def set_vif_s_description(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "description", value))
    def delete_vif_s_description(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "description"))
    def set_vif_s_mtu(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mtu", value))
    def delete_vif_s_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mtu"))
    def set_vif_s_mac(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mac", value))
    def delete_vif_s_mac(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mac"))
    def set_vif_s_vrf(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "vrf", value))
    def delete_vif_s_vrf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "vrf"))
    def set_vif_s_redirect(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "redirect", value))
    def delete_vif_s_redirect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "redirect"))
    def set_vif_s_disable(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "disable"))
    def delete_vif_s_disable(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "disable"))
    def set_vif_s_disable_link_detect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "disable-link-detect"))
    def delete_vif_s_disable_link_detect(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "disable-link-detect"))
    def set_vif_s_mirror_ingress(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mirror", "ingress", value))
    def delete_vif_s_mirror_ingress(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mirror", "ingress"))
    def set_vif_s_mirror_egress(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mirror", "egress", value))
    def delete_vif_s_mirror_egress(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mirror", "egress"))
    def delete_vif_s_mirror(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "mirror"))
    def set_vif_s_ip_adjust_mss(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "adjust-mss", value))
    def delete_vif_s_ip_adjust_mss(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "adjust-mss"))
    def set_vif_s_ip_arp_cache_timeout(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "arp-cache-timeout", value))
    def delete_vif_s_ip_arp_cache_timeout(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "arp-cache-timeout"))
    def set_vif_s_ip_source_validation(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "source-validation", value))
    def delete_vif_s_ip_source_validation(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "source-validation"))
    def set_vif_s_ip_disable_arp_filter(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "disable-arp-filter"))
    def delete_vif_s_ip_disable_arp_filter(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "disable-arp-filter"))
    def set_vif_s_ip_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "disable-forwarding"))
    def delete_vif_s_ip_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "disable-forwarding"))
    def set_vif_s_ip_enable_arp_accept(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-accept"))
    def delete_vif_s_ip_enable_arp_accept(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-accept"))
    def set_vif_s_ip_enable_arp_announce(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-announce"))
    def delete_vif_s_ip_enable_arp_announce(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-announce"))
    def set_vif_s_ip_enable_arp_ignore(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-ignore"))
    def delete_vif_s_ip_enable_arp_ignore(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-arp-ignore"))
    def set_vif_s_ip_enable_directed_broadcast(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-directed-broadcast"))
    def delete_vif_s_ip_enable_directed_broadcast(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-directed-broadcast"))
    def set_vif_s_ip_enable_proxy_arp(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-proxy-arp"))
    def delete_vif_s_ip_enable_proxy_arp(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "enable-proxy-arp"))
    def set_vif_s_ip_proxy_arp_pvlan(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_s_ip_proxy_arp_pvlan(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_s_ip(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ip"))
    def set_vif_s_ipv6_accept_dad(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "accept-dad", value))
    def delete_vif_s_ipv6_accept_dad(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "accept-dad"))
    def set_vif_s_ipv6_adjust_mss(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "adjust-mss", value))
    def delete_vif_s_ipv6_adjust_mss(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "adjust-mss"))
    def set_vif_s_ipv6_base_reachable_time(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "base-reachable-time", value))
    def delete_vif_s_ipv6_base_reachable_time(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "base-reachable-time"))
    def set_vif_s_ipv6_dup_addr_detect_transmits(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "dup-addr-detect-transmits", value))
    def delete_vif_s_ipv6_dup_addr_detect_transmits(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "dup-addr-detect-transmits"))
    def set_vif_s_ipv6_source_validation(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "source-validation", value))
    def delete_vif_s_ipv6_source_validation(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "source-validation"))
    def set_vif_s_ipv6_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "disable-forwarding"))
    def delete_vif_s_ipv6_disable_forwarding(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "disable-forwarding"))
    def set_vif_s_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "autoconf"))
    def delete_vif_s_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "autoconf"))
    def set_vif_s_ipv6_address_eui64(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "eui64", value))
    def delete_vif_s_ipv6_address_eui64(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "eui64", value))
    def set_vif_s_ipv6_address_no_default_link_local(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "no-default-link-local"))
    def delete_vif_s_ipv6_address_no_default_link_local(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "no-default-link-local"))
    def set_vif_s_ipv6_address_interface_identifier(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "interface-identifier", value))
    def delete_vif_s_ipv6_address_interface_identifier(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6", "address", "interface-identifier"))
    def delete_vif_s_ipv6(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "ipv6"))
    def set_vif_s_dhcp_options_client_id(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "client-id", value))
    def delete_vif_s_dhcp_options_client_id(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "client-id"))
    def set_vif_s_dhcp_options_default_route_distance(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "default-route-distance", value))
    def delete_vif_s_dhcp_options_default_route_distance(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "default-route-distance"))
    def set_vif_s_dhcp_options_host_name(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "host-name", value))
    def delete_vif_s_dhcp_options_host_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "host-name"))
    def set_vif_s_dhcp_options_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "mtu"))
    def delete_vif_s_dhcp_options_mtu(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "mtu"))
    def set_vif_s_dhcp_options_no_default_route(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "no-default-route"))
    def delete_vif_s_dhcp_options_no_default_route(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "no-default-route"))
    def set_vif_s_dhcp_options_reject(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "reject", value))
    def delete_vif_s_dhcp_options_reject(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "reject", value))
    def set_vif_s_dhcp_options_user_class(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "user-class", value))
    def delete_vif_s_dhcp_options_user_class(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "user-class"))
    def set_vif_s_dhcp_options_vendor_class_id(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "vendor-class-id", value))
    def delete_vif_s_dhcp_options_vendor_class_id(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options", "vendor-class-id"))
    def delete_vif_s_dhcp_options(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcp-options"))
    def set_vif_s_dhcpv6_options_duid(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "duid", value))
    def delete_vif_s_dhcpv6_options_duid(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "duid"))
    def set_vif_s_dhcpv6_options_no_release(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-release"))
    def delete_vif_s_dhcpv6_options_no_release(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-release"))
    def set_vif_s_dhcpv6_options_parameters_only(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "parameters-only"))
    def delete_vif_s_dhcpv6_options_parameters_only(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "parameters-only"))
    def set_vif_s_dhcpv6_options_rapid_commit(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "rapid-commit"))
    def delete_vif_s_dhcpv6_options_rapid_commit(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "rapid-commit"))
    def set_vif_s_dhcpv6_options_temporary(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "temporary"))
    def delete_vif_s_dhcpv6_options_temporary(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "temporary"))
    def set_vif_s_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-request-dns"))
    def delete_vif_s_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-request-dns"))
    def set_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_s_dhcpv6_options(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options"))
    def set_vif_s_protocol(self, interface: str, vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "protocol", value))
    def delete_vif_s_protocol(self, interface: str, vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "protocol"))
    def set_vif_s_dhcpv6_options_pd_length(self, interface: str, vlan_id: str, pd_id: str, length: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "length", length))
    def set_vif_s_dhcpv6_options_pd_interface_address(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str, address: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "address", address))
    def set_vif_s_dhcpv6_options_pd_interface_sla_id(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str, sla_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "sla-id", sla_id))
    def delete_vif_s_dhcpv6_options_pd(self, interface: str, vlan_id: str, pd_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id))
    def delete_vif_s_dhcpv6_options_pd_interface(self, interface: str, vlan_id: str, pd_id: str, pd_iface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_s_path(interface, vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface))

    # ------------------------------------------------------------------
    # VIF-C sub-interface operations
    # ------------------------------------------------------------------
    def set_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id))
    def delete_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id))
    def set_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "address", value))
    def delete_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "address", value))
    def set_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "description", value))
    def delete_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "description"))
    def set_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mtu", value))
    def delete_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mtu"))
    def set_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mac", value))
    def delete_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mac"))
    def set_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "vrf", value))
    def delete_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "vrf"))
    def set_vif_c_redirect(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "redirect", value))
    def delete_vif_c_redirect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "redirect"))
    def set_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "disable"))
    def delete_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "disable"))
    def set_vif_c_disable_link_detect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "disable-link-detect"))
    def delete_vif_c_disable_link_detect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "disable-link-detect"))
    def set_vif_c_mirror_ingress(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mirror", "ingress", value))
    def delete_vif_c_mirror_ingress(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mirror", "ingress"))
    def set_vif_c_mirror_egress(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mirror", "egress", value))
    def delete_vif_c_mirror_egress(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mirror", "egress"))
    def delete_vif_c_mirror(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "mirror"))
    def set_vif_c_ip_adjust_mss(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "adjust-mss", value))
    def delete_vif_c_ip_adjust_mss(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "adjust-mss"))
    def set_vif_c_ip_arp_cache_timeout(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "arp-cache-timeout", value))
    def delete_vif_c_ip_arp_cache_timeout(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "arp-cache-timeout"))
    def set_vif_c_ip_source_validation(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "source-validation", value))
    def delete_vif_c_ip_source_validation(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "source-validation"))
    def set_vif_c_ip_disable_arp_filter(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "disable-arp-filter"))
    def delete_vif_c_ip_disable_arp_filter(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "disable-arp-filter"))
    def set_vif_c_ip_disable_forwarding(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "disable-forwarding"))
    def delete_vif_c_ip_disable_forwarding(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "disable-forwarding"))
    def set_vif_c_ip_enable_arp_accept(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-accept"))
    def delete_vif_c_ip_enable_arp_accept(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-accept"))
    def set_vif_c_ip_enable_arp_announce(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-announce"))
    def delete_vif_c_ip_enable_arp_announce(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-announce"))
    def set_vif_c_ip_enable_arp_ignore(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-ignore"))
    def delete_vif_c_ip_enable_arp_ignore(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-arp-ignore"))
    def set_vif_c_ip_enable_directed_broadcast(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-directed-broadcast"))
    def delete_vif_c_ip_enable_directed_broadcast(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-directed-broadcast"))
    def set_vif_c_ip_enable_proxy_arp(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-proxy-arp"))
    def delete_vif_c_ip_enable_proxy_arp(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "enable-proxy-arp"))
    def set_vif_c_ip_proxy_arp_pvlan(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_c_ip_proxy_arp_pvlan(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip", "proxy-arp-pvlan"))
    def delete_vif_c_ip(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ip"))
    def set_vif_c_ipv6_accept_dad(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "accept-dad", value))
    def delete_vif_c_ipv6_accept_dad(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "accept-dad"))
    def set_vif_c_ipv6_adjust_mss(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "adjust-mss", value))
    def delete_vif_c_ipv6_adjust_mss(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "adjust-mss"))
    def set_vif_c_ipv6_base_reachable_time(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "base-reachable-time", value))
    def delete_vif_c_ipv6_base_reachable_time(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "base-reachable-time"))
    def set_vif_c_ipv6_dup_addr_detect_transmits(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "dup-addr-detect-transmits", value))
    def delete_vif_c_ipv6_dup_addr_detect_transmits(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "dup-addr-detect-transmits"))
    def set_vif_c_ipv6_source_validation(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "source-validation", value))
    def delete_vif_c_ipv6_source_validation(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "source-validation"))
    def set_vif_c_ipv6_disable_forwarding(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "disable-forwarding"))
    def delete_vif_c_ipv6_disable_forwarding(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "disable-forwarding"))
    def set_vif_c_ipv6_address_autoconf(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "autoconf"))
    def delete_vif_c_ipv6_address_autoconf(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "autoconf"))
    def set_vif_c_ipv6_address_eui64(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "eui64", value))
    def delete_vif_c_ipv6_address_eui64(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "eui64", value))
    def set_vif_c_ipv6_address_no_default_link_local(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "no-default-link-local"))
    def delete_vif_c_ipv6_address_no_default_link_local(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "no-default-link-local"))
    def set_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "interface-identifier", value))
    def delete_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6", "address", "interface-identifier"))
    def delete_vif_c_ipv6(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "ipv6"))
    def set_vif_c_dhcp_options_client_id(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "client-id", value))
    def delete_vif_c_dhcp_options_client_id(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "client-id"))
    def set_vif_c_dhcp_options_default_route_distance(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "default-route-distance", value))
    def delete_vif_c_dhcp_options_default_route_distance(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "default-route-distance"))
    def set_vif_c_dhcp_options_host_name(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "host-name", value))
    def delete_vif_c_dhcp_options_host_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "host-name"))
    def set_vif_c_dhcp_options_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "mtu"))
    def delete_vif_c_dhcp_options_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "mtu"))
    def set_vif_c_dhcp_options_no_default_route(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "no-default-route"))
    def delete_vif_c_dhcp_options_no_default_route(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "no-default-route"))
    def set_vif_c_dhcp_options_reject(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "reject", value))
    def delete_vif_c_dhcp_options_reject(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "reject", value))
    def set_vif_c_dhcp_options_user_class(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "user-class", value))
    def delete_vif_c_dhcp_options_user_class(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "user-class"))
    def set_vif_c_dhcp_options_vendor_class_id(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "vendor-class-id", value))
    def delete_vif_c_dhcp_options_vendor_class_id(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options", "vendor-class-id"))
    def delete_vif_c_dhcp_options(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcp-options"))
    def set_vif_c_dhcpv6_options_duid(self, interface: str, s_vlan_id: str, c_vlan_id: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "duid", value))
    def delete_vif_c_dhcpv6_options_duid(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "duid"))
    def set_vif_c_dhcpv6_options_no_release(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-release"))
    def delete_vif_c_dhcpv6_options_no_release(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-release"))
    def set_vif_c_dhcpv6_options_parameters_only(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "parameters-only"))
    def delete_vif_c_dhcpv6_options_parameters_only(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "parameters-only"))
    def set_vif_c_dhcpv6_options_rapid_commit(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "rapid-commit"))
    def delete_vif_c_dhcpv6_options_rapid_commit(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "rapid-commit"))
    def set_vif_c_dhcpv6_options_temporary(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "temporary"))
    def delete_vif_c_dhcpv6_options_temporary(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "temporary"))
    def set_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-request-dns"))
    def delete_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-request-dns"))
    def set_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "no-request-domain-name"))
    def delete_vif_c_dhcpv6_options(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options"))
    def set_vif_c_dhcpv6_options_pd_length(self, interface: str, s_vlan_id: str, c_vlan_id: str, pd_id: str, length: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "pd", pd_id, "length", length))
    def set_vif_c_dhcpv6_options_pd_interface_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, pd_id: str, pd_iface: str, address: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "address", address))
    def set_vif_c_dhcpv6_options_pd_interface_sla_id(self, interface: str, s_vlan_id: str, c_vlan_id: str, pd_id: str, pd_iface: str, sla_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface, "sla-id", sla_id))
    def delete_vif_c_dhcpv6_options_pd(self, interface: str, s_vlan_id: str, c_vlan_id: str, pd_id: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "pd", pd_id))
    def delete_vif_c_dhcpv6_options_pd_interface(self, interface: str, s_vlan_id: str, c_vlan_id: str, pd_id: str, pd_iface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].vif_c_path(interface, s_vlan_id, c_vlan_id, "dhcpv6-options", "pd", pd_id, "interface", pd_iface))

    # --- EAPoL (version-specific, will only work on 1.5) ---
    def set_eapol_ca_certificate(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_eapol_ca_certificate(interface, value))

    def delete_eapol_ca_certificate(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_eapol_ca_certificate_path(interface))

    def set_eapol_certificate(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_eapol_certificate(interface, value))

    def delete_eapol_certificate(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_eapol_certificate_path(interface))

    def set_eapol_passphrase(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_eapol_passphrase(interface, value))

    def delete_eapol_passphrase(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_eapol_passphrase_path(interface))

    def delete_eapol(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_eapol_path(interface))

    # --- DHCPv6 1.5-only options ---
    def set_dhcpv6_options_no_request_dns(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_dns(interface))

    def delete_dhcpv6_options_no_request_dns(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_dns(interface))

    def set_dhcpv6_options_no_request_domain_name(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_domain_name(interface))

    def delete_dhcpv6_options_no_request_domain_name(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_domain_name(interface))

    # --- IPv6 address interface-identifier (1.5 only) ---
    def set_ipv6_address_interface_identifier(self, interface: str, value: str) -> "BondingInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier(interface, value))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "BondingInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier_path(interface))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
            "features": {
                "bonding": {"supported": True, "description": "Bonding (link aggregation) interface configuration"},
                "address": {"supported": True, "description": "IP address assignment (multi-value)"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "disable_link_detect": {"supported": True, "description": "Ignore link state changes"},
                "mac": {"supported": True, "description": "MAC address override"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit"},
                "vrf": {"supported": True, "description": "VRF instance binding"},
                "redirect": {"supported": True, "description": "Redirect to destination interface"},
                "mode": {
                    "supported": True,
                    "description": "Bonding mode",
                    "options": ["802.3ad", "active-backup", "broadcast", "round-robin",
                                "transmit-load-balance", "adaptive-load-balance", "xor-hash"],
                    "default": "802.3ad",
                },
                "hash_policy": {
                    "supported": True,
                    "description": "Bonding transmit hash policy",
                    "options": ["layer2", "layer2+3", "layer3+4", "encap2+3", "encap3+4"],
                    "default": "layer2",
                },
                "lacp_rate": {
                    "supported": True,
                    "description": "LACP rate for 802.3ad mode",
                    "options": ["slow", "fast"],
                    "default": "slow",
                },
                "min_links": {"supported": True, "description": "Minimum number of active links"},
                "mii_mon_interval": {"supported": True, "description": "MII link monitoring interval (ms)"},
                "primary": {"supported": True, "description": "Primary device interface (active-backup mode)"},
                "system_mac": {"supported": True, "description": "System MAC address for 802.3ad"},
                "member_interface": {"supported": True, "description": "Member interfaces (multi-value)"},
                "arp_monitor": {"supported": True, "description": "ARP link monitoring (interval + targets)"},
                "evpn": {"supported": True, "description": "EVPN multihoming configuration"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress packets"},
                "ip_settings": {"supported": True, "description": "IPv4 routing parameters"},
                "ipv6_settings": {"supported": True, "description": "IPv6 routing parameters"},
                "dhcp_options": {"supported": True, "description": "DHCP client options"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options"},
                "vif": {"supported": True, "description": "VLAN sub-interfaces (802.1Q)"},
                "vif_s": {"supported": True, "description": "QinQ service VLAN (802.1ad)"},
                "vif_c": {"supported": True, "description": "QinQ customer VLAN (under vif-s)"},
                "eapol": {"supported": is_1_5, "description": "802.1X EAPoL authentication (VyOS 1.5+)"},
                "dhcpv6_no_request_dns": {"supported": is_1_5, "description": "DHCPv6 no-request-dns (VyOS 1.5+)"},
                "dhcpv6_no_request_domain_name": {"supported": is_1_5, "description": "DHCPv6 no-request-domain-name (VyOS 1.5+)"},
                "ipv6_address_interface_identifier": {"supported": is_1_5, "description": "IPv6 interface identifier (VyOS 1.5+)"},
            },
        }
