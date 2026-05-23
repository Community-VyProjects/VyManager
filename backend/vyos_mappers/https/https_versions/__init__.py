"""Factory for version-specific HTTPS mappers."""
from ..https import HTTPSMapper
from .v1_4 import HTTPSMapperV1_4
from .v1_5 import HTTPSMapperV1_5


def get_https_mapper(version: str):
    """Return a version-merged HTTPS mapper."""
    base = HTTPSMapper(version)

    if "1.4" in version:
        version_specific = HTTPSMapperV1_4()
    else:
        version_specific = HTTPSMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
