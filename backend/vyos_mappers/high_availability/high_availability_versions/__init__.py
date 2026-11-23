"""Factory for high-availability mappers.

The shared class is returned directly on 1.4. 1.5 paths live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..high_availability import HighAvailabilityMapper
from .v1_5 import HighAvailabilityMapperV1_5


def get_high_availability_mapper(version: str) -> HighAvailabilityMapper:
    """Return the high-availability mapper for this device."""
    if "1.4" in version:
        return HighAvailabilityMapper(version)
    return HighAvailabilityMapperV1_5(version)


__all__ = ["HighAvailabilityMapperV1_5", "get_high_availability_mapper"]
