"""Factory for the firewall groups mapper.

The shared class is returned on 1.4. ``remote-group`` lives on the 1.5
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..groups import FirewallGroupsMapper
from .v1_5 import FirewallGroupsMapperV1_5


def get_firewall_groups_mapper(version: str) -> FirewallGroupsMapper:
    """Return the firewall groups mapper for this device."""
    if "1.4" in version:
        return FirewallGroupsMapper(version)
    return FirewallGroupsMapperV1_5(version)


__all__ = ["get_firewall_groups_mapper"]
