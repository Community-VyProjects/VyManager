"""
GENEVE Interface Mapper - VyOS 1.5

VyOS 1.5 adds support for:
- ipv6 address interface-identifier (SLAAC interface identifier)
"""

from typing import List
from ..geneve import GeneveInterfaceMapper


class GeneveMapper_v1_5(GeneveInterfaceMapper):
    """VyOS 1.5 geneve interface mapper with additional features."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- IPv6 address interface-identifier - VyOS 1.5 only ---
    def get_ipv6_address_interface_identifier(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", value]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]
