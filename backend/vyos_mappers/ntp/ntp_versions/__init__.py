"""Factory for version-specific NTP mappers."""

from ..ntp import NTPMapper
from .v1_4 import NTPMapperV1_4
from .v1_5 import NTPMapperV1_5


def get_ntp_mapper(version: str) -> NTPMapper:
    """Return the NTP mapper for this device.

    Substring match like the other factories: a rolling string such as
    ``2025.rolling`` is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return NTPMapperV1_4(version)
    return NTPMapperV1_5(version)
