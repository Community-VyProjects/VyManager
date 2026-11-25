"""
MACsec Interface Mapper - VyOS 1.5

VyOS 1.5 adds:
- ipv6 address interface-identifier (SLAAC interface identifier)
- dhcpv6-options no-request-dns
- dhcpv6-options no-request-domain-name
"""

from typing import List
from ..macsec import MacsecInterfaceMapper


class MacsecMapper_v1_5(MacsecInterfaceMapper):
    """VyOS 1.5 MACsec interface mapper with the 1.5-only leaves."""

    # --- IPv6 address interface-identifier - VyOS 1.5 only ---
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    # --- DHCPv6 request flags - VyOS 1.5 only ---
    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]
