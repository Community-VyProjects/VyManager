import { apiClient } from "./client";
import { VyOSResponse } from "@/lib/types/api";

export type PolicyListKind = "community-list" | "extcommunity-list" | "large-community-list";

const KIND_SPEC = {
  "community-list": {
    ident: "community_list",
    listsField: "community_lists" as const,
    nameField: "community_list_name" as const,
    label: "Community list",
  },
  "extcommunity-list": {
    ident: "extcommunity_list",
    listsField: "extcommunity_lists" as const,
    nameField: "extcommunity_list_name" as const,
    label: "ExtCommunity list",
  },
  "large-community-list": {
    ident: "large_community_list",
    listsField: "large_community_lists" as const,
    nameField: "large_community_list_name" as const,
    label: "Large community list",
  },
};

export interface PolicyListRule {
  rule_number: number;
  description?: string | null;
  action: string;
  regex?: string | null;
}

export interface PolicyList {
  name: string;
  description?: string | null;
  rules: PolicyListRule[];
}

export interface PolicyListCapabilities {
  version: string;
  features: {
    basic: { supported: boolean; description: string };
    rules: { supported: boolean; description: string };
    actions: { supported: boolean; description: string };
  };
  version_notes: {
    identical_versions: string;
  };
  device_name?: string;
}

export interface PolicyListBatchOperation {
  op: string;
  value?: string;
}

export interface PolicyListBatchRequest {
  name: string;
  rule_number?: number;
  operations: PolicyListBatchOperation[];
}

export type CommunityListRule = PolicyListRule;
export type CommunityList = PolicyList;
export type ExtCommunityListRule = PolicyListRule;
export type ExtCommunityList = PolicyList;
export type LargeCommunityListRule = PolicyListRule;
export type LargeCommunityList = PolicyList;

export interface CommunityListConfig {
  community_lists: PolicyList[];
  total: number;
}
export interface ExtCommunityListConfig {
  extcommunity_lists: PolicyList[];
  total: number;
}
export interface LargeCommunityListConfig {
  large_community_lists: PolicyList[];
  total: number;
}

export type CommunityListCapabilities = PolicyListCapabilities;
export type ExtCommunityListCapabilities = PolicyListCapabilities;
export type LargeCommunityListCapabilities = PolicyListCapabilities;
export type CommunityListBatchOperation = PolicyListBatchOperation;
export type ExtCommunityListBatchOperation = PolicyListBatchOperation;
export type LargeCommunityListBatchOperation = PolicyListBatchOperation;
export type CommunityListBatchRequest = PolicyListBatchRequest;
export type ExtCommunityListBatchRequest = PolicyListBatchRequest;
export type LargeCommunityListBatchRequest = PolicyListBatchRequest;

type ConfigFor<K extends PolicyListKind> = K extends "community-list"
  ? CommunityListConfig
  : K extends "extcommunity-list"
    ? ExtCommunityListConfig
    : LargeCommunityListConfig;

export class PolicyListService<K extends PolicyListKind = PolicyListKind> {
  constructor(private kind: K) {}

  private get spec() {
    return KIND_SPEC[this.kind];
  }

  async getCapabilities(): Promise<PolicyListCapabilities> {
    return apiClient.get<PolicyListCapabilities>(`/vyos/${this.kind}/capabilities`);
  }

  async getConfig(refresh: boolean = false): Promise<ConfigFor<K>> {
    return apiClient.get<ConfigFor<K>>(`/vyos/${this.kind}/config`, {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(request: PolicyListBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>(`/vyos/${this.kind}/batch`, request);
    await this.refreshConfig();
    return result;
  }

  async deleteList(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      name,
      rule_number: 0,
      operations: [{ op: `delete_${this.spec.ident}` }],
    });
  }

  async deleteCommunityList(name: string): Promise<VyOSResponse> {
    return this.deleteList(name);
  }

  async deleteExtCommunityList(name: string): Promise<VyOSResponse> {
    return this.deleteList(name);
  }

  async deleteLargeCommunityList(name: string): Promise<VyOSResponse> {
    return this.deleteList(name);
  }

  private listsFromConfig(config: ConfigFor<K>): PolicyList[] {
    const field = this.spec.listsField;
    return (config as unknown as Record<string, PolicyList[]>)[field] ?? [];
  }

  async deleteRule(name: string, ruleNumber: number): Promise<VyOSResponse> {
    const config = await this.getConfig(true);
    const policyList = this.listsFromConfig(config).find((cl) => cl.name === name);

    if (!policyList) {
      throw new Error(`${this.spec.label} ${name} not found`);
    }

    const deletedRule =
      policyList.rules.find((r) => r.rule_number === ruleNumber) ??
      ({ rule_number: ruleNumber } as PolicyListRule);
    const sortedRules = policyList.rules
      .filter((r) => r.rule_number !== ruleNumber)
      .sort((a, b) => a.rule_number - b.rule_number);
    const startingNumber = sortedRules.length > 0 ? sortedRules[0].rule_number : ruleNumber;

    const reorderRules: Array<{ old_number: number; new_number: number | null; rule_data: PolicyListRule }> = [
      { old_number: ruleNumber, new_number: null, rule_data: deletedRule },
      ...sortedRules.map((rule, index) => ({
        old_number: rule.rule_number,
        new_number: startingNumber + index,
        rule_data: rule,
      })),
    ];

    return this.reorderRules(name, reorderRules);
  }

  async createList(name: string, description: string | null, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    const ident = this.spec.ident;
    const operations: PolicyListBatchOperation[] = [];
    operations.push({ op: `set_${ident}` });
    if (description) {
      operations.push({ op: `set_${ident}_description`, value: description });
    }
    operations.push({ op: "set_rule" });
    if (rule.description) {
      operations.push({ op: "set_rule_description", value: rule.description });
    }
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }
    if (rule.regex) {
      operations.push({ op: "set_rule_regex", value: rule.regex });
    }
    return this.batchConfigure({
      name,
      rule_number: rule.rule_number,
      operations,
    });
  }

  async createCommunityList(name: string, description: string | null, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    return this.createList(name, description, rule);
  }

  async createExtCommunityList(name: string, description: string | null, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    return this.createList(name, description, rule);
  }

  async createLargeCommunityList(name: string, description: string | null, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    return this.createList(name, description, rule);
  }

  async updateList(
    name: string,
    original: PolicyList,
    description: string | null,
    rule?: Partial<PolicyListRule>,
    ruleNumber?: number
  ): Promise<VyOSResponse> {
    const ident = this.spec.ident;
    const operations: PolicyListBatchOperation[] = [];
    if (description !== original.description) {
      if (description) {
        operations.push({ op: `set_${ident}_description`, value: description });
      } else if (original.description) {
        operations.push({ op: `delete_${ident}_description` });
      }
    }
    if (rule && ruleNumber !== undefined) {
      const originalRule = original.rules.find((r) => r.rule_number === ruleNumber);
      if (rule.description !== originalRule?.description) {
        if (rule.description) {
          operations.push({ op: "set_rule_description", value: rule.description });
        } else if (originalRule?.description) {
          operations.push({ op: "delete_rule_description" });
        }
      }
      if (rule.action && rule.action !== originalRule?.action) {
        operations.push({ op: "set_rule_action", value: rule.action });
      }
      if (rule.regex !== originalRule?.regex) {
        if (rule.regex) {
          operations.push({ op: "set_rule_regex", value: rule.regex });
        } else if (originalRule?.regex) {
          operations.push({ op: "delete_rule_regex" });
        }
      }
    }
    return this.batchConfigure({
      name,
      rule_number: ruleNumber,
      operations,
    });
  }

  async updateCommunityList(
    name: string,
    originalCommunityList: PolicyList,
    description: string | null,
    rule?: Partial<PolicyListRule>,
    ruleNumber?: number
  ): Promise<VyOSResponse> {
    return this.updateList(name, originalCommunityList, description, rule, ruleNumber);
  }

  async updateExtCommunityList(
    name: string,
    originalExtCommunityList: PolicyList,
    description: string | null,
    rule?: Partial<PolicyListRule>,
    ruleNumber?: number
  ): Promise<VyOSResponse> {
    return this.updateList(name, originalExtCommunityList, description, rule, ruleNumber);
  }

  async updateLargeCommunityList(
    name: string,
    originalLargeCommunityList: PolicyList,
    description: string | null,
    rule?: Partial<PolicyListRule>,
    ruleNumber?: number
  ): Promise<VyOSResponse> {
    return this.updateList(name, originalLargeCommunityList, description, rule, ruleNumber);
  }

  async addRule(name: string, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    const operations: PolicyListBatchOperation[] = [];
    operations.push({ op: "set_rule" });
    if (rule.description) {
      operations.push({ op: "set_rule_description", value: rule.description });
    }
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }
    if (rule.regex) {
      operations.push({ op: "set_rule_regex", value: rule.regex });
    }
    return this.batchConfigure({
      name,
      rule_number: rule.rule_number,
      operations,
    });
  }

  async updateRule(name: string, ruleNumber: number, rule: Partial<PolicyListRule>): Promise<VyOSResponse> {
    const operations: PolicyListBatchOperation[] = [];
    if (rule.description !== undefined) {
      if (rule.description) {
        operations.push({ op: "set_rule_description", value: rule.description });
      } else {
        operations.push({ op: "delete_rule_description" });
      }
    }
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }
    if (rule.regex !== undefined) {
      if (rule.regex) {
        operations.push({ op: "set_rule_regex", value: rule.regex });
      } else {
        operations.push({ op: "delete_rule_regex" });
      }
    }
    return this.batchConfigure({
      name,
      rule_number: ruleNumber,
      operations,
    });
  }

  async reorderRules(
    listName: string,
    rules: Array<{ old_number: number; new_number: number | null; rule_data: PolicyListRule }>
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>(`/vyos/${this.kind}/reorder`, {
      [this.spec.nameField]: listName,
      rules,
    });
    await this.refreshConfig();
    return result;
  }
}

export const communityListService = new PolicyListService("community-list");
export const extcommunityListService = new PolicyListService("extcommunity-list");
export const largeCommunityListService = new PolicyListService("large-community-list");
