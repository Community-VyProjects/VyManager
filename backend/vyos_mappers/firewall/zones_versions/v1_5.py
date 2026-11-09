"""VyOS 1.5 firewall zones mapper.

Node existence lives on FirewallZonesMapper.supported_zone_nodes.
"""

from ..zones import FirewallZonesMapper


class FirewallZonesMapper_v1_5(FirewallZonesMapper):
    """VyOS 1.5 firewall zones mapper."""
