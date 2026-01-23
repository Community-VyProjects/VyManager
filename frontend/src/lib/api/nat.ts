import { apiClient } from "./client";

// ==================== Type Definitions ====================

export interface NATRuleSource {
  address?: string | null;
  port?: string | null;
  group?: Record<string, string> | null; // {type: name}
}

export interface NATRuleDestination {
  address?: string | null;
  port?: string | null;
  group?: Record<string, string> | null; // {type: name}
}

export interface NATRuleTranslation {
  address?: string | null;
  port?: string | null;
}

export interface NATRuleLoadBalance {
  hash?: string | null;
  backend: string[];
}

export interface SourceNATRule {
  rule_number: number;
  description?: string | null;
  source?: NATRuleSource | null;
  destination?: NATRuleDestination | null;
  outbound_interface?: Record<string, string> | null; // {type: value}, type is "name" or "group"
  protocol?: string | null;
  packet_type?: string | null;
  translation?: NATRuleTranslation | null;
  load_balance?: NATRuleLoadBalance | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
}

export interface DestinationNATRule {
  rule_number: number;
  description?: string | null;
  source?: NATRuleSource | null;
  destination?: NATRuleDestination | null;
  inbound_interface?: Record<string, string> | null; // {type: value}, type is "name" or "group"
  protocol?: string | null;
  packet_type?: string | null;
  translation?: NATRuleTranslation | null;
  load_balance?: NATRuleLoadBalance | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
}

export interface StaticNATRule {
  rule_number: number;
  description?: string | null;
  destination?: Record<string, string> | null; // {address: value}
  inbound_interface?: string | null;
  translation?: Record<string, string> | null; // {address: value}
}

export interface NATConfigResponse {
  source_rules: SourceNATRule[];
  destination_rules: DestinationNATRule[];
  static_rules: StaticNATRule[];
  total: number;
  by_type: Record<string, number>;
}

export interface NATCapabilities {
  version: string;
  nat_types: {
    source: {
      supported: boolean;
      description: string;
    };
    destination: {
      supported: boolean;
      description: string;
    };
    static: {
      supported: boolean;
      description: string;
    };
  };
  operations: {
    source_nat: string[];
    destination_nat: string[];
    static_nat: string[];
  };
  device_name: string;
}

export interface NATBatchOperation {
  op: string;
  value?: string | null;
}

export interface NATBatchRequest {
  rule_number: number;
  nat_type: "source" | "destination" | "static";
  operations: NATBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, any> | null;
  error?: string | null;
}

// ==================== NAT Service ====================

class NATService {
  /**
   * Get NAT capabilities based on VyOS version
   */
  async getCapabilities(): Promise<NATCapabilities> {
    return apiClient.get<NATCapabilities>("/vyos/nat/capabilities");
  }

  /**
   * Get complete NAT configuration
   */
  async getConfig(refresh: boolean = false): Promise<NATConfigResponse> {
    const endpoint = refresh ? "/vyos/nat/config?refresh=true" : "/vyos/nat/config";
    return apiClient.get<NATConfigResponse>(endpoint);
  }

  /**
   * Execute batch NAT operations
   */
  async batchConfigure(request: NATBatchRequest): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>("/vyos/nat/batch", request);
      return response;
    } catch (error: any) {
      // Extract detailed error message from API response
      const errorMessage = error?.details?.detail || error?.message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new source NAT rule
   */
  async createSourceRule(
    ruleNumber: number,
    config: {
      description?: string;
      source_address?: string;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      destination_address?: string;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      outbound_interface_type?: "name" | "group";
      outbound_interface_value?: string;
      outbound_interface_invert?: boolean;
      protocol?: string;
      packet_type?: string;
      translation_type?: "ip" | "cidr" | "range" | "masquerade";
      translation_address?: string;
      load_balance_hash?: string;
      load_balance_backend?: string;
      disable?: boolean;
      exclude?: boolean;
      log?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the rule
    operations.push({ op: "set_source_rule" });

    // Description
    if (config.description) {
      operations.push({ op: "set_source_rule_description", value: config.description });
    }

    // Source
    if (config.source_address) {
      operations.push({ op: "set_source_rule_source_address", value: config.source_address });
    }
    if (config.source_port) {
      operations.push({ op: "set_source_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: config.source_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      operations.push({ op: "set_source_rule_destination_address", value: config.destination_address });
    }
    if (config.destination_port) {
      operations.push({ op: "set_source_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: config.destination_group_name })
      });
    }

    // Outbound interface
    if (config.outbound_interface_type && config.outbound_interface_value) {
      let interfaceValue = config.outbound_interface_value;
      if (config.outbound_interface_invert) {
        interfaceValue = `!${interfaceValue}`;
      }

      if (config.outbound_interface_type === "name") {
        operations.push({ op: "set_source_rule_outbound_interface_name", value: interfaceValue });
      } else {
        operations.push({ op: "set_source_rule_outbound_interface_group", value: interfaceValue });
      }
    }

    // Protocol
    if (config.protocol) {
      operations.push({ op: "set_source_rule_protocol", value: config.protocol });
    }

    // Packet type
    if (config.packet_type) {
      operations.push({ op: "set_source_rule_packet_type", value: config.packet_type });
    }

    // Translation
    if (config.translation_address) {
      operations.push({ op: "set_source_rule_translation_address", value: config.translation_address });
    }

    // Load balance
    if (config.load_balance_hash) {
      operations.push({ op: "set_source_rule_load_balance_hash", value: config.load_balance_hash });
    }
    if (config.load_balance_backend) {
      operations.push({ op: "set_source_rule_load_balance_backend", value: config.load_balance_backend });
    }

    // Flags
    if (config.disable) {
      operations.push({ op: "set_source_rule_disable" });
    }
    if (config.exclude) {
      operations.push({ op: "set_source_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_source_rule_log" });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "source",
      operations
    });

    // If batchConfigure didn't throw, the operation was successful
    // But still check the success field in case of VyOS-level errors
    if (!result.success) {
      throw new Error(result.error || "Failed to create source NAT rule");
    }

    return result;
  }

  /**
   * Create a new destination NAT rule
   */
  async createDestinationRule(
    ruleNumber: number,
    config: {
      description?: string;
      source_address?: string;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      destination_address?: string;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      inbound_interface_type?: "name" | "group";
      inbound_interface_value?: string;
      inbound_interface_invert?: boolean;
      protocol?: string;
      packet_type?: string;
      translation_address?: string;
      translation_port?: string;
      load_balance_hash?: string;
      load_balance_backend?: string;
      disable?: boolean;
      exclude?: boolean;
      log?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the rule
    operations.push({ op: "set_destination_rule" });

    // Description
    if (config.description) {
      operations.push({ op: "set_destination_rule_description", value: config.description });
    }

    // Source
    if (config.source_address) {
      operations.push({ op: "set_destination_rule_source_address", value: config.source_address });
    }
    if (config.source_port) {
      operations.push({ op: "set_destination_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: config.source_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      operations.push({ op: "set_destination_rule_destination_address", value: config.destination_address });
    }
    if (config.destination_port) {
      operations.push({ op: "set_destination_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: config.destination_group_name })
      });
    }

    // Inbound interface
    if (config.inbound_interface_type && config.inbound_interface_value) {
      let interfaceValue = config.inbound_interface_value;
      if (config.inbound_interface_invert) {
        interfaceValue = `!${interfaceValue}`;
      }

      if (config.inbound_interface_type === "name") {
        operations.push({ op: "set_destination_rule_inbound_interface_name", value: interfaceValue });
      } else {
        operations.push({ op: "set_destination_rule_inbound_interface_group", value: interfaceValue });
      }
    }

    // Protocol
    if (config.protocol) {
      operations.push({ op: "set_destination_rule_protocol", value: config.protocol });
    }

    // Packet type
    if (config.packet_type) {
      operations.push({ op: "set_destination_rule_packet_type", value: config.packet_type });
    }

    // Translation
    if (config.translation_address) {
      operations.push({ op: "set_destination_rule_translation_address", value: config.translation_address });
    }
    if (config.translation_port) {
      operations.push({ op: "set_destination_rule_translation_port", value: config.translation_port });
    }

    // Load balance
    if (config.load_balance_hash) {
      operations.push({ op: "set_destination_rule_load_balance_hash", value: config.load_balance_hash });
    }
    if (config.load_balance_backend) {
      operations.push({ op: "set_destination_rule_load_balance_backend", value: config.load_balance_backend });
    }

    // Flags
    if (config.disable) {
      operations.push({ op: "set_destination_rule_disable" });
    }
    if (config.exclude) {
      operations.push({ op: "set_destination_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_destination_rule_log" });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "destination",
      operations
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to create destination NAT rule");
    }

    return result;
  }

  /**
   * Create a new static NAT rule
   */
  async createStaticRule(
    ruleNumber: number,
    config: {
      description?: string;
      destination_address?: string;
      inbound_interface?: string;
      translation_address?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the rule
    operations.push({ op: "set_static_rule" });

    // Description
    if (config.description) {
      operations.push({ op: "set_static_rule_description", value: config.description });
    }

    // Destination
    if (config.destination_address) {
      operations.push({ op: "set_static_rule_destination_address", value: config.destination_address });
    }

    // Inbound interface
    if (config.inbound_interface) {
      operations.push({ op: "set_static_rule_inbound_interface", value: config.inbound_interface });
    }

    // Translation
    if (config.translation_address) {
      operations.push({ op: "set_static_rule_translation_address", value: config.translation_address });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "static",
      operations
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to create static NAT rule");
    }

    return result;
  }

  /**
   * Update an existing source NAT rule
   */
  async updateSourceRule(
    ruleNumber: number,
    config: {
      description?: string;
      source_address?: string;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      destination_address?: string;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      outbound_interface_type?: "name" | "group";
      outbound_interface_value?: string;
      outbound_interface_invert?: boolean;
      protocol?: string;
      delete_protocol?: boolean;
      packet_type?: string;
      translation_type?: "ip" | "cidr" | "range" | "masquerade";
      translation_address?: string;
      load_balance_hash?: string;
      load_balance_backend?: string;
      disable?: boolean;
      exclude?: boolean;
      log?: boolean;
    }
  ): Promise<VyOSResponse> {
    // Build operations just like createSourceRule
    const operations: NATBatchOperation[] = [];

    // Note: We don't need to recreate the rule, just update fields

    // Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({ op: "set_source_rule_description", value: config.description });
      }
    }

    // Source
    if (config.source_address) {
      operations.push({ op: "set_source_rule_source_address", value: config.source_address });
    }
    if (config.source_port) {
      operations.push({ op: "set_source_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: config.source_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      operations.push({ op: "set_source_rule_destination_address", value: config.destination_address });
    }
    if (config.destination_port) {
      operations.push({ op: "set_source_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: config.destination_group_name })
      });
    }

    // Outbound interface
    if (config.outbound_interface_type && config.outbound_interface_value) {
      let interfaceValue = config.outbound_interface_value;
      if (config.outbound_interface_invert) {
        interfaceValue = `!${interfaceValue}`;
      }

      if (config.outbound_interface_type === "name") {
        operations.push({ op: "set_source_rule_outbound_interface_name", value: interfaceValue });
      } else {
        operations.push({ op: "set_source_rule_outbound_interface_group", value: interfaceValue });
      }
    }

    // Protocol
    if (config.delete_protocol) {
      operations.push({ op: "delete_source_rule_protocol" });
    } else if (config.protocol && config.protocol !== "all") {
      operations.push({ op: "set_source_rule_protocol", value: config.protocol });
    }

    // Packet type
    if (config.packet_type) {
      operations.push({ op: "set_source_rule_packet_type", value: config.packet_type });
    }

    // Translation
    if (config.translation_address) {
      operations.push({ op: "set_source_rule_translation_address", value: config.translation_address });
    }

    // Load balance
    if (config.load_balance_hash) {
      operations.push({ op: "set_source_rule_load_balance_hash", value: config.load_balance_hash });
    }
    if (config.load_balance_backend) {
      operations.push({ op: "set_source_rule_load_balance_backend", value: config.load_balance_backend });
    }

    // Flags
    if (config.disable) {
      operations.push({ op: "set_source_rule_disable" });
    }
    if (config.exclude) {
      operations.push({ op: "set_source_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_source_rule_log" });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "source",
      operations
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to update source NAT rule");
    }

    return result;
  }

  /**
   * Update an existing destination NAT rule
   */
  async updateDestinationRule(
    ruleNumber: number,
    config: {
      description?: string;
      source_address?: string;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      destination_address?: string;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      inbound_interface_type?: "name" | "group";
      inbound_interface_value?: string;
      inbound_interface_invert?: boolean;
      protocol?: string;
      delete_protocol?: boolean;
      packet_type?: string;
      translation_address?: string;
      translation_port?: string;
      load_balance_hash?: string;
      load_balance_backend?: string;
      disable?: boolean;
      exclude?: boolean;
      log?: boolean;
    }
  ): Promise<VyOSResponse> {
    // Build operations just like createDestinationRule
    const operations: NATBatchOperation[] = [];

    // Note: We don't need to recreate the rule, just update fields

    // Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({ op: "set_destination_rule_description", value: config.description });
      }
    }

    // Source
    if (config.source_address) {
      operations.push({ op: "set_destination_rule_source_address", value: config.source_address });
    }
    if (config.source_port) {
      operations.push({ op: "set_destination_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: config.source_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      operations.push({ op: "set_destination_rule_destination_address", value: config.destination_address });
    }
    if (config.destination_port) {
      operations.push({ op: "set_destination_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: config.destination_group_name })
      });
    }

    // Inbound interface
    if (config.inbound_interface_type && config.inbound_interface_value) {
      let interfaceValue = config.inbound_interface_value;
      if (config.inbound_interface_invert) {
        interfaceValue = `!${interfaceValue}`;
      }

      if (config.inbound_interface_type === "name") {
        operations.push({ op: "set_destination_rule_inbound_interface_name", value: interfaceValue });
      } else {
        operations.push({ op: "set_destination_rule_inbound_interface_group", value: interfaceValue });
      }
    }

    // Protocol
    if (config.delete_protocol) {
      operations.push({ op: "delete_destination_rule_protocol" });
    } else if (config.protocol && config.protocol !== "all") {
      operations.push({ op: "set_destination_rule_protocol", value: config.protocol });
    }

    // Packet type
    if (config.packet_type) {
      operations.push({ op: "set_destination_rule_packet_type", value: config.packet_type });
    }

    // Translation
    if (config.translation_address) {
      operations.push({ op: "set_destination_rule_translation_address", value: config.translation_address });
    }
    if (config.translation_port) {
      operations.push({ op: "set_destination_rule_translation_port", value: config.translation_port });
    }

    // Load balance
    if (config.load_balance_hash) {
      operations.push({ op: "set_destination_rule_load_balance_hash", value: config.load_balance_hash });
    }
    if (config.load_balance_backend) {
      operations.push({ op: "set_destination_rule_load_balance_backend", value: config.load_balance_backend });
    }

    // Flags
    if (config.disable) {
      operations.push({ op: "set_destination_rule_disable" });
    }
    if (config.exclude) {
      operations.push({ op: "set_destination_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_destination_rule_log" });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "destination",
      operations
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to update destination NAT rule");
    }

    return result;
  }

  /**
   * Update an existing static NAT rule
   */
  async updateStaticRule(
    ruleNumber: number,
    config: {
      description?: string;
      destination_address?: string;
      inbound_interface?: string;
      translation_address?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({ op: "set_static_rule_description", value: config.description });
      }
    }

    // Destination address
    if (config.destination_address) {
      operations.push({ op: "set_static_rule_destination", value: config.destination_address });
    }

    // Inbound interface
    if (config.inbound_interface !== undefined) {
      if (config.inbound_interface) {
        operations.push({ op: "set_static_rule_inbound_interface", value: config.inbound_interface });
      }
    }

    // Translation address
    if (config.translation_address) {
      operations.push({ op: "set_static_rule_translation", value: config.translation_address });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "static",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update static NAT rule");
    }

    return result;
  }

  /**
   * Delete a source NAT rule
   */
  async deleteSourceRule(ruleNumber: number): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "source",
      operations: [{ op: "delete_source_rule" }]
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to delete source NAT rule");
    }

    return result;
  }

  /**
   * Delete a destination NAT rule
   */
  async deleteDestinationRule(ruleNumber: number): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "destination",
      operations: [{ op: "delete_destination_rule" }]
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to delete destination NAT rule");
    }

    return result;
  }

  /**
   * Delete a static NAT rule
   */
  async deleteStaticRule(ruleNumber: number): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "static",
      operations: [{ op: "delete_static_rule" }]
    });

    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to delete static NAT rule");
    }

    return result;
  }

  /**
   * Refresh configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh", {});
  }

  /**
   * Reorder NAT rules in a single batch operation
   */
  async reorderRules(
    natType: "source" | "destination" | "static",
    rules: Array<{
      old_number: number;
      new_number: number;
      rule_data: any;
    }>
  ): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>("/vyos/nat/reorder", {
        nat_type: natType,
        rules: rules
      });
      return response;
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Unknown error";
      throw new Error(errorMessage);
    }
  }
}

export const natService = new NATService();
