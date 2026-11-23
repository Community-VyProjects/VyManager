"""High-availability command mapper.

The shared class holds the commands both labs have. The 1.5 subclass adds the
VRRP ``health-check timeout`` leaves and ``vrrp snmp trap``.
"""

from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper

BASE = ["high-availability"]


class HighAvailabilityMapper(BaseFeatureMapper):
    """Shared high-availability commands. 1.5-only path methods live on the subclass."""

    # virtual-server forward-method allowed values (both labs). `dr` is the
    # keepalived name, not a CLI value, and validate-value rejects it.
    _FORWARD_METHODS = ("direct", "nat", "tunnel")

    # virtual-server algorithm allowed values (both labs).
    _ALGORITHMS = (
        "round-robin",
        "weighted-round-robin",
        "least-connection",
        "weighted-least-connection",
        "source-hashing",
        "destination-hashing",
        "locality-based-least-connection",
    )

    # virtual-server protocol allowed values (both labs).
    _PROTOCOLS = ("tcp", "udp")

    # vrrp group authentication type allowed values (both labs).
    _AUTH_TYPES = ("plaintext-password", "ah")

    # vrrp global-parameters version: numeric --range 2-3 (both labs).
    _VRRP_VERSIONS = ("2", "3")

    # Leaves only 1.5 has, mapped to the path method the subclass defines.
    _VERSIONED_NODES = {
        "vrrp group health-check timeout": "get_vrrp_group_health_check_timeout_path",
        "vrrp sync-group health-check timeout": "get_vrrp_sync_group_health_check_timeout_path",
        "vrrp snmp trap": "get_vrrp_snmp_trap_path",
    }

    # ========================================================================
    # Core
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"{node} is not supported on this device")

    def parse_config(self, full_config: Any) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_ha_config

        return parse_ha_config(self, full_config)

    def forward_methods(self) -> List[str]:
        return list(self._FORWARD_METHODS)

    def algorithms(self) -> List[str]:
        return list(self._ALGORITHMS)

    def protocols(self) -> List[str]:
        return list(self._PROTOCOLS)

    def auth_types(self) -> List[str]:
        return list(self._AUTH_TYPES)

    def vrrp_versions(self) -> List[str]:
        return list(self._VRRP_VERSIONS)

    # ========================================================================
    # HA global
    # ========================================================================

    def get_ha_disable_path(self) -> List[str]:
        return BASE + ["disable"]

    # ========================================================================
    # VRRP global parameters
    # ========================================================================

    def get_vrrp_global_params_path(self) -> List[str]:
        return BASE + ["vrrp", "global-parameters"]

    def get_vrrp_global_startup_delay_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "startup-delay", value]

    def get_vrrp_global_version_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "version", value]

    def get_vrrp_global_garp_interval_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "garp", "interval", value]

    def get_vrrp_global_garp_master_delay_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "garp", "master-delay", value]

    def get_vrrp_global_garp_master_refresh_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "garp", "master-refresh", value]

    def get_vrrp_global_garp_master_refresh_repeat_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "garp", "master-refresh-repeat", value]

    def get_vrrp_global_garp_master_repeat_path(self, value: str) -> List[str]:
        return BASE + ["vrrp", "global-parameters", "garp", "master-repeat", value]

    def get_vrrp_snmp_path(self) -> List[str]:
        return BASE + ["vrrp", "snmp"]

    # ========================================================================
    # VRRP group
    # ========================================================================

    def get_vrrp_group_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name]

    def get_vrrp_group_vrid_path(self, name: str, vrid: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "vrid", vrid]

    def get_vrrp_group_interface_path(self, name: str, interface: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "interface", interface]

    def get_vrrp_group_address_path(self, name: str, address: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "address", address]

    def get_vrrp_group_address_interface_path(self, name: str, address: str, interface: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "address", address, "interface", interface]

    def get_vrrp_group_excluded_address_path(self, name: str, address: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "excluded-address", address]

    def get_vrrp_group_excluded_address_interface_path(self, name: str, address: str, interface: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "excluded-address", address, "interface", interface]

    def get_vrrp_group_priority_path(self, name: str, priority: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "priority", priority]

    def get_vrrp_group_advertise_interval_path(self, name: str, interval: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "advertise-interval", interval]

    def get_vrrp_group_auth_type_path(self, name: str, auth_type: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "authentication", "type", auth_type]

    def get_vrrp_group_auth_password_path(self, name: str, password: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "authentication", "password", password]

    def get_vrrp_group_auth_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "authentication"]

    def get_vrrp_group_preempt_delay_path(self, name: str, delay: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "preempt-delay", delay]

    def get_vrrp_group_no_preempt_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "no-preempt"]

    def get_vrrp_group_peer_address_path(self, name: str, peer: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "peer-address", peer]

    def get_vrrp_group_hello_source_address_path(self, name: str, addr: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "hello-source-address", addr]

    def get_vrrp_group_rfc3768_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "rfc3768-compatibility"]

    def get_vrrp_group_disable_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "disable"]

    def get_vrrp_group_description_path(self, name: str, desc: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "description", desc]

    def get_vrrp_group_garp_interval_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp", "interval", value]

    def get_vrrp_group_garp_master_delay_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp", "master-delay", value]

    def get_vrrp_group_garp_master_refresh_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp", "master-refresh", value]

    def get_vrrp_group_garp_master_refresh_repeat_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp", "master-refresh-repeat", value]

    def get_vrrp_group_garp_master_repeat_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp", "master-repeat", value]

    def get_vrrp_group_garp_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "garp"]

    def get_vrrp_group_health_check_failure_count_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check", "failure-count", value]

    def get_vrrp_group_health_check_interval_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check", "interval", value]

    def get_vrrp_group_health_check_ping_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check", "ping", value]

    def get_vrrp_group_health_check_script_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check", "script", value]

    def get_vrrp_group_health_check_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check"]

    def get_vrrp_group_track_interface_path(self, name: str, iface: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "track", "interface", iface]

    def get_vrrp_group_track_exclude_vrrp_interface_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "track", "exclude-vrrp-interface"]

    def get_vrrp_group_track_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "track"]

    def get_vrrp_group_transition_script_backup_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "transition-script", "backup", script]

    def get_vrrp_group_transition_script_fault_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "transition-script", "fault", script]

    def get_vrrp_group_transition_script_master_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "transition-script", "master", script]

    def get_vrrp_group_transition_script_stop_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "transition-script", "stop", script]

    def get_vrrp_group_transition_script_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "transition-script"]

    # ========================================================================
    # VRRP sync group
    # ========================================================================

    def get_vrrp_sync_group_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name]

    def get_vrrp_sync_group_member_path(self, name: str, member: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "member", member]

    def get_vrrp_sync_group_health_check_failure_count_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check", "failure-count", value]

    def get_vrrp_sync_group_health_check_interval_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check", "interval", value]

    def get_vrrp_sync_group_health_check_ping_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check", "ping", value]

    def get_vrrp_sync_group_health_check_script_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check", "script", value]

    def get_vrrp_sync_group_health_check_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check"]

    def get_vrrp_sync_group_transition_script_backup_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "transition-script", "backup", script]

    def get_vrrp_sync_group_transition_script_fault_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "transition-script", "fault", script]

    def get_vrrp_sync_group_transition_script_master_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "transition-script", "master", script]

    def get_vrrp_sync_group_transition_script_stop_path(self, name: str, script: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "transition-script", "stop", script]

    def get_vrrp_sync_group_transition_script_path(self, name: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "transition-script"]

    # ========================================================================
    # Virtual server
    # ========================================================================

    def get_virtual_server_path(self, name: str) -> List[str]:
        return BASE + ["virtual-server", name]

    def get_virtual_server_address_path(self, name: str, address: str) -> List[str]:
        return BASE + ["virtual-server", name, "address", address]

    def get_virtual_server_algorithm_path(self, name: str, algorithm: str) -> List[str]:
        return BASE + ["virtual-server", name, "algorithm", algorithm]

    def get_virtual_server_delay_loop_path(self, name: str, value: str) -> List[str]:
        return BASE + ["virtual-server", name, "delay-loop", value]

    def get_virtual_server_forward_method_path(self, name: str, method: str) -> List[str]:
        if method not in self._FORWARD_METHODS:
            raise ValueError(f"forward-method {method} is not supported on this device")
        return BASE + ["virtual-server", name, "forward-method", method]

    def get_virtual_server_fwmark_path(self, name: str, value: str) -> List[str]:
        return BASE + ["virtual-server", name, "fwmark", value]

    def get_virtual_server_persistence_timeout_path(self, name: str, value: str) -> List[str]:
        return BASE + ["virtual-server", name, "persistence-timeout", value]

    def get_virtual_server_port_path(self, name: str, port: str) -> List[str]:
        return BASE + ["virtual-server", name, "port", port]

    def get_virtual_server_protocol_path(self, name: str, protocol: str) -> List[str]:
        return BASE + ["virtual-server", name, "protocol", protocol]

    def get_virtual_server_real_server_path(self, name: str, real_server: str) -> List[str]:
        return BASE + ["virtual-server", name, "real-server", real_server]

    def get_virtual_server_real_server_port_path(self, name: str, real_server: str, port: str) -> List[str]:
        return BASE + ["virtual-server", name, "real-server", real_server, "port", port]

    def get_virtual_server_real_server_connection_timeout_path(self, name: str, real_server: str, value: str) -> List[str]:
        return BASE + ["virtual-server", name, "real-server", real_server, "connection-timeout", value]

    def get_virtual_server_real_server_health_check_script_path(self, name: str, real_server: str, script: str) -> List[str]:
        return BASE + ["virtual-server", name, "real-server", real_server, "health-check", "script", script]
