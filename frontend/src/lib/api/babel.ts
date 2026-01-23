/**
 * Babel Protocol API Service
 *
 * Handles all Babel routing protocol configuration operations.
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface BabelInterface {
  name: string;
  type?: string | null; // wired, wireless, tunnel
  channel?: string | null; // interfering, non-interfering
  rxcost?: number | null;
  hello_interval?: number | null;
  update_interval?: number | null;
  rtt_decay?: number | null;
  rtt_min?: number | null;
  rtt_max?: number | null;
  max_rtt_penalty?: number | null;
  enable_timestamps: boolean;
  split_horizon: boolean;
}

export interface BabelRedistribution {
  protocol: string;
  route_map?: string | null;
}

export interface BabelDistributeList {
  access_list_in?: string | null;
  access_list_out?: string | null;
  prefix_list_in?: string | null;
  prefix_list_out?: string | null;
}

export interface BabelDistributeLists {
  ipv4?: BabelDistributeList | null;
  ipv6?: BabelDistributeList | null;
}

export interface BabelParameters {
  diversity: boolean;
  diversity_factor?: number | null;
  resend_delay?: number | null;
  smoothing_half_life?: number | null;
}

export interface BabelConfig {
  configured: boolean;
  interfaces: BabelInterface[];
  redistributions: BabelRedistribution[];
  parameters?: BabelParameters | null;
  distribute_lists?: BabelDistributeLists | null;
}

export interface BabelCapabilities {
  version: string;
  interface_types: { value: string; label: string; description: string }[];
  channel_types: { value: string; label: string; description: string }[];
  redistribute_protocols: { value: string; label: string }[];
}

export interface EnableBabelRequest {
  diversity?: boolean;
  diversity_factor?: number;
  resend_delay?: number;
}

export interface AddInterfaceRequest {
  interface: string;
  type?: string;
  channel?: string;
  rxcost?: number;
  hello_interval?: number;
  update_interval?: number;
  enable_timestamps?: boolean;
  split_horizon?: boolean;
}

export interface AddRedistributionRequest {
  protocol: string;
  route_map?: string;
}

export interface SetParametersRequest {
  diversity?: boolean;
  diversity_factor?: number;
  resend_delay?: number;
  smoothing_half_life?: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class BabelService {
  /**
   * Get full Babel configuration
   */
  async getConfig(): Promise<BabelConfig> {
    return apiClient.get<BabelConfig>("/vyos/protocols/babel/config");
  }

  /**
   * Get Babel capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<BabelCapabilities> {
    return apiClient.get<BabelCapabilities>("/vyos/protocols/babel/capabilities");
  }

  /**
   * Enable Babel
   */
  async enable(data: EnableBabelRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/babel/enable", data);
  }

  /**
   * Disable Babel
   */
  async disable(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/babel/disable");
  }

  // Interfaces
  async configureInterface(data: AddInterfaceRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/babel/interface", data);
  }

  async deleteInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/babel/interface/${interfaceName}`);
  }

  // Redistribution
  async addRedistribution(data: AddRedistributionRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/babel/redistribute", data);
  }

  async deleteRedistribution(protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/babel/redistribute/${protocol}`);
  }

  // Parameters
  async setParameters(data: SetParametersRequest): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/babel/parameters", data);
  }

  async resetParameters(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/babel/parameters");
  }
}

export const babelService = new BabelService();

// Helper functions
export function getInterfaceTypeDisplay(type: string): string {
  switch (type) {
    case "wired":
      return "Wired";
    case "wireless":
      return "Wireless";
    case "tunnel":
      return "Tunnel";
    default:
      return type;
  }
}

export function getChannelDisplay(channel: string): string {
  switch (channel) {
    case "interfering":
      return "Interfering";
    case "non-interfering":
      return "Non-Interfering";
    default:
      return channel;
  }
}
