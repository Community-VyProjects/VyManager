import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface FirewallRuleGeoIP {
  country_code?: string[] | null;  // Array of country codes
  inverse_match?: boolean | null;
}

export interface FirewallRuleSource {
  address?: string | null;
  port?: string | null;
  mac_address?: string | null;
  geoip?: FirewallRuleGeoIP | null;
  group?: Record<string, string> | null; // {"address-group": "LAN"}
}

export interface FirewallRuleDestination {
  address?: string | null;
  port?: string | null;
  geoip?: FirewallRuleGeoIP | null;
  group?: Record<string, string> | null;
}

export interface FirewallRuleState {
  established?: boolean | null;
  new?: boolean | null;
  related?: boolean | null;
  invalid?: boolean | null;
}

export interface FirewallRuleInterface {
  inbound?: string | null;
  outbound?: string | null;
}

export interface FirewallRulePacketMods {
  dscp?: string | null;
  mark?: string | null;
  ttl?: string | null;
}

export interface FirewallRuleTcpFlags {
  [flag: string]: "enabled" | "disabled" | "not"; // e.g., {"syn": "enabled", "ack": "not"}
}

export interface FirewallRule {
  rule_number: number;
  chain: string;
  is_custom_chain: boolean;
  description?: string | null;
  action?: string | null;
  protocol?: string | null;
  source?: FirewallRuleSource | null;
  destination?: FirewallRuleDestination | null;
  state?: FirewallRuleState | null;
  interface?: FirewallRuleInterface | null;
  packet_mods?: FirewallRulePacketMods | null;
  tcp_flags?: FirewallRuleTcpFlags | string[] | null; // Object for updates, array from backend
  icmp_type_name?: string | null;
  jump_target?: string | null;
  disable: boolean;
  log: boolean;
}

export interface CustomChain {
  name: string;
  description?: string | null;
  default_action?: string | null;
  rules: FirewallRule[];
}

export interface FirewallConfigResponse {
  forward_rules: FirewallRule[];
  input_rules: FirewallRule[];
  output_rules: FirewallRule[];
  custom_chains: CustomChain[];
  total_rules: number;
}

export interface FirewallCapabilitiesResponse {
  version: string;
  features: {
    base_chains: {
      supported: boolean;
      description: string;
    };
    custom_chains: {
      supported: boolean;
      description: string;
    };
    basic_matching: {
      supported: boolean;
      description: string;
    };
    firewall_groups: {
      supported: boolean;
      description: string;
    };
    remote_group: {
      supported: boolean;
      description: string;
    };
    connection_state: {
      supported: boolean;
      description: string;
    };
    tcp_flags: {
      supported: boolean;
      description: string;
    };
    packet_modifications: {
      supported: boolean;
      description: string;
    };
    icmp_matching: {
      supported: boolean;
      description: string;
    };
    interface_matching: {
      supported: boolean;
      description: string;
    };
    mac_matching: {
      supported: boolean;
      description: string;
    };
    jump_action: {
      supported: boolean;
      description: string;
    };
  };
  actions: string[];
  states: string[];
  tcp_flags: string[];
}

export interface FirewallBatchOperation {
  op: string;
  value?: string;
}

export interface FirewallBatchRequest {
  chain: string;
  rule_number?: number;
  is_custom_chain: boolean;
  operations: FirewallBatchOperation[];
}

export interface ReorderRuleItem {
  old_number: number;
  new_number: number;
  rule_data: any;
}

export interface ReorderFirewallRequest {
  chain: string;
  is_custom_chain: boolean;
  rules: ReorderRuleItem[];
}

// ============================================================================
// API Service
// ============================================================================

class FirewallIPv4Service {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<FirewallCapabilitiesResponse> {
    return apiClient.get<FirewallCapabilitiesResponse>("/vyos/firewall/ipv4/capabilities");
  }

  /**
   * Get all firewall configurations
   */
  async getConfig(refresh: boolean = false): Promise<FirewallConfigResponse> {
    return apiClient.get<FirewallConfigResponse>("/vyos/firewall/ipv4/config", {
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
  async batchConfigure(request: FirewallBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/firewall/ipv4/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Reorder rules within a chain
   */
  async reorderRules(request: ReorderFirewallRequest): Promise<any> {
    const result = await apiClient.post("/vyos/firewall/ipv4/reorder", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Helper: Create a new rule
   */
  async createRule(
    chain: string,
    ruleNumber: number,
    isCustomChain: boolean,
    config: Partial<FirewallRule>
  ): Promise<any> {
    const operations: FirewallBatchOperation[] = [];

    console.log("Creating rule:", { chain, ruleNumber, isCustomChain, config });

    // Create the rule
    if (isCustomChain) {
      operations.push({ op: "set_custom_chain_rule" });
    } else {
      operations.push({ op: "set_base_chain_rule" });
    }

    // Set action (required)
    if (config.action) {
      operations.push({ op: "set_rule_action", value: config.action });
    }

    // Set description
    if (config.description) {
      operations.push({ op: "set_rule_description", value: config.description });
    }

    // Set protocol
    if (config.protocol) {
      operations.push({ op: "set_rule_protocol", value: config.protocol });
    }

    // Set source
    if (config.source) {
      if (config.source.address) {
        operations.push({ op: "set_rule_source_address", value: config.source.address });
      }
      if (config.source.port) {
        operations.push({ op: "set_rule_source_port", value: config.source.port });
      }
      if (config.source.mac_address) {
        operations.push({ op: "set_rule_source_mac_address", value: config.source.mac_address });
      }
      if (config.source.geoip) {
        if (config.source.geoip.country_code && config.source.geoip.country_code.length > 0) {
          // Add each country code separately
          for (const code of config.source.geoip.country_code) {
            operations.push({ op: "set_rule_source_geoip_country", value: code.toLowerCase() });
          }
        }
        if (config.source.geoip.inverse_match) {
          operations.push({ op: "set_rule_source_geoip_inverse" });
        }
      }
      if (config.source.group) {
        // Iterate through all group types (address, network, port, etc.)
        for (const [groupType, groupName] of Object.entries(config.source.group)) {
          if (groupType.includes("address")) {
            operations.push({ op: "set_rule_source_group_address", value: groupName });
          } else if (groupType.includes("network")) {
            operations.push({ op: "set_rule_source_group_network", value: groupName });
          } else if (groupType.includes("port")) {
            operations.push({ op: "set_rule_source_group_port", value: groupName });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "set_rule_source_group_mac", value: groupName });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "set_rule_source_group_domain", value: groupName });
          }
        }
      }
    }

    // Set destination
    if (config.destination) {
      if (config.destination.address) {
        operations.push({ op: "set_rule_destination_address", value: config.destination.address });
      }
      if (config.destination.port) {
        operations.push({ op: "set_rule_destination_port", value: config.destination.port });
      }
      if (config.destination.geoip) {
        if (config.destination.geoip.country_code && config.destination.geoip.country_code.length > 0) {
          // Add each country code separately
          for (const code of config.destination.geoip.country_code) {
            operations.push({ op: "set_rule_destination_geoip_country", value: code.toLowerCase() });
          }
        }
        if (config.destination.geoip.inverse_match) {
          operations.push({ op: "set_rule_destination_geoip_inverse" });
        }
      }
      if (config.destination.group) {
        // Iterate through all group types (address, network, port, etc.)
        for (const [groupType, groupName] of Object.entries(config.destination.group)) {
          if (groupType.includes("address")) {
            operations.push({ op: "set_rule_destination_group_address", value: groupName });
          } else if (groupType.includes("network")) {
            operations.push({ op: "set_rule_destination_group_network", value: groupName });
          } else if (groupType.includes("port")) {
            operations.push({ op: "set_rule_destination_group_port", value: groupName });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "set_rule_destination_group_mac", value: groupName });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "set_rule_destination_group_domain", value: groupName });
          }
        }
      }
    }

    // Set state
    if (config.state) {
      if (config.state.established) {
        operations.push({ op: "set_rule_state_established" });
      }
      if (config.state.new) {
        operations.push({ op: "set_rule_state_new" });
      }
      if (config.state.related) {
        operations.push({ op: "set_rule_state_related" });
      }
      if (config.state.invalid) {
        operations.push({ op: "set_rule_state_invalid" });
      }
    }

    // Set interface
    if (config.interface) {
      if (config.interface.inbound) {
        operations.push({ op: "set_rule_inbound_interface", value: config.interface.inbound });
      }
      if (config.interface.outbound) {
        operations.push({ op: "set_rule_outbound_interface", value: config.interface.outbound });
      }
    }

    // Set packet modifications
    if (config.packet_mods) {
      if (config.packet_mods.dscp) {
        operations.push({ op: "set_rule_set_dscp", value: config.packet_mods.dscp });
      }
      if (config.packet_mods.mark) {
        operations.push({ op: "set_rule_set_mark", value: config.packet_mods.mark });
      }
      if (config.packet_mods.ttl) {
        operations.push({ op: "set_rule_set_ttl", value: config.packet_mods.ttl });
      }
    }

    // Set TCP flags
    if (config.tcp_flags) {
      for (const [flag, state] of Object.entries(config.tcp_flags)) {
        if (state === "enabled") {
          operations.push({ op: "set_rule_tcp_flags", value: flag });
        } else if (state === "not") {
          operations.push({ op: "set_rule_tcp_flags", value: `not ${flag}` });
        }
        // "disabled" means don't set it
      }
    }

    // Set ICMP type
    if (config.icmp_type_name) {
      operations.push({ op: "set_rule_icmp_type_name", value: config.icmp_type_name });
    }

    // Set jump target
    if (config.jump_target) {
      operations.push({ op: "set_rule_jump_target", value: config.jump_target });
    }

    // Set flags
    if (config.disable) {
      operations.push({ op: "set_rule_disable" });
    }

    if (config.log) {
      operations.push({ op: "set_rule_log" });
    }

    console.log("Final operations:", operations);

    const request = {
      chain,
      rule_number: ruleNumber,
      is_custom_chain: isCustomChain,
      operations,
    };

    console.log("Sending batch request:", request);

    return this.batchConfigure(request);
  }

  /**
   * Helper: Update an existing rule
   */
  async updateRule(
    chain: string,
    ruleNumber: number,
    isCustomChain: boolean,
    config: Partial<FirewallRule>,
    currentRule: FirewallRule
  ): Promise<any> {
    const operations: FirewallBatchOperation[] = [];

    // Helper to determine if a value has changed
    const hasChanged = (newVal: any, oldVal: any) => {
      if (newVal === undefined) return false;
      if (newVal === null && oldVal === null) return false;
      if (typeof newVal === "object" && typeof oldVal === "object") {
        return JSON.stringify(newVal) !== JSON.stringify(oldVal);
      }
      return newVal !== oldVal;
    };

    // Update action
    if (hasChanged(config.action, currentRule.action)) {
      if (config.action) {
        operations.push({ op: "set_rule_action", value: config.action });
      } else {
        operations.push({ op: "delete_rule_action" });
      }
    }

    // Update description
    if (hasChanged(config.description, currentRule.description)) {
      if (config.description) {
        operations.push({ op: "set_rule_description", value: config.description });
      } else {
        operations.push({ op: "delete_rule_description" });
      }
    }

    // Update protocol
    if (hasChanged(config.protocol, currentRule.protocol)) {
      if (config.protocol) {
        operations.push({ op: "set_rule_protocol", value: config.protocol });
      } else {
        operations.push({ op: "delete_rule_protocol" });
      }
    }

    // Update source (simplified - delete old, set new if changed)
    if (hasChanged(config.source, currentRule.source)) {
      // Delete old source settings
      if (currentRule.source?.address) {
        operations.push({ op: "delete_rule_source_address" });
      }
      if (currentRule.source?.port) {
        operations.push({ op: "delete_rule_source_port" });
      }
      if (currentRule.source?.mac_address) {
        operations.push({ op: "delete_rule_source_mac_address" });
      }
      if (currentRule.source?.geoip) {
        if (currentRule.source.geoip.country_code) {
          operations.push({ op: "delete_rule_source_geoip_country" });
        }
        if (currentRule.source.geoip.inverse_match) {
          operations.push({ op: "delete_rule_source_geoip_inverse" });
        }
      }
      if (currentRule.source?.group) {
        // Delete ALL existing groups (address, network, port, etc.)
        for (const [groupType] of Object.entries(currentRule.source.group)) {
          if (groupType.includes("address")) {
            operations.push({ op: "delete_rule_source_group_address" });
          } else if (groupType.includes("network")) {
            operations.push({ op: "delete_rule_source_group_network" });
          } else if (groupType.includes("port")) {
            operations.push({ op: "delete_rule_source_group_port" });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "delete_rule_source_group_mac" });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "delete_rule_source_group_domain" });
          }
        }
      }

      // Set new source settings
      if (config.source) {
        if (config.source.address) {
          operations.push({ op: "set_rule_source_address", value: config.source.address });
        }
        if (config.source.port) {
          operations.push({ op: "set_rule_source_port", value: config.source.port });
        }
        if (config.source.mac_address) {
          operations.push({ op: "set_rule_source_mac_address", value: config.source.mac_address });
        }
        if (config.source.geoip) {
          if (config.source.geoip.country_code && config.source.geoip.country_code.length > 0) {
            // Add each country code separately
            for (const code of config.source.geoip.country_code) {
              operations.push({ op: "set_rule_source_geoip_country", value: code.toLowerCase() });
            }
          }
          if (config.source.geoip.inverse_match) {
            operations.push({ op: "set_rule_source_geoip_inverse" });
          }
        }
        if (config.source.group) {
          // Set ALL new groups (address, network, port, etc.)
          for (const [groupType, groupName] of Object.entries(config.source.group)) {
            if (groupType.includes("address")) {
              operations.push({ op: "set_rule_source_group_address", value: groupName });
            } else if (groupType.includes("network")) {
              operations.push({ op: "set_rule_source_group_network", value: groupName });
            } else if (groupType.includes("port")) {
              operations.push({ op: "set_rule_source_group_port", value: groupName });
            } else if (groupType.includes("mac")) {
              operations.push({ op: "set_rule_source_group_mac", value: groupName });
            } else if (groupType.includes("domain")) {
              operations.push({ op: "set_rule_source_group_domain", value: groupName });
            }
          }
        }
      }
    }

    // Update destination (similar to source)
    if (hasChanged(config.destination, currentRule.destination)) {
      // Delete old destination settings
      if (currentRule.destination?.address) {
        operations.push({ op: "delete_rule_destination_address" });
      }
      if (currentRule.destination?.port) {
        operations.push({ op: "delete_rule_destination_port" });
      }
      if (currentRule.destination?.geoip) {
        if (currentRule.destination.geoip.country_code) {
          operations.push({ op: "delete_rule_destination_geoip_country" });
        }
        if (currentRule.destination.geoip.inverse_match) {
          operations.push({ op: "delete_rule_destination_geoip_inverse" });
        }
      }
      if (currentRule.destination?.group) {
        // Delete ALL existing groups (address, network, port, etc.)
        for (const [groupType] of Object.entries(currentRule.destination.group)) {
          if (groupType.includes("address")) {
            operations.push({ op: "delete_rule_destination_group_address" });
          } else if (groupType.includes("network")) {
            operations.push({ op: "delete_rule_destination_group_network" });
          } else if (groupType.includes("port")) {
            operations.push({ op: "delete_rule_destination_group_port" });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "delete_rule_destination_group_mac" });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "delete_rule_destination_group_domain" });
          }
        }
      }

      // Set new destination settings
      if (config.destination) {
        if (config.destination.address) {
          operations.push({ op: "set_rule_destination_address", value: config.destination.address });
        }
        if (config.destination.port) {
          operations.push({ op: "set_rule_destination_port", value: config.destination.port });
        }
        if (config.destination.group) {
          // Set ALL new groups (address, network, port, etc.)
          for (const [groupType, groupName] of Object.entries(config.destination.group)) {
            if (groupType.includes("address")) {
              operations.push({ op: "set_rule_destination_group_address", value: groupName });
            } else if (groupType.includes("network")) {
              operations.push({ op: "set_rule_destination_group_network", value: groupName });
            } else if (groupType.includes("port")) {
              operations.push({ op: "set_rule_destination_group_port", value: groupName });
            } else if (groupType.includes("mac")) {
              operations.push({ op: "set_rule_destination_group_mac", value: groupName });
            } else if (groupType.includes("domain")) {
              operations.push({ op: "set_rule_destination_group_domain", value: groupName });
            }
          }
        }
        if (config.destination.geoip) {
          if (config.destination.geoip.country_code && config.destination.geoip.country_code.length > 0) {
            // Add each country code separately
            for (const code of config.destination.geoip.country_code) {
              operations.push({ op: "set_rule_destination_geoip_country", value: code.toLowerCase() });
            }
          }
          if (config.destination.geoip.inverse_match) {
            operations.push({ op: "set_rule_destination_geoip_inverse" });
          }
        }
      }
    }

    // Update state
    if (hasChanged(config.state, currentRule.state)) {
      // Delete old states
      if (currentRule.state?.established) {
        operations.push({ op: "delete_rule_state_established" });
      }
      if (currentRule.state?.new) {
        operations.push({ op: "delete_rule_state_new" });
      }
      if (currentRule.state?.related) {
        operations.push({ op: "delete_rule_state_related" });
      }
      if (currentRule.state?.invalid) {
        operations.push({ op: "delete_rule_state_invalid" });
      }

      // Set new states
      if (config.state) {
        if (config.state.established) {
          operations.push({ op: "set_rule_state_established" });
        }
        if (config.state.new) {
          operations.push({ op: "set_rule_state_new" });
        }
        if (config.state.related) {
          operations.push({ op: "set_rule_state_related" });
        }
        if (config.state.invalid) {
          operations.push({ op: "set_rule_state_invalid" });
        }
      }
    }

    // Update interface
    if (hasChanged(config.interface, currentRule.interface)) {
      if (currentRule.interface?.inbound) {
        operations.push({ op: "delete_rule_inbound_interface" });
      }
      if (currentRule.interface?.outbound) {
        operations.push({ op: "delete_rule_outbound_interface" });
      }

      if (config.interface) {
        if (config.interface.inbound) {
          operations.push({ op: "set_rule_inbound_interface", value: config.interface.inbound });
        }
        if (config.interface.outbound) {
          operations.push({ op: "set_rule_outbound_interface", value: config.interface.outbound });
        }
      }
    }

    // Update packet modifications
    if (hasChanged(config.packet_mods, currentRule.packet_mods)) {
      if (currentRule.packet_mods?.dscp) {
        operations.push({ op: "delete_rule_set_dscp" });
      }
      if (currentRule.packet_mods?.mark) {
        operations.push({ op: "delete_rule_set_mark" });
      }
      if (currentRule.packet_mods?.ttl) {
        operations.push({ op: "delete_rule_set_ttl" });
      }

      if (config.packet_mods) {
        if (config.packet_mods.dscp) {
          operations.push({ op: "set_rule_set_dscp", value: config.packet_mods.dscp });
        }
        if (config.packet_mods.mark) {
          operations.push({ op: "set_rule_set_mark", value: config.packet_mods.mark });
        }
        if (config.packet_mods.ttl) {
          operations.push({ op: "set_rule_set_ttl", value: config.packet_mods.ttl });
        }
      }
    }

    // Update TCP flags
    if (hasChanged(config.tcp_flags, currentRule.tcp_flags)) {
      // Delete old TCP flags (currentRule.tcp_flags is an array from backend)
      if (currentRule.tcp_flags &&
          ((Array.isArray(currentRule.tcp_flags) && currentRule.tcp_flags.length > 0) ||
           (!Array.isArray(currentRule.tcp_flags) && Object.keys(currentRule.tcp_flags).length > 0))) {
        operations.push({ op: "delete_rule_tcp_flags" });
      }

      // Set new TCP flags (config.tcp_flags is an object from UI)
      if (config.tcp_flags && Object.keys(config.tcp_flags).length > 0) {
        for (const [flag, state] of Object.entries(config.tcp_flags)) {
          if (state === "enabled") {
            operations.push({ op: "set_rule_tcp_flags", value: flag });
          } else if (state === "not") {
            operations.push({ op: "set_rule_tcp_flags", value: `not ${flag}` });
          }
          // "disabled" means don't set it
        }
      }
    }

    // Update ICMP type
    if (hasChanged(config.icmp_type_name, currentRule.icmp_type_name)) {
      // Delete old ICMP type
      if (currentRule.icmp_type_name) {
        operations.push({ op: "delete_rule_icmp_type_name" });
      }

      // Set new ICMP type
      if (config.icmp_type_name) {
        operations.push({ op: "set_rule_icmp_type_name", value: config.icmp_type_name });
      }
    }

    // Update jump target
    if (hasChanged(config.jump_target, currentRule.jump_target)) {
      if (config.jump_target) {
        operations.push({ op: "set_rule_jump_target", value: config.jump_target });
      } else if (currentRule.jump_target) {
        operations.push({ op: "delete_rule_jump_target" });
      }
    }

    // Update disable flag
    if (hasChanged(config.disable, currentRule.disable)) {
      if (config.disable) {
        operations.push({ op: "set_rule_disable" });
      } else {
        operations.push({ op: "delete_rule_disable" });
      }
    }

    // Update log flag
    if (hasChanged(config.log, currentRule.log)) {
      if (config.log) {
        operations.push({ op: "set_rule_log" });
      } else {
        operations.push({ op: "delete_rule_log" });
      }
    }

    // Only send request if there are operations
    if (operations.length === 0) {
      return Promise.resolve({ success: true, message: "No changes detected" });
    }

    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      is_custom_chain: isCustomChain,
      operations,
    });
  }

  /**
   * Helper: Delete a rule
   */
  async deleteRule(chain: string, ruleNumber: number, isCustomChain: boolean): Promise<any> {
    const operations: FirewallBatchOperation[] = [
      isCustomChain
        ? { op: "delete_custom_chain_rule" }
        : { op: "delete_base_chain_rule" },
    ];

    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      is_custom_chain: isCustomChain,
      operations,
    });
  }

  /**
   * Helper: Create a custom chain
   */
  async createCustomChain(
    chainName: string,
    description?: string,
    defaultAction?: string
  ): Promise<any> {
    const operations: FirewallBatchOperation[] = [{ op: "set_custom_chain" }];

    if (description) {
      operations.push({ op: "set_custom_chain_description", value: description });
    }

    if (defaultAction) {
      operations.push({ op: "set_custom_chain_default_action", value: defaultAction });
    }

    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations,
    });
  }

  /**
   * Helper: Delete a custom chain
   */
  async deleteCustomChain(chainName: string): Promise<any> {
    const operations: FirewallBatchOperation[] = [{ op: "delete_custom_chain" }];

    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations,
    });
  }
}

export const firewallIPv4Service = new FirewallIPv4Service();
