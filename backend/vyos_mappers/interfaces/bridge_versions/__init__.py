"""
Bridge Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..bridge import BridgeInterfaceMapper
from .v1_5 import BridgeMapper_v1_5


def get_bridge_mapper(version: str) -> BridgeInterfaceMapper:
    """Return the bridge interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return BridgeInterfaceMapper(version)
    return BridgeMapper_v1_5(version)


__all__ = ["BridgeMapper_v1_5", "get_bridge_mapper"]
