"""
VXLAN Mapper - VyOS 1.5 specific paths.

VyOS 1.5 adds:
  - ipv6 address interface-identifier
  - vlan-to-vni <id> description
"""

from typing import List


class VxlanMapperV1_5:
    """VyOS 1.5 specific VXLAN mapper with additional paths."""

    def get_ipv6_address_interface_identifier(self, name: str, value: str) -> List[str]:
        return ["interfaces", "vxlan", name, "ipv6", "address", "interface-identifier", value]

    def get_ipv6_address_interface_identifier_path(self, name: str) -> List[str]:
        return ["interfaces", "vxlan", name, "ipv6", "address", "interface-identifier"]

    def get_vlan_to_vni_description(self, name: str, vlan_id: str, value: str) -> List[str]:
        return ["interfaces", "vxlan", name, "vlan-to-vni", vlan_id, "description", value]

    def get_vlan_to_vni_description_path(self, name: str, vlan_id: str) -> List[str]:
        return ["interfaces", "vxlan", name, "vlan-to-vni", vlan_id, "description"]
