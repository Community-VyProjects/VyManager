import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces - Match Conditions
// ============================================================================

export interface MatchConditions {
  // Address
  source_address?: string | null;
  destination_address?: string | null;
  source_mac_address?: string | null;
  destination_mac_address?: string | null;
  
  // Groups
  source_group_address?: string | null;
  source_group_domain?: string | null;
  source_group_mac?: string | null;
  source_group_network?: string | null;
  source_group_port?: string | null;
  destination_group_address?: string | null;
  destination_group_domain?: string | null;
  destination_group_mac?: string | null;
  destination_group_network?: string | null;
  destination_group_port?: string | null;
  
  // Port
  source_port?: string | null;
  destination_port?: string | null;
  
  // Protocol
  protocol?: string | null;
  tcp_flags?: string | null;
  
  // ICMP (IPv4)
  icmp_code?: string | null;
  icmp_type?: string | null;
  icmp_type_name?: string | null;
  
  // ICMPv6 (IPv6)
  icmpv6_code?: string | null;
  icmpv6_type?: string | null;
  icmpv6_type_name?: string | null;
  
  // Packet characteristics
  fragment?: string | null;
  packet_type?: string | null;
  packet_length?: string | null;
  packet_length_exclude?: string | null;
  dscp?: string | null;
  dscp_exclude?: string | null;
  
  // State & marks
  state?: string | null;
  ipsec?: string | null;
  mark?: string | null;
  connection_mark?: string | null;
  
  // TTL/Hop limit
  ttl_eq?: string | null;
  ttl_gt?: string | null;
  ttl_lt?: string | null;
  hop_limit_eq?: string | null;
  hop_limit_gt?: string | null;
  hop_limit_lt?: string | null;
  
  // Time-based
  time_monthdays?: string | null;
  time_startdate?: string | null;
  time_starttime?: string | null;
  time_stopdate?: string | null;
  time_stoptime?: string | null;
  time_utc?: boolean;
  time_weekdays?: string | null;
  
  // Rate limiting
  limit_burst?: string | null;
  limit_rate?: string | null;
  recent_count?: string | null;
  recent_time?: string | null;
}

export interface SetActions {
  action_drop?: boolean;
  connection_mark?: string | null;
  dscp?: string | null;
  mark?: string | null;
  table?: string | null;
  tcp_mss?: string | null;
  vrf?: string | null;
}

// ============================================================================
// TypeScript Interfaces - Rule & Policy
// ============================================================================

export interface PolicyRouteRule {
  rule_number: number;
  description?: string | null;
  disable?: boolean;
  log?: string | null;
  match: MatchConditions;
  set: SetActions;
}

export interface PolicyRoute {
  name: string;
  policy_type: string; // "route" or "route6"
  description?: string | null;
  default_log?: boolean;
  rules: PolicyRouteRule[];
  interfaces?: Array<{name: string, type: string}>;
}

export interface RouteConfigResponse {
  ipv4_policies: PolicyRoute[];
  ipv6_policies: PolicyRoute[];
  total_ipv4: number;
  total_ipv6: number;
}

export interface RouteCapabilitiesResponse {
  version: string;
  features: {
    ipv4_policy_route: {
      supported: boolean;
      description: string;
    };
    ipv6_policy_route: {
      supported: boolean;
      description: string;
    };
    vrf_routing: {
      supported: boolean;
      description: string;
    };
    time_based_matching: {
      supported: boolean;
      description: string;
    };
    rate_limiting: {
      supported: boolean;
      description: string;
    };
    firewall_groups: {
      supported: boolean;
      description: string;
    };
  };
  version_notes: {
    vrf_available: boolean;
  };
}

export interface RouteBatchOperation {
  op: string;
  value?: string;
}

export interface RouteBatchRequest {
  policy_type: string;
  name: string;
  rule_number?: number;
  operations: RouteBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class RouteService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<RouteCapabilitiesResponse> {
    return apiClient.get<RouteCapabilitiesResponse>("/vyos/route/capabilities");
  }

  /**
   * Get all route policies
   */
  async getConfig(refresh: boolean = false): Promise<RouteConfigResponse> {
    return apiClient.get<RouteConfigResponse>("/vyos/route/config", {
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
  async batchConfigure(request: RouteBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/route/batch", request);
    await this.refreshConfig();
    return result;
  }

  // ========================================================================
  // Policy Management
  // ========================================================================

  /**
   * Create a new policy
   */
  async createPolicy(
    policyType: string,
    name: string,
    description?: string,
    defaultLog?: boolean
  ): Promise<any> {
    const operations: RouteBatchOperation[] = [];
    
    operations.push({ op: "create_policy" });
    
    if (description) {
      operations.push({ op: "set_policy_description", value: description });
    }
    
    if (defaultLog) {
      operations.push({ op: "set_policy_default_log" });
    }
    
    return this.batchConfigure({
      policy_type: policyType,
      name,
      operations,
    });
  }

  /**
   * Update a policy
   */
  async updatePolicy(
    policyType: string,
    name: string,
    description?: string,
    defaultLog?: boolean
  ): Promise<any> {
    const operations: RouteBatchOperation[] = [];
    
    if (description !== undefined) {
      operations.push({ op: "set_policy_description", value: description });
    }
    
    if (defaultLog !== undefined) {
      if (defaultLog) {
        operations.push({ op: "set_policy_default_log" });
      } else {
        operations.push({ op: "delete_policy_default_log" });
      }
    }
    
    return this.batchConfigure({
      policy_type: policyType,
      name,
      operations,
    });
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyType: string, name: string): Promise<any> {
    const operations: RouteBatchOperation[] = [
      { op: "delete_policy" }
    ];
    
    return this.batchConfigure({
      policy_type: policyType,
      name,
      operations,
    });
  }

  // ========================================================================
  // Rule Management
  // ========================================================================

  /**
   * Create a new rule
   */
  async createRule(
    policyType: string,
    policyName: string,
    ruleNumber: number,
    config: {
      description?: string;
      disable?: boolean;
      log?: string;
      match?: Partial<MatchConditions>;
      set?: Partial<SetActions>;
    }
  ): Promise<any> {
    const operations: RouteBatchOperation[] = [];

    // Create rule
    operations.push({ op: "create_rule" });

    // Basic config
    if (config.description) {
      operations.push({ op: "set_rule_description", value: config.description });
    }
    if (config.disable) {
      operations.push({ op: "set_rule_disable" });
    }
    if (config.log) {
      operations.push({ op: "set_rule_log", value: config.log });
    }

    // Add match conditions
    if (config.match && Object.keys(config.match).length > 0) {
      this.addMatchOperations(operations, config.match);
    }

    // Add set actions
    if (config.set && Object.keys(config.set).length > 0) {
      this.addSetOperations(operations, config.set);
    }

    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Update an existing rule
   */
  async updateRule(
    policyType: string,
    policyName: string,
    ruleNumber: number,
    config: {
      description?: string;
      disable?: boolean;
      log?: string;
      match?: Partial<MatchConditions>;
      set?: Partial<SetActions>;
    }
  ): Promise<any> {
    const operations: RouteBatchOperation[] = [];

    // Delete existing match and set (clean slate approach)
    operations.push({ op: "delete_match" });
    operations.push({ op: "delete_set" });

    // Basic config - Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({ op: "set_rule_description", value: config.description });
      } else {
        operations.push({ op: "delete_rule_description" });
      }
    }

    // Basic config - Disable
    if (config.disable !== undefined) {
      if (config.disable) {
        operations.push({ op: "set_rule_disable" });
      } else {
        operations.push({ op: "delete_rule_disable" });
      }
    }

    // Basic config - Log
    if (config.log) {
      operations.push({ op: "set_rule_log", value: config.log });
    }

    // Add match conditions
    if (config.match && Object.keys(config.match).length > 0) {
      this.addMatchOperations(operations, config.match);
    }

    // Add set actions
    if (config.set && Object.keys(config.set).length > 0) {
      this.addSetOperations(operations, config.set);
    }

    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Delete a rule
   */
  async deleteRule(
    policyType: string,
    policyName: string,
    ruleNumber: number
  ): Promise<any> {
    const operations: RouteBatchOperation[] = [
      { op: "delete_rule" }
    ];
    
    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      rule_number: ruleNumber,
      operations,
    });
  }

  // ========================================================================
  // Helper: Add Match Operations
  // ========================================================================

  private addMatchOperations(operations: RouteBatchOperation[], match: Partial<MatchConditions>) {
    // Address
    if (match.source_address) operations.push({ op: "set_match_source_address", value: match.source_address });
    if (match.destination_address) operations.push({ op: "set_match_destination_address", value: match.destination_address });
    if (match.source_mac_address) operations.push({ op: "set_match_source_mac_address", value: match.source_mac_address });
    if (match.destination_mac_address) operations.push({ op: "set_match_destination_mac_address", value: match.destination_mac_address });
    
    // Groups
    if (match.source_group_address) operations.push({ op: "set_match_source_group_address", value: match.source_group_address });
    if (match.source_group_domain) operations.push({ op: "set_match_source_group_domain", value: match.source_group_domain });
    if (match.source_group_mac) operations.push({ op: "set_match_source_group_mac", value: match.source_group_mac });
    if (match.source_group_network) operations.push({ op: "set_match_source_group_network", value: match.source_group_network });
    if (match.source_group_port) operations.push({ op: "set_match_source_group_port", value: match.source_group_port });
    if (match.destination_group_address) operations.push({ op: "set_match_destination_group_address", value: match.destination_group_address });
    if (match.destination_group_domain) operations.push({ op: "set_match_destination_group_domain", value: match.destination_group_domain });
    if (match.destination_group_mac) operations.push({ op: "set_match_destination_group_mac", value: match.destination_group_mac });
    if (match.destination_group_network) operations.push({ op: "set_match_destination_group_network", value: match.destination_group_network });
    if (match.destination_group_port) operations.push({ op: "set_match_destination_group_port", value: match.destination_group_port });
    
    // Port
    if (match.source_port) operations.push({ op: "set_match_source_port", value: match.source_port });
    if (match.destination_port) operations.push({ op: "set_match_destination_port", value: match.destination_port });
    
    // Protocol
    if (match.protocol) operations.push({ op: "set_match_protocol", value: match.protocol });
    if (match.tcp_flags) operations.push({ op: "set_match_tcp_flags", value: match.tcp_flags });
    
    // ICMP (IPv4)
    if (match.icmp_code) operations.push({ op: "set_match_icmp_code", value: match.icmp_code });
    if (match.icmp_type) operations.push({ op: "set_match_icmp_type", value: match.icmp_type });
    if (match.icmp_type_name) operations.push({ op: "set_match_icmp_type_name", value: match.icmp_type_name });
    
    // ICMPv6 (IPv6)
    if (match.icmpv6_code) operations.push({ op: "set_match_icmpv6_code", value: match.icmpv6_code });
    if (match.icmpv6_type) operations.push({ op: "set_match_icmpv6_type", value: match.icmpv6_type });
    if (match.icmpv6_type_name) operations.push({ op: "set_match_icmpv6_type_name", value: match.icmpv6_type_name });
    
    // Packet characteristics
    if (match.fragment) operations.push({ op: "set_match_fragment", value: match.fragment });
    if (match.packet_type) operations.push({ op: "set_match_packet_type", value: match.packet_type });
    if (match.packet_length) operations.push({ op: "set_match_packet_length", value: match.packet_length });
    if (match.packet_length_exclude) operations.push({ op: "set_match_packet_length_exclude", value: match.packet_length_exclude });
    if (match.dscp) operations.push({ op: "set_match_dscp", value: match.dscp });
    if (match.dscp_exclude) operations.push({ op: "set_match_dscp_exclude", value: match.dscp_exclude });
    
    // State & marks
    if (match.state) operations.push({ op: "set_match_state", value: match.state });
    if (match.ipsec) operations.push({ op: "set_match_ipsec", value: match.ipsec });
    if (match.mark) operations.push({ op: "set_match_mark", value: match.mark });
    if (match.connection_mark) operations.push({ op: "set_match_connection_mark", value: match.connection_mark });
    
    // TTL/Hop limit
    if (match.ttl_eq) operations.push({ op: "set_match_ttl", value: `eq ${match.ttl_eq}` });
    if (match.ttl_gt) operations.push({ op: "set_match_ttl", value: `gt ${match.ttl_gt}` });
    if (match.ttl_lt) operations.push({ op: "set_match_ttl", value: `lt ${match.ttl_lt}` });
    if (match.hop_limit_eq) operations.push({ op: "set_match_hop_limit", value: `eq ${match.hop_limit_eq}` });
    if (match.hop_limit_gt) operations.push({ op: "set_match_hop_limit", value: `gt ${match.hop_limit_gt}` });
    if (match.hop_limit_lt) operations.push({ op: "set_match_hop_limit", value: `lt ${match.hop_limit_lt}` });
    
    // Time-based
    if (match.time_monthdays) operations.push({ op: "set_match_time_monthdays", value: match.time_monthdays });
    if (match.time_startdate) operations.push({ op: "set_match_time_startdate", value: match.time_startdate });
    if (match.time_starttime) operations.push({ op: "set_match_time_starttime", value: match.time_starttime });
    if (match.time_stopdate) operations.push({ op: "set_match_time_stopdate", value: match.time_stopdate });
    if (match.time_stoptime) operations.push({ op: "set_match_time_stoptime", value: match.time_stoptime });
    if (match.time_utc) operations.push({ op: "set_match_time_utc" });
    if (match.time_weekdays) operations.push({ op: "set_match_time_weekdays", value: match.time_weekdays });
    
    // Rate limiting
    if (match.limit_burst) operations.push({ op: "set_match_limit_burst", value: match.limit_burst });
    if (match.limit_rate) operations.push({ op: "set_match_limit_rate", value: match.limit_rate });
    if (match.recent_count) operations.push({ op: "set_match_recent_count", value: match.recent_count });
    if (match.recent_time) operations.push({ op: "set_match_recent_time", value: match.recent_time });
  }

  /**
   * Reorder rules within a policy
   */
  async reorderRules(
    policyType: string,
    policyName: string,
    newOrder: number[]
  ): Promise<any> {
    return apiClient.post("/vyos/route/reorder", {
      policy_type: policyType,
      policy_name: policyName,
      rule_numbers: newOrder,
    });
  }

  // ========================================================================
  // Interface Management
  // ========================================================================

  /**
   * Add an interface to a policy
   */
  async addInterfaceToPolicy(
    policyType: string,
    policyName: string,
    interfaceType: string,
    interfaceName: string
  ): Promise<any> {
    // For VLAN interfaces (e.g., eth1.7), we need to send in the format
    // that the backend can parse correctly (just the interface name)
    const operations: RouteBatchOperation[] = [
      { op: "set_interface_policy", value: interfaceName }
    ];

    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      operations,
    });
  }

  /**
   * Remove an interface from a policy
   */
  async removeInterfaceFromPolicy(
    policyType: string,
    policyName: string,
    interfaceType: string,
    interfaceName: string
  ): Promise<any> {
    // For VLAN interfaces (e.g., eth1.7), we need to send in the format
    // that the backend can parse correctly (just the interface name)
    const operations: RouteBatchOperation[] = [
      { op: "delete_interface_policy", value: interfaceName }
    ];

    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      operations,
    });
  }

  // ========================================================================
  // Helper: Add Set Operations
  // ========================================================================

  private addSetOperations(operations: RouteBatchOperation[], set: Partial<SetActions>) {
    if (set.action_drop) {
      operations.push({ op: "set_action_drop" });
    }
    if (set.connection_mark) operations.push({ op: "set_connection_mark", value: set.connection_mark });
    if (set.dscp) operations.push({ op: "set_dscp", value: set.dscp });
    if (set.mark) operations.push({ op: "set_mark", value: set.mark });
    if (set.table) operations.push({ op: "set_table", value: set.table });
    if (set.tcp_mss) operations.push({ op: "set_tcp_mss", value: set.tcp_mss });
    if (set.vrf) operations.push({ op: "set_vrf", value: set.vrf });
  }
}

export const routeService = new RouteService();
