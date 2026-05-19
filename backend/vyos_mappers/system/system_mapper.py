"""
System Command Mapper - Base

Provides version-agnostic path generation for system configuration.
Defaults to VyOS 1.5 paths; version-specific classes override where needed.
"""

from typing import List, Optional
from ..base import BaseFeatureMapper


class SystemMapper(BaseFeatureMapper):
    """Base system mapper. Uses VyOS 1.5 path conventions."""

    def __init__(self, version: str):
        super().__init__(version)

    # =========================================================================
    # General system settings
    # =========================================================================

    def get_hostname_path(self, hostname: str) -> List[str]:
        return ["system", "host-name", hostname]

    def get_delete_hostname_path(self) -> List[str]:
        return ["system", "host-name"]

    def get_domain_name_path(self, domain: str) -> List[str]:
        return ["system", "domain-name", domain]

    def get_delete_domain_name_path(self) -> List[str]:
        return ["system", "domain-name"]

    def get_name_server_path(self, ip: str) -> List[str]:
        return ["system", "name-server", ip]

    def get_delete_name_server_path(self, ip: Optional[str] = None) -> List[str]:
        if ip:
            return ["system", "name-server", ip]
        return ["system", "name-server"]

    def get_domain_search_path(self, domain: str) -> List[str]:
        return ["system", "domain-search", "domain", domain]

    def get_delete_domain_search_path(self, domain: str) -> List[str]:
        return ["system", "domain-search", "domain", domain]

    def get_time_zone_path(self, tz: str) -> List[str]:
        return ["system", "time-zone", tz]

    def get_delete_time_zone_path(self) -> List[str]:
        return ["system", "time-zone"]

    # =========================================================================
    # Login / Users
    # =========================================================================

    def get_login_user_path(self, username: str) -> List[str]:
        return ["system", "login", "user", username]

    def get_delete_login_user_path(self, username: str) -> List[str]:
        return ["system", "login", "user", username]

    def get_user_full_name_path(self, username: str, full_name: str) -> List[str]:
        return ["system", "login", "user", username, "full-name", full_name]

    def get_user_plaintext_password_path(self, username: str, password: str) -> List[str]:
        return ["system", "login", "user", username, "authentication", "plaintext-password", password]

    def get_user_encrypted_password_path(self, username: str, enc_pw: str) -> List[str]:
        return ["system", "login", "user", username, "authentication", "encrypted-password", enc_pw]

    def get_user_public_key_type_path(self, username: str, key_name: str, key_type: str) -> List[str]:
        return ["system", "login", "user", username, "authentication", "public-keys", key_name, "type", key_type]

    def get_user_public_key_path(self, username: str, key_name: str, key_value: str) -> List[str]:
        return ["system", "login", "user", username, "authentication", "public-keys", key_name, "key", key_value]

    def get_delete_user_public_key_path(self, username: str, key_name: str) -> List[str]:
        return ["system", "login", "user", username, "authentication", "public-keys", key_name]

    def get_login_timeout_path(self, seconds: str) -> List[str]:
        return ["system", "login", "timeout", seconds]

    def get_delete_login_timeout_path(self) -> List[str]:
        return ["system", "login", "timeout"]

    def get_post_login_banner_path(self, banner: str) -> List[str]:
        return ["system", "login", "banner", "post-login", banner]

    def get_delete_post_login_banner_path(self) -> List[str]:
        return ["system", "login", "banner", "post-login"]

    def get_pre_login_banner_path(self, banner: str) -> List[str]:
        return ["system", "login", "banner", "pre-login", banner]

    def get_delete_pre_login_banner_path(self) -> List[str]:
        return ["system", "login", "banner", "pre-login"]

    def get_max_login_session_path(self, count: str) -> List[str]:
        return ["system", "login", "max-login-session", count]

    def get_delete_max_login_session_path(self) -> List[str]:
        return ["system", "login", "max-login-session"]

    # ---- RADIUS ----

    def get_radius_server_path(self, server: str) -> List[str]:
        return ["system", "login", "radius", "server", server]

    def get_delete_radius_server_path(self, server: str) -> List[str]:
        return ["system", "login", "radius", "server", server]

    def get_radius_server_key_path(self, server: str, key: str) -> List[str]:
        return ["system", "login", "radius", "server", server, "key", key]

    def get_radius_server_port_path(self, server: str, port: str) -> List[str]:
        return ["system", "login", "radius", "server", server, "port", port]

    def get_radius_server_priority_path(self, server: str, priority: str) -> List[str]:
        return ["system", "login", "radius", "server", server, "priority", priority]

    def get_radius_server_timeout_path(self, server: str, timeout: str) -> List[str]:
        return ["system", "login", "radius", "server", server, "timeout", timeout]

    def get_radius_server_disable_path(self, server: str) -> List[str]:
        return ["system", "login", "radius", "server", server, "disable"]

    def get_radius_security_mode_path(self, mode: str) -> List[str]:
        return ["system", "login", "radius", "security-mode", mode]

    def get_radius_source_address_path(self, addr: str) -> List[str]:
        return ["system", "login", "radius", "source-address", addr]

    def get_delete_radius_source_address_path(self) -> List[str]:
        return ["system", "login", "radius", "source-address"]

    def get_radius_vrf_path(self, vrf: str) -> List[str]:
        return ["system", "login", "radius", "vrf", vrf]

    def get_delete_radius_vrf_path(self) -> List[str]:
        return ["system", "login", "radius", "vrf"]

    def get_delete_radius_path(self) -> List[str]:
        return ["system", "login", "radius"]

    # ---- TACACS ----

    def get_tacacs_server_path(self, server: str) -> List[str]:
        return ["system", "login", "tacacs", "server", server]

    def get_delete_tacacs_server_path(self, server: str) -> List[str]:
        return ["system", "login", "tacacs", "server", server]

    def get_tacacs_server_key_path(self, server: str, key: str) -> List[str]:
        return ["system", "login", "tacacs", "server", server, "key", key]

    def get_tacacs_server_port_path(self, server: str, port: str) -> List[str]:
        return ["system", "login", "tacacs", "server", server, "port", port]

    def get_tacacs_server_disable_path(self, server: str) -> List[str]:
        return ["system", "login", "tacacs", "server", server, "disable"]

    def get_tacacs_security_mode_path(self, mode: str) -> List[str]:
        return ["system", "login", "tacacs", "security-mode", mode]

    def get_tacacs_source_address_path(self, addr: str) -> List[str]:
        return ["system", "login", "tacacs", "source-address", addr]

    def get_delete_tacacs_source_address_path(self) -> List[str]:
        return ["system", "login", "tacacs", "source-address"]

    def get_tacacs_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "login", "tacacs", "timeout", timeout]

    def get_delete_tacacs_timeout_path(self) -> List[str]:
        return ["system", "login", "tacacs", "timeout"]

    def get_tacacs_vrf_path(self, vrf: str) -> List[str]:
        return ["system", "login", "tacacs", "vrf", vrf]

    def get_delete_tacacs_vrf_path(self) -> List[str]:
        return ["system", "login", "tacacs", "vrf"]

    def get_delete_tacacs_path(self) -> List[str]:
        return ["system", "login", "tacacs"]

    # =========================================================================
    # Syslog - VyOS 1.5 defaults (local/remote/console)
    # =========================================================================

    def get_syslog_local_facility_path(self, facility: str, level: str) -> List[str]:
        """1.5: system syslog local facility <f> level <l>"""
        return ["system", "syslog", "local", "facility", facility, "level", level]

    def get_delete_syslog_local_facility_path(self, facility: str) -> List[str]:
        return ["system", "syslog", "local", "facility", facility]

    def get_delete_syslog_local_path(self) -> List[str]:
        return ["system", "syslog", "local"]

    def get_syslog_remote_facility_path(self, host: str, facility: str, level: str) -> List[str]:
        """1.5: system syslog remote <host> facility <f> level <l>"""
        return ["system", "syslog", "remote", host, "facility", facility, "level", level]

    def get_syslog_remote_port_path(self, host: str, port: str) -> List[str]:
        return ["system", "syslog", "remote", host, "port", port]

    def get_delete_syslog_remote_path(self, host: str) -> List[str]:
        return ["system", "syslog", "remote", host]

    def get_syslog_console_facility_path(self, facility: str, level: str) -> List[str]:
        return ["system", "syslog", "console", "facility", facility, "level", level]

    def get_delete_syslog_console_facility_path(self, facility: str) -> List[str]:
        return ["system", "syslog", "console", "facility", facility]

    def get_syslog_preserve_fqdn_path(self) -> List[str]:
        return ["system", "syslog", "preserve-fqdn"]

    def get_delete_syslog_preserve_fqdn_path(self) -> List[str]:
        return ["system", "syslog", "preserve-fqdn"]

    # Syslog marker (1.5: top-level; 1.4 overrides to put under global)
    def get_syslog_marker_interval_path(self, interval: str) -> List[str]:
        return ["system", "syslog", "marker", "interval", interval]

    def get_delete_syslog_marker_interval_path(self) -> List[str]:
        return ["system", "syslog", "marker", "interval"]

    def get_syslog_marker_disable_path(self) -> List[str]:
        return ["system", "syslog", "marker", "disable"]

    def get_delete_syslog_marker_disable_path(self) -> List[str]:
        return ["system", "syslog", "marker", "disable"]

    # 1.4-style syslog paths (used by v1_4 override; kept in base for graceful fallback)
    def get_syslog_file_facility_path(self, filename: str, facility: str, level: str) -> List[str]:
        return ["system", "syslog", "file", filename, "facility", facility, "level", level]

    def get_delete_syslog_file_path(self, filename: str) -> List[str]:
        return ["system", "syslog", "file", filename]

    def get_syslog_user_facility_path(self, username: str, facility: str, level: str) -> List[str]:
        return ["system", "syslog", "user", username, "facility", facility, "level", level]

    def get_delete_syslog_user_path(self, username: str) -> List[str]:
        return ["system", "syslog", "user", username]

    # Config parsing helpers (version-specific keys override these)
    def get_syslog_local_config_key(self) -> str:
        return "local"

    def get_syslog_remote_config_key(self) -> str:
        return "remote"

    def supports_syslog_console(self) -> bool:
        return True

    def supports_syslog_file(self) -> bool:
        return False

    def supports_syslog_user(self) -> bool:
        return False

    def supports_syslog_marker_disable(self) -> bool:
        return True

    # =========================================================================
    # Conntrack
    # =========================================================================

    def get_conntrack_module_path(self, module: str) -> List[str]:
        return ["system", "conntrack", "modules", module]

    def get_delete_conntrack_module_path(self, module: str) -> List[str]:
        return ["system", "conntrack", "modules", module]

    def get_conntrack_table_size_path(self, size: str) -> List[str]:
        return ["system", "conntrack", "table-size", size]

    def get_conntrack_hash_size_path(self, size: str) -> List[str]:
        return ["system", "conntrack", "hash-size", size]

    def get_conntrack_expect_table_size_path(self, size: str) -> List[str]:
        return ["system", "conntrack", "expect-table-size", size]

    def get_conntrack_tcp_loose_path(self, value: str) -> List[str]:
        return ["system", "conntrack", "tcp", "loose", value]

    def get_conntrack_tcp_half_open_path(self, count: str) -> List[str]:
        return ["system", "conntrack", "tcp", "half-open-connections", count]

    def get_conntrack_tcp_max_retrans_path(self, count: str) -> List[str]:
        return ["system", "conntrack", "tcp", "max-retrans", count]

    def get_conntrack_flow_accounting_path(self) -> List[str]:
        return ["system", "conntrack", "flow-accounting"]

    def get_delete_conntrack_flow_accounting_path(self) -> List[str]:
        return ["system", "conntrack", "flow-accounting"]

    # Conntrack log
    def get_conntrack_log_event_path(self, event: str, protocol: str) -> List[str]:
        return ["system", "conntrack", "log", "event", event, protocol]

    def get_delete_conntrack_log_event_path(self, event: str, protocol: str) -> List[str]:
        return ["system", "conntrack", "log", "event", event, protocol]

    def get_conntrack_log_level_path(self, level: str) -> List[str]:
        return ["system", "conntrack", "log", "log-level", level]

    def get_delete_conntrack_log_level_path(self) -> List[str]:
        return ["system", "conntrack", "log", "log-level"]

    def get_conntrack_log_queue_size_path(self, size: str) -> List[str]:
        return ["system", "conntrack", "log", "queue-size", size]

    def get_delete_conntrack_log_queue_size_path(self) -> List[str]:
        return ["system", "conntrack", "log", "queue-size"]

    def get_conntrack_log_timestamp_path(self) -> List[str]:
        return ["system", "conntrack", "log", "timestamp"]

    def get_delete_conntrack_log_timestamp_path(self) -> List[str]:
        return ["system", "conntrack", "log", "timestamp"]

    # Conntrack ignore rules
    def get_conntrack_ignore_rule_path(self, ip_version: str, rule: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule]

    def get_delete_conntrack_ignore_rule_path(self, ip_version: str, rule: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule]

    def get_conntrack_ignore_rule_description_path(self, ip_version: str, rule: str, desc: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "description", desc]

    def get_conntrack_ignore_rule_src_address_path(self, ip_version: str, rule: str, addr: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "source", "address", addr]

    def get_conntrack_ignore_rule_src_port_path(self, ip_version: str, rule: str, port: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "source", "port", port]

    def get_conntrack_ignore_rule_dst_address_path(self, ip_version: str, rule: str, addr: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "destination", "address", addr]

    def get_conntrack_ignore_rule_dst_port_path(self, ip_version: str, rule: str, port: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "destination", "port", port]

    def get_conntrack_ignore_rule_protocol_path(self, ip_version: str, rule: str, proto: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "protocol", proto]

    def get_conntrack_ignore_rule_inbound_interface_path(self, ip_version: str, rule: str, iface: str) -> List[str]:
        return ["system", "conntrack", "ignore", ip_version, "rule", rule, "inbound-interface", iface]

    # Conntrack global timeouts (1.4 only — base returns paths, v1_4 overrides)
    def get_conntrack_timeout_icmp_path(self, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "icmp", value]

    def get_conntrack_timeout_other_path(self, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "other", value]

    def get_conntrack_timeout_tcp_path(self, state: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "tcp", state, value]

    def get_conntrack_timeout_udp_path(self, subtype: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "udp", subtype, value]

    # Conntrack timeout custom rules
    def get_conntrack_timeout_custom_rule_path(self, ip_version: str, rule: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule]

    def get_delete_conntrack_timeout_custom_rule_path(self, ip_version: str, rule: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule]

    def get_conntrack_timeout_custom_rule_description_path(self, ip_version: str, rule: str, desc: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "description", desc]

    def get_conntrack_timeout_custom_rule_src_address_path(self, ip_version: str, rule: str, addr: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "source", "address", addr]

    def get_conntrack_timeout_custom_rule_src_port_path(self, ip_version: str, rule: str, port: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "source", "port", port]

    def get_conntrack_timeout_custom_rule_dst_address_path(self, ip_version: str, rule: str, addr: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "destination", "address", addr]

    def get_conntrack_timeout_custom_rule_dst_port_path(self, ip_version: str, rule: str, port: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "destination", "port", port]

    def get_conntrack_timeout_custom_rule_inbound_interface_path(self, ip_version: str, rule: str, iface: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "inbound-interface", iface]

    def get_conntrack_timeout_custom_rule_tcp_state_path(self, ip_version: str, rule: str, state: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "protocol", "tcp", state, value]

    def get_conntrack_timeout_custom_rule_udp_state_path(self, ip_version: str, rule: str, subtype: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "custom", ip_version, "rule", rule, "protocol", "udp", subtype, value]

    def get_available_conntrack_modules(self) -> List[str]:
        return ["ftp", "h323", "nfs", "pptp", "sip", "sqlnet", "tftp"]

    def supports_conntrack_global_timeouts(self) -> bool:
        return False

    # =========================================================================
    # Config management
    # =========================================================================

    def get_commit_revisions_path(self, count: str) -> List[str]:
        return ["system", "config-management", "commit-revisions", count]

    def get_commit_archive_location_path(self, url: str) -> List[str]:
        return ["system", "config-management", "commit-archive", "location", url]

    def get_delete_commit_archive_location_path(self, url: str) -> List[str]:
        return ["system", "config-management", "commit-archive", "location", url]

    def get_delete_commit_archive_path(self) -> List[str]:
        return ["system", "config-management", "commit-archive"]

    # =========================================================================
    # Static host mapping
    # =========================================================================

    def get_static_host_inet_path(self, hostname: str, ip: str) -> List[str]:
        return ["system", "static-host-mapping", "host-name", hostname, "inet", ip]

    def get_delete_static_host_inet_path(self, hostname: str) -> List[str]:
        return ["system", "static-host-mapping", "host-name", hostname, "inet"]

    def get_static_host_alias_path(self, hostname: str, alias: str) -> List[str]:
        return ["system", "static-host-mapping", "host-name", hostname, "alias", alias]

    def get_delete_static_host_alias_path(self, hostname: str, alias: str) -> List[str]:
        return ["system", "static-host-mapping", "host-name", hostname, "alias", alias]

    def get_delete_static_host_path(self, hostname: str) -> List[str]:
        return ["system", "static-host-mapping", "host-name", hostname]

    # =========================================================================
    # Console
    # =========================================================================

    def get_console_speed_path(self, device: str, speed: str) -> List[str]:
        return ["system", "console", "device", device, "speed", speed]

    def get_console_powersave_path(self) -> List[str]:
        return ["system", "console", "powersave"]

    def get_delete_console_powersave_path(self) -> List[str]:
        return ["system", "console", "powersave"]

    def get_delete_console_device_path(self, device: str) -> List[str]:
        return ["system", "console", "device", device]

    # =========================================================================
    # Watchdog (1.5 only - base returns paths, support flag overrides check)
    # =========================================================================

    def get_watchdog_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "watchdog", "timeout", timeout]

    def get_delete_watchdog_timeout_path(self) -> List[str]:
        return ["system", "watchdog", "timeout"]

    def get_watchdog_reboot_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "watchdog", "reboot-timeout", timeout]

    def supports_watchdog(self) -> bool:
        return False

    # =========================================================================
    # Wireless (1.5 only)
    # =========================================================================

    def get_wireless_country_code_path(self, code: str) -> List[str]:
        return ["system", "wireless", "country-code", code]

    def get_delete_wireless_country_code_path(self) -> List[str]:
        return ["system", "wireless", "country-code"]

    def supports_wireless(self) -> bool:
        return False

    # =========================================================================
    # FRR profile and extensions
    # =========================================================================

    def get_frr_profile_path(self, profile: str) -> List[str]:
        return ["system", "frr", "profile", profile]

    def get_delete_frr_profile_path(self) -> List[str]:
        return ["system", "frr", "profile"]

    def get_frr_bmp_path(self) -> List[str]:
        return ["system", "frr", "bmp"]

    def get_delete_frr_bmp_path(self) -> List[str]:
        return ["system", "frr", "bmp"]

    def get_frr_descriptors_path(self, count: str) -> List[str]:
        return ["system", "frr", "descriptors", count]

    def get_delete_frr_descriptors_path(self) -> List[str]:
        return ["system", "frr", "descriptors"]

    def get_frr_irdp_path(self) -> List[str]:
        return ["system", "frr", "irdp"]

    def get_delete_frr_irdp_path(self) -> List[str]:
        return ["system", "frr", "irdp"]

    def get_frr_snmp_daemon_path(self, daemon: str) -> List[str]:
        return ["system", "frr", "snmp", daemon]

    def get_delete_frr_snmp_daemon_path(self, daemon: str) -> List[str]:
        return ["system", "frr", "snmp", daemon]

    def supports_frr_profile(self) -> bool:
        return False

    def supports_operator_group(self) -> bool:
        return False

    # =========================================================================
    # Login operator group (1.5 only)
    # =========================================================================

    def get_operator_group_allow_path(self, group: str, value: str) -> List[str]:
        return ["system", "login", "operator-group", group, "command-policy", "allow", value]

    def get_delete_operator_group_path(self, group: str) -> List[str]:
        return ["system", "login", "operator-group", group]

    # =========================================================================
    # Performance option
    # =========================================================================

    def get_option_performance_path(self, profile: str) -> List[str]:
        return ["system", "option", "performance", profile]

    def get_delete_option_performance_path(self) -> List[str]:
        return ["system", "option", "performance"]

    # =========================================================================
    # System options
    # =========================================================================

    def get_option_ctrl_alt_delete_path(self, action: str) -> List[str]:
        return ["system", "option", "ctrl-alt-delete", action]

    def get_delete_option_ctrl_alt_delete_path(self) -> List[str]:
        return ["system", "option", "ctrl-alt-delete"]

    def get_option_disable_usb_autosuspend_path(self) -> List[str]:
        return ["system", "option", "disable-usb-autosuspend"]

    def get_delete_option_disable_usb_autosuspend_path(self) -> List[str]:
        return ["system", "option", "disable-usb-autosuspend"]

    def get_option_http_client_source_address_path(self, addr: str) -> List[str]:
        return ["system", "option", "http-client", "source-address", addr]

    def get_delete_option_http_client_source_address_path(self) -> List[str]:
        return ["system", "option", "http-client", "source-address"]

    def get_option_http_client_source_interface_path(self, iface: str) -> List[str]:
        return ["system", "option", "http-client", "source-interface", iface]

    def get_delete_option_http_client_source_interface_path(self) -> List[str]:
        return ["system", "option", "http-client", "source-interface"]

    def get_option_ssh_client_source_address_path(self, addr: str) -> List[str]:
        return ["system", "option", "ssh-client", "source-address", addr]

    def get_delete_option_ssh_client_source_address_path(self) -> List[str]:
        return ["system", "option", "ssh-client", "source-address"]

    def get_option_ssh_client_source_interface_path(self, iface: str) -> List[str]:
        return ["system", "option", "ssh-client", "source-interface", iface]

    def get_delete_option_ssh_client_source_interface_path(self) -> List[str]:
        return ["system", "option", "ssh-client", "source-interface"]

    def get_option_keyboard_layout_path(self, layout: str) -> List[str]:
        return ["system", "option", "keyboard-layout", layout]

    def get_delete_option_keyboard_layout_path(self) -> List[str]:
        return ["system", "option", "keyboard-layout"]

    def get_option_reboot_on_panic_path(self) -> List[str]:
        return ["system", "option", "reboot-on-panic"]

    def get_delete_option_reboot_on_panic_path(self) -> List[str]:
        return ["system", "option", "reboot-on-panic"]

    def get_option_root_partition_auto_resize_path(self) -> List[str]:
        return ["system", "option", "root-partition-auto-resize"]

    def get_delete_option_root_partition_auto_resize_path(self) -> List[str]:
        return ["system", "option", "root-partition-auto-resize"]

    def get_option_startup_beep_path(self) -> List[str]:
        return ["system", "option", "startup-beep"]

    def get_delete_option_startup_beep_path(self) -> List[str]:
        return ["system", "option", "startup-beep"]

    def get_option_time_format_path(self, fmt: str) -> List[str]:
        return ["system", "option", "time-format", fmt]

    def get_delete_option_time_format_path(self) -> List[str]:
        return ["system", "option", "time-format"]

    # Kernel options (1.5 adds extra sub-options; base covers what both share)
    def get_option_kernel_quiet_path(self) -> List[str]:
        return ["system", "option", "kernel", "quiet"]

    def get_delete_option_kernel_quiet_path(self) -> List[str]:
        return ["system", "option", "kernel", "quiet"]

    def get_option_kernel_disable_mitigations_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-mitigations"]

    def get_delete_option_kernel_disable_mitigations_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-mitigations"]

    def get_option_kernel_disable_power_saving_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-power-saving"]

    def get_delete_option_kernel_disable_power_saving_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-power-saving"]

    def get_option_kernel_debug_wireguard_path(self) -> List[str]:
        return ["system", "option", "kernel", "debug", "wireguard"]

    def get_delete_option_kernel_debug_wireguard_path(self) -> List[str]:
        return ["system", "option", "kernel", "debug", "wireguard"]

    def get_option_kernel_amd_pstate_driver_path(self, driver: str) -> List[str]:
        return ["system", "option", "kernel", "amd-pstate-driver", driver]

    def get_delete_option_kernel_amd_pstate_driver_path(self) -> List[str]:
        return ["system", "option", "kernel", "amd-pstate-driver"]

    def get_option_kernel_disable_hpet_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-hpet"]

    def get_delete_option_kernel_disable_hpet_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-hpet"]

    def get_option_kernel_disable_mce_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-mce"]

    def get_delete_option_kernel_disable_mce_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-mce"]

    def get_option_kernel_disable_softlockup_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-softlockup"]

    def get_delete_option_kernel_disable_softlockup_path(self) -> List[str]:
        return ["system", "option", "kernel", "disable-softlockup"]

    def get_option_kernel_cpu_disable_nmi_watchdog_path(self) -> List[str]:
        return ["system", "option", "kernel", "cpu", "disable-nmi-watchdog"]

    def get_delete_option_kernel_cpu_disable_nmi_watchdog_path(self) -> List[str]:
        return ["system", "option", "kernel", "cpu", "disable-nmi-watchdog"]

    def get_option_kernel_cpu_isolate_path(self, cpus: str) -> List[str]:
        return ["system", "option", "kernel", "cpu", "isolate-cpus", cpus]

    def get_delete_option_kernel_cpu_isolate_path(self) -> List[str]:
        return ["system", "option", "kernel", "cpu", "isolate-cpus"]

    def get_option_kernel_cpu_nohz_full_path(self, cpus: str) -> List[str]:
        return ["system", "option", "kernel", "cpu", "nohz-full", cpus]

    def get_delete_option_kernel_cpu_nohz_full_path(self) -> List[str]:
        return ["system", "option", "kernel", "cpu", "nohz-full"]

    def get_option_kernel_cpu_rcu_no_cbs_path(self, cpus: str) -> List[str]:
        return ["system", "option", "kernel", "cpu", "rcu-no-cbs", cpus]

    def get_delete_option_kernel_cpu_rcu_no_cbs_path(self) -> List[str]:
        return ["system", "option", "kernel", "cpu", "rcu-no-cbs"]

    def get_option_kernel_memory_default_hugepage_size_path(self, size: str) -> List[str]:
        return ["system", "option", "kernel", "memory", "default-hugepage-size", size]

    def get_delete_option_kernel_memory_default_hugepage_size_path(self) -> List[str]:
        return ["system", "option", "kernel", "memory", "default-hugepage-size"]

    def get_option_kernel_memory_disable_numa_balancing_path(self) -> List[str]:
        return ["system", "option", "kernel", "memory", "disable-numa-balancing"]

    def get_delete_option_kernel_memory_disable_numa_balancing_path(self) -> List[str]:
        return ["system", "option", "kernel", "memory", "disable-numa-balancing"]

    def get_option_kernel_memory_hugepage_size_path(self, size: str) -> List[str]:
        return ["system", "option", "kernel", "memory", "hugepage-size", size]

    def get_delete_option_kernel_memory_hugepage_size_path(self) -> List[str]:
        return ["system", "option", "kernel", "memory", "hugepage-size"]

    # 1.5-only options (base returns paths; feature flag controls display)
    def get_option_reboot_on_upgrade_failure_path(self) -> List[str]:
        return ["system", "option", "reboot-on-upgrade-failure"]

    def get_delete_option_reboot_on_upgrade_failure_path(self) -> List[str]:
        return ["system", "option", "reboot-on-upgrade-failure"]

    def get_option_resource_limits_max_map_count_path(self, value: str) -> List[str]:
        return ["system", "option", "resource-limits", "max-map-count", value]

    def get_delete_option_resource_limits_max_map_count_path(self) -> List[str]:
        return ["system", "option", "resource-limits", "max-map-count"]

    def get_option_resource_limits_shmmax_path(self, value: str) -> List[str]:
        return ["system", "option", "resource-limits", "shmmax", value]

    def get_delete_option_resource_limits_shmmax_path(self) -> List[str]:
        return ["system", "option", "resource-limits", "shmmax"]

    def supports_resource_limits(self) -> bool:
        return False

    # =========================================================================
    # Proxy
    # =========================================================================

    def get_proxy_url_path(self, url: str) -> List[str]:
        return ["system", "proxy", "url", url]

    def get_delete_proxy_url_path(self) -> List[str]:
        return ["system", "proxy", "url"]

    def get_proxy_port_path(self, port: str) -> List[str]:
        return ["system", "proxy", "port", port]

    def get_delete_proxy_port_path(self) -> List[str]:
        return ["system", "proxy", "port"]

    def get_proxy_username_path(self, username: str) -> List[str]:
        return ["system", "proxy", "username", username]

    def get_delete_proxy_username_path(self) -> List[str]:
        return ["system", "proxy", "username"]

    def get_proxy_password_path(self, password: str) -> List[str]:
        return ["system", "proxy", "password", password]

    def get_delete_proxy_password_path(self) -> List[str]:
        return ["system", "proxy", "password"]

    def get_delete_proxy_path(self) -> List[str]:
        return ["system", "proxy"]

    # =========================================================================
    # Flow accounting (1.5: interface under netflow; 1.4 overrides)
    # =========================================================================

    def get_flow_accounting_enable_egress_path(self) -> List[str]:
        return ["system", "flow-accounting", "enable-egress"]

    def get_delete_flow_accounting_enable_egress_path(self) -> List[str]:
        return ["system", "flow-accounting", "enable-egress"]

    def get_flow_accounting_interface_path(self, iface: str) -> List[str]:
        """1.5: interface under netflow; 1.4 override puts it at root."""
        return ["system", "flow-accounting", "netflow", "interface", iface]

    def get_delete_flow_accounting_interface_path(self, iface: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "interface", iface]

    def get_flow_accounting_netflow_engine_id_path(self, engine_id: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "engine-id", engine_id]

    def get_delete_flow_accounting_netflow_engine_id_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "engine-id"]

    def get_flow_accounting_netflow_max_flows_path(self, count: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "max-flows", count]

    def get_delete_flow_accounting_netflow_max_flows_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "max-flows"]

    def get_flow_accounting_netflow_sampling_rate_path(self, rate: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "sampling-rate", rate]

    def get_delete_flow_accounting_netflow_sampling_rate_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "sampling-rate"]

    def get_flow_accounting_netflow_server_path(self, server: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "server", server]

    def get_delete_flow_accounting_netflow_server_path(self, server: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "server", server]

    def get_flow_accounting_netflow_server_port_path(self, server: str, port: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "server", server, "port", port]

    def get_flow_accounting_netflow_server_source_address_path(self, server: str, addr: str) -> List[str]:
        """1.5: source-address per server; 1.4 uses global netflow source-address."""
        return ["system", "flow-accounting", "netflow", "server", server, "source-address", addr]

    def get_flow_accounting_netflow_server_source_interface_path(self, server: str, iface: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "server", server, "source-interface", iface]

    def get_flow_accounting_netflow_version_path(self, version: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "version", version]

    def get_delete_flow_accounting_netflow_version_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "version"]

    # 1.5-only netflow timeouts
    def get_flow_accounting_netflow_active_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "active-timeout", timeout]

    def get_flow_accounting_netflow_inactive_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "inactive-timeout", timeout]

    # 1.4-only: global source-address under netflow
    def get_flow_accounting_netflow_source_address_path(self, addr: str) -> List[str]:
        return ["system", "flow-accounting", "netflow", "source-address", addr]

    def get_delete_flow_accounting_netflow_source_address_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "source-address"]

    def get_flow_accounting_vrf_path(self, vrf: str) -> List[str]:
        return ["system", "flow-accounting", "vrf", vrf]

    def get_delete_flow_accounting_vrf_path(self) -> List[str]:
        return ["system", "flow-accounting", "vrf"]

    def get_delete_flow_accounting_path(self) -> List[str]:
        return ["system", "flow-accounting"]

    def get_flow_accounting_interface_config_key(self) -> str:
        """Returns the config key where interfaces are stored for flow-accounting."""
        return "netflow"

    # =========================================================================
    # sFlow — 1.5: top-level; 1.4: under flow-accounting (override in v1_4)
    # =========================================================================

    def get_sflow_agent_address_path(self, addr: str) -> List[str]:
        return ["system", "sflow", "agent-address", addr]

    def get_delete_sflow_agent_address_path(self) -> List[str]:
        return ["system", "sflow", "agent-address"]

    def get_sflow_agent_interface_path(self, iface: str) -> List[str]:
        return ["system", "sflow", "agent-interface", iface]

    def get_delete_sflow_agent_interface_path(self) -> List[str]:
        return ["system", "sflow", "agent-interface"]

    def get_sflow_drop_monitor_limit_path(self, limit: str) -> List[str]:
        return ["system", "sflow", "drop-monitor-limit", limit]

    def get_delete_sflow_drop_monitor_limit_path(self) -> List[str]:
        return ["system", "sflow", "drop-monitor-limit"]

    def get_sflow_enable_egress_path(self) -> List[str]:
        return ["system", "sflow", "enable-egress"]

    def get_delete_sflow_enable_egress_path(self) -> List[str]:
        return ["system", "sflow", "enable-egress"]

    def get_sflow_interface_path(self, iface: str) -> List[str]:
        return ["system", "sflow", "interface", iface]

    def get_delete_sflow_interface_path(self, iface: str) -> List[str]:
        return ["system", "sflow", "interface", iface]

    def get_sflow_polling_path(self, interval: str) -> List[str]:
        return ["system", "sflow", "polling", interval]

    def get_delete_sflow_polling_path(self) -> List[str]:
        return ["system", "sflow", "polling"]

    def get_sflow_sampling_rate_path(self, rate: str) -> List[str]:
        return ["system", "sflow", "sampling-rate", rate]

    def get_delete_sflow_sampling_rate_path(self) -> List[str]:
        return ["system", "sflow", "sampling-rate"]

    def get_sflow_server_path(self, server: str) -> List[str]:
        return ["system", "sflow", "server", server]

    def get_delete_sflow_server_path(self, server: str) -> List[str]:
        return ["system", "sflow", "server", server]

    def get_sflow_server_port_path(self, server: str, port: str) -> List[str]:
        return ["system", "sflow", "server", server, "port", port]

    def get_sflow_vrf_path(self, vrf: str) -> List[str]:
        return ["system", "sflow", "vrf", vrf]

    def get_delete_sflow_vrf_path(self) -> List[str]:
        return ["system", "sflow", "vrf"]

    def get_delete_sflow_path(self) -> List[str]:
        return ["system", "sflow"]

    def get_sflow_config_root(self) -> str:
        """Config key for sflow — 'sflow' at top level (1.5), overridden for 1.4."""
        return "sflow"

    def supports_standalone_sflow(self) -> bool:
        return True

    # =========================================================================
    # IP settings
    # =========================================================================

    def get_ip_arp_table_size_path(self, size: str) -> List[str]:
        return ["system", "ip", "arp", "table-size", size]

    def get_delete_ip_arp_table_size_path(self) -> List[str]:
        return ["system", "ip", "arp", "table-size"]

    def get_ip_disable_forwarding_path(self) -> List[str]:
        return ["system", "ip", "disable-forwarding"]

    def get_delete_ip_disable_forwarding_path(self) -> List[str]:
        return ["system", "ip", "disable-forwarding"]

    def get_ip_import_table_path(self, table: str) -> List[str]:
        return ["system", "ip", "import-table", table]

    def get_delete_ip_import_table_path(self) -> List[str]:
        return ["system", "ip", "import-table"]

    def get_ip_multipath_layer4_hashing_path(self) -> List[str]:
        return ["system", "ip", "multipath", "layer4-hashing"]

    def get_delete_ip_multipath_layer4_hashing_path(self) -> List[str]:
        return ["system", "ip", "multipath", "layer4-hashing"]

    def get_ip_multipath_ignore_unreachable_path(self) -> List[str]:
        return ["system", "ip", "multipath", "ignore-unreachable-nexthops"]

    def get_delete_ip_multipath_ignore_unreachable_path(self) -> List[str]:
        return ["system", "ip", "multipath", "ignore-unreachable-nexthops"]

    def get_ip_nht_no_resolve_via_default_path(self) -> List[str]:
        return ["system", "ip", "nht", "no-resolve-via-default"]

    def get_delete_ip_nht_no_resolve_via_default_path(self) -> List[str]:
        return ["system", "ip", "nht", "no-resolve-via-default"]

    def get_ip_tcp_mss_base_path(self, value: str) -> List[str]:
        return ["system", "ip", "tcp", "mss", "base", value]

    def get_delete_ip_tcp_mss_base_path(self) -> List[str]:
        return ["system", "ip", "tcp", "mss", "base"]

    def get_ip_tcp_mss_floor_path(self, value: str) -> List[str]:
        return ["system", "ip", "tcp", "mss", "floor", value]

    def get_delete_ip_tcp_mss_floor_path(self) -> List[str]:
        return ["system", "ip", "tcp", "mss", "floor"]

    def get_ip_tcp_mss_probing_path(self) -> List[str]:
        return ["system", "ip", "tcp", "mss", "probing"]

    def get_delete_ip_tcp_mss_probing_path(self) -> List[str]:
        return ["system", "ip", "tcp", "mss", "probing"]

    # =========================================================================
    # IPv6 settings
    # =========================================================================

    def get_ipv6_disable_forwarding_path(self) -> List[str]:
        return ["system", "ipv6", "disable-forwarding"]

    def get_delete_ipv6_disable_forwarding_path(self) -> List[str]:
        return ["system", "ipv6", "disable-forwarding"]

    def get_ipv6_neighbor_table_size_path(self, size: str) -> List[str]:
        return ["system", "ipv6", "neighbor", "table-size", size]

    def get_delete_ipv6_neighbor_table_size_path(self) -> List[str]:
        return ["system", "ipv6", "neighbor", "table-size"]

    def get_ipv6_multipath_layer4_hashing_path(self) -> List[str]:
        return ["system", "ipv6", "multipath", "layer4-hashing"]

    def get_delete_ipv6_multipath_layer4_hashing_path(self) -> List[str]:
        return ["system", "ipv6", "multipath", "layer4-hashing"]

    def get_ipv6_nht_no_resolve_via_default_path(self) -> List[str]:
        return ["system", "ipv6", "nht", "no-resolve-via-default"]

    def get_delete_ipv6_nht_no_resolve_via_default_path(self) -> List[str]:
        return ["system", "ipv6", "nht", "no-resolve-via-default"]

    def get_ipv6_strict_dad_path(self) -> List[str]:
        return ["system", "ipv6", "strict-dad"]

    def get_delete_ipv6_strict_dad_path(self) -> List[str]:
        return ["system", "ipv6", "strict-dad"]

    # =========================================================================
    # LCD
    # =========================================================================

    def get_lcd_device_path(self, device: str) -> List[str]:
        return ["system", "lcd", "device", device]

    def get_delete_lcd_device_path(self) -> List[str]:
        return ["system", "lcd", "device"]

    def get_lcd_model_path(self, model: str) -> List[str]:
        return ["system", "lcd", "model", model]

    def get_delete_lcd_model_path(self) -> List[str]:
        return ["system", "lcd", "model"]

    def get_delete_lcd_path(self) -> List[str]:
        return ["system", "lcd"]

    # =========================================================================
    # Logs / logrotate
    # =========================================================================

    def get_logrotate_atop_max_size_path(self, size: str) -> List[str]:
        return ["system", "logs", "logrotate", "atop", "max-size", size]

    def get_delete_logrotate_atop_max_size_path(self) -> List[str]:
        return ["system", "logs", "logrotate", "atop", "max-size"]

    def get_logrotate_atop_rotate_path(self, count: str) -> List[str]:
        return ["system", "logs", "logrotate", "atop", "rotate", count]

    def get_delete_logrotate_atop_rotate_path(self) -> List[str]:
        return ["system", "logs", "logrotate", "atop", "rotate"]

    def get_logrotate_messages_max_size_path(self, size: str) -> List[str]:
        return ["system", "logs", "logrotate", "messages", "max-size", size]

    def get_delete_logrotate_messages_max_size_path(self) -> List[str]:
        return ["system", "logs", "logrotate", "messages", "max-size"]

    def get_logrotate_messages_rotate_path(self, count: str) -> List[str]:
        return ["system", "logs", "logrotate", "messages", "rotate", count]

    def get_delete_logrotate_messages_rotate_path(self) -> List[str]:
        return ["system", "logs", "logrotate", "messages", "rotate"]

    # =========================================================================
    # Task scheduler
    # =========================================================================

    def get_task_scheduler_task_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name]

    def get_delete_task_scheduler_task_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name]

    def get_task_crontab_spec_path(self, name: str, spec: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "crontab-spec", spec]

    def get_delete_task_crontab_spec_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "crontab-spec"]

    def get_task_interval_path(self, name: str, interval: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "interval", interval]

    def get_delete_task_interval_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "interval"]

    def get_task_executable_path_path(self, name: str, path: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "executable", "path", path]

    def get_delete_task_executable_path_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "executable", "path"]

    def get_task_executable_arguments_path(self, name: str, args: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "executable", "arguments", args]

    def get_delete_task_executable_arguments_path(self, name: str) -> List[str]:
        return ["system", "task-scheduler", "task", name, "executable", "arguments"]

    # =========================================================================
    # Update check
    # =========================================================================

    def get_update_check_auto_check_path(self) -> List[str]:
        return ["system", "update-check", "auto-check"]

    def get_delete_update_check_auto_check_path(self) -> List[str]:
        return ["system", "update-check", "auto-check"]

    def get_update_check_url_path(self, url: str) -> List[str]:
        return ["system", "update-check", "url", url]

    def get_delete_update_check_url_path(self) -> List[str]:
        return ["system", "update-check", "url"]

    # =========================================================================
    # Acceleration
    # =========================================================================

    def get_acceleration_qat_path(self) -> List[str]:
        return ["system", "acceleration", "qat"]

    def get_delete_acceleration_qat_path(self) -> List[str]:
        return ["system", "acceleration", "qat"]

    # =========================================================================
    # Sysctl
    # =========================================================================

    def get_sysctl_parameter_path(self, param: str, value: str) -> List[str]:
        return ["system", "sysctl", "parameter", param, "value", value]

    def get_delete_sysctl_parameter_path(self, param: str) -> List[str]:
        return ["system", "sysctl", "parameter", param]
