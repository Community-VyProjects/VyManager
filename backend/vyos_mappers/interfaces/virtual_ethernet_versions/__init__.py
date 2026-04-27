"""
Virtual-Ethernet Interface Version-Specific Mappers

Version differences:
- 1.5 adds:
  - `netns` at the top interface level
  - `dhcpv6-options no-request-dns` and `no-request-domain-name` at all sub-levels
  - `ipv6 address interface-identifier` at all sub-levels
"""

from ..virtual_ethernet import VirtualEthernetInterfaceMapper
from .v1_4 import VirtualEthernetMapper_v1_4
from .v1_5 import VirtualEthernetMapper_v1_5


def get_virtual_ethernet_mapper(version: str) -> VirtualEthernetInterfaceMapper:
    """Get version-specific virtual-ethernet interface mapper."""
    if "1.5" in version or "latest" in version:
        return VirtualEthernetMapper_v1_5(version)
    return VirtualEthernetMapper_v1_4(version)
