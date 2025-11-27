"""
Ethernet Interface Batch Builder

Provides all ethernet interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class EthernetInterfaceBuilderMixin:
    """Complete batch builder for ethernet interface operations"""

    def __init__(self, version: str):
        """Initialize ethernet interface batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get all feature mappers for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_ethernet"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "EthernetInterfaceBuilderMixin":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "EthernetInterfaceBuilderMixin":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "EthernetInterfaceBuilderMixin":
        """Add multiple 'set' operations to the batch."""
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Common Interface Operations
    # ========================================================================

    def set_interface_description(
        self, interface: str, description: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface description"""
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete interface description"""
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(
        self, interface: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(
        self, interface: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(
        self, interface: str, mtu: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete entire interface configuration"""
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Disable interface (administratively down)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable interface (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "EthernetInterfaceBuilderMixin":
        """Assign interface to VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str, vrf: str) -> "EthernetInterfaceBuilderMixin":
        """Remove interface from VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_delete(path)

    def set_interface_duplex(
        self, interface: str, duplex: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface duplex (ethernet only)"""
        path = self.mappers[self.interface_mapper_key].get_duplex(interface, duplex)
        return self.add_set(path)

    def delete_interface_duplex(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete interface duplex setting (ethernet only)"""
        path = self.mappers[self.interface_mapper_key].get_duplex_path(interface)
        return self.add_delete(path)

    def set_interface_speed(
        self, interface: str, speed: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface speed (ethernet only)"""
        path = self.mappers[self.interface_mapper_key].get_speed(interface, speed)
        return self.add_set(path)

    def delete_interface_speed(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete interface speed setting (ethernet only)"""
        path = self.mappers[self.interface_mapper_key].get_speed_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # MAC Address Operations
    # ========================================================================

    def set_interface_mac(
        self, interface: str, mac: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set interface MAC address"""
        path = self.mappers[self.interface_mapper_key].get_mac(interface, mac)
        return self.add_set(path)

    def delete_interface_mac(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete interface MAC address"""
        path = self.mappers[self.interface_mapper_key].get_mac_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Hardware Offloading Operations
    # ========================================================================

    def set_offload_gro(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable Generic Receive Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_gro(interface)
        return self.add_set(path)

    def delete_offload_gro(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete Generic Receive Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_gro(interface)
        return self.add_delete(path)

    def set_offload_gso(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable Generic Segmentation Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_gso(interface)
        return self.add_set(path)

    def delete_offload_gso(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete Generic Segmentation Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_gso(interface)
        return self.add_delete(path)

    def set_offload_lro(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable Large Receive Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_lro(interface)
        return self.add_set(path)

    def delete_offload_lro(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete Large Receive Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_lro(interface)
        return self.add_delete(path)

    def set_offload_rps(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable Receive Packet Steering"""
        path = self.mappers[self.interface_mapper_key].get_offload_rps(interface)
        return self.add_set(path)

    def delete_offload_rps(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete Receive Packet Steering"""
        path = self.mappers[self.interface_mapper_key].get_offload_rps(interface)
        return self.add_delete(path)

    def set_offload_sg(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable Scatter-Gather"""
        path = self.mappers[self.interface_mapper_key].get_offload_sg(interface)
        return self.add_set(path)

    def delete_offload_sg(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete Scatter-Gather"""
        path = self.mappers[self.interface_mapper_key].get_offload_sg(interface)
        return self.add_delete(path)

    def set_offload_tso(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable TCP Segmentation Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_tso(interface)
        return self.add_set(path)

    def delete_offload_tso(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete TCP Segmentation Offload"""
        path = self.mappers[self.interface_mapper_key].get_offload_tso(interface)
        return self.add_delete(path)

    # ========================================================================
    # Ring Buffer Operations
    # ========================================================================

    def set_ring_buffer_rx(
        self, interface: str, size: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set RX ring buffer size"""
        path = self.mappers[self.interface_mapper_key].get_ring_buffer_rx(interface, size)
        return self.add_set(path)

    def set_ring_buffer_tx(
        self, interface: str, size: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set TX ring buffer size"""
        path = self.mappers[self.interface_mapper_key].get_ring_buffer_tx(interface, size)
        return self.add_set(path)

    def delete_ring_buffer(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete ring buffer settings"""
        path = self.mappers[self.interface_mapper_key].get_ring_buffer_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # TCP MSS Operations
    # ========================================================================

    def set_ip_adjust_mss(
        self, interface: str, mss: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set IPv4 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ip_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable IPv4 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ipv6_adjust_mss(
        self, interface: str, mss: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set IPv6 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ipv6_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable IPv6 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    # ========================================================================
    # ARP Operations
    # ========================================================================

    def set_ip_arp_cache_timeout(
        self, interface: str, timeout: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set ARP cache timeout"""
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Disable ARP filter"""
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable ARP accept"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable ARP announce"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable ARP ignore"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable proxy ARP"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable private VLAN proxy ARP"""
        path = self.mappers[self.interface_mapper_key].get_ip_proxy_arp_pvlan(interface)
        return self.add_set(path)

    # ========================================================================
    # Source Validation Operations
    # ========================================================================

    def set_ip_source_validation(
        self, interface: str, mode: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set source validation mode (strict/loose/disable)"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete source validation"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Directed Broadcast Operations (1.5+)
    # ========================================================================

    def set_ip_enable_directed_broadcast(
        self, interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable directed broadcast (1.5+ only)"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_directed_broadcast(interface)
        return self.add_set(path)

    # ========================================================================
    # IPv6 Operations
    # ========================================================================

    def set_ipv6_address_autoconf(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable IPv6 SLAAC autoconfiguration"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_autoconf(interface)
        return self.add_set(path)

    def set_ipv6_address_eui64(
        self, interface: str, prefix: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set IPv6 EUI-64 address"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Disable IPv6 forwarding"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def set_ipv6_dup_addr_detect_transmits(
        self, interface: str, count: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set IPv6 DAD transmits"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, count)
        return self.add_set(path)

    # ========================================================================
    # Flow Control Operations
    # ========================================================================

    def set_disable_flow_control(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Disable flow control"""
        path = self.mappers[self.interface_mapper_key].get_disable_flow_control(interface)
        return self.add_set(path)

    def delete_disable_flow_control(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable flow control (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable_flow_control(interface)
        return self.add_delete(path)

    # ========================================================================
    # Link Detection Operations
    # ========================================================================

    def set_disable_link_detect(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Disable link detection"""
        path = self.mappers[self.interface_mapper_key].get_disable_link_detect(interface)
        return self.add_set(path)

    def delete_disable_link_detect(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable link detection (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable_link_detect(interface)
        return self.add_delete(path)

    # ========================================================================
    # DHCP Options Operations
    # ========================================================================

    def set_dhcp_options_client_id(
        self, interface: str, client_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCP client ID"""
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_client_id(interface, client_id)
        return self.add_set(path)

    def set_dhcp_options_host_name(
        self, interface: str, hostname: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCP hostname"""
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_host_name(interface, hostname)
        return self.add_set(path)

    def set_dhcp_options_vendor_class_id(
        self, interface: str, vendor_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCP vendor class ID"""
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_vendor_class_id(interface, vendor_id)
        return self.add_set(path)

    def set_dhcp_options_no_default_route(
        self, interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Reject DHCP default route"""
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_no_default_route(interface)
        return self.add_set(path)

    def set_dhcp_options_default_route_distance(
        self, interface: str, distance: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCP default route distance"""
        path = self.mappers[self.interface_mapper_key].get_dhcp_options_default_route_distance(interface, distance)
        return self.add_set(path)

    # ========================================================================
    # DHCPv6 Options Operations
    # ========================================================================

    def set_dhcpv6_options_duid(
        self, interface: str, duid: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCPv6 DUID"""
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_duid(interface, duid)
        return self.add_set(path)

    def set_dhcpv6_options_rapid_commit(
        self, interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable DHCPv6 rapid commit"""
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_rapid_commit(interface)
        return self.add_set(path)

    def set_dhcpv6_options_pd(
        self, interface: str, pd_id: str, prefix: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set DHCPv6 prefix delegation"""
        path = self.mappers[self.interface_mapper_key].get_dhcpv6_options_pd(interface, pd_id, prefix)
        return self.add_set(path)

    # ========================================================================
    # VLAN Operations - Basic VLAN Creation
    # ========================================================================

    def set_vif(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Configure 802.1q VLAN (vif)"""
        path = self.mappers[self.interface_mapper_key].get_vif(interface, vlan_id)
        return self.add_set(path)

    def set_vif_s(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Configure QinQ service VLAN (vif-s)"""
        path = self.mappers[self.interface_mapper_key].get_vif_s(interface, vlan_id)
        return self.add_set(path)

    def set_vif_c(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Configure QinQ customer VLAN (vif-c)"""
        path = self.mappers[self.interface_mapper_key].get_vif_c(interface, s_vlan_id, c_vlan_id)
        return self.add_set(path)

    # ========================================================================
    # VIF (802.1q VLAN) Sub-interface Configuration
    # ========================================================================

    def set_vif_address(
        self, interface: str, vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF address"""
        path = self.mappers[self.interface_mapper_key].get_vif_address(interface, vlan_id, address)
        return self.add_set(path)

    def delete_vif_address(
        self, interface: str, vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF address"""
        path = self.mappers[self.interface_mapper_key].get_vif_address(interface, vlan_id, address)
        return self.add_delete(path)

    def set_vif_description(
        self, interface: str, vlan_id: str, description: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF description"""
        path = self.mappers[self.interface_mapper_key].get_vif_description(interface, vlan_id, description)
        return self.add_set(path)

    def delete_vif_description(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF description"""
        path = self.mappers[self.interface_mapper_key].get_vif_description_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_mtu(
        self, interface: str, vlan_id: str, mtu: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_mtu(interface, vlan_id, mtu)
        return self.add_set(path)

    def delete_vif_mtu(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_mtu_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_disable(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Disable VIF"""
        path = self.mappers[self.interface_mapper_key].get_vif_disable(interface, vlan_id)
        return self.add_set(path)

    def delete_vif_disable(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable VIF (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_vif_disable(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_vrf(
        self, interface: str, vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_vrf(interface, vlan_id, vrf)
        return self.add_set(path)

    def delete_vif_vrf(
        self, interface: str, vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_vrf(interface, vlan_id, vrf)
        return self.add_delete(path)

    def set_vif_mac(
        self, interface: str, vlan_id: str, mac: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_mac(interface, vlan_id, mac)
        return self.add_set(path)

    def delete_vif_mac(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_mac_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_dhcp_options_client_id(
        self, interface: str, vlan_id: str, client_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF DHCP client ID"""
        path = self.mappers[self.interface_mapper_key].get_vif_dhcp_options_client_id(interface, vlan_id, client_id)
        return self.add_set(path)

    def set_vif_dhcp_options_host_name(
        self, interface: str, vlan_id: str, hostname: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF DHCP hostname"""
        path = self.mappers[self.interface_mapper_key].get_vif_dhcp_options_host_name(interface, vlan_id, hostname)
        return self.add_set(path)

    def set_vif_ipv6_address_autoconf(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF IPv6 autoconf"""
        path = self.mappers[self.interface_mapper_key].get_vif_ipv6_address_autoconf(interface, vlan_id)
        return self.add_set(path)

    def set_vif_ipv6_address_eui64(
        self, interface: str, vlan_id: str, prefix: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF IPv6 EUI-64 address"""
        path = self.mappers[self.interface_mapper_key].get_vif_ipv6_address_eui64(interface, vlan_id, prefix)
        return self.add_set(path)

    # ========================================================================
    # VIF-S (QinQ Service VLAN) Sub-interface Configuration
    # ========================================================================

    def set_vif_s_address(
        self, interface: str, vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S address"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_address(interface, vlan_id, address)
        return self.add_set(path)

    def delete_vif_s_address(
        self, interface: str, vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-S address"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_address(interface, vlan_id, address)
        return self.add_delete(path)

    def set_vif_s_description(
        self, interface: str, vlan_id: str, description: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S description"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_description(interface, vlan_id, description)
        return self.add_set(path)

    def delete_vif_s_description(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-S description"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_description_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_s_mtu(
        self, interface: str, vlan_id: str, mtu: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_mtu(interface, vlan_id, mtu)
        return self.add_set(path)

    def delete_vif_s_mtu(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-S MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_mtu_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_s_disable(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Disable VIF-S"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_disable(interface, vlan_id)
        return self.add_set(path)

    def delete_vif_s_disable(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable VIF-S (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_disable(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_s_vrf(
        self, interface: str, vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_vrf(interface, vlan_id, vrf)
        return self.add_set(path)

    def delete_vif_s_vrf(
        self, interface: str, vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-S VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_vrf(interface, vlan_id, vrf)
        return self.add_delete(path)

    def set_vif_s_mac(
        self, interface: str, vlan_id: str, mac: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_mac(interface, vlan_id, mac)
        return self.add_set(path)

    def delete_vif_s_mac(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-S MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_mac_path(interface, vlan_id)
        return self.add_delete(path)

    def set_vif_s_dhcp_options_client_id(
        self, interface: str, vlan_id: str, client_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S DHCP client ID"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_dhcp_options_client_id(interface, vlan_id, client_id)
        return self.add_set(path)

    def set_vif_s_dhcp_options_host_name(
        self, interface: str, vlan_id: str, hostname: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S DHCP hostname"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_dhcp_options_host_name(interface, vlan_id, hostname)
        return self.add_set(path)

    def set_vif_s_ipv6_address_autoconf(
        self, interface: str, vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S IPv6 autoconf"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_ipv6_address_autoconf(interface, vlan_id)
        return self.add_set(path)

    def set_vif_s_ipv6_address_eui64(
        self, interface: str, vlan_id: str, prefix: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-S IPv6 EUI-64 address"""
        path = self.mappers[self.interface_mapper_key].get_vif_s_ipv6_address_eui64(interface, vlan_id, prefix)
        return self.add_set(path)

    # ========================================================================
    # VIF-C (QinQ Customer VLAN) Sub-interface Configuration
    # ========================================================================

    def set_vif_c_address(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C address"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_address(interface, s_vlan_id, c_vlan_id, address)
        return self.add_set(path)

    def delete_vif_c_address(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-C address"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_address(interface, s_vlan_id, c_vlan_id, address)
        return self.add_delete(path)

    def set_vif_c_description(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, description: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C description"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_description(interface, s_vlan_id, c_vlan_id, description)
        return self.add_set(path)

    def delete_vif_c_description(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-C description"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_description_path(interface, s_vlan_id, c_vlan_id)
        return self.add_delete(path)

    def set_vif_c_mtu(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, mtu: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_mtu(interface, s_vlan_id, c_vlan_id, mtu)
        return self.add_set(path)

    def delete_vif_c_mtu(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-C MTU"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_mtu_path(interface, s_vlan_id, c_vlan_id)
        return self.add_delete(path)

    def set_vif_c_disable(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Disable VIF-C"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_disable(interface, s_vlan_id, c_vlan_id)
        return self.add_set(path)

    def delete_vif_c_disable(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Enable VIF-C (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_disable(interface, s_vlan_id, c_vlan_id)
        return self.add_delete(path)

    def set_vif_c_vrf(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_vrf(interface, s_vlan_id, c_vlan_id, vrf)
        return self.add_set(path)

    def delete_vif_c_vrf(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, vrf: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-C VRF"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_vrf(interface, s_vlan_id, c_vlan_id, vrf)
        return self.add_delete(path)

    def set_vif_c_mac(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, mac: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_mac(interface, s_vlan_id, c_vlan_id, mac)
        return self.add_set(path)

    def delete_vif_c_mac(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Delete VIF-C MAC address"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_mac_path(interface, s_vlan_id, c_vlan_id)
        return self.add_delete(path)

    def set_vif_c_dhcp_options_client_id(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, client_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C DHCP client ID"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_dhcp_options_client_id(interface, s_vlan_id, c_vlan_id, client_id)
        return self.add_set(path)

    def set_vif_c_dhcp_options_host_name(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, hostname: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C DHCP hostname"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_dhcp_options_host_name(interface, s_vlan_id, c_vlan_id, hostname)
        return self.add_set(path)

    def set_vif_c_ipv6_address_autoconf(
        self, interface: str, s_vlan_id: str, c_vlan_id: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C IPv6 autoconf"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_ipv6_address_autoconf(interface, s_vlan_id, c_vlan_id)
        return self.add_set(path)

    def set_vif_c_ipv6_address_eui64(
        self, interface: str, s_vlan_id: str, c_vlan_id: str, prefix: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set VIF-C IPv6 EUI-64 address"""
        path = self.mappers[self.interface_mapper_key].get_vif_c_ipv6_address_eui64(interface, s_vlan_id, c_vlan_id, prefix)
        return self.add_set(path)

    # ========================================================================
    # Port Mirroring Operations
    # ========================================================================

    def set_mirror_ingress(
        self, interface: str, mirror_interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Configure ingress port mirroring"""
        path = self.mappers[self.interface_mapper_key].get_mirror_ingress(interface, mirror_interface)
        return self.add_set(path)

    def set_mirror_egress(
        self, interface: str, mirror_interface: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Configure egress port mirroring"""
        path = self.mappers[self.interface_mapper_key].get_mirror_egress(interface, mirror_interface)
        return self.add_set(path)

    def delete_mirror(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete port mirroring configuration"""
        path = self.mappers[self.interface_mapper_key].get_mirror_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # EAPoL (802.1X) Operations
    # ========================================================================

    def set_eapol_ca_cert_file(
        self, interface: str, cert_file: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set EAPoL CA certificate file"""
        path = self.mappers[self.interface_mapper_key].get_eapol_ca_cert_file(interface, cert_file)
        return self.add_set(path)

    def set_eapol_cert_file(
        self, interface: str, cert_file: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set EAPoL client certificate file"""
        path = self.mappers[self.interface_mapper_key].get_eapol_cert_file(interface, cert_file)
        return self.add_set(path)

    def set_eapol_key_file(
        self, interface: str, key_file: str
    ) -> "EthernetInterfaceBuilderMixin":
        """Set EAPoL private key file"""
        path = self.mappers[self.interface_mapper_key].get_eapol_key_file(interface, key_file)
        return self.add_set(path)

    # ========================================================================
    # EVPN Operations
    # ========================================================================

    def set_evpn_uplink(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Enable EVPN uplink tracking"""
        path = self.mappers[self.interface_mapper_key].get_evpn_uplink(interface)
        return self.add_set(path)

    def delete_evpn(self, interface: str) -> "EthernetInterfaceBuilderMixin":
        """Delete EVPN configuration"""
        path = self.mappers[self.interface_mapper_key].get_evpn_path(interface)
        return self.add_delete(path)
