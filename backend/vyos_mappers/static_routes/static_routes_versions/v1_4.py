"""VyOS 1.4 static routes mapper.

1.4 spells multicast routes as ``multicast route`` (next-hops) and
``multicast interface-route`` (``next-hop-interface``), without ``disable``.
A BFD multi-hop source is a tag node ``source <addr>`` with its own
``profile``; a next-hop may hold several (one FRR session each). Path methods do not re-check the node: the builder already
called ``require_node``.
"""

from typing import List, Optional

from ..static_routes import ROOT, StaticRoutesMapper


class StaticRoutesMapperV1_4(StaticRoutesMapper):
    """VyOS 1.4 static routes mapper."""

    def get_route_next_hop_bfd_multi_hop_source(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop(family, table, destination, next_hop) + ["source", value]

    def get_route_next_hop_bfd_multi_hop_source_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str, source: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop_source(family, table, destination, next_hop, source)

    def get_route_next_hop_bfd_multi_hop_source_profile(
        self, family: str, table: Optional[str], destination: str, next_hop: str, source: str, value: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop_source(
            family, table, destination, next_hop, source
        ) + ["profile", value]

    def get_route_next_hop_bfd_multi_hop_source_profile_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str, source: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop_source(
            family, table, destination, next_hop, source
        ) + ["profile"]

    def get_mroute_next_hop_root(self, prefix: str) -> List[str]:
        return ROOT + ["multicast", "route", prefix]

    def get_mroute_interface_root(self, prefix: str) -> List[str]:
        return ROOT + ["multicast", "interface-route", prefix]

    def get_mroute_next_hop(self, prefix: str, next_hop: str) -> List[str]:
        return self.get_mroute_next_hop_root(prefix) + ["next-hop", next_hop]

    def get_mroute_interface(self, prefix: str, interface: str) -> List[str]:
        return self.get_mroute_interface_root(prefix) + ["next-hop-interface", interface]
