"""
IS-IS Batch Builder

Generates VyOS set/delete operations for the IS-IS routing protocol.
All paths come from the IS-IS mapper. Leaves only VyOS 1.5 has go through
``_versioned_path``, which raises ``ValueError`` on a device without them.

Multi-argument batch operations encode their values as "arg1,arg2"
(comma-separated); the router splits them onto the method parameters.
"""

from typing import Any, Dict, List, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.isis.isis import IsisMapper
from vyos_builders.base import BatchBuilder

_FAST_REROUTE = "interface fast-reroute"
_SRV6 = "segment-routing srv6"
_TE_EXPORT = "traffic-engineering export"


class IsisBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "isis"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> IsisMapper:
        return cast(IsisMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a leaf only one VyOS version has; ValueError elsewhere."""
        mapper = self.m
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        nodes = self.m.versioned_nodes()
        lsp_refresh_min, lsp_refresh_max = self.m.lsp_refresh_interval_range()

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
                "interface_fast_reroute": {
                    "supported": _FAST_REROUTE in nodes,
                    "description": "Interface LFA, remote LFA and TI-LFA",
                },
                "srv6": {
                    "supported": _SRV6 in nodes,
                    "description": "SRv6 locator, interface and node MSD",
                },
                "te_export": {
                    "supported": _TE_EXPORT in nodes,
                    "description": "Traffic Engineering Database export",
                },
                "redistribute_nhrp": {
                    "supported": "nhrp" in self.m.redistribute_ipv4_protocols(),
                    "description": "Redistribute NHRP into IS-IS",
                },
                "lfa_priority_limit": {
                    "supported": True,
                    "description": "Global LFA local priority-limit",
                    "values": self.m.lfa_priority_limit_values(),
                },
                "lfa_tiebreaker": {
                    "supported": True,
                    "description": "Global LFA local tiebreaker",
                    "values": self.m.lfa_tiebreaker_values(),
                },
                "lfa_remote_prefix_list": {
                    "supported": True,
                    "description": "Global LFA remote prefix-list",
                },
            },
            "lsp_refresh_interval": {"min": lsp_refresh_min, "max": lsp_refresh_max},
            "area_password_modes": self.m.area_password_modes(),
            "domain_password_modes": self.m.domain_password_modes(),
            "srv6_node_msd_types": self.m.srv6_node_msd_types(),
            "redistribute_protocols": {
                "ipv4": sorted(self.m.redistribute_ipv4_protocols()),
                "ipv6": sorted(self.m.redistribute_ipv6_protocols()),
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
        return self.add_delete(self.m.get_level_delete_path())

    def set_metric_style(self, style: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_metric_style_path(style))

    def delete_metric_style(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_metric_style_delete_path())

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

    def delete_topology(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_topology_delete_path())

    # -----------------------------------------------------------------------
    # Global — timers
    # -----------------------------------------------------------------------

    def set_lsp_mtu(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_mtu_path(val))

    def delete_lsp_mtu(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_lsp_mtu_delete_path())

    def set_lsp_gen_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_gen_interval_path(val))

    def delete_lsp_gen_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_lsp_gen_interval_delete_path())

    def set_lsp_refresh_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_lsp_refresh_interval_path(val))

    def delete_lsp_refresh_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_lsp_refresh_interval_delete_path())

    def set_max_lsp_lifetime(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_max_lsp_lifetime_path(val))

    def delete_max_lsp_lifetime(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_max_lsp_lifetime_delete_path())

    def set_spf_interval(self, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_spf_interval_path(val))

    def delete_spf_interval(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_spf_interval_delete_path())

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

    def delete_area_password_md5(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_area_password_md5_delete_path())

    def set_area_password_plaintext(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_area_password_plaintext_path(pwd))

    def delete_area_password_plaintext(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_area_password_plaintext_delete_path())

    def delete_area_password(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_area_password_path())

    def set_domain_password_md5(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_domain_password_md5_path(pwd))

    def delete_domain_password_md5(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_domain_password_md5_delete_path())

    def set_domain_password_plaintext(self, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_domain_password_plaintext_path(pwd))

    def delete_domain_password_plaintext(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_domain_password_plaintext_delete_path())

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
    # Global — Fast Reroute LFA
    # -----------------------------------------------------------------------

    def set_frr_lfa_load_sharing_disable_level1(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_load_sharing_disable_level1_path())

    def delete_frr_lfa_load_sharing_disable_level1(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_load_sharing_disable_level1_path())

    def set_frr_lfa_load_sharing_disable_level2(self) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_load_sharing_disable_level2_path())

    def delete_frr_lfa_load_sharing_disable_level2(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_load_sharing_disable_level2_path())

    def set_frr_lfa_priority_limit(self, priority: str, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_priority_limit_path(priority, level))

    def delete_frr_lfa_priority_limit(self, priority: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_priority_limit_path(priority, level))

    def set_frr_lfa_tiebreaker_index(
        self, tb_type: str, index: str, level: str
    ) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_tiebreaker_index_path(tb_type, index, level))

    def delete_frr_lfa_tiebreaker_index(
        self, tb_type: str, index: str, level: str
    ) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_tiebreaker_index_path(tb_type, index, level))

    def set_frr_lfa_remote_prefix_list(
        self, prefix_list: str, level: str
    ) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_frr_lfa_remote_prefix_list_path(prefix_list, level))

    def delete_frr_lfa_remote_prefix_list(
        self, prefix_list: str, level: str
    ) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_frr_lfa_remote_prefix_list_path(prefix_list, level))

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
        return self.add_delete(self.m.get_interface_circuit_type_delete_path(iface))

    def set_interface_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_metric_path(iface, val))

    def delete_interface_metric(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_metric_delete_path(iface))

    def set_interface_hello_interval(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_hello_interval_path(iface, val))

    def delete_interface_hello_interval(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_interval_delete_path(iface))

    def set_interface_hello_multiplier(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_hello_multiplier_path(iface, val))

    def delete_interface_hello_multiplier(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_multiplier_delete_path(iface))

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
        return self.add_delete(self.m.get_interface_priority_delete_path(iface))

    def set_interface_psnp_interval(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_psnp_interval_path(iface, val))

    def delete_interface_psnp_interval(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_psnp_interval_delete_path(iface))

    def set_interface_no_three_way_handshake(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_no_three_way_handshake_path(iface))

    def delete_interface_no_three_way_handshake(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_no_three_way_handshake_path(iface))

    # Interface — password
    def set_interface_password_md5(self, iface: str, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_password_md5_path(iface, pwd))

    def delete_interface_password_md5(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_password_md5_delete_path(iface))

    def set_interface_password_plaintext(self, iface: str, pwd: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_password_plaintext_path(iface, pwd))

    def delete_interface_password_plaintext(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_password_plaintext_delete_path(iface))

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
        return self.add_delete(self.m.get_interface_bfd_profile_delete_path(iface))

    # Interface — LDP sync
    def set_interface_ldp_sync_holddown(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ldp_sync_holddown_path(iface, val))

    def delete_interface_ldp_sync_holddown(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_holddown_delete_path(iface))

    def set_interface_ldp_sync_disable(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_interface_ldp_sync_disable_path(iface))

    def delete_interface_ldp_sync_disable(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_disable_path(iface))

    def delete_interface_ldp_sync(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_interface_ldp_sync_path(iface))

    # -----------------------------------------------------------------------
    # Interface — fast-reroute (VyOS 1.5)
    # -----------------------------------------------------------------------

    def set_interface_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level1_path", iface))

    def delete_interface_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level1_path", iface))

    def set_interface_lfa_level1_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level1_exclude_path", iface, excl_iface))

    def delete_interface_lfa_level1_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level1_exclude_path", iface, excl_iface))

    def set_interface_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level2_path", iface))

    def delete_interface_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level2_path", iface))

    def set_interface_lfa_level2_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level2_exclude_path", iface, excl_iface))

    def delete_interface_lfa_level2_exclude(self, iface: str, excl_iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_lfa_level2_exclude_path", iface, excl_iface))

    def set_interface_ti_lfa(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_path", iface))

    def delete_interface_ti_lfa(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_path", iface))

    def set_interface_ti_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_path", iface))

    def delete_interface_ti_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_path", iface))

    def set_interface_ti_lfa_level1_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_node_protection_path", iface))

    def delete_interface_ti_lfa_level1_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_node_protection_path", iface))

    def set_interface_ti_lfa_level1_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_link_fallback_path", iface))

    def delete_interface_ti_lfa_level1_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level1_link_fallback_path", iface))

    def set_interface_ti_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_path", iface))

    def delete_interface_ti_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_path", iface))

    def set_interface_ti_lfa_level2_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_node_protection_path", iface))

    def delete_interface_ti_lfa_level2_node_protection(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_node_protection_path", iface))

    def set_interface_ti_lfa_level2_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_link_fallback_path", iface))

    def delete_interface_ti_lfa_level2_link_fallback(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_ti_lfa_level2_link_fallback_path", iface))

    def set_interface_remote_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_path", iface))

    def delete_interface_remote_lfa_level1(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_path", iface))

    def set_interface_remote_lfa_level1_max_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_max_metric_path", iface, val))

    def delete_interface_remote_lfa_level1_max_metric(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_max_metric_delete_path", iface))

    def set_interface_remote_lfa_level1_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_tunnel_mpls_ldp_path", iface))

    def delete_interface_remote_lfa_level1_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level1_tunnel_mpls_ldp_path", iface))

    def set_interface_remote_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_path", iface))

    def delete_interface_remote_lfa_level2(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_path", iface))

    def set_interface_remote_lfa_level2_max_metric(self, iface: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_max_metric_path", iface, val))

    def delete_interface_remote_lfa_level2_max_metric(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_max_metric_delete_path", iface))

    def set_interface_remote_lfa_level2_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_tunnel_mpls_ldp_path", iface))

    def delete_interface_remote_lfa_level2_tunnel_mpls_ldp(self, iface: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_FAST_REROUTE, "get_interface_remote_lfa_level2_tunnel_mpls_ldp_path", iface))

    # -----------------------------------------------------------------------
    # Redistribute IPv4 / IPv6
    # -----------------------------------------------------------------------

    def set_redistribute_ipv4(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_path("ipv4", protocol, level))

    def delete_redistribute_ipv4(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete_path("ipv4", protocol, level))

    def set_redistribute_ipv4_metric(self, protocol: str, level: str, metric: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_metric_path("ipv4", protocol, level, metric))

    def delete_redistribute_ipv4_metric(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_metric_delete_path("ipv4", protocol, level))

    def set_redistribute_ipv4_route_map(self, protocol: str, level: str, route_map: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map_path("ipv4", protocol, level, route_map))

    def delete_redistribute_ipv4_route_map(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_route_map_delete_path("ipv4", protocol, level))

    def set_redistribute_ipv6(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_path("ipv6", protocol, level))

    def delete_redistribute_ipv6(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_delete_path("ipv6", protocol, level))

    def set_redistribute_ipv6_metric(self, protocol: str, level: str, metric: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_metric_path("ipv6", protocol, level, metric))

    def delete_redistribute_ipv6_metric(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_metric_delete_path("ipv6", protocol, level))

    def set_redistribute_ipv6_route_map(self, protocol: str, level: str, route_map: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_redistribute_route_map_path("ipv6", protocol, level, route_map))

    def delete_redistribute_ipv6_route_map(self, protocol: str, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_redistribute_route_map_delete_path("ipv6", protocol, level))

    # -----------------------------------------------------------------------
    # Default-information originate IPv4 / IPv6
    # -----------------------------------------------------------------------

    def set_default_info_ipv4(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_path("ipv4", level))

    def delete_default_info_ipv4(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_path("ipv4", level))

    def set_default_info_ipv4_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_always_path("ipv4", level))

    def delete_default_info_ipv4_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_always_path("ipv4", level))

    def set_default_info_ipv4_metric(self, level: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_metric_path("ipv4", level, val))

    def delete_default_info_ipv4_metric(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_metric_delete_path("ipv4", level))

    def set_default_info_ipv4_route_map(self, level: str, route_map: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_route_map_path("ipv4", level, route_map))

    def delete_default_info_ipv4_route_map(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_route_map_delete_path("ipv4", level))

    def set_default_info_ipv6(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_path("ipv6", level))

    def delete_default_info_ipv6(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_path("ipv6", level))

    def set_default_info_ipv6_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_always_path("ipv6", level))

    def delete_default_info_ipv6_always(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_always_path("ipv6", level))

    def set_default_info_ipv6_metric(self, level: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_metric_path("ipv6", level, val))

    def delete_default_info_ipv6_metric(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_metric_delete_path("ipv6", level))

    def set_default_info_ipv6_route_map(self, level: str, route_map: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_default_info_route_map_path("ipv6", level, route_map))

    def delete_default_info_ipv6_route_map(self, level: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_default_info_route_map_delete_path("ipv6", level))

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
        return self.add_delete(self.m.get_sr_max_label_depth_delete_path())

    def delete_sr_prefix(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_path(prefix))

    def set_sr_prefix_index(self, prefix: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_index_value_path(prefix, val))

    def delete_sr_prefix_index(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_index_path(prefix))

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

    def delete_sr_prefix_absolute(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_absolute_path(prefix))

    def set_sr_prefix_absolute_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_absolute_explicit_null_path(prefix))

    def delete_sr_prefix_absolute_explicit_null(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_absolute_explicit_null_path(prefix))

    def set_sr_prefix_absolute_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_set(self.m.get_sr_prefix_absolute_no_php_path(prefix))

    def delete_sr_prefix_absolute_no_php(self, prefix: str) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_sr_prefix_absolute_no_php_path(prefix))

    # -----------------------------------------------------------------------
    # Segment Routing SRv6 (VyOS 1.5)
    # -----------------------------------------------------------------------

    def delete_sr_srv6(self) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_SRV6, "get_sr_srv6_path"))

    def set_sr_srv6_locator(self, locator: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_SRV6, "get_sr_srv6_locator_path", locator))

    def delete_sr_srv6_locator(self) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_SRV6, "get_sr_srv6_locator_delete_path"))

    def set_sr_srv6_interface(self, iface: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_SRV6, "get_sr_srv6_interface_path", iface))

    def delete_sr_srv6_interface(self) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_SRV6, "get_sr_srv6_interface_delete_path"))

    def set_sr_srv6_node_msd(self, msd_type: str, val: str) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_SRV6, "get_sr_srv6_node_msd_path", msd_type, val))

    def delete_sr_srv6_node_msd(self, msd_type: str) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_SRV6, "get_sr_srv6_node_msd_delete_path", msd_type))

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
        return self.add_delete(self.m.get_te_address_delete_path())

    def delete_te(self) -> "IsisBatchBuilder":
        return self.add_delete(self.m.get_te_path())

    def set_te_export(self) -> "IsisBatchBuilder":
        return self.add_set(self._versioned_path(_TE_EXPORT, "get_te_export_path"))

    def delete_te_export(self) -> "IsisBatchBuilder":
        return self.add_delete(self._versioned_path(_TE_EXPORT, "get_te_export_path"))
