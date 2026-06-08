// Declarative field schemas for VRF protocol/service global settings.
// Each `op` must have matching backend `set_<op>` / `delete_<op>` batch methods.

import { SectionSpec } from "./types";

export const ISIS_SCHEMA: SectionSpec[] = [
  {
    title: "General",
    fields: [
      { op: "vrf_isis_net", label: "NET", type: "text", path: ["net"], placeholder: "49.0001.1921.6800.1002.00" },
      { op: "vrf_isis_level", label: "Level", type: "select", path: ["level"], options: [
        { value: "level-1", label: "Level 1" }, { value: "level-2", label: "Level 2" }, { value: "level-1-2", label: "Level 1-2" },
      ] },
      { op: "vrf_isis_metric_style", label: "Metric style", type: "select", path: ["metric-style"], options: [
        { value: "narrow", label: "Narrow" }, { value: "transition", label: "Transition" }, { value: "wide", label: "Wide" },
      ] },
      { op: "vrf_isis_topology", label: "Topology", type: "select", path: ["topology"], options: [
        { value: "ipv4-multicast", label: "IPv4 multicast" }, { value: "ipv4-mgmt", label: "IPv4 mgmt" }, { value: "ipv6-unicast", label: "IPv6 unicast" },
      ] },
      { op: "vrf_isis_dynamic_hostname", label: "Dynamic hostname", type: "toggle", path: ["dynamic-hostname"] },
      { op: "vrf_isis_log_adjacency_changes", label: "Log adjacency changes", type: "toggle", path: ["log-adjacency-changes"] },
      { op: "vrf_isis_advertise_high_metrics", label: "Advertise high metrics", type: "toggle", path: ["advertise-high-metrics"] },
      { op: "vrf_isis_advertise_passive_only", label: "Advertise passive only", type: "toggle", path: ["advertise-passive-only"] },
      { op: "vrf_isis_set_attached_bit", label: "Set attached bit", type: "toggle", path: ["set-attached-bit"] },
      { op: "vrf_isis_set_overload_bit", label: "Set overload bit", type: "toggle", path: ["set-overload-bit"] },
      { op: "vrf_isis_set_overload_bit_on_startup", label: "Overload bit on startup (s)", type: "number", path: ["set-overload-bit", "on-startup"] },
    ],
  },
  {
    title: "Timers & LSP",
    fields: [
      { op: "vrf_isis_lsp_mtu", label: "LSP MTU", type: "number", path: ["lsp-mtu"] },
      { op: "vrf_isis_lsp_refresh_interval", label: "LSP refresh interval", type: "number", path: ["lsp-refresh-interval"] },
      { op: "vrf_isis_lsp_gen_interval", label: "LSP gen interval", type: "number", path: ["lsp-gen-interval"] },
      { op: "vrf_isis_max_lsp_lifetime", label: "Max LSP lifetime", type: "number", path: ["max-lsp-lifetime"] },
      { op: "vrf_isis_spf_interval", label: "SPF interval", type: "number", path: ["spf-interval"] },
      { op: "vrf_isis_purge_originator", label: "Purge originator", type: "toggle", path: ["purge-originator"] },
      { op: "vrf_isis_ldp_sync", label: "LDP sync", type: "toggle", path: ["ldp-sync"] },
      { op: "vrf_isis_ldp_sync_holddown", label: "LDP sync holddown", type: "number", path: ["ldp-sync", "holddown"] },
    ],
  },
  {
    title: "SPF delay (IETF)",
    fields: [
      { op: "vrf_isis_spf_delay_ietf_init_delay", label: "Init delay", type: "number", path: ["spf-delay-ietf", "init-delay"] },
      { op: "vrf_isis_spf_delay_ietf_short_delay", label: "Short delay", type: "number", path: ["spf-delay-ietf", "short-delay"] },
      { op: "vrf_isis_spf_delay_ietf_long_delay", label: "Long delay", type: "number", path: ["spf-delay-ietf", "long-delay"] },
      { op: "vrf_isis_spf_delay_ietf_holddown", label: "Holddown", type: "number", path: ["spf-delay-ietf", "holddown"] },
      { op: "vrf_isis_spf_delay_ietf_time_to_learn", label: "Time to learn", type: "number", path: ["spf-delay-ietf", "time-to-learn"] },
    ],
  },
  {
    title: "Passwords",
    fields: [
      { op: "vrf_isis_area_password_plaintext_password", label: "Area password (plaintext)", type: "text", path: ["area-password", "plaintext-password"] },
      { op: "vrf_isis_area_password_md5", label: "Area password (MD5)", type: "text", path: ["area-password", "md5"] },
      { op: "vrf_isis_area_password_authenticate_snp", label: "Area authenticate-snp", type: "select", options: [
        { value: "send-only", label: "Send only" }, { value: "validate", label: "Validate" },
      ], path: ["area-password", "authenticate-snp"] },
      { op: "vrf_isis_domain_password_plaintext_password", label: "Domain password (plaintext)", type: "text", path: ["domain-password", "plaintext-password"] },
      { op: "vrf_isis_domain_password_md5", label: "Domain password (MD5)", type: "text", path: ["domain-password", "md5"] },
      { op: "vrf_isis_domain_password_authenticate_snp", label: "Domain authenticate-snp", type: "select", options: [
        { value: "send-only", label: "Send only" }, { value: "validate", label: "Validate" },
      ], path: ["domain-password", "authenticate-snp"] },
    ],
  },
  {
    title: "Traffic engineering & Segment routing",
    fields: [
      { op: "vrf_isis_traffic_engineering_enable", label: "TE enable", type: "toggle", path: ["traffic-engineering", "enable"] },
      { op: "vrf_isis_traffic_engineering_inter_area", label: "TE inter-area", type: "toggle", path: ["traffic-engineering", "inter-area"] },
      { op: "vrf_isis_traffic_engineering_export", label: "TE export", type: "toggle", path: ["traffic-engineering", "export"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_traffic_engineering_address", label: "TE router address", type: "text", path: ["traffic-engineering", "address"] },
      { op: "vrf_isis_segment_routing_maximum_label_depth", label: "SR max label depth", type: "number", path: ["segment-routing", "maximum-label-depth"] },
      { op: "vrf_isis_segment_routing_srv6_interface", label: "SRv6 interface", type: "text", path: ["segment-routing", "srv6", "interface"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_segment_routing_srv6_locator", label: "SRv6 locator", type: "text", path: ["segment-routing", "srv6", "locator"], capability: "isis_fast_reroute" },
    ],
  },
];

export const OSPF_SCHEMA: SectionSpec[] = [
  {
    title: "Parameters",
    fields: [
      { op: "vrf_ospf_parameters_router_id", label: "Router ID", type: "text", path: ["parameters", "router-id"] },
      { op: "vrf_ospf_parameters_abr_type", label: "ABR type", type: "select", path: ["parameters", "abr-type"], options: [
        { value: "cisco", label: "Cisco" }, { value: "ibm", label: "IBM" }, { value: "shortcut", label: "Shortcut" }, { value: "standard", label: "Standard" },
      ] },
      { op: "vrf_ospf_parameters_opaque_lsa", label: "Opaque LSA", type: "toggle", path: ["parameters", "opaque-lsa"] },
      { op: "vrf_ospf_parameters_rfc1583_compatibility", label: "RFC1583 compatibility", type: "toggle", path: ["parameters", "rfc1583-compatibility"] },
      { op: "vrf_ospf_capability_opaque", label: "Capability opaque", type: "toggle", path: ["capability", "opaque"] },
      { op: "vrf_ospf_default_metric", label: "Default metric", type: "number", path: ["default-metric"] },
      { op: "vrf_ospf_maximum_paths", label: "Maximum paths", type: "number", path: ["maximum-paths"] },
      { op: "vrf_ospf_auto_cost_reference_bandwidth", label: "Auto-cost ref bandwidth", type: "number", path: ["auto-cost", "reference-bandwidth"] },
      { op: "vrf_ospf_passive_interface", label: "Passive interfaces", type: "list", path: ["passive-interface"] },
      { op: "vrf_ospf_log_adjacency_changes", label: "Log adjacency changes", type: "toggle", path: ["log-adjacency-changes"] },
    ],
  },
  {
    title: "Graceful restart & LDP sync",
    fields: [
      { op: "vrf_ospf_graceful_restart", label: "Graceful restart", type: "toggle", path: ["graceful-restart"] },
      { op: "vrf_ospf_graceful_restart_grace_period", label: "Grace period", type: "number", path: ["graceful-restart", "grace-period"] },
      { op: "vrf_ospf_graceful_restart_helper_enable", label: "Helper enable", type: "toggle", path: ["graceful-restart", "helper", "enable"] },
      { op: "vrf_ospf_graceful_restart_helper_planned_only", label: "Helper planned-only", type: "toggle", path: ["graceful-restart", "helper", "planned-only"] },
      { op: "vrf_ospf_graceful_restart_helper_no_strict_lsa_checking", label: "Helper no-strict-lsa-check", type: "toggle", path: ["graceful-restart", "helper", "no-strict-lsa-checking"] },
      { op: "vrf_ospf_ldp_sync", label: "LDP sync", type: "toggle", path: ["ldp-sync"] },
      { op: "vrf_ospf_ldp_sync_holddown", label: "LDP sync holddown", type: "number", path: ["ldp-sync", "holddown"] },
      { op: "vrf_ospf_aggregation_timer", label: "Aggregation timer", type: "number", path: ["aggregation", "timer"] },
    ],
  },
  {
    title: "Segment routing",
    fields: [
      { op: "vrf_ospf_segment_routing_maximum_label_depth", label: "Max label depth", type: "number", path: ["segment-routing", "maximum-label-depth"] },
      { op: "vrf_ospf_segment_routing_global_block_low", label: "Global block low", type: "number", path: ["segment-routing", "global-block", "low-label-value"] },
      { op: "vrf_ospf_segment_routing_global_block_high", label: "Global block high", type: "number", path: ["segment-routing", "global-block", "high-label-value"] },
      { op: "vrf_ospf_segment_routing_local_block_low", label: "Local block low", type: "number", path: ["segment-routing", "local-block", "low-label-value"] },
      { op: "vrf_ospf_segment_routing_local_block_high", label: "Local block high", type: "number", path: ["segment-routing", "local-block", "high-label-value"] },
    ],
  },
];

export const OSPFV3_SCHEMA: SectionSpec[] = [
  {
    title: "Parameters",
    fields: [
      { op: "vrf_ospfv3_parameters_router_id", label: "Router ID", type: "text", path: ["parameters", "router-id"] },
      { op: "vrf_ospfv3_auto_cost_reference_bandwidth", label: "Auto-cost ref bandwidth", type: "number", path: ["auto-cost", "reference-bandwidth"] },
      { op: "vrf_ospfv3_log_adjacency_changes", label: "Log adjacency changes", type: "toggle", path: ["log-adjacency-changes"] },
    ],
  },
  {
    title: "Graceful restart",
    fields: [
      { op: "vrf_ospfv3_graceful_restart", label: "Graceful restart", type: "toggle", path: ["graceful-restart"] },
      { op: "vrf_ospfv3_graceful_restart_grace_period", label: "Grace period", type: "number", path: ["graceful-restart", "grace-period"] },
      { op: "vrf_ospfv3_graceful_restart_helper_enable", label: "Helper enable", type: "toggle", path: ["graceful-restart", "helper", "enable"] },
      { op: "vrf_ospfv3_graceful_restart_helper_planned_only", label: "Helper planned-only", type: "toggle", path: ["graceful-restart", "helper", "planned-only"] },
      { op: "vrf_ospfv3_graceful_restart_helper_lsa_check_disable", label: "Helper lsa-check-disable", type: "toggle", path: ["graceful-restart", "helper", "lsa-check-disable"] },
      { op: "vrf_ospfv3_graceful_restart_helper_supported_grace_time", label: "Helper supported grace time", type: "number", path: ["graceful-restart", "helper", "supported-grace-time"] },
    ],
  },
];

export const BGP_SCHEMA: SectionSpec[] = [
  {
    title: "General",
    fields: [
      { op: "vrf_bgp_system_as", label: "System AS", type: "text", path: ["system-as"] },
      { op: "vrf_bgp_parameters_router_id", label: "Router ID", type: "text", path: ["parameters", "router-id"] },
      { op: "vrf_bgp_parameters_cluster_id", label: "Cluster ID", type: "text", path: ["parameters", "cluster-id"] },
      { op: "vrf_bgp_parameters_default_local_pref", label: "Default local pref", type: "number", path: ["parameters", "default", "local-pref"] },
      { op: "vrf_bgp_timers_keepalive", label: "Keepalive timer", type: "number", path: ["timers", "keepalive"] },
      { op: "vrf_bgp_timers_holdtime", label: "Hold timer", type: "number", path: ["timers", "holdtime"] },
    ],
  },
  {
    title: "Best path & behaviour",
    fields: [
      { op: "vrf_bgp_parameters_deterministic_med", label: "Deterministic MED", type: "toggle", path: ["parameters", "deterministic-med"] },
      { op: "vrf_bgp_parameters_bestpath_compare_routerid", label: "Bestpath compare router-id", type: "toggle", path: ["parameters", "bestpath", "compare-routerid"] },
      { op: "vrf_bgp_parameters_bestpath_as_path_confed", label: "Bestpath as-path confed", type: "toggle", path: ["parameters", "bestpath", "as-path", "confed"] },
      { op: "vrf_bgp_parameters_bestpath_as_path_ignore", label: "Bestpath as-path ignore", type: "toggle", path: ["parameters", "bestpath", "as-path", "ignore"] },
      { op: "vrf_bgp_parameters_bestpath_as_path_multipath_relax", label: "Bestpath as-path multipath-relax", type: "toggle", path: ["parameters", "bestpath", "as-path", "multipath-relax"] },
      { op: "vrf_bgp_parameters_ebgp_requires_policy", label: "eBGP requires policy", type: "toggle", path: ["parameters", "ebgp-requires-policy"] },
      { op: "vrf_bgp_parameters_fast_convergence", label: "Fast convergence", type: "toggle", path: ["parameters", "fast-convergence"] },
      { op: "vrf_bgp_parameters_graceful_shutdown", label: "Graceful shutdown", type: "toggle", path: ["parameters", "graceful-shutdown"] },
      { op: "vrf_bgp_parameters_network_import_check", label: "Network import check", type: "toggle", path: ["parameters", "network-import-check"] },
      { op: "vrf_bgp_parameters_no_client_to_client_reflection", label: "No client-to-client reflection", type: "toggle", path: ["parameters", "no-client-to-client-reflection"] },
      { op: "vrf_bgp_parameters_no_fast_external_failover", label: "No fast external failover", type: "toggle", path: ["parameters", "no-fast-external-failover"] },
      { op: "vrf_bgp_parameters_shutdown", label: "Shutdown", type: "toggle", path: ["parameters", "shutdown"] },
      { op: "vrf_bgp_parameters_suppress_fib_pending", label: "Suppress FIB pending", type: "toggle", path: ["parameters", "suppress-fib-pending"] },
    ],
  },
];

export const DHCP_SCHEMA: SectionSpec[] = [
  {
    title: "Server",
    fields: [
      { op: "vrf_dhcp_disable", label: "Disable", type: "toggle", path: ["disable"] },
      { op: "vrf_dhcp_hostfile_update", label: "Hostfile update", type: "toggle", path: ["hostfile-update"] },
    ],
  },
  {
    title: "High availability",
    fields: [
      { op: "vrf_dhcp_ha_mode", label: "Mode", type: "select", path: ["high-availability", "mode"], options: [
        { value: "active-active", label: "Active-active" }, { value: "active-passive", label: "Active-passive" },
      ] },
      { op: "vrf_dhcp_ha_status", label: "Status", type: "select", path: ["high-availability", "status"], options: [
        { value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" },
      ] },
      { op: "vrf_dhcp_ha_name", label: "Name", type: "text", path: ["high-availability", "name"] },
      { op: "vrf_dhcp_ha_remote", label: "Remote", type: "text", path: ["high-availability", "remote"] },
      { op: "vrf_dhcp_ha_source_address", label: "Source address", type: "text", path: ["high-availability", "source-address"] },
      { op: "vrf_dhcp_ha_ca_certificate", label: "CA certificate", type: "text", path: ["high-availability", "ca-certificate"] },
      { op: "vrf_dhcp_ha_certificate", label: "Certificate", type: "text", path: ["high-availability", "certificate"] },
    ],
  },
  {
    title: "Dynamic DNS update",
    fields: [
      { op: "vrf_dhcp_dynamic_dns_update_enable", label: "Enable", type: "toggle", path: ["dynamic-dns-update", "enable"] },
      ...[
        "send-updates", "conflict-resolution", "ttl-percent", "update-on-renew",
        "generated-prefix", "qualifying-suffix", "replace-client-name",
        "override-client-update", "override-no-update",
        "hostname-char-set", "hostname-char-replacement",
      ].map((f) => ({
        op: "vrf_dhcp_ddns_field",
        args: [f],
        label: f,
        type: "text" as const,
        path: ["dynamic-dns-update", f],
      })),
    ],
  },
];

export const DHCPV6_SCHEMA: SectionSpec[] = [
  {
    title: "Server",
    fields: [
      { op: "vrf_dhcpv6_disable", label: "Disable", type: "toggle", path: ["disable"] },
      { op: "vrf_dhcpv6_disable_route_autoinstall", label: "Disable route auto-install", type: "toggle", path: ["disable-route-autoinstall"] },
      { op: "vrf_dhcpv6_preference", label: "Preference", type: "number", path: ["preference"] },
    ],
  },
];
