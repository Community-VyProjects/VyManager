import { apiClient } from "./client";
import type { ApiError } from "@/lib/types/api";
import {
  broadcastRelayCreateOps,
  broadcastRelayDeleteInstanceOps,
  broadcastRelayUpdateOps,
} from "./broadcast-relay-save-ops";

export interface BroadcastRelayInstance {
  id: string;
  address?: string | null;
  description?: string | null;
  disabled: boolean;
  interfaces: string[];
  port?: number | null;
}

export interface BroadcastRelayConfig {
  /** `service broadcast-relay` exists; a bare root with no instances counts. */
  configured: boolean;
  globally_disabled: boolean;
  instances: BroadcastRelayInstance[];
}

export interface BroadcastRelayCapabilities {
  version: string;
  features: {
    broadcast_relay: { supported: boolean; description: string };
    global_disable: { supported: boolean; description: string };
    instance_id_range: { supported: boolean; description: string; min: number; max: number };
    address: { supported: boolean; description: string };
    description: { supported: boolean; description: string };
    instance_disable: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    port: { supported: boolean; description: string; min: number; max: number };
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true };

class BroadcastRelayService {
  async getCapabilities(): Promise<BroadcastRelayCapabilities> {
    return apiClient.get<BroadcastRelayCapabilities>("/vyos/broadcast-relay/capabilities");
  }

  async getConfig(refresh = false): Promise<BroadcastRelayConfig> {
    return apiClient.get<BroadcastRelayConfig>("/vyos/broadcast-relay/config", {
      refresh: refresh.toString(),
    });
  }

  /** Post one batch (none when empty); a rejected commit throws an `ApiError`. */
  async batchConfigure(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/broadcast-relay/batch", {
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async setGlobalDisable(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "set_global_disable" }]);
  }

  async deleteGlobalDisable(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_global_disable" }]);
  }

  /** `delete service broadcast-relay`: every instance and the global flag. */
  async deleteService(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_broadcast_relay" }]);
  }

  async createInstance(instance: BroadcastRelayInstance): Promise<VyOSResponse> {
    return this.batchConfigure(broadcastRelayCreateOps(instance));
  }

  async updateInstance(
    original: BroadcastRelayInstance,
    updated: BroadcastRelayInstance,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(broadcastRelayUpdateOps(original, updated));
  }

  /** Deleting the last instance under a global disable also drops the flag (see save-ops). */
  async deleteInstance(config: BroadcastRelayConfig, id: string): Promise<VyOSResponse> {
    return this.batchConfigure(broadcastRelayDeleteInstanceOps(config, id));
  }
}

export const broadcastRelayService = new BroadcastRelayService();
