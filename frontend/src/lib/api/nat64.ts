import { apiClient } from "./client";

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
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
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

  async batchConfigure(
    ruleNumber: number,
    operations: NAT64BatchOperation[],
    poolNumber?: number
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat64/batch", {
      rule_number: ruleNumber,
      pool_number: poolNumber ?? null,
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async reorderRules(rules: ReorderRuleItem[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat64/reorder", {
      rules,
    });
    if (!result.success) {
      throw new Error(result.error || "Reorder failed");
    }
    return result;
  }

  // ==================== Rule Helpers ====================

  async createRule(config: {
    ruleNumber: number;
    description?: string;
    sourcePrefix?: string;
    matchMark?: string;
    disable?: boolean;
  }): Promise<VyOSResponse> {
    const operations: NAT64BatchOperation[] = [{ op: "set_source_rule" }];
    if (config.description) {
      operations.push({ op: "set_source_rule_description", value: config.description });
    }
    if (config.sourcePrefix) {
      operations.push({ op: "set_source_rule_source_prefix", value: config.sourcePrefix });
    }
    if (config.matchMark) {
      operations.push({ op: "set_source_rule_match_mark", value: config.matchMark });
    }
    if (config.disable) {
      operations.push({ op: "set_source_rule_disable" });
    }
    return this.batchConfigure(config.ruleNumber, operations);
  }

  async updateRule(
    ruleNumber: number,
    current: NAT64SourceRule,
    updated: {
      description?: string;
      sourcePrefix?: string;
      matchMark?: string;
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NAT64BatchOperation[] = [];

    // Description
    if (updated.description !== undefined) {
      if (updated.description) {
        operations.push({ op: "set_source_rule_description", value: updated.description });
      } else if (current.description) {
        operations.push({ op: "delete_source_rule_description" });
      }
    }

    // Source prefix
    if (updated.sourcePrefix !== undefined) {
      if (updated.sourcePrefix) {
        operations.push({ op: "set_source_rule_source_prefix", value: updated.sourcePrefix });
      } else if (current.source_prefix) {
        operations.push({ op: "delete_source_rule_source_prefix" });
      }
    }

    // Match mark
    if (updated.matchMark !== undefined) {
      if (updated.matchMark) {
        operations.push({ op: "set_source_rule_match_mark", value: updated.matchMark });
      } else if (current.match_mark) {
        operations.push({ op: "delete_source_rule_match_mark" });
      }
    }

    // Disable
    if (updated.disable !== undefined) {
      if (updated.disable && !current.disable) {
        operations.push({ op: "set_source_rule_disable" });
      } else if (!updated.disable && current.disable) {
        operations.push({ op: "delete_source_rule_disable" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure(ruleNumber, operations);
  }

  async deleteRule(ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, [{ op: "delete_source_rule" }]);
  }

  async toggleRuleDisable(ruleNumber: number, currentlyDisabled: boolean): Promise<VyOSResponse> {
    const op = currentlyDisabled ? "delete_source_rule_disable" : "set_source_rule_disable";
    return this.batchConfigure(ruleNumber, [{ op }]);
  }

  // ==================== Pool Helpers ====================

  async createPool(
    ruleNumber: number,
    poolNumber: number,
    config: {
      address?: string;
      description?: string;
      port?: string;
      protocol?: { tcp: boolean; udp: boolean; icmp: boolean };
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NAT64BatchOperation[] = [{ op: "set_source_rule_translation_pool" }];
    if (config.address) {
      operations.push({ op: "set_source_rule_translation_pool_address", value: config.address });
    }
    if (config.description) {
      operations.push({ op: "set_source_rule_translation_pool_description", value: config.description });
    }
    if (config.port) {
      operations.push({ op: "set_source_rule_translation_pool_port", value: config.port });
    }
    if (config.protocol?.tcp) {
      operations.push({ op: "set_source_rule_translation_pool_protocol_tcp" });
    }
    if (config.protocol?.udp) {
      operations.push({ op: "set_source_rule_translation_pool_protocol_udp" });
    }
    if (config.protocol?.icmp) {
      operations.push({ op: "set_source_rule_translation_pool_protocol_icmp" });
    }
    if (config.disable) {
      operations.push({ op: "set_source_rule_translation_pool_disable" });
    }
    return this.batchConfigure(ruleNumber, operations, poolNumber);
  }

  async updatePool(
    ruleNumber: number,
    poolNumber: number,
    current: NAT64TranslationPool,
    updated: {
      address?: string;
      description?: string;
      port?: string;
      protocol?: { tcp: boolean; udp: boolean; icmp: boolean };
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NAT64BatchOperation[] = [];

    // Address
    if (updated.address !== undefined) {
      if (updated.address) {
        operations.push({ op: "set_source_rule_translation_pool_address", value: updated.address });
      } else if (current.address) {
        operations.push({ op: "delete_source_rule_translation_pool_address" });
      }
    }

    // Description
    if (updated.description !== undefined) {
      if (updated.description) {
        operations.push({ op: "set_source_rule_translation_pool_description", value: updated.description });
      } else if (current.description) {
        operations.push({ op: "delete_source_rule_translation_pool_description" });
      }
    }

    // Port
    if (updated.port !== undefined) {
      if (updated.port) {
        operations.push({ op: "set_source_rule_translation_pool_port", value: updated.port });
      } else if (current.port) {
        operations.push({ op: "delete_source_rule_translation_pool_port" });
      }
    }

    // Protocol flags
    if (updated.protocol) {
      const curProto = current.protocol || { tcp: false, udp: false, icmp: false };
      if (updated.protocol.tcp && !curProto.tcp) {
        operations.push({ op: "set_source_rule_translation_pool_protocol_tcp" });
      } else if (!updated.protocol.tcp && curProto.tcp) {
        operations.push({ op: "delete_source_rule_translation_pool_protocol_tcp" });
      }
      if (updated.protocol.udp && !curProto.udp) {
        operations.push({ op: "set_source_rule_translation_pool_protocol_udp" });
      } else if (!updated.protocol.udp && curProto.udp) {
        operations.push({ op: "delete_source_rule_translation_pool_protocol_udp" });
      }
      if (updated.protocol.icmp && !curProto.icmp) {
        operations.push({ op: "set_source_rule_translation_pool_protocol_icmp" });
      } else if (!updated.protocol.icmp && curProto.icmp) {
        operations.push({ op: "delete_source_rule_translation_pool_protocol_icmp" });
      }
    }

    // Disable
    if (updated.disable !== undefined) {
      if (updated.disable && !current.disable) {
        operations.push({ op: "set_source_rule_translation_pool_disable" });
      } else if (!updated.disable && current.disable) {
        operations.push({ op: "delete_source_rule_translation_pool_disable" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure(ruleNumber, operations, poolNumber);
  }

  async deletePool(ruleNumber: number, poolNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, [{ op: "delete_source_rule_translation_pool" }], poolNumber);
  }

  async togglePoolDisable(
    ruleNumber: number,
    poolNumber: number,
    currentlyDisabled: boolean
  ): Promise<VyOSResponse> {
    const op = currentlyDisabled
      ? "delete_source_rule_translation_pool_disable"
      : "set_source_rule_translation_pool_disable";
    return this.batchConfigure(ruleNumber, [{ op }], poolNumber);
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
