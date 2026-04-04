"""
Input (IFB) Interface Batch Builder

Provides all input interface batch operations.
Input interfaces support description, disable, and redirect.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class InputInterfaceBuilderMixin:
    """Complete batch builder for input (IFB) interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_input"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "InputInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "InputInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "InputInterfaceBuilderMixin":
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
                "description": {"supported": True, "description": "Interface description (max 255 characters)"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
            },
        }

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface_description(self, interface: str, description: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_redirect(self, interface: str, destination: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_redirect_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "InputInterfaceBuilderMixin":
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)
