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
        """Get command path for adding an interface to a zone (VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "member", "interface", interface]

    def get_zone_member_interface_path(self, zone_name: str) -> List[str]:
        """Get command path for member interface node (for deletion, VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "member", "interface"]

    def get_zone_member_vrf(self, zone_name: str, vrf: str) -> List[str]:
        """Get command path for adding a VRF to a zone (VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "member", "vrf", vrf]

    def get_zone_member_vrf_path(self, zone_name: str) -> List[str]:
        """Get command path for member vrf node (for deletion, VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "member", "vrf"]

    # ========================================================================
    # Default Firewall Operations (VyOS 1.5+ only)
    # ========================================================================

    def get_zone_default_firewall_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Get command path for default-firewall IPv4 ruleset (VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "default-firewall", "name", ruleset]

    def get_zone_default_firewall_name_path(self, zone_name: str) -> List[str]:
        """Get command path for default-firewall name node (for deletion)."""
        return ["firewall", "zone", zone_name, "default-firewall", "name"]

    def get_zone_default_firewall_ipv6_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Get command path for default-firewall IPv6 ruleset (VyOS 1.5)."""
        return ["firewall", "zone", zone_name, "default-firewall", "ipv6-name", ruleset]

    def get_zone_default_firewall_ipv6_name_path(self, zone_name: str) -> List[str]:
        """Get command path for default-firewall ipv6-name node (for deletion)."""
        return ["firewall", "zone", zone_name, "default-firewall", "ipv6-name"]

    # ========================================================================
    # Alias for backwards compatibility in router (1.4-style raises ValueError)
    # ========================================================================

    def get_zone_interface(self, zone_name: str, interface: str) -> List[str]:
        """Not used in VyOS 1.5 — use get_zone_member_interface instead."""
        raise ValueError(
            "Use member interface in VyOS 1.5. "
            "Call get_zone_member_interface() instead."
        )
