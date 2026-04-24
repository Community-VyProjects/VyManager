"""
PPPoE Interface Batch Builder

Provides all PPPoE interface batch operations.
PPPoE dials up to an upstream access concentrator over a source Ethernet
interface and obtains an IPv4 and/or IPv6 address.

Version-aware where the underlying command tree differs (1.5 adds
`address dhcpv6`, `dhcpv6-options no-request-dns/no-request-domain-name`,
and `ipv6 address interface-identifier`).
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class PppoeInterfaceBuilderMixin:
    """Complete batch builder for PPPoE interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_pppoe"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "PppoeInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "PppoeInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "PppoeInterfaceBuilderMixin":
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def _mapper(self):
        return self.mappers[self.interface_mapper_key]

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": not is_v15,
                "is_1_5": is_v15,
            },
            "features": {
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "access_concentrator": {"supported": True, "description": "Access concentrator name"},
                "service_name": {"supported": True, "description": "Only connect to ACs advertising this service"},
                "source_interface": {"supported": True, "description": "Underlying interface used to establish the session"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
                "connect_on_demand": {"supported": True, "description": "Bring up session only when traffic is sent"},
                "default_route_distance": {"supported": True, "description": "Admin distance for default route (1-255)"},
                "no_default_route": {"supported": True, "description": "Do not install default route"},
                "no_peer_dns": {"supported": True, "description": "Do not use peer-provided DNS servers"},
                "holdoff": {"supported": True, "description": "Re-dial delay after peer disconnect (seconds)"},
                "idle_timeout": {"supported": True, "description": "Disconnect after idle period (seconds)"},
                "host_uniq": {"supported": True, "description": "PPPoE RFC2516 host-uniq tag (hex)"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit (68-1500)"},
                "mru": {"supported": True, "description": "Maximum Receive Unit (128-16384)"},
                "local_address": {"supported": True, "description": "IPv4 address of local end of the PPPoE link"},
                "remote_address": {"supported": True, "description": "IPv4 address of remote end of the PPPoE link"},
                "authentication": {"supported": True, "description": "Username / password for PAP/CHAP auth"},
                "address_dhcpv6": {
                    "supported": is_v15,
                    "description": "Request a stateful DHCPv6 address (VyOS 1.5+)",
                },
                "dhcpv6_options": {"supported": True, "description": "DHCPv6 client settings (DUID, rapid-commit, temporary, ...)"},
                "dhcpv6_no_request_dns": {
                    "supported": is_v15,
                    "description": "Do not request DNS servers via DHCPv6 (VyOS 1.5+)",
                },
                "dhcpv6_no_request_domain_name": {
                    "supported": is_v15,
                    "description": "Do not request domain name via DHCPv6 (VyOS 1.5+)",
                },
                "dhcpv6_pd": {"supported": True, "description": "DHCPv6 Prefix Delegation"},
                "ip_settings": {"supported": True, "description": "IPv4 settings (adjust-mss, disable-forwarding, source-validation)"},
                "ipv6_settings": {"supported": True, "description": "IPv6 settings (adjust-mss, disable-forwarding, address autoconf)"},
                "ipv6_address_interface_identifier": {
                    "supported": is_v15,
                    "description": "Manual SLAAC interface identifier (VyOS 1.5+)",
                },
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
            },
        }

    # ========================================================================
    # Basic Interface
    # ========================================================================

    def delete_interface(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    def set_interface_description(self, interface: str, description: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_interface_disable(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_access_concentrator(self, interface: str, name: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_access_concentrator(interface, name))

    def delete_access_concentrator(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_access_concentrator_path(interface))

    def set_service_name(self, interface: str, name: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_service_name(interface, name))

    def delete_service_name(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_service_name_path(interface))

    def set_source_interface(self, interface: str, source: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_source_interface(interface, source))

    def delete_source_interface(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_source_interface_path(interface))

    def set_vrf(self, interface: str, vrf: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    def set_redirect(self, interface: str, destination: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_redirect(interface, destination))

    def delete_redirect(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_redirect_path(interface))

    # ========================================================================
    # Connection / Timer behavior
    # ========================================================================

    def set_connect_on_demand(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_connect_on_demand(interface))

    def delete_connect_on_demand(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_connect_on_demand(interface))

    def set_default_route_distance(self, interface: str, distance: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_default_route_distance(interface, distance))

    def delete_default_route_distance(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_default_route_distance_path(interface))

    def set_no_default_route(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_no_default_route(interface))

    def delete_no_default_route(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_no_default_route(interface))

    def set_no_peer_dns(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_no_peer_dns(interface))

    def delete_no_peer_dns(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_no_peer_dns(interface))

    def set_holdoff(self, interface: str, seconds: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_holdoff(interface, seconds))

    def delete_holdoff(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_holdoff_path(interface))

    def set_idle_timeout(self, interface: str, seconds: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_idle_timeout(interface, seconds))

    def delete_idle_timeout(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_idle_timeout_path(interface))

    def set_host_uniq(self, interface: str, value: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_host_uniq(interface, value))

    def delete_host_uniq(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_host_uniq_path(interface))

    def set_mtu(self, interface: str, mtu: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mtu(interface, mtu))

    def delete_mtu(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mtu_path(interface))

    def set_mru(self, interface: str, mru: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mru(interface, mru))

    def delete_mru(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mru_path(interface))

    def set_local_address(self, interface: str, address: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_local_address(interface, address))

    def delete_local_address(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_local_address_path(interface))

    def set_remote_address(self, interface: str, address: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_remote_address(interface, address))

    def delete_remote_address(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_remote_address_path(interface))

    # ========================================================================
    # Authentication
    # ========================================================================

    def set_authentication_username(self, interface: str, username: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_username(interface, username))

    def delete_authentication_username(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_username_path(interface))

    def set_authentication_password(self, interface: str, password: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_password(interface, password))

    def delete_authentication_password(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_password_path(interface))

    def delete_authentication(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_path(interface))

    # ========================================================================
    # Address (1.5+ only)
    # ========================================================================

    def set_address(self, interface: str, address: str) -> "PppoeInterfaceBuilderMixin":
        """Add address marker (1.5 only — allowed value: 'dhcpv6')."""
        return self.add_set(self._mapper().get_address(interface, address))

    def delete_address(self, interface: str, address: str) -> "PppoeInterfaceBuilderMixin":
        """Remove a specific address marker (1.5 only)."""
        return self.add_delete(self._mapper().get_address(interface, address))

    def delete_addresses(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """Remove all address markers (1.5 only)."""
        return self.add_delete(self._mapper().get_address_path(interface))

    # ========================================================================
    # DHCPv6 options
    # ========================================================================

    def delete_dhcpv6_options(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_options_path(interface))

    def set_dhcpv6_duid(self, interface: str, duid: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_duid(interface, duid))

    def delete_dhcpv6_duid(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_duid_path(interface))

    def set_dhcpv6_no_release(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_no_release(interface))

    def delete_dhcpv6_no_release(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_no_release(interface))

    def set_dhcpv6_no_request_dns(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_dhcpv6_no_request_dns(interface))

    def delete_dhcpv6_no_request_dns(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_dhcpv6_no_request_dns(interface))

    def set_dhcpv6_no_request_domain_name(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_dhcpv6_no_request_domain_name(interface))

    def delete_dhcpv6_no_request_domain_name(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_dhcpv6_no_request_domain_name(interface))

    def set_dhcpv6_parameters_only(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_parameters_only(interface))

    def delete_dhcpv6_parameters_only(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_parameters_only(interface))

    def set_dhcpv6_rapid_commit(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_rapid_commit(interface))

    def delete_dhcpv6_rapid_commit(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_rapid_commit(interface))

    def set_dhcpv6_temporary(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_temporary(interface))

    def delete_dhcpv6_temporary(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_temporary(interface))

    # --- DHCPv6 Prefix Delegation ---
    def delete_dhcpv6_pd(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_path(interface))

    def set_dhcpv6_pd_instance(self, interface: str, instance: str) -> "PppoeInterfaceBuilderMixin":
        """Create a PD instance (no value - ensures the tag node exists)."""
        return self.add_set(self._mapper().get_dhcpv6_pd_instance(interface, instance))

    def delete_dhcpv6_pd_instance(self, interface: str, instance: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_instance(interface, instance))

    def set_dhcpv6_pd_length(self, interface: str, instance: str, length: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_pd_length(interface, instance, length))

    def delete_dhcpv6_pd_length(self, interface: str, instance: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_length_path(interface, instance))

    def set_dhcpv6_pd_interface(self, interface: str, instance: str, delegated_iface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_pd_interface(interface, instance, delegated_iface))

    def delete_dhcpv6_pd_interface(self, interface: str, instance: str, delegated_iface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_interface(interface, instance, delegated_iface))

    def set_dhcpv6_pd_interface_address(self, interface: str, instance: str, delegated_iface: str, address: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_pd_interface_address(interface, instance, delegated_iface, address))

    def delete_dhcpv6_pd_interface_address(self, interface: str, instance: str, delegated_iface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_interface_address_path(interface, instance, delegated_iface))

    def set_dhcpv6_pd_interface_sla_id(self, interface: str, instance: str, delegated_iface: str, sla_id: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_dhcpv6_pd_interface_sla_id(interface, instance, delegated_iface, sla_id))

    def delete_dhcpv6_pd_interface_sla_id(self, interface: str, instance: str, delegated_iface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_dhcpv6_pd_interface_sla_id_path(interface, instance, delegated_iface))

    # ========================================================================
    # IP (IPv4) settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, mss: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss(interface, mss))

    def set_ip_adjust_mss_clamp_to_pmtu(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ip_adjust_mss(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_adjust_mss_path(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_forwarding(interface))

    def set_ip_source_validation(self, interface: str, mode: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_source_validation(interface, mode))

    def delete_ip_source_validation(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_source_validation_path(interface))

    def delete_ip_settings(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_path(interface))

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def set_ipv6_adjust_mss(self, interface: str, mss: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss(interface, mss))

    def set_ipv6_adjust_mss_clamp_to_pmtu(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ipv6_adjust_mss(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_adjust_mss_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_disable_forwarding(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_autoconf(interface))

    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_set(self._mapper().get_ipv6_address_interface_identifier(interface, identifier))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        """1.5+ only."""
        return self.add_delete(self._mapper().get_ipv6_address_interface_identifier_path(interface))

    def delete_ipv6_settings(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_path(interface))

    # ========================================================================
    # Mirror
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_ingress(interface, destination))

    def delete_mirror_ingress(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, destination: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_egress(interface, destination))

    def delete_mirror_egress(self, interface: str) -> "PppoeInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_egress_path(interface))
