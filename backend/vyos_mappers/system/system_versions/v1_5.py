"""
System Mapper - VyOS 1.5 (Rolling) Additions

Key additions over 1.4:
- Watchdog support
- Wireless country code
- FRR profile selection
- Login operator groups
- Syslog 'local' and 'remote' (instead of 'global' and 'host')
- Conntrack RTSP module
- Syslog console target
"""

from typing import List


class SystemMapperV1_5:
    """VyOS 1.5 specific system path additions and overrides."""

    # =========================================================================
    # Capability flags
    # =========================================================================

    def supports_syslog_console(self) -> bool:
        return True

    def supports_syslog_file(self) -> bool:
        return False

    def supports_syslog_user(self) -> bool:
        return False

    def supports_watchdog(self) -> bool:
        return True

    def supports_wireless(self) -> bool:
        return True

    def supports_operator_group(self) -> bool:
        return True

    def supports_frr_profile(self) -> bool:
        return True

    # =========================================================================
    # Conntrack - 1.5 adds RTSP module
    # =========================================================================

    def get_available_conntrack_modules(self) -> List[str]:
        return ["ftp", "h323", "nfs", "pptp", "rtsp", "sip", "sqlnet", "tftp"]

    # =========================================================================
    # Watchdog (1.5 only)
    # =========================================================================

    def get_watchdog_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "watchdog", "timeout", timeout]

    def get_delete_watchdog_timeout_path(self) -> List[str]:
        return ["system", "watchdog", "timeout"]

    def get_watchdog_reboot_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "watchdog", "reboot-timeout", timeout]

    def get_watchdog_shutdown_timeout_path(self, timeout: str) -> List[str]:
        return ["system", "watchdog", "shutdown-timeout", timeout]

    def get_watchdog_module_path(self, module: str) -> List[str]:
        return ["system", "watchdog", "module", module]

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
