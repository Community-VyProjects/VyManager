"""
OSPFv3 Protocol Batch Builder

Provides all batch operations for OSPFv3 (IPv6 OSPF) configuration.
Covers: parameters, areas, interfaces, redistribute, default-information,
distance, auto-cost, log-adjacency-changes, graceful-restart.

The protocols ospfv3 templates are the same on VyOS 1.4 and 1.5. A number
outside the lab range, a bad enum value, or a malformed area ID, router ID or
IPv6 prefix raises ValueError before the op is queued.
"""

import ipaddress
import re
from typing import Any, Dict, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ospfv3.ospfv3 import Ospfv3Mapper
from vyos_builders.base import BatchBuilder

# Lab syntax bounds (protocols ospfv3, identical on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    "area_id": {"min": 0, "max": 4294967295},
    "reference_bandwidth": {"min": 1, "max": 4294967},
    "metric": {"min": 0, "max": 16777214},
    "metric_type": {"min": 1, "max": 2},
    "distance": {"min": 1, "max": 255},
    "grace_period": {"min": 5, "max": 1800},
    "supported_grace_time": {"min": 10, "max": 1800},
    "cost": {"min": 1, "max": 65535},
    "dead_interval": {"min": 1, "max": 65535},
    "hello_interval": {"min": 1, "max": 65535},
    "ifmtu": {"min": 1, "max": 65535},
    "retransmit_interval": {"min": 1, "max": 65535},
    "transmit_delay": {"min": 1, "max": 65535},
    "instance_id": {"min": 0, "max": 255},
    "priority": {"min": 0, "max": 255},
}

_DECIMAL = re.compile(r"^\d{1,10}$")


def _number(key: str, value: str) -> str:
    """value when it is a decimal inside RANGES[key], else ValueError."""
    bounds = RANGES[key]
    text = str(value).strip()
    if not _DECIMAL.match(text) or not bounds["min"] <= int(text) <= bounds["max"]:
        raise ValueError(f"{key} must be a number from {bounds['min']} to {bounds['max']}")
    return text


def _ipv4(label: str, value: str) -> str:
    text = str(value).strip()
    try:
        ipaddress.IPv4Address(text)
    except ValueError:
        raise ValueError(f"{label} must be an IPv4 address") from None
    return text


def _area_id(value: str) -> str:
    """Area ID: 0-4294967295 or an IPv4 address (lab: numeric or ip-address)."""
    text = str(value).strip()
    if _DECIMAL.match(text):
        return _number("area_id", text)
    try:
        ipaddress.IPv4Address(text)
    except ValueError:
        raise ValueError("area_id must be 0-4294967295 or an IPv4 address") from None
    return text


def _ipv6_prefix(value: str) -> str:
    text = str(value).strip()
    try:
        if "/" not in text:
            raise ValueError
        # strict: the lab rejects a prefix with host bits set (2001:db8::1/48).
        ipaddress.IPv6Network(text, strict=True)
    except ValueError:
        raise ValueError("range must be an IPv6 prefix with no host bits set") from None
    return text


class Ospfv3BatchBuilder(BatchBuilder):
    """Complete batch builder for OSPFv3 protocol operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "ospfv3"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> Ospfv3Mapper:
        return cast(Ospfv3Mapper, self.mappers[self.mapper_key])

    def _protocol(self, protocol: str) -> str:
        if protocol not in self.m.redistribute_protocol_list():
            raise ValueError(f"redistribute {protocol} is not supported")
        return protocol

    def _metric_type(self, value: str) -> str:
        text = str(value).strip()
        if text not in self.m.metric_types():
            raise ValueError(f"metric_type must be one of {', '.join(self.m.metric_types())}")
        return text

    def _network(self, value: str) -> str:
        if value not in self.m.network_types():
            raise ValueError(f"network must be one of {', '.join(self.m.network_types())}")
        return value

    # ========================================================================
    # Parameters
    # ========================================================================

    def set_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_router_id(_ipv4("router_id", value)))

    def delete_router_id(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_router_id_delete())

    # ========================================================================
    # Areas
    # ========================================================================

    def set_area(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area(_area_id(area_id)))

    def delete_area(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_delete(_area_id(area_id)))

    def set_area_type_stub(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_stub(_area_id(area_id)))

    def set_area_type_stub_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_stub_no_summary(_area_id(area_id)))

    def delete_area_type_stub_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_type_stub_no_summary_delete(_area_id(area_id)))

    def set_area_type_nssa(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa(_area_id(area_id)))

    def set_area_type_nssa_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_no_summary(_area_id(area_id)))

    def delete_area_type_nssa_no_summary(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_type_nssa_no_summary_delete(_area_id(area_id)))

    def set_area_type_nssa_default_information_originate(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_type_nssa_default_information_originate(_area_id(area_id)))

    def delete_area_type_nssa_default_information_originate(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(
            self.m.get_area_type_nssa_default_information_originate_delete(_area_id(area_id)))

    def delete_area_type(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_type_delete(_area_id(area_id)))

    def set_area_range(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range(_area_id(area_id), _ipv6_prefix(prefix)))

    def set_area_range_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range_advertise(_area_id(area_id), _ipv6_prefix(prefix)))

    def delete_area_range_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_range_advertise_delete(_area_id(area_id), _ipv6_prefix(prefix)))

    def set_area_range_not_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_range_not_advertise(_area_id(area_id), _ipv6_prefix(prefix)))

    def delete_area_range_not_advertise(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(
            self.m.get_area_range_not_advertise_delete(_area_id(area_id), _ipv6_prefix(prefix)))

    def delete_area_range(self, area_id: str, prefix: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_range_delete(_area_id(area_id), _ipv6_prefix(prefix)))

    def set_area_export_list(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_export_list(_area_id(area_id), value))

    def delete_area_export_list(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_export_list_delete(_area_id(area_id)))

    def set_area_import_list(self, area_id: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_area_import_list(_area_id(area_id), value))

    def delete_area_import_list(self, area_id: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_area_import_list_delete(_area_id(area_id)))

    # ========================================================================
    # Interfaces
    # ========================================================================

    def set_interface(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_area(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_area(iface, _area_id(value)))

    def delete_interface_area(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_area_delete(iface))

    def set_interface_cost(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_cost(iface, _number("cost", value)))

    def delete_interface_cost(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_cost_delete(iface))

    def set_interface_priority(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_priority(iface, _number("priority", value)))

    def delete_interface_priority(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_priority_delete(iface))

    def set_interface_hello_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_hello_interval(iface, _number("hello_interval", value)))

    def delete_interface_hello_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_hello_interval_delete(iface))

    def set_interface_dead_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_dead_interval(iface, _number("dead_interval", value)))

    def delete_interface_dead_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_dead_interval_delete(iface))

    def set_interface_retransmit_interval(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(
            self.m.get_interface_retransmit_interval(iface, _number("retransmit_interval", value)))

    def delete_interface_retransmit_interval(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_retransmit_interval_delete(iface))

    def set_interface_transmit_delay(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_transmit_delay(iface, _number("transmit_delay", value)))

    def delete_interface_transmit_delay(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_transmit_delay_delete(iface))

    def set_interface_network(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_network(iface, self._network(value)))

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
        return self.add_set(self.m.get_interface_ifmtu(iface, _number("ifmtu", value)))

    def delete_interface_ifmtu(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_ifmtu_delete(iface))

    def set_interface_instance_id(self, iface: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_interface_instance_id(iface, _number("instance_id", value)))

    def delete_interface_instance_id(self, iface: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_interface_instance_id_delete(iface))

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_redistribute(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute(self._protocol(protocol)))

    def set_redistribute_metric(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_metric(self._protocol(protocol), _number("metric", value)))

    def delete_redistribute_metric(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_redistribute_metric_delete(self._protocol(protocol)))

    def set_redistribute_metric_type(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_metric_type(self._protocol(protocol), self._metric_type(value)))

    def delete_redistribute_metric_type(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_redistribute_metric_type_delete(self._protocol(protocol)))

    def set_redistribute_route_map(self, protocol: str, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map(self._protocol(protocol), value))

    def delete_redistribute_route_map(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_redistribute_route_map_delete(self._protocol(protocol)))

    def delete_redistribute(self, protocol: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete(self._protocol(protocol)))

    # ========================================================================
    # Default Information
    # ========================================================================

    def set_default_information_originate(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate())

    def set_default_information_originate_always(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_always())

    def delete_default_information_originate_always(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_always_delete())

    def set_default_information_originate_metric(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric(_number("metric", value)))

    def delete_default_information_originate_metric(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_metric_delete())

    def set_default_information_originate_metric_type(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_metric_type(self._metric_type(value)))

    def delete_default_information_originate_metric_type(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_metric_type_delete())

    def set_default_information_originate_route_map(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_default_information_originate_route_map(value))

    def delete_default_information_originate_route_map(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_route_map_delete())

    def delete_default_information_originate(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_default_information_originate_delete())

    # ========================================================================
    # Distance
    # ========================================================================

    def set_distance_global(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_global(_number("distance", value)))

    def delete_distance_global(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_global_delete())

    def set_distance_ospfv3_external(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_external(_number("distance", value)))

    def delete_distance_ospfv3_external(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_ospfv3_external_delete())

    def set_distance_ospfv3_inter_area(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_inter_area(_number("distance", value)))

    def delete_distance_ospfv3_inter_area(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_ospfv3_inter_area_delete())

    def set_distance_ospfv3_intra_area(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_distance_ospfv3_intra_area(_number("distance", value)))

    def delete_distance_ospfv3_intra_area(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_ospfv3_intra_area_delete())

    def delete_distance_ospfv3(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_distance_ospfv3_delete())

    # ========================================================================
    # Auto Cost
    # ========================================================================

    def set_auto_cost_reference_bandwidth(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_auto_cost_reference_bandwidth(_number("reference_bandwidth", value)))

    def delete_auto_cost_reference_bandwidth(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_auto_cost_reference_bandwidth_delete())

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def set_log_adjacency_changes(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes())

    def set_log_adjacency_changes_detail(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes_detail())

    def delete_log_adjacency_changes_detail(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_log_adjacency_changes_detail_delete())

    def delete_log_adjacency_changes(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_log_adjacency_changes_delete())

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def set_graceful_restart(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart())

    def set_graceful_restart_grace_period(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_grace_period(_number("grace_period", value)))

    def delete_graceful_restart_grace_period(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_grace_period_delete())

    def set_graceful_restart_helper_enable(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_enable())

    def delete_graceful_restart_helper_enable(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_enable_delete())

    def set_graceful_restart_helper_enable_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_enable_router_id(_ipv4("router_id", value)))

    def delete_graceful_restart_helper_enable_router_id(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_delete(
            self.m.get_graceful_restart_helper_enable_router_id_delete(_ipv4("router_id", value)))

    def set_graceful_restart_helper_lsa_check_disable(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_lsa_check_disable())

    def delete_graceful_restart_helper_lsa_check_disable(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_lsa_check_disable_delete())

    def set_graceful_restart_helper_planned_only(self) -> "Ospfv3BatchBuilder":
        return self.add_set(self.m.get_graceful_restart_helper_planned_only())

    def delete_graceful_restart_helper_planned_only(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_planned_only_delete())

    def set_graceful_restart_helper_supported_grace_time(self, value: str) -> "Ospfv3BatchBuilder":
        return self.add_set(
            self.m.get_graceful_restart_helper_supported_grace_time(_number("supported_grace_time", value)))

    def delete_graceful_restart_helper_supported_grace_time(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_supported_grace_time_delete())

    def delete_graceful_restart_helper(self) -> "Ospfv3BatchBuilder":
        return self.add_delete(self.m.get_graceful_restart_helper_delete())

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
        mapper = self.m
        return {
            "version": self.version,
            "features": {
                "areas": {
                    "supported": True,
                    "description": "OSPFv3 area configuration (stub, nssa)",
                    "area_types": mapper.area_types(),
                },
                "interfaces": {
                    "supported": True,
                    "description": "OSPFv3 interface settings (cost, priority, timers, BFD)",
                    "network_types": mapper.network_types(),
                },
                "redistribute": {
                    "supported": True,
                    "description": "Route redistribution",
                    "protocols": mapper.redistribute_protocol_list(),
                    "metric_types": mapper.metric_types(),
                },
                "default_information": {
                    "supported": True,
                    "description": "Default route origination",
                    "metric_types": mapper.metric_types(),
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
            "ranges": RANGES,
        }
