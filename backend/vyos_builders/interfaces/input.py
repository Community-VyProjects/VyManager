"""
Input (IFB) Interface Batch Builder

Provides all input interface batch operations.
Input interfaces support description, disable, and redirect.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry
from vyos_builders.base import BatchBuilder


class InputInterfaceBuilderMixin(BatchBuilder):
    """Complete batch builder for input (IFB) interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_mapper_key = "interface_input"
        self.mappers = {self.interface_mapper_key: CommandMapperRegistry.get_mapper(self.interface_mapper_key, version)}

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_multiple_sets(self, paths: List[List[str]]) -> "InputInterfaceBuilderMixin":
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        self._operations = []

    def operation_count(self) -> int:
        return len(self._operations)

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
