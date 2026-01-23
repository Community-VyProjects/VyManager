/**
 * Tunnel Interface API Service
 * Handles all tunnel interface related API operations (GRE, IPIP, SIT, etc.)
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface TunnelInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string;
  vrf?: string;
  mtu?: string;
  disable: boolean;
  // Tunnel-specific
  encapsulation?: string;
  source_address?: string;
  source_interface?: string;
  remote?: string;
  key?: string;
  dont_fragment: boolean;
  ignore_df: boolean;
  multicast?: boolean;
  ttl?: string;
  // 6rd specific
  "6rd_prefix"?: string;
  "6rd_relay_prefix"?: string;
}

export interface TunnelInterfacesConfig {
  interfaces: TunnelInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
  by_encapsulation: Record<string, number>;
}

export interface EncapsulationType {
  value: string;
  label: string;
  description: string;
}

export interface TunnelCapabilities {
  encapsulation_types: EncapsulationType[];
  supports_key: string[];
  supports_6rd: string[];
  version: string;
}

export interface TunnelOperation {
  op: string;
  value?: string | number;
}

export interface TunnelBatchRequest {
  interface: string;
  operations: TunnelOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class TunnelService {
  /**
   * Get all tunnel interface configurations
   */
  async getConfig(): Promise<TunnelInterfacesConfig> {
    return apiClient.get<TunnelInterfacesConfig>("/vyos/tunnel/config");
  }

  /**
   * Get tunnel capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<TunnelCapabilities> {
    return apiClient.get<TunnelCapabilities>("/vyos/tunnel/capabilities");
  }

  /**
   * Configure tunnel interface using batch operations
   */
  async configureBatch(request: TunnelBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/tunnel/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a GRE tunnel
   */
  async createGreTunnel(
    name: string,
    options: {
      sourceAddress: string;
      remote: string;
      address?: string;
      description?: string;
      key?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: TunnelOperation[] = [
      { op: "set_encapsulation", value: "gre" },
      { op: "set_source_address", value: options.sourceAddress },
      { op: "set_remote", value: options.remote },
    ];

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.key) {
      operations.push({ op: "set_key", value: options.key });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Create an IPIP tunnel
   */
  async createIpipTunnel(
    name: string,
    options: {
      sourceAddress: string;
      remote: string;
      address?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: TunnelOperation[] = [
      { op: "set_encapsulation", value: "ipip" },
      { op: "set_source_address", value: options.sourceAddress },
      { op: "set_remote", value: options.remote },
    ];

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Create a SIT (6in4) tunnel
   */
  async createSitTunnel(
    name: string,
    options: {
      sourceAddress?: string;
      sourceInterface?: string;
      remote?: string;
      address?: string;
      description?: string;
      sixRdPrefix?: string;
      sixRdRelayPrefix?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: TunnelOperation[] = [
      { op: "set_encapsulation", value: "sit" },
    ];

    if (options.sourceAddress) {
      operations.push({ op: "set_source_address", value: options.sourceAddress });
    }

    if (options.sourceInterface) {
      operations.push({ op: "set_source_interface", value: options.sourceInterface });
    }

    if (options.remote) {
      operations.push({ op: "set_remote", value: options.remote });
    }

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.sixRdPrefix) {
      operations.push({ op: "set_6rd_prefix", value: options.sixRdPrefix });
    }

    if (options.sixRdRelayPrefix) {
      operations.push({ op: "set_6rd_relay_prefix", value: options.sixRdRelayPrefix });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Delete a tunnel interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Update tunnel endpoints
   */
  async updateEndpoints(
    name: string,
    options: {
      sourceAddress?: string;
      remote?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: TunnelOperation[] = [];

    if (options.sourceAddress) {
      operations.push({ op: "set_source_address", value: options.sourceAddress });
    }

    if (options.remote) {
      operations.push({ op: "set_remote", value: options.remote });
    }

    return this.configureBatch({ interface: name, operations });
  }
}

export const tunnelService = new TunnelService();
