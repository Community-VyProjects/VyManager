"""PIM version-specific mapper factory."""

from ..pim import PimMapper
from .v1_4 import PimMapperV1_4
from .v1_5 import PimMapperV1_5


def get_pim_mapper(version: str):
    """Factory function to get version-specific PIM mapper."""
    base = PimMapper(version)

    if "1.5" in version or "latest" in version:
        version_specific = PimMapperV1_5()
    else:
        version_specific = PimMapperV1_4()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
