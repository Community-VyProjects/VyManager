"""
Bridge Interface Batch Builder

Provides all bridge interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BridgeInterfaceBuilderMixin:
    """Complete batch builder for bridge interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_bridge"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BridgeInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BridgeInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "BridgeInterfaceBuilderMixin":
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

    def set_interface_description(self, interface: str, description: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_description_path(interface))

    def set_interface_address(self, interface: str, address: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_address(interface, address))

    def delete_interface_address(self, interface: str, address: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_address(interface, address))

    def set_interface_mtu(self, interface: str, mtu: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_mtu(interface, mtu))

    def delete_interface_mtu(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_mtu_path(interface))

    def delete_interface(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_interface(interface))

    def set_interface_disable(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_disable(interface))

    def set_interface_disable_link_detect(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_disable_link_detect(interface))

    def delete_interface_disable_link_detect(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_disable_link_detect(interface))

    def set_interface(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_interface(interface))

    def set_interface_mac(self, interface: str, mac: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_mac(interface, mac))

    def delete_interface_mac(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_mac_path(interface))

    def set_interface_vrf(self, interface: str, vrf: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vrf(interface, vrf))

    def delete_interface_vrf(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vrf_path(interface))

    def set_interface_redirect(self, interface: str, target: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_redirect(interface, target))

    def delete_interface_redirect(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_redirect_path(interface))

    # ========================================================================
    # Bridge-Specific Operations
    # ========================================================================

    def set_aging(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_aging(interface, value))

    def delete_aging(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_aging_path(interface))

    def set_forwarding_delay(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_forwarding_delay(interface, value))

    def delete_forwarding_delay(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_forwarding_delay_path(interface))

    def set_hello_time(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_hello_time(interface, value))

    def delete_hello_time(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_hello_time_path(interface))

    def set_max_age(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_max_age(interface, value))

    def delete_max_age(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_max_age_path(interface))

    def set_priority(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_priority(interface, value))

    def delete_priority(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_priority_path(interface))

    def set_stp(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_stp(interface))

    def delete_stp(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_stp(interface))

    def set_enable_vlan(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_enable_vlan(interface))

    def delete_enable_vlan(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_enable_vlan(interface))

    def set_protocol(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_protocol(interface, value))

    def delete_protocol(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_protocol_path(interface))

    # --- IGMP ---
    def set_igmp_snooping(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_igmp_snooping(interface))

    def delete_igmp_snooping(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_igmp_snooping(interface))

    def set_igmp_querier(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_igmp_querier(interface))

    def delete_igmp_querier(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_igmp_querier(interface))

    def delete_igmp(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_igmp_path(interface))

    # --- Member interfaces ---
    def add_member_interface(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface(interface, member))

    def delete_member_interface(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface(interface, member))

    def delete_all_members(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_path(interface))

    def set_member_interface_cost(self, interface: str, member: str, cost: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_cost(interface, member, cost))

    def delete_member_interface_cost(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_cost_path(interface, member))

    def set_member_interface_priority(self, interface: str, member: str, priority: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_priority(interface, member, priority))

    def delete_member_interface_priority(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_priority_path(interface, member))

    def set_member_interface_isolated(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_isolated(interface, member))

    def delete_member_interface_isolated(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_isolated(interface, member))

    def set_member_interface_native_vlan(self, interface: str, member: str, vlan: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_native_vlan(interface, member, vlan))

    def delete_member_interface_native_vlan(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_native_vlan_path(interface, member))

    def set_member_interface_allowed_vlan(self, interface: str, member: str, vlan: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_allowed_vlan(interface, member, vlan))

    def delete_member_interface_allowed_vlan(self, interface: str, member: str, vlan: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_allowed_vlan(interface, member, vlan))

    def delete_all_member_interface_allowed_vlans(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_allowed_vlan_path(interface, member))

    # --- Member interface guards (VyOS 1.5 only) ---
    def set_member_interface_bpdu_guard(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_bpdu_guard(interface, member))

    def delete_member_interface_bpdu_guard(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_bpdu_guard(interface, member))

    def set_member_interface_root_guard(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_member_interface_root_guard(interface, member))

    def delete_member_interface_root_guard(self, interface: str, member: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_member_interface_root_guard(interface, member))

    # --- Mirror ---
    def set_mirror_ingress(self, interface: str, target: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, target))

    def delete_mirror_ingress(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, target: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_mirror_egress(interface, target))

    def delete_mirror_egress(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface))

    # --- IP settings ---
    def set_ip_adjust_mss(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, value))

    def delete_ip_adjust_mss(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, value))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, value))

    def delete_ip_source_validation(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface))

    # --- IPv6 settings ---
    def set_ipv6_accept_dad(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_accept_dad(interface, value))

    def delete_ipv6_accept_dad(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_accept_dad_path(interface))

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, value))

    def delete_ipv6_adjust_mss(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time(interface, value))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, value))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_source_validation(interface, value))

    def delete_ipv6_source_validation(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_source_validation_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, value))

    def delete_ipv6_address_eui64(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_eui64_path(interface))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface))

    # --- IPv6 address interface-identifier (1.5 only) ---
    def set_ipv6_address_interface_identifier(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier(interface, value))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier_path(interface))

    # --- DHCP options ---
    def set_dhcp_options_client_id(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_client_id(interface, value))

    def delete_dhcp_options_client_id(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_client_id_path(interface))

    def set_dhcp_options_default_route_distance(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance(interface, value))

    def delete_dhcp_options_default_route_distance(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance_path(interface))

    def set_dhcp_options_host_name(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_host_name(interface, value))

    def delete_dhcp_options_host_name(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_host_name_path(interface))

    def set_dhcp_options_mtu(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_mtu(interface))

    def delete_dhcp_options_mtu(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_mtu(interface))

    def set_dhcp_options_no_default_route(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface))

    def delete_dhcp_options_no_default_route(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface))

    def set_dhcp_options_reject(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_reject(interface, value))

    def delete_dhcp_options_reject(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_reject(interface, value))

    def set_dhcp_options_user_class(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_user_class(interface, value))

    def delete_dhcp_options_user_class(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_user_class_path(interface))

    def set_dhcp_options_vendor_class_id(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcp_options_vendor_class_id(interface, value))

    def delete_dhcp_options_vendor_class_id(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_vendor_class_id_path(interface))

    def delete_all_dhcp_options(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcp_options_path(interface))

    # --- DHCPv6 options ---
    def set_dhcpv6_options_duid(self, interface: str, value: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid(interface, value))

    def delete_dhcpv6_options_duid(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid_path(interface))

    def set_dhcpv6_options_no_release(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_release(interface))

    def delete_dhcpv6_options_no_release(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_release(interface))

    def set_dhcpv6_options_parameters_only(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_parameters_only(interface))

    def delete_dhcpv6_options_parameters_only(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_parameters_only(interface))

    def set_dhcpv6_options_rapid_commit(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface))

    def delete_dhcpv6_options_rapid_commit(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface))

    def set_dhcpv6_options_temporary(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_temporary(interface))

    def delete_dhcpv6_options_temporary(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_temporary(interface))

    def delete_all_dhcpv6_options(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_path(interface))

    # --- DHCPv6 1.5-only options ---
    def set_dhcpv6_options_no_request_dns(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_dns(interface))

    def delete_dhcpv6_options_no_request_dns(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_dns(interface))

    def set_dhcpv6_options_no_request_domain_name(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_domain_name(interface))

    def delete_dhcpv6_options_no_request_domain_name(self, interface: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_domain_name(interface))

    # --- VIF (VLAN sub-interfaces) ---
    def set_vif(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif(interface, vlan_id))

    def delete_vif(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif(interface, vlan_id))

    def set_vif_description(self, interface: str, vlan_id: str, description: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif_description(interface, vlan_id, description))

    def delete_vif_description(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif_description_path(interface, vlan_id))

    def set_vif_address(self, interface: str, vlan_id: str, address: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif_address(interface, vlan_id, address))

    def delete_vif_address(self, interface: str, vlan_id: str, address: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif_address(interface, vlan_id, address))

    def set_vif_disable(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif_disable(interface, vlan_id))

    def delete_vif_disable(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif_disable(interface, vlan_id))

    def set_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif_mtu(interface, vlan_id, mtu))

    def delete_vif_mtu(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif_mtu_path(interface, vlan_id))

    def set_vif_vrf(self, interface: str, vlan_id: str, vrf: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.interface_mapper_key].get_vif_vrf(interface, vlan_id, vrf))

    def delete_vif_vrf(self, interface: str, vlan_id: str) -> "BridgeInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.interface_mapper_key].get_vif_vrf_path(interface, vlan_id))

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
                "bridge": {"supported": True, "description": "Bridge interface configuration"},
                "address": {"supported": True, "description": "IP address assignment (multi-value)"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "disable_link_detect": {"supported": True, "description": "Ignore link state changes"},
                "mac": {"supported": True, "description": "MAC address override"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit"},
                "vrf": {"supported": True, "description": "VRF instance binding"},
                "redirect": {"supported": True, "description": "Redirect to destination interface"},
                "aging": {"supported": True, "description": "MAC address aging interval (seconds)"},
                "forwarding_delay": {"supported": True, "description": "Forwarding delay (seconds)"},
                "hello_time": {"supported": True, "description": "Hello packet interval (seconds)"},
                "max_age": {"supported": True, "description": "Max message age (seconds)"},
                "priority": {"supported": True, "description": "Bridge priority"},
                "stp": {"supported": True, "description": "Spanning Tree Protocol"},
                "enable_vlan": {"supported": True, "description": "VLAN-aware bridge"},
                "protocol": {
                    "supported": True,
                    "description": "Bridge protocol",
                    "options": ["802.1d", "802.1w"],
                },
                "igmp": {"supported": True, "description": "IGMP snooping and querier"},
                "member_interface": {"supported": True, "description": "Bridge member interfaces"},
                "member_interface_cost": {"supported": True, "description": "Member interface STP cost"},
                "member_interface_priority": {"supported": True, "description": "Member interface STP priority"},
                "member_interface_isolated": {"supported": True, "description": "Member interface port isolation"},
                "member_interface_native_vlan": {"supported": True, "description": "Member interface native VLAN"},
                "member_interface_allowed_vlan": {"supported": True, "description": "Member interface allowed VLANs"},
                "member_interface_bpdu_guard": {"supported": is_1_5, "description": "BPDU guard on member interface (VyOS 1.5+)"},
                "member_interface_root_guard": {"supported": is_1_5, "description": "Root guard on member interface (VyOS 1.5+)"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress packets"},
                "ip_settings": {"supported": True, "description": "IPv4 routing parameters"},
                "ipv6_settings": {"supported": True, "description": "IPv6 routing parameters"},
                "dhcp_options": {"supported": True, "description": "DHCP client options"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options"},
                "vif": {"supported": True, "description": "VLAN sub-interfaces (802.1Q)"},
                "dhcpv6_no_request_dns": {"supported": is_1_5, "description": "DHCPv6 no-request-dns (VyOS 1.5+)"},
                "dhcpv6_no_request_domain_name": {"supported": is_1_5, "description": "DHCPv6 no-request-domain-name (VyOS 1.5+)"},
                "ipv6_address_interface_identifier": {"supported": is_1_5, "description": "IPv6 interface identifier (VyOS 1.5+)"},
            },
        }
