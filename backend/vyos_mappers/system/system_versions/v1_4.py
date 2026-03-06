"""
System Mapper - VyOS 1.4 (Sagitta) Overrides

Key differences from 1.5:
- Syslog uses 'global' instead of 'local' for main target
- Syslog uses 'host' instead of 'remote' for remote targets
- Syslog supports 'file' and 'user' targets (not in 1.5)
- Conntrack has global timeout settings
- No watchdog, wireless, operator-group, frr profile
"""

from typing import List


class SystemMapperV1_4:
    """VyOS 1.4 specific system path overrides."""

    # =========================================================================
    # Syslog - 1.4 uses 'global' and 'host'
    # =========================================================================

    def get_syslog_local_facility_path(self, facility: str, level: str) -> List[str]:
        """1.4: system syslog global facility <f> level <l>"""
        return ["system", "syslog", "global", "facility", facility, "level", level]

    def get_delete_syslog_local_facility_path(self, facility: str) -> List[str]:
        return ["system", "syslog", "global", "facility", facility]

    def get_delete_syslog_local_path(self) -> List[str]:
        return ["system", "syslog", "global"]

    def get_syslog_remote_facility_path(self, host: str, facility: str, level: str) -> List[str]:
        """1.4: system syslog host <host> facility <f> level <l>"""
        return ["system", "syslog", "host", host, "facility", facility, "level", level]

    def get_syslog_remote_port_path(self, host: str, port: str) -> List[str]:
        return ["system", "syslog", "host", host, "port", port]

    def get_delete_syslog_remote_path(self, host: str) -> List[str]:
        return ["system", "syslog", "host", host]

    def get_syslog_console_facility_path(self, facility: str, level: str) -> List[str]:
        """1.4 has no syslog console target — returns empty so batch is no-op."""
        return []

    def get_delete_syslog_console_facility_path(self, facility: str) -> List[str]:
        return []

    # 1.4-only syslog targets
    def get_syslog_file_facility_path(self, filename: str, facility: str, level: str) -> List[str]:
        return ["system", "syslog", "file", filename, "facility", facility, "level", level]

    def get_delete_syslog_file_path(self, filename: str) -> List[str]:
        return ["system", "syslog", "file", filename]

    def get_syslog_user_facility_path(self, username: str, facility: str, level: str) -> List[str]:
        return ["system", "syslog", "user", username, "facility", facility, "level", level]

    def get_delete_syslog_user_path(self, username: str) -> List[str]:
        return ["system", "syslog", "user", username]

    def get_syslog_preserve_fqdn_path(self) -> List[str]:
        return ["system", "syslog", "global", "preserve-fqdn"]

    def get_delete_syslog_preserve_fqdn_path(self) -> List[str]:
        return ["system", "syslog", "global", "preserve-fqdn"]

    # Config parsing helpers
    def get_syslog_local_config_key(self) -> str:
        return "global"

    def get_syslog_remote_config_key(self) -> str:
        return "host"

    def supports_syslog_console(self) -> bool:
        return False

    def supports_syslog_file(self) -> bool:
        return True

    def supports_syslog_user(self) -> bool:
        return True

    # =========================================================================
    # Conntrack - 1.4 global timeouts
    # =========================================================================

    def get_conntrack_global_timeout_path(self, protocol: str, state: str, value: str) -> List[str]:
        """1.4: system conntrack timeout <protocol> <state> <value>"""
        return ["system", "conntrack", "timeout", protocol, state, value]

    def get_available_conntrack_modules(self) -> List[str]:
        return ["ftp", "h323", "nfs", "pptp", "sip", "sqlnet", "tftp"]

    # =========================================================================
    # 1.4-only capability flags
    # =========================================================================

    def supports_watchdog(self) -> bool:
        return False

    def supports_wireless(self) -> bool:
        return False

    def supports_operator_group(self) -> bool:
        return False

    def supports_frr_profile(self) -> bool:
        return False
