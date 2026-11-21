"""Factory for version-specific RIP protocol mappers."""
from ...base import is_vyos_1_4
from ..rip import RipMapper
from .v1_4 import RipMapperV1_4
from .v1_5 import RipMapperV1_5


def get_rip_mapper(version: str):
    """Return a version-merged RIP mapper."""
    base = RipMapper(version)

    if is_vyos_1_4(version):
        version_specific = RipMapperV1_4()
    else:
        version_specific = RipMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on the base class is bound to
        # `base`, so version-specific lookup would not see this instance.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_rip_config

            return parse_rip_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
