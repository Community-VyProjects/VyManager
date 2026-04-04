"""
Dummy Interface Command Mapper

Handles dummy (virtual) interface commands.
Dummy interfaces do not support physical properties like speed/duplex.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class DummyInterfaceMapper(BaseFeatureMapper):
    """Dummy interface mapper with all dummy interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "dummy"

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

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # --- IP settings ---
    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    # --- IPv6 settings ---
    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_eui64_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

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
        """Parse a single dummy interface configuration from VyOS."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_addr_config = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}

        # IPv6 EUI-64 prefixes
        eui64 = ipv6_addr_config.get("eui64")
        if isinstance(eui64, str):
            eui64 = [eui64]
        elif not isinstance(eui64, list):
            eui64 = []

        result = {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": "disable" in config or None,
            # IP settings
            "ip_disable_forwarding": "disable-forwarding" in ip_config,
            "ip_source_validation": ip_config.get("source-validation"),
            # IPv6 settings
            "ipv6_disable_forwarding": "disable-forwarding" in ipv6_config,
            "ipv6_address_eui64": eui64,
            "ipv6_address_no_default_link_local": "no-default-link-local" in ipv6_addr_config,
            # Mirror
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
            # Redirect
            "redirect": config.get("redirect"),
            # VyOS 1.5+ only
            "mac": config.get("mac"),
            "netns": config.get("netns"),
        }

        # Normalize disable: None if False to keep response clean
        if result["disable"] is False:
            result["disable"] = None
        if not result["ip_disable_forwarding"]:
            result["ip_disable_forwarding"] = None
        if not result["ipv6_disable_forwarding"]:
            result["ipv6_disable_forwarding"] = None
        if not result["ipv6_address_no_default_link_local"]:
            result["ipv6_address_no_default_link_local"] = None

        return result

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all dummy interfaces."""
        interfaces = []
        by_vrf: Dict[str, int] = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
        }
