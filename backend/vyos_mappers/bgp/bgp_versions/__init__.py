"""Factory for version-specific BGP protocol mappers."""
from ..bgp import BgpMapper
from .v1_4 import BgpMapperV1_4
from .v1_5 import BgpMapperV1_5


def get_bgp_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = BgpMapper(version)

    if "1.4" in version:
        version_specific = BgpMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = BgpMapperV1_5()
    else:
        version_specific = BgpMapperV1_5()  # Default to latest

    class MergedMapper:
        # parse_config must live here. A method on BgpMapper is bound to
        # `base`, so version-specific flag lookups would not see this instance.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_bgp_config

            return parse_bgp_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
