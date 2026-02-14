"""
OSPF Protocol Command Mapper

Handles command path generation for OSPF (Open Shortest Path First) configuration.
Covers: parameters, areas, interfaces, redistribute, default-information,
distance, timers, max-metric, graceful-restart, neighbors, access-list,
auto-cost, log-adjacency-changes, passive-interface, maximum-paths,
ldp-sync, mpls-te, summary-address, segment-routing, aggregation, capability.

Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class OspfMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Helper base paths
    # ========================================================================

    def _ospf(self) -> List[str]:
        return ["protocols", "ospf"]

    def _area(self, area_id: str) -> List[str]:
        return ["protocols", "ospf", "area", area_id]

    def _interface(self, iface: str) -> List[str]:
        return ["protocols", "ospf", "interface", iface]

    def _redistribute(self, protocol: str) -> List[str]:
        return ["protocols", "ospf", "redistribute", protocol]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_router_id(self, value: str) -> List[str]:
        return self._ospf() + ["parameters", "router-id", value]

    def get_router_id_delete(self) -> List[str]:
        return self._ospf() + ["parameters", "router-id"]

    def get_abr_type(self, value: str) -> List[str]:
        return self._ospf() + ["parameters", "abr-type", value]

    def get_abr_type_delete(self) -> List[str]:
        return self._ospf() + ["parameters", "abr-type"]

    def get_opaque_lsa(self) -> List[str]:
        return self._ospf() + ["parameters", "opaque-lsa"]

    def get_rfc1583_compatibility(self) -> List[str]:
        return self._ospf() + ["parameters", "rfc1583-compatibility"]

    # ========================================================================
    # Areas
    # ========================================================================

    def get_area(self, area_id: str) -> List[str]:
        return self._area(area_id)

    def get_area_delete(self, area_id: str) -> List[str]:
        return self._area(area_id)

    def get_area_type_stub(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "stub"]

    def get_area_type_stub_no_summary(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "stub", "no-summary"]

    def get_area_type_stub_default_cost(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["area-type", "stub", "default-cost", value]

    def get_area_type_nssa(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "nssa"]

    def get_area_type_nssa_no_summary(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "nssa", "no-summary"]

    def get_area_type_nssa_default_cost(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["area-type", "nssa", "default-cost", value]

    def get_area_type_normal(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "normal"]

    def get_area_type_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type"]

    def get_area_network(self, area_id: str, network: str) -> List[str]:
        return self._area(area_id) + ["network", network]

    def get_area_network_delete(self, area_id: str, network: str) -> List[str]:
        return self._area(area_id) + ["network", network]

    def get_area_range(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix]

    def get_area_range_cost(self, area_id: str, prefix: str, value: str) -> List[str]:
        return self._area(area_id) + ["range", prefix, "cost", value]

    def get_area_range_not_advertise(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix, "not-advertise"]

    def get_area_range_substitute(self, area_id: str, prefix: str, value: str) -> List[str]:
        return self._area(area_id) + ["range", prefix, "substitute", value]

    def get_area_range_delete(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix]

    def get_area_authentication(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["authentication", value]

    def get_area_authentication_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["authentication"]

    def get_area_shortcut(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["shortcut", value]

    def get_area_shortcut_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["shortcut"]

    def get_area_export_list(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["export-list", value]

    def get_area_export_list_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["export-list"]

    def get_area_import_list(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["import-list", value]

    def get_area_import_list_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["import-list"]

    # Area virtual-link
    def get_area_virtual_link(self, area_id: str, address: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address]

    def get_area_virtual_link_dead_interval(self, area_id: str, address: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "dead-interval", value]

    def get_area_virtual_link_hello_interval(self, area_id: str, address: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "hello-interval", value]

    def get_area_virtual_link_retransmit_interval(self, area_id: str, address: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "retransmit-interval", value]

    def get_area_virtual_link_transmit_delay(self, area_id: str, address: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "transmit-delay", value]

    def get_area_virtual_link_authentication_md5_key_id(self, area_id: str, address: str, key_id: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "authentication", "md5", "key-id", key_id]

    def get_area_virtual_link_authentication_md5_key_id_md5_key(self, area_id: str, address: str, key_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "authentication", "md5", "key-id", key_id, "md5-key", value]

    def get_area_virtual_link_authentication_plaintext_password(self, area_id: str, address: str, value: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address, "authentication", "plaintext-password", value]

    def get_area_virtual_link_delete(self, area_id: str, address: str) -> List[str]:
        return self._area(area_id) + ["virtual-link", address]

    # ========================================================================
    # Interfaces
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._interface(iface)

    def get_interface_delete(self, iface: str) -> List[str]:
        return self._interface(iface)

    def get_interface_area(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["area", value]

    def get_interface_area_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["area"]

    def get_interface_cost(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["cost", value]

    def get_interface_cost_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["cost"]

    def get_interface_priority(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["priority", value]

    def get_interface_priority_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["priority"]

    def get_interface_hello_interval(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["hello-interval", value]

    def get_interface_hello_interval_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["hello-interval"]

    def get_interface_dead_interval(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["dead-interval", value]

    def get_interface_dead_interval_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["dead-interval"]

    def get_interface_retransmit_interval(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["retransmit-interval", value]

    def get_interface_retransmit_interval_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["retransmit-interval"]

    def get_interface_transmit_delay(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["transmit-delay", value]

    def get_interface_transmit_delay_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["transmit-delay"]

    def get_interface_network(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["network", value]

    def get_interface_network_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["network"]

    def get_interface_passive(self, iface: str) -> List[str]:
        return self._interface(iface) + ["passive"]

    def get_interface_passive_disable(self, iface: str) -> List[str]:
        return self._interface(iface) + ["passive", "disable"]

    def get_interface_passive_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["passive"]

    def get_interface_bfd(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd"]

    def get_interface_bfd_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd"]

    def get_interface_mtu_ignore(self, iface: str) -> List[str]:
        return self._interface(iface) + ["mtu-ignore"]

    def get_interface_mtu_ignore_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["mtu-ignore"]

    def get_interface_bandwidth(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["bandwidth", value]

    def get_interface_bandwidth_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bandwidth"]

    def get_interface_hello_multiplier(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["hello-multiplier", value]

    def get_interface_hello_multiplier_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["hello-multiplier"]

    # Interface authentication
    def get_interface_authentication_md5_key_id(self, iface: str, key_id: str) -> List[str]:
        return self._interface(iface) + ["authentication", "md5", "key-id", key_id]

    def get_interface_authentication_md5_key_id_md5_key(self, iface: str, key_id: str, value: str) -> List[str]:
        return self._interface(iface) + ["authentication", "md5", "key-id", key_id, "md5-key", value]

    def get_interface_authentication_plaintext_password(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["authentication", "plaintext-password", value]

    def get_interface_authentication_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["authentication"]

    # Interface LDP sync
    def get_interface_ldp_sync(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync"]

    def get_interface_ldp_sync_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync"]

    # ========================================================================
    # Redistribute
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        return self._redistribute(protocol)

    def get_redistribute_metric(self, protocol: str, value: str) -> List[str]:
        return self._redistribute(protocol) + ["metric", value]

    def get_redistribute_metric_type(self, protocol: str, value: str) -> List[str]:
        return self._redistribute(protocol) + ["metric-type", value]

    def get_redistribute_route_map(self, protocol: str, value: str) -> List[str]:
        return self._redistribute(protocol) + ["route-map", value]

    def get_redistribute_delete(self, protocol: str) -> List[str]:
        return self._redistribute(protocol)

    def get_redistribute_table(self, table: str) -> List[str]:
        return self._ospf() + ["redistribute", "table", table]

    def get_redistribute_table_metric(self, table: str, value: str) -> List[str]:
        return self._ospf() + ["redistribute", "table", table, "metric", value]

    def get_redistribute_table_metric_type(self, table: str, value: str) -> List[str]:
        return self._ospf() + ["redistribute", "table", table, "metric-type", value]

    def get_redistribute_table_route_map(self, table: str, value: str) -> List[str]:
        return self._ospf() + ["redistribute", "table", table, "route-map", value]

    def get_redistribute_table_delete(self, table: str) -> List[str]:
        return self._ospf() + ["redistribute", "table", table]

    # ========================================================================
    # Default Information
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        return self._ospf() + ["default-information", "originate"]

    def get_default_information_originate_always(self) -> List[str]:
        return self._ospf() + ["default-information", "originate", "always"]

    def get_default_information_originate_metric(self, value: str) -> List[str]:
        return self._ospf() + ["default-information", "originate", "metric", value]

    def get_default_information_originate_metric_type(self, value: str) -> List[str]:
        return self._ospf() + ["default-information", "originate", "metric-type", value]

    def get_default_information_originate_route_map(self, value: str) -> List[str]:
        return self._ospf() + ["default-information", "originate", "route-map", value]

    def get_default_information_originate_delete(self) -> List[str]:
        return self._ospf() + ["default-information", "originate"]

    # ========================================================================
    # Distance
    # ========================================================================

    def get_distance_global(self, value: str) -> List[str]:
        return self._ospf() + ["distance", "global", value]

    def get_distance_global_delete(self) -> List[str]:
        return self._ospf() + ["distance", "global"]

    def get_distance_ospf_external(self, value: str) -> List[str]:
        return self._ospf() + ["distance", "ospf", "external", value]

    def get_distance_ospf_inter_area(self, value: str) -> List[str]:
        return self._ospf() + ["distance", "ospf", "inter-area", value]

    def get_distance_ospf_intra_area(self, value: str) -> List[str]:
        return self._ospf() + ["distance", "ospf", "intra-area", value]

    def get_distance_ospf_delete(self) -> List[str]:
        return self._ospf() + ["distance", "ospf"]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_timers_throttle_spf_delay(self, value: str) -> List[str]:
        return self._ospf() + ["timers", "throttle", "spf", "delay", value]

    def get_timers_throttle_spf_initial_holdtime(self, value: str) -> List[str]:
        return self._ospf() + ["timers", "throttle", "spf", "initial-holdtime", value]

    def get_timers_throttle_spf_max_holdtime(self, value: str) -> List[str]:
        return self._ospf() + ["timers", "throttle", "spf", "max-holdtime", value]

    def get_timers_throttle_spf_delete(self) -> List[str]:
        return self._ospf() + ["timers", "throttle", "spf"]

    # ========================================================================
    # Max Metric
    # ========================================================================

    def get_max_metric_router_lsa_administrative(self) -> List[str]:
        return self._ospf() + ["max-metric", "router-lsa", "administrative"]

    def get_max_metric_router_lsa_on_shutdown(self, value: str) -> List[str]:
        return self._ospf() + ["max-metric", "router-lsa", "on-shutdown", value]

    def get_max_metric_router_lsa_on_startup(self, value: str) -> List[str]:
        return self._ospf() + ["max-metric", "router-lsa", "on-startup", value]

    def get_max_metric_router_lsa_delete(self) -> List[str]:
        return self._ospf() + ["max-metric", "router-lsa"]

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def get_graceful_restart(self) -> List[str]:
        return self._ospf() + ["graceful-restart"]

    def get_graceful_restart_grace_period(self, value: str) -> List[str]:
        return self._ospf() + ["graceful-restart", "grace-period", value]

    def get_graceful_restart_helper_enable(self) -> List[str]:
        return self._ospf() + ["graceful-restart", "helper", "enable"]

    def get_graceful_restart_helper_no_strict_lsa_checking(self) -> List[str]:
        return self._ospf() + ["graceful-restart", "helper", "no-strict-lsa-checking"]

    def get_graceful_restart_helper_planned_only(self) -> List[str]:
        return self._ospf() + ["graceful-restart", "helper", "planned-only"]

    def get_graceful_restart_helper_supported_grace_time(self, value: str) -> List[str]:
        return self._ospf() + ["graceful-restart", "helper", "supported-grace-time", value]

    def get_graceful_restart_delete(self) -> List[str]:
        return self._ospf() + ["graceful-restart"]

    # ========================================================================
    # Neighbors
    # ========================================================================

    def get_neighbor(self, address: str) -> List[str]:
        return self._ospf() + ["neighbor", address]

    def get_neighbor_poll_interval(self, address: str, value: str) -> List[str]:
        return self._ospf() + ["neighbor", address, "poll-interval", value]

    def get_neighbor_priority(self, address: str, value: str) -> List[str]:
        return self._ospf() + ["neighbor", address, "priority", value]

    def get_neighbor_delete(self, address: str) -> List[str]:
        return self._ospf() + ["neighbor", address]

    # ========================================================================
    # Access List
    # ========================================================================

    def get_access_list(self, acl: str) -> List[str]:
        return self._ospf() + ["access-list", acl]

    def get_access_list_export(self, acl: str, value: str) -> List[str]:
        return self._ospf() + ["access-list", acl, "export", value]

    def get_access_list_delete(self, acl: str) -> List[str]:
        return self._ospf() + ["access-list", acl]

    # ========================================================================
    # Auto Cost
    # ========================================================================

    def get_auto_cost_reference_bandwidth(self, value: str) -> List[str]:
        return self._ospf() + ["auto-cost", "reference-bandwidth", value]

    def get_auto_cost_reference_bandwidth_delete(self) -> List[str]:
        return self._ospf() + ["auto-cost", "reference-bandwidth"]

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def get_log_adjacency_changes(self) -> List[str]:
        return self._ospf() + ["log-adjacency-changes"]

    def get_log_adjacency_changes_detail(self) -> List[str]:
        return self._ospf() + ["log-adjacency-changes", "detail"]

    def get_log_adjacency_changes_delete(self) -> List[str]:
        return self._ospf() + ["log-adjacency-changes"]

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def get_passive_interface_default(self) -> List[str]:
        return self._ospf() + ["passive-interface", "default"]

    def get_passive_interface_default_delete(self) -> List[str]:
        return self._ospf() + ["passive-interface", "default"]

    # ========================================================================
    # Maximum Paths
    # ========================================================================

    def get_maximum_paths(self, value: str) -> List[str]:
        return self._ospf() + ["maximum-paths", value]

    def get_maximum_paths_delete(self) -> List[str]:
        return self._ospf() + ["maximum-paths"]

    # ========================================================================
    # LDP Sync
    # ========================================================================

    def get_ldp_sync_holddown(self, value: str) -> List[str]:
        return self._ospf() + ["ldp-sync", "holddown", value]

    def get_ldp_sync_holddown_delete(self) -> List[str]:
        return self._ospf() + ["ldp-sync", "holddown"]

    # ========================================================================
    # MPLS-TE
    # ========================================================================

    def get_mpls_te_enable(self) -> List[str]:
        return self._ospf() + ["mpls-te", "enable"]

    def get_mpls_te_router_address(self, value: str) -> List[str]:
        return self._ospf() + ["mpls-te", "router-address", value]

    def get_mpls_te_delete(self) -> List[str]:
        return self._ospf() + ["mpls-te"]

    # ========================================================================
    # Summary Address
    # ========================================================================

    def get_summary_address(self, prefix: str) -> List[str]:
        return self._ospf() + ["summary-address", prefix]

    def get_summary_address_no_advertise(self, prefix: str) -> List[str]:
        return self._ospf() + ["summary-address", prefix, "no-advertise"]

    def get_summary_address_tag(self, prefix: str, value: str) -> List[str]:
        return self._ospf() + ["summary-address", prefix, "tag", value]

    def get_summary_address_delete(self, prefix: str) -> List[str]:
        return self._ospf() + ["summary-address", prefix]

    # ========================================================================
    # Refresh Timers
    # ========================================================================

    def get_refresh_timers(self, value: str) -> List[str]:
        return self._ospf() + ["refresh", "timers", value]

    def get_refresh_timers_delete(self) -> List[str]:
        return self._ospf() + ["refresh", "timers"]

    # ========================================================================
    # Segment Routing
    # ========================================================================

    def get_segment_routing_global_block_low(self, value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "global-block", "low-label-value", value]

    def get_segment_routing_global_block_high(self, value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "global-block", "high-label-value", value]

    def get_segment_routing_local_block_low(self, value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "local-block", "low-label-value", value]

    def get_segment_routing_local_block_high(self, value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "local-block", "high-label-value", value]

    def get_segment_routing_maximum_label_depth(self, value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "maximum-label-depth", value]

    def get_segment_routing_prefix(self, prefix: str, index_value: str) -> List[str]:
        return self._ospf() + ["segment-routing", "prefix", prefix, "index", "value", index_value]

    def get_segment_routing_prefix_explicit_null(self, prefix: str) -> List[str]:
        return self._ospf() + ["segment-routing", "prefix", prefix, "index", "explicit-null"]

    def get_segment_routing_prefix_no_php_flag(self, prefix: str) -> List[str]:
        return self._ospf() + ["segment-routing", "prefix", prefix, "index", "no-php-flag"]

    def get_segment_routing_delete(self) -> List[str]:
        return self._ospf() + ["segment-routing"]

    # ========================================================================
    # Aggregation
    # ========================================================================

    def get_aggregation_timer(self, value: str) -> List[str]:
        return self._ospf() + ["aggregation", "timer", value]

    def get_aggregation_timer_delete(self) -> List[str]:
        return self._ospf() + ["aggregation", "timer"]

    # ========================================================================
    # Capability
    # ========================================================================

    def get_capability_opaque(self) -> List[str]:
        return self._ospf() + ["capability", "opaque"]

    def get_capability_opaque_delete(self) -> List[str]:
        return self._ospf() + ["capability", "opaque"]

    # ========================================================================
    # Delete entire OSPF
    # ========================================================================

    def get_ospf_delete(self) -> List[str]:
        return self._ospf()
