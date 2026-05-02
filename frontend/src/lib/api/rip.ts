import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface RipDistributeListGlobal {
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipDistributeListInterface {
  interface: string;
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface RipDistributeList {
  global_filters: RipDistributeListGlobal;
  interface_filters: RipDistributeListInterface[];
}

export interface RipMd5Key {
  key_id: string;
  password: string;
}

export interface RipInterface {
  name: string;
  authentication_type?: string | null;
  md5_keys: RipMd5Key[];
  plaintext_password?: string | null;
  receive_version?: string | null;
  send_version?: string | null;
  split_horizon?: string | null;
}

export interface RipNetworkDistance {
  prefix: string;
  distance?: number | null;
  access_list?: string | null;
}

export interface RipRedistribute {
  protocol: string;
  metric?: number | null;
  route_map?: string | null;
}

export interface RipTimers {
  update?: number | null;
  timeout?: number | null;
  garbage_collection?: number | null;
}

export interface RipConfig {
  default_distance?: number | null;
  default_information_originate: boolean;
  default_metric?: number | null;
  route_map?: string | null;
  version?: string | null;
  networks: string[];
  neighbors: string[];
  routes: string[];
  passive_interfaces: string[];
  distribute_list: RipDistributeList;
  interfaces: RipInterface[];
  network_distances: RipNetworkDistance[];
  redistribute: RipRedistribute[];
  timers: RipTimers;
}

export interface RipCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: {
    global_settings: { supported: boolean; description: string };
    networks: { supported: boolean; description: string };
    neighbors: { supported: boolean; description: string };
    static_routes: { supported: boolean; description: string };
    passive_interfaces: { supported: boolean; description: string };
    distribute_lists: { supported: boolean; description: string };
    interface_settings: { supported: boolean; description: string };
    network_distance: { supported: boolean; description: string };
    redistribute: { supported: boolean; description: string; protocols: string[] };
    timers: { supported: boolean; description: string };
  };
  instance_name?: string;
  instance_id?: string;
}

export interface RipBatchOperation {
  op: string;
  value?: string;
}

export interface RipBatchRequest {
  operations: RipBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class RipService {
  async getCapabilities(): Promise<RipCapabilities> {
    return apiClient.get<RipCapabilities>("/vyos/rip/capabilities");
  }

  async getConfig(refresh = false): Promise<RipConfig> {
    return apiClient.get<RipConfig>("/vyos/rip/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: RipBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/rip/batch", request);
    if (!result.success) throw new Error(result.error || "Operation failed");
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Global Settings
  // ==========================================================================

  async updateGlobalSettings(
    original: RipConfig,
    updated: Partial<RipConfig>
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];

    if (updated.version !== original.version) {
      ops.push(
        updated.version
          ? { op: "set_version", value: updated.version }
          : { op: "delete_version" }
      );
    }

    if (updated.default_distance !== original.default_distance) {
      ops.push(
        updated.default_distance != null
          ? { op: "set_default_distance", value: String(updated.default_distance) }
          : { op: "delete_default_distance" }
      );
    }

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
    original: RipTimers,
    updated: RipTimers
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];

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
  // Networks / Neighbors / Routes / Passive Interfaces
  // ==========================================================================

  async addNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_network", value: network }] });
  }

  async removeNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_network", value: network }] });
  }

  async addNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "set_neighbor", value: address }] });
  }

  async removeNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_neighbor", value: address }] });
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
  // Interface Settings
  // ==========================================================================

  async createInterface(config: RipInterface): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [{ op: "set_interface", value: config.name }];
    this._buildInterfaceOps(ops, config);
    return this.batchConfigure({ operations: ops });
  }

  async updateInterface(
    original: RipInterface,
    updated: RipInterface
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];
    const name = original.name;

    // Authentication — delete old, set new
    const origAuthType = original.authentication_type;
    const newAuthType = updated.authentication_type;

    if (origAuthType !== newAuthType || JSON.stringify(original.md5_keys) !== JSON.stringify(updated.md5_keys) || original.plaintext_password !== updated.plaintext_password) {
      if (origAuthType) {
        ops.push({ op: "delete_interface_authentication", value: name });
      }
      if (newAuthType === "md5") {
        for (const key of updated.md5_keys) {
          ops.push({ op: "set_interface_authentication_md5_key", value: `${name},${key.key_id},${key.password}` });
        }
      } else if (newAuthType === "plaintext" && updated.plaintext_password) {
        ops.push({ op: "set_interface_authentication_plaintext", value: `${name},${updated.plaintext_password}` });
      }
    }

    if (updated.send_version !== original.send_version) {
      ops.push(
        updated.send_version
          ? { op: "set_interface_send_version", value: `${name},${updated.send_version}` }
          : { op: "delete_interface_send_version", value: name }
      );
    }

    if (updated.receive_version !== original.receive_version) {
      ops.push(
        updated.receive_version
          ? { op: "set_interface_receive_version", value: `${name},${updated.receive_version}` }
          : { op: "delete_interface_receive_version", value: name }
      );
    }

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

  private _buildInterfaceOps(ops: RipBatchOperation[], config: RipInterface): void {
    const name = config.name;
    if (config.authentication_type === "md5") {
      for (const key of config.md5_keys) {
        ops.push({ op: "set_interface_authentication_md5_key", value: `${name},${key.key_id},${key.password}` });
      }
    } else if (config.authentication_type === "plaintext" && config.plaintext_password) {
      ops.push({ op: "set_interface_authentication_plaintext", value: `${name},${config.plaintext_password}` });
    }
    if (config.send_version) {
      ops.push({ op: "set_interface_send_version", value: `${name},${config.send_version}` });
    }
    if (config.receive_version) {
      ops.push({ op: "set_interface_receive_version", value: `${name},${config.receive_version}` });
    }
    if (config.split_horizon === "disable") {
      ops.push({ op: "set_interface_split_horizon_disable", value: name });
    } else if (config.split_horizon === "poison-reverse") {
      ops.push({ op: "set_interface_split_horizon_poison_reverse", value: name });
    }
  }

  // ==========================================================================
  // Redistribute
  // ==========================================================================

  async createRedistribute(entry: RipRedistribute): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [{ op: "set_redistribute", value: entry.protocol }];
    if (entry.metric != null) {
      ops.push({ op: "set_redistribute_metric", value: `${entry.protocol},${entry.metric}` });
    }
    if (entry.route_map) {
      ops.push({ op: "set_redistribute_route_map", value: `${entry.protocol},${entry.route_map}` });
    }
    return this.batchConfigure({ operations: ops });
  }

  async updateRedistribute(
    original: RipRedistribute,
    updated: RipRedistribute
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];
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
  // Network Distance
  // ==========================================================================

  async createNetworkDistance(entry: RipNetworkDistance): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [{ op: "set_network_distance", value: entry.prefix }];
    if (entry.distance != null) {
      ops.push({ op: "set_network_distance_value", value: `${entry.prefix},${entry.distance}` });
    }
    if (entry.access_list) {
      ops.push({ op: "set_network_distance_access_list", value: `${entry.prefix},${entry.access_list}` });
    }
    return this.batchConfigure({ operations: ops });
  }

  async updateNetworkDistance(
    original: RipNetworkDistance,
    updated: RipNetworkDistance
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];
    const prefix = original.prefix;

    if (updated.distance !== original.distance) {
      if (updated.distance != null) {
        ops.push({ op: "set_network_distance_value", value: `${prefix},${updated.distance}` });
      }
    }

    if (updated.access_list !== original.access_list) {
      if (updated.access_list) {
        ops.push({ op: "set_network_distance_access_list", value: `${prefix},${updated.access_list}` });
      } else {
        ops.push({ op: "delete_network_distance", value: prefix });
        ops.push({ op: "set_network_distance", value: prefix });
        if (updated.distance != null) {
          ops.push({ op: "set_network_distance_value", value: `${prefix},${updated.distance}` });
        }
      }
    }

    if (ops.length === 0) return { success: true, data: null };
    return this.batchConfigure({ operations: ops });
  }

  async deleteNetworkDistance(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_network_distance", value: prefix }] });
  }

  // ==========================================================================
  // Distribute List - Global
  // ==========================================================================

  async updateDistributeListGlobal(
    original: RipDistributeListGlobal,
    updated: RipDistributeListGlobal
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];

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
    entry: RipDistributeListInterface
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];
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
    original: RipDistributeListInterface,
    updated: RipDistributeListInterface
  ): Promise<VyOSResponse> {
    const ops: RipBatchOperation[] = [];
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

export const ripService = new RipService();
