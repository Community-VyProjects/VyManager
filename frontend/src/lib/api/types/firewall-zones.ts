/**
 * TypeScript types for Firewall Zones API
 */

// ============================================================================
// Batch operation types
// ============================================================================

export interface ZoneBatchOperation {
  op: string;
  value?: string | null;
}

export interface ZoneBatchRequest {
  zone_name: string;
  operations: ZoneBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Zone config types
// ============================================================================

export interface ZoneFromPolicy {
  from_zone: string;
  firewall_name?: string | null;
  firewall_ipv6_name?: string | null;
}

export interface ZoneIntraFiltering {
  action?: string | null;
  firewall_name?: string | null;
  firewall_ipv6_name?: string | null;
}

export interface ZoneDefaultFirewall {
  name?: string | null;
  ipv6_name?: string | null;
}

export interface FirewallZone {
  name: string;
  description?: string | null;
  default_action?: string | null;
  default_log: boolean;
  local_zone: boolean;
  interfaces: string[];
  vrfs: string[];
  default_firewall?: ZoneDefaultFirewall | null;
  from_zones: ZoneFromPolicy[];
  intra_zone_filtering?: ZoneIntraFiltering | null;
}

export interface ZonesConfigResponse {
  zones: FirewallZone[];
  total: number;
}

// ============================================================================
// Capabilities
// ============================================================================

export interface ZoneFeatureFlag {
  supported: boolean;
  description: string;
}

export interface ZonesCapabilities {
  version: string;
  features: {
    default_firewall: ZoneFeatureFlag;
    member_interface: ZoneFeatureFlag;
    member_vrf: ZoneFeatureFlag;
    interface_direct: ZoneFeatureFlag;
    from_zone_firewall: { supported: boolean };
    intra_zone_filtering: { supported: boolean };
    local_zone: { supported: boolean };
    default_log: { supported: boolean };
  };
}
