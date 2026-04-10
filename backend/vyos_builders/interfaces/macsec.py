"""
MACsec Interface Batch Builder

Provides all MACsec interface batch operations.
MACsec supports: address, description, disable, mtu, source-interface, vrf,
security (cipher, encrypt, replay-window, mka, static), ip, ipv6,
dhcp-options, dhcpv6-options, mirror, redirect.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class MacsecInterfaceBuilderMixin:
    """Complete batch builder for MACsec interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_macsec"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "MacsecInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "MacsecInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "MacsecInterfaceBuilderMixin":
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
        return {
            "version": self.version,
            "features": {
                "address": {"supported": True, "description": "IPv4/IPv6 address assignment"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit (68-16000, default 1460)"},
                "source_interface": {"supported": True, "description": "Physical source interface for MACsec traffic"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "security_cipher": {"supported": True, "description": "Cipher suite (gcm-aes-128, gcm-aes-256)"},
                "security_encrypt": {"supported": True, "description": "Enable optional MACsec encryption"},
                "security_replay_window": {"supported": True, "description": "Replay protection window (0-4294967295)"},
                "security_mka": {"supported": True, "description": "MACsec Key Agreement (CAK, CKN, priority)"},
                "security_static": {"supported": True, "description": "Static key and peer configuration"},
                "ip_settings": {"supported": True, "description": "IPv4 settings (ARP, forwarding, source validation, etc.)"},
                "ipv6_settings": {"supported": True, "description": "IPv6 settings (DAD, forwarding, autoconf, etc.)"},
                "dhcp_options": {"supported": True, "description": "DHCP client options"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_mtu(self, interface: str, mtu: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_mtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def set_source_interface(self, interface: str, source: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_interface(interface, source)
        return self.add_set(path)

    def delete_source_interface(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_interface_path(interface)
        return self.add_delete(path)

    def set_vrf(self, interface: str, vrf: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_vrf(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    # ========================================================================
    # Security Operations
    # ========================================================================

    def set_security_cipher(self, interface: str, cipher: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_cipher(interface, cipher)
        return self.add_set(path)

    def delete_security_cipher(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_cipher_path(interface)
        return self.add_delete(path)

    def set_security_encrypt(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_encrypt(interface)
        return self.add_set(path)

    def delete_security_encrypt(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_encrypt(interface)
        return self.add_delete(path)

    def set_security_replay_window(self, interface: str, window: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_replay_window(interface, window)
        return self.add_set(path)

    def delete_security_replay_window(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_replay_window_path(interface)
        return self.add_delete(path)

    # --- MKA ---
    def set_security_mka_cak(self, interface: str, cak: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_cak(interface, cak)
        return self.add_set(path)

    def delete_security_mka_cak(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_cak_path(interface)
        return self.add_delete(path)

    def set_security_mka_ckn(self, interface: str, ckn: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_ckn(interface, ckn)
        return self.add_set(path)

    def delete_security_mka_ckn(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_ckn_path(interface)
        return self.add_delete(path)

    def set_security_mka_priority(self, interface: str, priority: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_priority(interface, priority)
        return self.add_set(path)

    def delete_security_mka_priority(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_mka_priority_path(interface)
        return self.add_delete(path)

    # --- Static ---
    def set_security_static_key(self, interface: str, key: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_key(interface, key)
        return self.add_set(path)

    def delete_security_static_key(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_key_path(interface)
        return self.add_delete(path)

    def set_security_static_peer(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer(interface, peer)
        return self.add_set(path)

    def delete_security_static_peer(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer(interface, peer)
        return self.add_delete(path)

    def set_security_static_peer_disable(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_disable(interface, peer)
        return self.add_set(path)

    def delete_security_static_peer_disable(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_disable(interface, peer)
        return self.add_delete(path)

    def set_security_static_peer_key(self, interface: str, peer: str, key: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_key(interface, peer, key)
        return self.add_set(path)

    def delete_security_static_peer_key(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_key_path(interface, peer)
        return self.add_delete(path)

    def set_security_static_peer_mac(self, interface: str, peer: str, mac: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_mac(interface, peer, mac)
        return self.add_set(path)

    def delete_security_static_peer_mac(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_security_static_peer_mac_path(interface, peer)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, mss: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ip_adjust_mss_clamp_to_pmtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def set_ip_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ip_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def set_ip_enable_directed_broadcast(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_set(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_set(path)

    def set_ip_source_validation(self, interface: str, mode: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    def delete_ip_settings(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, count: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_accept_dad(interface, count)
        return self.add_set(path)

    def set_ipv6_address_autoconf(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_set(path)

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_set(path)

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_delete(path)

    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier(interface, identifier)
        return self.add_set(path)

    def set_ipv6_adjust_mss(self, interface: str, mss: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ipv6_adjust_mss_clamp_to_pmtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ipv6_base_reachable_time(self, interface: str, time: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time(interface, time)
        return self.add_set(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, count)
        return self.add_set(path)

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ipv6_source_validation(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation_path(interface)
        return self.add_delete(path)

    def delete_ipv6_settings(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # DHCP Options
    # ========================================================================

    def set_dhcp_options_client_id(self, interface: str, client_id: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_client_id(interface, client_id)
        return self.add_set(path)

    def set_dhcp_options_host_name(self, interface: str, hostname: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_host_name(interface, hostname)
        return self.add_set(path)

    def set_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_vendor_class_id(interface, vendor_id)
        return self.add_set(path)

    def set_dhcp_options_no_default_route(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface)
        return self.add_set(path)

    def set_dhcp_options_default_route_distance(self, interface: str, distance: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance(interface, distance)
        return self.add_set(path)

    def set_dhcp_options_reject(self, interface: str, server: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_reject(interface, server)
        return self.add_set(path)

    def set_dhcp_options_user_class(self, interface: str, user_class: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_user_class(interface, user_class)
        return self.add_set(path)

    def set_dhcp_options_mtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_mtu(interface)
        return self.add_set(path)

    def delete_dhcp_options(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # DHCPv6 Options
    # ========================================================================

    def set_dhcpv6_options_duid(self, interface: str, duid: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid(interface, duid)
        return self.add_set(path)

    def set_dhcpv6_options_rapid_commit(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface)
        return self.add_set(path)

    def set_dhcpv6_options_no_release(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_release(interface)
        return self.add_set(path)

    def set_dhcpv6_options_no_request_dns(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_dns(interface)
        return self.add_set(path)

    def set_dhcpv6_options_no_request_domain_name(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_no_request_domain_name(interface)
        return self.add_set(path)

    def set_dhcpv6_options_parameters_only(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_parameters_only(interface)
        return self.add_set(path)

    def set_dhcpv6_options_temporary(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_temporary(interface)
        return self.add_set(path)

    def set_dhcpv6_options_pd(self, interface: str, pd_id: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd(interface, pd_id)
        return self.add_set(path)

    def set_dhcpv6_options_pd_length(self, interface: str, pd_id: str, length: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd_length(interface, pd_id, length)
        return self.add_set(path)

    def set_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, pd_iface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd_interface(interface, pd_id, pd_iface)
        return self.add_set(path)

    def set_dhcpv6_options_pd_interface_address(self, interface: str, pd_id: str, pd_iface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd_interface_address(interface, pd_id, pd_iface, address)
        return self.add_set(path)

    def set_dhcpv6_options_pd_interface_sla_id(self, interface: str, pd_id: str, pd_iface: str, sla_id: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd_interface_sla_id(interface, pd_id, pd_iface, sla_id)
        return self.add_set(path)

    def delete_dhcpv6_options(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Redirect Operation
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)
