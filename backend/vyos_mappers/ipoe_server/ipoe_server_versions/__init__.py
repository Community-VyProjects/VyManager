"""Factory for IPoE server mappers.

The shared class is returned directly on 1.4. The 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..ipoe_server import IPoEServerMapper
from .v1_5 import IPoEServerMapperV1_5


def get_ipoe_server_mapper(version: str) -> IPoEServerMapper:
    """Return the IPoE server mapper for this device."""
    if "1.4" in version:
        return IPoEServerMapper(version)
    return IPoEServerMapperV1_5(version)


__all__ = ["IPoEServerMapperV1_5", "get_ipoe_server_mapper"]
