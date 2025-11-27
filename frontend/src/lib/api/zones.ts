import { apiClient } from "./client";

// Zone-based firewall policy (traffic FROM another zone)
export interface ZoneFromPolicy {
  firewall: {
    name: string; // Firewall ruleset name
  };
}

// Firewall zone configuration
export interface FirewallZone {
  name: string; // Zone name (e.g., 'LAN', 'WAN', 'DMZ')
  description?: string | null;
  "default-action"?: string | null; // Default action for zone
  interfaces: string[]; // Interfaces in this zone
  from: Record<string, ZoneFromPolicy>; // Policies for traffic FROM other zones
}

// Complete firewall zones configuration
export interface ZonesConfig {
  zones: Record<string, FirewallZone>; // All firewall zones
}

// Zone policy entry for display
export interface ZonePolicyEntry {
  from_zone: string; // Source zone
  to_zone: string; // Destination zone
  firewall_ruleset: string; // Firewall ruleset applied
  default_action?: string | null; // Default action
}

class ZonesService {
  /**
   * Get complete zone-based firewall configuration
   */
  async getConfig(): Promise<ZonesConfig> {
    return apiClient.get<ZonesConfig>("/firewall/zones/config");
  }

  /**
   * Get all zone-to-zone policies as a flat list
   */
  async getPolicies(): Promise<ZonePolicyEntry[]> {
    return apiClient.get<ZonePolicyEntry[]>("/firewall/zones/policies");
  }
}

export const zonesService = new ZonesService();
