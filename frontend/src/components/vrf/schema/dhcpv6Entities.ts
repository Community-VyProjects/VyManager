// DHCPv6 per-entity schemas: shared-network → subnet → range/static-mapping/
// prefix-delegation. DHCPv6 server is VyOS 1.5+ (capability dhcpv6_server).

import { EntityGroupSpec, FieldSpec } from "./types";

const NUM_OPTS = new Set(["info-refresh-time"]);
const MULTI_OPTS = new Set(["name-server", "domain-search", "nis-server", "nisplus-server", "sip-server", "sntp-server"]);
const VALUE_OPTIONS = [
  "name-server", "domain-search", "captive-portal", "capwap-controller",
  "info-refresh-time", "nis-domain", "nis-server", "nisplus-domain",
  "nisplus-server", "sip-server", "sntp-server",
];

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
  createOp: "vrf_dhcpv6_subnet_range",
  idPlaceholder: "Range name",
  schema: [
    {
      title: "Range",
      fields: [
        { op: "vrf_dhcpv6_subnet_range_start", label: "Start", type: "text", path: ["start"] },
        { op: "vrf_dhcpv6_subnet_range_stop", label: "Stop", type: "text", path: ["stop"] },
        { op: "vrf_dhcpv6_subnet_range_prefix", label: "Prefix", type: "text", path: ["prefix"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcpv6_subnet_range_option") },
  ],
};

const STATIC_MAPPING_GROUP: EntityGroupSpec = {
  label: "Static Mapping",
  rawKey: "static-mapping",
  createOp: "vrf_dhcpv6_subnet_static_mapping",
  idPlaceholder: "host-name",
  schema: [
    {
      title: "Mapping",
      fields: [
        { op: "vrf_dhcpv6_subnet_static_mapping_ipv6_address", label: "IPv6 address", type: "text", path: ["ipv6-address"] },
        { op: "vrf_dhcpv6_subnet_static_mapping_ipv6_prefix", label: "IPv6 prefix", type: "text", path: ["ipv6-prefix"] },
        { op: "vrf_dhcpv6_subnet_static_mapping_mac", label: "MAC address", type: "text", path: ["mac"] },
        { op: "vrf_dhcpv6_subnet_static_mapping_duid", label: "DUID", type: "text", path: ["duid"] },
        { op: "vrf_dhcpv6_subnet_static_mapping_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcpv6_subnet_static_mapping_disable", label: "Disable", type: "toggle", path: ["disable"] },
      ],
    },
    { title: "Options", fields: optionFields("vrf_dhcpv6_static_mapping_option") },
  ],
};

const PD_PREFIX_GROUP: EntityGroupSpec = {
  label: "Delegated Prefix",
  rawKey: ["prefix-delegation", "prefix"],
  createOp: "vrf_dhcpv6_subnet_pd_prefix",
  idPlaceholder: "2001:db8::/48",
  schema: [
    {
      title: "Prefix Delegation",
      fields: [
        { op: "vrf_dhcpv6_subnet_pd_prefix_delegated_length", label: "Delegated length", type: "number", path: ["delegated-length"] },
        { op: "vrf_dhcpv6_subnet_pd_prefix_prefix_length", label: "Prefix length", type: "number", path: ["prefix-length"] },
        { op: "vrf_dhcpv6_subnet_pd_prefix_excluded_prefix", label: "Excluded prefix", type: "text", path: ["excluded-prefix"] },
        { op: "vrf_dhcpv6_subnet_pd_prefix_excluded_prefix_length", label: "Excluded prefix length", type: "number", path: ["excluded-prefix-length"] },
      ],
    },
  ],
};

const SUBNET_GROUP: EntityGroupSpec = {
  label: "Subnet",
  rawKey: "subnet",
  createOp: "vrf_dhcpv6_subnet",
  idPlaceholder: "2001:db8::/64",
  schema: [
    {
      title: "Subnet",
      fields: [
        { op: "vrf_dhcpv6_subnet_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcpv6_subnet_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcpv6_subnet_interface", label: "Interface", type: "text", path: ["interface"] },
        { op: "vrf_dhcpv6_subnet_id", label: "Subnet ID", type: "number", path: ["subnet-id"] },
      ],
    },
    {
      title: "Lease time",
      fields: [
        { op: "vrf_dhcpv6_subnet_lease_time_default", label: "Default", type: "number", path: ["lease-time", "default"] },
        { op: "vrf_dhcpv6_subnet_lease_time_maximum", label: "Maximum", type: "number", path: ["lease-time", "maximum"] },
        { op: "vrf_dhcpv6_subnet_lease_time_minimum", label: "Minimum", type: "number", path: ["lease-time", "minimum"] },
      ],
    },
    {
      title: "Options",
      fields: [
        ...optionFields("vrf_dhcpv6_subnet_option"),
        { op: "vrf_dhcpv6_subnet_option_vendor_cisco_tftp_server", label: "Vendor cisco tftp-server", type: "text", path: ["option", "vendor-option", "cisco", "tftp-server"] },
      ],
    },
  ],
  children: [RANGE_GROUP, STATIC_MAPPING_GROUP, PD_PREFIX_GROUP],
};

export const DHCPV6_SHARED_NETWORK_GROUP: EntityGroupSpec = {
  label: "Shared Network",
  rawKey: "shared-network-name",
  createOp: "vrf_dhcpv6_shared_network",
  idPlaceholder: "LAN",
  schema: [
    {
      title: "Network",
      fields: [
        { op: "vrf_dhcpv6_shared_network_description", label: "Description", type: "text", path: ["description"] },
        { op: "vrf_dhcpv6_shared_network_disable", label: "Disable", type: "toggle", path: ["disable"] },
        { op: "vrf_dhcpv6_shared_network_interface", label: "Interface", type: "text", path: ["interface"] },
      ],
    },
    {
      title: "Options",
      fields: [
        ...optionFields("vrf_dhcpv6_shared_network_option"),
        { op: "vrf_dhcpv6_shared_network_option_vendor_cisco_tftp_server", label: "Vendor cisco tftp-server", type: "text", path: ["option", "vendor-option", "cisco", "tftp-server"] },
      ],
    },
  ],
  children: [SUBNET_GROUP],
};
