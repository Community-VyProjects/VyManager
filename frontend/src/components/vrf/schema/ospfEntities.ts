// OSPF per-entity schemas: areas (+ range/virtual-link), interfaces (+ md5 keys),
// redistribute, summary-addresses, neighbors.

import { EntityGroupSpec, SectionSpec, SelectOption } from "./types";

const NETWORK_OPTIONS: SelectOption[] = [
  { value: "broadcast", label: "Broadcast" },
  { value: "non-broadcast", label: "Non-broadcast" },
  { value: "point-to-multipoint", label: "Point-to-multipoint" },
  { value: "point-to-point", label: "Point-to-point" },
];
const METRIC_TYPE_OPTIONS: SelectOption[] = [
  { value: "1", label: "Type 1" },
  { value: "2", label: "Type 2" },
];
const REDIST_PROTOS: SelectOption[] = [
  { value: "babel", label: "Babel" },
  { value: "bgp", label: "BGP" },
  { value: "connected", label: "Connected" },
  { value: "isis", label: "IS-IS" },
  { value: "kernel", label: "Kernel" },
  { value: "nhrp", label: "NHRP" },
  { value: "rip", label: "RIP" },
  { value: "static", label: "Static" },
];

const INTERFACE_MD5_GROUP: EntityGroupSpec = {
  label: "MD5 Key",
  rawKey: ["authentication", "md5", "key-id"],
  createOp: "vrf_ospf_interface_authentication_md5_key_id",
  idPlaceholder: "Key ID (1-255)",
  schema: [
    {
      title: "MD5 Key",
      fields: [
        { op: "vrf_ospf_interface_authentication_md5_key_id_md5_key", label: "MD5 key", type: "text", path: ["md5-key"] },
      ],
    },
  ],
};

const INTERFACE_SCHEMA: SectionSpec[] = [
  {
    title: "Settings",
    fields: [
      { op: "vrf_ospf_interface_area", label: "Area", type: "text", path: ["area"] },
      { op: "vrf_ospf_interface_cost", label: "Cost", type: "number", path: ["cost"] },
      { op: "vrf_ospf_interface_priority", label: "Priority", type: "number", path: ["priority"] },
      { op: "vrf_ospf_interface_network", label: "Network", type: "select", options: NETWORK_OPTIONS, path: ["network"] },
      { op: "vrf_ospf_interface_bandwidth", label: "Bandwidth", type: "number", path: ["bandwidth"] },
      { op: "vrf_ospf_interface_hello_interval", label: "Hello interval", type: "number", path: ["hello-interval"] },
      { op: "vrf_ospf_interface_hello_multiplier", label: "Hello multiplier", type: "number", path: ["hello-multiplier"] },
      { op: "vrf_ospf_interface_dead_interval", label: "Dead interval", type: "number", path: ["dead-interval"] },
      { op: "vrf_ospf_interface_retransmit_interval", label: "Retransmit interval", type: "number", path: ["retransmit-interval"] },
      { op: "vrf_ospf_interface_retransmit_window", label: "Retransmit window", type: "number", path: ["retransmit-window"], capability: "ospf_retransmit_window" },
      { op: "vrf_ospf_interface_transmit_delay", label: "Transmit delay", type: "number", path: ["transmit-delay"] },
    ],
  },
  {
    title: "Flags & BFD",
    fields: [
      { op: "vrf_ospf_interface_passive", label: "Passive", type: "toggle", path: ["passive"] },
      { op: "vrf_ospf_interface_mtu_ignore", label: "MTU ignore", type: "toggle", path: ["mtu-ignore"] },
      { op: "vrf_ospf_interface_bfd", label: "BFD", type: "toggle", path: ["bfd"] },
      { op: "vrf_ospf_interface_bfd_profile", label: "BFD profile", type: "text", path: ["bfd", "profile"] },
      { op: "vrf_ospf_interface_ldp_sync_disable", label: "LDP sync disable", type: "toggle", path: ["ldp-sync", "disable"] },
      { op: "vrf_ospf_interface_ldp_sync_holddown", label: "LDP sync holddown", type: "number", path: ["ldp-sync", "holddown"] },
    ],
  },
  {
    title: "Authentication",
    fields: [
      { op: "vrf_ospf_interface_authentication_plaintext_password", delOp: "vrf_ospf_interface_authentication", label: "Plaintext password", type: "text", path: ["authentication", "plaintext-password"] },
      { op: "vrf_ospf_interface_authentication_null", delOp: "vrf_ospf_interface_authentication", label: "Null authentication", type: "toggle", path: ["authentication", "null"] },
    ],
  },
];

const AREA_RANGE_GROUP: EntityGroupSpec = {
  label: "Range",
  rawKey: "range",
  createOp: "vrf_ospf_area_range",
  idPlaceholder: "10.0.0.0/16",
  schema: [
    {
      title: "Range",
      fields: [
        { op: "vrf_ospf_area_range_cost", label: "Cost", type: "number", path: ["cost"] },
        { op: "vrf_ospf_area_range_not_advertise", label: "Not advertise", type: "toggle", path: ["not-advertise"] },
        { op: "vrf_ospf_area_range_substitute", label: "Substitute", type: "text", path: ["substitute"] },
      ],
    },
  ],
};

const VIRTUAL_LINK_MD5_GROUP: EntityGroupSpec = {
  label: "MD5 Key",
  rawKey: ["authentication", "md5", "key-id"],
  createOp: "vrf_ospf_area_virtual_link_authentication_md5_key_id",
  idPlaceholder: "Key ID (1-255)",
  schema: [
    {
      title: "MD5 Key",
      fields: [
        { op: "vrf_ospf_area_virtual_link_authentication_md5_key_id_md5_key", label: "MD5 key", type: "text", path: ["md5-key"] },
      ],
    },
  ],
};

const AREA_VIRTUAL_LINK_GROUP: EntityGroupSpec = {
  label: "Virtual Link",
  rawKey: "virtual-link",
  createOp: "vrf_ospf_area_virtual_link",
  idPlaceholder: "Router ID",
  schema: [
    {
      title: "Timers",
      fields: [
        { op: "vrf_ospf_area_virtual_link_hello_interval", label: "Hello interval", type: "number", path: ["hello-interval"] },
        { op: "vrf_ospf_area_virtual_link_dead_interval", label: "Dead interval", type: "number", path: ["dead-interval"] },
        { op: "vrf_ospf_area_virtual_link_retransmit_interval", label: "Retransmit interval", type: "number", path: ["retransmit-interval"] },
        { op: "vrf_ospf_area_virtual_link_retransmit_window", label: "Retransmit window", type: "number", path: ["retransmit-window"], capability: "ospf_retransmit_window" },
        { op: "vrf_ospf_area_virtual_link_transmit_delay", label: "Transmit delay", type: "number", path: ["transmit-delay"] },
      ],
    },
    {
      title: "Authentication",
      fields: [
        { op: "vrf_ospf_area_virtual_link_authentication_plaintext_password", delOp: "vrf_ospf_area_virtual_link_authentication", label: "Plaintext password", type: "text", path: ["authentication", "plaintext-password"] },
        { op: "vrf_ospf_area_virtual_link_authentication_null", delOp: "vrf_ospf_area_virtual_link_authentication", label: "Null authentication", type: "toggle", path: ["authentication", "null"] },
      ],
    },
  ],
  children: [VIRTUAL_LINK_MD5_GROUP],
};

const AREA_SCHEMA: SectionSpec[] = [
  {
    title: "Area",
    fields: [
      { op: "vrf_ospf_area_type", label: "Area type", type: "select", options: [
        { value: "normal", label: "Normal" }, { value: "nssa", label: "NSSA" }, { value: "stub", label: "Stub" },
      ], path: ["area-type"] },
      { op: "vrf_ospf_area_authentication", label: "Authentication", type: "select", options: [
        { value: "plaintext-password", label: "Plaintext password" }, { value: "md5", label: "MD5" },
      ], path: ["authentication"] },
      { op: "vrf_ospf_area_shortcut", label: "Shortcut", type: "select", options: [
        { value: "default", label: "Default" }, { value: "enable", label: "Enable" }, { value: "disable", label: "Disable" },
      ], path: ["shortcut"] },
      { op: "vrf_ospf_area_export_list", label: "Export list", type: "text", path: ["export-list"] },
      { op: "vrf_ospf_area_import_list", label: "Import list", type: "text", path: ["import-list"] },
      { op: "vrf_ospf_area_network", label: "Network", type: "list", path: ["network"] },
    ],
  },
  {
    title: "NSSA / Stub",
    fields: [
      { op: "vrf_ospf_area_type_nssa_default_cost", label: "NSSA default cost", type: "number", path: ["area-type", "nssa", "default-cost"] },
      { op: "vrf_ospf_area_type_nssa_no_summary", label: "NSSA no-summary", type: "toggle", path: ["area-type", "nssa", "no-summary"] },
      { op: "vrf_ospf_area_type_nssa_translate", label: "NSSA translate", type: "select", options: [
        { value: "always", label: "Always" }, { value: "candidate", label: "Candidate" }, { value: "never", label: "Never" },
      ], path: ["area-type", "nssa", "translate"] },
      { op: "vrf_ospf_area_type_stub_default_cost", label: "Stub default cost", type: "number", path: ["area-type", "stub", "default-cost"] },
      { op: "vrf_ospf_area_type_stub_no_summary", label: "Stub no-summary", type: "toggle", path: ["area-type", "stub", "no-summary"] },
    ],
  },
];

export const OSPF_AREA_GROUP: EntityGroupSpec = {
  label: "Area",
  rawKey: "area",
  createOp: "vrf_ospf_area",
  idPlaceholder: "0.0.0.0",
  schema: AREA_SCHEMA,
  children: [AREA_RANGE_GROUP, AREA_VIRTUAL_LINK_GROUP],
};

export const OSPF_INTERFACE_GROUP: EntityGroupSpec = {
  label: "Interface",
  rawKey: "interface",
  createOp: "vrf_ospf_interface",
  idPlaceholder: "eth0",
  schema: INTERFACE_SCHEMA,
  children: [INTERFACE_MD5_GROUP],
};

export const OSPF_REDISTRIBUTE_GROUP: EntityGroupSpec = {
  label: "Redistribute",
  rawKey: "redistribute",
  createOp: "vrf_ospf_redistribute",
  fixedIds: REDIST_PROTOS,
  schema: [
    {
      title: "Redistribute",
      fields: [
        { op: "vrf_ospf_redistribute_metric", label: "Metric", type: "number", path: ["metric"] },
        { op: "vrf_ospf_redistribute_metric_type", label: "Metric type", type: "select", options: METRIC_TYPE_OPTIONS, path: ["metric-type"] },
        { op: "vrf_ospf_redistribute_route_map", label: "Route map", type: "text", path: ["route-map"] },
      ],
    },
  ],
};

export const OSPF_SUMMARY_ADDRESS_GROUP: EntityGroupSpec = {
  label: "Summary Address",
  rawKey: "summary-address",
  createOp: "vrf_ospf_summary_address",
  idPlaceholder: "10.0.0.0/16",
  schema: [
    {
      title: "Summary Address",
      fields: [
        { op: "vrf_ospf_summary_address_no_advertise", label: "No advertise", type: "toggle", path: ["no-advertise"] },
        { op: "vrf_ospf_summary_address_tag", label: "Tag", type: "number", path: ["tag"] },
      ],
    },
  ],
};

export const OSPF_NEIGHBOR_GROUP: EntityGroupSpec = {
  label: "Neighbor",
  rawKey: "neighbor",
  createOp: "vrf_ospf_neighbor",
  idPlaceholder: "192.0.2.1",
  schema: [
    {
      title: "Neighbor",
      fields: [
        { op: "vrf_ospf_neighbor_priority", label: "Priority", type: "number", path: ["priority"] },
        { op: "vrf_ospf_neighbor_poll_interval", label: "Poll interval", type: "number", path: ["poll-interval"] },
      ],
    },
  ],
};
