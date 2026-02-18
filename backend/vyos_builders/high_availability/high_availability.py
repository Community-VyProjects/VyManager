from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class HighAvailabilityBatchBuilder:
    """
    Batch builder for high-availability configuration.

    Supports three entity types, each addressed by item_name in the batch request:
      - VRRP groups        (item_name = group name)
      - VRRP sync groups   (item_name = sync group name)
      - Virtual servers    (item_name = virtual server name)
      - VRRP globals       (item_name = "" – ignored)
      - HA global          (item_name = "" – ignored)

    For operations on real-server sub-nodes, composite values are used with "|"
    as a separator: e.g. value="192.168.1.10|8080" means real_server=192.168.1.10, port=8080.
    """

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "high_availability"

    def add_set(self, path: List[str]) -> "HighAvailabilityBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "HighAvailabilityBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # =========================================================================
    # HA Global
    # =========================================================================

    def set_ha_disable(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ha_disable_path())

    def delete_ha_disable(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ha_disable_path())

    # =========================================================================
    # VRRP Global Parameters
    # =========================================================================

    def set_vrrp_global_startup_delay(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_startup_delay_path(value))

    def delete_vrrp_global_startup_delay(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["startup-delay"])

    def set_vrrp_global_version(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_version_path(value))

    def delete_vrrp_global_version(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["version"])

    def set_vrrp_global_garp_interval(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_garp_interval_path(value))

    def delete_vrrp_global_garp_interval(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["garp", "interval"])

    def set_vrrp_global_garp_master_delay(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_garp_master_delay_path(value))

    def delete_vrrp_global_garp_master_delay(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["garp", "master-delay"])

    def set_vrrp_global_garp_master_refresh(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_garp_master_refresh_path(value))

    def delete_vrrp_global_garp_master_refresh(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["garp", "master-refresh"])

    def set_vrrp_global_garp_master_refresh_repeat(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_garp_master_refresh_repeat_path(value))

    def delete_vrrp_global_garp_master_refresh_repeat(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["garp", "master-refresh-repeat"])

    def set_vrrp_global_garp_master_repeat(self, _name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_global_garp_master_repeat_path(value))

    def delete_vrrp_global_garp_master_repeat(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_global_params_path() + ["garp", "master-repeat"])

    def set_vrrp_snmp(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_snmp_path())

    def delete_vrrp_snmp(self, _name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_snmp_path())

    # =========================================================================
    # VRRP Group operations  (item_name = group name)
    # =========================================================================

    def create_vrrp_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_path(name))

    def delete_vrrp_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_path(name))

    def set_vrrp_group_vrid(self, name: str, vrid: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_vrid_path(name, vrid))

    def set_vrrp_group_interface(self, name: str, interface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_interface_path(name, interface))

    def set_vrrp_group_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_address_path(name, address))

    def delete_vrrp_group_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_address_path(name, address))

    def set_vrrp_group_address_interface(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        """value format: 'address|interface'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_vrrp_group_address_interface_path(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrrp_group_address_interface(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrrp_group_address_path(name, address) + ["interface"]
        return self.add_delete(path)

    def set_vrrp_group_excluded_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_excluded_address_path(name, address))

    def delete_vrrp_group_excluded_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_excluded_address_path(name, address))

    def set_vrrp_group_excluded_address_interface(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        """value format: 'address|interface'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_vrrp_group_excluded_address_interface_path(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrrp_group_priority(self, name: str, priority: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_priority_path(name, priority))

    def set_vrrp_group_advertise_interval(self, name: str, interval: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_advertise_interval_path(name, interval))

    def set_vrrp_group_auth_type(self, name: str, auth_type: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_auth_type_path(name, auth_type))

    def set_vrrp_group_auth_password(self, name: str, password: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_auth_password_path(name, password))

    def delete_vrrp_group_auth(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_auth_path(name))

    def set_vrrp_group_preempt_delay(self, name: str, delay: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_preempt_delay_path(name, delay))

    def delete_vrrp_group_preempt_delay(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrrp_group_path(name) + ["preempt-delay"]
        return self.add_delete(path)

    def set_vrrp_group_no_preempt(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_no_preempt_path(name))

    def delete_vrrp_group_no_preempt(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_no_preempt_path(name))

    def set_vrrp_group_peer_address(self, name: str, peer: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_peer_address_path(name, peer))

    def delete_vrrp_group_peer_address(self, name: str, peer: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_peer_address_path(name, peer))

    def set_vrrp_group_hello_source_address(self, name: str, addr: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_hello_source_address_path(name, addr))

    def delete_vrrp_group_hello_source_address(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrrp_group_path(name) + ["hello-source-address"]
        return self.add_delete(path)

    def set_vrrp_group_rfc3768_compatibility(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_rfc3768_path(name))

    def delete_vrrp_group_rfc3768_compatibility(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_rfc3768_path(name))

    def set_vrrp_group_disable(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_disable_path(name))

    def delete_vrrp_group_disable(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_disable_path(name))

    def set_vrrp_group_description(self, name: str, desc: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_description_path(name, desc))

    def delete_vrrp_group_description(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrrp_group_path(name) + ["description"]
        return self.add_delete(path)

    # GARP per-group
    def set_vrrp_group_garp_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_garp_interval_path(name, value))

    def set_vrrp_group_garp_master_delay(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_garp_master_delay_path(name, value))

    def set_vrrp_group_garp_master_refresh(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_garp_master_refresh_path(name, value))

    def set_vrrp_group_garp_master_refresh_repeat(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_garp_master_refresh_repeat_path(name, value))

    def set_vrrp_group_garp_master_repeat(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_garp_master_repeat_path(name, value))

    def delete_vrrp_group_garp(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_garp_path(name))

    # Health check per-group
    def set_vrrp_group_health_check_failure_count(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_health_check_failure_count_path(name, value))

    def set_vrrp_group_health_check_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_health_check_interval_path(name, value))

    def set_vrrp_group_health_check_ping(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_health_check_ping_path(name, value))

    def set_vrrp_group_health_check_script(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_health_check_script_path(name, value))

    def delete_vrrp_group_health_check(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_health_check_path(name))

    # Track per-group
    def set_vrrp_group_track_interface(self, name: str, iface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_track_interface_path(name, iface))

    def delete_vrrp_group_track_interface(self, name: str, iface: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_track_interface_path(name, iface))

    def set_vrrp_group_track_exclude_vrrp_interface(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_track_exclude_vrrp_interface_path(name))

    def delete_vrrp_group_track_exclude_vrrp_interface(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_track_exclude_vrrp_interface_path(name))

    def delete_vrrp_group_track(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_track_path(name))

    # Transition scripts per-group
    def set_vrrp_group_transition_script_backup(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_transition_script_backup_path(name, script))

    def set_vrrp_group_transition_script_fault(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_transition_script_fault_path(name, script))

    def set_vrrp_group_transition_script_master(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_transition_script_master_path(name, script))

    def set_vrrp_group_transition_script_stop(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_group_transition_script_stop_path(name, script))

    def delete_vrrp_group_transition_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_group_transition_script_path(name))

    # =========================================================================
    # VRRP Sync Group operations  (item_name = sync group name)
    # =========================================================================

    def create_vrrp_sync_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_path(name))

    def delete_vrrp_sync_group(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_sync_group_path(name))

    def set_vrrp_sync_group_member(self, name: str, member: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_member_path(name, member))

    def delete_vrrp_sync_group_member(self, name: str, member: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_sync_group_member_path(name, member))

    def set_vrrp_sync_group_health_check_failure_count(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_health_check_failure_count_path(name, value))

    def set_vrrp_sync_group_health_check_interval(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_health_check_interval_path(name, value))

    def set_vrrp_sync_group_health_check_ping(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_health_check_ping_path(name, value))

    def set_vrrp_sync_group_health_check_script(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_health_check_script_path(name, value))

    def delete_vrrp_sync_group_health_check(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_sync_group_health_check_path(name))

    def set_vrrp_sync_group_transition_script_backup(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_transition_script_backup_path(name, script))

    def set_vrrp_sync_group_transition_script_fault(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_transition_script_fault_path(name, script))

    def set_vrrp_sync_group_transition_script_master(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_transition_script_master_path(name, script))

    def set_vrrp_sync_group_transition_script_stop(self, name: str, script: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_vrrp_sync_group_transition_script_stop_path(name, script))

    def delete_vrrp_sync_group_transition_script(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_vrrp_sync_group_transition_script_path(name))

    # =========================================================================
    # Virtual Server operations  (item_name = virtual server name)
    # =========================================================================

    def create_virtual_server(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_path(name))

    def delete_virtual_server(self, name: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_virtual_server_path(name))

    def set_virtual_server_address(self, name: str, address: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_address_path(name, address))

    def set_virtual_server_algorithm(self, name: str, algorithm: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_algorithm_path(name, algorithm))

    def delete_virtual_server_algorithm(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["algorithm"]
        return self.add_delete(path)

    def set_virtual_server_delay_loop(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_delay_loop_path(name, value))

    def delete_virtual_server_delay_loop(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["delay-loop"]
        return self.add_delete(path)

    def set_virtual_server_forward_method(self, name: str, method: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_forward_method_path(name, method))

    def delete_virtual_server_forward_method(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["forward-method"]
        return self.add_delete(path)

    def set_virtual_server_fwmark(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_fwmark_path(name, value))

    def delete_virtual_server_fwmark(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["fwmark"]
        return self.add_delete(path)

    def set_virtual_server_persistence_timeout(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_persistence_timeout_path(name, value))

    def delete_virtual_server_persistence_timeout(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["persistence-timeout"]
        return self.add_delete(path)

    def set_virtual_server_port(self, name: str, port: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_port_path(name, port))

    def delete_virtual_server_port(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["port"]
        return self.add_delete(path)

    def set_virtual_server_protocol(self, name: str, protocol: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_protocol_path(name, protocol))

    def delete_virtual_server_protocol(self, name: str) -> "HighAvailabilityBatchBuilder":
        path = self.mappers[self.mapper_key].get_virtual_server_path(name) + ["protocol"]
        return self.add_delete(path)

    # Real server operations – value format: "real_server_addr" or "real_server_addr|extra"
    def set_virtual_server_real_server(self, name: str, real_server: str) -> "HighAvailabilityBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_virtual_server_real_server_path(name, real_server))

    def delete_virtual_server_real_server(self, name: str, real_server: str) -> "HighAvailabilityBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_virtual_server_real_server_path(name, real_server))

    def set_virtual_server_real_server_port(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        """value format: 'real_server_addr|port'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_virtual_server_real_server_port_path(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_virtual_server_real_server_connection_timeout(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        """value format: 'real_server_addr|timeout'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_virtual_server_real_server_connection_timeout_path(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_virtual_server_real_server_health_check_script(self, name: str, value: str) -> "HighAvailabilityBatchBuilder":
        """value format: 'real_server_addr|script_path'"""
        parts = value.split("|", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_virtual_server_real_server_health_check_script_path(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "vrrp": {
                    "supported": True,
                    "description": "Virtual Router Redundancy Protocol",
                },
                "virtual_server": {
                    "supported": True,
                    "description": "Load balancing with keepalived",
                },
                "vrrp_snmp": {
                    "supported": True,
                    "description": "VRRP SNMP notifications",
                },
            },
        }
