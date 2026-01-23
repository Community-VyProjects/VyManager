"""
Dummy Interface Command Mapper

Handles dummy (virtual) interface commands.
Dummy interfaces do not support physical properties like speed/duplex.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class DummyInterfaceMapper(BaseFeatureMapper):
    """Dummy interface mapper with all dummy interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "dummy"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for setting interface description."""
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting interface address."""
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for setting interface MTU."""
        return ["interfaces", self.interface_type, interface, "mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        """Get command path for MTU property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mtu"]

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for an interface (for deletion)."""
        return ["interfaces", self.interface_type, interface]

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling an interface."""
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    # Note: Dummy interfaces do NOT support speed/duplex (ethernet-only)

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single dummy interface configuration from VyOS (version-aware).

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
        # Version-aware parsing
        if self.version == "1.4":
            return self._parse_interface_v14(name, config)
        elif self.version == "1.5":
            return self._parse_interface_v15(name, config)
        else:
            # Default to 1.5 parsing for unknown versions
            return self._parse_interface_v15(name, config)

    def _parse_interface_v14(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse dummy interface configuration for VyOS 1.4.x.

        Args:
            name: Interface name
            config: Raw interface config dictionary

        Returns:
            Parsed interface data
        """
        # Parse addresses (can be string or list)
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        # Check if interface is disabled
        disabled = "disable" in config

        # Dummy interfaces don't have hw_id, duplex, or speed
        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": disabled if disabled else None,
        }

    def _parse_interface_v15(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse dummy interface configuration for VyOS 1.5.x.

        Args:
            name: Interface name
            config: Raw interface config dictionary

        Returns:
            Parsed interface data
        """
        # Parse addresses (can be string or list)
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        # Check if interface is disabled
        disabled = "disable" in config

        # VyOS 1.5 structure (same as 1.4 for now, but can differ in future)
        # Dummy interfaces don't have hw_id, duplex, or speed
        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": disabled if disabled else None,
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all dummy interfaces.

        Args:
            config: Raw config dictionary for dummy interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
        }
