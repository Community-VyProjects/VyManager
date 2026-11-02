"""Factory for version-specific OSPF protocol mappers."""
from ..ospf import OspfMapper
from .v1_4 import OspfMapperV1_4
from .v1_5 import OspfMapperV1_5


def get_ospf_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = OspfMapper(version)

    if "1.4" in version:
        version_specific = OspfMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = OspfMapperV1_5()
    else:
        version_specific = OspfMapperV1_5()  # Default to latest

    class MergedMapper:
        # parse_config must live here. A method on OspfMapper is bound to
        # `base`, so a version override would not see this instance.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_ospf_config

            return parse_ospf_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
