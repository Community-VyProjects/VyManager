"""
Flowtables Mapper

Handles path generation for VyOS flowtable commands.
Flowtables syntax is the same in VyOS 1.4 and 1.5.
"""

from typing import List


class FlowtablesMapper:
    """Mapper for firewall flowtable commands."""

    def __init__(self, version: str):
        self.version = version

    # ========================================================================
    # Flowtable paths
    # ========================================================================

    def get_flowtable(self, name: str) -> List[str]:
        """Get path for flowtable creation."""
        return ["firewall", "flowtable", name]

    def get_flowtable_description(self, name: str, description: str) -> List[str]:
        """Get path for flowtable description."""
        return ["firewall", "flowtable", name, "description", description]

    def get_flowtable_description_path(self, name: str) -> List[str]:
        """Get path for flowtable description (for delete)."""
        return ["firewall", "flowtable", name, "description"]

    def get_flowtable_interface(self, name: str, interface: str) -> List[str]:
        """Get path for flowtable interface."""
        return ["firewall", "flowtable", name, "interface", interface]

    def get_flowtable_interface_path(self, name: str) -> List[str]:
        """Get path for flowtable interfaces (for delete all)."""
        return ["firewall", "flowtable", name, "interface"]

    def get_flowtable_offload(self, name: str, offload_type: str) -> List[str]:
        """Get path for flowtable offload type (hardware or software)."""
        return ["firewall", "flowtable", name, "offload", offload_type]

    def get_flowtable_offload_path(self, name: str) -> List[str]:
        """Get path for flowtable offload (for delete)."""
        return ["firewall", "flowtable", name, "offload"]
