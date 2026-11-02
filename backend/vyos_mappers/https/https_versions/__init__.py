"""Factory for version-specific HTTPS mappers."""
from ..https import HTTPSMapper
from .v1_4 import HTTPSMapperV1_4
from .v1_5 import HTTPSMapperV1_5


def get_https_mapper(version: str):
    """Return a version-merged HTTPS mapper."""
    base = HTTPSMapper(version)

    if "1.4" in version:
        version_specific = HTTPSMapperV1_4()
    else:
        version_specific = HTTPSMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_https_config

            return parse_https_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
