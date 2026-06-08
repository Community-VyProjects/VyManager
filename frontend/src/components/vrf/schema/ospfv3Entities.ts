// OSPFv3 per-entity schemas: areas (+ range), interfaces, redistribute.

import { EntityGroupSpec, SelectOption } from "./types";

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
  { value: "ripng", label: "RIPng" },
  { value: "static", label: "Static" },
];

const AREA_RANGE_GROUP: EntityGroupSpec = {
  label: "Range",
  rawKey: "range",
  createOp: "vrf_ospfv3_area_range",
  idPlaceholder: "2001:db8::/64",
  schema: [
    {
      title: "Range",
      fields: [
        { op: "vrf_ospfv3_area_range_cost", label: "Cost", type: "number", path: ["cost"] },
        { op: "vrf_ospfv3_area_range_advertise", label: "Advertise", type: "toggle", path: ["advertise"] },
        { op: "vrf_ospfv3_area_range_not_advertise", label: "Not advertise", type: "toggle", path: ["not-advertise"] },
      ],
    },
  ],
};

export const OSPFV3_AREA_GROUP: EntityGroupSpec = {
  label: "Area",
  rawKey: "area",
  createOp: "vrf_ospfv3_area",
  idPlaceholder: "0.0.0.0",
  schema: [
    {
      title: "Area",
      fields: [
        { op: "vrf_ospfv3_area_export_list", label: "Export list", type: "text", path: ["export-list"] },
        { op: "vrf_ospfv3_area_import_list", label: "Import list", type: "text", path: ["import-list"] },
      ],
    },
    {
      title: "NSSA",
      fields: [
        { op: "vrf_ospfv3_area_type_nssa", label: "NSSA", type: "toggle", path: ["area-type", "nssa"] },
        { op: "vrf_ospfv3_area_type_nssa_default_cost", label: "NSSA default cost", type: "number", path: ["area-type", "nssa", "default-cost"] },
        { op: "vrf_ospfv3_area_type_nssa_no_summary", label: "NSSA no-summary", type: "toggle", path: ["area-type", "nssa", "no-summary"] },
        { op: "vrf_ospfv3_area_type_nssa_default_information_originate", label: "NSSA default-info originate", type: "toggle", path: ["area-type", "nssa", "default-information-originate"] },
      ],
    },
    {
      title: "Stub",
      fields: [
        { op: "vrf_ospfv3_area_type_stub", label: "Stub", type: "toggle", path: ["area-type", "stub"] },
        { op: "vrf_ospfv3_area_type_stub_default_cost", label: "Stub default cost", type: "number", path: ["area-type", "stub", "default-cost"] },
        { op: "vrf_ospfv3_area_type_stub_no_summary", label: "Stub no-summary", type: "toggle", path: ["area-type", "stub", "no-summary"] },
      ],
    },
  ],
  children: [AREA_RANGE_GROUP],
};

export const OSPFV3_INTERFACE_GROUP: EntityGroupSpec = {
  label: "Interface",
  rawKey: "interface",
  createOp: "vrf_ospfv3_interface",
  idPlaceholder: "eth0",
  schema: [
    {
      title: "Settings",
      fields: [
        { op: "vrf_ospfv3_interface_area", label: "Area", type: "text", path: ["area"] },
        { op: "vrf_ospfv3_interface_cost", label: "Cost", type: "number", path: ["cost"] },
        { op: "vrf_ospfv3_interface_priority", label: "Priority", type: "number", path: ["priority"] },
        { op: "vrf_ospfv3_interface_network", label: "Network", type: "select", options: NETWORK_OPTIONS, path: ["network"] },
        { op: "vrf_ospfv3_interface_ifmtu", label: "Interface MTU", type: "number", path: ["ifmtu"] },
        { op: "vrf_ospfv3_interface_instance_id", label: "Instance ID", type: "number", path: ["instance-id"] },
        { op: "vrf_ospfv3_interface_hello_interval", label: "Hello interval", type: "number", path: ["hello-interval"] },
        { op: "vrf_ospfv3_interface_dead_interval", label: "Dead interval", type: "number", path: ["dead-interval"] },
        { op: "vrf_ospfv3_interface_retransmit_interval", label: "Retransmit interval", type: "number", path: ["retransmit-interval"] },
        { op: "vrf_ospfv3_interface_transmit_delay", label: "Transmit delay", type: "number", path: ["transmit-delay"] },
      ],
    },
    {
      title: "Flags & BFD",
      fields: [
        { op: "vrf_ospfv3_interface_passive", label: "Passive", type: "toggle", path: ["passive"] },
        { op: "vrf_ospfv3_interface_mtu_ignore", label: "MTU ignore", type: "toggle", path: ["mtu-ignore"] },
        { op: "vrf_ospfv3_interface_bfd", label: "BFD", type: "toggle", path: ["bfd"] },
        { op: "vrf_ospfv3_interface_bfd_profile", label: "BFD profile", type: "text", path: ["bfd", "profile"] },
      ],
    },
  ],
};

export const OSPFV3_REDISTRIBUTE_GROUP: EntityGroupSpec = {
  label: "Redistribute",
  rawKey: "redistribute",
  createOp: "vrf_ospfv3_redistribute",
  fixedIds: REDIST_PROTOS,
  schema: [
    {
      title: "Redistribute",
      fields: [
        { op: "vrf_ospfv3_redistribute_metric", label: "Metric", type: "number", path: ["metric"] },
        { op: "vrf_ospfv3_redistribute_metric_type", label: "Metric type", type: "select", options: METRIC_TYPE_OPTIONS, path: ["metric-type"] },
        { op: "vrf_ospfv3_redistribute_route_map", label: "Route map", type: "text", path: ["route-map"] },
      ],
    },
  ],
};
