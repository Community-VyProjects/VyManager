"""
Wireless Interface Mapper - VyOS 1.4

Paths this mapper adds on 1.4:
- country-code (per-interface regulatory code)

1.4 has none of the 1.5-only wireless leaves (bssid, dhcpv6-options,
ipv6 address interface-identifier, security wpa username).
"""

from typing import List, Dict, Any
from ..wireless import WirelessInterfaceMapper


class WirelessMapper_v1_4(WirelessInterfaceMapper):
    """VyOS 1.4 wireless interface mapper."""

    def get_country_code(self, interface: str, code: str) -> List[str]:
        return self._base(interface) + ["country-code", code]

    def get_country_code_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["country-code"]

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result = super().parse_single_interface(name, config)
        result["country_code"] = config.get("country-code")
        return result
