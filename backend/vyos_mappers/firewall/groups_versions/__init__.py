"""
Firewall Groups Mapper - Version-Specific Implementations

Factory module for creating version-specific firewall groups mappers.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..groups import FirewallGroupsMapper


def get_firewall_groups_mapper(version: str) -> "FirewallGroupsMapper":
    """
    Factory function to get the appropriate firewall groups mapper for a VyOS version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Version-specific FirewallGroupsMapper instance

    Examples:
        >>> mapper = get_firewall_groups_mapper("1.4")
        >>> mapper = get_firewall_groups_mapper("1.5")
    """
    from .v1_4 import FirewallGroupsMapper_v1_4
    from .v1_5 import FirewallGroupsMapper_v1_5

    version_map = {
        "1.4": FirewallGroupsMapper_v1_4,
        "1.5": FirewallGroupsMapper_v1_5,
    }

    # Get mapper class for version, fallback to latest (1.5) for unknown versions
    mapper_class = version_map.get(version, FirewallGroupsMapper_v1_5)

    return mapper_class(version)


__all__ = ["get_firewall_groups_mapper"]
