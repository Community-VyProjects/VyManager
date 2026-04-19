"""PIMv6 version-specific mapper factory."""

from ..pim6 import Pim6Mapper
from .v1_4 import Pim6MapperV1_4
from .v1_5 import Pim6MapperV1_5


def get_pim6_mapper(version: str):
    """Factory function to get version-specific PIMv6 mapper."""
    base = Pim6Mapper(version)

    if "1.5" in version or "latest" in version:
        version_specific = Pim6MapperV1_5()
    else:
        version_specific = Pim6MapperV1_4()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
