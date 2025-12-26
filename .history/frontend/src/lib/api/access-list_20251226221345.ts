import { apiClient } from "./client";
import { VyOSResponse, BatchRequest } from "../types/api";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface AccessListRule {
  rule_number: number;
  action: string;  // permit or deny
  description?: string | null;
  source_type?: string | null;  // any, host, inverse-mask, network
  source_address?: string | null;
  source_mask?: string | null;
  source_exact_match?: boolean;  // IPv6 exact-match flag (can coexist with any)
  destination_type?: string | null;  // any, host, inverse-mask, network
  destination_address?: string | null;
  destination_mask?: string | null;
}

export interface AccessList {
  number: string;  // For IPv4, name for IPv6
  description?: string | null;
  rules: AccessListRule[];
  list_type: string;  // ipv4 or ipv6
}

export interface AccessListConfigResponse {
  ipv4_lists: AccessList[];
  ipv6_lists: AccessList[];
  total_ipv4: number;
  total_ipv6: number;
}

export interface AccessListCapabilitiesResponse {
  version: string;
  features: {
    ipv4_access_list: {
      supported: boolean;
      description: string;
    };
    ipv6_access_list: {
      supported: boolean;
      description: string;
    };
    source_destination_filters: {
      supported: boolean;
      description: string;
    };
  };
  access_list_ranges: {
    standard: string;
    extended: string;
  };
  device_name?: string;
}

export interface AccessListBatchOperation {
  op: string;
  value?: string;
  value2?: string;
}

export interface AccessListBatchRequest {
  identifier: string;  // number for IPv4, name for IPv6
  list_type: string;  // ipv4 or ipv6
  rule_number?: number;
  operations: AccessListBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class AccessListService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<AccessListCapabilitiesResponse> {
    return apiClient.get<AccessListCapabilitiesResponse>("/vyos/access-list/capabilities");
  }

  /**
   * Get all access-list configurations
   */
  async getConfig(refresh: boolean = false): Promise<AccessListConfigResponse> {
    return apiClient.get<AccessListConfigResponse>("/vyos/access-list/config", {
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
  async batchConfigure(request: AccessListBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/access-list/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Reorder rules in an access-list
   */
  async reorderRules(
    identifier: string,
    listType: string,
    rules: Array<{ old_number: number; new_number: number; rule_data: AccessListRule }>
  ): Promise<any> {
    const result = await apiClient.post("/vyos/access-list/reorder", {
      identifier,
      list_type: listType,
      rules,
    });
    await this.refreshConfig();
    return result;
  }

  /**
   * Helper: Create a new access-list with first rule
   */
  async createAccessList(
    identifier: string,
    listType: string,
    description: string | null,
    rule: Partial<AccessListRule>
  ): Promise<any> {
    const operations: AccessListBatchOperation[] = [];

    // Create access-list
    operations.push({ op: listType === "ipv4" ? "set_access_list" : "set_access_list6" });

    // Add description if provided
    if (description) {
      operations.push({
        op: listType === "ipv4" ? "set_access_list_description" : "set_access_list6_description",
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

    // Set source
    if (listType === "ipv4") {
      // IPv4 source handling
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule_source_any"
        });
      } else if (rule.source_type === "host" && rule.source_address) {
        operations.push({
          op: "set_rule_source_host",
          value: rule.source_address
        });
      } else if (rule.source_type === "inverse-mask" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_inverse_mask",
          value: rule.source_address,
          value2: rule.source_mask
        });
      } else if (rule.source_type === "network" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_network",
          value: rule.source_address,
          value2: rule.source_mask
        });
      }
    } else {
      // IPv6 source handling - any can coexist with network or exact-match
      // exact-match and network are mutually exclusive
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule6_source_any"
        });
      }

      if (rule.source_address) {
        // Network can coexist with "any"
        operations.push({
          op: "set_rule6_source_network",
          value: rule.source_address
        });
      }

      if (rule.source_exact_match) {
        operations.push({
          op: "set_rule6_source_exact_match"
        });
      }
    }

    // Set destination (IPv4 only - IPv6 access-lists don't have destination)
    if (listType === "ipv4") {
      if (rule.destination_type === "any") {
        operations.push({
          op: "set_rule_destination_any"
        });
      } else if (rule.destination_type === "host" && rule.destination_address) {
        operations.push({
          op: "set_rule_destination_host",
          value: rule.destination_address
        });
      } else if (rule.destination_type === "inverse-mask" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_inverse_mask",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      } else if (rule.destination_type === "network" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_network",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      }
    }

    return this.batchConfigure({
      identifier,
      list_type: listType,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update access-list description
   */
  async updateAccessListDescription(
    identifier: string,
    listType: string,
    description: string | null
  ): Promise<any> {
    const operations: AccessListBatchOperation[] = [];

    if (description) {
      operations.push({
        op: listType === "ipv4" ? "set_access_list_description" : "set_access_list6_description",
        value: description
      });
    } else {
      operations.push({
        op: listType === "ipv4" ? "delete_access_list_description" : "delete_access_list6_description"
      });
    }

    return this.batchConfigure({
      identifier,
      list_type: listType,
      operations,
    });
  }

  /**
   * Helper: Delete an access-list
   */
  async deleteAccessList(identifier: string, listType: string): Promise<any> {
    const operations: AccessListBatchOperation[] = [];
    operations.push({
      op: listType === "ipv4" ? "delete_access_list" : "delete_access_list6"
    });

    return this.batchConfigure({
      identifier,
      list_type: listType,
      operations,
    });
  }

  /**
   * Helper: Add a rule to an existing access-list
   */
  async addRule(
    identifier: string,
    listType: string,
    rule: Partial<AccessListRule>
  ): Promise<any> {
    const operations: AccessListBatchOperation[] = [];

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

    // Set source
    if (listType === "ipv4") {
      // IPv4 source handling
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule_source_any"
        });
      } else if (rule.source_type === "host" && rule.source_address) {
        operations.push({
          op: "set_rule_source_host",
          value: rule.source_address
        });
      } else if (rule.source_type === "inverse-mask" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_inverse_mask",
          value: rule.source_address,
          value2: rule.source_mask
        });
      } else if (rule.source_type === "network" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_network",
          value: rule.source_address,
          value2: rule.source_mask
        });
      }
    } else {
      // IPv6 source handling - any can coexist with network or exact-match
      // exact-match and network are mutually exclusive
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule6_source_any"
        });
      }

      if (rule.source_address) {
        // Network can coexist with "any"
        operations.push({
          op: "set_rule6_source_network",
          value: rule.source_address
        });
      }

      if (rule.source_exact_match) {
        operations.push({
          op: "set_rule6_source_exact_match"
        });
      }
    }

    // Set destination (IPv4 only - IPv6 access-lists don't have destination)
    if (listType === "ipv4") {
      if (rule.destination_type === "any") {
        operations.push({
          op: "set_rule_destination_any"
        });
      } else if (rule.destination_type === "host" && rule.destination_address) {
        operations.push({
          op: "set_rule_destination_host",
          value: rule.destination_address
        });
      } else if (rule.destination_type === "inverse-mask" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_inverse_mask",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      } else if (rule.destination_type === "network" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_network",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      }
    }

    return this.batchConfigure({
      identifier,
      list_type: listType,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update an existing rule
   */
  async updateRule(
    identifier: string,
    listType: string,
    ruleNumber: number,
    rule: Partial<AccessListRule>
  ): Promise<any> {
    const operations: AccessListBatchOperation[] = [];

    // Delete existing source first
    operations.push({
      op: listType === "ipv4" ? "delete_rule_source" : "delete_rule6_source"
    });

    // Delete existing destination (IPv4 only - IPv6 doesn't have destination)
    if (listType === "ipv4") {
      operations.push({
        op: "delete_rule_destination"
      });
    }

    // Update action
    if (rule.action) {
      operations.push({
        op: listType === "ipv4" ? "set_rule_action" : "set_rule6_action",
        value: rule.action
      });
    }

    // Update description
    if (rule.description !== undefined) {
      if (rule.description) {
        operations.push({
          op: listType === "ipv4" ? "set_rule_description" : "set_rule6_description",
          value: rule.description
        });
      } else {
        operations.push({
          op: listType === "ipv4" ? "delete_rule_description" : "delete_rule6_description"
        });
      }
    }

    // Set new source
    if (listType === "ipv4") {
      // IPv4 source handling
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule_source_any"
        });
      } else if (rule.source_type === "host" && rule.source_address) {
        operations.push({
          op: "set_rule_source_host",
          value: rule.source_address
        });
      } else if (rule.source_type === "inverse-mask" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_inverse_mask",
          value: rule.source_address,
          value2: rule.source_mask
        });
      } else if (rule.source_type === "network" && rule.source_address && rule.source_mask) {
        operations.push({
          op: "set_rule_source_network",
          value: rule.source_address,
          value2: rule.source_mask
        });
      }
    } else {
      // IPv6 source handling - any can coexist with network or exact-match
      // exact-match and network are mutually exclusive
      if (rule.source_type === "any") {
        operations.push({
          op: "set_rule6_source_any"
        });
      }

      if (rule.source_address) {
        // Network can coexist with "any"
        operations.push({
          op: "set_rule6_source_network",
          value: rule.source_address
        });
      }

      if (rule.source_exact_match) {
        operations.push({
          op: "set_rule6_source_exact_match"
        });
      }
    }

    // Set new destination (IPv4 only - IPv6 access-lists don't have destination)
    if (listType === "ipv4") {
      if (rule.destination_type === "any") {
        operations.push({
          op: "set_rule_destination_any"
        });
      } else if (rule.destination_type === "host" && rule.destination_address) {
        operations.push({
          op: "set_rule_destination_host",
          value: rule.destination_address
        });
      } else if (rule.destination_type === "inverse-mask" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_inverse_mask",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      } else if (rule.destination_type === "network" && rule.destination_address && rule.destination_mask) {
        operations.push({
          op: "set_rule_destination_network",
          value: rule.destination_address,
          value2: rule.destination_mask
        });
      }
    }

    return this.batchConfigure({
      identifier,
      list_type: listType,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Helper: Delete a rule
   */
  async deleteRule(
    identifier: string,
    listType: string,
    ruleNumber: number
  ): Promise<any> {
    const operations: AccessListBatchOperation[] = [];
    operations.push({
      op: listType === "ipv4" ? "delete_rule" : "delete_rule6"
    });

    return this.batchConfigure({
      identifier,
      list_type: listType,
      rule_number: ruleNumber,
      operations,
    });
  }
}

export const accessListService = new AccessListService();
