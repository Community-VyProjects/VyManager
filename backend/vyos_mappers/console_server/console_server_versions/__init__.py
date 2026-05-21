"""Factory for version-specific Console Server mappers."""
from ..console_server import ConsoleServerMapper
from .v1_4 import ConsoleServerMapperV1_4
from .v1_5 import ConsoleServerMapperV1_5


def get_console_server_mapper(version: str):
    """Return a version-merged Console Server mapper."""
    base = ConsoleServerMapper(version)

    if "1.4" in version:
        version_specific = ConsoleServerMapperV1_4(version)
    else:
        version_specific = ConsoleServerMapperV1_5(version)

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
