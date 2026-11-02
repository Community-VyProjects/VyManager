"""Router Advertisement version-specific mapper factory."""

from ..router_advert import RouterAdvertMapper
from .v1_4 import RouterAdvertMapperV1_4
from .v1_5 import RouterAdvertMapperV1_5


def get_router_advert_mapper(version: str):
    base = RouterAdvertMapper(version)
    version_specific = RouterAdvertMapperV1_4() if "1.4" in version else RouterAdvertMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_router_advert_config

            return parse_router_advert_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
