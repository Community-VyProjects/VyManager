"""
WWAN Interface Mapper - VyOS 1.5

VyOS 1.5 adds:
- dhcpv6-options/no-request-dns
- dhcpv6-options/no-request-domain-name
- ipv6/address/interface-identifier (SLAAC interface identifier)
"""

from typing import List, Dict, Any
from ..wwan import WwanInterfaceMapper


class WwanMapper_v1_5(WwanInterfaceMapper):
    """VyOS 1.5 WWAN interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_dhcpv6_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result = super().parse_single_interface(name, config)
        dhcpv6_config = config.get("dhcpv6-options", {}) or {}
        ipv6_addr_config = (config.get("ipv6", {}) or {}).get("address", {}) or {}
        result["dhcpv6_no_request_dns"] = "no-request-dns" in dhcpv6_config
        result["dhcpv6_no_request_domain_name"] = "no-request-domain-name" in dhcpv6_config
        result["ipv6_address_interface_identifier"] = ipv6_addr_config.get("interface-identifier")
        return result
