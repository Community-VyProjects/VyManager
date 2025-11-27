/**
 * Ethernet Interface API Service
 * Handles all ethernet interface operations
 */

import { apiClient } from "./client";
import type {
  EthernetConfigResponse,
  EthernetCapabilities,
  BatchRequest,
  VyOSResponse,
  BatchOperation,
} from "./types/ethernet";

class EthernetService {
  /**
   * Get ethernet interface capabilities based on VyOS version
   */
  async getCapabilities(): Promise<EthernetCapabilities> {
    return apiClient.get<EthernetCapabilities>("/vyos/ethernet/capabilities");
  }

  /**
   * Get all ethernet interface configurations
   */
  async getConfig(): Promise<EthernetConfigResponse> {
    return apiClient.get<EthernetConfigResponse>("/vyos/ethernet/config");
  }

  /**
   * Configure ethernet interface using batch operations
   */
  async batchConfigure(request: BatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ethernet/batch", request);
  }

  /**
   * Create a new ethernet interface with initial configuration
   */
  async createInterface(
    interfaceName: string,
    config: {
      description?: string;
      addresses?: string[];
      mtu?: string;
      duplex?: string;
      speed?: string;
      vrf?: string;
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: BatchOperation[] = [];

    if (config.description) {
      operations.push({ op: "set_description", value: config.description });
    }

    if (config.addresses && config.addresses.length > 0) {
      config.addresses.forEach((address) => {
        operations.push({ op: "set_address", value: address });
      });
    }

    if (config.mtu) {
      operations.push({ op: "set_mtu", value: config.mtu });
    }

    if (config.duplex) {
      operations.push({ op: "set_duplex", value: config.duplex });
    }

    if (config.speed) {
      operations.push({ op: "set_speed", value: config.speed });
    }

    if (config.vrf) {
      operations.push({ op: "set_vrf", value: config.vrf });
    }

    if (config.disable !== undefined) {
      operations.push({ op: config.disable ? "disable" : "enable" });
    }

    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  /**
   * Update an existing ethernet interface
   */
  async updateInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  /**
   * Delete an ethernet interface
   */
  async deleteInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Enable an interface
   */
  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  /**
   * Disable an interface
   */
  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "disable" }],
    });
  }

  /**
   * Refresh the configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const ethernetService = new EthernetService();
