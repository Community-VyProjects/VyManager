"""
VyOS 1.4 Firewall Zones Mapper

In VyOS 1.4, zone interfaces (and VRFs) are configured directly at the zone level:
    firewall zone <zone> interface <iface-or-vrf>

There is no `member` hierarchy and no `default-firewall` support.
"""

from typing import List
from ..zones import FirewallZonesMapper


class FirewallZonesMapper_v1_4(FirewallZonesMapper):
    """VyOS 1.4-specific firewall zones mapper."""

    # ========================================================================
    # Interface / VRF Operations (1.4 style — direct at zone level)
    # ========================================================================

    def get_zone_interface(self, zone_name: str, interface: str) -> List[str]:
        """Get command path for adding an interface to a zone (VyOS 1.4)."""
        return ["firewall", "zone", zone_name, "interface", interface]

    def get_zone_interface_path(self, zone_name: str) -> List[str]:
        """Get command path for zone interface node (for deletion, VyOS 1.4)."""
        return ["firewall", "zone", zone_name, "interface"]

    # ========================================================================
    # Unsupported in VyOS 1.4
    # ========================================================================

    def get_zone_member_interface(self, zone_name: str, interface: str) -> List[str]:
        """Not available in VyOS 1.4 — use get_zone_interface instead."""
        raise ValueError(
            "member interface requires VyOS 1.5+. Use interface directly in VyOS 1.4."
        )

    def get_zone_member_vrf(self, zone_name: str, vrf: str) -> List[str]:
        """Not available in VyOS 1.4 — use get_zone_interface with VRF name."""
        raise ValueError(
            "member vrf requires VyOS 1.5+. Add VRF names via interface in VyOS 1.4."
        )

    def get_zone_default_firewall_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Not available in VyOS 1.4."""
        raise ValueError("default-firewall requires VyOS 1.5+.")

    def get_zone_default_firewall_ipv6_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Not available in VyOS 1.4."""
        raise ValueError("default-firewall requires VyOS 1.5+.")
