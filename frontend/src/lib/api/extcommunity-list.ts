import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ExtCommunityListRule {
  rule_number: number;
  description?: string | null;
  action: string;  // permit|deny
  regex?: string | null;
}

export interface ExtCommunityList {
  name: string;
  description?: string | null;
  rules: ExtCommunityListRule[];
}

export interface ExtCommunityListConfig {
  extcommunity_lists: ExtCommunityList[];
  total: number;
}

export interface ExtCommunityListCapabilities {
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

export interface ExtCommunityListBatchOperation {
  op: string;
  value?: string;
}

export interface ExtCommunityListBatchRequest {
  name: string;
  rule_number?: number;
  operations: ExtCommunityListBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class ExtCommunityListService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<ExtCommunityListCapabilities> {
    return apiClient.get<ExtCommunityListCapabilities>("/vyos/extcommunity-list/capabilities");
  }

  /**
   * Get all extcommunity lists configuration
   */
  async getConfig(refresh: boolean = false): Promise<ExtCommunityListConfig> {
    return apiClient.get<ExtCommunityListConfig>("/vyos/extcommunity-list/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Refresh the cached configuration
   */
  async refreshConfig(): Promise<any> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Execute batch operations
   */
  async batchConfigure(request: ExtCommunityListBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/extcommunity-list/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete an entire extcommunity list
   */
  async deleteExtCommunityList(name: string): Promise<any> {
    const operations: ExtCommunityListBatchOperation[] = [];
    operations.push({ op: "delete_extcommunity_list" });

    return this.batchConfigure({
      name,
      rule_number: 0, // Not used for delete_extcommunity_list
      operations,
    });
  }

  /**
   * Delete a specific rule from a extcommunity list and renumber remaining rules to close gaps
   */
  async deleteRule(name: string, ruleNumber: number): Promise<any> {
    // Get current configuration
    const config = await this.getConfig(true);
    const communityList = config.extcommunity_lists.find(cl => cl.name === name);

    if (!communityList) {
      throw new Error(`ExtCommunity list ${name} not found`);
    }

    // Get remaining rules (excluding the one being deleted)
    const remainingRules = communityList.rules.filter(r => r.rule_number !== ruleNumber);

    if (remainingRules.length === 0) {
      // If no rules left, just delete the rule
      const operations: ExtCommunityListBatchOperation[] = [];
      operations.push({ op: "delete_rule" });

      return this.batchConfigure({
        name,
        rule_number: ruleNumber,
        operations,
      });
    }

    // Sort remaining rules by their current number
    const sortedRules = remainingRules.sort((a, b) => a.rule_number - b.rule_number);

    // Renumber sequentially starting from the lowest existing number
    // This closes gaps: if you have 105, 106, 107, 108 and delete 106,
    // result will be 105, 106 (was 107), 107 (was 108)
    const startingNumber = sortedRules[0].rule_number;
    const reorderRules = sortedRules.map((rule, index) => ({
      old_number: rule.rule_number,
      new_number: startingNumber + index,
      rule_data: rule,
    }));

    // Check if any rule actually needs renumbering
    const needsReorder = reorderRules.some(r => r.old_number !== r.new_number);

    if (!needsReorder) {
      // No gaps to close, just delete the rule directly
      const operations: ExtCommunityListBatchOperation[] = [];
      operations.push({ op: "delete_rule" });

      return this.batchConfigure({
        name,
        rule_number: ruleNumber,
        operations,
      });
    }

    // Use reorder endpoint which will delete all rules (including the one we want to delete)
    // and recreate them with new sequential numbers
    return this.reorderRules(name, reorderRules);
  }

  /**
   * Helper: Create a new extcommunity list with a rule
   */
  async createExtCommunityList(name: string, description: string | null, rule: Partial<ExtCommunityListRule>): Promise<any> {
    const operations: ExtCommunityListBatchOperation[] = [];

    // Create extcommunity list
    operations.push({ op: "set_extcommunity_list" });

    // Add description
    if (description) {
      operations.push({ op: "set_extcommunity_list_description", value: description });
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
   * Helper: Update an existing extcommunity list or rule
   */
  async updateExtCommunityList(
    name: string,
    originalExtCommunityList: ExtCommunityList,
    description: string | null,
    rule?: Partial<ExtCommunityListRule>,
    ruleNumber?: number
  ): Promise<any> {
    const operations: ExtCommunityListBatchOperation[] = [];

    // Update description
    if (description !== originalExtCommunityList.description) {
      if (description) {
        operations.push({ op: "set_extcommunity_list_description", value: description });
      } else if (originalExtCommunityList.description) {
        operations.push({ op: "delete_extcommunity_list_description" });
      }
    }

    // If updating a rule
    if (rule && ruleNumber !== undefined) {
      const originalRule = originalExtCommunityList.rules.find(r => r.rule_number === ruleNumber);

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
   * Helper: Add a new rule to existing extcommunity list
   */
  async addRule(name: string, rule: Partial<ExtCommunityListRule>): Promise<any> {
    const operations: ExtCommunityListBatchOperation[] = [];

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
  async updateRule(name: string, ruleNumber: number, rule: Partial<ExtCommunityListRule>): Promise<any> {
    const operations: ExtCommunityListBatchOperation[] = [];

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
   * Reorder extcommunity list rules
   */
  async reorderRules(extcommunityListName: string, rules: Array<{ old_number: number; new_number: number; rule_data: ExtCommunityListRule }>): Promise<any> {
    const result = await apiClient.post("/vyos/extcommunity-list/reorder", {
      extcommunity_list_name: extcommunityListName,
      rules: rules,
    });
    await this.refreshConfig();
    return result;
  }
}

export const extcommunityListService = new ExtCommunityListService();
