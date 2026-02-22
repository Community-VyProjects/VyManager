from ..load_balancing import LoadBalancingMapper
from .v1_4 import LoadBalancingMapperV1_4
from .v1_5 import LoadBalancingMapperV1_5


def get_load_balancing_mapper(version: str):
    base = LoadBalancingMapper(version)
    version_specific = LoadBalancingMapperV1_4() if "1.4" in version else LoadBalancingMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
