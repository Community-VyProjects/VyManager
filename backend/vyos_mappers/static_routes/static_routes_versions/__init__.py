"""Factory for version-specific static routes mappers."""
from ..static_routes import StaticRoutesMapper
from .v1_4 import StaticRoutesMapperV1_4
from .v1_5 import StaticRoutesMapperV1_5


def get_static_routes_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = StaticRoutesMapper(version)

    if "1.4" in version:
        version_specific = StaticRoutesMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = StaticRoutesMapperV1_5()
    else:
        version_specific = StaticRoutesMapperV1_5()  # Default to latest

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
