/**
 * RIP Protocol API Service
 * Handles all RIP (Routing Information Protocol) related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface RIPInterface {
  name: string;
  send?: string | null;
  receive?: string | null;
  split_horizon?: string | null;
  authentication?: { type: string } | null;
}

export interface RIPRedistribution {
  protocol: string;
  route_map?: string | null;
  metric?: number | null;
}

export interface RIPTimers {
  update?: number | null;
  timeout?: number | null;
  garbage_collection?: number | null;
}

export interface RIPPassiveInterfaces {
  default: boolean;
  interfaces: string[];
}

export interface RIPConfig {
  configured: boolean;
  networks: string[];
  interfaces: RIPInterface[];
  passive_interfaces: RIPPassiveInterfaces;
  neighbors: string[];
  redistributions: RIPRedistribution[];
  version?: string | null;
  default_distance?: number | null;
  default_information_originate: boolean;
  timers?: RIPTimers | null;
}

export interface RIPCapabilities {
  versions: { value: string; label: string }[];
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

class RIPService {
  /**
   * Get RIP configuration
   */
  async getConfig(): Promise<RIPConfig> {
    return apiClient.get<RIPConfig>("/vyos/protocols/rip/config");
  }

  /**
   * Get RIP capabilities for the connected VyOS version
   */
  getCapabilities(): RIPCapabilities {
    // Static capabilities for RIP
    return {
      versions: [
        { value: "1", label: "Version 1" },
        { value: "2", label: "Version 2" },
      ],
      split_horizon_modes: [
        { value: "enabled", label: "Enabled", description: "Default split-horizon" },
        { value: "disabled", label: "Disabled", description: "Disable split-horizon" },
        { value: "poison-reverse", label: "Poison Reverse", description: "Split-horizon with poison reverse" },
      ],
      redistribute_protocols: [
        { value: "bgp", label: "BGP" },
        { value: "connected", label: "Connected" },
        { value: "isis", label: "IS-IS" },
        { value: "kernel", label: "Kernel" },
        { value: "ospf", label: "OSPF" },
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
   * Enable RIP with basic configuration
   */
  async enable(options?: {
    version?: string;
    defaultDistance?: number;
    defaultInformationOriginate?: boolean;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/enable", {
      version: options?.version,
      default_distance: options?.defaultDistance,
      default_information_originate: options?.defaultInformationOriginate ?? false,
    });
  }

  /**
   * Disable RIP completely
   */
  async disable(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/rip/disable");
  }

  // =========================================================================
  // Network operations
  // =========================================================================

  /**
   * Add a network to RIP
   */
  async addNetwork(network: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/network", { network });
  }

  /**
   * Remove a network from RIP
   */
  async removeNetwork(network: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/rip/network/${encodeURIComponent(network)}`);
  }

  // =========================================================================
  // Interface operations
  // =========================================================================

  /**
   * Configure an interface for RIP
   */
  async configureInterface(
    interfaceName: string,
    options?: {
      send?: string;
      receive?: string;
      splitHorizon?: string;
    }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/interface", {
      interface: interfaceName,
      send: options?.send,
      receive: options?.receive,
      split_horizon: options?.splitHorizon,
    });
  }

  /**
   * Remove interface from RIP
   */
  async removeInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/rip/interface/${encodeURIComponent(interfaceName)}`);
  }

  // =========================================================================
  // Passive interface operations
  // =========================================================================

  /**
   * Set passive interfaces
   */
  async setPassiveInterfaces(options: {
    default?: boolean;
    interfaces?: string[];
  }): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/rip/passive-interface", {
      default: options.default ?? false,
      interfaces: options.interfaces ?? [],
    });
  }

  // =========================================================================
  // Neighbor operations
  // =========================================================================

  /**
   * Add a neighbor (for non-broadcast networks)
   */
  async addNeighbor(neighbor: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/neighbor", { neighbor });
  }

  /**
   * Remove a neighbor
   */
  async removeNeighbor(neighbor: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/rip/neighbor/${encodeURIComponent(neighbor)}`);
  }

  // =========================================================================
  // Redistribution operations
  // =========================================================================

  /**
   * Add protocol redistribution
   */
  async addRedistribution(
    protocol: string,
    options?: {
      routeMap?: string;
      metric?: number;
    }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/redistribute", {
      protocol,
      route_map: options?.routeMap,
      metric: options?.metric,
    });
  }

  /**
   * Remove protocol redistribution
   */
  async removeRedistribution(protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/rip/redistribute/${encodeURIComponent(protocol)}`);
  }

  // =========================================================================
  // Timer operations
  // =========================================================================

  /**
   * Set RIP timers
   */
  async setTimers(timers: {
    update?: number;
    timeout?: number;
    garbageCollection?: number;
  }): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/rip/timers", {
      update: timers.update,
      timeout: timers.timeout,
      garbage_collection: timers.garbageCollection,
    });
  }

  /**
   * Reset timers to defaults
   */
  async resetTimers(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/rip/timers");
  }

  // =========================================================================
  // Default information operations
  // =========================================================================

  /**
   * Enable default information originate
   */
  async enableDefaultOriginate(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/rip/default-information/originate", {});
  }

  /**
   * Disable default information originate
   */
  async disableDefaultOriginate(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/rip/default-information/originate");
  }

  // =========================================================================
  // Version operations
  // =========================================================================

  /**
   * Set RIP version
   */
  async setVersion(version: string): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/vyos/protocols/rip/version/${version}`, {});
  }

  /**
   * Reset version to default
   */
  async resetVersion(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/rip/version");
  }
}

export const ripService = new RIPService();
