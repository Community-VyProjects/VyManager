import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import { conntrackSyncSaveOps, type ConntrackSyncDraft } from "./conntrack-sync-save-ops";

export interface ConntrackSyncInterface {
  name: string;
  peer?: string | null;
  port?: number | null;
}

export interface ConntrackSyncFailoverMechanism {
  vrrp?: {
    sync_group?: string | null;
  } | null;
}

export interface ConntrackSyncConfig {
  /** `service conntrack-sync` is present on the device. */
  configured: boolean;
  accept_protocols: string[];
  disable_external_cache: boolean;
  disable_syslog: boolean;
  event_listen_queue_size?: number | null;
  expect_sync: string[];
  failover_mechanism?: ConntrackSyncFailoverMechanism | null;
  ignore_addresses: string[];
  interfaces: ConntrackSyncInterface[];
  listen_addresses: string[];
  mcast_group?: string | null;
  purge_timeout?: number | null;
  startup_resync: boolean;
  sync_queue_size?: number | null;
  /** Names configured under `high-availability vrrp sync-group`. */
  vrrp_sync_groups: string[];
}

export interface ConntrackSyncRange {
  min: number;
  max: number;
}

interface Supported {
  supported: boolean;
}

export interface ConntrackSyncFeatures {
  accept_protocol: Supported & { options: string[] };
  disable_external_cache: Supported;
  disable_syslog: Supported;
  event_listen_queue_size: Supported & ConntrackSyncRange & { default: number };
  expect_sync: Supported & { options: string[] };
  failover_vrrp: Supported;
  ignore_address: Supported;
  interface: Supported;
  interface_peer: Supported & { families: string[] };
  interface_port: Supported & ConntrackSyncRange;
  listen_address: Supported & { families: string[] };
  mcast_group: Supported & { default: string; families: string[] };
  purge_timeout: Supported & ConntrackSyncRange;
  startup_resync: Supported;
  sync_queue_size: Supported & ConntrackSyncRange & { default: number };
}

export interface ConntrackSyncCapabilities {
  version: string;
  features: ConntrackSyncFeatures;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

class ConntrackSyncService {
  async getCapabilities(): Promise<ConntrackSyncCapabilities> {
    return apiClient.get<ConntrackSyncCapabilities>("/vyos/conntrack-sync/capabilities");
  }

  async getConfig(refresh = false): Promise<ConntrackSyncConfig> {
    return apiClient.get<ConntrackSyncConfig>("/vyos/conntrack-sync/config", {
      refresh: refresh.toString(),
    });
  }

  /** Commit one batch. A rejected commit throws an ApiError carrying the device error. */
  async batchConfigure(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/conntrack-sync/batch", {
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async saveConfig(original: ConntrackSyncConfig, draft: ConntrackSyncDraft): Promise<VyOSResponse> {
    return this.batchConfigure(conntrackSyncSaveOps(original, draft));
  }

  async deleteConntrackSync(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_conntrack_sync" }]);
  }
}

export const conntrackSyncService = new ConntrackSyncService();
