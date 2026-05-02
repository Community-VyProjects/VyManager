"""RIP Protocol Batch Builder.

Provides all batch operations for RIP (Routing Information Protocol) configuration.
Covers: global settings, networks, neighbors, static routes, passive interfaces,
distribute lists, interface settings, network distance, redistribute, and timers.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RipBatchBuilder:
    """Complete batch builder for RIP protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "rip"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RipBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RipBatchBuilder":
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
                    "description": "RIP global settings (distance, metric, version, route-map)",
                },
                "networks": {
                    "supported": True,
                    "description": "RIP network announcements",
                },
                "neighbors": {
                    "supported": True,
                    "description": "Unicast neighbor peering",
                },
                "static_routes": {
                    "supported": True,
                    "description": "RIP static route injection",
                },
                "passive_interfaces": {
                    "supported": True,
                    "description": "Suppress RIP updates on interfaces",
                },
                "distribute_lists": {
                    "supported": True,
                    "description": "Filter RIP updates with access/prefix lists",
                },
                "interface_settings": {
                    "supported": True,
                    "description": "Per-interface authentication, version, and split-horizon",
                },
                "network_distance": {
                    "supported": True,
                    "description": "Per-source-network administrative distance",
                },
                "redistribute": {
                    "supported": True,
                    "description": "Redistribute routes from other protocols into RIP",
                    "protocols": ["babel", "bgp", "connected", "isis", "kernel", "nhrp", "ospf", "static"],
                },
                "timers": {
                    "supported": True,
                    "description": "RIP update, timeout, and garbage-collection timers",
                },
            },
        }

    # ========================================================================
    # Global Settings
    # ========================================================================

    def set_default_distance(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_default_distance(value))

    def delete_default_distance(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_default_distance_delete())

    def set_default_information_originate(self) -> "RipBatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def delete_default_information_originate(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    def set_default_metric(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_default_metric(value))

    def delete_default_metric(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_default_metric_delete())

    def set_route_map(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_route_map(value))

    def delete_route_map(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_route_map_delete())

    def set_version(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_version(value))

    def delete_version(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_version_delete())

    # ========================================================================
    # Networks
    # ========================================================================

    def set_network(self, network: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_network(network))

    def delete_network(self, network: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_network_delete(network))

    # ========================================================================
    # Neighbors
    # ========================================================================

    def set_neighbor(self, address: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_neighbor(address))

    def delete_neighbor(self, address: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_neighbor_delete(address))

    # ========================================================================
    # Static Routes
    # ========================================================================

    def set_route(self, prefix: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_route(prefix))

    def delete_route(self, prefix: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_route_delete(prefix))

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def set_passive_interface(self, iface: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_passive_interface(iface))

    def delete_passive_interface(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_passive_interface_delete(iface))

    # ========================================================================
    # Distribute List - Global
    # ========================================================================

    def set_distribute_list_access_list_in(self, acl: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_access_list_in(acl))

    def delete_distribute_list_access_list_in(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_in_delete())

    def set_distribute_list_access_list_out(self, acl: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_access_list_out(acl))

    def delete_distribute_list_access_list_out(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_out_delete())

    def set_distribute_list_prefix_list_in(self, prefix_list: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_in(prefix_list))

    def delete_distribute_list_prefix_list_in(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_in_delete())

    def set_distribute_list_prefix_list_out(self, prefix_list: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_out(prefix_list))

    def delete_distribute_list_prefix_list_out(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_out_delete())

    # ========================================================================
    # Distribute List - Per Interface
    # ========================================================================

    def set_distribute_list_interface_access_list_in(self, iface: str, acl: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_in(iface, acl))

    def delete_distribute_list_interface_access_list_in(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_in_delete(iface))

    def set_distribute_list_interface_access_list_out(self, iface: str, acl: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_out(iface, acl))

    def delete_distribute_list_interface_access_list_out(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_out_delete(iface))

    def set_distribute_list_interface_prefix_list_in(self, iface: str, prefix_list: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_prefix_list_in(iface, prefix_list))

    def delete_distribute_list_interface_prefix_list_in(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_prefix_list_in_delete(iface))

    def set_distribute_list_interface_prefix_list_out(self, iface: str, prefix_list: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_prefix_list_out(iface, prefix_list))

    def delete_distribute_list_interface_prefix_list_out(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_prefix_list_out_delete(iface))

    def delete_distribute_list_interface(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_delete(iface))

    # ========================================================================
    # Interface Settings
    # ========================================================================

    def set_interface(self, iface: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_authentication_md5_key(self, iface: str, key_id: str, password: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_authentication_md5_key(iface, key_id, password))

    def delete_interface_authentication_md5(self, iface: str, key_id: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_authentication_md5_delete(iface, key_id))

    def set_interface_authentication_plaintext(self, iface: str, password: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_authentication_plaintext(iface, password))

    def delete_interface_authentication(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_authentication_delete(iface))

    def set_interface_receive_version(self, iface: str, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_receive_version(iface, value))

    def delete_interface_receive_version(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_receive_version_delete(iface))

    def set_interface_send_version(self, iface: str, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_send_version(iface, value))

    def delete_interface_send_version(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_send_version_delete(iface))

    def set_interface_split_horizon_disable(self, iface: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_split_horizon_disable(iface))

    def set_interface_split_horizon_poison_reverse(self, iface: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_interface_split_horizon_poison_reverse(iface))

    def delete_interface_split_horizon(self, iface: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_interface_split_horizon_delete(iface))

    # ========================================================================
    # Network Distance
    # ========================================================================

    def set_network_distance(self, prefix: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_network_distance(prefix))

    def set_network_distance_value(self, prefix: str, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_network_distance_value(prefix, value))

    def set_network_distance_access_list(self, prefix: str, acl: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_network_distance_access_list(prefix, acl))

    def delete_network_distance(self, prefix: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_network_distance_delete(prefix))

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_redistribute(self, protocol: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_redistribute(protocol))

    def set_redistribute_metric(self, protocol: str, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_redistribute_metric(protocol, value))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map(protocol, value))

    def delete_redistribute(self, protocol: str) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(protocol))

    # ========================================================================
    # Timers
    # ========================================================================

    def set_timers_update(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_timers_update(value))

    def delete_timers_update(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_timers_update_delete())

    def set_timers_timeout(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_timers_timeout(value))

    def delete_timers_timeout(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_timers_timeout_delete())

    def set_timers_garbage_collection(self, value: str) -> "RipBatchBuilder":
        return self.add_set(self.m.get_timers_garbage_collection(value))

    def delete_timers_garbage_collection(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_timers_garbage_collection_delete())

    def delete_timers(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_timers_delete())

    # ========================================================================
    # Delete entire RIP
    # ========================================================================

    def delete_rip(self) -> "RipBatchBuilder":
        return self.add_delete(self.m.get_rip_delete())
