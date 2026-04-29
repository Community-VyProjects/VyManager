"""
VPP Interface Version-Specific Mappers

VPP is a VyOS 1.5+ only feature; there is no 1.4 mapper.
"""

from ..vpp import VppInterfaceMapper
from .v1_5 import VppMapper_v1_5


def get_vpp_mapper(version: str) -> VppInterfaceMapper:
    """Return the VPP mapper for the given VyOS version."""
    return VppMapper_v1_5(version)
