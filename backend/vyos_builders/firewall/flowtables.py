"""
Flowtables Batch Builder

Provides batch operations for firewall flowtables.
"""

from typing import Dict, Any
from vyos_mappers import CommandMapperRegistry
from vyos_builders.base import BatchBuilder


class FlowtablesBatchBuilder(BatchBuilder):
    """Batch builder for flowtable operations."""

    def __init__(self, version: str):
        """Initialize flowtables batch builder."""
        super().__init__(version)
        self.mapper_key = "firewall_flowtables"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

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
