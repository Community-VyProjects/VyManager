"""
L2TP VPN Batch Builder

Provides all batch operations for L2TP remote-access VPN configuration.
The L2TP command tree is identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class L2TPBatchBuilder:
    """Complete batch builder for L2TP VPN operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "l2tp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "L2TPBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "L2TPBatchBuilder":
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

    # ========================================================================
    # General Settings
    # ========================================================================

    def set_description(self, _unused: str, description: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_description_path(description))

    def delete_description(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_description_delete_path())

    def set_gateway_address(self, _unused: str, address: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_gateway_address_path(address))

    def delete_gateway_address(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_gateway_address_delete_path())

    def set_outside_address(self, _unused: str, address: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_outside_address_path(address))

    def delete_outside_address(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_outside_address_delete_path())

    def set_mtu(self, _unused: str, mtu: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_mtu_path(mtu))

    def delete_mtu(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_mtu_delete_path())

    def set_name_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_name_server_path(server))

    def delete_name_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_name_server_delete_path(server))

    def set_wins_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_wins_server_path(server))

    def delete_wins_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_wins_server_delete_path(server))

    def set_max_concurrent_sessions(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_max_concurrent_sessions_path(value))

    def delete_max_concurrent_sessions(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_max_concurrent_sessions_delete_path())

    def set_thread_count(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_thread_count_path(value))

    def delete_thread_count(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_thread_count_delete_path())

    def set_default_pool(self, _unused: str, pool: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_default_pool_path(pool))

    def delete_default_pool(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_default_pool_delete_path())

    def set_default_ipv6_pool(self, _unused: str, pool: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_default_ipv6_pool_path(pool))

    def delete_default_ipv6_pool(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_default_ipv6_pool_delete_path())

    # ========================================================================
    # Authentication
    # ========================================================================

    def set_auth_mode(self, _unused: str, mode: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_mode_path(mode))

    def delete_auth_mode(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_mode_delete_path())

    def set_auth_protocols(self, _unused: str, protocol: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_protocols_path(protocol))

    def delete_auth_protocols(self, _unused: str, protocol: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_protocols_delete_path(protocol))

    # Local users
    def create_local_user(self, username: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_path(username))

    def set_local_user_password(self, username: str, password: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_password_path(username, password))

    def set_local_user_disable(self, username: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_disable_path(username))

    def delete_local_user_disable(self, username: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_disable_path(username))

    def set_local_user_static_ip(self, username: str, ip: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_static_ip_path(username, ip))

    def delete_local_user_static_ip(self, username: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_static_ip_delete_path(username))

    def set_local_user_rate_limit_download(self, username: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_rate_limit_download_path(username, value))

    def delete_local_user_rate_limit_download(self, username: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_rate_limit_download_delete_path(username))

    def set_local_user_rate_limit_upload(self, username: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_local_user_rate_limit_upload_path(username, value))

    def delete_local_user_rate_limit_upload(self, username: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_rate_limit_upload_delete_path(username))

    def delete_local_user(self, username: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_local_user_delete_path(username))

    # RADIUS
    def create_radius_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_path(server))

    def set_radius_server_key(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        server, key = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_key_path(server, key))

    def set_radius_server_port(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        server, port = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_port_path(server, port))

    def set_radius_server_acct_port(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        server, port = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_acct_port_path(server, port))

    def set_radius_server_priority(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        server, priority = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_priority_path(server, priority))

    def set_radius_server_fail_time(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        server, time = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_fail_time_path(server, time))

    def set_radius_server_disable(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_disable_path(server))

    def delete_radius_server_disable(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_disable_path(server))

    def set_radius_server_backup(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_backup_path(server))

    def delete_radius_server_backup(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_backup_path(server))

    def set_radius_server_disable_accounting(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_server_disable_accounting_path(server))

    def delete_radius_server_disable_accounting(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_disable_accounting_path(server))

    def delete_radius_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_server_delete_path(server))

    def set_radius_source_address(self, _unused: str, address: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_source_address_path(address))

    def delete_radius_source_address(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_source_address_delete_path())

    def set_radius_timeout(self, _unused: str, timeout: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_timeout_path(timeout))

    def delete_radius_timeout(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_timeout_delete_path())

    def set_radius_max_try(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_max_try_path(value))

    def delete_radius_max_try(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_max_try_delete_path())

    def set_radius_nas_identifier(self, _unused: str, identifier: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_nas_identifier_path(identifier))

    def delete_radius_nas_identifier(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_nas_identifier_delete_path())

    def set_radius_nas_ip_address(self, _unused: str, address: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_nas_ip_address_path(address))

    def delete_radius_nas_ip_address(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_nas_ip_address_delete_path())

    def set_radius_preallocate_vif(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_preallocate_vif_path())

    def delete_radius_preallocate_vif(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_preallocate_vif_path())

    def set_radius_accounting_interim_interval(self, _unused: str, interval: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_accounting_interim_interval_path(interval))

    def delete_radius_accounting_interim_interval(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_accounting_interim_interval_delete_path())

    def set_radius_acct_interim_jitter(self, _unused: str, jitter: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_acct_interim_jitter_path(jitter))

    def delete_radius_acct_interim_jitter(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_acct_interim_jitter_delete_path())

    def set_radius_acct_timeout(self, _unused: str, timeout: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_acct_timeout_path(timeout))

    def delete_radius_acct_timeout(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_acct_timeout_delete_path())

    # RADIUS dynamic author
    def set_radius_dae_server(self, _unused: str, server: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dae_server_path(server))

    def delete_radius_dae_server(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dae_server_delete_path())

    def set_radius_dae_port(self, _unused: str, port: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dae_port_path(port))

    def delete_radius_dae_port(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dae_port_delete_path())

    def set_radius_dae_key(self, _unused: str, key: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_dae_key_path(key))

    def delete_radius_dae_key(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_dae_key_delete_path())

    # RADIUS rate limit
    def set_radius_rate_limit_enable(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_enable_path())

    def delete_radius_rate_limit_enable(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_enable_path())

    def set_radius_rate_limit_attribute(self, _unused: str, attribute: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_attribute_path(attribute))

    def delete_radius_rate_limit_attribute(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_attribute_delete_path())

    def set_radius_rate_limit_vendor(self, _unused: str, vendor: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_vendor_path(vendor))

    def delete_radius_rate_limit_vendor(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_vendor_delete_path())

    def set_radius_rate_limit_multiplier(self, _unused: str, multiplier: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_radius_rate_limit_multiplier_path(multiplier))

    def delete_radius_rate_limit_multiplier(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_radius_rate_limit_multiplier_delete_path())

    # ========================================================================
    # IPSec Settings
    # ========================================================================

    def set_ipsec_auth_mode(self, _unused: str, mode: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_auth_mode_path(mode))

    def delete_ipsec_auth_mode(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_auth_mode_delete_path())

    def set_ipsec_psk(self, _unused: str, secret: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_psk_path(secret))

    def delete_ipsec_psk(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_psk_delete_path())

    def set_ipsec_x509_ca_certificate(self, _unused: str, cert: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_x509_ca_certificate_path(cert))

    def delete_ipsec_x509_ca_certificate(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_x509_ca_certificate_delete_path())

    def set_ipsec_x509_certificate(self, _unused: str, cert: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_x509_certificate_path(cert))

    def delete_ipsec_x509_certificate(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_x509_certificate_delete_path())

    def set_ipsec_x509_passphrase(self, _unused: str, passphrase: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_x509_passphrase_path(passphrase))

    def delete_ipsec_x509_passphrase(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_x509_passphrase_delete_path())

    def set_ipsec_ike_group(self, _unused: str, group: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_ike_group_path(group))

    def delete_ipsec_ike_group(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_ike_group_delete_path())

    def set_ipsec_esp_group(self, _unused: str, group: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_esp_group_path(group))

    def delete_ipsec_esp_group(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_esp_group_delete_path())

    def set_ipsec_ike_lifetime(self, _unused: str, lifetime: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_ike_lifetime_path(lifetime))

    def delete_ipsec_ike_lifetime(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_ike_lifetime_delete_path())

    def set_ipsec_lifetime(self, _unused: str, lifetime: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ipsec_lifetime_path(lifetime))

    def delete_ipsec_lifetime(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ipsec_lifetime_delete_path())

    # ========================================================================
    # Client IP Pools
    # ========================================================================

    def create_client_ip_pool(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ip_pool_path(pool))

    def set_client_ip_pool_range(self, pool: str, range_val: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ip_pool_range_path(pool, range_val))

    def delete_client_ip_pool_range(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_client_ip_pool_range_delete_path(pool))

    def set_client_ip_pool_next_pool(self, pool: str, next_pool: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ip_pool_next_pool_path(pool, next_pool))

    def delete_client_ip_pool_next_pool(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_client_ip_pool_next_pool_delete_path(pool))

    def delete_client_ip_pool(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_client_ip_pool_delete_path(pool))

    # Client IPv6 pools
    def create_client_ipv6_pool(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ipv6_pool_path(pool))

    def set_client_ipv6_pool_prefix(self, pool: str, prefix: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ipv6_pool_prefix_path(pool, prefix))

    def set_client_ipv6_pool_prefix_mask(self, pool: str, value: str) -> "L2TPBatchBuilder":
        prefix, mask = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_client_ipv6_pool_prefix_mask_path(pool, prefix, mask))

    def set_client_ipv6_pool_delegate(self, pool: str, prefix: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_client_ipv6_pool_delegate_path(pool, prefix))

    def set_client_ipv6_pool_delegate_prefix(self, pool: str, value: str) -> "L2TPBatchBuilder":
        prefix, delegation = value.split("|", 1)
        return self.add_set(self.mappers[self.mapper_key].get_client_ipv6_pool_delegate_prefix_path(pool, prefix, delegation))

    def delete_client_ipv6_pool(self, pool: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_client_ipv6_pool_delete_path(pool))

    # ========================================================================
    # PPP Options
    # ========================================================================

    def set_ppp_disable_ccp(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_disable_ccp_path())

    def delete_ppp_disable_ccp(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_disable_ccp_path())

    def set_ppp_interface_cache(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_interface_cache_path(value))

    def delete_ppp_interface_cache(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_interface_cache_delete_path())

    def set_ppp_ipv4(self, _unused: str, mode: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv4_path(mode))

    def delete_ppp_ipv4(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv4_delete_path())

    def set_ppp_ipv6(self, _unused: str, mode: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_path(mode))

    def delete_ppp_ipv6(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_delete_path())

    def set_ppp_ipv6_interface_id(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_interface_id_path(value))

    def delete_ppp_ipv6_interface_id(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_interface_id_delete_path())

    def set_ppp_ipv6_peer_interface_id(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_peer_interface_id_path(value))

    def delete_ppp_ipv6_peer_interface_id(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_peer_interface_id_delete_path())

    def set_ppp_ipv6_accept_peer_interface_id(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_ipv6_accept_peer_interface_id_path())

    def delete_ppp_ipv6_accept_peer_interface_id(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_ipv6_accept_peer_interface_id_path())

    def set_ppp_mppe(self, _unused: str, mode: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_mppe_path(mode))

    def delete_ppp_mppe(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_mppe_delete_path())

    def set_ppp_lcp_echo_failure(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_failure_path(value))

    def delete_ppp_lcp_echo_failure(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_failure_delete_path())

    def set_ppp_lcp_echo_interval(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_interval_path(value))

    def delete_ppp_lcp_echo_interval(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_interval_delete_path())

    def set_ppp_lcp_echo_timeout(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_lcp_echo_timeout_path(value))

    def delete_ppp_lcp_echo_timeout(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_lcp_echo_timeout_delete_path())

    def set_ppp_min_mtu(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_min_mtu_path(value))

    def delete_ppp_min_mtu(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_min_mtu_delete_path())

    def set_ppp_mru(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ppp_mru_path(value))

    def delete_ppp_mru(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ppp_mru_delete_path())

    # ========================================================================
    # LNS Settings
    # ========================================================================

    def set_lns_host_name(self, _unused: str, name: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_lns_host_name_path(name))

    def delete_lns_host_name(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_lns_host_name_delete_path())

    def set_lns_shared_secret(self, _unused: str, secret: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_lns_shared_secret_path(secret))

    def delete_lns_shared_secret(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_lns_shared_secret_delete_path())

    # ========================================================================
    # Limits
    # ========================================================================

    def set_limits_connection_limit(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_connection_limit_path(value))

    def delete_limits_connection_limit(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_connection_limit_delete_path())

    def set_limits_burst(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_burst_path(value))

    def delete_limits_burst(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_burst_delete_path())

    def set_limits_timeout(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_limits_timeout_path(value))

    def delete_limits_timeout(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_limits_timeout_delete_path())

    # ========================================================================
    # Log
    # ========================================================================

    def set_log_level(self, _unused: str, level: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_log_level_path(level))

    def delete_log_level(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_log_level_delete_path())

    # ========================================================================
    # Extended Scripts
    # ========================================================================

    def set_extended_scripts_on_change(self, _unused: str, script: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_change_path(script))

    def delete_extended_scripts_on_change(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_change_delete_path())

    def set_extended_scripts_on_down(self, _unused: str, script: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_down_path(script))

    def delete_extended_scripts_on_down(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_down_delete_path())

    def set_extended_scripts_on_pre_up(self, _unused: str, script: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_pre_up_path(script))

    def delete_extended_scripts_on_pre_up(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_pre_up_delete_path())

    def set_extended_scripts_on_up(self, _unused: str, script: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_extended_scripts_on_up_path(script))

    def delete_extended_scripts_on_up(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_extended_scripts_on_up_delete_path())

    # ========================================================================
    # Shaper
    # ========================================================================

    def set_shaper_fwmark(self, _unused: str, value: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_shaper_fwmark_path(value))

    def delete_shaper_fwmark(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_shaper_fwmark_delete_path())

    # ========================================================================
    # SNMP
    # ========================================================================

    def set_snmp_master_agent(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_snmp_master_agent_path())

    def delete_snmp_master_agent(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_snmp_master_agent_path())

    # ========================================================================
    # Delete entire L2TP
    # ========================================================================

    def delete_l2tp(self, _unused: str) -> "L2TPBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_delete_all_path())

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "features": {
                "general": {
                    "supported": True,
                    "description": "L2TP remote-access VPN server",
                    "settings": ["description", "outside_address", "gateway_address", "mtu",
                                 "name_server", "wins_server", "default_pool", "default_ipv6_pool",
                                 "max_concurrent_sessions", "thread_count"],
                },
                "authentication": {
                    "supported": True,
                    "description": "User authentication (local, RADIUS, noauth)",
                    "modes": ["local", "radius", "noauth"],
                    "protocols": ["pap", "chap", "mschap", "mschap-v2"],
                },
                "local_users": {
                    "supported": True,
                    "description": "Local user management with rate limits",
                },
                "radius": {
                    "supported": True,
                    "description": "RADIUS server configuration",
                    "features": ["dynamic_author", "rate_limit", "preallocate_vif"],
                },
                "ipsec_settings": {
                    "supported": True,
                    "description": "IPSec transport encryption for L2TP",
                    "auth_modes": ["pre-shared-secret", "x509"],
                },
                "client_ip_pools": {
                    "supported": True,
                    "description": "IPv4 client address pools with chaining",
                },
                "client_ipv6_pools": {
                    "supported": True,
                    "description": "IPv6 client address pools with prefix delegation",
                },
                "ppp_options": {
                    "supported": True,
                    "description": "PPP protocol options",
                    "ipv4_modes": ["deny", "allow", "prefer", "require"],
                    "ipv6_modes": ["deny", "allow", "prefer", "require"],
                    "mppe_modes": ["require", "prefer", "deny"],
                },
                "lns": {
                    "supported": True,
                    "description": "L2TP Network Server settings",
                },
                "limits": {
                    "supported": True,
                    "description": "Connection rate limiting",
                },
                "log": {
                    "supported": True,
                    "description": "Logging configuration",
                    "levels": ["0", "1", "2", "3", "4", "5"],
                },
                "extended_scripts": {
                    "supported": True,
                    "description": "Lifecycle event scripts",
                    "events": ["on-change", "on-down", "on-pre-up", "on-up"],
                },
                "shaper": {
                    "supported": True,
                    "description": "Traffic shaping exclusion via fwmark",
                },
                "snmp": {
                    "supported": True,
                    "description": "SNMP master agent integration",
                },
            },
        }
