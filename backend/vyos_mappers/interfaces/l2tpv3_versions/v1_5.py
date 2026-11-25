"""
L2TPv3 Interface Mapper - VyOS 1.5

VyOS 1.5 adds support for:
- ipv6 address interface-identifier (SLAAC interface identifier)
"""

from typing import List
from ..l2tpv3 import L2TPv3InterfaceMapper


class L2TPv3Mapper_v1_5(L2TPv3InterfaceMapper):
    """VyOS 1.5 L2TPv3 interface mapper with additional features."""

    # --- IPv6 address interface-identifier - VyOS 1.5 only ---
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]
