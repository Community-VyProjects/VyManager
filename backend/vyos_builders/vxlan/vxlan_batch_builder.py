"""
VXLAN Batch Builder

Provides all batch operations for VXLAN interface configuration.
Version-aware: VyOS 1.5 adds ipv6 address interface-identifier and vlan-to-vni description.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VxlanBatchBuilder:
    """Complete batch builder for VXLAN interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "get_operations", "is_empty",
        "get_capabilities", "mappers", "mapper_key", "version",
        "_operations",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "vxlan"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "VxlanBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VxlanBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Interface-level Operations
    # ========================================================================

    def set_interface(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_path(name))

    def delete_interface(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_path(name))

    def set_address(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_address(name, value))

    def delete_address(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address(name, value))

    def delete_all_addresses(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address_path(name))

    def set_description(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_description(name, value))

    def delete_description(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_description_path(name))

    def set_disable(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable_path(name))

    def delete_disable(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable_path(name))

    def set_gpe(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_gpe_path(name))

    def delete_gpe(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_gpe_path(name))

    def set_group(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_group(name, value))

    def delete_group(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_group_path(name))

    def set_mac(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mac(name, value))

    def delete_mac(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mac_path(name))

    def set_mtu(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mtu(name, value))

    def delete_mtu(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mtu_path(name))

    def set_port(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_port(name, value))

    def delete_port(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_port_path(name))

    def set_redirect(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_redirect(name, value))

    def delete_redirect(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_redirect_path(name))

    def set_remote(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_remote(name, value))

    def delete_remote(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_remote(name, value))

    def delete_all_remotes(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_remote_path(name))

    def set_source_address(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_address(name, value))

    def delete_source_address(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_address_path(name))

    def set_source_interface(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_interface(name, value))

    def delete_source_interface(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_interface_path(name))

    def set_vni(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vni(name, value))

    def delete_vni(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vni_path(name))

    def set_vrf(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrf(name, value))

    def delete_vrf(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrf_path(name))

    # ========================================================================
    # IP Settings Operations
    # ========================================================================

    def set_ip_adjust_mss(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_adjust_mss(name, value))

    def delete_ip_adjust_mss(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_adjust_mss_path(name))

    def set_ip_arp_cache_timeout(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_arp_cache_timeout(name, value))

    def delete_ip_arp_cache_timeout(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_arp_cache_timeout_path(name))

    def set_ip_disable_arp_filter(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_arp_filter_path(name))

    def delete_ip_disable_arp_filter(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_arp_filter_path(name))

    def set_ip_disable_forwarding(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_forwarding_path(name))

    def delete_ip_disable_forwarding(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_forwarding_path(name))

    def set_ip_enable_arp_accept(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_accept_path(name))

    def delete_ip_enable_arp_accept(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_accept_path(name))

    def set_ip_enable_arp_announce(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_announce_path(name))

    def delete_ip_enable_arp_announce(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_announce_path(name))

    def set_ip_enable_arp_ignore(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_ignore_path(name))

    def delete_ip_enable_arp_ignore(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_ignore_path(name))

    def set_ip_enable_directed_broadcast(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast_path(name))

    def delete_ip_enable_directed_broadcast(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast_path(name))

    def set_ip_enable_proxy_arp(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_proxy_arp_path(name))

    def delete_ip_enable_proxy_arp(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_proxy_arp_path(name))

    def set_ip_proxy_arp_pvlan(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan_path(name))

    def delete_ip_proxy_arp_pvlan(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan_path(name))

    def set_ip_source_validation(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_source_validation(name, value))

    def delete_ip_source_validation(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_source_validation_path(name))

    # ========================================================================
    # IPv6 Settings Operations
    # ========================================================================

    def set_ipv6_accept_dad(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_accept_dad(name, value))

    def delete_ipv6_accept_dad(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_accept_dad_path(name))

    def set_ipv6_address_autoconf(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_autoconf_path(name))

    def delete_ipv6_address_autoconf(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_autoconf_path(name))

    def set_ipv6_address_eui64(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_eui64(name, value))

    def delete_ipv6_address_eui64(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64(name, value))

    def delete_all_ipv6_address_eui64(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64_path(name))

    def set_ipv6_address_interface_identifier(self, name: str, value: str) -> "VxlanBatchBuilder":
        """VyOS 1.5+ only."""
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_interface_identifier(name, value))

    def delete_ipv6_address_interface_identifier(self, name: str) -> "VxlanBatchBuilder":
        """VyOS 1.5+ only."""
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_interface_identifier_path(name))

    def set_ipv6_address_no_default_link_local(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local_path(name))

    def delete_ipv6_address_no_default_link_local(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local_path(name))

    def set_ipv6_adjust_mss(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_adjust_mss(name, value))

    def delete_ipv6_adjust_mss(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_adjust_mss_path(name))

    def set_ipv6_base_reachable_time(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_base_reachable_time(name, value))

    def delete_ipv6_base_reachable_time(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_base_reachable_time_path(name))

    def set_ipv6_disable_forwarding(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_disable_forwarding_path(name))

    def delete_ipv6_disable_forwarding(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_disable_forwarding_path(name))

    def set_ipv6_dup_addr_detect_transmits(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits(name, value))

    def delete_ipv6_dup_addr_detect_transmits(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits_path(name))

    def set_ipv6_source_validation(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_source_validation(name, value))

    def delete_ipv6_source_validation(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_source_validation_path(name))

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_egress(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_egress(name, value))

    def delete_mirror_egress(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_egress_path(name))

    def set_mirror_ingress(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_ingress(name, value))

    def delete_mirror_ingress(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_ingress_path(name))

    # ========================================================================
    # Parameters Operations
    # ========================================================================

    def set_parameters_external(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_external_path(name))

    def delete_parameters_external(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_external_path(name))

    def set_parameters_ip_df(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_df(name, value))

    def delete_parameters_ip_df(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_df_path(name))

    def set_parameters_ip_tos(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_tos(name, value))

    def delete_parameters_ip_tos(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_tos_path(name))

    def set_parameters_ip_ttl(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_ttl(name, value))

    def delete_parameters_ip_ttl(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_ttl_path(name))

    def set_parameters_ipv6_flowlabel(self, name: str, value: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ipv6_flowlabel(name, value))

    def delete_parameters_ipv6_flowlabel(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ipv6_flowlabel_path(name))

    def set_parameters_neighbor_suppress(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_neighbor_suppress_path(name))

    def delete_parameters_neighbor_suppress(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_neighbor_suppress_path(name))

    def set_parameters_nolearning(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_nolearning_path(name))

    def delete_parameters_nolearning(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_nolearning_path(name))

    def set_parameters_vni_filter(self, name: str) -> "VxlanBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_vni_filter_path(name))

    def delete_parameters_vni_filter(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_vni_filter_path(name))

    # ========================================================================
    # VLAN-to-VNI Operations
    # ========================================================================

    def set_vlan_to_vni(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Create a VLAN-to-VNI mapping entry. Value is the VLAN ID."""
        return self.add_set(self.mappers[self.mapper_key].get_vlan_to_vni_path(name, value))

    def delete_vlan_to_vni(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Delete a VLAN-to-VNI mapping entry. Value is the VLAN ID."""
        return self.add_delete(self.mappers[self.mapper_key].get_vlan_to_vni_path(name, value))

    def delete_all_vlan_to_vni(self, name: str) -> "VxlanBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vlan_to_vni_all_path(name))

    def set_vlan_to_vni_vni(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Set VNI for a VLAN mapping. Value format: 'vlan_id:vni_value'."""
        parts = value.split(":")
        if len(parts) != 2:
            return self
        return self.add_set(self.mappers[self.mapper_key].get_vlan_to_vni_vni(name, parts[0], parts[1]))

    def delete_vlan_to_vni_vni(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Delete VNI from a VLAN mapping. Value is the VLAN ID."""
        return self.add_delete(self.mappers[self.mapper_key].get_vlan_to_vni_vni_path(name, value))

    def set_vlan_to_vni_description(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Set description for a VLAN mapping (VyOS 1.5+ only). Value format: 'vlan_id:description'."""
        parts = value.split(":", 1)
        if len(parts) != 2:
            return self
        return self.add_set(self.mappers[self.mapper_key].get_vlan_to_vni_description(name, parts[0], parts[1]))

    def delete_vlan_to_vni_description(self, name: str, value: str) -> "VxlanBatchBuilder":
        """Delete description from a VLAN mapping (VyOS 1.5+ only). Value is the VLAN ID."""
        return self.add_delete(self.mappers[self.mapper_key].get_vlan_to_vni_description_path(name, value))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "vxlan": {"supported": True, "description": "VXLAN interface configuration"},
                "address": {"supported": True, "description": "IP address assignment (multi-value)"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "gpe": {"supported": True, "description": "Generic Protocol Extension (VXLAN-GPE)"},
                "group": {"supported": True, "description": "Multicast group address"},
                "ip_settings": {"supported": True, "description": "IPv4 routing parameters"},
                "ipv6_settings": {"supported": True, "description": "IPv6 routing parameters"},
                "ipv6_address_interface_identifier": {
                    "supported": is_1_5,
                    "description": "SLAAC interface identifier (VyOS 1.5+)",
                },
                "mac": {"supported": True, "description": "Custom MAC address"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress packets"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit (1200-16000)"},
                "parameters": {"supported": True, "description": "VXLAN tunnel parameters"},
                "port": {"supported": True, "description": "UDP port (default: 4789)"},
                "redirect": {"supported": True, "description": "Redirect to destination interface"},
                "remote": {"supported": True, "description": "Remote tunnel addresses (multi-value)"},
                "source_address": {"supported": True, "description": "Source IP address"},
                "source_interface": {"supported": True, "description": "Source interface"},
                "vlan_to_vni": {"supported": True, "description": "VLAN-to-VNI mappings for EVPN-VXLAN"},
                "vlan_to_vni_description": {
                    "supported": is_1_5,
                    "description": "Description for VLAN-to-VNI mappings (VyOS 1.5+)",
                },
                "vni": {"supported": True, "description": "Virtual Network Identifier (0-16777214)"},
                "vrf": {"supported": True, "description": "VRF instance binding"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
