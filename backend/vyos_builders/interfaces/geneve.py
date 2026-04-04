"""
GENEVE Interface Batch Builder

Provides all GENEVE (Generic Network Virtualization Encapsulation) interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class GeneveInterfaceBuilderMixin:
    """Complete batch builder for geneve interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_geneve"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "GeneveInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "GeneveInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "GeneveInterfaceBuilderMixin":
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
                "address": {"supported": True, "description": "IPv4/IPv6 address assignment"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "mtu": {"supported": True, "description": "MTU configuration (1200-16000)"},
                "mac": {"supported": True, "description": "MAC address configuration"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "remote": {"supported": True, "description": "Tunnel remote address (IPv4/IPv6)"},
                "vni": {"supported": True, "description": "Virtual Network Identifier (0-16777214)"},
                "port": {"supported": True, "description": "Port number (default: 6081)"},
                "parameters_ip_df": {"supported": True, "description": "Don't Fragment bit (set/unset/inherit)"},
                "parameters_ip_tos": {"supported": True, "description": "Type of Service (0-99)"},
                "parameters_ip_ttl": {"supported": True, "description": "Time to Live (0-255)"},
                "parameters_ip_innerproto": {"supported": True, "description": "Use IPv4 as inner protocol instead of Ethernet"},
                "parameters_ipv6_flowlabel": {"supported": True, "description": "IPv6 flow label (inherit or hex value)"},
                "ip_adjust_mss": {"supported": True, "description": "Adjust TCP MSS value"},
                "ip_arp_cache_timeout": {"supported": True, "description": "ARP cache entry timeout (1-86400)"},
                "ip_disable_arp_filter": {"supported": True, "description": "Disable ARP filter"},
                "ip_disable_forwarding": {"supported": True, "description": "Disable IPv4 forwarding"},
                "ip_enable_arp_accept": {"supported": True, "description": "Enable ARP accept"},
                "ip_enable_arp_announce": {"supported": True, "description": "Enable ARP announce"},
                "ip_enable_arp_ignore": {"supported": True, "description": "Enable ARP ignore"},
                "ip_enable_directed_broadcast": {"supported": True, "description": "Enable directed broadcast forwarding"},
                "ip_enable_proxy_arp": {"supported": True, "description": "Enable proxy-arp"},
                "ip_proxy_arp_pvlan": {"supported": True, "description": "Enable private VLAN proxy ARP"},
                "ip_source_validation": {"supported": True, "description": "Source validation (strict/loose/disable)"},
                "ipv6_accept_dad": {"supported": True, "description": "Accept Duplicate Address Detection (0/1/2)"},
                "ipv6_adjust_mss": {"supported": True, "description": "Adjust TCP MSS value for IPv6"},
                "ipv6_base_reachable_time": {"supported": True, "description": "Base reachable time (1-86400)"},
                "ipv6_disable_forwarding": {"supported": True, "description": "Disable IPv6 forwarding"},
                "ipv6_dup_addr_detect_transmits": {"supported": True, "description": "DAD NS message count"},
                "ipv6_source_validation": {"supported": True, "description": "IPv6 source validation (strict/loose/disable)"},
                "ipv6_address_autoconf": {"supported": True, "description": "SLAAC auto-configuration"},
                "ipv6_address_eui64": {"supported": True, "description": "IPv6 EUI-64 address generation"},
                "ipv6_address_no_default_link_local": {"supported": True, "description": "Remove default link-local address"},
                "ipv6_address_interface_identifier": {"supported": is_v15, "description": "SLAAC interface identifier (VyOS 1.5+)"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    def set_mac(self, interface: str, mac: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac(interface, mac)
        return self.add_set(path)

    def delete_mac(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # GENEVE-Specific Operations
    # ========================================================================

    def set_remote(self, interface: str, remote: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_remote(interface, remote)
        return self.add_set(path)

    def delete_remote(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_remote_path(interface)
        return self.add_delete(path)

    def set_vni(self, interface: str, vni: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vni(interface, vni)
        return self.add_set(path)

    def delete_vni(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vni_path(interface)
        return self.add_delete(path)

    def set_port(self, interface: str, port: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_port(interface, port)
        return self.add_set(path)

    def delete_port(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_port_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Tunnel Parameters: IP
    # ========================================================================

    def set_parameters_ip_df(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_df(interface, value)
        return self.add_set(path)

    def delete_parameters_ip_df(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_df_path(interface)
        return self.add_delete(path)

    def set_parameters_ip_tos(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_tos(interface, value)
        return self.add_set(path)

    def delete_parameters_ip_tos(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_tos_path(interface)
        return self.add_delete(path)

    def set_parameters_ip_ttl(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_ttl(interface, value)
        return self.add_set(path)

    def delete_parameters_ip_ttl(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_ttl_path(interface)
        return self.add_delete(path)

    def set_parameters_ip_innerproto(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_innerproto(interface)
        return self.add_set(path)

    def delete_parameters_ip_innerproto(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_innerproto(interface)
        return self.add_delete(path)

    # ========================================================================
    # Tunnel Parameters: IPv6
    # ========================================================================

    def set_parameters_ipv6_flowlabel(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ipv6_flowlabel(interface, value)
        return self.add_set(path)

    def delete_parameters_ipv6_flowlabel(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_parameters_ipv6_flowlabel_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, value)
        return self.add_set(path)

    def delete_ip_adjust_mss(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_path(interface)
        return self.add_delete(path)

    def set_ip_arp_cache_timeout(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, value)
        return self.add_set(path)

    def delete_ip_arp_cache_timeout(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout_path(interface)
        return self.add_delete(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def delete_ip_disable_arp_filter(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_delete(path)

    def set_ip_disable_forwarding(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ip_disable_forwarding(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_accept(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_announce(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_ignore(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_delete(path)

    def set_ip_enable_directed_broadcast(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_set(path)

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_delete(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def delete_ip_enable_proxy_arp(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_delete(path)

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_set(path)

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_delete(path)

    def set_ip_source_validation(self, interface: str, mode: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_accept_dad(interface, value)
        return self.add_set(path)

    def delete_ipv6_accept_dad(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_accept_dad_path(interface)
        return self.add_delete(path)

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, value)
        return self.add_set(path)

    def delete_ipv6_adjust_mss(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_path(interface)
        return self.add_delete(path)

    def set_ipv6_base_reachable_time(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time(interface, value)
        return self.add_set(path)

    def delete_ipv6_base_reachable_time(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time_path(interface)
        return self.add_delete(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ipv6_disable_forwarding(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, value)
        return self.add_set(path)

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits_path(interface)
        return self.add_delete(path)

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ipv6_source_validation(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation_path(interface)
        return self.add_delete(path)

    def set_ipv6_address_autoconf(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_set(path)

    def delete_ipv6_address_autoconf(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_delete(path)

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_delete(path)

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_set(path)

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_delete(path)

    # --- VyOS 1.5+ only ---
    def set_ipv6_address_interface_identifier(self, interface: str, value: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier(interface, value)
        return self.add_set(path)

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Redirect Operation
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "GeneveInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)
