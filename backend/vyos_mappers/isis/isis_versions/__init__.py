"""Factory for IS-IS mappers.

The shared class is returned directly on 1.4. 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..isis import IsisMapper
from .v1_5 import IsisMapperV1_5


def get_isis_mapper(version: str) -> IsisMapper:
    """Return the IS-IS mapper for this device."""
    if "1.4" in version:
        return IsisMapper(version)
    return IsisMapperV1_5(version)


__all__ = ["IsisMapperV1_5", "get_isis_mapper"]
