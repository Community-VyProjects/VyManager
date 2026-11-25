"""Factory for policy route mappers.

The shared class is returned directly on 1.4. Source/destination ``geoip``,
``tcp mss`` and ``set vrf`` exist only on 1.5, and its ``ipsec`` and
``limit rate`` values differ, so that version gets the subclass. There is no
merge proxy and no 1.4 file.
"""
from ..route import RouteMapper
from .v1_5 import RouteMapperV1_5


def get_route_mapper(version: str) -> RouteMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return RouteMapper(version)
    return RouteMapperV1_5(version)


__all__ = ["RouteMapperV1_5", "get_route_mapper"]
