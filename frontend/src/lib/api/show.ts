import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface InterfaceCounter {
  interface: string;
  rx_packets: number;
  rx_bytes: number;
  tx_packets: number;
  tx_bytes: number;
  rx_dropped: number;
  tx_dropped: number;
  rx_errors: number;
  tx_errors: number;
}

export interface InterfaceCountersResponse {
  interfaces: InterfaceCounter[];
  total: number;
}

export interface InterfaceName {
  name: string;
  type: string;
}

export interface AllInterfacesResponse {
  interfaces: InterfaceName[];
  total: number;
}

// ============================================================================
// API Service
// ============================================================================

class ShowService {
  /**
   * Get interface counter statistics
   */
  async getInterfaceCounters(): Promise<InterfaceCountersResponse> {
    return apiClient.get<InterfaceCountersResponse>("/vyos/show/interface-counters");
  }

  /**
   * Get all interfaces from VyOS config (regardless of active/up status)
   * This includes VLANs and sub-interfaces
   */
  async getAllInterfaces(): Promise<AllInterfacesResponse> {
    return apiClient.get<AllInterfacesResponse>("/vyos/show/all-interfaces");
  }
}

export const showService = new ShowService();
