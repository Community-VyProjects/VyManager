"""Factory for version-specific Babel protocol mappers."""
from ..babel import BabelMapper
from .v1_4 import BabelMapperV1_4
from .v1_5 import BabelMapperV1_5


def get_babel_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = BabelMapper(version)

    if "1.4" in version:
        version_specific = BabelMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = BabelMapperV1_5()
    else:
        version_specific = BabelMapperV1_5()  # Default to latest

    class MergedMapper:
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_babel_config

            return parse_babel_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
