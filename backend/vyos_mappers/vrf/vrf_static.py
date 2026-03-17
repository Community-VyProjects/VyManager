"""
VRF Static Routes Command Mapper

Handles command path generation for static route configuration within VRF instances.
Covers: route (IPv4), route6 (IPv6), blackhole, reject, next-hop, interface routes.
"""

from typing import List


class VrfStaticMapper:
    """Mapper for VRF static route paths. Common between VyOS 1.4 and 1.5."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "static"]

    # ========================================================================
    # IPv4 Route Paths
    # ========================================================================

    def get_static_route(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route", destination]

    def get_static_route_description(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "description", value]

    def get_static_route_dhcp_interface(self, name: str, destination: str, iface: str) -> List[str]:
        return self._base(name) + ["route", destination, "dhcp-interface", iface]

    # Next-hop
    def get_static_route_next_hop(self, name: str, destination: str, next_hop: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop]

    def get_static_route_next_hop_disable(self, name: str, destination: str, next_hop: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop, "disable"]

    def get_static_route_next_hop_distance(self, name: str, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop, "distance", value]

    def get_static_route_next_hop_interface(self, name: str, destination: str, next_hop: str, iface: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop, "interface", iface]

    def get_static_route_next_hop_vrf(self, name: str, destination: str, next_hop: str, vrf: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop, "vrf", vrf]

    def get_static_route_next_hop_bfd_profile(self, name: str, destination: str, next_hop: str, profile: str) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop, "bfd", "profile", profile]

    # Interface route
    def get_static_route_interface(self, name: str, destination: str, iface: str) -> List[str]:
        return self._base(name) + ["route", destination, "interface", iface]

    def get_static_route_interface_disable(self, name: str, destination: str, iface: str) -> List[str]:
        return self._base(name) + ["route", destination, "interface", iface, "disable"]

    def get_static_route_interface_distance(self, name: str, destination: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "interface", iface, "distance", value]

    def get_static_route_interface_vrf(self, name: str, destination: str, iface: str, vrf: str) -> List[str]:
        return self._base(name) + ["route", destination, "interface", iface, "vrf", vrf]

    # Blackhole
    def get_static_route_blackhole(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route", destination, "blackhole"]

    def get_static_route_blackhole_distance(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "blackhole", "distance", value]

    def get_static_route_blackhole_tag(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "blackhole", "tag", value]

    # Reject
    def get_static_route_reject(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route", destination, "reject"]

    def get_static_route_reject_distance(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "reject", "distance", value]

    def get_static_route_reject_tag(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route", destination, "reject", "tag", value]

    # ========================================================================
    # IPv6 Route Paths
    # ========================================================================

    def get_static_route6(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route6", destination]

    def get_static_route6_description(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "description", value]

    # Next-hop
    def get_static_route6_next_hop(self, name: str, destination: str, next_hop: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop]

    def get_static_route6_next_hop_disable(self, name: str, destination: str, next_hop: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "disable"]

    def get_static_route6_next_hop_distance(self, name: str, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "distance", value]

    def get_static_route6_next_hop_interface(self, name: str, destination: str, next_hop: str, iface: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "interface", iface]

    def get_static_route6_next_hop_vrf(self, name: str, destination: str, next_hop: str, vrf: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "vrf", vrf]

    def get_static_route6_next_hop_bfd_profile(self, name: str, destination: str, next_hop: str, profile: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "bfd", "profile", profile]

    def get_static_route6_next_hop_segments(self, name: str, destination: str, next_hop: str, segments: str) -> List[str]:
        return self._base(name) + ["route6", destination, "next-hop", next_hop, "segments", segments]

    # Interface route
    def get_static_route6_interface(self, name: str, destination: str, iface: str) -> List[str]:
        return self._base(name) + ["route6", destination, "interface", iface]

    def get_static_route6_interface_disable(self, name: str, destination: str, iface: str) -> List[str]:
        return self._base(name) + ["route6", destination, "interface", iface, "disable"]

    def get_static_route6_interface_distance(self, name: str, destination: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "interface", iface, "distance", value]

    def get_static_route6_interface_vrf(self, name: str, destination: str, iface: str, vrf: str) -> List[str]:
        return self._base(name) + ["route6", destination, "interface", iface, "vrf", vrf]

    def get_static_route6_interface_segments(self, name: str, destination: str, iface: str, segments: str) -> List[str]:
        return self._base(name) + ["route6", destination, "interface", iface, "segments", segments]

    # Blackhole
    def get_static_route6_blackhole(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route6", destination, "blackhole"]

    def get_static_route6_blackhole_distance(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "blackhole", "distance", value]

    def get_static_route6_blackhole_tag(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "blackhole", "tag", value]

    # Reject
    def get_static_route6_reject(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route6", destination, "reject"]

    def get_static_route6_reject_distance(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "reject", "distance", value]

    def get_static_route6_reject_tag(self, name: str, destination: str, value: str) -> List[str]:
        return self._base(name) + ["route6", destination, "reject", "tag", value]
