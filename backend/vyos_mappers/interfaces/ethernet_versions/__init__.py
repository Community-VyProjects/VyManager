"""
Ethernet Interface Mapper - Version-Specific Implementations

Factory module for creating version-specific ethernet interface mappers.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..ethernet import EthernetInterfaceMapper


def get_ethernet_mapper(version: str) -> "EthernetInterfaceMapper":
    """
    Factory function to get the appropriate ethernet mapper for a VyOS version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Version-specific EthernetInterfaceMapper instance

    Examples:
        >>> mapper = get_ethernet_mapper("1.4")
        >>> mapper = get_ethernet_mapper("1.5")
    """
    from .v1_4 import EthernetMapper_v1_4
    from .v1_5 import EthernetMapper_v1_5

    version_map = {
        "1.4": EthernetMapper_v1_4,
        "1.5": EthernetMapper_v1_5,
    }

    # Get mapper class for version, fallback to latest (1.5) for unknown versions
    mapper_class = version_map.get(version, EthernetMapper_v1_5)

    return mapper_class(version)


__all__ = ["get_ethernet_mapper"]
