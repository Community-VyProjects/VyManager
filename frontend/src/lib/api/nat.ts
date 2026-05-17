import { apiClient } from "./client";
import { ApiError } from "@/lib/types/api";

// ==================== Type Definitions ====================

export interface NATRuleSource {
  address?: string | null;
  port?: string | null;
  fqdn?: string | null;
  group?: Record<string, string> | null; // {type: name}
}

export interface NATRuleDestination {
  address?: string | null;
  port?: string | null;
  fqdn?: string | null;
  group?: Record<string, string> | null; // {type: name}
}

export interface NATRuleTranslationOptions {
  address_mapping?: string | null;
  port_mapping?: string | null;
}

export interface NATRuleTranslationRedirect {
  port?: string | null;
}

export interface NATRuleTranslation {
  address?: string | null;
  port?: string | null;
  options?: NATRuleTranslationOptions | null;
  redirect?: NATRuleTranslationRedirect | null;
}

export interface NATRuleLoadBalanceBackend {
  name: string;
  weight?: string | null;
}

export interface NATRuleLoadBalance {
  hash?: string | null;
  backends: NATRuleLoadBalanceBackend[];
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
  log: boolean;
}

// ==================== CGNAT Type Definitions ====================

export interface CGNATExternalPoolRange {
  range: string;
  seq?: string | null;
}

export interface CGNATExternalPool {
  name: string;
  external_port_range?: string | null;
  per_user_limit_port?: string | null;
  ranges: CGNATExternalPoolRange[];
}

export interface CGNATInternalPool {
  name: string;
  ranges: string[];
}

export interface CGNATRule {
  rule_number: number;
  source_pool?: string | null;
  translation_pool?: string | null;
}

export interface CGNATConfig {
  log_allocation: boolean;
  external_pools: CGNATExternalPool[];
  internal_pools: CGNATInternalPool[];
  rules: CGNATRule[];
}

// ==================== Response & Request Types ====================

export interface NATConfigResponse {
  source_rules: SourceNATRule[];
  destination_rules: DestinationNATRule[];
  static_rules: StaticNATRule[];
  cgnat?: CGNATConfig | null;
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
    cgnat: {
      supported: boolean;
      description: string;
    };
  };
  features: Record<string, { supported: boolean; description: string }>;
  version_info: Record<string, boolean>;
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
  rule_number?: number;
  item_name?: string;
  nat_type: "source" | "destination" | "static" | "cgnat";
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
    } catch (error) {
      // Extract detailed error message from API response
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Unknown error";
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
      source_address_invert?: boolean;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      source_group_invert?: boolean;
      source_port_group_name?: string;
      destination_address?: string;
      destination_address_invert?: boolean;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      destination_group_invert?: boolean;
      destination_port_group_name?: string;
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
      const addr = config.source_address_invert ? `!${config.source_address}` : config.source_address;
      operations.push({ op: "set_source_rule_source_address", value: addr });
    }
    if (config.source_port) {
      operations.push({ op: "set_source_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      const groupName = config.source_group_invert ? `!${config.source_group_name}` : config.source_group_name;
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: groupName })
      });
    }
    if (config.source_port_group_name) {
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.source_port_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      const addr = config.destination_address_invert ? `!${config.destination_address}` : config.destination_address;
      operations.push({ op: "set_source_rule_destination_address", value: addr });
    }
    if (config.destination_port) {
      operations.push({ op: "set_source_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      const groupName = config.destination_group_invert ? `!${config.destination_group_name}` : config.destination_group_name;
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: groupName })
      });
    }
    if (config.destination_port_group_name) {
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.destination_port_group_name })
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
      source_address_invert?: boolean;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      source_group_invert?: boolean;
      source_port_group_name?: string;
      destination_address?: string;
      destination_address_invert?: boolean;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      destination_group_invert?: boolean;
      destination_port_group_name?: string;
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
      const addr = config.source_address_invert ? `!${config.source_address}` : config.source_address;
      operations.push({ op: "set_destination_rule_source_address", value: addr });
    }
    if (config.source_port) {
      operations.push({ op: "set_destination_rule_source_port", value: config.source_port });
    }
    if (config.source_group_type && config.source_group_name) {
      const groupName = config.source_group_invert ? `!${config.source_group_name}` : config.source_group_name;
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: groupName })
      });
    }
    if (config.source_port_group_name) {
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.source_port_group_name })
      });
    }

    // Destination
    if (config.destination_address) {
      const addr = config.destination_address_invert ? `!${config.destination_address}` : config.destination_address;
      operations.push({ op: "set_destination_rule_destination_address", value: addr });
    }
    if (config.destination_port) {
      operations.push({ op: "set_destination_rule_destination_port", value: config.destination_port });
    }
    if (config.destination_group_type && config.destination_group_name) {
      const groupName = config.destination_group_invert ? `!${config.destination_group_name}` : config.destination_group_name;
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: groupName })
      });
    }
    if (config.destination_port_group_name) {
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.destination_port_group_name })
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
      log?: boolean;
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

    // Log
    if (config.log) {
      operations.push({ op: "set_static_rule_log" });
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
      source_address_invert?: boolean;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      source_group_invert?: boolean;
      source_port_group_name?: string;
      destination_address?: string;
      destination_address_invert?: boolean;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      destination_group_invert?: boolean;
      destination_port_group_name?: string;
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
      // Delete flags for clearing fields
      delete_source_address?: boolean;
      delete_source_port?: boolean;
      delete_source_group?: boolean;
      delete_source_port_group?: boolean;
      delete_destination_address?: boolean;
      delete_destination_port?: boolean;
      delete_destination_group?: boolean;
      delete_destination_port_group?: boolean;
      delete_outbound_interface_name?: boolean;
      delete_outbound_interface_group?: boolean;
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

    // Source - handle deletions first, then sets
    if (config.delete_source_address) {
      operations.push({ op: "delete_source_rule_source_address" });
    } else if (config.source_address) {
      const addr = config.source_address_invert ? `!${config.source_address}` : config.source_address;
      operations.push({ op: "set_source_rule_source_address", value: addr });
    }

    if (config.delete_source_port) {
      operations.push({ op: "delete_source_rule_source_port" });
    } else if (config.source_port) {
      operations.push({ op: "set_source_rule_source_port", value: config.source_port });
    }

    if (config.delete_source_group) {
      // Delete all possible group types (backend expects just the group_type string)
      operations.push({ op: "delete_source_rule_source_group", value: "address-group" });
      operations.push({ op: "delete_source_rule_source_group", value: "network-group" });
      operations.push({ op: "delete_source_rule_source_group", value: "domain-group" });
    } else if (config.source_group_type && config.source_group_name) {
      const groupName = config.source_group_invert ? `!${config.source_group_name}` : config.source_group_name;
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: groupName })
      });
    }

    if (config.delete_source_port_group) {
      operations.push({ op: "delete_source_rule_source_group", value: "port-group" });
    } else if (config.source_port_group_name) {
      operations.push({
        op: "set_source_rule_source_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.source_port_group_name })
      });
    }

    // Destination - handle deletions first, then sets
    if (config.delete_destination_address) {
      operations.push({ op: "delete_source_rule_destination_address" });
    } else if (config.destination_address) {
      const addr = config.destination_address_invert ? `!${config.destination_address}` : config.destination_address;
      operations.push({ op: "set_source_rule_destination_address", value: addr });
    }

    if (config.delete_destination_port) {
      operations.push({ op: "delete_source_rule_destination_port" });
    } else if (config.destination_port) {
      operations.push({ op: "set_source_rule_destination_port", value: config.destination_port });
    }

    if (config.delete_destination_group) {
      // Delete all possible group types (backend expects just the group_type string)
      operations.push({ op: "delete_source_rule_destination_group", value: "address-group" });
      operations.push({ op: "delete_source_rule_destination_group", value: "network-group" });
      operations.push({ op: "delete_source_rule_destination_group", value: "domain-group" });
    } else if (config.destination_group_type && config.destination_group_name) {
      const groupName = config.destination_group_invert ? `!${config.destination_group_name}` : config.destination_group_name;
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: groupName })
      });
    }

    if (config.delete_destination_port_group) {
      operations.push({ op: "delete_source_rule_destination_group", value: "port-group" });
    } else if (config.destination_port_group_name) {
      operations.push({
        op: "set_source_rule_destination_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.destination_port_group_name })
      });
    }

    // Outbound interface - handle deletions first when switching types
    if (config.delete_outbound_interface_name) {
      operations.push({ op: "delete_source_rule_outbound_interface_name" });
    }
    if (config.delete_outbound_interface_group) {
      operations.push({ op: "delete_source_rule_outbound_interface_group" });
    }

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
      source_address_invert?: boolean;
      source_port?: string;
      source_group_type?: string;
      source_group_name?: string;
      source_group_invert?: boolean;
      source_port_group_name?: string;
      destination_address?: string;
      destination_address_invert?: boolean;
      destination_port?: string;
      destination_group_type?: string;
      destination_group_name?: string;
      destination_group_invert?: boolean;
      destination_port_group_name?: string;
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
      // Delete flags for clearing fields
      delete_source_address?: boolean;
      delete_source_port?: boolean;
      delete_source_group?: boolean;
      delete_source_port_group?: boolean;
      delete_destination_address?: boolean;
      delete_destination_port?: boolean;
      delete_destination_group?: boolean;
      delete_destination_port_group?: boolean;
      delete_inbound_interface_name?: boolean;
      delete_inbound_interface_group?: boolean;
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

    // Source - handle deletions first, then sets
    if (config.delete_source_address) {
      operations.push({ op: "delete_destination_rule_source_address" });
    } else if (config.source_address) {
      const addr = config.source_address_invert ? `!${config.source_address}` : config.source_address;
      operations.push({ op: "set_destination_rule_source_address", value: addr });
    }

    if (config.delete_source_port) {
      operations.push({ op: "delete_destination_rule_source_port" });
    } else if (config.source_port) {
      operations.push({ op: "set_destination_rule_source_port", value: config.source_port });
    }

    if (config.delete_source_group) {
      // Delete all possible group types (backend expects just the group_type string)
      operations.push({ op: "delete_destination_rule_source_group", value: "address-group" });
      operations.push({ op: "delete_destination_rule_source_group", value: "network-group" });
      operations.push({ op: "delete_destination_rule_source_group", value: "domain-group" });
    } else if (config.source_group_type && config.source_group_name) {
      const groupName = config.source_group_invert ? `!${config.source_group_name}` : config.source_group_name;
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: config.source_group_type, group_name: groupName })
      });
    }

    if (config.delete_source_port_group) {
      operations.push({ op: "delete_destination_rule_source_group", value: "port-group" });
    } else if (config.source_port_group_name) {
      operations.push({
        op: "set_destination_rule_source_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.source_port_group_name })
      });
    }

    // Destination - handle deletions first, then sets
    if (config.delete_destination_address) {
      operations.push({ op: "delete_destination_rule_destination_address" });
    } else if (config.destination_address) {
      const addr = config.destination_address_invert ? `!${config.destination_address}` : config.destination_address;
      operations.push({ op: "set_destination_rule_destination_address", value: addr });
    }

    if (config.delete_destination_port) {
      operations.push({ op: "delete_destination_rule_destination_port" });
    } else if (config.destination_port) {
      operations.push({ op: "set_destination_rule_destination_port", value: config.destination_port });
    }

    if (config.delete_destination_group) {
      // Delete all possible group types (backend expects just the group_type string)
      operations.push({ op: "delete_destination_rule_destination_group", value: "address-group" });
      operations.push({ op: "delete_destination_rule_destination_group", value: "network-group" });
      operations.push({ op: "delete_destination_rule_destination_group", value: "domain-group" });
    } else if (config.destination_group_type && config.destination_group_name) {
      const groupName = config.destination_group_invert ? `!${config.destination_group_name}` : config.destination_group_name;
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: config.destination_group_type, group_name: groupName })
      });
    }

    if (config.delete_destination_port_group) {
      operations.push({ op: "delete_destination_rule_destination_group", value: "port-group" });
    } else if (config.destination_port_group_name) {
      operations.push({
        op: "set_destination_rule_destination_group",
        value: JSON.stringify({ group_type: "port-group", group_name: config.destination_port_group_name })
      });
    }

    // Inbound interface - handle deletions first when switching types
    if (config.delete_inbound_interface_name) {
      operations.push({ op: "delete_destination_rule_inbound_interface_name" });
    }
    if (config.delete_inbound_interface_group) {
      operations.push({ op: "delete_destination_rule_inbound_interface_group" });
    }

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
      log?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({ op: "set_static_rule_description", value: config.description });
      } else {
        operations.push({ op: "delete_static_rule_description" });
      }
    }

    // Destination address
    if (config.destination_address) {
      operations.push({ op: "set_static_rule_destination_address", value: config.destination_address });
    }

    // Inbound interface
    if (config.inbound_interface !== undefined) {
      if (config.inbound_interface) {
        operations.push({ op: "set_static_rule_inbound_interface", value: config.inbound_interface });
      }
    }

    // Translation address
    if (config.translation_address) {
      operations.push({ op: "set_static_rule_translation_address", value: config.translation_address });
    }

    // Log
    if (config.log) {
      operations.push({ op: "set_static_rule_log" });
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
   * Flatten a SourceNATRule into a rule_data dict for the reorder endpoint
   */
  private flattenSourceRule(rule: SourceNATRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (rule.description) data.description = rule.description;
    if (rule.source?.address) data.source_address = rule.source.address;
    if (rule.source?.fqdn) data.source_fqdn = rule.source.fqdn;
    if (rule.source?.port) data.source_port = rule.source.port;
    if (rule.source?.group) data.source_group = rule.source.group;
    if (rule.destination?.address) data.destination_address = rule.destination.address;
    if (rule.destination?.fqdn) data.destination_fqdn = rule.destination.fqdn;
    if (rule.destination?.port) data.destination_port = rule.destination.port;
    if (rule.destination?.group) data.destination_group = rule.destination.group;
    if (rule.outbound_interface) {
      const key = Object.keys(rule.outbound_interface)[0];
      if (key === "name") data.outbound_interface_name = rule.outbound_interface[key];
      else if (key === "group") data.outbound_interface_group = rule.outbound_interface[key];
    }
    if (rule.protocol) data.protocol = rule.protocol;
    if (rule.packet_type) data.packet_type = rule.packet_type;
    if (rule.translation?.address) data.translation_address = rule.translation.address;
    if (rule.translation?.port) data.translation_port = rule.translation.port;
    if (rule.translation?.options?.address_mapping) data.translation_options_address_mapping = rule.translation.options.address_mapping;
    if (rule.translation?.options?.port_mapping) data.translation_options_port_mapping = rule.translation.options.port_mapping;
    if (rule.load_balance?.hash) data.load_balance_hash = rule.load_balance.hash;
    if (rule.load_balance?.backends?.length) data.load_balance_backends = rule.load_balance.backends;
    if (rule.disable) data.disable = true;
    if (rule.exclude) data.exclude = true;
    if (rule.log) data.log = true;
    return data;
  }

  /**
   * Flatten a DestinationNATRule into a rule_data dict for the reorder endpoint
   */
  private flattenDestinationRule(rule: DestinationNATRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (rule.description) data.description = rule.description;
    if (rule.source?.address) data.source_address = rule.source.address;
    if (rule.source?.fqdn) data.source_fqdn = rule.source.fqdn;
    if (rule.source?.port) data.source_port = rule.source.port;
    if (rule.source?.group) data.source_group = rule.source.group;
    if (rule.destination?.address) data.destination_address = rule.destination.address;
    if (rule.destination?.fqdn) data.destination_fqdn = rule.destination.fqdn;
    if (rule.destination?.port) data.destination_port = rule.destination.port;
    if (rule.destination?.group) data.destination_group = rule.destination.group;
    if (rule.inbound_interface) {
      const key = Object.keys(rule.inbound_interface)[0];
      if (key === "name") data.inbound_interface_name = rule.inbound_interface[key];
      else if (key === "group") data.inbound_interface_group = rule.inbound_interface[key];
    }
    if (rule.protocol) data.protocol = rule.protocol;
    if (rule.packet_type) data.packet_type = rule.packet_type;
    if (rule.translation?.address) data.translation_address = rule.translation.address;
    if (rule.translation?.port) data.translation_port = rule.translation.port;
    if (rule.translation?.options?.address_mapping) data.translation_options_address_mapping = rule.translation.options.address_mapping;
    if (rule.translation?.options?.port_mapping) data.translation_options_port_mapping = rule.translation.options.port_mapping;
    if (rule.translation?.redirect?.port) data.translation_redirect_port = rule.translation.redirect.port;
    if (rule.load_balance?.hash) data.load_balance_hash = rule.load_balance.hash;
    if (rule.load_balance?.backends?.length) data.load_balance_backends = rule.load_balance.backends;
    if (rule.disable) data.disable = true;
    if (rule.exclude) data.exclude = true;
    if (rule.log) data.log = true;
    return data;
  }

  /**
   * Flatten a StaticNATRule into a rule_data dict for the reorder endpoint
   */
  private flattenStaticRule(rule: StaticNATRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (rule.description) data.description = rule.description;
    if (rule.destination?.address) data.destination_address = rule.destination.address;
    if (rule.inbound_interface) data.inbound_interface = rule.inbound_interface;
    if (rule.translation?.address) data.translation_address = rule.translation.address;
    if (rule.log) data.log = true;
    return data;
  }

  /**
   * Flatten a CGNATRule into a rule_data dict for the reorder endpoint
   */
  private flattenCGNATRule(rule: CGNATRule): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (rule.source_pool) data.source_pool = rule.source_pool;
    if (rule.translation_pool) data.translation_pool = rule.translation_pool;
    return data;
  }

  /**
   * Delete a rule and compact remaining rules to fill gaps.
   * After deletion, renumbers all rules sequentially starting from 100.
   */
  async deleteAndCompactRules(
    natType: "source" | "destination" | "static",
    ruleNumber: number
  ): Promise<VyOSResponse> {
    // Step 1: Delete the rule
    if (natType === "source") {
      await this.deleteSourceRule(ruleNumber);
    } else if (natType === "destination") {
      await this.deleteDestinationRule(ruleNumber);
    } else {
      await this.deleteStaticRule(ruleNumber);
    }

    // Step 2: Fetch fresh config to see remaining rules
    const config = await this.getConfig(true);

    let remainingRules: Array<{ rule_number: number; data: Record<string, unknown> }> = [];

    if (natType === "source") {
      remainingRules = (config.source_rules ?? [])
        .sort((a, b) => a.rule_number - b.rule_number)
        .map(r => ({ rule_number: r.rule_number, data: this.flattenSourceRule(r) }));
    } else if (natType === "destination") {
      remainingRules = (config.destination_rules ?? [])
        .sort((a, b) => a.rule_number - b.rule_number)
        .map(r => ({ rule_number: r.rule_number, data: this.flattenDestinationRule(r) }));
    } else {
      remainingRules = (config.static_rules ?? [])
        .sort((a, b) => a.rule_number - b.rule_number)
        .map(r => ({ rule_number: r.rule_number, data: this.flattenStaticRule(r) }));
    }

    // Step 3: Check if compaction is needed
    const needsCompaction = remainingRules.some((r, idx) => r.rule_number !== 100 + idx);

    if (!needsCompaction || remainingRules.length === 0) {
      return { success: true };
    }

    // Step 4: Build reorder request to compact to sequential [100, 101, 102, ...]
    const reorderItems = remainingRules.map((r, idx) => ({
      old_number: r.rule_number,
      new_number: 100 + idx,
      rule_data: r.data,
    }));

    return this.reorderRules(natType, reorderItems);
  }

  /**
   * Delete a CGNAT rule and compact remaining CGNAT rules sequentially from 100.
   */
  async deleteAndCompactCGNATRules(ruleNumber: number): Promise<VyOSResponse> {
    // Step 1: Delete the rule
    await this.deleteCGNATRule(ruleNumber);

    // Step 2: Fetch fresh config
    const config = await this.getConfig(true);

    const remainingRules = (config.cgnat?.rules ?? [])
      .sort((a, b) => a.rule_number - b.rule_number)
      .map(r => ({ rule_number: r.rule_number, data: this.flattenCGNATRule(r) }));

    // Step 3: Check if compaction is needed
    const needsCompaction = remainingRules.some((r, idx) => r.rule_number !== 100 + idx);

    if (!needsCompaction || remainingRules.length === 0) {
      return { success: true };
    }

    // Step 4: Build reorder request
    const reorderItems = remainingRules.map((r, idx) => ({
      old_number: r.rule_number,
      new_number: 100 + idx,
      rule_data: r.data,
    }));

    return this.reorderRules("cgnat", reorderItems);
  }

  /**
   * Reorder NAT rules in a single batch operation
   */
  async reorderRules(
    natType: "source" | "destination" | "static" | "cgnat",
    rules: Array<{
      old_number: number;
      new_number: number;
      rule_data: Record<string, unknown>;
    }>
  ): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>("/vyos/nat/reorder", {
        nat_type: natType,
        rules: rules
      });
      return response;
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  // ==================== CGNAT Methods ====================

  /**
   * Create a CGNAT external pool
   */
  async createExternalPool(
    poolName: string,
    config: {
      external_port_range?: string;
      per_user_limit_port?: string;
      ranges?: Array<{ range: string; seq?: string }>;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the pool
    operations.push({ op: "set_cgnat_external_pool" });

    // External port range
    if (config.external_port_range) {
      operations.push({ op: "set_cgnat_external_pool_port_range", value: config.external_port_range });
    }

    // Per-user limit port
    if (config.per_user_limit_port) {
      operations.push({ op: "set_cgnat_external_pool_per_user_limit_port", value: config.per_user_limit_port });
    }

    // Ranges
    if (config.ranges) {
      for (const r of config.ranges) {
        const rangeValue = r.seq
          ? JSON.stringify({ range: r.range, seq: r.seq })
          : JSON.stringify({ range: r.range });
        operations.push({ op: "set_cgnat_external_pool_range", value: rangeValue });
      }
    }

    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create CGNAT external pool");
    }

    return result;
  }

  /**
   * Update a CGNAT external pool
   */
  async updateExternalPool(
    poolName: string,
    config: {
      external_port_range?: string;
      per_user_limit_port?: string;
      ranges?: Array<{ range: string; seq?: string }>;
      delete_external_port_range?: boolean;
      delete_per_user_limit_port?: boolean;
      delete_ranges?: string[];
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Handle deletions
    if (config.delete_external_port_range) {
      operations.push({ op: "delete_cgnat_external_pool_port_range" });
    } else if (config.external_port_range) {
      operations.push({ op: "set_cgnat_external_pool_port_range", value: config.external_port_range });
    }

    if (config.delete_per_user_limit_port) {
      operations.push({ op: "delete_cgnat_external_pool_per_user_limit_port" });
    } else if (config.per_user_limit_port) {
      operations.push({ op: "set_cgnat_external_pool_per_user_limit_port", value: config.per_user_limit_port });
    }

    // Delete old ranges
    if (config.delete_ranges) {
      for (const r of config.delete_ranges) {
        operations.push({ op: "delete_cgnat_external_pool_range", value: r });
      }
    }

    // Set new ranges
    if (config.ranges) {
      for (const r of config.ranges) {
        const rangeValue = r.seq
          ? JSON.stringify({ range: r.range, seq: r.seq })
          : JSON.stringify({ range: r.range });
        operations.push({ op: "set_cgnat_external_pool_range", value: rangeValue });
      }
    }

    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update CGNAT external pool");
    }

    return result;
  }

  /**
   * Delete a CGNAT external pool
   */
  async deleteExternalPool(poolName: string): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations: [{ op: "delete_cgnat_external_pool" }]
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to delete CGNAT external pool");
    }

    return result;
  }

  /**
   * Create a CGNAT internal pool
   */
  async createInternalPool(
    poolName: string,
    config: {
      ranges: string[];
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the pool
    operations.push({ op: "set_cgnat_internal_pool" });

    // Ranges
    for (const r of config.ranges) {
      operations.push({ op: "set_cgnat_internal_pool_range", value: r });
    }

    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create CGNAT internal pool");
    }

    return result;
  }

  /**
   * Update a CGNAT internal pool
   */
  async updateInternalPool(
    poolName: string,
    config: {
      ranges?: string[];
      delete_ranges?: string[];
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Delete old ranges
    if (config.delete_ranges) {
      for (const r of config.delete_ranges) {
        operations.push({ op: "delete_cgnat_internal_pool_range", value: r });
      }
    }

    // Set new ranges
    if (config.ranges) {
      for (const r of config.ranges) {
        operations.push({ op: "set_cgnat_internal_pool_range", value: r });
      }
    }

    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update CGNAT internal pool");
    }

    return result;
  }

  /**
   * Delete a CGNAT internal pool
   */
  async deleteInternalPool(poolName: string): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      item_name: poolName,
      nat_type: "cgnat",
      operations: [{ op: "delete_cgnat_internal_pool" }]
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to delete CGNAT internal pool");
    }

    return result;
  }

  /**
   * Create a CGNAT rule
   */
  async createCGNATRule(
    ruleNumber: number,
    config: {
      source_pool?: string;
      translation_pool?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Create the rule
    operations.push({ op: "set_cgnat_rule" });

    // Source pool
    if (config.source_pool) {
      operations.push({ op: "set_cgnat_rule_source_pool", value: config.source_pool });
    }

    // Translation pool
    if (config.translation_pool) {
      operations.push({ op: "set_cgnat_rule_translation_pool", value: config.translation_pool });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create CGNAT rule");
    }

    return result;
  }

  /**
   * Update a CGNAT rule
   */
  async updateCGNATRule(
    ruleNumber: number,
    config: {
      source_pool?: string;
      translation_pool?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    // Source pool
    if (config.source_pool) {
      operations.push({ op: "set_cgnat_rule_source_pool", value: config.source_pool });
    }

    // Translation pool
    if (config.translation_pool) {
      operations.push({ op: "set_cgnat_rule_translation_pool", value: config.translation_pool });
    }

    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update CGNAT rule");
    }

    return result;
  }

  /**
   * Delete a CGNAT rule
   */
  async deleteCGNATRule(ruleNumber: number): Promise<VyOSResponse> {
    const result = await this.batchConfigure({
      rule_number: ruleNumber,
      nat_type: "cgnat",
      operations: [{ op: "delete_cgnat_rule" }]
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to delete CGNAT rule");
    }

    return result;
  }

  /**
   * Toggle CGNAT log-allocation setting
   */
  async setCGNATLogAllocation(enable: boolean): Promise<VyOSResponse> {
    const operations: NATBatchOperation[] = [];

    if (enable) {
      operations.push({ op: "set_cgnat_log_allocation" });
    } else {
      operations.push({ op: "delete_cgnat_log_allocation" });
    }

    const result = await this.batchConfigure({
      nat_type: "cgnat",
      operations
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to set CGNAT log allocation");
    }

    return result;
  }
}

export const natService = new NATService();
