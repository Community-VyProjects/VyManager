import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  ripngDeleteOps,
  ripngDistributeListGlobalOps,
  ripngDistributeListInterfaceOps,
  ripngInterfaceOps,
  ripngListOps,
  ripngRedistributeOps,
  ripngSettingsOps,
  type RipNgListKind,
  type RipNgSettingsDraft,
} from "./ripng-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface RipNgDistributeListGlobal {
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipNgDistributeListInterface {
  interface: string;
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipNgDistributeList {
  global_filters: RipNgDistributeListGlobal;
  interface_filters: RipNgDistributeListInterface[];
}

export interface RipNgInterface {
  name: string;
  split_horizon?: string | null;
}

export interface RipNgRedistribute {
  protocol: string;
  metric?: number | string | null;
  route_map?: string | null;
}

export interface RipNgTimers {
  update?: number | null;
  timeout?: number | null;
  garbage_collection?: number | null;
}

export interface RipNgConfig {
  /** True when a `protocols ripng` node exists, even a bare one. */
  configured: boolean;
  default_information_originate: boolean;
  default_metric?: number | null;
  route_map?: string | null;
  aggregate_addresses: string[];
  networks: string[];
  routes: string[];
  passive_interfaces: string[];
  distribute_list: RipNgDistributeList;
  interfaces: RipNgInterface[];
  redistribute: RipNgRedistribute[];
  timers: RipNgTimers;
}

/** Keys of the builder RANGES table served in capabilities. */
export type RipNgRangeKey = "metric" | "timer";

interface RipNgFeature {
  supported: boolean;
  description: string;
}

export interface RipNgCapabilities {
  version: string;
  features: {
    global_settings: RipNgFeature;
    aggregate_addresses: RipNgFeature;
    networks: RipNgFeature;
    static_routes: RipNgFeature;
    passive_interfaces: RipNgFeature;
    distribute_lists: RipNgFeature;
    interface_settings: RipNgFeature;
    redistribute: RipNgFeature & { protocols: string[] };
    timers: RipNgFeature;
  };
  ranges: Partial<Record<RipNgRangeKey, { min: number; max: number }>>;
  instance_name?: string;
  instance_id?: string;
}

export interface RipNgBatchOperation {
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
// API Service. Op building lives in ripng-save-ops.ts; this only posts.
// ============================================================================

class RipNgService {
  async getCapabilities(): Promise<RipNgCapabilities> {
    return apiClient.get<RipNgCapabilities>("/vyos/ripng/capabilities");
  }

  async getConfig(refresh = false): Promise<RipNgConfig> {
    return apiClient.get<RipNgConfig>("/vyos/ripng/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch. An unchanged form sends nothing; a rejected commit throws the device error. */
  async batchConfigure(operations: RipNgBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/ripng/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  /** Global settings and timers in one commit. */
  async updateSettings(original: RipNgConfig, updated: RipNgSettingsDraft): Promise<VyOSResponse> {
    return this.batchConfigure(ripngSettingsOps(original, updated));
  }

  async deleteRipng(): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDeleteOps.all());
  }

  /** Networks, aggregate addresses, static routes and passive interfaces. */
  async updateList(kind: RipNgListKind, original: string[], updated: string[]): Promise<VyOSResponse> {
    return this.batchConfigure(ripngListOps(kind, original, updated));
  }

  async removeListItem(kind: RipNgListKind, value: string): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDeleteOps.listItem(kind, value));
  }

  async createInterface(config: RipNgInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripngInterfaceOps(null, config));
  }

  async updateInterface(original: RipNgInterface, updated: RipNgInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripngInterfaceOps(original, updated));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDeleteOps.interface(name));
  }

  async createRedistribute(entry: RipNgRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ripngRedistributeOps(null, entry));
  }

  async updateRedistribute(original: RipNgRedistribute, updated: RipNgRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ripngRedistributeOps(original, updated));
  }

  async deleteRedistribute(protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDeleteOps.redistribute(protocol));
  }

  async updateDistributeListGlobal(
    original: RipNgDistributeListGlobal,
    updated: RipNgDistributeListGlobal,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDistributeListGlobalOps(original, updated));
  }

  async createDistributeListInterface(entry: RipNgDistributeListInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDistributeListInterfaceOps(null, entry));
  }

  async updateDistributeListInterface(
    original: RipNgDistributeListInterface,
    updated: RipNgDistributeListInterface,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDistributeListInterfaceOps(original, updated));
  }

  async deleteDistributeListInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(ripngDeleteOps.interfaceFilter(iface));
  }
}

export const ripNgService = new RipNgService();
