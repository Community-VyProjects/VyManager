"""
Flowtables Batch Builder

Provides batch operations for firewall flowtables.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FlowtablesBatchBuilder:
    """Batch builder for flowtable operations."""

    def __init__(self, version: str):
        """Initialize flowtables batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_flowtables"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FlowtablesBatchBuilder":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FlowtablesBatchBuilder":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
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
    # Flowtable Operations
    # ========================================================================

    def set_flowtable(self, name: str) -> "FlowtablesBatchBuilder":
        """Create a flowtable."""
        path = self.mappers[self.mapper_key].get_flowtable(name)
        return self.add_set(path)

    def delete_flowtable(self, name: str) -> "FlowtablesBatchBuilder":
        """Delete a flowtable."""
        path = self.mappers[self.mapper_key].get_flowtable(name)
        return self.add_delete(path)

    def set_flowtable_description(
        self, name: str, description: str
    ) -> "FlowtablesBatchBuilder":
        """Set flowtable description."""
        path = self.mappers[self.mapper_key].get_flowtable_description(name, description)
        return self.add_set(path)

    def delete_flowtable_description(self, name: str) -> "FlowtablesBatchBuilder":
        """Delete flowtable description."""
        path = self.mappers[self.mapper_key].get_flowtable_description_path(name)
        return self.add_delete(path)

    def set_flowtable_interface(
        self, name: str, interface: str
    ) -> "FlowtablesBatchBuilder":
        """Add an interface to the flowtable."""
        path = self.mappers[self.mapper_key].get_flowtable_interface(name, interface)
        return self.add_set(path)

    def delete_flowtable_interface(
        self, name: str, interface: str
    ) -> "FlowtablesBatchBuilder":
        """Remove an interface from the flowtable."""
        path = self.mappers[self.mapper_key].get_flowtable_interface(name, interface)
        return self.add_delete(path)

    def set_flowtable_offload(
        self, name: str, offload_type: str
    ) -> "FlowtablesBatchBuilder":
        """Set flowtable offload type (hardware or software)."""
        path = self.mappers[self.mapper_key].get_flowtable_offload(name, offload_type)
        return self.add_set(path)

    def delete_flowtable_offload(self, name: str) -> "FlowtablesBatchBuilder":
        """Delete flowtable offload setting."""
        path = self.mappers[self.mapper_key].get_flowtable_offload_path(name)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get flowtables capabilities based on VyOS version."""
        return {
            "version": self.version,
            "features": {
                "flowtables": {
                    "supported": True,
                    "description": "Flowtable configuration for packet offloading",
                },
                "hardware_offload": {
                    "supported": True,
                    "description": "Hardware-based packet offloading (NIC-based)",
                },
                "software_offload": {
                    "supported": True,
                    "description": "Software-based packet offloading (kernel-based)",
                },
            },
            "offload_types": ["software", "hardware"],
        }
