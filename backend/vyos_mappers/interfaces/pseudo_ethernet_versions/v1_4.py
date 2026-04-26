"""
Pseudo-Ethernet Interface Mapper - VyOS 1.4

Lacks `dhcpv6-options no-request-dns`, `dhcpv6-options no-request-domain-name`,
and `ipv6 address interface-identifier` at all levels (interface, vif, vif-s, vif-c).
"""

from ..pseudo_ethernet import PseudoEthernetInterfaceMapper


class PseudoEthernetMapper_v1_4(PseudoEthernetInterfaceMapper):
    """VyOS 1.4 pseudo-ethernet interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
