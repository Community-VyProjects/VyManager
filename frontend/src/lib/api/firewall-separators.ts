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

/**
 * One entry of a chain renumber: a rule's old number and the number it became.
 * `new_number === null` means the rule was deleted (not recreated). This is the
 * same shape the firewall reorder endpoint receives, so callers can reuse the
 * mapping they already built for the reorder request.
 */
export interface RuleRenumber {
  old_number: number;
  new_number: number | null;
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

  /**
   * Re-anchor a chain's separators after its rules were renumbered (by a delete
   * or a reorder) so each bar stays above the same rule it was placed before.
   *
   * A bar at position P sits above the first rule whose number >= P. After a
   * renumber we move it to the new number of that same rule — the first rule at
   * or below it that survives the renumber. If the rule it anchored to was
   * deleted, it falls through to the next surviving rule; if nothing survives
   * below it, it trails the (renumbered) last rule.
   *
   * `mapping` must be the COMPLETE old→new map for the chain (every original
   * rule), which is exactly what the reorder endpoint receives. Fetches the
   * current separators itself, so callers need not hold separator state.
   * Returns the instance's full separator list afterwards.
   */
  async applyRenumber(
    family: SeparatorFamily,
    chain: string,
    mapping: RuleRenumber[]
  ): Promise<FirewallSeparator[]> {
    const all = await this.list();
    const affected = all.filter((s) => s.family === family && s.chain === chain);
    if (!affected.length) return all;

    const sorted = [...mapping].sort((a, b) => a.old_number - b.old_number);
    const keptNumbers = sorted
      .map((m) => m.new_number)
      .filter((n): n is number => n !== null);
    const trailingPosition = (keptNumbers.length ? Math.max(...keptNumbers) : 0) + 1;

    const newPositionFor = (position: number): number => {
      for (const m of sorted) {
        if (m.old_number >= position && m.new_number !== null) return m.new_number;
      }
      return trailingPosition;
    };

    const upserts: SeparatorUpsert[] = affected
      .map((s) => ({ sep: s, position: newPositionFor(s.position) }))
      .filter(({ sep, position }) => position !== sep.position)
      .map(({ sep, position }) => ({
        id: sep.id,
        family: sep.family,
        chain: sep.chain,
        position,
        label: sep.label,
        color: sep.color,
      }));

    if (!upserts.length) return all;
    return this.batch({ upserts });
  }
}

export const firewallSeparatorsService = new FirewallSeparatorsService();
