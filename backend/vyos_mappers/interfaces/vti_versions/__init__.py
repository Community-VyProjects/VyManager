"""
VTI Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..vti import VtiInterfaceMapper
from .v1_4 import VtiMapper_v1_4
from .v1_5 import VtiMapper_v1_5


def get_vti_mapper(version: str) -> VtiInterfaceMapper:
    """Get version-specific VTI interface mapper."""
    if "1.5" in version or "latest" in version:
        return VtiMapper_v1_5(version)
    return VtiMapper_v1_4(version)
