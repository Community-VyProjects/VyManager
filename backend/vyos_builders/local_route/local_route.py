"""
Local Route Batch Builder

Provides all batch operations for VyOS local route policy configuration.
Handles both IPv4 (local-route) and IPv6 (local-route6) rules.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class LocalRouteBatchBuilder:
    """Complete batch builder for local route policy operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "local_route"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "LocalRouteBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LocalRouteBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
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
    # IPv4 Local Route - Rule Operations
    # ========================================================================

    def set_local_route_rule(self, rule_number: int) -> "LocalRouteBatchBuilder":
        """Create IPv4 local route rule."""
        path = self.mappers[self.mapper_key].get_local_route_rule(rule_number)
        return self.add_set(path)

    def delete_local_route_rule(self, rule_number: int) -> "LocalRouteBatchBuilder":
        """Delete IPv4 local route rule."""
        path = self.mappers[self.mapper_key].get_local_route_rule_path(rule_number)
        return self.add_delete(path)

    # ========================================================================
    # IPv4 Local Route - Rule Properties
    # ========================================================================

    def set_local_route_rule_source(
        self, rule_number: int, source: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv4 rule source address/prefix."""
        path = self.mappers[self.mapper_key].get_local_route_rule_source(
            rule_number, source
        )
        return self.add_set(path)

    def delete_local_route_rule_source(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv4 rule source."""
        path = self.mappers[self.mapper_key].get_local_route_rule_source_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route_rule_destination(
        self, rule_number: int, destination: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv4 rule destination address/prefix."""
        path = self.mappers[self.mapper_key].get_local_route_rule_destination(
            rule_number, destination
        )
        return self.add_set(path)

    def delete_local_route_rule_destination(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv4 rule destination."""
        path = self.mappers[self.mapper_key].get_local_route_rule_destination_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route_rule_inbound_interface(
        self, rule_number: int, interface: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv4 rule inbound interface."""
        path = self.mappers[self.mapper_key].get_local_route_rule_inbound_interface(
            rule_number, interface
        )
        return self.add_set(path)

    def delete_local_route_rule_inbound_interface(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv4 rule inbound interface."""
        path = self.mappers[
            self.mapper_key
        ].get_local_route_rule_inbound_interface_path(rule_number)
        return self.add_delete(path)

    def set_local_route_rule_set_table(
        self, rule_number: int, table: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv4 rule routing table."""
        path = self.mappers[self.mapper_key].get_local_route_rule_set_table(
            rule_number, table
        )
        return self.add_set(path)

    def delete_local_route_rule_set_table(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv4 rule routing table."""
        path = self.mappers[self.mapper_key].get_local_route_rule_set_table_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv4 rule VRF (VyOS 1.5+)."""
        path = self.mappers[self.mapper_key].get_local_route_rule_set_vrf(
            rule_number, vrf
        )
        return self.add_set(path)

    def delete_local_route_rule_set_vrf(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv4 rule VRF."""
        path = self.mappers[self.mapper_key].get_local_route_rule_set_vrf_path(
            rule_number
        )
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Local Route - Rule Operations
    # ========================================================================

    def set_local_route6_rule(self, rule_number: int) -> "LocalRouteBatchBuilder":
        """Create IPv6 local route rule."""
        path = self.mappers[self.mapper_key].get_local_route6_rule(rule_number)
        return self.add_set(path)

    def delete_local_route6_rule(self, rule_number: int) -> "LocalRouteBatchBuilder":
        """Delete IPv6 local route rule."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_path(rule_number)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Local Route - Rule Properties
    # ========================================================================

    def set_local_route6_rule_source(
        self, rule_number: int, source: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv6 rule source address/prefix."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_source(
            rule_number, source
        )
        return self.add_set(path)

    def delete_local_route6_rule_source(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv6 rule source."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_source_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route6_rule_destination(
        self, rule_number: int, destination: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv6 rule destination address/prefix."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_destination(
            rule_number, destination
        )
        return self.add_set(path)

    def delete_local_route6_rule_destination(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv6 rule destination."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_destination_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route6_rule_inbound_interface(
        self, rule_number: int, interface: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv6 rule inbound interface."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_inbound_interface(
            rule_number, interface
        )
        return self.add_set(path)

    def delete_local_route6_rule_inbound_interface(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv6 rule inbound interface."""
        path = self.mappers[
            self.mapper_key
        ].get_local_route6_rule_inbound_interface_path(rule_number)
        return self.add_delete(path)

    def set_local_route6_rule_set_table(
        self, rule_number: int, table: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv6 rule routing table."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_set_table(
            rule_number, table
        )
        return self.add_set(path)

    def delete_local_route6_rule_set_table(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv6 rule routing table."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_set_table_path(
            rule_number
        )
        return self.add_delete(path)

    def set_local_route6_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> "LocalRouteBatchBuilder":
        """Set IPv6 rule VRF (VyOS 1.5+)."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_set_vrf(
            rule_number, vrf
        )
        return self.add_set(path)

    def delete_local_route6_rule_set_vrf(
        self, rule_number: int
    ) -> "LocalRouteBatchBuilder":
        """Delete IPv6 rule VRF."""
        path = self.mappers[self.mapper_key].get_local_route6_rule_set_vrf_path(
            rule_number
        )
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # VRF support is only available in VyOS 1.5+
        supports_vrf = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "features": {
                "ipv4_local_route": {
                    "supported": True,
                    "description": "IPv4 policy-based routing",
                },
                "ipv6_local_route": {
                    "supported": True,
                    "description": "IPv6 policy-based routing",
                },
                "source_matching": {
                    "supported": True,
                    "description": "Match based on source address/prefix",
                },
                "destination_matching": {
                    "supported": True,
                    "description": "Match based on destination address/prefix",
                },
                "inbound_interface_matching": {
                    "supported": True,
                    "description": "Match based on inbound interface",
                },
                "routing_table_selection": {
                    "supported": True,
                    "description": "Route to specific routing table (1-200 or main)",
                },
                "vrf_support": {
                    "supported": supports_vrf,
                    "description": "Route to specific VRF instance (VyOS 1.5+ only)",
                },
            },
        }
