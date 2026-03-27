"""
Tunnel Batch Builder

Provides all batch operations for tunnel interface configuration.
Tunnel commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class TunnelBatchBuilder:
    """Complete batch builder for tunnel interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "get_operations", "is_empty",
        "get_capabilities", "mappers", "mapper_key", "version",
        "_operations",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "tunnel"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "TunnelBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "TunnelBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Interface-level Operations
    # ========================================================================

    def set_interface(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_path(name))

    def delete_interface(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_path(name))

    def set_6rd_prefix(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_6rd_prefix(name, value))

    def delete_6rd_prefix(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_6rd_prefix_path(name))

    def set_6rd_relay_prefix(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_6rd_relay_prefix(name, value))

    def delete_6rd_relay_prefix(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_6rd_relay_prefix_path(name))

    def set_address(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_address(name, value))

    def delete_address(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address(name, value))

    def delete_all_addresses(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_address_path(name))

    def set_description(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_description(name, value))

    def delete_description(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_description_path(name))

    def set_disable(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable_path(name))

    def delete_disable(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable_path(name))

    def set_disable_link_detect(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable_link_detect_path(name))

    def delete_disable_link_detect(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable_link_detect_path(name))

    def set_enable_multicast(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_enable_multicast_path(name))

    def delete_enable_multicast(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_enable_multicast_path(name))

    def set_encapsulation(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_encapsulation(name, value))

    def delete_encapsulation(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_encapsulation_path(name))

    def set_mtu(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mtu(name, value))

    def delete_mtu(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mtu_path(name))

    def set_redirect(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_redirect(name, value))

    def delete_redirect(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_redirect_path(name))

    def set_remote(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_remote(name, value))

    def delete_remote(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_remote_path(name))

    def set_source_address(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_address(name, value))

    def delete_source_address(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_address_path(name))

    def set_source_interface(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_interface(name, value))

    def delete_source_interface(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_interface_path(name))

    def set_vrf(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrf(name, value))

    def delete_vrf(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrf_path(name))

    # ========================================================================
    # IP Settings Operations
    # ========================================================================

    def set_ip_adjust_mss(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_adjust_mss(name, value))

    def delete_ip_adjust_mss(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_adjust_mss_path(name))

    def set_ip_arp_cache_timeout(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_arp_cache_timeout(name, value))

    def delete_ip_arp_cache_timeout(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_arp_cache_timeout_path(name))

    def set_ip_disable_arp_filter(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_arp_filter_path(name))

    def delete_ip_disable_arp_filter(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_arp_filter_path(name))

    def set_ip_disable_forwarding(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_disable_forwarding_path(name))

    def delete_ip_disable_forwarding(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_disable_forwarding_path(name))

    def set_ip_enable_arp_accept(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_accept_path(name))

    def delete_ip_enable_arp_accept(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_accept_path(name))

    def set_ip_enable_arp_announce(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_announce_path(name))

    def delete_ip_enable_arp_announce(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_announce_path(name))

    def set_ip_enable_arp_ignore(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_arp_ignore_path(name))

    def delete_ip_enable_arp_ignore(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_arp_ignore_path(name))

    def set_ip_enable_directed_broadcast(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast_path(name))

    def delete_ip_enable_directed_broadcast(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_directed_broadcast_path(name))

    def set_ip_enable_proxy_arp(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_proxy_arp_path(name))

    def delete_ip_enable_proxy_arp(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_proxy_arp_path(name))

    def set_ip_proxy_arp_pvlan(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan_path(name))

    def delete_ip_proxy_arp_pvlan(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_proxy_arp_pvlan_path(name))

    def set_ip_source_validation(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ip_source_validation(name, value))

    def delete_ip_source_validation(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_source_validation_path(name))

    # ========================================================================
    # IPv6 Settings Operations
    # ========================================================================

    def set_ipv6_accept_dad(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_accept_dad(name, value))

    def delete_ipv6_accept_dad(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_accept_dad_path(name))

    def set_ipv6_address_autoconf(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_autoconf_path(name))

    def delete_ipv6_address_autoconf(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_autoconf_path(name))

    def set_ipv6_address_eui64(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_eui64(name, value))

    def delete_ipv6_address_eui64(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64(name, value))

    def delete_all_ipv6_address_eui64(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_eui64_path(name))

    def set_ipv6_address_no_default_link_local(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local_path(name))

    def delete_ipv6_address_no_default_link_local(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local_path(name))

    def set_ipv6_adjust_mss(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_adjust_mss(name, value))

    def delete_ipv6_adjust_mss(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_adjust_mss_path(name))

    def set_ipv6_base_reachable_time(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_base_reachable_time(name, value))

    def delete_ipv6_base_reachable_time(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_base_reachable_time_path(name))

    def set_ipv6_disable_forwarding(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_disable_forwarding_path(name))

    def delete_ipv6_disable_forwarding(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_disable_forwarding_path(name))

    def set_ipv6_dup_addr_detect_transmits(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits(name, value))

    def delete_ipv6_dup_addr_detect_transmits(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_dup_addr_detect_transmits_path(name))

    def set_ipv6_source_validation(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_source_validation(name, value))

    def delete_ipv6_source_validation(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_source_validation_path(name))

    # ========================================================================
    # Mirror Operations
    # ========================================================================

    def set_mirror_egress(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_egress(name, value))

    def delete_mirror_egress(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_egress_path(name))

    def set_mirror_ingress(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mirror_ingress(name, value))

    def delete_mirror_ingress(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mirror_ingress_path(name))

    # ========================================================================
    # Parameters - ERSPAN Operations
    # ========================================================================

    def set_parameters_erspan_direction(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_erspan_direction(name, value))

    def delete_parameters_erspan_direction(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_erspan_direction_path(name))

    def set_parameters_erspan_hw_id(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_erspan_hw_id(name, value))

    def delete_parameters_erspan_hw_id(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_erspan_hw_id_path(name))

    def set_parameters_erspan_index(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_erspan_index(name, value))

    def delete_parameters_erspan_index(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_erspan_index_path(name))

    def set_parameters_erspan_version(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_erspan_version(name, value))

    def delete_parameters_erspan_version(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_erspan_version_path(name))

    # ========================================================================
    # Parameters - IP Operations
    # ========================================================================

    def set_parameters_ip_ignore_df(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_ignore_df_path(name))

    def delete_parameters_ip_ignore_df(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_ignore_df_path(name))

    def set_parameters_ip_key(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_key(name, value))

    def delete_parameters_ip_key(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_key_path(name))

    def set_parameters_ip_no_pmtu_discovery(self, name: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_no_pmtu_discovery_path(name))

    def delete_parameters_ip_no_pmtu_discovery(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_no_pmtu_discovery_path(name))

    def set_parameters_ip_tos(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_tos(name, value))

    def delete_parameters_ip_tos(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_tos_path(name))

    def set_parameters_ip_ttl(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ip_ttl(name, value))

    def delete_parameters_ip_ttl(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ip_ttl_path(name))

    # ========================================================================
    # Parameters - IPv6 Operations
    # ========================================================================

    def set_parameters_ipv6_encaplimit(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ipv6_encaplimit(name, value))

    def delete_parameters_ipv6_encaplimit(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ipv6_encaplimit_path(name))

    def set_parameters_ipv6_flowlabel(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ipv6_flowlabel(name, value))

    def delete_parameters_ipv6_flowlabel(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ipv6_flowlabel_path(name))

    def set_parameters_ipv6_hoplimit(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ipv6_hoplimit(name, value))

    def delete_parameters_ipv6_hoplimit(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ipv6_hoplimit_path(name))

    def set_parameters_ipv6_tclass(self, name: str, value: str) -> "TunnelBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_parameters_ipv6_tclass(name, value))

    def delete_parameters_ipv6_tclass(self, name: str) -> "TunnelBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_parameters_ipv6_tclass_path(name))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "tunnel": {"supported": True, "description": "Tunnel interface configuration"},
                "address": {"supported": True, "description": "IP address assignment (multi-value)"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "disable_link_detect": {"supported": True, "description": "Ignore link state changes"},
                "enable_multicast": {"supported": True, "description": "Enable multicast over tunnel"},
                "encapsulation": {
                    "supported": True,
                    "description": "Tunnel encapsulation type",
                    "options": ["erspan", "gre", "gretap", "ip6erspan", "ip6gre", "ip6gretap", "ip6ip6", "ipip", "ipip6", "sit"],
                },
                "6rd": {"supported": True, "description": "6rd (IPv6 Rapid Deployment) prefix configuration"},
                "ip_settings": {"supported": True, "description": "IPv4 routing parameters"},
                "ipv6_settings": {"supported": True, "description": "IPv6 routing parameters"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress packets"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit (68-16000, default 1476)"},
                "parameters_erspan": {"supported": True, "description": "ERSPAN tunnel parameters"},
                "parameters_ip": {"supported": True, "description": "IPv4-specific tunnel parameters (key, tos, ttl, ignore-df, no-pmtu-discovery)"},
                "parameters_ipv6": {"supported": True, "description": "IPv6-specific tunnel parameters (encaplimit, flowlabel, hoplimit, tclass)"},
                "redirect": {"supported": True, "description": "Redirect to destination interface"},
                "remote": {"supported": True, "description": "Tunnel remote address"},
                "source_address": {"supported": True, "description": "Source IP address"},
                "source_interface": {"supported": True, "description": "Source interface"},
                "vrf": {"supported": True, "description": "VRF instance binding"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
