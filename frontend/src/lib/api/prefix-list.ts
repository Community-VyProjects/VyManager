import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PrefixListRule {
  rule_number: number;
  action: string;  // permit or deny
  description?: string | null;
  prefix?: string | null;  // CIDR notation (e.g., 10.0.0.0/8)
  ge?: number | null;  // Greater-than-or-equal prefix length
  le?: number | null;  // Less-than-or-equal prefix length
}

export interface PrefixList {
  name: string;
  description?: string | null;
  rules: PrefixListRule[];
  list_type: string;  // ipv4 or ipv6
}

export interface PrefixListConfigResponse {
  ipv4_lists: PrefixList[];
  ipv6_lists: PrefixList[];
  total_ipv4: number;
  total_ipv6: number;
}

export interface PrefixListCapabilitiesResponse {
  version: string;
  features: {
    ipv4_prefix_lists: {
      supported: boolean;
      description: string;
    };
    ipv6_prefix_lists: {
      supported: boolean;
      description: string;
    };
    ge_le_operators: {
      supported: boolean;
      description: string;
    };
    rule_descriptions: {
      supported: boolean;
      description: string;
    };
  };
  device_name?: string;
}

export interface PrefixListBatchOperation {
  op: string;
  value?: string;
}

export interface PrefixListBatchRequest {
  name: string;
  list_type: string;  // ipv4 or ipv6
  rule_number?: number;
  operations: PrefixListBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class PrefixListService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<PrefixListCapabilitiesResponse> {
    return apiClient.get<PrefixListCapabilitiesResponse>("/vyos/prefix-list/capabilities");
  }

  /**
   * Get all prefix-list configurations
   */
  async getConfig(refresh: boolean = false): Promise<PrefixListConfigResponse> {
    return apiClient.get<PrefixListConfigResponse>("/vyos/prefix-list/config", {
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
  async batchConfigure(request: PrefixListBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/prefix-list/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Reorder rules in a prefix-list
   */
  async reorderRules(
    name: string,
    listType: string,
    rules: Array<{ old_number: number; new_number: number; rule_data: PrefixListRule }>
  ): Promise<any> {
    const result = await apiClient.post("/vyos/prefix-list/reorder", {
      name,
      list_type: listType,
      rules,
    });
    await this.refreshConfig();
    return result;
  }

  /**
   * Helper: Create a new prefix-list with first rule
   */
  async createPrefixList(
    name: string,
    listType: string,
    description: string | null,
    rule: Partial<PrefixListRule>
  ): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];

    // Create prefix-list
    operations.push({ op: listType === "ipv4" ? "set_prefix_list" : "set_prefix_list6" });

    // Add description if provided
    if (description) {
      operations.push({
        op: listType === "ipv4" ? "set_prefix_list_description" : "set_prefix_list6_description",
        value: description
      });
    }

    // Create rule
    operations.push({ op: listType === "ipv4" ? "set_rule" : "set_rule6" });

    // Set rule action
    operations.push({
      op: listType === "ipv4" ? "set_rule_action" : "set_rule6_action",
      value: rule.action || "permit"
    });

    // Set rule description
    if (rule.description) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_description" : "set_rule6_description",
        value: rule.description
      });
    }

    // Set prefix
    if (rule.prefix) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_prefix" : "set_rule6_prefix",
        value: rule.prefix
      });
    }

    // Set ge
    if (rule.ge !== undefined && rule.ge !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_ge" : "set_rule6_ge",
        value: rule.ge.toString()
      });
    }

    // Set le
    if (rule.le !== undefined && rule.le !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_le" : "set_rule6_le",
        value: rule.le.toString()
      });
    }

    return this.batchConfigure({
      name,
      list_type: listType,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update prefix-list description
   */
  async updatePrefixListDescription(
    name: string,
    listType: string,
    description: string | null
  ): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];

    if (description) {
      operations.push({
        op: listType === "ipv4" ? "set_prefix_list_description" : "set_prefix_list6_description",
        value: description
      });
    } else {
      operations.push({
        op: listType === "ipv4" ? "delete_prefix_list_description" : "delete_prefix_list6_description"
      });
    }

    return this.batchConfigure({
      name,
      list_type: listType,
      operations,
    });
  }

  /**
   * Helper: Delete a prefix-list
   */
  async deletePrefixList(name: string, listType: string): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];
    operations.push({
      op: listType === "ipv4" ? "delete_prefix_list" : "delete_prefix_list6"
    });

    return this.batchConfigure({
      name,
      list_type: listType,
      operations,
    });
  }

  /**
   * Helper: Add a rule to an existing prefix-list
   */
  async addRule(
    name: string,
    listType: string,
    rule: Partial<PrefixListRule>
  ): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];

    // Create rule
    operations.push({ op: listType === "ipv4" ? "set_rule" : "set_rule6" });

    // Set rule action
    operations.push({
      op: listType === "ipv4" ? "set_rule_action" : "set_rule6_action",
      value: rule.action || "permit"
    });

    // Set rule description
    if (rule.description) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_description" : "set_rule6_description",
        value: rule.description
      });
    }

    // Set prefix
    if (rule.prefix) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_prefix" : "set_rule6_prefix",
        value: rule.prefix
      });
    }

    // Set ge
    if (rule.ge !== undefined && rule.ge !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_ge" : "set_rule6_ge",
        value: rule.ge.toString()
      });
    }

    // Set le
    if (rule.le !== undefined && rule.le !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_le" : "set_rule6_le",
        value: rule.le.toString()
      });
    }

    return this.batchConfigure({
      name,
      list_type: listType,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update an existing rule
   */
  async updateRule(
    name: string,
    listType: string,
    ruleNumber: number,
    rule: Partial<PrefixListRule>
  ): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];

    // IMPORTANT: Process deletes FIRST, then sets
    // This ensures VyOS properly removes fields before setting new values

    // Delete operations first
    if (rule.description !== undefined && !rule.description) {
      operations.push({
        op: listType === "ipv4" ? "delete_rule_description" : "delete_rule6_description"
      });
    }

    if (rule.ge !== undefined && rule.ge === null) {
      operations.push({
        op: listType === "ipv4" ? "delete_rule_ge" : "delete_rule6_ge"
      });
    }

    if (rule.le !== undefined && rule.le === null) {
      operations.push({
        op: listType === "ipv4" ? "delete_rule_le" : "delete_rule6_le"
      });
    }

    // Set operations after deletes
    if (rule.action) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_action" : "set_rule6_action",
        value: rule.action
      });
    }

    if (rule.description !== undefined && rule.description) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_description" : "set_rule6_description",
        value: rule.description
      });
    }

    if (rule.prefix !== undefined && rule.prefix) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_prefix" : "set_rule6_prefix",
        value: rule.prefix
      });
    }

    if (rule.ge !== undefined && rule.ge !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_ge" : "set_rule6_ge",
        value: rule.ge.toString()
      });
    }

    if (rule.le !== undefined && rule.le !== null) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_le" : "set_rule6_le",
        value: rule.le.toString()
      });
    }

    return this.batchConfigure({
      name,
      list_type: listType,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Helper: Delete a rule
   */
  async deleteRule(
    name: string,
    listType: string,
    ruleNumber: number
  ): Promise<any> {
    const operations: PrefixListBatchOperation[] = [];
    operations.push({
      op: listType === "ipv4" ? "delete_rule" : "delete_rule6"
    });

    return this.batchConfigure({
      name,
      list_type: listType,
      rule_number: ruleNumber,
      operations,
    });
  }
}

export const prefixListService = new PrefixListService();
