"""
PPPoE Interface Mapper - VyOS 1.4

Lacks `address dhcpv6`, `dhcpv6-options no-request-dns`,
`dhcpv6-options no-request-domain-name`, and `ipv6 address interface-identifier`.
Those methods stay un-implemented (inherited from base) so the builder can
raise a clean error if a caller tries to set a 1.5-only feature on a 1.4 device.
"""

from ..pppoe import PppoeInterfaceMapper


class PppoeMapper_v1_4(PppoeInterfaceMapper):
    """VyOS 1.4 PPPoE interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
