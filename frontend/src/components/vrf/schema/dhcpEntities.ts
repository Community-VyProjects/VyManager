// DHCP per-entity schemas: shared-network → subnet → range/static-mapping,
// plus client-classes. DHCP server is VyOS 1.5+ (capability dhcp_server).

import { EntityGroupSpec, FieldSpec } from "./types";

const NUM_OPTS = new Set(["bootfile-size", "client-prefix-length", "interface-mtu", "time-offset", "ipv6-only-preferred"]);
const MULTI_OPTS = new Set(["name-server", "ntp-server", "domain-search", "smtp-server", "pop-server", "time-server", "wins-server"]);
const VALUE_OPTIONS = [
  "default-router", "domain-name", "name-server", "domain-search", "ntp-server",
  "pop-server", "smtp-server", "time-server", "wins-server", "server-identifier",
  "bootfile-name", "bootfile-server", "bootfile-size", "tftp-server-name",
  "time-zone", "time-offset", "client-prefix-length", "captive-portal",
  "capwap-controller", "interface-mtu", "ipv6-only-preferred", "wpad-url",
];

// Generic option fields for a DHCP scope: all share the scope's generic option
// op, differentiated by `args` (the option name).
function optionFields(genericOp: string): FieldSpec[] {
  return VALUE_OPTIONS.map((opt) => ({
    op: genericOp,
    args: [opt],
    label: opt,
    type: MULTI_OPTS.has(opt) ? ("list" as const) : NUM_OPTS.has(opt) ? ("number" as const) : ("text" as const),
    listClearAll: MULTI_OPTS.has(opt) ? true : undefined,
    path: ["option", opt],
  }));
}

const RANGE_GROUP: EntityGroupSpec = {
  label: "Range",
  rawKey: "range",
  createOp: "vrf_dhcp_subnet_range",
  idPlaceholder: "Range name",
  schema: [
    {
      title: "Range",
      fields: [
        { op: "vrf_dhcp_subnet_range_start", label: "Start", type: "text", path: ["start"] },
        { op: "vrf_dhcp_subnet_range_stop", label: "Stop", type: "text", path: ["stop"] },
        { op: "vrf_dhcp_subnet_range_client_class", label: "Client class", type: "text", path: ["client-class"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcp_subnet_range_option") },
  ],
};

const STATIC_MAPPING_GROUP: EntityGroupSpec = {
  label: "Static Mapping",
  rawKey: "static-mapping",
  createOp: "vrf_dhcp_static_mapping",
  idPlaceholder: "host-name",
  schema: [
    {
      title: "Mapping",
      fields: [
        { op: "vrf_dhcp_static_mapping_ip_address", label: "IP address", type: "text", path: ["ip-address"] },
        { op: "vrf_dhcp_static_mapping_mac_address", label: "MAC address", type: "text", path: ["mac"] },
        { op: "vrf_dhcp_static_mapping_duid", label: "DUID", type: "text", path: ["duid"] },
        { op: "vrf_dhcp_static_mapping_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcp_static_mapping_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcp_static_mapping_option_ip_forwarding", label: "IP forwarding", type: "toggle", path: ["option", "ip-forwarding"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcp_static_mapping_option") },
  ],
};

const SUBNET_GROUP: EntityGroupSpec = {
  label: "Subnet",
  rawKey: "subnet",
  createOp: "vrf_dhcp_subnet",
  idPlaceholder: "10.0.0.0/24",
  schema: [
    {
      title: "Subnet",
      fields: [
        { op: "vrf_dhcp_subnet_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcp_subnet_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcp_subnet_default_router", label: "Default router", type: "text", path: ["default-router"] },
        { op: "vrf_dhcp_subnet_id", label: "Subnet ID", type: "number", path: ["subnet-id"] },
        { op: "vrf_dhcp_subnet_client_class", label: "Client class", type: "text", path: ["client-class"] },
        { op: "vrf_dhcp_subnet_ignore_client_id", label: "Ignore client ID", type: "toggle", path: ["ignore-client-id"] },
        { op: "vrf_dhcp_subnet_ping_check", label: "Ping check", type: "toggle", path: ["ping-check"] },
        { op: "vrf_dhcp_subnet_option_ip_forwarding", label: "IP forwarding", type: "toggle", path: ["option", "ip-forwarding"] },
      ],
    },
    {
      title: "Lease",
      fields: [
        { op: "vrf_dhcp_subnet_lease_default", label: "Default", type: "number", path: ["lease", "default"] },
        { op: "vrf_dhcp_subnet_lease_max", label: "Maximum", type: "number", path: ["lease", "max"] },
        { op: "vrf_dhcp_subnet_lease_min", label: "Minimum", type: "number", path: ["lease", "min"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcp_subnet_option") },
  ],
  children: [RANGE_GROUP, STATIC_MAPPING_GROUP],
};

export const DHCP_SHARED_NETWORK_GROUP: EntityGroupSpec = {
  label: "Shared Network",
  rawKey: "shared-network-name",
  createOp: "vrf_dhcp_shared_network",
  idPlaceholder: "LAN",
  schema: [
    {
      title: "Network",
      fields: [
        { op: "vrf_dhcp_shared_network_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcp_shared_network_authoritative", label: "Authoritative", type: "toggle", path: ["authoritative"] },
        { op: "vrf_dhcp_shared_network_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcp_shared_network_ping_check", label: "Ping check", type: "toggle", path: ["ping-check"] },
        { op: "vrf_dhcp_shared_network_option_ip_forwarding", label: "IP forwarding", type: "toggle", path: ["option", "ip-forwarding"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcp_shared_network_option") },
  ],
  children: [SUBNET_GROUP],
};

export const DHCP_CLIENT_CLASS_GROUP: EntityGroupSpec = {
  label: "Client Class",
  rawKey: "client-class",
  createOp: "vrf_dhcp_client_class",
  idPlaceholder: "class-name",
  schema: [
    {
      title: "Client Class",
      fields: [
        { op: "vrf_dhcp_client_class_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcp_client_class_relay_agent_information_circuit_id", label: "Relay circuit-id", type: "text", path: ["relay-agent-information", "circuit-id"] },
        { op: "vrf_dhcp_client_class_relay_agent_information_remote_id", label: "Relay remote-id", type: "text", path: ["relay-agent-information", "remote-id"] },
      ],
    },
  ],
};
