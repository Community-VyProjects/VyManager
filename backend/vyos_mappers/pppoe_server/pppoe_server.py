"""PPPoE Server Command Mapper.

Shared ``service pppoe-server`` commands for VyOS 1.4 and 1.5. The 1.5-only
``authentication any-login``, ``interface <x> vlan-mon`` and ``ppp-options
ipv6-peer-interface-id-secret`` leaves live on the 1.5 subclass in
``pppoe_server_versions``.
"""
from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper

BASE = ["service", "pppoe-server"]


class PPPoEServerMapper(BaseFeatureMapper):
    """Shared PPPoE server commands."""

    # node -> path methods that only the version subclass defines
    _VERSIONED_NODES = {
        "any_login": ("get_auth_any_login",),
        "vlan_mon": ("get_interface_vlan_mon",),
        "ipv6_peer_interface_id_secret": (
            "get_ppp_ipv6_peer_interface_id_secret",
            "get_ppp_ipv6_peer_interface_id_secret_delete",
        ),
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
            raise ValueError(f"pppoe-server {node} is not supported on this device")

    # ========================================================================
    # Allowed values (lab ``allowed:`` / ``val_help`` lists)
    # ========================================================================

    def auth_modes(self) -> List[str]:
        return ["local", "radius", "noauth"]

    def auth_protocols(self) -> List[str]:
        return ["pap", "chap", "mschap", "mschap-v2"]

    def called_sid_formats(self) -> List[str]:
        return ["ifname", "ifname:mac"]

    def ppp_negotiation_modes(self) -> List[str]:
        """``ppp-options ipv4`` and ``ppp-options ipv6`` values."""
        return ["deny", "allow", "prefer", "require"]

    def mppe_modes(self) -> List[str]:
        return ["require", "prefer", "deny"]

    def ipv6_interface_id_keywords(self) -> List[str]:
        """Keywords ``ppp-options ipv6-interface-id`` takes besides x:x:x:x."""
        return ["random"]

    def ipv6_peer_interface_id_keywords(self) -> List[str]:
        """Keywords ``ppp-options ipv6-peer-interface-id`` takes besides x:x:x:x."""
        return ["random", "calling-sid", "ipv4-addr"]

    def session_control_modes(self) -> List[str]:
        return ["deny", "disable", "replace"]

    def thread_count_keywords(self) -> List[str]:
        """Keywords ``thread-count`` takes besides a number."""
        return ["all", "half"]

    def log_levels(self) -> List[str]:
        return ["0", "1", "2", "3", "4", "5"]

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_description(self, value: str) -> List[str]:
        return BASE + ["description", value]

    def get_description_delete(self) -> List[str]:
        return BASE + ["description"]

    def get_access_concentrator(self, value: str) -> List[str]:
        return BASE + ["access-concentrator", value]

    def get_access_concentrator_delete(self) -> List[str]:
        return BASE + ["access-concentrator"]

    def get_service_name(self, value: str) -> List[str]:
        return BASE + ["service-name", value]

    def get_service_name_delete(self, value: str) -> List[str]:
        return BASE + ["service-name", value]

    def get_gateway_address(self, address: str) -> List[str]:
        return BASE + ["gateway-address", address]

    def get_gateway_address_delete(self) -> List[str]:
        return BASE + ["gateway-address"]

    def get_name_server(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_name_server_delete(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_wins_server(self, address: str) -> List[str]:
        return BASE + ["wins-server", address]

    def get_wins_server_delete(self, address: str) -> List[str]:
        return BASE + ["wins-server", address]

    def get_mtu(self, value: str) -> List[str]:
        return BASE + ["mtu", value]

    def get_mtu_delete(self) -> List[str]:
        return BASE + ["mtu"]

    def get_max_concurrent_sessions(self, value: str) -> List[str]:
        return BASE + ["max-concurrent-sessions", value]

    def get_max_concurrent_sessions_delete(self) -> List[str]:
        return BASE + ["max-concurrent-sessions"]

    def get_thread_count(self, value: str) -> List[str]:
        return BASE + ["thread-count", value]

    def get_thread_count_delete(self) -> List[str]:
        return BASE + ["thread-count"]

    def get_default_pool(self, name: str) -> List[str]:
        return BASE + ["default-pool", name]

    def get_default_pool_delete(self) -> List[str]:
        return BASE + ["default-pool"]

    def get_default_ipv6_pool(self, name: str) -> List[str]:
        return BASE + ["default-ipv6-pool", name]

    def get_default_ipv6_pool_delete(self) -> List[str]:
        return BASE + ["default-ipv6-pool"]

    def get_session_control(self, value: str) -> List[str]:
        return BASE + ["session-control", value]

    def get_session_control_delete(self) -> List[str]:
        return BASE + ["session-control"]

    def get_accept_any_service(self) -> List[str]:
        return BASE + ["accept-any-service"]

    def get_accept_blank_service(self) -> List[str]:
        return BASE + ["accept-blank-service"]

    # ========================================================================
    # PADO delay
    # ========================================================================

    def get_pado_delay(self, delay: str) -> List[str]:
        return BASE + ["pado-delay", delay]

    def get_pado_delay_delete(self, delay: str) -> List[str]:
        return BASE + ["pado-delay", delay]

    def get_pado_delay_all_delete(self) -> List[str]:
        return BASE + ["pado-delay"]

    def get_pado_delay_sessions(self, delay: str, sessions: str) -> List[str]:
        return BASE + ["pado-delay", delay, "sessions", sessions]

    def get_pado_delay_sessions_delete(self, delay: str) -> List[str]:
        return BASE + ["pado-delay", delay, "sessions"]

    # ========================================================================
    # Log
    # ========================================================================

    def get_log_level(self, level: str) -> List[str]:
        return BASE + ["log", "level", level]

    def get_log_level_delete(self) -> List[str]:
        return BASE + ["log", "level"]

    # ========================================================================
    # Shaper
    # ========================================================================

    def get_shaper_fwmark(self, value: str) -> List[str]:
        return BASE + ["shaper", "fwmark", value]

    def get_shaper_fwmark_delete(self) -> List[str]:
        return BASE + ["shaper", "fwmark"]

    def get_shaper_delete(self) -> List[str]:
        return BASE + ["shaper"]

    # ========================================================================
    # SNMP
    # ========================================================================

    def get_snmp_master_agent(self) -> List[str]:
        return BASE + ["snmp", "master-agent"]

    def get_snmp_delete(self) -> List[str]:
        return BASE + ["snmp"]

    # ========================================================================
    # Extended scripts
    # ========================================================================

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

    def get_limits_delete(self) -> List[str]:
        return BASE + ["limits"]

    # ========================================================================
    # PPP options
    # ========================================================================

    def get_ppp_ipv4(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "ipv4", value]

    def get_ppp_ipv4_delete(self) -> List[str]:
        return BASE + ["ppp-options", "ipv4"]

    def get_ppp_ipv6(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "ipv6", value]

    def get_ppp_ipv6_delete(self) -> List[str]:
        return BASE + ["ppp-options", "ipv6"]

    def get_ppp_mppe(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "mppe", value]

    def get_ppp_mppe_delete(self) -> List[str]:
        return BASE + ["ppp-options", "mppe"]

    def get_ppp_disable_ccp(self) -> List[str]:
        return BASE + ["ppp-options", "disable-ccp"]

    def get_ppp_interface_cache(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "interface-cache", value]

    def get_ppp_interface_cache_delete(self) -> List[str]:
        return BASE + ["ppp-options", "interface-cache"]

    def get_ppp_ipv6_interface_id(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "ipv6-interface-id", value]

    def get_ppp_ipv6_interface_id_delete(self) -> List[str]:
        return BASE + ["ppp-options", "ipv6-interface-id"]

    def get_ppp_ipv6_peer_interface_id(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "ipv6-peer-interface-id", value]

    def get_ppp_ipv6_peer_interface_id_delete(self) -> List[str]:
        return BASE + ["ppp-options", "ipv6-peer-interface-id"]

    def get_ppp_ipv6_accept_peer_interface_id(self) -> List[str]:
        return BASE + ["ppp-options", "ipv6-accept-peer-interface-id"]

    def get_ppp_lcp_echo_failure(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-failure", value]

    def get_ppp_lcp_echo_failure_delete(self) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-failure"]

    def get_ppp_lcp_echo_interval(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-interval", value]

    def get_ppp_lcp_echo_interval_delete(self) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-interval"]

    def get_ppp_lcp_echo_timeout(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-timeout", value]

    def get_ppp_lcp_echo_timeout_delete(self) -> List[str]:
        return BASE + ["ppp-options", "lcp-echo-timeout"]

    def get_ppp_min_mtu(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "min-mtu", value]

    def get_ppp_min_mtu_delete(self) -> List[str]:
        return BASE + ["ppp-options", "min-mtu"]

    def get_ppp_mru(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "mru", value]

    def get_ppp_mru_delete(self) -> List[str]:
        return BASE + ["ppp-options", "mru"]

    def get_ppp_options_delete(self) -> List[str]:
        return BASE + ["ppp-options"]

    # ========================================================================
    # Authentication - mode and protocols
    # ========================================================================

    def get_auth_mode(self, mode: str) -> List[str]:
        return BASE + ["authentication", "mode", mode]

    def get_auth_mode_delete(self) -> List[str]:
        return BASE + ["authentication", "mode"]

    def get_auth_protocols(self, protocol: str) -> List[str]:
        return BASE + ["authentication", "protocols", protocol]

    def get_auth_protocols_delete(self, protocol: str) -> List[str]:
        return BASE + ["authentication", "protocols", protocol]

    def get_auth_protocols_all_delete(self) -> List[str]:
        return BASE + ["authentication", "protocols"]

    # ========================================================================
    # Authentication - local users
    # ========================================================================

    def get_local_user(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username]

    def get_local_user_delete(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username]

    def get_local_user_password(self, username: str, password: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "password", password]

    def get_local_user_password_delete(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "password"]

    def get_local_user_disable(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "disable"]

    def get_local_user_static_ip(self, username: str, ip: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "static-ip", ip]

    def get_local_user_static_ip_delete(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "static-ip"]

    def get_local_user_rate_limit_download(self, username: str, value: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "rate-limit", "download", value]

    def get_local_user_rate_limit_download_delete(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "rate-limit", "download"]

    def get_local_user_rate_limit_upload(self, username: str, value: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "rate-limit", "upload", value]

    def get_local_user_rate_limit_upload_delete(self, username: str) -> List[str]:
        return BASE + ["authentication", "local-users", "username", username, "rate-limit", "upload"]

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

    # ========================================================================
    # Authentication - RADIUS global settings
    # ========================================================================

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

    def get_radius_called_sid_format(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "called-sid-format", value]

    def get_radius_called_sid_format_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "called-sid-format"]

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

    def get_ipv6_pool_delegate_prefix_len(self, name: str, prefix: str, length: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix, "delegation-prefix", length]

    def get_ipv6_pool_delegate_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix]

    # ========================================================================
    # Interfaces
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_vlan(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_delete(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_all_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan"]

    def get_interface_combined(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "combined"]

    # ========================================================================
    # Full delete
    # ========================================================================

    def get_pppoe_server_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Op mode
    # ========================================================================

    def session_reset_path(self, username: str) -> List[str]:
        """``reset pppoe-server username <name>``: terminate a user's sessions."""
        return ["pppoe-server", "username", username]

    # ========================================================================
    # Config parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_pppoe_server_config

        return parse_pppoe_server_config(self, full_config)
