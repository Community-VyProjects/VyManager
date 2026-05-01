"""
WWAN (Wireless WAN) Interface Command Mapper

Handles WWAN interface commands for VyOS `interfaces wwan wwanN`.
WWAN interfaces connect via cellular modems using APN configuration.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class WwanInterfaceMapper(BaseFeatureMapper):
    """WWAN interface mapper with all WWAN interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "wwan"

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", "wwan", interface]

    # ========================================================================
    # Basic interface settings
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["address"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_disable_link_detect(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable-link-detect"]

    def get_connect_on_demand(self, interface: str) -> List[str]:
        return self._base(interface) + ["connect-on-demand"]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # ========================================================================
    # APN / Authentication
    # ========================================================================

    def get_apn(self, interface: str, apn: str) -> List[str]:
        return self._base(interface) + ["apn", apn]

    def get_apn_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["apn"]

    def get_authentication_username(self, interface: str, username: str) -> List[str]:
        return self._base(interface) + ["authentication", "username", username]

    def get_authentication_username_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication", "username"]

    def get_authentication_password(self, interface: str, password: str) -> List[str]:
        return self._base(interface) + ["authentication", "password", password]

    def get_authentication_password_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication", "password"]

    def get_authentication_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication"]

    # ========================================================================
    # DHCP options
    # ========================================================================

    def get_dhcp_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options"]

    def get_dhcp_client_id(self, interface: str, client_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id", client_id]

    def get_dhcp_client_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id"]

    def get_dhcp_default_route_distance(self, interface: str, distance: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance", distance]

    def get_dhcp_default_route_distance_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance"]

    def get_dhcp_host_name(self, interface: str, hostname: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name", hostname]

    def get_dhcp_host_name_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name"]

    def get_dhcp_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "mtu", mtu]

    def get_dhcp_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "mtu"]

    def get_dhcp_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "no-default-route"]

    def get_dhcp_reject(self, interface: str, reject: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject", reject]

    def get_dhcp_reject_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject"]

    def get_dhcp_user_class(self, interface: str, user_class: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class", user_class]

    def get_dhcp_user_class_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class"]

    def get_dhcp_vendor_class_id(self, interface: str, vendor_class_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id", vendor_class_id]

    def get_dhcp_vendor_class_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id"]

    # ========================================================================
    # DHCPv6 options
    # ========================================================================

    def get_dhcpv6_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options"]

    def get_dhcpv6_duid(self, interface: str, duid: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid", duid]

    def get_dhcpv6_duid_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid"]

    def get_dhcpv6_no_release(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-release"]

    def get_dhcpv6_parameters_only(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "parameters-only"]

    def get_dhcpv6_rapid_commit(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_temporary(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "temporary"]

    def get_dhcpv6_pd_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd"]

    def get_dhcpv6_pd_instance(self, interface: str, instance: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance]

    def get_dhcpv6_pd_length(self, interface: str, instance: str, length: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "length", length]

    def get_dhcpv6_pd_length_path(self, interface: str, instance: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "length"]

    def get_dhcpv6_pd_interface(self, interface: str, instance: str, delegated_iface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface]

    def get_dhcpv6_pd_interface_path(self, interface: str, instance: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface"]

    def get_dhcpv6_pd_interface_address(self, interface: str, instance: str, delegated_iface: str, address: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface, "address", address]

    def get_dhcpv6_pd_interface_sla_id(self, interface: str, instance: str, delegated_iface: str, sla_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface, "sla-id", sla_id]

    # ========================================================================
    # Mirror / Redirect
    # ========================================================================

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # ========================================================================
    # IP settings
    # ========================================================================

    def get_ip_adjust_mss(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", value]

    def get_ip_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", timeout]

    def get_ip_arp_cache_timeout_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout"]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-arp-filter"]

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

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

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def get_ipv6_accept_dad(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad", value]

    def get_ipv6_accept_dad_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad"]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_eui64_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    def get_ipv6_adjust_mss(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", value]

    def get_ipv6_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss"]

    def get_ipv6_base_reachable_time(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time", value]

    def get_ipv6_base_reachable_time_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits", value]

    def get_ipv6_dup_addr_detect_transmits_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits"]

    def get_ipv6_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation", mode]

    def get_ipv6_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation"]

    # ========================================================================
    # Config Parsing (READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single WWAN interface configuration from VyOS."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        auth_config = config.get("authentication", {}) or {}
        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_addr_config = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}
        dhcp_config = config.get("dhcp-options", {}) or {}
        dhcpv6_config = config.get("dhcpv6-options", {}) or {}

        eui64 = ipv6_addr_config.get("eui64")
        if isinstance(eui64, str):
            eui64 = [eui64]
        elif not isinstance(eui64, list):
            eui64 = []

        dhcp_reject = dhcp_config.get("reject")
        if isinstance(dhcp_reject, str):
            dhcp_reject = [dhcp_reject]
        elif not isinstance(dhcp_reject, list):
            dhcp_reject = []

        dhcpv6_pd_raw = dhcpv6_config.get("pd", {}) or {}
        dhcpv6_pd = []
        for pd_id, pd_conf in dhcpv6_pd_raw.items():
            if not isinstance(pd_conf, dict):
                continue
            pd_entry: Dict[str, Any] = {"id": pd_id, "length": pd_conf.get("length"), "interfaces": []}
            for iface_name, iface_conf in (pd_conf.get("interface", {}) or {}).items():
                if not isinstance(iface_conf, dict):
                    continue
                pd_iface = iface_conf.get("address")
                if isinstance(pd_iface, str):
                    pd_iface = [pd_iface]
                elif not isinstance(pd_iface, list):
                    pd_iface = []
                pd_entry["interfaces"].append({
                    "interface": iface_name,
                    "address": pd_iface,
                    "sla_id": iface_conf.get("sla-id"),
                })
            dhcpv6_pd.append(pd_entry)

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "mtu": config.get("mtu"),
            "disable": "disable" in config,
            "disable_link_detect": "disable-link-detect" in config,
            "connect_on_demand": "connect-on-demand" in config,
            "vrf": config.get("vrf"),
            "redirect": config.get("redirect"),
            # APN / Authentication
            "apn": config.get("apn"),
            "auth_username": auth_config.get("username"),
            "auth_password": auth_config.get("password"),
            # Mirror
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
            # DHCP options
            "dhcp_client_id": dhcp_config.get("client-id"),
            "dhcp_default_route_distance": dhcp_config.get("default-route-distance"),
            "dhcp_host_name": dhcp_config.get("host-name"),
            "dhcp_mtu": dhcp_config.get("mtu"),
            "dhcp_no_default_route": "no-default-route" in dhcp_config,
            "dhcp_reject": dhcp_reject,
            "dhcp_user_class": dhcp_config.get("user-class"),
            "dhcp_vendor_class_id": dhcp_config.get("vendor-class-id"),
            # DHCPv6 options
            "dhcpv6_duid": dhcpv6_config.get("duid"),
            "dhcpv6_no_release": "no-release" in dhcpv6_config,
            "dhcpv6_parameters_only": "parameters-only" in dhcpv6_config,
            "dhcpv6_rapid_commit": "rapid-commit" in dhcpv6_config,
            "dhcpv6_temporary": "temporary" in dhcpv6_config,
            "dhcpv6_pd": dhcpv6_pd,
            # IP settings
            "ip_adjust_mss": ip_config.get("adjust-mss"),
            "ip_arp_cache_timeout": ip_config.get("arp-cache-timeout"),
            "ip_disable_arp_filter": "disable-arp-filter" in ip_config,
            "ip_disable_forwarding": "disable-forwarding" in ip_config,
            "ip_enable_arp_accept": "enable-arp-accept" in ip_config,
            "ip_enable_arp_announce": "enable-arp-announce" in ip_config,
            "ip_enable_arp_ignore": "enable-arp-ignore" in ip_config,
            "ip_enable_directed_broadcast": "enable-directed-broadcast" in ip_config,
            "ip_enable_proxy_arp": "enable-proxy-arp" in ip_config,
            "ip_proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config,
            "ip_source_validation": ip_config.get("source-validation"),
            # IPv6 settings
            "ipv6_accept_dad": ipv6_config.get("accept-dad"),
            "ipv6_address_autoconf": "autoconf" in ipv6_addr_config,
            "ipv6_address_eui64": eui64,
            "ipv6_address_no_default_link_local": "no-default-link-local" in ipv6_addr_config,
            "ipv6_adjust_mss": ipv6_config.get("adjust-mss"),
            "ipv6_base_reachable_time": ipv6_config.get("base-reachable-time"),
            "ipv6_disable_forwarding": "disable-forwarding" in ipv6_config,
            "ipv6_dup_addr_detect_transmits": ipv6_config.get("dup-addr-detect-transmits"),
            "ipv6_source_validation": ipv6_config.get("source-validation"),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all WWAN interfaces."""
        interfaces = []
        by_vrf: Dict[str, int] = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
        }
