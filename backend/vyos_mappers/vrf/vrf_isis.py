"""
VRF ISIS Command Mapper

Handles command path generation for IS-IS (Intermediate System to Intermediate System)
routing protocol configuration within VRF instances.

Config tree: vrf name <NAME> protocols isis
  advertise-high-metrics
  advertise-passive-only
  area-password (md5/plaintext-password, authenticate-snp: send-only/validate)
  default-information (originate: ipv4/ipv6 x level-1/level-2: always, metric, route-map)
  domain-password (md5/plaintext-password, authenticate-snp: send-only/validate)
  dynamic-hostname
  interface (bfd, bfd-profile, circuit-type, hello-interval, hello-multiplier,
             hello-padding, ldp-sync: holddown, metric, network,
             no-three-way-handshake, passive, password: md5/plaintext-password,
             priority, psnp-interval)
  ldp-sync
  level (all/1/2: lsp-gen-interval, max-lsp-lifetime, spf-interval, purge-originator)
  log-adjacency-changes
  lsp-mtu
  lsp-refresh-interval
  metric-style (narrow/transition/wide)
  net (NET address)
  redistribute (ipv4/ipv6 x protocol: level-1/level-2, metric, route-map)
  segment-routing (global-block, local-block, maximum-label-depth,
                   prefix with index/absolute/explicit-null/no-php-flag)
  set-attached-bit
  set-overload-bit (on-startup)
  spf-delay-ietf (init-delay, long-delay, short-delay, holddown, time-to-learn)
  spf-interval
  topology (ipv4-multicast, ipv4-mgmt, ipv6-unicast)
  traffic-engineering (address-family: ipv4/ipv6, enable, inter-area)
"""

from typing import List


class VrfIsisMapper:
    """Mapper for VRF ISIS paths. Common between VyOS 1.4 and 1.5."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "isis"]

    # ========================================================================
    # ISIS Root
    # ========================================================================

    def get_isis(self, name: str) -> List[str]:
        return self._base(name)

    # ========================================================================
    # Global Flags
    # ========================================================================

    def get_isis_advertise_high_metrics(self, name: str) -> List[str]:
        return self._base(name) + ["advertise-high-metrics"]

    def get_isis_advertise_passive_only(self, name: str) -> List[str]:
        return self._base(name) + ["advertise-passive-only"]

    def get_isis_dynamic_hostname(self, name: str) -> List[str]:
        return self._base(name) + ["dynamic-hostname"]

    def get_isis_log_adjacency_changes(self, name: str) -> List[str]:
        return self._base(name) + ["log-adjacency-changes"]

    def get_isis_set_attached_bit(self, name: str) -> List[str]:
        return self._base(name) + ["set-attached-bit"]

    def get_isis_set_overload_bit(self, name: str) -> List[str]:
        return self._base(name) + ["set-overload-bit"]

    def get_isis_ldp_sync(self, name: str) -> List[str]:
        return self._base(name) + ["ldp-sync"]

    def get_isis_ldp_sync_holddown(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["ldp-sync", "holddown", value]

    def get_isis_purge_originator(self, name: str) -> List[str]:
        return self._base(name) + ["purge-originator"]

    # ========================================================================
    # Global Value Settings
    # ========================================================================

    def get_isis_lsp_mtu(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["lsp-mtu", value]

    def get_isis_lsp_refresh_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["lsp-refresh-interval", value]

    def get_isis_lsp_gen_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["lsp-gen-interval", value]

    def get_isis_max_lsp_lifetime(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["max-lsp-lifetime", value]

    def get_isis_metric_style(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["metric-style", value]

    def get_isis_net(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["net", value]

    def get_isis_spf_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-interval", value]

    def get_isis_set_overload_bit_on_startup(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["set-overload-bit", "on-startup", value]

    # ========================================================================
    # Area Password
    # ========================================================================

    def get_isis_area_password_md5(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["area-password", "md5", value]

    def get_isis_area_password_plaintext_password(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["area-password", "plaintext-password", value]

    def get_isis_area_password_authenticate_snp(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["area-password", "authenticate-snp", value]

    # ========================================================================
    # Domain Password
    # ========================================================================

    def get_isis_domain_password_md5(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["domain-password", "md5", value]

    def get_isis_domain_password_plaintext_password(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["domain-password", "plaintext-password", value]

    def get_isis_domain_password_authenticate_snp(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["domain-password", "authenticate-snp", value]

    # ========================================================================
    # Default Information Originate
    #   default-information originate <af> <level> [always|metric <val>|route-map <val>]
    #   af: ipv4, ipv6
    #   level: level-1, level-2
    # ========================================================================

    def get_isis_default_information_originate(self, name: str, af: str, level: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", af, level]

    def get_isis_default_information_originate_always(self, name: str, af: str, level: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", af, level, "always"]

    def get_isis_default_information_originate_metric(self, name: str, af: str, level: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", af, level, "metric", value]

    def get_isis_default_information_originate_route_map(self, name: str, af: str, level: str, value: str) -> List[str]:
        return self._base(name) + ["default-information", "originate", af, level, "route-map", value]

    # ========================================================================
    # Interface
    #   interface <IFACE> [bfd|bfd-profile|circuit-type|hello-interval|
    #     hello-multiplier|hello-padding|ldp-sync|ldp-sync holddown|
    #     metric|network|no-three-way-handshake|passive|
    #     password md5|password plaintext-password|priority|psnp-interval]
    # ========================================================================

    def get_isis_interface(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface]

    def get_isis_interface_bfd(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd"]

    def get_isis_interface_bfd_profile(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "bfd", "profile", value]

    def get_isis_interface_circuit_type(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "circuit-type", value]

    def get_isis_interface_hello_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-interval", value]

    def get_isis_interface_hello_multiplier(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-multiplier", value]

    def get_isis_interface_hello_padding(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "hello-padding"]

    def get_isis_interface_ldp_sync(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ldp-sync"]

    def get_isis_interface_ldp_sync_holddown(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ldp-sync", "holddown", value]

    def get_isis_interface_metric(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "metric", value]

    def get_isis_interface_network(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "network", value]

    def get_isis_interface_no_three_way_handshake(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "no-three-way-handshake"]

    def get_isis_interface_passive(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "passive"]

    def get_isis_interface_password_md5(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "password", "md5", value]

    def get_isis_interface_password_plaintext_password(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "password", "plaintext-password", value]

    def get_isis_interface_priority(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "priority", value]

    def get_isis_interface_psnp_interval(self, name: str, iface: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "psnp-interval", value]

    # ========================================================================
    # Level Setting
    #   level <LEVEL>   (value leaf: level-1, level-2, level-1-2)
    # ========================================================================

    def get_isis_level(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["level", value]

    # ========================================================================
    # Redistribute
    #   redistribute <af> <protocol> <level> [metric <val>|route-map <val>]
    #   af: ipv4, ipv6
    #   protocol: babel, bgp, connected, isis, kernel, ospf, ospf6, rip, ripng, static
    #   level: level-1, level-2
    # ========================================================================

    def get_isis_redistribute(self, name: str, af: str, protocol: str) -> List[str]:
        return self._base(name) + ["redistribute", af, protocol]

    def get_isis_redistribute_level(self, name: str, af: str, protocol: str, level: str) -> List[str]:
        return self._base(name) + ["redistribute", af, protocol, level]

    def get_isis_redistribute_metric(self, name: str, af: str, protocol: str, level: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", af, protocol, level, "metric", value]

    def get_isis_redistribute_route_map(self, name: str, af: str, protocol: str, level: str, value: str) -> List[str]:
        return self._base(name) + ["redistribute", af, protocol, level, "route-map", value]

    # ========================================================================
    # Fast Reroute (global)
    #   fast-reroute lfa local load-sharing disable [level-1|level-2]
    #   fast-reroute lfa local priority-limit <critical|high|medium> [level-1|level-2]
    #   fast-reroute lfa local tiebreaker <type> index <N> [level-1|level-2]
    #     type: downstream, lowest-backup-metric, node-protecting
    #   fast-reroute lfa remote prefix-list <PL> [level-1|level-2]
    # ========================================================================

    def _fr_lfa(self, name: str) -> List[str]:
        return self._base(name) + ["fast-reroute", "lfa"]

    def get_isis_fr_lfa_local_load_sharing_disable(self, name: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "load-sharing", "disable"]

    def get_isis_fr_lfa_local_load_sharing_disable_level(self, name: str, level: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "load-sharing", "disable", level]

    def get_isis_fr_lfa_local_priority_limit(self, name: str, priority: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "priority-limit", priority]

    def get_isis_fr_lfa_local_priority_limit_level(self, name: str, priority: str, level: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "priority-limit", priority, level]

    def get_isis_fr_lfa_local_tiebreaker_index(self, name: str, tb_type: str, index: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "tiebreaker", tb_type, "index", index]

    def get_isis_fr_lfa_local_tiebreaker_index_level(self, name: str, tb_type: str, index: str, level: str) -> List[str]:
        return self._fr_lfa(name) + ["local", "tiebreaker", tb_type, "index", index, level]

    def get_isis_fr_lfa_remote_prefix_list(self, name: str, prefix_list: str) -> List[str]:
        return self._fr_lfa(name) + ["remote", "prefix-list", prefix_list]

    def get_isis_fr_lfa_remote_prefix_list_level(self, name: str, prefix_list: str, level: str) -> List[str]:
        return self._fr_lfa(name) + ["remote", "prefix-list", prefix_list, level]

    # ========================================================================
    # Interface Fast Reroute / LDP Sync Disable
    # ========================================================================

    def _iface_fr(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "fast-reroute"]

    def get_isis_interface_fr_lfa_level_enable(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["lfa", level, "enable"]

    def get_isis_interface_fr_lfa_level_exclude_interface(self, name: str, iface: str, level: str, exclude: str) -> List[str]:
        return self._iface_fr(name, iface) + ["lfa", level, "exclude", "interface", exclude]

    def get_isis_interface_fr_remote_lfa_level_maximum_metric(self, name: str, iface: str, level: str, value: str) -> List[str]:
        return self._iface_fr(name, iface) + ["remote-lfa", level, "maximum-metric", value]

    def get_isis_interface_fr_remote_lfa_level_tunnel_mpls_ldp(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["remote-lfa", level, "tunnel", "mpls-ldp"]

    def get_isis_interface_fr_ti_lfa_level(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level]

    def get_isis_interface_fr_ti_lfa_level_node_protection(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level, "node-protection"]

    def get_isis_interface_fr_ti_lfa_level_node_protection_link_fallback(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level, "node-protection", "link-fallback"]

    def get_isis_interface_ldp_sync_disable(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "ldp-sync", "disable"]

    # ========================================================================
    # Segment Routing SRv6
    #   segment-routing srv6 interface <IFACE>
    #   segment-routing srv6 node-msd <max-end-d|max-end-pop|max-h-encaps|max-segs-left> <val>
    # ========================================================================

    def get_isis_segment_routing_srv6_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "interface", value]

    def get_isis_segment_routing_srv6_node_msd(self, name: str, msd_type: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "node-msd", msd_type, value]

    # ========================================================================
    # Traffic Engineering address
    # ========================================================================

    def get_isis_traffic_engineering_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "address", value]

    def get_isis_traffic_engineering_export(self, name: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "export"]

    def get_isis_segment_routing_srv6_locator(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "locator", value]

    # ========================================================================
    # Segment Routing
    #   segment-routing global-block <low> <high>
    #   segment-routing local-block <low> <high>
    #   segment-routing maximum-label-depth <val>
    #   segment-routing prefix <PREFIX> index value <val>
    #   segment-routing prefix <PREFIX> index explicit-null
    #   segment-routing prefix <PREFIX> index no-php-flag
    #   segment-routing prefix <PREFIX> absolute value <val>
    #   segment-routing prefix <PREFIX> absolute explicit-null
    #   segment-routing prefix <PREFIX> absolute no-php-flag
    # ========================================================================

    def get_isis_segment_routing_global_block_low(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "global-block", "low-label-value", value]

    def get_isis_segment_routing_global_block_high(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "global-block", "high-label-value", value]

    def get_isis_segment_routing_local_block_low(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "local-block", "low-label-value", value]

    def get_isis_segment_routing_local_block_high(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "local-block", "high-label-value", value]

    def get_isis_segment_routing_maximum_label_depth(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "maximum-label-depth", value]

    def get_isis_segment_routing_prefix_index_value(self, name: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "value", value]

    def get_isis_segment_routing_prefix_index_explicit_null(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "explicit-null"]

    def get_isis_segment_routing_prefix_index_no_php_flag(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "no-php-flag"]

    def get_isis_segment_routing_prefix_absolute_value(self, name: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "absolute", "value", value]

    def get_isis_segment_routing_prefix_absolute_explicit_null(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "absolute", "explicit-null"]

    def get_isis_segment_routing_prefix_absolute_no_php_flag(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "absolute", "no-php-flag"]

    # ========================================================================
    # SPF Delay IETF
    #   spf-delay-ietf init-delay|long-delay|short-delay|holddown|time-to-learn <val>
    # ========================================================================

    def get_isis_spf_delay_ietf_init_delay(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-delay-ietf", "init-delay", value]

    def get_isis_spf_delay_ietf_long_delay(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-delay-ietf", "long-delay", value]

    def get_isis_spf_delay_ietf_short_delay(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-delay-ietf", "short-delay", value]

    def get_isis_spf_delay_ietf_holddown(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-delay-ietf", "holddown", value]

    def get_isis_spf_delay_ietf_time_to_learn(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["spf-delay-ietf", "time-to-learn", value]

    # ========================================================================
    # Topology
    #   topology ipv4-multicast|ipv4-mgmt|ipv6-unicast
    # ========================================================================

    def get_isis_topology(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["topology", value]

    # ========================================================================
    # Traffic Engineering
    #   traffic-engineering enable
    #   traffic-engineering inter-area
    #   traffic-engineering address-family <af>   (ipv4, ipv6)
    # ========================================================================

    def get_isis_traffic_engineering_enable(self, name: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "enable"]

    def get_isis_traffic_engineering_inter_area(self, name: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "inter-area"]

    def get_isis_traffic_engineering_address_family(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "address-family", value]
