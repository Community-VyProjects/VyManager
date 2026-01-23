/**
 * OpenFabric Protocol API Service
 *
 * Handles all OpenFabric routing protocol configuration operations.
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface OpenFabricInterface {
  name: string;
  passive: boolean;
  metric?: number | null;
  hello_interval?: number | null;
  hello_multiplier?: number | null;
  csnp_interval?: number | null;
  psnp_interval?: number | null;
  password: boolean;
}

export interface OpenFabricRedistribution {
  level: string;
  protocol: string;
  route_map?: string | null;
  metric?: number | null;
}

export interface OpenFabricSRPrefix {
  prefix: string;
  index?: number | null;
}

export interface OpenFabricSegmentRouting {
  enabled: boolean;
  global_block_low?: number | null;
  global_block_high?: number | null;
  prefixes: OpenFabricSRPrefix[];
}

export interface OpenFabricFabric {
  name: string;
  net: string[];
  interfaces: OpenFabricInterface[];
  redistributions: OpenFabricRedistribution[];
  log_adjacency_changes: boolean;
  set_overload_bit: boolean;
  lsp_gen_interval?: number | null;
  lsp_refresh_interval?: number | null;
  max_lsp_lifetime?: number | null;
  spf_interval?: number | null;
  domain_password: boolean;
  segment_routing?: OpenFabricSegmentRouting | null;
}

export interface OpenFabricConfig {
  configured: boolean;
  fabrics: OpenFabricFabric[];
}

export interface OpenFabricCapabilities {
  version: string;
  redistribute_protocols: { value: string; label: string }[];
  levels: { value: string; label: string }[];
}

export interface CreateFabricRequest {
  name: string;
  net: string;
  log_adjacency_changes?: boolean;
  set_overload_bit?: boolean;
}

export interface AddNETRequest {
  fabric: string;
  net: string;
}

export interface AddInterfaceRequest {
  fabric: string;
  interface: string;
  passive?: boolean;
  metric?: number;
  hello_interval?: number;
  hello_multiplier?: number;
}

export interface AddRedistributionRequest {
  fabric: string;
  level: string;
  protocol: string;
  route_map?: string;
  metric?: number;
}

export interface SetTimersRequest {
  fabric: string;
  lsp_gen_interval?: number;
  lsp_refresh_interval?: number;
  max_lsp_lifetime?: number;
  spf_interval?: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class OpenFabricService {
  /**
   * Get full OpenFabric configuration
   */
  async getConfig(): Promise<OpenFabricConfig> {
    return apiClient.get<OpenFabricConfig>("/vyos/protocols/openfabric/config");
  }

  /**
   * Get OpenFabric capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<OpenFabricCapabilities> {
    return apiClient.get<OpenFabricCapabilities>("/vyos/protocols/openfabric/capabilities");
  }

  /**
   * Create a new OpenFabric instance
   */
  async createFabric(data: CreateFabricRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/openfabric/fabric", data);
  }

  /**
   * Delete an OpenFabric instance
   */
  async deleteFabric(name: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${name}`);
  }

  // NET operations
  async addNET(data: AddNETRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/openfabric/net", data);
  }

  async deleteNET(fabric: string, net: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/net/${encodeURIComponent(net)}`);
  }

  // Interface operations
  async configureInterface(data: AddInterfaceRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/openfabric/interface", data);
  }

  async deleteInterface(fabric: string, interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/interface/${interfaceName}`);
  }

  // Redistribution operations
  async addRedistribution(data: AddRedistributionRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/openfabric/redistribute", data);
  }

  async deleteRedistribution(fabric: string, level: string, protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/redistribute/${level}/${protocol}`);
  }

  // Timer operations
  async setTimers(data: SetTimersRequest): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/openfabric/timers", data);
  }

  // Feature toggles
  async enableLogAdjacencyChanges(fabric: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/log-adjacency-changes`);
  }

  async disableLogAdjacencyChanges(fabric: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/log-adjacency-changes`);
  }

  async enableOverloadBit(fabric: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/set-overload-bit`);
  }

  async disableOverloadBit(fabric: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/openfabric/fabric/${fabric}/set-overload-bit`);
  }
}

export const openfabricService = new OpenFabricService();
