"""
Pseudo-Ethernet (MacVLAN) Interface Command Mapper

Handles pseudo-ethernet interface commands for VyOS.
A pseudo-ethernet interface is a MacVLAN device bound to a physical Ethernet
interface, with a configurable isolation mode (private, vepa, bridge, passthru).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class PseudoEthernetInterfaceMapper(BaseFeatureMapper):
    """Base pseudo-ethernet interface mapper — common paths for all versions."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "pseudo-ethernet"

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    def _vif_base(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id]

    def _vif_s_base(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif-s", s_vlan_id]

    def _vif_c_base(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif-s", s_vlan_id, "vif-c", c_vlan_id]

    # ========================================================================
    # Interface CRUD
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_disable_link_detect(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable-link-detect"]

    # ========================================================================
    # Pseudo-ethernet specific
    # ========================================================================

    def get_source_interface(self, interface: str, source: str) -> List[str]:
        return self._base(interface) + ["source-interface", source]

    def get_source_interface_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["source-interface"]

    def get_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["mode", mode]

    def get_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mode"]

    # ========================================================================
    # Common settings
    # ========================================================================

    def get_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mac"]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Address
    # ========================================================================

    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["address"]

    # ========================================================================
    # DHCP options
    # ========================================================================

    def get_dhcp_options_client_id(self, interface: str, client_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id", client_id]

    def get_dhcp_options_host_name(self, interface: str, hostname: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name", hostname]

    def get_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id", vendor_id]

    def get_dhcp_options_user_class(self, interface: str, user_class: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class", user_class]

    def get_dhcp_options_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "no-default-route"]

    def get_dhcp_options_default_route_distance(self, interface: str, distance: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance", distance]

    def get_dhcp_options_reject(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject", server]

    def get_dhcp_options_mtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "mtu"]

    def get_dhcp_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options"]

    # ========================================================================
    # DHCPv6 options
    # ========================================================================

    def get_dhcpv6_options_duid(self, interface: str, duid: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid", duid]

    def get_dhcpv6_options_no_release(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-release"]

    def get_dhcpv6_options_parameters_only(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "parameters-only"]

    def get_dhcpv6_options_rapid_commit(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_options_temporary(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "temporary"]

    def get_dhcpv6_options_pd_instance(self, interface: str, pd_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id]

    def get_dhcpv6_options_pd_length(self, interface: str, pd_id: str, length: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "length", length]

    def get_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, pd_iface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "interface", pd_iface]

    def get_dhcpv6_options_pd_interface_address(self, interface: str, pd_id: str, pd_iface: str, address: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "interface", pd_iface, "address", address]

    def get_dhcpv6_options_pd_interface_sla_id(self, interface: str, pd_id: str, pd_iface: str, sla_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "interface", pd_iface, "sla-id", sla_id]

    def get_dhcpv6_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options"]

    # 1.5-only — overridden in v1_5 mapper
    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # IP (IPv4) settings
    # ========================================================================

    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", timeout]

    def get_ip_arp_cache_timeout_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout"]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-arp-filter"]

    def get_ip_enable_arp_accept(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-ignore"]

    def get_ip_enable_directed_broadcast(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-directed-broadcast"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-proxy-arp"]

    def get_ip_proxy_arp_pvlan(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "proxy-arp-pvlan"]

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    def get_ip_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip"]

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def get_ipv6_accept_dad(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad", count]

    def get_ipv6_accept_dad_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad"]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss"]

    def get_ipv6_base_reachable_time(self, interface: str, time: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time", time]

    def get_ipv6_base_reachable_time_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits", count]

    def get_ipv6_dup_addr_detect_transmits_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits"]

    def get_ipv6_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation", mode]

    def get_ipv6_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation"]

    def get_ipv6_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6"]

    # 1.5-only — overridden in v1_5 mapper
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # Mirror
    # ========================================================================

    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # ========================================================================
    # VIF (802.1q) sub-interfaces
    # ========================================================================

    def get_vif(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id)

    def get_vif_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["address", address]

    def get_vif_address_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["address"]

    def get_vif_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["description", description]

    def get_vif_description_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["description"]

    def get_vif_disable(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["disable"]

    def get_vif_disable_link_detect(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["disable-link-detect"]

    def get_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mtu", mtu]

    def get_vif_mtu_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mtu"]

    def get_vif_mac(self, interface: str, vlan_id: str, mac: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mac", mac]

    def get_vif_mac_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mac"]

    def get_vif_vrf(self, interface: str, vlan_id: str, vrf: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["vrf", vrf]

    def get_vif_vrf_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["vrf"]

    def get_vif_redirect(self, interface: str, vlan_id: str, destination: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["redirect", destination]

    def get_vif_redirect_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["redirect"]

    def get_vif_egress_qos(self, interface: str, vlan_id: str, policy: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["egress-qos", policy]

    def get_vif_egress_qos_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["egress-qos"]

    def get_vif_ingress_qos(self, interface: str, vlan_id: str, policy: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ingress-qos", policy]

    def get_vif_ingress_qos_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ingress-qos"]

    def get_vif_dhcp_options_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["dhcp-options"]

    def get_vif_dhcpv6_options_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["dhcpv6-options"]

    def get_vif_ip_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ip"]

    def get_vif_ipv6_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["ipv6"]

    def get_vif_mirror_ingress(self, interface: str, vlan_id: str, destination: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mirror", "ingress", destination]

    def get_vif_mirror_ingress_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mirror", "ingress"]

    def get_vif_mirror_egress(self, interface: str, vlan_id: str, destination: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mirror", "egress", destination]

    def get_vif_mirror_egress_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._vif_base(interface, vlan_id) + ["mirror", "egress"]

    # VIF: version-specific
    def get_vif_ipv6_address_interface_identifier(self, interface: str, vlan_id: str, identifier: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_ipv6_address_interface_identifier_path(self, interface: str, vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_dhcpv6_options_no_request_dns(self, interface: str, vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_dhcpv6_options_no_request_domain_name(self, interface: str, vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # VIF-S (QinQ service VLAN) sub-interfaces
    # ========================================================================

    def get_vif_s(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id)

    def get_vif_s_address(self, interface: str, s_vlan_id: str, address: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["address", address]

    def get_vif_s_address_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["address"]

    def get_vif_s_description(self, interface: str, s_vlan_id: str, description: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["description", description]

    def get_vif_s_description_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["description"]

    def get_vif_s_disable(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["disable"]

    def get_vif_s_disable_link_detect(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["disable-link-detect"]

    def get_vif_s_mtu(self, interface: str, s_vlan_id: str, mtu: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mtu", mtu]

    def get_vif_s_mtu_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mtu"]

    def get_vif_s_mac(self, interface: str, s_vlan_id: str, mac: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mac", mac]

    def get_vif_s_mac_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mac"]

    def get_vif_s_vrf(self, interface: str, s_vlan_id: str, vrf: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["vrf", vrf]

    def get_vif_s_vrf_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["vrf"]

    def get_vif_s_redirect(self, interface: str, s_vlan_id: str, destination: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["redirect", destination]

    def get_vif_s_redirect_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["redirect"]

    def get_vif_s_dhcp_options_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["dhcp-options"]

    def get_vif_s_dhcpv6_options_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["dhcpv6-options"]

    def get_vif_s_ip_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["ip"]

    def get_vif_s_ipv6_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["ipv6"]

    def get_vif_s_mirror_ingress(self, interface: str, s_vlan_id: str, destination: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mirror", "ingress", destination]

    def get_vif_s_mirror_ingress_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mirror", "ingress"]

    def get_vif_s_mirror_egress(self, interface: str, s_vlan_id: str, destination: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mirror", "egress", destination]

    def get_vif_s_mirror_egress_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["mirror", "egress"]

    # VIF-S: version-specific
    def get_vif_s_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, identifier: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_s_ipv6_address_interface_identifier_path(self, interface: str, s_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_s_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_s_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # VIF-C (QinQ customer VLAN) sub-interfaces
    # ========================================================================

    def get_vif_c(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id)

    def get_vif_c_address(self, interface: str, s_vlan_id: str, c_vlan_id: str, address: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["address", address]

    def get_vif_c_address_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["address"]

    def get_vif_c_description(self, interface: str, s_vlan_id: str, c_vlan_id: str, description: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["description", description]

    def get_vif_c_description_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["description"]

    def get_vif_c_disable(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["disable"]

    def get_vif_c_disable_link_detect(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["disable-link-detect"]

    def get_vif_c_mtu(self, interface: str, s_vlan_id: str, c_vlan_id: str, mtu: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mtu", mtu]

    def get_vif_c_mtu_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mtu"]

    def get_vif_c_mac(self, interface: str, s_vlan_id: str, c_vlan_id: str, mac: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mac", mac]

    def get_vif_c_mac_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mac"]

    def get_vif_c_vrf(self, interface: str, s_vlan_id: str, c_vlan_id: str, vrf: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["vrf", vrf]

    def get_vif_c_vrf_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["vrf"]

    def get_vif_c_redirect(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["redirect", destination]

    def get_vif_c_redirect_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["redirect"]

    def get_vif_c_dhcp_options_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcp-options"]

    def get_vif_c_dhcpv6_options_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["dhcpv6-options"]

    def get_vif_c_ip_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ip"]

    def get_vif_c_ipv6_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["ipv6"]

    def get_vif_c_mirror_ingress(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mirror", "ingress", destination]

    def get_vif_c_mirror_ingress_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mirror", "ingress"]

    def get_vif_c_mirror_egress(self, interface: str, s_vlan_id: str, c_vlan_id: str, destination: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mirror", "egress", destination]

    def get_vif_c_mirror_egress_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        return self._vif_c_base(interface, s_vlan_id, c_vlan_id) + ["mirror", "egress"]

    # VIF-C: version-specific
    def get_vif_c_ipv6_address_interface_identifier(self, interface: str, s_vlan_id: str, c_vlan_id: str, identifier: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_c_ipv6_address_interface_identifier_path(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_c_dhcpv6_options_no_request_dns(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_vif_c_dhcpv6_options_no_request_domain_name(self, interface: str, s_vlan_id: str, c_vlan_id: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # Config Parsing helpers
    # ========================================================================

    @staticmethod
    def _as_list(val: Any) -> List[str]:
        if isinstance(val, list):
            return [str(v) for v in val]
        if val is not None:
            return [str(val)]
        return []

    def _parse_dhcp_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        d = config.get("dhcp-options", {}) or {}
        return {
            "client_id": d.get("client-id"),
            "host_name": d.get("host-name"),
            "vendor_class_id": d.get("vendor-class-id"),
            "user_class": d.get("user-class"),
            "no_default_route": "no-default-route" in d,
            "default_route_distance": d.get("default-route-distance"),
            "reject": self._as_list(d.get("reject")),
            "mtu": "mtu" in d,
        } if d else None

    def _parse_dhcpv6_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        d = config.get("dhcpv6-options", {}) or {}
        if not d:
            return None
        pd_list = []
        raw_pd = d.get("pd", {}) or {}
        if isinstance(raw_pd, dict):
            for pd_id, pd_cfg in raw_pd.items():
                if not isinstance(pd_cfg, dict):
                    continue
                pd_ifaces = []
                for iface_name, iface_cfg in (pd_cfg.get("interface", {}) or {}).items():
                    if not isinstance(iface_cfg, dict):
                        iface_cfg = {}
                    pd_ifaces.append({
                        "name": iface_name,
                        "address": iface_cfg.get("address"),
                        "sla_id": iface_cfg.get("sla-id"),
                    })
                pd_list.append({
                    "instance": pd_id,
                    "length": pd_cfg.get("length"),
                    "interfaces": pd_ifaces,
                })
        return {
            "duid": d.get("duid"),
            "no_release": "no-release" in d,
            "no_request_dns": "no-request-dns" in d,
            "no_request_domain_name": "no-request-domain-name" in d,
            "parameters_only": "parameters-only" in d,
            "rapid_commit": "rapid-commit" in d,
            "temporary": "temporary" in d,
            "pd": pd_list,
        }

    def _parse_ip_settings(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ip = config.get("ip", {}) or {}
        return {
            "adjust_mss": ip.get("adjust-mss"),
            "arp_cache_timeout": ip.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip,
            "enable_arp_accept": "enable-arp-accept" in ip,
            "enable_arp_announce": "enable-arp-announce" in ip,
            "enable_arp_ignore": "enable-arp-ignore" in ip,
            "enable_directed_broadcast": "enable-directed-broadcast" in ip,
            "enable_proxy_arp": "enable-proxy-arp" in ip,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in ip,
            "disable_forwarding": "disable-forwarding" in ip,
            "source_validation": ip.get("source-validation"),
        }

    def _parse_ipv6_settings(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ipv6 = config.get("ipv6", {}) or {}
        addr = ipv6.get("address", {}) or {}
        eui64 = addr.get("eui64")
        return {
            "accept_dad": ipv6.get("accept-dad"),
            "adjust_mss": ipv6.get("adjust-mss"),
            "base_reachable_time": ipv6.get("base-reachable-time"),
            "disable_forwarding": "disable-forwarding" in ipv6,
            "dup_addr_detect_transmits": ipv6.get("dup-addr-detect-transmits"),
            "source_validation": ipv6.get("source-validation"),
            "address_autoconf": "autoconf" in addr,
            "address_eui64": self._as_list(eui64),
            "address_no_default_link_local": "no-default-link-local" in addr,
            "address_interface_identifier": addr.get("interface-identifier"),
        }

    def _parse_mirror(self, config: Dict[str, Any]) -> Dict[str, Any]:
        mirror = config.get("mirror", {}) or {}
        return {
            "ingress": mirror.get("ingress"),
            "egress": mirror.get("egress"),
        }

    def _parse_vif(self, vif_id: str, vif_cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vlan_id": vif_id,
            "description": vif_cfg.get("description"),
            "disabled": "disable" in vif_cfg,
            "disable_link_detect": "disable-link-detect" in vif_cfg,
            "addresses": self._as_list(vif_cfg.get("address")),
            "mtu": vif_cfg.get("mtu"),
            "mac": vif_cfg.get("mac"),
            "vrf": vif_cfg.get("vrf"),
            "redirect": vif_cfg.get("redirect"),
            "egress_qos": vif_cfg.get("egress-qos"),
            "ingress_qos": vif_cfg.get("ingress-qos"),
            "dhcp_options": self._parse_dhcp_options(vif_cfg),
            "dhcpv6_options": self._parse_dhcpv6_options(vif_cfg),
            "ip": self._parse_ip_settings(vif_cfg),
            "ipv6": self._parse_ipv6_settings(vif_cfg),
            "mirror": self._parse_mirror(vif_cfg),
        }

    def _parse_vif_c(self, c_vlan_id: str, vif_c_cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vlan_id": c_vlan_id,
            "description": vif_c_cfg.get("description"),
            "disabled": "disable" in vif_c_cfg,
            "disable_link_detect": "disable-link-detect" in vif_c_cfg,
            "addresses": self._as_list(vif_c_cfg.get("address")),
            "mtu": vif_c_cfg.get("mtu"),
            "mac": vif_c_cfg.get("mac"),
            "vrf": vif_c_cfg.get("vrf"),
            "redirect": vif_c_cfg.get("redirect"),
            "dhcp_options": self._parse_dhcp_options(vif_c_cfg),
            "dhcpv6_options": self._parse_dhcpv6_options(vif_c_cfg),
            "ip": self._parse_ip_settings(vif_c_cfg),
            "ipv6": self._parse_ipv6_settings(vif_c_cfg),
            "mirror": self._parse_mirror(vif_c_cfg),
        }

    def _parse_vif_s(self, s_vlan_id: str, vif_s_cfg: Dict[str, Any]) -> Dict[str, Any]:
        vif_c_list = []
        raw_vif_c = vif_s_cfg.get("vif-c", {}) or {}
        if isinstance(raw_vif_c, dict):
            for c_id, c_cfg in raw_vif_c.items():
                if isinstance(c_cfg, dict):
                    vif_c_list.append(self._parse_vif_c(c_id, c_cfg))
        return {
            "vlan_id": s_vlan_id,
            "description": vif_s_cfg.get("description"),
            "disabled": "disable" in vif_s_cfg,
            "disable_link_detect": "disable-link-detect" in vif_s_cfg,
            "addresses": self._as_list(vif_s_cfg.get("address")),
            "mtu": vif_s_cfg.get("mtu"),
            "mac": vif_s_cfg.get("mac"),
            "vrf": vif_s_cfg.get("vrf"),
            "redirect": vif_s_cfg.get("redirect"),
            "dhcp_options": self._parse_dhcp_options(vif_s_cfg),
            "dhcpv6_options": self._parse_dhcpv6_options(vif_s_cfg),
            "ip": self._parse_ip_settings(vif_s_cfg),
            "ipv6": self._parse_ipv6_settings(vif_s_cfg),
            "mirror": self._parse_mirror(vif_s_cfg),
            "vif_c": vif_c_list,
        }

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single pseudo-ethernet interface from raw VyOS config."""
        vif_list = []
        raw_vif = config.get("vif", {}) or {}
        if isinstance(raw_vif, dict):
            for vif_id, vif_cfg in raw_vif.items():
                if isinstance(vif_cfg, dict):
                    vif_list.append(self._parse_vif(vif_id, vif_cfg))

        vif_s_list = []
        raw_vif_s = config.get("vif-s", {}) or {}
        if isinstance(raw_vif_s, dict):
            for s_id, s_cfg in raw_vif_s.items():
                if isinstance(s_cfg, dict):
                    vif_s_list.append(self._parse_vif_s(s_id, s_cfg))

        return {
            "name": name,
            "type": self.interface_type,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "disable_link_detect": "disable-link-detect" in config,
            "source_interface": config.get("source-interface"),
            "mode": config.get("mode"),
            "mac": config.get("mac"),
            "mtu": config.get("mtu"),
            "vrf": config.get("vrf"),
            "redirect": config.get("redirect"),
            "addresses": self._as_list(config.get("address")),
            "dhcp_options": self._parse_dhcp_options(config),
            "dhcpv6_options": self._parse_dhcpv6_options(config),
            "ip": self._parse_ip_settings(config),
            "ipv6": self._parse_ipv6_settings(config),
            "mirror": self._parse_mirror(config),
            "vif": vif_list,
            "vif_s": vif_s_list,
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all pseudo-ethernet interfaces from raw config dict."""
        interfaces = []
        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interfaces.append(self.parse_single_interface(iface_name, iface_config))
        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
