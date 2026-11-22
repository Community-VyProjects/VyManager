"""VRF trees and values that differ on the VyOS 1.5 template tree."""

from typing import FrozenSet, List

from ..vrf import VrfMapper


class VrfMapperV1_5(VrfMapper):
    """VyOS 1.5 adds failover, RPKI and the DHCP servers under ``vrf name <vrf>``,
    and drops ``connected``, ``kernel`` and ``table`` from ``ip``/``ipv6 protocol``."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(self._VERSIONED_FEATURES.values())

    def ip_protocols(self) -> List[str]:
        return ["any", "babel", "bgp", "eigrp", "isis", "ospf", "rip", "static"]

    def ipv6_protocols(self) -> List[str]:
        return ["any", "babel", "bgp", "isis", "ospfv3", "ripng", "static"]
