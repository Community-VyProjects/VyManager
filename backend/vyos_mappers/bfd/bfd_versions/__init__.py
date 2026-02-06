"""Factory for version-specific BFD protocol mappers."""
from ..bfd import BfdMapper
from .v1_4 import BfdMapperV1_4
from .v1_5 import BfdMapperV1_5


def get_bfd_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = BfdMapper(version)

    if "1.4" in version:
        version_specific = BfdMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = BfdMapperV1_5()
    else:
        version_specific = BfdMapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
