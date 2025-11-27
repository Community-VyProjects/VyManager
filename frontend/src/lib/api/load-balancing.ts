/**
 * Load Balancing API Service
 * Handles all WAN load balancing related API operations for VyOS
 */

import { apiClient } from "./client";

export interface HealthTest {
  test_id: string;
  target: string;
  type: string;
}

export interface InterfaceHealth {
  interface_name: string;
  nexthop: string;
  "failure-count": string | null;
  "success-count": string | null;
  tests: Record<string, HealthTest>;
}

export interface LoadBalancingRule {
  rule_id: string;
  "inbound-interface": string;
  interfaces: Record<string, Record<string, never>>;
}

export interface LoadBalancingConfig {
  wan: {
    "interface-health": Record<string, InterfaceHealth>;
    rules: Record<string, LoadBalancingRule>;
  };
}

export interface InterfaceHealthFlat {
  interface_name: string;
  nexthop: string;
  failure_count: string;
  test_count: number;
}

export interface LoadBalancingRuleFlat {
  rule_id: string;
  inbound_interface: string;
  outbound_interface_count: number;
}

export class LoadBalancingService {
  /**
   * Get complete WAN load balancing configuration
   */
  async getConfig(): Promise<LoadBalancingConfig> {
    return apiClient.get<LoadBalancingConfig>("/network/load-balancing/config");
  }

  /**
   * Get all interface health configurations as a flat list
   */
  async getInterfaceHealth(): Promise<InterfaceHealthFlat[]> {
    return apiClient.get<InterfaceHealthFlat[]>("/network/load-balancing/interface-health");
  }

  /**
   * Get all WAN load balancing rules as a flat list
   */
  async getRules(): Promise<LoadBalancingRuleFlat[]> {
    return apiClient.get<LoadBalancingRuleFlat[]>("/network/load-balancing/rules");
  }
}

export const loadBalancingService = new LoadBalancingService();
