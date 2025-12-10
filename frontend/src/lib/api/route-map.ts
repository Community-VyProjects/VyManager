import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MatchConditions {
  // BGP Attributes
  as_path?: string | null;
  community_list?: string | null;
  community_exact_match?: boolean;
  extcommunity?: string | null;
  large_community_list?: string | null;
  large_community_exact_match?: boolean;
  local_preference?: number | null;
  metric?: number | null;
  origin?: string | null;  // egp|igp|incomplete
  peer?: string | null;
  rpki?: string | null;  // invalid|notfound|valid

  // IP/IPv6 Address
  ip_address_access_list?: string | null;
  ip_address_prefix_list?: string | null;
  ip_address_prefix_len?: number | null;
  ipv6_address_access_list?: string | null;
  ipv6_address_prefix_list?: string | null;
  ipv6_address_prefix_len?: number | null;

  // Next-Hop
  ip_nexthop_access_list?: string | null;
  ip_nexthop_address?: string | null;
  ip_nexthop_prefix_len?: number | null;
  ip_nexthop_prefix_list?: string | null;
  ip_nexthop_type?: string | null;
  ipv6_nexthop_address?: string | null;

  // Route Source
  ip_route_source_access_list?: string | null;
  ip_route_source_prefix_list?: string | null;

  // Other
  interface?: string | null;
  protocol?: string | null;
  source_vrf?: string | null;
  tag?: number | null;
}

export interface SetActions {
  // BGP AS Path
  as_path_exclude?: string | null;
  as_path_prepend?: string | null;
  as_path_prepend_last_as?: number | null;

  // BGP Communities (separate fields for each action to support multiple simultaneous operations)
  community_add_values?: string[] | null;
  community_delete_values?: string[] | null;
  community_replace_values?: string[] | null;
  community_remove_all?: boolean;

  // Large Communities (separate fields for each action)
  large_community_add_values?: string[] | null;
  large_community_delete_values?: string[] | null;
  large_community_replace_values?: string[] | null;
  large_community_remove_all?: boolean;
  extcommunity_bandwidth?: string | null;
  extcommunity_rt?: string | null;
  extcommunity_soo?: string | null;
  extcommunity_none?: boolean;

  // BGP Attributes
  atomic_aggregate?: boolean;
  aggregator_as?: string | null;
  aggregator_ip?: string | null;
  local_preference?: number | null;
  origin?: string | null;  // egp|igp|incomplete
  originator_id?: string | null;
  weight?: number | null;

  // Next-Hop
  ip_nexthop?: string | null;
  ip_nexthop_peer_address?: boolean;
  ip_nexthop_unchanged?: boolean;
  ipv6_nexthop_global?: string | null;
  ipv6_nexthop_local?: string | null;
  ipv6_nexthop_peer_address?: boolean;
  ipv6_nexthop_prefer_global?: boolean;

  // Route Properties
  distance?: number | null;
  metric?: string | null;
  metric_type?: string | null;  // type-1|type-2
  src?: string | null;
  table?: number | null;
  tag?: number | null;
}

export interface RouteMapRule {
  rule_number: number;
  description?: string | null;
  action: string;  // permit|deny
  call?: string | null;
  continue_rule?: number | null;
  on_match_goto?: number | null;
  on_match_next?: boolean;
  match: MatchConditions;
  set: SetActions;
}

export interface RouteMap {
  name: string;
  description?: string | null;
  rules: RouteMapRule[];
}

export interface RouteMapConfig {
  route_maps: RouteMap[];
  total: number;
}

export interface RouteMapCapabilities {
  version: string;
  features: {
    basic: { supported: boolean; description: string };
    rules: { supported: boolean; description: string };
    match_conditions: { supported: boolean; description: string };
    set_actions: { supported: boolean; description: string };
    bgp_attributes: { supported: boolean; description: string };
    call_continue: { supported: boolean; description: string };
    on_match: { supported: boolean; description: string };
  };
  version_notes: {
    identical_versions: string;
  };
  device_name?: string;
}

export interface RouteMapBatchOperation {
  op: string;
  value?: string;
}

export interface RouteMapBatchRequest {
  name: string;
  rule_number?: number;
  operations: RouteMapBatchOperation[];
}

// ============================================================================
// API Service
// ============================================================================

class RouteMapService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<RouteMapCapabilities> {
    return apiClient.get<RouteMapCapabilities>("/vyos/route-map/capabilities");
  }

  /**
   * Get all route-maps configuration
   */
  async getConfig(refresh: boolean = false): Promise<RouteMapConfig> {
    return apiClient.get<RouteMapConfig>("/vyos/route-map/config", {
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
  async batchConfigure(request: RouteMapBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/route-map/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete an entire route-map
   */
  async deleteRouteMap(name: string): Promise<any> {
    const operations: RouteMapBatchOperation[] = [];
    operations.push({ op: "delete_route_map" });

    return this.batchConfigure({
      name,
      rule_number: 0, // Not used for delete_route_map
      operations,
    });
  }

  /**
   * Delete a specific rule from a route-map and renumber remaining rules to close gaps
   */
  async deleteRule(name: string, ruleNumber: number): Promise<any> {
    // Get current configuration
    const config = await this.getConfig(true);
    const routeMap = config.route_maps.find(rm => rm.name === name);

    if (!routeMap) {
      throw new Error(`Route-map ${name} not found`);
    }

    // Get remaining rules (excluding the one being deleted)
    const remainingRules = routeMap.rules.filter(r => r.rule_number !== ruleNumber);

    if (remainingRules.length === 0) {
      // If no rules left, just delete the rule
      const operations: RouteMapBatchOperation[] = [];
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
      const operations: RouteMapBatchOperation[] = [];
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
   * Helper: Create a new route-map with a rule
   */
  async createRouteMap(name: string, description: string | null, rule: Partial<RouteMapRule>): Promise<any> {
    const operations: RouteMapBatchOperation[] = [];

    // Create route-map
    operations.push({ op: "set_route_map" });

    // Add description
    if (description) {
      operations.push({ op: "set_route_map_description", value: description });
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

    // Rule call
    if (rule.call) {
      operations.push({ op: "set_rule_call", value: rule.call });
    }

    // Rule continue
    if (rule.continue_rule !== undefined && rule.continue_rule !== null) {
      operations.push({ op: "set_rule_continue", value: rule.continue_rule.toString() });
    }

    // On-match actions
    if (rule.on_match_goto !== undefined && rule.on_match_goto !== null) {
      operations.push({ op: "set_rule_on_match_goto", value: rule.on_match_goto.toString() });
    }
    if (rule.on_match_next) {
      operations.push({ op: "set_rule_on_match_next" });
    }

    // Add match conditions
    if (rule.match) {
      this.addMatchOperations(operations, rule.match);
    }

    // Add set actions
    if (rule.set) {
      this.addSetOperations(operations, rule.set);
    }

    return this.batchConfigure({
      name,
      rule_number: rule.rule_number,
      operations,
    });
  }

  /**
   * Helper: Update an existing route-map or rule
   */
  async updateRouteMap(
    name: string,
    originalRouteMap: RouteMap,
    description: string | null,
    rule?: Partial<RouteMapRule>,
    ruleNumber?: number
  ): Promise<any> {
    const operations: RouteMapBatchOperation[] = [];

    // Update description
    if (description !== originalRouteMap.description) {
      if (description) {
        operations.push({ op: "set_route_map_description", value: description });
      } else if (originalRouteMap.description) {
        operations.push({ op: "delete_route_map_description" });
      }
    }

    // If updating a rule
    if (rule && ruleNumber !== undefined) {
      const originalRule = originalRouteMap.rules.find(r => r.rule_number === ruleNumber);

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

      // Rule call
      if (rule.call !== originalRule?.call) {
        if (rule.call) {
          operations.push({ op: "set_rule_call", value: rule.call });
        } else if (originalRule?.call) {
          operations.push({ op: "delete_rule_call" });
        }
      }

      // Rule continue
      if (rule.continue_rule !== originalRule?.continue_rule) {
        if (rule.continue_rule !== undefined && rule.continue_rule !== null) {
          operations.push({ op: "set_rule_continue", value: rule.continue_rule.toString() });
        } else if (originalRule?.continue_rule) {
          operations.push({ op: "delete_rule_continue" });
        }
      }

      // On-match actions
      if (rule.on_match_goto !== originalRule?.on_match_goto) {
        if (rule.on_match_goto !== undefined && rule.on_match_goto !== null) {
          operations.push({ op: "set_rule_on_match_goto", value: rule.on_match_goto.toString() });
        } else if (originalRule?.on_match_goto) {
          operations.push({ op: "delete_rule_on_match_goto" });
        }
      }

      if (rule.on_match_next !== originalRule?.on_match_next) {
        if (rule.on_match_next) {
          operations.push({ op: "set_rule_on_match_next" });
        } else if (originalRule?.on_match_next) {
          operations.push({ op: "delete_rule_on_match_next" });
        }
      }

      // Match conditions - for simplicity, delete all and recreate
      if (rule.match) {
        this.deleteMatchOperations(operations);
        this.addMatchOperations(operations, rule.match);
      }

      // Set actions - for simplicity, delete all and recreate
      if (rule.set) {
        this.deleteSetOperations(operations);
        this.addSetOperations(operations, rule.set);
      }
    }

    return this.batchConfigure({
      name,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Helper: Add a new rule to existing route-map
   */
  async addRule(name: string, rule: Partial<RouteMapRule>): Promise<any> {
    const operations: RouteMapBatchOperation[] = [];

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

    // Rule call, continue, on-match
    if (rule.call) {
      operations.push({ op: "set_rule_call", value: rule.call });
    }
    if (rule.continue_rule !== undefined && rule.continue_rule !== null) {
      operations.push({ op: "set_rule_continue", value: rule.continue_rule.toString() });
    }
    if (rule.on_match_goto !== undefined && rule.on_match_goto !== null) {
      operations.push({ op: "set_rule_on_match_goto", value: rule.on_match_goto.toString() });
    }
    if (rule.on_match_next) {
      operations.push({ op: "set_rule_on_match_next" });
    }

    // Match and set
    if (rule.match) {
      this.addMatchOperations(operations, rule.match);
    }
    if (rule.set) {
      this.addSetOperations(operations, rule.set);
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
  async updateRule(name: string, ruleNumber: number, rule: Partial<RouteMapRule>): Promise<any> {
    const operations: RouteMapBatchOperation[] = [];

    // Delete all existing match and set operations first
    this.deleteMatchOperations(operations);
    this.deleteSetOperations(operations);

    // Rule description
    if (rule.description) {
      operations.push({ op: "set_rule_description", value: rule.description });
    }

    // Rule action
    if (rule.action) {
      operations.push({ op: "set_rule_action", value: rule.action });
    }

    // Rule call, continue, on-match
    if (rule.call) {
      operations.push({ op: "set_rule_call", value: rule.call });
    }
    if (rule.continue_rule !== undefined && rule.continue_rule !== null) {
      operations.push({ op: "set_rule_continue", value: rule.continue_rule.toString() });
    }
    if (rule.on_match_goto !== undefined && rule.on_match_goto !== null) {
      operations.push({ op: "set_rule_on_match_goto", value: rule.on_match_goto.toString() });
    }
    if (rule.on_match_next) {
      operations.push({ op: "set_rule_on_match_next" });
    }

    // Match and set
    if (rule.match) {
      this.addMatchOperations(operations, rule.match);
    }
    if (rule.set) {
      this.addSetOperations(operations, rule.set);
    }

    return this.batchConfigure({
      name,
      rule_number: ruleNumber,
      operations,
    });
  }

  /**
   * Add match condition operations to the batch
   */
  private addMatchOperations(operations: RouteMapBatchOperation[], match: Partial<MatchConditions>) {
    // BGP Attributes
    if (match.as_path) operations.push({ op: "set_match_as_path", value: match.as_path });
    if (match.community_list) operations.push({ op: "set_match_community", value: match.community_list });
    if (match.community_exact_match) operations.push({ op: "set_match_community_exact_match" });
    if (match.extcommunity) operations.push({ op: "set_match_extcommunity", value: match.extcommunity });
    if (match.large_community_list) operations.push({ op: "set_match_large_community", value: match.large_community_list });
    if (match.large_community_exact_match) operations.push({ op: "set_match_large_community_exact_match" });
    if (match.local_preference !== undefined && match.local_preference !== null) operations.push({ op: "set_match_local_preference", value: match.local_preference.toString() });
    if (match.metric !== undefined && match.metric !== null) operations.push({ op: "set_match_metric", value: match.metric.toString() });
    if (match.origin) operations.push({ op: "set_match_origin", value: match.origin });
    if (match.peer) operations.push({ op: "set_match_peer", value: match.peer });
    if (match.rpki) operations.push({ op: "set_match_rpki", value: match.rpki });

    // IP Address
    if (match.ip_address_access_list) operations.push({ op: "set_match_ip_address_access_list", value: match.ip_address_access_list });
    if (match.ip_address_prefix_list) operations.push({ op: "set_match_ip_address_prefix_list", value: match.ip_address_prefix_list });
    if (match.ip_address_prefix_len !== undefined && match.ip_address_prefix_len !== null) operations.push({ op: "set_match_ip_address_prefix_len", value: match.ip_address_prefix_len.toString() });

    // IPv6 Address
    if (match.ipv6_address_access_list) operations.push({ op: "set_match_ipv6_address_access_list", value: match.ipv6_address_access_list });
    if (match.ipv6_address_prefix_list) operations.push({ op: "set_match_ipv6_address_prefix_list", value: match.ipv6_address_prefix_list });
    if (match.ipv6_address_prefix_len !== undefined && match.ipv6_address_prefix_len !== null) operations.push({ op: "set_match_ipv6_address_prefix_len", value: match.ipv6_address_prefix_len.toString() });

    // Next-Hop
    if (match.ip_nexthop_access_list) operations.push({ op: "set_match_ip_nexthop_access_list", value: match.ip_nexthop_access_list });
    if (match.ip_nexthop_address) operations.push({ op: "set_match_ip_nexthop_address", value: match.ip_nexthop_address });
    if (match.ip_nexthop_prefix_len !== undefined && match.ip_nexthop_prefix_len !== null) operations.push({ op: "set_match_ip_nexthop_prefix_len", value: match.ip_nexthop_prefix_len.toString() });
    if (match.ip_nexthop_prefix_list) operations.push({ op: "set_match_ip_nexthop_prefix_list", value: match.ip_nexthop_prefix_list });
    if (match.ip_nexthop_type) operations.push({ op: "set_match_ip_nexthop_type", value: match.ip_nexthop_type });
    if (match.ipv6_nexthop_address) operations.push({ op: "set_match_ipv6_nexthop_address", value: match.ipv6_nexthop_address });

    // Route Source
    if (match.ip_route_source_access_list) operations.push({ op: "set_match_ip_route_source_access_list", value: match.ip_route_source_access_list });
    if (match.ip_route_source_prefix_list) operations.push({ op: "set_match_ip_route_source_prefix_list", value: match.ip_route_source_prefix_list });

    // Other
    if (match.interface) operations.push({ op: "set_match_interface", value: match.interface });
    if (match.protocol) operations.push({ op: "set_match_protocol", value: match.protocol });
    if (match.source_vrf) operations.push({ op: "set_match_source_vrf", value: match.source_vrf });
    if (match.tag !== undefined && match.tag !== null) operations.push({ op: "set_match_tag", value: match.tag.toString() });
  }

  /**
   * Delete all match condition operations
   */
  private deleteMatchOperations(operations: RouteMapBatchOperation[]) {
    operations.push({ op: "delete_match_as_path" });
    operations.push({ op: "delete_match_community" });
    operations.push({ op: "delete_match_extcommunity" });
    operations.push({ op: "delete_match_large_community" });
    operations.push({ op: "delete_match_local_preference" });
    operations.push({ op: "delete_match_metric" });
    operations.push({ op: "delete_match_origin" });
    operations.push({ op: "delete_match_peer" });
    operations.push({ op: "delete_match_rpki" });
    operations.push({ op: "delete_match_ip_address" });
    operations.push({ op: "delete_match_ipv6_address" });
    operations.push({ op: "delete_match_ip_nexthop" });
    operations.push({ op: "delete_match_ipv6_nexthop" });
    operations.push({ op: "delete_match_ip_route_source" });
    operations.push({ op: "delete_match_interface" });
    operations.push({ op: "delete_match_protocol" });
    operations.push({ op: "delete_match_source_vrf" });
    operations.push({ op: "delete_match_tag" });
  }

  /**
   * Add set action operations to the batch
   */
  private addSetOperations(operations: RouteMapBatchOperation[], set: Partial<SetActions>) {
    // BGP AS Path
    if (set.as_path_exclude) operations.push({ op: "set_as_path_exclude", value: set.as_path_exclude });
    if (set.as_path_prepend) operations.push({ op: "set_as_path_prepend", value: set.as_path_prepend });
    if (set.as_path_prepend_last_as !== undefined && set.as_path_prepend_last_as !== null) operations.push({ op: "set_as_path_prepend_last_as", value: set.as_path_prepend_last_as.toString() });

    // Communities (separate fields for each action to support multiple simultaneous operations)
    if (set.community_add_values && set.community_add_values.length > 0) {
      for (const community of set.community_add_values) {
        operations.push({ op: "set_community_add", value: community });
      }
    }
    if (set.community_delete_values && set.community_delete_values.length > 0) {
      for (const community of set.community_delete_values) {
        operations.push({ op: "set_community_delete", value: community });
      }
    }
    if (set.community_replace_values && set.community_replace_values.length > 0) {
      for (const community of set.community_replace_values) {
        operations.push({ op: "set_community_replace", value: community });
      }
    }
    if (set.community_remove_all) {
      operations.push({ op: "set_community_none" });
    }

    // Large Communities (separate fields for each action)
    if (set.large_community_add_values && set.large_community_add_values.length > 0) {
      for (const community of set.large_community_add_values) {
        operations.push({ op: "set_large_community_add", value: community });
      }
    }
    if (set.large_community_delete_values && set.large_community_delete_values.length > 0) {
      for (const community of set.large_community_delete_values) {
        operations.push({ op: "set_large_community_delete", value: community });
      }
    }
    if (set.large_community_replace_values && set.large_community_replace_values.length > 0) {
      for (const community of set.large_community_replace_values) {
        operations.push({ op: "set_large_community_replace", value: community });
      }
    }
    if (set.large_community_remove_all) {
      operations.push({ op: "set_large_community_none" });
    }

    // Extcommunity
    if (set.extcommunity_bandwidth) operations.push({ op: "set_extcommunity_bandwidth", value: set.extcommunity_bandwidth });
    if (set.extcommunity_rt) operations.push({ op: "set_extcommunity_rt", value: set.extcommunity_rt });
    if (set.extcommunity_soo) operations.push({ op: "set_extcommunity_soo", value: set.extcommunity_soo });
    if (set.extcommunity_none) operations.push({ op: "set_extcommunity_none" });

    // BGP Attributes
    if (set.atomic_aggregate) operations.push({ op: "set_atomic_aggregate" });
    if (set.aggregator_as) operations.push({ op: "set_aggregator_as", value: set.aggregator_as });
    if (set.aggregator_ip) operations.push({ op: "set_aggregator_ip", value: set.aggregator_ip });
    if (set.local_preference !== undefined && set.local_preference !== null) operations.push({ op: "set_local_preference", value: set.local_preference.toString() });
    if (set.origin) operations.push({ op: "set_origin", value: set.origin });
    if (set.originator_id) operations.push({ op: "set_originator_id", value: set.originator_id });
    if (set.weight !== undefined && set.weight !== null) operations.push({ op: "set_weight", value: set.weight.toString() });

    // Next-Hop
    if (set.ip_nexthop) operations.push({ op: "set_ip_nexthop", value: set.ip_nexthop });
    if (set.ip_nexthop_peer_address) operations.push({ op: "set_ip_nexthop_peer_address" });
    if (set.ip_nexthop_unchanged) operations.push({ op: "set_ip_nexthop_unchanged" });
    if (set.ipv6_nexthop_global) operations.push({ op: "set_ipv6_nexthop_global", value: set.ipv6_nexthop_global });
    if (set.ipv6_nexthop_local) operations.push({ op: "set_ipv6_nexthop_local", value: set.ipv6_nexthop_local });
    if (set.ipv6_nexthop_peer_address) operations.push({ op: "set_ipv6_nexthop_peer_address" });
    if (set.ipv6_nexthop_prefer_global) operations.push({ op: "set_ipv6_nexthop_prefer_global" });

    // Route Properties
    if (set.distance !== undefined && set.distance !== null) operations.push({ op: "set_distance", value: set.distance.toString() });
    if (set.metric) operations.push({ op: "set_metric", value: set.metric });
    if (set.metric_type) operations.push({ op: "set_metric_type", value: set.metric_type });
    if (set.src) operations.push({ op: "set_src", value: set.src });
    if (set.table !== undefined && set.table !== null) operations.push({ op: "set_table", value: set.table.toString() });
    if (set.tag !== undefined && set.tag !== null) operations.push({ op: "set_tag", value: set.tag.toString() });
  }

  /**
   * Delete all set action operations
   */
  private deleteSetOperations(operations: RouteMapBatchOperation[]) {
    operations.push({ op: "delete_set_as_path_exclude" });
    operations.push({ op: "delete_set_as_path_prepend" });
    operations.push({ op: "delete_set_as_path_prepend_last_as" });
    operations.push({ op: "delete_set_community" });
    operations.push({ op: "delete_set_large_community" });
    operations.push({ op: "delete_set_extcommunity" });
    operations.push({ op: "delete_set_atomic_aggregate" });
    operations.push({ op: "delete_set_aggregator" });
    operations.push({ op: "delete_set_local_preference" });
    operations.push({ op: "delete_set_origin" });
    operations.push({ op: "delete_set_originator_id" });
    operations.push({ op: "delete_set_weight" });
    operations.push({ op: "delete_set_ip_nexthop" });
    operations.push({ op: "delete_set_ipv6_nexthop" });
    operations.push({ op: "delete_set_distance" });
    operations.push({ op: "delete_set_metric" });
    operations.push({ op: "delete_set_metric_type" });
    operations.push({ op: "delete_set_src" });
    operations.push({ op: "delete_set_table" });
    operations.push({ op: "delete_set_tag" });
  }

  /**
   * Reorder route-map rules
   */
  async reorderRules(routeMapName: string, rules: Array<{ old_number: number; new_number: number; rule_data: RouteMapRule }>): Promise<any> {
    const result = await apiClient.post("/vyos/route-map/reorder", {
      route_map_name: routeMapName,
      rules: rules,
    });
    await this.refreshConfig();
    return result;
  }
}

export const routeMapService = new RouteMapService();
