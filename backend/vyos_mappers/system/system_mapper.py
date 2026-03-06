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
        """Key in config JSON for the main local syslog target."""
        return "local"

    def get_syslog_remote_config_key(self) -> str:
        """Key in config JSON for the remote syslog target(s)."""
        return "remote"

    def supports_syslog_console(self) -> bool:
        return True

    def supports_syslog_file(self) -> bool:
        return False

    def supports_syslog_user(self) -> bool:
        return False

    def supports_watchdog(self) -> bool:
        return False

    def supports_wireless(self) -> bool:
        return False

    def supports_operator_group(self) -> bool:
        return False

    def supports_frr_profile(self) -> bool:
        return False

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

    def get_available_conntrack_modules(self) -> List[str]:
        """Returns list of available conntrack modules for this version."""
        return ["ftp", "h323", "nfs", "pptp", "sip", "sqlnet", "tftp"]

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

    # =========================================================================
    # Wireless (1.5 only)
    # =========================================================================

    def get_wireless_country_code_path(self, code: str) -> List[str]:
        return ["system", "wireless", "country-code", code]

    def get_delete_wireless_country_code_path(self) -> List[str]:
        return ["system", "wireless", "country-code"]

    # =========================================================================
    # FRR profile (1.5 only)
    # =========================================================================

    def get_frr_profile_path(self, profile: str) -> List[str]:
        return ["system", "frr", "profile", profile]

    def get_delete_frr_profile_path(self) -> List[str]:
        return ["system", "frr", "profile"]

    # =========================================================================
    # Login operator group (1.5 only)
    # =========================================================================

    def get_operator_group_allow_path(self, group: str, value: str) -> List[str]:
        return ["system", "login", "operator-group", group, "command-policy", "allow", value]

    def get_delete_operator_group_path(self, group: str) -> List[str]:
        return ["system", "login", "operator-group", group]

    # =========================================================================
    # NTP proxy / options
    # =========================================================================

    def get_option_performance_path(self, profile: str) -> List[str]:
        return ["system", "option", "performance", profile]

    def get_delete_option_performance_path(self) -> List[str]:
        return ["system", "option", "performance"]

    # =========================================================================
    # Sysctl
    # =========================================================================

    def get_sysctl_parameter_path(self, param: str, value: str) -> List[str]:
        return ["system", "sysctl", "parameter", param, "value", value]

    def get_delete_sysctl_parameter_path(self, param: str) -> List[str]:
        return ["system", "sysctl", "parameter", param]
