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

    # Substring match like every other factory: exact-key lookup silently
    # fell back to the 1.5 mapper for strings like "1.4.0" or "sagitta".
    if "1.4" in version:
        return EthernetMapper_v1_4(version)
    return EthernetMapper_v1_5(version)


__all__ = ["get_ethernet_mapper"]
