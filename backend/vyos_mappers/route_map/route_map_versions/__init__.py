"""Factory for route-map mappers.

A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..route_map import RouteMapMapper
from .v1_5 import RouteMapMapperV1_5


def get_route_map_mapper(version: str) -> RouteMapMapper:
    """Return the route-map mapper for this device."""
    if "1.4" in version:
        return RouteMapMapper(version)
    return RouteMapMapperV1_5(version)


__all__ = ["RouteMapMapperV1_5", "get_route_map_mapper"]
