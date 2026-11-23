"""High-availability batch builder.

Configuration lives under ``high-availability``. Each op's first parameter is
the object the batch request names (a VRRP group, sync group, or virtual
server). Global ops name it ``_name`` and ignore it.

Version differences live on the mapper subclass: VRRP ``health-check
timeout`` and ``vrrp snmp trap`` exist only on 1.5.
"""

from typing import Any, Dict, List, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.high_availability import HighAvailabilityMapper
from vyos_builders.base import BatchBuilder


class HighAvailabilityBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.m = cast(HighAvailabilityMapper, CommandMapperRegistry.get_mapper("high_availability", version))

    # =========================================================================
    # Core
    # =========================================================================

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a leaf only one VyOS version has; ValueError elsewhere."""
        self.m.require_node(node)
        return getattr(self.m, method)(*args)

    # =========================================================================
    # HA global
    # =========================================================================

    def set_ha_disable(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_ha_disable_path())

    def delete_ha_disable(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_ha_disable_path())

    # =========================================================================
    # VRRP global parameters
    # =========================================================================

    def delete_vrrp_global_parameters(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path())

    def set_vrrp_global_startup_delay(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_startup_delay_path(value))

    def delete_vrrp_global_startup_delay(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["startup-delay"])

    def set_vrrp_global_version(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_version_path(value))

    def delete_vrrp_global_version(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["version"])

    def set_vrrp_global_garp_interval(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_garp_interval_path(value))

    def delete_vrrp_global_garp_interval(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp", "interval"])

    def set_vrrp_global_garp_master_delay(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_garp_master_delay_path(value))

    def delete_vrrp_global_garp_master_delay(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp", "master-delay"])

    def set_vrrp_global_garp_master_refresh(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_garp_master_refresh_path(value))

    def delete_vrrp_global_garp_master_refresh(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp", "master-refresh"])

    def set_vrrp_global_garp_master_refresh_repeat(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_garp_master_refresh_repeat_path(value))

    def delete_vrrp_global_garp_master_refresh_repeat(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp", "master-refresh-repeat"])

    def set_vrrp_global_garp_master_repeat(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_global_garp_master_repeat_path(value))

    def delete_vrrp_global_garp_master_repeat(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp", "master-repeat"])

    def delete_vrrp_global_garp(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_global_params_path() + ["garp"])

    def set_vrrp_snmp(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_snmp_path())

    def delete_vrrp_snmp(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_snmp_path())

    def set_vrrp_snmp_trap(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self._versioned_path("vrrp snmp trap", "get_vrrp_snmp_trap_path"))

    def delete_vrrp_snmp_trap(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self._versioned_path("vrrp snmp trap", "get_vrrp_snmp_trap_path"))

    # =========================================================================
    # VRRP group
    # =========================================================================

    def create_vrrp_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_path(name))

    def delete_vrrp_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name))

    def set_vrrp_group_vrid(self, name: str, vrid: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_vrid_path(name, vrid))

    def set_vrrp_group_interface(self, name: str, interface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_interface_path(name, interface))

    def set_vrrp_group_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_address_path(name, address))

    def delete_vrrp_group_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_address_path(name, address))

    def set_vrrp_group_address_interface(self, name: str, address: str, interface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_address_interface_path(name, address, interface))

    def delete_vrrp_group_address_interface(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_address_path(name, address) + ["interface"])

    def set_vrrp_group_excluded_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_excluded_address_path(name, address))

    def delete_vrrp_group_excluded_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_excluded_address_path(name, address))

    def set_vrrp_group_excluded_address_interface(self, name: str, address: str, interface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_excluded_address_interface_path(name, address, interface))

    def delete_vrrp_group_excluded_address_interface(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_excluded_address_path(name, address) + ["interface"])

    def set_vrrp_group_priority(self, name: str, priority: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_priority_path(name, priority))

    def delete_vrrp_group_priority(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name) + ["priority"])

    def set_vrrp_group_advertise_interval(self, name: str, interval: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_advertise_interval_path(name, interval))

    def delete_vrrp_group_advertise_interval(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name) + ["advertise-interval"])

    def set_vrrp_group_auth_type(self, name: str, auth_type: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_auth_type_path(name, auth_type))

    def set_vrrp_group_auth_password(self, name: str, password: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_auth_password_path(name, password))

    def delete_vrrp_group_auth(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_auth_path(name))

    def set_vrrp_group_preempt_delay(self, name: str, delay: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_preempt_delay_path(name, delay))

    def delete_vrrp_group_preempt_delay(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name) + ["preempt-delay"])

    def set_vrrp_group_no_preempt(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_no_preempt_path(name))

    def delete_vrrp_group_no_preempt(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_no_preempt_path(name))

    def set_vrrp_group_peer_address(self, name: str, peer: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_peer_address_path(name, peer))

    def delete_vrrp_group_peer_address(self, name: str, peer: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_peer_address_path(name, peer))

    def set_vrrp_group_hello_source_address(self, name: str, addr: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_hello_source_address_path(name, addr))

    def delete_vrrp_group_hello_source_address(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name) + ["hello-source-address"])

    def set_vrrp_group_rfc3768_compatibility(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_rfc3768_path(name))

    def delete_vrrp_group_rfc3768_compatibility(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_rfc3768_path(name))

    def set_vrrp_group_disable(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_disable_path(name))

    def delete_vrrp_group_disable(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_disable_path(name))

    def set_vrrp_group_description(self, name: str, desc: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_description_path(name, desc))

    def delete_vrrp_group_description(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_path(name) + ["description"])

    # --- garp ---

    def set_vrrp_group_garp_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_garp_interval_path(name, value))

    def delete_vrrp_group_garp_interval(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name) + ["interval"])

    def set_vrrp_group_garp_master_delay(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_garp_master_delay_path(name, value))

    def delete_vrrp_group_garp_master_delay(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name) + ["master-delay"])

    def set_vrrp_group_garp_master_refresh(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_garp_master_refresh_path(name, value))

    def delete_vrrp_group_garp_master_refresh(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name) + ["master-refresh"])

    def set_vrrp_group_garp_master_refresh_repeat(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_garp_master_refresh_repeat_path(name, value))

    def delete_vrrp_group_garp_master_refresh_repeat(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name) + ["master-refresh-repeat"])

    def set_vrrp_group_garp_master_repeat(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_garp_master_repeat_path(name, value))

    def delete_vrrp_group_garp_master_repeat(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name) + ["master-repeat"])

    def delete_vrrp_group_garp(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_garp_path(name))

    # --- health-check ---

    def set_vrrp_group_health_check_failure_count(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_health_check_failure_count_path(name, value))

    def delete_vrrp_group_health_check_failure_count(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_health_check_path(name) + ["failure-count"])

    def set_vrrp_group_health_check_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_health_check_interval_path(name, value))

    def delete_vrrp_group_health_check_interval(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_health_check_path(name) + ["interval"])

    def set_vrrp_group_health_check_ping(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_health_check_ping_path(name, value))

    def delete_vrrp_group_health_check_ping(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_health_check_path(name) + ["ping"])

    def set_vrrp_group_health_check_script(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_health_check_script_path(name, value))

    def delete_vrrp_group_health_check_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_health_check_path(name) + ["script"])

    def set_vrrp_group_health_check_timeout(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self._versioned_path(
            "vrrp group health-check timeout", "get_vrrp_group_health_check_timeout_path", name, value,
        ))

    def delete_vrrp_group_health_check_timeout(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self._versioned_path(
            "vrrp group health-check timeout", "get_vrrp_group_health_check_path", name,
        ) + ["timeout"])

    def delete_vrrp_group_health_check(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_health_check_path(name))

    # --- track ---

    def set_vrrp_group_track_interface(self, name: str, iface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_track_interface_path(name, iface))

    def delete_vrrp_group_track_interface(self, name: str, iface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_track_interface_path(name, iface))

    def set_vrrp_group_track_exclude_vrrp_interface(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_track_exclude_vrrp_interface_path(name))

    def delete_vrrp_group_track_exclude_vrrp_interface(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_track_exclude_vrrp_interface_path(name))

    def delete_vrrp_group_track(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_track_path(name))

    # --- transition-script ---

    def set_vrrp_group_transition_script_backup(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_transition_script_backup_path(name, script))

    def delete_vrrp_group_transition_script_backup(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_transition_script_path(name) + ["backup"])

    def set_vrrp_group_transition_script_fault(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_transition_script_fault_path(name, script))

    def delete_vrrp_group_transition_script_fault(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_transition_script_path(name) + ["fault"])

    def set_vrrp_group_transition_script_master(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_transition_script_master_path(name, script))

    def delete_vrrp_group_transition_script_master(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_transition_script_path(name) + ["master"])

    def set_vrrp_group_transition_script_stop(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_group_transition_script_stop_path(name, script))

    def delete_vrrp_group_transition_script_stop(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_transition_script_path(name) + ["stop"])

    def delete_vrrp_group_transition_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_group_transition_script_path(name))

    # =========================================================================
    # VRRP sync group
    # =========================================================================

    def create_vrrp_sync_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_path(name))

    def delete_vrrp_sync_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_path(name))

    def set_vrrp_sync_group_member(self, name: str, member: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_member_path(name, member))

    def delete_vrrp_sync_group_member(self, name: str, member: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_member_path(name, member))

    # --- health-check ---

    def set_vrrp_sync_group_health_check_failure_count(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_health_check_failure_count_path(name, value))

    def delete_vrrp_sync_group_health_check_failure_count(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_health_check_path(name) + ["failure-count"])

    def set_vrrp_sync_group_health_check_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_health_check_interval_path(name, value))

    def delete_vrrp_sync_group_health_check_interval(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_health_check_path(name) + ["interval"])

    def set_vrrp_sync_group_health_check_ping(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_health_check_ping_path(name, value))

    def delete_vrrp_sync_group_health_check_ping(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_health_check_path(name) + ["ping"])

    def set_vrrp_sync_group_health_check_script(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_health_check_script_path(name, value))

    def delete_vrrp_sync_group_health_check_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_health_check_path(name) + ["script"])

    def set_vrrp_sync_group_health_check_timeout(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self._versioned_path(
            "vrrp sync-group health-check timeout", "get_vrrp_sync_group_health_check_timeout_path", name, value,
        ))

    def delete_vrrp_sync_group_health_check_timeout(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self._versioned_path(
            "vrrp sync-group health-check timeout", "get_vrrp_sync_group_health_check_path", name,
        ) + ["timeout"])

    def delete_vrrp_sync_group_health_check(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_health_check_path(name))

    # --- transition-script ---

    def set_vrrp_sync_group_transition_script_backup(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_transition_script_backup_path(name, script))

    def delete_vrrp_sync_group_transition_script_backup(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_transition_script_path(name) + ["backup"])

    def set_vrrp_sync_group_transition_script_fault(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_transition_script_fault_path(name, script))

    def delete_vrrp_sync_group_transition_script_fault(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_transition_script_path(name) + ["fault"])

    def set_vrrp_sync_group_transition_script_master(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_transition_script_master_path(name, script))

    def delete_vrrp_sync_group_transition_script_master(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_transition_script_path(name) + ["master"])

    def set_vrrp_sync_group_transition_script_stop(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_vrrp_sync_group_transition_script_stop_path(name, script))

    def delete_vrrp_sync_group_transition_script_stop(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_transition_script_path(name) + ["stop"])

    def delete_vrrp_sync_group_transition_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_vrrp_sync_group_transition_script_path(name))

    # =========================================================================
    # Virtual server
    # =========================================================================

    def create_virtual_server(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_path(name))

    def delete_virtual_server(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name))

    def set_virtual_server_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_address_path(name, address))

    def delete_virtual_server_address(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["address"])

    def set_virtual_server_algorithm(self, name: str, algorithm: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_algorithm_path(name, algorithm))

    def delete_virtual_server_algorithm(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["algorithm"])

    def set_virtual_server_delay_loop(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_delay_loop_path(name, value))

    def delete_virtual_server_delay_loop(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["delay-loop"])

    def set_virtual_server_forward_method(self, name: str, method: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_forward_method_path(name, method))

    def delete_virtual_server_forward_method(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["forward-method"])

    def set_virtual_server_fwmark(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_fwmark_path(name, value))

    def delete_virtual_server_fwmark(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["fwmark"])

    def set_virtual_server_persistence_timeout(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_persistence_timeout_path(name, value))

    def delete_virtual_server_persistence_timeout(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["persistence-timeout"])

    def set_virtual_server_port(self, name: str, port: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_port_path(name, port))

    def delete_virtual_server_port(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["port"])

    def set_virtual_server_protocol(self, name: str, protocol: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_protocol_path(name, protocol))

    def delete_virtual_server_protocol(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_path(name) + ["protocol"])

    # --- real-server ---

    def set_virtual_server_real_server(self, name: str, real_server: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_real_server_path(name, real_server))

    def delete_virtual_server_real_server(self, name: str, real_server: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_real_server_path(name, real_server))

    def set_virtual_server_real_server_port(self, name: str, real_server: str, port: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_real_server_port_path(name, real_server, port))

    def set_virtual_server_real_server_connection_timeout(
        self, name: str, real_server: str, value: str,
    ) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_real_server_connection_timeout_path(name, real_server, value))

    def delete_virtual_server_real_server_connection_timeout(
        self, name: str, real_server: str,
    ) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.m.get_virtual_server_real_server_path(name, real_server) + ["connection-timeout"])

    def set_virtual_server_real_server_health_check_script(
        self, name: str, real_server: str, script: str,
    ) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.m.get_virtual_server_real_server_health_check_script_path(name, real_server, script))

    def delete_virtual_server_real_server_health_check(
        self, name: str, real_server: str,
    ) -> "HighAvailabilityBatchBuilder":
        # health-check holds only script, so the parent delete clears the leaf.
        return self.add_delete(self.m.get_virtual_server_real_server_path(name, real_server) + ["health-check"])

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        nodes = self.m.versioned_nodes()
        return {
            "forward_methods": self.m.forward_methods(),
            "algorithms": self.m.algorithms(),
            "protocols": self.m.protocols(),
            "auth_types": self.m.auth_types(),
            "vrrp_versions": self.m.vrrp_versions(),
            "features": {
                "vrrp_snmp_trap": {
                    "supported": "vrrp snmp trap" in nodes,
                    "description": "VRRP SNMP traps",
                },
                "health_check_timeout": {
                    "supported": "vrrp group health-check timeout" in nodes,
                    "description": "VRRP group health-check script timeout",
                },
                "sync_group_health_check_timeout": {
                    "supported": "vrrp sync-group health-check timeout" in nodes,
                    "description": "VRRP sync-group health-check script timeout",
                },
            },
        }
