"""
Bonding Interface Mapper - VyOS 1.4

VyOS 1.4 does NOT support:
- eapol (802.1X authentication)
- dhcpv6-options no-request-dns
- dhcpv6-options no-request-domain-name
- ipv6 address interface-identifier
"""

from ..bonding import BondingInterfaceMapper


class BondingMapper_v1_4(BondingInterfaceMapper):
    """VyOS 1.4 bonding interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
