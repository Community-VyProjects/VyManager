"""Factory for version-specific failover routing mappers."""
from ..failover import FailoverMapper
from .v1_4 import FailoverMapperV1_4
from .v1_5 import FailoverMapperV1_5


def get_failover_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = FailoverMapper(version)

    if "1.4" in version:
        version_specific = FailoverMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = FailoverMapperV1_5()
    else:
        version_specific = FailoverMapperV1_5()  # Default to latest

    class MergedMapper:
        # parse_config must live here. A method on the base class is bound to
        # `base`, so 1.4 would not see this instance's version.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_failover_config

            return parse_failover_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
