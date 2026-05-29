"""Factory for version-specific Salt Minion mappers."""
from ..salt_minion import SaltMinionMapper
from .v1_4 import SaltMinionMapperV1_4
from .v1_5 import SaltMinionMapperV1_5


def get_salt_minion_mapper(version: str):
    """Return a version-merged Salt Minion mapper."""
    base = SaltMinionMapper(version)

    if "1.4" in version:
        version_specific = SaltMinionMapperV1_4()
    else:
        version_specific = SaltMinionMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
