"""
Wireless Interface Mapper - VyOS 1.5

VyOS 1.5 adds:
- bssid (station mode BSSID targeting)

VyOS 1.5 does NOT support:
- country-code (removed/replaced by regulatory domain handling)
"""

from typing import List, Dict, Any
from ..wireless import WirelessInterfaceMapper


class WirelessMapper_v1_5(WirelessInterfaceMapper):
    """VyOS 1.5 wireless interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_bssid(self, interface: str, bssid: str) -> List[str]:
        return self._base(interface) + ["bssid", bssid]

    def get_bssid_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["bssid"]

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result = super().parse_single_interface(name, config)
        result["bssid"] = config.get("bssid")
        return result
