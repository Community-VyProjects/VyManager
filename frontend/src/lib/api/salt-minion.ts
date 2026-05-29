import { apiClient } from "./client";

export interface SaltMinionConfig {
  hash: string | null;
  id: string | null;
  interval: number | null;
  master_key: string | null;
  masters: string[];
  source_interface: string | null;
}

export interface SaltMinionCapabilities {
  version: string;
  features: {
    salt_minion: { supported: boolean; description: string };
    hash: { supported: boolean; description: string; values: string[]; default: string };
    id: { supported: boolean; description: string };
    interval: { supported: boolean; description: string; range: { min: number; max: number }; default: number };
    master_key: { supported: boolean; description: string };
    master: { supported: boolean; description: string; multi_value: boolean };
    source_interface: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
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

export interface SaltMinionSettingsUpdate {
  original: SaltMinionConfig;
  masters: string[];
  id: string;
  interval: string;
  hash: string;
  masterKey: string;
  sourceInterface: string;
}

class SaltMinionService {
  async getCapabilities(): Promise<SaltMinionCapabilities> {
    return apiClient.get<SaltMinionCapabilities>("/vyos/salt-minion/capabilities");
  }

  async getConfig(refresh = false): Promise<SaltMinionConfig> {
    return apiClient.get<SaltMinionConfig>("/vyos/salt-minion/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/salt-minion/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async updateSettings(update: SaltMinionSettingsUpdate): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = update.original;

    // Masters (multi-value)
    const addedMasters = update.masters.filter((m) => !orig.masters.includes(m));
    const removedMasters = orig.masters.filter((m) => !update.masters.includes(m));
    for (const m of removedMasters) ops.push({ op: "delete_master", value: m });
    for (const m of addedMasters) ops.push({ op: "set_master", value: m });

    // Minion ID
    const origId = orig.id ?? "";
    if (update.id !== origId) {
      if (update.id === "") {
        ops.push({ op: "delete_id" });
      } else {
        ops.push({ op: "set_id", value: update.id });
      }
    }

    // Interval
    const origInterval = orig.interval !== null ? String(orig.interval) : "";
    if (update.interval !== origInterval) {
      if (update.interval === "") {
        ops.push({ op: "delete_interval" });
      } else {
        ops.push({ op: "set_interval", value: update.interval });
      }
    }

    // Hash — "default" sentinel means delete the node
    const origHash = orig.hash ?? "default";
    if (update.hash !== origHash) {
      if (update.hash === "default") {
        ops.push({ op: "delete_hash" });
      } else {
        ops.push({ op: "set_hash", value: update.hash });
      }
    }

    // Master key URL
    const origMasterKey = orig.master_key ?? "";
    if (update.masterKey !== origMasterKey) {
      if (update.masterKey === "") {
        ops.push({ op: "delete_master_key" });
      } else {
        ops.push({ op: "set_master_key", value: update.masterKey });
      }
    }

    // Source interface
    const origSourceInterface = orig.source_interface ?? "";
    if (update.sourceInterface !== origSourceInterface) {
      if (update.sourceInterface === "") {
        ops.push({ op: "delete_source_interface" });
      } else {
        ops.push({ op: "set_source_interface", value: update.sourceInterface });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }
}

export const saltMinionService = new SaltMinionService();
