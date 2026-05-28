"""Factory for version-specific PPPoE Server mappers."""

from ..pppoe_server import PPPoEServerMapper
from .v1_4 import PPPoEServerMapperV1_4
from .v1_5 import PPPoEServerMapperV1_5


def get_pppoe_server_mapper(version: str) -> PPPoEServerMapper:
    base = PPPoEServerMapper(version)

    if "1.4" in version:
        version_specific = PPPoEServerMapperV1_4()
    else:
        version_specific = PPPoEServerMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
