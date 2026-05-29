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
  description: string | null;
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

  /**
   * Get physical ethernet interfaces that exist on the router but are not yet
   * configured in VyOS. Used to populate the create ethernet interface dropdown.
   */
  async getAvailableEthernetInterfaces(): Promise<{ interfaces: string[] }> {
    return apiClient.get<{ interfaces: string[] }>("/vyos/show/available-ethernet-interfaces");
  }
}

export const showService = new ShowService();
