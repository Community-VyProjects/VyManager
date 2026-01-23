/**
 * Search API Service
 *
 * Provides global search functionality.
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export type SearchResultType = "site" | "instance" | "interface" | "firewall_rule" | "nat_rule" | "route" | "vpn";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  href: string;
  instanceId?: string;
  instanceName?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// ============================================================================
// API Service
// ============================================================================

export const searchService = {
  /**
   * Search across all entities
   */
  async search(query: string, limit: number = 20): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return apiClient.get<SearchResponse>(`/search?${params}`);
  },
};
