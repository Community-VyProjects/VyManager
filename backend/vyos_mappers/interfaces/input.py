"""
Input (IFB) Interface Command Mapper

Handles Input Functional Block (IFB) interface commands.
Input interfaces are simple interfaces with description, disable, and redirect.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class InputInterfaceMapper(BaseFeatureMapper):
    """Input (IFB) interface mapper with all input interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "input"

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single input interface configuration from VyOS."""
        result = {
            "name": name,
            "type": self.interface_type,
            "description": config.get("description"),
            "disable": "disable" in config or None,
            "redirect": config.get("redirect"),
        }

        # Normalize disable: None if False to keep response clean
        if result["disable"] is False:
            result["disable"] = None

        return result

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all input interfaces."""
        interfaces = []

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
        }
