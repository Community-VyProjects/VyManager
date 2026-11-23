/**
 * Firewall Flowtables API Service
 *
 * Provides typed methods for managing VyOS firewall flowtables.
 */

import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import { flowtableSaveOps, type FlowtableDraft } from "./firewall-flowtables-save-ops";

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

const NO_CHANGES: VyOSResponse = { success: true, data: { message: "No changes to apply" } };

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

  /** One commit for one flowtable. Throws ApiError on a rejected commit. */
  async batchConfigure(request: FlowtableBatchRequest): Promise<VyOSResponse> {
    if (request.operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/flowtables/batch", request);
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  /** Create (original null) or edit a flowtable in one commit. */
  async saveFlowtable(original: Flowtable | null, draft: FlowtableDraft): Promise<VyOSResponse> {
    return this.batchConfigure({
      flowtable_name: original?.name ?? draft.name.trim(),
      operations: flowtableSaveOps(original, draft),
    });
  }

  async deleteFlowtable(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({ flowtable_name: name, operations: [{ op: "delete_flowtable" }] });
  }
}

export const flowtablesService = new FlowtablesService();
