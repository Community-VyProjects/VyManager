// IS-IS per-entity schemas: interfaces (+fast-reroute), redistribute (per af),
// default-information (per af), segment-routing prefixes.

import { EntityGroupSpec, FieldSpec, SectionSpec, SelectOption } from "./types";

const LEVELS = ["level-1", "level-2"];
const REDIST_IPV4: SelectOption[] = ["babel", "bgp", "connected", "kernel", "nhrp", "ospf", "rip", "static"].map((v) => ({ value: v, label: v }));
const REDIST_IPV6: SelectOption[] = ["babel", "bgp", "connected", "kernel", "nhrp", "ospf6", "ripng", "static"].map((v) => ({ value: v, label: v }));
const LEVEL_IDS: SelectOption[] = LEVELS.map((v) => ({ value: v, label: v }));

// ---- Interface fast-reroute fields (one set per level) ----
function frFields(): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const lvl of LEVELS) {
    out.push(
      { op: "vrf_isis_interface_fr_lfa_level_enable", args: [lvl], label: `LFA ${lvl} enable`, type: "toggle", path: ["fast-reroute", "lfa", lvl, "enable"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_lfa_level_exclude_interface", args: [lvl], label: `LFA ${lvl} exclude interfaces`, type: "list", path: ["fast-reroute", "lfa", lvl, "exclude", "interface"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_remote_lfa_level_maximum_metric", args: [lvl], label: `Remote-LFA ${lvl} max-metric`, type: "number", path: ["fast-reroute", "remote-lfa", lvl, "maximum-metric"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_remote_lfa_level_tunnel_mpls_ldp", args: [lvl], label: `Remote-LFA ${lvl} mpls-ldp tunnel`, type: "toggle", path: ["fast-reroute", "remote-lfa", lvl, "tunnel", "mpls-ldp"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_ti_lfa_level", args: [lvl], label: `TI-LFA ${lvl}`, type: "toggle", path: ["fast-reroute", "ti-lfa", lvl], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_ti_lfa_level_node_protection", args: [lvl], label: `TI-LFA ${lvl} node-protection`, type: "toggle", path: ["fast-reroute", "ti-lfa", lvl, "node-protection"], capability: "isis_fast_reroute" },
      { op: "vrf_isis_interface_fr_ti_lfa_level_node_protection_link_fallback", args: [lvl], label: `TI-LFA ${lvl} link-fallback`, type: "toggle", path: ["fast-reroute", "ti-lfa", lvl, "node-protection", "link-fallback"], capability: "isis_fast_reroute" },
    );
  }
  return out;
}

const INTERFACE_SCHEMA: SectionSpec[] = [
  {
    title: "Settings",
    fields: [
      { op: "vrf_isis_interface_metric", label: "Metric", type: "number", path: ["metric"] },
      { op: "vrf_isis_interface_circuit_type", label: "Circuit type", type: "select", options: [
        { value: "level-1", label: "Level 1" }, { value: "level-2", label: "Level 2" }, { value: "level-1-2", label: "Level 1-2" },
      ], path: ["circuit-type"] },
      { op: "vrf_isis_interface_network", label: "Network", type: "select", options: [{ value: "point-to-point", label: "Point-to-point" }], path: ["network"] },
      { op: "vrf_isis_interface_priority", label: "Priority", type: "number", path: ["priority"] },
      { op: "vrf_isis_interface_hello_interval", label: "Hello interval", type: "number", path: ["hello-interval"] },
      { op: "vrf_isis_interface_hello_multiplier", label: "Hello multiplier", type: "number", path: ["hello-multiplier"] },
      { op: "vrf_isis_interface_psnp_interval", label: "PSNP interval", type: "number", path: ["psnp-interval"] },
      { op: "vrf_isis_interface_hello_padding", label: "Hello padding", type: "toggle", path: ["hello-padding"] },
      { op: "vrf_isis_interface_passive", label: "Passive", type: "toggle", path: ["passive"] },
      { op: "vrf_isis_interface_no_three_way_handshake", label: "No 3-way handshake", type: "toggle", path: ["no-three-way-handshake"] },
    ],
  },
  {
    title: "BFD / LDP-sync / Password",
    fields: [
      { op: "vrf_isis_interface_bfd", label: "BFD", type: "toggle", path: ["bfd"] },
      { op: "vrf_isis_interface_bfd_profile", label: "BFD profile", type: "text", path: ["bfd", "profile"] },
      { op: "vrf_isis_interface_ldp_sync", label: "LDP sync", type: "toggle", path: ["ldp-sync"] },
      { op: "vrf_isis_interface_ldp_sync_disable", label: "LDP sync disable", type: "toggle", path: ["ldp-sync", "disable"] },
      { op: "vrf_isis_interface_ldp_sync_holddown", label: "LDP sync holddown", type: "number", path: ["ldp-sync", "holddown"] },
      { op: "vrf_isis_interface_password_md5", delOp: "vrf_isis_interface_password", label: "Password MD5", type: "text", path: ["password", "md5"] },
      { op: "vrf_isis_interface_password_plaintext_password", delOp: "vrf_isis_interface_password", label: "Password plaintext", type: "text", path: ["password", "plaintext-password"] },
    ],
  },
  { title: "Fast Reroute", fields: frFields() },
];

export const ISIS_INTERFACE_GROUP: EntityGroupSpec = {
  label: "Interface",
  rawKey: "interface",
  createOp: "vrf_isis_interface",
  idPlaceholder: "eth0",
  schema: INTERFACE_SCHEMA,
};

// ---- Redistribute (per af → protocol → per-level fields) ----
function redistSchema(): SectionSpec[] {
  const fields: FieldSpec[] = [];
  for (const lvl of LEVELS) {
    fields.push(
      { op: "vrf_isis_redistribute_level", args: [lvl], label: `Enable ${lvl}`, type: "toggle", path: [lvl] },
      { op: "vrf_isis_redistribute_metric", args: [lvl], label: `${lvl} metric`, type: "number", path: [lvl, "metric"] },
      { op: "vrf_isis_redistribute_route_map", args: [lvl], label: `${lvl} route-map`, type: "text", path: [lvl, "route-map"] },
    );
  }
  return [{ title: "Levels", fields }];
}

export const ISIS_REDIST_IPV4_GROUP: EntityGroupSpec = {
  label: "Redistribute IPv4",
  rawKey: ["redistribute", "ipv4"],
  createOp: "vrf_isis_redistribute",
  args: ["ipv4"],
  fixedIds: REDIST_IPV4,
  schema: redistSchema(),
};

export const ISIS_REDIST_IPV6_GROUP: EntityGroupSpec = {
  label: "Redistribute IPv6",
  rawKey: ["redistribute", "ipv6"],
  createOp: "vrf_isis_redistribute",
  args: ["ipv6"],
  fixedIds: REDIST_IPV6,
  schema: redistSchema(),
};

// ---- Default information originate (per af → level) ----
const DEFAULT_INFO_SCHEMA: SectionSpec[] = [
  {
    title: "Originate",
    fields: [
      { op: "vrf_isis_default_information_originate_always", label: "Always", type: "toggle", path: ["always"] },
      { op: "vrf_isis_default_information_originate_metric", label: "Metric", type: "number", path: ["metric"] },
      { op: "vrf_isis_default_information_originate_route_map", label: "Route map", type: "text", path: ["route-map"] },
    ],
  },
];

export const ISIS_DEFAULT_INFO_IPV4_GROUP: EntityGroupSpec = {
  label: "Default-Info IPv4 Level",
  rawKey: ["default-information", "originate", "ipv4"],
  createOp: "vrf_isis_default_information_originate",
  args: ["ipv4"],
  fixedIds: LEVEL_IDS,
  schema: DEFAULT_INFO_SCHEMA,
};

export const ISIS_DEFAULT_INFO_IPV6_GROUP: EntityGroupSpec = {
  label: "Default-Info IPv6 Level",
  rawKey: ["default-information", "originate", "ipv6"],
  createOp: "vrf_isis_default_information_originate",
  args: ["ipv6"],
  fixedIds: LEVEL_IDS,
  schema: DEFAULT_INFO_SCHEMA,
};

// ---- Segment-routing prefixes ----
export const ISIS_SR_PREFIX_GROUP: EntityGroupSpec = {
  label: "SR Prefix",
  rawKey: ["segment-routing", "prefix"],
  createOp: "vrf_isis_segment_routing_prefix",
  idPlaceholder: "10.0.0.1/32",
  schema: [
    {
      title: "Index",
      fields: [
        { op: "vrf_isis_segment_routing_prefix_index_value", label: "Index value", type: "number", path: ["index", "value"] },
        { op: "vrf_isis_segment_routing_prefix_index_explicit_null", label: "Index explicit-null", type: "toggle", path: ["index", "explicit-null"] },
        { op: "vrf_isis_segment_routing_prefix_index_no_php_flag", label: "Index no-php-flag", type: "toggle", path: ["index", "no-php-flag"] },
      ],
    },
    {
      title: "Absolute",
      fields: [
        { op: "vrf_isis_segment_routing_prefix_absolute_value", label: "Absolute value", type: "number", path: ["absolute", "value"] },
        { op: "vrf_isis_segment_routing_prefix_absolute_explicit_null", label: "Absolute explicit-null", type: "toggle", path: ["absolute", "explicit-null"] },
        { op: "vrf_isis_segment_routing_prefix_absolute_no_php_flag", label: "Absolute no-php-flag", type: "toggle", path: ["absolute", "no-php-flag"] },
      ],
    },
  ],
};
