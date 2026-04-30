"""
Wireless Interface Mapper - VyOS 1.4

VyOS 1.4 supports country-code but does NOT support:
- bssid (station mode BSSID targeting)
"""

from typing import List, Dict, Any
from ..wireless import WirelessInterfaceMapper


class WirelessMapper_v1_4(WirelessInterfaceMapper):
    """VyOS 1.4 wireless interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_country_code(self, interface: str, code: str) -> List[str]:
        return self._base(interface) + ["country-code", code]

    def get_country_code_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["country-code"]

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result = super().parse_single_interface(name, config)
        result["country_code"] = config.get("country-code")
        return result
