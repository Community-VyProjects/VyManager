"""VyOS 1.5 specific static routes commands."""
from typing import List


class StaticRoutesMapperV1_5:
    """Version-specific mapper for VyOS 1.5."""

    # ========================================================================
    # Multicast Routes (1.5 specific - uses "mroute" instead of "multicast")
    # ========================================================================

    def get_mroute_path(self, destination: str) -> List[str]:
        """Get command path for mroute (1.5)."""
        return ["protocols", "static", "mroute", destination]

    def get_mroute_interface(self, destination: str, interface: str) -> List[str]:
        """Get command path for mroute interface (1.5)."""
        return ["protocols", "static", "mroute", destination, "interface", interface]

    def get_mroute_next_hop(self, destination: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop (1.5)."""
        return ["protocols", "static", "mroute", destination, "next-hop", next_hop]

    # ========================================================================
    # Additional 1.5 Features
    # ========================================================================

    def get_ipv4_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for next-hop BFD (1.5)."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd"
        ]

    def get_ipv4_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> List[str]:
        """Get command path for next-hop BFD profile (1.5)."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "profile", profile
        ]

    def get_ipv4_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        """Get command path for next-hop VRF (1.5)."""
        return [
            "protocols", "static", "route", destination,
            "next-hop", next_hop, "vrf", vrf
        ]

    def get_ipv6_route_next_hop_bfd(
        self, destination: str, next_hop: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD (1.5)."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd"
        ]

    def get_ipv6_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, profile: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop BFD profile (1.5)."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "profile", profile
        ]

    def get_ipv6_route_next_hop_vrf(
        self, destination: str, next_hop: str, vrf: str
    ) -> List[str]:
        """Get command path for IPv6 next-hop VRF (1.5)."""
        return [
            "protocols", "static", "route6", destination,
            "next-hop", next_hop, "vrf", vrf
        ]
