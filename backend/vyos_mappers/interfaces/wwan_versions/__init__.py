"""
WWAN Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..wwan import WwanInterfaceMapper
from .v1_5 import WwanMapper_v1_5


def get_wwan_mapper(version: str) -> WwanInterfaceMapper:
    """Return the WWAN interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return WwanInterfaceMapper(version)
    return WwanMapper_v1_5(version)


__all__ = ["WwanMapper_v1_5", "get_wwan_mapper"]
