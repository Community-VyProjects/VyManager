"""
Static Routes Batch Builder

Provides all batch operations for static route configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class StaticRoutesBatchBuilder:
    """Complete batch builder for static routes operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "static_routes"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "StaticRoutesBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "StaticRoutesBatchBuilder":
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
    # IPv4 Route Operations
    # ========================================================================

    def set_ipv4_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        """Create IPv4 route."""
        path = self.mappers[self.mapper_key].get_ipv4_route_path(destination)
        return self.add_set(path)

    def delete_ipv4_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route."""
        path = self.mappers[self.mapper_key].get_ipv4_route_path(destination)
        return self.add_delete(path)

    def set_ipv4_route_description(
        self, destination: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route description."""
        path = self.mappers[self.mapper_key].get_ipv4_route_description(
            destination, description
        )
        return self.add_set(path)

    def delete_ipv4_route_description(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route description."""
        path = self.mappers[self.mapper_key].get_ipv4_route_path(destination) + [
            "description"
        ]
        return self.add_delete(path)

    def set_ipv4_route_next_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv4_route_next_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop(
            destination, next_hop
        )
        return self.add_delete(path)

    def set_ipv4_route_next_hop_distance(
        self, destination: str, next_hop: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route next-hop distance."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_distance(
            destination, next_hop, distance
        )
        return self.add_set(path)

    def set_ipv4_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_disable(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv4_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_disable(
            destination, next_hop
        )
        return self.add_delete(path)

    def set_ipv4_route_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route interface."""
        path = self.mappers[self.mapper_key].get_ipv4_route_interface(
            destination, interface
        )
        return self.add_set(path)

    def delete_ipv4_route_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route interface."""
        path = self.mappers[self.mapper_key].get_ipv4_route_interface(
            destination, interface
        )
        return self.add_delete(path)

    def set_ipv4_route_interface_distance(
        self, destination: str, interface: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route interface distance."""
        path = self.mappers[self.mapper_key].get_ipv4_route_interface_distance(
            destination, interface, distance
        )
        return self.add_set(path)

    def set_ipv4_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route interface disable."""
        path = self.mappers[self.mapper_key].get_ipv4_route_interface_disable(
            destination, interface
        )
        return self.add_set(path)

    def set_ipv4_route_blackhole(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route to blackhole."""
        path = self.mappers[self.mapper_key].get_ipv4_route_blackhole(destination)
        return self.add_set(path)

    def delete_ipv4_route_blackhole(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route blackhole."""
        path = self.mappers[self.mapper_key].get_ipv4_route_blackhole_path(destination)
        return self.add_delete(path)

    def set_ipv4_route_blackhole_distance(
        self, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route blackhole distance."""
        path = self.mappers[self.mapper_key].get_ipv4_route_blackhole_distance(
            destination, distance
        )
        return self.add_set(path)

    def set_ipv4_route_blackhole_tag(
        self, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route blackhole tag."""
        path = self.mappers[self.mapper_key].get_ipv4_route_blackhole_tag(
            destination, tag
        )
        return self.add_set(path)

    def set_ipv4_route_reject(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route to reject."""
        path = self.mappers[self.mapper_key].get_ipv4_route_reject(destination)
        return self.add_set(path)

    def delete_ipv4_route_reject(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route reject."""
        path = self.mappers[self.mapper_key].get_ipv4_route_reject_path(destination)
        return self.add_delete(path)

    def set_ipv4_route_reject_distance(
        self, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route reject distance."""
        path = self.mappers[self.mapper_key].get_ipv4_route_reject_distance(
            destination, distance
        )
        return self.add_set(path)

    def set_ipv4_route_reject_tag(
        self, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route reject tag."""
        path = self.mappers[self.mapper_key].get_ipv4_route_reject_tag(
            destination, tag
        )
        return self.add_set(path)

    # ========================================================================
    # IPv6 Route Operations
    # ========================================================================

    def set_ipv6_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        """Create IPv6 route."""
        path = self.mappers[self.mapper_key].get_ipv6_route_path(destination)
        return self.add_set(path)

    def delete_ipv6_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route."""
        path = self.mappers[self.mapper_key].get_ipv6_route_path(destination)
        return self.add_delete(path)

    def set_ipv6_route_description(
        self, destination: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route description."""
        path = self.mappers[self.mapper_key].get_ipv6_route_description(
            destination, description
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv6_route_next_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop(
            destination, next_hop
        )
        return self.add_delete(path)

    def set_ipv6_route_next_hop_distance(
        self, destination: str, next_hop: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route next-hop distance."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_distance(
            destination, next_hop, distance
        )
        return self.add_set(path)

    def set_ipv6_route_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface(
            destination, interface
        )
        return self.add_set(path)

    def set_ipv6_route_interface_distance(
        self, destination: str, interface: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route interface distance."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface_distance(
            destination, interface, distance
        )
        return self.add_set(path)

    def set_ipv6_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route interface disable."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface_disable(
            destination, interface
        )
        return self.add_set(path)

    def set_ipv6_route_blackhole(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route to blackhole."""
        path = self.mappers[self.mapper_key].get_ipv6_route_blackhole(destination)
        return self.add_set(path)

    def delete_ipv6_route_blackhole(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route blackhole."""
        path = self.mappers[self.mapper_key].get_ipv6_route_blackhole_path(destination)
        return self.add_delete(path)

    def set_ipv6_route_blackhole_distance(
        self, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route blackhole distance."""
        path = self.mappers[self.mapper_key].get_ipv6_route_blackhole_distance(
            destination, distance
        )
        return self.add_set(path)

    def set_ipv6_route_blackhole_tag(
        self, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route blackhole tag."""
        path = self.mappers[self.mapper_key].get_ipv6_route_blackhole_tag(
            destination, tag
        )
        return self.add_set(path)

    def set_ipv6_route_reject(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route to reject."""
        path = self.mappers[self.mapper_key].get_ipv6_route_reject(destination)
        return self.add_set(path)

    def delete_ipv6_route_reject(
        self, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route reject."""
        path = self.mappers[self.mapper_key].get_ipv6_route_reject_path(destination)
        return self.add_delete(path)

    def set_ipv6_route_reject_distance(
        self, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route reject distance."""
        path = self.mappers[self.mapper_key].get_ipv6_route_reject_distance(
            destination, distance
        )
        return self.add_set(path)

    def set_ipv6_route_reject_tag(
        self, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route reject tag."""
        path = self.mappers[self.mapper_key].get_ipv6_route_reject_tag(
            destination, tag
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop_segments(
        self, destination: str, next_hop: str, segments: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route next-hop segments (SRv6)."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_segments(
            destination, next_hop, segments
        )
        return self.add_set(path)

    def set_ipv6_route_interface_segments(
        self, destination: str, interface: str, segments: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route interface segments (SRv6)."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface_segments(
            destination, interface, segments
        )
        return self.add_set(path)

    # ========================================================================
    # Routing Table Operations
    # ========================================================================

    def set_table(self, table_id: str) -> "StaticRoutesBatchBuilder":
        """Create routing table."""
        path = self.mappers[self.mapper_key].get_table_path(table_id)
        return self.add_set(path)

    def delete_table(self, table_id: str) -> "StaticRoutesBatchBuilder":
        """Delete routing table."""
        path = self.mappers[self.mapper_key].get_table_path(table_id)
        return self.add_delete(path)

    def set_table_description(
        self, table_id: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set routing table description."""
        path = self.mappers[self.mapper_key].get_table_description(
            table_id, description
        )
        return self.add_set(path)

    # ========================================================================
    # Route-map
    # ========================================================================

    def set_route_map(self, route_map_name: str) -> "StaticRoutesBatchBuilder":
        """Set route-map."""
        path = self.mappers[self.mapper_key].get_route_map(route_map_name)
        return self.add_set(path)

    def delete_route_map(self) -> "StaticRoutesBatchBuilder":
        """Delete route-map."""
        path = ["protocols", "static", "route-map"]
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "ipv4_routes": {
                    "supported": True,
                    "description": "IPv4 static routes",
                },
                "ipv6_routes": {
                    "supported": True,
                    "description": "IPv6 static routes",
                },
                "routing_tables": {
                    "supported": True,
                    "description": "Custom routing tables (1-200)",
                },
                "blackhole_routes": {
                    "supported": True,
                    "description": "Blackhole routes for filtering",
                },
                "interface_routes": {
                    "supported": True,
                    "description": "Interface-based routes",
                },
                "next_hop_bfd": {
                    "supported": is_1_5,
                    "description": "BFD monitoring for next-hop (VyOS 1.5+)",
                },
                "next_hop_vrf": {
                    "supported": is_1_5,
                    "description": "VRF for next-hop (VyOS 1.5+)",
                },
                "multicast_routes_1_4": {
                    "supported": is_1_4,
                    "description": "Multicast routes (VyOS 1.4)",
                },
                "mroute_1_5": {
                    "supported": is_1_5,
                    "description": "Multicast routes (VyOS 1.5)",
                },
                "dhcp_interface_1_4": {
                    "supported": is_1_4,
                    "description": "DHCP interface routes (VyOS 1.4)",
                },
                "route_map": {
                    "supported": True,
                    "description": "Route-map for static routes",
                },
                "arp": {
                    "supported": True,
                    "description": "Static ARP entries",
                },
                "neighbor_proxy": {
                    "supported": True,
                    "description": "Neighbor proxy (ARP and NDP)",
                },
            },
            "version_notes": {
                "multicast_command": "multicast" if is_1_4 else "mroute",
                "bfd_available": is_1_5,
                "vrf_available": is_1_5,
            },
        }
