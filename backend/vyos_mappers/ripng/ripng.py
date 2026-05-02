"""RIPng Protocol Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper


class RipNgMapper(BaseFeatureMapper):
    """Base mapper for RIPng protocol configuration paths."""

    def __init__(self, version: str):
        super().__init__(version)

    def _ripng(self) -> List[str]:
        return ["protocols", "ripng"]

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_default_information_originate(self) -> List[str]:
        return self._ripng() + ["default-information", "originate"]

    def get_default_information_originate_delete(self) -> List[str]:
        return self._ripng() + ["default-information", "originate"]

    def get_default_metric(self, value: str) -> List[str]:
        return self._ripng() + ["default-metric", value]

    def get_default_metric_delete(self) -> List[str]:
        return self._ripng() + ["default-metric"]

    def get_route_map(self, value: str) -> List[str]:
        return self._ripng() + ["route-map", value]

    def get_route_map_delete(self) -> List[str]:
        return self._ripng() + ["route-map"]

    # ========================================================================
    # Aggregate addresses
    # ========================================================================

    def get_aggregate_address(self, prefix: str) -> List[str]:
        return self._ripng() + ["aggregate-address", prefix]

    def get_aggregate_address_delete(self, prefix: str) -> List[str]:
        return self._ripng() + ["aggregate-address", prefix]

    # ========================================================================
    # Networks
    # ========================================================================

    def get_network(self, network: str) -> List[str]:
        return self._ripng() + ["network", network]

    def get_network_delete(self, network: str) -> List[str]:
        return self._ripng() + ["network", network]

    # ========================================================================
    # Static routes
    # ========================================================================

    def get_route(self, prefix: str) -> List[str]:
        return self._ripng() + ["route", prefix]

    def get_route_delete(self, prefix: str) -> List[str]:
        return self._ripng() + ["route", prefix]

    # ========================================================================
    # Passive interface
    # ========================================================================

    def get_passive_interface(self, iface: str) -> List[str]:
        return self._ripng() + ["passive-interface", iface]

    def get_passive_interface_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["passive-interface", iface]

    # ========================================================================
    # Distribute list - global
    # ========================================================================

    def get_distribute_list_access_list_in(self, acl: str) -> List[str]:
        return self._ripng() + ["distribute-list", "access-list", "in", acl]

    def get_distribute_list_access_list_in_delete(self) -> List[str]:
        return self._ripng() + ["distribute-list", "access-list", "in"]

    def get_distribute_list_access_list_out(self, acl: str) -> List[str]:
        return self._ripng() + ["distribute-list", "access-list", "out", acl]

    def get_distribute_list_access_list_out_delete(self) -> List[str]:
        return self._ripng() + ["distribute-list", "access-list", "out"]

    def get_distribute_list_prefix_list_in(self, prefix_list: str) -> List[str]:
        return self._ripng() + ["distribute-list", "prefix-list", "in", prefix_list]

    def get_distribute_list_prefix_list_in_delete(self) -> List[str]:
        return self._ripng() + ["distribute-list", "prefix-list", "in"]

    def get_distribute_list_prefix_list_out(self, prefix_list: str) -> List[str]:
        return self._ripng() + ["distribute-list", "prefix-list", "out", prefix_list]

    def get_distribute_list_prefix_list_out_delete(self) -> List[str]:
        return self._ripng() + ["distribute-list", "prefix-list", "out"]

    # ========================================================================
    # Distribute list - per interface
    # ========================================================================

    def get_distribute_list_interface_access_list_in(self, iface: str, acl: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "access-list", "in", acl]

    def get_distribute_list_interface_access_list_in_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "access-list", "in"]

    def get_distribute_list_interface_access_list_out(self, iface: str, acl: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "access-list", "out", acl]

    def get_distribute_list_interface_access_list_out_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "access-list", "out"]

    def get_distribute_list_interface_prefix_list_in(self, iface: str, prefix_list: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "prefix-list", "in", prefix_list]

    def get_distribute_list_interface_prefix_list_in_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "prefix-list", "in"]

    def get_distribute_list_interface_prefix_list_out(self, iface: str, prefix_list: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "prefix-list", "out", prefix_list]

    def get_distribute_list_interface_prefix_list_out_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface, "prefix-list", "out"]

    def get_distribute_list_interface_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["distribute-list", "interface", iface]

    # ========================================================================
    # Interface settings (split-horizon only; RIPng has no authentication)
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._ripng() + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["interface", iface]

    def get_interface_split_horizon_disable(self, iface: str) -> List[str]:
        return self._ripng() + ["interface", iface, "split-horizon", "disable"]

    def get_interface_split_horizon_poison_reverse(self, iface: str) -> List[str]:
        return self._ripng() + ["interface", iface, "split-horizon", "poison-reverse"]

    def get_interface_split_horizon_delete(self, iface: str) -> List[str]:
        return self._ripng() + ["interface", iface, "split-horizon"]

    # ========================================================================
    # Redistribute
    # ========================================================================

    def get_redistribute(self, protocol: str) -> List[str]:
        return self._ripng() + ["redistribute", protocol]

    def get_redistribute_metric(self, protocol: str, value: str) -> List[str]:
        return self._ripng() + ["redistribute", protocol, "metric", value]

    def get_redistribute_route_map(self, protocol: str, value: str) -> List[str]:
        return self._ripng() + ["redistribute", protocol, "route-map", value]

    def get_redistribute_delete(self, protocol: str) -> List[str]:
        return self._ripng() + ["redistribute", protocol]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_timers_update(self, value: str) -> List[str]:
        return self._ripng() + ["timers", "update", value]

    def get_timers_update_delete(self) -> List[str]:
        return self._ripng() + ["timers", "update"]

    def get_timers_timeout(self, value: str) -> List[str]:
        return self._ripng() + ["timers", "timeout", value]

    def get_timers_timeout_delete(self) -> List[str]:
        return self._ripng() + ["timers", "timeout"]

    def get_timers_garbage_collection(self, value: str) -> List[str]:
        return self._ripng() + ["timers", "garbage-collection", value]

    def get_timers_garbage_collection_delete(self) -> List[str]:
        return self._ripng() + ["timers", "garbage-collection"]

    def get_timers_delete(self) -> List[str]:
        return self._ripng() + ["timers"]

    # ========================================================================
    # Delete entire RIPng
    # ========================================================================

    def get_ripng_delete(self) -> List[str]:
        return self._ripng()
