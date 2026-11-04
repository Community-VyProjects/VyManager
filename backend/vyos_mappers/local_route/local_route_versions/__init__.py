"""Factory for version-specific local route mappers."""

from ..local_route import LocalRouteMapper
from .v1_4 import LocalRouteMapperV1_4
from .v1_5 import LocalRouteMapperV1_5


def get_local_route_mapper(version: str) -> LocalRouteMapper:
    """Factory function to get appropriate mapper for version."""
    if "1.4" in version:
        return LocalRouteMapperV1_4(version)
    return LocalRouteMapperV1_5(version)  # 1.5, latest, and unknown
