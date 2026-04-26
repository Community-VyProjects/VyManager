"""
Pseudo-Ethernet Interface Mapper - VyOS 1.5

Adds the 1.5-only command paths:
  - `dhcpv6-options no-request-dns` and `no-request-domain-name` at all levels
  - `ipv6 address interface-identifier` at all levels (interface, vif, vif-s, vif-c)
"""

from typing import List
from ..pseudo_ethernet import PseudoEthernetInterfaceMapper


class PseudoEthernetMapper_v1_5(PseudoEthernetInterfaceMapper):
    """VyOS 1.5 pseudo-ethernet interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Interface-level 1.5-only paths
    # ========================================================================

    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    # ========================================================================
    # VIF-level 1.5-only paths
    # ========================================================================

    def get_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["dhcpv6-options", "no-request-dns"]

    def get_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["dhcpv6-options", "no-request-domain-name"]

    def get_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str, identifier: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ipv6", "address", "interface-identifier", identifier]

    def get_vif_ipv6_address_interface_identifier_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ipv6", "address", "interface-identifier"]

    # ========================================================================
    # VIF-S-level 1.5-only paths
    # ========================================================================

    def get_vif_s_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["dhcpv6-options", "no-request-dns"]

    def get_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["dhcpv6-options", "no-request-domain-name"]

    def get_vif_s_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, identifier: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["ipv6", "address", "interface-identifier", identifier]

    def get_vif_s_ipv6_address_interface_identifier_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["ipv6", "address", "interface-identifier"]

    # ========================================================================
    # VIF-C-level 1.5-only paths
    # ========================================================================

    def get_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcpv6-options", "no-request-dns"]

    def get_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcpv6-options", "no-request-domain-name"]

    def get_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str, identifier: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ipv6", "address", "interface-identifier", identifier]

    def get_vif_c_ipv6_address_interface_identifier_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ipv6", "address", "interface-identifier"]
