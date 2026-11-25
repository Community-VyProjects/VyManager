"""
Wireless Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..wireless import WirelessInterfaceMapper
from .v1_4 import WirelessMapper_v1_4
from .v1_5 import WirelessMapper_v1_5


def get_wireless_mapper(version: str) -> WirelessInterfaceMapper:
    """Return the wireless interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return WirelessMapper_v1_4(version)
    return WirelessMapper_v1_5(version)


__all__ = ["WirelessMapper_v1_4", "WirelessMapper_v1_5", "get_wireless_mapper"]
