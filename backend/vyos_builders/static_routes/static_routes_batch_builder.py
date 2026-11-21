"""
Static Routes Batch Builder

Batch operations for ``protocols static``: IPv4 and IPv6 routes (global and
inside a routing table), routing tables, the route-map, static ARP,
multicast routes and neighbor proxy. The VRF builder runs the global route
ops under ``vrf name <vrf>``.

Version differences live on the mapper subclasses. A leaf only one version
has goes through ``_versioned_path`` and raises ``ValueError`` elsewhere.
"""

from typing import Any, Dict, List, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.static_routes.static_routes import StaticRoutesMapper

# Version-only nodes (StaticRoutesMapper.versioned_nodes).
IPV4_SEGMENTS = "route segments"
SOURCE_PROFILE = "next-hop bfd multi-hop source profile"
MROUTE = "mroute"


class StaticRoutesBatchBuilder(BatchBuilder):
    """Complete batch builder for static routes operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "static_routes"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    # ========================================================================
    # Core
    # ========================================================================

    @property
    def m(self) -> StaticRoutesMapper:
        return cast(StaticRoutesMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a leaf only one VyOS version has; ValueError elsewhere."""
        mapper = self.m
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # IPv4 Routes
    # ========================================================================

    def set_ipv4_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route("ipv4", None, destination))

    def delete_ipv4_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route("ipv4", None, destination))

    def set_ipv4_route_description(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_description("ipv4", None, destination, value))

    def delete_ipv4_route_description(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_description_delete("ipv4", None, destination))

    def set_ipv4_route_blackhole(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole("ipv4", None, destination))

    def delete_ipv4_route_blackhole(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole("ipv4", None, destination))

    def set_ipv4_route_blackhole_distance(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_distance("ipv4", None, destination, value))

    def delete_ipv4_route_blackhole_distance(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_distance_delete("ipv4", None, destination))

    def set_ipv4_route_blackhole_tag(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_tag("ipv4", None, destination, value))

    def delete_ipv4_route_blackhole_tag(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_tag_delete("ipv4", None, destination))

    def set_ipv4_route_reject(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject("ipv4", None, destination))

    def delete_ipv4_route_reject(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject("ipv4", None, destination))

    def set_ipv4_route_reject_distance(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_distance("ipv4", None, destination, value))

    def delete_ipv4_route_reject_distance(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_distance_delete("ipv4", None, destination))

    def set_ipv4_route_reject_tag(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_tag("ipv4", None, destination, value))

    def delete_ipv4_route_reject_tag(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_tag_delete("ipv4", None, destination))

    def set_ipv4_route_dhcp_interface(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_dhcp_interface(None, destination, interface))

    def delete_ipv4_route_dhcp_interface(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_dhcp_interface(None, destination, interface))

    def set_ipv4_route_interface(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface("ipv4", None, destination, interface))

    def delete_ipv4_route_interface(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface("ipv4", None, destination, interface))

    def set_ipv4_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_disable("ipv4", None, destination, interface))

    def delete_ipv4_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_disable("ipv4", None, destination, interface))

    def set_ipv4_route_interface_distance(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_distance("ipv4", None, destination, interface, value))

    def delete_ipv4_route_interface_distance(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_distance_delete("ipv4", None, destination, interface)
        )

    def set_ipv4_route_interface_segments(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            IPV4_SEGMENTS, "get_route_interface_segments",
            "ipv4", None, destination, interface, value,
        ))

    def delete_ipv4_route_interface_segments(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            IPV4_SEGMENTS, "get_route_interface_segments_delete",
            "ipv4", None, destination, interface,
        ))

    def set_ipv4_route_interface_vrf(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_vrf("ipv4", None, destination, interface, value))

    def delete_ipv4_route_interface_vrf(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_vrf_delete("ipv4", None, destination, interface))

    def set_ipv4_route_next_hop(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop("ipv4", None, destination, next_hop))

    def delete_ipv4_route_next_hop(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop("ipv4", None, destination, next_hop))

    def set_ipv4_route_next_hop_bfd(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd("ipv4", None, destination, next_hop))

    def delete_ipv4_route_next_hop_bfd(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd("ipv4", None, destination, next_hop))

    def set_ipv4_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_profile("ipv4", None, destination, next_hop, value))

    def delete_ipv4_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_profile_delete("ipv4", None, destination, next_hop)
        )

    def set_ipv4_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_multi_hop("ipv4", None, destination, next_hop))

    def delete_ipv4_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd_multi_hop("ipv4", None, destination, next_hop))

    def set_ipv4_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_multi_hop_source("ipv4", None, destination, next_hop, value)
        )

    def delete_ipv4_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop_source_delete("ipv4", None, destination, next_hop)
        )

    def set_ipv4_route_next_hop_bfd_multi_hop_source_profile(
        self, destination: str, next_hop: str, source: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile",
            "ipv4", None, destination, next_hop, source, value,
        ))

    def delete_ipv4_route_next_hop_bfd_multi_hop_source_profile(
        self, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile_delete",
            "ipv4", None, destination, next_hop, source,
        ))

    def set_ipv4_route_next_hop_disable(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_disable("ipv4", None, destination, next_hop))

    def delete_ipv4_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_disable("ipv4", None, destination, next_hop))

    def set_ipv4_route_next_hop_distance(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_distance("ipv4", None, destination, next_hop, value))

    def delete_ipv4_route_next_hop_distance(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_distance_delete("ipv4", None, destination, next_hop))

    def set_ipv4_route_next_hop_interface(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_interface("ipv4", None, destination, next_hop, value))

    def delete_ipv4_route_next_hop_interface(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_interface_delete("ipv4", None, destination, next_hop)
        )

    def set_ipv4_route_next_hop_segments(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            IPV4_SEGMENTS, "get_route_next_hop_segments",
            "ipv4", None, destination, next_hop, value,
        ))

    def delete_ipv4_route_next_hop_segments(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            IPV4_SEGMENTS, "get_route_next_hop_segments_delete",
            "ipv4", None, destination, next_hop,
        ))

    def set_ipv4_route_next_hop_vrf(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_vrf("ipv4", None, destination, next_hop, value))

    def delete_ipv4_route_next_hop_vrf(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_vrf_delete("ipv4", None, destination, next_hop))

    # ========================================================================
    # IPv6 Routes
    # ========================================================================

    def set_ipv6_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route("ipv6", None, destination))

    def delete_ipv6_route(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route("ipv6", None, destination))

    def set_ipv6_route_description(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_description("ipv6", None, destination, value))

    def delete_ipv6_route_description(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_description_delete("ipv6", None, destination))

    def set_ipv6_route_blackhole(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole("ipv6", None, destination))

    def delete_ipv6_route_blackhole(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole("ipv6", None, destination))

    def set_ipv6_route_blackhole_distance(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_distance("ipv6", None, destination, value))

    def delete_ipv6_route_blackhole_distance(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_distance_delete("ipv6", None, destination))

    def set_ipv6_route_blackhole_tag(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_tag("ipv6", None, destination, value))

    def delete_ipv6_route_blackhole_tag(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_tag_delete("ipv6", None, destination))

    def set_ipv6_route_reject(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject("ipv6", None, destination))

    def delete_ipv6_route_reject(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject("ipv6", None, destination))

    def set_ipv6_route_reject_distance(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_distance("ipv6", None, destination, value))

    def delete_ipv6_route_reject_distance(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_distance_delete("ipv6", None, destination))

    def set_ipv6_route_reject_tag(self, destination: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_tag("ipv6", None, destination, value))

    def delete_ipv6_route_reject_tag(self, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_tag_delete("ipv6", None, destination))

    def set_ipv6_route_interface(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface("ipv6", None, destination, interface))

    def delete_ipv6_route_interface(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface("ipv6", None, destination, interface))

    def set_ipv6_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_disable("ipv6", None, destination, interface))

    def delete_ipv6_route_interface_disable(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_disable("ipv6", None, destination, interface))

    def set_ipv6_route_interface_distance(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_distance("ipv6", None, destination, interface, value))

    def delete_ipv6_route_interface_distance(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_distance_delete("ipv6", None, destination, interface)
        )

    def set_ipv6_route_interface_segments(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_segments("ipv6", None, destination, interface, value))

    def delete_ipv6_route_interface_segments(
        self, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_segments_delete("ipv6", None, destination, interface)
        )

    def set_ipv6_route_interface_vrf(
        self, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_vrf("ipv6", None, destination, interface, value))

    def delete_ipv6_route_interface_vrf(self, destination: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_vrf_delete("ipv6", None, destination, interface))

    def set_ipv6_route_next_hop(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop("ipv6", None, destination, next_hop))

    def delete_ipv6_route_next_hop(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_bfd(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd("ipv6", None, destination, next_hop))

    def delete_ipv6_route_next_hop_bfd(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_profile("ipv6", None, destination, next_hop, value))

    def delete_ipv6_route_next_hop_bfd_profile(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_profile_delete("ipv6", None, destination, next_hop)
        )

    def set_ipv6_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_multi_hop("ipv6", None, destination, next_hop))

    def delete_ipv6_route_next_hop_bfd_multi_hop(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd_multi_hop("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_multi_hop_source("ipv6", None, destination, next_hop, value)
        )

    def delete_ipv6_route_next_hop_bfd_multi_hop_source(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop_source_delete("ipv6", None, destination, next_hop)
        )

    def set_ipv6_route_next_hop_bfd_multi_hop_source_profile(
        self, destination: str, next_hop: str, source: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile",
            "ipv6", None, destination, next_hop, source, value,
        ))

    def delete_ipv6_route_next_hop_bfd_multi_hop_source_profile(
        self, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile_delete",
            "ipv6", None, destination, next_hop, source,
        ))

    def set_ipv6_route_next_hop_disable(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_disable("ipv6", None, destination, next_hop))

    def delete_ipv6_route_next_hop_disable(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_disable("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_distance(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_distance("ipv6", None, destination, next_hop, value))

    def delete_ipv6_route_next_hop_distance(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_distance_delete("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_interface(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_interface("ipv6", None, destination, next_hop, value))

    def delete_ipv6_route_next_hop_interface(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_interface_delete("ipv6", None, destination, next_hop)
        )

    def set_ipv6_route_next_hop_segments(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_segments("ipv6", None, destination, next_hop, value))

    def delete_ipv6_route_next_hop_segments(
        self, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_segments_delete("ipv6", None, destination, next_hop))

    def set_ipv6_route_next_hop_vrf(
        self, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_vrf("ipv6", None, destination, next_hop, value))

    def delete_ipv6_route_next_hop_vrf(self, destination: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_vrf_delete("ipv6", None, destination, next_hop))

    # ========================================================================
    # Routing Table IPv4 Routes
    # ========================================================================

    def set_table_ipv4_route(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route("ipv4", table_id, destination))

    def delete_table_ipv4_route(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route("ipv4", table_id, destination))

    def set_table_ipv4_route_description(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_description("ipv4", table_id, destination, value))

    def delete_table_ipv4_route_description(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_description_delete("ipv4", table_id, destination))

    def set_table_ipv4_route_blackhole(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole("ipv4", table_id, destination))

    def delete_table_ipv4_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole("ipv4", table_id, destination))

    def set_table_ipv4_route_blackhole_distance(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_distance("ipv4", table_id, destination, value))

    def delete_table_ipv4_route_blackhole_distance(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_distance_delete("ipv4", table_id, destination))

    def set_table_ipv4_route_blackhole_tag(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_tag("ipv4", table_id, destination, value))

    def delete_table_ipv4_route_blackhole_tag(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_tag_delete("ipv4", table_id, destination))

    def set_table_ipv4_route_reject(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject("ipv4", table_id, destination))

    def delete_table_ipv4_route_reject(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject("ipv4", table_id, destination))

    def set_table_ipv4_route_reject_distance(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_distance("ipv4", table_id, destination, value))

    def delete_table_ipv4_route_reject_distance(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_distance_delete("ipv4", table_id, destination))

    def set_table_ipv4_route_reject_tag(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_tag("ipv4", table_id, destination, value))

    def delete_table_ipv4_route_reject_tag(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_tag_delete("ipv4", table_id, destination))

    def set_table_ipv4_route_dhcp_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_dhcp_interface(table_id, destination, interface))

    def delete_table_ipv4_route_dhcp_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_dhcp_interface(table_id, destination, interface))

    def set_table_ipv4_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface("ipv4", table_id, destination, interface))

    def delete_table_ipv4_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface("ipv4", table_id, destination, interface))

    def set_table_ipv4_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_disable("ipv4", table_id, destination, interface))

    def delete_table_ipv4_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_disable("ipv4", table_id, destination, interface))

    def set_table_ipv4_route_interface_distance(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_interface_distance("ipv4", table_id, destination, interface, value)
        )

    def delete_table_ipv4_route_interface_distance(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_distance_delete("ipv4", table_id, destination, interface)
        )

    def set_table_ipv4_route_interface_segments(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            IPV4_SEGMENTS, "get_route_interface_segments",
            "ipv4", table_id, destination, interface, value,
        ))

    def delete_table_ipv4_route_interface_segments(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            IPV4_SEGMENTS, "get_route_interface_segments_delete",
            "ipv4", table_id, destination, interface,
        ))

    def set_table_ipv4_route_interface_vrf(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_vrf("ipv4", table_id, destination, interface, value))

    def delete_table_ipv4_route_interface_vrf(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_vrf_delete("ipv4", table_id, destination, interface)
        )

    def set_table_ipv4_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop("ipv4", table_id, destination, next_hop))

    def delete_table_ipv4_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop("ipv4", table_id, destination, next_hop))

    def set_table_ipv4_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd("ipv4", table_id, destination, next_hop))

    def delete_table_ipv4_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd("ipv4", table_id, destination, next_hop))

    def set_table_ipv4_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_profile("ipv4", table_id, destination, next_hop, value)
        )

    def delete_table_ipv4_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_profile_delete("ipv4", table_id, destination, next_hop)
        )

    def set_table_ipv4_route_next_hop_bfd_multi_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_multi_hop("ipv4", table_id, destination, next_hop))

    def delete_table_ipv4_route_next_hop_bfd_multi_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop("ipv4", table_id, destination, next_hop)
        )

    def set_table_ipv4_route_next_hop_bfd_multi_hop_source(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_multi_hop_source("ipv4", table_id, destination, next_hop, value)
        )

    def delete_table_ipv4_route_next_hop_bfd_multi_hop_source(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop_source_delete("ipv4", table_id, destination, next_hop)
        )

    def set_table_ipv4_route_next_hop_bfd_multi_hop_source_profile(
        self, table_id: str, destination: str, next_hop: str, source: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile",
            "ipv4", table_id, destination, next_hop, source, value,
        ))

    def delete_table_ipv4_route_next_hop_bfd_multi_hop_source_profile(
        self, table_id: str, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile_delete",
            "ipv4", table_id, destination, next_hop, source,
        ))

    def set_table_ipv4_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_disable("ipv4", table_id, destination, next_hop))

    def delete_table_ipv4_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_disable("ipv4", table_id, destination, next_hop))

    def set_table_ipv4_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_distance("ipv4", table_id, destination, next_hop, value)
        )

    def delete_table_ipv4_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_distance_delete("ipv4", table_id, destination, next_hop)
        )

    def set_table_ipv4_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_interface("ipv4", table_id, destination, next_hop, value)
        )

    def delete_table_ipv4_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_interface_delete("ipv4", table_id, destination, next_hop)
        )

    def set_table_ipv4_route_next_hop_segments(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            IPV4_SEGMENTS, "get_route_next_hop_segments",
            "ipv4", table_id, destination, next_hop, value,
        ))

    def delete_table_ipv4_route_next_hop_segments(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            IPV4_SEGMENTS, "get_route_next_hop_segments_delete",
            "ipv4", table_id, destination, next_hop,
        ))

    def set_table_ipv4_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_vrf("ipv4", table_id, destination, next_hop, value))

    def delete_table_ipv4_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_vrf_delete("ipv4", table_id, destination, next_hop))

    # ========================================================================
    # Routing Table IPv6 Routes
    # ========================================================================

    def set_table_ipv6_route(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route("ipv6", table_id, destination))

    def delete_table_ipv6_route(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route("ipv6", table_id, destination))

    def set_table_ipv6_route_description(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_description("ipv6", table_id, destination, value))

    def delete_table_ipv6_route_description(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_description_delete("ipv6", table_id, destination))

    def set_table_ipv6_route_blackhole(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole("ipv6", table_id, destination))

    def delete_table_ipv6_route_blackhole(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole("ipv6", table_id, destination))

    def set_table_ipv6_route_blackhole_distance(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_distance("ipv6", table_id, destination, value))

    def delete_table_ipv6_route_blackhole_distance(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_distance_delete("ipv6", table_id, destination))

    def set_table_ipv6_route_blackhole_tag(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_blackhole_tag("ipv6", table_id, destination, value))

    def delete_table_ipv6_route_blackhole_tag(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_blackhole_tag_delete("ipv6", table_id, destination))

    def set_table_ipv6_route_reject(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject("ipv6", table_id, destination))

    def delete_table_ipv6_route_reject(self, table_id: str, destination: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject("ipv6", table_id, destination))

    def set_table_ipv6_route_reject_distance(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_distance("ipv6", table_id, destination, value))

    def delete_table_ipv6_route_reject_distance(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_distance_delete("ipv6", table_id, destination))

    def set_table_ipv6_route_reject_tag(
        self, table_id: str, destination: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_reject_tag("ipv6", table_id, destination, value))

    def delete_table_ipv6_route_reject_tag(
        self, table_id: str, destination: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_reject_tag_delete("ipv6", table_id, destination))

    def set_table_ipv6_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface("ipv6", table_id, destination, interface))

    def delete_table_ipv6_route_interface(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface("ipv6", table_id, destination, interface))

    def set_table_ipv6_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_disable("ipv6", table_id, destination, interface))

    def delete_table_ipv6_route_interface_disable(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_interface_disable("ipv6", table_id, destination, interface))

    def set_table_ipv6_route_interface_distance(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_interface_distance("ipv6", table_id, destination, interface, value)
        )

    def delete_table_ipv6_route_interface_distance(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_distance_delete("ipv6", table_id, destination, interface)
        )

    def set_table_ipv6_route_interface_segments(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_interface_segments("ipv6", table_id, destination, interface, value)
        )

    def delete_table_ipv6_route_interface_segments(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_segments_delete("ipv6", table_id, destination, interface)
        )

    def set_table_ipv6_route_interface_vrf(
        self, table_id: str, destination: str, interface: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_interface_vrf("ipv6", table_id, destination, interface, value))

    def delete_table_ipv6_route_interface_vrf(
        self, table_id: str, destination: str, interface: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_interface_vrf_delete("ipv6", table_id, destination, interface)
        )

    def set_table_ipv6_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop("ipv6", table_id, destination, next_hop))

    def delete_table_ipv6_route_next_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop("ipv6", table_id, destination, next_hop))

    def set_table_ipv6_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd("ipv6", table_id, destination, next_hop))

    def delete_table_ipv6_route_next_hop_bfd(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_bfd("ipv6", table_id, destination, next_hop))

    def set_table_ipv6_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_profile("ipv6", table_id, destination, next_hop, value)
        )

    def delete_table_ipv6_route_next_hop_bfd_profile(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_profile_delete("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_bfd_multi_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_bfd_multi_hop("ipv6", table_id, destination, next_hop))

    def delete_table_ipv6_route_next_hop_bfd_multi_hop(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_bfd_multi_hop_source(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_bfd_multi_hop_source("ipv6", table_id, destination, next_hop, value)
        )

    def delete_table_ipv6_route_next_hop_bfd_multi_hop_source(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_bfd_multi_hop_source_delete("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_bfd_multi_hop_source_profile(
        self, table_id: str, destination: str, next_hop: str, source: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile",
            "ipv6", table_id, destination, next_hop, source, value,
        ))

    def delete_table_ipv6_route_next_hop_bfd_multi_hop_source_profile(
        self, table_id: str, destination: str, next_hop: str, source: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(
            SOURCE_PROFILE, "get_route_next_hop_bfd_multi_hop_source_profile_delete",
            "ipv6", table_id, destination, next_hop, source,
        ))

    def set_table_ipv6_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_disable("ipv6", table_id, destination, next_hop))

    def delete_table_ipv6_route_next_hop_disable(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_disable("ipv6", table_id, destination, next_hop))

    def set_table_ipv6_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_distance("ipv6", table_id, destination, next_hop, value)
        )

    def delete_table_ipv6_route_next_hop_distance(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_distance_delete("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_interface("ipv6", table_id, destination, next_hop, value)
        )

    def delete_table_ipv6_route_next_hop_interface(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_interface_delete("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_segments(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(
            self.m.get_route_next_hop_segments("ipv6", table_id, destination, next_hop, value)
        )

    def delete_table_ipv6_route_next_hop_segments(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(
            self.m.get_route_next_hop_segments_delete("ipv6", table_id, destination, next_hop)
        )

    def set_table_ipv6_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str, value: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_next_hop_vrf("ipv6", table_id, destination, next_hop, value))

    def delete_table_ipv6_route_next_hop_vrf(
        self, table_id: str, destination: str, next_hop: str
    ) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_next_hop_vrf_delete("ipv6", table_id, destination, next_hop))


    # ========================================================================
    # Routing Tables
    # ========================================================================

    def set_table(self, table_id: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_table(table_id))

    def delete_table(self, table_id: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_table(table_id))

    def set_table_description(self, table_id: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_table_description(table_id, value))

    def delete_table_description(self, table_id: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_table_description_delete(table_id))

    # ========================================================================
    # Route-map
    # ========================================================================

    def set_route_map(self, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_route_map(value))

    def delete_route_map(self) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_route_map_delete())

    # ========================================================================
    # Static ARP
    # ========================================================================

    def set_arp_interface(self, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_arp_interface(interface))

    def delete_arp_interface(self, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_arp_interface(interface))

    def set_arp_entry(self, interface: str, address: str, mac: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_arp_entry_mac(interface, address, mac))

    def delete_arp_entry(self, interface: str, address: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_arp_entry(interface, address))

    def set_arp_entry_description(self, interface: str, address: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_arp_entry_description(interface, address, value))

    def delete_arp_entry_description(self, interface: str, address: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_arp_entry_description_delete(interface, address))

    # ========================================================================
    # Multicast Routes
    # ========================================================================

    def set_mroute(self, prefix: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(MROUTE, "get_mroute", prefix))

    def delete_mroute(self, prefix: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(MROUTE, "get_mroute", prefix))

    def delete_mroute_next_hops(self, prefix: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_next_hop_root(prefix))

    def delete_mroute_interfaces(self, prefix: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_interface_root(prefix))

    def set_mroute_next_hop(self, prefix: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_mroute_next_hop(prefix, next_hop))

    def delete_mroute_next_hop(self, prefix: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_next_hop(prefix, next_hop))

    def set_mroute_next_hop_distance(self, prefix: str, next_hop: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_mroute_next_hop_distance(prefix, next_hop, value))

    def delete_mroute_next_hop_distance(self, prefix: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_next_hop_distance_delete(prefix, next_hop))

    def set_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(MROUTE, "get_mroute_next_hop_disable", prefix, next_hop))

    def delete_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(MROUTE, "get_mroute_next_hop_disable", prefix, next_hop))

    def set_mroute_interface(self, prefix: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_mroute_interface(prefix, interface))

    def delete_mroute_interface(self, prefix: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_interface(prefix, interface))

    def set_mroute_interface_distance(self, prefix: str, interface: str, value: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_mroute_interface_distance(prefix, interface, value))

    def delete_mroute_interface_distance(self, prefix: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_mroute_interface_distance_delete(prefix, interface))

    def set_mroute_interface_disable(self, prefix: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self._versioned_path(MROUTE, "get_mroute_interface_disable", prefix, interface))

    def delete_mroute_interface_disable(self, prefix: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self._versioned_path(MROUTE, "get_mroute_interface_disable", prefix, interface))

    # ========================================================================
    # Neighbor Proxy
    # ========================================================================

    def set_neighbor_proxy_arp(self, address: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_neighbor_proxy_interface("arp", address, interface))

    def delete_neighbor_proxy_arp(self, address: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_neighbor_proxy("arp", address))

    def delete_neighbor_proxy_arp_interface(self, address: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_neighbor_proxy_interface("arp", address, interface))

    def set_neighbor_proxy_nd(self, address: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_set(self.m.get_neighbor_proxy_interface("nd", address, interface))

    def delete_neighbor_proxy_nd(self, address: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_neighbor_proxy("nd", address))

    def delete_neighbor_proxy_nd_interface(self, address: str, interface: str) -> "StaticRoutesBatchBuilder":
        return self.add_delete(self.m.get_neighbor_proxy_interface("nd", address, interface))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Flags for the leaves only one VyOS version has."""
        mapper = self.m
        return {
            "version": self.version,
            "features": {
                "route_ipv4_segments": {
                    "supported": mapper.supports_node(IPV4_SEGMENTS),
                    "description": "SRv6 segments on IPv4 route next-hops and interfaces",
                },
                "next_hop_bfd_source_profile": {
                    "supported": mapper.supports_node(SOURCE_PROFILE),
                    "description": "BFD profile per multi-hop source address",
                },
                "multicast_mroute": {
                    "supported": mapper.supports_node(MROUTE),
                    "description": "Multicast routes as one mroute node with next-hop and interface disable",
                },
            },
        }
