/**
 * Bridge Firewall API Service
 * Handles all bridge (layer 2) firewall operations
 */

import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BridgeRule {
  rule_number: number;
  action?: string | null;
  description?: string | null;
  disabled: boolean;
  log: boolean;
  // MAC addresses (1.4+)
  source_mac?: string | null;
  destination_mac?: string | null;
  // IP addresses (1.5+)
  source_address?: string | null;
  destination_address?: string | null;
  // Ports (1.5+)
  source_port?: string | null;
  destination_port?: string | null;
  // Source groups (1.5+)
  source_group_address?: string | null;
  source_group_network?: string | null;
  source_group_port?: string | null;
  source_group_mac?: string | null;
  // Destination groups (1.5+)
  destination_group_address?: string | null;
  destination_group_network?: string | null;
  destination_group_port?: string | null;
  destination_group_mac?: string | null;
  // VLAN (1.4+)
  vlan_id?: string | null;
  vlan_priority?: string | null;
  vlan_ethernet_type?: string | null;
  // Interfaces (1.4+)
  inbound_interface?: string | null;
  inbound_interface_group?: string | null;
  outbound_interface?: string | null;
  outbound_interface_group?: string | null;
  // Protocol (1.5+)
  protocol?: string | null;
  // Ethernet type (1.5+)
  ethernet_type?: string | null;
  // Jump/Queue targets
  jump_target?: string | null;
  queue?: string | null;
  // ICMP (1.5+)
  icmp_type?: string | null;
  icmp_code?: string | null;
  icmp_type_name?: string | null;
  // ICMPv6 (1.5+)
  icmpv6_type?: string | null;
  icmpv6_code?: string | null;
  icmpv6_type_name?: string | null;
  // TCP (1.5+)
  tcp_flags?: string[] | null;
  tcp_flags_not?: string[] | null;
  tcp_mss?: string | null;
  // Rate limiting (1.5+)
  limit_rate?: string | null;
  limit_burst?: string | null;
  // Log options (1.5+)
  log_level?: string | null;
  log_group?: string | null;
  // Mark matching (1.5+)
  mark?: string | null;
  connection_mark?: string | null;
  // DSCP matching (1.5+)
  dscp?: string | null;
  dscp_exclude?: string | null;
  // Fragment matching (1.5+)
  fragment_match_frag?: boolean;
  fragment_match_non_frag?: boolean;
  // IPsec matching (1.5+)
  ipsec_match_ipsec_in?: boolean;
  ipsec_match_ipsec_out?: boolean;
  ipsec_match_none_in?: boolean;
  ipsec_match_none_out?: boolean;
  // TTL matching (1.5+)
  ttl_eq?: string | null;
  ttl_gt?: string | null;
  ttl_lt?: string | null;
  // Hop-limit matching (1.5+)
  hop_limit_eq?: string | null;
  hop_limit_gt?: string | null;
  hop_limit_lt?: string | null;
  // Packet type/length (1.5+)
  packet_type?: string | null;
  packet_length?: string | null;
  // Time-based rules (1.5+)
  time_startdate?: string | null;
  time_stopdate?: string | null;
  time_starttime?: string | null;
  time_stoptime?: string | null;
  time_weekdays?: string | null;
  // Connection status (1.5+)
  connection_status_new?: boolean;
  connection_status_established?: boolean;
  connection_status_related?: boolean;
  connection_status_invalid?: boolean;
  // Set options (1.5+)
  set_dscp?: string | null;
  set_mark?: string | null;
  set_connection_mark?: string | null;
  set_ttl?: string | null;
  set_hop_limit?: string | null;
  set_tcp_mss?: string | null;
  set_vlan_priority?: string | null;
}

export interface BridgeChain {
  name: string;
  default_action?: string | null;
  description?: string | null;
  rules: BridgeRule[];
  rule_count: number;
}

export interface BridgeConfigResponse {
  chains: BridgeChain[];
  custom_chains: BridgeChain[];
  total_rules: number;
}

export interface MatchingCriteria {
  supported: boolean;
  description: string;
}

export interface BridgeCapabilities {
  version: string;
  features: {
    bridge_firewall: { supported: boolean; description: string };
    forward_chain: { supported: boolean; description: string };
    input_chain: { supported: boolean; description: string };
    output_chain: { supported: boolean; description: string };
    prerouting_chain: { supported: boolean; description: string };
    custom_chains: { supported: boolean; description: string };
    ethernet_type_matching: { supported: boolean; description: string };
    packet_modifications: { supported: boolean; description: string };
    notrack_action: { supported: boolean; description: string };
  };
  supported_chains: string[];
  supported_actions: string[];
  matching_criteria: {
    source_mac: MatchingCriteria;
    destination_mac: MatchingCriteria;
    vlan_id: MatchingCriteria;
    vlan_priority: MatchingCriteria;
    inbound_interface: MatchingCriteria;
    outbound_interface: MatchingCriteria;
    ethernet_type: MatchingCriteria;
  };
  version_notes: {
    full_support: boolean;
    v14_limitations: string[];
  };
  instance_name?: string;
  instance_id?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface InterfaceOption {
  name: string;
  type: string;
  description?: string | null;
}

export interface InterfaceListResponse {
  interfaces: InterfaceOption[];
  total: number;
}

export interface BridgeBatchOperation {
  op: string;
  value?: string | null;
}

export interface BridgeBatchRequest {
  chain: string;
  rule_number?: number | null;
  operations: BridgeBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class BridgeFirewallService {
  /**
   * Get bridge firewall capabilities based on VyOS version
   */
  async getCapabilities(): Promise<BridgeCapabilities> {
    return apiClient.get<BridgeCapabilities>("/vyos/firewall/bridge/capabilities");
  }

  /**
   * Get all bridge firewall configurations
   */
  async getConfig(refresh: boolean = false): Promise<BridgeConfigResponse> {
    return apiClient.get<BridgeConfigResponse>("/vyos/firewall/bridge/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Get available interfaces for inbound/outbound dropdowns
   */
  async getInterfaces(): Promise<InterfaceListResponse> {
    return apiClient.get<InterfaceListResponse>("/vyos/firewall/bridge/interfaces");
  }

  /**
   * Configure bridge firewall using batch operations
   */
  async batchConfigure(request: BridgeBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/firewall/bridge/batch", request);
  }

  /**
   * Refresh the cached configuration
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }

  // ==========================================================================
  // Chain Operations
  // ==========================================================================

  /**
   * Set default action for a chain
   */
  async setChainDefaultAction(chain: string, action: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      operations: [{ op: "set_chain_default_action", value: action }],
    });
  }

  /**
   * Delete default action for a chain
   */
  async deleteChainDefaultAction(chain: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      operations: [{ op: "delete_chain_default_action" }],
    });
  }

  /**
   * Set chain description
   */
  async setChainDescription(chain: string, description: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      operations: [{ op: "set_chain_description", value: description }],
    });
  }

  // ==========================================================================
  // Rule Operations
  // ==========================================================================

  /**
   * Create a new rule with initial configuration
   */
  async createRule(
    chain: string,
    ruleNumber: number,
    config: {
      action: string;
      description?: string;
      log?: boolean;
      disabled?: boolean;
      // MAC addresses
      source_mac?: string;
      destination_mac?: string;
      // IP addresses (1.5+)
      source_address?: string;
      destination_address?: string;
      // Ports (1.5+)
      source_port?: string;
      destination_port?: string;
      // Source groups (1.5+)
      source_group_address?: string;
      source_group_network?: string;
      source_group_port?: string;
      source_group_mac?: string;
      // Destination groups (1.5+)
      destination_group_address?: string;
      destination_group_network?: string;
      destination_group_port?: string;
      destination_group_mac?: string;
      // VLAN
      vlan_id?: string;
      vlan_priority?: string;
      vlan_ethernet_type?: string;
      // Interfaces
      inbound_interface?: string;
      inbound_interface_group?: string;
      outbound_interface?: string;
      outbound_interface_group?: string;
      // Protocol (1.5+)
      protocol?: string;
      // Ethernet type (1.5+)
      ethernet_type?: string;
      // Jump/Queue targets
      jump_target?: string;
      queue?: string;
      // ICMP (1.5+)
      icmp_type?: string;
      icmp_code?: string;
      icmp_type_name?: string;
      // ICMPv6 (1.5+)
      icmpv6_type?: string;
      icmpv6_code?: string;
      icmpv6_type_name?: string;
      // TCP (1.5+)
      tcp_flags?: string[];
      tcp_flags_not?: string[];
      tcp_mss?: string;
      // Rate limiting (1.5+)
      limit_rate?: string;
      limit_burst?: string;
      // Log options (1.5+)
      log_level?: string;
      log_group?: string;
      // Mark matching (1.5+)
      mark?: string;
      connection_mark?: string;
      // DSCP matching (1.5+)
      dscp?: string;
      dscp_exclude?: string;
      // Fragment matching (1.5+)
      fragment_match_frag?: boolean;
      fragment_match_non_frag?: boolean;
      // IPsec matching (1.5+)
      ipsec_match_ipsec_in?: boolean;
      ipsec_match_ipsec_out?: boolean;
      ipsec_match_none_in?: boolean;
      ipsec_match_none_out?: boolean;
      // TTL matching (1.5+)
      ttl_eq?: string;
      ttl_gt?: string;
      ttl_lt?: string;
      // Hop-limit matching (1.5+)
      hop_limit_eq?: string;
      hop_limit_gt?: string;
      hop_limit_lt?: string;
      // Packet type/length (1.5+)
      packet_type?: string;
      packet_length?: string;
      // Time-based rules (1.5+)
      time_startdate?: string;
      time_stopdate?: string;
      time_starttime?: string;
      time_stoptime?: string;
      time_weekdays?: string;
      // Connection status (1.5+)
      connection_status_new?: boolean;
      connection_status_established?: boolean;
      connection_status_related?: boolean;
      connection_status_invalid?: boolean;
      // Set options (1.5+)
      set_dscp?: string;
      set_mark?: string;
      set_connection_mark?: string;
      set_ttl?: string;
      set_hop_limit?: string;
      set_tcp_mss?: string;
      set_vlan_priority?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BridgeBatchOperation[] = [{ op: "set_rule" }];

    // Required: action
    operations.push({ op: "set_rule_action", value: config.action });

    // Basic options
    if (config.description) {
      operations.push({ op: "set_rule_description", value: config.description });
    }
    if (config.log) {
      operations.push({ op: "set_rule_log" });
    }
    if (config.disabled) {
      operations.push({ op: "set_rule_disable" });
    }

    // MAC addresses
    if (config.source_mac) {
      operations.push({ op: "set_rule_source_mac", value: config.source_mac });
    }
    if (config.destination_mac) {
      operations.push({ op: "set_rule_destination_mac", value: config.destination_mac });
    }

    // IP addresses (1.5+)
    if (config.source_address) {
      operations.push({ op: "set_rule_source_address", value: config.source_address });
    }
    if (config.destination_address) {
      operations.push({ op: "set_rule_destination_address", value: config.destination_address });
    }

    // Ports (1.5+)
    if (config.source_port) {
      operations.push({ op: "set_rule_source_port", value: config.source_port });
    }
    if (config.destination_port) {
      operations.push({ op: "set_rule_destination_port", value: config.destination_port });
    }

    // Source groups (1.5+)
    if (config.source_group_address) {
      operations.push({ op: "set_rule_source_group_address", value: config.source_group_address });
    }
    if (config.source_group_network) {
      operations.push({ op: "set_rule_source_group_network", value: config.source_group_network });
    }
    if (config.source_group_port) {
      operations.push({ op: "set_rule_source_group_port", value: config.source_group_port });
    }
    if (config.source_group_mac) {
      operations.push({ op: "set_rule_source_group_mac", value: config.source_group_mac });
    }

    // Destination groups (1.5+)
    if (config.destination_group_address) {
      operations.push({ op: "set_rule_destination_group_address", value: config.destination_group_address });
    }
    if (config.destination_group_network) {
      operations.push({ op: "set_rule_destination_group_network", value: config.destination_group_network });
    }
    if (config.destination_group_port) {
      operations.push({ op: "set_rule_destination_group_port", value: config.destination_group_port });
    }
    if (config.destination_group_mac) {
      operations.push({ op: "set_rule_destination_group_mac", value: config.destination_group_mac });
    }

    // VLAN
    if (config.vlan_id) {
      operations.push({ op: "set_rule_vlan_id", value: config.vlan_id });
    }
    if (config.vlan_priority) {
      operations.push({ op: "set_rule_vlan_priority", value: config.vlan_priority });
    }
    if (config.vlan_ethernet_type) {
      operations.push({ op: "set_rule_vlan_ethernet_type", value: config.vlan_ethernet_type });
    }

    // Interfaces
    if (config.inbound_interface) {
      operations.push({ op: "set_rule_inbound_interface", value: config.inbound_interface });
    }
    if (config.inbound_interface_group) {
      operations.push({ op: "set_rule_inbound_interface_group", value: config.inbound_interface_group });
    }
    if (config.outbound_interface) {
      operations.push({ op: "set_rule_outbound_interface", value: config.outbound_interface });
    }
    if (config.outbound_interface_group) {
      operations.push({ op: "set_rule_outbound_interface_group", value: config.outbound_interface_group });
    }

    // Protocol (1.5+)
    if (config.protocol) {
      operations.push({ op: "set_rule_protocol", value: config.protocol });
    }

    // Ethernet type (1.5+)
    if (config.ethernet_type) {
      operations.push({ op: "set_rule_ethernet_type", value: config.ethernet_type });
    }

    // Jump/Queue targets
    if (config.jump_target) {
      operations.push({ op: "set_rule_jump_target", value: config.jump_target });
    }
    if (config.queue) {
      operations.push({ op: "set_rule_queue", value: config.queue });
    }

    // ICMP (1.5+)
    if (config.icmp_type) {
      operations.push({ op: "set_rule_icmp_type", value: config.icmp_type });
    }
    if (config.icmp_code) {
      operations.push({ op: "set_rule_icmp_code", value: config.icmp_code });
    }
    if (config.icmp_type_name) {
      operations.push({ op: "set_rule_icmp_type_name", value: config.icmp_type_name });
    }

    // ICMPv6 (1.5+)
    if (config.icmpv6_type) {
      operations.push({ op: "set_rule_icmpv6_type", value: config.icmpv6_type });
    }
    if (config.icmpv6_code) {
      operations.push({ op: "set_rule_icmpv6_code", value: config.icmpv6_code });
    }
    if (config.icmpv6_type_name) {
      operations.push({ op: "set_rule_icmpv6_type_name", value: config.icmpv6_type_name });
    }

    // TCP flags (1.5+)
    if (config.tcp_flags && config.tcp_flags.length > 0) {
      for (const flag of config.tcp_flags) {
        operations.push({ op: "set_rule_tcp_flags", value: flag });
      }
    }
    if (config.tcp_flags_not && config.tcp_flags_not.length > 0) {
      for (const flag of config.tcp_flags_not) {
        operations.push({ op: "set_rule_tcp_flags_not", value: flag });
      }
    }
    if (config.tcp_mss) {
      operations.push({ op: "set_rule_tcp_mss", value: config.tcp_mss });
    }

    // Rate limiting (1.5+)
    if (config.limit_rate) {
      operations.push({ op: "set_rule_limit_rate", value: config.limit_rate });
    }
    if (config.limit_burst) {
      operations.push({ op: "set_rule_limit_burst", value: config.limit_burst });
    }

    // Log options (1.5+)
    if (config.log_level) {
      operations.push({ op: "set_rule_log_options_level", value: config.log_level });
    }
    if (config.log_group) {
      operations.push({ op: "set_rule_log_options_group", value: config.log_group });
    }

    // Mark matching (1.5+)
    if (config.mark) {
      operations.push({ op: "set_rule_mark", value: config.mark });
    }
    if (config.connection_mark) {
      operations.push({ op: "set_rule_connection_mark", value: config.connection_mark });
    }

    // DSCP matching (1.5+)
    if (config.dscp) {
      operations.push({ op: "set_rule_dscp", value: config.dscp });
    }
    if (config.dscp_exclude) {
      operations.push({ op: "set_rule_dscp_exclude", value: config.dscp_exclude });
    }

    // Fragment matching (1.5+)
    if (config.fragment_match_frag) {
      operations.push({ op: "set_rule_fragment_match_frag" });
    }
    if (config.fragment_match_non_frag) {
      operations.push({ op: "set_rule_fragment_match_non_frag" });
    }

    // IPsec matching (1.5+)
    if (config.ipsec_match_ipsec_in) {
      operations.push({ op: "set_rule_ipsec_match_ipsec_in" });
    }
    if (config.ipsec_match_ipsec_out) {
      operations.push({ op: "set_rule_ipsec_match_ipsec_out" });
    }
    if (config.ipsec_match_none_in) {
      operations.push({ op: "set_rule_ipsec_match_none_in" });
    }
    if (config.ipsec_match_none_out) {
      operations.push({ op: "set_rule_ipsec_match_none_out" });
    }

    // TTL matching (1.5+)
    if (config.ttl_eq) {
      operations.push({ op: "set_rule_ttl_eq", value: config.ttl_eq });
    }
    if (config.ttl_gt) {
      operations.push({ op: "set_rule_ttl_gt", value: config.ttl_gt });
    }
    if (config.ttl_lt) {
      operations.push({ op: "set_rule_ttl_lt", value: config.ttl_lt });
    }

    // Hop-limit matching (1.5+)
    if (config.hop_limit_eq) {
      operations.push({ op: "set_rule_hop_limit_eq", value: config.hop_limit_eq });
    }
    if (config.hop_limit_gt) {
      operations.push({ op: "set_rule_hop_limit_gt", value: config.hop_limit_gt });
    }
    if (config.hop_limit_lt) {
      operations.push({ op: "set_rule_hop_limit_lt", value: config.hop_limit_lt });
    }

    // Packet type/length (1.5+)
    if (config.packet_type) {
      operations.push({ op: "set_rule_packet_type", value: config.packet_type });
    }
    if (config.packet_length) {
      operations.push({ op: "set_rule_packet_length", value: config.packet_length });
    }

    // Time-based rules (1.5+)
    if (config.time_startdate) {
      operations.push({ op: "set_rule_time_startdate", value: config.time_startdate });
    }
    if (config.time_stopdate) {
      operations.push({ op: "set_rule_time_stopdate", value: config.time_stopdate });
    }
    if (config.time_starttime) {
      operations.push({ op: "set_rule_time_starttime", value: config.time_starttime });
    }
    if (config.time_stoptime) {
      operations.push({ op: "set_rule_time_stoptime", value: config.time_stoptime });
    }
    if (config.time_weekdays) {
      operations.push({ op: "set_rule_time_weekdays", value: config.time_weekdays });
    }

    // Connection status (1.5+) - commented out as builder methods would need to be added
    // These are typically set operations, not value operations

    // Set options (1.5+)
    if (config.set_dscp) {
      operations.push({ op: "set_rule_set_dscp", value: config.set_dscp });
    }
    if (config.set_mark) {
      operations.push({ op: "set_rule_set_mark", value: config.set_mark });
    }
    if (config.set_connection_mark) {
      operations.push({ op: "set_rule_set_connection_mark", value: config.set_connection_mark });
    }
    if (config.set_ttl) {
      operations.push({ op: "set_rule_set_ttl", value: config.set_ttl });
    }
    if (config.set_hop_limit) {
      operations.push({ op: "set_rule_set_hop_limit", value: config.set_hop_limit });
    }
    if (config.set_tcp_mss) {
      operations.push({ op: "set_rule_set_tcp_mss", value: config.set_tcp_mss });
    }
    if (config.set_vlan_priority) {
      operations.push({ op: "set_rule_set_vlan_priority", value: config.set_vlan_priority });
    }

    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Update an existing rule
   */
  async updateRule(
    chain: string,
    ruleNumber: number,
    currentRule: BridgeRule,
    newConfig: Partial<Omit<BridgeRule, "rule_number">>
  ): Promise<VyOSResponse> {
    const operations: BridgeBatchOperation[] = [];

    // Helper function to handle string field updates
    const handleStringField = (
      field: keyof Omit<BridgeRule, "rule_number">,
      setOp: string,
      deleteOp: string
    ) => {
      const newValue = newConfig[field] as string | null | undefined;
      const currentValue = currentRule[field] as string | null | undefined;
      if (newValue !== undefined) {
        if (newValue) {
          operations.push({ op: setOp, value: newValue });
        } else if (currentValue) {
          operations.push({ op: deleteOp });
        }
      }
    };

    // Helper function to handle boolean field updates
    const handleBooleanField = (
      field: keyof Omit<BridgeRule, "rule_number">,
      setOp: string,
      deleteOp: string
    ) => {
      const newValue = newConfig[field] as boolean | undefined;
      const currentValue = currentRule[field] as boolean | undefined;
      if (newValue !== undefined) {
        if (newValue && !currentValue) {
          operations.push({ op: setOp });
        } else if (!newValue && currentValue) {
          operations.push({ op: deleteOp });
        }
      }
    };

    // Handle action
    if (newConfig.action !== undefined && newConfig.action !== currentRule.action) {
      operations.push({ op: "set_rule_action", value: newConfig.action });
    }

    // Basic options
    handleStringField("description", "set_rule_description", "delete_rule_description");
    handleBooleanField("log", "set_rule_log", "delete_rule_log");
    handleBooleanField("disabled", "set_rule_disable", "delete_rule_disable");

    // MAC addresses
    handleStringField("source_mac", "set_rule_source_mac", "delete_rule_source_mac");
    handleStringField("destination_mac", "set_rule_destination_mac", "delete_rule_destination_mac");

    // IP addresses (1.5+)
    handleStringField("source_address", "set_rule_source_address", "delete_rule_source_address");
    handleStringField("destination_address", "set_rule_destination_address", "delete_rule_destination_address");

    // Ports (1.5+)
    handleStringField("source_port", "set_rule_source_port", "delete_rule_source_port");
    handleStringField("destination_port", "set_rule_destination_port", "delete_rule_destination_port");

    // Source groups (1.5+)
    handleStringField("source_group_address", "set_rule_source_group_address", "delete_rule_source_group_address");
    handleStringField("source_group_network", "set_rule_source_group_network", "delete_rule_source_group_network");
    handleStringField("source_group_port", "set_rule_source_group_port", "delete_rule_source_group_port");
    handleStringField("source_group_mac", "set_rule_source_group_mac", "delete_rule_source_group_mac");

    // Destination groups (1.5+)
    handleStringField("destination_group_address", "set_rule_destination_group_address", "delete_rule_destination_group_address");
    handleStringField("destination_group_network", "set_rule_destination_group_network", "delete_rule_destination_group_network");
    handleStringField("destination_group_port", "set_rule_destination_group_port", "delete_rule_destination_group_port");
    handleStringField("destination_group_mac", "set_rule_destination_group_mac", "delete_rule_destination_group_mac");

    // VLAN
    handleStringField("vlan_id", "set_rule_vlan_id", "delete_rule_vlan_id");
    handleStringField("vlan_priority", "set_rule_vlan_priority", "delete_rule_vlan_priority");
    handleStringField("vlan_ethernet_type", "set_rule_vlan_ethernet_type", "delete_rule_vlan_ethernet_type");

    // Interfaces
    handleStringField("inbound_interface", "set_rule_inbound_interface", "delete_rule_inbound_interface");
    handleStringField("inbound_interface_group", "set_rule_inbound_interface_group", "delete_rule_inbound_interface_group");
    handleStringField("outbound_interface", "set_rule_outbound_interface", "delete_rule_outbound_interface");
    handleStringField("outbound_interface_group", "set_rule_outbound_interface_group", "delete_rule_outbound_interface_group");

    // Protocol (1.5+)
    handleStringField("protocol", "set_rule_protocol", "delete_rule_protocol");

    // Ethernet type (1.5+)
    handleStringField("ethernet_type", "set_rule_ethernet_type", "delete_rule_ethernet_type");

    // Jump/Queue targets
    handleStringField("jump_target", "set_rule_jump_target", "delete_rule_jump_target");
    handleStringField("queue", "set_rule_queue", "delete_rule_queue");

    // ICMP (1.5+)
    handleStringField("icmp_type", "set_rule_icmp_type", "delete_rule_icmp_type");
    handleStringField("icmp_code", "set_rule_icmp_code", "delete_rule_icmp_code");
    handleStringField("icmp_type_name", "set_rule_icmp_type_name", "delete_rule_icmp_type_name");

    // ICMPv6 (1.5+)
    handleStringField("icmpv6_type", "set_rule_icmpv6_type", "delete_rule_icmpv6_type");
    handleStringField("icmpv6_code", "set_rule_icmpv6_code", "delete_rule_icmpv6_code");
    handleStringField("icmpv6_type_name", "set_rule_icmpv6_type_name", "delete_rule_icmpv6_type_name");

    // TCP MSS (1.5+)
    handleStringField("tcp_mss", "set_rule_tcp_mss", "delete_rule_tcp_mss");

    // Rate limiting (1.5+)
    handleStringField("limit_rate", "set_rule_limit_rate", "delete_rule_limit_rate");
    handleStringField("limit_burst", "set_rule_limit_burst", "delete_rule_limit_burst");

    // Log options (1.5+)
    handleStringField("log_level", "set_rule_log_options_level", "delete_rule_log_options_level");
    handleStringField("log_group", "set_rule_log_options_group", "delete_rule_log_options_group");

    // Mark matching (1.5+)
    handleStringField("mark", "set_rule_mark", "delete_rule_mark");
    handleStringField("connection_mark", "set_rule_connection_mark", "delete_rule_connection_mark");

    // DSCP matching (1.5+)
    handleStringField("dscp", "set_rule_dscp", "delete_rule_dscp");
    handleStringField("dscp_exclude", "set_rule_dscp_exclude", "delete_rule_dscp_exclude");

    // Fragment matching (1.5+)
    handleBooleanField("fragment_match_frag", "set_rule_fragment_match_frag", "delete_rule_fragment_match_frag");
    handleBooleanField("fragment_match_non_frag", "set_rule_fragment_match_non_frag", "delete_rule_fragment_match_non_frag");

    // IPsec matching (1.5+)
    handleBooleanField("ipsec_match_ipsec_in", "set_rule_ipsec_match_ipsec_in", "delete_rule_ipsec_match_ipsec_in");
    handleBooleanField("ipsec_match_ipsec_out", "set_rule_ipsec_match_ipsec_out", "delete_rule_ipsec_match_ipsec_out");
    handleBooleanField("ipsec_match_none_in", "set_rule_ipsec_match_none_in", "delete_rule_ipsec_match_none_in");
    handleBooleanField("ipsec_match_none_out", "set_rule_ipsec_match_none_out", "delete_rule_ipsec_match_none_out");

    // TTL matching (1.5+)
    handleStringField("ttl_eq", "set_rule_ttl_eq", "delete_rule_ttl_eq");
    handleStringField("ttl_gt", "set_rule_ttl_gt", "delete_rule_ttl_gt");
    handleStringField("ttl_lt", "set_rule_ttl_lt", "delete_rule_ttl_lt");

    // Hop-limit matching (1.5+)
    handleStringField("hop_limit_eq", "set_rule_hop_limit_eq", "delete_rule_hop_limit_eq");
    handleStringField("hop_limit_gt", "set_rule_hop_limit_gt", "delete_rule_hop_limit_gt");
    handleStringField("hop_limit_lt", "set_rule_hop_limit_lt", "delete_rule_hop_limit_lt");

    // Packet type/length (1.5+)
    handleStringField("packet_type", "set_rule_packet_type", "delete_rule_packet_type");
    handleStringField("packet_length", "set_rule_packet_length", "delete_rule_packet_length");

    // Time-based rules (1.5+)
    handleStringField("time_startdate", "set_rule_time_startdate", "delete_rule_time_startdate");
    handleStringField("time_stopdate", "set_rule_time_stopdate", "delete_rule_time_stopdate");
    handleStringField("time_starttime", "set_rule_time_starttime", "delete_rule_time_starttime");
    handleStringField("time_stoptime", "set_rule_time_stoptime", "delete_rule_time_stoptime");
    handleStringField("time_weekdays", "set_rule_time_weekdays", "delete_rule_time_weekdays");

    // Connection status (1.5+)
    handleBooleanField("connection_status_new", "set_rule_connection_status_new", "delete_rule_connection_status_new");
    handleBooleanField("connection_status_established", "set_rule_connection_status_established", "delete_rule_connection_status_established");
    handleBooleanField("connection_status_related", "set_rule_connection_status_related", "delete_rule_connection_status_related");
    handleBooleanField("connection_status_invalid", "set_rule_connection_status_invalid", "delete_rule_connection_status_invalid");

    // Set options (1.5+)
    handleStringField("set_dscp", "set_rule_set_dscp", "delete_rule_set_dscp");
    handleStringField("set_mark", "set_rule_set_mark", "delete_rule_set_mark");
    handleStringField("set_connection_mark", "set_rule_set_connection_mark", "delete_rule_set_connection_mark");
    handleStringField("set_ttl", "set_rule_set_ttl", "delete_rule_set_ttl");
    handleStringField("set_hop_limit", "set_rule_set_hop_limit", "delete_rule_set_hop_limit");
    handleStringField("set_tcp_mss", "set_rule_set_tcp_mss", "delete_rule_set_tcp_mss");
    handleStringField("set_vlan_priority", "set_rule_set_vlan_priority", "delete_rule_set_vlan_priority");

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Delete a rule
   */
  async deleteRule(chain: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      operations: [{ op: "delete_rule" }],
    });
  }

  /**
   * Enable a rule (remove disable flag)
   */
  async enableRule(chain: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      operations: [{ op: "delete_rule_disable" }],
    });
  }

  /**
   * Disable a rule
   */
  async disableRule(chain: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      rule_number: ruleNumber,
      operations: [{ op: "set_rule_disable" }],
    });
  }

  /**
   * Reorder rules in a chain
   * Deletes all rules and recreates them with new numbers
   */
  async reorderRules(
    chain: string,
    rules: Array<{
      old_number: number;
      new_number: number;
      rule_data: BridgeRule;
    }>
  ): Promise<VyOSResponse> {
    const response = await apiClient.post<VyOSResponse>("/vyos/firewall/bridge/reorder", {
      chain,
      rules,
    });
    await this.refreshConfig();
    return response;
  }

  // ==========================================================================
  // Custom Chain Operations (VyOS 1.5+ only)
  // ==========================================================================

  /**
   * Create a custom chain
   */
  async createCustomChain(
    chainName: string,
    config: {
      description?: string;
      default_action?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BridgeBatchOperation[] = [{ op: "set_custom_chain" }];

    if (config.description) {
      operations.push({ op: "set_custom_chain_description", value: config.description });
    }
    if (config.default_action) {
      operations.push({ op: "set_custom_chain_default_action", value: config.default_action });
    }

    return this.batchConfigure({
      chain: chainName,
      operations,
    });
  }

  /**
   * Delete a custom chain
   */
  async deleteCustomChain(chainName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      operations: [{ op: "delete_custom_chain" }],
    });
  }
}

export const bridgeFirewallService = new BridgeFirewallService();
