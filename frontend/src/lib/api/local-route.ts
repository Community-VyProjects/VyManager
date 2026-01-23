import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface LocalRouteRule {
  rule_number: number;
  source?: string | null;
  destination?: string | null;
  inbound_interface?: string | null;
  table?: string | null;
  vrf?: string | null;
}

export interface LocalRouteConfigResponse {
  ipv4_rules: LocalRouteRule[];
  ipv6_rules: LocalRouteRule[];
  total_ipv4: number;
  total_ipv6: number;
}

export interface LocalRouteCapabilitiesResponse {
  version: string;
  features: {
    ipv4_local_route: {
      supported: boolean;
      description: string;
    };
    ipv6_local_route: {
      supported: boolean;
      description: string;
    };
    source_matching: {
      supported: boolean;
      description: string;
    };
    destination_matching: {
      supported: boolean;
      description: string;
    };
    inbound_interface_matching: {
      supported: boolean;
      description: string;
    };
    routing_table_selection: {
      supported: boolean;
      description: string;
    };
    vrf_support: {
      supported: boolean;
      description: string;
    };
  };
  device_name?: string;
}

export interface LocalRouteBatchOperation {
  op: string;
  value?: string;
}

export interface LocalRouteBatchRequest {
  rule_number: number;
  rule_type: string;  // 'ipv4' or 'ipv6'
  operations: LocalRouteBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class LocalRouteService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<LocalRouteCapabilitiesResponse> {
    return apiClient.get<LocalRouteCapabilitiesResponse>("/vyos/local-route/capabilities");
  }

  /**
   * Get all local route configurations
   */
  async getConfig(refresh: boolean = false): Promise<LocalRouteConfigResponse> {
    return apiClient.get<LocalRouteConfigResponse>("/vyos/local-route/config", {
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
  async batchConfigure(request: LocalRouteBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/local-route/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Reorder rules
   */
  async reorderRules(
    ruleType: string,
    rules: Array<{ old_number: number; new_number: number; rule_data: LocalRouteRule }>
  ): Promise<any> {
    const result = await apiClient.post("/vyos/local-route/reorder", {
      rule_type: ruleType,
      rules,
    });
    await this.refreshConfig();
    return result;
  }

  /**
   * Helper: Create a new rule
   */
  async createRule(
    ruleNumber: number,
    ruleType: string,
    config: Partial<LocalRouteRule>
  ): Promise<any> {
    const operations: LocalRouteBatchOperation[] = [];

    // Create rule
    operations.push({
      op: ruleType === "ipv4" ? "set_local_route_rule" : "set_local_route6_rule"
    });

    // Set source
    if (config.source) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_source" : "set_local_route6_rule_source",
        value: config.source
      });
    }

    // Set destination
    if (config.destination) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_destination" : "set_local_route6_rule_destination",
        value: config.destination
      });
    }

    // Set inbound interface
    if (config.inbound_interface) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_inbound_interface" : "set_local_route6_rule_inbound_interface",
        value: config.inbound_interface
      });
    }

    // Set table (required - unless VRF is set)
    if (config.table) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_set_table" : "set_local_route6_rule_set_table",
        value: config.table
      });
    }

    // Set VRF (VyOS 1.5+ only)
    if (config.vrf) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_set_vrf" : "set_local_route6_rule_set_vrf",
        value: config.vrf
      });
    }

    return this.batchConfigure({
      rule_number: ruleNumber,
      rule_type: ruleType,
      operations,
    });
  }

  /**
   * Helper: Update an existing rule
   */
  async updateRule(
    ruleNumber: number,
    ruleType: string,
    config: Partial<LocalRouteRule>
  ): Promise<any> {
    const operations: LocalRouteBatchOperation[] = [];

    // IMPORTANT: Process deletes FIRST, then sets
    // This ensures VyOS properly removes fields before setting new values

    // Delete operations first
    if (config.source !== undefined && !config.source) {
      operations.push({
        op: ruleType === "ipv4" ? "delete_local_route_rule_source" : "delete_local_route6_rule_source"
      });
    }

    if (config.destination !== undefined && !config.destination) {
      operations.push({
        op: ruleType === "ipv4" ? "delete_local_route_rule_destination" : "delete_local_route6_rule_destination"
      });
    }

    if (config.inbound_interface !== undefined && !config.inbound_interface) {
      operations.push({
        op: ruleType === "ipv4" ? "delete_local_route_rule_inbound_interface" : "delete_local_route6_rule_inbound_interface"
      });
    }

    if (config.vrf !== undefined && !config.vrf) {
      operations.push({
        op: ruleType === "ipv4" ? "delete_local_route_rule_set_vrf" : "delete_local_route6_rule_set_vrf"
      });
    }

    // Set operations after deletes
    if (config.source !== undefined && config.source) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_source" : "set_local_route6_rule_source",
        value: config.source
      });
    }

    if (config.destination !== undefined && config.destination) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_destination" : "set_local_route6_rule_destination",
        value: config.destination
      });
    }

    if (config.inbound_interface !== undefined && config.inbound_interface) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_inbound_interface" : "set_local_route6_rule_inbound_interface",
        value: config.inbound_interface
      });
    }

    if (config.table !== undefined && config.table) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_set_table" : "set_local_route6_rule_set_table",
        value: config.table
      });
    }

    if (config.vrf !== undefined && config.vrf) {
      operations.push({
        op: ruleType === "ipv4" ? "set_local_route_rule_set_vrf" : "set_local_route6_rule_set_vrf",
        value: config.vrf
      });
    }

    return this.batchConfigure({
      rule_number: ruleNumber,
      rule_type: ruleType,
      operations,
    });
  }

  /**
   * Helper: Delete a rule
   */
  async deleteRule(
    ruleNumber: number,
    ruleType: string
  ): Promise<any> {
    const operations: LocalRouteBatchOperation[] = [];
    operations.push({
      op: ruleType === "ipv4" ? "delete_local_route_rule" : "delete_local_route6_rule"
    });

    return this.batchConfigure({
      rule_number: ruleNumber,
      rule_type: ruleType,
      operations,
    });
  }
}

export const localRouteService = new LocalRouteService();
