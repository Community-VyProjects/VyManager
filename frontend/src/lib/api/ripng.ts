import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface RipNgDistributeListGlobal {
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipNgDistributeListInterface {
  interface: string;
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipNgDistributeList {
  global_filters: RipNgDistributeListGlobal;
  interface_filters: RipNgDistributeListInterface[];
}

export interface RipNgInterface {
  name: string;
  split_horizon?: string | null;
}

export interface RipNgRedistribute {
  protocol: string;
  metric?: number | null;
  route_map?: string | null;
}

export interface RipNgTimers {
  update?: number | null;
  timeout?: number | null;
  garbage_collection?: number | null;
}

export interface RipNgConfig {
  default_information_originate: boolean;
  default_metric?: number | null;
  route_map?: string | null;
  aggregate_addresses: string[];
  networks: string[];
  routes: string[];
  passive_interfaces: string[];
  distribute_list: RipNgDistributeList;
  interfaces: RipNgInterface[];
  redistribute: RipNgRedistribute[];
  timers: RipNgTimers;
}

export interface RipNgCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: {
    global_settings: { supported: boolean; description: string };
    aggregate_addresses: { supported: boolean; description: string };
    networks: { supported: boolean; description: string };
    static_routes: { supported: boolean; description: string };
    passive_interfaces: { supported: boolean; description: string };
    distribute_lists: { supported: boolean; description: string };
    interface_settings: { supported: boolean; description: string };
    redistribute: { supported: boolean; description: string; protocols: string[] };
    timers: { supported: boolean; description: string };
  };
  instance_name?: string;
  instance_id?: string;
}

export interface RipNgBatchOperation {
  op: string;
  value?: string;
}

export interface RipNgBatchRequest {
  operations: RipNgBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class RipNgService {
  async getCapabilities(): Promise<RipNgCapabilities> {
    return apiClient.get<RipNgCapabilities>("/vyos/ripng/capabilities");
  }

  async getConfig(refresh = false): Promise<RipNgConfig> {
    return apiClient.get<RipNgConfig>("/vyos/ripng/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: RipNgBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ripng/batch", request);
    if (!result.success) throw new Error(result.error || "Operation failed");
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Global Settings
  // ==========================================================================

  async updateGlobalSettings(
    original: RipNgConfig,
    updated: Partial<RipNgConfig>
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];

    if (updated.default_metric !== original.default_metric) {
      ops.push(
        updated.default_metric != null
          ? { op: "set_default_metric", value: String(updated.default_metric) }
          : { op: "delete_default_metric" }
      );
    }

    if (updated.route_map !== original.route_map) {
      ops.push(
        updated.route_map
          ? { op: "set_route_map", value: updated.route_map }
          : { op: "delete_route_map" }
      );
    }

    if (
      updated.default_information_originate !== undefined &&
      updated.default_information_originate !== original.default_information_originate
    ) {
      ops.push(
        updated.default_information_originate
          ? { op: "set_default_information_originate" }
          : { op: "delete_default_information_originate" }
      );
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async updateTimers(
    original: RipNgTimers,
    updated: RipNgTimers
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];

    if (updated.update !== original.update) {
      ops.push(
        updated.update != null
          ? { op: "set_timers_update", value: String(updated.update) }
          : { op: "delete_timers_update" }
      );
    }

    if (updated.timeout !== original.timeout) {
      ops.push(
        updated.timeout != null
          ? { op: "set_timers_timeout", value: String(updated.timeout) }
          : { op: "delete_timers_timeout" }
      );
    }

    if (updated.garbage_collection !== original.garbage_collection) {
      ops.push(
        updated.garbage_collection != null
          ? { op: "set_timers_garbage_collection", value: String(updated.garbage_collection) }
          : { op: "delete_timers_garbage_collection" }
      );
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  // ==========================================================================
  // Networks / Aggregate Addresses / Routes / Passive Interfaces
  // ==========================================================================

  async addNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_network", value: network }] });
  }

  async removeNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_network", value: network }] });
  }

  async addAggregateAddress(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_aggregate_address", value: prefix }] });
  }

  async removeAggregateAddress(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_aggregate_address", value: prefix }] });
  }

  async addRoute(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_route", value: prefix }] });
  }

  async removeRoute(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_route", value: prefix }] });
  }

  async addPassiveInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_passive_interface", value: iface }] });
  }

  async removePassiveInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_passive_interface", value: iface }] });
  }

  // ==========================================================================
  // Interface Settings (split-horizon only)
  // ==========================================================================

  async createInterface(config: RipNgInterface): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [{ op: "set_interface", value: config.name }];
    if (config.split_horizon === "disable") {
      ops.push({ op: "set_interface_split_horizon_disable", value: config.name });
    } else if (config.split_horizon === "poison-reverse") {
      ops.push({ op: "set_interface_split_horizon_poison_reverse", value: config.name });
    }
    return this.batchConfigure({ operations: ops });
  }

  async updateInterface(
    original: RipNgInterface,
    updated: RipNgInterface
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];
    const name = original.name;

    if (updated.split_horizon !== original.split_horizon) {
      if (original.split_horizon) {
        ops.push({ op: "delete_interface_split_horizon", value: name });
      }
      if (updated.split_horizon === "disable") {
        ops.push({ op: "set_interface_split_horizon_disable", value: name });
      } else if (updated.split_horizon === "poison-reverse") {
        ops.push({ op: "set_interface_split_horizon_poison_reverse", value: name });
      }
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_interface", value: name }] });
  }

  // ==========================================================================
  // Redistribute
  // ==========================================================================

  async createRedistribute(entry: RipNgRedistribute): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [{ op: "set_redistribute", value: entry.protocol }];
    if (entry.metric != null) {
      ops.push({ op: "set_redistribute_metric", value: `${entry.protocol},${entry.metric}` });
    }
    if (entry.route_map) {
      ops.push({ op: "set_redistribute_route_map", value: `${entry.protocol},${entry.route_map}` });
    }
    return this.batchConfigure({ operations: ops });
  }

  async updateRedistribute(
    original: RipNgRedistribute,
    updated: RipNgRedistribute
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];
    const proto = original.protocol;

    if (updated.metric !== original.metric) {
      ops.push(
        updated.metric != null
          ? { op: "set_redistribute_metric", value: `${proto},${updated.metric}` }
          : { op: "set_redistribute", value: proto }
      );
    }

    if (updated.route_map !== original.route_map) {
      if (updated.route_map) {
        ops.push({ op: "set_redistribute_route_map", value: `${proto},${updated.route_map}` });
      } else {
        ops.push({ op: "delete_redistribute", value: proto });
        ops.push({ op: "set_redistribute", value: proto });
        if (updated.metric != null) {
          ops.push({ op: "set_redistribute_metric", value: `${proto},${updated.metric}` });
        }
      }
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async deleteRedistribute(protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_redistribute", value: protocol }] });
  }

  // ==========================================================================
  // Distribute List - Global
  // ==========================================================================

  async updateDistributeListGlobal(
    original: RipNgDistributeListGlobal,
    updated: RipNgDistributeListGlobal
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];

    if (updated.access_list_in !== original.access_list_in) {
      ops.push(
        updated.access_list_in
          ? { op: "set_distribute_list_access_list_in", value: updated.access_list_in }
          : { op: "delete_distribute_list_access_list_in" }
      );
    }

    if (updated.access_list_out !== original.access_list_out) {
      ops.push(
        updated.access_list_out
          ? { op: "set_distribute_list_access_list_out", value: updated.access_list_out }
          : { op: "delete_distribute_list_access_list_out" }
      );
    }

    if (updated.prefix_list_in !== original.prefix_list_in) {
      ops.push(
        updated.prefix_list_in
          ? { op: "set_distribute_list_prefix_list_in", value: updated.prefix_list_in }
          : { op: "delete_distribute_list_prefix_list_in" }
      );
    }

    if (updated.prefix_list_out !== original.prefix_list_out) {
      ops.push(
        updated.prefix_list_out
          ? { op: "set_distribute_list_prefix_list_out", value: updated.prefix_list_out }
          : { op: "delete_distribute_list_prefix_list_out" }
      );
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  // ==========================================================================
  // Distribute List - Per Interface
  // ==========================================================================

  async createDistributeListInterface(
    entry: RipNgDistributeListInterface
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];
    const iface = entry.interface;
    if (entry.access_list_in) {
      ops.push({ op: "set_distribute_list_interface_access_list_in", value: `${iface},${entry.access_list_in}` });
    }
    if (entry.access_list_out) {
      ops.push({ op: "set_distribute_list_interface_access_list_out", value: `${iface},${entry.access_list_out}` });
    }
    if (entry.prefix_list_in) {
      ops.push({ op: "set_distribute_list_interface_prefix_list_in", value: `${iface},${entry.prefix_list_in}` });
    }
    if (entry.prefix_list_out) {
      ops.push({ op: "set_distribute_list_interface_prefix_list_out", value: `${iface},${entry.prefix_list_out}` });
    }
    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async updateDistributeListInterface(
    original: RipNgDistributeListInterface,
    updated: RipNgDistributeListInterface
  ): Promise<VyOSResponse> {
    const ops: RipNgBatchOperation[] = [];
    const iface = original.interface;

    if (updated.access_list_in !== original.access_list_in) {
      ops.push(
        updated.access_list_in
          ? { op: "set_distribute_list_interface_access_list_in", value: `${iface},${updated.access_list_in}` }
          : { op: "delete_distribute_list_interface_access_list_in", value: iface }
      );
    }

    if (updated.access_list_out !== original.access_list_out) {
      ops.push(
        updated.access_list_out
          ? { op: "set_distribute_list_interface_access_list_out", value: `${iface},${updated.access_list_out}` }
          : { op: "delete_distribute_list_interface_access_list_out", value: iface }
      );
    }

    if (updated.prefix_list_in !== original.prefix_list_in) {
      ops.push(
        updated.prefix_list_in
          ? { op: "set_distribute_list_interface_prefix_list_in", value: `${iface},${updated.prefix_list_in}` }
          : { op: "delete_distribute_list_interface_prefix_list_in", value: iface }
      );
    }

    if (updated.prefix_list_out !== original.prefix_list_out) {
      ops.push(
        updated.prefix_list_out
          ? { op: "set_distribute_list_interface_prefix_list_out", value: `${iface},${updated.prefix_list_out}` }
          : { op: "delete_distribute_list_interface_prefix_list_out", value: iface }
      );
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async deleteDistributeListInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_distribute_list_interface", value: iface }],
    });
  }
}

export const ripNgService = new RipNgService();
