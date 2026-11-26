import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  pim6DeleteOps,
  pim6GlobalOps,
  pim6InterfaceOps,
  pim6RpDeleteOps,
  pim6RpOps,
  pim6RpTimerOps,
  type Pim6GlobalDraft,
  type Pim6InterfaceDraft,
} from "./pim6-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Pim6MldJoin {
  group: string;
  sources: string[];
}

export interface Pim6InterfaceMld {
  disabled: boolean;
  interval: number | null;
  last_member_query_count: number | null;
  last_member_query_interval: number | null;
  max_response_time: number | null;
  version: number | null;
  joins: Pim6MldJoin[];
}

export interface Pim6Interface {
  name: string;
  dr_priority: number | null;
  hello: number | null;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  mld: Pim6InterfaceMld | null;
}

export interface Pim6RpAddress {
  address: string;
  groups: string[];
  prefix_list6: string | null;
}

export interface Pim6Rp {
  addresses: Pim6RpAddress[];
  keep_alive_timer: number | null;
}

export interface Pim6Config {
  /** True when a `protocols pim6` node exists, even a bare one. */
  configured: boolean;
  interfaces: Pim6Interface[];
  join_prune_interval: number | null;
  keep_alive_timer: number | null;
  packets: number | null;
  register_suppress_time: number | null;
  rp: Pim6Rp | null;
}

/** Keys of the builder RANGES table served in capabilities. */
export type Pim6RangeKey =
  | "timer"
  | "packets"
  | "dr_priority"
  | "hello"
  | "mld_interval"
  | "last_member_query_count"
  | "last_member_query_interval"
  | "max_response_time"
  | "mld_version";

export interface Pim6Capabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  ranges: Partial<Record<Pim6RangeKey, { min: number; max: number }>>;
  instance_name?: string;
  instance_id?: string;
}

export interface Pim6BatchOperation {
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
// API Service. Op building lives in pim6-save-ops.ts; this only posts.
// ============================================================================

class Pim6Service {
  async getCapabilities(): Promise<Pim6Capabilities> {
    return apiClient.get<Pim6Capabilities>("/vyos/pim6/capabilities");
  }

  async getConfig(refresh = false): Promise<Pim6Config> {
    return apiClient.get<Pim6Config>("/vyos/pim6/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch. An unchanged form sends nothing; a rejected commit throws the device error. */
  async batchConfigure(operations: Pim6BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/pim6/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async updateGlobalSettings(original: Pim6Config, updated: Pim6GlobalDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pim6GlobalOps(original, updated));
  }

  async updateRpKeepAliveTimer(original: Pim6Config, value: string): Promise<VyOSResponse> {
    return this.batchConfigure(pim6RpTimerOps(original, value));
  }

  async createInterface(iface: Pim6InterfaceDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pim6InterfaceOps(null, iface));
  }

  async updateInterface(original: Pim6Interface, updated: Pim6InterfaceDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pim6InterfaceOps(original, updated));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(pim6DeleteOps.interface(name));
  }

  async createRpAddress(rp: Pim6RpAddress): Promise<VyOSResponse> {
    return this.batchConfigure(pim6RpOps(null, rp));
  }

  async updateRpAddress(original: Pim6RpAddress, updated: Pim6RpAddress): Promise<VyOSResponse> {
    return this.batchConfigure(pim6RpOps(original, updated));
  }

  /** The last address deletes the whole `rp` node with its keep-alive-timer (the lab rejects an empty `rp`). */
  async deleteRpAddress(config: Pim6Config, address: string): Promise<VyOSResponse> {
    return this.batchConfigure(pim6RpDeleteOps(config, address));
  }

  async deletePim6(): Promise<VyOSResponse> {
    return this.batchConfigure(pim6DeleteOps.all());
  }
}

export const pim6Service = new Pim6Service();
