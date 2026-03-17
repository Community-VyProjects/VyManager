"""
System Batch Builder

Builds VyOS batch operations for all system configuration subsections:
  - General (hostname, domain, name-server, time-zone)
  - Login (users, SSH keys, banners, timeout)
  - Syslog (version-aware: local/global, remote/host, file, user)
  - Conntrack (modules, TCP, table sizes)
  - Config management (revisions, archive)
  - Static host mapping
  - Console devices
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
        """set system host-name <hostname>"""
        return self.add_set(self.mapper.get_hostname_path(hostname))

    def delete_hostname(self) -> "SystemBatchBuilder":
        """delete system host-name"""
        return self.add_delete(self.mapper.get_delete_hostname_path())

    def add_name_server(self, ip: str) -> "SystemBatchBuilder":
        """set system name-server <ip>"""
        return self.add_set(self.mapper.get_name_server_path(ip))

    def delete_name_server(self, ip: str) -> "SystemBatchBuilder":
        """delete system name-server <ip>"""
        return self.add_delete(self.mapper.get_delete_name_server_path(ip))

    def delete_all_name_servers(self) -> "SystemBatchBuilder":
        """delete system name-server"""
        return self.add_delete(self.mapper.get_delete_name_server_path())

    def set_domain_name(self, domain: str) -> "SystemBatchBuilder":
        """set system domain-name <domain>"""
        return self.add_set(self.mapper.get_domain_name_path(domain))

    def delete_domain_name(self) -> "SystemBatchBuilder":
        """delete system domain-name"""
        return self.add_delete(self.mapper.get_delete_domain_name_path())

    def add_domain_search(self, domain: str) -> "SystemBatchBuilder":
        """set system domain-search domain <domain>"""
        return self.add_set(self.mapper.get_domain_search_path(domain))

    def delete_domain_search(self, domain: str) -> "SystemBatchBuilder":
        """delete system domain-search domain <domain>"""
        return self.add_delete(self.mapper.get_delete_domain_search_path(domain))

    def set_time_zone(self, tz: str) -> "SystemBatchBuilder":
        """set system time-zone <tz>"""
        return self.add_set(self.mapper.get_time_zone_path(tz))

    def delete_time_zone(self) -> "SystemBatchBuilder":
        """delete system time-zone"""
        return self.add_delete(self.mapper.get_delete_time_zone_path())

    # =========================================================================
    # Login / Users
    # =========================================================================

    def set_login_user(self, username: str) -> "SystemBatchBuilder":
        """set system login user <username>"""
        return self.add_set(self.mapper.get_login_user_path(username))

    def delete_login_user(self, username: str) -> "SystemBatchBuilder":
        """delete system login user <username>"""
        return self.add_delete(self.mapper.get_delete_login_user_path(username))

    def set_user_full_name(self, username: str, full_name: str) -> "SystemBatchBuilder":
        """set system login user <username> full-name <name>"""
        return self.add_set(self.mapper.get_user_full_name_path(username, full_name))

    def set_user_plaintext_password(self, username: str, password: str) -> "SystemBatchBuilder":
        """set system login user <username> authentication plaintext-password <pw>"""
        return self.add_set(self.mapper.get_user_plaintext_password_path(username, password))

    def set_user_encrypted_password(self, username: str, enc_pw: str) -> "SystemBatchBuilder":
        """set system login user <username> authentication encrypted-password <pw>"""
        return self.add_set(self.mapper.get_user_encrypted_password_path(username, enc_pw))

    def set_user_public_key_type(self, username: str, key_name: str, key_type: str) -> "SystemBatchBuilder":
        """set system login user <username> authentication public-keys <name> type <type>"""
        return self.add_set(self.mapper.get_user_public_key_type_path(username, key_name, key_type))

    def set_user_public_key(self, username: str, key_name: str, key_value: str) -> "SystemBatchBuilder":
        """set system login user <username> authentication public-keys <name> key <value>"""
        return self.add_set(self.mapper.get_user_public_key_path(username, key_name, key_value))

    def delete_user_public_key(self, username: str, key_name: str) -> "SystemBatchBuilder":
        """delete system login user <username> authentication public-keys <name>"""
        return self.add_delete(self.mapper.get_delete_user_public_key_path(username, key_name))

    def set_login_timeout(self, seconds: str) -> "SystemBatchBuilder":
        """set system login timeout <seconds>"""
        return self.add_set(self.mapper.get_login_timeout_path(seconds))

    def delete_login_timeout(self) -> "SystemBatchBuilder":
        """delete system login timeout"""
        return self.add_delete(self.mapper.get_delete_login_timeout_path())

    def set_post_login_banner(self, banner: str) -> "SystemBatchBuilder":
        """set system login banner post-login <text>"""
        return self.add_set(self.mapper.get_post_login_banner_path(banner))

    def delete_post_login_banner(self) -> "SystemBatchBuilder":
        """delete system login banner post-login"""
        return self.add_delete(self.mapper.get_delete_post_login_banner_path())

    def set_pre_login_banner(self, banner: str) -> "SystemBatchBuilder":
        """set system login banner pre-login <text>"""
        return self.add_set(self.mapper.get_pre_login_banner_path(banner))

    def delete_pre_login_banner(self) -> "SystemBatchBuilder":
        """delete system login banner pre-login"""
        return self.add_delete(self.mapper.get_delete_pre_login_banner_path())

    # =========================================================================
    # Syslog (version-aware paths via mapper)
    # =========================================================================

    def set_syslog_local_facility(self, facility: str, level: str) -> "SystemBatchBuilder":
        """set system syslog local/global facility <f> level <l>"""
        return self.add_set(self.mapper.get_syslog_local_facility_path(facility, level))

    def delete_syslog_local_facility(self, facility: str) -> "SystemBatchBuilder":
        """delete system syslog local/global facility <f>"""
        return self.add_delete(self.mapper.get_delete_syslog_local_facility_path(facility))

    def set_syslog_remote_facility(self, host: str, facility: str, level: str) -> "SystemBatchBuilder":
        """set system syslog remote/host <host> facility <f> level <l>"""
        return self.add_set(self.mapper.get_syslog_remote_facility_path(host, facility, level))

    def set_syslog_remote_port(self, host: str, port: str) -> "SystemBatchBuilder":
        """set system syslog remote/host <host> port <port>"""
        return self.add_set(self.mapper.get_syslog_remote_port_path(host, port))

    def delete_syslog_remote(self, host: str) -> "SystemBatchBuilder":
        """delete system syslog remote/host <host>"""
        return self.add_delete(self.mapper.get_delete_syslog_remote_path(host))

    def set_syslog_console_facility(self, facility: str, level: str) -> "SystemBatchBuilder":
        """set system syslog console facility <f> level <l> (1.5 only)"""
        return self.add_set(self.mapper.get_syslog_console_facility_path(facility, level))

    def delete_syslog_console_facility(self, facility: str) -> "SystemBatchBuilder":
        """delete system syslog console facility <f>"""
        return self.add_delete(self.mapper.get_delete_syslog_console_facility_path(facility))

    def set_syslog_preserve_fqdn(self) -> "SystemBatchBuilder":
        """set system syslog preserve-fqdn"""
        return self.add_set(self.mapper.get_syslog_preserve_fqdn_path())

    def delete_syslog_preserve_fqdn(self) -> "SystemBatchBuilder":
        """delete system syslog preserve-fqdn"""
        return self.add_delete(self.mapper.get_delete_syslog_preserve_fqdn_path())

    # 1.4-only syslog targets
    def set_syslog_file_facility(self, filename: str, facility: str, level: str) -> "SystemBatchBuilder":
        """set system syslog file <filename> facility <f> level <l> (1.4 only)"""
        return self.add_set(self.mapper.get_syslog_file_facility_path(filename, facility, level))

    def delete_syslog_file(self, filename: str) -> "SystemBatchBuilder":
        """delete system syslog file <filename> (1.4 only)"""
        return self.add_delete(self.mapper.get_delete_syslog_file_path(filename))

    def set_syslog_user_facility(self, username: str, facility: str, level: str) -> "SystemBatchBuilder":
        """set system syslog user <username> facility <f> level <l> (1.4 only)"""
        return self.add_set(self.mapper.get_syslog_user_facility_path(username, facility, level))

    def delete_syslog_user(self, username: str) -> "SystemBatchBuilder":
        """delete system syslog user <username> (1.4 only)"""
        return self.add_delete(self.mapper.get_delete_syslog_user_path(username))

    # =========================================================================
    # Conntrack
    # =========================================================================

    def add_conntrack_module(self, module: str) -> "SystemBatchBuilder":
        """set system conntrack modules <module>"""
        return self.add_set(self.mapper.get_conntrack_module_path(module))

    def delete_conntrack_module(self, module: str) -> "SystemBatchBuilder":
        """delete system conntrack modules <module>"""
        return self.add_delete(self.mapper.get_delete_conntrack_module_path(module))

    def set_conntrack_table_size(self, size: str) -> "SystemBatchBuilder":
        """set system conntrack table-size <size>"""
        return self.add_set(self.mapper.get_conntrack_table_size_path(size))

    def set_conntrack_hash_size(self, size: str) -> "SystemBatchBuilder":
        """set system conntrack hash-size <size>"""
        return self.add_set(self.mapper.get_conntrack_hash_size_path(size))

    def set_conntrack_expect_table_size(self, size: str) -> "SystemBatchBuilder":
        """set system conntrack expect-table-size <size>"""
        return self.add_set(self.mapper.get_conntrack_expect_table_size_path(size))

    def set_conntrack_tcp_loose(self, value: str) -> "SystemBatchBuilder":
        """set system conntrack tcp loose <value>"""
        return self.add_set(self.mapper.get_conntrack_tcp_loose_path(value))

    def set_conntrack_tcp_half_open(self, count: str) -> "SystemBatchBuilder":
        """set system conntrack tcp half-open-connections <count>"""
        return self.add_set(self.mapper.get_conntrack_tcp_half_open_path(count))

    def set_conntrack_tcp_max_retrans(self, count: str) -> "SystemBatchBuilder":
        """set system conntrack tcp max-retrans <count>"""
        return self.add_set(self.mapper.get_conntrack_tcp_max_retrans_path(count))

    # =========================================================================
    # Config management
    # =========================================================================

    def set_commit_revisions(self, count: str) -> "SystemBatchBuilder":
        """set system config-management commit-revisions <count>"""
        return self.add_set(self.mapper.get_commit_revisions_path(count))

    def add_commit_archive_location(self, url: str) -> "SystemBatchBuilder":
        """set system config-management commit-archive location <url>"""
        return self.add_set(self.mapper.get_commit_archive_location_path(url))

    def delete_commit_archive_location(self, url: str) -> "SystemBatchBuilder":
        """delete system config-management commit-archive location <url>"""
        return self.add_delete(self.mapper.get_delete_commit_archive_location_path(url))

    def delete_commit_archive(self) -> "SystemBatchBuilder":
        """delete system config-management commit-archive"""
        return self.add_delete(self.mapper.get_delete_commit_archive_path())

    # =========================================================================
    # Static host mapping
    # =========================================================================

    def set_static_host(self, hostname: str, ip: str) -> "SystemBatchBuilder":
        """set system static-host-mapping host-name <hostname> inet <ip>"""
        return self.add_set(self.mapper.get_static_host_inet_path(hostname, ip))

    def delete_static_host(self, hostname: str) -> "SystemBatchBuilder":
        """delete system static-host-mapping host-name <hostname>"""
        return self.add_delete(self.mapper.get_delete_static_host_path(hostname))

    def add_static_host_alias(self, hostname: str, alias: str) -> "SystemBatchBuilder":
        """set system static-host-mapping host-name <hostname> alias <alias>"""
        return self.add_set(self.mapper.get_static_host_alias_path(hostname, alias))

    def delete_static_host_alias(self, hostname: str, alias: str) -> "SystemBatchBuilder":
        """delete system static-host-mapping host-name <hostname> alias <alias>"""
        return self.add_delete(self.mapper.get_delete_static_host_alias_path(hostname, alias))

    # =========================================================================
    # Console
    # =========================================================================

    def set_console_speed(self, device: str, speed: str) -> "SystemBatchBuilder":
        """set system console device <device> speed <speed>"""
        return self.add_set(self.mapper.get_console_speed_path(device, speed))

    def delete_console_device(self, device: str) -> "SystemBatchBuilder":
        """delete system console device <device>"""
        return self.add_delete(self.mapper.get_delete_console_device_path(device))

    def set_console_powersave(self) -> "SystemBatchBuilder":
        """set system console powersave"""
        return self.add_set(self.mapper.get_console_powersave_path())

    def delete_console_powersave(self) -> "SystemBatchBuilder":
        """delete system console powersave"""
        return self.add_delete(self.mapper.get_delete_console_powersave_path())

    # =========================================================================
    # Watchdog (1.5 only - calls mapper; mapper returns [] on 1.4 = no-op)
    # =========================================================================

    def set_watchdog_timeout(self, timeout: str) -> "SystemBatchBuilder":
        """set system watchdog timeout <timeout>"""
        return self.add_set(self.mapper.get_watchdog_timeout_path(timeout))

    def delete_watchdog_timeout(self) -> "SystemBatchBuilder":
        """delete system watchdog timeout"""
        return self.add_delete(self.mapper.get_delete_watchdog_timeout_path())

    def set_watchdog_reboot_timeout(self, timeout: str) -> "SystemBatchBuilder":
        """set system watchdog reboot-timeout <timeout>"""
        return self.add_set(self.mapper.get_watchdog_reboot_timeout_path(timeout))

    # =========================================================================
    # Wireless (1.5 only)
    # =========================================================================

    def set_wireless_country_code(self, code: str) -> "SystemBatchBuilder":
        """set system wireless country-code <code>"""
        return self.add_set(self.mapper.get_wireless_country_code_path(code))

    def delete_wireless_country_code(self) -> "SystemBatchBuilder":
        """delete system wireless country-code"""
        return self.add_delete(self.mapper.get_delete_wireless_country_code_path())

    # =========================================================================
    # FRR profile (1.5 only)
    # =========================================================================

    def set_frr_profile(self, profile: str) -> "SystemBatchBuilder":
        """set system frr profile <profile>"""
        return self.add_set(self.mapper.get_frr_profile_path(profile))

    def delete_frr_profile(self) -> "SystemBatchBuilder":
        """delete system frr profile"""
        return self.add_delete(self.mapper.get_delete_frr_profile_path())

    # =========================================================================
    # Login operator group (1.5 only)
    # =========================================================================

    def set_operator_group_allow(self, group: str, value: str) -> "SystemBatchBuilder":
        """set system login operator-group <group> command-policy allow <value>"""
        return self.add_set(self.mapper.get_operator_group_allow_path(group, value))

    def delete_operator_group(self, group: str) -> "SystemBatchBuilder":
        """delete system login operator-group <group>"""
        return self.add_delete(self.mapper.get_delete_operator_group_path(group))

    # =========================================================================
    # Sysctl parameters
    # =========================================================================

    def set_sysctl_parameter(self, param: str, value: str) -> "SystemBatchBuilder":
        """set system sysctl parameter <param> value <value>"""
        return self.add_set(self.mapper.get_sysctl_parameter_path(param, value))

    def delete_sysctl_parameter(self, param: str) -> "SystemBatchBuilder":
        """delete system sysctl parameter <param>"""
        return self.add_delete(self.mapper.get_delete_sysctl_parameter_path(param))

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Return version-aware capabilities for the system feature set."""
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
                "supports_global_timeouts": is_v14,
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
            },
        }
