"""
MACsec Interface Command Mapper

Handles MACsec interface commands for VyOS.
MACsec (Media Access Control Security) provides layer-2 encryption
over Ethernet links using IEEE 802.1AE.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class MacsecInterfaceMapper(BaseFeatureMapper):
    """MACsec interface mapper with all MACsec interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "macsec"

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    # ========================================================================
    # Command Path Methods (for WRITE operations)
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

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_source_interface(self, interface: str, source: str) -> List[str]:
        return self._base(interface) + ["source-interface", source]

    def get_source_interface_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["source-interface"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # --- Security ---
    def get_security_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["security", "cipher", cipher]

    def get_security_cipher_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "cipher"]

    def get_security_encrypt(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "encrypt"]

    def get_security_replay_window(self, interface: str, window: str) -> List[str]:
        return self._base(interface) + ["security", "replay-window", window]

    def get_security_replay_window_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "replay-window"]

    # --- Security MKA (MACsec Key Agreement) ---
    def get_security_mka_cak(self, interface: str, cak: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "cak", cak]

    def get_security_mka_cak_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "cak"]

    def get_security_mka_ckn(self, interface: str, ckn: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "ckn", ckn]

    def get_security_mka_ckn_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "ckn"]

    def get_security_mka_priority(self, interface: str, priority: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "priority", priority]

    def get_security_mka_priority_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "mka", "priority"]

    # --- Security Static ---
    def get_security_static_key(self, interface: str, key: str) -> List[str]:
        return self._base(interface) + ["security", "static", "key", key]

    def get_security_static_key_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "static", "key"]

    def get_security_static_peer(self, interface: str, peer: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer]

    def get_security_static_peer_disable(self, interface: str, peer: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer, "disable"]

    def get_security_static_peer_key(self, interface: str, peer: str, key: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer, "key", key]

    def get_security_static_peer_key_path(self, interface: str, peer: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer, "key"]

    def get_security_static_peer_mac(self, interface: str, peer: str, mac: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer, "mac", mac]

    def get_security_static_peer_mac_path(self, interface: str, peer: str) -> List[str]:
        return self._base(interface) + ["security", "static", "peer", peer, "mac"]

    # --- IP settings ---
    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", timeout]

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

    def get_ip_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip"]

    # --- IPv6 settings ---
    def get_ipv6_accept_dad(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad", count]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_base_reachable_time(self, interface: str, time: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time", time]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits", count]

    def get_ipv6_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation", mode]

    def get_ipv6_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation"]

    def get_ipv6_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6"]

    # --- DHCP options ---
    def get_dhcp_options_client_id(self, interface: str, client_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "client-id", client_id]

    def get_dhcp_options_host_name(self, interface: str, hostname: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "host-name", hostname]

    def get_dhcp_options_vendor_class_id(self, interface: str, vendor_id: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "vendor-class-id", vendor_id]

    def get_dhcp_options_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "no-default-route"]

    def get_dhcp_options_default_route_distance(self, interface: str, distance: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "default-route-distance", distance]

    def get_dhcp_options_reject(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "reject", server]

    def get_dhcp_options_user_class(self, interface: str, user_class: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "user-class", user_class]

    def get_dhcp_options_mtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options", "mtu"]

    def get_dhcp_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options"]

    # --- DHCPv6 options ---
    def get_dhcpv6_options_duid(self, interface: str, duid: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "duid", duid]

    def get_dhcpv6_options_rapid_commit(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_options_no_release(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-release"]

    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    def get_dhcpv6_options_parameters_only(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "parameters-only"]

    def get_dhcpv6_options_temporary(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "temporary"]

    def get_dhcpv6_options_pd(self, interface: str, pd_id: str) -> List[str]:
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

    # --- Mirror ---
    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # --- Redirect ---
    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single MACsec interface configuration from VyOS."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_address = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}
        security_config = config.get("security", {}) or {}
        mka_config = security_config.get("mka", {}) or {}
        static_config = security_config.get("static", {}) or {}
        dhcp_options = config.get("dhcp-options", {}) or {}
        dhcpv6_options = config.get("dhcpv6-options", {}) or {}

        # Parse static peers
        static_peers = []
        raw_peers = static_config.get("peer", {}) or {}
        for peer_name, peer_cfg in raw_peers.items():
            if not isinstance(peer_cfg, dict):
                continue
            static_peers.append({
                "name": peer_name,
                "key": peer_cfg.get("key"),
                "mac": peer_cfg.get("mac"),
                "disable": "disable" in peer_cfg,
            })

        # Parse DHCPv6 PD
        dhcpv6_pd = {}
        raw_pd = dhcpv6_options.get("pd", {}) or {}
        for pd_id, pd_cfg in raw_pd.items():
            if not isinstance(pd_cfg, dict):
                continue
            pd_entry = {"length": pd_cfg.get("length"), "interfaces": {}}
            raw_pd_ifaces = pd_cfg.get("interface", {}) or {}
            for pd_iface, pd_iface_cfg in raw_pd_ifaces.items():
                if not isinstance(pd_iface_cfg, dict):
                    continue
                pd_entry["interfaces"][pd_iface] = {
                    "address": pd_iface_cfg.get("address"),
                    "sla_id": pd_iface_cfg.get("sla-id"),
                }
            dhcpv6_pd[pd_id] = pd_entry

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "mtu": config.get("mtu"),
            "source_interface": config.get("source-interface"),
            "vrf": config.get("vrf"),
            "security": {
                "cipher": security_config.get("cipher"),
                "encrypt": "encrypt" in security_config,
                "replay_window": security_config.get("replay-window"),
                "mka": {
                    "cak": mka_config.get("cak"),
                    "ckn": mka_config.get("ckn"),
                    "priority": mka_config.get("priority"),
                } if mka_config else None,
                "static": {
                    "key": static_config.get("key"),
                    "peers": static_peers,
                } if static_config else None,
            },
            "ip": {
                "adjust_mss": ip_config.get("adjust-mss"),
                "arp_cache_timeout": ip_config.get("arp-cache-timeout"),
                "disable_arp_filter": "disable-arp-filter" in ip_config,
                "disable_forwarding": "disable-forwarding" in ip_config,
                "enable_arp_accept": "enable-arp-accept" in ip_config,
                "enable_arp_announce": "enable-arp-announce" in ip_config,
                "enable_arp_ignore": "enable-arp-ignore" in ip_config,
                "enable_directed_broadcast": "enable-directed-broadcast" in ip_config,
                "enable_proxy_arp": "enable-proxy-arp" in ip_config,
                "proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config,
                "source_validation": ip_config.get("source-validation"),
            },
            "ipv6": {
                "accept_dad": ipv6_config.get("accept-dad"),
                "address_autoconf": "autoconf" in ipv6_address,
                "address_eui64": ipv6_address.get("eui64"),
                "address_no_default_link_local": "no-default-link-local" in ipv6_address,
                "address_interface_identifier": ipv6_address.get("interface-identifier"),
                "adjust_mss": ipv6_config.get("adjust-mss"),
                "base_reachable_time": ipv6_config.get("base-reachable-time"),
                "disable_forwarding": "disable-forwarding" in ipv6_config,
                "dup_addr_detect_transmits": ipv6_config.get("dup-addr-detect-transmits"),
                "source_validation": ipv6_config.get("source-validation"),
            },
            "dhcp_options": {
                "client_id": dhcp_options.get("client-id"),
                "default_route_distance": dhcp_options.get("default-route-distance"),
                "host_name": dhcp_options.get("host-name"),
                "mtu": "mtu" in dhcp_options,
                "no_default_route": "no-default-route" in dhcp_options,
                "reject": dhcp_options.get("reject"),
                "user_class": dhcp_options.get("user-class"),
                "vendor_class_id": dhcp_options.get("vendor-class-id"),
            } if dhcp_options else None,
            "dhcpv6_options": {
                "duid": dhcpv6_options.get("duid"),
                "no_release": "no-release" in dhcpv6_options,
                "no_request_dns": "no-request-dns" in dhcpv6_options,
                "no_request_domain_name": "no-request-domain-name" in dhcpv6_options,
                "parameters_only": "parameters-only" in dhcpv6_options,
                "rapid_commit": "rapid-commit" in dhcpv6_options,
                "temporary": "temporary" in dhcpv6_options,
                "pd": dhcpv6_pd if dhcpv6_pd else None,
            } if dhcpv6_options else None,
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
            "redirect": config.get("redirect"),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all MACsec interfaces."""
        interfaces = []

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
