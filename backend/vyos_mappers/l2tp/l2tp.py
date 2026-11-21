"""
L2TP VPN Command Mapper

Shared ``vpn l2tp remote-access`` commands for VyOS 1.4 and 1.5. The 1.5-only
``ppp-options ipv6-peer-interface-id-secret`` leaf lives on the 1.5 subclass.
"""

from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper


class L2TPMapper(BaseFeatureMapper):
    """Shared L2TP remote-access commands."""

    # node -> path method that only the version subclass defines
    _VERSIONED_NODES = {
        "ppp_ipv6_peer_interface_id_secret": "get_ppp_ipv6_peer_interface_id_secret_path",
    }

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only leaves this device has.

        Each one is a path method on the version subclass. Capabilities and
        the builder read this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"l2tp {node} is not supported on this device")

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_l2tp_config

        return parse_l2tp_config(self, full_config)

    # ========================================================================
    # Allowed values (lab ``allowed:`` / ``val_help`` lists)
    # ========================================================================

    def auth_modes(self) -> List[str]:
        return ["local", "radius", "noauth"]

    def auth_protocols(self) -> List[str]:
        return ["pap", "chap", "mschap", "mschap-v2"]

    def ipsec_auth_modes(self) -> List[str]:
        return ["pre-shared-secret", "x509"]

    def ppp_ipv4_modes(self) -> List[str]:
        return ["deny", "allow", "prefer", "require"]

    def ppp_ipv6_modes(self) -> List[str]:
        return ["deny", "allow", "prefer", "require"]

    def ppp_mppe_modes(self) -> List[str]:
        return ["require", "prefer", "deny"]

    def log_levels(self) -> List[str]:
        return ["0", "1", "2", "3", "4", "5"]

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

    def get_radius_server_port_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "port"]

    def get_radius_server_acct_port_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "acct-port"]

    def get_radius_server_priority_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "priority"]

    def get_radius_server_fail_time_delete_path(self, server: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "authentication", "radius", "server", server, "fail-time"]

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
