"""
MACsec Interface Batch Builder

Provides all MACsec interface batch operations.
MACsec supports: address, description, disable, mtu, source-interface, vrf,
security (cipher, encrypt, replay-window, mka, static), ip, ipv6,
dhcp-options, dhcpv6-options, mirror, redirect.
"""

from typing import Any, Dict, List, cast
from vyos_mappers import CommandMapperRegistry
from vyos_builders.base import BatchBuilder
from vyos_mappers.interfaces.macsec import MacsecInterfaceMapper


class MacsecInterfaceBuilderMixin(BatchBuilder):
    """Complete batch builder for MACsec interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_mapper_key = "interface_macsec"
        self.mappers = {self.interface_mapper_key: CommandMapperRegistry.get_mapper(self.interface_mapper_key, version)}

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_multiple_sets(self, paths: List[List[str]]) -> "MacsecInterfaceBuilderMixin":
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        self._operations = []

    def operation_count(self) -> int:
        return len(self._operations)

    def _mapper(self) -> MacsecInterfaceMapper:
        return cast(MacsecInterfaceMapper, self.mappers[self.interface_mapper_key])

    def _versioned_path(self, node: str, method: str, *args: str) -> List[str]:
        """Path of a 1.5-only leaf; ValueError when this device lacks it."""
        mapper = self._mapper()
        mapper._require_interface_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        mapper = self._mapper()
        nodes = mapper.versioned_interface_nodes()
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
                "ipv6_address_interface_identifier": {
                    "supported": "ipv6_address_interface_identifier" in nodes,
                    "description": "SLAAC interface identifier",
                },
                "dhcp_options": {"supported": True, "description": "DHCP client options"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options"},
                "dhcpv6_options_no_request_dns": {
                    "supported": "dhcpv6_options_no_request_dns" in nodes,
                    "description": "Do not request DNS servers over DHCPv6",
                },
                "dhcpv6_options_no_request_domain_name": {
                    "supported": "dhcpv6_options_no_request_domain_name" in nodes,
                    "description": "Do not request a domain name over DHCPv6",
                },
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
            },
            "values": {
                "cipher": mapper.cipher_values(),
                "source_validation": mapper.source_validation_values(),
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_interface_address(self, interface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_address(interface, address))

    def delete_interface_address(self, interface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_address(interface, address))

    def set_interface_disable(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_mtu(self, interface: str, mtu: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mtu(interface, mtu))

    def delete_mtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mtu_path(interface))

    def set_source_interface(self, interface: str, source: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_source_interface(interface, source))

    def delete_source_interface(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_source_interface_path(interface))

    def set_vrf(self, interface: str, vrf: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    def delete_interface(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    # ========================================================================
    # Security Operations
    # ========================================================================

    def set_security_cipher(self, interface: str, cipher: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_cipher(interface, cipher))

    def delete_security_cipher(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_cipher_path(interface))

    def set_security_encrypt(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_encrypt(interface))

    def delete_security_encrypt(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_encrypt(interface))

    def set_security_replay_window(self, interface: str, window: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_replay_window(interface, window))

    def delete_security_replay_window(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_replay_window_path(interface))

    # --- MKA ---
    def delete_security_mka(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_mka_path(interface))

    def set_security_mka_cak(self, interface: str, cak: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_mka_cak(interface, cak))

    def delete_security_mka_cak(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_mka_cak_path(interface))

    def set_security_mka_ckn(self, interface: str, ckn: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_mka_ckn(interface, ckn))

    def delete_security_mka_ckn(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_mka_ckn_path(interface))

    def set_security_mka_priority(self, interface: str, priority: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_mka_priority(interface, priority))

    def delete_security_mka_priority(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_mka_priority_path(interface))

    # --- Static ---
    def delete_security_static(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_path(interface))

    def set_security_static_key(self, interface: str, key: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_static_key(interface, key))

    def delete_security_static_key(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_key_path(interface))

    def set_security_static_peer(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_static_peer(interface, peer))

    def delete_security_static_peer(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_peer(interface, peer))

    def set_security_static_peer_disable(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_static_peer_disable(interface, peer))

    def delete_security_static_peer_disable(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_peer_disable(interface, peer))

    def set_security_static_peer_key(self, interface: str, peer: str, key: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_static_peer_key(interface, peer, key))

    def delete_security_static_peer_key(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_peer_key_path(interface, peer))

    def set_security_static_peer_mac(self, interface: str, peer: str, mac: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_security_static_peer_mac(interface, peer, mac))

    def delete_security_static_peer_mac(self, interface: str, peer: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_security_static_peer_mac_path(interface, peer))

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, mss: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss(interface, mss))

    def set_ip_adjust_mss_clamp_to_pmtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ip_adjust_mss(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_arp_cache_timeout(interface, timeout))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, mode: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_source_validation(interface, mode))

    def delete_ip_source_validation(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_source_validation_path(interface))

    def delete_ip_settings(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_path(interface))

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, count: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_accept_dad(interface, count))

    def delete_ipv6_accept_dad(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_accept_dad_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_eui64(interface, prefix))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._versioned_path(
            "ipv6_address_interface_identifier", "get_ipv6_address_interface_identifier", interface, identifier,
        ))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._versioned_path(
            "ipv6_address_interface_identifier", "get_ipv6_address_interface_identifier_path", interface,
        ))

    def set_ipv6_adjust_mss(self, interface: str, mss: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss(interface, mss))

    def set_ipv6_adjust_mss_clamp_to_pmtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ipv6_adjust_mss(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, time: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_base_reachable_time(interface, time))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_dup_addr_detect_transmits(interface, count))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_source_validation(interface, mode))

    def delete_ipv6_source_validation(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_source_validation_path(interface))

    def delete_ipv6_settings(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_path(interface))

    # ========================================================================
    # DHCP Options
    # ========================================================================

    def set_dhcp_options_client_id(self, interface: str, client_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_client_id(interface, client_id))

    def delete_dhcp_options_client_id(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_client_id_path(interface))

    def set_dhcp_options_host_name(self, interface: str, hostname: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_host_name(interface, hostname))

    def delete_dhcp_options_host_name(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_host_name_path(interface))

    def set_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_vendor_class_id(interface, vendor_id))

    def delete_dhcp_options_vendor_class_id(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_vendor_class_id_path(interface))

    def set_dhcp_options_no_default_route(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_no_default_route(interface))

    def delete_dhcp_options_no_default_route(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_no_default_route(interface))

    def set_dhcp_options_default_route_distance(self, interface: str, distance: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_default_route_distance(interface, distance))

    def delete_dhcp_options_default_route_distance(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_default_route_distance_path(interface))

    def set_dhcp_options_reject(self, interface: str, server: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_reject(interface, server))

    def delete_dhcp_options_reject(self, interface: str, server: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_reject(interface, server))

    def set_dhcp_options_user_class(self, interface: str, user_class: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_user_class(interface, user_class))

    def delete_dhcp_options_user_class(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_user_class_path(interface))

    def set_dhcp_options_mtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_mtu(interface))

    def delete_dhcp_options_mtu(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_mtu(interface))

    def delete_dhcp_options(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_path(interface))

    # ========================================================================
    # DHCPv6 Options
    # ========================================================================

    def set_dhcpv6_options_duid(self, interface: str, duid: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_duid(interface, duid))

    def delete_dhcpv6_options_duid(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_duid_path(interface))

    def set_dhcpv6_options_rapid_commit(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_rapid_commit(interface))

    def delete_dhcpv6_options_rapid_commit(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_rapid_commit(interface))

    def set_dhcpv6_options_no_release(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_no_release(interface))

    def delete_dhcpv6_options_no_release(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_no_release(interface))

    def set_dhcpv6_options_no_request_dns(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._versioned_path(
            "dhcpv6_options_no_request_dns", "get_dhcpv6_options_no_request_dns", interface,
        ))

    def delete_dhcpv6_options_no_request_dns(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._versioned_path(
            "dhcpv6_options_no_request_dns", "get_dhcpv6_options_no_request_dns", interface,
        ))

    def set_dhcpv6_options_no_request_domain_name(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._versioned_path(
            "dhcpv6_options_no_request_domain_name", "get_dhcpv6_options_no_request_domain_name", interface,
        ))

    def delete_dhcpv6_options_no_request_domain_name(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._versioned_path(
            "dhcpv6_options_no_request_domain_name", "get_dhcpv6_options_no_request_domain_name", interface,
        ))

    def set_dhcpv6_options_parameters_only(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_parameters_only(interface))

    def delete_dhcpv6_options_parameters_only(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_parameters_only(interface))

    def set_dhcpv6_options_temporary(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_temporary(interface))

    def delete_dhcpv6_options_temporary(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_temporary(interface))

    def set_dhcpv6_options_pd(self, interface: str, pd_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd(interface, pd_id))

    def delete_dhcpv6_options_pd(self, interface: str, pd_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd(interface, pd_id))

    def set_dhcpv6_options_pd_length(self, interface: str, pd_id: str, length: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_length(interface, pd_id, length))

    def delete_dhcpv6_options_pd_length(self, interface: str, pd_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd_length_path(interface, pd_id))

    def set_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, pd_iface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface(interface, pd_id, pd_iface))

    def delete_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, pd_iface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd_interface(interface, pd_id, pd_iface))

    def set_dhcpv6_options_pd_interface_address(self, interface: str, pd_id: str, pd_iface: str, address: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface_address(interface, pd_id, pd_iface, address))

    def delete_dhcpv6_options_pd_interface_address(self, interface: str, pd_id: str, pd_iface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd_interface_address_path(interface, pd_id, pd_iface))

    def set_dhcpv6_options_pd_interface_sla_id(self, interface: str, pd_id: str, pd_iface: str, sla_id: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface_sla_id(interface, pd_id, pd_iface, sla_id))

    def delete_dhcpv6_options_pd_interface_sla_id(self, interface: str, pd_id: str, pd_iface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd_interface_sla_id_path(interface, pd_id, pd_iface))

    def delete_dhcpv6_options(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_path(interface))

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def delete_mirror(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_path(interface))

    def set_mirror_ingress(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_ingress(interface, destination))

    def delete_mirror_ingress(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_egress(interface, destination))

    def delete_mirror_egress(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_egress_path(interface))

    # ========================================================================
    # Redirect Operation
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_redirect(interface, destination))

    def delete_redirect(self, interface: str) -> "MacsecInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_redirect_path(interface))
