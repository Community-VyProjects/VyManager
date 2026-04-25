"""
Pseudo-Ethernet Interface Version-Specific Mappers

Version differences:
- 1.5 adds:
  - `dhcpv6-options no-request-dns` and `no-request-domain-name` at all sub-levels
  - `ipv6 address interface-identifier` at all sub-levels
"""

from ..pseudo_ethernet import PseudoEthernetInterfaceMapper
from .v1_4 import PseudoEthernetMapper_v1_4
from .v1_5 import PseudoEthernetMapper_v1_5


def get_pseudo_ethernet_mapper(version: str) -> PseudoEthernetInterfaceMapper:
    """Get version-specific pseudo-ethernet interface mapper."""
    if "1.5" in version or "latest" in version:
        return PseudoEthernetMapper_v1_5(version)
    return PseudoEthernetMapper_v1_4(version)
