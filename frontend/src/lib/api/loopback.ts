import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface LoopbackInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  ip_source_validation: string | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  redirect: string | null;
}

export interface LoopbackConfigResponse {
  interfaces: LoopbackInterface[];
  total: number;
}

export interface LoopbackCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface LoopbackBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class LoopbackService {
  async getCapabilities(): Promise<LoopbackCapabilities> {
    return apiClient.get<LoopbackCapabilities>("/vyos/loopback/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<LoopbackConfigResponse> {
    return apiClient.get<LoopbackConfigResponse>("/vyos/loopback/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: LoopbackBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/loopback/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    description?: string;
    addresses?: string[];
    ip_source_validation?: string;
    mirror_ingress?: string;
    mirror_egress?: string;
    redirect?: string;
  }): Promise<VyOSResponse> {
    const operations: LoopbackBatchOperation[] = [];

    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }
    if (config.ip_source_validation) operations.push({ op: "set_ip_source_validation", value: config.ip_source_validation });
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: LoopbackInterface,
    updated: {
      description?: string | null;
      addresses?: string[];
      ip_source_validation?: string | null;
      mirror_ingress?: string | null;
      mirror_egress?: string | null;
      redirect?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: LoopbackBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", currentVal: current.description },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: current.ip_source_validation },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", currentVal: current.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", currentVal: current.mirror_egress },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
    ];

    for (const field of stringFields) {
      if (field.key in updated) {
        const newVal = updated[field.key] as string | null | undefined;
        if (newVal) {
          operations.push({ op: field.setOp, value: newVal });
        } else if (field.currentVal) {
          operations.push({ op: field.deleteOp });
        }
      }
    }

    // Array: addresses
    if (updated.addresses !== undefined) {
      for (const addr of current.addresses) {
        operations.push({ op: "delete_interface_address", value: addr });
      }
      for (const addr of updated.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const loopbackService = new LoopbackService();
