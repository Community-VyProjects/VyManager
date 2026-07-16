"""
Firewall Zones Mapper - Version-Specific Implementations

Factory module for creating version-specific firewall zones mappers.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..zones import FirewallZonesMapper


def get_firewall_zones_mapper(version: str) -> "FirewallZonesMapper":
    """
    Factory function to get the appropriate firewall zones mapper for a VyOS version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Version-specific FirewallZonesMapper instance
    """
    from .v1_4 import FirewallZonesMapper_v1_4
    from .v1_5 import FirewallZonesMapper_v1_5

    # Substring match like every other factory: exact-key lookup silently
    # fell back to the 1.5 mapper for strings like "1.4.0" or "sagitta".
    if "1.4" in version:
        return FirewallZonesMapper_v1_4(version)
    return FirewallZonesMapper_v1_5(version)


__all__ = ["get_firewall_zones_mapper"]
