"""VyOS 1.5 OSPF mapper.

1.5-only leaves live here. Path methods do not re-check the node: the builder
already called ``require_node``.
"""

from typing import List

from ..ospf import OspfMapper


class OspfMapperV1_5(OspfMapper):
    """VyOS 1.5 OSPF mapper."""

    def redistribute_protocol_list(self) -> List[str]:
        return super().redistribute_protocol_list() + ["nhrp"]

    def authentication_modes(self) -> List[str]:
        return super().authentication_modes() + ["null"]

    def get_interface_retransmit_window(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["retransmit-window", value]

    def get_interface_retransmit_window_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["retransmit-window"]

    def get_area_virtual_link_retransmit_window(self, area_id: str, address: str, value: str) -> List[str]:
        return self._virtual_link(area_id, address) + ["retransmit-window", value]

    def get_area_virtual_link_retransmit_window_delete(self, area_id: str, address: str) -> List[str]:
        return self._virtual_link(area_id, address) + ["retransmit-window"]

    def get_interface_authentication_null(self, iface: str) -> List[str]:
        return self._interface(iface) + ["authentication", "null"]

    def get_area_virtual_link_authentication_null(self, area_id: str, address: str) -> List[str]:
        return self._virtual_link(area_id, address) + ["authentication", "null"]
