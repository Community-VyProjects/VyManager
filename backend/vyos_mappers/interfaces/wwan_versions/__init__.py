"""
WWAN Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..wwan import WwanInterfaceMapper
from .v1_4 import WwanMapper_v1_4
from .v1_5 import WwanMapper_v1_5


def get_wwan_mapper(version: str) -> WwanInterfaceMapper:
    """Get version-specific WWAN interface mapper."""
    if not is_vyos_1_4(version):
        return WwanMapper_v1_5(version)
    return WwanMapper_v1_4(version)
