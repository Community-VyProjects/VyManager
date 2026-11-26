"""RIPng Protocol Batch Builder.

Provides all batch operations for RIPng (Routing Information Protocol next
generation) configuration. Covers: global settings, aggregate addresses,
networks, static routes, passive interfaces, distribute lists, interface
split-horizon, redistribute, and timers.

The protocols ripng templates are the same on VyOS 1.4 and 1.5. A number
outside the lab range, an IPv6 prefix with host bits set, a malformed list or
route-map name, or an unknown redistribute source raises ValueError before the
op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ripng.ripng import RipNgMapper
from vyos_builders.base import BatchBuilder

# Lab syntax bounds (protocols ripng, identical on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    # default-metric and redistribute <proto> metric
    "metric": {"min": 1, "max": 16},
    # timers update, timeout and garbage-collection
    "timer": {"min": 5, "max": 2147483647},
}

# ASCII: a Unicode digit (٣, ３０) is not a number the lab takes.
_DECIMAL = re.compile(r"\d{1,10}", re.ASCII)
# Prefix length as the lab takes it: no leading zero (/032 is rejected).
_PREFIX_LENGTH = re.compile(r"0|[1-9]\d{0,2}", re.ASCII)
# route-map and redistribute <proto> route-map node.def syntax.
_ROUTE_MAP_NAME = re.compile(r"[-_a-zA-Z0-9][\w\-\.\+]*", re.ASCII)
# distribute-list access-list takes a `policy access-list6` name. That node
# has no name validator on the lab (free text); reject only a blank,
# whitespace or a comma so the op still names one list.
_ACCESS_LIST_NAME = re.compile(r"[^\s,]+")
# distribute-list prefix-list takes a `policy prefix-list6` name, which the lab
# limits to [-_a-zA-Z0-9]+ ("." and "+" are rejected).
_PREFIX_LIST_NAME = re.compile(r"[-_a-zA-Z0-9]+", re.ASCII)


def _number(key: str, value: str) -> str:
    """value when it is a decimal inside RANGES[key], else ValueError."""
    bounds = RANGES[key]
    text = str(value).strip()
    if not _DECIMAL.fullmatch(text) or not bounds["min"] <= int(text) <= bounds["max"]:
        raise ValueError(f"{key} must be a number from {bounds['min']} to {bounds['max']}")
    return text


def _ipv6_prefix(value: str) -> str:
    text = str(value).strip()
    try:
        address, sep, length = text.partition("/")
        # The lab rejects a zone index (fe80::%eth0/64) and /032.
        if not sep or "%" in address or not _PREFIX_LENGTH.fullmatch(length):
            raise ValueError
        # strict: the lab rejects a prefix with host bits set (2001:db8::1/48).
        ipaddress.IPv6Network(text, strict=True)
    except ValueError:
        raise ValueError("prefix must be an IPv6 prefix with no host bits set") from None
    return text


def _route_map(value: str) -> str:
    text = str(value).strip()
    if not _ROUTE_MAP_NAME.fullmatch(text):
        raise ValueError("route_map name may only contain letters, digits, hyphen, underscore, dot and plus")
    return text


def _access_list(value: str) -> str:
    text = str(value).strip()
    if not _ACCESS_LIST_NAME.fullmatch(text):
        raise ValueError("access-list name must not be blank or contain whitespace or a comma")
    return text


def _prefix_list(value: str) -> str:
    text = str(value).strip()
    if not _PREFIX_LIST_NAME.fullmatch(text):
        raise ValueError("prefix-list name may only contain letters, digits, hyphen and underscore")
    return text


class RipNgBatchBuilder(BatchBuilder):
    """Complete batch builder for RIPng protocol operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "ripng"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> RipNgMapper:
        return cast(RipNgMapper, self.mappers[self.mapper_key])

    def _protocol(self, protocol: str) -> str:
        if protocol not in self.m.redistribute_protocol_list():
            raise ValueError(f"redistribute {protocol} is not supported")
        return protocol

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
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
                    "protocols": self.m.redistribute_protocol_list(),
                },
                "timers": {
                    "supported": True,
                    "description": "RIPng update, timeout, and garbage-collection timers",
                },
            },
            "ranges": RANGES,
        }

    # ========================================================================
    # Global Settings
    # ========================================================================

    def set_default_information_originate(self) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def delete_default_information_originate(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    def set_default_metric(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_default_metric(_number("metric", value)))

    def delete_default_metric(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_default_metric_delete())

    def set_route_map(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_route_map(_route_map(value)))

    def delete_route_map(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_route_map_delete())

    # ========================================================================
    # Aggregate Addresses
    # ========================================================================

    def set_aggregate_address(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_aggregate_address(_ipv6_prefix(prefix)))

    def delete_aggregate_address(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_aggregate_address_delete(_ipv6_prefix(prefix)))

    # ========================================================================
    # Networks
    # ========================================================================

    def set_network(self, network: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_network(_ipv6_prefix(network)))

    def delete_network(self, network: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_network_delete(_ipv6_prefix(network)))

    # ========================================================================
    # Static Routes
    # ========================================================================

    def set_route(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_route(_ipv6_prefix(prefix)))

    def delete_route(self, prefix: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_route_delete(_ipv6_prefix(prefix)))

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
        return self.add_set(self.m.get_distribute_list_access_list_in(_access_list(acl)))

    def delete_distribute_list_access_list_in(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_in_delete())

    def set_distribute_list_access_list_out(self, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_access_list_out(_access_list(acl)))

    def delete_distribute_list_access_list_out(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_access_list_out_delete())

    def set_distribute_list_prefix_list_in(self, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_in(_prefix_list(prefix_list)))

    def delete_distribute_list_prefix_list_in(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_in_delete())

    def set_distribute_list_prefix_list_out(self, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_prefix_list_out(_prefix_list(prefix_list)))

    def delete_distribute_list_prefix_list_out(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_prefix_list_out_delete())

    # ========================================================================
    # Distribute List - Per Interface
    # ========================================================================

    def set_distribute_list_interface_access_list_in(self, iface: str, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_in(iface, _access_list(acl)))

    def delete_distribute_list_interface_access_list_in(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_in_delete(iface))

    def set_distribute_list_interface_access_list_out(self, iface: str, acl: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_distribute_list_interface_access_list_out(iface, _access_list(acl)))

    def delete_distribute_list_interface_access_list_out(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_access_list_out_delete(iface))

    def set_distribute_list_interface_prefix_list_in(self, iface: str, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(
            self.m.get_distribute_list_interface_prefix_list_in(iface, _prefix_list(prefix_list)))

    def delete_distribute_list_interface_prefix_list_in(self, iface: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_distribute_list_interface_prefix_list_in_delete(iface))

    def set_distribute_list_interface_prefix_list_out(self, iface: str, prefix_list: str) -> "RipNgBatchBuilder":
        return self.add_set(
            self.m.get_distribute_list_interface_prefix_list_out(iface, _prefix_list(prefix_list)))

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
        return self.add_set(self.m.get_redistribute(self._protocol(protocol)))

    def set_redistribute_metric(self, protocol: str, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_redistribute_metric(self._protocol(protocol), _number("metric", value)))

    def delete_redistribute_metric(self, protocol: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_redistribute_metric_delete(self._protocol(protocol)))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map(self._protocol(protocol), _route_map(value)))

    def delete_redistribute_route_map(self, protocol: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_redistribute_route_map_delete(self._protocol(protocol)))

    def delete_redistribute(self, protocol: str) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(self._protocol(protocol)))

    # ========================================================================
    # Timers
    # ========================================================================

    def set_timers_update(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_update(_number("timer", value)))

    def delete_timers_update(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_update_delete())

    def set_timers_timeout(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_timeout(_number("timer", value)))

    def delete_timers_timeout(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_timeout_delete())

    def set_timers_garbage_collection(self, value: str) -> "RipNgBatchBuilder":
        return self.add_set(self.m.get_timers_garbage_collection(_number("timer", value)))

    def delete_timers_garbage_collection(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_garbage_collection_delete())

    def delete_timers(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_timers_delete())

    # ========================================================================
    # Delete entire RIPng
    # ========================================================================

    def delete_ripng(self) -> "RipNgBatchBuilder":
        return self.add_delete(self.m.get_ripng_delete())
