"""PPPoE Server Batch Builder."""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class PPPoEServerBatchBuilder:
    """Batch builder for all PPPoE server configuration operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "pppoe_server"

    # ========================================================================
    # Core infrastructure
    # ========================================================================

    def add_set(self, path: List[str]) -> "PPPoEServerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "PPPoEServerBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4
        return {
            "version": self.version,
            "features": {
                "auth_local": True,
                "auth_radius": True,
                "auth_noauth": True,
                "auth_protocols": True,
                "local_users": True,
                "client_ip_pools": True,
                "client_ipv6_pools": True,
                "interfaces": True,
                "vlan_mon": is_1_5,
                "ppp_options": True,
                "pado_delay": True,
                "session_control": True,
                "extended_scripts": True,
                "shaper": True,
                "snmp": True,
                "limits": True,
                "wins_server": True,
                "called_sid_format": True,
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # ========================================================================
    # Global settings
    # ========================================================================

    def set_description(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_description(value))

    def delete_description(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_description_delete())

    def set_access_concentrator(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_access_concentrator(value))

    def delete_access_concentrator(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_access_concentrator_delete())

    def set_service_name(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_service_name(value))

    def delete_service_name(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_service_name_delete())

    def set_gateway_address(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_gateway_address(address))

    def delete_gateway_address(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_gateway_address_delete(address))

    def delete_all_gateway_addresses(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_gateway_address_all_delete())

    def set_name_server(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_name_server(address))

    def delete_name_server(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_name_server_delete(address))

    def set_wins_server(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_wins_server(address))

    def delete_wins_server(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_wins_server_delete(address))

    def set_mtu(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mtu(value))

    def delete_mtu(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mtu_delete())

    def set_max_concurrent_sessions(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_max_concurrent_sessions(value))

    def delete_max_concurrent_sessions(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_max_concurrent_sessions_delete())

    def set_thread_count(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_thread_count(value))

    def delete_thread_count(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_thread_count_delete())

    def set_default_pool(self, _unused: str, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_default_pool(name))

    def delete_default_pool(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_default_pool_delete())

    def set_default_ipv6_pool(self, _unused: str, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_default_ipv6_pool(name))

    def delete_default_ipv6_pool(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_default_ipv6_pool_delete())

    def set_session_control(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_session_control(value))

    def delete_session_control(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_session_control_delete())

    def set_accept_any_service(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_accept_any_service())

    def delete_accept_any_service(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_accept_any_service())

    def set_accept_blank_service(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_accept_blank_service())

    def delete_accept_blank_service(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_accept_blank_service())

    def delete_pppoe_server(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pppoe_server_delete())

    # ========================================================================
    # PADO delay
    # item_name = delay value (e.g. "0", "disable")
    # ========================================================================

    def set_pado_delay(self, delay: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_pado_delay(delay))

    def delete_pado_delay(self, delay: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pado_delay_delete(delay))

    def delete_all_pado_delays(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pado_delay_all_delete())

    def set_pado_delay_sessions(self, delay: str, sessions: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_pado_delay_sessions(delay, sessions))

    def delete_pado_delay_sessions(self, delay: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pado_delay_sessions_delete(delay))

    # ========================================================================
    # Log
    # ========================================================================

    def set_log_level(self, _unused: str, level: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_log_level(level))

    def delete_log_level(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_log_level_delete())

    # ========================================================================
    # Shaper
    # ========================================================================

    def set_shaper_fwmark(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_shaper_fwmark(value))

    def delete_shaper_fwmark(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_shaper_fwmark_delete())

    def delete_shaper(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_shaper_delete())

    # ========================================================================
    # SNMP
    # ========================================================================

    def set_snmp_master_agent(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_snmp_master_agent())

    def delete_snmp(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_snmp_delete())

    # ========================================================================
    # Extended scripts
    # ========================================================================

    def set_script_on_change(self, _unused: str, script: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_change(script))

    def delete_script_on_change(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_change_delete())

    def set_script_on_down(self, _unused: str, script: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_down(script))

    def delete_script_on_down(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_down_delete())

    def set_script_on_pre_up(self, _unused: str, script: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_pre_up(script))

    def delete_script_on_pre_up(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_pre_up_delete())

    def set_script_on_up(self, _unused: str, script: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_up(script))

    def delete_script_on_up(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_up_delete())

    # ========================================================================
    # Limits
    # ========================================================================

    def set_limits_burst(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_burst(value))

    def delete_limits_burst(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_burst_delete())

    def set_limits_connection_limit(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_connection_limit(value))

    def delete_limits_connection_limit(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_connection_limit_delete())

    def set_limits_timeout(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_timeout(value))

    def delete_limits_timeout(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_timeout_delete())

    def delete_limits(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_delete())

    # ========================================================================
    # PPP options
    # ========================================================================

    def set_ppp_ipv4(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv4(value))

    def delete_ppp_ipv4(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv4_delete())

    def set_ppp_ipv6(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6(value))

    def delete_ppp_ipv6(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_delete())

    def set_ppp_mppe(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_mppe(value))

    def delete_ppp_mppe(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_mppe_delete())

    def set_ppp_disable_ccp(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_disable_ccp())

    def delete_ppp_disable_ccp(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_disable_ccp())

    def set_ppp_interface_cache(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_interface_cache(value))

    def delete_ppp_interface_cache(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_interface_cache_delete())

    def set_ppp_ipv6_interface_id(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_interface_id(value))

    def delete_ppp_ipv6_interface_id(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_interface_id_delete())

    def set_ppp_ipv6_peer_interface_id(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_peer_interface_id(value))

    def delete_ppp_ipv6_peer_interface_id(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_peer_interface_id_delete())

    def set_ppp_ipv6_accept_peer_interface_id(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_accept_peer_interface_id())

    def delete_ppp_ipv6_accept_peer_interface_id(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_accept_peer_interface_id())

    def set_ppp_lcp_echo_failure(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_failure(value))

    def delete_ppp_lcp_echo_failure(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_failure_delete())

    def set_ppp_lcp_echo_interval(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_interval(value))

    def delete_ppp_lcp_echo_interval(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_interval_delete())

    def set_ppp_lcp_echo_timeout(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_timeout(value))

    def delete_ppp_lcp_echo_timeout(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_timeout_delete())

    def set_ppp_min_mtu(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_min_mtu(value))

    def delete_ppp_min_mtu(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_min_mtu_delete())

    def set_ppp_mru(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_mru(value))

    def delete_ppp_mru(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_mru_delete())

    def delete_ppp_options(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_options_delete())

    # ========================================================================
    # Authentication - mode and protocols
    # ========================================================================

    def set_auth_mode(self, _unused: str, mode: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_mode(mode))

    def delete_auth_mode(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_mode_delete())

    def set_auth_protocol(self, _unused: str, protocol: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_protocols(protocol))

    def delete_auth_protocol(self, _unused: str, protocol: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_protocols_delete(protocol))

    def delete_all_auth_protocols(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_protocols_all_delete())

    # ========================================================================
    # Authentication - local users
    # item_name = username
    # ========================================================================

    def create_local_user(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user(username))

    def delete_local_user(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_delete(username))

    def set_local_user_password(self, username: str, password: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_password(username, password))

    def set_local_user_disable(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_disable(username))

    def delete_local_user_disable(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_disable(username))

    def set_local_user_static_ip(self, username: str, ip: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_static_ip(username, ip))

    def delete_local_user_static_ip(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_static_ip_delete(username))

    def set_local_user_rate_limit_download(self, username: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_rate_limit_download(username, value))

    def delete_local_user_rate_limit_download(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_rate_limit_download_delete(username))

    def set_local_user_rate_limit_upload(self, username: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_rate_limit_upload(username, value))

    def delete_local_user_rate_limit_upload(self, username: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_rate_limit_upload_delete(username))

    # ========================================================================
    # Authentication - RADIUS servers
    # item_name = RADIUS server IP
    # ========================================================================

    def set_radius_server(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server(server))

    def delete_radius_server(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_delete(server))

    def set_radius_server_key(self, server: str, key: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_key(server, key))

    def set_radius_server_port(self, server: str, port: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_port(server, port))

    def delete_radius_server_port(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_port_delete(server))

    def set_radius_server_acct_port(self, server: str, port: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_acct_port(server, port))

    def delete_radius_server_acct_port(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_acct_port_delete(server))

    def set_radius_server_priority(self, server: str, priority: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_priority(server, priority))

    def delete_radius_server_priority(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_priority_delete(server))

    def set_radius_server_fail_time(self, server: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_fail_time(server, value))

    def delete_radius_server_fail_time(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_fail_time_delete(server))

    def set_radius_server_disable(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_disable(server))

    def delete_radius_server_disable(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_disable(server))

    def set_radius_server_backup(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_backup(server))

    def delete_radius_server_backup(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_backup(server))

    def set_radius_server_disable_accounting(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_disable_accounting(server))

    def delete_radius_server_disable_accounting(self, server: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_disable_accounting(server))

    # ========================================================================
    # Authentication - RADIUS global settings
    # item_name = unused placeholder ("pppoe")
    # ========================================================================

    def set_radius_source_address(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_source_address(address))

    def delete_radius_source_address(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_source_address_delete())

    def set_radius_timeout(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_timeout(value))

    def delete_radius_timeout(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_timeout_delete())

    def set_radius_max_try(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_max_try(value))

    def delete_radius_max_try(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_max_try_delete())

    def set_radius_nas_identifier(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_nas_identifier(value))

    def delete_radius_nas_identifier(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_nas_identifier_delete())

    def set_radius_nas_ip_address(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_nas_ip_address(address))

    def delete_radius_nas_ip_address(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_nas_ip_address_delete())

    def set_radius_accounting_interim_interval(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_accounting_interim_interval(value))

    def delete_radius_accounting_interim_interval(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_accounting_interim_interval_delete())

    def set_radius_acct_interim_jitter(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_acct_interim_jitter(value))

    def delete_radius_acct_interim_jitter(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_acct_interim_jitter_delete())

    def set_radius_acct_timeout(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_acct_timeout(value))

    def delete_radius_acct_timeout(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_acct_timeout_delete())

    def set_radius_preallocate_vif(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_preallocate_vif())

    def delete_radius_preallocate_vif(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_preallocate_vif())

    def set_radius_called_sid_format(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_called_sid_format(value))

    def delete_radius_called_sid_format(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_called_sid_format_delete())

    def set_radius_dynamic_author_server(self, _unused: str, address: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dynamic_author_server(address))

    def delete_radius_dynamic_author_server(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dynamic_author_server_delete())

    def set_radius_dynamic_author_port(self, _unused: str, port: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dynamic_author_port(port))

    def delete_radius_dynamic_author_port(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dynamic_author_port_delete())

    def set_radius_dynamic_author_key(self, _unused: str, key: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dynamic_author_key(key))

    def delete_radius_dynamic_author_key(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dynamic_author_key_delete())

    def set_radius_rate_limit_enable(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_enable())

    def delete_radius_rate_limit(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_delete())

    def set_radius_rate_limit_attribute(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_attribute(value))

    def delete_radius_rate_limit_attribute(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_attribute_delete())

    def set_radius_rate_limit_vendor(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_vendor(value))

    def delete_radius_rate_limit_vendor(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_vendor_delete())

    def set_radius_rate_limit_multiplier(self, _unused: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_multiplier(value))

    def delete_radius_rate_limit_multiplier(self, _unused: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_multiplier_delete())

    # ========================================================================
    # Client IP pools
    # item_name = pool name
    # ========================================================================

    def create_pool(self, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_pool(name))

    def delete_pool(self, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pool_delete(name))

    def set_pool_range(self, name: str, cidr: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_pool_range(name, cidr))

    def delete_pool_range(self, name: str, cidr: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pool_range_delete(name, cidr))

    def set_pool_next_pool(self, name: str, next_name: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_pool_next_pool(name, next_name))

    def delete_pool_next_pool(self, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_pool_next_pool_delete(name))

    # ========================================================================
    # Client IPv6 pools
    # item_name = pool name
    # ========================================================================

    def create_ipv6_pool(self, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_pool(name))

    def delete_ipv6_pool(self, name: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_pool_delete(name))

    def set_ipv6_pool_prefix(self, name: str, prefix_mask: str) -> "PPPoEServerBatchBuilder":
        prefix, mask = prefix_mask.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_pool_prefix_mask(name, prefix, mask))

    def delete_ipv6_pool_prefix(self, name: str, prefix: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_pool_prefix_delete(name, prefix))

    def set_ipv6_pool_delegate(self, name: str, prefix_len: str) -> "PPPoEServerBatchBuilder":
        prefix, length = prefix_len.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_ipv6_pool_delegate_prefix_len(name, prefix, length))

    def delete_ipv6_pool_delegate(self, name: str, prefix: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipv6_pool_delegate_delete(name, prefix))

    # ========================================================================
    # Interfaces
    # item_name = interface name
    # ========================================================================

    def create_interface(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface(iface))

    def delete_interface(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_delete(iface))

    def set_interface_vlan(self, iface: str, vlan: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_vlan(iface, vlan))

    def delete_interface_vlan(self, iface: str, vlan: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_vlan_delete(iface, vlan))

    def delete_interface_all_vlans(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_vlan_all_delete(iface))

    def set_interface_vlan_mon(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_vlan_mon(iface))

    def delete_interface_vlan_mon(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_vlan_mon(iface))

    def set_interface_combined(self, iface: str, value: str) -> "PPPoEServerBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_combined(iface, value))

    def delete_interface_combined(self, iface: str) -> "PPPoEServerBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_combined_delete(iface))
