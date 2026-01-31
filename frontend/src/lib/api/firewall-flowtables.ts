/**
 * Firewall Flowtables API Service
 *
 * Provides typed methods for managing VyOS firewall flowtables.
 */

import { apiClient } from "./client";

// ==================== Type Definitions ====================

export interface Flowtable {
  name: string;
  description?: string | null;
  interfaces: string[];
  offload?: string | null; // "hardware" or "software"
}

export interface FlowtablesConfigResponse {
  flowtables: Flowtable[];
  total: number;
}

export interface FlowtablesCapabilities {
  version: string;
  features: {
    flowtables: {
      supported: boolean;
      description: string;
    };
    hardware_offload: {
      supported: boolean;
      description: string;
    };
    software_offload: {
      supported: boolean;
      description: string;
    };
  };
  offload_types: string[];
  instance_name?: string;
  instance_id?: string;
}

export interface FlowtableBatchOperation {
  op: string;
  value?: string | null;
}

export interface FlowtableBatchRequest {
  flowtable_name: string;
  operations: FlowtableBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ==================== Flowtables Service ====================

class FlowtablesService {
  /**
   * Get flowtables capabilities based on VyOS version
   */
  async getCapabilities(): Promise<FlowtablesCapabilities> {
    return apiClient.get<FlowtablesCapabilities>("/vyos/firewall/flowtables/capabilities");
  }

  /**
   * Get complete flowtables configuration
   */
  async getConfig(refresh: boolean = false): Promise<FlowtablesConfigResponse> {
    const endpoint = refresh
      ? "/vyos/firewall/flowtables/config?refresh=true"
      : "/vyos/firewall/flowtables/config";
    return apiClient.get<FlowtablesConfigResponse>(endpoint);
  }

  /**
   * Execute batch flowtable operations
   */
  async batchConfigure(request: FlowtableBatchRequest): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>(
        "/vyos/firewall/flowtables/batch",
        request
      );
      return response;
    } catch (error: unknown) {
      const err = error as { details?: { detail?: string }; message?: string };
      const errorMessage = err?.details?.detail || err?.message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new flowtable
   */
  async createFlowtable(
    name: string,
    config: {
      description?: string;
      interfaces?: string[];
      offload?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: FlowtableBatchOperation[] = [{ op: "set_flowtable" }];

    if (config.description) {
      operations.push({ op: "set_flowtable_description", value: config.description });
    }

    if (config.interfaces && config.interfaces.length > 0) {
      for (const iface of config.interfaces) {
        operations.push({ op: "set_flowtable_interface", value: iface });
      }
    }

    if (config.offload) {
      operations.push({ op: "set_flowtable_offload", value: config.offload });
    }

    const result = await this.batchConfigure({
      flowtable_name: name,
      operations,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create flowtable");
    }

    return result;
  }

  /**
   * Update an existing flowtable
   */
  async updateFlowtable(
    name: string,
    config: {
      description?: string;
      interfaces?: string[];
      offload?: string;
    },
    originalFlowtable: Flowtable
  ): Promise<VyOSResponse> {
    const operations: FlowtableBatchOperation[] = [];

    // Handle description
    if (config.description) {
      operations.push({ op: "set_flowtable_description", value: config.description });
    } else if (originalFlowtable.description) {
      operations.push({ op: "delete_flowtable_description" });
    }

    // Handle interfaces - delete old ones, add new ones
    const oldInterfaces = originalFlowtable.interfaces || [];
    const newInterfaces = config.interfaces || [];

    // Delete interfaces that are no longer present
    for (const iface of oldInterfaces) {
      if (!newInterfaces.includes(iface)) {
        operations.push({ op: "delete_flowtable_interface", value: iface });
      }
    }

    // Add new interfaces
    for (const iface of newInterfaces) {
      if (!oldInterfaces.includes(iface)) {
        operations.push({ op: "set_flowtable_interface", value: iface });
      }
    }

    // Handle offload
    if (config.offload) {
      operations.push({ op: "set_flowtable_offload", value: config.offload });
    } else if (originalFlowtable.offload) {
      operations.push({ op: "delete_flowtable_offload" });
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes to apply" } };
    }

    const result = await this.batchConfigure({
      flowtable_name: name,
      operations,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update flowtable");
    }

    return result;
  }

  /**
   * Delete a flowtable
   */
  async deleteFlowtable(name: string): Promise<VyOSResponse> {
    try {
      const response = await apiClient.delete<VyOSResponse>(
        `/vyos/firewall/flowtables/${encodeURIComponent(name)}`
      );
      return response;
    } catch (error: unknown) {
      const err = error as { details?: { detail?: string }; message?: string };
      const errorMessage = err?.details?.detail || err?.message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh", {});
  }
}

export const flowtablesService = new FlowtablesService();
