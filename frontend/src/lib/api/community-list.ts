import { apiClient } from "./client";
import { VyOSResponse } from "@/lib/types/api";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface CommunityListRule {
  rule_number: number;
  description?: string | null;
  action: string;  // permit|deny
  regex?: string | null;
}

export interface CommunityList {
  name: string;
  description?: string | null;
  rules: CommunityListRule[];
}

export interface CommunityListConfig {
  community_lists: CommunityList[];
  total: number;
}

export interface CommunityListCapabilities {
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

export interface CommunityListBatchOperation {
  op: string;
  value?: string;
}

export interface CommunityListBatchRequest {
  name: string;
  rule_number?: number;
  operations: CommunityListBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class CommunityListService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<CommunityListCapabilities> {
    return apiClient.get<CommunityListCapabilities>("/vyos/community-list/capabilities");
  }

  /**
   * Get all community lists configuration
   */
  async getConfig(refresh: boolean = false): Promise<CommunityListConfig> {
    return apiClient.get<CommunityListConfig>("/vyos/community-list/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Refresh the cached configuration
   */
  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Execute batch operations
   */
  async batchConfigure(request: CommunityListBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/community-list/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete an entire community list
   */
  async deleteCommunityList(name: string): Promise<VyOSResponse> {
    const operations: CommunityListBatchOperation[] = [];
    operations.push({ op: "delete_community_list" });

    return this.batchConfigure({
      name,
      rule_number: 0, // Not used for delete_community_list
      operations,
    });
  }

  /**
   * Delete a specific rule from a community list and renumber remaining rules to close gaps
   */
  async deleteRule(name: string, ruleNumber: number): Promise<VyOSResponse> {
    // Get current configuration
    const config = await this.getConfig(true);
    const communityList = config.community_lists.find(cl => cl.name === name);

    if (!communityList) {
      throw new Error(`Community list ${name} not found`);
    }

    // Delete + renumber in a SINGLE commit via the reorder endpoint. The deleted
    // rule is sent with new_number=null (removed, not recreated); remaining rules
    // renumber sequentially from the lowest existing number to close the gap.
    // Splitting delete and reorder into two requests breaks under commit-confirm,
    // which only allows one un-confirmed change at a time.
    const deletedRule =
      communityList.rules.find(r => r.rule_number === ruleNumber) ??
      ({ rule_number: ruleNumber } as CommunityListRule); // rule_data unused for delete-only
    const sortedRules = communityList.rules
      .filter(r => r.rule_number !== ruleNumber)
      .sort((a, b) => a.rule_number - b.rule_number);
    const startingNumber = sortedRules.length > 0 ? sortedRules[0].rule_number : ruleNumber;

    const reorderRules: Array<{ old_number: number; new_number: number | null; rule_data: CommunityListRule }> = [
      { old_number: ruleNumber, new_number: null, rule_data: deletedRule },
      ...sortedRules.map((rule, index) => ({
        old_number: rule.rule_number,
        new_number: startingNumber + index,
        rule_data: rule,
      })),
    ];

    return this.reorderRules(name, reorderRules);
  }

  /**
   * Helper: Create a new community list with a rule
   */
  async createCommunityList(name: string, description: string | null, rule: Partial<CommunityListRule>): Promise<VyOSResponse> {
    const operations: CommunityListBatchOperation[] = [];

    // Create community list
    operations.push({ op: "set_community_list" });

    // Add description
    if (description) {
      operations.push({ op: "set_community_list_description", value: description });
    }

    // Create rule
    operations.push({ op: "set_rule" });

    // Rule description
    if (rule.description) {
      operations.push({ op: "set_rule_description", value: rule.description });
    }

    // Rule action
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }

    // Rule regex
    if (rule.regex) {
      operations.push({ op: "set_rule_regex", value: rule.regex });
    }

    return this.batchConfigure({
      name,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update an existing community list or rule
   */
  async updateCommunityList(
    name: string,
    originalCommunityList: CommunityList,
    description: string | null,
    rule?: Partial<CommunityListRule>,
    ruleNumber?: number
  ): Promise<VyOSResponse> {
    const operations: CommunityListBatchOperation[] = [];

    // Update description
    if (description !== originalCommunityList.description) {
      if (description) {
        operations.push({ op: "set_community_list_description", value: description });
      } else if (originalCommunityList.description) {
        operations.push({ op: "delete_community_list_description" });
      }
    }

    // If updating a rule
    if (rule && ruleNumber !== undefined) {
      const originalRule = originalCommunityList.rules.find(r => r.rule_number === ruleNumber);

      // Rule description
      if (rule.description !== originalRule?.description) {
        if (rule.description) {
          operations.push({ op: "set_rule_description", value: rule.description });
        } else if (originalRule?.description) {
          operations.push({ op: "delete_rule_description" });
        }
      }

      // Rule action
      if (rule.action && rule.action !== originalRule?.action) {
        operations.push({ op: "set_rule_action", value: rule.action });
      }

      // Rule regex
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

  /**
   * Helper: Add a new rule to existing community list
   */
  async addRule(name: string, rule: Partial<CommunityListRule>): Promise<VyOSResponse> {
    const operations: CommunityListBatchOperation[] = [];

    // Create rule
    operations.push({ op: "set_rule" });

    // Rule description
    if (rule.description) {
      operations.push({ op: "set_rule_description", value: rule.description });
    }

    // Rule action
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }

    // Rule regex
    if (rule.regex) {
      operations.push({ op: "set_rule_regex", value: rule.regex });
    }

    return this.batchConfigure({
      name,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Update an existing rule
   */
  async updateRule(name: string, ruleNumber: number, rule: Partial<CommunityListRule>): Promise<VyOSResponse> {
    const operations: CommunityListBatchOperation[] = [];

    // Rule description
    if (rule.description !== undefined) {
      if (rule.description) {
        operations.push({ op: "set_rule_description", value: rule.description });
      } else {
        operations.push({ op: "delete_rule_description" });
      }
    }

    // Rule action
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }

    // Rule regex
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

  /**
   * Reorder community list rules
   */
  async reorderRules(communityListName: string, rules: Array<{ old_number: number; new_number: number | null; rule_data: CommunityListRule }>): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/community-list/reorder", {
      community_list_name: communityListName,
      rules: rules,
    });
    await this.refreshConfig();
    return result;
  }
}

export const communityListService = new CommunityListService();
