import { apiClient } from "./client";

// ============================================================================
// Config types (mirror backend Pydantic models)
// ============================================================================

export interface TFTPServerListenAddress {
  address: string;
  vrf: string | null;
}

export interface TFTPServerConfig {
  directory: string | null;
  allow_upload: boolean;
  port: string | null;
  listen_addresses: TFTPServerListenAddress[];
}

export interface TFTPServerCapabilities {
  version: string;
  features: {
    tftp_server: { supported: boolean; description: string };
    directory: { supported: boolean; description: string };
    allow_upload: { supported: boolean; description: string };
    port: { supported: boolean; description: string; default: string };
    listen_address: { supported: boolean; description: string };
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

export interface TFTPServerGeneralUpdate {
  original: TFTPServerConfig;
  directory: string;
  allowUpload: boolean;
  port: string; // "" = default (69)
}

export interface TFTPServerListenAddressUpdate {
  address: string;
  vrf: string; // "" = no VRF
}

// ============================================================================
// Service
// ============================================================================

class TFTPServerService {
  async getCapabilities(): Promise<TFTPServerCapabilities> {
    return apiClient.get<TFTPServerCapabilities>("/vyos/tftp-server/capabilities");
  }

  async getConfig(refresh = false): Promise<TFTPServerConfig> {
    return apiClient.get<TFTPServerConfig>("/vyos/tftp-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/tftp-server/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async updateGeneral(u: TFTPServerGeneralUpdate): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const o = u.original;

    const dir = u.directory.trim();
    if (dir !== (o.directory ?? "")) {
      if (dir === "") ops.push({ op: "delete_directory" });
      else ops.push({ op: "set_directory", value: dir });
    }

    if (u.allowUpload !== o.allow_upload) {
      ops.push({ op: u.allowUpload ? "set_allow_upload" : "delete_allow_upload" });
    }

    const port = u.port.trim();
    if (port !== (o.port ?? "")) {
      if (port === "") ops.push({ op: "delete_port" });
      else ops.push({ op: "set_port", value: port });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async saveListenAddress(
    original: TFTPServerListenAddress | null,
    u: TFTPServerListenAddressUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const addr = u.address.trim();
    if (original === null) ops.push({ op: "set_listen_address", value: addr });

    const vrf = u.vrf.trim();
    if (vrf !== (original?.vrf ?? "")) {
      if (vrf === "") ops.push({ op: "delete_listen_address_vrf", value: addr });
      else ops.push({ op: "set_listen_address_vrf", value: `${addr},${vrf}` });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteListenAddress(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_listen_address", value: address }]);
  }
}

export const tftpServerService = new TFTPServerService();
