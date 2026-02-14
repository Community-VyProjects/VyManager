"""
OSPFv3 Protocol Command Mapper

Handles command path generation for OSPFv3 (IPv6 OSPF) configuration.
Covers: parameters, areas, interfaces, redistribute, default-information,
distance, auto-cost, log-adjacency-changes, graceful-restart.

No version-specific differences between VyOS 1.4 and 1.5.
"""

from typing import List
from ..base import BaseFeatureMapper


class Ospfv3Mapper(BaseFeatureMapper):
    """Base mapper with all OSPFv3 operations (identical across VyOS versions)."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Helper base paths
    # ========================================================================

    def _ospfv3(self) -> List[str]:
        return ["protocols", "ospfv3"]

    def _area(self, area_id: str) -> List[str]:
        return ["protocols", "ospfv3", "area", area_id]

    def _interface(self, iface: str) -> List[str]:
        return ["protocols", "ospfv3", "interface", iface]

    def _redistribute(self, protocol: str) -> List[str]:
        return ["protocols", "ospfv3", "redistribute", protocol]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_router_id(self, value: str) -> List[str]:
        return self._ospfv3() + ["parameters", "router-id", value]

    def get_router_id_delete(self) -> List[str]:
        return self._ospfv3() + ["parameters", "router-id"]

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

    def get_area_type_nssa_default_information_originate(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "nssa", "default-information-originate"]

    def get_area_type_normal(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type", "normal"]

    def get_area_type_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["area-type"]

    def get_area_range(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix]

    def get_area_range_advertise(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix, "advertise"]

    def get_area_range_not_advertise(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix, "not-advertise"]

    def get_area_range_delete(self, area_id: str, prefix: str) -> List[str]:
        return self._area(area_id) + ["range", prefix]

    def get_area_export_list(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["export-list", value]

    def get_area_export_list_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["export-list"]

    def get_area_import_list(self, area_id: str, value: str) -> List[str]:
        return self._area(area_id) + ["import-list", value]

    def get_area_import_list_delete(self, area_id: str) -> List[str]:
        return self._area(area_id) + ["import-list"]

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

    def get_interface_passive_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["passive"]

    def get_interface_bfd(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd"]

    def get_interface_bfd_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd"]

    def get_interface_bfd_profile(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["bfd", "profile", value]

    def get_interface_bfd_profile_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd", "profile"]

    def get_interface_mtu_ignore(self, iface: str) -> List[str]:
        return self._interface(iface) + ["mtu-ignore"]

    def get_interface_mtu_ignore_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["mtu-ignore"]

    def get_interface_ifmtu(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["ifmtu", value]

    def get_interface_ifmtu_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ifmtu"]

    def get_interface_instance_id(self, iface: str, value: str) -> List[str]:
        return self._interface(iface) + ["instance-id", value]

    def get_interface_instance_id_delete(self, iface: str) -> List[str]:
        return self._interface(iface) + ["instance-id"]

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

    # ========================================================================
    # Default Information
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        return self._ospfv3() + ["default-information", "originate"]

    def get_default_information_originate_always(self) -> List[str]:
        return self._ospfv3() + ["default-information", "originate", "always"]

    def get_default_information_originate_metric(self, value: str) -> List[str]:
        return self._ospfv3() + ["default-information", "originate", "metric", value]

    def get_default_information_originate_metric_type(self, value: str) -> List[str]:
        return self._ospfv3() + ["default-information", "originate", "metric-type", value]

    def get_default_information_originate_route_map(self, value: str) -> List[str]:
        return self._ospfv3() + ["default-information", "originate", "route-map", value]

    def get_default_information_originate_delete(self) -> List[str]:
        return self._ospfv3() + ["default-information", "originate"]

    # ========================================================================
    # Distance
    # ========================================================================

    def get_distance_global(self, value: str) -> List[str]:
        return self._ospfv3() + ["distance", "global", value]

    def get_distance_global_delete(self) -> List[str]:
        return self._ospfv3() + ["distance", "global"]

    def get_distance_ospfv3_external(self, value: str) -> List[str]:
        return self._ospfv3() + ["distance", "ospfv3", "external", value]

    def get_distance_ospfv3_inter_area(self, value: str) -> List[str]:
        return self._ospfv3() + ["distance", "ospfv3", "inter-area", value]

    def get_distance_ospfv3_intra_area(self, value: str) -> List[str]:
        return self._ospfv3() + ["distance", "ospfv3", "intra-area", value]

    def get_distance_ospfv3_delete(self) -> List[str]:
        return self._ospfv3() + ["distance", "ospfv3"]

    # ========================================================================
    # Auto Cost
    # ========================================================================

    def get_auto_cost_reference_bandwidth(self, value: str) -> List[str]:
        return self._ospfv3() + ["auto-cost", "reference-bandwidth", value]

    def get_auto_cost_reference_bandwidth_delete(self) -> List[str]:
        return self._ospfv3() + ["auto-cost", "reference-bandwidth"]

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def get_log_adjacency_changes(self) -> List[str]:
        return self._ospfv3() + ["log-adjacency-changes"]

    def get_log_adjacency_changes_detail(self) -> List[str]:
        return self._ospfv3() + ["log-adjacency-changes", "detail"]

    def get_log_adjacency_changes_delete(self) -> List[str]:
        return self._ospfv3() + ["log-adjacency-changes"]

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def get_graceful_restart(self) -> List[str]:
        return self._ospfv3() + ["graceful-restart"]

    def get_graceful_restart_grace_period(self, value: str) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "grace-period", value]

    def get_graceful_restart_helper_enable(self) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "enable"]

    def get_graceful_restart_helper_enable_router_id(self, value: str) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "enable", "router-id", value]

    def get_graceful_restart_helper_enable_router_id_delete(self, value: str) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "enable", "router-id", value]

    def get_graceful_restart_helper_lsa_check_disable(self) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "lsa-check-disable"]

    def get_graceful_restart_helper_planned_only(self) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "planned-only"]

    def get_graceful_restart_helper_supported_grace_time(self, value: str) -> List[str]:
        return self._ospfv3() + ["graceful-restart", "helper", "supported-grace-time", value]

    def get_graceful_restart_delete(self) -> List[str]:
        return self._ospfv3() + ["graceful-restart"]

    # ========================================================================
    # Delete entire OSPFv3
    # ========================================================================

    def get_ospfv3_delete(self) -> List[str]:
        return self._ospfv3()
