import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  buildRuleCreateOps,
  buildRuleUpdateOps,
  type NAT66RuleFields,
  type NAT66RuleType,
} from "./nat66-save-ops";

// ==================== Type Definitions ====================

export interface NAT66RuleGroup {
  address_group?: string | null;
  domain_group?: string | null;
  mac_group?: string | null;
  network_group?: string | null;
  port_group?: string | null;
}

/** Source or destination match: source rules use `prefix`, destination rules `address`. */
export interface NAT66RuleMatch {
  address?: string | null;
  prefix?: string | null;
  port?: string | null;
  group?: NAT66RuleGroup | null;
}

export interface NAT66RuleTranslation {
  address?: string | null;
  port?: string | null;
}

export interface NAT66SourceRule {
  rule_number: number;
  description?: string | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
  protocol?: string | null;
  outbound_interface?: string | null;
  source?: NAT66RuleMatch | null;
  destination?: NAT66RuleMatch | null;
  translation?: NAT66RuleTranslation | null;
}

export interface NAT66DestinationRule {
  rule_number: number;
  description?: string | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
  protocol?: string | null;
  inbound_interface?: string | null;
  source?: NAT66RuleMatch | null;
  destination?: NAT66RuleMatch | null;
  translation?: NAT66RuleTranslation | null;
}

export interface NAT66ConfigResponse {
  source_rules: NAT66SourceRule[];
  destination_rules: NAT66DestinationRule[];
  total: number;
}

export interface NAT66Capabilities {
  version: string;
  supported: boolean;
  features: {
    source_nat66: { supported: boolean; description: string };
    destination_nat66: { supported: boolean; description: string };
    masquerade: { supported: boolean; description: string };
    groups: { supported: boolean; description: string; group_types: string[] };
  };
  /** `protocol` values both labs accept. */
  protocols: string[];
  operations: Record<string, string[]>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface NAT66BatchOperation {
  op: string;
  value?: string | null;
}

/** A rule's leaves without its number, as the reorder route re-sets them. */
export type NAT66RuleData = Omit<NAT66SourceRule, "rule_number"> | Omit<NAT66DestinationRule, "rule_number">;

interface ReorderRuleItem {
  old_number: number;
  new_number: number | null; // null = delete-only (removed, not recreated)
  rule_data: NAT66RuleData | null;
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

function ruleData(ruleType: NAT66RuleType, rule: NAT66SourceRule | NAT66DestinationRule): NAT66RuleData {
  const data = {
    description: rule.description,
    disable: rule.disable,
    exclude: rule.exclude,
    log: rule.log,
    protocol: rule.protocol,
    source: rule.source,
    destination: rule.destination,
    translation: rule.translation,
  };
  return ruleType === "source"
    ? { ...data, outbound_interface: (rule as NAT66SourceRule).outbound_interface }
    : { ...data, inbound_interface: (rule as NAT66DestinationRule).inbound_interface };
}

// ==================== Service ====================

class NAT66Service {
  async getCapabilities(): Promise<NAT66Capabilities> {
    return apiClient.get<NAT66Capabilities>("/vyos/nat66/capabilities");
  }

  async getConfig(refresh = false): Promise<NAT66ConfigResponse> {
    return apiClient.get<NAT66ConfigResponse>("/vyos/nat66/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch; an empty batch is not sent. */
  async batchConfigure(
    ruleNumber: number,
    ruleType: NAT66RuleType,
    operations: NAT66BatchOperation[]
  ): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/nat66/batch", {
      rule_number: ruleNumber,
      rule_type: ruleType,
      operations,
    });
    return throwIfFailed(result);
  }

  async reorderRules(ruleType: NAT66RuleType, rules: ReorderRuleItem[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat66/reorder", {
      rule_type: ruleType,
      rules,
    });
    return throwIfFailed(result);
  }

  // ==================== Rule Helpers ====================

  async createRule(
    ruleType: NAT66RuleType,
    ruleNumber: number,
    fields: NAT66RuleFields,
    groupTypes: readonly string[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, ruleType, buildRuleCreateOps(ruleType, fields, groupTypes));
  }

  async updateRule(
    ruleType: NAT66RuleType,
    current: NAT66SourceRule | NAT66DestinationRule,
    fields: NAT66RuleFields,
    groupTypes: readonly string[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure(
      current.rule_number,
      ruleType,
      buildRuleUpdateOps(ruleType, current, fields, groupTypes)
    );
  }

  // ==================== Delete + Compact ====================

  /**
   * Delete one rule and renumber the rest from 100 in ONE commit via the
   * reorder route (commit-confirm allows one un-confirmed change at a time).
   * The config is read first so every remaining rule is re-sent in full.
   */
  async deleteAndCompactRules(ruleType: NAT66RuleType, ruleNumber: number): Promise<VyOSResponse> {
    const config = await this.getConfig(true);
    const rules: (NAT66SourceRule | NAT66DestinationRule)[] =
      ruleType === "source" ? config.source_rules ?? [] : config.destination_rules ?? [];
    const remaining = rules.filter((r) => r.rule_number !== ruleNumber);
    const reorderItems: ReorderRuleItem[] = [
      { old_number: ruleNumber, new_number: null, rule_data: null },
      ...remaining.map((rule, i) => ({
        old_number: rule.rule_number,
        new_number: 100 + i,
        rule_data: ruleData(ruleType, rule),
      })),
    ];
    return this.reorderRules(ruleType, reorderItems);
  }
}

export const nat66Service = new NAT66Service();
