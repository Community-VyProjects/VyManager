"""
PPPoE Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.

Version differences:
- 1.5 adds:
  - `address dhcpv6` on the interface (stateful DHCPv6 address request)
  - `dhcpv6-options no-request-dns`
  - `dhcpv6-options no-request-domain-name`
  - `ipv6 address interface-identifier`
"""

from ..pppoe import PppoeInterfaceMapper
from .v1_4 import PppoeMapper_v1_4
from .v1_5 import PppoeMapper_v1_5


def get_pppoe_mapper(version: str) -> PppoeInterfaceMapper:
    """Get version-specific PPPoE interface mapper."""
    if "1.5" in version or "latest" in version:
        return PppoeMapper_v1_5(version)
    return PppoeMapper_v1_4(version)
