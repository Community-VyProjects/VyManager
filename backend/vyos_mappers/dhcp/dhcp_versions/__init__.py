"""Factory for version-specific DHCP server mappers."""

from ..dhcp import DHCPMapper
from .v1_4 import DHCPMapperV1_4
from .v1_5 import DHCPMapperV1_5


def get_dhcp_mapper(version: str) -> DHCPMapper:
    """Return the DHCP server mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return DHCPMapperV1_4(version)
    return DHCPMapperV1_5(version)


__all__ = ["DHCPMapperV1_4", "DHCPMapperV1_5", "get_dhcp_mapper"]
