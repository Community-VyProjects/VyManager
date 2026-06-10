"""Factory for version-specific Web Proxy mappers."""
from ..webproxy import WebProxyMapper
from .v1_4 import WebProxyMapperV1_4
from .v1_5 import WebProxyMapperV1_5


def get_webproxy_mapper(version: str):
    """Return a version-merged Web Proxy mapper."""
    base = WebProxyMapper(version)

    if "1.4" in version:
        version_specific = WebProxyMapperV1_4()
    else:
        version_specific = WebProxyMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
