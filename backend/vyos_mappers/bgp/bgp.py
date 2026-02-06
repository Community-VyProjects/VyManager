"""
BGP Protocol Command Mapper

Handles command path generation for BGP (Border Gateway Protocol) configuration.
Covers: system-as, parameters, timers, neighbors, peer-groups, address-families,
listen ranges, BMP, SID, SRv6, and interface MPLS settings.

Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class BgpMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Helper base paths
    # ========================================================================

    def _bgp(self) -> List[str]:
        return ["protocols", "bgp"]

    def _neighbor(self, neighbor: str) -> List[str]:
        return ["protocols", "bgp", "neighbor", neighbor]

    def _peer_group(self, name: str) -> List[str]:
        return ["protocols", "bgp", "peer-group", name]

    def _af(self, afi: str) -> List[str]:
        return ["protocols", "bgp", "address-family", afi]

    def _neighbor_af(self, neighbor: str, afi: str) -> List[str]:
        return ["protocols", "bgp", "neighbor", neighbor, "address-family", afi]

    def _peer_group_af(self, name: str, afi: str) -> List[str]:
        return ["protocols", "bgp", "peer-group", name, "address-family", afi]

    # ========================================================================
    # System-level paths
    # ========================================================================

    def get_system_as(self, value: str) -> List[str]:
        return self._bgp() + ["system-as", value]

    def get_system_as_delete(self) -> List[str]:
        return self._bgp() + ["system-as"]

    # ========================================================================
    # Timers
    # ========================================================================

    def get_timers_keepalive(self, value: str) -> List[str]:
        return self._bgp() + ["timers", "keepalive", value]

    def get_timers_keepalive_delete(self) -> List[str]:
        return self._bgp() + ["timers", "keepalive"]

    def get_timers_holdtime(self, value: str) -> List[str]:
        return self._bgp() + ["timers", "holdtime", value]

    def get_timers_holdtime_delete(self) -> List[str]:
        return self._bgp() + ["timers", "holdtime"]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_parameters_router_id(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "router-id", value]

    def get_parameters_router_id_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "router-id"]

    def get_parameters_cluster_id(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "cluster-id", value]

    def get_parameters_cluster_id_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "cluster-id"]

    def get_parameters_default_local_pref(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "default", "local-pref", value]

    def get_parameters_default_local_pref_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "default", "local-pref"]

    def get_parameters_minimum_holdtime(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "minimum-holdtime", value]

    def get_parameters_minimum_holdtime_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "minimum-holdtime"]

    def get_parameters_labeled_unicast(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "labeled-unicast", value]

    def get_parameters_labeled_unicast_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "labeled-unicast"]

    # Boolean parameter flags
    def get_parameters_flag(self, flag: str) -> List[str]:
        return self._bgp() + ["parameters", flag]

    # Bestpath parameters
    def get_parameters_bestpath_as_path(self, option: str) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "as-path", option]

    def get_parameters_bestpath_bandwidth(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "bandwidth", value]

    def get_parameters_bestpath_bandwidth_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "bandwidth"]

    def get_parameters_bestpath_compare_routerid(self) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "compare-routerid"]

    def get_parameters_bestpath_med(self, option: str) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "med", option]

    def get_parameters_bestpath_peer_type_multipath_relax(self) -> List[str]:
        return self._bgp() + ["parameters", "bestpath", "peer-type", "multipath-relax"]

    # Confederation
    def get_parameters_confederation_identifier(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "confederation", "identifier", value]

    def get_parameters_confederation_identifier_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "confederation", "identifier"]

    def get_parameters_confederation_peers(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "confederation", "peers", value]

    def get_parameters_confederation_peers_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "confederation", "peers"]

    # Dampening
    def get_parameters_dampening_half_life(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "dampening", "half-life", value]

    def get_parameters_dampening_re_use(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "dampening", "re-use", value]

    def get_parameters_dampening_start_suppress_time(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "dampening", "start-suppress-time", value]

    def get_parameters_dampening_max_suppress_time(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "dampening", "max-suppress-time", value]

    def get_parameters_dampening_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "dampening"]

    # Distance
    def get_parameters_distance_global_external(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "distance", "global", "external", value]

    def get_parameters_distance_global_internal(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "distance", "global", "internal", value]

    def get_parameters_distance_global_local(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "distance", "global", "local", value]

    def get_parameters_distance_global_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "distance", "global"]

    def get_parameters_distance_prefix(self, prefix: str, distance: str) -> List[str]:
        return self._bgp() + ["parameters", "distance", "prefix", prefix, "distance", distance]

    def get_parameters_distance_prefix_delete(self, prefix: str) -> List[str]:
        return self._bgp() + ["parameters", "distance", "prefix", prefix]

    # Graceful restart
    def get_parameters_graceful_restart_stalepath_time(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "graceful-restart", "stalepath-time", value]

    def get_parameters_graceful_restart_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "graceful-restart"]

    # Conditional advertisement
    def get_parameters_conditional_advertisement_timer(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "conditional-advertisement", "timer", value]

    def get_parameters_conditional_advertisement_timer_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "conditional-advertisement", "timer"]

    # TCP keepalive
    def get_parameters_tcp_keepalive_idle(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "tcp-keepalive", "idle", value]

    def get_parameters_tcp_keepalive_interval(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "tcp-keepalive", "interval", value]

    def get_parameters_tcp_keepalive_probes(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "tcp-keepalive", "probes", value]

    def get_parameters_tcp_keepalive_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "tcp-keepalive"]

    # ========================================================================
    # Neighbor paths
    # ========================================================================

    def get_neighbor(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor)

    def get_neighbor_remote_as(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["remote-as", value]

    def get_neighbor_remote_as_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["remote-as"]

    def get_neighbor_description(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["description", value]

    def get_neighbor_description_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["description"]

    def get_neighbor_peer_group(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["peer-group", value]

    def get_neighbor_peer_group_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["peer-group"]

    def get_neighbor_update_source(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["update-source", value]

    def get_neighbor_update_source_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["update-source"]

    def get_neighbor_password(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["password", value]

    def get_neighbor_password_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["password"]

    def get_neighbor_port(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["port", value]

    def get_neighbor_port_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["port"]

    def get_neighbor_shutdown(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["shutdown"]

    def get_neighbor_passive(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["passive"]

    def get_neighbor_solo(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["solo"]

    def get_neighbor_enforce_first_as(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["enforce-first-as"]

    def get_neighbor_override_capability(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["override-capability"]

    def get_neighbor_strict_capability_match(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["strict-capability-match"]

    def get_neighbor_disable_capability_negotiation(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["disable-capability-negotiation"]

    def get_neighbor_disable_connected_check(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["disable-connected-check"]

    def get_neighbor_ebgp_multihop(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["ebgp-multihop", value]

    def get_neighbor_ebgp_multihop_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["ebgp-multihop"]

    def get_neighbor_advertisement_interval(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["advertisement-interval", value]

    def get_neighbor_advertisement_interval_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["advertisement-interval"]

    # Neighbor BFD
    def get_neighbor_bfd(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd"]

    def get_neighbor_bfd_check_control_plane_failure(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd", "check-control-plane-failure"]

    def get_neighbor_bfd_profile(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd", "profile", value]

    def get_neighbor_bfd_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd"]

    # Neighbor capability
    def get_neighbor_capability_dynamic(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["capability", "dynamic"]

    def get_neighbor_capability_extended_nexthop(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["capability", "extended-nexthop"]

    def get_neighbor_capability_software_version(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["capability", "software-version"]

    # Neighbor graceful-restart
    def get_neighbor_graceful_restart(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["graceful-restart", value]

    def get_neighbor_graceful_restart_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["graceful-restart"]

    # Neighbor local-as
    def get_neighbor_local_as(self, neighbor: str, asn: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-as", asn]

    def get_neighbor_local_as_no_prepend_replace_as(self, neighbor: str, asn: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-as", asn, "no-prepend", "replace-as"]

    def get_neighbor_local_as_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-as"]

    # Neighbor local-role
    def get_neighbor_local_role(self, neighbor: str, role: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-role", role]

    def get_neighbor_local_role_strict(self, neighbor: str, role: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-role", role, "strict"]

    def get_neighbor_local_role_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["local-role"]

    # Neighbor timers
    def get_neighbor_timers_connect(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["timers", "connect", value]

    def get_neighbor_timers_keepalive(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["timers", "keepalive", value]

    def get_neighbor_timers_holdtime(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["timers", "holdtime", value]

    def get_neighbor_timers_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["timers"]

    # Neighbor TTL security
    def get_neighbor_ttl_security_hops(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["ttl-security", "hops", value]

    def get_neighbor_ttl_security_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["ttl-security"]

    # Neighbor interface
    def get_neighbor_interface_remote_as(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface", "remote-as", value]

    def get_neighbor_interface_peer_group(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface", "peer-group", value]

    def get_neighbor_interface_source_interface(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface", "source-interface"]

    def get_neighbor_interface_v6only_remote_as(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface", "v6only", "remote-as", value]

    def get_neighbor_interface_v6only_peer_group(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface", "v6only", "peer-group", value]

    def get_neighbor_interface_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["interface"]

    # Neighbor path-attribute
    def get_neighbor_path_attribute_discard(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["path-attribute", "discard", value]

    def get_neighbor_path_attribute_treat_as_withdraw(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["path-attribute", "treat-as-withdraw", value]

    def get_neighbor_path_attribute_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["path-attribute"]

    # ========================================================================
    # Neighbor Address-Family paths (generic for any AFI)
    # ========================================================================

    def get_neighbor_af(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi)

    def get_neighbor_af_route_map_export(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["route-map", "export", value]

    def get_neighbor_af_route_map_import(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["route-map", "import", value]

    def get_neighbor_af_route_map_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["route-map"]

    def get_neighbor_af_prefix_list_export(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["prefix-list", "export", value]

    def get_neighbor_af_prefix_list_import(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["prefix-list", "import", value]

    def get_neighbor_af_prefix_list_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["prefix-list"]

    def get_neighbor_af_filter_list_export(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["filter-list", "export", value]

    def get_neighbor_af_filter_list_import(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["filter-list", "import", value]

    def get_neighbor_af_filter_list_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["filter-list"]

    def get_neighbor_af_distribute_list_export(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["distribute-list", "export", value]

    def get_neighbor_af_distribute_list_import(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["distribute-list", "import", value]

    def get_neighbor_af_distribute_list_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["distribute-list"]

    def get_neighbor_af_soft_reconfiguration_inbound(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["soft-reconfiguration", "inbound"]

    def get_neighbor_af_route_reflector_client(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["route-reflector-client"]

    def get_neighbor_af_route_server_client(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["route-server-client"]

    def get_neighbor_af_nexthop_self(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["nexthop-self"]

    def get_neighbor_af_nexthop_self_force(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["nexthop-self", "force"]

    def get_neighbor_af_addpath_tx_all(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["addpath-tx-all"]

    def get_neighbor_af_addpath_tx_per_as(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["addpath-tx-per-as"]

    def get_neighbor_af_allowas_in_number(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["allowas-in", "number", value]

    def get_neighbor_af_allowas_in_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["allowas-in"]

    def get_neighbor_af_as_override(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["as-override"]

    def get_neighbor_af_attribute_unchanged_as_path(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["attribute-unchanged", "as-path"]

    def get_neighbor_af_attribute_unchanged_med(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["attribute-unchanged", "med"]

    def get_neighbor_af_attribute_unchanged_next_hop(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["attribute-unchanged", "next-hop"]

    def get_neighbor_af_attribute_unchanged_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["attribute-unchanged"]

    def get_neighbor_af_default_originate(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["default-originate"]

    def get_neighbor_af_default_originate_route_map(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["default-originate", "route-map", value]

    def get_neighbor_af_default_originate_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["default-originate"]

    def get_neighbor_af_maximum_prefix(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["maximum-prefix", value]

    def get_neighbor_af_maximum_prefix_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["maximum-prefix"]

    def get_neighbor_af_maximum_prefix_out(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["maximum-prefix-out", value]

    def get_neighbor_af_maximum_prefix_out_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["maximum-prefix-out"]

    def get_neighbor_af_remove_private_as(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["remove-private-as"]

    def get_neighbor_af_remove_private_as_all(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["remove-private-as", "all"]

    def get_neighbor_af_remove_private_as_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["remove-private-as"]

    def get_neighbor_af_disable_send_community_extended(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["disable-send-community", "extended"]

    def get_neighbor_af_disable_send_community_standard(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["disable-send-community", "standard"]

    def get_neighbor_af_disable_send_community_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["disable-send-community"]

    def get_neighbor_af_weight(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["weight", value]

    def get_neighbor_af_weight_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["weight"]

    def get_neighbor_af_unsuppress_map(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["unsuppress-map", value]

    def get_neighbor_af_unsuppress_map_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["unsuppress-map"]

    def get_neighbor_af_conditionally_advertise_advertise_map(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["conditionally-advertise", "advertise-map", value]

    def get_neighbor_af_conditionally_advertise_exist_map(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["conditionally-advertise", "exist-map", value]

    def get_neighbor_af_conditionally_advertise_non_exist_map(self, neighbor: str, afi: str, value: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["conditionally-advertise", "non-exist-map", value]

    def get_neighbor_af_conditionally_advertise_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["conditionally-advertise"]

    # IPv6-specific: nexthop-local unchanged
    def get_neighbor_af_nexthop_local_unchanged(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["nexthop-local", "unchanged"]

    # Capability ORF
    def get_neighbor_af_capability_orf_prefix_list_receive(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["capability", "orf", "prefix-list", "receive"]

    def get_neighbor_af_capability_orf_prefix_list_send(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["capability", "orf", "prefix-list", "send"]

    def get_neighbor_af_capability_orf_delete(self, neighbor: str, afi: str) -> List[str]:
        return self._neighbor_af(neighbor, afi) + ["capability", "orf"]

    # ========================================================================
    # Peer-group paths (mirror neighbor paths but under peer-group)
    # ========================================================================

    def get_peer_group(self, name: str) -> List[str]:
        return self._peer_group(name)

    def get_peer_group_remote_as(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["remote-as", value]

    def get_peer_group_remote_as_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["remote-as"]

    def get_peer_group_description(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["description", value]

    def get_peer_group_description_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["description"]

    def get_peer_group_update_source(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["update-source", value]

    def get_peer_group_update_source_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["update-source"]

    def get_peer_group_password(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["password", value]

    def get_peer_group_password_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["password"]

    def get_peer_group_port(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["port", value]

    def get_peer_group_port_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["port"]

    def get_peer_group_shutdown(self, name: str) -> List[str]:
        return self._peer_group(name) + ["shutdown"]

    def get_peer_group_passive(self, name: str) -> List[str]:
        return self._peer_group(name) + ["passive"]

    def get_peer_group_override_capability(self, name: str) -> List[str]:
        return self._peer_group(name) + ["override-capability"]

    def get_peer_group_disable_capability_negotiation(self, name: str) -> List[str]:
        return self._peer_group(name) + ["disable-capability-negotiation"]

    def get_peer_group_disable_connected_check(self, name: str) -> List[str]:
        return self._peer_group(name) + ["disable-connected-check"]

    def get_peer_group_ebgp_multihop(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["ebgp-multihop", value]

    def get_peer_group_ebgp_multihop_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["ebgp-multihop"]

    def get_peer_group_bfd(self, name: str) -> List[str]:
        return self._peer_group(name) + ["bfd"]

    def get_peer_group_bfd_check_control_plane_failure(self, name: str) -> List[str]:
        return self._peer_group(name) + ["bfd", "check-control-plane-failure"]

    def get_peer_group_bfd_profile(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["bfd", "profile", value]

    def get_peer_group_bfd_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["bfd"]

    def get_peer_group_capability_dynamic(self, name: str) -> List[str]:
        return self._peer_group(name) + ["capability", "dynamic"]

    def get_peer_group_capability_extended_nexthop(self, name: str) -> List[str]:
        return self._peer_group(name) + ["capability", "extended-nexthop"]

    def get_peer_group_capability_software_version(self, name: str) -> List[str]:
        return self._peer_group(name) + ["capability", "software-version"]

    def get_peer_group_graceful_restart(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["graceful-restart", value]

    def get_peer_group_graceful_restart_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["graceful-restart"]

    def get_peer_group_local_as(self, name: str, asn: str) -> List[str]:
        return self._peer_group(name) + ["local-as", asn]

    def get_peer_group_local_as_no_prepend_replace_as(self, name: str, asn: str) -> List[str]:
        return self._peer_group(name) + ["local-as", asn, "no-prepend", "replace-as"]

    def get_peer_group_local_as_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["local-as"]

    def get_peer_group_local_role(self, name: str, role: str) -> List[str]:
        return self._peer_group(name) + ["local-role", role]

    def get_peer_group_local_role_strict(self, name: str, role: str) -> List[str]:
        return self._peer_group(name) + ["local-role", role, "strict"]

    def get_peer_group_local_role_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["local-role"]

    def get_peer_group_ttl_security_hops(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["ttl-security", "hops", value]

    def get_peer_group_ttl_security_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["ttl-security"]

    def get_peer_group_path_attribute_discard(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["path-attribute", "discard", value]

    def get_peer_group_path_attribute_treat_as_withdraw(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["path-attribute", "treat-as-withdraw", value]

    def get_peer_group_path_attribute_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["path-attribute"]

    # ========================================================================
    # Peer-group Address-Family paths
    # ========================================================================

    def get_peer_group_af(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi)

    def get_peer_group_af_route_map_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["route-map", "export", value]

    def get_peer_group_af_route_map_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["route-map", "import", value]

    def get_peer_group_af_route_map_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["route-map"]

    def get_peer_group_af_prefix_list_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["prefix-list", "export", value]

    def get_peer_group_af_prefix_list_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["prefix-list", "import", value]

    def get_peer_group_af_prefix_list_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["prefix-list"]

    def get_peer_group_af_filter_list_export(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["filter-list", "export", value]

    def get_peer_group_af_filter_list_import(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["filter-list", "import", value]

    def get_peer_group_af_filter_list_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["filter-list"]

    def get_peer_group_af_soft_reconfiguration_inbound(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["soft-reconfiguration", "inbound"]

    def get_peer_group_af_route_reflector_client(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["route-reflector-client"]

    def get_peer_group_af_route_server_client(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["route-server-client"]

    def get_peer_group_af_nexthop_self(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["nexthop-self"]

    def get_peer_group_af_nexthop_self_force(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["nexthop-self", "force"]

    def get_peer_group_af_addpath_tx_all(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["addpath-tx-all"]

    def get_peer_group_af_addpath_tx_per_as(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["addpath-tx-per-as"]

    def get_peer_group_af_allowas_in_number(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["allowas-in", "number", value]

    def get_peer_group_af_allowas_in_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["allowas-in"]

    def get_peer_group_af_as_override(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["as-override"]

    def get_peer_group_af_attribute_unchanged_as_path(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["attribute-unchanged", "as-path"]

    def get_peer_group_af_attribute_unchanged_med(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["attribute-unchanged", "med"]

    def get_peer_group_af_attribute_unchanged_next_hop(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["attribute-unchanged", "next-hop"]

    def get_peer_group_af_attribute_unchanged_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["attribute-unchanged"]

    def get_peer_group_af_default_originate(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["default-originate"]

    def get_peer_group_af_default_originate_route_map(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["default-originate", "route-map", value]

    def get_peer_group_af_default_originate_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["default-originate"]

    def get_peer_group_af_maximum_prefix(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["maximum-prefix", value]

    def get_peer_group_af_maximum_prefix_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["maximum-prefix"]

    def get_peer_group_af_remove_private_as(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["remove-private-as"]

    def get_peer_group_af_remove_private_as_all(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["remove-private-as", "all"]

    def get_peer_group_af_remove_private_as_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["remove-private-as"]

    def get_peer_group_af_disable_send_community_extended(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["disable-send-community", "extended"]

    def get_peer_group_af_disable_send_community_standard(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["disable-send-community", "standard"]

    def get_peer_group_af_disable_send_community_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["disable-send-community"]

    def get_peer_group_af_weight(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["weight", value]

    def get_peer_group_af_weight_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["weight"]

    def get_peer_group_af_unsuppress_map(self, name: str, afi: str, value: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["unsuppress-map", value]

    def get_peer_group_af_unsuppress_map_delete(self, name: str, afi: str) -> List[str]:
        return self._peer_group_af(name, afi) + ["unsuppress-map"]

    # ========================================================================
    # Global Address-Family paths
    # ========================================================================

    # Network
    def get_af_network(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["network", prefix]

    def get_af_network_route_map(self, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(afi) + ["network", prefix, "route-map", value]

    def get_af_network_backdoor(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["network", prefix, "backdoor"]

    def get_af_network_path_limit(self, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(afi) + ["network", prefix, "path-limit", value]

    def get_af_network_label(self, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(afi) + ["network", prefix, "label", value]

    def get_af_network_rd(self, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(afi) + ["network", prefix, "rd", value]

    def get_af_network_delete(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["network", prefix]

    # Aggregate address
    def get_af_aggregate_address(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["aggregate-address", prefix]

    def get_af_aggregate_address_as_set(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["aggregate-address", prefix, "as-set"]

    def get_af_aggregate_address_summary_only(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["aggregate-address", prefix, "summary-only"]

    def get_af_aggregate_address_route_map(self, afi: str, prefix: str, value: str) -> List[str]:
        return self._af(afi) + ["aggregate-address", prefix, "route-map", value]

    def get_af_aggregate_address_delete(self, afi: str, prefix: str) -> List[str]:
        return self._af(afi) + ["aggregate-address", prefix]

    # Maximum paths
    def get_af_maximum_paths_ebgp(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["maximum-paths", "ebgp", value]

    def get_af_maximum_paths_ibgp(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["maximum-paths", "ibgp", value]

    def get_af_maximum_paths_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["maximum-paths"]

    # Redistribute
    def get_af_redistribute(self, afi: str, protocol: str) -> List[str]:
        return self._af(afi) + ["redistribute", protocol]

    def get_af_redistribute_metric(self, afi: str, protocol: str, value: str) -> List[str]:
        return self._af(afi) + ["redistribute", protocol, "metric", value]

    def get_af_redistribute_route_map(self, afi: str, protocol: str, value: str) -> List[str]:
        return self._af(afi) + ["redistribute", protocol, "route-map", value]

    def get_af_redistribute_table(self, afi: str, table: str) -> List[str]:
        return self._af(afi) + ["redistribute", "table", table]

    def get_af_redistribute_table_metric(self, afi: str, table: str, value: str) -> List[str]:
        return self._af(afi) + ["redistribute", "table", table, "metric", value]

    def get_af_redistribute_table_route_map(self, afi: str, table: str, value: str) -> List[str]:
        return self._af(afi) + ["redistribute", "table", table, "route-map", value]

    def get_af_redistribute_delete(self, afi: str, protocol: str) -> List[str]:
        return self._af(afi) + ["redistribute", protocol]

    # Distance
    def get_af_distance_external(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["distance", "external", value]

    def get_af_distance_internal(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["distance", "internal", value]

    def get_af_distance_local(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["distance", "local", value]

    def get_af_distance_prefix(self, afi: str, prefix: str, distance: str) -> List[str]:
        return self._af(afi) + ["distance", "prefix", prefix, "distance", distance]

    def get_af_distance_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["distance"]

    # VPN export/import
    def get_af_export_vpn(self, afi: str) -> List[str]:
        return self._af(afi) + ["export", "vpn"]

    def get_af_import_vpn(self, afi: str) -> List[str]:
        return self._af(afi) + ["import", "vpn"]

    def get_af_import_vrf(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["import", "vrf", value]

    def get_af_import_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["import"]

    # Label VPN
    def get_af_label_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["label", "vpn", "export", value]

    def get_af_label_vpn_allocation_mode_per_nexthop(self, afi: str) -> List[str]:
        return self._af(afi) + ["label", "vpn", "allocation-mode", "per-nexthop"]

    def get_af_label_vpn_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["label", "vpn"]

    # Nexthop/RD/Route-target VPN
    def get_af_nexthop_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["nexthop", "vpn", "export", value]

    def get_af_rd_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["rd", "vpn", "export", value]

    def get_af_route_target_vpn_both(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-target", "vpn", "both", value]

    def get_af_route_target_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-target", "vpn", "export", value]

    def get_af_route_target_vpn_import(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-target", "vpn", "import", value]

    def get_af_route_target_vpn_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["route-target", "vpn"]

    # Route-map VPN/VRF
    def get_af_route_map_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-map", "vpn", "export", value]

    def get_af_route_map_vpn_import(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-map", "vpn", "import", value]

    def get_af_route_map_vrf_import(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["route-map", "vrf", "import", value]

    # SID VPN
    def get_af_sid_vpn_export(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["sid", "vpn", "export", value]

    # Flowspec
    def get_af_local_install_interface(self, afi: str, value: str) -> List[str]:
        return self._af(afi) + ["local-install", "interface", value]

    def get_af_local_install_delete(self, afi: str) -> List[str]:
        return self._af(afi) + ["local-install"]

    # ========================================================================
    # L2VPN EVPN Address-Family paths
    # ========================================================================

    def get_af_l2vpn_evpn(self) -> List[str]:
        return self._af("l2vpn-evpn")

    def get_af_l2vpn_evpn_flag(self, flag: str) -> List[str]:
        return self._af("l2vpn-evpn") + [flag]

    def get_af_l2vpn_evpn_advertise_ipv4_unicast(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["advertise", "ipv4", "unicast"]

    def get_af_l2vpn_evpn_advertise_ipv4_unicast_route_map(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["advertise", "ipv4", "unicast", "route-map", value]

    def get_af_l2vpn_evpn_advertise_ipv6_unicast(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["advertise", "ipv6", "unicast"]

    def get_af_l2vpn_evpn_advertise_ipv6_unicast_route_map(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["advertise", "ipv6", "unicast", "route-map", value]

    def get_af_l2vpn_evpn_default_originate_ipv4(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["default-originate", "ipv4"]

    def get_af_l2vpn_evpn_default_originate_ipv6(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["default-originate", "ipv6"]

    def get_af_l2vpn_evpn_rd(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["rd", value]

    def get_af_l2vpn_evpn_rd_delete(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["rd"]

    def get_af_l2vpn_evpn_route_target_both(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["route-target", "both", value]

    def get_af_l2vpn_evpn_route_target_export(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["route-target", "export", value]

    def get_af_l2vpn_evpn_route_target_import(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["route-target", "import", value]

    def get_af_l2vpn_evpn_route_target_delete(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["route-target"]

    def get_af_l2vpn_evpn_flooding_disable(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["flooding", "disable"]

    def get_af_l2vpn_evpn_flooding_head_end_replication(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["flooding", "head-end-replication"]

    def get_af_l2vpn_evpn_flooding_delete(self) -> List[str]:
        return self._af("l2vpn-evpn") + ["flooding"]

    def get_af_l2vpn_evpn_mac_vrf_soo(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["mac-vrf", "soo", value]

    def get_af_l2vpn_evpn_ead_es_frag_evi_limit(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["ead-es-frag", "evi-limit", value]

    def get_af_l2vpn_evpn_ead_es_route_target_export(self, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["ead-es-route-target", "export", value]

    # VNI
    def get_af_l2vpn_evpn_vni(self, vni: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni]

    def get_af_l2vpn_evpn_vni_flag(self, vni: str, flag: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni, flag]

    def get_af_l2vpn_evpn_vni_rd(self, vni: str, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni, "rd", value]

    def get_af_l2vpn_evpn_vni_route_target_both(self, vni: str, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni, "route-target", "both", value]

    def get_af_l2vpn_evpn_vni_route_target_export(self, vni: str, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni, "route-target", "export", value]

    def get_af_l2vpn_evpn_vni_route_target_import(self, vni: str, value: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni, "route-target", "import", value]

    def get_af_l2vpn_evpn_vni_delete(self, vni: str) -> List[str]:
        return self._af("l2vpn-evpn") + ["vni", vni]

    # ========================================================================
    # Listen (Dynamic Neighbors)
    # ========================================================================

    def get_listen_limit(self, value: str) -> List[str]:
        return self._bgp() + ["listen", "limit", value]

    def get_listen_limit_delete(self) -> List[str]:
        return self._bgp() + ["listen", "limit"]

    def get_listen_range(self, prefix: str) -> List[str]:
        return self._bgp() + ["listen", "range", prefix]

    def get_listen_range_peer_group(self, prefix: str, value: str) -> List[str]:
        return self._bgp() + ["listen", "range", prefix, "peer-group", value]

    def get_listen_range_delete(self, prefix: str) -> List[str]:
        return self._bgp() + ["listen", "range", prefix]

    # ========================================================================
    # BMP (BGP Monitoring Protocol)
    # ========================================================================

    def get_bmp_mirror_buffer_limit(self, value: str) -> List[str]:
        return self._bgp() + ["bmp", "mirror-buffer-limit", value]

    def get_bmp_mirror_buffer_limit_delete(self) -> List[str]:
        return self._bgp() + ["bmp", "mirror-buffer-limit"]

    def get_bmp_target(self, name: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name]

    def get_bmp_target_address(self, name: str, value: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "address", value]

    def get_bmp_target_port(self, name: str, value: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "port", value]

    def get_bmp_target_min_retry(self, name: str, value: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "min-retry", value]

    def get_bmp_target_max_retry(self, name: str, value: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "max-retry", value]

    def get_bmp_target_mirror(self, name: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "mirror"]

    def get_bmp_target_monitor(self, name: str, afi: str, policy: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "monitor", afi, policy]

    def get_bmp_target_delete(self, name: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name]

    # ========================================================================
    # SID / SRv6
    # ========================================================================

    def get_sid_vpn_per_vrf_export(self, value: str) -> List[str]:
        return self._bgp() + ["sid", "vpn", "per-vrf", "export", value]

    def get_sid_vpn_per_vrf_export_delete(self) -> List[str]:
        return self._bgp() + ["sid", "vpn", "per-vrf", "export"]

    def get_srv6_locator(self, value: str) -> List[str]:
        return self._bgp() + ["srv6", "locator", value]

    def get_srv6_locator_delete(self) -> List[str]:
        return self._bgp() + ["srv6", "locator"]

    # ========================================================================
    # Interface MPLS
    # ========================================================================

    def get_interface_mpls_forwarding(self, interface: str) -> List[str]:
        return self._bgp() + ["interface", interface, "mpls", "forwarding"]

    def get_interface_delete(self, interface: str) -> List[str]:
        return self._bgp() + ["interface", interface]
