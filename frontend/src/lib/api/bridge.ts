/**
 * Bridge Interface API Service
 * Handles all bridge (L2 switch) interface related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface BridgeMemberConfig {
  interface: string;
  cost?: string;
  priority?: string;
}

export interface IGMPConfig {
  snooping: boolean;
  querier: boolean;
}

export interface VIFConfig {
  vlan_id: string;
  addresses: string[];
  description?: string;
  mtu?: string;
  vrf?: string;
  disable: boolean;
}

export interface BridgeInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string;
  vrf?: string;
  mtu?: string;
  mac?: string;
  disable: boolean;
  // Bridge-specific
  members: BridgeMemberConfig[];
  stp: boolean;
  priority?: string;
  hello_time?: string;
  max_age?: string;
  forward_delay?: string;
  aging?: string;
  enable_vlan: boolean;
  igmp?: IGMPConfig;
  vif?: VIFConfig[];
}

export interface BridgeInterfacesConfig {
  interfaces: BridgeInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
  stp_enabled: number;
}

export interface BridgeCapabilities {
  stp_supported: boolean;
  vlan_filtering_supported: boolean;
  igmp_snooping_supported: boolean;
  priority_range: { min: number; max: number; default: number };
  hello_time_range: { min: number; max: number; default: number };
  max_age_range: { min: number; max: number; default: number };
  forward_delay_range: { min: number; max: number; default: number };
  aging_range: { min: number; max: number; default: number };
  version: string;
}

export interface BridgeOperation {
  op: string;
  value?: string | number;
}

export interface BridgeBatchRequest {
  interface: string;
  operations: BridgeOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class BridgeService {
  /**
   * Get all bridge interface configurations
   */
  async getConfig(): Promise<BridgeInterfacesConfig> {
    return apiClient.get<BridgeInterfacesConfig>("/vyos/bridge/config");
  }

  /**
   * Get bridge capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<BridgeCapabilities> {
    return apiClient.get<BridgeCapabilities>("/vyos/bridge/capabilities");
  }

  /**
   * Configure bridge interface using batch operations
   */
  async configureBatch(request: BridgeBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/bridge/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a new bridge interface with basic configuration
   */
  async createInterface(
    name: string,
    options: {
      members: string[];
      enableStp?: boolean;
      address?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BridgeOperation[] = [];

    for (const member of options.members) {
      operations.push({ op: "add_member", value: member });
    }

    if (options.enableStp) {
      operations.push({ op: "enable_stp" });
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
   * Delete a bridge interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Add a member to a bridge interface
   */
  async addMember(bridgeName: string, memberName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bridgeName,
      operations: [{ op: "add_member", value: memberName }],
    });
  }

  /**
   * Remove a member from a bridge interface
   */
  async removeMember(bridgeName: string, memberName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bridgeName,
      operations: [{ op: "remove_member", value: memberName }],
    });
  }

  /**
   * Enable STP on a bridge
   */
  async enableStp(bridgeName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bridgeName,
      operations: [{ op: "enable_stp" }],
    });
  }

  /**
   * Disable STP on a bridge
   */
  async disableStp(bridgeName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: bridgeName,
      operations: [{ op: "disable_stp" }],
    });
  }
}

export const bridgeService = new BridgeService();
