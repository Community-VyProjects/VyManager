"""
System Mapper - VyOS 1.4 (Sagitta) Overrides

Key differences from 1.5:
- Syslog uses 'global' instead of 'local' for main target
- Syslog uses 'host' instead of 'remote' for remote targets
- Syslog marker lives under syslog/global/marker (no disable flag)
- Syslog supports 'file' and 'user' targets (not in 1.5)
- Conntrack has global timeout settings (not just custom per-rule)
- Flow-accounting: interface at root level, sflow nested under it, per-server source-address absent
- No standalone top-level sflow (it lives under flow-accounting/sflow)
- No watchdog, wireless, operator-group, frr profile, resource-limits
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

    # Syslog marker — 1.4: under global
    def get_syslog_marker_interval_path(self, interval: str) -> List[str]:
        return ["system", "syslog", "global", "marker", "interval", interval]

    def get_delete_syslog_marker_interval_path(self) -> List[str]:
        return ["system", "syslog", "global", "marker", "interval"]

    def get_syslog_marker_disable_path(self) -> List[str]:
        return []  # 1.4 has no marker disable flag

    def get_delete_syslog_marker_disable_path(self) -> List[str]:
        return []

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

    def supports_syslog_marker_disable(self) -> bool:
        return False

    # =========================================================================
    # Conntrack - 1.4 global timeouts
    # =========================================================================

    def get_conntrack_global_timeout_path(self, protocol: str, state: str, value: str) -> List[str]:
        """1.4: system conntrack timeout <protocol> <state> <value>"""
        return ["system", "conntrack", "timeout", protocol, state, value]

    def get_conntrack_timeout_icmp_path(self, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "icmp", value]

    def get_delete_conntrack_timeout_icmp_path(self) -> List[str]:
        return ["system", "conntrack", "timeout", "icmp"]

    def get_conntrack_timeout_other_path(self, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "other", value]

    def get_delete_conntrack_timeout_other_path(self) -> List[str]:
        return ["system", "conntrack", "timeout", "other"]

    def get_conntrack_timeout_tcp_path(self, state: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "tcp", state, value]

    def get_delete_conntrack_timeout_tcp_path(self, state: str) -> List[str]:
        return ["system", "conntrack", "timeout", "tcp", state]

    def get_conntrack_timeout_udp_path(self, subtype: str, value: str) -> List[str]:
        return ["system", "conntrack", "timeout", "udp", subtype, value]

    def get_delete_conntrack_timeout_udp_path(self, subtype: str) -> List[str]:
        return ["system", "conntrack", "timeout", "udp", subtype]

    def get_available_conntrack_modules(self) -> List[str]:
        return ["ftp", "h323", "nfs", "pptp", "sip", "sqlnet", "tftp"]

    def supports_conntrack_global_timeouts(self) -> bool:
        return True

    # =========================================================================
    # Flow accounting - 1.4 differences
    # =========================================================================

    def get_flow_accounting_interface_path(self, iface: str) -> List[str]:
        """1.4: interface at root of flow-accounting, not under netflow."""
        return ["system", "flow-accounting", "interface", iface]

    def get_delete_flow_accounting_interface_path(self, iface: str) -> List[str]:
        return ["system", "flow-accounting", "interface", iface]

    def get_flow_accounting_netflow_source_address_path(self, addr: str) -> List[str]:
        """1.4: global source-address under netflow (not per-server)."""
        return ["system", "flow-accounting", "netflow", "source-address", addr]

    def get_delete_flow_accounting_netflow_source_address_path(self) -> List[str]:
        return ["system", "flow-accounting", "netflow", "source-address"]

    def get_flow_accounting_interface_config_key(self) -> str:
        return "root"  # signals parser to look at flow-accounting root, not netflow

    # =========================================================================
    # sFlow — 1.4: nested under flow-accounting
    # =========================================================================

    def get_sflow_agent_address_path(self, addr: str) -> List[str]:
        return ["system", "flow-accounting", "sflow", "agent-address", addr]

    def get_delete_sflow_agent_address_path(self) -> List[str]:
        return ["system", "flow-accounting", "sflow", "agent-address"]

    def get_sflow_sampling_rate_path(self, rate: str) -> List[str]:
        return ["system", "flow-accounting", "sflow", "sampling-rate", rate]

    def get_delete_sflow_sampling_rate_path(self) -> List[str]:
        return ["system", "flow-accounting", "sflow", "sampling-rate"]

    def get_sflow_server_path(self, server: str) -> List[str]:
        return ["system", "flow-accounting", "sflow", "server", server]

    def get_delete_sflow_server_path(self, server: str) -> List[str]:
        return ["system", "flow-accounting", "sflow", "server", server]

    def get_sflow_server_port_path(self, server: str, port: str) -> List[str]:
        return ["system", "flow-accounting", "sflow", "server", server, "port", port]

    def get_sflow_config_root(self) -> str:
        return "flow-accounting-sflow"  # signals parser to look inside flow-accounting

    def supports_standalone_sflow(self) -> bool:
        return False

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

    def supports_resource_limits(self) -> bool:
        return False
