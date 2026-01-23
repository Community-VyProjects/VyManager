/**
 * Bonding Interface API Service
 * Handles all bonding (link aggregation) interface related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface ARPMonitorConfig {
  interval?: string;
  targets: string[];
}

export interface VIFConfig {
  vlan_id: string;
  addresses: string[];
  description?: string;
  mtu?: string;
  vrf?: string;
  disable: boolean;
}

export interface BondingInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string;
  vrf?: string;
  mtu?: string;
  mac?: string;
  disable: boolean;
  // Bonding-specific
  mode?: string;
  hash_policy?: string;
  members: string[];
  primary?: string;
  lacp_rate?: string;
  min_links?: string;
  arp_monitor?: ARPMonitorConfig;
  vif?: VIFConfig[];
}

export interface BondingInterfacesConfig {
  interfaces: BondingInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
  by_mode: Record<string, number>;
}

export interface BondingCapabilities {
  modes: { value: string; label: string; description: string }[];
  hash_policies: { value: string; label: string; description: string }[];
  lacp_rates: { value: string; label: string; description: string }[];
  version: string;
}

export interface BondingOperation {
  op: string;
  value?: string | number;
}

export interface BondingBatchRequest {
  interface: string;
  operations: BondingOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class BondingService {
  /**
   * Get all bonding interface configurations
   */
  async getConfig(): Promise<BondingInterfacesConfig> {
    return apiClient.get<BondingInterfacesConfig>("/vyos/bonding/config");
  }

  /**
   * Get bonding capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<BondingCapabilities> {
    return apiClient.get<BondingCapabilities>("/vyos/bonding/capabilities");
  }

  /**
   * Configure bonding interface using batch operations
   */
  async configureBatch(request: BondingBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/bonding/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a new bonding interface with basic configuration
   */
  async createInterface(
    name: string,
    options: {
      mode: string;
      members: string[];
      hashPolicy?: string;
      address?: string;
      description?: string;
      lacpRate?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BondingOperation[] = [
      { op: "set_mode", value: options.mode },
    ];

    if (options.hashPolicy) {
      operations.push({ op: "set_hash_policy", value: options.hashPolicy });
    }

    if (options.lacpRate) {
      operations.push({ op: "set_lacp_rate", value: options.lacpRate });
    }

    for (const member of options.members) {
      operations.push({ op: "add_member", value: member });
    }

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Delete a bonding interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Add a member to a bonding interface
   */
  async addMember(bondName: string, memberName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bondName,
      operations: [{ op: "add_member", value: memberName }],
    });
  }

  /**
   * Remove a member from a bonding interface
   */
  async removeMember(bondName: string, memberName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bondName,
      operations: [{ op: "remove_member", value: memberName }],
    });
  }
}

export const bondingService = new BondingService();
