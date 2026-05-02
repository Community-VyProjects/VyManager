"""RIP Protocol Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper


class RipMapper(BaseFeatureMapper):
    """Base mapper for RIP protocol configuration paths."""

    def __init__(self, version: str):
        super().__init__(version)

    def _rip(self) -> List[str]:
        return ["protocols", "rip"]

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_default_distance(self, value: str) -> List[str]:
        return self._rip() + ["default-distance", value]

    def get_default_distance_delete(self) -> List[str]:
        return self._rip() + ["default-distance"]

    def get_default_information_originate(self) -> List[str]:
        return self._rip() + ["default-information", "originate"]

    def get_default_information_originate_delete(self) -> List[str]:
        return self._rip() + ["default-information", "originate"]

    def get_default_metric(self, value: str) -> List[str]:
        return self._rip() + ["default-metric", value]

    def get_default_metric_delete(self) -> List[str]:
        return self._rip() + ["default-metric"]

    def get_route_map(self, value: str) -> List[str]:
        return self._rip() + ["route-map", value]

    def get_route_map_delete(self) -> List[str]:
        return self._rip() + ["route-map"]

    def get_version(self, value: str) -> List[str]:
        return self._rip() + ["version", value]

    def get_version_delete(self) -> List[str]:
        return self._rip() + ["version"]

    # ========================================================================
    # Networks
    # ========================================================================

    def get_network(self, network: str) -> List[str]:
        return self._rip() + ["network", network]

    def get_network_delete(self, network: str) -> List[str]:
        return self._rip() + ["network", network]

    # ========================================================================
    # Neighbors
    # ========================================================================

    def get_neighbor(self, address: str) -> List[str]:
        return self._rip() + ["neighbor", address]

    def get_neighbor_delete(self, address: str) -> List[str]:
        return self._rip() + ["neighbor", address]

    # ========================================================================
    # Static routes
    # ========================================================================

    def get_route(self, prefix: str) -> List[str]:
        return self._rip() + ["route", prefix]

    def get_route_delete(self, prefix: str) -> List[str]:
        return self._rip() + ["route", prefix]

    # ========================================================================
    # Passive interface
    # ========================================================================

    def get_passive_interface(self, iface: str) -> List[str]:
        return self._rip() + ["passive-interface", iface]

    def get_passive_interface_delete(self, iface: str) -> List[str]:
        return self._rip() + ["passive-interface", iface]

    # ========================================================================
    # Distribute list - global
    # ========================================================================

    def get_distribute_list_access_list_in(self, acl: str) -> List[str]:
        return self._rip() + ["distribute-list", "access-list", "in", acl]

    def get_distribute_list_access_list_in_delete(self) -> List[str]:
        return self._rip() + ["distribute-list", "access-list", "in"]

    def get_distribute_list_access_list_out(self, acl: str) -> List[str]:
        return self._rip() + ["distribute-list", "access-list", "out", acl]

    def get_distribute_list_access_list_out_delete(self) -> List[str]:
        return self._rip() + ["distribute-list", "access-list", "out"]

    def get_distribute_list_prefix_list_in(self, prefix_list: str) -> List[str]:
        return self._rip() + ["distribute-list", "prefix-list", "in", prefix_list]

    def get_distribute_list_prefix_list_in_delete(self) -> List[str]:
        return self._rip() + ["distribute-list", "prefix-list", "in"]

    def get_distribute_list_prefix_list_out(self, prefix_list: str) -> List[str]:
        return self._rip() + ["distribute-list", "prefix-list", "out", prefix_list]

    def get_distribute_list_prefix_list_out_delete(self) -> List[str]:
        return self._rip() + ["distribute-list", "prefix-list", "out"]

    # ========================================================================
    # Distribute list - per interface
    # ========================================================================

    def get_distribute_list_interface_access_list_in(self, iface: str, acl: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "access-list", "in", acl]

    def get_distribute_list_interface_access_list_in_delete(self, iface: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "access-list", "in"]

    def get_distribute_list_interface_access_list_out(self, iface: str, acl: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "access-list", "out", acl]

    def get_distribute_list_interface_access_list_out_delete(self, iface: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "access-list", "out"]

    def get_distribute_list_interface_prefix_list_in(self, iface: str, prefix_list: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "prefix-list", "in", prefix_list]

    def get_distribute_list_interface_prefix_list_in_delete(self, iface: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "prefix-list", "in"]

    def get_distribute_list_interface_prefix_list_out(self, iface: str, prefix_list: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "prefix-list", "out", prefix_list]

    def get_distribute_list_interface_prefix_list_out_delete(self, iface: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface, "prefix-list", "out"]

    def get_distribute_list_interface_delete(self, iface: str) -> List[str]:
        return self._rip() + ["distribute-list", "interface", iface]

    # ========================================================================
    # Interface settings
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface]

    def get_interface_authentication_md5_key(self, iface: str, key_id: str, password: str) -> List[str]:
        return self._rip() + ["interface", iface, "authentication", "md5", key_id, "password", password]

    def get_interface_authentication_md5_delete(self, iface: str, key_id: str) -> List[str]:
        return self._rip() + ["interface", iface, "authentication", "md5", key_id]

    def get_interface_authentication_plaintext(self, iface: str, password: str) -> List[str]:
        return self._rip() + ["interface", iface, "authentication", "plaintext-password", password]

    def get_interface_authentication_delete(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "authentication"]

    def get_interface_receive_version(self, iface: str, value: str) -> List[str]:
        return self._rip() + ["interface", iface, "receive", "version", value]

    def get_interface_receive_version_delete(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "receive", "version"]

    def get_interface_send_version(self, iface: str, value: str) -> List[str]:
        return self._rip() + ["interface", iface, "send", "version", value]

    def get_interface_send_version_delete(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "send", "version"]

    def get_interface_split_horizon_disable(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "split-horizon", "disable"]

    def get_interface_split_horizon_poison_reverse(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "split-horizon", "poison-reverse"]

    def get_interface_split_horizon_delete(self, iface: str) -> List[str]:
        return self._rip() + ["interface", iface, "split-horizon"]

    # ========================================================================
    # Network distance
    # ========================================================================

    def get_network_distance(self, prefix: str) -> List[str]:
        return self._rip() + ["network-distance", prefix]

    def get_network_distance_value(self, prefix: str, value: str) -> List[str]:
        return self._rip() + ["network-distance", prefix, "distance", value]

    def get_network_distance_access_list(self, prefix: str, acl: str) -> List[str]:
        return self._rip() + ["network-distance", prefix, "access-list", acl]

    def get_network_distance_delete(self, prefix: str) -> List[str]:
        return self._rip() + ["network-distance", prefix]

    # ========================================================================
    # Redistribute
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        return self._rip() + ["redistribute", protocol]

    def get_redistribute_metric(self, protocol: str, value: str) -> List[str]:
        return self._rip() + ["redistribute", protocol, "metric", value]

    def get_redistribute_route_map(self, protocol: str, value: str) -> List[str]:
        return self._rip() + ["redistribute", protocol, "route-map", value]

    def get_redistribute_delete(self, protocol: str) -> List[str]:
        return self._rip() + ["redistribute", protocol]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_timers_update(self, value: str) -> List[str]:
        return self._rip() + ["timers", "update", value]

    def get_timers_update_delete(self) -> List[str]:
        return self._rip() + ["timers", "update"]

    def get_timers_timeout(self, value: str) -> List[str]:
        return self._rip() + ["timers", "timeout", value]

    def get_timers_timeout_delete(self) -> List[str]:
        return self._rip() + ["timers", "timeout"]

    def get_timers_garbage_collection(self, value: str) -> List[str]:
        return self._rip() + ["timers", "garbage-collection", value]

    def get_timers_garbage_collection_delete(self) -> List[str]:
        return self._rip() + ["timers", "garbage-collection"]

    def get_timers_delete(self) -> List[str]:
        return self._rip() + ["timers"]

    # ========================================================================
    # Delete entire RIP
    # ========================================================================

    def get_rip_delete(self) -> List[str]:
        return self._rip()
