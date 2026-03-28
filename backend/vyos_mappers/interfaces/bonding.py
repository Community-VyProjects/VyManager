"""
Bonding Interface Command Mapper

Handles bonding (link aggregation) interface commands.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class BondingInterfaceMapper(BaseFeatureMapper):
    """Base bonding interface mapper with common operations for all versions."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "bonding"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    # --- Basic properties ---
    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_disable_link_detect(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable-link-detect"]

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

    def get_redirect(self, interface: str, target: str) -> List[str]:
        return self._base(interface) + ["redirect", target]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # --- Bonding-specific properties ---
    def get_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["mode", mode]

    def get_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mode"]

    def get_hash_policy(self, interface: str, policy: str) -> List[str]:
        return self._base(interface) + ["hash-policy", policy]

    def get_hash_policy_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["hash-policy"]

    def get_lacp_rate(self, interface: str, rate: str) -> List[str]:
        return self._base(interface) + ["lacp-rate", rate]

    def get_lacp_rate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["lacp-rate"]

    def get_min_links(self, interface: str, min_links: str) -> List[str]:
        return self._base(interface) + ["min-links", min_links]

    def get_min_links_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["min-links"]

    def get_mii_mon_interval(self, interface: str, interval: str) -> List[str]:
        return self._base(interface) + ["mii-mon-interval", interval]

    def get_mii_mon_interval_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mii-mon-interval"]

    def get_primary(self, interface: str, primary: str) -> List[str]:
        return self._base(interface) + ["primary", primary]

    def get_primary_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["primary"]

    def get_system_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["system-mac", mac]

    def get_system_mac_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["system-mac"]

    # --- Member interfaces ---
    def get_member_interface(self, interface: str, member: str) -> List[str]:
        return self._base(interface) + ["member", "interface", member]

    def get_member_interface_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["member", "interface"]

    # --- ARP monitor ---
    def get_arp_monitor_interval(self, interface: str, interval: str) -> List[str]:
        return self._base(interface) + ["arp-monitor", "interval", interval]

    def get_arp_monitor_interval_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["arp-monitor", "interval"]

    def get_arp_monitor_target(self, interface: str, target: str) -> List[str]:
        return self._base(interface) + ["arp-monitor", "target", target]

    def get_arp_monitor_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["arp-monitor"]

    # --- EVPN ---
    def get_evpn_es_df_pref(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-df-pref", value]

    def get_evpn_es_df_pref_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-df-pref"]

    def get_evpn_es_id(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-id", value]

    def get_evpn_es_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-id"]

    def get_evpn_es_sys_mac(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-sys-mac", value]

    def get_evpn_es_sys_mac_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["evpn", "es-sys-mac"]

    def get_evpn_uplink(self, interface: str) -> List[str]:
        return self._base(interface) + ["evpn", "uplink"]

    def get_evpn_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["evpn"]

    # --- Mirror ---
    def get_mirror_ingress(self, interface: str, target: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", target]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, target: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", target]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # --- IP settings ---
    def get_ip_adjust_mss(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", value]

    def get_ip_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss"]

    def get_ip_arp_cache_timeout(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", value]

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

    def get_ip_source_validation(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", value]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    # --- IPv6 settings ---
    def get_ipv6_accept_dad(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad", value]

    def get_ipv6_accept_dad_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad"]

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

    def get_ipv6_source_validation(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation", value]

    def get_ipv6_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation"]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", value]

    def get_ipv6_address_eui64_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    # --- DHCP options ---
    def get_dhcp_options_client_id(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id", value]

    def get_dhcp_options_client_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id"]

    def get_dhcp_options_default_route_distance(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance", value]

    def get_dhcp_options_default_route_distance_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance"]

    def get_dhcp_options_host_name(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name", value]

    def get_dhcp_options_host_name_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name"]

    def get_dhcp_options_mtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "mtu"]

    def get_dhcp_options_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "no-default-route"]

    def get_dhcp_options_reject(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject", value]

    def get_dhcp_options_reject_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject"]

    def get_dhcp_options_user_class(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class", value]

    def get_dhcp_options_user_class_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class"]

    def get_dhcp_options_vendor_class_id(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id", value]

    def get_dhcp_options_vendor_class_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id"]

    def get_dhcp_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options"]

    # --- DHCPv6 options ---
    def get_dhcpv6_options_duid(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid", value]

    def get_dhcpv6_options_duid_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid"]

    def get_dhcpv6_options_no_release(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-release"]

    def get_dhcpv6_options_parameters_only(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "parameters-only"]

    def get_dhcpv6_options_rapid_commit(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_options_temporary(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "temporary"]

    def get_dhcpv6_options_pd(self, interface: str, pd_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id]

    def get_dhcpv6_options_pd_length(self, interface: str, pd_id: str, length: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "length", length]

    def get_dhcpv6_options_pd_interface(self, interface: str, pd_id: str, iface: str, sla_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", pd_id, "interface", iface, "sla-id", sla_id]

    def get_dhcpv6_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options"]

    # --- VIF (VLAN sub-interfaces) ---
    def get_vif(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id]

    def get_vif_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "description", description]

    def get_vif_description_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "description"]

    def get_vif_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "address", address]

    def get_vif_disable(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "disable"]

    def get_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "mtu", mtu]

    def get_vif_mtu_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "mtu"]

    def get_vif_vrf(self, interface: str, vlan_id: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "vrf", vrf]

    def get_vif_vrf_path(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif", vlan_id, "vrf"]

    # --- VIF-S (QinQ service VLAN) ---
    def get_vif_s(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif-s", vlan_id]

    def get_vif_s_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        return self._base(interface) + ["vif-s", vlan_id, "description", description]

    def get_vif_s_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        return self._base(interface) + ["vif-s", vlan_id, "address", address]

    def get_vif_s_disable(self, interface: str, vlan_id: str) -> List[str]:
        return self._base(interface) + ["vif-s", vlan_id, "disable"]

    def get_vif_s_vif_c(self, interface: str, outer_id: str, inner_id: str) -> List[str]:
        return self._base(interface) + ["vif-s", outer_id, "vif-c", inner_id]

    def get_vif_s_vif_c_address(self, interface: str, outer_id: str, inner_id: str, address: str) -> List[str]:
        return self._base(interface) + ["vif-s", outer_id, "vif-c", inner_id, "address", address]

    def get_vif_s_vif_c_description(self, interface: str, outer_id: str, inner_id: str, description: str) -> List[str]:
        return self._base(interface) + ["vif-s", outer_id, "vif-c", inner_id, "description", description]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def _parse_members(self, config: Dict[str, Any]) -> List[str]:
        members = []
        member_config = config.get("member", {})
        if isinstance(member_config, dict):
            iface = member_config.get("interface")
            if isinstance(iface, list):
                members = iface
            elif isinstance(iface, str):
                members = [iface]
        return members

    def _parse_arp_monitor(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        arp_mon = config.get("arp-monitor")
        if not arp_mon or not isinstance(arp_mon, dict):
            return None
        targets = []
        if "target" in arp_mon:
            t = arp_mon["target"]
            if isinstance(t, list):
                targets = t
            elif isinstance(t, str):
                targets = [t]
        return {
            "interval": arp_mon.get("interval"),
            "targets": targets,
        }

    def _parse_evpn(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        evpn = config.get("evpn")
        if not evpn or not isinstance(evpn, dict):
            return None
        return {
            "es_df_pref": evpn.get("es-df-pref"),
            "es_id": evpn.get("es-id"),
            "es_sys_mac": evpn.get("es-sys-mac"),
            "uplink": "uplink" in evpn,
        }

    def _parse_ip_settings(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ip = config.get("ip", {})
        if not isinstance(ip, dict):
            return {}
        return {
            "adjust_mss": ip.get("adjust-mss"),
            "arp_cache_timeout": ip.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip,
            "disable_forwarding": "disable-forwarding" in ip,
            "enable_arp_accept": "enable-arp-accept" in ip,
            "enable_arp_announce": "enable-arp-announce" in ip,
            "enable_arp_ignore": "enable-arp-ignore" in ip,
            "enable_directed_broadcast": "enable-directed-broadcast" in ip,
            "enable_proxy_arp": "enable-proxy-arp" in ip,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in ip,
            "source_validation": ip.get("source-validation"),
        }

    def _parse_ipv6_settings(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ipv6 = config.get("ipv6", {})
        if not isinstance(ipv6, dict):
            return {}
        addr = ipv6.get("address", {})
        if not isinstance(addr, dict):
            addr = {}
        eui64 = addr.get("eui64")
        if isinstance(eui64, str):
            eui64 = [eui64]
        return {
            "accept_dad": ipv6.get("accept-dad"),
            "adjust_mss": ipv6.get("adjust-mss"),
            "base_reachable_time": ipv6.get("base-reachable-time"),
            "disable_forwarding": "disable-forwarding" in ipv6,
            "dup_addr_detect_transmits": ipv6.get("dup-addr-detect-transmits"),
            "source_validation": ipv6.get("source-validation"),
            "address_autoconf": "autoconf" in addr,
            "address_eui64": eui64 or [],
            "address_no_default_link_local": "no-default-link-local" in addr,
            "address_interface_identifier": addr.get("interface-identifier"),
        }

    def _parse_dhcp_options(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        dhcp = config.get("dhcp-options")
        if not dhcp or not isinstance(dhcp, dict):
            return None
        reject = dhcp.get("reject")
        if isinstance(reject, str):
            reject = [reject]
        return {
            "client_id": dhcp.get("client-id"),
            "default_route_distance": dhcp.get("default-route-distance"),
            "host_name": dhcp.get("host-name"),
            "mtu": "mtu" in dhcp,
            "no_default_route": "no-default-route" in dhcp,
            "reject": reject or [],
            "user_class": dhcp.get("user-class"),
            "vendor_class_id": dhcp.get("vendor-class-id"),
        }

    def _parse_dhcpv6_options(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        dhcpv6 = config.get("dhcpv6-options")
        if not dhcpv6 or not isinstance(dhcpv6, dict):
            return None
        result = {
            "duid": dhcpv6.get("duid"),
            "no_release": "no-release" in dhcpv6,
            "parameters_only": "parameters-only" in dhcpv6,
            "rapid_commit": "rapid-commit" in dhcpv6,
            "temporary": "temporary" in dhcpv6,
            "no_request_dns": "no-request-dns" in dhcpv6,
            "no_request_domain_name": "no-request-domain-name" in dhcpv6,
        }
        # Parse PD
        pd_config = dhcpv6.get("pd")
        if pd_config and isinstance(pd_config, dict):
            pds = []
            for pd_id, pd_data in pd_config.items():
                if not isinstance(pd_data, dict):
                    continue
                pd_entry = {"id": pd_id, "length": pd_data.get("length")}
                ifaces = []
                pd_iface = pd_data.get("interface", {})
                if isinstance(pd_iface, dict):
                    for iface_name, iface_data in pd_iface.items():
                        if isinstance(iface_data, dict):
                            ifaces.append({
                                "name": iface_name,
                                "address": iface_data.get("address"),
                                "sla_id": iface_data.get("sla-id"),
                            })
                pd_entry["interfaces"] = ifaces
                pds.append(pd_entry)
            result["pd"] = pds
        return result

    def _parse_mirror(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        mirror = config.get("mirror")
        if not mirror or not isinstance(mirror, dict):
            return None
        return {
            "ingress": mirror.get("ingress"),
            "egress": mirror.get("egress"),
        }

    def _parse_eapol(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        eapol = config.get("eapol")
        if not eapol or not isinstance(eapol, dict):
            return None
        return {
            "ca_certificate": eapol.get("ca-certificate"),
            "certificate": eapol.get("certificate"),
            "passphrase": eapol.get("passphrase"),
        }

    def _parse_vifs(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        vif_config = config.get("vif", {})
        if not isinstance(vif_config, dict):
            return []
        vifs = []
        for vlan_id, vlan_data in vif_config.items():
            if not isinstance(vlan_data, dict):
                continue
            vifs.append({
                "vlan_id": vlan_id,
                "addresses": self._parse_addresses(vlan_data),
                "description": vlan_data.get("description"),
                "disable": "disable" in vlan_data,
                "mtu": vlan_data.get("mtu"),
                "vrf": vlan_data.get("vrf"),
                "mac": vlan_data.get("mac"),
                "egress_qos": vlan_data.get("egress-qos"),
                "ingress_qos": vlan_data.get("ingress-qos"),
            })
        return vifs

    def _parse_vif_s(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        vif_s_config = config.get("vif-s", {})
        if not isinstance(vif_s_config, dict):
            return []
        vif_s_list = []
        for outer_id, outer_data in vif_s_config.items():
            if not isinstance(outer_data, dict):
                continue
            entry = {
                "vlan_id": outer_id,
                "addresses": self._parse_addresses(outer_data),
                "description": outer_data.get("description"),
                "disable": "disable" in outer_data,
                "protocol": outer_data.get("protocol"),
                "vif_c": [],
            }
            vif_c_config = outer_data.get("vif-c", {})
            if isinstance(vif_c_config, dict):
                for inner_id, inner_data in vif_c_config.items():
                    if not isinstance(inner_data, dict):
                        continue
                    entry["vif_c"].append({
                        "vlan_id": inner_id,
                        "addresses": self._parse_addresses(inner_data),
                        "description": inner_data.get("description"),
                        "disable": "disable" in inner_data,
                    })
            vif_s_list.append(entry)
        return vif_s_list

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        disabled = "disable" in config

        result = {
            "name": name,
            "type": self.interface_type,
            "addresses": self._parse_addresses(config),
            "description": config.get("description"),
            "disable": disabled if disabled else None,
            "mac": config.get("mac"),
            "mtu": config.get("mtu"),
            "vrf": config.get("vrf"),
            "mode": config.get("mode"),
            "hash_policy": config.get("hash-policy"),
            "lacp_rate": config.get("lacp-rate"),
            "min_links": config.get("min-links"),
            "mii_mon_interval": config.get("mii-mon-interval"),
            "primary": config.get("primary"),
            "system_mac": config.get("system-mac"),
            "redirect": config.get("redirect"),
            "disable_link_detect": "disable-link-detect" in config,
            "members": self._parse_members(config),
            "arp_monitor": self._parse_arp_monitor(config),
            "evpn": self._parse_evpn(config),
            "ip": self._parse_ip_settings(config),
            "ipv6": self._parse_ipv6_settings(config),
            "dhcp_options": self._parse_dhcp_options(config),
            "dhcpv6_options": self._parse_dhcpv6_options(config),
            "mirror": self._parse_mirror(config),
            "eapol": self._parse_eapol(config),
            "vifs": self._parse_vifs(config),
            "vif_s": self._parse_vif_s(config),
        }
        return result

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        interfaces = []
        by_vrf = {}
        by_mode = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            mode = interface.get("mode") or "802.3ad"
            by_mode[mode] = by_mode.get(mode, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
            "by_mode": by_mode,
        }
