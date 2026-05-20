"""
System Batch Builder

Builds VyOS batch operations for all system configuration subsections:
  - General (hostname, domain, name-server, time-zone)
  - Login (users, SSH keys, banners, timeout, max-login-session, RADIUS, TACACS)
  - Syslog (version-aware: local/global, remote/host, file, user, marker)
  - Conntrack (modules, TCP, table sizes, flow-accounting, log, ignore rules, timeouts)
  - Config management (revisions, archive)
  - Static host mapping
  - Console devices
  - IP / IPv6 settings
  - Proxy
  - Flow accounting (NetFlow, sFlow)
  - Task scheduler
  - Update check
  - FRR (profile, bmp, descriptors, irdp, snmp)
  - LCD
  - Logs / logrotate
  - System options
  - Acceleration
  - Watchdog (1.5 only)
  - Wireless (1.5 only)
  - Sysctl parameters
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SystemBatchBuilder:
    """Batch builder for system configuration operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mapper = CommandMapperRegistry.get_mapper("system", version)

    # =========================================================================
    # Core helpers
    # =========================================================================

    def add_set(self, path: List[str]) -> "SystemBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SystemBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def clear(self) -> "SystemBatchBuilder":
        self._operations.clear()
        return self

    # =========================================================================
    # General system settings
    # =========================================================================

    def set_hostname(self, hostname: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_hostname_path(hostname))

    def delete_hostname(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_hostname_path())

    def add_name_server(self, ip: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_name_server_path(ip))

    def delete_name_server(self, ip: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_name_server_path(ip))

    def delete_all_name_servers(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_name_server_path())

    def set_domain_name(self, domain: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_domain_name_path(domain))

    def delete_domain_name(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_domain_name_path())

    def add_domain_search(self, domain: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_domain_search_path(domain))

    def delete_domain_search(self, domain: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_domain_search_path(domain))

    def set_time_zone(self, tz: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_time_zone_path(tz))

    def delete_time_zone(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_time_zone_path())

    # =========================================================================
    # Login / Users
    # =========================================================================

    def set_login_user(self, username: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_login_user_path(username))

    def delete_login_user(self, username: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_login_user_path(username))

    def set_user_full_name(self, username: str, full_name: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_user_full_name_path(username, full_name))

    def set_user_plaintext_password(self, username: str, password: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_user_plaintext_password_path(username, password))

    def set_user_encrypted_password(self, username: str, enc_pw: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_user_encrypted_password_path(username, enc_pw))

    def set_user_public_key_type(self, username: str, key_name: str, key_type: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_user_public_key_type_path(username, key_name, key_type))

    def set_user_public_key(self, username: str, key_name: str, key_value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_user_public_key_path(username, key_name, key_value))

    def delete_user_public_key(self, username: str, key_name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_user_public_key_path(username, key_name))

    def set_login_timeout(self, seconds: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_login_timeout_path(seconds))

    def delete_login_timeout(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_login_timeout_path())

    def set_post_login_banner(self, banner: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_post_login_banner_path(banner))

    def delete_post_login_banner(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_post_login_banner_path())

    def set_pre_login_banner(self, banner: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_pre_login_banner_path(banner))

    def delete_pre_login_banner(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_pre_login_banner_path())

    def set_max_login_session(self, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_max_login_session_path(count))

    def delete_max_login_session(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_max_login_session_path())

    # ---- RADIUS ----

    def set_radius_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_path(server))

    def delete_radius_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_radius_server_path(server))

    def set_radius_server_key(self, server: str, key: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_key_path(server, key))

    def set_radius_server_port(self, server: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_port_path(server, port))

    def set_radius_server_priority(self, server: str, priority: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_priority_path(server, priority))

    def set_radius_server_timeout(self, server: str, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_timeout_path(server, timeout))

    def set_radius_server_disable(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_server_disable_path(server))

    def delete_radius_server_disable(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_radius_server_disable_path(server))

    def set_radius_security_mode(self, server: str, mode: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_security_mode_path(mode))

    def set_radius_source_address(self, server: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_source_address_path(addr))

    def delete_radius_source_address(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_radius_source_address_path())

    def set_radius_vrf(self, server: str, vrf: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_radius_vrf_path(vrf))

    def delete_radius_vrf(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_radius_vrf_path())

    def delete_radius(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_radius_path())

    # ---- TACACS ----

    def set_tacacs_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_server_path(server))

    def delete_tacacs_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_tacacs_server_path(server))

    def set_tacacs_server_key(self, server: str, key: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_server_key_path(server, key))

    def set_tacacs_server_port(self, server: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_server_port_path(server, port))

    def set_tacacs_server_disable(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_server_disable_path(server))

    def delete_tacacs_server_disable(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_tacacs_server_disable_path(server))

    def set_tacacs_security_mode(self, server: str, mode: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_security_mode_path(mode))

    def set_tacacs_source_address(self, server: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_source_address_path(addr))

    def delete_tacacs_source_address(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_tacacs_source_address_path())

    def set_tacacs_timeout(self, server: str, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_timeout_path(timeout))

    def delete_tacacs_timeout(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_tacacs_timeout_path())

    def set_tacacs_vrf(self, server: str, vrf: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_tacacs_vrf_path(vrf))

    def delete_tacacs_vrf(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_tacacs_vrf_path())

    def delete_tacacs(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_tacacs_path())

    # ---- Operator group ----

    def set_operator_group_allow(self, group: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_operator_group_allow_path(group, value))

    def delete_operator_group(self, group: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_operator_group_path(group))

    # =========================================================================
    # Syslog
    # =========================================================================

    def set_syslog_local_facility(self, facility: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_local_facility_path(facility, level))

    def delete_syslog_local_facility(self, facility: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_local_facility_path(facility))

    def set_syslog_remote_facility(self, host: str, facility: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_remote_facility_path(host, facility, level))

    def set_syslog_remote_port(self, host: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_remote_port_path(host, port))

    def delete_syslog_remote(self, host: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_remote_path(host))

    def set_syslog_console_facility(self, facility: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_console_facility_path(facility, level))

    def delete_syslog_console_facility(self, facility: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_console_facility_path(facility))

    def set_syslog_preserve_fqdn(self) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_preserve_fqdn_path())

    def delete_syslog_preserve_fqdn(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_preserve_fqdn_path())

    def set_syslog_marker_interval(self, facility: str, interval: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_marker_interval_path(interval))

    def delete_syslog_marker_interval(self, facility: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_marker_interval_path())

    def set_syslog_marker_disable(self, facility: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_marker_disable_path())

    def delete_syslog_marker_disable(self, facility: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_marker_disable_path())

    # 1.4-only syslog targets
    def set_syslog_file_facility(self, filename: str, facility: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_file_facility_path(filename, facility, level))

    def delete_syslog_file(self, filename: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_file_path(filename))

    def set_syslog_user_facility(self, username: str, facility: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_syslog_user_facility_path(username, facility, level))

    def delete_syslog_user(self, username: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_syslog_user_path(username))

    # =========================================================================
    # Conntrack
    # =========================================================================

    def add_conntrack_module(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_module_path(module))

    def delete_conntrack_module(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_module_path(module))

    def set_conntrack_table_size(self, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_table_size_path(size))

    def set_conntrack_hash_size(self, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_hash_size_path(size))

    def set_conntrack_expect_table_size(self, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_expect_table_size_path(size))

    def set_conntrack_tcp_loose(self, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_tcp_loose_path(value))

    def set_conntrack_tcp_half_open(self, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_tcp_half_open_path(count))

    def set_conntrack_tcp_max_retrans(self, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_tcp_max_retrans_path(count))

    def set_conntrack_flow_accounting(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_flow_accounting_path())

    def delete_conntrack_flow_accounting(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_flow_accounting_path())

    # Conntrack log
    def set_conntrack_log_event(self, event: str, protocol: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_log_event_path(event, protocol))

    def delete_conntrack_log_event(self, event: str, protocol: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_log_event_path(event, protocol))

    def set_conntrack_log_level(self, event: str, level: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_log_level_path(level))

    def delete_conntrack_log_level(self, event: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_log_level_path())

    def set_conntrack_log_queue_size(self, event: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_log_queue_size_path(size))

    def delete_conntrack_log_queue_size(self, event: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_log_queue_size_path())

    def set_conntrack_log_timestamp(self, event: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_log_timestamp_path())

    def delete_conntrack_log_timestamp(self, event: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_log_timestamp_path())

    # Conntrack ignore rules
    def set_conntrack_ignore_rule(self, ip_version: str, rule: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_path(ip_version, rule))

    def delete_conntrack_ignore_rule(self, ip_version: str, rule: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_ignore_rule_path(ip_version, rule))

    def set_conntrack_ignore_rule_description(self, ip_version: str, rule: str, desc: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_description_path(ip_version, rule, desc))

    def set_conntrack_ignore_rule_src_address(self, ip_version: str, rule: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_src_address_path(ip_version, rule, addr))

    def set_conntrack_ignore_rule_src_port(self, ip_version: str, rule: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_src_port_path(ip_version, rule, port))

    def set_conntrack_ignore_rule_dst_address(self, ip_version: str, rule: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_dst_address_path(ip_version, rule, addr))

    def set_conntrack_ignore_rule_dst_port(self, ip_version: str, rule: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_dst_port_path(ip_version, rule, port))

    def set_conntrack_ignore_rule_protocol(self, ip_version: str, rule: str, proto: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_protocol_path(ip_version, rule, proto))

    def set_conntrack_ignore_rule_inbound_interface(self, ip_version: str, rule: str, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_ignore_rule_inbound_interface_path(ip_version, rule, iface))

    # Conntrack global timeouts (1.4 only — paths return [] on 1.5)
    def set_conntrack_timeout_icmp(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_icmp_path(value))

    def set_conntrack_timeout_other(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_other_path(value))

    def set_conntrack_timeout_tcp(self, state: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_tcp_path(state, value))

    def set_conntrack_timeout_udp(self, subtype: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_udp_path(subtype, value))

    # Conntrack timeout custom rules
    def set_conntrack_timeout_custom_rule(self, ip_version: str, rule: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_path(ip_version, rule))

    def delete_conntrack_timeout_custom_rule(self, ip_version: str, rule: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_conntrack_timeout_custom_rule_path(ip_version, rule))

    def set_conntrack_timeout_custom_rule_description(self, ip_version: str, rule: str, desc: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_description_path(ip_version, rule, desc))

    def set_conntrack_timeout_custom_rule_src_address(self, ip_version: str, rule: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_src_address_path(ip_version, rule, addr))

    def set_conntrack_timeout_custom_rule_src_port(self, ip_version: str, rule: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_src_port_path(ip_version, rule, port))

    def set_conntrack_timeout_custom_rule_dst_address(self, ip_version: str, rule: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_dst_address_path(ip_version, rule, addr))

    def set_conntrack_timeout_custom_rule_dst_port(self, ip_version: str, rule: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_dst_port_path(ip_version, rule, port))

    def set_conntrack_timeout_custom_rule_inbound_interface(self, ip_version: str, rule: str, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_inbound_interface_path(ip_version, rule, iface))

    def set_conntrack_timeout_custom_rule_tcp_state(self, ip_version: str, rule: str, state: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_tcp_state_path(ip_version, rule, state, value))

    def set_conntrack_timeout_custom_rule_udp_state(self, ip_version: str, rule: str, subtype: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_conntrack_timeout_custom_rule_udp_state_path(ip_version, rule, subtype, value))

    # =========================================================================
    # Config management
    # =========================================================================

    def set_commit_revisions(self, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_commit_revisions_path(count))

    def add_commit_archive_location(self, url: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_commit_archive_location_path(url))

    def delete_commit_archive_location(self, url: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_commit_archive_location_path(url))

    def delete_commit_archive(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_commit_archive_path())

    # =========================================================================
    # Static host mapping
    # =========================================================================

    def set_static_host(self, hostname: str, ip: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_static_host_inet_path(hostname, ip))

    def delete_static_host(self, hostname: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_static_host_path(hostname))

    def add_static_host_alias(self, hostname: str, alias: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_static_host_alias_path(hostname, alias))

    def delete_static_host_alias(self, hostname: str, alias: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_static_host_alias_path(hostname, alias))

    # =========================================================================
    # Console
    # =========================================================================

    def set_console_speed(self, device: str, speed: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_console_speed_path(device, speed))

    def delete_console_device(self, device: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_console_device_path(device))

    def set_console_powersave(self) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_console_powersave_path())

    def delete_console_powersave(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_console_powersave_path())

    # =========================================================================
    # Watchdog (1.5 only)
    # =========================================================================

    def set_watchdog_timeout(self, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_watchdog_timeout_path(timeout))

    def delete_watchdog_timeout(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_watchdog_timeout_path())

    def set_watchdog_reboot_timeout(self, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_watchdog_reboot_timeout_path(timeout))

    # =========================================================================
    # Wireless (1.5 only)
    # =========================================================================

    def set_wireless_country_code(self, code: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_wireless_country_code_path(code))

    def delete_wireless_country_code(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_wireless_country_code_path())

    # =========================================================================
    # FRR profile and extensions
    # =========================================================================

    def set_frr_profile(self, profile: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_profile_path(profile))

    def delete_frr_profile(self) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_profile_path())

    def set_frr_bmp(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_bmp_path())

    def delete_frr_bmp(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_bmp_path())

    def set_frr_bmp_target(self, name: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_bmp_target_path(name))

    def delete_frr_bmp_target(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_bmp_target_path(name))

    def set_frr_bmp_target_address(self, name: str, address: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_bmp_target_address_path(name, address))

    def delete_frr_bmp_target_address(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_bmp_target_address_path(name))

    def set_frr_bmp_target_port(self, name: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_bmp_target_port_path(name, port))

    def delete_frr_bmp_target_port(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_bmp_target_port_path(name))

    def set_frr_descriptors(self, module: str, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_descriptors_path(count))

    def delete_frr_descriptors(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_descriptors_path())

    def set_frr_irdp(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_irdp_path())

    def delete_frr_irdp(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_irdp_path())

    def set_frr_snmp_daemon(self, daemon: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_frr_snmp_daemon_path(daemon))

    def delete_frr_snmp_daemon(self, daemon: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_frr_snmp_daemon_path(daemon))

    # =========================================================================
    # Sysctl parameters
    # =========================================================================

    def set_sysctl_parameter(self, param: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sysctl_parameter_path(param, value))

    def delete_sysctl_parameter(self, param: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sysctl_parameter_path(param))

    # =========================================================================
    # IP settings
    # =========================================================================

    def set_ip_arp_table_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_arp_table_size_path(size))

    def delete_ip_arp_table_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_arp_table_size_path())

    def set_ip_disable_forwarding(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_disable_forwarding_path())

    def delete_ip_disable_forwarding(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_disable_forwarding_path())

    def set_ip_import_table(self, module: str, table: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_import_table_path(table))

    def delete_ip_import_table(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_import_table_path())

    def set_ip_multipath_layer4_hashing(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_multipath_layer4_hashing_path())

    def delete_ip_multipath_layer4_hashing(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_multipath_layer4_hashing_path())

    def set_ip_multipath_ignore_unreachable(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_multipath_ignore_unreachable_path())

    def delete_ip_multipath_ignore_unreachable(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_multipath_ignore_unreachable_path())

    def set_ip_nht_no_resolve_via_default(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_nht_no_resolve_via_default_path())

    def delete_ip_nht_no_resolve_via_default(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_nht_no_resolve_via_default_path())

    def set_ip_tcp_mss_base(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_tcp_mss_base_path(value))

    def delete_ip_tcp_mss_base(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_tcp_mss_base_path())

    def set_ip_tcp_mss_floor(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_tcp_mss_floor_path(value))

    def delete_ip_tcp_mss_floor(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_tcp_mss_floor_path())

    def set_ip_tcp_mss_probing(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ip_tcp_mss_probing_path())

    def delete_ip_tcp_mss_probing(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ip_tcp_mss_probing_path())

    # =========================================================================
    # IPv6 settings
    # =========================================================================

    def set_ipv6_disable_forwarding(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ipv6_disable_forwarding_path())

    def delete_ipv6_disable_forwarding(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ipv6_disable_forwarding_path())

    def set_ipv6_neighbor_table_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ipv6_neighbor_table_size_path(size))

    def delete_ipv6_neighbor_table_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ipv6_neighbor_table_size_path())

    def set_ipv6_multipath_layer4_hashing(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ipv6_multipath_layer4_hashing_path())

    def delete_ipv6_multipath_layer4_hashing(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ipv6_multipath_layer4_hashing_path())

    def set_ipv6_nht_no_resolve_via_default(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ipv6_nht_no_resolve_via_default_path())

    def delete_ipv6_nht_no_resolve_via_default(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ipv6_nht_no_resolve_via_default_path())

    def set_ipv6_strict_dad(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_ipv6_strict_dad_path())

    def delete_ipv6_strict_dad(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_ipv6_strict_dad_path())

    # =========================================================================
    # LCD
    # =========================================================================

    def set_lcd_device(self, module: str, device: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_lcd_device_path(device))

    def delete_lcd_device(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_lcd_device_path())

    def set_lcd_model(self, module: str, model: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_lcd_model_path(model))

    def delete_lcd_model(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_lcd_model_path())

    def delete_lcd(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_lcd_path())

    # =========================================================================
    # Logs / logrotate
    # =========================================================================

    def set_logrotate_atop_max_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_logrotate_atop_max_size_path(size))

    def delete_logrotate_atop_max_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_logrotate_atop_max_size_path())

    def set_logrotate_atop_rotate(self, module: str, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_logrotate_atop_rotate_path(count))

    def delete_logrotate_atop_rotate(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_logrotate_atop_rotate_path())

    def set_logrotate_messages_max_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_logrotate_messages_max_size_path(size))

    def delete_logrotate_messages_max_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_logrotate_messages_max_size_path())

    def set_logrotate_messages_rotate(self, module: str, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_logrotate_messages_rotate_path(count))

    def delete_logrotate_messages_rotate(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_logrotate_messages_rotate_path())

    # =========================================================================
    # System options
    # =========================================================================

    def set_option_ctrl_alt_delete(self, module: str, action: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_ctrl_alt_delete_path(action))

    def delete_option_ctrl_alt_delete(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_ctrl_alt_delete_path())

    def set_option_disable_usb_autosuspend(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_disable_usb_autosuspend_path())

    def delete_option_disable_usb_autosuspend(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_disable_usb_autosuspend_path())

    def set_option_http_client_source_address(self, module: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_http_client_source_address_path(addr))

    def delete_option_http_client_source_address(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_http_client_source_address_path())

    def set_option_http_client_source_interface(self, module: str, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_http_client_source_interface_path(iface))

    def delete_option_http_client_source_interface(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_http_client_source_interface_path())

    def set_option_ssh_client_source_address(self, module: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_ssh_client_source_address_path(addr))

    def delete_option_ssh_client_source_address(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_ssh_client_source_address_path())

    def set_option_ssh_client_source_interface(self, module: str, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_ssh_client_source_interface_path(iface))

    def delete_option_ssh_client_source_interface(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_ssh_client_source_interface_path())

    def set_option_keyboard_layout(self, module: str, layout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_keyboard_layout_path(layout))

    def delete_option_keyboard_layout(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_keyboard_layout_path())

    def set_option_reboot_on_panic(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_reboot_on_panic_path())

    def delete_option_reboot_on_panic(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_reboot_on_panic_path())

    def set_option_reboot_on_upgrade_failure(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_reboot_on_upgrade_failure_path())

    def delete_option_reboot_on_upgrade_failure(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_reboot_on_upgrade_failure_path())

    def set_option_root_partition_auto_resize(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_root_partition_auto_resize_path())

    def delete_option_root_partition_auto_resize(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_root_partition_auto_resize_path())

    def set_option_startup_beep(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_startup_beep_path())

    def delete_option_startup_beep(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_startup_beep_path())

    def set_option_time_format(self, module: str, fmt: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_time_format_path(fmt))

    def delete_option_time_format(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_time_format_path())

    def set_option_resource_limits_max_map_count(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_resource_limits_max_map_count_path(value))

    def delete_option_resource_limits_max_map_count(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_resource_limits_max_map_count_path())

    def set_option_resource_limits_shmmax(self, module: str, value: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_resource_limits_shmmax_path(value))

    def delete_option_resource_limits_shmmax(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_resource_limits_shmmax_path())

    # Kernel options
    def set_option_kernel_quiet(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_quiet_path())

    def delete_option_kernel_quiet(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_quiet_path())

    def set_option_kernel_disable_mitigations(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_disable_mitigations_path())

    def delete_option_kernel_disable_mitigations(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_disable_mitigations_path())

    def set_option_kernel_disable_power_saving(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_disable_power_saving_path())

    def delete_option_kernel_disable_power_saving(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_disable_power_saving_path())

    def set_option_kernel_disable_hpet(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_disable_hpet_path())

    def delete_option_kernel_disable_hpet(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_disable_hpet_path())

    def set_option_kernel_disable_mce(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_disable_mce_path())

    def delete_option_kernel_disable_mce(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_disable_mce_path())

    def set_option_kernel_disable_softlockup(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_disable_softlockup_path())

    def delete_option_kernel_disable_softlockup(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_disable_softlockup_path())

    def set_option_kernel_debug_wireguard(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_debug_wireguard_path())

    def delete_option_kernel_debug_wireguard(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_debug_wireguard_path())

    def set_option_kernel_amd_pstate_driver(self, module: str, driver: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_amd_pstate_driver_path(driver))

    def delete_option_kernel_amd_pstate_driver(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_amd_pstate_driver_path())

    def set_option_kernel_cpu_disable_nmi_watchdog(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_cpu_disable_nmi_watchdog_path())

    def delete_option_kernel_cpu_disable_nmi_watchdog(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_cpu_disable_nmi_watchdog_path())

    def set_option_kernel_cpu_isolate(self, module: str, cpus: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_cpu_isolate_path(cpus))

    def delete_option_kernel_cpu_isolate(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_cpu_isolate_path())

    def set_option_kernel_cpu_nohz_full(self, module: str, cpus: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_cpu_nohz_full_path(cpus))

    def delete_option_kernel_cpu_nohz_full(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_cpu_nohz_full_path())

    def set_option_kernel_cpu_rcu_no_cbs(self, module: str, cpus: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_cpu_rcu_no_cbs_path(cpus))

    def delete_option_kernel_cpu_rcu_no_cbs(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_cpu_rcu_no_cbs_path())

    def set_option_kernel_memory_default_hugepage_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_memory_default_hugepage_size_path(size))

    def delete_option_kernel_memory_default_hugepage_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_memory_default_hugepage_size_path())

    def set_option_kernel_memory_disable_numa_balancing(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_memory_disable_numa_balancing_path())

    def delete_option_kernel_memory_disable_numa_balancing(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_memory_disable_numa_balancing_path())

    def set_option_kernel_memory_hugepage_size(self, module: str, size: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_option_kernel_memory_hugepage_size_path(size))

    def delete_option_kernel_memory_hugepage_size(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_option_kernel_memory_hugepage_size_path())

    # =========================================================================
    # Proxy
    # =========================================================================

    def set_proxy_url(self, module: str, url: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_proxy_url_path(url))

    def delete_proxy_url(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_url_path())

    def set_proxy_port(self, module: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_proxy_port_path(port))

    def delete_proxy_port(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_port_path())

    def set_proxy_username(self, module: str, username: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_proxy_username_path(username))

    def delete_proxy_username(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_username_path())

    def set_proxy_password(self, module: str, password: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_proxy_password_path(password))

    def delete_proxy_password(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_password_path())

    def add_proxy_no_proxy(self, host: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_proxy_no_proxy_path(host))

    def delete_proxy_no_proxy(self, host: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_no_proxy_path(host))

    def delete_proxy(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_proxy_path())

    # =========================================================================
    # Flow accounting
    # =========================================================================

    def set_flow_accounting_enable_egress(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_enable_egress_path())

    def delete_flow_accounting_enable_egress(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_enable_egress_path())

    def set_flow_accounting_interface(self, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_interface_path(iface))

    def delete_flow_accounting_interface(self, iface: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_interface_path(iface))

    def set_flow_accounting_netflow_engine_id(self, module: str, engine_id: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_engine_id_path(engine_id))

    def delete_flow_accounting_netflow_engine_id(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_netflow_engine_id_path())

    def set_flow_accounting_netflow_max_flows(self, module: str, count: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_max_flows_path(count))

    def delete_flow_accounting_netflow_max_flows(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_netflow_max_flows_path())

    def set_flow_accounting_netflow_sampling_rate(self, module: str, rate: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_sampling_rate_path(rate))

    def delete_flow_accounting_netflow_sampling_rate(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_netflow_sampling_rate_path())

    def set_flow_accounting_netflow_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_server_path(server))

    def delete_flow_accounting_netflow_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_netflow_server_path(server))

    def set_flow_accounting_netflow_server_port(self, server: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_server_port_path(server, port))

    def set_flow_accounting_netflow_version(self, module: str, version: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_version_path(version))

    def delete_flow_accounting_netflow_version(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_netflow_version_path())

    def set_flow_accounting_netflow_active_timeout(self, module: str, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_active_timeout_path(timeout))

    def set_flow_accounting_netflow_inactive_timeout(self, module: str, timeout: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_netflow_inactive_timeout_path(timeout))

    def set_flow_accounting_vrf(self, module: str, vrf: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_flow_accounting_vrf_path(vrf))

    def delete_flow_accounting_vrf(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_vrf_path())

    def delete_flow_accounting(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_flow_accounting_path())

    # =========================================================================
    # sFlow
    # =========================================================================

    def set_sflow_agent_address(self, module: str, addr: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_agent_address_path(addr))

    def delete_sflow_agent_address(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_agent_address_path())

    def set_sflow_agent_interface(self, module: str, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_agent_interface_path(iface))

    def delete_sflow_agent_interface(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_agent_interface_path())

    def set_sflow_drop_monitor_limit(self, module: str, limit: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_drop_monitor_limit_path(limit))

    def delete_sflow_drop_monitor_limit(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_drop_monitor_limit_path())

    def set_sflow_enable_egress(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_enable_egress_path())

    def delete_sflow_enable_egress(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_enable_egress_path())

    def set_sflow_interface(self, iface: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_interface_path(iface))

    def delete_sflow_interface(self, iface: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_interface_path(iface))

    def set_sflow_polling(self, module: str, interval: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_polling_path(interval))

    def delete_sflow_polling(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_polling_path())

    def set_sflow_sampling_rate(self, module: str, rate: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_sampling_rate_path(rate))

    def delete_sflow_sampling_rate(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_sampling_rate_path())

    def set_sflow_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_server_path(server))

    def delete_sflow_server(self, server: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_server_path(server))

    def set_sflow_server_port(self, server: str, port: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_server_port_path(server, port))

    def set_sflow_vrf(self, module: str, vrf: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_sflow_vrf_path(vrf))

    def delete_sflow_vrf(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_vrf_path())

    def delete_sflow(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_sflow_path())

    # =========================================================================
    # Task scheduler
    # =========================================================================

    def set_task_scheduler_task(self, name: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_task_scheduler_task_path(name))

    def delete_task_scheduler_task(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_task_scheduler_task_path(name))

    def set_task_crontab_spec(self, name: str, spec: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_task_crontab_spec_path(name, spec))

    def delete_task_crontab_spec(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_task_crontab_spec_path(name))

    def set_task_interval(self, name: str, interval: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_task_interval_path(name, interval))

    def delete_task_interval(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_task_interval_path(name))

    def set_task_executable_path(self, name: str, path: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_task_executable_path_path(name, path))

    def delete_task_executable_path(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_task_executable_path_path(name))

    def set_task_executable_arguments(self, name: str, args: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_task_executable_arguments_path(name, args))

    def delete_task_executable_arguments(self, name: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_task_executable_arguments_path(name))

    # =========================================================================
    # Update check
    # =========================================================================

    def set_update_check_auto_check(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_update_check_auto_check_path())

    def delete_update_check_auto_check(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_update_check_auto_check_path())

    def set_update_check_url(self, module: str, url: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_update_check_url_path(url))

    def delete_update_check_url(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_update_check_url_path())

    # =========================================================================
    # Acceleration
    # =========================================================================

    def set_acceleration_qat(self, module: str) -> "SystemBatchBuilder":
        return self.add_set(self.mapper.get_acceleration_qat_path())

    def delete_acceleration_qat(self, module: str) -> "SystemBatchBuilder":
        return self.add_delete(self.mapper.get_delete_acceleration_qat_path())

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = self.version.startswith("1.4")
        is_v15 = not is_v14

        return {
            "version": self.version,
            "syslog": {
                "local_target": "global" if is_v14 else "local",
                "remote_target": "host" if is_v14 else "remote",
                "supports_console": self.mapper.supports_syslog_console(),
                "supports_file": self.mapper.supports_syslog_file(),
                "supports_user": self.mapper.supports_syslog_user(),
                "supports_marker_disable": self.mapper.supports_syslog_marker_disable(),
                "facilities": [
                    "all", "auth", "authpriv", "cron", "daemon", "kern", "lpr",
                    "mail", "mark", "news", "protocols", "security", "syslog",
                    "user", "uucp",
                    "local0", "local1", "local2", "local3",
                    "local4", "local5", "local6", "local7",
                ],
                "levels": ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"],
            },
            "conntrack": {
                "available_modules": self.mapper.get_available_conntrack_modules(),
                "supports_global_timeouts": self.mapper.supports_conntrack_global_timeouts(),
            },
            "login": {
                "supports_operator_group": self.mapper.supports_operator_group(),
            },
            "features": {
                "watchdog": {"supported": self.mapper.supports_watchdog()},
                "wireless": {"supported": self.mapper.supports_wireless()},
                "frr_profile": {
                    "supported": self.mapper.supports_frr_profile(),
                    "profiles": ["datacenter", "traditional", "traditional-with-members"] if is_v15 else [],
                },
                "standalone_sflow": {"supported": self.mapper.supports_standalone_sflow()},
                "resource_limits": {"supported": self.mapper.supports_resource_limits()},
            },
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
        }
