"""Factory for version-specific route mappers."""
from ..route import RouteMapper
from .v1_4 import RouteMapperV1_4
from .v1_5 import RouteMapperV1_5


def get_route_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = RouteMapper(version)

    if "1.4" in version:
        version_specific = RouteMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = RouteMapperV1_5()
    else:
        version_specific = RouteMapperV1_5()  # Default to latest

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
