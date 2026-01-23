import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ZoneFirewallPolicy {
  ipv4_ruleset?: string | null;
  ipv6_ruleset?: string | null;
}

export interface FromZonePolicy {
  zone: string;
  firewall: ZoneFirewallPolicy;
}

export interface IntraZoneFiltering {
  action?: string | null;
  firewall: ZoneFirewallPolicy;
}

export interface FirewallZone {
  name: string;
  description?: string | null;
  default_action?: string | null;
  interfaces: string[];
  from_zones: FromZonePolicy[];
  intra_zone_filtering?: IntraZoneFiltering | null;
}

export interface ZonesConfig {
  zones: FirewallZone[];
}

export interface ZonePolicyMatrix {
  from_zone: string;
  to_zone: string;
  ipv4_ruleset?: string | null;
  ipv6_ruleset?: string | null;
  action?: string | null;
  type: "inter-zone" | "intra-zone";
}

export interface CreateZoneRequest {
  name: string;
  description?: string;
  default_action?: string;
  interfaces?: string[];
  from_zones?: FromZonePolicy[];
  intra_zone_filtering?: IntraZoneFiltering;
}

export interface UpdateZoneRequest {
  description?: string | null;
  default_action?: string | null;
  interfaces?: string[];
  from_zones?: FromZonePolicy[];
  intra_zone_filtering?: IntraZoneFiltering | null;
}

export interface AddFromZoneRequest {
  from_zone: string;
  ipv4_ruleset?: string;
  ipv6_ruleset?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API Service
// ============================================================================

class ZonesService {
  /**
   * Get complete zone-based firewall configuration
   */
  async getConfig(): Promise<ZonesConfig> {
    return apiClient.get<ZonesConfig>("/firewall/zones/config");
  }

  /**
   * Get zone-to-zone policy matrix
   */
  async getPolicies(): Promise<ZonePolicyMatrix[]> {
    return apiClient.get<ZonePolicyMatrix[]>("/firewall/zones/policies");
  }

  /**
   * Get a specific zone
   */
  async getZone(zoneName: string): Promise<FirewallZone> {
    return apiClient.get<FirewallZone>(`/firewall/zones/${zoneName}`);
  }

  /**
   * Create a new zone
   */
  async createZone(data: CreateZoneRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/firewall/zones", data);
  }

  /**
   * Update a zone
   */
  async updateZone(zoneName: string, data: UpdateZoneRequest): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/firewall/zones/${zoneName}`, data);
  }

  /**
   * Delete a zone
   */
  async deleteZone(zoneName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/firewall/zones/${zoneName}`);
  }

  /**
   * Add interface to zone
   */
  async addInterface(zoneName: string, interfaceName: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/firewall/zones/${zoneName}/interfaces/${interfaceName}`, {});
  }

  /**
   * Remove interface from zone
   */
  async removeInterface(zoneName: string, interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/firewall/zones/${zoneName}/interfaces/${interfaceName}`);
  }

  /**
   * Add from-zone policy
   */
  async addFromZonePolicy(zoneName: string, data: AddFromZoneRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/firewall/zones/${zoneName}/from`, data);
  }

  /**
   * Delete from-zone policy
   */
  async deleteFromZonePolicy(zoneName: string, fromZone: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/firewall/zones/${zoneName}/from/${fromZone}`);
  }
}

export const zonesService = new ZonesService();
