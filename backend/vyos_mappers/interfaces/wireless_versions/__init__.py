"""
Wireless Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..wireless import WirelessInterfaceMapper
from .v1_4 import WirelessMapper_v1_4
from .v1_5 import WirelessMapper_v1_5


def get_wireless_mapper(version: str) -> WirelessInterfaceMapper:
    """Get version-specific wireless interface mapper."""
    if "1.5" in version or "latest" in version:
        return WirelessMapper_v1_5(version)
    return WirelessMapper_v1_4(version)
