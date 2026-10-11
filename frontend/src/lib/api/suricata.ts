import { apiClient } from "./client";
import { buildOps, type SuricataConfig, type SuricataOp } from "@/lib/suricata-model";

export interface SuricataCapabilities {
  version: string;
  features: {
    suricata: { supported: boolean; description: string };
    eve_log: {
      supported: boolean;
      description: string;
      filetypes: string[];
      types: string[];
    };
  };
  instance_name?: string;
  instance_id?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export function requestError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return err instanceof Error ? err.message : "Request failed";
}

class SuricataService {
  async getCapabilities(): Promise<SuricataCapabilities> {
    return apiClient.get<SuricataCapabilities>("/vyos/suricata/capabilities");
  }

  async getConfig(refresh = false): Promise<SuricataConfig> {
    return apiClient.get<SuricataConfig>("/vyos/suricata/config", {
      refresh: refresh ? "true" : "false",
    });
  }

  async batch(operations: SuricataOp[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/suricata/batch", { operations });
    if (!result.success) {
      throw new Error(result.error || "Suricata update failed");
    }
    return result;
  }

  async save(original: SuricataConfig, updated: SuricataConfig): Promise<VyOSResponse> {
    const operations = buildOps(original, updated);
    if (operations.length === 0) return { success: true };
    return this.batch(operations);
  }

  async remove(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_suricata" }]);
  }
}

export const suricataService = new SuricataService();
