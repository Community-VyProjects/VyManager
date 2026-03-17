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
    # IPv4 Next-hop VRF and BFD Operations
    # ========================================================================

    def set_ipv4_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_vrf(
            destination, next_hop, vrf
        )
        return self.add_set(path)

    def delete_ipv4_route_next_hop_vrf(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop(
            destination, next_hop
        ) + ["vrf"]
        return self.add_delete(path)

    def set_ipv4_route_next_hop_interface(
        self, destination: str, next_hop: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route next-hop interface."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_interface(
            destination, next_hop, interface
        )
        return self.add_set(path)

    def set_ipv4_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD for IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_bfd(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv4_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable BFD for IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_bfd(
            destination, next_hop
        )
        return self.add_delete(path)

    def set_ipv4_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> "StaticRoutesBatchBuilder":
        """Set BFD profile for IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_bfd_profile(
            destination, next_hop, profile
        )
        return self.add_set(path)

    def set_ipv4_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD multi-hop for IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_bfd_multi_hop(
            destination, next_hop
        )
        return self.add_set(path)

    def set_ipv4_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        """Set BFD multi-hop source address for IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv4_route_next_hop_bfd_multi_hop_source(
            destination, next_hop, source
        )
        return self.add_set(path)

    def set_ipv4_route_interface_vrf(
        self, destination: str, interface: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route interface VRF."""
        path = self.mappers[self.mapper_key].get_ipv4_route_interface_vrf(
            destination, interface, vrf
        )
        return self.add_set(path)

    def set_ipv4_route_dhcp_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv4 route DHCP interface."""
        path = self.mappers[self.mapper_key].get_ipv4_route_dhcp_interface(
            destination, interface
        )
        return self.add_set(path)

    def delete_ipv4_route_dhcp_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route DHCP interface."""
        path = self.mappers[self.mapper_key].get_ipv4_route_dhcp_interface(
            destination, interface
        )
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Next-hop VRF and BFD Operations
    # ========================================================================

    def set_ipv6_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_vrf(
            destination, next_hop, vrf
        )
        return self.add_set(path)

    def delete_ipv6_route_next_hop_vrf(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop(
            destination, next_hop
        ) + ["vrf"]
        return self.add_delete(path)

    def set_ipv6_route_next_hop_interface(
        self, destination: str, next_hop: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route next-hop interface."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_interface(
            destination, next_hop, interface
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD for IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_bfd(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv6_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable BFD for IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_bfd(
            destination, next_hop
        )
        return self.add_delete(path)

    def set_ipv6_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> "StaticRoutesBatchBuilder":
        """Set BFD profile for IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_bfd_profile(
            destination, next_hop, profile
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD multi-hop for IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_bfd_multi_hop(
            destination, next_hop
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        """Set BFD multi-hop source address for IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_bfd_multi_hop_source(
            destination, next_hop, source
        )
        return self.add_set(path)

    def set_ipv6_route_interface_vrf(
        self, destination: str, interface: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set IPv6 route interface VRF."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface_vrf(
            destination, interface, vrf
        )
        return self.add_set(path)

    def set_ipv6_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_disable(
            destination, next_hop
        )
        return self.add_set(path)

    def delete_ipv6_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_ipv6_route_next_hop_disable(
            destination, next_hop
        )
        return self.add_delete(path)

    def delete_ipv6_route_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface(
            destination, interface
        )
        return self.add_delete(path)

    def delete_ipv6_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_ipv6_route_interface_disable(
            destination, interface
        )
        return self.add_delete(path)

    # ========================================================================
    # Static ARP Operations
    # ========================================================================

    def set_arp_interface(self, interface: str) -> "StaticRoutesBatchBuilder":
        """Create ARP interface entry."""
        path = self.mappers[self.mapper_key].get_arp_interface_path(interface)
        return self.add_set(path)

    def delete_arp_interface(self, interface: str) -> "StaticRoutesBatchBuilder":
        """Delete ARP interface entry."""
        path = self.mappers[self.mapper_key].get_arp_interface_path(interface)
        return self.add_delete(path)

    def set_arp_entry(
        self, interface: str, ip_address: str, mac_address: str
    ) -> "StaticRoutesBatchBuilder":
        """Set static ARP entry."""
        path = self.mappers[self.mapper_key].get_arp_interface_address_mac(
            interface, ip_address, mac_address
        )
        return self.add_set(path)

    def delete_arp_entry(
        self, interface: str, ip_address: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete static ARP entry."""
        path = self.mappers[self.mapper_key].get_arp_interface_address_path(
            interface, ip_address
        )
        return self.add_delete(path)

    def set_arp_entry_description(
        self, interface: str, ip_address: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set static ARP entry description."""
        path = self.mappers[self.mapper_key].get_arp_interface_address_description(
            interface, ip_address, description
        )
        return self.add_set(path)

    # ========================================================================
    # Multicast Route (mroute) Operations
    # ========================================================================

    def set_mroute(self, prefix: str) -> "StaticRoutesBatchBuilder":
        """Create multicast route."""
        path = self.mappers[self.mapper_key].get_mroute_path(prefix)
        return self.add_set(path)

    def delete_mroute(self, prefix: str) -> "StaticRoutesBatchBuilder":
        """Delete multicast route."""
        path = self.mappers[self.mapper_key].get_mroute_path(prefix)
        return self.add_delete(path)

    def set_mroute_interface(
        self, prefix: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set multicast route interface."""
        path = self.mappers[self.mapper_key].get_mroute_interface_path(prefix, interface)
        return self.add_set(path)

    def delete_mroute_interface(
        self, prefix: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete multicast route interface."""
        path = self.mappers[self.mapper_key].get_mroute_interface_path(prefix, interface)
        return self.add_delete(path)

    def set_mroute_interface_disable(
        self, prefix: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable multicast route interface."""
        path = self.mappers[self.mapper_key].get_mroute_interface_disable(prefix, interface)
        return self.add_set(path)

    def delete_mroute_interface_disable(
        self, prefix: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable multicast route interface."""
        path = self.mappers[self.mapper_key].get_mroute_interface_disable(prefix, interface)
        return self.add_delete(path)

    def set_mroute_interface_distance(
        self, prefix: str, interface: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set multicast route interface distance."""
        path = self.mappers[self.mapper_key].get_mroute_interface_distance(
            prefix, interface, distance
        )
        return self.add_set(path)

    def set_mroute_next_hop(
        self, prefix: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Set multicast route next-hop."""
        path = self.mappers[self.mapper_key].get_mroute_next_hop_path(prefix, next_hop)
        return self.add_set(path)

    def delete_mroute_next_hop(
        self, prefix: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete multicast route next-hop."""
        path = self.mappers[self.mapper_key].get_mroute_next_hop_path(prefix, next_hop)
        return self.add_delete(path)

    def set_mroute_next_hop_disable(
        self, prefix: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable multicast route next-hop."""
        path = self.mappers[self.mapper_key].get_mroute_next_hop_disable(prefix, next_hop)
        return self.add_set(path)

    def delete_mroute_next_hop_disable(
        self, prefix: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable multicast route next-hop."""
        path = self.mappers[self.mapper_key].get_mroute_next_hop_disable(prefix, next_hop)
        return self.add_delete(path)

    def set_mroute_next_hop_distance(
        self, prefix: str, next_hop: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set multicast route next-hop distance."""
        path = self.mappers[self.mapper_key].get_mroute_next_hop_distance(
            prefix, next_hop, distance
        )
        return self.add_set(path)

    # ========================================================================
    # Neighbor Proxy Operations
    # ========================================================================

    def set_neighbor_proxy_arp(
        self, ip_address: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set neighbor proxy ARP entry."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_arp_interface(
            ip_address, interface
        )
        return self.add_set(path)

    def delete_neighbor_proxy_arp(
        self, ip_address: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete neighbor proxy ARP entry."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_arp_path(ip_address)
        return self.add_delete(path)

    def delete_neighbor_proxy_arp_interface(
        self, ip_address: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete neighbor proxy ARP interface."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_arp_interface(
            ip_address, interface
        )
        return self.add_delete(path)

    def set_neighbor_proxy_nd(
        self, ipv6_address: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set neighbor proxy ND entry."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_nd_interface(
            ipv6_address, interface
        )
        return self.add_set(path)

    def delete_neighbor_proxy_nd(
        self, ipv6_address: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete neighbor proxy ND entry."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_nd_path(ipv6_address)
        return self.add_delete(path)

    def delete_neighbor_proxy_nd_interface(
        self, ipv6_address: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete neighbor proxy ND interface."""
        path = self.mappers[self.mapper_key].get_neighbor_proxy_nd_interface(
            ipv6_address, interface
        )
        return self.add_delete(path)

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
    # Table IPv4 Route Operations
    # ========================================================================

    def set_table_ipv4_route(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Create IPv4 route in table."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_path(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv4_route(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv4 route from table."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_path(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv4_route_description(
        self, table_id: str, destination: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route description."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_description(
            table_id, destination, description
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def delete_table_ipv4_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop(
            table_id, destination, next_hop
        )
        return self.add_delete(path)

    def set_table_ipv4_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route next-hop distance."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_distance(
            table_id, destination, next_hop, distance
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable table IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_disable(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route next-hop interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_interface(
            table_id, destination, next_hop, interface
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_vrf(
            table_id, destination, next_hop, vrf
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD for table IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_bfd(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def set_table_ipv4_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str, profile: str
    ) -> "StaticRoutesBatchBuilder":
        """Set BFD profile for table IPv4 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_next_hop_bfd_profile(
            table_id, destination, next_hop, profile
        )
        return self.add_set(path)

    def set_table_ipv4_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_interface(
            table_id, destination, interface
        )
        return self.add_set(path)

    def delete_table_ipv4_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv4 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_interface(
            table_id, destination, interface
        )
        return self.add_delete(path)

    def set_table_ipv4_route_interface_distance(
        self, table_id: str, destination: str, interface: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route interface distance."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_interface_distance(
            table_id, destination, interface, distance
        )
        return self.add_set(path)

    def set_table_ipv4_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable table IPv4 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_interface_disable(
            table_id, destination, interface
        )
        return self.add_set(path)

    def set_table_ipv4_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route to blackhole."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_blackhole(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv4_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv4 route blackhole."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_blackhole(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv4_route_blackhole_distance(
        self, table_id: str, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route blackhole distance."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_blackhole_distance(
            table_id, destination, distance
        )
        return self.add_set(path)

    def set_table_ipv4_route_blackhole_tag(
        self, table_id: str, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route blackhole tag."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_blackhole_tag(
            table_id, destination, tag
        )
        return self.add_set(path)

    def set_table_ipv4_route_reject(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route to reject."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_reject(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv4_route_reject(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv4 route reject."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_reject(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv4_route_reject_distance(
        self, table_id: str, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route reject distance."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_reject_distance(
            table_id, destination, distance
        )
        return self.add_set(path)

    def set_table_ipv4_route_reject_tag(
        self, table_id: str, destination: str, tag: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route reject tag."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_reject_tag(
            table_id, destination, tag
        )
        return self.add_set(path)

    def set_table_ipv4_route_dhcp_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv4 route DHCP interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_dhcp_interface(
            table_id, destination, interface
        )
        return self.add_set(path)

    def delete_table_ipv4_route_dhcp_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv4 route DHCP interface."""
        path = self.mappers[self.mapper_key].get_table_ipv4_route_dhcp_interface(
            table_id, destination, interface
        )
        return self.add_delete(path)

    # ========================================================================
    # Table IPv6 Route Operations
    # ========================================================================

    def set_table_ipv6_route(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Create IPv6 route in table."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_path(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv6_route(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete IPv6 route from table."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_path(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv6_route_description(
        self, table_id: str, destination: str, description: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route description."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_description(
            table_id, destination, description
        )
        return self.add_set(path)

    def set_table_ipv6_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def delete_table_ipv6_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop(
            table_id, destination, next_hop
        )
        return self.add_delete(path)

    def set_table_ipv6_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route next-hop distance."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop_distance(
            table_id, destination, next_hop, distance
        )
        return self.add_set(path)

    def set_table_ipv6_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable table IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop_disable(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def set_table_ipv6_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route next-hop interface."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop_interface(
            table_id, destination, next_hop, interface
        )
        return self.add_set(path)

    def set_table_ipv6_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, vrf: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route next-hop VRF."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop_vrf(
            table_id, destination, next_hop, vrf
        )
        return self.add_set(path)

    def set_table_ipv6_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        """Enable BFD for table IPv6 route next-hop."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_next_hop_bfd(
            table_id, destination, next_hop
        )
        return self.add_set(path)

    def set_table_ipv6_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_interface(
            table_id, destination, interface
        )
        return self.add_set(path)

    def delete_table_ipv6_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_interface(
            table_id, destination, interface
        )
        return self.add_delete(path)

    def set_table_ipv6_route_interface_distance(
        self, table_id: str, destination: str, interface: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route interface distance."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_interface_distance(
            table_id, destination, interface, distance
        )
        return self.add_set(path)

    def set_table_ipv6_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        """Disable table IPv6 route interface."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_interface_disable(
            table_id, destination, interface
        )
        return self.add_set(path)

    def set_table_ipv6_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route to blackhole."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_blackhole(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv6_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv6 route blackhole."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_blackhole(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv6_route_blackhole_distance(
        self, table_id: str, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route blackhole distance."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_blackhole_distance(
            table_id, destination, distance
        )
        return self.add_set(path)

    def set_table_ipv6_route_reject(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route to reject."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_reject(table_id, destination)
        return self.add_set(path)

    def delete_table_ipv6_route_reject(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        """Delete table IPv6 route reject."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_reject(table_id, destination)
        return self.add_delete(path)

    def set_table_ipv6_route_reject_distance(
        self, table_id: str, destination: str, distance: str
    ) -> "StaticRoutesBatchBuilder":
        """Set table IPv6 route reject distance."""
        path = self.mappers[self.mapper_key].get_table_ipv6_route_reject_distance(
            table_id, destination, distance
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
                "reject_routes": {
                    "supported": True,
                    "description": "Reject routes (ICMP unreachable)",
                },
                "interface_routes": {
                    "supported": True,
                    "description": "Interface-based routes",
                },
                "next_hop_bfd": {
                    "supported": True,
                    "description": "BFD monitoring for next-hop",
                },
                "next_hop_vrf": {
                    "supported": True,
                    "description": "VRF for next-hop",
                },
                "multicast_routes": {
                    "supported": True,
                    "description": "Multicast static routes",
                },
                "multicast_route_disable": {
                    "supported": is_1_5,
                    "description": "Disable option for multicast routes (VyOS 1.5+)",
                },
                "dhcp_interface": {
                    "supported": True,
                    "description": "DHCP interface routes",
                },
                "segments_ipv6": {
                    "supported": True,
                    "description": "SRv6 segments for IPv6 routes",
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
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
                "multicast_command": "multicast" if is_1_4 else "mroute",
                "multicast_interface_key": "interface-route" if is_1_4 else "interface",
                "multicast_interface_value_key": "next-hop-interface" if is_1_4 else "interface",
            },
        }
