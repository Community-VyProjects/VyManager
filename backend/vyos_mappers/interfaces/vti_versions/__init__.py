"""
VTI Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..vti import VtiInterfaceMapper
from .v1_4 import VtiMapper_v1_4
from .v1_5 import VtiMapper_v1_5


def get_vti_mapper(version: str) -> VtiInterfaceMapper:
    """Get version-specific VTI interface mapper."""
    if not is_vyos_1_4(version):
        return VtiMapper_v1_5(version)
    return VtiMapper_v1_4(version)
