"""
VTI (Virtual Tunnel Interface) Batch Builder

Provides all batch operations for VTI interfaces (`interfaces vti vtiN`).
VTI interfaces are XFRM-based tunnel interfaces typically used with IPsec.
Supported on both VyOS 1.4 and 1.5 with identical feature sets.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VtiInterfaceBuilderMixin:
    """Complete batch builder for VTI interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_vti"

    # =========================================================================
    # Core batch helpers
    # =========================================================================

    def add_set(self, path: List[str]) -> "VtiInterfaceBuilderMixin":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VtiInterfaceBuilderMixin":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def _mapper(self):
        return self.mappers[self.interface_mapper_key]

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        is_v14 = not is_v15
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "supported": True,
            "interface_naming": "vtiN (e.g., vti0, vti1)",
            "features": {
                "address": {
                    "supported": True,
                    "description": "IPv4/IPv6 address assignment",
                    "multi": True,
                },
                "description": {
                    "supported": True,
                    "description": "Interface description (max 255 chars)",
                },
                "disable": {
                    "supported": True,
                    "description": "Administratively disable the interface",
                },
                "mtu": {
                    "supported": True,
                    "description": "MTU (68-16000 bytes, default 1500)",
                },
                "vrf": {
                    "supported": True,
                    "description": "VRF instance assignment",
                },
                "redirect": {
                    "supported": True,
                    "description": "Redirect incoming packets to another interface",
                },
                "mirror": {
                    "supported": True,
                    "description": "Mirror ingress/egress traffic to a destination interface",
                    "directions": ["ingress", "egress"],
                },
                "ip": {
                    "supported": True,
                    "description": "IPv4 routing parameters",
                    "options": [
                        "adjust_mss",
                        "arp_cache_timeout",
                        "disable_arp_filter",
                        "disable_forwarding",
                        "enable_arp_accept",
                        "enable_arp_announce",
                        "enable_arp_ignore",
                        "enable_directed_broadcast",
                        "enable_proxy_arp",
                        "proxy_arp_pvlan",
                        "source_validation",
                    ],
                },
                "ipv6": {
                    "supported": True,
                    "description": "IPv6 routing parameters",
                    "options": [
                        "accept_dad",
                        "address_autoconf",
                        "address_eui64",
                        "address_no_default_link_local",
                        "adjust_mss",
                        "base_reachable_time",
                        "disable_forwarding",
                        "dup_addr_detect_transmits",
                        "source_validation",
                    ],
                },
            },
        }

    # =========================================================================
    # Interface lifecycle
    # =========================================================================

    def delete_interface(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    # =========================================================================
    # Basic properties
    # =========================================================================

    def set_interface_description(self, interface: str, description: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_interface_address(self, interface: str, address: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_address(interface, address))

    def delete_interface_address(self, interface: str, address: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_address(interface, address))

    def delete_interface_addresses(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_address_path(interface))

    def set_interface_mtu(self, interface: str, mtu: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mtu(interface, mtu))

    def delete_interface_mtu(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mtu_path(interface))

    def set_interface_disable(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_interface_vrf(self, interface: str, vrf: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_interface_vrf(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    # =========================================================================
    # Redirect
    # =========================================================================

    def set_redirect(self, interface: str, destination: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_redirect(interface, destination))

    def delete_redirect(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_redirect_path(interface))

    # =========================================================================
    # Mirror
    # =========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_ingress(interface, destination))

    def delete_mirror_ingress(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, destination: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_egress(interface, destination))

    def delete_mirror_egress(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_egress_path(interface))

    # =========================================================================
    # IP settings
    # =========================================================================

    def set_ip_adjust_mss(self, interface: str, value: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss(interface, value))

    def delete_ip_adjust_mss(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_arp_cache_timeout(interface, timeout))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, mode: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_source_validation(interface, mode))

    def delete_ip_source_validation(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_source_validation_path(interface))

    # =========================================================================
    # IPv6 settings
    # =========================================================================

    def set_ipv6_accept_dad(self, interface: str, value: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_accept_dad(interface, value))

    def delete_ipv6_accept_dad(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_accept_dad_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64_all(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_eui64_path(interface))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss(interface, value))

    def delete_ipv6_adjust_mss(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, value: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_base_reachable_time(interface, value))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_dup_addr_detect_transmits(interface, value))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "VtiInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_source_validation(interface, mode))

    def delete_ipv6_source_validation(self, interface: str) -> "VtiInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_source_validation_path(interface))
