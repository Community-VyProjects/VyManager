"""NDP Proxy version-specific mapper factory."""

from ..ndp_proxy import NdpProxyMapper
from .v1_4 import NdpProxyMapperV1_4
from .v1_5 import NdpProxyMapperV1_5


def get_ndp_proxy_mapper(version: str):
    base = NdpProxyMapper(version)
    version_specific = NdpProxyMapperV1_4() if "1.4" in version else NdpProxyMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on NdpProxyMapper is bound to
        # `base`, so mapper.version would not fall through on the call.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_ndp_proxy_config

            return parse_ndp_proxy_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
