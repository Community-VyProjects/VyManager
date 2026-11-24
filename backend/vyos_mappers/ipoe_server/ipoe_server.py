"""IPoE Server Command Mapper.

Shared ``service ipoe-server`` commands for VyOS 1.4 and 1.5. The 1.5-only
``idle-timeout`` and ``interface <x> vlan-mon`` leaves live on the 1.5
subclass in ``ipoe_server_versions``.
"""
from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper

BASE = ["service", "ipoe-server"]


class IPoEServerMapper(BaseFeatureMapper):
    """Shared IPoE server commands."""

    # node -> path methods that only the version subclass defines
    _VERSIONED_NODES = {
        "idle_timeout": ("get_idle_timeout", "get_idle_timeout_delete"),
        "vlan_mon": ("get_interface_vlan_mon",),
    }

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only leaves this device has.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"ipoe-server {node} is not supported on this device")

    # ========================================================================
    # Allowed values (lab ``allowed:`` / ``val_help`` lists)
    # ========================================================================

    def auth_modes(self) -> List[str]:
        return ["local", "radius", "noauth"]

    def interface_modes(self) -> List[str]:
        return ["l2", "l3"]

    def interface_networks(self) -> List[str]:
        return ["shared", "vlan"]

    def start_session_values(self) -> List[str]:
        return ["auto", "dhcp", "unclassified-packet"]

    def log_levels(self) -> List[str]:
        return ["0", "1", "2", "3", "4", "5"]

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_description(self, value: str) -> List[str]:
        return BASE + ["description", value]

    def get_description_delete(self) -> List[str]:
        return BASE + ["description"]

    def get_default_pool(self, name: str) -> List[str]:
        return BASE + ["default-pool", name]

    def get_default_pool_delete(self) -> List[str]:
        return BASE + ["default-pool"]

    def get_default_ipv6_pool(self, name: str) -> List[str]:
        return BASE + ["default-ipv6-pool", name]

    def get_default_ipv6_pool_delete(self) -> List[str]:
        return BASE + ["default-ipv6-pool"]

    def get_gateway_address(self, address: str) -> List[str]:
        return BASE + ["gateway-address", address]

    def get_gateway_address_delete(self, address: str) -> List[str]:
        return BASE + ["gateway-address", address]

    def get_gateway_address_all_delete(self) -> List[str]:
        return BASE + ["gateway-address"]

    def get_name_server(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_name_server_delete(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_max_concurrent_sessions(self, value: str) -> List[str]:
        return BASE + ["max-concurrent-sessions", value]

    def get_max_concurrent_sessions_delete(self) -> List[str]:
        return BASE + ["max-concurrent-sessions"]

    def get_thread_count(self, value: str) -> List[str]:
        return BASE + ["thread-count", value]

    def get_thread_count_delete(self) -> List[str]:
        return BASE + ["thread-count"]

    def get_lua_file(self, path: str) -> List[str]:
        return BASE + ["lua-file", path]

    def get_lua_file_delete(self) -> List[str]:
        return BASE + ["lua-file"]

    # ========================================================================
    # Log
    # ========================================================================

    def get_log_level(self, level: str) -> List[str]:
        return BASE + ["log", "level", level]

    def get_log_delete(self) -> List[str]:
        return BASE + ["log"]

    # ========================================================================
    # Shaper
    # ========================================================================

    def get_shaper(self) -> List[str]:
        return BASE + ["shaper"]

    def get_shaper_fwmark(self, value: str) -> List[str]:
        return BASE + ["shaper", "fwmark", value]

    def get_shaper_fwmark_delete(self) -> List[str]:
        return BASE + ["shaper", "fwmark"]

    # ========================================================================
    # SNMP
    # ========================================================================

    def get_snmp(self) -> List[str]:
        return BASE + ["snmp"]

    def get_snmp_master_agent(self) -> List[str]:
        return BASE + ["snmp", "master-agent"]

    # ========================================================================
    # Extended scripts
    # ========================================================================

    def get_extended_scripts(self) -> List[str]:
        return BASE + ["extended-scripts"]

    def get_extended_scripts_on_change(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-change", script]

    def get_extended_scripts_on_change_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-change"]

    def get_extended_scripts_on_down(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-down", script]

    def get_extended_scripts_on_down_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-down"]

    def get_extended_scripts_on_pre_up(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-pre-up", script]

    def get_extended_scripts_on_pre_up_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-pre-up"]

    def get_extended_scripts_on_up(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-up", script]

    def get_extended_scripts_on_up_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-up"]

    # ========================================================================
    # Limits
    # ========================================================================

    def get_limits(self) -> List[str]:
        return BASE + ["limits"]

    def get_limits_burst(self, value: str) -> List[str]:
        return BASE + ["limits", "burst", value]

    def get_limits_burst_delete(self) -> List[str]:
        return BASE + ["limits", "burst"]

    def get_limits_connection_limit(self, value: str) -> List[str]:
        return BASE + ["limits", "connection-limit", value]

    def get_limits_connection_limit_delete(self) -> List[str]:
        return BASE + ["limits", "connection-limit"]

    def get_limits_timeout(self, value: str) -> List[str]:
        return BASE + ["limits", "timeout", value]

    def get_limits_timeout_delete(self) -> List[str]:
        return BASE + ["limits", "timeout"]

    # ========================================================================
    # Authentication - mode
    # ========================================================================

    def get_auth_mode(self, mode: str) -> List[str]:
        return BASE + ["authentication", "mode", mode]

    def get_auth_mode_delete(self) -> List[str]:
        return BASE + ["authentication", "mode"]

    # ========================================================================
    # Authentication - local (interface/MAC static mappings)
    # ========================================================================

    def get_auth_interface_mac(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac]

    def get_auth_interface_mac_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac]

    def get_auth_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["authentication", "interface", iface]

    def get_auth_mac_ip_address(self, iface: str, mac: str, ip: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "ip-address", ip]

    def get_auth_mac_ip_address_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "ip-address"]

    def get_auth_mac_vlan(self, iface: str, mac: str, vlan: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "vlan", vlan]

    def get_auth_mac_vlan_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "vlan"]

    def get_auth_mac_rate_limit_download(self, iface: str, mac: str, value: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "download", value]

    def get_auth_mac_rate_limit_download_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "download"]

    def get_auth_mac_rate_limit_upload(self, iface: str, mac: str, value: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "upload", value]

    def get_auth_mac_rate_limit_upload_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "upload"]

    def get_auth_mac_rate_limit_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit"]

    # ========================================================================
    # Authentication - RADIUS servers
    # ========================================================================

    def get_radius_server(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server]

    def get_radius_server_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server]

    def get_radius_server_key(self, server: str, key: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "key", key]

    def get_radius_server_port(self, server: str, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "port", port]

    def get_radius_server_port_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "port"]

    def get_radius_server_acct_port(self, server: str, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "acct-port", port]

    def get_radius_server_acct_port_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "acct-port"]

    def get_radius_server_priority(self, server: str, priority: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "priority", priority]

    def get_radius_server_priority_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "priority"]

    def get_radius_server_fail_time(self, server: str, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "fail-time", value]

    def get_radius_server_fail_time_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "fail-time"]

    def get_radius_server_disable(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "disable"]

    def get_radius_server_backup(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "backup"]

    def get_radius_server_disable_accounting(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "disable-accounting"]

    def get_radius_source_address(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "source-address", address]

    def get_radius_source_address_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "source-address"]

    def get_radius_timeout(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "timeout", value]

    def get_radius_timeout_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "timeout"]

    def get_radius_max_try(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "max-try", value]

    def get_radius_max_try_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "max-try"]

    def get_radius_nas_identifier(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "nas-identifier", value]

    def get_radius_nas_identifier_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "nas-identifier"]

    def get_radius_nas_ip_address(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "nas-ip-address", address]

    def get_radius_nas_ip_address_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "nas-ip-address"]

    def get_radius_accounting_interim_interval(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "accounting-interim-interval", value]

    def get_radius_accounting_interim_interval_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "accounting-interim-interval"]

    def get_radius_acct_interim_jitter(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "acct-interim-jitter", value]

    def get_radius_acct_interim_jitter_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "acct-interim-jitter"]

    def get_radius_acct_timeout(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "acct-timeout", value]

    def get_radius_acct_timeout_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "acct-timeout"]

    def get_radius_preallocate_vif(self) -> List[str]:
        return BASE + ["authentication", "radius", "preallocate-vif"]

    def get_radius_dynamic_author_server(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "server", address]

    def get_radius_dynamic_author_server_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "server"]

    def get_radius_dynamic_author_port(self, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "port", port]

    def get_radius_dynamic_author_port_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "port"]

    def get_radius_dynamic_author_key(self, key: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "key", key]

    def get_radius_dynamic_author_key_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "key"]

    def get_radius_dynamic_author_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author"]

    def get_radius_rate_limit_enable(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "enable"]

    def get_radius_rate_limit_attribute(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "attribute", value]

    def get_radius_rate_limit_attribute_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "attribute"]

    def get_radius_rate_limit_vendor(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "vendor", value]

    def get_radius_rate_limit_vendor_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "vendor"]

    def get_radius_rate_limit_multiplier(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "multiplier", value]

    def get_radius_rate_limit_multiplier_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "multiplier"]

    def get_radius_rate_limit_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit"]

    # ========================================================================
    # Client IP pools
    # ========================================================================

    def get_pool(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name]

    def get_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name]

    def get_pool_range(self, name: str, cidr: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "range", cidr]

    def get_pool_range_delete(self, name: str, cidr: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "range", cidr]

    def get_pool_next_pool(self, name: str, next_name: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "next-pool", next_name]

    def get_pool_next_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "next-pool"]

    # ========================================================================
    # Client IPv6 pools
    # ========================================================================

    def get_ipv6_pool(self, name: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name]

    def get_ipv6_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name]

    def get_ipv6_pool_prefix(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix]

    def get_ipv6_pool_prefix_mask(self, name: str, prefix: str, mask: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix, "mask", mask]

    def get_ipv6_pool_prefix_mask_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix, "mask"]

    def get_ipv6_pool_prefix_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix]

    def get_ipv6_pool_delegate(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix]

    def get_ipv6_pool_delegate_prefix_len(self, name: str, prefix: str, length: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix, "delegation-prefix", length]

    def get_ipv6_pool_delegate_prefix_len_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix, "delegation-prefix"]

    def get_ipv6_pool_delegate_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix]

    # ========================================================================
    # Interfaces
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_mode(self, iface: str, mode: str) -> List[str]:
        return BASE + ["interface", iface, "mode", mode]

    def get_interface_mode_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "mode"]

    def get_interface_network(self, iface: str, network: str) -> List[str]:
        return BASE + ["interface", iface, "network", network]

    def get_interface_network_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "network"]

    def get_interface_start_session(self, iface: str, value: str) -> List[str]:
        return BASE + ["interface", iface, "start-session", value]

    def get_interface_start_session_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "start-session"]

    def get_interface_client_subnet(self, iface: str, subnet: str) -> List[str]:
        return BASE + ["interface", iface, "client-subnet", subnet]

    def get_interface_client_subnet_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "client-subnet"]

    def get_interface_vlan(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_delete(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_all_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan"]

    def get_interface_lua_username(self, iface: str, func: str) -> List[str]:
        return BASE + ["interface", iface, "lua-username", func]

    def get_interface_lua_username_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "lua-username"]

    def get_interface_external_dhcp_relay(self, iface: str, address: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "dhcp-relay", address]

    def get_interface_external_dhcp_relay_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "dhcp-relay"]

    def get_interface_external_dhcp_giaddr(self, iface: str, address: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "giaddr", address]

    def get_interface_external_dhcp_giaddr_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "giaddr"]

    def get_interface_external_dhcp_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp"]

    # ========================================================================
    # Full delete
    # ========================================================================

    def get_ipoe_server_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Config parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_ipoe_server_config

        return parse_ipoe_server_config(self, full_config)
