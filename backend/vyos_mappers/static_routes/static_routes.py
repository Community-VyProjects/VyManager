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

    # Table IPv4 Route Details
    def get_table_ipv4_route_description(
        self, table_id: str, destination: str, description: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "description", description]

    def get_table_ipv4_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop]

    def get_table_ipv4_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "distance", distance]

    def get_table_ipv4_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "disable"]

    def get_table_ipv4_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "interface", interface]

    def get_table_ipv4_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "vrf", vrf]

    def get_table_ipv4_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "bfd"]

    def get_table_ipv4_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str, profile: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "next-hop", next_hop, "bfd", "profile", profile]

    def get_table_ipv4_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "interface", interface]

    def get_table_ipv4_route_interface_distance(
        self, table_id: str, destination: str, interface: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "interface", interface, "distance", distance]

    def get_table_ipv4_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "interface", interface, "disable"]

    def get_table_ipv4_route_blackhole(
        self, table_id: str, destination: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "blackhole"]

    def get_table_ipv4_route_blackhole_distance(
        self, table_id: str, destination: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "blackhole", "distance", distance]

    def get_table_ipv4_route_blackhole_tag(
        self, table_id: str, destination: str, tag: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "blackhole", "tag", tag]

    def get_table_ipv4_route_reject(
        self, table_id: str, destination: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "reject"]

    def get_table_ipv4_route_reject_distance(
        self, table_id: str, destination: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "reject", "distance", distance]

    def get_table_ipv4_route_reject_tag(
        self, table_id: str, destination: str, tag: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "reject", "tag", tag]

    def get_table_ipv4_route_dhcp_interface(
        self, table_id: str, destination: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route", destination, "dhcp-interface", interface]

    # Table IPv6 Route Details
    def get_table_ipv6_route_description(
        self, table_id: str, destination: str, description: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "description", description]

    def get_table_ipv6_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop]

    def get_table_ipv6_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop, "distance", distance]

    def get_table_ipv6_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop, "disable"]

    def get_table_ipv6_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop, "interface", interface]

    def get_table_ipv6_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop, "vrf", vrf]

    def get_table_ipv6_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "next-hop", next_hop, "bfd"]

    def get_table_ipv6_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "interface", interface]

    def get_table_ipv6_route_interface_distance(
        self, table_id: str, destination: str, interface: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "interface", interface, "distance", distance]

    def get_table_ipv6_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "interface", interface, "disable"]

    def get_table_ipv6_route_blackhole(
        self, table_id: str, destination: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "blackhole"]

    def get_table_ipv6_route_blackhole_distance(
        self, table_id: str, destination: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "blackhole", "distance", distance]

    def get_table_ipv6_route_reject(
        self, table_id: str, destination: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "reject"]

    def get_table_ipv6_route_reject_distance(
        self, table_id: str, destination: str, distance: str
    ) -> List[str]:
        return ["protocols", "static", "table", table_id, "route6", destination, "reject", "distance", distance]

    # ========================================================================
    # Route-map
    # ========================================================================

    def get_route_map(self, route_map_name: str) -> List[str]:
        """Get command path for route-map."""
        return ["protocols", "static", "route-map", route_map_name]

    # ========================================================================
    # IPv4 Next-hop VRF and BFD Paths
    # ========================================================================

    def get_ipv4_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        """Get command path for next-hop VRF."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "vrf", vrf
        ]

    def get_ipv4_route_next_hop_interface(
        self, destination: str, next_hop: str, interface: str
    ) -> List[str]:
        """Get command path for next-hop interface."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "interface", interface
        ]

    def get_ipv4_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for next-hop BFD."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd"
        ]

    def get_ipv4_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> List[str]:
        """Get command path for next-hop BFD profile."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "profile", profile
        ]

    def get_ipv4_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for next-hop BFD multi-hop."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop"
        ]

    def get_ipv4_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, source: str
    ) -> List[str]:
        """Get command path for next-hop BFD multi-hop source address."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source
        ]

    def get_ipv4_route_interface_vrf(
        self, destination: str, interface: str, vrf: str
    ) -> List[str]:
        """Get command path for interface VRF."""
        return [
            "protocols", "static", "route", destination,
            "interface", interface, "vrf", vrf
        ]

    def get_ipv4_route_dhcp_interface(
        self, destination: str, interface: str
    ) -> List[str]:
        """Get command path for DHCP interface."""
        return [
            "protocols", "static", "route", destination,
            "dhcp-interface", interface
        ]

    # ========================================================================
    # IPv6 Next-hop VRF and BFD Paths
    # ========================================================================

    def get_ipv6_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop VRF."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "vrf", vrf
        ]

    def get_ipv6_route_next_hop_interface(
        self, destination: str, next_hop: str, interface: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop interface."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "interface", interface
        ]

    def get_ipv6_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd"
        ]

    def get_ipv6_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD profile."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "profile", profile
        ]

    def get_ipv6_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD multi-hop."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop"
        ]

    def get_ipv6_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, source: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD multi-hop source address."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source
        ]

    def get_ipv6_route_interface_vrf(
        self, destination: str, interface: str, vrf: str
    ) -> List[str]:
        """Get command path for IPv6 interface VRF."""
        return [
            "protocols", "static", "route6", destination,
            "interface", interface, "vrf", vrf
        ]

    # ========================================================================
    # Static ARP Paths
    # ========================================================================

    def get_arp_interface_path(self, interface: str) -> List[str]:
        """Get command path for ARP interface."""
        return ["protocols", "static", "arp", "interface", interface]

    def get_arp_interface_address_path(
        self, interface: str, ip_address: str
    ) -> List[str]:
        """Get command path for ARP interface address."""
        return [
            "protocols", "static", "arp", "interface", interface,
            "address", ip_address
        ]

    def get_arp_interface_address_mac(
        self, interface: str, ip_address: str, mac_address: str
    ) -> List[str]:
        """Get command path for ARP interface address MAC."""
        return [
            "protocols", "static", "arp", "interface", interface,
            "address", ip_address, "mac", mac_address
        ]

    def get_arp_interface_address_description(
        self, interface: str, ip_address: str, description: str
    ) -> List[str]:
        """Get command path for ARP interface address description."""
        return [
            "protocols", "static", "arp", "interface", interface,
            "address", ip_address, "description", description
        ]

    # ========================================================================
    # Multicast Routes (mroute) Paths
    # ========================================================================

    def get_mroute_path(self, prefix: str) -> List[str]:
        """Get command path for multicast route."""
        return ["protocols", "static", "mroute", prefix]

    def get_mroute_interface_path(self, prefix: str, interface: str) -> List[str]:
        """Get command path for mroute interface."""
        return ["protocols", "static", "mroute", prefix, "interface", interface]

    def get_mroute_interface_disable(self, prefix: str, interface: str) -> List[str]:
        """Get command path for mroute interface disable."""
        return [
            "protocols", "static", "mroute", prefix,
            "interface", interface, "disable"
        ]

    def get_mroute_interface_distance(
        self, prefix: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for mroute interface distance."""
        return [
            "protocols", "static", "mroute", prefix,
            "interface", interface, "distance", distance
        ]

    def get_mroute_next_hop_path(self, prefix: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop."""
        return ["protocols", "static", "mroute", prefix, "next-hop", next_hop]

    def get_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop disable."""
        return [
            "protocols", "static", "mroute", prefix,
            "next-hop", next_hop, "disable"
        ]

    def get_mroute_next_hop_distance(
        self, prefix: str, next_hop: str, distance: str
    ) -> List[str]:
        """Get command path for mroute next-hop distance."""
        return [
            "protocols", "static", "mroute", prefix,
            "next-hop", next_hop, "distance", distance
        ]

    # ========================================================================
    # Neighbor Proxy Paths
    # ========================================================================

    def get_neighbor_proxy_arp_path(self, ip_address: str) -> List[str]:
        """Get command path for neighbor proxy ARP entry."""
        return ["protocols", "static", "neighbor-proxy", "arp", ip_address]

    def get_neighbor_proxy_arp_interface(
        self, ip_address: str, interface: str
    ) -> List[str]:
        """Get command path for neighbor proxy ARP interface."""
        return [
            "protocols", "static", "neighbor-proxy", "arp",
            ip_address, "interface", interface
        ]

    def get_neighbor_proxy_nd_path(self, ipv6_address: str) -> List[str]:
        """Get command path for neighbor proxy ND entry."""
        return ["protocols", "static", "neighbor-proxy", "nd", ipv6_address]

    def get_neighbor_proxy_nd_interface(
        self, ipv6_address: str, interface: str
    ) -> List[str]:
        """Get command path for neighbor proxy ND interface."""
        return [
            "protocols", "static", "neighbor-proxy", "nd",
            ipv6_address, "interface", interface
        ]
