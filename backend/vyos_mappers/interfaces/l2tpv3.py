"""
L2TPv3 Interface Command Mapper

Handles L2TPv3 (Layer 2 Tunnel Protocol Version 3) interface commands.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class L2TPv3InterfaceMapper(BaseFeatureMapper):
    """L2TPv3 interface mapper with all L2TPv3 interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "l2tpv3"

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

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # --- L2TPv3-specific tunnel settings ---
    def get_remote(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["remote", address]

    def get_remote_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["remote"]

    def get_source_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["source-address", address]

    def get_source_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["source-address"]

    def get_tunnel_id(self, interface: str, tid: str) -> List[str]:
        return self._base(interface) + ["tunnel-id", tid]

    def get_tunnel_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tunnel-id"]

    def get_peer_tunnel_id(self, interface: str, tid: str) -> List[str]:
        return self._base(interface) + ["peer-tunnel-id", tid]

    def get_peer_tunnel_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["peer-tunnel-id"]

    def get_session_id(self, interface: str, sid: str) -> List[str]:
        return self._base(interface) + ["session-id", sid]

    def get_session_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["session-id"]

    def get_peer_session_id(self, interface: str, sid: str) -> List[str]:
        return self._base(interface) + ["peer-session-id", sid]

    def get_peer_session_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["peer-session-id"]

    def get_encapsulation(self, interface: str, encap: str) -> List[str]:
        return self._base(interface) + ["encapsulation", encap]

    def get_encapsulation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["encapsulation"]

    def get_destination_port(self, interface: str, port: str) -> List[str]:
        return self._base(interface) + ["destination-port", port]

    def get_destination_port_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["destination-port"]

    def get_source_port(self, interface: str, port: str) -> List[str]:
        return self._base(interface) + ["source-port", port]

    def get_source_port_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["source-port"]

    # --- IP settings ---
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

    # --- IPv6 settings ---
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

    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", identifier]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    def get_ipv6_adjust_mss(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", value]

    def get_ipv6_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss"]

    def get_ipv6_base_reachable_time(self, interface: str, time: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time", time]

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

    # --- Mirror ---
    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single L2TPv3 interface configuration from VyOS."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_addr_config = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}

        # IPv6 EUI-64 prefixes
        eui64 = ipv6_addr_config.get("eui64")
        if isinstance(eui64, str):
            eui64 = [eui64]
        elif not isinstance(eui64, list):
            eui64 = []

        result = {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": "disable" in config or None,
            # L2TPv3-specific tunnel settings
            "remote": config.get("remote"),
            "source_address": config.get("source-address"),
            "tunnel_id": config.get("tunnel-id"),
            "peer_tunnel_id": config.get("peer-tunnel-id"),
            "session_id": config.get("session-id"),
            "peer_session_id": config.get("peer-session-id"),
            "encapsulation": config.get("encapsulation"),
            "destination_port": config.get("destination-port"),
            "source_port": config.get("source-port"),
            # IP settings
            "ip_adjust_mss": ip_config.get("adjust-mss"),
            "ip_arp_cache_timeout": ip_config.get("arp-cache-timeout"),
            "ip_disable_arp_filter": "disable-arp-filter" in ip_config or None,
            "ip_disable_forwarding": "disable-forwarding" in ip_config or None,
            "ip_enable_arp_accept": "enable-arp-accept" in ip_config or None,
            "ip_enable_arp_announce": "enable-arp-announce" in ip_config or None,
            "ip_enable_arp_ignore": "enable-arp-ignore" in ip_config or None,
            "ip_enable_directed_broadcast": "enable-directed-broadcast" in ip_config or None,
            "ip_enable_proxy_arp": "enable-proxy-arp" in ip_config or None,
            "ip_proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config or None,
            "ip_source_validation": ip_config.get("source-validation"),
            # IPv6 settings
            "ipv6_accept_dad": ipv6_config.get("accept-dad"),
            "ipv6_address_autoconf": "autoconf" in ipv6_addr_config or None,
            "ipv6_address_eui64": eui64,
            "ipv6_address_interface_identifier": ipv6_addr_config.get("interface-identifier"),
            "ipv6_address_no_default_link_local": "no-default-link-local" in ipv6_addr_config or None,
            "ipv6_adjust_mss": ipv6_config.get("adjust-mss"),
            "ipv6_base_reachable_time": ipv6_config.get("base-reachable-time"),
            "ipv6_disable_forwarding": "disable-forwarding" in ipv6_config or None,
            "ipv6_dup_addr_detect_transmits": ipv6_config.get("dup-addr-detect-transmits"),
            "ipv6_source_validation": ipv6_config.get("source-validation"),
            # Mirror
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
        }

        # Normalize boolean flags: False -> None
        for key in [
            "disable", "ip_disable_arp_filter", "ip_disable_forwarding",
            "ip_enable_arp_accept", "ip_enable_arp_announce", "ip_enable_arp_ignore",
            "ip_enable_directed_broadcast", "ip_enable_proxy_arp", "ip_proxy_arp_pvlan",
            "ipv6_address_autoconf", "ipv6_address_no_default_link_local",
            "ipv6_disable_forwarding",
        ]:
            if result[key] is False:
                result[key] = None

        return result

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all L2TPv3 interfaces."""
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
