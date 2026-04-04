"""
Dummy Interface Batch Builder

Provides all dummy interface batch operations.
Dummy interfaces do not support physical properties like speed/duplex.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DummyInterfaceBuilderMixin:
    """Complete batch builder for dummy interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_dummy"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DummyInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DummyInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "DummyInterfaceBuilderMixin":
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
                "mtu": {"supported": True, "description": "MTU configuration (68-16000)"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "ip_disable_forwarding": {"supported": True, "description": "Disable IPv4 forwarding"},
                "ip_source_validation": {"supported": True, "description": "Source validation (strict/loose/disable)"},
                "ipv6_disable_forwarding": {"supported": True, "description": "Disable IPv6 forwarding"},
                "ipv6_address_eui64": {"supported": True, "description": "IPv6 EUI-64 address generation"},
                "ipv6_address_no_default_link_local": {"supported": True, "description": "Remove default link-local address"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
                "mac": {"supported": is_v15, "description": "MAC address configuration (VyOS 1.5+)"},
                "netns": {"supported": is_v15, "description": "Network namespace assignment (VyOS 1.5+)"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_disable_forwarding(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ip_disable_forwarding(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ip_source_validation(self, interface: str, mode: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_disable_forwarding(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ipv6_disable_forwarding(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_delete(path)

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_set(path)

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Redirect Operation
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # VyOS 1.5+ Only Operations
    # ========================================================================

    def set_mac(self, interface: str, mac: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac(interface, mac)
        return self.add_set(path)

    def delete_mac(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mac_path(interface)
        return self.add_delete(path)

    def set_netns(self, interface: str, netns: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_netns(interface, netns)
        return self.add_set(path)

    def delete_netns(self, interface: str) -> "DummyInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_netns_path(interface)
        return self.add_delete(path)
