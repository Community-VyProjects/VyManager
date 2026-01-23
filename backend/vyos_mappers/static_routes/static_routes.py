"""
Static Routes Command Mapper

Handles command path generation for static route configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class StaticRoutesMapper(BaseFeatureMapper):
    """Base mapper with common operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Common IPv4 Route Paths
    # ========================================================================

    def get_ipv4_route_path(self, destination: str) -> List[str]:
        """Get command path for IPv4 route."""
        return ["protocols", "static", "route", destination]

    def get_ipv4_route_description(self, destination: str, description: str) -> List[str]:
        """Get command path for route description."""
        return ["protocols", "static", "route", destination, "description", description]

    def get_ipv4_route_next_hop(self, destination: str, next_hop: str) -> List[str]:
        """Get command path for next-hop address."""
        return ["protocols", "static", "route", destination, "next-hop", next_hop]

    def get_ipv4_route_next_hop_distance(
        self, destination: str, next_hop: str, distance: str
    ) -> List[str]:
        """Get command path for next-hop distance."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "distance", distance
        ]

    def get_ipv4_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for disabling next-hop."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "disable"
        ]

    def get_ipv4_route_interface(self, destination: str, interface: str) -> List[str]:
        """Get command path for interface route."""
        return ["protocols", "static", "route", destination, "interface", interface]

    def get_ipv4_route_interface_distance(
        self, destination: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for interface distance."""
        return [
            "protocols", "static", "route", destination,
            "interface", interface, "distance", distance
        ]

    def get_ipv4_route_interface_disable(
        self, destination: str, interface: str
    ) -> List[str]:
        """Get command path for disabling interface route."""
        return [
            "protocols", "static", "route", destination,
            "interface", interface, "disable"
        ]

    def get_ipv4_route_blackhole(self, destination: str) -> List[str]:
        """Get command path for blackhole route."""
        return ["protocols", "static", "route", destination, "blackhole"]

    def get_ipv4_route_blackhole_distance(
        self, destination: str, distance: str
    ) -> List[str]:
        """Get command path for blackhole distance."""
        return [
            "protocols", "static", "route", destination,
            "blackhole", "distance", distance
        ]

    def get_ipv4_route_blackhole_path(self, destination: str) -> List[str]:
        """Get command path for blackhole (for deletion)."""
        return ["protocols", "static", "route", destination, "blackhole"]

    def get_ipv4_route_blackhole_tag(
        self, destination: str, tag: str
    ) -> List[str]:
        """Get command path for blackhole tag."""
        return [
            "protocols", "static", "route", destination,
            "blackhole", "tag", tag
        ]

    def get_ipv4_route_reject(self, destination: str) -> List[str]:
        """Get command path for reject route."""
        return ["protocols", "static", "route", destination, "reject"]

    def get_ipv4_route_reject_path(self, destination: str) -> List[str]:
        """Get command path for reject (for deletion)."""
        return ["protocols", "static", "route", destination, "reject"]

    def get_ipv4_route_reject_distance(
        self, destination: str, distance: str
    ) -> List[str]:
        """Get command path for reject distance."""
        return [
            "protocols", "static", "route", destination,
            "reject", "distance", distance
        ]

    def get_ipv4_route_reject_tag(
        self, destination: str, tag: str
    ) -> List[str]:
        """Get command path for reject tag."""
        return [
            "protocols", "static", "route", destination,
            "reject", "tag", tag
        ]

    # ========================================================================
    # Common IPv6 Route Paths
    # ========================================================================

    def get_ipv6_route_path(self, destination: str) -> List[str]:
        """Get command path for IPv6 route."""
        return ["protocols", "static", "route6", destination]

    def get_ipv6_route_description(self, destination: str, description: str) -> List[str]:
        """Get command path for IPv6 route description."""
        return ["protocols", "static", "route6", destination, "description", description]

    def get_ipv6_route_next_hop(self, destination: str, next_hop: str) -> List[str]:
        """Get command path for IPv6 next-hop address."""
        return ["protocols", "static", "route6", destination, "next-hop", next_hop]

    def get_ipv6_route_next_hop_distance(
        self, destination: str, next_hop: str, distance: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop distance."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "distance", distance
        ]

    def get_ipv6_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for disabling IPv6 next-hop."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "disable"
        ]

    def get_ipv6_route_interface(self, destination: str, interface: str) -> List[str]:
        """Get command path for IPv6 interface route."""
        return ["protocols", "static", "route6", destination, "interface", interface]

    def get_ipv6_route_interface_distance(
        self, destination: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for IPv6 interface distance."""
        return [
            "protocols", "static", "route6", destination,
            "interface", interface, "distance", distance
        ]

    def get_ipv6_route_interface_disable(
        self, destination: str, interface: str
    ) -> List[str]:
        """Get command path for disabling IPv6 interface route."""
        return [
            "protocols", "static", "route6", destination,
            "interface", interface, "disable"
        ]

    def get_ipv6_route_blackhole(self, destination: str) -> List[str]:
        """Get command path for IPv6 blackhole route."""
        return ["protocols", "static", "route6", destination, "blackhole"]

    def get_ipv6_route_blackhole_distance(
        self, destination: str, distance: str
    ) -> List[str]:
        """Get command path for IPv6 blackhole distance."""
        return [
            "protocols", "static", "route6", destination,
            "blackhole", "distance", distance
        ]

    def get_ipv6_route_blackhole_path(self, destination: str) -> List[str]:
        """Get command path for IPv6 blackhole (for deletion)."""
        return ["protocols", "static", "route6", destination, "blackhole"]

    def get_ipv6_route_blackhole_tag(
        self, destination: str, tag: str
    ) -> List[str]:
        """Get command path for IPv6 blackhole tag."""
        return [
            "protocols", "static", "route6", destination,
            "blackhole", "tag", tag
        ]

    def get_ipv6_route_reject(self, destination: str) -> List[str]:
        """Get command path for IPv6 reject route."""
        return ["protocols", "static", "route6", destination, "reject"]

    def get_ipv6_route_reject_path(self, destination: str) -> List[str]:
        """Get command path for IPv6 reject (for deletion)."""
        return ["protocols", "static", "route6", destination, "reject"]

    def get_ipv6_route_reject_distance(
        self, destination: str, distance: str
    ) -> List[str]:
        """Get command path for IPv6 reject distance."""
        return [
            "protocols", "static", "route6", destination,
            "reject", "distance", distance
        ]

    def get_ipv6_route_reject_tag(
        self, destination: str, tag: str
    ) -> List[str]:
        """Get command path for IPv6 reject tag."""
        return [
            "protocols", "static", "route6", destination,
            "reject", "tag", tag
        ]

    def get_ipv6_route_next_hop_segments(
        self, destination: str, next_hop: str, segments: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop segments (SRv6)."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "segments", segments
        ]

    def get_ipv6_route_interface_segments(
        self, destination: str, interface: str, segments: str
    ) -> List[str]:
        """Get command path for IPv6 interface segments (SRv6)."""
        return [
            "protocols", "static", "route6", destination,
            "interface", interface, "segments", segments
        ]

    # ========================================================================
    # Routing Table Paths
    # ========================================================================

    def get_table_path(self, table_id: str) -> List[str]:
        """Get command path for routing table."""
        return ["protocols", "static", "table", table_id]

    def get_table_description(self, table_id: str, description: str) -> List[str]:
        """Get command path for table description."""
        return ["protocols", "static", "table", table_id, "description", description]

    def get_table_ipv4_route_path(self, table_id: str, destination: str) -> List[str]:
        """Get command path for table IPv4 route."""
        return ["protocols", "static", "table", table_id, "route", destination]

    def get_table_ipv6_route_path(self, table_id: str, destination: str) -> List[str]:
        """Get command path for table IPv6 route."""
        return ["protocols", "static", "table", table_id, "route6", destination]

    # ========================================================================
    # Route-map
    # ========================================================================

    def get_route_map(self, route_map_name: str) -> List[str]:
        """Get command path for route-map."""
        return ["protocols", "static", "route-map", route_map_name]

    # ========================================================================
    # ARP
    # ========================================================================

    def get_arp_entry(self, ip_address: str, mac_address: str) -> List[str]:
        """Get command path for static ARP entry."""
        return ["protocols", "static", "arp", ip_address, "mac", mac_address]

    # ========================================================================
    # Neighbor Proxy
    # ========================================================================

    def get_neighbor_proxy_arp(self, ip_address: str, interface: str) -> List[str]:
        """Get command path for neighbor proxy ARP."""
        return ["protocols", "static", "neighbor-proxy", "arp", ip_address, "interface", interface]

    def get_neighbor_proxy_nd(self, ipv6_address: str, interface: str) -> List[str]:
        """Get command path for neighbor proxy ND."""
        return ["protocols", "static", "neighbor-proxy", "nd", ipv6_address, "interface", interface]
