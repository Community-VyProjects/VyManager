"""RIPng Protocol Batch Builder.

Provides all batch operations for RIPng (Routing Information Protocol next generation)
configuration. Covers: global settings, aggregate addresses, networks, static routes,
passive interfaces, distribute lists, interface split-horizon, redistribute, and timers.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RipNgBatchBuilder:
    """Complete batch builder for RIPng protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ripng"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RipNgBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RipNgBatchBuilder":
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
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "features": {
                "global_settings": {
                    "supported": True,
                    "description": "RIPng global settings (default-metric, route-map, default-information)",
                },
                "aggregate_addresses": {
                    "supported": True,
                    "description": "Aggregate RIPng route announcements (IPv6 prefixes)",
                },
                "networks": {
                    "supported": True,
                    "description": "RIPng network announcements (IPv6 prefixes)",
                },
                "static_routes": {
                    "supported": True,
                    "description": "RIPng static route injection (IPv6 prefixes)",
                },
                "passive_interfaces": {
                    "supported": True,
                    "description": "Suppress RIPng updates on interfaces",
                },
                "distribute_lists": {
                    "supported": True,
                    "description": "Filter RIPng updates with IPv6 access/prefix lists",
                },
                "interface_settings": {
                    "supported": True,
                    "description": "Per-interface split-horizon configuration",
                },
                "redistribute": {
                    "supported": True,
                    "description": "Redistribute routes from other protocols into RIPng",
                    "protocols": ["babel", "bgp", "connected", "kernel", "ospfv3", "static"],
                },
                "timers": {
                    "supported": True,
                    "description": "RIPng update, timeout, and garbage-collection timers",
                },
            },
        }

    # ========================================================================
    # Global Settings
    # ========================================================================

    def set_default_information_originate(self) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def delete_default_information_originate(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    def set_default_metric(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_default_metric(value))

    def delete_default_metric(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_default_metric_delete())

    def set_route_map(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_route_map(value))

    def delete_route_map(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_route_map_delete())

    # ========================================================================
    # Aggregate Addresses
    # ========================================================================

    def set_aggregate_address(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_aggregate_address(prefix))

    def delete_aggregate_address(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_aggregate_address_delete(prefix))

    # ========================================================================
    # Networks
    # ========================================================================

    def set_network(self, network: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_network(network))

    def delete_network(self, network: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_network_delete(network))

    # ========================================================================
    # Static Routes
    # ========================================================================

    def set_route(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_route(prefix))

    def delete_route(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_route_delete(prefix))

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def set_passive_interface(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_passive_interface(iface))

    def delete_passive_interface(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_passive_interface_delete(iface))

    # ========================================================================
    # Distribute List - Global
    # ========================================================================

    def set_distribute_list_access_list_in(self, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_access_list_in(acl))

    def delete_distribute_list_access_list_in(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_in_delete())

    def set_distribute_list_access_list_out(self, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_access_list_out(acl))

    def delete_distribute_list_access_list_out(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_out_delete())

    def set_distribute_list_prefix_list_in(self, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_in(prefix_list))

    def delete_distribute_list_prefix_list_in(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_in_delete())

    def set_distribute_list_prefix_list_out(self, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_out(prefix_list))

    def delete_distribute_list_prefix_list_out(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_out_delete())

    # ========================================================================
    # Distribute List - Per Interface
    # ========================================================================

    def set_distribute_list_interface_access_list_in(self, iface: str, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_in(iface, acl))

    def delete_distribute_list_interface_access_list_in(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_in_delete(iface))

    def set_distribute_list_interface_access_list_out(self, iface: str, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_out(iface, acl))

    def delete_distribute_list_interface_access_list_out(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_out_delete(iface))

    def set_distribute_list_interface_prefix_list_in(self, iface: str, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_prefix_list_in(iface, prefix_list))

    def delete_distribute_list_interface_prefix_list_in(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_prefix_list_in_delete(iface))

    def set_distribute_list_interface_prefix_list_out(self, iface: str, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_prefix_list_out(iface, prefix_list))

    def delete_distribute_list_interface_prefix_list_out(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_prefix_list_out_delete(iface))

    def delete_distribute_list_interface(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_delete(iface))

    # ========================================================================
    # Interface Settings (split-horizon only)
    # ========================================================================

    def set_interface(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_split_horizon_disable(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_interface_split_horizon_disable(iface))

    def set_interface_split_horizon_poison_reverse(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_interface_split_horizon_poison_reverse(iface))

    def delete_interface_split_horizon(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_interface_split_horizon_delete(iface))

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_redistribute(self, protocol: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_redistribute(protocol))

    def set_redistribute_metric(self, protocol: str, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_redistribute_metric(protocol, value))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map(protocol, value))

    def delete_redistribute(self, protocol: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(protocol))

    # ========================================================================
    # Timers
    # ========================================================================

    def set_timers_update(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_update(value))

    def delete_timers_update(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_update_delete())

    def set_timers_timeout(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_timeout(value))

    def delete_timers_timeout(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_timeout_delete())

    def set_timers_garbage_collection(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_garbage_collection(value))

    def delete_timers_garbage_collection(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_garbage_collection_delete())

    def delete_timers(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_delete())

    # ========================================================================
    # Delete entire RIPng
    # ========================================================================

    def delete_ripng(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_ripng_delete())
