import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface IgmpProxyInterface {
  name: string;
  role: string | null;
  threshold: number | null;
  alt_subnets: string[];
  whitelists: string[];
}

export interface IgmpProxyConfig {
  disabled: boolean;
  disable_quickleave: boolean;
  interfaces: IgmpProxyInterface[];
}

export interface IgmpProxyCapabilities {
  version: string;
  features: {
    igmp_proxy: { supported: boolean; description: string };
    disable: { supported: boolean; description: string };
    disable_quickleave: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    role: { supported: boolean; description: string };
    threshold: { supported: boolean; description: string };
    alt_subnet: { supported: boolean; description: string };
    whitelist: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface IgmpProxyBatchOperation {
  op: string;
  value?: string;
}

export interface IgmpProxyBatchGroup {
  interface?: string;
  operations: IgmpProxyBatchOperation[];
}

export interface IgmpProxyBatchRequest {
  groups: IgmpProxyBatchGroup[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class IgmpProxyService {
  async getCapabilities(): Promise<IgmpProxyCapabilities> {
    return apiClient.get<IgmpProxyCapabilities>("/vyos/igmp-proxy/capabilities");
  }

  async getConfig(refresh = false): Promise<IgmpProxyConfig> {
    return apiClient.get<IgmpProxyConfig>("/vyos/igmp-proxy/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: IgmpProxyBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/igmp-proxy/batch", request);
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private buildInterfaceOps(iface: IgmpProxyInterface): IgmpProxyBatchOperation[] {
    const operations: IgmpProxyBatchOperation[] = [
      { op: "set_interface" },
    ];
    if (iface.role) {
      operations.push({ op: "set_interface_role", value: iface.role });
    }
    if (iface.threshold != null) {
      operations.push({ op: "set_interface_threshold", value: String(iface.threshold) });
    }
    for (const subnet of iface.alt_subnets) {
      operations.push({ op: "set_interface_alt_subnet", value: subnet });
    }
    for (const wl of iface.whitelists) {
      operations.push({ op: "set_interface_whitelist", value: wl });
    }
    return operations;
  }

  // ==========================================================================
  // Global Operations
  // ==========================================================================

  async setDisabled(disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ operations: [{ op: disabled ? "set_disable" : "delete_disable" }] }],
    });
  }

  async setDisableQuickleave(disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ operations: [{ op: disabled ? "set_disable_quickleave" : "delete_disable_quickleave" }] }],
    });
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  /**
   * Set up multiple interfaces in a single atomic commit.
   * Required for initial setup (VyOS needs 1 upstream + >=1 downstream).
   */
  async setupInterfaces(interfaces: IgmpProxyInterface[]): Promise<VyOSResponse> {
    const groups: IgmpProxyBatchGroup[] = interfaces.map((iface) => ({
      interface: iface.name,
      operations: this.buildInterfaceOps(iface),
    }));
    return this.batchConfigure({ groups });
  }

  async createInterface(iface: IgmpProxyInterface): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ interface: iface.name, operations: this.buildInterfaceOps(iface) }],
    });
  }

  async updateInterface(original: IgmpProxyInterface, updated: IgmpProxyInterface): Promise<VyOSResponse> {
    const operations: IgmpProxyBatchOperation[] = [];

    // Role
    if (updated.role !== original.role) {
      if (updated.role) {
        operations.push({ op: "set_interface_role", value: updated.role });
      } else {
        operations.push({ op: "delete_interface_role" });
      }
    }

    // Threshold
    if (updated.threshold !== original.threshold) {
      if (updated.threshold != null) {
        operations.push({ op: "set_interface_threshold", value: String(updated.threshold) });
      } else {
        operations.push({ op: "delete_interface_threshold" });
      }
    }

    // Alt subnets - delete removed, add new
    const removedSubnets = original.alt_subnets.filter((s) => !updated.alt_subnets.includes(s));
    const addedSubnets = updated.alt_subnets.filter((s) => !original.alt_subnets.includes(s));
    for (const subnet of removedSubnets) {
      operations.push({ op: "delete_interface_alt_subnet", value: subnet });
    }
    for (const subnet of addedSubnets) {
      operations.push({ op: "set_interface_alt_subnet", value: subnet });
    }

    // Whitelists - delete removed, add new
    const removedWhitelists = original.whitelists.filter((w) => !updated.whitelists.includes(w));
    const addedWhitelists = updated.whitelists.filter((w) => !original.whitelists.includes(w));
    for (const wl of removedWhitelists) {
      operations.push({ op: "delete_interface_whitelist", value: wl });
    }
    for (const wl of addedWhitelists) {
      operations.push({ op: "set_interface_whitelist", value: wl });
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({
      groups: [{ interface: original.name, operations }],
    });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ interface: name, operations: [{ op: "delete_interface" }] }],
    });
  }
}

export const igmpProxyService = new IgmpProxyService();
