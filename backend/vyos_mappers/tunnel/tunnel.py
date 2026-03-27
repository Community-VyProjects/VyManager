"""
Tunnel Interface Command Mapper

Handles command path generation for interfaces tunnel configuration.
Common paths shared between VyOS 1.4 and 1.5.

Config tree:
  interfaces tunnel/<NAME>/
    6rd-prefix           (ipv6 prefix)
    6rd-relay-prefix     (ipv4 prefix)
    address              (multi, ipv4net/ipv6net)
    description          (txt, max 255)
    disable              (flag)
    disable-link-detect  (flag)
    enable-multicast     (flag)
    encapsulation        (erspan|gre|gretap|ip6erspan|ip6gre|ip6gretap|ip6ip6|ipip|ipip6|sit)
    ip/                  (various IPv4 settings)
    ipv6/                (various IPv6 settings)
    mirror/              (ingress/egress)
    mtu                  (68-16000, default 1476)
    parameters/
      erspan/            (direction, hw-id, index, version)
      ip/                (ignore-df, key, no-pmtu-discovery, tos, ttl)
      ipv6/              (encaplimit, flowlabel, hoplimit, tclass)
    redirect             (interface)
    remote               (ip address)
    source-address       (ip address)
    source-interface     (interface)
    vrf                  (txt)
"""

from typing import List
from ..base import BaseFeatureMapper


class TunnelMapper(BaseFeatureMapper):
    """Base mapper for tunnel interface commands. Common paths for VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self, name: str) -> List[str]:
        return ["interfaces", "tunnel", name]

    # ========================================================================
    # Interface-level Paths
    # ========================================================================

    def get_interface_path(self, name: str) -> List[str]:
        return self._base(name)

    def get_6rd_prefix(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["6rd-prefix", value]

    def get_6rd_prefix_path(self, name: str) -> List[str]:
        return self._base(name) + ["6rd-prefix"]

    def get_6rd_relay_prefix(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["6rd-relay-prefix", value]

    def get_6rd_relay_prefix_path(self, name: str) -> List[str]:
        return self._base(name) + ["6rd-relay-prefix"]

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

    def get_disable_link_detect_path(self, name: str) -> List[str]:
        return self._base(name) + ["disable-link-detect"]

    def get_enable_multicast_path(self, name: str) -> List[str]:
        return self._base(name) + ["enable-multicast"]

    def get_encapsulation(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["encapsulation", value]

    def get_encapsulation_path(self, name: str) -> List[str]:
        return self._base(name) + ["encapsulation"]

    def get_mtu(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mtu", value]

    def get_mtu_path(self, name: str) -> List[str]:
        return self._base(name) + ["mtu"]

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
    # Parameters - ERSPAN Paths
    # ========================================================================

    def get_parameters_erspan_direction(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "direction", value]

    def get_parameters_erspan_direction_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "direction"]

    def get_parameters_erspan_hw_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "hw-id", value]

    def get_parameters_erspan_hw_id_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "hw-id"]

    def get_parameters_erspan_index(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "index", value]

    def get_parameters_erspan_index_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "index"]

    def get_parameters_erspan_version(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "version", value]

    def get_parameters_erspan_version_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "erspan", "version"]

    # ========================================================================
    # Parameters - IP Paths
    # ========================================================================

    def get_parameters_ip_ignore_df_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "ignore-df"]

    def get_parameters_ip_key(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "key", value]

    def get_parameters_ip_key_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "key"]

    def get_parameters_ip_no_pmtu_discovery_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "no-pmtu-discovery"]

    def get_parameters_ip_tos(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "tos", value]

    def get_parameters_ip_tos_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "tos"]

    def get_parameters_ip_ttl(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "ttl", value]

    def get_parameters_ip_ttl_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ip", "ttl"]

    # ========================================================================
    # Parameters - IPv6 Paths
    # ========================================================================

    def get_parameters_ipv6_encaplimit(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "encaplimit", value]

    def get_parameters_ipv6_encaplimit_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "encaplimit"]

    def get_parameters_ipv6_flowlabel(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "flowlabel", value]

    def get_parameters_ipv6_flowlabel_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "flowlabel"]

    def get_parameters_ipv6_hoplimit(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "hoplimit", value]

    def get_parameters_ipv6_hoplimit_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "hoplimit"]

    def get_parameters_ipv6_tclass(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "tclass", value]

    def get_parameters_ipv6_tclass_path(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "ipv6", "tclass"]
