"""
IS-IS Batch Builder

Generates VyOS set/delete operations for the IS-IS routing protocol.
All paths are retrieved through the version-aware IsisMapper.

Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the Babel/OSPF batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class IsisBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["isis"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "IsisBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "IsisBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "isis": {
                    "supported": True,
                    "description": "IS-IS routing protocol",
                },
                "segment_routing": {
                    "supported": True,
                    "description": "IS-IS Segment Routing (SR-MPLS)",
                },
                "ti_lfa": {
                    "supported": is_1_5,
                    "description": "Topology Independent LFA (VyOS 1.5+)",
                },
                "remote_lfa": {
                    "supported": is_1_5,
                    "description": "Remote LFA with MPLS LDP tunnels (VyOS 1.5+)",
                },
                "srv6": {
                    "supported": is_1_5,
                    "description": "SRv6 locator (VyOS 1.5+)",
                },
                "te_export": {
                    "supported": is_1_5,
                    "description": "Traffic Engineering Database export (VyOS 1.5+)",
                },
                "lsp_refresh_min_1": {
                    "supported": is_1_4,
                    "description": "lsp-refresh-interval minimum of 1 second (VyOS 1.4 only; 1.5 minimum is 2)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Delete entire IS-IS process
    # -----------------------------------------------------------------------

    def delete_isis(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_isis_path())

    # -----------------------------------------------------------------------
    # Global — NET
    # -----------------------------------------------------------------------

    def set_net(self, net: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_net_path(net))

    def delete_net(self, net: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_net_path(net))

    # -----------------------------------------------------------------------
    # Global — scalars
    # -----------------------------------------------------------------------

    def set_level(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_level_path(level))

    def delete_level(self) -> "IsisBatchBuilder":
        # level is a leaf node; delete the key by omitting its value
        return self.add_delete(["protocols", "isis", "level"])

    def set_metric_style(self, style: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_metric_style_path(style))

    def delete_metric_style(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "metric-style"])

    def set_dynamic_hostname(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_dynamic_hostname_path())

    def delete_dynamic_hostname(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_dynamic_hostname_path())

    def set_purge_originator(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_purge_originator_path())

    def delete_purge_originator(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_purge_originator_path())

    def set_advertise_passive_only(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_advertise_passive_only_path())

    def delete_advertise_passive_only(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_advertise_passive_only_path())

    def set_advertise_high_metrics(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_advertise_high_metrics_path())

    def delete_advertise_high_metrics(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_advertise_high_metrics_path())

    def set_attached_bit(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_set_attached_bit_path())

    def delete_attached_bit(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_set_attached_bit_path())

    def set_overload_bit(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_set_overload_bit_path())

    def delete_overload_bit(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_set_overload_bit_path())

    def set_log_adjacency_changes(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_log_adjacency_changes_path())

    def delete_log_adjacency_changes(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_log_adjacency_changes_path())

    def set_topology(self, topology: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_topology_path(topology))

    def delete_topology(self, topology: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_topology_path(topology))

    # -----------------------------------------------------------------------
    # Global — timers
    # -----------------------------------------------------------------------

    def set_lsp_mtu(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_mtu_path(val))

    def delete_lsp_mtu(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "lsp-mtu"])

    def set_lsp_gen_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_gen_interval_path(val))

    def delete_lsp_gen_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "lsp-gen-interval"])

    def set_lsp_refresh_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_refresh_interval_path(val))

    def delete_lsp_refresh_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "lsp-refresh-interval"])

    def set_max_lsp_lifetime(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_max_lsp_lifetime_path(val))

    def delete_max_lsp_lifetime(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "max-lsp-lifetime"])

    def set_spf_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_interval_path(val))

    def delete_spf_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "spf-interval"])

    # -----------------------------------------------------------------------
    # Global — SPF Delay IETF
    # -----------------------------------------------------------------------

    def delete_spf_delay_ietf(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_spf_delay_ietf_path())

    def set_spf_delay_ietf_init_delay(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_delay_ietf_init_delay_path(val))

    def set_spf_delay_ietf_short_delay(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_delay_ietf_short_delay_path(val))

    def set_spf_delay_ietf_long_delay(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_delay_ietf_long_delay_path(val))

    def set_spf_delay_ietf_holddown(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_delay_ietf_holddown_path(val))

    def set_spf_delay_ietf_time_to_learn(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_delay_ietf_time_to_learn_path(val))

    # -----------------------------------------------------------------------
    # Global — passwords
    # -----------------------------------------------------------------------

    def set_area_password_md5(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_area_password_md5_path(pwd))

    def set_area_password_plaintext(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_area_password_plaintext_path(pwd))

    def delete_area_password(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_area_password_path())

    def set_domain_password_md5(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_domain_password_md5_path(pwd))

    def set_domain_password_plaintext(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_domain_password_plaintext_path(pwd))

    def delete_domain_password(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_domain_password_path())

    # -----------------------------------------------------------------------
    # Global — LDP sync
    # -----------------------------------------------------------------------

    def set_ldp_sync_holddown(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_ldp_sync_holddown_path(val))

    def delete_ldp_sync(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_ldp_sync_path())

    # -----------------------------------------------------------------------
    # Global — Fast Reroute LFA load-sharing
    # -----------------------------------------------------------------------

    def set_frr_lfa_load_sharing_disable_level1(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_load_sharing_disable_level1_path())

    def delete_frr_lfa_load_sharing_disable_level1(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_load_sharing_disable_level1_path())

    def set_frr_lfa_load_sharing_disable_level2(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_load_sharing_disable_level2_path())

    def delete_frr_lfa_load_sharing_disable_level2(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_load_sharing_disable_level2_path())

    # -----------------------------------------------------------------------
    # Interface — lifecycle
    # -----------------------------------------------------------------------

    def set_interface(self, iface: str) -> "IsisBatchBuilder":
        """Create an IS-IS interface (presence node)."""
        return self.add_set(self.m.get_interface_path(iface))

    def delete_interface(self, iface: str) -> "IsisBatchBuilder":
        """Remove an IS-IS interface and all its config."""
        return self.add_delete(self.m.get_interface_path(iface))

    # -----------------------------------------------------------------------
    # Interface — basic settings
    # -----------------------------------------------------------------------

    def set_interface_circuit_type(self, iface: str, circuit_type: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_circuit_type_path(iface, circuit_type))

    def delete_interface_circuit_type(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "circuit-type"])

    def set_interface_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_metric_path(iface, val))

    def delete_interface_metric(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "metric"])

    def set_interface_hello_interval(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_hello_interval_path(iface, val))

    def delete_interface_hello_interval(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "hello-interval"])

    def set_interface_hello_multiplier(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_hello_multiplier_path(iface, val))

    def delete_interface_hello_multiplier(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "hello-multiplier"])

    def set_interface_hello_padding(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_hello_padding_path(iface))

    def delete_interface_hello_padding(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_padding_path(iface))

    def set_interface_passive(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_passive_path(iface))

    def delete_interface_passive(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_passive_path(iface))

    def set_interface_point_to_point(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_point_to_point_path(iface))

    def delete_interface_point_to_point(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_point_to_point_path(iface))

    def set_interface_priority(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_priority_path(iface, val))

    def delete_interface_priority(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "priority"])

    def set_interface_psnp_interval(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_psnp_interval_path(iface, val))

    def delete_interface_psnp_interval(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "psnp-interval"])

    def set_interface_no_three_way_handshake(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_no_three_way_handshake_path(iface))

    def delete_interface_no_three_way_handshake(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_no_three_way_handshake_path(iface))

    # Interface — password
    def set_interface_password_md5(self, iface: str, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_password_md5_path(iface, pwd))

    def set_interface_password_plaintext(self, iface: str, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_password_plaintext_path(iface, pwd))

    def delete_interface_password(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_password_path(iface))

    # Interface — BFD
    def set_interface_bfd(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_bfd_path(iface))

    def delete_interface_bfd(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_path(iface))

    def set_interface_bfd_profile(self, iface: str, profile: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_bfd_profile_path(iface, profile))

    def delete_interface_bfd_profile(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "interface", iface, "bfd", "profile"])

    # Interface — LDP sync
    def set_interface_ldp_sync_holddown(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ldp_sync_holddown_path(iface, val))

    def set_interface_ldp_sync_disable(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ldp_sync_disable_path(iface))

    def delete_interface_ldp_sync_disable(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_disable_path(iface))

    def delete_interface_ldp_sync(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_path(iface))

    # Interface — LFA (both versions)
    def set_interface_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_lfa_level1_path(iface))

    def delete_interface_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_lfa_level1_path(iface))

    def set_interface_lfa_level1_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_lfa_level1_exclude_path(iface, excl_iface))

    def delete_interface_lfa_level1_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_lfa_level1_exclude_path(iface, excl_iface))

    def set_interface_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_lfa_level2_path(iface))

    def delete_interface_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_lfa_level2_path(iface))

    def set_interface_lfa_level2_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_lfa_level2_exclude_path(iface, excl_iface))

    def delete_interface_lfa_level2_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_lfa_level2_exclude_path(iface, excl_iface))

    # Interface — TI-LFA (v1.5+; v1.4 mapper returns [] → no-op)
    def set_interface_ti_lfa(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_path(iface))

    def delete_interface_ti_lfa(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_path(iface))

    def set_interface_ti_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level1_path(iface))

    def delete_interface_ti_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level1_path(iface))

    def set_interface_ti_lfa_level1_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level1_node_protection_path(iface))

    def delete_interface_ti_lfa_level1_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level1_node_protection_path(iface))

    def set_interface_ti_lfa_level1_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level1_link_fallback_path(iface))

    def delete_interface_ti_lfa_level1_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level1_link_fallback_path(iface))

    def set_interface_ti_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level2_path(iface))

    def delete_interface_ti_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level2_path(iface))

    def set_interface_ti_lfa_level2_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level2_node_protection_path(iface))

    def delete_interface_ti_lfa_level2_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level2_node_protection_path(iface))

    def set_interface_ti_lfa_level2_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ti_lfa_level2_link_fallback_path(iface))

    def delete_interface_ti_lfa_level2_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ti_lfa_level2_link_fallback_path(iface))

    # Interface — Remote LFA (v1.5+; v1.4 mapper returns [] → no-op)
    def set_interface_remote_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level1_path(iface))

    def delete_interface_remote_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_remote_lfa_level1_path(iface))

    def set_interface_remote_lfa_level1_max_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level1_max_metric_path(iface, val))

    def delete_interface_remote_lfa_level1_max_metric(self, iface: str) -> "IsisBatchBuilder":
        path = self.m.get_interface_remote_lfa_level1_path(iface)
        return self.add_delete(path + ["maximum-metric"] if path else [])

    def set_interface_remote_lfa_level1_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(iface))

    def delete_interface_remote_lfa_level1_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(iface))

    def set_interface_remote_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level2_path(iface))

    def delete_interface_remote_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_remote_lfa_level2_path(iface))

    def set_interface_remote_lfa_level2_max_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level2_max_metric_path(iface, val))

    def set_interface_remote_lfa_level2_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(iface))

    def delete_interface_remote_lfa_level2_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(iface))

    # -----------------------------------------------------------------------
    # Redistribute IPv4
    # value format for 2-arg methods: "protocol|level,secondary_arg"
    # -----------------------------------------------------------------------

    def set_redistribute_ipv4(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_ipv4_path(protocol, level))

    def delete_redistribute_ipv4(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_ipv4_path(protocol, level))

    def set_redistribute_ipv4_metric(self, protocol_level: str, metric: str) -> "IsisBatchBuilder":
        """protocol_level is 'bgp|level-1' style."""
        protocol, level = protocol_level.split("|", 1)
        return self.add_set(self.m.get_redistribute_ipv4_metric_path(protocol, level, metric))

    def delete_redistribute_ipv4_metric(self, protocol_level: str) -> "IsisBatchBuilder":
        protocol, level = protocol_level.split("|", 1)
        return self.add_delete(
            ["protocols", "isis", "redistribute", "ipv4", protocol, level, "metric"]
        )

    def set_redistribute_ipv4_route_map(self, protocol_level: str, route_map: str) -> "IsisBatchBuilder":
        protocol, level = protocol_level.split("|", 1)
        return self.add_set(self.m.get_redistribute_ipv4_route_map_path(protocol, level, route_map))

    def delete_redistribute_ipv4_route_map(self, protocol_level: str) -> "IsisBatchBuilder":
        protocol, level = protocol_level.split("|", 1)
        return self.add_delete(
            ["protocols", "isis", "redistribute", "ipv4", protocol, level, "route-map"]
        )

    # -----------------------------------------------------------------------
    # Default-information originate IPv4
    # -----------------------------------------------------------------------

    def set_default_info_ipv4(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_ipv4_path(level))

    def delete_default_info_ipv4(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_ipv4_path(level))

    def set_default_info_ipv4_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_ipv4_always_path(level))

    def delete_default_info_ipv4_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_ipv4_always_path(level))

    def set_default_info_ipv4_metric(self, level: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_ipv4_metric_path(level, val))

    def delete_default_info_ipv4_metric(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(
            ["protocols", "isis", "default-information", "originate", "ipv4", level, "metric"]
        )

    def set_default_info_ipv4_route_map(self, level: str, route_map: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_ipv4_route_map_path(level, route_map))

    def delete_default_info_ipv4_route_map(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(
            ["protocols", "isis", "default-information", "originate", "ipv4", level, "route-map"]
        )

    # -----------------------------------------------------------------------
    # Segment Routing
    # -----------------------------------------------------------------------

    def set_sr_global_block_low(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_global_block_low_path(val))

    def set_sr_global_block_high(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_global_block_high_path(val))

    def delete_sr_global_block(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_global_block_path())

    def set_sr_local_block_low(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_local_block_low_path(val))

    def set_sr_local_block_high(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_local_block_high_path(val))

    def delete_sr_local_block(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_local_block_path())

    def set_sr_max_label_depth(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_max_label_depth_path(val))

    def delete_sr_max_label_depth(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "segment-routing", "maximum-label-depth"])

    def delete_sr_prefix(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_path(prefix))

    def set_sr_prefix_index(self, prefix: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_index_value_path(prefix, val))

    def set_sr_prefix_index_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_index_explicit_null_path(prefix))

    def delete_sr_prefix_index_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_index_explicit_null_path(prefix))

    def set_sr_prefix_index_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_index_no_php_path(prefix))

    def delete_sr_prefix_index_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_index_no_php_path(prefix))

    def set_sr_prefix_absolute(self, prefix: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_absolute_value_path(prefix, val))

    def set_sr_prefix_absolute_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_absolute_explicit_null_path(prefix))

    def delete_sr_prefix_absolute_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_absolute_explicit_null_path(prefix))

    def set_sr_prefix_absolute_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_absolute_no_php_path(prefix))

    def delete_sr_prefix_absolute_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_absolute_no_php_path(prefix))

    # SRv6 (v1.5+)
    def set_sr_srv6_locator(self, locator: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_srv6_locator_path(locator))

    def delete_sr_srv6(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_srv6_path())

    # -----------------------------------------------------------------------
    # Traffic Engineering
    # -----------------------------------------------------------------------

    def set_te_enable(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_te_enable_path())

    def delete_te_enable(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_te_enable_path())

    def set_te_address(self, addr: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_te_address_path(addr))

    def delete_te_address(self) -> "IsisBatchBuilder":
        return self.add_delete(["protocols", "isis", "traffic-engineering", "address"])

    def delete_te(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_te_path())

    # TE export (v1.5+)
    def set_te_export(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_te_export_path())

    def delete_te_export(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_te_export_path())
