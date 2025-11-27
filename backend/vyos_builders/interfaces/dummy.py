"""
Dummy Interface Batch Builder

Provides all dummy interface batch operations.
Dummy interfaces do not support physical properties like speed/duplex.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DummyInterfaceBuilderMixin:
    """Complete batch builder for dummy interface operations"""

    def __init__(self, version: str):
        """Initialize dummy interface batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get all feature mappers for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_dummy"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DummyInterfaceBuilderMixin":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DummyInterfaceBuilderMixin":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "DummyInterfaceBuilderMixin":
        """Add multiple 'set' operations to the batch."""
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Dummy Interface Operations
    # ========================================================================

    def set_interface_description(
        self, interface: str, description: str
    ) -> "DummyInterfaceBuilderMixin":
        """Set interface description"""
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "DummyInterfaceBuilderMixin":
        """Delete interface description"""
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(
        self, interface: str, address: str
    ) -> "DummyInterfaceBuilderMixin":
        """Set interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(
        self, interface: str, address: str
    ) -> "DummyInterfaceBuilderMixin":
        """Delete interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(
        self, interface: str, mtu: str
    ) -> "DummyInterfaceBuilderMixin":
        """Set interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "DummyInterfaceBuilderMixin":
        """Delete interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "DummyInterfaceBuilderMixin":
        """Delete entire interface configuration"""
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "DummyInterfaceBuilderMixin":
        """Disable interface (administratively down)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "DummyInterfaceBuilderMixin":
        """Enable interface (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "DummyInterfaceBuilderMixin":
        """Assign interface to VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str, vrf: str) -> "DummyInterfaceBuilderMixin":
        """Remove interface from VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_delete(path)

    # Note: Dummy interfaces do NOT support speed/duplex (ethernet-only operations)
