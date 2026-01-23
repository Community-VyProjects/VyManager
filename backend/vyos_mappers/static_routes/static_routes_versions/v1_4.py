"""VyOS 1.4 specific static routes commands."""
from typing import List


class StaticRoutesMapperV1_4:
    """Version-specific mapper for VyOS 1.4."""

    # ========================================================================
    # Multicast Routes (1.4 specific - uses "multicast" instead of "mroute")
    # ========================================================================

    def get_multicast_route_path(self, destination: str) -> List[str]:
        """Get command path for multicast route (1.4)."""
        return ["protocols", "static", "multicast", "route", destination]

    def get_multicast_route_next_hop(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for multicast route next-hop (1.4)."""
        return [
            "protocols", "static", "multicast", "route",
            destination, "next-hop", next_hop
        ]

    def get_multicast_interface_route_path(self, destination: str) -> List[str]:
        """Get command path for multicast interface-route (1.4)."""
        return ["protocols", "static", "multicast", "interface-route", destination]

    def get_multicast_interface_route_next_hop(
        self, destination: str, interface: str
    ) -> List[str]:
        """Get command path for multicast interface-route next-hop (1.4)."""
        return [
            "protocols", "static", "multicast", "interface-route",
            destination, "next-hop-interface", interface
        ]

    # ========================================================================
    # DHCP Interface Routes (available in 1.4)
    # ========================================================================

    def get_ipv4_route_dhcp_interface(
        self, destination: str, interface: str
    ) -> List[str]:
        """Get command path for DHCP interface route."""
        return [
            "protocols", "static", "route", destination,
            "dhcp-interface", interface
        ]

    def get_ipv4_route_dhcp_interface_distance(
        self, destination: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for DHCP interface distance."""
        return [
            "protocols", "static", "route", destination,
            "dhcp-interface", interface, "distance", distance
        ]
