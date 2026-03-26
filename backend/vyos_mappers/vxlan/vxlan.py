"""
VXLAN Command Mapper

Handles command path generation for interfaces vxlan configuration.
Common paths shared between VyOS 1.4 and 1.5.

Config tree:
  interfaces vxlan/<NAME>/
    address          (multi, ipv4net/ipv6net)
    description      (txt)
    disable          (flag)
    gpe              (flag)
    group            (multicast address)
    ip/              (various IPv4 settings)
    ipv6/            (various IPv6 settings)
    mac              (macaddr)
    mirror/          (ingress/egress)
    mtu              (1200-16000)
    parameters/      (external, ip, ipv6, neighbor-suppress, nolearning, vni-filter)
    port             (1-65535)
    redirect         (interface)
    remote           (multi, ip address)
    source-address   (ip address)
    source-interface (interface)
    vlan-to-vni/<VLAN>/
      vni            (0-16777214)
    vni              (0-16777214)
    vrf              (txt)
"""

from typing import List
from ..base import BaseFeatureMapper


class VxlanMapper(BaseFeatureMapper):
    """Base mapper for VXLAN interface commands. Common paths for VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self, name: str) -> List[str]:
        return ["interfaces", "vxlan", name]

    # ========================================================================
    # Interface-level Paths
    # ========================================================================

    def get_interface_path(self, name: str) -> List[str]:
        return self._base(name)

    def get_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["address", value]

    def get_address_path(self, name: str) -> List[str]:
        return self._base(name) + ["address"]

    def get_description(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["description", value]

    def get_description_path(self, name: str) -> List[str]:
        return self._base(name) + ["description"]

    def get_disable_path(self, name: str) -> List[str]:
        return self._base(name) + ["disable"]

    def get_gpe_path(self, name: str) -> List[str]:
        return self._base(name) + ["gpe"]

    def get_group(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["group", value]

    def get_group_path(self, name: str) -> List[str]:
        return self._base(name) + ["group"]

    def get_mac(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mac", value]

    def get_mac_path(self, name: str) -> List[str]:
        return self._base(name) + ["mac"]

    def get_mtu(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mtu", value]

    def get_mtu_path(self, name: str) -> List[str]:
        return self._base(name) + ["mtu"]

    def get_port(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["port", value]

    def get_port_path(self, name: str) -> List[str]:
        return self._base(name) + ["port"]

    def get_redirect(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["redirect", value]

    def get_redirect_path(self, name: str) -> List[str]:
        return self._base(name) + ["redirect"]

    def get_remote(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["remote", value]

    def get_remote_path(self, name: str) -> List[str]:
        return self._base(name) + ["remote"]

    def get_source_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["source-address", value]

    def get_source_address_path(self, name: str) -> List[str]:
        return self._base(name) + ["source-address"]

    def get_source_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["source-interface", value]

    def get_source_interface_path(self, name: str) -> List[str]:
        return self._base(name) + ["source-interface"]

    def get_vni(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["vni", value]

    def get_vni_path(self, name: str) -> List[str]:
        return self._base(name) + ["vni"]

    def get_vrf(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["vrf", value]

    def get_vrf_path(self, name: str) -> List[str]:
        return self._base(name) + ["vrf"]

    # ========================================================================
    # IP Settings Paths
    # ========================================================================

    def get_ip_adjust_mss(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ip", "adjust-mss", value]

    def get_ip_adjust_mss_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "adjust-mss"]

    def get_ip_arp_cache_timeout(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ip", "arp-cache-timeout", value]

    def get_ip_arp_cache_timeout_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "arp-cache-timeout"]

    def get_ip_disable_arp_filter_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "disable-arp-filter"]

    def get_ip_disable_forwarding_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "disable-forwarding"]

    def get_ip_enable_arp_accept_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "enable-arp-ignore"]

    def get_ip_enable_directed_broadcast_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "enable-directed-broadcast"]

    def get_ip_enable_proxy_arp_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "enable-proxy-arp"]

    def get_ip_proxy_arp_pvlan_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "proxy-arp-pvlan"]

    def get_ip_source_validation(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ip", "source-validation", value]

    def get_ip_source_validation_path(self, name: str) -> List[str]:
        return self._base(name) + ["ip", "source-validation"]

    # ========================================================================
    # IPv6 Settings Paths
    # ========================================================================

    def get_ipv6_accept_dad(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "accept-dad", value]

    def get_ipv6_accept_dad_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "accept-dad"]

    def get_ipv6_address_autoconf_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "eui64", value]

    def get_ipv6_address_eui64_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "address", "no-default-link-local"]

    def get_ipv6_adjust_mss(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "adjust-mss", value]

    def get_ipv6_adjust_mss_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "adjust-mss"]

    def get_ipv6_base_reachable_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "base-reachable-time", value]

    def get_ipv6_base_reachable_time_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "base-reachable-time"]

    def get_ipv6_disable_forwarding_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "dup-addr-detect-transmits", value]

    def get_ipv6_dup_addr_detect_transmits_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "dup-addr-detect-transmits"]

    def get_ipv6_source_validation(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ipv6", "source-validation", value]

    def get_ipv6_source_validation_path(self, name: str) -> List[str]:
        return self._base(name) + ["ipv6", "source-validation"]

    # ========================================================================
    # Mirror Paths
    # ========================================================================

    def get_mirror_egress(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mirror", "egress", value]

    def get_mirror_egress_path(self, name: str) -> List[str]:
        return self._base(name) + ["mirror", "egress"]

    def get_mirror_ingress(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mirror", "ingress", value]

    def get_mirror_ingress_path(self, name: str) -> List[str]:
        return self._base(name) + ["mirror", "ingress"]

    # ========================================================================
    # Parameters Paths
    # ========================================================================

    def get_parameters_external_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "external"]

    def get_parameters_ip_df(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "df", value]

    def get_parameters_ip_df_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "df"]

    def get_parameters_ip_tos(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "tos", value]

    def get_parameters_ip_tos_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "tos"]

    def get_parameters_ip_ttl(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "ttl", value]

    def get_parameters_ip_ttl_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "ttl"]

    def get_parameters_ipv6_flowlabel(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "flowlabel", value]

    def get_parameters_ipv6_flowlabel_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "flowlabel"]

    def get_parameters_neighbor_suppress_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "neighbor-suppress"]

    def get_parameters_nolearning_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "nolearning"]

    def get_parameters_vni_filter_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "vni-filter"]

    # ========================================================================
    # VLAN-to-VNI Paths
    # ========================================================================

    def get_vlan_to_vni_path(self, name: str, vlan_id: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni", vlan_id]

    def get_vlan_to_vni_all_path(self, name: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni"]

    def get_vlan_to_vni_vni(self, name: str, vlan_id: str, value: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni", vlan_id, "vni", value]

    def get_vlan_to_vni_vni_path(self, name: str, vlan_id: str) -> List[str]:
        return self._base(name) + ["vlan-to-vni", vlan_id, "vni"]
