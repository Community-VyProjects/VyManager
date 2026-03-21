"""
L2TP VPN Command Mapper

Handles command path generation and config parsing for L2TP remote-access VPN.
The L2TP command tree is identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any


class L2TPMapper:
    """Base mapper with all L2TP operations."""

    def __init__(self, version: str):
        self.version = version

    # ========================================================================
    # Base path
    # ========================================================================

    def get_base_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access"]

    # ========================================================================
    # General settings
    # ========================================================================

    def get_description_path(self, description: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "description", description]

    def get_description_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "description"]

    def get_gateway_address_path(self, address: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "gateway-address", address]

    def get_gateway_address_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "gateway-address"]

    def get_outside_address_path(self, address: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "outside-address", address]

    def get_outside_address_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "outside-address"]

    def get_mtu_path(self, mtu: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "mtu", mtu]

    def get_mtu_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "mtu"]

    def get_name_server_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "name-server", server]

    def get_name_server_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "name-server", server]

    def get_wins_server_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "wins-server", server]

    def get_wins_server_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "wins-server", server]

    def get_max_concurrent_sessions_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "max-concurrent-sessions", value]

    def get_max_concurrent_sessions_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "max-concurrent-sessions"]

    def get_thread_count_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "thread-count", value]

    def get_thread_count_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "thread-count"]

    def get_default_pool_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "default-pool", pool]

    def get_default_pool_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "default-pool"]

    def get_default_ipv6_pool_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "default-ipv6-pool", pool]

    def get_default_ipv6_pool_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "default-ipv6-pool"]

    # ========================================================================
    # Authentication
    # ========================================================================

    def get_auth_mode_path(self, mode: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "mode", mode]

    def get_auth_mode_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "mode"]

    def get_auth_protocols_path(self, protocol: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "protocols", protocol]

    def get_auth_protocols_delete_path(self, protocol: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "protocols", protocol]

    # Local users
    def get_local_user_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username]

    def get_local_user_password_path(self, username: str, password: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "password", password]

    def get_local_user_disable_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "disable"]

    def get_local_user_static_ip_path(self, username: str, ip: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "static-ip", ip]

    def get_local_user_static_ip_delete_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "static-ip"]

    def get_local_user_rate_limit_download_path(self, username: str, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "rate-limit", "download", value]

    def get_local_user_rate_limit_upload_path(self, username: str, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "rate-limit", "upload", value]

    def get_local_user_rate_limit_download_delete_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "rate-limit", "download"]

    def get_local_user_rate_limit_upload_delete_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username, "rate-limit", "upload"]

    def get_local_user_delete_path(self, username: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "local-users", "username", username]

    # RADIUS
    def get_radius_server_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server]

    def get_radius_server_key_path(self, server: str, key: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "key", key]

    def get_radius_server_port_path(self, server: str, port: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "port", port]

    def get_radius_server_acct_port_path(self, server: str, port: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "acct-port", port]

    def get_radius_server_priority_path(self, server: str, priority: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "priority", priority]

    def get_radius_server_fail_time_path(self, server: str, time: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "fail-time", time]

    def get_radius_server_disable_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "disable"]

    def get_radius_server_backup_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "backup"]

    def get_radius_server_disable_accounting_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "disable-accounting"]

    def get_radius_server_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server]

    def get_radius_source_address_path(self, address: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "source-address", address]

    def get_radius_source_address_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "source-address"]

    def get_radius_timeout_path(self, timeout: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "timeout", timeout]

    def get_radius_timeout_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "timeout"]

    def get_radius_max_try_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "max-try", value]

    def get_radius_max_try_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "max-try"]

    def get_radius_nas_identifier_path(self, identifier: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "nas-identifier", identifier]

    def get_radius_nas_identifier_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "nas-identifier"]

    def get_radius_nas_ip_address_path(self, address: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "nas-ip-address", address]

    def get_radius_nas_ip_address_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "nas-ip-address"]

    def get_radius_preallocate_vif_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "preallocate-vif"]

    def get_radius_accounting_interim_interval_path(self, interval: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "accounting-interim-interval", interval]

    def get_radius_accounting_interim_interval_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "accounting-interim-interval"]

    def get_radius_acct_interim_jitter_path(self, jitter: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "acct-interim-jitter", jitter]

    def get_radius_acct_interim_jitter_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "acct-interim-jitter"]

    def get_radius_acct_timeout_path(self, timeout: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "acct-timeout", timeout]

    def get_radius_acct_timeout_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "acct-timeout"]

    # RADIUS dynamic author (CoA)
    def get_radius_dae_server_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "server", server]

    def get_radius_dae_server_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "server"]

    def get_radius_dae_port_path(self, port: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "port", port]

    def get_radius_dae_port_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "port"]

    def get_radius_dae_key_path(self, key: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "key", key]

    def get_radius_dae_key_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "dynamic-author", "key"]

    # RADIUS rate limit
    def get_radius_rate_limit_enable_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "enable"]

    def get_radius_rate_limit_attribute_path(self, attribute: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "attribute", attribute]

    def get_radius_rate_limit_attribute_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "attribute"]

    def get_radius_rate_limit_vendor_path(self, vendor: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "vendor", vendor]

    def get_radius_rate_limit_vendor_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "vendor"]

    def get_radius_rate_limit_multiplier_path(self, multiplier: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "multiplier", multiplier]

    def get_radius_rate_limit_multiplier_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "rate-limit", "multiplier"]

    # ========================================================================
    # IPSec settings
    # ========================================================================

    def get_ipsec_auth_mode_path(self, mode: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "mode", mode]

    def get_ipsec_auth_mode_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "mode"]

    def get_ipsec_psk_path(self, secret: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "pre-shared-secret", secret]

    def get_ipsec_psk_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "pre-shared-secret"]

    def get_ipsec_x509_ca_certificate_path(self, cert: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "ca-certificate", cert]

    def get_ipsec_x509_ca_certificate_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "ca-certificate"]

    def get_ipsec_x509_certificate_path(self, cert: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "certificate", cert]

    def get_ipsec_x509_certificate_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "certificate"]

    def get_ipsec_x509_passphrase_path(self, passphrase: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "passphrase", passphrase]

    def get_ipsec_x509_passphrase_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "authentication", "x509", "passphrase"]

    def get_ipsec_ike_group_path(self, group: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "ike-group", group]

    def get_ipsec_ike_group_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "ike-group"]

    def get_ipsec_esp_group_path(self, group: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "esp-group", group]

    def get_ipsec_esp_group_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "esp-group"]

    def get_ipsec_ike_lifetime_path(self, lifetime: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "ike-lifetime", lifetime]

    def get_ipsec_ike_lifetime_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "ike-lifetime"]

    def get_ipsec_lifetime_path(self, lifetime: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "lifetime", lifetime]

    def get_ipsec_lifetime_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ipsec-settings", "lifetime"]

    # ========================================================================
    # Client IP pools
    # ========================================================================

    def get_client_ip_pool_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool]

    def get_client_ip_pool_range_path(self, pool: str, range_val: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool, "range", range_val]

    def get_client_ip_pool_next_pool_path(self, pool: str, next_pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool, "next-pool", next_pool]

    def get_client_ip_pool_delete_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool]

    def get_client_ip_pool_range_delete_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool, "range"]

    def get_client_ip_pool_next_pool_delete_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ip-pool", pool, "next-pool"]

    # Client IPv6 pools
    def get_client_ipv6_pool_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool]

    def get_client_ipv6_pool_prefix_path(self, pool: str, prefix: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool, "prefix", prefix]

    def get_client_ipv6_pool_prefix_mask_path(self, pool: str, prefix: str, mask: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool, "prefix", prefix, "mask", mask]

    def get_client_ipv6_pool_delegate_path(self, pool: str, prefix: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool, "delegate", prefix]

    def get_client_ipv6_pool_delegate_prefix_path(self, pool: str, prefix: str, delegation: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool, "delegate", prefix, "delegation-prefix", delegation]

    def get_client_ipv6_pool_delete_path(self, pool: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "client-ipv6-pool", pool]

    # ========================================================================
    # PPP options
    # ========================================================================

    def get_ppp_disable_ccp_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "disable-ccp"]

    def get_ppp_interface_cache_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "interface-cache", value]

    def get_ppp_interface_cache_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "interface-cache"]

    def get_ppp_ipv4_path(self, mode: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv4", mode]

    def get_ppp_ipv4_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv4"]

    def get_ppp_ipv6_path(self, mode: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6", mode]

    def get_ppp_ipv6_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6"]

    def get_ppp_ipv6_interface_id_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-interface-id", value]

    def get_ppp_ipv6_interface_id_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-interface-id"]

    def get_ppp_ipv6_peer_interface_id_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-peer-interface-id", value]

    def get_ppp_ipv6_peer_interface_id_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-peer-interface-id"]

    def get_ppp_ipv6_accept_peer_interface_id_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-accept-peer-interface-id"]

    def get_ppp_mppe_path(self, mode: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "mppe", mode]

    def get_ppp_mppe_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "mppe"]

    def get_ppp_lcp_echo_failure_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-failure", value]

    def get_ppp_lcp_echo_failure_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-failure"]

    def get_ppp_lcp_echo_interval_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-interval", value]

    def get_ppp_lcp_echo_interval_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-interval"]

    def get_ppp_lcp_echo_timeout_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-timeout", value]

    def get_ppp_lcp_echo_timeout_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "lcp-echo-timeout"]

    def get_ppp_min_mtu_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "min-mtu", value]

    def get_ppp_min_mtu_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "min-mtu"]

    def get_ppp_mru_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "mru", value]

    def get_ppp_mru_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "mru"]

    # ========================================================================
    # LNS settings
    # ========================================================================

    def get_lns_host_name_path(self, name: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "lns", "host-name", name]

    def get_lns_host_name_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "lns", "host-name"]

    def get_lns_shared_secret_path(self, secret: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "lns", "shared-secret", secret]

    def get_lns_shared_secret_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "lns", "shared-secret"]

    # ========================================================================
    # Limits
    # ========================================================================

    def get_limits_connection_limit_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "connection-limit", value]

    def get_limits_connection_limit_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "connection-limit"]

    def get_limits_burst_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "burst", value]

    def get_limits_burst_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "burst"]

    def get_limits_timeout_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "timeout", value]

    def get_limits_timeout_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "limits", "timeout"]

    # ========================================================================
    # Log
    # ========================================================================

    def get_log_level_path(self, level: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "log", "level", level]

    def get_log_level_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "log", "level"]

    # ========================================================================
    # Extended scripts
    # ========================================================================

    def get_extended_scripts_on_change_path(self, script: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-change", script]

    def get_extended_scripts_on_change_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-change"]

    def get_extended_scripts_on_down_path(self, script: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-down", script]

    def get_extended_scripts_on_down_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-down"]

    def get_extended_scripts_on_pre_up_path(self, script: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-pre-up", script]

    def get_extended_scripts_on_pre_up_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-pre-up"]

    def get_extended_scripts_on_up_path(self, script: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-up", script]

    def get_extended_scripts_on_up_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "extended-scripts", "on-up"]

    # ========================================================================
    # Shaper
    # ========================================================================

    def get_shaper_fwmark_path(self, value: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "shaper", "fwmark", value]

    def get_shaper_fwmark_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "shaper", "fwmark"]

    # ========================================================================
    # SNMP
    # ========================================================================

    def get_snmp_master_agent_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "snmp", "master-agent"]

    # ========================================================================
    # Delete entire L2TP config
    # ========================================================================

    def get_delete_all_path(self) -> List[str]:
        return ["vpn", "l2tp"]

    # ========================================================================
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        l2tp_config = full_config.get("vpn", {}).get("l2tp", {}).get("remote-access", {})

        if not l2tp_config:
            return {
                "configured": False,
                "description": None,
                "outside_address": None,
                "gateway_address": None,
                "mtu": None,
                "name_servers": [],
                "wins_servers": [],
                "default_pool": None,
                "default_ipv6_pool": None,
                "max_concurrent_sessions": None,
                "thread_count": None,
                "authentication": {},
                "ipsec_settings": {},
                "client_ip_pools": {},
                "client_ipv6_pools": {},
                "ppp_options": {},
                "lns": {},
                "limits": {},
                "log": {},
                "extended_scripts": {},
                "shaper": {},
                "snmp": {},
            }

        return {
            "configured": True,
            "description": l2tp_config.get("description"),
            "outside_address": l2tp_config.get("outside-address"),
            "gateway_address": l2tp_config.get("gateway-address"),
            "mtu": l2tp_config.get("mtu"),
            "name_servers": self._normalize_to_list(l2tp_config.get("name-server")),
            "wins_servers": self._normalize_to_list(l2tp_config.get("wins-server")),
            "default_pool": l2tp_config.get("default-pool"),
            "default_ipv6_pool": l2tp_config.get("default-ipv6-pool"),
            "max_concurrent_sessions": l2tp_config.get("max-concurrent-sessions"),
            "thread_count": l2tp_config.get("thread-count"),
            "authentication": self._parse_authentication(l2tp_config.get("authentication", {})),
            "ipsec_settings": self._parse_ipsec_settings(l2tp_config.get("ipsec-settings", {})),
            "client_ip_pools": self._parse_client_ip_pools(l2tp_config.get("client-ip-pool", {})),
            "client_ipv6_pools": self._parse_client_ipv6_pools(l2tp_config.get("client-ipv6-pool", {})),
            "ppp_options": self._parse_ppp_options(l2tp_config.get("ppp-options", {})),
            "lns": self._parse_lns(l2tp_config.get("lns", {})),
            "limits": self._parse_limits(l2tp_config.get("limits", {})),
            "log": self._parse_log(l2tp_config.get("log", {})),
            "extended_scripts": self._parse_extended_scripts(l2tp_config.get("extended-scripts", {})),
            "shaper": self._parse_shaper(l2tp_config.get("shaper", {})),
            "snmp": self._parse_snmp(l2tp_config.get("snmp", {})),
        }

    def _parse_authentication(self, config: Dict[str, Any]) -> Dict[str, Any]:
        local_users = {}
        for username, user_config in config.get("local-users", {}).get("username", {}).items():
            rate_limit = user_config.get("rate-limit", {})
            local_users[username] = {
                "username": username,
                "password": user_config.get("password"),
                "disabled": "disable" in user_config,
                "static_ip": user_config.get("static-ip"),
                "rate_limit": {
                    "download": rate_limit.get("download"),
                    "upload": rate_limit.get("upload"),
                },
            }

        radius = self._parse_radius(config.get("radius", {}))

        return {
            "mode": config.get("mode"),
            "protocols": self._normalize_to_list(config.get("protocols")),
            "local_users": local_users,
            "radius": radius,
        }

    def _parse_radius(self, config: Dict[str, Any]) -> Dict[str, Any]:
        servers = {}
        for addr, server_config in config.get("server", {}).items():
            servers[addr] = {
                "address": addr,
                "key": "***" if server_config.get("key") else None,
                "port": server_config.get("port"),
                "acct_port": server_config.get("acct-port"),
                "priority": server_config.get("priority"),
                "fail_time": server_config.get("fail-time"),
                "disabled": "disable" in server_config,
                "backup": "backup" in server_config,
                "disable_accounting": "disable-accounting" in server_config,
            }

        dae = config.get("dynamic-author", {})
        rate_limit = config.get("rate-limit", {})

        return {
            "servers": servers,
            "source_address": config.get("source-address"),
            "timeout": config.get("timeout"),
            "max_try": config.get("max-try"),
            "nas_identifier": config.get("nas-identifier"),
            "nas_ip_address": config.get("nas-ip-address"),
            "preallocate_vif": "preallocate-vif" in config,
            "accounting_interim_interval": config.get("accounting-interim-interval"),
            "acct_interim_jitter": config.get("acct-interim-jitter"),
            "acct_timeout": config.get("acct-timeout"),
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

    def _parse_ipsec_settings(self, config: Dict[str, Any]) -> Dict[str, Any]:
        auth = config.get("authentication", {})
        x509 = auth.get("x509", {})
        return {
            "authentication": {
                "mode": auth.get("mode"),
                "pre_shared_secret": "***" if auth.get("pre-shared-secret") else None,
                "x509": {
                    "ca_certificate": x509.get("ca-certificate"),
                    "certificate": x509.get("certificate"),
                    "passphrase": "***" if x509.get("passphrase") else None,
                },
            },
            "ike_group": config.get("ike-group"),
            "esp_group": config.get("esp-group"),
            "ike_lifetime": config.get("ike-lifetime"),
            "lifetime": config.get("lifetime"),
        }

    def _parse_client_ip_pools(self, config: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_config in config.items():
            pools[name] = {
                "name": name,
                "range": pool_config.get("range"),
                "next_pool": pool_config.get("next-pool"),
            }
        return pools

    def _parse_client_ipv6_pools(self, config: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_config in config.items():
            prefixes = {}
            for prefix, prefix_config in pool_config.get("prefix", {}).items():
                prefixes[prefix] = {
                    "prefix": prefix,
                    "mask": prefix_config.get("mask") if isinstance(prefix_config, dict) else None,
                }
            delegates = {}
            for prefix, delegate_config in pool_config.get("delegate", {}).items():
                delegates[prefix] = {
                    "prefix": prefix,
                    "delegation_prefix": delegate_config.get("delegation-prefix") if isinstance(delegate_config, dict) else None,
                }
            pools[name] = {
                "name": name,
                "prefixes": prefixes,
                "delegates": delegates,
            }
        return pools

    def _parse_ppp_options(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "disable_ccp": "disable-ccp" in config,
            "interface_cache": config.get("interface-cache"),
            "ipv4": config.get("ipv4"),
            "ipv6": config.get("ipv6"),
            "ipv6_interface_id": config.get("ipv6-interface-id"),
            "ipv6_peer_interface_id": config.get("ipv6-peer-interface-id"),
            "ipv6_accept_peer_interface_id": "ipv6-accept-peer-interface-id" in config,
            "mppe": config.get("mppe"),
            "lcp_echo_failure": config.get("lcp-echo-failure"),
            "lcp_echo_interval": config.get("lcp-echo-interval"),
            "lcp_echo_timeout": config.get("lcp-echo-timeout"),
            "min_mtu": config.get("min-mtu"),
            "mru": config.get("mru"),
        }

    def _parse_lns(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "host_name": config.get("host-name"),
            "shared_secret": "***" if config.get("shared-secret") else None,
        }

    def _parse_limits(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "connection_limit": config.get("connection-limit"),
            "burst": config.get("burst"),
            "timeout": config.get("timeout"),
        }

    def _parse_log(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "level": config.get("level"),
        }

    def _parse_extended_scripts(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "on_change": config.get("on-change"),
            "on_down": config.get("on-down"),
            "on_pre_up": config.get("on-pre-up"),
            "on_up": config.get("on-up"),
        }

    def _parse_shaper(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "fwmark": config.get("fwmark"),
        }

    def _parse_snmp(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "master_agent": "master-agent" in config,
        }

    def _normalize_to_list(self, value: Any) -> list:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]
