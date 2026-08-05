// BGP per-entity schemas: neighbors, peer-groups, and address-families
// (global + nested per-neighbor / per-peer-group).

import { EntityGroupSpec, SectionSpec, SelectOption } from "./types";

const AFI_OPTIONS: SelectOption[] = [
  { value: "ipv4-unicast", label: "IPv4 unicast" },
  { value: "ipv4-multicast", label: "IPv4 multicast" },
  { value: "ipv4-labeled-unicast", label: "IPv4 labeled-unicast" },
  { value: "ipv4-vpn", label: "IPv4 VPN" },
  { value: "ipv4-flowspec", label: "IPv4 flowspec" },
  { value: "ipv6-unicast", label: "IPv6 unicast" },
  { value: "ipv6-multicast", label: "IPv6 multicast" },
  { value: "ipv6-labeled-unicast", label: "IPv6 labeled-unicast" },
  { value: "ipv6-vpn", label: "IPv6 VPN" },
  { value: "ipv6-flowspec", label: "IPv6 flowspec" },
  { value: "l2vpn-evpn", label: "L2VPN EVPN" },
];

const ROLE_OPTIONS: SelectOption[] = [
  { value: "customer", label: "Customer" },
  { value: "peer", label: "Peer" },
  { value: "provider", label: "Provider" },
  { value: "rs-client", label: "RS client" },
  { value: "rs-server", label: "RS server" },
];

const GR_OPTIONS: SelectOption[] = [
  { value: "enable", label: "Enable" },
  { value: "disable", label: "Disable" },
  { value: "restart-helper", label: "Restart helper" },
];

// ---- Address-family schema shared by neighbor & peer-group (op base differs) ----
function afSchema(base: string): SectionSpec[] {
  return [
    {
      title: "Policy",
      fields: [
        { op: `${base}_route_map_export`, delOp: `${base}_route_map`, label: "Route-map export", type: "text", path: ["route-map", "export"] },
        { op: `${base}_route_map_import`, delOp: `${base}_route_map`, label: "Route-map import", type: "text", path: ["route-map", "import"] },
        { op: `${base}_prefix_list_export`, delOp: `${base}_prefix_list`, label: "Prefix-list export", type: "text", path: ["prefix-list", "export"] },
        { op: `${base}_prefix_list_import`, delOp: `${base}_prefix_list`, label: "Prefix-list import", type: "text", path: ["prefix-list", "import"] },
        { op: `${base}_filter_list_export`, delOp: `${base}_filter_list`, label: "Filter-list export", type: "text", path: ["filter-list", "export"] },
        { op: `${base}_filter_list_import`, delOp: `${base}_filter_list`, label: "Filter-list import", type: "text", path: ["filter-list", "import"] },
        { op: `${base}_distribute_list_export`, delOp: `${base}_distribute_list`, label: "Distribute-list export", type: "text", path: ["distribute-list", "export"] },
        { op: `${base}_distribute_list_import`, delOp: `${base}_distribute_list`, label: "Distribute-list import", type: "text", path: ["distribute-list", "import"] },
        { op: `${base}_unsuppress_map`, label: "Unsuppress map", type: "text", path: ["unsuppress-map"] },
        { op: `${base}_weight`, label: "Weight", type: "number", path: ["weight"] },
        { op: `${base}_maximum_prefix`, label: "Maximum prefix", type: "number", path: ["maximum-prefix"] },
        { op: `${base}_maximum_prefix_out`, label: "Maximum prefix out", type: "number", path: ["maximum-prefix-out"] },
        { op: `${base}_allowas_in_number`, delOp: `${base}_allowas_in`, label: "Allowas-in number", type: "number", path: ["allowas-in", "number"] },
      ],
    },
    {
      title: "Behaviour",
      fields: [
        { op: `${base}_soft_reconfiguration_inbound`, label: "Soft-reconfiguration inbound", type: "toggle", path: ["soft-reconfiguration", "inbound"] },
        { op: `${base}_route_reflector_client`, label: "Route-reflector client", type: "toggle", path: ["route-reflector-client"] },
        { op: `${base}_route_server_client`, label: "Route-server client", type: "toggle", path: ["route-server-client"] },
        { op: `${base}_nexthop_self`, label: "Next-hop self", type: "toggle", path: ["nexthop-self"] },
        { op: `${base}_nexthop_self_force`, label: "Next-hop self force", type: "toggle", path: ["nexthop-self", "force"] },
        { op: `${base}_nexthop_local_unchanged`, label: "Next-hop local unchanged", type: "toggle", path: ["nexthop-local", "unchanged"] },
        { op: `${base}_as_override`, label: "AS override", type: "toggle", path: ["as-override"] },
        { op: `${base}_addpath_tx_all`, label: "Addpath tx all", type: "toggle", path: ["addpath-tx-all"] },
        { op: `${base}_addpath_tx_per_as`, label: "Addpath tx per-AS", type: "toggle", path: ["addpath-tx-per-as"] },
        { op: `${base}_remove_private_as`, label: "Remove private AS", type: "toggle", path: ["remove-private-as"] },
        { op: `${base}_remove_private_as_all`, label: "Remove private AS (all)", type: "toggle", path: ["remove-private-as", "all"] },
        { op: `${base}_default_originate`, label: "Default originate", type: "toggle", path: ["default-originate"] },
        { op: `${base}_default_originate_route_map`, delOp: `${base}_default_originate`, label: "Default originate route-map", type: "text", path: ["default-originate", "route-map"] },
        { op: `${base}_attribute_unchanged_as_path`, delOp: `${base}_attribute_unchanged`, label: "Attribute-unchanged as-path", type: "toggle", path: ["attribute-unchanged", "as-path"] },
        { op: `${base}_attribute_unchanged_med`, delOp: `${base}_attribute_unchanged`, label: "Attribute-unchanged med", type: "toggle", path: ["attribute-unchanged", "med"] },
        { op: `${base}_attribute_unchanged_next_hop`, delOp: `${base}_attribute_unchanged`, label: "Attribute-unchanged next-hop", type: "toggle", path: ["attribute-unchanged", "next-hop"] },
        { op: `${base}_disable_send_community_extended`, delOp: `${base}_disable_send_community`, label: "Disable send-community extended", type: "toggle", path: ["disable-send-community", "extended"] },
        { op: `${base}_disable_send_community_standard`, delOp: `${base}_disable_send_community`, label: "Disable send-community standard", type: "toggle", path: ["disable-send-community", "standard"] },
        { op: `${base}_capability_orf_prefix_list_receive`, delOp: `${base}_capability_orf`, label: "Capability ORF prefix-list receive", type: "toggle", path: ["capability", "orf", "prefix-list", "receive"] },
        { op: `${base}_capability_orf_prefix_list_send`, delOp: `${base}_capability_orf`, label: "Capability ORF prefix-list send", type: "toggle", path: ["capability", "orf", "prefix-list", "send"] },
        { op: `${base}_conditionally_advertise_advertise_map`, delOp: `${base}_conditionally_advertise`, label: "Cond. advertise map", type: "text", path: ["conditionally-advertise", "advertise-map"] },
        { op: `${base}_conditionally_advertise_exist_map`, delOp: `${base}_conditionally_advertise`, label: "Cond. exist map", type: "text", path: ["conditionally-advertise", "exist-map"] },
        { op: `${base}_conditionally_advertise_non_exist_map`, delOp: `${base}_conditionally_advertise`, label: "Cond. non-exist map", type: "text", path: ["conditionally-advertise", "non-exist-map"] },
      ],
    },
  ];
}

const NEIGHBOR_SCHEMA: SectionSpec[] = [
  {
    title: "Session",
    fields: [
      { op: "vrf_bgp_neighbor_remote_as", label: "Remote AS", type: "text", path: ["remote-as"] },
      { op: "vrf_bgp_neighbor_description", label: "Description", type: "text", path: ["description"] },
      { op: "vrf_bgp_neighbor_peer_group", label: "Peer group", type: "text", path: ["peer-group"] },
      { op: "vrf_bgp_neighbor_update_source", label: "Update source", type: "text", path: ["update-source"] },
      { op: "vrf_bgp_neighbor_password", label: "Password", type: "text", path: ["password"] },
      { op: "vrf_bgp_neighbor_port", label: "Port", type: "number", path: ["port"] },
      { op: "vrf_bgp_neighbor_local_as", label: "Local AS", type: "number", path: ["local-as"] },
      { op: "vrf_bgp_neighbor_ebgp_multihop", label: "eBGP multihop", type: "number", path: ["ebgp-multihop"] },
      { op: "vrf_bgp_neighbor_advertisement_interval", label: "Advertisement interval", type: "number", path: ["advertisement-interval"] },
      { op: "vrf_bgp_neighbor_ttl_security_hops", label: "TTL security hops", type: "number", path: ["ttl-security", "hops"] },
      { op: "vrf_bgp_neighbor_graceful_restart", label: "Graceful restart", type: "select", options: GR_OPTIONS, path: ["graceful-restart"] },
      { op: "vrf_bgp_neighbor_local_role", label: "Local role", type: "select", options: ROLE_OPTIONS, path: ["local-role"] },
    ],
  },
  {
    title: "Timers & BFD",
    fields: [
      { op: "vrf_bgp_neighbor_timers_connect", label: "Timers connect", type: "number", path: ["timers", "connect"] },
      { op: "vrf_bgp_neighbor_timers_keepalive", label: "Timers keepalive", type: "number", path: ["timers", "keepalive"] },
      { op: "vrf_bgp_neighbor_timers_holdtime", label: "Timers holdtime", type: "number", path: ["timers", "holdtime"] },
      { op: "vrf_bgp_neighbor_bfd", label: "BFD", type: "toggle", path: ["bfd"] },
      { op: "vrf_bgp_neighbor_bfd_check_control_plane_failure", label: "BFD check control-plane failure", type: "toggle", path: ["bfd", "check-control-plane-failure"] },
      { op: "vrf_bgp_neighbor_bfd_profile", label: "BFD profile", type: "text", path: ["bfd", "profile"] },
    ],
  },
  {
    title: "Capabilities & flags",
    fields: [
      { op: "vrf_bgp_neighbor_shutdown", label: "Shutdown", type: "toggle", path: ["shutdown"] },
      { op: "vrf_bgp_neighbor_passive", label: "Passive", type: "toggle", path: ["passive"] },
      { op: "vrf_bgp_neighbor_capability_dynamic", label: "Capability dynamic", type: "toggle", path: ["capability", "dynamic"] },
      { op: "vrf_bgp_neighbor_capability_extended_nexthop", label: "Capability extended-nexthop", type: "toggle", path: ["capability", "extended-nexthop"] },
      { op: "vrf_bgp_neighbor_capability_software_version", label: "Capability software-version", type: "toggle", path: ["capability", "software-version"] },
      { op: "vrf_bgp_neighbor_override_capability", label: "Override capability", type: "toggle", path: ["override-capability"] },
      { op: "vrf_bgp_neighbor_strict_capability_match", label: "Strict capability match", type: "toggle", path: ["strict-capability-match"] },
      { op: "vrf_bgp_neighbor_disable_capability_negotiation", label: "Disable capability negotiation", type: "toggle", path: ["disable-capability-negotiation"] },
      { op: "vrf_bgp_neighbor_disable_connected_check", label: "Disable connected check", type: "toggle", path: ["disable-connected-check"] },
      { op: "vrf_bgp_neighbor_enforce_first_as", label: "Enforce first AS", type: "toggle", path: ["enforce-first-as"] },
      { op: "vrf_bgp_neighbor_solo", label: "Solo", type: "toggle", path: ["solo"] },
    ],
  },
];

const PEER_GROUP_SCHEMA: SectionSpec[] = [
  {
    title: "Session",
    fields: [
      { op: "vrf_bgp_peer_group_remote_as", label: "Remote AS", type: "text", path: ["remote-as"] },
      { op: "vrf_bgp_peer_group_description", label: "Description", type: "text", path: ["description"] },
      { op: "vrf_bgp_peer_group_update_source", label: "Update source", type: "text", path: ["update-source"] },
      { op: "vrf_bgp_peer_group_password", label: "Password", type: "text", path: ["password"] },
      { op: "vrf_bgp_peer_group_port", label: "Port", type: "number", path: ["port"] },
      { op: "vrf_bgp_peer_group_local_as", label: "Local AS", type: "number", path: ["local-as"] },
      { op: "vrf_bgp_peer_group_ebgp_multihop", label: "eBGP multihop", type: "number", path: ["ebgp-multihop"] },
      { op: "vrf_bgp_peer_group_ttl_security_hops", label: "TTL security hops", type: "number", path: ["ttl-security", "hops"] },
      { op: "vrf_bgp_peer_group_local_role", label: "Local role", type: "select", options: ROLE_OPTIONS, path: ["local-role"] },
    ],
  },
  {
    title: "Capabilities & flags",
    fields: [
      { op: "vrf_bgp_peer_group_shutdown", label: "Shutdown", type: "toggle", path: ["shutdown"] },
      { op: "vrf_bgp_peer_group_passive", label: "Passive", type: "toggle", path: ["passive"] },
      { op: "vrf_bgp_peer_group_bfd", label: "BFD", type: "toggle", path: ["bfd"] },
      { op: "vrf_bgp_peer_group_bfd_check_control_plane_failure", label: "BFD check control-plane failure", type: "toggle", path: ["bfd", "check-control-plane-failure"] },
      { op: "vrf_bgp_peer_group_bfd_profile", label: "BFD profile", type: "text", path: ["bfd", "profile"] },
      { op: "vrf_bgp_peer_group_capability_dynamic", label: "Capability dynamic", type: "toggle", path: ["capability", "dynamic"] },
      { op: "vrf_bgp_peer_group_capability_extended_nexthop", label: "Capability extended-nexthop", type: "toggle", path: ["capability", "extended-nexthop"] },
      { op: "vrf_bgp_peer_group_capability_software_version", label: "Capability software-version", type: "toggle", path: ["capability", "software-version"] },
      { op: "vrf_bgp_peer_group_override_capability", label: "Override capability", type: "toggle", path: ["override-capability"] },
      { op: "vrf_bgp_peer_group_disable_capability_negotiation", label: "Disable capability negotiation", type: "toggle", path: ["disable-capability-negotiation"] },
      { op: "vrf_bgp_peer_group_disable_connected_check", label: "Disable connected check", type: "toggle", path: ["disable-connected-check"] },
      { op: "vrf_bgp_peer_group_solo", label: "Solo", type: "toggle", path: ["solo"] },
    ],
  },
];

const GLOBAL_AF_SCHEMA: SectionSpec[] = [
  {
    title: "Paths & distance",
    fields: [
      { op: "vrf_bgp_af_maximum_paths_ebgp", delOp: "vrf_bgp_af_maximum_paths", label: "Maximum paths eBGP", type: "number", path: ["maximum-paths", "ebgp"] },
      { op: "vrf_bgp_af_maximum_paths_ibgp", delOp: "vrf_bgp_af_maximum_paths", label: "Maximum paths iBGP", type: "number", path: ["maximum-paths", "ibgp"] },
      { op: "vrf_bgp_af_distance_external", delOp: "vrf_bgp_af_distance", label: "Distance external", type: "number", path: ["distance", "external"] },
      { op: "vrf_bgp_af_distance_internal", delOp: "vrf_bgp_af_distance", label: "Distance internal", type: "number", path: ["distance", "internal"] },
      { op: "vrf_bgp_af_distance_local", delOp: "vrf_bgp_af_distance", label: "Distance local", type: "number", path: ["distance", "local"] },
    ],
  },
  {
    title: "VPN",
    fields: [
      { op: "vrf_bgp_af_export_vpn", label: "Export VPN", type: "toggle", path: ["export", "vpn"] },
      { op: "vrf_bgp_af_import_vpn", label: "Import VPN", type: "toggle", path: ["import", "vpn"] },
      { op: "vrf_bgp_af_import_vrf", delOp: "vrf_bgp_af_import", label: "Import VRF", type: "text", path: ["import", "vrf"] },
      { op: "vrf_bgp_af_rd_vpn_export", label: "RD VPN export", type: "text", path: ["rd", "vpn", "export"] },
      { op: "vrf_bgp_af_label_vpn_export", delOp: "vrf_bgp_af_label_vpn", label: "Label VPN export", type: "text", path: ["label", "vpn", "export"] },
      { op: "vrf_bgp_af_route_target_vpn_both", delOp: "vrf_bgp_af_route_target_vpn", label: "Route-target VPN both", type: "text", path: ["route-target", "vpn", "both"] },
      { op: "vrf_bgp_af_route_target_vpn_export", delOp: "vrf_bgp_af_route_target_vpn", label: "Route-target VPN export", type: "text", path: ["route-target", "vpn", "export"] },
      { op: "vrf_bgp_af_route_target_vpn_import", delOp: "vrf_bgp_af_route_target_vpn", label: "Route-target VPN import", type: "text", path: ["route-target", "vpn", "import"] },
      { op: "vrf_bgp_af_route_map_vpn_export", delOp: "vrf_bgp_af_route_map_vpn", label: "Route-map VPN export", type: "text", path: ["route-map", "vpn", "export"] },
      { op: "vrf_bgp_af_route_map_vpn_import", delOp: "vrf_bgp_af_route_map_vpn", label: "Route-map VPN import", type: "text", path: ["route-map", "vpn", "import"] },
    ],
  },
];

const BGP_AF_REDISTRIBUTE_GROUP: EntityGroupSpec = {
  label: "Redistribute",
  rawKey: "redistribute",
  createOp: "vrf_bgp_af_redistribute",
  fixedIds: [
    { value: "connected", label: "Connected" },
    { value: "static", label: "Static" },
    { value: "kernel", label: "Kernel" },
    { value: "ospf", label: "OSPF" },
    { value: "rip", label: "RIP" },
    { value: "babel", label: "Babel" },
    { value: "isis", label: "IS-IS" },
  ],
  schema: [
    {
      title: "Redistribute",
      fields: [
        { op: "vrf_bgp_af_redistribute_metric", delOp: "vrf_bgp_af_redistribute", label: "Metric", type: "number", path: ["metric"] },
        { op: "vrf_bgp_af_redistribute_route_map", delOp: "vrf_bgp_af_redistribute", label: "Route map", type: "text", path: ["route-map"] },
      ],
    },
  ],
};

const BGP_AF_REDISTRIBUTE_TABLE_GROUP: EntityGroupSpec = {
  label: "Redistribute Table",
  rawKey: ["redistribute", "table"],
  createOp: "vrf_bgp_af_redistribute_table",
  idPlaceholder: "1",
  schema: [
    {
      title: "Redistribute Table",
      fields: [
        { op: "vrf_bgp_af_redistribute_table_metric", delOp: "vrf_bgp_af_redistribute_table", label: "Metric", type: "number", path: ["metric"] },
        { op: "vrf_bgp_af_redistribute_table_route_map", delOp: "vrf_bgp_af_redistribute_table", label: "Route map", type: "text", path: ["route-map"] },
      ],
    },
  ],
};

const NEIGHBOR_AF_GROUP: EntityGroupSpec = {
  label: "Address Family",
  rawKey: "address-family",
  createOp: "vrf_bgp_neighbor_af",
  schema: afSchema("vrf_bgp_neighbor_af"),
  fixedIds: AFI_OPTIONS,
};

const PEER_GROUP_AF_GROUP: EntityGroupSpec = {
  label: "Address Family",
  rawKey: "address-family",
  createOp: "vrf_bgp_peer_group_af",
  schema: afSchema("vrf_bgp_peer_group_af"),
  fixedIds: AFI_OPTIONS,
};

export const BGP_NEIGHBOR_GROUP: EntityGroupSpec = {
  label: "Neighbor",
  rawKey: "neighbor",
  createOp: "vrf_bgp_neighbor",
  schema: NEIGHBOR_SCHEMA,
  idPlaceholder: "192.0.2.1",
  children: [NEIGHBOR_AF_GROUP],
};

export const BGP_PEER_GROUP_GROUP: EntityGroupSpec = {
  label: "Peer Group",
  rawKey: "peer-group",
  createOp: "vrf_bgp_peer_group",
  schema: PEER_GROUP_SCHEMA,
  idPlaceholder: "PEER-GROUP-1",
  children: [PEER_GROUP_AF_GROUP],
};

export const BGP_AF_GROUP: EntityGroupSpec = {
  label: "Address Family",
  rawKey: "address-family",
  createOp: "vrf_bgp_af",
  schema: GLOBAL_AF_SCHEMA,
  fixedIds: AFI_OPTIONS,
  children: [BGP_AF_REDISTRIBUTE_GROUP, BGP_AF_REDISTRIBUTE_TABLE_GROUP],
};
