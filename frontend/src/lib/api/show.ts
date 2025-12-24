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
}

export const showService = new ShowService();
