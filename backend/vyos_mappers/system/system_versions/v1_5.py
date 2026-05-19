"""
System Mapper - VyOS 1.5 (Rolling) Additions

Key additions over 1.4:
- Watchdog support
- Wireless country code
- FRR profile selection
- Login operator groups
- Syslog 'local' and 'remote' (instead of 'global' and 'host')
- Syslog marker at top-level (syslog/marker) with disable flag
- Conntrack RTSP module
- Syslog console target
- Standalone top-level sflow
- resource-limits option
- reboot-on-upgrade-failure option
- Extended kernel options (CPU, memory, disable-hpet, etc.)
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

    def supports_syslog_marker_disable(self) -> bool:
        return True

    def supports_watchdog(self) -> bool:
        return True

    def supports_wireless(self) -> bool:
        return True

    def supports_operator_group(self) -> bool:
        return True

    def supports_frr_profile(self) -> bool:
        return True

    def supports_conntrack_global_timeouts(self) -> bool:
        return False

    def supports_standalone_sflow(self) -> bool:
        return True

    def supports_resource_limits(self) -> bool:
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

    # =========================================================================
    # Syslog marker — 1.5: top-level under syslog
    # =========================================================================

    def get_syslog_marker_interval_path(self, interval: str) -> List[str]:
        return ["system", "syslog", "marker", "interval", interval]

    def get_delete_syslog_marker_interval_path(self) -> List[str]:
        return ["system", "syslog", "marker", "interval"]

    def get_syslog_marker_disable_path(self) -> List[str]:
        return ["system", "syslog", "marker", "disable"]

    def get_delete_syslog_marker_disable_path(self) -> List[str]:
        return ["system", "syslog", "marker", "disable"]

    # =========================================================================
    # sFlow — 1.5: top-level (base class handles these paths already)
    # =========================================================================

    def get_sflow_config_root(self) -> str:
        return "sflow"

    # =========================================================================
    # 1.5-only system options
    # =========================================================================

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

    # =========================================================================
    # 1.5-only kernel options (CPU, memory, extra flags)
    # =========================================================================

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
