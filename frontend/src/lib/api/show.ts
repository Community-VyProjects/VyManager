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

export interface HardwareSensor {
  name: string;
  value: string;
  status: "ok" | "warning" | "critical";
  high?: string | null;
  critical?: string | null;
}

export interface HardwareSensorsResponse {
  sensors: HardwareSensor[];
  raw: string;
  summary?: string;
  error?: string | null;
}

export interface FirewallRuleCounter {
  family: "ipv4" | "ipv6" | "bridge" | string;
  chain: string;
  custom: boolean;
  rule: string;
  action: string;
  packets: number;
  bytes: number;
}

export interface FirewallStatisticsResponse {
  rules: FirewallRuleCounter[];
}

/** Join a live counter onto a rule row. Missing means VyOS did not report it. */
export function findFirewallCounter(
  rules: FirewallRuleCounter[],
  family: string,
  chain: string,
  rule: string | number,
  custom: boolean,
): FirewallRuleCounter | undefined {
  const id = String(rule);
  return rules.find(
    (row) => row.family === family && row.chain === chain && row.custom === custom && row.rule === id,
  );
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

  async getHardwareSensors(): Promise<HardwareSensorsResponse> {
    return apiClient.get<HardwareSensorsResponse>("/vyos/show/hardware-sensors");
  }

  /** Live packets/bytes for every firewall ruleset rule. */
  async getFirewallStatistics(): Promise<FirewallStatisticsResponse> {
    return apiClient.get<FirewallStatisticsResponse>("/vyos/show/firewall-statistics");
  }
}

export const showService = new ShowService();