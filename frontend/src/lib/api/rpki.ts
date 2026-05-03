import { apiClient } from "./client";

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
  cache_servers: RpkiCacheServer[];
  expire_interval: number | null;
  polling_period: number | null;
  retry_interval: number | null;
}

export interface RpkiCapabilities {
  version: string;
  version_info: { is_1_4: boolean; is_1_5: boolean };
  features: {
    cache_servers: { supported: boolean; description: string };
    expire_interval: { supported: boolean; description: string };
    polling_period: { supported: boolean; description: string };
    retry_interval: { supported: boolean; description: string };
    ssh_transport: { supported: boolean; description: string };
  };
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

// ============================================================================
// API Service
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

  private async batch(ops: RpkiBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/rpki/batch", {
      operations: ops,
    });
    if (!result.success) throw new Error(result.error || "RPKI operation failed");
    return result;
  }

  async createCacheServer(server: RpkiCacheServer): Promise<VyOSResponse> {
    const ops: RpkiBatchOperation[] = [{ op: "set_cache", value: server.address }];

    if (server.port != null) {
      ops.push({ op: "set_cache_port", value: `${server.address},${server.port}` });
    }
    if (server.preference != null) {
      ops.push({ op: "set_cache_preference", value: `${server.address},${server.preference}` });
    }
    if (server.source_address) {
      ops.push({ op: "set_cache_source_address", value: `${server.address},${server.source_address}` });
    }
    if (server.ssh?.key) {
      ops.push({ op: "set_cache_ssh_key", value: `${server.address},${server.ssh.key}` });
    }
    if (server.ssh?.username) {
      ops.push({ op: "set_cache_ssh_username", value: `${server.address},${server.ssh.username}` });
    }

    return this.batch(ops);
  }

  async updateCacheServer(
    original: RpkiCacheServer,
    updated: RpkiCacheServer
  ): Promise<VyOSResponse> {
    const ops: RpkiBatchOperation[] = [];
    const addr = original.address;

    if (original.port !== updated.port) {
      if (updated.port != null) {
        ops.push({ op: "set_cache_port", value: `${addr},${updated.port}` });
      } else {
        ops.push({ op: "delete_cache_port", value: addr });
      }
    }

    if (original.preference !== updated.preference) {
      if (updated.preference != null) {
        ops.push({ op: "set_cache_preference", value: `${addr},${updated.preference}` });
      } else {
        ops.push({ op: "delete_cache_preference", value: addr });
      }
    }

    if (original.source_address !== updated.source_address) {
      if (updated.source_address) {
        ops.push({ op: "set_cache_source_address", value: `${addr},${updated.source_address}` });
      } else {
        ops.push({ op: "delete_cache_source_address", value: addr });
      }
    }

    const hadSsh = original.ssh != null;
    const hasSsh = updated.ssh != null;

    if (hadSsh && !hasSsh) {
      ops.push({ op: "delete_cache_ssh", value: addr });
    } else {
      if (original.ssh?.key !== updated.ssh?.key) {
        if (updated.ssh?.key) {
          ops.push({ op: "set_cache_ssh_key", value: `${addr},${updated.ssh.key}` });
        } else {
          ops.push({ op: "delete_cache_ssh_key", value: addr });
        }
      }
      if (original.ssh?.username !== updated.ssh?.username) {
        if (updated.ssh?.username) {
          ops.push({ op: "set_cache_ssh_username", value: `${addr},${updated.ssh.username}` });
        } else {
          ops.push({ op: "delete_cache_ssh_username", value: addr });
        }
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batch(ops);
  }

  async deleteCacheServer(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_cache", value: address }]);
  }

  async updateGlobalSettings(
    current: Pick<RpkiConfig, "expire_interval" | "polling_period" | "retry_interval">,
    next: Pick<RpkiConfig, "expire_interval" | "polling_period" | "retry_interval">
  ): Promise<VyOSResponse> {
    const ops: RpkiBatchOperation[] = [];

    if (current.expire_interval !== next.expire_interval) {
      if (next.expire_interval != null) {
        ops.push({ op: "set_expire_interval", value: String(next.expire_interval) });
      } else {
        ops.push({ op: "delete_expire_interval" });
      }
    }

    if (current.polling_period !== next.polling_period) {
      if (next.polling_period != null) {
        ops.push({ op: "set_polling_period", value: String(next.polling_period) });
      } else {
        ops.push({ op: "delete_polling_period" });
      }
    }

    if (current.retry_interval !== next.retry_interval) {
      if (next.retry_interval != null) {
        ops.push({ op: "set_retry_interval", value: String(next.retry_interval) });
      } else {
        ops.push({ op: "delete_retry_interval" });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batch(ops);
  }
}

export const rpkiService = new RpkiService();
