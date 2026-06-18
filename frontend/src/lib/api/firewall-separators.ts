/**
 * Firewall Separators API Service
 *
 * User-defined coloured separator bars rendered between firewall rules. These
 * are pure UI metadata stored in the VyManager database (NOT in the VyOS
 * config) and shared per instance. A bar renders above the first rule whose
 * number >= `position`.
 */

import { apiClient } from "./client";

// ==================== Type Definitions ====================

export type SeparatorFamily = "ipv4" | "ipv6" | "bridge";

export interface FirewallSeparator {
  id: string;
  family: SeparatorFamily;
  chain: string;
  position: number;
  label: string;
  color: string;
}

/** An upsert payload. Omit `id` to create; provide an existing `id` to update. */
export interface SeparatorUpsert {
  id?: string;
  family: SeparatorFamily;
  chain: string;
  position: number;
  label: string;
  color: string;
}

export interface SeparatorBatchRequest {
  upserts?: SeparatorUpsert[];
  deletes?: string[];
}

interface SeparatorListResponse {
  separators: FirewallSeparator[];
}

// ==================== Service ====================

class FirewallSeparatorsService {
  /** List every separator for the current instance (all families/chains). */
  async list(): Promise<FirewallSeparator[]> {
    const res = await apiClient.get<SeparatorListResponse>(
      "/vyos/firewall/separators"
    );
    return res.separators;
  }

  /** Apply a batch of upserts/deletes; returns the instance's full list after. */
  async batch(request: SeparatorBatchRequest): Promise<FirewallSeparator[]> {
    const res = await apiClient.post<SeparatorListResponse>(
      "/vyos/firewall/separators/batch",
      { upserts: request.upserts ?? [], deletes: request.deletes ?? [] }
    );
    return res.separators;
  }

  /** Convenience: create or update a single separator. */
  async save(separator: SeparatorUpsert): Promise<FirewallSeparator[]> {
    return this.batch({ upserts: [separator] });
  }

  /** Convenience: delete a single separator by id. */
  async delete(id: string): Promise<FirewallSeparator[]> {
    return this.batch({ deletes: [id] });
  }
}

export const firewallSeparatorsService = new FirewallSeparatorsService();
