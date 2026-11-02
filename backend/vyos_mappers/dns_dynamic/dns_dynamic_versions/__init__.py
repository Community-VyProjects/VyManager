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
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_dns_dynamic_config

            return parse_dns_dynamic_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
