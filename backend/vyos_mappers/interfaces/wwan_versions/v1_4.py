"""
WWAN Interface Mapper - VyOS 1.4

VyOS 1.4 does NOT support:
- dhcpv6-options/no-request-dns
- dhcpv6-options/no-request-domain-name
- ipv6/address/interface-identifier (SLAAC interface identifier)
"""

from ..wwan import WwanInterfaceMapper


class WwanMapper_v1_4(WwanInterfaceMapper):
    """VyOS 1.4 WWAN interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
