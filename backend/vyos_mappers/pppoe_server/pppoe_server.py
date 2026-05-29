"""PPPoE Server Command Mapper."""
from typing import List, Dict, Any
from ..base import BaseFeatureMapper

BASE = ["service", "pppoe-server"]


class PPPoEServerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

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

    def get_service_name_delete(self) -> List[str]:
        return BASE + ["service-name"]

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

    def get_ipv6_pool_prefix_mask(self, name: str, prefix: str, mask: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix, "mask", mask]

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

    def get_interface_vlan_mon(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan-mon"]

    def get_interface_combined(self, iface: str, value: str) -> List[str]:
        return BASE + ["interface", iface, "combined", value]

    def get_interface_combined_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "combined"]

    # ========================================================================
    # Full delete
    # ========================================================================

    def get_pppoe_server_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Config parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        cfg = full_config.get("service", {}).get("pppoe-server", {})
        if not cfg:
            return {
                "configured": False,
                "description": None,
                "access_concentrator": None,
                "service_name": None,
                "gateway_addresses": [],
                "name_servers": [],
                "wins_servers": [],
                "mtu": None,
                "max_concurrent_sessions": None,
                "thread_count": None,
                "default_pool": None,
                "default_ipv6_pool": None,
                "session_control": None,
                "accept_any_service": False,
                "accept_blank_service": False,
                "pado_delays": [],
                "log": {},
                "shaper": {},
                "snmp": {},
                "extended_scripts": {},
                "limits": {},
                "ppp_options": {},
                "authentication": {},
                "client_ip_pools": [],
                "client_ipv6_pools": [],
                "interfaces": [],
            }

        client_ip_pools = self._parse_client_ip_pools(cfg.get("client-ip-pool", {}))
        client_ipv6_pools = self._parse_client_ipv6_pools(cfg.get("client-ipv6-pool", {}))
        interfaces = self._parse_interfaces(cfg.get("interface", {}))
        auth = self._parse_authentication(cfg.get("authentication", {}))

        return {
            "configured": True,
            "description": cfg.get("description"),
            "access_concentrator": cfg.get("access-concentrator"),
            "service_name": cfg.get("service-name"),
            "gateway_addresses": self._normalize_to_list(cfg.get("gateway-address")),
            "name_servers": self._normalize_to_list(cfg.get("name-server")),
            "wins_servers": self._normalize_to_list(cfg.get("wins-server")),
            "mtu": cfg.get("mtu"),
            "max_concurrent_sessions": cfg.get("max-concurrent-sessions"),
            "thread_count": cfg.get("thread-count"),
            "default_pool": cfg.get("default-pool"),
            "default_ipv6_pool": cfg.get("default-ipv6-pool"),
            "session_control": cfg.get("session-control"),
            "accept_any_service": "accept-any-service" in cfg,
            "accept_blank_service": "accept-blank-service" in cfg,
            "pado_delays": self._parse_pado_delays(cfg.get("pado-delay", {})),
            "log": self._parse_log(cfg.get("log", {})),
            "shaper": self._parse_shaper(cfg.get("shaper", {})),
            "snmp": self._parse_snmp(cfg.get("snmp", {})),
            "extended_scripts": self._parse_extended_scripts(cfg.get("extended-scripts", {})),
            "limits": self._parse_limits(cfg.get("limits", {})),
            "ppp_options": self._parse_ppp_options(cfg.get("ppp-options", {})),
            "authentication": auth,
            "client_ip_pools": list(client_ip_pools.values()),
            "client_ipv6_pools": list(client_ipv6_pools.values()),
            "interfaces": list(interfaces.values()),
            "totals": {
                "local_users": len(auth.get("local_users", [])),
                "radius_servers": len(auth.get("radius", {}).get("servers", [])),
                "client_ip_pools": len(client_ip_pools),
                "client_ipv6_pools": len(client_ipv6_pools),
                "interfaces": len(interfaces),
            },
        }

    def _normalize_to_list(self, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _parse_pado_delays(self, cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        delays = []
        for delay, delay_cfg in cfg.items():
            delays.append({
                "delay": delay,
                "sessions": delay_cfg.get("sessions") if isinstance(delay_cfg, dict) else None,
            })
        return delays

    def _parse_log(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"level": cfg.get("level")}

    def _parse_shaper(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"fwmark": cfg.get("fwmark")}

    def _parse_snmp(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"master_agent": "master-agent" in cfg}

    def _parse_extended_scripts(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "on_change": cfg.get("on-change"),
            "on_down": cfg.get("on-down"),
            "on_pre_up": cfg.get("on-pre-up"),
            "on_up": cfg.get("on-up"),
        }

    def _parse_limits(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "burst": cfg.get("burst"),
            "connection_limit": cfg.get("connection-limit"),
            "timeout": cfg.get("timeout"),
        }

    def _parse_ppp_options(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "ipv4": cfg.get("ipv4"),
            "ipv6": cfg.get("ipv6"),
            "mppe": cfg.get("mppe"),
            "disable_ccp": "disable-ccp" in cfg,
            "interface_cache": cfg.get("interface-cache"),
            "ipv6_interface_id": cfg.get("ipv6-interface-id"),
            "ipv6_peer_interface_id": cfg.get("ipv6-peer-interface-id"),
            "ipv6_accept_peer_interface_id": "ipv6-accept-peer-interface-id" in cfg,
            "lcp_echo_failure": cfg.get("lcp-echo-failure"),
            "lcp_echo_interval": cfg.get("lcp-echo-interval"),
            "lcp_echo_timeout": cfg.get("lcp-echo-timeout"),
            "min_mtu": cfg.get("min-mtu"),
            "mru": cfg.get("mru"),
        }

    def _parse_authentication(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        local_users = []
        for username, user_cfg in cfg.get("local-users", {}).get("username", {}).items():
            rate_limit = user_cfg.get("rate-limit", {}) if isinstance(user_cfg, dict) else {}
            local_users.append({
                "username": username,
                "password": "***" if user_cfg.get("password") else None,
                "disabled": "disable" in user_cfg,
                "static_ip": user_cfg.get("static-ip"),
                "rate_limit": {
                    "download": rate_limit.get("download"),
                    "upload": rate_limit.get("upload"),
                },
            })

        return {
            "mode": cfg.get("mode"),
            "protocols": self._normalize_to_list(cfg.get("protocols")),
            "local_users": local_users,
            "radius": self._parse_radius(cfg.get("radius", {})),
        }

    def _parse_radius(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        servers = []
        for addr, srv_cfg in cfg.get("server", {}).items():
            srv_cfg = srv_cfg if isinstance(srv_cfg, dict) else {}
            servers.append({
                "address": addr,
                "key": "***" if srv_cfg.get("key") else None,
                "port": srv_cfg.get("port"),
                "acct_port": srv_cfg.get("acct-port"),
                "priority": srv_cfg.get("priority"),
                "fail_time": srv_cfg.get("fail-time"),
                "disabled": "disable" in srv_cfg,
                "backup": "backup" in srv_cfg,
                "disable_accounting": "disable-accounting" in srv_cfg,
            })

        dae = cfg.get("dynamic-author", {}) if isinstance(cfg.get("dynamic-author"), dict) else {}
        rate_limit = cfg.get("rate-limit", {}) if isinstance(cfg.get("rate-limit"), dict) else {}

        return {
            "servers": servers,
            "source_address": cfg.get("source-address"),
            "timeout": cfg.get("timeout"),
            "max_try": cfg.get("max-try"),
            "nas_identifier": cfg.get("nas-identifier"),
            "nas_ip_address": cfg.get("nas-ip-address"),
            "accounting_interim_interval": cfg.get("accounting-interim-interval"),
            "acct_interim_jitter": cfg.get("acct-interim-jitter"),
            "acct_timeout": cfg.get("acct-timeout"),
            "preallocate_vif": "preallocate-vif" in cfg,
            "called_sid_format": cfg.get("called-sid-format"),
            "dynamic_author": {
                "server": dae.get("server"),
                "port": dae.get("port"),
                "key": "***" if dae.get("key") else None,
            },
            "rate_limit": {
                "enable": "enable" in rate_limit,
                "attribute": rate_limit.get("attribute"),
                "vendor": rate_limit.get("vendor"),
                "multiplier": rate_limit.get("multiplier"),
            },
        }

    def _parse_client_ip_pools(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_cfg in cfg.items():
            pool_cfg = pool_cfg if isinstance(pool_cfg, dict) else {}
            pools[name] = {
                "name": name,
                "ranges": self._normalize_to_list(pool_cfg.get("range")),
                "next_pool": pool_cfg.get("next-pool"),
            }
        return pools

    def _parse_client_ipv6_pools(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_cfg in cfg.items():
            pool_cfg = pool_cfg if isinstance(pool_cfg, dict) else {}
            prefixes = []
            for prefix, pfx_cfg in pool_cfg.get("prefix", {}).items():
                pfx_cfg = pfx_cfg if isinstance(pfx_cfg, dict) else {}
                prefixes.append({"prefix": prefix, "mask": pfx_cfg.get("mask")})
            delegates = []
            for prefix, del_cfg in pool_cfg.get("delegate", {}).items():
                del_cfg = del_cfg if isinstance(del_cfg, dict) else {}
                delegates.append({"prefix": prefix, "delegation_prefix": del_cfg.get("delegation-prefix")})
            pools[name] = {
                "name": name,
                "prefixes": prefixes,
                "delegates": delegates,
            }
        return pools

    def _parse_interfaces(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        interfaces = {}
        for iface, iface_cfg in cfg.items():
            iface_cfg = iface_cfg if isinstance(iface_cfg, dict) else {}
            interfaces[iface] = {
                "interface": iface,
                "vlans": self._normalize_to_list(iface_cfg.get("vlan")),
                "vlan_mon": "vlan-mon" in iface_cfg,
                "combined": iface_cfg.get("combined"),
            }
        return interfaces
