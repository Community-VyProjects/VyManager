from ..high_availability import HighAvailabilityMapper
from .v1_4 import HighAvailabilityMapperV1_4
from .v1_5 import HighAvailabilityMapperV1_5


def get_high_availability_mapper(version: str):
    base = HighAvailabilityMapper(version)
    version_specific = HighAvailabilityMapperV1_4() if "1.4" in version else HighAvailabilityMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()


__all__ = ["get_high_availability_mapper"]
