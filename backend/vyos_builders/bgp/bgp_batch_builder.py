"""
BGP Protocol Batch Builder

Provides all batch operations for BGP (Border Gateway Protocol) configuration.
Covers: system-as, parameters, timers, neighbors, peer-groups, address-families,
listen ranges, BMP, SID, SRv6, and interface MPLS settings.

Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BgpBatchBuilder:
    """Complete batch builder for BGP protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "bgp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BgpBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BgpBatchBuilder":
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
    # System AS
    # ========================================================================

    def set_system_as(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_system_as(value))

    def delete_system_as(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_system_as_delete())

    # ========================================================================
    # Timers
    # ========================================================================

    def set_timers_keepalive(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_timers_keepalive(value))

    def delete_timers_keepalive(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_timers_keepalive_delete())

    def set_timers_holdtime(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_timers_holdtime(value))

    def delete_timers_holdtime(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_timers_holdtime_delete())

    # ========================================================================
    # Parameters - Value settings
    # ========================================================================

    def set_parameters_router_id(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_router_id(value))

    def delete_parameters_router_id(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_router_id_delete())

    def set_parameters_cluster_id(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_cluster_id(value))

    def delete_parameters_cluster_id(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_cluster_id_delete())

    def set_parameters_default_local_pref(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_default_local_pref(value))

    def delete_parameters_default_local_pref(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_default_local_pref_delete())

    def set_parameters_minimum_holdtime(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_minimum_holdtime(value))

    def delete_parameters_minimum_holdtime(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_minimum_holdtime_delete())

    def set_parameters_labeled_unicast(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_labeled_unicast(value))

    def delete_parameters_labeled_unicast(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_labeled_unicast_delete())

    # ========================================================================
    # Parameters - Boolean flags
    # ========================================================================

    def set_parameters_log_neighbor_changes(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("log-neighbor-changes"))

    def delete_parameters_log_neighbor_changes(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("log-neighbor-changes"))

    def set_parameters_always_compare_med(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("always-compare-med"))

    def delete_parameters_always_compare_med(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("always-compare-med"))

    def set_parameters_deterministic_med(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("deterministic-med"))

    def delete_parameters_deterministic_med(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("deterministic-med"))

    def set_parameters_ebgp_requires_policy(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("ebgp-requires-policy"))

    def delete_parameters_ebgp_requires_policy(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("ebgp-requires-policy"))

    def set_parameters_graceful_shutdown(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("graceful-shutdown"))

    def delete_parameters_graceful_shutdown(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("graceful-shutdown"))

    def set_parameters_no_client_to_client_reflection(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("no-client-to-client-reflection"))

    def delete_parameters_no_client_to_client_reflection(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("no-client-to-client-reflection"))

    def set_parameters_no_fast_external_failover(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("no-fast-external-failover"))

    def delete_parameters_no_fast_external_failover(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("no-fast-external-failover"))

    def set_parameters_allow_martian_nexthop(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("allow-martian-nexthop"))

    def delete_parameters_allow_martian_nexthop(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("allow-martian-nexthop"))

    def set_parameters_disable_ebgp_connected_route_check(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("disable-ebgp-connected-route-check"))

    def delete_parameters_disable_ebgp_connected_route_check(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("disable-ebgp-connected-route-check"))

    def set_parameters_fast_convergence(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("fast-convergence"))

    def delete_parameters_fast_convergence(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("fast-convergence"))

    def set_parameters_network_import_check(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("network-import-check"))

    def delete_parameters_network_import_check(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("network-import-check"))

    def set_parameters_reject_as_sets(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("reject-as-sets"))

    def delete_parameters_reject_as_sets(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("reject-as-sets"))

    def set_parameters_route_reflector_allow_outbound_policy(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("route-reflector-allow-outbound-policy"))

    def delete_parameters_route_reflector_allow_outbound_policy(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("route-reflector-allow-outbound-policy"))

    def set_parameters_suppress_fib_pending(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("suppress-fib-pending"))

    def delete_parameters_suppress_fib_pending(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("suppress-fib-pending"))

    def set_parameters_shutdown(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("shutdown"))

    def delete_parameters_shutdown(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("shutdown"))

    def set_parameters_no_hard_administrative_reset(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("no-hard-administrative-reset"))

    def delete_parameters_no_hard_administrative_reset(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("no-hard-administrative-reset"))

    def set_parameters_no_suppress_duplicates(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_flag("no-suppress-duplicates"))

    def delete_parameters_no_suppress_duplicates(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_flag("no-suppress-duplicates"))

    # ========================================================================
    # Parameters - Bestpath
    # ========================================================================

    def set_parameters_bestpath_as_path_confed(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_as_path("confed"))

    def delete_parameters_bestpath_as_path_confed(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_as_path("confed"))

    def set_parameters_bestpath_as_path_ignore(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_as_path("ignore"))

    def delete_parameters_bestpath_as_path_ignore(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_as_path("ignore"))

    def set_parameters_bestpath_as_path_multipath_relax(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_as_path("multipath-relax"))

    def delete_parameters_bestpath_as_path_multipath_relax(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_as_path("multipath-relax"))

    def set_parameters_bestpath_bandwidth(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_bandwidth(value))

    def delete_parameters_bestpath_bandwidth(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_bandwidth_delete())

    def set_parameters_bestpath_compare_routerid(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_compare_routerid())

    def delete_parameters_bestpath_compare_routerid(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_compare_routerid())

    def set_parameters_bestpath_med(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_med(value))

    def delete_parameters_bestpath_med(self, value: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_med(value))

    def set_parameters_bestpath_peer_type_multipath_relax(self) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_bestpath_peer_type_multipath_relax())

    def delete_parameters_bestpath_peer_type_multipath_relax(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_bestpath_peer_type_multipath_relax())

    # ========================================================================
    # Parameters - Confederation
    # ========================================================================

    def set_parameters_confederation_identifier(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_confederation_identifier(value))

    def delete_parameters_confederation_identifier(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_confederation_identifier_delete())

    def set_parameters_confederation_peers(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_confederation_peers(value))

    def delete_parameters_confederation_peers(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_confederation_peers_delete())

    # ========================================================================
    # Parameters - Dampening
    # ========================================================================

    def set_parameters_dampening_half_life(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_dampening_half_life(value))

    def set_parameters_dampening_re_use(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_dampening_re_use(value))

    def set_parameters_dampening_start_suppress_time(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_dampening_start_suppress_time(value))

    def set_parameters_dampening_max_suppress_time(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_dampening_max_suppress_time(value))

    def delete_parameters_dampening(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_dampening_delete())

    # ========================================================================
    # Parameters - Distance
    # ========================================================================

    def set_parameters_distance_global_external(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_distance_global_external(value))

    def set_parameters_distance_global_internal(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_distance_global_internal(value))

    def set_parameters_distance_global_local(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_distance_global_local(value))

    def delete_parameters_distance_global(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_distance_global_delete())

    def set_parameters_distance_prefix(self, prefix: str, distance: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_distance_prefix(prefix, distance))

    def delete_parameters_distance_prefix(self, prefix: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_distance_prefix_delete(prefix))

    # ========================================================================
    # Parameters - Graceful restart
    # ========================================================================

    def set_parameters_graceful_restart_stalepath_time(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_graceful_restart_stalepath_time(value))

    def delete_parameters_graceful_restart(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_graceful_restart_delete())

    # ========================================================================
    # Parameters - Conditional advertisement timer
    # ========================================================================

    def set_parameters_conditional_advertisement_timer(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_conditional_advertisement_timer(value))

    def delete_parameters_conditional_advertisement_timer(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_conditional_advertisement_timer_delete())

    # ========================================================================
    # Parameters - TCP keepalive
    # ========================================================================

    def set_parameters_tcp_keepalive_idle(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_tcp_keepalive_idle(value))

    def set_parameters_tcp_keepalive_interval(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_tcp_keepalive_interval(value))

    def set_parameters_tcp_keepalive_probes(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_parameters_tcp_keepalive_probes(value))

    def delete_parameters_tcp_keepalive(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_parameters_tcp_keepalive_delete())

    # ========================================================================
    # Neighbor Operations
    # ========================================================================

    def set_neighbor(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor(neighbor))

    def delete_neighbor(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor(neighbor))

    def set_neighbor_remote_as(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_remote_as(neighbor, value))

    def delete_neighbor_remote_as(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_remote_as_delete(neighbor))

    def set_neighbor_description(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_description(neighbor, value))

    def delete_neighbor_description(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_description_delete(neighbor))

    def set_neighbor_peer_group(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_peer_group(neighbor, value))

    def delete_neighbor_peer_group(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_peer_group_delete(neighbor))

    def set_neighbor_update_source(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_update_source(neighbor, value))

    def delete_neighbor_update_source(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_update_source_delete(neighbor))

    def set_neighbor_password(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_password(neighbor, value))

    def delete_neighbor_password(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_password_delete(neighbor))

    def set_neighbor_port(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_port(neighbor, value))

    def delete_neighbor_port(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_port_delete(neighbor))

    # Neighbor boolean flags
    def set_neighbor_shutdown(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_shutdown(neighbor))

    def delete_neighbor_shutdown(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_shutdown(neighbor))

    def set_neighbor_passive(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_passive(neighbor))

    def delete_neighbor_passive(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_passive(neighbor))

    def set_neighbor_solo(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_solo(neighbor))

    def delete_neighbor_solo(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_solo(neighbor))

    def set_neighbor_enforce_first_as(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_enforce_first_as(neighbor))

    def delete_neighbor_enforce_first_as(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_enforce_first_as(neighbor))

    def set_neighbor_override_capability(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_override_capability(neighbor))

    def delete_neighbor_override_capability(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_override_capability(neighbor))

    def set_neighbor_strict_capability_match(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_strict_capability_match(neighbor))

    def delete_neighbor_strict_capability_match(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_strict_capability_match(neighbor))

    def set_neighbor_disable_capability_negotiation(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_disable_capability_negotiation(neighbor))

    def delete_neighbor_disable_capability_negotiation(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_disable_capability_negotiation(neighbor))

    def set_neighbor_disable_connected_check(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_disable_connected_check(neighbor))

    def delete_neighbor_disable_connected_check(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_disable_connected_check(neighbor))

    # Neighbor value settings
    def set_neighbor_ebgp_multihop(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_ebgp_multihop(neighbor, value))

    def delete_neighbor_ebgp_multihop(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_ebgp_multihop_delete(neighbor))

    def set_neighbor_advertisement_interval(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_advertisement_interval(neighbor, value))

    def delete_neighbor_advertisement_interval(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_advertisement_interval_delete(neighbor))

    # Neighbor BFD
    def set_neighbor_bfd(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_bfd(neighbor))

    def set_neighbor_bfd_check_control_plane_failure(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_bfd_check_control_plane_failure(neighbor))

    def set_neighbor_bfd_profile(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_bfd_profile(neighbor, value))

    def delete_neighbor_bfd(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_bfd_delete(neighbor))

    # Neighbor capability
    def set_neighbor_capability_dynamic(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_capability_dynamic(neighbor))

    def delete_neighbor_capability_dynamic(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_capability_dynamic(neighbor))

    def set_neighbor_capability_extended_nexthop(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_capability_extended_nexthop(neighbor))

    def delete_neighbor_capability_extended_nexthop(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_capability_extended_nexthop(neighbor))

    def set_neighbor_capability_software_version(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_capability_software_version(neighbor))

    def delete_neighbor_capability_software_version(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_capability_software_version(neighbor))

    # Neighbor graceful-restart
    def set_neighbor_graceful_restart(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_graceful_restart(neighbor, value))

    def delete_neighbor_graceful_restart(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_graceful_restart_delete(neighbor))

    # Neighbor local-as
    def set_neighbor_local_as(self, neighbor: str, asn: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_local_as(neighbor, asn))

    def set_neighbor_local_as_no_prepend_replace_as(self, neighbor: str, asn: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_local_as_no_prepend_replace_as(neighbor, asn))

    def delete_neighbor_local_as(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_local_as_delete(neighbor))

    # Neighbor local-role
    def set_neighbor_local_role(self, neighbor: str, role: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_local_role(neighbor, role))

    def set_neighbor_local_role_strict(self, neighbor: str, role: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_local_role_strict(neighbor, role))

    def delete_neighbor_local_role(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_local_role_delete(neighbor))

    # Neighbor timers
    def set_neighbor_timers_connect(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_timers_connect(neighbor, value))

    def set_neighbor_timers_keepalive(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_timers_keepalive(neighbor, value))

    def set_neighbor_timers_holdtime(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_timers_holdtime(neighbor, value))

    def delete_neighbor_timers(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_timers_delete(neighbor))

    # Neighbor TTL security
    def set_neighbor_ttl_security_hops(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_ttl_security_hops(neighbor, value))

    def delete_neighbor_ttl_security(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_ttl_security_delete(neighbor))

    # Neighbor interface
    def set_neighbor_interface_remote_as(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_interface_remote_as(neighbor, value))

    def set_neighbor_interface_peer_group(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_interface_peer_group(neighbor, value))

    def set_neighbor_interface_v6only_remote_as(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_interface_v6only_remote_as(neighbor, value))

    def set_neighbor_interface_v6only_peer_group(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_interface_v6only_peer_group(neighbor, value))

    def delete_neighbor_interface(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_interface_delete(neighbor))

    # Neighbor path-attribute
    def set_neighbor_path_attribute_discard(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_path_attribute_discard(neighbor, value))

    def set_neighbor_path_attribute_treat_as_withdraw(self, neighbor: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_path_attribute_treat_as_withdraw(neighbor, value))

    def delete_neighbor_path_attribute(self, neighbor: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_path_attribute_delete(neighbor))

    # ========================================================================
    # Neighbor Address-Family Operations
    # Uses format: neighbor,afi for the first value and additional value after
    # ========================================================================

    def set_neighbor_af(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af(neighbor, afi))

    def delete_neighbor_af(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af(neighbor, afi))

    def set_neighbor_af_route_map_export(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_route_map_export(neighbor, afi, value))

    def set_neighbor_af_route_map_import(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_route_map_import(neighbor, afi, value))

    def delete_neighbor_af_route_map(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_route_map_delete(neighbor, afi))

    def set_neighbor_af_prefix_list_export(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_prefix_list_export(neighbor, afi, value))

    def set_neighbor_af_prefix_list_import(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_prefix_list_import(neighbor, afi, value))

    def delete_neighbor_af_prefix_list(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_prefix_list_delete(neighbor, afi))

    def set_neighbor_af_filter_list_export(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_filter_list_export(neighbor, afi, value))

    def set_neighbor_af_filter_list_import(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_filter_list_import(neighbor, afi, value))

    def delete_neighbor_af_filter_list(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_filter_list_delete(neighbor, afi))

    def set_neighbor_af_distribute_list_export(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_distribute_list_export(neighbor, afi, value))

    def set_neighbor_af_distribute_list_import(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_distribute_list_import(neighbor, afi, value))

    def delete_neighbor_af_distribute_list(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_distribute_list_delete(neighbor, afi))

    def set_neighbor_af_soft_reconfiguration_inbound(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_soft_reconfiguration_inbound(neighbor, afi))

    def delete_neighbor_af_soft_reconfiguration_inbound(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_soft_reconfiguration_inbound(neighbor, afi))

    def set_neighbor_af_route_reflector_client(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_route_reflector_client(neighbor, afi))

    def delete_neighbor_af_route_reflector_client(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_route_reflector_client(neighbor, afi))

    def set_neighbor_af_route_server_client(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_route_server_client(neighbor, afi))

    def delete_neighbor_af_route_server_client(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_route_server_client(neighbor, afi))

    def set_neighbor_af_nexthop_self(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_nexthop_self(neighbor, afi))

    def set_neighbor_af_nexthop_self_force(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_nexthop_self_force(neighbor, afi))

    def delete_neighbor_af_nexthop_self(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_nexthop_self(neighbor, afi))

    def set_neighbor_af_addpath_tx_all(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_addpath_tx_all(neighbor, afi))

    def delete_neighbor_af_addpath_tx_all(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_addpath_tx_all(neighbor, afi))

    def set_neighbor_af_addpath_tx_per_as(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_addpath_tx_per_as(neighbor, afi))

    def delete_neighbor_af_addpath_tx_per_as(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_addpath_tx_per_as(neighbor, afi))

    def set_neighbor_af_allowas_in_number(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_allowas_in_number(neighbor, afi, value))

    def delete_neighbor_af_allowas_in(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_allowas_in_delete(neighbor, afi))

    def set_neighbor_af_as_override(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_as_override(neighbor, afi))

    def delete_neighbor_af_as_override(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_as_override(neighbor, afi))

    def set_neighbor_af_attribute_unchanged_as_path(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_attribute_unchanged_as_path(neighbor, afi))

    def set_neighbor_af_attribute_unchanged_med(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_attribute_unchanged_med(neighbor, afi))

    def set_neighbor_af_attribute_unchanged_next_hop(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_attribute_unchanged_next_hop(neighbor, afi))

    def delete_neighbor_af_attribute_unchanged(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_attribute_unchanged_delete(neighbor, afi))

    def set_neighbor_af_default_originate(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_default_originate(neighbor, afi))

    def set_neighbor_af_default_originate_route_map(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_default_originate_route_map(neighbor, afi, value))

    def delete_neighbor_af_default_originate(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_default_originate_delete(neighbor, afi))

    def set_neighbor_af_maximum_prefix(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_maximum_prefix(neighbor, afi, value))

    def delete_neighbor_af_maximum_prefix(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_maximum_prefix_delete(neighbor, afi))

    def set_neighbor_af_maximum_prefix_out(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_maximum_prefix_out(neighbor, afi, value))

    def delete_neighbor_af_maximum_prefix_out(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_maximum_prefix_out_delete(neighbor, afi))

    def set_neighbor_af_remove_private_as(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_remove_private_as(neighbor, afi))

    def set_neighbor_af_remove_private_as_all(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_remove_private_as_all(neighbor, afi))

    def delete_neighbor_af_remove_private_as(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_remove_private_as_delete(neighbor, afi))

    def set_neighbor_af_disable_send_community_extended(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_disable_send_community_extended(neighbor, afi))

    def set_neighbor_af_disable_send_community_standard(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_disable_send_community_standard(neighbor, afi))

    def delete_neighbor_af_disable_send_community(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_disable_send_community_delete(neighbor, afi))

    def set_neighbor_af_weight(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_weight(neighbor, afi, value))

    def delete_neighbor_af_weight(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_weight_delete(neighbor, afi))

    def set_neighbor_af_unsuppress_map(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_unsuppress_map(neighbor, afi, value))

    def delete_neighbor_af_unsuppress_map(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_unsuppress_map_delete(neighbor, afi))

    def set_neighbor_af_conditionally_advertise_advertise_map(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_conditionally_advertise_advertise_map(neighbor, afi, value))

    def set_neighbor_af_conditionally_advertise_exist_map(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_conditionally_advertise_exist_map(neighbor, afi, value))

    def set_neighbor_af_conditionally_advertise_non_exist_map(self, neighbor: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_conditionally_advertise_non_exist_map(neighbor, afi, value))

    def delete_neighbor_af_conditionally_advertise(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_conditionally_advertise_delete(neighbor, afi))

    def set_neighbor_af_nexthop_local_unchanged(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_nexthop_local_unchanged(neighbor, afi))

    def delete_neighbor_af_nexthop_local_unchanged(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_nexthop_local_unchanged(neighbor, afi))

    def set_neighbor_af_capability_orf_prefix_list_receive(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_capability_orf_prefix_list_receive(neighbor, afi))

    def set_neighbor_af_capability_orf_prefix_list_send(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_neighbor_af_capability_orf_prefix_list_send(neighbor, afi))

    def delete_neighbor_af_capability_orf(self, neighbor: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_neighbor_af_capability_orf_delete(neighbor, afi))

    # ========================================================================
    # Peer-Group Operations
    # ========================================================================

    def set_peer_group(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group(name))

    def delete_peer_group(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group(name))

    def set_peer_group_remote_as(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_remote_as(name, value))

    def delete_peer_group_remote_as(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_remote_as_delete(name))

    def set_peer_group_description(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_description(name, value))

    def delete_peer_group_description(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_description_delete(name))

    def set_peer_group_update_source(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_update_source(name, value))

    def delete_peer_group_update_source(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_update_source_delete(name))

    def set_peer_group_password(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_password(name, value))

    def delete_peer_group_password(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_password_delete(name))

    def set_peer_group_shutdown(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_shutdown(name))

    def delete_peer_group_shutdown(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_shutdown(name))

    def set_peer_group_passive(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_passive(name))

    def delete_peer_group_passive(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_passive(name))

    def set_peer_group_override_capability(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_override_capability(name))

    def delete_peer_group_override_capability(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_override_capability(name))

    def set_peer_group_disable_capability_negotiation(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_disable_capability_negotiation(name))

    def delete_peer_group_disable_capability_negotiation(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_disable_capability_negotiation(name))

    def set_peer_group_disable_connected_check(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_disable_connected_check(name))

    def delete_peer_group_disable_connected_check(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_disable_connected_check(name))

    def set_peer_group_ebgp_multihop(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_ebgp_multihop(name, value))

    def delete_peer_group_ebgp_multihop(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_ebgp_multihop_delete(name))

    def set_peer_group_bfd(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_bfd(name))

    def set_peer_group_bfd_profile(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_bfd_profile(name, value))

    def set_peer_group_bfd_check_control_plane_failure(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_bfd_check_control_plane_failure(name))

    def delete_peer_group_bfd(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_bfd_delete(name))

    def set_peer_group_capability_dynamic(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_capability_dynamic(name))

    def delete_peer_group_capability_dynamic(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_capability_dynamic(name))

    def set_peer_group_capability_extended_nexthop(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_capability_extended_nexthop(name))

    def delete_peer_group_capability_extended_nexthop(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_capability_extended_nexthop(name))

    def set_peer_group_capability_software_version(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_capability_software_version(name))

    def delete_peer_group_capability_software_version(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_capability_software_version(name))

    def set_peer_group_graceful_restart(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_graceful_restart(name, value))

    def delete_peer_group_graceful_restart(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_graceful_restart_delete(name))

    def set_peer_group_local_as(self, name: str, asn: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_local_as(name, asn))

    def set_peer_group_local_as_no_prepend_replace_as(self, name: str, asn: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_local_as_no_prepend_replace_as(name, asn))

    def delete_peer_group_local_as(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_local_as_delete(name))

    def set_peer_group_local_role(self, name: str, role: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_local_role(name, role))

    def set_peer_group_local_role_strict(self, name: str, role: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_local_role_strict(name, role))

    def delete_peer_group_local_role(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_local_role_delete(name))

    def set_peer_group_ttl_security_hops(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_ttl_security_hops(name, value))

    def delete_peer_group_ttl_security(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_ttl_security_delete(name))

    # ========================================================================
    # Peer-Group Address-Family Operations
    # ========================================================================

    def set_peer_group_af(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af(name, afi))

    def delete_peer_group_af(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af(name, afi))

    def set_peer_group_af_route_map_export(self, name: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_route_map_export(name, afi, value))

    def set_peer_group_af_route_map_import(self, name: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_route_map_import(name, afi, value))

    def delete_peer_group_af_route_map(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af_route_map_delete(name, afi))

    def set_peer_group_af_soft_reconfiguration_inbound(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_soft_reconfiguration_inbound(name, afi))

    def delete_peer_group_af_soft_reconfiguration_inbound(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af_soft_reconfiguration_inbound(name, afi))

    def set_peer_group_af_route_reflector_client(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_route_reflector_client(name, afi))

    def delete_peer_group_af_route_reflector_client(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af_route_reflector_client(name, afi))

    def set_peer_group_af_nexthop_self(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_nexthop_self(name, afi))

    def set_peer_group_af_nexthop_self_force(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_nexthop_self_force(name, afi))

    def delete_peer_group_af_nexthop_self(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af_nexthop_self(name, afi))

    def set_peer_group_af_maximum_prefix(self, name: str, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_peer_group_af_maximum_prefix(name, afi, value))

    def delete_peer_group_af_maximum_prefix(self, name: str, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_peer_group_af_maximum_prefix_delete(name, afi))

    # ========================================================================
    # Global Address-Family Operations
    # ========================================================================

    # Network
    def set_af_network(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_network(afi, prefix))

    def set_af_network_route_map(self, afi: str, prefix: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_network_route_map(afi, prefix, value))

    def set_af_network_backdoor(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_network_backdoor(afi, prefix))

    def set_af_network_label(self, afi: str, prefix: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_network_label(afi, prefix, value))

    def set_af_network_rd(self, afi: str, prefix: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_network_rd(afi, prefix, value))

    def delete_af_network(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_network_delete(afi, prefix))

    # Aggregate address
    def set_af_aggregate_address(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_aggregate_address(afi, prefix))

    def set_af_aggregate_address_as_set(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_aggregate_address_as_set(afi, prefix))

    def set_af_aggregate_address_summary_only(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_aggregate_address_summary_only(afi, prefix))

    def set_af_aggregate_address_route_map(self, afi: str, prefix: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_aggregate_address_route_map(afi, prefix, value))

    def delete_af_aggregate_address(self, afi: str, prefix: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_aggregate_address_delete(afi, prefix))

    # Maximum paths
    def set_af_maximum_paths_ebgp(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_maximum_paths_ebgp(afi, value))

    def set_af_maximum_paths_ibgp(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_maximum_paths_ibgp(afi, value))

    def delete_af_maximum_paths(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_maximum_paths_delete(afi))

    # Redistribute
    def set_af_redistribute(self, afi: str, protocol: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute(afi, protocol))

    def set_af_redistribute_metric(self, afi: str, protocol: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute_metric(afi, protocol, value))

    def set_af_redistribute_route_map(self, afi: str, protocol: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute_route_map(afi, protocol, value))

    def set_af_redistribute_table(self, afi: str, table: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute_table(afi, table))

    def set_af_redistribute_table_metric(self, afi: str, table: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute_table_metric(afi, table, value))

    def set_af_redistribute_table_route_map(self, afi: str, table: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_redistribute_table_route_map(afi, table, value))

    def delete_af_redistribute(self, afi: str, protocol: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_redistribute_delete(afi, protocol))

    # VPN operations
    def set_af_export_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_export_vpn(afi))

    def delete_af_export_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_export_vpn(afi))

    def set_af_import_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_import_vpn(afi))

    def delete_af_import_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_import_vpn(afi))

    def set_af_import_vrf(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_import_vrf(afi, value))

    def delete_af_import(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_import_delete(afi))

    def set_af_label_vpn_export(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_label_vpn_export(afi, value))

    def set_af_label_vpn_allocation_mode_per_nexthop(self, afi: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_label_vpn_allocation_mode_per_nexthop(afi))

    def delete_af_label_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_label_vpn_delete(afi))

    def set_af_rd_vpn_export(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_rd_vpn_export(afi, value))

    def set_af_route_target_vpn_both(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_target_vpn_both(afi, value))

    def set_af_route_target_vpn_export(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_target_vpn_export(afi, value))

    def set_af_route_target_vpn_import(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_target_vpn_import(afi, value))

    def delete_af_route_target_vpn(self, afi: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_af_route_target_vpn_delete(afi))

    def set_af_route_map_vpn_export(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_map_vpn_export(afi, value))

    def set_af_route_map_vpn_import(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_map_vpn_import(afi, value))

    def set_af_route_map_vrf_import(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_route_map_vrf_import(afi, value))

    def set_af_sid_vpn_export(self, afi: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_af_sid_vpn_export(afi, value))

    # ========================================================================
    # Listen (Dynamic Neighbors)
    # ========================================================================

    def set_listen_limit(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_listen_limit(value))

    def delete_listen_limit(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_listen_limit_delete())

    def set_listen_range(self, prefix: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_listen_range(prefix))

    def set_listen_range_peer_group(self, prefix: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_listen_range_peer_group(prefix, value))

    def delete_listen_range(self, prefix: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_listen_range_delete(prefix))

    # ========================================================================
    # BMP
    # ========================================================================

    def set_bmp_mirror_buffer_limit(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_mirror_buffer_limit(value))

    def delete_bmp_mirror_buffer_limit(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_bmp_mirror_buffer_limit_delete())

    def set_bmp_target(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target(name))

    def set_bmp_target_address(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_address(name, value))

    def set_bmp_target_port(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_port(name, value))

    def set_bmp_target_min_retry(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_min_retry(name, value))

    def set_bmp_target_max_retry(self, name: str, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_max_retry(name, value))

    def set_bmp_target_mirror(self, name: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_mirror(name))

    def set_bmp_target_monitor(self, name: str, afi: str, policy: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_bmp_target_monitor(name, afi, policy))

    def delete_bmp_target(self, name: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_bmp_target_delete(name))

    # ========================================================================
    # SID / SRv6
    # ========================================================================

    def set_sid_vpn_per_vrf_export(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_sid_vpn_per_vrf_export(value))

    def delete_sid_vpn_per_vrf_export(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_sid_vpn_per_vrf_export_delete())

    def set_srv6_locator(self, value: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_srv6_locator(value))

    def delete_srv6_locator(self) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_srv6_locator_delete())

    # ========================================================================
    # Interface MPLS
    # ========================================================================

    def set_interface_mpls_forwarding(self, interface: str) -> "BgpBatchBuilder":
        return self.add_set(self.m.get_interface_mpls_forwarding(interface))

    def delete_interface(self, interface: str) -> "BgpBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(interface))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "neighbors": {
                    "supported": True,
                    "description": "BGP neighbor configuration",
                },
                "peer_groups": {
                    "supported": True,
                    "description": "BGP peer group templates",
                },
                "address_families": {
                    "supported": True,
                    "description": "Address family configuration (IPv4/IPv6 unicast, multicast, VPN, flowspec, L2VPN EVPN)",
                },
                "listen_ranges": {
                    "supported": True,
                    "description": "Dynamic neighbor listen ranges",
                },
                "bmp": {
                    "supported": True,
                    "description": "BGP Monitoring Protocol",
                },
                "bmp_local_rib": {
                    "supported": is_1_5,
                    "description": "BMP local-rib monitoring (VyOS 1.5+)",
                },
                "srv6": {
                    "supported": True,
                    "description": "Segment Routing v6",
                },
                "local_role": {
                    "supported": True,
                    "description": "RFC 9234 BGP role (customer/peer/provider)",
                },
                "path_attribute": {
                    "supported": True,
                    "description": "Path attribute filtering (discard/treat-as-withdraw)",
                },
                "redistribute_nhrp": {
                    "supported": is_1_5,
                    "description": "Redistribute NHRP routes (VyOS 1.5+)",
                },
            },
            "address_family_types": {
                "neighbor": [
                    "ipv4-unicast", "ipv6-unicast",
                    "ipv4-multicast", "ipv6-multicast",
                    "ipv4-labeled-unicast", "ipv6-labeled-unicast",
                    "ipv4-vpn", "ipv6-vpn",
                    "ipv4-flowspec", "ipv6-flowspec",
                    "l2vpn-evpn",
                ],
                "peer_group": [
                    "ipv4-unicast", "ipv6-unicast",
                    "ipv4-labeled-unicast", "ipv6-labeled-unicast",
                    "ipv4-vpn", "ipv6-vpn",
                    "l2vpn-evpn",
                ],
                "global": [
                    "ipv4-unicast", "ipv6-unicast",
                    "ipv4-multicast", "ipv6-multicast",
                    "ipv4-labeled-unicast", "ipv6-labeled-unicast",
                    "ipv4-vpn", "ipv6-vpn",
                    "ipv4-flowspec", "ipv6-flowspec",
                    "l2vpn-evpn",
                ],
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
