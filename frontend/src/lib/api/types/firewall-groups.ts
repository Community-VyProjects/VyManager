/**
 * TypeScript types for Firewall Groups API
 * Based on OpenAPI specification
 */

// Firewall Group types
export interface FirewallGroup {
  name: string;
  type: string;
  description?: string | null;
  members: string[];
}

// API Response types
export interface GroupsConfigResponse {
  address_groups: FirewallGroup[];
  ipv6_address_groups: FirewallGroup[];
  network_groups: FirewallGroup[];
  ipv6_network_groups: FirewallGroup[];
  port_groups: FirewallGroup[];
  interface_groups: FirewallGroup[];
  mac_groups: FirewallGroup[];
  domain_groups: FirewallGroup[];
  remote_groups: FirewallGroup[];
  total: number;
  by_type: Record<string, number>;
}

// Group type information
export interface GroupTypeInfo {
  supported: boolean;
  description: string;
  member_type: string;
}

// Capabilities
export interface FirewallGroupsCapabilities {
  version: string;
  version_number: number;
  device_name?: string;
  group_types: {
    address_group: GroupTypeInfo;
    ipv6_address_group: GroupTypeInfo;
    network_group: GroupTypeInfo;
    ipv6_network_group: GroupTypeInfo;
    port_group: GroupTypeInfo;
    interface_group: GroupTypeInfo;
    mac_group: GroupTypeInfo;
    domain_group: GroupTypeInfo;
    remote_group: GroupTypeInfo;
  };
  operations: Record<string, string[]>;
  statistics: {
    total_group_types: number;
    total_operations: number;
  };
}

// Batch operation types
export interface GroupBatchOperation {
  op: string;
  value?: string;
}

export interface GroupBatchRequest {
  group_name: string;
  operations: GroupBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// UI-specific types
export type GroupType =
  | "address-group"
  | "ipv6-address-group"
  | "network-group"
  | "ipv6-network-group"
  | "port-group"
  | "interface-group"
  | "mac-group"
  | "domain-group"
  | "remote-group";

export interface GroupTypeFilter {
  type: GroupType | "all";
  label: string;
  count: number;
}
