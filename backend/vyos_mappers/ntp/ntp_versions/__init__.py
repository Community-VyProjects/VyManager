"""Factory for version-specific NTP mappers."""
from ..ntp import NTPMapper
from .v1_4 import NTPMapperV1_4
from .v1_5 import NTPMapperV1_5


def get_ntp_mapper(version: str):
    """Return a version-merged NTP mapper."""
    base = NTPMapper(version)

    if "1.4" in version:
        version_specific = NTPMapperV1_4()
    else:
        version_specific = NTPMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
