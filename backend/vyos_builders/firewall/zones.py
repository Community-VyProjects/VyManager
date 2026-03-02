"""
Firewall Zones Batch Builder

Provides all firewall zone batch operations following the standard pattern.

Handles version differences transparently:
- VyOS 1.4: interfaces at zone level via `interface`
- VyOS 1.5: interfaces under `member interface/vrf`, plus `default-firewall`
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FirewallZonesBatchBuilder:
    """Complete batch builder for firewall zone operations."""

    def __init__(self, version: str):
        """Initialize firewall zones batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_zones"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FirewallZonesBatchBuilder":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FirewallZonesBatchBuilder":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Zone Create / Delete
    # ========================================================================

    def set_zone(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Create a zone."""
        path = self.mappers[self.mapper_key].get_zone(zone_name)
        return self.add_set(path)

    def delete_zone(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Delete a zone entirely."""
        path = self.mappers[self.mapper_key].get_zone(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # Zone Description
    # ========================================================================

    def set_zone_description(
        self, zone_name: str, description: str
    ) -> "FirewallZonesBatchBuilder":
        """Set zone description."""
        path = self.mappers[self.mapper_key].get_zone_description(zone_name, description)
        return self.add_set(path)

    def delete_zone_description(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Delete zone description."""
        path = self.mappers[self.mapper_key].get_zone_description_path(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # Default Action
    # ========================================================================

    def set_zone_default_action(
        self, zone_name: str, action: str
    ) -> "FirewallZonesBatchBuilder":
        """Set zone default-action (drop|reject)."""
        path = self.mappers[self.mapper_key].get_zone_default_action(zone_name, action)
        return self.add_set(path)

    def delete_zone_default_action(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Delete zone default-action."""
        path = self.mappers[self.mapper_key].get_zone_default_action_path(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # Default Log
    # ========================================================================

    def set_zone_default_log(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Enable default-log on zone."""
        path = self.mappers[self.mapper_key].get_zone_default_log(zone_name)
        return self.add_set(path)

    def delete_zone_default_log(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Disable default-log on zone."""
        path = self.mappers[self.mapper_key].get_zone_default_log(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # Local Zone
    # ========================================================================

    def set_zone_local_zone(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Mark zone as the local-zone."""
        path = self.mappers[self.mapper_key].get_zone_local_zone(zone_name)
        return self.add_set(path)

    def delete_zone_local_zone(self, zone_name: str) -> "FirewallZonesBatchBuilder":
        """Remove local-zone designation."""
        path = self.mappers[self.mapper_key].get_zone_local_zone(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # Interface Operations (version-aware)
    # VyOS 1.4: interface at zone level
    # VyOS 1.5: member interface / member vrf
    # ========================================================================

    def set_zone_interface(
        self, zone_name: str, interface: str
    ) -> "FirewallZonesBatchBuilder":
        """Add interface to zone (VyOS 1.4: zone interface; 1.5: member interface)."""
        if "1.5" in self.version:
            path = self.mappers[self.mapper_key].get_zone_member_interface(zone_name, interface)
        else:
            path = self.mappers[self.mapper_key].get_zone_interface(zone_name, interface)
        return self.add_set(path)

    def delete_zone_interface(
        self, zone_name: str, interface: str
    ) -> "FirewallZonesBatchBuilder":
        """Remove interface from zone."""
        if "1.5" in self.version:
            path = self.mappers[self.mapper_key].get_zone_member_interface(zone_name, interface)
        else:
            path = self.mappers[self.mapper_key].get_zone_interface(zone_name, interface)
        return self.add_delete(path)

    def set_zone_member_vrf(
        self, zone_name: str, vrf: str
    ) -> "FirewallZonesBatchBuilder":
        """Add VRF to zone (VyOS 1.5 only: member vrf; 1.4: use set_zone_interface with VRF name)."""
        if "1.5" in self.version:
            path = self.mappers[self.mapper_key].get_zone_member_vrf(zone_name, vrf)
        else:
            # VyOS 1.4: VRF names go into the same `interface` multi-value node
            path = self.mappers[self.mapper_key].get_zone_interface(zone_name, vrf)
        return self.add_set(path)

    def delete_zone_member_vrf(
        self, zone_name: str, vrf: str
    ) -> "FirewallZonesBatchBuilder":
        """Remove VRF from zone."""
        if "1.5" in self.version:
            path = self.mappers[self.mapper_key].get_zone_member_vrf(zone_name, vrf)
        else:
            path = self.mappers[self.mapper_key].get_zone_interface(zone_name, vrf)
        return self.add_delete(path)

    # ========================================================================
    # Default Firewall (VyOS 1.5 only)
    # ========================================================================

    def set_zone_default_firewall_name(
        self, zone_name: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set default-firewall IPv4 ruleset (VyOS 1.5 only)."""
        path = self.mappers[self.mapper_key].get_zone_default_firewall_name(zone_name, ruleset)
        return self.add_set(path)

    def delete_zone_default_firewall_name(
        self, zone_name: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete default-firewall IPv4 ruleset (VyOS 1.5 only)."""
        path = self.mappers[self.mapper_key].get_zone_default_firewall_name_path(zone_name)
        return self.add_delete(path)

    def set_zone_default_firewall_ipv6_name(
        self, zone_name: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set default-firewall IPv6 ruleset (VyOS 1.5 only)."""
        path = self.mappers[self.mapper_key].get_zone_default_firewall_ipv6_name(
            zone_name, ruleset
        )
        return self.add_set(path)

    def delete_zone_default_firewall_ipv6_name(
        self, zone_name: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete default-firewall IPv6 ruleset (VyOS 1.5 only)."""
        path = self.mappers[self.mapper_key].get_zone_default_firewall_ipv6_name_path(zone_name)
        return self.add_delete(path)

    # ========================================================================
    # From-Zone Firewall Operations
    # ========================================================================

    def set_zone_from(
        self, zone_name: str, from_zone: str
    ) -> "FirewallZonesBatchBuilder":
        """Create a from-zone entry."""
        path = self.mappers[self.mapper_key].get_zone_from(zone_name, from_zone)
        return self.add_set(path)

    def delete_zone_from(
        self, zone_name: str, from_zone: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete a from-zone entry (including all its firewall rules)."""
        path = self.mappers[self.mapper_key].get_zone_from(zone_name, from_zone)
        return self.add_delete(path)

    def set_zone_from_firewall_name(
        self, zone_name: str, from_zone: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set IPv4 firewall ruleset for traffic from a zone."""
        path = self.mappers[self.mapper_key].get_zone_from_firewall_name(
            zone_name, from_zone, ruleset
        )
        return self.add_set(path)

    def delete_zone_from_firewall_name(
        self, zone_name: str, from_zone: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete IPv4 firewall ruleset for traffic from a zone."""
        path = self.mappers[self.mapper_key].get_zone_from_firewall_name_path(
            zone_name, from_zone
        )
        return self.add_delete(path)

    def set_zone_from_firewall_ipv6_name(
        self, zone_name: str, from_zone: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set IPv6 firewall ruleset for traffic from a zone."""
        path = self.mappers[self.mapper_key].get_zone_from_firewall_ipv6_name(
            zone_name, from_zone, ruleset
        )
        return self.add_set(path)

    def delete_zone_from_firewall_ipv6_name(
        self, zone_name: str, from_zone: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete IPv6 firewall ruleset for traffic from a zone."""
        path = self.mappers[self.mapper_key].get_zone_from_firewall_ipv6_name_path(
            zone_name, from_zone
        )
        return self.add_delete(path)

    # ========================================================================
    # Intra-Zone Filtering Operations
    # ========================================================================

    def set_zone_intra_zone_action(
        self, zone_name: str, action: str
    ) -> "FirewallZonesBatchBuilder":
        """Set intra-zone filtering action (accept|drop)."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_action(zone_name, action)
        return self.add_set(path)

    def delete_zone_intra_zone_action(
        self, zone_name: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete intra-zone filtering action."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_action_path(zone_name)
        return self.add_delete(path)

    def set_zone_intra_zone_firewall_name(
        self, zone_name: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set intra-zone filtering IPv4 firewall ruleset."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_firewall_name(
            zone_name, ruleset
        )
        return self.add_set(path)

    def delete_zone_intra_zone_firewall_name(
        self, zone_name: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete intra-zone filtering IPv4 firewall ruleset."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_firewall_name_path(zone_name)
        return self.add_delete(path)

    def set_zone_intra_zone_firewall_ipv6_name(
        self, zone_name: str, ruleset: str
    ) -> "FirewallZonesBatchBuilder":
        """Set intra-zone filtering IPv6 firewall ruleset."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_firewall_ipv6_name(
            zone_name, ruleset
        )
        return self.add_set(path)

    def delete_zone_intra_zone_firewall_ipv6_name(
        self, zone_name: str
    ) -> "FirewallZonesBatchBuilder":
        """Delete intra-zone filtering IPv6 firewall ruleset."""
        path = self.mappers[self.mapper_key].get_zone_intra_zone_firewall_ipv6_name_path(
            zone_name
        )
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get version-aware capabilities for firewall zones."""
        is_v15 = "1.5" in self.version
        return {
            "version": self.version,
            "features": {
                "default_firewall": {
                    "supported": is_v15,
                    "description": "Apply a firewall ruleset to default-action traffic",
                },
                "member_interface": {
                    "supported": is_v15,
                    "description": "Assign interfaces via member hierarchy (VyOS 1.5+)",
                },
                "member_vrf": {
                    "supported": is_v15,
                    "description": "Assign VRFs via member hierarchy (VyOS 1.5+)",
                },
                "interface_direct": {
                    "supported": not is_v15,
                    "description": "Assign interfaces directly at zone level (VyOS 1.4)",
                },
                "from_zone_firewall": {
                    "supported": True,
                    "description": "Apply firewall rulesets to traffic from another zone",
                },
                "intra_zone_filtering": {
                    "supported": True,
                    "description": "Filter traffic within the same zone",
                },
                "local_zone": {
                    "supported": True,
                    "description": "Designate zone as the router's local zone",
                },
                "default_log": {
                    "supported": True,
                    "description": "Log packets matching the default action",
                },
            },
        }
