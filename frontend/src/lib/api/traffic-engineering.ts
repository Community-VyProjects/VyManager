import { apiClient } from "./client";
import type { ApiError } from "@/lib/types/api";
import {
  adminGroupOps,
  teDeleteOps,
  teInterfaceOps,
  type AdminGroupFields,
  type TeInterfaceFields,
  type TeRangeKey,
} from "./traffic-engineering-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface AdminGroup {
  name: string;
  bit_position: number | null;
}

export interface TeInterface {
  name: string;
  admin_groups: string[];
  max_bandwidth: number | null;
  max_reservable_bandwidth: number | null;
  metric: number | null;
}

export interface TrafficEngineeringConfig {
  /** `protocols traffic-engineering` exists on the device (a bare node counts). */
  configured: boolean;
  admin_groups: AdminGroup[];
  interfaces: TeInterface[];
}

export interface TrafficEngineeringCapabilities {
  version: string;
  features: {
    traffic_engineering: { supported: boolean; description: string };
    admin_groups: { supported: boolean; description: string };
    interface_params: { supported: boolean; description: string };
  };
  /** Lab val_help bounds, served by the builder; empty on 1.4. */
  ranges: Partial<Record<TeRangeKey, { min: number; max: number }>>;
  instance_name?: string;
  instance_id?: string;
}

export interface TeBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

// ============================================================================
// API Service. Op building lives in traffic-engineering-save-ops.ts; this only posts.
// ============================================================================

class TrafficEngineeringService {
  async getCapabilities(): Promise<TrafficEngineeringCapabilities> {
    return apiClient.get<TrafficEngineeringCapabilities>(
      "/vyos/traffic-engineering/capabilities"
    );
  }

  async getConfig(refresh = false): Promise<TrafficEngineeringConfig> {
    return apiClient.get<TrafficEngineeringConfig>(
      "/vyos/traffic-engineering/config",
      { refresh: refresh.toString() }
    );
  }

  /** POST one batch. An unchanged form sends nothing; a rejected commit throws the device error. */
  async batchConfigure(operations: TeBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/traffic-engineering/batch", {
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async createAdminGroup(fields: AdminGroupFields): Promise<VyOSResponse> {
    return this.batchConfigure(adminGroupOps(null, fields));
  }

  async updateAdminGroup(original: AdminGroup, fields: AdminGroupFields): Promise<VyOSResponse> {
    return this.batchConfigure(adminGroupOps(original, fields));
  }

  /** Drops the group from every interface that names it, in the same commit. */
  async deleteAdminGroup(name: string, interfaces: TeInterface[]): Promise<VyOSResponse> {
    return this.batchConfigure(teDeleteOps.adminGroup(name, interfaces));
  }

  async createInterface(fields: TeInterfaceFields): Promise<VyOSResponse> {
    return this.batchConfigure(teInterfaceOps(null, fields));
  }

  async updateInterface(original: TeInterface, fields: TeInterfaceFields): Promise<VyOSResponse> {
    return this.batchConfigure(teInterfaceOps(original, fields));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(teDeleteOps.interface(name));
  }

  async deleteTrafficEngineering(): Promise<VyOSResponse> {
    return this.batchConfigure(teDeleteOps.all());
  }
}

export const trafficEngineeringService = new TrafficEngineeringService();
