"""
Virtual-Ethernet Interface Version-Specific Mappers

Version differences:
- 1.5 adds:
  - `netns` at the top interface level
  - `dhcpv6-options no-request-dns` and `no-request-domain-name` at all sub-levels
  - `ipv6 address interface-identifier` at all sub-levels
"""

from ..virtual_ethernet import VirtualEthernetInterfaceMapper
from .v1_5 import VirtualEthernetMapper_v1_5


def get_virtual_ethernet_mapper(version: str) -> VirtualEthernetInterfaceMapper:
    """Return the virtual-ethernet interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return VirtualEthernetInterfaceMapper(version)
    return VirtualEthernetMapper_v1_5(version)


__all__ = ["VirtualEthernetMapper_v1_5", "get_virtual_ethernet_mapper"]
