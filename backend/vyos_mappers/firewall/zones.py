"""
Firewall Zones Command Mapper

Handles firewall zone commands for VyOS.
Provides command path generation for firewall zone operations.

VyOS 1.4 vs 1.5 differences:
- Interfaces: 1.4 uses `interface` at zone level; 1.5 uses `member interface` and `member vrf`
- Default firewall: 1.5 adds `default-firewall name/ipv6-name` (not in 1.4)
"""

from typing import List
from ..base import BaseFeatureMapper


class FirewallZonesMapper(BaseFeatureMapper):
    """Base firewall zones mapper with shared operations for all versions."""

    def __init__(self, version: str):
        super().__init__(version)

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
