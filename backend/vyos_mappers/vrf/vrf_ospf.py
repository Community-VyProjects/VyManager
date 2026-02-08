"""
VRF OSPF Command Mapper

Handles command path generation for OSPF configuration within VRF instances.

Config tree: vrf name <NAME> protocols ospf
  area/<AREA> (area-type: normal/nssa/stub, range, virtual-link, shortcut)
  auto-cost (reference-bandwidth)
  default-information (originate: always, metric, metric-type, route-map)
  default-metric
  distance (global, ospf: external/inter-area/intra-area)
  graceful-restart (helper: enable/planned-only/supported-grace-time/lsa-check-disable)
  interface (area, authentication, bandwidth, bfd, cost, dead-interval, hello-interval,
             hello-multiplier, ldp-sync, mtu-ignore, network, passive, priority,
             retransmit-interval, transmit-delay)
  ldp-sync
  log-adjacency-changes (detail)
  max-metric (router-lsa: administrative, on-shutdown, on-startup)
  mpls-te (enable, router-address)
  neighbor (priority, poll-interval)
  parameters (abr-type, opaque-lsa, rfc1583-compatibility, router-id)
  passive-interface (default)
  redistribute (babel, bgp, connected, isis, kernel, rip, static, table)
  refresh (timers)
  segment-routing (global-block, local-block, maximum-label-depth, prefix)
  timers (throttle/spf: delay, initial-holdtime, max-holdtime)
"""

from typing import List


class VrfOspfMapper:
    """Mapper for VRF OSPF paths. Common between VyOS 1.4 and 1.5."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "ospf"]

    # ========================================================================
    # OSPF Root
    # ========================================================================

    def get_ospf(self, name: str) -> List[str]:
        return self._base(name)

    # ========================================================================
    # Area
    # ========================================================================

    def get_ospf_area(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area]

    def get_ospf_area_type(self, name: str, area: str, area_type: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", area_type]

    def get_ospf_area_type_nssa_default_cost(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "default-cost", value]

    def get_ospf_area_type_nssa_no_summary(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "no-summary"]

    def get_ospf_area_type_nssa_translate(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "nssa", "translate", value]

    def get_ospf_area_type_stub_default_cost(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "stub", "default-cost", value]

    def get_ospf_area_type_stub_no_summary(self, name: str, area: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", "stub", "no-summary"]

    # --- Area Authentication ---

    def get_ospf_area_authentication(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "authentication", value]

    # --- Area Range ---

    def get_ospf_area_range(self, name: str, area: str, network: str) -> List[str]:
        return self._base(name) + ["area", area, "range", network]

    def get_ospf_area_range_cost(self, name: str, area: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "range", network, "cost", value]

    def get_ospf_area_range_not_advertise(self, name: str, area: str, network: str) -> List[str]:
        return self._base(name) + ["area", area, "range", network, "not-advertise"]

    def get_ospf_area_range_substitute(self, name: str, area: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "range", network, "substitute", value]

    # --- Area Shortcut ---

    def get_ospf_area_shortcut(self, name: str, area: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "shortcut", value]

    # --- Area Virtual-Link ---

    def get_ospf_area_virtual_link(self, name: str, area: str, address: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address]

    def get_ospf_area_virtual_link_authentication(self, name: str, area: str, address: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication"]

    def get_ospf_area_virtual_link_authentication_md5_key_id(self, name: str, area: str, address: str, key_id: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id]

    def get_ospf_area_virtual_link_authentication_md5_key_id_md5_key(self, name: str, area: str, address: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id, "md5-key", value]

    def get_ospf_area_virtual_link_authentication_plaintext_password(self, name: str, area: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "plaintext-password", value]

    def get_ospf_area_virtual_link_dead_interval(self, name: str, area: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "dead-interval", value]

    def get_ospf_area_virtual_link_hello_interval(self, name: str, area: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "hello-interval", value]

    def get_ospf_area_virtual_link_retransmit_interval(self, name: str, area: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "retransmit-interval", value]

    def get_ospf_area_virtual_link_transmit_delay(self, name: str, area: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "transmit-delay", value]

    # ========================================================================
    # Auto-Cost
    # ========================================================================

    def get_ospf_auto_cost_reference_bandwidth(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["auto-cost", "reference-bandwidth", value]

    # ========================================================================
    # Default Information
    # ========================================================================

    def get_ospf_default_information_originate(self, name: str) -> List[str]:
        return self._base(name) + ["default-information", "originate"]

    def get_ospf_default_information_originate_always(self, name: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "always"]

    def get_ospf_default_information_originate_metric(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "metric", value]

    def get_ospf_default_information_originate_metric_type(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "metric-type", value]

    def get_ospf_default_information_originate_route_map(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", "route-map", value]

    # ========================================================================
    # Default Metric
    # ========================================================================

    def get_ospf_default_metric(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["default-metric", value]

    # ========================================================================
    # Distance
    # ========================================================================

    def get_ospf_distance_global(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "global", value]

    def get_ospf_distance_ospf_external(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospf", "external", value]

    def get_ospf_distance_ospf_inter_area(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospf", "inter-area", value]

    def get_ospf_distance_ospf_intra_area(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["distance", "ospf", "intra-area", value]

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def get_ospf_graceful_restart(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart"]

    def get_ospf_graceful_restart_helper_enable(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "enable"]

    def get_ospf_graceful_restart_helper_planned_only(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "planned-only"]

    def get_ospf_graceful_restart_helper_supported_grace_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "supported-grace-time", value]

    def get_ospf_graceful_restart_helper_lsa_check_disable(self, name: str) -> List[str]:
        return self._base(name) + ["graceful-restart", "helper", "lsa-check-disable"]

    # ========================================================================
    # Interface
    # ========================================================================

    def get_ospf_interface(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface]

    def get_ospf_interface_area(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "area", value]

    def get_ospf_interface_authentication_md5_key_id(self, name: str, iface: str, key_id: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication", "md5", "key-id", key_id]

    def get_ospf_interface_authentication_md5_key_id_md5_key(self, name: str, iface: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication", "md5", "key-id", key_id, "md5-key", value]

    def get_ospf_interface_authentication_plaintext_password(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication", "plaintext-password", value]

    def get_ospf_interface_bandwidth(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bandwidth", value]

    def get_ospf_interface_bfd(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd"]

    def get_ospf_interface_bfd_profile(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd", "profile", value]

    def get_ospf_interface_cost(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "cost", value]

    def get_ospf_interface_dead_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "dead-interval", value]

    def get_ospf_interface_hello_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-interval", value]

    def get_ospf_interface_hello_multiplier(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-multiplier", value]

    def get_ospf_interface_ldp_sync_disable(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ldp-sync", "disable"]

    def get_ospf_interface_ldp_sync_holddown(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ldp-sync", "holddown", value]

    def get_ospf_interface_mtu_ignore(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "mtu-ignore"]

    def get_ospf_interface_network(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "network", value]

    def get_ospf_interface_passive(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "passive"]

    def get_ospf_interface_passive_disable(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "passive", "disable"]

    def get_ospf_interface_priority(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "priority", value]

    def get_ospf_interface_retransmit_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "retransmit-interval", value]

    def get_ospf_interface_transmit_delay(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "transmit-delay", value]

    # ========================================================================
    # LDP Sync (Global)
    # ========================================================================

    def get_ospf_ldp_sync(self, name: str) -> List[str]:
        return self._base(name) + ["ldp-sync"]

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def get_ospf_log_adjacency_changes(self, name: str) -> List[str]:
        return self._base(name) + ["log-adjacency-changes"]

    def get_ospf_log_adjacency_changes_detail(self, name: str) -> List[str]:
        return self._base(name) + ["log-adjacency-changes", "detail"]

    # ========================================================================
    # Max Metric
    # ========================================================================

    def get_ospf_max_metric_router_lsa_administrative(self, name: str) -> List[str]:
        return self._base(name) + ["max-metric", "router-lsa", "administrative"]

    def get_ospf_max_metric_router_lsa_on_shutdown(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["max-metric", "router-lsa", "on-shutdown", value]

    def get_ospf_max_metric_router_lsa_on_startup(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["max-metric", "router-lsa", "on-startup", value]

    # ========================================================================
    # MPLS-TE
    # ========================================================================

    def get_ospf_mpls_te_enable(self, name: str) -> List[str]:
        return self._base(name) + ["mpls-te", "enable"]

    def get_ospf_mpls_te_router_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["mpls-te", "router-address", value]

    # ========================================================================
    # Neighbor
    # ========================================================================

    def get_ospf_neighbor(self, name: str, address: str) -> List[str]:
        return self._base(name) + ["neighbor", address]

    def get_ospf_neighbor_priority(self, name: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["neighbor", address, "priority", value]

    def get_ospf_neighbor_poll_interval(self, name: str, address: str, value: str) -> List[str]:
        return self._base(name) + ["neighbor", address, "poll-interval", value]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_ospf_parameters_abr_type(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "abr-type", value]

    def get_ospf_parameters_opaque_lsa(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "opaque-lsa"]

    def get_ospf_parameters_rfc1583_compatibility(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "rfc1583-compatibility"]

    def get_ospf_parameters_router_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "router-id", value]

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def get_ospf_passive_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["passive-interface", value]

    def get_ospf_passive_interface_default(self, name: str) -> List[str]:
        return self._base(name) + ["passive-interface", "default"]

    # ========================================================================
    # Redistribute
    # ========================================================================

    def get_ospf_redistribute(self, name: str, protocol: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol]

    def get_ospf_redistribute_metric(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "metric", value]

    def get_ospf_redistribute_metric_type(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "metric-type", value]

    def get_ospf_redistribute_route_map(self, name: str, protocol: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", protocol, "route-map", value]

    def get_ospf_redistribute_table(self, name: str, table: str) -> List[str]:
        return self._base(name) + ["redistribute", "table", table]

    def get_ospf_redistribute_table_metric(self, name: str, table: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", "table", table, "metric", value]

    def get_ospf_redistribute_table_metric_type(self, name: str, table: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", "table", table, "metric-type", value]

    def get_ospf_redistribute_table_route_map(self, name: str, table: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", "table", table, "route-map", value]

    # ========================================================================
    # Refresh Timers
    # ========================================================================

    def get_ospf_refresh_timers(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["refresh", "timers", value]

    # ========================================================================
    # Segment Routing
    # ========================================================================

    def get_ospf_segment_routing_global_block(self, name: str, low: str, high: str) -> List[str]:
        return self._base(name) + ["segment-routing", "global-block", "low-label-value", low, "high-label-value", high]

    def get_ospf_segment_routing_local_block(self, name: str, low: str, high: str) -> List[str]:
        return self._base(name) + ["segment-routing", "local-block", "low-label-value", low, "high-label-value", high]

    def get_ospf_segment_routing_maximum_label_depth(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "maximum-label-depth", value]

    def get_ospf_segment_routing_prefix(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix]

    def get_ospf_segment_routing_prefix_index_value(self, name: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "value", value]

    def get_ospf_segment_routing_prefix_index_explicit_null(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "explicit-null"]

    def get_ospf_segment_routing_prefix_index_no_php_flag(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "no-php-flag"]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_ospf_timers_throttle_spf_delay(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "delay", value]

    def get_ospf_timers_throttle_spf_initial_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "initial-holdtime", value]

    def get_ospf_timers_throttle_spf_max_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "throttle", "spf", "max-holdtime", value]
