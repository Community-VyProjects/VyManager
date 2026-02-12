"""
VRF BGP Builder Mixin

Provides batch operations for BGP (Border Gateway Protocol) configuration
within VRF instances. Mixed into VrfBatchBuilder to extend it with BGP operations.

All methods use self.mappers["vrf_bgp"] for path generation and self.add_set/self.add_delete
for operation building. The 'name' parameter is always the VRF instance name.
Multi-part parameters are comma-separated in the 'value' string.
"""


class VrfBgpMixin:
    """Mixin for VRF BGP builder operations."""

    # ========================================================================
    # BGP Root
    # ========================================================================

    def set_vrf_bgp(self, name: str) -> "VrfBgpMixin":
        """Enable BGP for a VRF."""
        path = self.mappers["vrf_bgp"].get_bgp(name)
        return self.add_set(path)

    def delete_vrf_bgp(self, name: str) -> "VrfBgpMixin":
        """Delete all BGP configuration for a VRF."""
        path = self.mappers["vrf_bgp"].get_bgp(name)
        return self.add_delete(path)

    # ========================================================================
    # System AS
    # ========================================================================

    def set_vrf_bgp_system_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Set BGP system AS number. Value is the ASN."""
        path = self.mappers["vrf_bgp"].get_bgp_system_as(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_system_as(self, name: str) -> "VrfBgpMixin":
        """Delete BGP system AS number."""
        path = self.mappers["vrf_bgp"].get_bgp_system_as_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Timers
    # ========================================================================

    def set_vrf_bgp_timers_keepalive(self, name: str, value: str) -> "VrfBgpMixin":
        """Set BGP keepalive timer. Value is seconds."""
        path = self.mappers["vrf_bgp"].get_bgp_timers_keepalive(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_timers_keepalive(self, name: str) -> "VrfBgpMixin":
        """Delete BGP keepalive timer."""
        path = self.mappers["vrf_bgp"].get_bgp_timers_keepalive_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_timers_holdtime(self, name: str, value: str) -> "VrfBgpMixin":
        """Set BGP holdtime timer. Value is seconds."""
        path = self.mappers["vrf_bgp"].get_bgp_timers_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_timers_holdtime(self, name: str) -> "VrfBgpMixin":
        """Delete BGP holdtime timer."""
        path = self.mappers["vrf_bgp"].get_bgp_timers_holdtime_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Value settings
    # ========================================================================

    def set_vrf_bgp_parameters_router_id(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_router_id(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_router_id(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_router_id_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_cluster_id(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_cluster_id(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_cluster_id(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_cluster_id_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_default_local_pref(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_default_local_pref(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_default_local_pref(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_default_local_pref_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_default_no_ipv4_unicast(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_default_no_ipv4_unicast(name)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_default_no_ipv4_unicast(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_default_no_ipv4_unicast(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_minimum_holdtime(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_minimum_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_minimum_holdtime(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_minimum_holdtime_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Boolean flags
    # ========================================================================

    def set_vrf_bgp_parameters_log_change(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_log_change(name)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_log_change(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_log_change(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_multipath(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_multipath(name)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_multipath(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_multipath(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_deterministic_med(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "deterministic-med")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_deterministic_med(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "deterministic-med")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_disable_ebgp_connected_route_check(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "disable-ebgp-connected-route-check")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_disable_ebgp_connected_route_check(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "disable-ebgp-connected-route-check")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_ebgp_requires_policy(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "ebgp-requires-policy")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_ebgp_requires_policy(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "ebgp-requires-policy")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_fast_convergence(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "fast-convergence")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_fast_convergence(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "fast-convergence")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_graceful_shutdown(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "graceful-shutdown")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_graceful_shutdown(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "graceful-shutdown")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_network_import_check(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "network-import-check")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_network_import_check(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "network-import-check")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_no_client_to_client_reflection(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-client-to-client-reflection")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_no_client_to_client_reflection(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-client-to-client-reflection")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_no_fast_external_failover(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-fast-external-failover")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_no_fast_external_failover(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-fast-external-failover")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_reject_as_sets(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "reject-as-sets")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_reject_as_sets(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "reject-as-sets")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_route_reflector_allow_outbound_policy(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "route-reflector-allow-outbound-policy")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_route_reflector_allow_outbound_policy(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "route-reflector-allow-outbound-policy")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_shutdown(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "shutdown")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_shutdown(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "shutdown")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_suppress_fib_pending(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "suppress-fib-pending")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_suppress_fib_pending(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "suppress-fib-pending")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_allow_martian_nexthop(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "allow-martian-nexthop")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_allow_martian_nexthop(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "allow-martian-nexthop")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_no_hard_administrative_reset(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-hard-administrative-reset")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_no_hard_administrative_reset(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-hard-administrative-reset")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_no_suppress_duplicates(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-suppress-duplicates")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_no_suppress_duplicates(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_flag(name, "no-suppress-duplicates")
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Bestpath
    # ========================================================================

    def set_vrf_bgp_parameters_bestpath_as_path_confed(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "confed")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_as_path_confed(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "confed")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_as_path_ignore(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "ignore")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_as_path_ignore(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "ignore")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_as_path_multipath_relax(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "multipath-relax")
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_as_path_multipath_relax(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_as_path(name, "multipath-relax")
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_bandwidth(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_bandwidth(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_bandwidth(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_bandwidth_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_compare_routerid(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_compare_routerid(name)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_compare_routerid(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_compare_routerid(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_med(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the med option: 'confed' or 'missing-as-worst'."""
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_med(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_med(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the med option: 'confed' or 'missing-as-worst'."""
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_med(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_bestpath_peer_type_multipath_relax(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_peer_type_multipath_relax(name)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_bestpath_peer_type_multipath_relax(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_bestpath_peer_type_multipath_relax(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Confederation
    # ========================================================================

    def set_vrf_bgp_parameters_confederation_identifier(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_confederation_identifier(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_confederation_identifier(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_confederation_identifier_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_confederation_peers(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_confederation_peers(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_confederation_peers(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_confederation_peers_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Dampening
    # ========================================================================

    def set_vrf_bgp_parameters_dampening_half_life(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_dampening_half_life(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_dampening_re_use(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_dampening_re_use(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_dampening_start_suppress_time(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_dampening_start_suppress_time(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_dampening_max_suppress_time(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_dampening_max_suppress_time(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_dampening(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_dampening_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Distance
    # ========================================================================

    def set_vrf_bgp_parameters_distance_global_external(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_global_external(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_distance_global_internal(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_global_internal(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_distance_global_local(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_global_local(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_distance_global(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_global_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_parameters_distance_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'prefix,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_prefix(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_parameters_distance_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_bgp"].get_bgp_parameters_distance_prefix_delete(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Graceful restart
    # ========================================================================

    def set_vrf_bgp_parameters_graceful_restart_stalepath_time(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_graceful_restart_stalepath_time(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_graceful_restart(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_graceful_restart_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - TCP keepalive
    # ========================================================================

    def set_vrf_bgp_parameters_tcp_keepalive_idle(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_tcp_keepalive_idle(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_tcp_keepalive_interval(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_tcp_keepalive_interval(name, value)
        return self.add_set(path)

    def set_vrf_bgp_parameters_tcp_keepalive_probes(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_tcp_keepalive_probes(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_tcp_keepalive(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_tcp_keepalive_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters - Conditional advertisement
    # ========================================================================

    def set_vrf_bgp_parameters_conditional_advertisement_timer(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_conditional_advertisement_timer(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_parameters_conditional_advertisement_timer(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_parameters_conditional_advertisement_timer_delete(name)
        return self.add_delete(path)

    # ========================================================================
    # Neighbor Operations
    # ========================================================================

    def set_vrf_bgp_neighbor(self, name: str, value: str) -> "VrfBgpMixin":
        """Create a neighbor. Value is the neighbor address or interface."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor(self, name: str, value: str) -> "VrfBgpMixin":
        """Delete a neighbor. Value is the neighbor address or interface."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_remote_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_remote_as_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_description(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_description(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_description(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_description_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,peer-group-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_peer_group(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_peer_group_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_update_source(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,source'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_update_source(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_update_source(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_update_source_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_password(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,password'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_password(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_password(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_password_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_port(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,port'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_port(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_port(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_port_delete(name, value)
        return self.add_delete(path)

    # Neighbor boolean flags
    def set_vrf_bgp_neighbor_shutdown(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_shutdown(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_shutdown(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_shutdown(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_passive(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_passive(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_passive(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_passive(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_override_capability(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_override_capability(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_override_capability(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_override_capability(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_strict_capability_match(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_strict_capability_match(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_strict_capability_match(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_strict_capability_match(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_disable_capability_negotiation(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_disable_capability_negotiation(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_disable_capability_negotiation(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_disable_capability_negotiation(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_disable_connected_check(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_disable_connected_check(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_disable_connected_check(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_disable_connected_check(name, value)
        return self.add_delete(path)

    # Neighbor value settings
    def set_vrf_bgp_neighbor_ebgp_multihop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,hops'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_ebgp_multihop(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_ebgp_multihop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_ebgp_multihop_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_advertisement_interval(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_advertisement_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_advertisement_interval(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_advertisement_interval_delete(name, value)
        return self.add_delete(path)

    # Neighbor BFD
    def set_vrf_bgp_neighbor_bfd(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_bfd(name, value)
        return self.add_set(path)

    def set_vrf_bgp_neighbor_bfd_check_control_plane_failure(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_bfd_check_control_plane_failure(name, value)
        return self.add_set(path)

    def set_vrf_bgp_neighbor_bfd_profile(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,profile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_bfd_profile(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_bfd(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_bfd_delete(name, value)
        return self.add_delete(path)

    # Neighbor capability
    def set_vrf_bgp_neighbor_capability_dynamic(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_capability_dynamic(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_capability_dynamic(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_capability_dynamic(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_neighbor_capability_extended_nexthop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_capability_extended_nexthop(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_neighbor_capability_extended_nexthop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_capability_extended_nexthop(name, value)
        return self.add_delete(path)

    # Neighbor graceful-restart
    def set_vrf_bgp_neighbor_graceful_restart(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,mode' where mode is disable/restart-helper."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_graceful_restart(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_graceful_restart(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_graceful_restart_delete(name, value)
        return self.add_delete(path)

    # Neighbor local-as
    def set_vrf_bgp_neighbor_local_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_local_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_local_as_no_prepend_replace_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_local_as_no_prepend_replace_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_local_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_local_as_delete(name, value)
        return self.add_delete(path)

    # Neighbor timers
    def set_vrf_bgp_neighbor_timers_connect(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,seconds'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_timers_connect(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_timers_keepalive(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,seconds'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_timers_keepalive(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_timers_holdtime(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,seconds'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_timers_holdtime(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_timers(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_timers_delete(name, value)
        return self.add_delete(path)

    # Neighbor TTL security
    def set_vrf_bgp_neighbor_ttl_security_hops(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,hops'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_ttl_security_hops(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_ttl_security(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_ttl_security_delete(name, value)
        return self.add_delete(path)

    # Neighbor interface
    def set_vrf_bgp_neighbor_interface_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,remote-as'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_interface_remote_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_interface_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,peer-group'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_interface_peer_group(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_interface_v6only_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,remote-as'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_interface_v6only_remote_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_interface_v6only_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,peer-group'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_interface_v6only_peer_group(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_interface(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_interface_delete(name, value)
        return self.add_delete(path)

    # Neighbor path-attribute
    def set_vrf_bgp_neighbor_path_attribute_discard(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,attribute-number'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_path_attribute_discard(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_path_attribute_treat_as_withdraw(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,attribute-number'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_path_attribute_treat_as_withdraw(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_path_attribute(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the neighbor."""
        path = self.mappers["vrf_bgp"].get_bgp_neighbor_path_attribute_delete(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Neighbor Address-Family Operations
    # Value format for AF methods: 'neighbor,afi' or 'neighbor,afi,extra_value'
    # ========================================================================

    def set_vrf_bgp_neighbor_af(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_route_map_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,route-map-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_map_export(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_af_route_map_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,route-map-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_map_import(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_map_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_prefix_list_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,prefix-list-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_prefix_list_export(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_af_prefix_list_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,prefix-list-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_prefix_list_import(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_prefix_list(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_prefix_list_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_filter_list_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,filter-list-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_filter_list_export(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_af_filter_list_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,filter-list-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_filter_list_import(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_filter_list(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_filter_list_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_soft_reconfiguration_inbound(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_soft_reconfiguration_inbound(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_soft_reconfiguration_inbound(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_soft_reconfiguration_inbound(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_route_reflector_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_reflector_client(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_route_reflector_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_reflector_client(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_route_server_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_server_client(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_route_server_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_route_server_client(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_nexthop_self(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_nexthop_self(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_af_nexthop_self_force(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_nexthop_self_force(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_nexthop_self(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_nexthop_self(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_allowas_in_number(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,number'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_allowas_in_number(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_allowas_in(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_allowas_in_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_as_override(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_as_override(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_as_override(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_as_override(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_default_originate(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_default_originate(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_neighbor_af_default_originate_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,route-map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_default_originate_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_default_originate(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_default_originate_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_maximum_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,max'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_maximum_prefix(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_maximum_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_maximum_prefix_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_remove_private_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_remove_private_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_remove_private_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_remove_private_as_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_weight(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,weight'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_weight(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_weight(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_weight_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_neighbor_af_unsuppress_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi,map-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_unsuppress_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_neighbor_af_unsuppress_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'neighbor,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_neighbor_af_unsuppress_map_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # ========================================================================
    # Peer-Group Operations
    # ========================================================================

    def set_vrf_bgp_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Create a peer group. Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Delete a peer group. Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_remote_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_remote_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_remote_as_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_description(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_description(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_description(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_description_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_update_source(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,source'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_update_source(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_update_source(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_update_source_delete(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_password(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,password'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_password(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_password(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_password_delete(name, value)
        return self.add_delete(path)

    # Peer-group boolean flags
    def set_vrf_bgp_peer_group_shutdown(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_shutdown(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_shutdown(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_shutdown(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_passive(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_passive(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_passive(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_passive(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_disable_connected_check(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_disable_connected_check(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_disable_connected_check(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_disable_connected_check(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_ebgp_multihop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,hops'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_ebgp_multihop(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_ebgp_multihop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_ebgp_multihop_delete(name, value)
        return self.add_delete(path)

    # Peer-group BFD
    def set_vrf_bgp_peer_group_bfd(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_bfd(name, value)
        return self.add_set(path)

    def set_vrf_bgp_peer_group_bfd_profile(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,profile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_bfd_profile(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_peer_group_bfd_check_control_plane_failure(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_bfd_check_control_plane_failure(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_bfd(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_bfd_delete(name, value)
        return self.add_delete(path)

    # Peer-group capability
    def set_vrf_bgp_peer_group_capability_dynamic(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_capability_dynamic(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_capability_dynamic(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_capability_dynamic(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_peer_group_capability_extended_nexthop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_capability_extended_nexthop(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_peer_group_capability_extended_nexthop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_capability_extended_nexthop(name, value)
        return self.add_delete(path)

    # Peer-group graceful-restart
    def set_vrf_bgp_peer_group_graceful_restart(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,mode'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_graceful_restart(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_graceful_restart(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_graceful_restart_delete(name, value)
        return self.add_delete(path)

    # Peer-group local-as
    def set_vrf_bgp_peer_group_local_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_local_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_peer_group_local_as_no_prepend_replace_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,asn'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_local_as_no_prepend_replace_as(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_local_as(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_local_as_delete(name, value)
        return self.add_delete(path)

    # Peer-group TTL security
    def set_vrf_bgp_peer_group_ttl_security_hops(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,hops'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_ttl_security_hops(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_ttl_security(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the peer-group name."""
        path = self.mappers["vrf_bgp"].get_bgp_peer_group_ttl_security_delete(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Peer-Group Address-Family Operations
    # Value format: 'peer-group,afi' or 'peer-group,afi,extra_value'
    # ========================================================================

    def set_vrf_bgp_peer_group_af(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_peer_group_af_route_map_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi,route-map-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_route_map_export(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_peer_group_af_route_map_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi,route-map-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_route_map_import(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_route_map_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_peer_group_af_soft_reconfiguration_inbound(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_soft_reconfiguration_inbound(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af_soft_reconfiguration_inbound(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_soft_reconfiguration_inbound(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_peer_group_af_nexthop_self(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_nexthop_self(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af_nexthop_self(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_nexthop_self(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_peer_group_af_route_reflector_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_route_reflector_client(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af_route_reflector_client(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_route_reflector_client(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_bgp_peer_group_af_maximum_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi,max'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_maximum_prefix(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_peer_group_af_maximum_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'peer-group,afi'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_peer_group_af_maximum_prefix_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # ========================================================================
    # Global Address-Family Operations
    # ========================================================================

    # Network
    def set_vrf_bgp_af_network(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_network(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_network_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix,route-map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_network_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_network_backdoor(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_network_backdoor(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_network(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_network_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # Aggregate address
    def set_vrf_bgp_af_aggregate_address(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_aggregate_address(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_aggregate_address_as_set(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_aggregate_address_as_set(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_aggregate_address_summary_only(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_aggregate_address_summary_only(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_aggregate_address_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix,route-map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_aggregate_address_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_aggregate_address(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_aggregate_address_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # Maximum paths
    def set_vrf_bgp_af_maximum_paths_ebgp(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,paths'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_maximum_paths_ebgp(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_maximum_paths_ibgp(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,paths'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_maximum_paths_ibgp(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_maximum_paths(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_maximum_paths_delete(name, value)
        return self.add_delete(path)

    # Redistribute
    def set_vrf_bgp_af_redistribute(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_redistribute_metric(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,protocol,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_metric(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_redistribute_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,protocol,route-map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_redistribute_table(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,table'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_table(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_redistribute_table_metric(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,table,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_table_metric(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_redistribute_table_route_map(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,table,route-map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_table_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_redistribute(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_redistribute_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # Distance
    def set_vrf_bgp_af_distance_external(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_distance_external(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_distance_internal(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_distance_internal(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_distance_local(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_distance_local(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_distance_prefix(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,prefix,distance'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_af_distance_prefix(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_distance(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_distance_delete(name, value)
        return self.add_delete(path)

    # VPN export/import
    def set_vrf_bgp_af_export_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_export_vpn(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_af_export_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_export_vpn(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_af_import_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_import_vpn(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_af_import_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_import_vpn(name, value)
        return self.add_delete(path)

    def set_vrf_bgp_af_import_vrf(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,vrf-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_import_vrf(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_import_delete(name, value)
        return self.add_delete(path)

    # Label VPN
    def set_vrf_bgp_af_label_vpn_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,label-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_label_vpn_export(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_label_vpn_allocation_mode_per_nexthop(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_label_vpn_allocation_mode_per_nexthop(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_af_label_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_label_vpn_delete(name, value)
        return self.add_delete(path)

    # RD/Route-target VPN
    def set_vrf_bgp_af_rd_vpn_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,rd-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_rd_vpn_export(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_route_target_vpn_both(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,rt-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_target_vpn_both(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_route_target_vpn_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,rt-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_target_vpn_export(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_route_target_vpn_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,rt-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_target_vpn_import(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_af_route_target_vpn(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the afi."""
        path = self.mappers["vrf_bgp"].get_bgp_af_route_target_vpn_delete(name, value)
        return self.add_delete(path)

    # Route-map VPN/VRF
    def set_vrf_bgp_af_route_map_vpn_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,route-map-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_map_vpn_export(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_route_map_vpn_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,route-map-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_map_vpn_import(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_af_route_map_vrf_import(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,route-map-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_route_map_vrf_import(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    # SID VPN (per address-family)
    def set_vrf_bgp_af_sid_vpn_export(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'afi,sid-value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_af_sid_vpn_export(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    # ========================================================================
    # Listen (Dynamic Neighbors)
    # ========================================================================

    def set_vrf_bgp_listen_limit(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_listen_limit(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_listen_limit(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_listen_limit_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_listen_range(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_bgp"].get_bgp_listen_range(name, value)
        return self.add_set(path)

    def set_vrf_bgp_listen_range_peer_group(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'prefix,peer-group'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_listen_range_peer_group(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_listen_range(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_bgp"].get_bgp_listen_range_delete(name, value)
        return self.add_delete(path)

    # ========================================================================
    # BMP (BGP Monitoring Protocol)
    # ========================================================================

    def set_vrf_bgp_bmp_mirror_buffer_limit(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_bmp_mirror_buffer_limit(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_bmp_mirror_buffer_limit(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_bmp_mirror_buffer_limit_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_bmp_target(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the BMP target name."""
        path = self.mappers["vrf_bgp"].get_bgp_bmp_target(name, value)
        return self.add_set(path)

    def set_vrf_bgp_bmp_target_address(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'target,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_bmp_target_address(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_bmp_target_port(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'target,port'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_bmp_target_port(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_bmp_target_min_retry(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'target,seconds'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_bmp_target_min_retry(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_bmp_target_max_retry(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'target,seconds'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_bgp"].get_bgp_bmp_target_max_retry(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_vrf_bgp_bmp_target_mirror(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the BMP target name."""
        path = self.mappers["vrf_bgp"].get_bgp_bmp_target_mirror(name, value)
        return self.add_set(path)

    def set_vrf_bgp_bmp_target_monitor(self, name: str, value: str) -> "VrfBgpMixin":
        """Value format: 'target,afi,policy'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_bgp"].get_bgp_bmp_target_monitor(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_bgp_bmp_target(self, name: str, value: str) -> "VrfBgpMixin":
        """Value is the BMP target name."""
        path = self.mappers["vrf_bgp"].get_bgp_bmp_target_delete(name, value)
        return self.add_delete(path)

    # ========================================================================
    # SID / SRv6
    # ========================================================================

    def set_vrf_bgp_sid_vpn_per_vrf_export(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_sid_vpn_per_vrf_export(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_sid_vpn_per_vrf_export(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_sid_vpn_per_vrf_export_delete(name)
        return self.add_delete(path)

    def set_vrf_bgp_srv6_locator(self, name: str, value: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_srv6_locator(name, value)
        return self.add_set(path)

    def delete_vrf_bgp_srv6_locator(self, name: str) -> "VrfBgpMixin":
        path = self.mappers["vrf_bgp"].get_bgp_srv6_locator_delete(name)
        return self.add_delete(path)
