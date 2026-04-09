"""
Loopback Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..loopback import LoopbackInterfaceMapper
from .v1_4 import LoopbackMapper_v1_4
from .v1_5 import LoopbackMapper_v1_5


def get_loopback_mapper(version: str) -> LoopbackInterfaceMapper:
    """Get version-specific loopback interface mapper."""
    if "1.5" in version or "latest" in version:
        return LoopbackMapper_v1_5(version)
    return LoopbackMapper_v1_4(version)
