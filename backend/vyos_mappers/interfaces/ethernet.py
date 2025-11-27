"""
Ethernet Interface Command Mapper

Handles ethernet-specific interface commands (speed, duplex, etc).
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class EthernetInterfaceMapper(BaseFeatureMapper):
    """Ethernet interface mapper with all ethernet interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "ethernet"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for setting interface description."""
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting interface address."""
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for setting interface MTU."""
        return ["interfaces", self.interface_type, interface, "mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        """Get command path for MTU property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mtu"]

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for an interface (for deletion)."""
        return ["interfaces", self.interface_type, interface]

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling an interface."""
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    def get_duplex(self, interface: str, duplex: str) -> List[str]:
        """Get command path for setting interface duplex (ethernet only)."""
        return ["interfaces", self.interface_type, interface, "duplex", duplex]

    def get_duplex_path(self, interface: str) -> List[str]:
        """Get command path for duplex property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "duplex"]

    def get_speed(self, interface: str, speed: str) -> List[str]:
        """Get command path for setting interface speed (ethernet only)."""
        return ["interfaces", self.interface_type, interface, "speed", speed]

    def get_speed_path(self, interface: str) -> List[str]:
        """Get command path for speed property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "speed"]

    # MAC Address
    def get_mac(self, interface: str, mac: str) -> List[str]:
        """Get command path for setting MAC address."""
        return ["interfaces", self.interface_type, interface, "mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        """Get command path for MAC address property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mac"]

    # Hardware Offloading
    def get_offload_gro(self, interface: str) -> List[str]:
        """Get command path for enabling Generic Receive Offload."""
        return ["interfaces", self.interface_type, interface, "offload", "gro"]

    def get_offload_gso(self, interface: str) -> List[str]:
        """Get command path for enabling Generic Segmentation Offload."""
        return ["interfaces", self.interface_type, interface, "offload", "gso"]

    def get_offload_lro(self, interface: str) -> List[str]:
        """Get command path for enabling Large Receive Offload."""
        return ["interfaces", self.interface_type, interface, "offload", "lro"]

    def get_offload_rps(self, interface: str) -> List[str]:
        """Get command path for enabling Receive Packet Steering."""
        return ["interfaces", self.interface_type, interface, "offload", "rps"]

    def get_offload_sg(self, interface: str) -> List[str]:
        """Get command path for enabling Scatter-Gather."""
        return ["interfaces", self.interface_type, interface, "offload", "sg"]

    def get_offload_tso(self, interface: str) -> List[str]:
        """Get command path for enabling TCP Segmentation Offload."""
        return ["interfaces", self.interface_type, interface, "offload", "tso"]

    # Ring Buffer
    def get_ring_buffer_rx(self, interface: str, size: str) -> List[str]:
        """Get command path for setting RX ring buffer size."""
        return ["interfaces", self.interface_type, interface, "ring-buffer", "rx", size]

    def get_ring_buffer_tx(self, interface: str, size: str) -> List[str]:
        """Get command path for setting TX ring buffer size."""
        return ["interfaces", self.interface_type, interface, "ring-buffer", "tx", size]

    def get_ring_buffer_path(self, interface: str) -> List[str]:
        """Get command path for ring buffer settings (for deletion)."""
        return ["interfaces", self.interface_type, interface, "ring-buffer"]

    # TCP MSS
    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        """Get command path for setting IPv4 TCP MSS."""
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        """Get command path for enabling MSS clamping to PMTU (IPv4)."""
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        """Get command path for setting IPv6 TCP MSS."""
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        """Get command path for enabling MSS clamping to PMTU (IPv6)."""
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    # ARP Settings
    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        """Get command path for ARP cache timeout."""
        return ["interfaces", self.interface_type, interface, "ip", "arp-cache-timeout", timeout]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        """Get command path for disabling ARP filter."""
        return ["interfaces", self.interface_type, interface, "ip", "disable-arp-filter"]

    def get_ip_enable_arp_accept(self, interface: str) -> List[str]:
        """Get command path for enabling ARP accept."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce(self, interface: str) -> List[str]:
        """Get command path for enabling ARP announce."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore(self, interface: str) -> List[str]:
        """Get command path for enabling ARP ignore."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-ignore"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        """Get command path for enabling proxy ARP."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-proxy-arp"]

    def get_ip_proxy_arp_pvlan(self, interface: str) -> List[str]:
        """Get command path for enabling private VLAN proxy ARP."""
        return ["interfaces", self.interface_type, interface, "ip", "proxy-arp-pvlan"]

    # Source Validation
    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        """Get command path for source validation (strict/loose/disable)."""
        return ["interfaces", self.interface_type, interface, "ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        """Get command path for source validation (for deletion)."""
        return ["interfaces", self.interface_type, interface, "ip", "source-validation"]

    # Directed Broadcast (1.5+)
    def get_ip_enable_directed_broadcast(self, interface: str) -> List[str]:
        """Get command path for enabling directed broadcast."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-directed-broadcast"]

    # IPv6 Settings
    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        """Get command path for IPv6 SLAAC autoconfiguration."""
        return ["interfaces", self.interface_type, interface, "ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        """Get command path for IPv6 EUI-64 address."""
        return ["interfaces", self.interface_type, interface, "ipv6", "address", "eui64", prefix]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        """Get command path for disabling IPv6 forwarding."""
        return ["interfaces", self.interface_type, interface, "ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        """Get command path for IPv6 DAD transmits."""
        return ["interfaces", self.interface_type, interface, "ipv6", "dup-addr-detect-transmits", count]

    # Flow Control
    def get_disable_flow_control(self, interface: str) -> List[str]:
        """Get command path for disabling flow control."""
        return ["interfaces", self.interface_type, interface, "disable-flow-control"]

    # Link Detection
    def get_disable_link_detect(self, interface: str) -> List[str]:
        """Get command path for disabling link detection."""
        return ["interfaces", self.interface_type, interface, "disable-link-detect"]

    # DHCP Options
    def get_dhcp_options_client_id(self, interface: str, client_id: str) -> List[str]:
        """Get command path for DHCP client ID."""
        return ["interfaces", self.interface_type, interface, "dhcp-options", "client-id", client_id]

    def get_dhcp_options_host_name(self, interface: str, hostname: str) -> List[str]:
        """Get command path for DHCP hostname."""
        return ["interfaces", self.interface_type, interface, "dhcp-options", "host-name", hostname]

    def get_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> List[str]:
        """Get command path for DHCP vendor class ID."""
        return ["interfaces", self.interface_type, interface, "dhcp-options", "vendor-class-id", vendor_id]

    def get_dhcp_options_no_default_route(self, interface: str) -> List[str]:
        """Get command path for rejecting DHCP default route."""
        return ["interfaces", self.interface_type, interface, "dhcp-options", "no-default-route"]

    def get_dhcp_options_default_route_distance(self, interface: str, distance: str) -> List[str]:
        """Get command path for DHCP default route distance."""
        return ["interfaces", self.interface_type, interface, "dhcp-options", "default-route-distance", distance]

    # DHCPv6 Options
    def get_dhcpv6_options_duid(self, interface: str, duid: str) -> List[str]:
        """Get command path for DHCPv6 DUID."""
        return ["interfaces", self.interface_type, interface, "dhcpv6-options", "duid", duid]

    def get_dhcpv6_options_rapid_commit(self, interface: str) -> List[str]:
        """Get command path for DHCPv6 rapid commit."""
        return ["interfaces", self.interface_type, interface, "dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_options_pd(self, interface: str, pd_id: str, prefix: str) -> List[str]:
        """Get command path for DHCPv6 prefix delegation."""
        return ["interfaces", self.interface_type, interface, "dhcpv6-options", "pd", pd_id, "length", prefix]

    # VLANs - Basic VLAN creation
    def get_vif(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for 802.1q VLAN (vif)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id]

    def get_vif_s(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for QinQ service VLAN (vif-s)."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id]

    def get_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for QinQ customer VLAN (vif-c)."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id]

    # VIF (802.1q VLAN) Sub-interface Configuration
    def get_vif_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for vif address."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "address", address]

    def get_vif_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for vif description."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "description", description]

    def get_vif_description_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif description (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "description"]

    def get_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> List[str]:
        """Get command path for vif MTU."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "mtu", mtu]

    def get_vif_mtu_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif MTU (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "mtu"]

    def get_vif_disable(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif disable."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "disable"]

    def get_vif_vrf(self, interface: str, vlan_id: str, vrf: str) -> List[str]:
        """Get command path for vif VRF."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "vrf", vrf]

    def get_vif_mac(self, interface: str, vlan_id: str, mac: str) -> List[str]:
        """Get command path for vif MAC address."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "mac", mac]

    def get_vif_mac_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif MAC (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "mac"]

    # VIF-S (QinQ Service VLAN) Sub-interface Configuration
    def get_vif_s_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for vif-s address."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "address", address]

    def get_vif_s_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for vif-s description."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "description", description]

    def get_vif_s_description_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s description (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "description"]

    def get_vif_s_mtu(self, interface: str, vlan_id: str, mtu: str) -> List[str]:
        """Get command path for vif-s MTU."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "mtu", mtu]

    def get_vif_s_mtu_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s MTU (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "mtu"]

    def get_vif_s_disable(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s disable."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "disable"]

    def get_vif_s_vrf(self, interface: str, vlan_id: str, vrf: str) -> List[str]:
        """Get command path for vif-s VRF."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "vrf", vrf]

    def get_vif_s_mac(self, interface: str, vlan_id: str, mac: str) -> List[str]:
        """Get command path for vif-s MAC address."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "mac", mac]

    def get_vif_s_mac_path(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s MAC (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "mac"]

    # VIF-C (QinQ Customer VLAN) Sub-interface Configuration
    def get_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str) -> List[str]:
        """Get command path for vif-c address."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "address", address]

    def get_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str, description: str) -> List[str]:
        """Get command path for vif-c description."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "description", description]

    def get_vif_c_description_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for vif-c description (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "description"]

    def get_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str, mtu: str) -> List[str]:
        """Get command path for vif-c MTU."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "mtu", mtu]

    def get_vif_c_mtu_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for vif-c MTU (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "mtu"]

    def get_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for vif-c disable."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "disable"]

    def get_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str, vrf: str) -> List[str]:
        """Get command path for vif-c VRF."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "vrf", vrf]

    def get_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str, mac: str) -> List[str]:
        """Get command path for vif-c MAC address."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "mac", mac]

    def get_vif_c_mac_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for vif-c MAC (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "mac"]

    # VIF DHCP Options
    def get_vif_dhcp_options_client_id(self, interface: str, vlan_id: str, client_id: str) -> List[str]:
        """Get command path for vif DHCP client ID."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "dhcp-options", "client-id", client_id]

    def get_vif_dhcp_options_host_name(self, interface: str, vlan_id: str, hostname: str) -> List[str]:
        """Get command path for vif DHCP hostname."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "dhcp-options", "host-name", hostname]

    # VIF IPv6 Options
    def get_vif_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif IPv6 autoconf."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "ipv6", "address", "autoconf"]

    def get_vif_ipv6_address_eui64(self, interface: str, vlan_id: str, prefix: str) -> List[str]:
        """Get command path for vif IPv6 EUI-64."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "ipv6", "address", "eui64", prefix]

    # VIF-S DHCP Options
    def get_vif_s_dhcp_options_client_id(self, interface: str, vlan_id: str, client_id: str) -> List[str]:
        """Get command path for vif-s DHCP client ID."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "dhcp-options", "client-id", client_id]

    def get_vif_s_dhcp_options_host_name(self, interface: str, vlan_id: str, hostname: str) -> List[str]:
        """Get command path for vif-s DHCP hostname."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "dhcp-options", "host-name", hostname]

    # VIF-S IPv6 Options
    def get_vif_s_ipv6_address_autoconf(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s IPv6 autoconf."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "ipv6", "address", "autoconf"]

    def get_vif_s_ipv6_address_eui64(self, interface: str, vlan_id: str, prefix: str) -> List[str]:
        """Get command path for vif-s IPv6 EUI-64."""
        return ["interfaces", self.interface_type, interface, "vif-s", vlan_id, "ipv6", "address", "eui64", prefix]

    # VIF-C DHCP Options
    def get_vif_c_dhcp_options_client_id(self, interface: str, s_vlan_id: str, c_vlan_id: str, client_id: str) -> List[str]:
        """Get command path for vif-c DHCP client ID."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "dhcp-options", "client-id", client_id]

    def get_vif_c_dhcp_options_host_name(self, interface: str, s_vlan_id: str, c_vlan_id: str, hostname: str) -> List[str]:
        """Get command path for vif-c DHCP hostname."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "dhcp-options", "host-name", hostname]

    # VIF-C IPv6 Options
    def get_vif_c_ipv6_address_autoconf(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        """Get command path for vif-c IPv6 autoconf."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "ipv6", "address", "autoconf"]

    def get_vif_c_ipv6_address_eui64(self, interface: str, s_vlan_id: str, c_vlan_id: str, prefix: str) -> List[str]:
        """Get command path for vif-c IPv6 EUI-64."""
        return ["interfaces", self.interface_type, interface, "vif-s", s_vlan_id, "vif-c", c_vlan_id, "ipv6", "address", "eui64", prefix]

    # Port Mirroring
    def get_mirror_ingress(self, interface: str, mirror_interface: str) -> List[str]:
        """Get command path for ingress port mirroring."""
        return ["interfaces", self.interface_type, interface, "mirror", "ingress", mirror_interface]

    def get_mirror_egress(self, interface: str, mirror_interface: str) -> List[str]:
        """Get command path for egress port mirroring."""
        return ["interfaces", self.interface_type, interface, "mirror", "egress", mirror_interface]

    def get_mirror_path(self, interface: str) -> List[str]:
        """Get command path for mirror settings (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mirror"]

    # EAPoL (802.1X)
    def get_eapol_ca_cert_file(self, interface: str, cert_file: str) -> List[str]:
        """Get command path for EAPoL CA certificate."""
        return ["interfaces", self.interface_type, interface, "eapol", "ca-cert-file", cert_file]

    def get_eapol_cert_file(self, interface: str, cert_file: str) -> List[str]:
        """Get command path for EAPoL client certificate."""
        return ["interfaces", self.interface_type, interface, "eapol", "cert-file", cert_file]

    def get_eapol_key_file(self, interface: str, key_file: str) -> List[str]:
        """Get command path for EAPoL private key."""
        return ["interfaces", self.interface_type, interface, "eapol", "key-file", key_file]

    # EVPN
    def get_evpn_uplink(self, interface: str) -> List[str]:
        """Get command path for EVPN uplink tracking."""
        return ["interfaces", self.interface_type, interface, "evpn", "uplink"]

    def get_evpn_path(self, interface: str) -> List[str]:
        """Get command path for EVPN settings (for deletion)."""
        return ["interfaces", self.interface_type, interface, "evpn"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single ethernet interface configuration from VyOS (version-aware).

        Returns normalized structure - all versions return same fields.
        Unavailable features are set to None.

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary (normalized across all versions)
        """
        # Parse addresses (can be string or list)
        addresses = self._parse_addresses(config)

        # Check if interface is disabled
        disabled = "disable" in config

        # Parse all configuration sections using helper methods
        # These can be overridden in version-specific subclasses
        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "hw_id": config.get("hw-id"),
            "mac": config.get("mac"),
            "duplex": config.get("duplex"),
            "speed": config.get("speed"),
            "disable": disabled if disabled else None,
            "disable_flow_control": "disable-flow-control" in config,
            "disable_link_detect": "disable-link-detect" in config,
            # Parsed subsections
            "offload": self._parse_offload(config),
            "ring_buffer": self._parse_ring_buffer(config),
            "ip": self._parse_ip_config(config),  # Version-aware
            "ipv6": self._parse_ipv6_config(config),
            "dhcp_options": self._parse_dhcp_options(config),
            "dhcpv6_options": self._parse_dhcpv6_options(config),
            "vif": self._parse_vif(config),
            "vif_s": self._parse_vif_s(config),
            "mirror": self._parse_mirror(config),
            "eapol": self._parse_eapol(config),
            "evpn": self._parse_evpn(config),
        }

    # ========================================================================
    # Helper Methods - Can be overridden in version-specific subclasses
    # ========================================================================

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        """Parse addresses (works for all versions)."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def _parse_offload(self, config):
        offload = config.get("offload")
        if not offload:
            return None

        def flag(name):
            return "on" if name in offload else "off"

        return {
            "gro": flag("gro"),
            "gso": flag("gso"),
            "lro": flag("lro"),
            "rps": flag("rps"),
            "sg": flag("sg"),
            "tso": flag("tso"),
        }

    def _parse_ring_buffer(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse ring buffer settings."""
        ring_buffer = config.get("ring-buffer", {})
        if not ring_buffer:
            return None
        return {
            "rx": ring_buffer.get("rx"),
            "tx": ring_buffer.get("tx"),
        }

    def _parse_ip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse IP configuration.

        Base implementation includes ALL fields (v1.5+ superset).
        Version-specific subclasses should override to exclude unavailable features.
        """
        ip_config = config.get("ip", {})
        if not ip_config:
            return None

        return {
            "adjust_mss": ip_config.get("adjust-mss"),
            "arp_cache_timeout": ip_config.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip_config,
            "enable_arp_accept": "enable-arp-accept" in ip_config,
            "enable_arp_announce": "enable-arp-announce" in ip_config,
            "enable_arp_ignore": "enable-arp-ignore" in ip_config,
            "enable_proxy_arp": "enable-proxy-arp" in ip_config,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config,
            "source_validation": ip_config.get("source-validation"),
            # v1.5+ features - included in base for normalization
            # Override in v1.4 to exclude or set to None
            "enable_directed_broadcast": "enable-directed-broadcast" in ip_config,
        }

    def _parse_ipv6_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse IPv6 configuration."""
        ipv6_config = config.get("ipv6", {})

        # Parse IPv6 addresses (autoconf, eui64)
        ipv6_addresses = []
        if "ipv6" in config and "address" in config["ipv6"]:
            ipv6_addr = config["ipv6"]["address"]
            if isinstance(ipv6_addr, dict):
                if "autoconf" in ipv6_addr:
                    ipv6_addresses.append("autoconf")
                if "eui64" in ipv6_addr:
                    eui64_addrs = ipv6_addr["eui64"]
                    if isinstance(eui64_addrs, list):
                        ipv6_addresses.extend([f"eui64:{addr}" for addr in eui64_addrs])
                    elif isinstance(eui64_addrs, str):
                        ipv6_addresses.append(f"eui64:{eui64_addrs}")

        if not ipv6_config and not ipv6_addresses:
            return None

        return {
            "address": ipv6_addresses if ipv6_addresses else None,
            "adjust_mss": ipv6_config.get("adjust-mss"),
            "disable_forwarding": "disable-forwarding" in ipv6_config,
            "dup_addr_detect_transmits": ipv6_config.get("dup-addr-detect-transmits"),
        }

    def _parse_dhcp_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DHCP options."""
        dhcp_options = config.get("dhcp-options", {})
        if not dhcp_options:
            return None
        return {
            "client_id": dhcp_options.get("client-id"),
            "host_name": dhcp_options.get("host-name"),
            "vendor_class_id": dhcp_options.get("vendor-class-id"),
            "no_default_route": "no-default-route" in dhcp_options,
            "default_route_distance": dhcp_options.get("default-route-distance"),
        }

    def _parse_dhcpv6_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DHCPv6 options."""
        dhcpv6_options = config.get("dhcpv6-options", {})
        if not dhcpv6_options:
            return None
        return {
            "duid": dhcpv6_options.get("duid"),
            "rapid_commit": "rapid-commit" in dhcpv6_options,
            "pd": dhcpv6_options.get("pd"),
        }

    def _parse_vif(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VIF (802.1q VLAN) configurations."""
        vif_raw = config.get("vif", {})
        vif_parsed = []
        if vif_raw:
            for vif_id, vif_config in vif_raw.items():
                if isinstance(vif_config, dict):
                    # Parse VIF addresses
                    vif_addresses = []
                    if "address" in vif_config:
                        addr = vif_config["address"]
                        if isinstance(addr, list):
                            vif_addresses = addr
                        elif isinstance(addr, str):
                            vif_addresses = [addr]

                    vif_parsed.append({
                        "vlan_id": vif_id,
                        "addresses": vif_addresses,
                        "description": vif_config.get("description"),
                        "mtu": vif_config.get("mtu"),
                        "mac": vif_config.get("mac"),
                        "vrf": vif_config.get("vrf"),
                        "disable": "disable" in vif_config,
                    })
        return vif_parsed if vif_parsed else None

    def _parse_vif_s(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VIF-S (QinQ Service VLAN) configurations."""
        vif_s_raw = config.get("vif-s", {})
        vif_s_parsed = []
        if vif_s_raw:
            for vif_s_id, vif_s_config in vif_s_raw.items():
                if isinstance(vif_s_config, dict):
                    # Parse VIF-S addresses
                    vif_s_addresses = []
                    if "address" in vif_s_config:
                        addr = vif_s_config["address"]
                        if isinstance(addr, list):
                            vif_s_addresses = addr
                        elif isinstance(addr, str):
                            vif_s_addresses = [addr]

                    # Parse VIF-C (customer VLANs under this service VLAN)
                    vif_c_raw = vif_s_config.get("vif-c", {})
                    vif_c_parsed = []
                    if vif_c_raw:
                        for vif_c_id, vif_c_config in vif_c_raw.items():
                            if isinstance(vif_c_config, dict):
                                # Parse VIF-C addresses
                                vif_c_addresses = []
                                if "address" in vif_c_config:
                                    addr = vif_c_config["address"]
                                    if isinstance(addr, list):
                                        vif_c_addresses = addr
                                    elif isinstance(addr, str):
                                        vif_c_addresses = [addr]

                                vif_c_parsed.append({
                                    "vlan_id": vif_c_id,
                                    "addresses": vif_c_addresses,
                                    "description": vif_c_config.get("description"),
                                    "mtu": vif_c_config.get("mtu"),
                                    "mac": vif_c_config.get("mac"),
                                    "vrf": vif_c_config.get("vrf"),
                                    "disable": "disable" in vif_c_config,
                                })

                    vif_s_parsed.append({
                        "vlan_id": vif_s_id,
                        "addresses": vif_s_addresses,
                        "description": vif_s_config.get("description"),
                        "mtu": vif_s_config.get("mtu"),
                        "mac": vif_s_config.get("mac"),
                        "vrf": vif_s_config.get("vrf"),
                        "disable": "disable" in vif_s_config,
                        "vif_c": vif_c_parsed if vif_c_parsed else None,
                    })
        return vif_s_parsed if vif_s_parsed else None

    def _parse_mirror(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse port mirroring settings."""
        mirror = config.get("mirror", {})
        if not mirror:
            return None
        return {
            "ingress": mirror.get("ingress"),
            "egress": mirror.get("egress"),
        }

    def _parse_eapol(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse EAPoL (802.1X) settings."""
        eapol = config.get("eapol", {})
        if not eapol:
            return None
        return {
            "ca_cert_file": eapol.get("ca-cert-file"),
            "cert_file": eapol.get("cert-file"),
            "key_file": eapol.get("key-file"),
        }

    def _parse_evpn(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse EVPN settings."""
        evpn = config.get("evpn", {})
        if not evpn:
            return None
        return {
            "uplink": "uplink" in evpn,
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all ethernet interfaces.

        Args:
            config: Raw config dictionary for ethernet interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
        }
