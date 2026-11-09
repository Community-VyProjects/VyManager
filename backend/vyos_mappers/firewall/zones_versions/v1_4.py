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
        """Add an interface at the zone level."""
        self._require_zone_node("interface")
        return ["firewall", "zone", zone_name, "interface", interface]

    def get_zone_interface_path(self, zone_name: str) -> List[str]:
        """Zone interface node (for deletion)."""
        self._require_zone_node("interface")
        return ["firewall", "zone", zone_name, "interface"]

    def assigned_interface_path(self, zone_name: str, interface: str) -> List[str]:
        """Path used to assign an interface on this device."""
        return self.get_zone_interface(zone_name, interface)

    def assigned_vrf_path(self, zone_name: str, vrf: str) -> List[str]:
        """1.4 stores a VRF name in the same interface node."""
        return self.get_zone_interface(zone_name, vrf)

    def get_zone_member_interface(self, zone_name: str, interface: str) -> List[str]:
        self._require_zone_node("member-interface")
        raise ValueError("firewall zone member-interface is not supported on this device")

    def get_zone_member_vrf(self, zone_name: str, vrf: str) -> List[str]:
        self._require_zone_node("member-vrf")
        raise ValueError("firewall zone member-vrf is not supported on this device")

    def get_zone_default_firewall_name(self, zone_name: str, ruleset: str) -> List[str]:
        self._require_zone_node("default-firewall")
        raise ValueError("firewall zone default-firewall is not supported on this device")

    def get_zone_default_firewall_ipv6_name(self, zone_name: str, ruleset: str) -> List[str]:
        self._require_zone_node("default-firewall")
        raise ValueError("firewall zone default-firewall is not supported on this device")
