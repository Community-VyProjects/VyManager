"""VRF BGP leaves only the VyOS 1.5 template tree has."""

from typing import FrozenSet, List

from ..vrf_bgp import VrfBgpMapper


class VrfBgpMapperV1_5(VrfBgpMapper):
    """VyOS 1.5 VRF BGP leaves.

    Path methods do not re-check the node: VRF dispatch already called
    ``require_node``.
    """

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv4_protocols() | {"nhrp"}

    def redistribute_ipv6_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv6_protocols() | {"nhrp"}

    def redistribute_table_afis(self) -> FrozenSet[str]:
        return super().redistribute_table_afis() | {"ipv6-unicast"}

    def bmp_monitor_policies(self) -> FrozenSet[str]:
        return super().bmp_monitor_policies() | {"local-rib"}

    def get_bgp_peer_group_solo(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["solo"]
