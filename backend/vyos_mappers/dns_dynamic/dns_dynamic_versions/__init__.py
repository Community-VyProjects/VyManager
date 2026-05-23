"""Factory for version-specific DNS Dynamic mappers."""
from ..dns_dynamic import DNSDynamicMapper
from .v1_4 import DNSDynamicMapperV1_4
from .v1_5 import DNSDynamicMapperV1_5


def get_dns_dynamic_mapper(version: str):
    """Return a version-merged DNS Dynamic mapper."""
    base = DNSDynamicMapper(version)

    if "1.4" in version:
        version_specific = DNSDynamicMapperV1_4()
    else:
        version_specific = DNSDynamicMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
