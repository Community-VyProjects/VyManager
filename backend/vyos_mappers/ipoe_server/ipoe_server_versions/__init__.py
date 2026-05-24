"""Factory for version-specific IPoE Server mappers."""

from ..ipoe_server import IPoEServerMapper
from .v1_4 import IPoEServerMapperV1_4
from .v1_5 import IPoEServerMapperV1_5


def get_ipoe_server_mapper(version: str) -> IPoEServerMapper:
    base = IPoEServerMapper(version)

    if "1.4" in version:
        version_specific = IPoEServerMapperV1_4()
    else:
        version_specific = IPoEServerMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
