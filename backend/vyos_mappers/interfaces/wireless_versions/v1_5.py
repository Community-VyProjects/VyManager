"""
Wireless Interface Mapper - VyOS 1.5

Paths this mapper adds on 1.5:
- bssid (station mode BSSID targeting)

1.5 has no per-interface ``country-code``; the regulatory code moved to
``system wireless country-code``. The other 1.5-only wireless leaves
(dhcpv6-options, ipv6 address interface-identifier, security wpa username)
are not mapped yet.
"""

from typing import List, Dict, Any
from ..wireless import WirelessInterfaceMapper


class WirelessMapper_v1_5(WirelessInterfaceMapper):
    """VyOS 1.5 wireless interface mapper."""

    def get_bssid(self, interface: str, bssid: str) -> List[str]:
        return self._base(interface) + ["bssid", bssid]

    def get_bssid_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["bssid"]

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result = super().parse_single_interface(name, config)
        result["bssid"] = config.get("bssid")
        return result
