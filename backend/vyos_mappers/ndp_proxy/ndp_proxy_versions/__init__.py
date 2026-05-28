"""NDP Proxy version-specific mapper factory."""

from ..ndp_proxy import NdpProxyMapper
from .v1_4 import NdpProxyMapperV1_4
from .v1_5 import NdpProxyMapperV1_5


def get_ndp_proxy_mapper(version: str):
    base = NdpProxyMapper(version)
    version_specific = NdpProxyMapperV1_4() if "1.4" in version else NdpProxyMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
