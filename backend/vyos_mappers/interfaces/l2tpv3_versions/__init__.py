"""
L2TPv3 Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..l2tpv3 import L2TPv3InterfaceMapper
from .v1_4 import L2TPv3Mapper_v1_4
from .v1_5 import L2TPv3Mapper_v1_5


def get_l2tpv3_mapper(version: str) -> L2TPv3InterfaceMapper:
    """Get version-specific L2TPv3 interface mapper."""
    if "1.5" in version or "latest" in version:
        return L2TPv3Mapper_v1_5(version)
    return L2TPv3Mapper_v1_4(version)
