import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  buildPoolCreateOps,
  buildPoolUpdateOps,
  buildRuleCreateOps,
  buildRuleUpdateOps,
  type NAT64PoolFields,
  type NAT64RuleFields,
} from "./nat64-save-ops";

// ==================== Type Definitions ====================

export interface NAT64TranslationPoolProtocol {
  tcp: boolean;
  udp: boolean;
  icmp: boolean;
}

export interface NAT64TranslationPool {
  pool_number: number;
  address?: string | null;
  description?: string | null;
  disable: boolean;
  port?: string | null;
  protocol?: NAT64TranslationPoolProtocol | null;
}

export interface NAT64SourceRule {
  rule_number: number;
  description?: string | null;
  disable: boolean;
  match_mark?: string | null;
  source_prefix?: string | null;
  translation_pools: NAT64TranslationPool[];
}

export interface NAT64ConfigResponse {
  source_rules: NAT64SourceRule[];
  total: number;
}

export interface NAT64Capabilities {
  version: string;
  supported: boolean;
  features: Record<string, { supported: boolean; description: string }>;
  operations: Record<string, string[]>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface NAT64BatchOperation {
  op: string;
  value?: string | null;
}

interface ReorderRuleItem {
  old_number: number;
  new_number: number | null; // null = delete-only (removed, not recreated)
  rule_data: Record<string, unknown>;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

/**
 * A rejected commit comes back as HTTP 200 with ``success: false``; throw an
 * ApiError carrying the device error so the dialog stays open and shows it.
 */
function throwIfFailed(result: VyOSResponse): VyOSResponse {
  if (!result.success) {
    const error: ApiError = { message: result.error || "" };
    throw error;
  }
  return result;
}

// ==================== Service ====================

class NAT64Service {
  async getCapabilities(): Promise<NAT64Capabilities> {
    return apiClient.get<NAT64Capabilities>("/vyos/nat64/capabilities");
  }

  async getConfig(refresh = false): Promise<NAT64ConfigResponse> {
    return apiClient.get<NAT64ConfigResponse>("/vyos/nat64/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch; an empty batch is not sent. */
  async batchConfigure(
    ruleNumber: number,
    operations: NAT64BatchOperation[],
    poolNumber?: number
  ): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/nat64/batch", {
      rule_number: ruleNumber,
      pool_number: poolNumber ?? null,
      operations,
    });
    return throwIfFailed(result);
  }

  async reorderRules(rules: ReorderRuleItem[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat64/reorder", {
      rules,
    });
    return throwIfFailed(result);
  }

  // ==================== Rule Helpers ====================

  async createRule(ruleNumber: number, fields: NAT64RuleFields): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, buildRuleCreateOps(fields));
  }

  async updateRule(current: NAT64SourceRule, fields: NAT64RuleFields): Promise<VyOSResponse> {
    return this.batchConfigure(current.rule_number, buildRuleUpdateOps(current, fields));
  }

  async toggleRuleDisable(ruleNumber: number, currentlyDisabled: boolean): Promise<VyOSResponse> {
    const op = currentlyDisabled ? "delete_source_rule_disable" : "set_source_rule_disable";
    return this.batchConfigure(ruleNumber, [{ op }]);
  }

  // ==================== Pool Helpers ====================

  async createPool(
    ruleNumber: number,
    poolNumber: number,
    fields: NAT64PoolFields
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, buildPoolCreateOps(fields), poolNumber);
  }

  async updatePool(
    ruleNumber: number,
    current: NAT64TranslationPool,
    fields: NAT64PoolFields
  ): Promise<VyOSResponse> {
    return this.batchConfigure(
      ruleNumber,
      buildPoolUpdateOps(current, fields),
      current.pool_number
    );
  }

  async deletePool(ruleNumber: number, poolNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, [{ op: "delete_source_rule_translation_pool" }], poolNumber);
  }

  // ==================== Delete + Compact ====================

  async deleteAndCompactRules(ruleNumber: number): Promise<VyOSResponse> {
    // Fetch config BEFORE deleting so the delete + compaction happen in ONE commit
    // via the reorder endpoint. The deleted rule is sent with new_number=null
    // (removed, not recreated); remaining rules compact to [100, 101, 102, ...].
    // Splitting delete and reorder into two requests breaks under commit-confirm,
    // which only allows one un-confirmed change at a time.
    const config = await this.getConfig(true);
    const remaining = (config.source_rules ?? []).filter(r => r.rule_number !== ruleNumber);
    const reorderItems: ReorderRuleItem[] = [
      { old_number: ruleNumber, new_number: null, rule_data: {} },
      ...remaining.map((rule, i) => ({
        old_number: rule.rule_number,
        new_number: 100 + i,
        rule_data: this.flattenRule(rule),
      })),
    ];
    return this.reorderRules(reorderItems);
  }

  flattenRule(rule: NAT64SourceRule): Record<string, unknown> {
    return {
      description: rule.description || undefined,
      disable: rule.disable,
      match_mark: rule.match_mark || undefined,
      source_prefix: rule.source_prefix || undefined,
      translation_pools: rule.translation_pools.map((pool) => ({
        pool_number: pool.pool_number,
        address: pool.address || undefined,
        description: pool.description || undefined,
        disable: pool.disable,
        port: pool.port || undefined,
        protocol: pool.protocol || undefined,
      })),
    };
  }
}

export const nat64Service = new NAT64Service();
