"""
OSPFv3 Protocol Batch Builder

Provides all batch operations for OSPFv3 (IPv6 OSPF) configuration.
Covers: parameters, areas, interfaces, redistribute, default-information,
distance, auto-cost, log-adjacency-changes, graceful-restart.

No version-specific differences between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class Ospfv3BatchBuilder:
    """Complete batch builder for OSPFv3 protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ospfv3"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "Ospfv3BatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "Ospfv3BatchBuilder":
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

    def set_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_router_id(value))

    def delete_router_id(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_router_id_delete())

    # ========================================================================
    # Areas
    # ========================================================================

    def set_area(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area(area_id))

    def delete_area(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_delete(area_id))

    def set_area_type_stub(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_stub(area_id))

    def set_area_type_stub_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_stub_no_summary(area_id))

    def set_area_type_stub_default_cost(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_stub_default_cost(area_id, value))

    def set_area_type_nssa(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa(area_id))

    def set_area_type_nssa_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_no_summary(area_id))

    def set_area_type_nssa_default_cost(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_default_cost(area_id, value))

    def set_area_type_nssa_default_information_originate(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_default_information_originate(area_id))

    def set_area_type_normal(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_normal(area_id))

    def delete_area_type(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_type_delete(area_id))

    def set_area_range(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range(area_id, prefix))

    def set_area_range_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range_advertise(area_id, prefix))

    def set_area_range_not_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range_not_advertise(area_id, prefix))

    def delete_area_range(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_range_delete(area_id, prefix))

    def set_area_export_list(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_export_list(area_id, value))

    def delete_area_export_list(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_export_list_delete(area_id))

    def set_area_import_list(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_import_list(area_id, value))

    def delete_area_import_list(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_import_list_delete(area_id))

    # ========================================================================
    # Interfaces
    # ========================================================================

    def set_interface(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_area(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_area(iface, value))

    def delete_interface_area(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_area_delete(iface))

    def set_interface_cost(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_cost(iface, value))

    def delete_interface_cost(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_cost_delete(iface))

    def set_interface_priority(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_priority(iface, value))

    def delete_interface_priority(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_priority_delete(iface))

    def set_interface_hello_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_hello_interval(iface, value))

    def delete_interface_hello_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_hello_interval_delete(iface))

    def set_interface_dead_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_dead_interval(iface, value))

    def delete_interface_dead_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_dead_interval_delete(iface))

    def set_interface_retransmit_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_retransmit_interval(iface, value))

    def delete_interface_retransmit_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_retransmit_interval_delete(iface))

    def set_interface_transmit_delay(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_transmit_delay(iface, value))

    def delete_interface_transmit_delay(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_transmit_delay_delete(iface))

    def set_interface_network(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_network(iface, value))

    def delete_interface_network(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_network_delete(iface))

    def set_interface_passive(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_passive(iface))

    def delete_interface_passive(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_passive_delete(iface))

    def set_interface_bfd(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_bfd(iface))

    def delete_interface_bfd(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_delete(iface))

    def set_interface_bfd_profile(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_bfd_profile(iface, value))

    def delete_interface_bfd_profile(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_profile_delete(iface))

    def set_interface_mtu_ignore(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_mtu_ignore(iface))

    def delete_interface_mtu_ignore(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_mtu_ignore_delete(iface))

    def set_interface_ifmtu(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_ifmtu(iface, value))

    def delete_interface_ifmtu(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_ifmtu_delete(iface))

    def set_interface_instance_id(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_instance_id(iface, value))

    def delete_interface_instance_id(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_instance_id_delete(iface))

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_redistribute(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute(protocol))

    def set_redistribute_metric(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_metric(protocol, value))

    def set_redistribute_metric_type(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_metric_type(protocol, value))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map(protocol, value))

    def delete_redistribute(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(protocol))

    # ========================================================================
    # Default Information
    # ========================================================================

    def set_default_information_originate(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def set_default_information_originate_always(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_always())

    def set_default_information_originate_metric(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric(value))

    def set_default_information_originate_metric_type(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric_type(value))

    def set_default_information_originate_route_map(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_route_map(value))

    def delete_default_information_originate(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    # ========================================================================
    # Distance
    # ========================================================================

    def set_distance_global(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_global(value))

    def delete_distance_global(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_global_delete())

    def set_distance_ospfv3_external(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_external(value))

    def set_distance_ospfv3_inter_area(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_inter_area(value))

    def set_distance_ospfv3_intra_area(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_intra_area(value))

    def delete_distance_ospfv3(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_ospfv3_delete())

    # ========================================================================
    # Auto Cost
    # ========================================================================

    def set_auto_cost_reference_bandwidth(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_auto_cost_reference_bandwidth(value))

    def delete_auto_cost_reference_bandwidth(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_auto_cost_reference_bandwidth_delete())

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def set_log_adjacency_changes(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes())

    def set_log_adjacency_changes_detail(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes_detail())

    def delete_log_adjacency_changes(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_log_adjacency_changes_delete())

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def set_graceful_restart(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart())

    def set_graceful_restart_grace_period(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_grace_period(value))

    def set_graceful_restart_helper_enable(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_enable())

    def set_graceful_restart_helper_enable_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_enable_router_id(value))

    def delete_graceful_restart_helper_enable_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_enable_router_id_delete(value))

    def set_graceful_restart_helper_lsa_check_disable(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_lsa_check_disable())

    def set_graceful_restart_helper_planned_only(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_planned_only())

    def set_graceful_restart_helper_supported_grace_time(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_supported_grace_time(value))

    def delete_graceful_restart(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_delete())

    # ========================================================================
    # Delete entire OSPFv3
    # ========================================================================

    def delete_ospfv3(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_ospfv3_delete())

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
                    "description": "OSPFv3 area configuration (stub, nssa, normal)",
                },
                "interfaces": {
                    "supported": True,
                    "description": "OSPFv3 interface settings (cost, priority, timers, BFD)",
                },
                "redistribute": {
                    "supported": True,
                    "description": "Route redistribution (babel, bgp, connected, isis, kernel, ripng, static)",
                },
                "default_information": {
                    "supported": True,
                    "description": "Default route origination",
                },
                "graceful_restart": {
                    "supported": True,
                    "description": "OSPFv3 graceful restart and helper settings",
                },
                "distance": {
                    "supported": True,
                    "description": "Administrative distance settings",
                },
                "auto_cost": {
                    "supported": True,
                    "description": "Auto-cost reference bandwidth",
                },
            },
            "redistribute_protocols": [
                "babel", "bgp", "connected", "isis", "kernel", "ripng", "static",
            ],
            "network_types": [
                "broadcast", "point-to-point",
            ],
            "area_types": ["stub", "nssa", "normal"],
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
