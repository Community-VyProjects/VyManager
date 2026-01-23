/**
 * OSPFv3 Protocol API Service
 *
 * Handles all OSPFv3 (OSPF for IPv6) configuration operations.
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface OSPFv3Range {
  prefix: string;
  advertise: boolean;
  not_advertise: boolean;
}

export interface OSPFv3Area {
  id: string;
  type: string; // normal, stub, totally-stubby, nssa, nssa-totally-stubby
  ranges: OSPFv3Range[];
  export_list?: string | null;
  import_list?: string | null;
}

export interface OSPFv3Interface {
  name: string;
  area?: string | null;
  cost?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  dead_interval?: number | null;
  retransmit_interval?: number | null;
  transmit_delay?: number | null;
  network?: string | null;
  passive: boolean;
  mtu_ignore: boolean;
  bfd: boolean;
  instance_id?: number | null;
  ifmtu?: number | null;
}

export interface OSPFv3Redistribution {
  protocol: string;
  route_map?: string | null;
}

export interface OSPFv3DefaultInfo {
  originate: boolean;
  always: boolean;
  metric?: number | null;
  metric_type?: number | null;
  route_map?: string | null;
}

export interface OSPFv3Distance {
  global?: number | null;
  external?: number | null;
  inter_area?: number | null;
  intra_area?: number | null;
}

export interface OSPFv3Config {
  configured: boolean;
  router_id?: string | null;
  areas: OSPFv3Area[];
  interfaces: OSPFv3Interface[];
  redistributions: OSPFv3Redistribution[];
  default_information?: OSPFv3DefaultInfo | null;
  distance?: OSPFv3Distance | null;
  graceful_restart: boolean;
}

export interface EnableOSPFv3Request {
  router_id?: string;
}

export interface AddAreaRequest {
  area: string;
  area_type?: string;
  no_summary?: boolean;
}

export interface AddAreaRangeRequest {
  area: string;
  prefix: string;
  not_advertise?: boolean;
}

export interface AddInterfaceRequest {
  interface: string;
  area: string;
  cost?: number;
  priority?: number;
  hello_interval?: number;
  dead_interval?: number;
  network?: string;
  passive?: boolean;
  mtu_ignore?: boolean;
  bfd?: boolean;
  instance_id?: number;
}

export interface AddRedistributionRequest {
  protocol: string;
  route_map?: string;
}

export interface SetDefaultInfoRequest {
  always?: boolean;
  metric?: number;
  metric_type?: number;
  route_map?: string;
}

export interface SetDistanceRequest {
  global?: number;
  external?: number;
  inter_area?: number;
  intra_area?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class OSPFv3Service {
  /**
   * Get full OSPFv3 configuration
   */
  async getConfig(): Promise<OSPFv3Config> {
    return apiClient.get<OSPFv3Config>("/vyos/protocols/ospfv3/config");
  }

  /**
   * Enable OSPFv3
   */
  async enable(data: EnableOSPFv3Request): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/enable", data);
  }

  /**
   * Disable OSPFv3
   */
  async disable(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ospfv3/disable");
  }

  // Router ID
  async setRouterId(routerId: string): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/vyos/protocols/ospfv3/router-id/${routerId}`);
  }

  async deleteRouterId(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ospfv3/router-id");
  }

  // Areas
  async addArea(data: AddAreaRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/area", data);
  }

  async deleteArea(area: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ospfv3/area/${area}`);
  }

  // Area Ranges
  async addAreaRange(data: AddAreaRangeRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/area/range", data);
  }

  async deleteAreaRange(area: string, prefix: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(
      `/vyos/protocols/ospfv3/area/${area}/range/${encodeURIComponent(prefix)}`
    );
  }

  // Interfaces
  async configureInterface(data: AddInterfaceRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/interface", data);
  }

  async deleteInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ospfv3/interface/${interfaceName}`);
  }

  // Redistribution
  async addRedistribution(data: AddRedistributionRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/redistribute", data);
  }

  async deleteRedistribution(protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/ospfv3/redistribute/${protocol}`);
  }

  // Default Information
  async setDefaultInformation(data: SetDefaultInfoRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      "/vyos/protocols/ospfv3/default-information/originate",
      data
    );
  }

  async deleteDefaultInformation(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ospfv3/default-information/originate");
  }

  // Distance
  async setDistance(data: SetDistanceRequest): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/ospfv3/distance", data);
  }

  async resetDistance(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ospfv3/distance");
  }

  // Graceful Restart
  async enableGracefulRestart(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/ospfv3/graceful-restart");
  }

  async disableGracefulRestart(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/ospfv3/graceful-restart");
  }
}

export const ospfv3Service = new OSPFv3Service();

// Helper functions
export function getAreaTypeDisplay(type: string): string {
  switch (type) {
    case "normal":
      return "Normal";
    case "stub":
      return "Stub";
    case "totally-stubby":
      return "Totally Stubby";
    case "nssa":
      return "NSSA";
    case "nssa-totally-stubby":
      return "NSSA Totally Stubby";
    default:
      return type;
  }
}

export function getNetworkTypeDisplay(type: string): string {
  switch (type) {
    case "broadcast":
      return "Broadcast";
    case "point-to-point":
      return "Point-to-Point";
    default:
      return type;
  }
}
