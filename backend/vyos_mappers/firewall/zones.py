"""
Firewall Zones Command Mapper

Handles firewall zone commands for VyOS.
Provides command path generation for firewall zone operations.

VyOS 1.4 vs 1.5 differences:
- Interfaces: 1.4 uses `interface` at zone level; 1.5 uses `member interface` and `member vrf`
- Default firewall: 1.5 adds `default-firewall name/ipv6-name` (not in 1.4)
"""

from typing import FrozenSet, List
from ..base import BaseFeatureMapper


class FirewallZonesMapper(BaseFeatureMapper):
    """Base firewall zones mapper with shared operations for all versions."""

    def __init__(self, version: str):
        super().__init__(version)

    # validateTmplPath on both lab hosts. 1.4 assigns interfaces at the zone
    # level. 1.5 uses member interface, member vrf, and default-firewall.
    _ZONE_NODES_V14 = frozenset({"interface"})
    _ZONE_NODES_V15 = frozenset({"member-interface", "member-vrf", "default-firewall"})

    def supported_zone_nodes(self) -> FrozenSet[str]:
        """Zone nodes this device has."""
        if "1.4" in self.version:
            return self._ZONE_NODES_V14
        return self._ZONE_NODES_V15

    def _require_zone_node(self, node: str) -> None:
        if node not in self.supported_zone_nodes():
            raise ValueError(f"firewall zone {node} is not supported on this device")

    def get_zone_interface(self, zone_name: str, interface: str) -> List[str]:
        """Add an interface at the zone level."""
        self._require_zone_node("interface")
        return ["firewall", "zone", zone_name, "interface", interface]

    def get_zone_interface_path(self, zone_name: str) -> List[str]:
        """Zone interface node (for deletion)."""
        self._require_zone_node("interface")
        return ["firewall", "zone", zone_name, "interface"]

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

    def assigned_interface_path(self, zone_name: str, interface: str) -> List[str]:
        """Interface assignment path for the nodes this device has."""
        if "interface" in self.supported_zone_nodes():
            return self.get_zone_interface(zone_name, interface)
        return self.get_zone_member_interface(zone_name, interface)

    def assigned_vrf_path(self, zone_name: str, vrf: str) -> List[str]:
        """VRF assignment path for the nodes this device has."""
        if "member-vrf" in self.supported_zone_nodes():
            return self.get_zone_member_vrf(zone_name, vrf)
        return self.get_zone_interface(zone_name, vrf)

    # ========================================================================
    # Zone Operations
    # ========================================================================

    def get_zone(self, zone_name: str) -> List[str]:
        """Get command path for creating a zone."""
        return ["firewall", "zone", zone_name]

    def get_zone_description(self, zone_name: str, description: str) -> List[str]:
        """Get command path for setting zone description."""
        return ["firewall", "zone", zone_name, "description", description]

    def get_zone_description_path(self, zone_name: str) -> List[str]:
        """Get command path for zone description node (for deletion)."""
        return ["firewall", "zone", zone_name, "description"]

    def get_zone_default_action(self, zone_name: str, action: str) -> List[str]:
        """Get command path for setting default-action (drop|reject)."""
        return ["firewall", "zone", zone_name, "default-action", action]

    def get_zone_default_action_path(self, zone_name: str) -> List[str]:
        """Get command path for default-action node (for deletion)."""
        return ["firewall", "zone", zone_name, "default-action"]

    def get_zone_default_log(self, zone_name: str) -> List[str]:
        """Get command path for enabling default-log."""
        return ["firewall", "zone", zone_name, "default-log"]

    def get_zone_local_zone(self, zone_name: str) -> List[str]:
        """Get command path for marking zone as local-zone."""
        return ["firewall", "zone", zone_name, "local-zone"]

    # ========================================================================
    # From-Zone Firewall Operations (both versions)
    # ========================================================================

    def get_zone_from(self, zone_name: str, from_zone: str) -> List[str]:
        """Get command path for a from-zone entry."""
        return ["firewall", "zone", zone_name, "from", from_zone]

    def get_zone_from_firewall_name(
        self, zone_name: str, from_zone: str, ruleset: str
    ) -> List[str]:
        """Get command path for IPv4 firewall ruleset on a from-zone."""
        return ["firewall", "zone", zone_name, "from", from_zone, "firewall", "name", ruleset]

    def get_zone_from_firewall_name_path(
        self, zone_name: str, from_zone: str
    ) -> List[str]:
        """Get command path for IPv4 firewall name node (for deletion)."""
        return ["firewall", "zone", zone_name, "from", from_zone, "firewall", "name"]

    def get_zone_from_firewall_ipv6_name(
        self, zone_name: str, from_zone: str, ruleset: str
    ) -> List[str]:
        """Get command path for IPv6 firewall ruleset on a from-zone."""
        return [
            "firewall", "zone", zone_name, "from", from_zone, "firewall", "ipv6-name", ruleset
        ]

    def get_zone_from_firewall_ipv6_name_path(
        self, zone_name: str, from_zone: str
    ) -> List[str]:
        """Get command path for IPv6 firewall ipv6-name node (for deletion)."""
        return ["firewall", "zone", zone_name, "from", from_zone, "firewall", "ipv6-name"]

    # ========================================================================
    # Intra-Zone Filtering Operations (both versions)
    # ========================================================================

    def get_zone_intra_zone_action(self, zone_name: str, action: str) -> List[str]:
        """Get command path for intra-zone filtering action (accept|drop)."""
        return ["firewall", "zone", zone_name, "intra-zone-filtering", "action", action]

    def get_zone_intra_zone_action_path(self, zone_name: str) -> List[str]:
        """Get command path for intra-zone action node (for deletion)."""
        return ["firewall", "zone", zone_name, "intra-zone-filtering", "action"]

    def get_zone_intra_zone_firewall_name(self, zone_name: str, ruleset: str) -> List[str]:
        """Get command path for intra-zone IPv4 firewall ruleset."""
        return [
            "firewall", "zone", zone_name, "intra-zone-filtering", "firewall", "name", ruleset
        ]

    def get_zone_intra_zone_firewall_name_path(self, zone_name: str) -> List[str]:
        """Get command path for intra-zone IPv4 firewall name node (for deletion)."""
        return ["firewall", "zone", zone_name, "intra-zone-filtering", "firewall", "name"]

    def get_zone_intra_zone_firewall_ipv6_name(
        self, zone_name: str, ruleset: str
    ) -> List[str]:
        """Get command path for intra-zone IPv6 firewall ruleset."""
        return [
            "firewall",
            "zone",
            zone_name,
            "intra-zone-filtering",
            "firewall",
            "ipv6-name",
            ruleset,
        ]

    def get_zone_intra_zone_firewall_ipv6_name_path(self, zone_name: str) -> List[str]:
        """Get command path for intra-zone IPv6 firewall ipv6-name node (for deletion)."""
        return [
            "firewall", "zone", zone_name, "intra-zone-filtering", "firewall", "ipv6-name"
        ]
