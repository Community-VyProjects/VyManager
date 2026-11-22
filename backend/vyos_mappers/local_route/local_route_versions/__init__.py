"""Factory for local route mappers.

A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..local_route import LocalRouteMapper
from .v1_5 import LocalRouteMapperV1_5


def get_local_route_mapper(version: str) -> LocalRouteMapper:
    """Return the local route mapper for this device."""
    if "1.4" in version:
        return LocalRouteMapper(version)
    return LocalRouteMapperV1_5(version)


__all__ = ["LocalRouteMapperV1_5", "get_local_route_mapper"]
