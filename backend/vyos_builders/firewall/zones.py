"""
Firewall Zones Batch Builder

Provides all firewall zone batch operations following the standard pattern.

Handles version differences transparently:
- VyOS 1.4: interfaces at zone level via `interface`
- VyOS 1.5: interfaces under `member interface/vrf`, plus `default-firewall`
"""

from typing import Any, Dict, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.zones import FirewallZonesMapper
from vyos_builders.base import BatchBuilder


class FirewallZonesBatchBuilder(BatchBuilder):
    """Complete batch builder for firewall zone operations."""

    def __init__(self, version: str):
        """Initialize firewall zones batch builder."""
        super().__init__(version)
        self.mapper_key = "firewall_zones"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

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
        """Add an interface to a zone."""
        mapper = cast(FirewallZonesMapper, self.mappers[self.mapper_key])
        return self.add_set(mapper.assigned_interface_path(zone_name, interface))

    def delete_zone_interface(
        self, zone_name: str, interface: str
    ) -> "FirewallZonesBatchBuilder":
        """Remove an interface from a zone."""
        mapper = cast(FirewallZonesMapper, self.mappers[self.mapper_key])
        return self.add_delete(mapper.assigned_interface_path(zone_name, interface))

    def set_zone_member_vrf(
        self, zone_name: str, vrf: str
    ) -> "FirewallZonesBatchBuilder":
        """Add a VRF to a zone."""
        mapper = cast(FirewallZonesMapper, self.mappers[self.mapper_key])
        return self.add_set(mapper.assigned_vrf_path(zone_name, vrf))

    def delete_zone_member_vrf(
        self, zone_name: str, vrf: str
    ) -> "FirewallZonesBatchBuilder":
        """Remove a VRF from a zone."""
        mapper = cast(FirewallZonesMapper, self.mappers[self.mapper_key])
        return self.add_delete(mapper.assigned_vrf_path(zone_name, vrf))

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

    def set_zone_from_ipv4(
        self, zone_name: str, value: str
    ) -> "FirewallZonesBatchBuilder":
        """Set IPv4 firewall ruleset for from-zone traffic (2-param batch-safe variant).

        value must be encoded as '{from_zone}:{chain_name}'.
        Zone names cannot contain colons, so a single split on ':' is unambiguous.
        """
        try:
            from_zone, ruleset = value.split(":", 1)
        except ValueError:
            raise ValueError(
                f"set_zone_from_ipv4: value must be 'from_zone:chain_name', got {value!r}"
            )
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

    def set_zone_from_ipv6(
        self, zone_name: str, value: str
    ) -> "FirewallZonesBatchBuilder":
        """Set IPv6 firewall ruleset for from-zone traffic (2-param batch-safe variant).

        value must be encoded as '{from_zone}:{chain_name}'.
        """
        try:
            from_zone, ruleset = value.split(":", 1)
        except ValueError:
            raise ValueError(
                f"set_zone_from_ipv6: value must be 'from_zone:chain_name', got {value!r}"
            )
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
        """Get capabilities for the current device."""
        mapper = cast(FirewallZonesMapper, self.mappers[self.mapper_key])
        nodes = mapper.supported_zone_nodes()

        def flag(node: str, description: str) -> Dict[str, Any]:
            return {"supported": node in nodes, "description": description}

        return {
            "version": self.version,
            "features": {
                "default_firewall": flag(
                    "default-firewall",
                    "Apply a firewall ruleset to default-action traffic",
                ),
                "member_interface": flag(
                    "member-interface",
                    "Assign interfaces under the member node",
                ),
                "member_vrf": flag(
                    "member-vrf",
                    "Assign VRFs under the member node",
                ),
                "interface_direct": flag(
                    "interface",
                    "Assign interfaces directly on the zone",
                ),
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
