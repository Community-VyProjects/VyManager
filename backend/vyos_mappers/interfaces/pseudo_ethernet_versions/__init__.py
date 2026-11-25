"""
Pseudo-Ethernet Interface Version-Specific Mappers

Version differences:
- 1.5 adds:
  - `dhcpv6-options no-request-dns` and `no-request-domain-name` at all sub-levels
  - `ipv6 address interface-identifier` at all sub-levels
"""

from ..pseudo_ethernet import PseudoEthernetInterfaceMapper
from .v1_5 import PseudoEthernetMapper_v1_5


def get_pseudo_ethernet_mapper(version: str) -> PseudoEthernetInterfaceMapper:
    """Return the pseudo-ethernet interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return PseudoEthernetInterfaceMapper(version)
    return PseudoEthernetMapper_v1_5(version)


__all__ = ["PseudoEthernetMapper_v1_5", "get_pseudo_ethernet_mapper"]
