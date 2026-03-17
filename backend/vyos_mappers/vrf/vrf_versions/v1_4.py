"""VyOS 1.4-specific VRF mapper overrides."""

from typing import List


class VrfMapperV1_4:
    """VyOS 1.4-specific path overrides for VRF protocols."""

    # ========================================================================
    # Static Routes: BFD multi-hop uses source/<tag>/profile (tagged node)
    # ========================================================================

    def get_static_route_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        """BFD multi-hop source in 1.4 uses source/<tag>/profile pattern."""
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source", source, "profile",
        ]

    def get_static_route_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source",
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source", source, "profile",
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source",
        ]

    # ========================================================================
    # Static Routes: IPv4 next-hop segments NOT supported in 1.4
    # ========================================================================

    def get_static_route_next_hop_segments(
        self, name: str, destination: str, next_hop: str, segments: str
    ) -> List[str]:
        """IPv4 SRv6 segments not supported in 1.4 — return empty path."""
        return []
