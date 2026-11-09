"""VyOS 1.5 firewall groups mapper.

Group type existence lives on FirewallGroupsMapper.supported_group_types.
This subclass exists so the factory can still select a 1.5 mapper.
"""

from ..groups import FirewallGroupsMapper


class FirewallGroupsMapper_v1_5(FirewallGroupsMapper):
    """VyOS 1.5 firewall groups mapper."""
