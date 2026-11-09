"""VyOS 1.4 firewall zones mapper.

Node existence lives on FirewallZonesMapper.supported_zone_nodes.
"""

from ..zones import FirewallZonesMapper


class FirewallZonesMapper_v1_4(FirewallZonesMapper):
    """VyOS 1.4 firewall zones mapper."""
