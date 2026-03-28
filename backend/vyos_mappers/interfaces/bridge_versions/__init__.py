"""
Bridge Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..bridge import BridgeInterfaceMapper
from .v1_4 import BridgeMapper_v1_4
from .v1_5 import BridgeMapper_v1_5


def get_bridge_mapper(version: str) -> BridgeInterfaceMapper:
    """Get version-specific bridge mapper."""
    if "1.5" in version or "latest" in version:
        return BridgeMapper_v1_5(version)
    return BridgeMapper_v1_4(version)
