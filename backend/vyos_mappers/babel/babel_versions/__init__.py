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
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
