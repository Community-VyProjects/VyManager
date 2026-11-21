"""
Loopback Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..loopback import LoopbackInterfaceMapper
from .v1_4 import LoopbackMapper_v1_4
from .v1_5 import LoopbackMapper_v1_5


def get_loopback_mapper(version: str) -> LoopbackInterfaceMapper:
    """Get version-specific loopback interface mapper."""
    if not is_vyos_1_4(version):
        return LoopbackMapper_v1_5(version)
    return LoopbackMapper_v1_4(version)
