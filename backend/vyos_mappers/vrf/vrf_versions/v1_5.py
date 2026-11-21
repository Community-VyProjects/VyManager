"""VRF feature trees only the VyOS 1.5 template tree has."""

from typing import FrozenSet

from ..vrf import VrfMapper


class VrfMapperV1_5(VrfMapper):
    """VyOS 1.5 adds failover, RPKI and the DHCP servers under ``vrf name <vrf>``."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(self._VERSIONED_FEATURES.values())
