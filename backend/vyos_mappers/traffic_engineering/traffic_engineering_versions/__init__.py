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
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_traffic_engineering_config

            return parse_traffic_engineering_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
