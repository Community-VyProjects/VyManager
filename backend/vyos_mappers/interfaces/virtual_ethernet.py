"""
Virtual Ethernet Interface Command Mapper

Handles virtual-ethernet (veth pair) interface commands for VyOS.
A virtual-ethernet interface is one end of a kernel veth pair, commonly
used for connecting network namespaces or containers.
"""

from typing import List
from ..base import BaseFeatureMapper


class VirtualEthernetInterfaceMapper(BaseFeatureMapper):
    """Base virtual-ethernet interface mapper — common paths for all versions."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "virtual-ethernet"

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

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # ========================================================================
    # Virtual-ethernet specific
    # ========================================================================

    def get_peer_name(self, interface: str, peer: str) -> List[str]:
        return self._base(interface) + ["peer-name", peer]

    def get_peer_name_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["peer-name"]

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

    def get_dhcp_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcp-options"]

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

    # ========================================================================
    # DHCPv6 options
    # ========================================================================

    def get_dhcpv6_options_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options"]

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

    # ========================================================================
    # VIF operations
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

    # ========================================================================
    # VIF-S operations
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

    def get_vif_s_protocol(self, interface: str, s_vlan_id: str, protocol: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["protocol", protocol]

    def get_vif_s_protocol_path(self, interface: str, s_vlan_id: str) -> List[str]:
        return self._vif_s_base(interface, s_vlan_id) + ["protocol"]

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

    # ========================================================================
    # VIF-C operations
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

    # ========================================================================
    # Config parsing helpers
    # ========================================================================

    def parse_interfaces_of_type(self, raw_config: dict) -> dict:
        interfaces = []
        for name, data in raw_config.items():
            if not isinstance(data, dict):
                continue
            interfaces.append(self._parse_interface(name, data))
        return {"interfaces": interfaces, "total": len(interfaces)}

    def _parse_dhcp_options(self, data: dict) -> dict:
        if not data:
            return None
        reject = data.get("reject", {})
        return {
            "client_id": data.get("client-id"),
            "host_name": data.get("host-name"),
            "vendor_class_id": data.get("vendor-class-id"),
            "user_class": data.get("user-class"),
            "no_default_route": "no-default-route" in data,
            "default_route_distance": data.get("default-route-distance"),
            "reject": list(reject.keys()) if isinstance(reject, dict) else [],
            "mtu": "mtu" in data,
        }

    def _parse_dhcpv6_options(self, data: dict) -> dict:
        if not data:
            return None
        pd_raw = data.get("pd", {})
        pd_list = []
        for pd_id, pd_data in pd_raw.items():
            if not isinstance(pd_data, dict):
                continue
            iface_raw = pd_data.get("interface", {})
            ifaces = []
            for iface_name, iface_data in iface_raw.items():
                if not isinstance(iface_data, dict):
                    continue
                ifaces.append({
                    "name": iface_name,
                    "address": iface_data.get("address"),
                    "sla_id": iface_data.get("sla-id"),
                })
            pd_list.append({
                "instance": pd_id,
                "length": pd_data.get("length"),
                "interfaces": ifaces,
            })
        return {
            "duid": data.get("duid"),
            "no_release": "no-release" in data,
            "no_request_dns": "no-request-dns" in data,
            "no_request_domain_name": "no-request-domain-name" in data,
            "parameters_only": "parameters-only" in data,
            "rapid_commit": "rapid-commit" in data,
            "temporary": "temporary" in data,
            "pd": pd_list,
        }

    def _parse_ip_settings(self, data: dict) -> dict:
        if not data:
            return None
        adjust_mss = data.get("adjust-mss")
        return {
            "adjust_mss": adjust_mss if adjust_mss != "clamp-mss-to-pmtu" else None,
            "adjust_mss_clamp_to_pmtu": adjust_mss == "clamp-mss-to-pmtu",
            "arp_cache_timeout": data.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in data,
            "enable_arp_accept": "enable-arp-accept" in data,
            "enable_arp_announce": "enable-arp-announce" in data,
            "enable_arp_ignore": "enable-arp-ignore" in data,
            "enable_directed_broadcast": "enable-directed-broadcast" in data,
            "enable_proxy_arp": "enable-proxy-arp" in data,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in data,
            "disable_forwarding": "disable-forwarding" in data,
            "source_validation": data.get("source-validation"),
        }

    def _parse_ipv6_settings(self, data: dict) -> dict:
        if not data:
            return None
        addr_data = data.get("address", {})
        eui64_raw = addr_data.get("eui64", {}) if isinstance(addr_data, dict) else {}
        adjust_mss = data.get("adjust-mss")
        return {
            "accept_dad": data.get("accept-dad"),
            "adjust_mss": adjust_mss if adjust_mss != "clamp-mss-to-pmtu" else None,
            "adjust_mss_clamp_to_pmtu": adjust_mss == "clamp-mss-to-pmtu",
            "base_reachable_time": data.get("base-reachable-time"),
            "disable_forwarding": "disable-forwarding" in data,
            "dup_addr_detect_transmits": data.get("dup-addr-detect-transmits"),
            "source_validation": data.get("source-validation"),
            "address_autoconf": isinstance(addr_data, dict) and "autoconf" in addr_data,
            "address_eui64": list(eui64_raw.keys()) if isinstance(eui64_raw, dict) else [],
            "address_no_default_link_local": isinstance(addr_data, dict) and "no-default-link-local" in addr_data,
            "address_interface_identifier": addr_data.get("interface-identifier") if isinstance(addr_data, dict) else None,
        }

    def _parse_mirror(self, data: dict) -> dict:
        if not data:
            return None
        return {
            "ingress": data.get("ingress"),
            "egress": data.get("egress"),
        }

    def _parse_vif(self, vlan_id: str, data: dict) -> dict:
        addr_raw = data.get("address", {})
        return {
            "vlan_id": vlan_id,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "disable_link_detect": "disable-link-detect" in data,
            "addresses": list(addr_raw.keys()) if isinstance(addr_raw, dict) else [],
            "mtu": data.get("mtu"),
            "mac": data.get("mac"),
            "vrf": data.get("vrf"),
            "redirect": data.get("redirect"),
            "egress_qos": data.get("egress-qos"),
            "ingress_qos": data.get("ingress-qos"),
            "dhcp_options": self._parse_dhcp_options(data.get("dhcp-options")),
            "dhcpv6_options": self._parse_dhcpv6_options(data.get("dhcpv6-options")),
            "ip": self._parse_ip_settings(data.get("ip")),
            "ipv6": self._parse_ipv6_settings(data.get("ipv6")),
            "mirror": self._parse_mirror(data.get("mirror")),
        }

    def _parse_vif_c(self, c_vlan_id: str, data: dict) -> dict:
        addr_raw = data.get("address", {})
        return {
            "vlan_id": c_vlan_id,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "disable_link_detect": "disable-link-detect" in data,
            "addresses": list(addr_raw.keys()) if isinstance(addr_raw, dict) else [],
            "mtu": data.get("mtu"),
            "mac": data.get("mac"),
            "vrf": data.get("vrf"),
            "redirect": data.get("redirect"),
            "dhcp_options": self._parse_dhcp_options(data.get("dhcp-options")),
            "dhcpv6_options": self._parse_dhcpv6_options(data.get("dhcpv6-options")),
            "ip": self._parse_ip_settings(data.get("ip")),
            "ipv6": self._parse_ipv6_settings(data.get("ipv6")),
            "mirror": self._parse_mirror(data.get("mirror")),
        }

    def _parse_vif_s(self, s_vlan_id: str, data: dict) -> dict:
        addr_raw = data.get("address", {})
        vif_c_raw = data.get("vif-c", {})
        vif_c_list = []
        for c_vlan_id, c_data in vif_c_raw.items():
            if isinstance(c_data, dict):
                vif_c_list.append(self._parse_vif_c(c_vlan_id, c_data))
        return {
            "vlan_id": s_vlan_id,
            "description": data.get("description"),
            "disabled": "disable" in data,
            "disable_link_detect": "disable-link-detect" in data,
            "addresses": list(addr_raw.keys()) if isinstance(addr_raw, dict) else [],
            "mtu": data.get("mtu"),
            "mac": data.get("mac"),
            "vrf": data.get("vrf"),
            "redirect": data.get("redirect"),
            "protocol": data.get("protocol"),
            "dhcp_options": self._parse_dhcp_options(data.get("dhcp-options")),
            "dhcpv6_options": self._parse_dhcpv6_options(data.get("dhcpv6-options")),
            "ip": self._parse_ip_settings(data.get("ip")),
            "ipv6": self._parse_ipv6_settings(data.get("ipv6")),
            "mirror": self._parse_mirror(data.get("mirror")),
            "vif_c": vif_c_list,
        }

    def _parse_interface(self, name: str, data: dict) -> dict:
        addr_raw = data.get("address", {})
        vif_raw = data.get("vif", {})
        vif_s_raw = data.get("vif-s", {})

        vif_list = []
        for vlan_id, vif_data in vif_raw.items():
            if isinstance(vif_data, dict):
                vif_list.append(self._parse_vif(vlan_id, vif_data))

        vif_s_list = []
        for s_vlan_id, vif_s_data in vif_s_raw.items():
            if isinstance(vif_s_data, dict):
                vif_s_list.append(self._parse_vif_s(s_vlan_id, vif_s_data))

        return {
            "name": name,
            "type": "virtual-ethernet",
            "description": data.get("description"),
            "disabled": "disable" in data,
            "peer_name": data.get("peer-name"),
            "netns": data.get("netns"),
            "mtu": data.get("mtu"),
            "vrf": data.get("vrf"),
            "addresses": list(addr_raw.keys()) if isinstance(addr_raw, dict) else [],
            "dhcp_options": self._parse_dhcp_options(data.get("dhcp-options")),
            "dhcpv6_options": self._parse_dhcpv6_options(data.get("dhcpv6-options")),
            "vif": vif_list,
            "vif_s": vif_s_list,
        }
