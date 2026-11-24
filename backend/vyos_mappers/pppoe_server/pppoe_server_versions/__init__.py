"""Factory for PPPoE server mappers.

The shared class is returned directly on 1.4. The 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..pppoe_server import PPPoEServerMapper
from .v1_5 import PPPoEServerMapperV1_5


def get_pppoe_server_mapper(version: str) -> PPPoEServerMapper:
    """Return the PPPoE server mapper for this device."""
    if "1.4" in version:
        return PPPoEServerMapper(version)
    return PPPoEServerMapperV1_5(version)


__all__ = ["PPPoEServerMapperV1_5", "get_pppoe_server_mapper"]
