"""
Loopback Interface Command Mapper

Handles loopback interface commands.
Loopback interfaces are limited to a single instance (lo) and support
address, description, ip source-validation, mirror, and redirect.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class LoopbackInterfaceMapper(BaseFeatureMapper):
    """Loopback interface mapper with all loopback interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "loopback"

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

    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["address"]

    # --- IP settings ---
    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    # --- Mirror ---
    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # --- Redirect ---
    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single loopback interface configuration from VyOS."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        ip_config = config.get("ip", {}) or {}
        mirror_config = config.get("mirror", {}) or {}

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "ip_source_validation": ip_config.get("source-validation"),
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
            "redirect": config.get("redirect"),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all loopback interfaces."""
        interfaces = []

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
