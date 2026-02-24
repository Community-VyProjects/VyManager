"""
MPLS Mapper Factory

Returns a MergedMapper that resolves version-specific methods first,
then falls back to the base MplsMapper for common paths.

Both VyOS 1.4 and 1.5 share identical MPLS/LDP template structure,
so version-specific mappers contain no overrides.
"""

from ..mpls import MplsMapper
from .v1_4 import MplsMapperV1_4
from .v1_5 import MplsMapperV1_5


def get_mpls_mapper(version: str):
    base = MplsMapper(version)

    if "1.4" in version:
        version_specific = MplsMapperV1_4()
    else:
        # Default to 1.5 for rolling/unknown versions
        version_specific = MplsMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
