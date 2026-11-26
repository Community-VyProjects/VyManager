import { apiClient } from "./client";
import type { ApiError } from "@/lib/types/api";
import {
  rpkiCacheOps,
  rpkiDeleteOps,
  rpkiTimerOps,
  type RpkiCacheFields,
  type RpkiRangeKey,
  type RpkiTimerFields,
  type RpkiTimerKey,
} from "./rpki-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface RpkiSshConfig {
  key: string | null;
  username: string | null;
}

export interface RpkiCacheServer {
  address: string;
  port: number | null;
  preference: number | null;
  source_address: string | null;
  ssh: RpkiSshConfig | null;
}

export interface RpkiConfig {
  /** `protocols rpki` exists on the device (a bare node counts). */
  configured: boolean;
  cache_servers: RpkiCacheServer[];
  expire_interval: number | null;
  polling_period: number | null;
  retry_interval: number | null;
}

export interface RpkiCapabilities {
  version: string;
  features: {
    cache_servers: { supported: boolean; description: string };
    expire_interval: { supported: boolean; description: string };
    polling_period: { supported: boolean; description: string };
    retry_interval: { supported: boolean; description: string };
    cache_source_address: { supported: boolean; description: string };
    ssh_transport: { supported: boolean; description: string };
  };
  /** Lab syntax bounds, served by the builder. */
  ranges: Partial<Record<RpkiRangeKey, { min: number; max: number }>>;
  /** Lab defaults applied when a timer is unset. */
  defaults: Partial<Record<RpkiTimerKey, number>>;
  instance_name?: string;
  instance_id?: string;
}

export interface RpkiBatchOperation {
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
// API Service. Op building lives in rpki-save-ops.ts; this only posts.
// ============================================================================

class RpkiService {
  async getCapabilities(): Promise<RpkiCapabilities> {
    return apiClient.get<RpkiCapabilities>("/vyos/rpki/capabilities");
  }

  async getConfig(refresh = false): Promise<RpkiConfig> {
    return apiClient.get<RpkiConfig>("/vyos/rpki/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch. An unchanged form sends nothing; a rejected commit throws the device error. */
  async batchConfigure(operations: RpkiBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/rpki/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async createCacheServer(fields: RpkiCacheFields, caps: RpkiCapabilities | null): Promise<VyOSResponse> {
    return this.batchConfigure(rpkiCacheOps(null, fields, caps));
  }

  async updateCacheServer(
    original: RpkiCacheServer,
    fields: RpkiCacheFields,
    caps: RpkiCapabilities | null,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(rpkiCacheOps(original, fields, caps));
  }

  async deleteCacheServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure(rpkiDeleteOps.cache(address));
  }

  async updateGlobalSettings(original: RpkiConfig, fields: RpkiTimerFields): Promise<VyOSResponse> {
    return this.batchConfigure(rpkiTimerOps(original, fields));
  }

  async deleteRpki(): Promise<VyOSResponse> {
    return this.batchConfigure(rpkiDeleteOps.all());
  }
}

export const rpkiService = new RpkiService();
