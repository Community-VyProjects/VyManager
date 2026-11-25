"""
VXLAN Mapper - VyOS 1.5

VyOS 1.5 adds:
  - ipv6 address interface-identifier
  - vlan-to-vni <id> description
"""

from typing import List
from ..vxlan import VxlanMapper


class VxlanMapperV1_5(VxlanMapper):
    """VyOS 1.5 vxlan mapper with the 1.5-only leaves."""

    def supports_gpe(self) -> bool:
        return True

    def get_ipv6_address_interface_identifier(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "interface-identifier", value]

    def get_ipv6_address_interface_identifier_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "interface-identifier"]

    def get_vlan_to_vni_description(self, name: str, vlan_id: str, value: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni", vlan_id, "description", value]

    def get_vlan_to_vni_description_path(self, name: str, vlan_id: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni", vlan_id, "description"]
