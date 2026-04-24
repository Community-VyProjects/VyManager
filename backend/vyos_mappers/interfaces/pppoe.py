"""
PPPoE Interface Command Mapper

Handles PPPoE (Point-to-Point Protocol over Ethernet) interface commands for VyOS.
PPPoE is used to dial up to an upstream access concentrator (typical consumer ISP
uplink) over an Ethernet/source interface, obtaining an IPv4 and/or IPv6 address.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class PppoeInterfaceMapper(BaseFeatureMapper):
    """Base PPPoE interface mapper - common paths across all versions."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "pppoe"

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    # ========================================================================
    # Basic Interface
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_access_concentrator(self, interface: str, name: str) -> List[str]:
        return self._base(interface) + ["access-concentrator", name]

    def get_access_concentrator_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["access-concentrator"]

    def get_service_name(self, interface: str, name: str) -> List[str]:
        return self._base(interface) + ["service-name", name]

    def get_service_name_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["service-name"]

    def get_source_interface(self, interface: str, source: str) -> List[str]:
        return self._base(interface) + ["source-interface", source]

    def get_source_interface_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["source-interface"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Connection / Timer behavior
    # ========================================================================

    def get_connect_on_demand(self, interface: str) -> List[str]:
        return self._base(interface) + ["connect-on-demand"]

    def get_default_route_distance(self, interface: str, distance: str) -> List[str]:
        return self._base(interface) + ["default-route-distance", distance]

    def get_default_route_distance_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["default-route-distance"]

    def get_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["no-default-route"]

    def get_no_peer_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["no-peer-dns"]

    def get_holdoff(self, interface: str, seconds: str) -> List[str]:
        return self._base(interface) + ["holdoff", seconds]

    def get_holdoff_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["holdoff"]

    def get_idle_timeout(self, interface: str, seconds: str) -> List[str]:
        return self._base(interface) + ["idle-timeout", seconds]

    def get_idle_timeout_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["idle-timeout"]

    def get_host_uniq(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["host-uniq", value]

    def get_host_uniq_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["host-uniq"]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    def get_mru(self, interface: str, mru: str) -> List[str]:
        return self._base(interface) + ["mru", mru]

    def get_mru_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mru"]

    def get_local_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["local-address", address]

    def get_local_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["local-address"]

    def get_remote_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["remote-address", address]

    def get_remote_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["remote-address"]

    # ========================================================================
    # Authentication
    # ========================================================================

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
    # Address (VyOS 1.5+ only — "dhcpv6" request-for-address marker).
    # Overridden in version-specific mapper; base raises to signal unsupported.
    # ========================================================================

    def get_address(self, interface: str, address: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_address_path(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

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

    # 1.5-only flags — overridden in v1_5 mapper
    def get_dhcpv6_no_request_dns(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_dhcpv6_no_request_domain_name(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_dhcpv6_parameters_only(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "parameters-only"]

    def get_dhcpv6_rapid_commit(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "rapid-commit"]

    def get_dhcpv6_temporary(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "temporary"]

    # --- DHCPv6 Prefix Delegation ---
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

    def get_dhcpv6_pd_interface_address_path(self, interface: str, instance: str, delegated_iface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface, "address"]

    def get_dhcpv6_pd_interface_sla_id(self, interface: str, instance: str, delegated_iface: str, sla_id: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface, "sla-id", sla_id]

    def get_dhcpv6_pd_interface_sla_id_path(self, interface: str, instance: str, delegated_iface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "pd", instance, "interface", delegated_iface, "sla-id"]

    # ========================================================================
    # IP (IPv4) settings
    # ========================================================================

    def get_ip_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip"]

    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss"]

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def get_ipv6_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6"]

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    # 1.5-only — overridden in v1_5
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
    # Config Parsing (normalized for both versions)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single PPPoE interface. Normalizes 1.4/1.5 differences."""
        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_address = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}
        auth_config = config.get("authentication", {}) or {}
        dhcpv6_config = config.get("dhcpv6-options", {}) or {}

        def _as_list(val: Any) -> List[str]:
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                return [val]
            return []

        # Address is only a valid node on 1.5+; treat missing gracefully.
        addresses = _as_list(config.get("address"))

        # Parse DHCPv6 prefix delegation (tag node keyed by instance id)
        pd_instances: List[Dict[str, Any]] = []
        raw_pd = dhcpv6_config.get("pd", {}) or {}
        if isinstance(raw_pd, dict):
            for instance_id, pd_cfg in raw_pd.items():
                if not isinstance(pd_cfg, dict):
                    continue
                pd_interfaces: List[Dict[str, Any]] = []
                raw_ifaces = pd_cfg.get("interface", {}) or {}
                if isinstance(raw_ifaces, dict):
                    for iface_name, iface_cfg in raw_ifaces.items():
                        if not isinstance(iface_cfg, dict):
                            iface_cfg = {}
                        pd_interfaces.append({
                            "name": iface_name,
                            "address": iface_cfg.get("address"),
                            "sla_id": iface_cfg.get("sla-id"),
                        })
                pd_instances.append({
                    "instance": instance_id,
                    "length": pd_cfg.get("length"),
                    "interfaces": pd_interfaces,
                })

        return {
            "name": name,
            "type": self.interface_type,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "access_concentrator": config.get("access-concentrator"),
            "service_name": config.get("service-name"),
            "source_interface": config.get("source-interface"),
            "vrf": config.get("vrf"),
            "redirect": config.get("redirect"),
            "connect_on_demand": "connect-on-demand" in config,
            "default_route_distance": config.get("default-route-distance"),
            "no_default_route": "no-default-route" in config,
            "no_peer_dns": "no-peer-dns" in config,
            "holdoff": config.get("holdoff"),
            "idle_timeout": config.get("idle-timeout"),
            "host_uniq": config.get("host-uniq"),
            "mtu": config.get("mtu"),
            "mru": config.get("mru"),
            "local_address": config.get("local-address"),
            "remote_address": config.get("remote-address"),
            "addresses": addresses,
            "authentication": {
                "username": auth_config.get("username"),
                "password": auth_config.get("password"),
            } if auth_config else None,
            "dhcpv6_options": {
                "duid": dhcpv6_config.get("duid"),
                "no_release": "no-release" in dhcpv6_config,
                "no_request_dns": "no-request-dns" in dhcpv6_config,
                "no_request_domain_name": "no-request-domain-name" in dhcpv6_config,
                "parameters_only": "parameters-only" in dhcpv6_config,
                "rapid_commit": "rapid-commit" in dhcpv6_config,
                "temporary": "temporary" in dhcpv6_config,
                "pd": pd_instances,
            } if dhcpv6_config else None,
            "ip": {
                "adjust_mss": ip_config.get("adjust-mss"),
                "disable_forwarding": "disable-forwarding" in ip_config,
                "source_validation": ip_config.get("source-validation"),
            },
            "ipv6": {
                "adjust_mss": ipv6_config.get("adjust-mss"),
                "disable_forwarding": "disable-forwarding" in ipv6_config,
                "address_autoconf": "autoconf" in ipv6_address,
                "address_interface_identifier": ipv6_address.get("interface-identifier"),
            },
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all PPPoE interfaces from raw config dict."""
        interfaces = []
        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interfaces.append(self.parse_single_interface(iface_name, iface_config))

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
