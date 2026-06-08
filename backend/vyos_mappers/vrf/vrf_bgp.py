"""
VRF BGP Command Mapper

Handles command path generation for BGP (Border Gateway Protocol) configuration
within VRF instances. Covers: system-as, parameters, timers, neighbors, peer-groups,
address-families, listen ranges, BMP, SID, SRv6.

Config tree: vrf name <NAME> protocols bgp

Version-specific methods (nhrp redistribute, ipv6-unicast table redistribute,
bmp local-rib, peer-group solo) will be in version-specific files.
"""

from typing import List


class VrfBgpMapper:
    """Mapper for VRF BGP paths. Common between VyOS 1.4 and 1.5."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "bgp"]

    def _neighbor(self, name: str, neighbor: str) -> List[str]:
        return self._base(name) + ["neighbor", neighbor]

    def _peer_group(self, name: str, pg: str) -> List[str]:
        return self._base(name) + ["peer-group", pg]

    def _af(self, name: str, afi: str) -> List[str]:
        return self._base(name) + ["address-family", afi]

    def _neighbor_af(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["address-family", afi]

    def _peer_group_af(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group(name, pg) + ["address-family", afi]

    # ========================================================================
    # System AS
    # ========================================================================

    def get_bgp(self, name: str) -> List[str]:
        return self._base(name)

    def get_bgp_system_as(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["system-as", value]

    def get_bgp_system_as_delete(self, name: str) -> List[str]:
        return self._base(name) + ["system-as"]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_bgp_timers_keepalive(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "keepalive", value]

    def get_bgp_timers_keepalive_delete(self, name: str) -> List[str]:
        return self._base(name) + ["timers", "keepalive"]

    def get_bgp_timers_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["timers", "holdtime", value]

    def get_bgp_timers_holdtime_delete(self, name: str) -> List[str]:
        return self._base(name) + ["timers", "holdtime"]

    # ========================================================================
    # Parameters - Value settings
    # ========================================================================

    def get_bgp_parameters_router_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "router-id", value]

    def get_bgp_parameters_router_id_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "router-id"]

    def get_bgp_parameters_cluster_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "cluster-id", value]

    def get_bgp_parameters_cluster_id_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "cluster-id"]

    def get_bgp_parameters_default_local_pref(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "default", "local-pref", value]

    def get_bgp_parameters_default_local_pref_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "default", "local-pref"]

    def get_bgp_parameters_default_no_ipv4_unicast(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "default", "no-ipv4-unicast"]

    def get_bgp_parameters_minimum_holdtime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "minimum-holdtime", value]

    def get_bgp_parameters_minimum_holdtime_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "minimum-holdtime"]

    def get_bgp_parameters_log_change(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "log-change"]

    def get_bgp_parameters_multipath(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "multipath"]

    # Boolean parameter flags
    def get_bgp_parameters_flag(self, name: str, flag: str) -> List[str]:
        return self._base(name) + ["parameters", flag]

    # ========================================================================
    # Parameters - Bestpath
    # ========================================================================

    def get_bgp_parameters_bestpath_as_path(self, name: str, option: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "as-path", option]

    def get_bgp_parameters_bestpath_bandwidth(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "bandwidth", value]

    def get_bgp_parameters_bestpath_bandwidth_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "bandwidth"]

    def get_bgp_parameters_bestpath_compare_routerid(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "compare-routerid"]

    def get_bgp_parameters_bestpath_med(self, name: str, option: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "med", option]

    def get_bgp_parameters_bestpath_peer_type_multipath_relax(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "bestpath", "peer-type", "multipath-relax"]

    # ========================================================================
    # Parameters - Confederation
    # ========================================================================

    def get_bgp_parameters_confederation_identifier(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "confederation", "identifier", value]

    def get_bgp_parameters_confederation_identifier_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "confederation", "identifier"]

    def get_bgp_parameters_confederation_peers(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "confederation", "peers", value]

    def get_bgp_parameters_confederation_peers_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "confederation", "peers"]

    # ========================================================================
    # Parameters - Dampening
    # ========================================================================

    def get_bgp_parameters_dampening_half_life(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "dampening", "half-life", value]

    def get_bgp_parameters_dampening_re_use(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "dampening", "re-use", value]

    def get_bgp_parameters_dampening_start_suppress_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "dampening", "start-suppress-time", value]

    def get_bgp_parameters_dampening_max_suppress_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "dampening", "max-suppress-time", value]

    def get_bgp_parameters_dampening_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "dampening"]

    # ========================================================================
    # Parameters - Distance
    # ========================================================================

    def get_bgp_parameters_distance_global_external(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "global", "external", value]

    def get_bgp_parameters_distance_global_internal(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "global", "internal", value]

    def get_bgp_parameters_distance_global_local(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "global", "local", value]

    def get_bgp_parameters_distance_global_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "global"]

    def get_bgp_parameters_distance_prefix(self, name: str, prefix: str, distance: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "prefix", prefix, "distance", distance]

    def get_bgp_parameters_distance_prefix_delete(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["parameters", "distance", "prefix", prefix]

    # ========================================================================
    # Parameters - Graceful restart
    # ========================================================================

    def get_bgp_parameters_graceful_restart_stalepath_time(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "graceful-restart", "stalepath-time", value]

    def get_bgp_parameters_graceful_restart_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "graceful-restart"]

    # ========================================================================
    # Parameters - TCP keepalive
    # ========================================================================

    def get_bgp_parameters_tcp_keepalive_idle(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "tcp-keepalive", "idle", value]

    def get_bgp_parameters_tcp_keepalive_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "tcp-keepalive", "interval", value]

    def get_bgp_parameters_tcp_keepalive_probes(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "tcp-keepalive", "probes", value]

    def get_bgp_parameters_tcp_keepalive_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "tcp-keepalive"]

    # ========================================================================
    # Parameters - Conditional advertisement
    # ========================================================================

    def get_bgp_parameters_conditional_advertisement_timer(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "conditional-advertisement", "timer", value]

    def get_bgp_parameters_conditional_advertisement_timer_delete(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "conditional-advertisement", "timer"]

    # ========================================================================
    # Neighbor paths
    # ========================================================================

    def get_bgp_neighbor(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor)

    def get_bgp_neighbor_remote_as(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["remote-as", value]

    def get_bgp_neighbor_remote_as_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["remote-as"]

    def get_bgp_neighbor_description(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["description", value]

    def get_bgp_neighbor_description_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["description"]

    def get_bgp_neighbor_peer_group(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["peer-group", value]

    def get_bgp_neighbor_peer_group_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["peer-group"]

    def get_bgp_neighbor_update_source(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["update-source", value]

    def get_bgp_neighbor_update_source_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["update-source"]

    def get_bgp_neighbor_password(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["password", value]

    def get_bgp_neighbor_password_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["password"]

    def get_bgp_neighbor_port(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["port", value]

    def get_bgp_neighbor_port_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["port"]

    def get_bgp_neighbor_shutdown(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["shutdown"]

    def get_bgp_neighbor_passive(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["passive"]

    def get_bgp_neighbor_override_capability(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["override-capability"]

    def get_bgp_neighbor_strict_capability_match(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["strict-capability-match"]

    def get_bgp_neighbor_disable_capability_negotiation(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["disable-capability-negotiation"]

    def get_bgp_neighbor_disable_connected_check(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["disable-connected-check"]

    def get_bgp_neighbor_ebgp_multihop(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["ebgp-multihop", value]

    def get_bgp_neighbor_ebgp_multihop_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["ebgp-multihop"]

    def get_bgp_neighbor_advertisement_interval(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["advertisement-interval", value]

    def get_bgp_neighbor_advertisement_interval_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["advertisement-interval"]

    # Neighbor BFD
    def get_bgp_neighbor_bfd(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["bfd"]

    def get_bgp_neighbor_bfd_check_control_plane_failure(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["bfd", "check-control-plane-failure"]

    def get_bgp_neighbor_bfd_profile(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["bfd", "profile", value]

    def get_bgp_neighbor_bfd_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["bfd"]

    # Neighbor capability
    def get_bgp_neighbor_capability_dynamic(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["capability", "dynamic"]

    def get_bgp_neighbor_capability_extended_nexthop(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["capability", "extended-nexthop"]

    def get_bgp_neighbor_capability_software_version(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["capability", "software-version"]

    # Neighbor graceful-restart
    def get_bgp_neighbor_graceful_restart(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["graceful-restart", value]

    def get_bgp_neighbor_graceful_restart_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["graceful-restart"]

    # Neighbor local-as
    def get_bgp_neighbor_local_as(self, name: str, neighbor: str, asn: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-as", asn]

    def get_bgp_neighbor_local_as_no_prepend_replace_as(self, name: str, neighbor: str, asn: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-as", asn, "no-prepend", "replace-as"]

    def get_bgp_neighbor_local_as_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-as"]

    # Neighbor local-role
    def get_bgp_neighbor_local_role(self, name: str, neighbor: str, role: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-role", role]

    def get_bgp_neighbor_local_role_strict(self, name: str, neighbor: str, role: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-role", role, "strict"]

    def get_bgp_neighbor_local_role_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["local-role"]

    # Neighbor timers
    def get_bgp_neighbor_timers_connect(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["timers", "connect", value]

    def get_bgp_neighbor_timers_keepalive(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["timers", "keepalive", value]

    def get_bgp_neighbor_timers_holdtime(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["timers", "holdtime", value]

    def get_bgp_neighbor_timers_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["timers"]

    # Neighbor TTL security
    def get_bgp_neighbor_ttl_security_hops(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["ttl-security", "hops", value]

    def get_bgp_neighbor_ttl_security_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["ttl-security"]

    # Neighbor interface
    def get_bgp_neighbor_interface_remote_as(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface", "remote-as", value]

    def get_bgp_neighbor_interface_peer_group(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface", "peer-group", value]

    def get_bgp_neighbor_interface_source_interface(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface", "source-interface"]

    def get_bgp_neighbor_interface_v6only_remote_as(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface", "v6only", "remote-as", value]

    def get_bgp_neighbor_interface_v6only_peer_group(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface", "v6only", "peer-group", value]

    def get_bgp_neighbor_interface_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["interface"]

    # Neighbor path-attribute
    def get_bgp_neighbor_path_attribute_discard(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["path-attribute", "discard", value]

    def get_bgp_neighbor_path_attribute_treat_as_withdraw(self, name: str, neighbor: str, value: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["path-attribute", "treat-as-withdraw", value]

    def get_bgp_neighbor_path_attribute_delete(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["path-attribute"]

    # ========================================================================
    # Neighbor Address-Family paths (generic for any AFI)
    # ========================================================================

    def get_bgp_neighbor_af(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi)

    def get_bgp_neighbor_af_route_map_export(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["route-map", "export", value]

    def get_bgp_neighbor_af_route_map_import(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["route-map", "import", value]

    def get_bgp_neighbor_af_route_map_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["route-map"]

    def get_bgp_neighbor_af_prefix_list_export(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["prefix-list", "export", value]

    def get_bgp_neighbor_af_prefix_list_import(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["prefix-list", "import", value]

    def get_bgp_neighbor_af_prefix_list_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["prefix-list"]

    def get_bgp_neighbor_af_filter_list_export(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["filter-list", "export", value]

    def get_bgp_neighbor_af_filter_list_import(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["filter-list", "import", value]

    def get_bgp_neighbor_af_filter_list_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["filter-list"]

    def get_bgp_neighbor_af_distribute_list_export(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["distribute-list", "export", value]

    def get_bgp_neighbor_af_distribute_list_import(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["distribute-list", "import", value]

    def get_bgp_neighbor_af_distribute_list_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["distribute-list"]

    def get_bgp_neighbor_af_soft_reconfiguration_inbound(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["soft-reconfiguration", "inbound"]

    def get_bgp_neighbor_af_route_reflector_client(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["route-reflector-client"]

    def get_bgp_neighbor_af_route_server_client(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["route-server-client"]

    def get_bgp_neighbor_af_nexthop_self(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["nexthop-self"]

    def get_bgp_neighbor_af_nexthop_self_force(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["nexthop-self", "force"]

    def get_bgp_neighbor_af_addpath_tx_all(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["addpath-tx-all"]

    def get_bgp_neighbor_af_addpath_tx_per_as(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["addpath-tx-per-as"]

    def get_bgp_neighbor_af_allowas_in_number(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["allowas-in", "number", value]

    def get_bgp_neighbor_af_allowas_in_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["allowas-in"]

    def get_bgp_neighbor_af_as_override(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["as-override"]

    def get_bgp_neighbor_af_attribute_unchanged_as_path(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["attribute-unchanged", "as-path"]

    def get_bgp_neighbor_af_attribute_unchanged_med(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["attribute-unchanged", "med"]

    def get_bgp_neighbor_af_attribute_unchanged_next_hop(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["attribute-unchanged", "next-hop"]

    def get_bgp_neighbor_af_attribute_unchanged_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["attribute-unchanged"]

    def get_bgp_neighbor_af_default_originate(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["default-originate"]

    def get_bgp_neighbor_af_default_originate_route_map(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["default-originate", "route-map", value]

    def get_bgp_neighbor_af_default_originate_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["default-originate"]

    def get_bgp_neighbor_af_maximum_prefix(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["maximum-prefix", value]

    def get_bgp_neighbor_af_maximum_prefix_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["maximum-prefix"]

    def get_bgp_neighbor_af_maximum_prefix_out(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["maximum-prefix-out", value]

    def get_bgp_neighbor_af_maximum_prefix_out_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["maximum-prefix-out"]

    def get_bgp_neighbor_af_remove_private_as(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["remove-private-as"]

    def get_bgp_neighbor_af_remove_private_as_all(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["remove-private-as", "all"]

    def get_bgp_neighbor_af_remove_private_as_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["remove-private-as"]

    def get_bgp_neighbor_af_disable_send_community_extended(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["disable-send-community", "extended"]

    def get_bgp_neighbor_af_disable_send_community_standard(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["disable-send-community", "standard"]

    def get_bgp_neighbor_af_disable_send_community_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["disable-send-community"]

    def get_bgp_neighbor_af_weight(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["weight", value]

    def get_bgp_neighbor_af_weight_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["weight"]

    def get_bgp_neighbor_af_unsuppress_map(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["unsuppress-map", value]

    def get_bgp_neighbor_af_unsuppress_map_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["unsuppress-map"]

    def get_bgp_neighbor_af_conditionally_advertise_advertise_map(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["conditionally-advertise", "advertise-map", value]

    def get_bgp_neighbor_af_conditionally_advertise_exist_map(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["conditionally-advertise", "exist-map", value]

    def get_bgp_neighbor_af_conditionally_advertise_non_exist_map(self, name: str, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["conditionally-advertise", "non-exist-map", value]

    def get_bgp_neighbor_af_conditionally_advertise_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["conditionally-advertise"]

    # IPv6-specific: nexthop-local unchanged
    def get_bgp_neighbor_af_nexthop_local_unchanged(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["nexthop-local", "unchanged"]

    # Capability ORF
    def get_bgp_neighbor_af_capability_orf_prefix_list_receive(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["capability", "orf", "prefix-list", "receive"]

    def get_bgp_neighbor_af_capability_orf_prefix_list_send(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["capability", "orf", "prefix-list", "send"]

    def get_bgp_neighbor_af_capability_orf_delete(self, name: str, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(name, neighbor, afi) + ["capability", "orf"]

    # ========================================================================
    # Peer-group paths
    # ========================================================================

    def get_bgp_peer_group(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg)

    def get_bgp_peer_group_remote_as(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["remote-as", value]

    def get_bgp_peer_group_remote_as_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["remote-as"]

    def get_bgp_peer_group_description(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["description", value]

    def get_bgp_peer_group_description_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["description"]

    def get_bgp_peer_group_update_source(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["update-source", value]

    def get_bgp_peer_group_update_source_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["update-source"]

    def get_bgp_peer_group_password(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["password", value]

    def get_bgp_peer_group_password_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["password"]

    def get_bgp_peer_group_port(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["port", value]

    def get_bgp_peer_group_port_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["port"]

    def get_bgp_peer_group_shutdown(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["shutdown"]

    def get_bgp_peer_group_passive(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["passive"]

    def get_bgp_peer_group_override_capability(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["override-capability"]

    def get_bgp_peer_group_disable_capability_negotiation(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["disable-capability-negotiation"]

    def get_bgp_peer_group_disable_connected_check(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["disable-connected-check"]

    def get_bgp_peer_group_ebgp_multihop(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["ebgp-multihop", value]

    def get_bgp_peer_group_ebgp_multihop_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["ebgp-multihop"]

    # Peer-group BFD
    def get_bgp_peer_group_bfd(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["bfd"]

    def get_bgp_peer_group_bfd_check_control_plane_failure(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["bfd", "check-control-plane-failure"]

    def get_bgp_peer_group_bfd_profile(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["bfd", "profile", value]

    def get_bgp_peer_group_bfd_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["bfd"]

    # Peer-group capability
    def get_bgp_peer_group_capability_dynamic(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["capability", "dynamic"]

    def get_bgp_peer_group_capability_extended_nexthop(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["capability", "extended-nexthop"]

    def get_bgp_peer_group_capability_software_version(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["capability", "software-version"]

    # Peer-group graceful-restart
    def get_bgp_peer_group_graceful_restart(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["graceful-restart", value]

    def get_bgp_peer_group_graceful_restart_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["graceful-restart"]

    # Peer-group local-as
    def get_bgp_peer_group_local_as(self, name: str, pg: str, asn: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-as", asn]

    def get_bgp_peer_group_local_as_no_prepend_replace_as(self, name: str, pg: str, asn: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-as", asn, "no-prepend", "replace-as"]

    def get_bgp_peer_group_local_as_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-as"]

    # Peer-group local-role
    def get_bgp_peer_group_local_role(self, name: str, pg: str, role: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-role", role]

    def get_bgp_peer_group_local_role_strict(self, name: str, pg: str, role: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-role", role, "strict"]

    def get_bgp_peer_group_local_role_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["local-role"]

    # Peer-group TTL security
    def get_bgp_peer_group_ttl_security_hops(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["ttl-security", "hops", value]

    def get_bgp_peer_group_ttl_security_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["ttl-security"]

    # Peer-group path-attribute
    def get_bgp_peer_group_path_attribute_discard(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["path-attribute", "discard", value]

    def get_bgp_peer_group_path_attribute_treat_as_withdraw(self, name: str, pg: str, value: str) -> List[str]:
        return self._peer_group(name, pg) + ["path-attribute", "treat-as-withdraw", value]

    def get_bgp_peer_group_path_attribute_delete(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["path-attribute"]

    # ========================================================================
    # Peer-group Address-Family paths
    # ========================================================================

    def get_bgp_peer_group_af(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi)

    def get_bgp_peer_group_af_route_map_export(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["route-map", "export", value]

    def get_bgp_peer_group_af_route_map_import(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["route-map", "import", value]

    def get_bgp_peer_group_af_route_map_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["route-map"]

    def get_bgp_peer_group_af_prefix_list_export(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["prefix-list", "export", value]

    def get_bgp_peer_group_af_prefix_list_import(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["prefix-list", "import", value]

    def get_bgp_peer_group_af_prefix_list_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["prefix-list"]

    def get_bgp_peer_group_af_filter_list_export(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["filter-list", "export", value]

    def get_bgp_peer_group_af_filter_list_import(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["filter-list", "import", value]

    def get_bgp_peer_group_af_filter_list_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["filter-list"]

    def get_bgp_peer_group_af_soft_reconfiguration_inbound(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["soft-reconfiguration", "inbound"]

    def get_bgp_peer_group_af_route_reflector_client(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["route-reflector-client"]

    def get_bgp_peer_group_af_route_server_client(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["route-server-client"]

    def get_bgp_peer_group_af_nexthop_self(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["nexthop-self"]

    def get_bgp_peer_group_af_nexthop_self_force(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["nexthop-self", "force"]

    def get_bgp_peer_group_af_addpath_tx_all(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["addpath-tx-all"]

    def get_bgp_peer_group_af_addpath_tx_per_as(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["addpath-tx-per-as"]

    def get_bgp_peer_group_af_allowas_in_number(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["allowas-in", "number", value]

    def get_bgp_peer_group_af_allowas_in_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["allowas-in"]

    def get_bgp_peer_group_af_as_override(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["as-override"]

    def get_bgp_peer_group_af_attribute_unchanged_as_path(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["attribute-unchanged", "as-path"]

    def get_bgp_peer_group_af_attribute_unchanged_med(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["attribute-unchanged", "med"]

    def get_bgp_peer_group_af_attribute_unchanged_next_hop(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["attribute-unchanged", "next-hop"]

    def get_bgp_peer_group_af_attribute_unchanged_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["attribute-unchanged"]

    def get_bgp_peer_group_af_default_originate(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["default-originate"]

    def get_bgp_peer_group_af_default_originate_route_map(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["default-originate", "route-map", value]

    def get_bgp_peer_group_af_default_originate_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["default-originate"]

    def get_bgp_peer_group_af_maximum_prefix(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["maximum-prefix", value]

    def get_bgp_peer_group_af_maximum_prefix_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["maximum-prefix"]

    def get_bgp_peer_group_af_remove_private_as(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["remove-private-as"]

    def get_bgp_peer_group_af_remove_private_as_all(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["remove-private-as", "all"]

    def get_bgp_peer_group_af_remove_private_as_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["remove-private-as"]

    def get_bgp_peer_group_af_disable_send_community_extended(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["disable-send-community", "extended"]

    def get_bgp_peer_group_af_disable_send_community_standard(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["disable-send-community", "standard"]

    def get_bgp_peer_group_af_disable_send_community_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["disable-send-community"]

    def get_bgp_peer_group_af_weight(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["weight", value]

    def get_bgp_peer_group_af_weight_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["weight"]

    def get_bgp_peer_group_af_unsuppress_map(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["unsuppress-map", value]

    def get_bgp_peer_group_af_unsuppress_map_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["unsuppress-map"]

    # Peer-group AF parity with neighbor AF: distribute-list, maximum-prefix-out,
    # conditionally-advertise, nexthop-local unchanged, capability ORF
    def get_bgp_peer_group_af_distribute_list_export(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["distribute-list", "export", value]

    def get_bgp_peer_group_af_distribute_list_import(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["distribute-list", "import", value]

    def get_bgp_peer_group_af_distribute_list_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["distribute-list"]

    def get_bgp_peer_group_af_maximum_prefix_out(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["maximum-prefix-out", value]

    def get_bgp_peer_group_af_maximum_prefix_out_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["maximum-prefix-out"]

    def get_bgp_peer_group_af_conditionally_advertise_advertise_map(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["conditionally-advertise", "advertise-map", value]

    def get_bgp_peer_group_af_conditionally_advertise_exist_map(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["conditionally-advertise", "exist-map", value]

    def get_bgp_peer_group_af_conditionally_advertise_non_exist_map(self, name: str, pg: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["conditionally-advertise", "non-exist-map", value]

    def get_bgp_peer_group_af_conditionally_advertise_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["conditionally-advertise"]

    def get_bgp_peer_group_af_nexthop_local_unchanged(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["nexthop-local", "unchanged"]

    def get_bgp_peer_group_af_capability_orf_prefix_list_receive(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["capability", "orf", "prefix-list", "receive"]

    def get_bgp_peer_group_af_capability_orf_prefix_list_send(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["capability", "orf", "prefix-list", "send"]

    def get_bgp_peer_group_af_capability_orf_delete(self, name: str, pg: str, afi: str) -> List[str]:
        return self._peer_group_af(name, pg, afi) + ["capability", "orf"]

    # ========================================================================
    # Neighbor flags / Interface mpls (additional coverage)
    # ========================================================================

    def get_bgp_neighbor_enforce_first_as(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["enforce-first-as"]

    def get_bgp_neighbor_solo(self, name: str, neighbor: str) -> List[str]:
        return self._neighbor(name, neighbor) + ["solo"]

    def get_bgp_interface_mpls_forwarding(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "mpls", "forwarding"]

    def get_bgp_peer_group_solo(self, name: str, pg: str) -> List[str]:
        return self._peer_group(name, pg) + ["solo"]

    # ========================================================================
    # Global Address-Family paths
    # ========================================================================

    # Network
    def get_bgp_af_network(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix]

    def get_bgp_af_network_route_map(self, name: str, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix, "route-map", value]

    def get_bgp_af_network_backdoor(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix, "backdoor"]

    def get_bgp_af_network_path_limit(self, name: str, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix, "path-limit", value]

    def get_bgp_af_network_label(self, name: str, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix, "label", value]

    def get_bgp_af_network_rd(self, name: str, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix, "rd", value]

    def get_bgp_af_network_delete(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["network", prefix]

    # Aggregate address
    def get_bgp_af_aggregate_address(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["aggregate-address", prefix]

    def get_bgp_af_aggregate_address_as_set(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["aggregate-address", prefix, "as-set"]

    def get_bgp_af_aggregate_address_summary_only(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["aggregate-address", prefix, "summary-only"]

    def get_bgp_af_aggregate_address_route_map(self, name: str, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(name, afi) + ["aggregate-address", prefix, "route-map", value]

    def get_bgp_af_aggregate_address_delete(self, name: str, afi: str, prefix: str) -> List[str]:
        return self._af(name, afi) + ["aggregate-address", prefix]

    # Maximum paths
    def get_bgp_af_maximum_paths_ebgp(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["maximum-paths", "ebgp", value]

    def get_bgp_af_maximum_paths_ibgp(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["maximum-paths", "ibgp", value]

    def get_bgp_af_maximum_paths_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["maximum-paths"]

    # Redistribute
    def get_bgp_af_redistribute(self, name: str, afi: str, protocol: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", protocol]

    def get_bgp_af_redistribute_metric(self, name: str, afi: str, protocol: str, value: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", protocol, "metric", value]

    def get_bgp_af_redistribute_route_map(self, name: str, afi: str, protocol: str, value: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", protocol, "route-map", value]

    def get_bgp_af_redistribute_table(self, name: str, afi: str, table: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", "table", table]

    def get_bgp_af_redistribute_table_metric(self, name: str, afi: str, table: str, value: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", "table", table, "metric", value]

    def get_bgp_af_redistribute_table_route_map(self, name: str, afi: str, table: str, value: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", "table", table, "route-map", value]

    def get_bgp_af_redistribute_delete(self, name: str, afi: str, protocol: str) -> List[str]:
        return self._af(name, afi) + ["redistribute", protocol]

    # Distance
    def get_bgp_af_distance_external(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["distance", "external", value]

    def get_bgp_af_distance_internal(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["distance", "internal", value]

    def get_bgp_af_distance_local(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["distance", "local", value]

    def get_bgp_af_distance_prefix(self, name: str, afi: str, prefix: str, distance: str) -> List[str]:
        return self._af(name, afi) + ["distance", "prefix", prefix, "distance", distance]

    def get_bgp_af_distance_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["distance"]

    # VPN export/import
    def get_bgp_af_export_vpn(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["export", "vpn"]

    def get_bgp_af_import_vpn(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["import", "vpn"]

    def get_bgp_af_import_vrf(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["import", "vrf", value]

    def get_bgp_af_import_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["import"]

    # Label VPN
    def get_bgp_af_label_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["label", "vpn", "export", value]

    def get_bgp_af_label_vpn_allocation_mode_per_nexthop(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["label", "vpn", "allocation-mode", "per-nexthop"]

    def get_bgp_af_label_vpn_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["label", "vpn"]

    # Nexthop/RD/Route-target VPN
    def get_bgp_af_nexthop_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["nexthop", "vpn", "export", value]

    def get_bgp_af_rd_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["rd", "vpn", "export", value]

    def get_bgp_af_route_target_vpn_both(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-target", "vpn", "both", value]

    def get_bgp_af_route_target_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-target", "vpn", "export", value]

    def get_bgp_af_route_target_vpn_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-target", "vpn", "import", value]

    def get_bgp_af_route_target_vpn_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["route-target", "vpn"]

    # Route-map VPN/VRF
    def get_bgp_af_route_map_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-map", "vpn", "export", value]

    def get_bgp_af_route_map_vpn_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-map", "vpn", "import", value]

    def get_bgp_af_route_map_vrf_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["route-map", "vrf", "import", value]

    # SID VPN (per address-family)
    def get_bgp_af_sid_vpn_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["sid", "vpn", "export", value]

    # Flowspec
    def get_bgp_af_local_install_interface(self, name: str, afi: str, value: str) -> List[str]:
        return self._af(name, afi) + ["local-install", "interface", value]

    def get_bgp_af_local_install_delete(self, name: str, afi: str) -> List[str]:
        return self._af(name, afi) + ["local-install"]

    # ========================================================================
    # L2VPN EVPN Address-Family paths
    # ========================================================================

    def get_bgp_af_l2vpn_evpn(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn")

    def get_bgp_af_l2vpn_evpn_flag(self, name: str, flag: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + [flag]

    def get_bgp_af_l2vpn_evpn_advertise_ipv4_unicast(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["advertise", "ipv4", "unicast"]

    def get_bgp_af_l2vpn_evpn_advertise_ipv4_unicast_route_map(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["advertise", "ipv4", "unicast", "route-map", value]

    def get_bgp_af_l2vpn_evpn_advertise_ipv6_unicast(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["advertise", "ipv6", "unicast"]

    def get_bgp_af_l2vpn_evpn_advertise_ipv6_unicast_route_map(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["advertise", "ipv6", "unicast", "route-map", value]

    def get_bgp_af_l2vpn_evpn_default_originate_ipv4(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["default-originate", "ipv4"]

    def get_bgp_af_l2vpn_evpn_default_originate_ipv6(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["default-originate", "ipv6"]

    def get_bgp_af_l2vpn_evpn_rd(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["rd", value]

    def get_bgp_af_l2vpn_evpn_rd_delete(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["rd"]

    def get_bgp_af_l2vpn_evpn_route_target_both(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["route-target", "both", value]

    def get_bgp_af_l2vpn_evpn_route_target_export(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["route-target", "export", value]

    def get_bgp_af_l2vpn_evpn_route_target_import(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["route-target", "import", value]

    def get_bgp_af_l2vpn_evpn_route_target_delete(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["route-target"]

    def get_bgp_af_l2vpn_evpn_flooding_disable(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["flooding", "disable"]

    def get_bgp_af_l2vpn_evpn_flooding_head_end_replication(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["flooding", "head-end-replication"]

    def get_bgp_af_l2vpn_evpn_flooding_delete(self, name: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["flooding"]

    def get_bgp_af_l2vpn_evpn_mac_vrf_soo(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["mac-vrf", "soo", value]

    def get_bgp_af_l2vpn_evpn_ead_es_frag_evi_limit(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["ead-es-frag", "evi-limit", value]

    def get_bgp_af_l2vpn_evpn_ead_es_route_target_export(self, name: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["ead-es-route-target", "export", value]

    # VNI
    def get_bgp_af_l2vpn_evpn_vni(self, name: str, vni: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni]

    def get_bgp_af_l2vpn_evpn_vni_flag(self, name: str, vni: str, flag: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni, flag]

    def get_bgp_af_l2vpn_evpn_vni_rd(self, name: str, vni: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni, "rd", value]

    def get_bgp_af_l2vpn_evpn_vni_route_target_both(self, name: str, vni: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni, "route-target", "both", value]

    def get_bgp_af_l2vpn_evpn_vni_route_target_export(self, name: str, vni: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni, "route-target", "export", value]

    def get_bgp_af_l2vpn_evpn_vni_route_target_import(self, name: str, vni: str, value: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni, "route-target", "import", value]

    def get_bgp_af_l2vpn_evpn_vni_delete(self, name: str, vni: str) -> List[str]:
        return self._af(name, "l2vpn-evpn") + ["vni", vni]

    # ========================================================================
    # Listen (Dynamic Neighbors)
    # ========================================================================

    def get_bgp_listen_limit(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["listen", "limit", value]

    def get_bgp_listen_limit_delete(self, name: str) -> List[str]:
        return self._base(name) + ["listen", "limit"]

    def get_bgp_listen_range(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["listen", "range", prefix]

    def get_bgp_listen_range_peer_group(self, name: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["listen", "range", prefix, "peer-group", value]

    def get_bgp_listen_range_delete(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["listen", "range", prefix]

    # ========================================================================
    # BMP (BGP Monitoring Protocol)
    # ========================================================================

    def get_bgp_bmp_mirror_buffer_limit(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["bmp", "mirror-buffer-limit", value]

    def get_bgp_bmp_mirror_buffer_limit_delete(self, name: str) -> List[str]:
        return self._base(name) + ["bmp", "mirror-buffer-limit"]

    def get_bgp_bmp_target(self, name: str, target: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target]

    def get_bgp_bmp_target_address(self, name: str, target: str, value: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "address", value]

    def get_bgp_bmp_target_port(self, name: str, target: str, value: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "port", value]

    def get_bgp_bmp_target_min_retry(self, name: str, target: str, value: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "min-retry", value]

    def get_bgp_bmp_target_max_retry(self, name: str, target: str, value: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "max-retry", value]

    def get_bgp_bmp_target_mirror(self, name: str, target: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "mirror"]

    def get_bgp_bmp_target_monitor(self, name: str, target: str, afi: str, policy: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target, "monitor", afi, policy]

    def get_bgp_bmp_target_delete(self, name: str, target: str) -> List[str]:
        return self._base(name) + ["bmp", "target", target]

    # ========================================================================
    # SID / SRv6
    # ========================================================================

    def get_bgp_sid_vpn_per_vrf_export(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["sid", "vpn", "per-vrf", "export", value]

    def get_bgp_sid_vpn_per_vrf_export_delete(self, name: str) -> List[str]:
        return self._base(name) + ["sid", "vpn", "per-vrf", "export"]

    def get_bgp_srv6_locator(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["srv6", "locator", value]

    def get_bgp_srv6_locator_delete(self, name: str) -> List[str]:
        return self._base(name) + ["srv6", "locator"]
