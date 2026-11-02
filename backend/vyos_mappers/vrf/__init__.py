"""VRF mappers — core + protocol/service sub-mappers."""
from .vrf import VrfMapper
from .vrf_rpki import VrfRpkiMapper
from .vrf_ospf import VrfOspfMapper
from .vrf_ospfv3 import VrfOspfv3Mapper
from .vrf_isis import VrfIsisMapper
from .vrf_bgp import VrfBgpMapper

__all__ = [
    "VrfMapper",
    "VrfRpkiMapper",
    "VrfOspfMapper",
    "VrfOspfv3Mapper",
    "VrfIsisMapper",
    "VrfBgpMapper",
]
