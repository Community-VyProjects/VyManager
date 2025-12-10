import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface AsPathListRule {
  rule_number: number;
  description?: string | null;
  action: string;  // permit|deny
  regex?: string | null;
}

export interface AsPathList {
  name: string;
  description?: string | null;
  rules: AsPathListRule[];
}

export interface AsPathListConfig {
  as_path_lists: AsPathList[];
  total: number;
}

export interface AsPathListCapabilities {
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

export interface AsPathListBatchOperation {
  op: string;
  value?: string;
}

export interface AsPathListBatchRequest {
  name: string;
  rule_number?: number;
  operations: AsPathListBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class AsPathListService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<AsPathListCapabilities> {
    return apiClient.get<AsPathListCapabilities>("/vyos/as-path-list/capabilities");
  }

  /**
   * Get all AS path lists configuration
   */
  async getConfig(refresh: boolean = false): Promise<AsPathListConfig> {
    return apiClient.get<AsPathListConfig>("/vyos/as-path-list/config", {
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
  async batchConfigure(request: AsPathListBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/as-path-list/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete an entire AS path list
   */
  async deleteAsPathList(name: string): Promise<any> {
    const operations: AsPathListBatchOperation[] = [];
    operations.push({ op: "delete_as_path_list" });

    return this.batchConfigure({
      name,
      rule_number: 0, // Not used for delete_as_path_list
      operations,
    });
  }

  /**
   * Delete a specific rule from an AS path list and renumber remaining rules to close gaps
   */
  async deleteRule(name: string, ruleNumber: number): Promise<any> {
    // Get current configuration
    const config = await this.getConfig(true);
    const asPathList = config.as_path_lists.find(apl => apl.name === name);

    if (!asPathList) {
      throw new Error(`AS path list ${name} not found`);
    }

    // Get remaining rules (excluding the one being deleted)
    const remainingRules = asPathList.rules.filter(r => r.rule_number !== ruleNumber);

    if (remainingRules.length === 0) {
      // If no rules left, just delete the rule
      const operations: AsPathListBatchOperation[] = [];
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
      const operations: AsPathListBatchOperation[] = [];
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
   * Helper: Create a new AS path list with a rule
   */
  async createAsPathList(name: string, description: string | null, rule: Partial<AsPathListRule>): Promise<any> {
    const operations: AsPathListBatchOperation[] = [];

    // Create AS path list
    operations.push({ op: "set_as_path_list" });

    // Add description
    if (description) {
      operations.push({ op: "set_as_path_list_description", value: description });
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
   * Helper: Update an existing AS path list or rule
   */
  async updateAsPathList(
    name: string,
    originalAsPathList: AsPathList,
    description: string | null,
    rule?: Partial<AsPathListRule>,
    ruleNumber?: number
  ): Promise<any> {
    const operations: AsPathListBatchOperation[] = [];

    // Update description
    if (description !== originalAsPathList.description) {
      if (description) {
        operations.push({ op: "set_as_path_list_description", value: description });
      } else if (originalAsPathList.description) {
        operations.push({ op: "delete_as_path_list_description" });
      }
    }

    // If updating a rule
    if (rule && ruleNumber !== undefined) {
      const originalRule = originalAsPathList.rules.find(r => r.rule_number === ruleNumber);

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
   * Helper: Add a new rule to existing AS path list
   */
  async addRule(name: string, rule: Partial<AsPathListRule>): Promise<any> {
    const operations: AsPathListBatchOperation[] = [];

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
  async updateRule(name: string, ruleNumber: number, rule: Partial<AsPathListRule>): Promise<any> {
    const operations: AsPathListBatchOperation[] = [];

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
   * Reorder AS path list rules
   */
  async reorderRules(asPathListName: string, rules: Array<{ old_number: number; new_number: number; rule_data: AsPathListRule }>): Promise<any> {
    const result = await apiClient.post("/vyos/as-path-list/reorder", {
      as_path_list_name: asPathListName,
      rules: rules,
    });
    await this.refreshConfig();
    return result;
  }
}

export const asPathListService = new AsPathListService();
