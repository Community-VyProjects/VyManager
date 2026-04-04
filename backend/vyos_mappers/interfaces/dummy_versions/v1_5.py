"""
Dummy Interface Mapper - VyOS 1.5

VyOS 1.5 adds support for:
- mac address configuration
- netns (network namespace assignment)
"""

from typing import List
from ..dummy import DummyInterfaceMapper


class DummyMapper_v1_5(DummyInterfaceMapper):
    """VyOS 1.5 dummy interface mapper with additional features."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- MAC address - VyOS 1.5 only ---
    def get_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mac"]

    # --- Network namespace - VyOS 1.5 only ---
    def get_netns(self, interface: str, netns: str) -> List[str]:
        return self._base(interface) + ["netns", netns]

    def get_netns_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["netns"]
