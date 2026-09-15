"""
VyOS 1.4 specific OSPF mapper overrides.

VyOS 1.4 does not support:
- redistribute nhrp
- interface retransmit-window
- virtual-link retransmit-window
"""

from typing import List


class OspfMapperV1_4:
    """VyOS 1.4 specific OSPF paths."""

    def get_interface_retransmit_window(self, iface: str, value: str) -> List[str]:
        raise ValueError("retransmit-window is not supported on this device")

    def get_interface_retransmit_window_delete(self, iface: str) -> List[str]:
        return ["protocols", "ospf", "interface", iface, "retransmit-window"]

    def get_area_virtual_link_retransmit_window(
        self, area_id: str, address: str, value: str
    ) -> List[str]:
        raise ValueError("retransmit-window is not supported on this device")

    def get_area_virtual_link_retransmit_window_delete(
        self, area_id: str, address: str
    ) -> List[str]:
        return [
            "protocols",
            "ospf",
            "area",
            area_id,
            "virtual-link",
            address,
            "retransmit-window",
        ]
