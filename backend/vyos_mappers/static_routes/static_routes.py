"""
Static Routes Command Mapper

Paths for ``protocols static``: IPv4 and IPv6 routes (global or inside a
routing table; the VRF builder runs the same paths under ``vrf name <vrf>``
through ``PathPrefixMapper``), routing tables, static ARP, multicast routes,
neighbor proxy and the route-map.

The shared class holds the commands both labs have. A leaf only one version
has, and the multicast and BFD multi-hop source trees the two versions spell
differently, live on the version subclass in ``static_routes_versions``.
``_VERSIONED_NODES`` maps each version-only node to the subclass path method
that defines it; ``versioned_nodes()`` is the set of those the device has.
"""

from abc import abstractmethod
from typing import Any, Dict, FrozenSet, List, Optional

from ..base import BaseFeatureMapper

ROOT = ["protocols", "static"]
_FAMILY_NODES = {"ipv4": "route", "ipv6": "route6"}

# Version-only nodes (keys of StaticRoutesMapper._VERSIONED_NODES).
IPV4_SEGMENTS = "route segments"
SOURCE_PROFILE = "next-hop bfd multi-hop source profile"
MROUTE = "mroute"


class StaticRoutesMapper(BaseFeatureMapper):
    """Static route commands both labs share."""

    # ========================================================================
    # Core
    # ========================================================================

    _VERSIONED_NODES: Dict[str, str] = {
        IPV4_SEGMENTS: "get_route_next_hop_segments",
        SOURCE_PROFILE: "get_route_next_hop_bfd_multi_hop_source_profile",
        MROUTE: "get_mroute",
    }

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only static leaves this device has.

        Each one is a path method on the version subclass. Capabilities, the
        builder and the parse read this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def supports_node(self, node: str) -> bool:
        return node in self.versioned_nodes()

    def require_node(self, node: str) -> None:
        if not self.supports_node(node):
            raise ValueError(f"protocols static {node} is not supported on this device")

    def parse_config(self, full_config: Any) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_static_config

        return parse_static_config(self, full_config)

    def _route(self, family: str, table: Optional[str], destination: str) -> List[str]:
        scope = ROOT + ["table", table] if table else list(ROOT)
        return scope + [_FAMILY_NODES[family], destination]

    def _next_hop(self, family: str, table: Optional[str], destination: str, next_hop: str) -> List[str]:
        return self._route(family, table, destination) + ["next-hop", next_hop]

    def _interface(self, family: str, table: Optional[str], destination: str, interface: str) -> List[str]:
        return self._route(family, table, destination) + ["interface", interface]

    # ========================================================================
    # Route
    # ========================================================================

    def get_route(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self._route(family, table, destination)

    def get_route_description(self, family: str, table: Optional[str], destination: str, value: str) -> List[str]:
        return self._route(family, table, destination) + ["description", value]

    def get_route_description_delete(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self._route(family, table, destination) + ["description"]

    def get_route_blackhole(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self._route(family, table, destination) + ["blackhole"]

    def get_route_blackhole_distance(self, family: str, table: Optional[str], destination: str, value: str) -> List[str]:
        return self.get_route_blackhole(family, table, destination) + ["distance", value]

    def get_route_blackhole_distance_delete(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self.get_route_blackhole(family, table, destination) + ["distance"]

    def get_route_blackhole_tag(self, family: str, table: Optional[str], destination: str, value: str) -> List[str]:
        return self.get_route_blackhole(family, table, destination) + ["tag", value]

    def get_route_blackhole_tag_delete(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self.get_route_blackhole(family, table, destination) + ["tag"]

    def get_route_reject(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self._route(family, table, destination) + ["reject"]

    def get_route_reject_distance(self, family: str, table: Optional[str], destination: str, value: str) -> List[str]:
        return self.get_route_reject(family, table, destination) + ["distance", value]

    def get_route_reject_distance_delete(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self.get_route_reject(family, table, destination) + ["distance"]

    def get_route_reject_tag(self, family: str, table: Optional[str], destination: str, value: str) -> List[str]:
        return self.get_route_reject(family, table, destination) + ["tag", value]

    def get_route_reject_tag_delete(self, family: str, table: Optional[str], destination: str) -> List[str]:
        return self.get_route_reject(family, table, destination) + ["tag"]

    def dhcp_interface_multi(self) -> bool:
        """``dhcp-interface`` holds one value on 1.4 and a list on 1.5."""
        return False

    def get_route_dhcp_interface(self, table: Optional[str], destination: str, interface: str) -> List[str]:
        """IPv4 only. One value on 1.4 (a set replaces it), a multi leaf on 1.5;
        the delete names the value on both."""
        return self._route("ipv4", table, destination) + ["dhcp-interface", interface]

    # ========================================================================
    # Interface
    # ========================================================================

    def get_route_interface(self, family: str, table: Optional[str], destination: str, interface: str) -> List[str]:
        return self._interface(family, table, destination, interface)

    def get_route_interface_disable(self, family: str, table: Optional[str], destination: str, interface: str) -> List[str]:
        return self._interface(family, table, destination, interface) + ["disable"]

    def get_route_interface_distance(
        self, family: str, table: Optional[str], destination: str, interface: str, value: str
    ) -> List[str]:
        return self._interface(family, table, destination, interface) + ["distance", value]

    def get_route_interface_distance_delete(
        self, family: str, table: Optional[str], destination: str, interface: str
    ) -> List[str]:
        return self._interface(family, table, destination, interface) + ["distance"]

    def get_route6_interface_segments(
        self, table: Optional[str], destination: str, interface: str, value: str
    ) -> List[str]:
        """IPv6 routes take SRv6 segments on both labs (IPv4: the 1.5 subclass)."""
        return self._interface("ipv6", table, destination, interface) + ["segments", value]

    def get_route6_interface_segments_delete(
        self, table: Optional[str], destination: str, interface: str
    ) -> List[str]:
        return self._interface("ipv6", table, destination, interface) + ["segments"]

    def get_route_interface_vrf(
        self, family: str, table: Optional[str], destination: str, interface: str, value: str
    ) -> List[str]:
        return self._interface(family, table, destination, interface) + ["vrf", value]

    def get_route_interface_vrf_delete(
        self, family: str, table: Optional[str], destination: str, interface: str
    ) -> List[str]:
        return self._interface(family, table, destination, interface) + ["vrf"]

    # ========================================================================
    # Next-hop
    # ========================================================================

    def get_route_next_hop(self, family: str, table: Optional[str], destination: str, next_hop: str) -> List[str]:
        return self._next_hop(family, table, destination, next_hop)

    def get_route_next_hop_bfd(self, family: str, table: Optional[str], destination: str, next_hop: str) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["bfd"]

    def get_route_next_hop_bfd_profile(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd(family, table, destination, next_hop) + ["profile", value]

    def get_route_next_hop_bfd_profile_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd(family, table, destination, next_hop) + ["profile"]

    def get_route_next_hop_bfd_multi_hop(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd(family, table, destination, next_hop) + ["multi-hop"]

    @abstractmethod
    def get_route_next_hop_bfd_multi_hop_source(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        """1.4 ``multi-hop source <addr>`` (a tag); 1.5 ``multi-hop source-address <addr>``."""

    @abstractmethod
    def get_route_next_hop_bfd_multi_hop_source_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str, source: str
    ) -> List[str]:
        """One source: the 1.4 ``source <addr>`` tag (its profile goes with it)
        or the 1.5 ``source-address`` value."""

    def get_route_next_hop_disable(self, family: str, table: Optional[str], destination: str, next_hop: str) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["disable"]

    def get_route_next_hop_distance(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["distance", value]

    def get_route_next_hop_distance_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["distance"]

    def get_route_next_hop_interface(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["interface", value]

    def get_route_next_hop_interface_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["interface"]

    def get_route6_next_hop_segments(
        self, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._next_hop("ipv6", table, destination, next_hop) + ["segments", value]

    def get_route6_next_hop_segments_delete(
        self, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self._next_hop("ipv6", table, destination, next_hop) + ["segments"]

    def get_route_next_hop_vrf(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["vrf", value]

    def get_route_next_hop_vrf_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self._next_hop(family, table, destination, next_hop) + ["vrf"]

    # ========================================================================
    # Routing Tables
    # ========================================================================

    def get_table(self, table: str) -> List[str]:
        return ROOT + ["table", table]

    def get_table_description(self, table: str, value: str) -> List[str]:
        return self.get_table(table) + ["description", value]

    def get_table_description_delete(self, table: str) -> List[str]:
        return self.get_table(table) + ["description"]

    # ========================================================================
    # Route-map
    # ========================================================================

    def get_route_map(self, value: str) -> List[str]:
        return ROOT + ["route-map", value]

    def get_route_map_delete(self) -> List[str]:
        return ROOT + ["route-map"]

    # ========================================================================
    # Static ARP
    # ========================================================================

    def get_arp_interface(self, interface: str) -> List[str]:
        return ROOT + ["arp", "interface", interface]

    def get_arp_entry(self, interface: str, address: str) -> List[str]:
        return self.get_arp_interface(interface) + ["address", address]

    def get_arp_entry_mac(self, interface: str, address: str, mac: str) -> List[str]:
        return self.get_arp_entry(interface, address) + ["mac", mac]

    def get_arp_entry_description(self, interface: str, address: str, value: str) -> List[str]:
        return self.get_arp_entry(interface, address) + ["description", value]

    def get_arp_entry_description_delete(self, interface: str, address: str) -> List[str]:
        return self.get_arp_entry(interface, address) + ["description"]

    # ========================================================================
    # Multicast Routes
    # ========================================================================

    @abstractmethod
    def get_mroute_next_hop_root(self, prefix: str) -> List[str]:
        """The node that holds this prefix's next-hops."""

    @abstractmethod
    def get_mroute_interface_root(self, prefix: str) -> List[str]:
        """The node that holds this prefix's interfaces."""

    @abstractmethod
    def get_mroute_next_hop(self, prefix: str, next_hop: str) -> List[str]:
        """One next-hop of the prefix."""

    @abstractmethod
    def get_mroute_interface(self, prefix: str, interface: str) -> List[str]:
        """One interface of the prefix."""

    def get_mroute_next_hop_distance(self, prefix: str, next_hop: str, value: str) -> List[str]:
        return self.get_mroute_next_hop(prefix, next_hop) + ["distance", value]

    def get_mroute_next_hop_distance_delete(self, prefix: str, next_hop: str) -> List[str]:
        return self.get_mroute_next_hop(prefix, next_hop) + ["distance"]

    def get_mroute_interface_distance(self, prefix: str, interface: str, value: str) -> List[str]:
        return self.get_mroute_interface(prefix, interface) + ["distance", value]

    def get_mroute_interface_distance_delete(self, prefix: str, interface: str) -> List[str]:
        return self.get_mroute_interface(prefix, interface) + ["distance"]

    # ========================================================================
    # Neighbor Proxy
    # ========================================================================

    def get_neighbor_proxy(self, kind: str, address: str) -> List[str]:
        """``kind`` is ``arp`` (IPv4) or ``nd`` (IPv6)."""
        return ROOT + ["neighbor-proxy", kind, address]

    def get_neighbor_proxy_interface(self, kind: str, address: str, interface: str) -> List[str]:
        """``interface`` is a multi leaf, so the delete keeps the value."""
        return self.get_neighbor_proxy(kind, address) + ["interface", interface]
