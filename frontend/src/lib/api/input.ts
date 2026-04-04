import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface InputInterface {
  name: string;
  type: string;
  description: string | null;
  disable: boolean | null;
  redirect: string | null;
}

export interface InputConfigResponse {
  interfaces: InputInterface[];
  total: number;
  by_type: Record<string, number>;
}

export interface InputCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  instance_name?: string;
  instance_id?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface InputBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class InputService {
  async getCapabilities(): Promise<InputCapabilities> {
    return apiClient.get<InputCapabilities>("/vyos/input/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<InputConfigResponse> {
    return apiClient.get<InputConfigResponse>("/vyos/input/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: InputBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/input/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    description?: string;
    redirect?: string;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const operations: InputBatchOperation[] = [];

    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.disabled) operations.push({ op: "set_interface_disable" });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: InputInterface,
    updated: {
      description?: string | null;
      redirect?: string | null;
      disabled?: boolean | null;
    }
  ): Promise<VyOSResponse> {
    const operations: InputBatchOperation[] = [];

    // String fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", currentVal: current.description },
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

    // Boolean: disable
    if (updated.disabled !== undefined) {
      const wasDisabled = current.disable ?? false;
      const willDisable = updated.disabled ?? false;
      if (willDisable !== wasDisabled) {
        operations.push({ op: willDisable ? "set_interface_disable" : "delete_interface_disable" });
      }
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const inputService = new InputService();
