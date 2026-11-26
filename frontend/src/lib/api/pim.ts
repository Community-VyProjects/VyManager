import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  pimDeleteOps,
  pimGlobalOps,
  pimInterfaceDeleteOps,
  pimInterfaceOps,
  pimRpDeleteOps,
  pimRpOps,
  pimRpTimerOps,
  type PimGlobalDraft,
  type PimInterfaceDraft,
} from "./pim-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PimIgmpJoin {
  group: string;
  source_addresses: string[];
}

export interface PimInterfaceIgmp {
  disabled: boolean;
  joins: PimIgmpJoin[];
  query_interval: number | null;
  query_max_response_time: number | null;
  version: number | null;
}

export interface PimInterface {
  name: string;
  bfd: boolean;
  bfd_profile: string | null;
  dr_priority: number | null;
  hello: number | null;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  source_address: string | null;
  igmp: PimInterfaceIgmp | null;
}

export interface PimRpAddress {
  address: string;
  groups: string[];
}

export interface PimRp {
  addresses: PimRpAddress[];
  keep_alive_timer: number | null;
}

export interface PimSptSwitchover {
  infinity_and_beyond: boolean;
  prefix_list: string | null;
}

export interface PimConfig {
  /** True when a `protocols pim` node exists, even a bare one. */
  configured: boolean;
  ecmp: boolean;
  ecmp_rebalance: boolean;
  igmp_watermark_warning: number | null;
  interfaces: PimInterface[];
  join_prune_interval: number | null;
  keep_alive_timer: number | null;
  no_v6_secondary: boolean;
  packets: number | null;
  register_accept_list_prefix_list: string | null;
  register_suppress_time: number | null;
  rp: PimRp | null;
  spt_switchover: PimSptSwitchover | null;
  ssm_prefix_list: string | null;
}

/** Keys of the builder RANGES table served in capabilities. */
export type PimRangeKey =
  | "timer"
  | "packets"
  | "watermark_warning"
  | "dr_priority"
  | "hello"
  | "query_interval"
  | "query_max_response_time"
  | "igmp_version";

export interface PimCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  ranges: Partial<Record<PimRangeKey, { min: number; max: number }>>;
  instance_name?: string;
  instance_id?: string;
}

export interface PimBatchOperation {
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
// API Service. Op building lives in pim-save-ops.ts; this only posts.
// ============================================================================

class PimService {
  async getCapabilities(): Promise<PimCapabilities> {
    return apiClient.get<PimCapabilities>("/vyos/pim/capabilities");
  }

  async getConfig(refresh = false): Promise<PimConfig> {
    return apiClient.get<PimConfig>("/vyos/pim/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch. An unchanged form sends nothing; a rejected commit throws the device error. */
  async batchConfigure(operations: PimBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/pim/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async updateGlobalSettings(original: PimConfig, updated: PimGlobalDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pimGlobalOps(original, updated));
  }

  async updateRpKeepAliveTimer(original: PimConfig, value: string): Promise<VyOSResponse> {
    return this.batchConfigure(pimRpTimerOps(original, value));
  }

  async createInterface(iface: PimInterfaceDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pimInterfaceOps(null, iface));
  }

  async updateInterface(original: PimInterface, updated: PimInterfaceDraft): Promise<VyOSResponse> {
    return this.batchConfigure(pimInterfaceOps(original, updated));
  }

  /** The last interface's delete removes all of `protocols pim` (the lab rejects PIM with no interface). */
  async deleteInterface(config: PimConfig, name: string): Promise<VyOSResponse> {
    return this.batchConfigure(pimInterfaceDeleteOps(config, name));
  }

  async createRpAddress(rp: PimRpAddress): Promise<VyOSResponse> {
    return this.batchConfigure(pimRpOps(null, rp));
  }

  /** Removing the last group deletes the address; the last address deletes the whole `rp` node. */
  async updateRpAddress(config: PimConfig, original: PimRpAddress, updated: PimRpAddress): Promise<VyOSResponse> {
    return this.batchConfigure(pimRpOps(original, updated, config));
  }

  /** The last address deletes the whole `rp` node with its keep-alive-timer (the lab rejects an empty `rp`). */
  async deleteRpAddress(config: PimConfig, address: string): Promise<VyOSResponse> {
    return this.batchConfigure(pimRpDeleteOps(config, address));
  }

  async deletePim(): Promise<VyOSResponse> {
    return this.batchConfigure(pimDeleteOps.all());
  }
}

export const pimService = new PimService();
