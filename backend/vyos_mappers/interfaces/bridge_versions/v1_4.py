"""
Bridge Interface Mapper - VyOS 1.4

VyOS 1.4 does NOT support:
- member interface bpdu-guard
- member interface root-guard
- dhcpv6-options no-request-dns
- dhcpv6-options no-request-domain-name
- ipv6 address interface-identifier
"""

from ..bridge import BridgeInterfaceMapper


class BridgeMapper_v1_4(BridgeInterfaceMapper):
    """VyOS 1.4 bridge interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
