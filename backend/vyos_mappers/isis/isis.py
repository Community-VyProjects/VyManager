"""
IS-IS Mapper — paths both VyOS 1.4 and 1.5 have.

All IS-IS configuration lives under ``protocols isis``. Interface
fast-reroute, segment-routing srv6, traffic-engineering export and
redistribute ipv4 nhrp exist only on VyOS 1.5; the subclass in
``isis_versions`` adds them.
"""

from typing import Any, Dict, FrozenSet, List, Tuple

from ..base import BaseFeatureMapper

BASE = ["protocols", "isis"]


class IsisMapper(BaseFeatureMapper):
    """Mapper for the IS-IS paths both VyOS 1.4 and 1.5 have."""

    # ``redistribute <af> <protocol>`` both labs have.
    _REDIST_IPV4 = frozenset({"babel", "bgp", "connected", "kernel", "ospf", "rip", "static"})
    _REDIST_IPV6 = frozenset({"babel", "bgp", "connected", "kernel", "ospf6", "ripng", "static"})

    # Version-only nodes, each with the path methods below it. The methods
    # live on the version subclass; the builder calls ``require_node`` before
    # it looks one up.
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        "interface fast-reroute": (
            "get_interface_lfa_level1_path",
            "get_interface_lfa_level1_exclude_path",
            "get_interface_lfa_level2_path",
            "get_interface_lfa_level2_exclude_path",
            "get_interface_remote_lfa_level1_path",
            "get_interface_remote_lfa_level1_max_metric_path",
            "get_interface_remote_lfa_level1_max_metric_delete_path",
            "get_interface_remote_lfa_level1_tunnel_mpls_ldp_path",
            "get_interface_remote_lfa_level2_path",
            "get_interface_remote_lfa_level2_max_metric_path",
            "get_interface_remote_lfa_level2_max_metric_delete_path",
            "get_interface_remote_lfa_level2_tunnel_mpls_ldp_path",
            "get_interface_ti_lfa_path",
            "get_interface_ti_lfa_level1_path",
            "get_interface_ti_lfa_level1_node_protection_path",
            "get_interface_ti_lfa_level1_link_fallback_path",
            "get_interface_ti_lfa_level2_path",
            "get_interface_ti_lfa_level2_node_protection_path",
            "get_interface_ti_lfa_level2_link_fallback_path",
        ),
        "segment-routing srv6": (
            "get_sr_srv6_path",
            "get_sr_srv6_locator_path",
            "get_sr_srv6_locator_delete_path",
            "get_sr_srv6_interface_path",
            "get_sr_srv6_interface_delete_path",
            "get_sr_srv6_node_msd_path",
            "get_sr_srv6_node_msd_delete_path",
        ),
        "traffic-engineering export": ("get_te_export_path",),
    }

    # -----------------------------------------------------------------------
    # Core
    # -----------------------------------------------------------------------

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only nodes this device has.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"{node} is not supported on this device")

    def parse_config(self, full_config: Any) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_isis_config

        return parse_isis_config(self, full_config)

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return self._REDIST_IPV4

    def redistribute_ipv6_protocols(self) -> FrozenSet[str]:
        return self._REDIST_IPV6

    def _redistribute_protocols(self, af: str) -> FrozenSet[str]:
        if af == "ipv4":
            return self.redistribute_ipv4_protocols()
        if af == "ipv6":
            return self.redistribute_ipv6_protocols()
        raise ValueError(f"unknown IS-IS redistribute address family {af}")

    def _require_redistribute(self, af: str, protocol: str) -> None:
        if protocol not in self._redistribute_protocols(af):
            raise ValueError(
                f"redistribute {protocol} is not supported on this device")

    def lfa_priority_limit_values(self) -> List[str]:
        """``fast-reroute lfa local priority-limit`` children."""
        return ["critical", "high", "medium"]

    def lfa_tiebreaker_values(self) -> List[str]:
        """``fast-reroute lfa local tiebreaker`` children."""
        return ["downstream", "lowest-backup-metric", "node-protecting"]

    def lsp_refresh_interval_range(self) -> Tuple[int, int]:
        """``lsp-refresh-interval`` val_help bounds."""
        return (1, 65235)

    def area_password_modes(self) -> List[str]:
        """``area-password`` children this device commits (one at a time)."""
        return ["md5", "plaintext-password"]

    def domain_password_modes(self) -> List[str]:
        """``domain-password`` children this device commits (one at a time).

        The 1.4 FRR template renders ``domain-password md5`` from the
        plaintext-password value, so an md5 domain password never commits
        there.
        """
        return ["plaintext-password"]

    def _require_domain_password_mode(self, mode: str) -> None:
        if mode not in self.domain_password_modes():
            raise ValueError(f"domain-password {mode} is not supported on this device")

    def srv6_node_msd_types(self) -> List[str]:
        """``segment-routing srv6 node-msd`` children; none on 1.4."""
        return []

    def lsp_timer_defaults(self) -> Dict[str, int]:
        """FRR defaults for the LSP timers (the same on both labs)."""
        return {"lsp_gen_interval": 30, "lsp_refresh_interval": 900, "max_lsp_lifetime": 1200}

    def lsp_timer_checks(self) -> bool:
        """Whether verify cross-checks the LSP timers.

        1.5 verify rejects ``lsp-gen-interval >= lsp-refresh-interval`` and
        ``max-lsp-lifetime < lsp-refresh-interval + 300``, filling unset
        timers with ``lsp_timer_defaults``. 1.4 verify has neither check.
        """
        return False

    @staticmethod
    def _require_choice(kind: str, value: str, allowed: List[str]) -> None:
        if value not in allowed:
            raise ValueError(f"{kind} {value} is not supported on this device")

    # -----------------------------------------------------------------------
    # Delete the entire IS-IS process
    # -----------------------------------------------------------------------

    def get_isis_path(self) -> List[str]:
        return list(BASE)

    # -----------------------------------------------------------------------
    # Global — NET
    # -----------------------------------------------------------------------

    def get_net_path(self, net: str) -> List[str]:
        return BASE + ["net", net]

    def get_net_delete_path(self) -> List[str]:
        return BASE + ["net"]

    # -----------------------------------------------------------------------
    # Global — basic scalars
    # -----------------------------------------------------------------------

    def get_level_path(self, level: str) -> List[str]:
        return BASE + ["level", level]

    def get_level_delete_path(self) -> List[str]:
        return BASE + ["level"]

    def get_metric_style_path(self, style: str) -> List[str]:
        return BASE + ["metric-style", style]

    def get_metric_style_delete_path(self) -> List[str]:
        return BASE + ["metric-style"]

    def get_dynamic_hostname_path(self) -> List[str]:
        return BASE + ["dynamic-hostname"]

    def get_purge_originator_path(self) -> List[str]:
        return BASE + ["purge-originator"]

    def get_advertise_passive_only_path(self) -> List[str]:
        return BASE + ["advertise-passive-only"]

    def get_advertise_high_metrics_path(self) -> List[str]:
        return BASE + ["advertise-high-metrics"]

    def get_set_attached_bit_path(self) -> List[str]:
        return BASE + ["set-attached-bit"]

    def get_set_overload_bit_path(self) -> List[str]:
        return BASE + ["set-overload-bit"]

    def get_log_adjacency_changes_path(self) -> List[str]:
        return BASE + ["log-adjacency-changes"]

    def get_topology_path(self, topology: str) -> List[str]:
        return BASE + ["topology", topology]

    def get_topology_delete_path(self) -> List[str]:
        return BASE + ["topology"]

    # -----------------------------------------------------------------------
    # Global — timers / LSP
    # -----------------------------------------------------------------------

    def get_lsp_mtu_path(self, val: str) -> List[str]:
        return BASE + ["lsp-mtu", val]

    def get_lsp_mtu_delete_path(self) -> List[str]:
        return BASE + ["lsp-mtu"]

    def get_lsp_gen_interval_path(self, val: str) -> List[str]:
        return BASE + ["lsp-gen-interval", val]

    def get_lsp_gen_interval_delete_path(self) -> List[str]:
        return BASE + ["lsp-gen-interval"]

    def get_lsp_refresh_interval_path(self, val: str) -> List[str]:
        return BASE + ["lsp-refresh-interval", val]

    def get_lsp_refresh_interval_delete_path(self) -> List[str]:
        return BASE + ["lsp-refresh-interval"]

    def get_max_lsp_lifetime_path(self, val: str) -> List[str]:
        return BASE + ["max-lsp-lifetime", val]

    def get_max_lsp_lifetime_delete_path(self) -> List[str]:
        return BASE + ["max-lsp-lifetime"]

    def get_spf_interval_path(self, val: str) -> List[str]:
        return BASE + ["spf-interval", val]

    def get_spf_interval_delete_path(self) -> List[str]:
        return BASE + ["spf-interval"]

    # -----------------------------------------------------------------------
    # Global — SPF Delay IETF
    # -----------------------------------------------------------------------

    def get_spf_delay_ietf_path(self) -> List[str]:
        return BASE + ["spf-delay-ietf"]

    def get_spf_delay_ietf_init_delay_path(self, val: str) -> List[str]:
        return BASE + ["spf-delay-ietf", "init-delay", val]

    def get_spf_delay_ietf_short_delay_path(self, val: str) -> List[str]:
        return BASE + ["spf-delay-ietf", "short-delay", val]

    def get_spf_delay_ietf_long_delay_path(self, val: str) -> List[str]:
        return BASE + ["spf-delay-ietf", "long-delay", val]

    def get_spf_delay_ietf_holddown_path(self, val: str) -> List[str]:
        return BASE + ["spf-delay-ietf", "holddown", val]

    def get_spf_delay_ietf_time_to_learn_path(self, val: str) -> List[str]:
        return BASE + ["spf-delay-ietf", "time-to-learn", val]

    # -----------------------------------------------------------------------
    # Global — passwords
    # -----------------------------------------------------------------------

    def get_area_password_md5_path(self, pwd: str) -> List[str]:
        return BASE + ["area-password", "md5", pwd]

    def get_area_password_md5_delete_path(self) -> List[str]:
        return BASE + ["area-password", "md5"]

    def get_area_password_plaintext_path(self, pwd: str) -> List[str]:
        return BASE + ["area-password", "plaintext-password", pwd]

    def get_area_password_plaintext_delete_path(self) -> List[str]:
        return BASE + ["area-password", "plaintext-password"]

    def get_area_password_path(self) -> List[str]:
        return BASE + ["area-password"]

    def get_domain_password_md5_path(self, pwd: str) -> List[str]:
        self._require_domain_password_mode("md5")
        return BASE + ["domain-password", "md5", pwd]

    def get_domain_password_md5_delete_path(self) -> List[str]:
        return BASE + ["domain-password", "md5"]

    def get_domain_password_plaintext_path(self, pwd: str) -> List[str]:
        return BASE + ["domain-password", "plaintext-password", pwd]

    def get_domain_password_plaintext_delete_path(self) -> List[str]:
        return BASE + ["domain-password", "plaintext-password"]

    def get_domain_password_path(self) -> List[str]:
        return BASE + ["domain-password"]

    # -----------------------------------------------------------------------
    # Global — LDP sync
    # -----------------------------------------------------------------------

    def get_ldp_sync_holddown_path(self, val: str) -> List[str]:
        return BASE + ["ldp-sync", "holddown", val]

    def get_ldp_sync_holddown_delete_path(self) -> List[str]:
        return BASE + ["ldp-sync", "holddown"]

    def get_ldp_sync_path(self) -> List[str]:
        return BASE + ["ldp-sync"]

    # -----------------------------------------------------------------------
    # Global — Fast Reroute (LFA load-sharing, priority-limit, tiebreaker, remote)
    # -----------------------------------------------------------------------

    def get_frr_lfa_load_sharing_disable_path(self) -> List[str]:
        """Bare ``load-sharing disable``: FRR disables it on every level."""
        return BASE + ["fast-reroute", "lfa", "local", "load-sharing", "disable"]

    def get_frr_lfa_load_sharing_disable_level1_path(self) -> List[str]:
        return self.get_frr_lfa_load_sharing_disable_path() + ["level-1"]

    def get_frr_lfa_load_sharing_disable_level2_path(self) -> List[str]:
        return self.get_frr_lfa_load_sharing_disable_path() + ["level-2"]

    def get_frr_lfa_priority_limit_name_path(self, priority: str) -> List[str]:
        """``priority-limit <priority>``; deleting its last level leaves this bare node."""
        self._require_choice("priority-limit", priority, self.lfa_priority_limit_values())
        return BASE + ["fast-reroute", "lfa", "local", "priority-limit", priority]

    def get_frr_lfa_priority_limit_path(self, priority: str, level: str) -> List[str]:
        return self.get_frr_lfa_priority_limit_name_path(priority) + [level]

    def get_frr_lfa_tiebreaker_index_name_path(self, tb_type: str, index: str) -> List[str]:
        """``tiebreaker <type> index <n>``; a bare one still holds index n in verify."""
        self._require_choice("tiebreaker", tb_type, self.lfa_tiebreaker_values())
        return BASE + ["fast-reroute", "lfa", "local", "tiebreaker", tb_type, "index", index]

    def get_frr_lfa_tiebreaker_index_path(
        self, tb_type: str, index: str, level: str
    ) -> List[str]:
        return self.get_frr_lfa_tiebreaker_index_name_path(tb_type, index) + [level]

    def get_frr_lfa_remote_prefix_list_name_path(self, prefix_list: str) -> List[str]:
        """Bare ``remote prefix-list <name>``: FRR applies it on every level."""
        return BASE + ["fast-reroute", "lfa", "remote", "prefix-list", prefix_list]

    def get_frr_lfa_remote_prefix_list_path(self, prefix_list: str, level: str) -> List[str]:
        return self.get_frr_lfa_remote_prefix_list_name_path(prefix_list) + [level]

    # -----------------------------------------------------------------------
    # Interface
    # -----------------------------------------------------------------------

    def _interface(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_path(self, iface: str) -> List[str]:
        return self._interface(iface)

    def get_interface_circuit_type_path(self, iface: str, circuit_type: str) -> List[str]:
        return self._interface(iface) + ["circuit-type", circuit_type]

    def get_interface_circuit_type_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["circuit-type"]

    def get_interface_metric_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["metric", val]

    def get_interface_metric_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["metric"]

    def get_interface_hello_interval_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["hello-interval", val]

    def get_interface_hello_interval_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["hello-interval"]

    def get_interface_hello_multiplier_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["hello-multiplier", val]

    def get_interface_hello_multiplier_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["hello-multiplier"]

    def get_interface_hello_padding_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["hello-padding"]

    def get_interface_passive_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["passive"]

    def get_interface_point_to_point_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["network", "point-to-point"]

    def get_interface_priority_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["priority", val]

    def get_interface_priority_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["priority"]

    def get_interface_psnp_interval_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["psnp-interval", val]

    def get_interface_psnp_interval_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["psnp-interval"]

    def get_interface_no_three_way_handshake_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["no-three-way-handshake"]

    # Interface — password
    def get_interface_password_md5_path(self, iface: str, pwd: str) -> List[str]:
        return self._interface(iface) + ["password", "md5", pwd]

    def get_interface_password_md5_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["password", "md5"]

    def get_interface_password_plaintext_path(self, iface: str, pwd: str) -> List[str]:
        return self._interface(iface) + ["password", "plaintext-password", pwd]

    def get_interface_password_plaintext_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["password", "plaintext-password"]

    def get_interface_password_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["password"]

    # Interface — BFD
    def get_interface_bfd_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd"]

    def get_interface_bfd_profile_path(self, iface: str, profile: str) -> List[str]:
        return self._interface(iface) + ["bfd", "profile", profile]

    def get_interface_bfd_profile_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["bfd", "profile"]

    # Interface — LDP sync
    def get_interface_ldp_sync_holddown_path(self, iface: str, val: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync", "holddown", val]

    def get_interface_ldp_sync_holddown_delete_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync", "holddown"]

    def get_interface_ldp_sync_disable_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync", "disable"]

    def get_interface_ldp_sync_path(self, iface: str) -> List[str]:
        return self._interface(iface) + ["ldp-sync"]

    # -----------------------------------------------------------------------
    # Redistribute IPv4 / IPv6
    # Sets check the protocol allowlist. Deletes check only the address
    # family, so a protocol this device no longer lists stays deletable.
    # -----------------------------------------------------------------------

    def _redistribute(self, af: str, protocol: str, level: str) -> List[str]:
        self._redistribute_protocols(af)
        return BASE + ["redistribute", af, protocol, level]

    def get_redistribute_path(self, af: str, protocol: str, level: str) -> List[str]:
        self._require_redistribute(af, protocol)
        return self._redistribute(af, protocol, level)

    def get_redistribute_delete_path(self, af: str, protocol: str, level: str) -> List[str]:
        return self._redistribute(af, protocol, level)

    def get_redistribute_metric_path(self, af: str, protocol: str, level: str, val: str) -> List[str]:
        self._require_redistribute(af, protocol)
        return self._redistribute(af, protocol, level) + ["metric", val]

    def get_redistribute_metric_delete_path(self, af: str, protocol: str, level: str) -> List[str]:
        return self._redistribute(af, protocol, level) + ["metric"]

    def get_redistribute_route_map_path(self, af: str, protocol: str, level: str, route_map: str) -> List[str]:
        self._require_redistribute(af, protocol)
        return self._redistribute(af, protocol, level) + ["route-map", route_map]

    def get_redistribute_route_map_delete_path(self, af: str, protocol: str, level: str) -> List[str]:
        return self._redistribute(af, protocol, level) + ["route-map"]

    # -----------------------------------------------------------------------
    # Default-information originate IPv4 / IPv6
    # -----------------------------------------------------------------------

    def get_default_info_path(self, af: str, level: str) -> List[str]:
        if af not in ("ipv4", "ipv6"):
            raise ValueError(f"unknown IS-IS default-information address family {af}")
        return BASE + ["default-information", "originate", af, level]

    def get_default_info_always_path(self, af: str, level: str) -> List[str]:
        return self.get_default_info_path(af, level) + ["always"]

    def get_default_info_metric_path(self, af: str, level: str, val: str) -> List[str]:
        return self.get_default_info_path(af, level) + ["metric", val]

    def get_default_info_metric_delete_path(self, af: str, level: str) -> List[str]:
        return self.get_default_info_path(af, level) + ["metric"]

    def get_default_info_route_map_path(self, af: str, level: str, route_map: str) -> List[str]:
        return self.get_default_info_path(af, level) + ["route-map", route_map]

    def get_default_info_route_map_delete_path(self, af: str, level: str) -> List[str]:
        return self.get_default_info_path(af, level) + ["route-map"]

    # -----------------------------------------------------------------------
    # Segment Routing
    # -----------------------------------------------------------------------

    def get_sr_global_block_low_path(self, val: str) -> List[str]:
        return BASE + ["segment-routing", "global-block", "low-label-value", val]

    def get_sr_global_block_high_path(self, val: str) -> List[str]:
        return BASE + ["segment-routing", "global-block", "high-label-value", val]

    def get_sr_global_block_path(self) -> List[str]:
        return BASE + ["segment-routing", "global-block"]

    def get_sr_local_block_low_path(self, val: str) -> List[str]:
        return BASE + ["segment-routing", "local-block", "low-label-value", val]

    def get_sr_local_block_high_path(self, val: str) -> List[str]:
        return BASE + ["segment-routing", "local-block", "high-label-value", val]

    def get_sr_local_block_path(self) -> List[str]:
        return BASE + ["segment-routing", "local-block"]

    def get_sr_max_label_depth_path(self, val: str) -> List[str]:
        return BASE + ["segment-routing", "maximum-label-depth", val]

    def get_sr_max_label_depth_delete_path(self) -> List[str]:
        return BASE + ["segment-routing", "maximum-label-depth"]

    def get_sr_prefix_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix]

    def get_sr_prefix_index_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_path(prefix) + ["index"]

    def get_sr_prefix_index_value_path(self, prefix: str, val: str) -> List[str]:
        return self.get_sr_prefix_index_path(prefix) + ["value", val]

    def get_sr_prefix_index_explicit_null_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_index_path(prefix) + ["explicit-null"]

    def get_sr_prefix_index_no_php_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_index_path(prefix) + ["no-php-flag"]

    def get_sr_prefix_absolute_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_path(prefix) + ["absolute"]

    def get_sr_prefix_absolute_value_path(self, prefix: str, val: str) -> List[str]:
        return self.get_sr_prefix_absolute_path(prefix) + ["value", val]

    def get_sr_prefix_absolute_explicit_null_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_absolute_path(prefix) + ["explicit-null"]

    def get_sr_prefix_absolute_no_php_path(self, prefix: str) -> List[str]:
        return self.get_sr_prefix_absolute_path(prefix) + ["no-php-flag"]

    # -----------------------------------------------------------------------
    # Traffic Engineering
    # -----------------------------------------------------------------------

    def get_te_path(self) -> List[str]:
        return BASE + ["traffic-engineering"]

    def get_te_enable_path(self) -> List[str]:
        return BASE + ["traffic-engineering", "enable"]

    def get_te_address_path(self, addr: str) -> List[str]:
        return BASE + ["traffic-engineering", "address", addr]

    def get_te_address_delete_path(self) -> List[str]:
        return BASE + ["traffic-engineering", "address"]
