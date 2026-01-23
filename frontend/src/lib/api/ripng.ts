/**
 * RIPng Protocol API Service
 * Handles all RIPng (RIP Next Generation for IPv6) related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface RIPngInterface {
  name: string;
  split_horizon?: string | null;
}

export interface RIPngRedistribution {
  protocol: string;
  route_map?: string | null;
  metric?: number | null;
}

export interface RIPngTimers {
  update?: number | null;
  timeout?: number | null;
  garbage_collection?: number | null;
}

export interface RIPngConfig {
  configured: boolean;
  networks: string[];
  interfaces: RIPngInterface[];
  passive_interfaces: string[];
  aggregate_addresses: string[];
  routes: string[];
  redistributions: RIPngRedistribution[];
  default_metric?: number | null;
  default_information_originate: boolean;
  timers?: RIPngTimers | null;
}

export interface RIPngCapabilities {
  split_horizon_modes: { value: string; label: string; description: string }[];
  redistribute_protocols: { value: string; label: string }[];
  default_timers: {
    update: number;
    timeout: number;
    garbage_collection: number;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class RIPngService {
  /**
   * Get RIPng configuration
   */
  async getConfig(): Promise<RIPngConfig> {
    return apiClient.get<RIPngConfig>("/vyos/protocols/ripng/config");
  }

  /**
   * Get RIPng capabilities
   */
  getCapabilities(): RIPngCapabilities {
    // Static capabilities for RIPng
    return {
      split_horizon_modes: [
        { value: "enabled", label: "Enabled", description: "Default split-horizon" },
        { value: "disabled", label: "Disabled", description: "Disable split-horizon" },
        { value: "poison-reverse", label: "Poison Reverse", description: "Split-horizon with poison reverse" },
      ],
      redistribute_protocols: [
        { value: "bgp", label: "BGP" },
        { value: "connected", label: "Connected" },
        { value: "kernel", label: "Kernel" },
        { value: "ospfv3", label: "OSPFv3" },
        { value: "static", label: "Static" },
      ],
      default_timers: {
        update: 30,
        timeout: 180,
        garbage_collection: 120,
      },
    };
  }

  /**
   * Enable RIPng
   */
  async enable(options?: {
    defaultMetric?: number;
    defaultInformationOriginate?: boolean;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/enable", {
      default_metric: options?.defaultMetric,
      default_information_originate: options?.defaultInformationOriginate ?? false,
    });
  }

  /**
   * Disable RIPng
   */
  async disable(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ripng/disable");
  }

  // =========================================================================
  // Network operations
  // =========================================================================

  async addNetwork(network: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/network", { network });
  }

  async removeNetwork(network: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/network/${encodeURIComponent(network)}`);
  }

  // =========================================================================
  // Interface operations
  // =========================================================================

  async configureInterface(
    interfaceName: string,
    options?: { splitHorizon?: string }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/interface", {
      interface: interfaceName,
      split_horizon: options?.splitHorizon,
    });
  }

  async removeInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/interface/${encodeURIComponent(interfaceName)}`);
  }

  // =========================================================================
  // Passive interface operations
  // =========================================================================

  async addPassiveInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/vyos/protocols/ripng/passive-interface/${encodeURIComponent(interfaceName)}`, {});
  }

  async removePassiveInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/passive-interface/${encodeURIComponent(interfaceName)}`);
  }

  // =========================================================================
  // Aggregate address operations
  // =========================================================================

  async addAggregate(prefix: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/aggregate", { prefix });
  }

  async removeAggregate(prefix: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/aggregate/${encodeURIComponent(prefix)}`);
  }

  // =========================================================================
  // Route operations
  // =========================================================================

  async addRoute(prefix: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/route", { prefix });
  }

  async removeRoute(prefix: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/route/${encodeURIComponent(prefix)}`);
  }

  // =========================================================================
  // Redistribution operations
  // =========================================================================

  async addRedistribution(
    protocol: string,
    options?: { routeMap?: string; metric?: number }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/redistribute", {
      protocol,
      route_map: options?.routeMap,
      metric: options?.metric,
    });
  }

  async removeRedistribution(protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ripng/redistribute/${encodeURIComponent(protocol)}`);
  }

  // =========================================================================
  // Timer operations
  // =========================================================================

  async setTimers(timers: {
    update?: number;
    timeout?: number;
    garbageCollection?: number;
  }): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/ripng/timers", {
      update: timers.update,
      timeout: timers.timeout,
      garbage_collection: timers.garbageCollection,
    });
  }

  async resetTimers(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ripng/timers");
  }

  // =========================================================================
  // Default information operations
  // =========================================================================

  async enableDefaultOriginate(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ripng/default-information/originate", {});
  }

  async disableDefaultOriginate(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ripng/default-information/originate");
  }
}

export const ripngService = new RIPngService();
