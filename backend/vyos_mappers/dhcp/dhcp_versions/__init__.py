"""DHCP mapper version-specific implementations."""
from .v1_4 import DHCPMapperV1_4
from .v1_5 import DHCPMapperV1_5


def get_dhcp_mapper(version: str):
    """Factory to get version-specific DHCP mapper."""
    # Import here to avoid circular import
    from ..dhcp import DHCPMapper
    # DHCPMapper handles version differences internally via delegation
    return DHCPMapper(version)


__all__ = ["DHCPMapperV1_4", "DHCPMapperV1_5", "get_dhcp_mapper"]
