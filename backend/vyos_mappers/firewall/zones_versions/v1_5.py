"""
VyOS 1.5 Firewall Zones Mapper

In VyOS 1.5, zone interfaces are configured under a `member` hierarchy:
    firewall zone <zone> member interface <iface>
    firewall zone <zone> member vrf <vrf>

VyOS 1.5 also adds `default-firewall` for applying a ruleset to default traffic.
"""

from typing import List
from ..zones import FirewallZonesMapper


class FirewallZonesMapper_v1_5(FirewallZonesMapper):
    """VyOS 1.5-specific firewall zones mapper."""

    # ========================================================================
    # Interface / VRF Operations (1.5 style — under `member`)
    # ========================================================================

    def get_zone_member_interface(self, zone_name: str, interface: str) -> List[str]:
        """Add an interface under member."""
        self._require_zone_node("member-interface")
        return ["firewall", "zone", zone_name, "member", "interface", interface]

    def get_zone_member_interface_path(self, zone_name: str) -> List[str]:
        """Member interface node (for deletion)."""
        self._require_zone_node("member-interface")
        return ["firewall", "zone", zone_name, "member", "interface"]

    def get_zone_member_vrf(self, zone_name: str, vrf: str) -> List[str]:
        """Add a VRF under member."""
        self._require_zone_node("member-vrf")
        return ["firewall", "zone", zone_name, "member", "vrf", vrf]

    def get_zone_member_vrf_path(self, zone_name: str) -> List[str]:
        """Member vrf node (for deletion)."""
        self._require_zone_node("member-vrf")
        return ["firewall", "zone", zone_name, "member", "vrf"]

    def assigned_interface_path(self, zone_name: str, interface: str) -> List[str]:
        """Path used to assign an interface on this device."""
        return self.get_zone_member_interface(zone_name, interface)

    def assigned_vrf_path(self, zone_name: str, vrf: str) -> List[str]:
        """Path used to assign a VRF on this device."""
        return self.get_zone_member_vrf(zone_name, vrf)

    # ========================================================================
    # Default Firewall Operations (VyOS 1.5+ only)
    # ========================================================================

    def get_zone_default_firewall_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Default-firewall IPv4 ruleset."""
        self._require_zone_node("default-firewall")
        return ["firewall", "zone", zone_name, "default-firewall", "name", ruleset]

    def get_zone_default_firewall_name_path(self, zone_name: str) -> List[str]:
        """Default-firewall name node (for deletion)."""
        self._require_zone_node("default-firewall")
        return ["firewall", "zone", zone_name, "default-firewall", "name"]

    def get_zone_default_firewall_ipv6_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Default-firewall IPv6 ruleset."""
        self._require_zone_node("default-firewall")
        return ["firewall", "zone", zone_name, "default-firewall", "ipv6-name", ruleset]

    def get_zone_default_firewall_ipv6_name_path(self, zone_name: str) -> List[str]:
        """Default-firewall ipv6-name node (for deletion)."""
        self._require_zone_node("default-firewall")
        return ["firewall", "zone", zone_name, "default-firewall", "ipv6-name"]

    # ========================================================================
    # Alias for backwards compatibility in router (1.4-style raises ValueError)
    # ========================================================================

    def get_zone_interface(self, zone_name: str, interface: str) -> List[str]:
        """Zone-level interface is not on this device."""
        self._require_zone_node("interface")
        raise ValueError("firewall zone interface is not supported on this device")
