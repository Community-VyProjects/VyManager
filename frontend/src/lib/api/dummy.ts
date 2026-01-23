/**
 * Dummy Interface API Service
 * Handles all dummy (loopback) interface related API operations
 * Note: Dummy interfaces do not support physical properties like speed/duplex
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface DummyInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string;
  vrf?: string;
  mtu?: string;
  disable?: boolean;
}

export interface DummyInterfacesConfig {
  interfaces: DummyInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface DummyOperation {
  op: string;
  value?: string;
}

export interface DummyBatchRequest {
  interface: string;
  operations: DummyOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class DummyService {
  /**
   * Get all dummy interface configurations
   */
  async getConfig(): Promise<DummyInterfacesConfig> {
    return apiClient.get<DummyInterfacesConfig>("/vyos/dummy/config");
  }

  /**
   * Configure dummy interface using batch operations
   */
  async configureBatch(request: DummyBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dummy/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a dummy interface
   */
  async createInterface(
    name: string,
    options: {
      address?: string;
      addresses?: string[];
      description?: string;
      mtu?: string;
      vrf?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: DummyOperation[] = [];

    // Add addresses
    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.addresses) {
      for (const addr of options.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.mtu) {
      operations.push({ op: "set_mtu", value: options.mtu });
    }

    if (options.vrf) {
      operations.push({ op: "set_vrf", value: options.vrf });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Delete a dummy interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Update interface description
   */
  async setDescription(
    name: string,
    description: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_description", value: description }],
    });
  }

  /**
   * Add an address to interface
   */
  async addAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_address", value: address }],
    });
  }

  /**
   * Remove an address from interface
   */
  async removeAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_address", value: address }],
    });
  }

  /**
   * Enable interface (remove disable flag)
   */
  async enableInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "enable" }],
    });
  }

  /**
   * Disable interface
   */
  async disableInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "disable" }],
    });
  }

  /**
   * Set MTU
   */
  async setMtu(name: string, mtu: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_mtu", value: mtu }],
    });
  }

  /**
   * Set VRF
   */
  async setVrf(name: string, vrf: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_vrf", value: vrf }],
    });
  }
}

export const dummyService = new DummyService();
