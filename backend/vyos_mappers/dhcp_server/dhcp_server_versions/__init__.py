"""Factory for version-specific DHCP server mappers."""

from ..dhcp_server import DHCPServerMapper
from .v1_4 import DHCPServerMapperV1_4
from .v1_5 import DHCPServerMapperV1_5


def get_dhcp_server_mapper(version: str) -> DHCPServerMapper:
    """Return the DHCP server mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return DHCPServerMapperV1_4(version)
    return DHCPServerMapperV1_5(version)


__all__ = ["DHCPServerMapperV1_4", "DHCPServerMapperV1_5", "get_dhcp_server_mapper"]
