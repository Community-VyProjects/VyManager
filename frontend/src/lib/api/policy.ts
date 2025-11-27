import { apiClient } from "./client";

// Prefix list rule
export interface PrefixListRule {
  rule_id: string;
  action: string; // permit, deny
  prefix: string; // IP prefix/network
  description?: string | null;
  ge?: string | null; // Minimum prefix length to match (greater than or equal)
  le?: string | null; // Maximum prefix length to match (less than or equal)
}

// Prefix list for route filtering
export interface PrefixList {
  name: string;
  description?: string | null;
  rules: Record<string, PrefixListRule>;
}

// Route-map match conditions
export interface RouteMapMatch {
  ip?: Record<string, any> | null; // IP match conditions
  interface?: string | null; // Interface match
}

// Route-map set actions
export interface RouteMapSet {
  "as-path"?: Record<string, any> | null; // AS path manipulation
  "local-preference"?: string | null; // Local preference value
  metric?: string | null; // Metric value
}

// Route-map rule
export interface RouteMapRule {
  rule_id: string;
  action: string; // permit, deny
  description?: string | null;
  match?: RouteMapMatch | null; // Match conditions
  set?: RouteMapSet | null; // Set actions
}

// Route-map for route manipulation
export interface RouteMap {
  name: string;
  description?: string | null;
  rules: Record<string, RouteMapRule>;
}

// Complete routing policy configuration
export interface PolicyConfig {
  "prefix-list": Record<string, PrefixList>;
  "route-map": Record<string, RouteMap>;
}

// Summary of a prefix list
export interface PrefixListSummary {
  name: string;
  description?: string | null;
  rule_count: number;
}

// Summary of a route-map
export interface RouteMapSummary {
  name: string;
  description?: string | null;
  rule_count: number;
}

class PolicyService {
  /**
   * Get complete routing policy configuration
   */
  async getConfig(): Promise<PolicyConfig> {
    return apiClient.get<PolicyConfig>("/routing/policy/config");
  }

  /**
   * Get all prefix lists as a flat list
   */
  async getPrefixLists(): Promise<PrefixListSummary[]> {
    return apiClient.get<PrefixListSummary[]>("/routing/policy/prefix-lists");
  }

  /**
   * Get all route-maps as a flat list
   */
  async getRouteMaps(): Promise<RouteMapSummary[]> {
    return apiClient.get<RouteMapSummary[]>("/routing/policy/route-maps");
  }
}

export const policyService = new PolicyService();
