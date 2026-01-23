"""
Protocol Mappers

Mappers for routing protocol configurations.
"""

from .bgp import BGPMapper
from .ospf import OSPFMapper
from .ospfv3 import OSPFv3Mapper
from .rip import RIPMapper
from .ripng import RIPngMapper
from .isis import ISISMapper
from .babel import BabelMapper
from .openfabric import OpenFabricMapper

__all__ = [
    "BGPMapper",
    "OSPFMapper",
    "OSPFv3Mapper",
    "RIPMapper",
    "RIPngMapper",
    "ISISMapper",
    "BabelMapper",
    "OpenFabricMapper",
]
