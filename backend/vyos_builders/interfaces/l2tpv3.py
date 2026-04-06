"""
L2TPv3 Interface Batch Builder

Provides all L2TPv3 interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class L2TPv3InterfaceBuilderMixin:
    """Complete batch builder for L2TPv3 interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_l2tpv3"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "L2TPv3InterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "L2TPv3InterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "L2TPv3InterfaceBuilderMixin":
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
                "mtu": {"supported": True, "description": "MTU configuration (68-16000, default 1488)"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "remote": {"supported": True, "description": "Tunnel remote address"},
                "source_address": {"supported": True, "description": "Source IP address for tunnel"},
                "tunnel_id": {"supported": True, "description": "Local tunnel identifier (1-429496729)"},
                "peer_tunnel_id": {"supported": True, "description": "Peer tunnel identifier (1-429496729)"},
                "session_id": {"supported": True, "description": "Session identifier (1-429496729)"},
                "peer_session_id": {"supported": True, "description": "Peer session identifier (1-429496729)"},
                "encapsulation": {"supported": True, "description": "Encapsulation type (udp/ip, default udp)"},
                "destination_port": {"supported": True, "description": "UDP destination port (1-65535, default 5000)"},
                "source_port": {"supported": True, "description": "UDP source port (1-65535, default 5000)"},
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
                "ipv6_address_autoconf": {"supported": True, "description": "IPv6 SLAAC autoconfig"},
                "ipv6_address_eui64": {"supported": True, "description": "IPv6 EUI-64 address generation"},
                "ipv6_address_interface_identifier": {"supported": True, "description": "SLAAC interface identifier"},
                "ipv6_address_no_default_link_local": {"supported": True, "description": "Remove default link-local address"},
                "ipv6_adjust_mss": {"supported": True, "description": "Adjust IPv6 TCP MSS value"},
                "ipv6_base_reachable_time": {"supported": True, "description": "Base reachable time (1-86400)"},
                "ipv6_disable_forwarding": {"supported": True, "description": "Disable IPv6 forwarding"},
                "ipv6_dup_addr_detect_transmits": {"supported": True, "description": "DAD NS message count"},
                "ipv6_source_validation": {"supported": True, "description": "IPv6 source validation (strict/loose/disable)"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # L2TPv3-Specific Tunnel Operations
    # ========================================================================

    def set_remote(self, interface: str, address: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_remote(interface, address)
        return self.add_set(path)

    def delete_remote(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_remote_path(interface)
        return self.add_delete(path)

    def set_source_address(self, interface: str, address: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_address(interface, address)
        return self.add_set(path)

    def delete_source_address(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_address_path(interface)
        return self.add_delete(path)

    def set_tunnel_id(self, interface: str, tid: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_tunnel_id(interface, tid)
        return self.add_set(path)

    def delete_tunnel_id(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_tunnel_id_path(interface)
        return self.add_delete(path)

    def set_peer_tunnel_id(self, interface: str, tid: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_peer_tunnel_id(interface, tid)
        return self.add_set(path)

    def delete_peer_tunnel_id(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_peer_tunnel_id_path(interface)
        return self.add_delete(path)

    def set_session_id(self, interface: str, sid: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_session_id(interface, sid)
        return self.add_set(path)

    def delete_session_id(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_session_id_path(interface)
        return self.add_delete(path)

    def set_peer_session_id(self, interface: str, sid: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_peer_session_id(interface, sid)
        return self.add_set(path)

    def delete_peer_session_id(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_peer_session_id_path(interface)
        return self.add_delete(path)

    def set_encapsulation(self, interface: str, encap: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_encapsulation(interface, encap)
        return self.add_set(path)

    def delete_encapsulation(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_encapsulation_path(interface)
        return self.add_delete(path)

    def set_destination_port(self, interface: str, port: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_destination_port(interface, port)
        return self.add_set(path)

    def delete_destination_port(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_destination_port_path(interface)
        return self.add_delete(path)

    def set_source_port(self, interface: str, port: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_port(interface, port)
        return self.add_set(path)

    def delete_source_port(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_source_port_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, value: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, value)
        return self.add_set(path)

    def delete_ip_adjust_mss(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_path(interface)
        return self.add_delete(path)

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def delete_ip_arp_cache_timeout(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout_path(interface)
        return self.add_delete(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def delete_ip_disable_arp_filter(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_delete(path)

    def set_ip_disable_forwarding(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ip_disable_forwarding(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_accept(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_announce(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_delete(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def delete_ip_enable_arp_ignore(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_delete(path)

    def set_ip_enable_directed_broadcast(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_set(path)

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_delete(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def delete_ip_enable_proxy_arp(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_delete(path)

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_set(path)

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_delete(path)

    def set_ip_source_validation(self, interface: str, mode: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, value: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_accept_dad(interface, value)
        return self.add_set(path)

    def delete_ipv6_accept_dad(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_accept_dad_path(interface)
        return self.add_delete(path)

    def set_ipv6_address_autoconf(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_set(path)

    def delete_ipv6_address_autoconf(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_delete(path)

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_delete(path)

    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier(interface, identifier)
        return self.add_set(path)

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_interface_identifier_path(interface)
        return self.add_delete(path)

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_set(path)

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_delete(path)

    def set_ipv6_adjust_mss(self, interface: str, value: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, value)
        return self.add_set(path)

    def delete_ipv6_adjust_mss(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_path(interface)
        return self.add_delete(path)

    def set_ipv6_base_reachable_time(self, interface: str, time: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time(interface, time)
        return self.add_set(path)

    def delete_ipv6_base_reachable_time(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_base_reachable_time_path(interface)
        return self.add_delete(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ipv6_disable_forwarding(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, value)
        return self.add_set(path)

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits_path(interface)
        return self.add_delete(path)

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ipv6_source_validation(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "L2TPv3InterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)
