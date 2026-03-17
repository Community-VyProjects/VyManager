"""
VyOS 1.5 specific OSPF mapper overrides.

VyOS 1.5 adds:
- redistribute nhrp
- interface retransmit-window
- virtual-link retransmit-window
"""

from typing import List


class OspfMapperV1_5:
    """VyOS 1.5 specific OSPF paths."""

    def get_redistribute_nhrp(self) -> List[str]:
        """Redistribute NHRP routes (1.5 only)."""
        return ["protocols", "ospf", "redistribute", "nhrp"]

    def get_redistribute_nhrp_metric(self, value: str) -> List[str]:
        return ["protocols", "ospf", "redistribute", "nhrp", "metric", value]

    def get_redistribute_nhrp_metric_type(self, value: str) -> List[str]:
        return ["protocols", "ospf", "redistribute", "nhrp", "metric-type", value]

    def get_redistribute_nhrp_route_map(self, value: str) -> List[str]:
        return ["protocols", "ospf", "redistribute", "nhrp", "route-map", value]

    def get_redistribute_nhrp_delete(self) -> List[str]:
        return ["protocols", "ospf", "redistribute", "nhrp"]

    def get_interface_retransmit_window(self, iface: str, value: str) -> List[str]:
        """Interface retransmit-window (1.5 only)."""
        return ["protocols", "ospf", "interface", iface, "retransmit-window", value]

    def get_interface_retransmit_window_delete(self, iface: str) -> List[str]:
        return ["protocols", "ospf", "interface", iface, "retransmit-window"]

    def get_area_virtual_link_retransmit_window(self, area_id: str, address: str, value: str) -> List[str]:
        """Virtual-link retransmit-window (1.5 only)."""
        return ["protocols", "ospf", "area", area_id, "virtual-link", address, "retransmit-window", value]

    def get_area_virtual_link_retransmit_window_delete(self, area_id: str, address: str) -> List[str]:
        return ["protocols", "ospf", "area", area_id, "virtual-link", address, "retransmit-window"]
