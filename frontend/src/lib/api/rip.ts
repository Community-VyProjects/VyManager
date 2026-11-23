import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  ripDistributeListGlobalOps,
  ripDistributeListInterfaceOps,
  ripInterfaceOps,
  ripNetworkDistanceOps,
  ripRedistributeOps,
  ripSettingsOps,
  type RipSettingsDraft,
} from "./rip-save-ops";

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
  /** Loads as "***" when the key has a password; never the password itself. */
  password: string;
}

export interface RipInterface {
  name: string;
  authentication_type?: string | null;
  md5_keys: RipMd5Key[];
  /** Loads as "***" when set; never the password itself. */
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
  /** True when ``protocols rip`` exists on the device, even with no children. */
  configured: boolean;
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

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

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

  /** Commit one batch. A rejected commit throws an ApiError carrying the device error. */
  async batchConfigure(operations: RipBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/rip/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  // ==========================================================================
  // Global Settings and Timers
  // ==========================================================================

  async updateSettings(original: RipConfig, updated: RipSettingsDraft): Promise<VyOSResponse> {
    return this.batchConfigure(ripSettingsOps(original, updated));
  }

  async deleteRip(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_rip" }]);
  }

  // ==========================================================================
  // Networks / Neighbors / Routes / Passive Interfaces
  // ==========================================================================

  async addNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "set_network", value: network }]);
  }

  async removeNetwork(network: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_network", value: network }]);
  }

  async addNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "set_neighbor", value: address }]);
  }

  async removeNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_neighbor", value: address }]);
  }

  async addRoute(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "set_route", value: prefix }]);
  }

  async removeRoute(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_route", value: prefix }]);
  }

  async addPassiveInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "set_passive_interface", value: iface }]);
  }

  async removePassiveInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_passive_interface", value: iface }]);
  }

  // ==========================================================================
  // Interface Settings
  // ==========================================================================

  async createInterface(config: RipInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripInterfaceOps(null, config));
  }

  async updateInterface(original: RipInterface, updated: RipInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripInterfaceOps(original, updated));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_interface", value: name }]);
  }

  // ==========================================================================
  // Redistribute
  // ==========================================================================

  async createRedistribute(entry: RipRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ripRedistributeOps(null, entry));
  }

  async updateRedistribute(original: RipRedistribute, updated: RipRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ripRedistributeOps(original, updated));
  }

  async deleteRedistribute(protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_redistribute", value: protocol }]);
  }

  // ==========================================================================
  // Network Distance
  // ==========================================================================

  async createNetworkDistance(entry: RipNetworkDistance): Promise<VyOSResponse> {
    return this.batchConfigure(ripNetworkDistanceOps(null, entry));
  }

  async updateNetworkDistance(original: RipNetworkDistance, updated: RipNetworkDistance): Promise<VyOSResponse> {
    return this.batchConfigure(ripNetworkDistanceOps(original, updated));
  }

  async deleteNetworkDistance(prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_network_distance", value: prefix }]);
  }

  // ==========================================================================
  // Distribute List
  // ==========================================================================

  async updateDistributeListGlobal(
    original: RipDistributeListGlobal,
    updated: RipDistributeListGlobal,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ripDistributeListGlobalOps(original, updated));
  }

  async createDistributeListInterface(entry: RipDistributeListInterface): Promise<VyOSResponse> {
    return this.batchConfigure(ripDistributeListInterfaceOps(null, entry));
  }

  async updateDistributeListInterface(
    original: RipDistributeListInterface,
    updated: RipDistributeListInterface,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ripDistributeListInterfaceOps(original, updated));
  }

  async deleteDistributeListInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_distribute_list_interface", value: iface }]);
  }
}

export const ripService = new RipService();
