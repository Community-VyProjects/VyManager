"""
PPPoE Interface Mapper - VyOS 1.5

Adds the 1.5-only command paths: `address dhcpv6`, the DHCPv6 DNS/domain
request-suppression flags, and `ipv6 address interface-identifier`.
"""

from typing import List
from ..pppoe import PppoeInterfaceMapper


class PppoeMapper_v1_5(PppoeInterfaceMapper):
    """VyOS 1.5 PPPoE interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- Interface `address` (1.5: multi-value, allowed: dhcpv6) ---
    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["address"]

    # --- DHCPv6 request suppression flags (1.5 only) ---
    def get_dhcpv6_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    # --- IPv6 interface-identifier (1.5 only) ---
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]
