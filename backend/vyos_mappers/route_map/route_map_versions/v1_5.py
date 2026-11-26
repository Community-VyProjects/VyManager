"""VyOS 1.5 route-map mapper.

1.5 adds ``match rpki-extcommunity`` and ``match source-peer``, more ``match
evpn route-type`` values, a wider ``set table`` range, and rejects ``set
as-path prepend`` together with ``prepend-last-as``. Path methods do not
re-check the node: the builder already called ``require_node``.
"""

from typing import List, Tuple

from ..route_map import RouteMapMapper

# ``match evpn route-type`` on 1.5 adds ead, es and the numeric 1-5 aliases.
EVPN_ROUTE_TYPES_V1_5: Tuple[str, ...] = ("ead", "macip", "multicast", "es", "prefix", "1", "2", "3", "4", "5")
TABLE_RANGE_V1_5: Tuple[int, int] = (1, 4294967295)


class RouteMapMapperV1_5(RouteMapMapper):
    """VyOS 1.5 route-map mapper."""

    def evpn_route_types(self) -> Tuple[str, ...]:
        return EVPN_ROUTE_TYPES_V1_5

    def table_range(self) -> Tuple[int, int]:
        return TABLE_RANGE_V1_5

    def as_path_prepend_exclusive(self) -> bool:
        return True

    def get_match_rpki_extcommunity_path(self, name: str, rule: str) -> List[str]:
        return self.get_rule_path(name, rule) + ["match", "rpki-extcommunity"]

    def get_match_rpki_extcommunity(self, name: str, rule: str, state: str) -> List[str]:
        return self.get_match_rpki_extcommunity_path(name, rule) + [state]

    def get_match_source_peer_path(self, name: str, rule: str) -> List[str]:
        return self.get_rule_path(name, rule) + ["match", "source-peer"]

    def get_match_source_peer(self, name: str, rule: str, peer: str) -> List[str]:
        return self.get_match_source_peer_path(name, rule) + [peer]
