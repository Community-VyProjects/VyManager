"""
IS-IS Mapper — Base paths (common to all VyOS versions)

All IS-IS configuration lives under protocols/isis.
Version-specific additions (TI-LFA, Remote-LFA, SRv6, TE export) are in
isis_versions/v1_4.py and isis_versions/v1_5.py.
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["protocols", "isis"]


class IsisMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

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

    # -----------------------------------------------------------------------
    # Global — basic scalars
    # -----------------------------------------------------------------------

    def get_level_path(self, level: str) -> List[str]:
        return BASE + ["level", level]

    def get_metric_style_path(self, style: str) -> List[str]:
        return BASE + ["metric-style", style]

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

    # -----------------------------------------------------------------------
    # Global — timers / LSP
    # -----------------------------------------------------------------------

    def get_lsp_mtu_path(self, val: str) -> List[str]:
        return BASE + ["lsp-mtu", val]

    def get_lsp_gen_interval_path(self, val: str) -> List[str]:
        return BASE + ["lsp-gen-interval", val]

    def get_lsp_refresh_interval_path(self, val: str) -> List[str]:
        return BASE + ["lsp-refresh-interval", val]

    def get_max_lsp_lifetime_path(self, val: str) -> List[str]:
        return BASE + ["max-lsp-lifetime", val]

    def get_spf_interval_path(self, val: str) -> List[str]:
        return BASE + ["spf-interval", val]

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

    def get_area_password_plaintext_path(self, pwd: str) -> List[str]:
        return BASE + ["area-password", "plaintext-password", pwd]

    def get_area_password_path(self) -> List[str]:
        return BASE + ["area-password"]

    def get_domain_password_md5_path(self, pwd: str) -> List[str]:
        return BASE + ["domain-password", "md5", pwd]

    def get_domain_password_plaintext_path(self, pwd: str) -> List[str]:
        return BASE + ["domain-password", "plaintext-password", pwd]

    def get_domain_password_path(self) -> List[str]:
        return BASE + ["domain-password"]

    # -----------------------------------------------------------------------
    # Global — LDP sync
    # -----------------------------------------------------------------------

    def get_ldp_sync_holddown_path(self, val: str) -> List[str]:
        return BASE + ["ldp-sync", "holddown", val]

    def get_ldp_sync_path(self) -> List[str]:
        return BASE + ["ldp-sync"]

    # -----------------------------------------------------------------------
    # Global — Fast Reroute (LFA load-sharing)
    # -----------------------------------------------------------------------

    def get_frr_lfa_load_sharing_disable_level1_path(self) -> List[str]:
        return BASE + ["fast-reroute", "lfa", "local", "load-sharing", "disable", "level-1"]

    def get_frr_lfa_load_sharing_disable_level2_path(self) -> List[str]:
        return BASE + ["fast-reroute", "lfa", "local", "load-sharing", "disable", "level-2"]

    # -----------------------------------------------------------------------
    # Interface
    # -----------------------------------------------------------------------

    def get_interface_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_circuit_type_path(self, iface: str, circuit_type: str) -> List[str]:
        return BASE + ["interface", iface, "circuit-type", circuit_type]

    def get_interface_metric_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "metric", val]

    def get_interface_hello_interval_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "hello-interval", val]

    def get_interface_hello_multiplier_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "hello-multiplier", val]

    def get_interface_hello_padding_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "hello-padding"]

    def get_interface_passive_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "passive"]

    def get_interface_point_to_point_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "network", "point-to-point"]

    def get_interface_priority_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "priority", val]

    def get_interface_psnp_interval_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "psnp-interval", val]

    def get_interface_no_three_way_handshake_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "no-three-way-handshake"]

    # Interface — password
    def get_interface_password_md5_path(self, iface: str, pwd: str) -> List[str]:
        return BASE + ["interface", iface, "password", "md5", pwd]

    def get_interface_password_plaintext_path(self, iface: str, pwd: str) -> List[str]:
        return BASE + ["interface", iface, "password", "plaintext-password", pwd]

    def get_interface_password_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "password"]

    # Interface — BFD
    def get_interface_bfd_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "bfd"]

    def get_interface_bfd_profile_path(self, iface: str, profile: str) -> List[str]:
        return BASE + ["interface", iface, "bfd", "profile", profile]

    # Interface — LDP sync
    def get_interface_ldp_sync_holddown_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "ldp-sync", "holddown", val]

    def get_interface_ldp_sync_disable_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "ldp-sync", "disable"]

    def get_interface_ldp_sync_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "ldp-sync"]

    # Interface — LFA (both versions)
    def get_interface_lfa_level1_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "lfa", "level-1", "enable"]

    def get_interface_lfa_level1_exclude_path(self, iface: str, excl_iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "lfa", "level-1", "exclude", "interface", excl_iface]

    def get_interface_lfa_level2_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "lfa", "level-2", "enable"]

    def get_interface_lfa_level2_exclude_path(self, iface: str, excl_iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "lfa", "level-2", "exclude", "interface", excl_iface]

    # -----------------------------------------------------------------------
    # Redistribute IPv4
    # -----------------------------------------------------------------------

    def get_redistribute_ipv4_path(self, protocol: str, level: str) -> List[str]:
        return BASE + ["redistribute", "ipv4", protocol, level]

    def get_redistribute_ipv4_metric_path(self, protocol: str, level: str, val: str) -> List[str]:
        return BASE + ["redistribute", "ipv4", protocol, level, "metric", val]

    def get_redistribute_ipv4_route_map_path(self, protocol: str, level: str, route_map: str) -> List[str]:
        return BASE + ["redistribute", "ipv4", protocol, level, "route-map", route_map]

    # -----------------------------------------------------------------------
    # Default-information originate IPv4
    # -----------------------------------------------------------------------

    def get_default_info_ipv4_path(self, level: str) -> List[str]:
        return BASE + ["default-information", "originate", "ipv4", level]

    def get_default_info_ipv4_always_path(self, level: str) -> List[str]:
        return BASE + ["default-information", "originate", "ipv4", level, "always"]

    def get_default_info_ipv4_metric_path(self, level: str, val: str) -> List[str]:
        return BASE + ["default-information", "originate", "ipv4", level, "metric", val]

    def get_default_info_ipv4_route_map_path(self, level: str, route_map: str) -> List[str]:
        return BASE + ["default-information", "originate", "ipv4", level, "route-map", route_map]

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

    def get_sr_prefix_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix]

    def get_sr_prefix_index_value_path(self, prefix: str, val: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "index", "value", val]

    def get_sr_prefix_index_explicit_null_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "index", "explicit-null"]

    def get_sr_prefix_index_no_php_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "index", "no-php-flag"]

    def get_sr_prefix_absolute_value_path(self, prefix: str, val: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "absolute", "value", val]

    def get_sr_prefix_absolute_explicit_null_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "absolute", "explicit-null"]

    def get_sr_prefix_absolute_no_php_path(self, prefix: str) -> List[str]:
        return BASE + ["segment-routing", "prefix", prefix, "absolute", "no-php-flag"]

    # -----------------------------------------------------------------------
    # Traffic Engineering
    # -----------------------------------------------------------------------

    def get_te_enable_path(self) -> List[str]:
        return BASE + ["traffic-engineering", "enable"]

    def get_te_address_path(self, addr: str) -> List[str]:
        return BASE + ["traffic-engineering", "address", addr]

    def get_te_path(self) -> List[str]:
        return BASE + ["traffic-engineering"]
