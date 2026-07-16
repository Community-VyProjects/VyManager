"""
OSPF Protocol Batch Builder

Provides all batch operations for OSPF (Open Shortest Path First) configuration.
Covers: parameters, areas, interfaces, redistribute, default-information,
distance, timers, max-metric, graceful-restart, neighbors, access-list,
auto-cost, log-adjacency-changes, passive-interface, maximum-paths,
ldp-sync, mpls-te, summary-address, segment-routing, aggregation, capability.

Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class OspfBatchBuilder:
    """Complete batch builder for OSPF protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ospf"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "OspfBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "OspfBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    @property
    def m(self):
        return self.mappers[self.mapper_key]

    # ========================================================================
    # Parameters
    # ========================================================================

    def set_router_id(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_router_id(value))

    def delete_router_id(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_router_id_delete())

    def set_abr_type(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_abr_type(value))

    def delete_abr_type(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_abr_type_delete())

    def set_opaque_lsa(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_opaque_lsa())

    def delete_opaque_lsa(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_opaque_lsa())

    def set_rfc1583_compatibility(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_rfc1583_compatibility())

    def delete_rfc1583_compatibility(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_rfc1583_compatibility())

    # ========================================================================
    # Areas
    # ========================================================================

    def set_area(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area(area_id))

    def delete_area(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_delete(area_id))

    def set_area_type_stub(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_stub(area_id))

    def set_area_type_stub_no_summary(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_stub_no_summary(area_id))

    def set_area_type_stub_default_cost(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_stub_default_cost(area_id, value))

    def set_area_type_nssa(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_nssa(area_id))

    def set_area_type_nssa_no_summary(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_no_summary(area_id))

    def set_area_type_nssa_default_cost(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_default_cost(area_id, value))

    def set_area_type_normal(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_type_normal(area_id))

    def delete_area_type(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_type_delete(area_id))

    def set_area_network(self, area_id: str, network: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_network(area_id, network))

    def delete_area_network(self, area_id: str, network: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_network_delete(area_id, network))

    def set_area_range(self, area_id: str, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_range(area_id, prefix))

    def set_area_range_cost(self, area_id: str, prefix: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_range_cost(area_id, prefix, value))

    def set_area_range_not_advertise(self, area_id: str, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_range_not_advertise(area_id, prefix))

    def set_area_range_substitute(self, area_id: str, prefix: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_range_substitute(area_id, prefix, value))

    def delete_area_range(self, area_id: str, prefix: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_range_delete(area_id, prefix))

    def set_area_authentication(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_authentication(area_id, value))

    def delete_area_authentication(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_authentication_delete(area_id))

    def set_area_shortcut(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_shortcut(area_id, value))

    def delete_area_shortcut(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_shortcut_delete(area_id))

    def set_area_export_list(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_export_list(area_id, value))

    def delete_area_export_list(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_export_list_delete(area_id))

    def set_area_import_list(self, area_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_import_list(area_id, value))

    def delete_area_import_list(self, area_id: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_import_list_delete(area_id))

    # Area virtual-link
    def set_area_virtual_link(self, area_id: str, address: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_virtual_link(area_id, address))

    def set_area_virtual_link_dead_interval(self, area_id: str, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_virtual_link_dead_interval(area_id, address, value))

    def set_area_virtual_link_hello_interval(self, area_id: str, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_virtual_link_hello_interval(area_id, address, value))

    def set_area_virtual_link_retransmit_interval(self, area_id: str, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_virtual_link_retransmit_interval(area_id, address, value))

    def set_area_virtual_link_transmit_delay(self, area_id: str, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_area_virtual_link_transmit_delay(area_id, address, value))

    def delete_area_virtual_link(self, area_id: str, address: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_area_virtual_link_delete(area_id, address))

    # ========================================================================
    # Interfaces
    # ========================================================================

    def set_interface(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_area(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_area(iface, value))

    def delete_interface_area(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_area_delete(iface))

    def set_interface_cost(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_cost(iface, value))

    def delete_interface_cost(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_cost_delete(iface))

    def set_interface_priority(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_priority(iface, value))

    def delete_interface_priority(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_priority_delete(iface))

    def set_interface_hello_interval(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_hello_interval(iface, value))

    def delete_interface_hello_interval(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_interval_delete(iface))

    def set_interface_dead_interval(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_dead_interval(iface, value))

    def delete_interface_dead_interval(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_dead_interval_delete(iface))

    def set_interface_retransmit_interval(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_retransmit_interval(iface, value))

    def delete_interface_retransmit_interval(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_retransmit_interval_delete(iface))

    def set_interface_transmit_delay(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_transmit_delay(iface, value))

    def delete_interface_transmit_delay(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_transmit_delay_delete(iface))

    def set_interface_network(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_network(iface, value))

    def delete_interface_network(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_network_delete(iface))

    def set_interface_passive(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_passive(iface))

    def set_interface_passive_disable(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_passive_disable(iface))

    def delete_interface_passive(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_passive_delete(iface))

    def set_interface_bfd(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_bfd(iface))

    def delete_interface_bfd(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_delete(iface))

    def set_interface_mtu_ignore(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_mtu_ignore(iface))

    def delete_interface_mtu_ignore(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_mtu_ignore_delete(iface))

    def set_interface_bandwidth(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_bandwidth(iface, value))

    def delete_interface_bandwidth(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_bandwidth_delete(iface))

    def set_interface_hello_multiplier(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_hello_multiplier(iface, value))

    def delete_interface_hello_multiplier(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_multiplier_delete(iface))

    # Interface authentication
    def set_interface_authentication_md5_key_id(self, iface: str, key_id: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_authentication_md5_key_id(iface, key_id))

    def set_interface_authentication_md5_key_id_md5_key(self, iface: str, key_id: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_authentication_md5_key_id_md5_key(iface, key_id, value))

    def set_interface_authentication_plaintext_password(self, iface: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_authentication_plaintext_password(iface, value))

    def delete_interface_authentication(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_authentication_delete(iface))

    def set_interface_ldp_sync(self, iface: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_interface_ldp_sync(iface))

    def delete_interface_ldp_sync(self, iface: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_delete(iface))

    # ========================================================================
    # Redistribute
    # ========================================================================

    # Protocols that only exist as redistribute sources from VyOS 1.5.
    _V15_ONLY_REDISTRIBUTE = frozenset({"nhrp"})

    def _check_redistribute_supported(self, protocol: str) -> None:
        if protocol in self._V15_ONLY_REDISTRIBUTE and "1.4" in self.version:
            raise ValueError(
                f"redistribute {protocol} requires VyOS 1.5+. "
                "Current device is running v1.4")

    def set_redistribute(self, protocol: str) -> "OspfBatchBuilder":
        self._check_redistribute_supported(protocol)
        return self.add_set(self.m.get_redistribute(protocol))

    def set_redistribute_metric(self, protocol: str, value: str) -> "OspfBatchBuilder":
        self._check_redistribute_supported(protocol)
        return self.add_set(self.m.get_redistribute_metric(protocol, value))

    def set_redistribute_metric_type(self, protocol: str, value: str) -> "OspfBatchBuilder":
        self._check_redistribute_supported(protocol)
        return self.add_set(self.m.get_redistribute_metric_type(protocol, value))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "OspfBatchBuilder":
        self._check_redistribute_supported(protocol)
        return self.add_set(self.m.get_redistribute_route_map(protocol, value))

    def delete_redistribute(self, protocol: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(protocol))

    def set_redistribute_table(self, table: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_redistribute_table(table))

    def set_redistribute_table_metric(self, table: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_redistribute_table_metric(table, value))

    def set_redistribute_table_metric_type(self, table: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_redistribute_table_metric_type(table, value))

    def set_redistribute_table_route_map(self, table: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_redistribute_table_route_map(table, value))

    def delete_redistribute_table(self, table: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_redistribute_table_delete(table))

    # ========================================================================
    # Default Information
    # ========================================================================

    def set_default_information_originate(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def set_default_information_originate_always(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_default_information_originate_always())

    def set_default_information_originate_metric(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric(value))

    def set_default_information_originate_metric_type(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric_type(value))

    def set_default_information_originate_route_map(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_default_information_originate_route_map(value))

    def delete_default_information_originate(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    # ========================================================================
    # Distance
    # ========================================================================

    def set_distance_global(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_distance_global(value))

    def delete_distance_global(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_distance_global_delete())

    def set_distance_ospf_external(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_distance_ospf_external(value))

    def set_distance_ospf_inter_area(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_distance_ospf_inter_area(value))

    def set_distance_ospf_intra_area(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_distance_ospf_intra_area(value))

    def delete_distance_ospf(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_distance_ospf_delete())

    # ========================================================================
    # Timers
    # ========================================================================

    def set_timers_throttle_spf_delay(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_timers_throttle_spf_delay(value))

    def set_timers_throttle_spf_initial_holdtime(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_timers_throttle_spf_initial_holdtime(value))

    def set_timers_throttle_spf_max_holdtime(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_timers_throttle_spf_max_holdtime(value))

    def delete_timers_throttle_spf(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_timers_throttle_spf_delete())

    # ========================================================================
    # Max Metric
    # ========================================================================

    def set_max_metric_router_lsa_administrative(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_max_metric_router_lsa_administrative())

    def set_max_metric_router_lsa_on_shutdown(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_max_metric_router_lsa_on_shutdown(value))

    def set_max_metric_router_lsa_on_startup(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_max_metric_router_lsa_on_startup(value))

    def delete_max_metric_router_lsa(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_max_metric_router_lsa_delete())

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def set_graceful_restart(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart())

    def set_graceful_restart_grace_period(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart_grace_period(value))

    def set_graceful_restart_helper_enable(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_enable())

    def set_graceful_restart_helper_no_strict_lsa_checking(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_no_strict_lsa_checking())

    def set_graceful_restart_helper_planned_only(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_planned_only())

    def set_graceful_restart_helper_supported_grace_time(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_supported_grace_time(value))

    def delete_graceful_restart(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_delete())

    # ========================================================================
    # Neighbors
    # ========================================================================

    def set_neighbor(self, address: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_neighbor(address))

    def set_neighbor_poll_interval(self, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_neighbor_poll_interval(address, value))

    def set_neighbor_priority(self, address: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_neighbor_priority(address, value))

    def delete_neighbor(self, address: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_neighbor_delete(address))

    # ========================================================================
    # Access List
    # ========================================================================

    def set_access_list(self, acl: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_access_list(acl))

    def set_access_list_export(self, acl: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_access_list_export(acl, value))

    def delete_access_list(self, acl: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_access_list_delete(acl))

    # ========================================================================
    # Auto Cost
    # ========================================================================

    def set_auto_cost_reference_bandwidth(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_auto_cost_reference_bandwidth(value))

    def delete_auto_cost_reference_bandwidth(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_auto_cost_reference_bandwidth_delete())

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def set_log_adjacency_changes(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes())

    def set_log_adjacency_changes_detail(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes_detail())

    def delete_log_adjacency_changes(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_log_adjacency_changes_delete())

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def set_passive_interface_default(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_passive_interface_default())

    def delete_passive_interface_default(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_passive_interface_default_delete())

    # ========================================================================
    # Maximum Paths
    # ========================================================================

    def set_maximum_paths(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_maximum_paths(value))

    def delete_maximum_paths(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_maximum_paths_delete())

    # ========================================================================
    # LDP Sync
    # ========================================================================

    def set_ldp_sync_holddown(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_ldp_sync_holddown(value))

    def delete_ldp_sync_holddown(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_ldp_sync_holddown_delete())

    # ========================================================================
    # MPLS-TE
    # ========================================================================

    def set_mpls_te_enable(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_mpls_te_enable())

    def set_mpls_te_router_address(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_mpls_te_router_address(value))

    def delete_mpls_te(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_mpls_te_delete())

    # ========================================================================
    # Summary Address
    # ========================================================================

    def set_summary_address(self, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_summary_address(prefix))

    def set_summary_address_no_advertise(self, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_summary_address_no_advertise(prefix))

    def set_summary_address_tag(self, prefix: str, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_summary_address_tag(prefix, value))

    def delete_summary_address(self, prefix: str) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_summary_address_delete(prefix))

    # ========================================================================
    # Refresh Timers
    # ========================================================================

    def set_refresh_timers(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_refresh_timers(value))

    def delete_refresh_timers(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_refresh_timers_delete())

    # ========================================================================
    # Segment Routing
    # ========================================================================

    def set_segment_routing_global_block_low(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_global_block_low(value))

    def set_segment_routing_global_block_high(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_global_block_high(value))

    def set_segment_routing_local_block_low(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_local_block_low(value))

    def set_segment_routing_local_block_high(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_local_block_high(value))

    def set_segment_routing_maximum_label_depth(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_maximum_label_depth(value))

    def set_segment_routing_prefix(self, prefix: str, index_value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_prefix(prefix, index_value))

    def set_segment_routing_prefix_explicit_null(self, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_prefix_explicit_null(prefix))

    def set_segment_routing_prefix_no_php_flag(self, prefix: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_segment_routing_prefix_no_php_flag(prefix))

    def delete_segment_routing(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_segment_routing_delete())

    # ========================================================================
    # Aggregation
    # ========================================================================

    def set_aggregation_timer(self, value: str) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_aggregation_timer(value))

    def delete_aggregation_timer(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_aggregation_timer_delete())

    # ========================================================================
    # Capability
    # ========================================================================

    def set_capability_opaque(self) -> "OspfBatchBuilder":
        return self.add_set(self.m.get_capability_opaque())

    def delete_capability_opaque(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_capability_opaque_delete())

    # ========================================================================
    # Delete entire OSPF
    # ========================================================================

    def delete_ospf(self) -> "OspfBatchBuilder":
        return self.add_delete(self.m.get_ospf_delete())

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "areas": {
                    "supported": True,
                    "description": "OSPF area configuration (stub, nssa, normal)",
                },
                "interfaces": {
                    "supported": True,
                    "description": "OSPF interface settings (cost, priority, timers, authentication)",
                },
                "redistribute": {
                    "supported": True,
                    "description": "Route redistribution (connected, static, bgp, kernel, rip, isis, babel)",
                },
                "redistribute_nhrp": {
                    "supported": is_1_5,
                    "description": "Redistribute NHRP routes (VyOS 1.5+)",
                },
                "retransmit_window": {
                    "supported": is_1_5,
                    "description": "Interface/virtual-link retransmit-window (VyOS 1.5+)",
                },
                "default_information": {
                    "supported": True,
                    "description": "Default route origination",
                },
                "graceful_restart": {
                    "supported": True,
                    "description": "OSPF graceful restart and helper settings",
                },
                "segment_routing": {
                    "supported": True,
                    "description": "OSPF Segment Routing (SR-MPLS)",
                },
                "mpls_te": {
                    "supported": True,
                    "description": "MPLS Traffic Engineering",
                },
                "max_metric": {
                    "supported": True,
                    "description": "Max-metric router-LSA settings",
                },
            },
            "redistribute_protocols": [
                "connected", "static", "bgp", "kernel", "rip", "isis", "babel",
            ] + (["nhrp"] if is_1_5 else []),
            "network_types": [
                "broadcast", "non-broadcast", "point-to-multipoint", "point-to-point",
            ],
            "area_types": ["stub", "nssa", "normal"],
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
