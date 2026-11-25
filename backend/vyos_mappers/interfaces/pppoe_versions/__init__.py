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
from .v1_5 import PppoeMapper_v1_5


def get_pppoe_mapper(version: str) -> PppoeInterfaceMapper:
    """Return the PPPoE interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return PppoeInterfaceMapper(version)
    return PppoeMapper_v1_5(version)


__all__ = ["PppoeMapper_v1_5", "get_pppoe_mapper"]
