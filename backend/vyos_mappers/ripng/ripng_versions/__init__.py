"""Factory for version-specific RIPng protocol mappers."""
from ..ripng import RipNgMapper
from .v1_4 import RipNgMapperV1_4
from .v1_5 import RipNgMapperV1_5


def get_ripng_mapper(version: str):
    """Return a version-merged RIPng mapper."""
    base = RipNgMapper(version)

    if "1.4" in version:
        version_specific = RipNgMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = RipNgMapperV1_5()
    else:
        version_specific = RipNgMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
