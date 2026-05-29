import { apiClient } from "./client";

export interface OWAMPServerConfig {
  enabled: boolean;
  port: number | null;
}

export interface TWAMPServerConfig {
  enabled: boolean;
  port: number | null;
}

export interface SLAConfig {
  owamp_server: OWAMPServerConfig;
  twamp_server: TWAMPServerConfig;
}

export interface SLACapabilities {
  version: string;
  features: {
    sla: { supported: boolean; description: string };
    owamp_server: {
      supported: boolean;
      description: string;
      default_port: number;
      port_range: string;
    };
    twamp_server: {
      supported: boolean;
      description: string;
      default_port: number;
      port_range: string;
    };
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

class SLAService {
  async getCapabilities(): Promise<SLACapabilities> {
    return apiClient.get<SLACapabilities>("/vyos/sla/capabilities");
  }

  async getConfig(refresh = false): Promise<SLAConfig> {
    return apiClient.get<SLAConfig>("/vyos/sla/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/sla/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async updateSettings(
    original: SLAConfig,
    owampEnabled: boolean,
    owampPort: string,
    twampEnabled: boolean,
    twampPort: string
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    const origOwampPort =
      original.owamp_server.port !== null
        ? String(original.owamp_server.port)
        : "";
    const origTwampPort =
      original.twamp_server.port !== null
        ? String(original.twamp_server.port)
        : "";

    // OWAMP
    if (owampEnabled && !original.owamp_server.enabled) {
      ops.push({ op: "set_owamp_server" });
      if (owampPort) ops.push({ op: "set_owamp_server_port", value: owampPort });
    } else if (!owampEnabled && original.owamp_server.enabled) {
      ops.push({ op: "delete_owamp_server" });
    } else if (owampEnabled && original.owamp_server.enabled) {
      if (owampPort !== origOwampPort) {
        if (owampPort) {
          ops.push({ op: "set_owamp_server_port", value: owampPort });
        } else {
          ops.push({ op: "delete_owamp_server_port" });
        }
      }
    }

    // TWAMP
    if (twampEnabled && !original.twamp_server.enabled) {
      ops.push({ op: "set_twamp_server" });
      if (twampPort) ops.push({ op: "set_twamp_server_port", value: twampPort });
    } else if (!twampEnabled && original.twamp_server.enabled) {
      ops.push({ op: "delete_twamp_server" });
    } else if (twampEnabled && original.twamp_server.enabled) {
      if (twampPort !== origTwampPort) {
        if (twampPort) {
          ops.push({ op: "set_twamp_server_port", value: twampPort });
        } else {
          ops.push({ op: "delete_twamp_server_port" });
        }
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }
}

export const slaService = new SLAService();
