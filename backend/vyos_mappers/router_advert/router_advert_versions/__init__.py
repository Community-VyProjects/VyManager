"""Router Advertisement version-specific mapper factory."""

from ..router_advert import RouterAdvertMapper
from .v1_4 import RouterAdvertMapperV1_4
from .v1_5 import RouterAdvertMapperV1_5


def get_router_advert_mapper(version: str):
    base = RouterAdvertMapper(version)
    version_specific = RouterAdvertMapperV1_4() if "1.4" in version else RouterAdvertMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
