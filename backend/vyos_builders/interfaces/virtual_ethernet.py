"""
Virtual Ethernet Interface Batch Builder

Provides all virtual-ethernet interface batch operations.
A virtual-ethernet interface is one end of a kernel veth pair used to connect
network namespaces or containers.

Version-aware:
- 1.5 adds `netns` at the top interface level
- 1.5 adds `dhcpv6-options no-request-dns/no-request-domain-name` at all sub-levels
- 1.5 adds `ipv6 address interface-identifier` at all sub-levels
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VirtualEthernetInterfaceBuilderMixin:
    """Complete batch builder for virtual-ethernet interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_virtual_ethernet"

    # ========================================================================
    # Core batch helpers
    # ========================================================================

    def add_set(self, path: List[str]) -> "VirtualEthernetInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VirtualEthernetInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def _mapper(self):
        return self.mappers[self.interface_mapper_key]

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": not is_v15,
                "is_1_5": is_v15,
            },
            "features": {
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "peer_name": {"supported": True, "description": "Name of the veth peer interface"},
                "netns": {
                    "supported": is_v15,
                    "description": "Assign interface to a Linux network namespace (VyOS 1.5+)",
                },
                "address": {"supported": True, "description": "IPv4/IPv6 addresses (including dhcp/dhcpv6)"},
                "dhcp_options": {"supported": True, "description": "DHCP client options"},
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client options"},
                "dhcpv6_no_request_dns": {
                    "supported": is_v15,
                    "description": "Do not request DNS servers via DHCPv6 (VyOS 1.5+)",
                },
                "dhcpv6_no_request_domain_name": {
                    "supported": is_v15,
                    "description": "Do not request domain name via DHCPv6 (VyOS 1.5+)",
                },
                "vif": {"supported": True, "description": "802.1q VLAN sub-interfaces"},
                "vif_s": {"supported": True, "description": "QinQ service VLAN sub-interfaces"},
                "vif_c": {"supported": True, "description": "QinQ customer VLAN sub-interfaces"},
                "vif_ip_settings": {"supported": True, "description": "IPv4 settings on VIF (MSS, ARP, forwarding)"},
                "vif_ipv6_settings": {"supported": True, "description": "IPv6 settings on VIF (DAD, SLAAC, forwarding)"},
                "ipv6_address_interface_identifier": {
                    "supported": is_v15,
                    "description": "Manual SLAAC interface identifier on VIF (VyOS 1.5+)",
                },
                "vif_mirror": {"supported": True, "description": "Mirror ingress/egress traffic on VIF"},
                "vif_s_protocol": {"supported": True, "description": "QinQ outer VLAN protocol (802.1ad or 802.1q)"},
            },
        }

    # ========================================================================
    # Interface CRUD
    # ========================================================================

    def delete_interface(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    def set_description(self, interface: str, description: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_description(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_disable(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_disable(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_mtu(self, interface: str, mtu: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mtu(interface, mtu))

    def delete_mtu(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mtu_path(interface))

    def set_vrf(self, interface: str, vrf: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    # ========================================================================
    # Virtual-ethernet specific
    # ========================================================================

    def set_peer_name(self, interface: str, peer: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_peer_name(interface, peer))

    def delete_peer_name(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_peer_name_path(interface))

    def set_netns(self, interface: str, netns: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_netns(interface, netns))

    def delete_netns(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_netns_path(interface))

    # ========================================================================
    # Address
    # ========================================================================

    def set_address(self, interface: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_address(interface, address))

    def delete_address(self, interface: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_address(interface, address))

    def delete_addresses(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_address_path(interface))

    # ========================================================================
    # DHCP options
    # ========================================================================

    def set_dhcp_options_client_id(self, interface: str, client_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_client_id(interface, client_id))

    def delete_dhcp_options_client_id(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_path(interface) + ["client-id"])

    def set_dhcp_options_host_name(self, interface: str, hostname: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_host_name(interface, hostname))

    def set_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_vendor_class_id(interface, vendor_id))

    def set_dhcp_options_user_class(self, interface: str, user_class: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_user_class(interface, user_class))

    def set_dhcp_options_no_default_route(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_no_default_route(interface))

    def delete_dhcp_options_no_default_route(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_no_default_route(interface))

    def set_dhcp_options_default_route_distance(self, interface: str, distance: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_default_route_distance(interface, distance))

    def set_dhcp_options_reject(self, interface: str, server: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_reject(interface, server))

    def delete_dhcp_options_reject(self, interface: str, server: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_reject(interface, server))

    def set_dhcp_options_mtu(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcp_options_mtu(interface))

    def delete_dhcp_options(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcp_options_path(interface))

    # ========================================================================
    # DHCPv6 options
    # ========================================================================

    def set_dhcpv6_options_duid(self, interface: str, duid: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_duid(interface, duid))

    def set_dhcpv6_options_no_release(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_no_release(interface))

    def delete_dhcpv6_options_no_release(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_no_release(interface))

    def set_dhcpv6_options_parameters_only(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_parameters_only(interface))

    def delete_dhcpv6_options_parameters_only(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_parameters_only(interface))

    def set_dhcpv6_options_rapid_commit(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_rapid_commit(interface))

    def delete_dhcpv6_options_rapid_commit(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_rapid_commit(interface))

    def set_dhcpv6_options_temporary(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_temporary(interface))

    def delete_dhcpv6_options_temporary(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_temporary(interface))

    def set_dhcpv6_options_no_request_dns(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_dhcpv6_options_no_request_dns(interface))

    def delete_dhcpv6_options_no_request_dns(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_dhcpv6_options_no_request_dns(interface))

    def set_dhcpv6_options_no_request_domain_name(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_dhcpv6_options_no_request_domain_name(interface))

    def delete_dhcpv6_options_no_request_domain_name(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_dhcpv6_options_no_request_domain_name(interface))

    def set_dhcpv6_options_pd_instance(self, interface: str, pd_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_instance(interface, pd_id))

    def delete_dhcpv6_options_pd_instance(self, interface: str, pd_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_pd_instance(interface, pd_id))

    def set_dhcpv6_options_pd_length(self, interface: str, pd_id: str, length: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_length(interface, pd_id, length))

    def set_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, pd_iface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface(interface, pd_id, pd_iface))

    def set_dhcpv6_options_pd_interface_address(self, interface: str, pd_id: str, pd_iface: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface_address(interface, pd_id, pd_iface, address))

    def set_dhcpv6_options_pd_interface_sla_id(self, interface: str, pd_id: str, pd_iface: str, sla_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_options_pd_interface_sla_id(interface, pd_id, pd_iface, sla_id))

    def delete_dhcpv6_options(self, interface: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_path(interface))

    # ========================================================================
    # VIF operations
    # ========================================================================

    def set_vif(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif(interface, vlan_id))

    def delete_vif(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif(interface, vlan_id))

    def set_vif_address(self, interface: str, vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_address(interface, vlan_id, address))

    def delete_vif_address(self, interface: str, vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_address(interface, vlan_id, address))

    def delete_vif_addresses(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_address_path(interface, vlan_id))

    def set_vif_description(self, interface: str, vlan_id: str, description: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_description(interface, vlan_id, description))

    def delete_vif_description(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_description_path(interface, vlan_id))

    def set_vif_disable(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_disable(interface, vlan_id))

    def delete_vif_disable(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_disable(interface, vlan_id))

    def set_vif_disable_link_detect(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_disable_link_detect(interface, vlan_id))

    def delete_vif_disable_link_detect(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_disable_link_detect(interface, vlan_id))

    def set_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_mtu(interface, vlan_id, mtu))

    def delete_vif_mtu(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_mtu_path(interface, vlan_id))

    def set_vif_mac(self, interface: str, vlan_id: str, mac: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_mac(interface, vlan_id, mac))

    def delete_vif_mac(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_mac_path(interface, vlan_id))

    def set_vif_vrf(self, interface: str, vlan_id: str, vrf: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_vrf(interface, vlan_id, vrf))

    def delete_vif_vrf(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_vrf_path(interface, vlan_id))

    def set_vif_redirect(self, interface: str, vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_redirect(interface, vlan_id, destination))

    def delete_vif_redirect(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_redirect_path(interface, vlan_id))

    def set_vif_egress_qos(self, interface: str, vlan_id: str, policy: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_egress_qos(interface, vlan_id, policy))

    def delete_vif_egress_qos(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_egress_qos_path(interface, vlan_id))

    def set_vif_ingress_qos(self, interface: str, vlan_id: str, policy: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_ingress_qos(interface, vlan_id, policy))

    def delete_vif_ingress_qos(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_ingress_qos_path(interface, vlan_id))

    def delete_vif_dhcp_options(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_dhcp_options_path(interface, vlan_id))

    def delete_vif_dhcpv6_options(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_dhcpv6_options_path(interface, vlan_id))

    def delete_vif_ip_settings(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_ip_path(interface, vlan_id))

    def delete_vif_ipv6_settings(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_ipv6_path(interface, vlan_id))

    def set_vif_mirror_ingress(self, interface: str, vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_mirror_ingress(interface, vlan_id, destination))

    def delete_vif_mirror_ingress(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_mirror_ingress_path(interface, vlan_id))

    def set_vif_mirror_egress(self, interface: str, vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_mirror_egress(interface, vlan_id, destination))

    def delete_vif_mirror_egress(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_mirror_egress_path(interface, vlan_id))

    def set_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str, identifier: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_ipv6_address_interface_identifier(interface, vlan_id, identifier))

    def delete_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_ipv6_address_interface_identifier_path(interface, vlan_id))

    def set_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_dhcpv6_options_no_request_dns(interface, vlan_id))

    def delete_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_dhcpv6_options_no_request_dns(interface, vlan_id))

    def set_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_dhcpv6_options_no_request_domain_name(interface, vlan_id))

    def delete_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_dhcpv6_options_no_request_domain_name(interface, vlan_id))

    # ========================================================================
    # VIF-S operations
    # ========================================================================

    def set_vif_s(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s(interface, s_vlan_id))

    def delete_vif_s(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s(interface, s_vlan_id))

    def set_vif_s_address(self, interface: str, s_vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_address(interface, s_vlan_id, address))

    def delete_vif_s_address(self, interface: str, s_vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_address(interface, s_vlan_id, address))

    def delete_vif_s_addresses(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_address_path(interface, s_vlan_id))

    def set_vif_s_description(self, interface: str, s_vlan_id: str, description: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_description(interface, s_vlan_id, description))

    def delete_vif_s_description(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_description_path(interface, s_vlan_id))

    def set_vif_s_disable(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_disable(interface, s_vlan_id))

    def delete_vif_s_disable(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_disable(interface, s_vlan_id))

    def set_vif_s_disable_link_detect(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_disable_link_detect(interface, s_vlan_id))

    def delete_vif_s_disable_link_detect(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_disable_link_detect(interface, s_vlan_id))

    def set_vif_s_mtu(self, interface: str, s_vlan_id: str, mtu: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_mtu(interface, s_vlan_id, mtu))

    def delete_vif_s_mtu(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_mtu_path(interface, s_vlan_id))

    def set_vif_s_mac(self, interface: str, s_vlan_id: str, mac: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_mac(interface, s_vlan_id, mac))

    def delete_vif_s_mac(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_mac_path(interface, s_vlan_id))

    def set_vif_s_vrf(self, interface: str, s_vlan_id: str, vrf: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_vrf(interface, s_vlan_id, vrf))

    def delete_vif_s_vrf(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_vrf_path(interface, s_vlan_id))

    def set_vif_s_redirect(self, interface: str, s_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_redirect(interface, s_vlan_id, destination))

    def delete_vif_s_redirect(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_redirect_path(interface, s_vlan_id))

    def set_vif_s_protocol(self, interface: str, s_vlan_id: str, protocol: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_protocol(interface, s_vlan_id, protocol))

    def delete_vif_s_protocol(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_protocol_path(interface, s_vlan_id))

    def delete_vif_s_dhcp_options(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_dhcp_options_path(interface, s_vlan_id))

    def delete_vif_s_dhcpv6_options(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_dhcpv6_options_path(interface, s_vlan_id))

    def delete_vif_s_ip_settings(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_ip_path(interface, s_vlan_id))

    def delete_vif_s_ipv6_settings(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_ipv6_path(interface, s_vlan_id))

    def set_vif_s_mirror_ingress(self, interface: str, s_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_mirror_ingress(interface, s_vlan_id, destination))

    def delete_vif_s_mirror_ingress(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_mirror_ingress_path(interface, s_vlan_id))

    def set_vif_s_mirror_egress(self, interface: str, s_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_s_mirror_egress(interface, s_vlan_id, destination))

    def delete_vif_s_mirror_egress(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_s_mirror_egress_path(interface, s_vlan_id))

    def set_vif_s_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, identifier: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_s_ipv6_address_interface_identifier(interface, s_vlan_id, identifier))

    def delete_vif_s_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_s_ipv6_address_interface_identifier_path(interface, s_vlan_id))

    def set_vif_s_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_s_dhcpv6_options_no_request_dns(interface, s_vlan_id))

    def delete_vif_s_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_s_dhcpv6_options_no_request_dns(interface, s_vlan_id))

    def set_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_s_dhcpv6_options_no_request_domain_name(interface, s_vlan_id))

    def delete_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_s_dhcpv6_options_no_request_domain_name(interface, s_vlan_id))

    # ========================================================================
    # VIF-C operations
    # ========================================================================

    def set_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_address(interface, s_vlan_id, c_vlan_id, address))

    def delete_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_address(interface, s_vlan_id, c_vlan_id, address))

    def delete_vif_c_addresses(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_address_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str, description: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_description(interface, s_vlan_id, c_vlan_id, description))

    def delete_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_description_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_disable(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_disable(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_disable_link_detect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_disable_link_detect(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_disable_link_detect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_disable_link_detect(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str, mtu: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_mtu(interface, s_vlan_id, c_vlan_id, mtu))

    def delete_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_mtu_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str, mac: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_mac(interface, s_vlan_id, c_vlan_id, mac))

    def delete_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_mac_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str, vrf: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_vrf(interface, s_vlan_id, c_vlan_id, vrf))

    def delete_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_vrf_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_redirect(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_redirect(interface, s_vlan_id, c_vlan_id, destination))

    def delete_vif_c_redirect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_redirect_path(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_dhcp_options(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_dhcp_options_path(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_dhcpv6_options(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_dhcpv6_options_path(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_ip_settings(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_ip_path(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_ipv6_settings(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_ipv6_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_mirror_ingress(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_mirror_ingress(interface, s_vlan_id, c_vlan_id, destination))

    def delete_vif_c_mirror_ingress(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_mirror_ingress_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_mirror_egress(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vif_c_mirror_egress(interface, s_vlan_id, c_vlan_id, destination))

    def delete_vif_c_mirror_egress(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vif_c_mirror_egress_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str, identifier: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_c_ipv6_address_interface_identifier(interface, s_vlan_id, c_vlan_id, identifier))

    def delete_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_c_ipv6_address_interface_identifier_path(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_c_dhcpv6_options_no_request_dns(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_c_dhcpv6_options_no_request_dns(interface, s_vlan_id, c_vlan_id))

    def set_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_vif_c_dhcpv6_options_no_request_domain_name(interface, s_vlan_id, c_vlan_id))

    def delete_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> "VirtualEthernetInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_vif_c_dhcpv6_options_no_request_domain_name(interface, s_vlan_id, c_vlan_id))
