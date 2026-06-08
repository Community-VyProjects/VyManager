"""
VRF OSPFv3 Command Mapper

Handles command path generation for OSPFv3 configuration within VRF instances.
No version differences between VyOS 1.4 and 1.5.

Config tree: vrf name <NAME> protocols ospfv3
  area/<AREA>/ (range, export-list, import-list, area-type)
  auto-cost/ (reference-bandwidth)
  default-information/ (originate: always, metric, metric-type, route-map)
  distance/ (global, ospfv3: external, inter-area, intra-area)
  graceful-restart/ (helper: enable, planned-only, supported-grace-time, lsa-check-disable)
  interface/<IFACE>/ (area, bfd, cost, dead-interval, hello-interval, ifmtu,
                      instance-id, mtu-ignore, network, passive, priority,
                      retransmit-interval, transmit-delay)
  log-adjacency-changes (detail)
  parameters/ (router-id)
  redistribute/<PROTOCOL>/ (route-map)
  timers/throttle/spf/ (delay, initial-holdtime, max-holdtime)
"""

from typing import List


class VrfOspfv3Mapper:
    """Mapper for VRF OSPFv3 paths. Common between VyOS 1.4 and 1.5."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "ospfv3"]

    # ========================================================================
    # OSPFv3 Root
    # ========================================================================

    def get_ospfv3(self, name: str) -> List[str]:
        return self._base(name)

    # ========================================================================
    # Area Paths
    # ========================================================================

    def get_ospfv3_area(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area]

    # --- Area Range ---

    def get_ospfv3_area_range(self, name: str, area: str, prefix: str) -> List[str]:
        return self._base(name) + ["area", area, "range", prefix]

    def get_ospfv3_area_range_advertise(self, name: str, area: str, prefix: str) -> List[str]:
        return self._base(name) + ["area", area, "range", prefix, "advertise"]

    def get_ospfv3_area_range_not_advertise(self, name: str, area: str, prefix: str) -> List[str]:
        return self._base(name) + ["area", area, "range", prefix, "not-advertise"]

    def get_ospfv3_area_range_cost(self, name: str, area: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "range", prefix, "cost", value]

    # --- Area Export/Import Lists ---

    def get_ospfv3_area_export_list(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "export-list", value]

    def get_ospfv3_area_import_list(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "import-list", value]

    # --- Area Type: Stub ---

    def get_ospfv3_area_area_type_stub(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "stub"]

    def get_ospfv3_area_area_type_stub_default_cost(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "stub", "default-cost", value]

    def get_ospfv3_area_area_type_stub_no_summary(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "stub", "no-summary"]

    # --- Area Type: NSSA ---

    def get_ospfv3_area_area_type_nssa(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa"]

    def get_ospfv3_area_area_type_nssa_default_cost(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "default-cost", value]

    def get_ospfv3_area_area_type_nssa_no_summary(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "no-summary"]

    def get_ospfv3_area_area_type_nssa_default_information_originate(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "default-information-originate"]

    # ========================================================================
    # Auto-Cost
    # ========================================================================

    def get_ospfv3_auto_cost_reference_bandwidth(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["auto-cost", "reference-bandwidth", value]

    # ========================================================================
    # Default Information Originate
    # ========================================================================

    def get_ospfv3_default_information_originate(self, name: str) -> List[str]:
        return self._base(name) + ["default-information", "originate"]

    def get_ospfv3_default_information_originate_always(self, name: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "always"]

    def get_ospfv3_default_information_originate_metric(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "metric", value]

    def get_ospfv3_default_information_originate_metric_type(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "metric-type", value]

    def get_ospfv3_default_information_originate_route_map(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "route-map", value]

    # ========================================================================
    # Distance
    # ========================================================================

    def get_ospfv3_distance_global(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "global", value]

    def get_ospfv3_distance_ospfv3_external(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospfv3", "external", value]

    def get_ospfv3_distance_ospfv3_inter_area(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospfv3", "inter-area", value]

    def get_ospfv3_distance_ospfv3_intra_area(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospfv3", "intra-area", value]

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def get_ospfv3_graceful_restart(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart"]

    def get_ospfv3_graceful_restart_grace_period(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "grace-period", value]

    def get_ospfv3_graceful_restart_helper_enable(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "enable"]

    def get_ospfv3_graceful_restart_helper_enable_router_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "enable", "router-id", value]

    def get_ospfv3_graceful_restart_helper_planned_only(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "planned-only"]

    def get_ospfv3_graceful_restart_helper_supported_grace_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "supported-grace-time", value]

    def get_ospfv3_graceful_restart_helper_lsa_check_disable(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "lsa-check-disable"]

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_ospfv3_interface(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface]

    def get_ospfv3_interface_area(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "area", value]

    def get_ospfv3_interface_bfd(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd"]

    def get_ospfv3_interface_bfd_profile(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd", "profile", value]

    def get_ospfv3_interface_cost(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "cost", value]

    def get_ospfv3_interface_dead_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "dead-interval", value]

    def get_ospfv3_interface_hello_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-interval", value]

    def get_ospfv3_interface_ifmtu(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ifmtu", value]

    def get_ospfv3_interface_instance_id(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "instance-id", value]

    def get_ospfv3_interface_mtu_ignore(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "mtu-ignore"]

    def get_ospfv3_interface_network(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "network", value]

    def get_ospfv3_interface_passive(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "passive"]

    def get_ospfv3_interface_priority(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "priority", value]

    def get_ospfv3_interface_retransmit_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "retransmit-interval", value]

    def get_ospfv3_interface_transmit_delay(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "transmit-delay", value]

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def get_ospfv3_log_adjacency_changes(self, name: str) -> List[str]:
        return self._base(name) + ["log-adjacency-changes"]

    def get_ospfv3_log_adjacency_changes_detail(self, name: str) -> List[str]:
        return self._base(name) + ["log-adjacency-changes", "detail"]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_ospfv3_parameters_router_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "router-id", value]

    # ========================================================================
    # Redistribute
    # ========================================================================

    def get_ospfv3_redistribute(self, name: str, protocol: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol]

    def get_ospfv3_redistribute_route_map(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "route-map", value]

    def get_ospfv3_redistribute_metric(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "metric", value]

    def get_ospfv3_redistribute_metric_type(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "metric-type", value]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_ospfv3_timers_throttle_spf_delay(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "delay", value]

    def get_ospfv3_timers_throttle_spf_initial_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "initial-holdtime", value]

    def get_ospfv3_timers_throttle_spf_max_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "max-holdtime", value]
