"""
Tunnel Interface Command Mapper

Handles tunnel interface commands (GRE, IPIP, SIT, IP6IP6, etc.).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class TunnelInterfaceMapper(BaseFeatureMapper):
    """Tunnel interface mapper with all tunnel interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "tunnel"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for creating a tunnel interface."""
        return ["interfaces", self.interface_type, interface]

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

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling an interface."""
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        """Get command path for VRF (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vrf"]

    # Tunnel-specific settings
    def get_encapsulation(self, interface: str, encap: str) -> List[str]:
        """Get command path for encapsulation type (gre, gretap, ipip, sit, ip6ip6, ip6gre, etc.)."""
        return ["interfaces", self.interface_type, interface, "encapsulation", encap]

    def get_encapsulation_path(self, interface: str) -> List[str]:
        """Get command path for encapsulation (for deletion)."""
        return ["interfaces", self.interface_type, interface, "encapsulation"]

    def get_source_address(self, interface: str, source: str) -> List[str]:
        """Get command path for tunnel source address."""
        return ["interfaces", self.interface_type, interface, "source-address", source]

    def get_source_address_path(self, interface: str) -> List[str]:
        """Get command path for source address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-address"]

    def get_remote(self, interface: str, remote: str) -> List[str]:
        """Get command path for tunnel remote endpoint."""
        return ["interfaces", self.interface_type, interface, "remote", remote]

    def get_remote_path(self, interface: str) -> List[str]:
        """Get command path for remote (for deletion)."""
        return ["interfaces", self.interface_type, interface, "remote"]

    def get_source_interface(self, interface: str, source_if: str) -> List[str]:
        """Get command path for source interface (alternative to source-address)."""
        return ["interfaces", self.interface_type, interface, "source-interface", source_if]

    def get_source_interface_path(self, interface: str) -> List[str]:
        """Get command path for source interface (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-interface"]

    # TTL/Hop limit
    def get_ttl(self, interface: str, ttl: str) -> List[str]:
        """Get command path for TTL."""
        return ["interfaces", self.interface_type, interface, "ip", "ttl", ttl]

    def get_ttl_path(self, interface: str) -> List[str]:
        """Get command path for TTL (for deletion)."""
        return ["interfaces", self.interface_type, interface, "ip", "ttl"]

    # Key (for GRE tunnels)
    def get_key(self, interface: str, key: str) -> List[str]:
        """Get command path for GRE key."""
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "key", key]

    def get_key_path(self, interface: str) -> List[str]:
        """Get command path for key (for deletion)."""
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "key"]

    # DF bit (Don't Fragment)
    def get_dont_fragment(self, interface: str) -> List[str]:
        """Get command path for enabling don't fragment bit."""
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "dont-fragment"]

    def get_dont_fragment_path(self, interface: str) -> List[str]:
        """Get command path for don't fragment (for deletion)."""
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "dont-fragment"]

    # Ignore DF bit
    def get_ignore_df(self, interface: str) -> List[str]:
        """Get command path for ignoring don't fragment bit."""
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "ignore-df"]

    # Enable multicast
    def get_multicast(self, interface: str) -> List[str]:
        """Get command path for enabling multicast."""
        return ["interfaces", self.interface_type, interface, "multicast", "enable"]

    def get_multicast_path(self, interface: str) -> List[str]:
        """Get command path for multicast (for deletion)."""
        return ["interfaces", self.interface_type, interface, "multicast"]

    # 6rd specific (for SIT tunnels)
    def get_6rd_prefix(self, interface: str, prefix: str) -> List[str]:
        """Get command path for 6rd prefix."""
        return ["interfaces", self.interface_type, interface, "6rd-prefix", prefix]

    def get_6rd_relay_prefix(self, interface: str, prefix: str) -> List[str]:
        """Get command path for 6rd relay prefix."""
        return ["interfaces", self.interface_type, interface, "6rd-relay-prefix", prefix]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single tunnel interface configuration from VyOS.

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
        # Parse addresses
        addresses = self._parse_addresses(config)

        # Parse parameters
        params = config.get("parameters", {})
        ip_params = params.get("ip", {}) if isinstance(params, dict) else {}

        # Parse multicast
        multicast = None
        if "multicast" in config:
            mc = config["multicast"]
            multicast = "enable" in mc if isinstance(mc, dict) else False

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": "disable" in config,
            # Tunnel-specific
            "encapsulation": config.get("encapsulation"),
            "source_address": config.get("source-address"),
            "source_interface": config.get("source-interface"),
            "remote": config.get("remote"),
            "key": ip_params.get("key") if isinstance(ip_params, dict) else None,
            "dont_fragment": "dont-fragment" in ip_params if isinstance(ip_params, dict) else False,
            "ignore_df": "ignore-df" in ip_params if isinstance(ip_params, dict) else False,
            "multicast": multicast,
            # 6rd specific
            "6rd_prefix": config.get("6rd-prefix"),
            "6rd_relay_prefix": config.get("6rd-relay-prefix"),
            # IP settings
            "ttl": config.get("ip", {}).get("ttl") if isinstance(config.get("ip"), dict) else None,
        }

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        """Parse addresses."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all tunnel interfaces.

        Args:
            config: Raw config dictionary for tunnel interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}
        by_encap = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            # Count by encapsulation type
            if interface.get("encapsulation"):
                encap = interface["encapsulation"]
                by_encap[encap] = by_encap.get(encap, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
            "by_encapsulation": by_encap,
        }
