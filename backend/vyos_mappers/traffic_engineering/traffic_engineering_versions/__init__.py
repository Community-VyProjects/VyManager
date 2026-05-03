"""Factory for version-specific Traffic Engineering protocol mappers."""
from ..traffic_engineering import TrafficEngineeringMapper
from .v1_4 import TrafficEngineeringMapperV1_4
from .v1_5 import TrafficEngineeringMapperV1_5


def get_traffic_engineering_mapper(version: str):
    """Return a version-merged Traffic Engineering mapper."""
    base = TrafficEngineeringMapper(version)

    if "1.4" in version:
        version_specific = TrafficEngineeringMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = TrafficEngineeringMapperV1_5()
    else:
        version_specific = TrafficEngineeringMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
