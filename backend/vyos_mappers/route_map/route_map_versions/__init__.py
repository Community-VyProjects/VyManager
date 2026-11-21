"""Factory for version-specific route-map mappers."""
from ...base import is_vyos_1_4
from ..route_map import RouteMapMapper
from .v1_4 import RouteMapMapperV1_4
from .v1_5 import RouteMapMapperV1_5


def get_route_map_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = RouteMapMapper(version)

    if is_vyos_1_4(version):
        version_specific = RouteMapMapperV1_4()
    else:
        version_specific = RouteMapMapperV1_5()  # Default to latest

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
