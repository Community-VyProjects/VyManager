"""
Loopback Interface Batch Builder

Provides all loopback interface batch operations.
Loopback supports: address, description, ip source-validation, mirror, redirect.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class LoopbackInterfaceBuilderMixin:
    """Complete batch builder for loopback interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_loopback"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "LoopbackInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LoopbackInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "LoopbackInterfaceBuilderMixin":
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
                "ip_source_validation": {"supported": True, "description": "Source validation (strict/loose/disable)"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_source_validation(self, interface: str, mode: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Redirect Operation
    # ========================================================================

    def set_redirect(self, interface: str, destination: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "LoopbackInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)
