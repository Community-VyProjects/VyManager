"""VRF feature trees only the VyOS 1.5 template tree has."""

from typing import FrozenSet

from ..vrf import VrfMapper


class VrfMapperV1_5(VrfMapper):
    """VyOS 1.5 adds failover and the DHCP servers under ``vrf name <vrf>``."""

    FEATURE_NODES: FrozenSet[str] = VrfMapper.FEATURE_NODES | {
        "protocols failover",
        "service dhcp-server",
        "service dhcpv6-server",
    }
