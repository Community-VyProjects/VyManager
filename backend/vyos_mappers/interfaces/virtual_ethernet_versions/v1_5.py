"""
VyOS 1.5 virtual-ethernet mapper.

Adds over 1.4:
- netns (network namespace assignment) at the top interface level
- dhcpv6-options no-request-dns / no-request-domain-name at all sub-levels
- ipv6 address interface-identifier at all sub-levels
"""

from typing import List
from ..virtual_ethernet import VirtualEthernetInterfaceMapper


class VirtualEthernetMapper_v1_5(VirtualEthernetInterfaceMapper):

    # ========================================================================
    # Top-level: netns
    # ========================================================================

    def get_netns(self, interface: str, netns: str) -> List[str]:
        return self._base(interface) + ["netns", netns]

    def get_netns_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["netns"]

    # ========================================================================
    # Top-level: DHCPv6 1.5-only options
    # ========================================================================

    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    # ========================================================================
    # Top-level: IPv6 address interface-identifier
    # ========================================================================

    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    # ========================================================================
    # VIF: 1.5-only
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
    # VIF-S: 1.5-only
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
    # VIF-C: 1.5-only
    # ========================================================================

    def get_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcpv6-options", "no-request-dns"]

    def get_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcpv6-options", "no-request-domain-name"]

    def get_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str, identifier: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ipv6", "address", "interface-identifier", identifier]

    def get_vif_c_ipv6_address_interface_identifier_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ipv6", "address", "interface-identifier"]
