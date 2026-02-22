"""
IS-IS Mapper Factory

Returns a MergedMapper that resolves version-specific methods first,
then falls back to the base IsisMapper for common paths.
"""

from ..isis import IsisMapper
from .v1_4 import IsisMapperV1_4
from .v1_5 import IsisMapperV1_5


def get_isis_mapper(version: str):
    base = IsisMapper(version)

    if "1.4" in version:
        version_specific = IsisMapperV1_4()
    else:
        # Default to 1.5 for rolling/unknown versions
        version_specific = IsisMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
