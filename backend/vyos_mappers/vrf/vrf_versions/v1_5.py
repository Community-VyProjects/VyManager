"""VyOS 1.5-specific VRF mapper overrides.

Only the static-route overrides live here: they are reachable through the
version-merged ``vrf_static`` mapper key. Protocol-specific 1.5 features
(OSPF/IS-IS/BGP) are implemented directly in the per-protocol base mappers,
which the builder mixins reach via the ``vrf_ospf``/``vrf_isis``/``vrf_bgp``
keys (those keys are not version-merged).
"""

from typing import List


class VrfMapperV1_5:
    """VyOS 1.5-specific path overrides for VRF static routes."""

    # ========================================================================
    # Static Routes: BFD multi-hop uses source-address (flat leaf)
    # ========================================================================

    def get_static_route_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        """BFD multi-hop in 1.5 uses source-address as flat leaf."""
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source,
        ]

    def get_static_route_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address",
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source,
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address",
        ]

    # ========================================================================
    # Static Routes: IPv4 next-hop segments supported in 1.5
    # ========================================================================

    def get_static_route_next_hop_segments(
        self, name: str, destination: str, next_hop: str, segments: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "segments", segments,
        ]
