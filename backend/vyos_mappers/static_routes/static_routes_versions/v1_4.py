"""VyOS 1.4 specific static routes commands."""
from typing import List


class StaticRoutesMapperV1_4:
    """
    Version-specific mapper for VyOS 1.4.

    Key differences from VyOS 1.5:
    - Multicast routes use "multicast" instead of "mroute"
    - Multicast routes have separate "route" and "interface-route" subtypes
    - Interface routes use "next-hop-interface" instead of "interface"
    """

    # ========================================================================
    # Multicast Routes (1.4 specific - uses "multicast" instead of "mroute")
    # VyOS 1.4 structure:
    #   multicast route <dst> next-hop <ip> [distance <n>]
    #   multicast interface-route <dst> next-hop-interface <interface> [distance <n>]
    # ========================================================================

    def get_mroute_path(self, prefix: str) -> List[str]:
        """Get command path for multicast route (1.4 - route type)."""
        return ["protocols", "static", "multicast", "route", prefix]

    def get_mroute_next_hop_path(self, prefix: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop (1.4)."""
        return [
            "protocols", "static", "multicast", "route",
            prefix, "next-hop", next_hop
        ]

    def get_mroute_next_hop_distance(
        self, prefix: str, next_hop: str, distance: str
    ) -> List[str]:
        """Get command path for mroute next-hop distance (1.4)."""
        return [
            "protocols", "static", "multicast", "route",
            prefix, "next-hop", next_hop, "distance", distance
        ]

    def get_mroute_interface_route_path(self, prefix: str) -> List[str]:
        """Get command path for multicast interface-route (1.4)."""
        return ["protocols", "static", "multicast", "interface-route", prefix]

    def get_mroute_interface_path(self, prefix: str, interface: str) -> List[str]:
        """Get command path for mroute interface (1.4 - uses interface-route)."""
        return [
            "protocols", "static", "multicast", "interface-route",
            prefix, "next-hop-interface", interface
        ]

    def get_mroute_interface_distance(
        self, prefix: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for mroute interface distance (1.4)."""
        return [
            "protocols", "static", "multicast", "interface-route",
            prefix, "next-hop-interface", interface, "distance", distance
        ]

    # Note: VyOS 1.4 multicast routes don't have disable option
    def get_mroute_interface_disable(self, prefix: str, interface: str) -> List[str]:
        """Not supported in VyOS 1.4 - returns empty path."""
        return []

    def get_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> List[str]:
        """Not supported in VyOS 1.4 - returns empty path."""
        return []

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

    # ========================================================================
    # Config key for parsing
    # ========================================================================

    def get_multicast_config_key(self) -> str:
        """Return the config key for multicast routes in VyOS 1.4."""
        return "multicast"
