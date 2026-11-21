"""VyOS 1.5 static routes mapper.

1.5 spells multicast routes as one ``mroute <prefix>`` node with
``next-hop`` and ``interface`` children that both take ``disable``, and a
BFD multi-hop source as the single leaf ``source-address``. IPv4 routes take
SRv6 ``segments`` on 1.5 only (IPv6 routes have them on both labs). Path
methods do not re-check the node: the builder already called
``require_node``.
"""

from typing import FrozenSet, List, Optional

from ..static_routes import ROOT, StaticRoutesMapper


class StaticRoutesMapperV1_5(StaticRoutesMapper):
    """VyOS 1.5 static routes mapper."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({"route segments", "mroute"})

    def get_route_next_hop_bfd_multi_hop_source(
        self, family: str, table: Optional[str], destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop(family, table, destination, next_hop) + [
            "source-address", value,
        ]

    def get_route_next_hop_bfd_multi_hop_source_delete(
        self, family: str, table: Optional[str], destination: str, next_hop: str
    ) -> List[str]:
        return self.get_route_next_hop_bfd_multi_hop(family, table, destination, next_hop) + ["source-address"]

    def get_mroute(self, prefix: str) -> List[str]:
        return ROOT + ["mroute", prefix]

    def get_mroute_next_hop_root(self, prefix: str) -> List[str]:
        return self.get_mroute(prefix) + ["next-hop"]

    def get_mroute_interface_root(self, prefix: str) -> List[str]:
        return self.get_mroute(prefix) + ["interface"]

    def get_mroute_next_hop(self, prefix: str, next_hop: str) -> List[str]:
        return self.get_mroute_next_hop_root(prefix) + [next_hop]

    def get_mroute_interface(self, prefix: str, interface: str) -> List[str]:
        return self.get_mroute_interface_root(prefix) + [interface]

    def get_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> List[str]:
        return self.get_mroute_next_hop(prefix, next_hop) + ["disable"]

    def get_mroute_interface_disable(self, prefix: str, interface: str) -> List[str]:
        return self.get_mroute_interface(prefix, interface) + ["disable"]
