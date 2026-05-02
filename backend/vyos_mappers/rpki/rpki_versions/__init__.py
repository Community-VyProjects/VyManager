"""Factory for version-specific RPKI protocol mappers."""
from ..rpki import RpkiMapper
from .v1_4 import RpkiMapperV1_4
from .v1_5 import RpkiMapperV1_5


def get_rpki_mapper(version: str):
    """Return a version-merged RPKI mapper."""
    base = RpkiMapper(version)

    if "1.4" in version:
        version_specific = RpkiMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = RpkiMapperV1_5()
    else:
        version_specific = RpkiMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
