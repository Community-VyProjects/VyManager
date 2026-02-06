import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BabelInterface {
  name: string;
  type?: string | null; // auto, wired, wireless
  channel?: string | null; // 1-254, interfering, non-interfering
  hello_interval?: number | null; // 20-655340 ms
  update_interval?: number | null; // 20-655340 ms
  rxcost?: number | null; // 1-65534
  split_horizon?: string | null; // default, enable, disable
  enable_timestamps: boolean;
  max_rtt_penalty?: number | null; // 0-65535 ms
  rtt_decay?: number | null; // 1-256
  rtt_min?: number | null; // 1-65535 ms
  rtt_max?: number | null; // 1-65535 ms
}

export interface BabelParameters {
  diversity: boolean;
  diversity_factor?: number | null; // 1-256
  resend_delay?: number | null; // 20-655340 ms
  smoothing_half_life?: number | null; // 0-65534 seconds
}

export interface BabelRedistribute {
  ipv4: string[];
  ipv6: string[];
}

export interface DistributeListFilter {
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface DistributeListInterfaceFilter {
  interface: string;
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface BabelDistributeList {
  ipv4: DistributeListFilter;
  ipv6: DistributeListFilter;
  ipv4_interfaces: DistributeListInterfaceFilter[];
  ipv6_interfaces: DistributeListInterfaceFilter[];
}

export interface BabelConfig {
  interfaces: BabelInterface[];
  parameters: BabelParameters;
  redistribute: BabelRedistribute;
  distribute_list: BabelDistributeList;
}

export interface BabelCapabilities {
  version: string;
  features: {
    interfaces: { supported: boolean; description: string };
    parameters: { supported: boolean; description: string };
    redistribute: { supported: boolean; description: string };
    distribute_list: { supported: boolean; description: string };
    redistribute_nhrp: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  redistribute_protocols: {
    ipv4: string[];
    ipv6: string[];
  };
  instance_name?: string;
  instance_id?: string;
}

export interface BabelBatchOperation {
  op: string;
  value?: string;
}

export interface BabelBatchRequest {
  operations: BabelBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class BabelService {
  async getCapabilities(): Promise<BabelCapabilities> {
    return apiClient.get<BabelCapabilities>("/vyos/babel/capabilities");
  }

  async getConfig(refresh = false): Promise<BabelConfig> {
    return apiClient.get<BabelConfig>("/vyos/babel/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: BabelBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/babel/batch", request);
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  async createInterface(config: BabelInterface): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [
      { op: "set_interface", value: config.name },
    ];

    if (config.type) {
      operations.push({ op: "set_interface_type", value: `${config.name},${config.type}` });
    }
    if (config.channel) {
      operations.push({ op: "set_interface_channel", value: `${config.name},${config.channel}` });
    }
    if (config.hello_interval) {
      operations.push({ op: "set_interface_hello_interval", value: `${config.name},${config.hello_interval}` });
    }
    if (config.update_interval) {
      operations.push({ op: "set_interface_update_interval", value: `${config.name},${config.update_interval}` });
    }
    if (config.rxcost) {
      operations.push({ op: "set_interface_rxcost", value: `${config.name},${config.rxcost}` });
    }
    if (config.split_horizon) {
      operations.push({ op: "set_interface_split_horizon", value: `${config.name},${config.split_horizon}` });
    }
    if (config.enable_timestamps) {
      operations.push({ op: "set_interface_enable_timestamps", value: config.name });
    }
    if (config.max_rtt_penalty != null) {
      operations.push({ op: "set_interface_max_rtt_penalty", value: `${config.name},${config.max_rtt_penalty}` });
    }
    if (config.rtt_decay) {
      operations.push({ op: "set_interface_rtt_decay", value: `${config.name},${config.rtt_decay}` });
    }
    if (config.rtt_min) {
      operations.push({ op: "set_interface_rtt_min", value: `${config.name},${config.rtt_min}` });
    }
    if (config.rtt_max) {
      operations.push({ op: "set_interface_rtt_max", value: `${config.name},${config.rtt_max}` });
    }

    return this.batchConfigure({ operations });
  }

  async updateInterface(
    original: BabelInterface,
    updated: BabelInterface
  ): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [];
    const name = original.name;

    // Type
    if (updated.type !== original.type) {
      if (updated.type) {
        operations.push({ op: "set_interface_type", value: `${name},${updated.type}` });
      } else {
        operations.push({ op: "delete_interface_type", value: name });
      }
    }

    // Channel
    if (updated.channel !== original.channel) {
      if (updated.channel) {
        operations.push({ op: "set_interface_channel", value: `${name},${updated.channel}` });
      } else {
        operations.push({ op: "delete_interface_channel", value: name });
      }
    }

    // Hello interval
    if (updated.hello_interval !== original.hello_interval) {
      if (updated.hello_interval) {
        operations.push({ op: "set_interface_hello_interval", value: `${name},${updated.hello_interval}` });
      } else {
        operations.push({ op: "delete_interface_hello_interval", value: name });
      }
    }

    // Update interval
    if (updated.update_interval !== original.update_interval) {
      if (updated.update_interval) {
        operations.push({ op: "set_interface_update_interval", value: `${name},${updated.update_interval}` });
      } else {
        operations.push({ op: "delete_interface_update_interval", value: name });
      }
    }

    // Rxcost
    if (updated.rxcost !== original.rxcost) {
      if (updated.rxcost) {
        operations.push({ op: "set_interface_rxcost", value: `${name},${updated.rxcost}` });
      } else {
        operations.push({ op: "delete_interface_rxcost", value: name });
      }
    }

    // Split horizon
    if (updated.split_horizon !== original.split_horizon) {
      if (updated.split_horizon) {
        operations.push({ op: "set_interface_split_horizon", value: `${name},${updated.split_horizon}` });
      } else {
        operations.push({ op: "delete_interface_split_horizon", value: name });
      }
    }

    // Enable timestamps
    if (updated.enable_timestamps !== original.enable_timestamps) {
      if (updated.enable_timestamps) {
        operations.push({ op: "set_interface_enable_timestamps", value: name });
      } else {
        operations.push({ op: "delete_interface_enable_timestamps", value: name });
      }
    }

    // Max RTT penalty
    if (updated.max_rtt_penalty !== original.max_rtt_penalty) {
      if (updated.max_rtt_penalty != null) {
        operations.push({ op: "set_interface_max_rtt_penalty", value: `${name},${updated.max_rtt_penalty}` });
      } else {
        operations.push({ op: "delete_interface_max_rtt_penalty", value: name });
      }
    }

    // RTT decay
    if (updated.rtt_decay !== original.rtt_decay) {
      if (updated.rtt_decay) {
        operations.push({ op: "set_interface_rtt_decay", value: `${name},${updated.rtt_decay}` });
      } else {
        operations.push({ op: "delete_interface_rtt_decay", value: name });
      }
    }

    // RTT min
    if (updated.rtt_min !== original.rtt_min) {
      if (updated.rtt_min) {
        operations.push({ op: "set_interface_rtt_min", value: `${name},${updated.rtt_min}` });
      } else {
        operations.push({ op: "delete_interface_rtt_min", value: name });
      }
    }

    // RTT max
    if (updated.rtt_max !== original.rtt_max) {
      if (updated.rtt_max) {
        operations.push({ op: "set_interface_rtt_max", value: `${name},${updated.rtt_max}` });
      } else {
        operations.push({ op: "delete_interface_rtt_max", value: name });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_interface", value: name }],
    });
  }

  // ==========================================================================
  // Parameters Operations
  // ==========================================================================

  async updateParameters(
    original: BabelParameters,
    updated: BabelParameters
  ): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [];

    if (updated.diversity !== original.diversity) {
      operations.push({
        op: updated.diversity ? "set_parameters_diversity" : "delete_parameters_diversity",
      });
    }

    if (updated.diversity_factor !== original.diversity_factor) {
      if (updated.diversity_factor) {
        operations.push({ op: "set_parameters_diversity_factor", value: String(updated.diversity_factor) });
      } else {
        operations.push({ op: "delete_parameters_diversity_factor" });
      }
    }

    if (updated.resend_delay !== original.resend_delay) {
      if (updated.resend_delay) {
        operations.push({ op: "set_parameters_resend_delay", value: String(updated.resend_delay) });
      } else {
        operations.push({ op: "delete_parameters_resend_delay" });
      }
    }

    if (updated.smoothing_half_life !== original.smoothing_half_life) {
      if (updated.smoothing_half_life != null) {
        operations.push({ op: "set_parameters_smoothing_half_life", value: String(updated.smoothing_half_life) });
      } else {
        operations.push({ op: "delete_parameters_smoothing_half_life" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  // ==========================================================================
  // Redistribute Operations
  // ==========================================================================

  async updateRedistribute(
    original: BabelRedistribute,
    updated: BabelRedistribute
  ): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [];

    // IPv4 removals
    for (const proto of original.ipv4) {
      if (!updated.ipv4.includes(proto)) {
        operations.push({ op: "delete_redistribute_ipv4", value: proto });
      }
    }
    // IPv4 additions
    for (const proto of updated.ipv4) {
      if (!original.ipv4.includes(proto)) {
        operations.push({ op: "set_redistribute_ipv4", value: proto });
      }
    }

    // IPv6 removals
    for (const proto of original.ipv6) {
      if (!updated.ipv6.includes(proto)) {
        operations.push({ op: "delete_redistribute_ipv6", value: proto });
      }
    }
    // IPv6 additions
    for (const proto of updated.ipv6) {
      if (!original.ipv6.includes(proto)) {
        operations.push({ op: "set_redistribute_ipv6", value: proto });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  // ==========================================================================
  // Distribute List Operations
  // ==========================================================================

  async updateDistributeListGlobal(
    af: "ipv4" | "ipv6",
    original: DistributeListFilter,
    updated: DistributeListFilter
  ): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [];
    const prefix = `distribute_list_${af}`;

    if (updated.access_list_in !== original.access_list_in) {
      if (updated.access_list_in) {
        operations.push({ op: `set_${prefix}_access_list_in`, value: updated.access_list_in });
      } else {
        operations.push({ op: `delete_${prefix}_access_list_in` });
      }
    }

    if (updated.access_list_out !== original.access_list_out) {
      if (updated.access_list_out) {
        operations.push({ op: `set_${prefix}_access_list_out`, value: updated.access_list_out });
      } else {
        operations.push({ op: `delete_${prefix}_access_list_out` });
      }
    }

    if (updated.prefix_list_in !== original.prefix_list_in) {
      if (updated.prefix_list_in) {
        operations.push({ op: `set_${prefix}_prefix_list_in`, value: updated.prefix_list_in });
      } else {
        operations.push({ op: `delete_${prefix}_prefix_list_in` });
      }
    }

    if (updated.prefix_list_out !== original.prefix_list_out) {
      if (updated.prefix_list_out) {
        operations.push({ op: `set_${prefix}_prefix_list_out`, value: updated.prefix_list_out });
      } else {
        operations.push({ op: `delete_${prefix}_prefix_list_out` });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  async updateDistributeListInterface(
    af: "ipv4" | "ipv6",
    interfaceName: string,
    original: DistributeListInterfaceFilter | null,
    updated: DistributeListInterfaceFilter
  ): Promise<VyOSResponse> {
    const operations: BabelBatchOperation[] = [];
    const prefix = `distribute_list_${af}_iface`;
    const orig = original || { interface: interfaceName, access_list_in: null, access_list_out: null, prefix_list_in: null, prefix_list_out: null };

    if (updated.access_list_in !== orig.access_list_in) {
      if (updated.access_list_in) {
        operations.push({ op: `set_${prefix}_access_list_in`, value: `${interfaceName},${updated.access_list_in}` });
      } else {
        operations.push({ op: `delete_${prefix}_access_list_in`, value: interfaceName });
      }
    }

    if (updated.access_list_out !== orig.access_list_out) {
      if (updated.access_list_out) {
        operations.push({ op: `set_${prefix}_access_list_out`, value: `${interfaceName},${updated.access_list_out}` });
      } else {
        operations.push({ op: `delete_${prefix}_access_list_out`, value: interfaceName });
      }
    }

    if (updated.prefix_list_in !== orig.prefix_list_in) {
      if (updated.prefix_list_in) {
        operations.push({ op: `set_${prefix}_prefix_list_in`, value: `${interfaceName},${updated.prefix_list_in}` });
      } else {
        operations.push({ op: `delete_${prefix}_prefix_list_in`, value: interfaceName });
      }
    }

    if (updated.prefix_list_out !== orig.prefix_list_out) {
      if (updated.prefix_list_out) {
        operations.push({ op: `set_${prefix}_prefix_list_out`, value: `${interfaceName},${updated.prefix_list_out}` });
      } else {
        operations.push({ op: `delete_${prefix}_prefix_list_out`, value: interfaceName });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }
}

export const babelService = new BabelService();
