"""Factory for static routes mappers.

A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..static_routes import StaticRoutesMapper
from .v1_4 import StaticRoutesMapperV1_4
from .v1_5 import StaticRoutesMapperV1_5


def get_static_routes_mapper(version: str) -> StaticRoutesMapper:
    """Return the static routes mapper for this device."""
    if "1.4" in version:
        return StaticRoutesMapperV1_4(version)
    return StaticRoutesMapperV1_5(version)


__all__ = ["StaticRoutesMapperV1_4", "StaticRoutesMapperV1_5", "get_static_routes_mapper"]
