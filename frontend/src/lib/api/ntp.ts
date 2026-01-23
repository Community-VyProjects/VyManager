/**
 * NTP Service API
 * Handles all NTP service related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface NTPServer {
  address: string;
  pool: boolean;
  prefer: boolean;
  noselect: boolean;
  nts: boolean;
}

export interface NTPConfig {
  configured: boolean;
  servers: NTPServer[];
  listen_addresses: string[];
  allow_clients: string[];
  leap_second?: string;
  vrf?: string;
}

export interface NTPCapabilities {
  leap_second_modes: { value: string; label: string; description: string }[];
  common_pools: { value: string; label: string; description: string }[];
  server_flags: { value: string; label: string; description: string }[];
  version: string;
}

export interface NTPOperation {
  op: string;
  server?: string;
  address?: string;
  network?: string;
  mode?: string;
  vrf?: string;
  pool?: boolean;
  prefer?: boolean;
  noselect?: boolean;
  nts?: boolean;
}

export interface NTPBatchRequest {
  operations: NTPOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class NTPService {
  /**
   * Get NTP configuration
   */
  async getConfig(): Promise<NTPConfig> {
    return apiClient.get<NTPConfig>("/vyos/ntp/config");
  }

  /**
   * Get NTP capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<NTPCapabilities> {
    return apiClient.get<NTPCapabilities>("/vyos/ntp/capabilities");
  }

  /**
   * Get NTP status
   */
  async getStatus(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/ntp/status");
  }

  /**
   * Configure NTP using batch operations
   */
  async configureBatch(request: NTPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ntp/batch", request);
  }

  // =========================================================================
  // Server Helper Methods
  // =========================================================================

  /**
   * Add an NTP server
   */
  async addServer(
    server: string,
    options?: {
      pool?: boolean;
      prefer?: boolean;
      noselect?: boolean;
      nts?: boolean;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_server",
        server,
        pool: options?.pool,
        prefer: options?.prefer,
        noselect: options?.noselect,
        nts: options?.nts,
      }],
    });
  }

  /**
   * Remove an NTP server
   */
  async removeServer(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_server", server }],
    });
  }

  /**
   * Set server as pool
   */
  async setServerPool(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_server_pool", server }],
    });
  }

  /**
   * Unset server as pool
   */
  async unsetServerPool(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "unset_server_pool", server }],
    });
  }

  /**
   * Set server as preferred
   */
  async setServerPrefer(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_server_prefer", server }],
    });
  }

  /**
   * Unset server as preferred
   */
  async unsetServerPrefer(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "unset_server_prefer", server }],
    });
  }

  // =========================================================================
  // Listen Address Helper Methods
  // =========================================================================

  /**
   * Add a listen address
   */
  async addListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_listen_address", address }],
    });
  }

  /**
   * Remove a listen address
   */
  async removeListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_listen_address", address }],
    });
  }

  // =========================================================================
  // Client Access Helper Methods
  // =========================================================================

  /**
   * Allow a client network
   */
  async addAllowClient(network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_allow_client", network }],
    });
  }

  /**
   * Remove an allowed client network
   */
  async removeAllowClient(network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_allow_client", network }],
    });
  }

  // =========================================================================
  // Misc Helper Methods
  // =========================================================================

  /**
   * Set leap second mode
   */
  async setLeapSecond(mode: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_leap_second", mode }],
    });
  }

  /**
   * Remove leap second configuration
   */
  async deleteLeapSecond(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_leap_second" }],
    });
  }

  /**
   * Set VRF
   */
  async setVrf(vrf: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_vrf", vrf }],
    });
  }

  /**
   * Remove VRF configuration
   */
  async deleteVrf(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrf" }],
    });
  }

  // =========================================================================
  // Quick Setup Helper
  // =========================================================================

  /**
   * Quick setup for NTP service
   */
  async quickSetup(config: {
    servers: { address: string; pool?: boolean; prefer?: boolean }[];
    listenAddresses?: string[];
    allowClients?: string[];
  }): Promise<VyOSResponse> {
    const operations: NTPOperation[] = [];

    // Add servers
    for (const server of config.servers) {
      operations.push({
        op: "add_server",
        server: server.address,
        pool: server.pool,
        prefer: server.prefer,
      });
    }

    // Add listen addresses
    if (config.listenAddresses) {
      for (const address of config.listenAddresses) {
        operations.push({ op: "add_listen_address", address });
      }
    }

    // Add allowed clients
    if (config.allowClients) {
      for (const network of config.allowClients) {
        operations.push({ op: "add_allow_client", network });
      }
    }

    return this.configureBatch({ operations });
  }
}

export const ntpService = new NTPService();
