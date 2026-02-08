"""VRF mappers — core + protocol/service sub-mappers."""
from .vrf import VrfMapper
from .vrf_static import VrfStaticMapper
from .vrf_rpki import VrfRpkiMapper
from .vrf_failover import VrfFailoverMapper
from .vrf_ospf import VrfOspfMapper
from .vrf_ospfv3 import VrfOspfv3Mapper
from .vrf_isis import VrfIsisMapper
from .vrf_bgp import VrfBgpMapper
from .vrf_dhcp import VrfDhcpMapper
from .vrf_dhcpv6 import VrfDhcpv6Mapper

__all__ = [
    "VrfMapper",
    "VrfStaticMapper",
    "VrfRpkiMapper",
    "VrfFailoverMapper",
    "VrfOspfMapper",
    "VrfOspfv3Mapper",
    "VrfIsisMapper",
    "VrfBgpMapper",
    "VrfDhcpMapper",
    "VrfDhcpv6Mapper",
]
