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

export interface FirewallRuleConnectionStatus {
  nat?: string | null;
}

export interface FirewallRuleFragment {
  match_frag?: boolean | null;
  match_non_frag?: boolean | null;
}

export interface FirewallRuleIPsec {
  // VyOS 1.4
  match_ipsec?: boolean | null;
  match_none?: boolean | null;
  // VyOS 1.5
  match_ipsec_in?: boolean | null;
  match_ipsec_out?: boolean | null;
  match_none_in?: boolean | null;
  match_none_out?: boolean | null;
}

export interface FirewallRuleLimit {
  rate?: string | null;
  burst?: string | null;
}

export interface FirewallRuleLogOptions {
  group?: string | null;
  level?: string | null;
  queue_threshold?: string | null;
  snapshot_length?: string | null;
}

export interface FirewallRuleRecent {
  count?: string | null;
  time?: string | null;
}

export interface FirewallRuleTime {
  startdate?: string | null;
  starttime?: string | null;
  stopdate?: string | null;
  stoptime?: string | null;
  weekdays?: string | null;
}

export interface FirewallRuleTTLMatch {
  eq?: string | null;
  gt?: string | null;
  lt?: string | null;
}

export interface FirewallRuleGRE {
  key?: string | null;
  version?: string | null;
  inner_proto?: string | null;
  flags_checksum?: boolean | null;
  flags_checksum_unset?: boolean | null;
  flags_key?: boolean | null;
  flags_key_unset?: boolean | null;
  flags_sequence?: boolean | null;
  flags_sequence_unset?: boolean | null;
}

export interface FirewallRuleSynproxy {
  tcp_mss?: string | null;
  tcp_window_scale?: string | null;
}

export interface FirewallRuleAddAddressToGroup {
  source_address_group?: string | null;
  source_timeout?: string | null;
  destination_address_group?: string | null;
  destination_timeout?: string | null;
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
  offload_target?: string | null;
  // New matching fields
  connection_mark?: string | null;
  connection_status?: FirewallRuleConnectionStatus | null;
  conntrack_helper?: string | null;
  dscp_match?: string | null;
  dscp_exclude?: string | null;
  fragment?: FirewallRuleFragment | null;
  gre?: FirewallRuleGRE | null;
  ipsec?: FirewallRuleIPsec | null;
  limit?: FirewallRuleLimit | null;
  log_options?: FirewallRuleLogOptions | null;
  mark_match?: string | null;
  packet_length?: string | null;
  packet_length_exclude?: string | null;
  packet_type?: string | null;
  queue_number?: string | null;
  queue_options?: string | null;
  recent?: FirewallRuleRecent | null;
  synproxy_config?: FirewallRuleSynproxy | null;
  tcp_mss?: string | null;
  time?: FirewallRuleTime | null;
  ttl_match?: FirewallRuleTTLMatch | null;
  add_address_to_group?: FirewallRuleAddAddressToGroup | null;
  // Additional source/destination fields
  source_fqdn?: string | null;
  source_address_mask?: string | null;
  destination_fqdn?: string | null;
  destination_address_mask?: string | null;
  destination_mac_address?: string | null;
  // Set/modify additions
  set_connection_mark?: string | null;
  set_tcp_mss?: string | null;
  disable: boolean;
  log: boolean;
}

export interface CustomChain {
  name: string;
  description?: string | null;
  default_action?: string | null;
  default_log?: boolean | null;
  default_jump_target?: string | null;
  rules: FirewallRule[];
}

export interface BaseChainConfig {
  default_action?: string | null;
  description?: string | null;
  default_log?: boolean | null;
  rules: FirewallRule[];
}

export interface PreroutingRawConfig {
  default_action?: string | null;
  description?: string | null;
  default_log?: boolean | null;
  default_jump_target?: string | null;
  rules: FirewallRule[];
}

export interface FirewallConfigResponse {
  // New structured chain configs with default_action
  forward: BaseChainConfig;
  input: BaseChainConfig;
  output: BaseChainConfig;
  // Legacy fields for backward compatibility
  forward_rules: FirewallRule[];
  input_rules: FirewallRule[];
  output_rules: FirewallRule[];
  custom_chains: CustomChain[];
  prerouting_raw?: PreroutingRawConfig | null;
  total_rules: number;
}

export interface FeatureCapability {
  supported: boolean;
  description: string;
}

export interface FirewallCapabilitiesResponse {
  version: string;
  features: Record<string, FeatureCapability>;
  actions: string[];
  states: string[];
  tcp_flags: string[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
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
  new_number: number | null; // null = delete-only (removed, not recreated)
  rule_data: FirewallRule;
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
  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Execute batch operations
   */
  async batchConfigure(request: FirewallBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/ipv4/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Reorder rules within a chain
   */
  async reorderRules(request: ReorderFirewallRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/ipv4/reorder", request);
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
  ): Promise<VyOSResponse> {
    const operations: FirewallBatchOperation[] = [];

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
          if (groupType === "dynamic-address-group") {
            operations.push({ op: "set_rule_source_group_dynamic_address", value: groupName });
          } else if (groupType.includes("address")) {
            operations.push({ op: "set_rule_source_group_address", value: groupName });
          } else if (groupType.includes("network")) {
            operations.push({ op: "set_rule_source_group_network", value: groupName });
          } else if (groupType.includes("port")) {
            operations.push({ op: "set_rule_source_group_port", value: groupName });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "set_rule_source_group_mac", value: groupName });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "set_rule_source_group_domain", value: groupName });
          } else if (groupType.includes("remote")) {
            operations.push({ op: "set_rule_source_group_remote", value: groupName });
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
          if (groupType === "dynamic-address-group") {
            operations.push({ op: "set_rule_destination_group_dynamic_address", value: groupName });
          } else if (groupType.includes("address")) {
            operations.push({ op: "set_rule_destination_group_address", value: groupName });
          } else if (groupType.includes("network")) {
            operations.push({ op: "set_rule_destination_group_network", value: groupName });
          } else if (groupType.includes("port")) {
            operations.push({ op: "set_rule_destination_group_port", value: groupName });
          } else if (groupType.includes("mac")) {
            operations.push({ op: "set_rule_destination_group_mac", value: groupName });
          } else if (groupType.includes("domain")) {
            operations.push({ op: "set_rule_destination_group_domain", value: groupName });
          } else if (groupType.includes("remote")) {
            operations.push({ op: "set_rule_destination_group_remote", value: groupName });
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

    // Set offload target
    if (config.offload_target) {
      operations.push({ op: "set_rule_offload_target", value: config.offload_target });
    }

    // Source FQDN
    if (config.source_fqdn) {
      operations.push({ op: "set_rule_source_fqdn", value: config.source_fqdn });
    }

    // Source address mask
    if (config.source_address_mask) {
      operations.push({ op: "set_rule_source_address_mask", value: config.source_address_mask });
    }

    // Destination FQDN
    if (config.destination_fqdn) {
      operations.push({ op: "set_rule_destination_fqdn", value: config.destination_fqdn });
    }

    // Destination address mask
    if (config.destination_address_mask) {
      operations.push({ op: "set_rule_destination_address_mask", value: config.destination_address_mask });
    }

    // Destination MAC address
    if (config.destination_mac_address) {
      operations.push({ op: "set_rule_destination_mac_address", value: config.destination_mac_address });
    }

    // Connection mark matching
    if (config.connection_mark) {
      operations.push({ op: "set_rule_connection_mark", value: config.connection_mark });
    }

    // Connection status
    if (config.connection_status?.nat) {
      operations.push({ op: "set_rule_connection_status_nat", value: config.connection_status.nat });
    }

    // Conntrack helper
    if (config.conntrack_helper) {
      operations.push({ op: "set_rule_conntrack_helper", value: config.conntrack_helper });
    }

    // DSCP match/exclude
    if (config.dscp_match) {
      operations.push({ op: "set_rule_dscp", value: config.dscp_match });
    }
    if (config.dscp_exclude) {
      operations.push({ op: "set_rule_dscp_exclude", value: config.dscp_exclude });
    }

    // Fragment matching
    if (config.fragment) {
      if (config.fragment.match_frag) {
        operations.push({ op: "set_rule_fragment_match_frag" });
      }
      if (config.fragment.match_non_frag) {
        operations.push({ op: "set_rule_fragment_match_non_frag" });
      }
    }

    // GRE matching
    if (config.gre) {
      if (config.gre.key) {
        operations.push({ op: "set_rule_gre_key", value: config.gre.key });
      }
      if (config.gre.version) {
        operations.push({ op: "set_rule_gre_version", value: config.gre.version });
      }
      if (config.gre.inner_proto) {
        operations.push({ op: "set_rule_gre_inner_proto", value: config.gre.inner_proto });
      }
      if (config.gre.flags_checksum) {
        operations.push({ op: "set_rule_gre_flags_checksum" });
      }
      if (config.gre.flags_checksum_unset) {
        operations.push({ op: "set_rule_gre_flags_checksum_unset" });
      }
      if (config.gre.flags_key) {
        operations.push({ op: "set_rule_gre_flags_key" });
      }
      if (config.gre.flags_key_unset) {
        operations.push({ op: "set_rule_gre_flags_key_unset" });
      }
      if (config.gre.flags_sequence) {
        operations.push({ op: "set_rule_gre_flags_sequence" });
      }
      if (config.gre.flags_sequence_unset) {
        operations.push({ op: "set_rule_gre_flags_sequence_unset" });
      }
    }

    // IPsec matching
    if (config.ipsec) {
      if (config.ipsec.match_ipsec) {
        operations.push({ op: "set_rule_ipsec_match_ipsec" });
      }
      if (config.ipsec.match_none) {
        operations.push({ op: "set_rule_ipsec_match_none" });
      }
      if (config.ipsec.match_ipsec_in) {
        operations.push({ op: "set_rule_ipsec_match_ipsec_in" });
      }
      if (config.ipsec.match_ipsec_out) {
        operations.push({ op: "set_rule_ipsec_match_ipsec_out" });
      }
      if (config.ipsec.match_none_in) {
        operations.push({ op: "set_rule_ipsec_match_none_in" });
      }
      if (config.ipsec.match_none_out) {
        operations.push({ op: "set_rule_ipsec_match_none_out" });
      }
    }

    // Rate limit
    if (config.limit) {
      if (config.limit.rate) {
        operations.push({ op: "set_rule_limit_rate", value: config.limit.rate });
      }
      if (config.limit.burst) {
        operations.push({ op: "set_rule_limit_burst", value: config.limit.burst });
      }
    }

    // Log options
    if (config.log_options) {
      if (config.log_options.group) {
        operations.push({ op: "set_rule_log_options_group", value: config.log_options.group });
      }
      if (config.log_options.level) {
        operations.push({ op: "set_rule_log_options_level", value: config.log_options.level });
      }
      if (config.log_options.queue_threshold) {
        operations.push({ op: "set_rule_log_options_queue_threshold", value: config.log_options.queue_threshold });
      }
      if (config.log_options.snapshot_length) {
        operations.push({ op: "set_rule_log_options_snapshot_length", value: config.log_options.snapshot_length });
      }
    }

    // Mark matching
    if (config.mark_match) {
      operations.push({ op: "set_rule_mark", value: config.mark_match });
    }

    // Packet length matching
    if (config.packet_length) {
      operations.push({ op: "set_rule_packet_length", value: config.packet_length });
    }
    if (config.packet_length_exclude) {
      operations.push({ op: "set_rule_packet_length_exclude", value: config.packet_length_exclude });
    }

    // Packet type
    if (config.packet_type) {
      operations.push({ op: "set_rule_packet_type", value: config.packet_type });
    }

    // Queue
    if (config.queue_number) {
      operations.push({ op: "set_rule_queue", value: config.queue_number });
    }
    if (config.queue_options) {
      operations.push({ op: "set_rule_queue_options", value: config.queue_options });
    }

    // Recent
    if (config.recent) {
      if (config.recent.count) {
        operations.push({ op: "set_rule_recent_count", value: config.recent.count });
      }
      if (config.recent.time) {
        operations.push({ op: "set_rule_recent_time", value: config.recent.time });
      }
    }

    // Synproxy
    if (config.synproxy_config) {
      if (config.synproxy_config.tcp_mss) {
        operations.push({ op: "set_rule_synproxy_tcp_mss", value: config.synproxy_config.tcp_mss });
      }
      if (config.synproxy_config.tcp_window_scale) {
        operations.push({ op: "set_rule_synproxy_tcp_window_scale", value: config.synproxy_config.tcp_window_scale });
      }
    }

    // TCP MSS matching
    if (config.tcp_mss) {
      operations.push({ op: "set_rule_tcp_mss", value: config.tcp_mss });
    }

    // Time-based rules
    if (config.time) {
      if (config.time.startdate) {
        operations.push({ op: "set_rule_time_startdate", value: config.time.startdate });
      }
      if (config.time.starttime) {
        operations.push({ op: "set_rule_time_starttime", value: config.time.starttime });
      }
      if (config.time.stopdate) {
        operations.push({ op: "set_rule_time_stopdate", value: config.time.stopdate });
      }
      if (config.time.stoptime) {
        operations.push({ op: "set_rule_time_stoptime", value: config.time.stoptime });
      }
      if (config.time.weekdays) {
        operations.push({ op: "set_rule_time_weekdays", value: config.time.weekdays });
      }
    }

    // TTL matching
    if (config.ttl_match) {
      if (config.ttl_match.eq) {
        operations.push({ op: "set_rule_ttl_eq", value: config.ttl_match.eq });
      }
      if (config.ttl_match.gt) {
        operations.push({ op: "set_rule_ttl_gt", value: config.ttl_match.gt });
      }
      if (config.ttl_match.lt) {
        operations.push({ op: "set_rule_ttl_lt", value: config.ttl_match.lt });
      }
    }

    // Add address to group
    if (config.add_address_to_group) {
      if (config.add_address_to_group.source_address_group) {
        operations.push({ op: "set_rule_add_address_to_group_src_group", value: config.add_address_to_group.source_address_group });
      }
      if (config.add_address_to_group.source_timeout) {
        operations.push({ op: "set_rule_add_address_to_group_src_timeout", value: config.add_address_to_group.source_timeout });
      }
      if (config.add_address_to_group.destination_address_group) {
        operations.push({ op: "set_rule_add_address_to_group_dst_group", value: config.add_address_to_group.destination_address_group });
      }
      if (config.add_address_to_group.destination_timeout) {
        operations.push({ op: "set_rule_add_address_to_group_dst_timeout", value: config.add_address_to_group.destination_timeout });
      }
    }

    // Set connection mark (packet modification)
    if (config.set_connection_mark) {
      operations.push({ op: "set_rule_set_connection_mark", value: config.set_connection_mark });
    }

    // Set TCP MSS (packet modification)
    if (config.set_tcp_mss) {
      operations.push({ op: "set_rule_set_tcp_mss", value: config.set_tcp_mss });
    }

    // Set flags
    if (config.disable) {
      operations.push({ op: "set_rule_disable" });
    }

    if (config.log) {
      operations.push({ op: "set_rule_log" });
    }

    const request = {
      chain,
      rule_number: ruleNumber,
      is_custom_chain: isCustomChain,
      operations,
    };

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
  ): Promise<VyOSResponse> {
    const operations: FirewallBatchOperation[] = [];

    // Helper to determine if a value has changed
    const hasChanged = (newVal: unknown, oldVal: unknown) => {
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
      // Check if we're clearing to "any" (empty object)
      const isAny = config.source && Object.keys(config.source).length === 0;

      if (isAny) {
        // When switching to "any", delete the entire source node
        operations.push({ op: "delete_rule_source" });
      } else {
        // Delete old source settings individually
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
          // When removing all GeoIP settings, delete the entire geoip node
          operations.push({ op: "delete_rule_source_geoip" });
        }
        if (currentRule.source?.group) {
          // If the new config has no group at all, delete the entire group node to avoid empty container error
          if (!config.source?.group) {
            operations.push({ op: "delete_rule_source_group" });
          } else {
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
              } else if (groupType.includes("remote")) {
                operations.push({ op: "delete_rule_source_group_remote" });
              }
            }
          }
        }
      }

      // Set new source settings (only if not "any")
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
            if (groupType === "dynamic-address-group") {
              operations.push({ op: "set_rule_source_group_dynamic_address", value: groupName });
            } else if (groupType.includes("address")) {
              operations.push({ op: "set_rule_source_group_address", value: groupName });
            } else if (groupType.includes("network")) {
              operations.push({ op: "set_rule_source_group_network", value: groupName });
            } else if (groupType.includes("port")) {
              operations.push({ op: "set_rule_source_group_port", value: groupName });
            } else if (groupType.includes("mac")) {
              operations.push({ op: "set_rule_source_group_mac", value: groupName });
            } else if (groupType.includes("domain")) {
              operations.push({ op: "set_rule_source_group_domain", value: groupName });
            } else if (groupType.includes("remote")) {
              operations.push({ op: "set_rule_source_group_remote", value: groupName });
            }
          }
        }
      }
    }

    // Update destination (similar to source)
    if (hasChanged(config.destination, currentRule.destination)) {
      // Check if we're clearing to "any" (empty object)
      const isAny = config.destination && Object.keys(config.destination).length === 0;

      if (isAny) {
        // When switching to "any", delete the entire destination node
        operations.push({ op: "delete_rule_destination" });
      } else {
        // Delete old destination settings individually
        if (currentRule.destination?.address) {
          operations.push({ op: "delete_rule_destination_address" });
        }
        if (currentRule.destination?.port) {
          operations.push({ op: "delete_rule_destination_port" });
        }
        if (currentRule.destination?.geoip) {
          // When removing all GeoIP settings, delete the entire geoip node
          operations.push({ op: "delete_rule_destination_geoip" });
        }
        if (currentRule.destination?.group) {
          // If the new config has no group at all, delete the entire group node to avoid empty container error
          if (!config.destination?.group) {
            operations.push({ op: "delete_rule_destination_group" });
          } else {
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
              } else if (groupType.includes("remote")) {
                operations.push({ op: "delete_rule_destination_group_remote" });
              }
            }
          }
        }
      }

      // Set new destination settings (only if not "any")
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
            if (groupType === "dynamic-address-group") {
              operations.push({ op: "set_rule_destination_group_dynamic_address", value: groupName });
            } else if (groupType.includes("address")) {
              operations.push({ op: "set_rule_destination_group_address", value: groupName });
            } else if (groupType.includes("network")) {
              operations.push({ op: "set_rule_destination_group_network", value: groupName });
            } else if (groupType.includes("port")) {
              operations.push({ op: "set_rule_destination_group_port", value: groupName });
            } else if (groupType.includes("mac")) {
              operations.push({ op: "set_rule_destination_group_mac", value: groupName });
            } else if (groupType.includes("domain")) {
              operations.push({ op: "set_rule_destination_group_domain", value: groupName });
            } else if (groupType.includes("remote")) {
              operations.push({ op: "set_rule_destination_group_remote", value: groupName });
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

    // Update offload target
    if (hasChanged(config.offload_target, currentRule.offload_target)) {
      if (config.offload_target) {
        operations.push({ op: "set_rule_offload_target", value: config.offload_target });
      } else if (currentRule.offload_target) {
        operations.push({ op: "delete_rule_offload_target" });
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

    // Update source FQDN
    if (hasChanged(config.source_fqdn, currentRule.source_fqdn)) {
      if (currentRule.source_fqdn) {
        operations.push({ op: "delete_rule_source_fqdn" });
      }
      if (config.source_fqdn) {
        operations.push({ op: "set_rule_source_fqdn", value: config.source_fqdn });
      }
    }

    // Update source address mask
    if (hasChanged(config.source_address_mask, currentRule.source_address_mask)) {
      if (currentRule.source_address_mask) {
        operations.push({ op: "delete_rule_source_address_mask" });
      }
      if (config.source_address_mask) {
        operations.push({ op: "set_rule_source_address_mask", value: config.source_address_mask });
      }
    }

    // Update destination FQDN
    if (hasChanged(config.destination_fqdn, currentRule.destination_fqdn)) {
      if (currentRule.destination_fqdn) {
        operations.push({ op: "delete_rule_destination_fqdn" });
      }
      if (config.destination_fqdn) {
        operations.push({ op: "set_rule_destination_fqdn", value: config.destination_fqdn });
      }
    }

    // Update destination address mask
    if (hasChanged(config.destination_address_mask, currentRule.destination_address_mask)) {
      if (currentRule.destination_address_mask) {
        operations.push({ op: "delete_rule_destination_address_mask" });
      }
      if (config.destination_address_mask) {
        operations.push({ op: "set_rule_destination_address_mask", value: config.destination_address_mask });
      }
    }

    // Update destination MAC address
    if (hasChanged(config.destination_mac_address, currentRule.destination_mac_address)) {
      if (currentRule.destination_mac_address) {
        operations.push({ op: "delete_rule_destination_mac_address" });
      }
      if (config.destination_mac_address) {
        operations.push({ op: "set_rule_destination_mac_address", value: config.destination_mac_address });
      }
    }

    // Update connection mark
    if (hasChanged(config.connection_mark, currentRule.connection_mark)) {
      if (currentRule.connection_mark) {
        operations.push({ op: "delete_rule_connection_mark" });
      }
      if (config.connection_mark) {
        operations.push({ op: "set_rule_connection_mark", value: config.connection_mark });
      }
    }

    // Update connection status
    if (hasChanged(config.connection_status, currentRule.connection_status)) {
      if (currentRule.connection_status?.nat) {
        operations.push({ op: "delete_rule_connection_status_nat" });
      }
      if (config.connection_status?.nat) {
        operations.push({ op: "set_rule_connection_status_nat", value: config.connection_status.nat });
      }
    }

    // Update conntrack helper
    if (hasChanged(config.conntrack_helper, currentRule.conntrack_helper)) {
      if (currentRule.conntrack_helper) {
        operations.push({ op: "delete_rule_conntrack_helper" });
      }
      if (config.conntrack_helper) {
        operations.push({ op: "set_rule_conntrack_helper", value: config.conntrack_helper });
      }
    }

    // Update DSCP match
    if (hasChanged(config.dscp_match, currentRule.dscp_match)) {
      if (currentRule.dscp_match) {
        operations.push({ op: "delete_rule_dscp" });
      }
      if (config.dscp_match) {
        operations.push({ op: "set_rule_dscp", value: config.dscp_match });
      }
    }

    // Update DSCP exclude
    if (hasChanged(config.dscp_exclude, currentRule.dscp_exclude)) {
      if (currentRule.dscp_exclude) {
        operations.push({ op: "delete_rule_dscp_exclude" });
      }
      if (config.dscp_exclude) {
        operations.push({ op: "set_rule_dscp_exclude", value: config.dscp_exclude });
      }
    }

    // Update fragment matching
    if (hasChanged(config.fragment, currentRule.fragment)) {
      // Delete entire fragment node, then set new values
      if (currentRule.fragment) {
        operations.push({ op: "delete_rule_fragment" });
      }
      if (config.fragment) {
        if (config.fragment.match_frag) {
          operations.push({ op: "set_rule_fragment_match_frag" });
        }
        if (config.fragment.match_non_frag) {
          operations.push({ op: "set_rule_fragment_match_non_frag" });
        }
      }
    }

    // Update GRE matching
    if (hasChanged(config.gre, currentRule.gre)) {
      if (currentRule.gre) {
        operations.push({ op: "delete_rule_gre" });
      }
      if (config.gre) {
        if (config.gre.key) {
          operations.push({ op: "set_rule_gre_key", value: config.gre.key });
        }
        if (config.gre.version) {
          operations.push({ op: "set_rule_gre_version", value: config.gre.version });
        }
        if (config.gre.inner_proto) {
          operations.push({ op: "set_rule_gre_inner_proto", value: config.gre.inner_proto });
        }
        if (config.gre.flags_checksum) {
          operations.push({ op: "set_rule_gre_flags_checksum" });
        }
        if (config.gre.flags_checksum_unset) {
          operations.push({ op: "set_rule_gre_flags_checksum_unset" });
        }
        if (config.gre.flags_key) {
          operations.push({ op: "set_rule_gre_flags_key" });
        }
        if (config.gre.flags_key_unset) {
          operations.push({ op: "set_rule_gre_flags_key_unset" });
        }
        if (config.gre.flags_sequence) {
          operations.push({ op: "set_rule_gre_flags_sequence" });
        }
        if (config.gre.flags_sequence_unset) {
          operations.push({ op: "set_rule_gre_flags_sequence_unset" });
        }
      }
    }

    // Update IPsec matching
    if (hasChanged(config.ipsec, currentRule.ipsec)) {
      if (currentRule.ipsec) {
        operations.push({ op: "delete_rule_ipsec" });
      }
      if (config.ipsec) {
        if (config.ipsec.match_ipsec) {
          operations.push({ op: "set_rule_ipsec_match_ipsec" });
        }
        if (config.ipsec.match_none) {
          operations.push({ op: "set_rule_ipsec_match_none" });
        }
        if (config.ipsec.match_ipsec_in) {
          operations.push({ op: "set_rule_ipsec_match_ipsec_in" });
        }
        if (config.ipsec.match_ipsec_out) {
          operations.push({ op: "set_rule_ipsec_match_ipsec_out" });
        }
        if (config.ipsec.match_none_in) {
          operations.push({ op: "set_rule_ipsec_match_none_in" });
        }
        if (config.ipsec.match_none_out) {
          operations.push({ op: "set_rule_ipsec_match_none_out" });
        }
      }
    }

    // Update rate limit
    if (hasChanged(config.limit, currentRule.limit)) {
      if (currentRule.limit) {
        operations.push({ op: "delete_rule_limit" });
      }
      if (config.limit) {
        if (config.limit.rate) {
          operations.push({ op: "set_rule_limit_rate", value: config.limit.rate });
        }
        if (config.limit.burst) {
          operations.push({ op: "set_rule_limit_burst", value: config.limit.burst });
        }
      }
    }

    // Update log options
    if (hasChanged(config.log_options, currentRule.log_options)) {
      if (currentRule.log_options) {
        operations.push({ op: "delete_rule_log_options" });
      }
      if (config.log_options) {
        if (config.log_options.group) {
          operations.push({ op: "set_rule_log_options_group", value: config.log_options.group });
        }
        if (config.log_options.level) {
          operations.push({ op: "set_rule_log_options_level", value: config.log_options.level });
        }
        if (config.log_options.queue_threshold) {
          operations.push({ op: "set_rule_log_options_queue_threshold", value: config.log_options.queue_threshold });
        }
        if (config.log_options.snapshot_length) {
          operations.push({ op: "set_rule_log_options_snapshot_length", value: config.log_options.snapshot_length });
        }
      }
    }

    // Update mark matching
    if (hasChanged(config.mark_match, currentRule.mark_match)) {
      if (currentRule.mark_match) {
        operations.push({ op: "delete_rule_mark" });
      }
      if (config.mark_match) {
        operations.push({ op: "set_rule_mark", value: config.mark_match });
      }
    }

    // Update packet length
    if (hasChanged(config.packet_length, currentRule.packet_length)) {
      if (currentRule.packet_length) {
        operations.push({ op: "delete_rule_packet_length" });
      }
      if (config.packet_length) {
        operations.push({ op: "set_rule_packet_length", value: config.packet_length });
      }
    }

    // Update packet length exclude
    if (hasChanged(config.packet_length_exclude, currentRule.packet_length_exclude)) {
      if (currentRule.packet_length_exclude) {
        operations.push({ op: "delete_rule_packet_length_exclude" });
      }
      if (config.packet_length_exclude) {
        operations.push({ op: "set_rule_packet_length_exclude", value: config.packet_length_exclude });
      }
    }

    // Update packet type
    if (hasChanged(config.packet_type, currentRule.packet_type)) {
      if (currentRule.packet_type) {
        operations.push({ op: "delete_rule_packet_type" });
      }
      if (config.packet_type) {
        operations.push({ op: "set_rule_packet_type", value: config.packet_type });
      }
    }

    // Update queue
    if (hasChanged(config.queue_number, currentRule.queue_number)) {
      if (currentRule.queue_number) {
        operations.push({ op: "delete_rule_queue" });
      }
      if (config.queue_number) {
        operations.push({ op: "set_rule_queue", value: config.queue_number });
      }
    }

    // Update queue options
    if (hasChanged(config.queue_options, currentRule.queue_options)) {
      if (currentRule.queue_options) {
        operations.push({ op: "delete_rule_queue_options" });
      }
      if (config.queue_options) {
        operations.push({ op: "set_rule_queue_options", value: config.queue_options });
      }
    }

    // Update recent
    if (hasChanged(config.recent, currentRule.recent)) {
      if (currentRule.recent) {
        operations.push({ op: "delete_rule_recent" });
      }
      if (config.recent) {
        if (config.recent.count) {
          operations.push({ op: "set_rule_recent_count", value: config.recent.count });
        }
        if (config.recent.time) {
          operations.push({ op: "set_rule_recent_time", value: config.recent.time });
        }
      }
    }

    // Update synproxy
    if (hasChanged(config.synproxy_config, currentRule.synproxy_config)) {
      if (currentRule.synproxy_config) {
        operations.push({ op: "delete_rule_synproxy" });
      }
      if (config.synproxy_config) {
        if (config.synproxy_config.tcp_mss) {
          operations.push({ op: "set_rule_synproxy_tcp_mss", value: config.synproxy_config.tcp_mss });
        }
        if (config.synproxy_config.tcp_window_scale) {
          operations.push({ op: "set_rule_synproxy_tcp_window_scale", value: config.synproxy_config.tcp_window_scale });
        }
      }
    }

    // Update TCP MSS matching
    if (hasChanged(config.tcp_mss, currentRule.tcp_mss)) {
      if (currentRule.tcp_mss) {
        operations.push({ op: "delete_rule_tcp_mss" });
      }
      if (config.tcp_mss) {
        operations.push({ op: "set_rule_tcp_mss", value: config.tcp_mss });
      }
    }

    // Update time-based rules
    if (hasChanged(config.time, currentRule.time)) {
      if (currentRule.time) {
        operations.push({ op: "delete_rule_time" });
      }
      if (config.time) {
        if (config.time.startdate) {
          operations.push({ op: "set_rule_time_startdate", value: config.time.startdate });
        }
        if (config.time.starttime) {
          operations.push({ op: "set_rule_time_starttime", value: config.time.starttime });
        }
        if (config.time.stopdate) {
          operations.push({ op: "set_rule_time_stopdate", value: config.time.stopdate });
        }
        if (config.time.stoptime) {
          operations.push({ op: "set_rule_time_stoptime", value: config.time.stoptime });
        }
        if (config.time.weekdays) {
          operations.push({ op: "set_rule_time_weekdays", value: config.time.weekdays });
        }
      }
    }

    // Update TTL matching
    if (hasChanged(config.ttl_match, currentRule.ttl_match)) {
      if (currentRule.ttl_match) {
        operations.push({ op: "delete_rule_ttl" });
      }
      if (config.ttl_match) {
        if (config.ttl_match.eq) {
          operations.push({ op: "set_rule_ttl_eq", value: config.ttl_match.eq });
        }
        if (config.ttl_match.gt) {
          operations.push({ op: "set_rule_ttl_gt", value: config.ttl_match.gt });
        }
        if (config.ttl_match.lt) {
          operations.push({ op: "set_rule_ttl_lt", value: config.ttl_match.lt });
        }
      }
    }

    // Update add address to group
    if (hasChanged(config.add_address_to_group, currentRule.add_address_to_group)) {
      if (currentRule.add_address_to_group) {
        operations.push({ op: "delete_rule_add_address_to_group" });
      }
      if (config.add_address_to_group) {
        if (config.add_address_to_group.source_address_group) {
          operations.push({ op: "set_rule_add_address_to_group_src_group", value: config.add_address_to_group.source_address_group });
        }
        if (config.add_address_to_group.source_timeout) {
          operations.push({ op: "set_rule_add_address_to_group_src_timeout", value: config.add_address_to_group.source_timeout });
        }
        if (config.add_address_to_group.destination_address_group) {
          operations.push({ op: "set_rule_add_address_to_group_dst_group", value: config.add_address_to_group.destination_address_group });
        }
        if (config.add_address_to_group.destination_timeout) {
          operations.push({ op: "set_rule_add_address_to_group_dst_timeout", value: config.add_address_to_group.destination_timeout });
        }
      }
    }

    // Update set connection mark
    if (hasChanged(config.set_connection_mark, currentRule.set_connection_mark)) {
      if (currentRule.set_connection_mark) {
        operations.push({ op: "delete_rule_set_connection_mark" });
      }
      if (config.set_connection_mark) {
        operations.push({ op: "set_rule_set_connection_mark", value: config.set_connection_mark });
      }
    }

    // Update set TCP MSS
    if (hasChanged(config.set_tcp_mss, currentRule.set_tcp_mss)) {
      if (currentRule.set_tcp_mss) {
        operations.push({ op: "delete_rule_set_tcp_mss" });
      }
      if (config.set_tcp_mss) {
        operations.push({ op: "set_rule_set_tcp_mss", value: config.set_tcp_mss });
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
   * Helper: Delete a rule and automatically renumber remaining rules
   */
  async deleteRule(chain: string, ruleNumber: number, isCustomChain: boolean): Promise<VyOSResponse> {
    // First, get current config to find all rules in this chain
    const config = await this.getConfig();

    let rulesInChain: FirewallRule[] = [];
    if (isCustomChain) {
      const customChain = config.custom_chains.find(c => c.name === chain);
      rulesInChain = customChain?.rules || [];
    } else {
      // Get rules from the appropriate base chain
      if (chain === "forward") {
        rulesInChain = config.forward_rules;
      } else if (chain === "input") {
        rulesInChain = config.input_rules;
      } else if (chain === "output") {
        rulesInChain = config.output_rules;
      }
    }

    // Delete + renumber in a SINGLE commit via the reorder endpoint. The deleted
    // rule is sent with new_number=null (removed, not recreated); the rules below
    // it shift down by one. Doing this as two requests breaks under commit-confirm,
    // which only allows one un-confirmed change at a time.
    const deletedRule =
      rulesInChain.find(r => r.rule_number === ruleNumber) ??
      ({ rule_number: ruleNumber } as FirewallRule); // rule_data unused for delete-only
    const rulesToRenumber = rulesInChain
      .filter(r => r.rule_number > ruleNumber)
      .sort((a, b) => a.rule_number - b.rule_number);

    const reorderRules: ReorderRuleItem[] = [
      { old_number: ruleNumber, new_number: null, rule_data: deletedRule },
      ...rulesToRenumber.map(rule => ({
        old_number: rule.rule_number,
        new_number: rule.rule_number - 1, // Shift down by 1
        rule_data: rule,
      })),
    ];

    return this.reorderRules({
      chain,
      is_custom_chain: isCustomChain,
      rules: reorderRules,
    });
  }

  /**
   * Helper: Create a custom chain
   */
  async createCustomChain(
    chainName: string,
    description?: string,
    defaultAction?: string
  ): Promise<VyOSResponse> {
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
  async deleteCustomChain(chainName: string): Promise<VyOSResponse> {
    const operations: FirewallBatchOperation[] = [{ op: "delete_custom_chain" }];

    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations,
    });
  }

  /**
   * Helper: Set default action for a base chain (forward, input, output)
   */
  async setBaseChainDefaultAction(chain: string, action: string): Promise<VyOSResponse> {
    const operations: FirewallBatchOperation[] = [
      { op: "set_base_chain_default_action", value: action }
    ];

    return this.batchConfigure({
      chain,
      is_custom_chain: false,
      operations,
    });
  }

  /**
   * Helper: Set default action for a custom chain
   */
  async setCustomChainDefaultAction(chainName: string, action: string): Promise<VyOSResponse> {
    const operations: FirewallBatchOperation[] = [
      { op: "set_custom_chain_default_action", value: action }
    ];

    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations,
    });
  }

  // ========================================================================
  // Chain-level settings
  // ========================================================================

  async setBaseChainDescription(chain: string, description: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      is_custom_chain: false,
      operations: [{ op: "set_base_chain_description", value: description }],
    });
  }

  async deleteBaseChainDescription(chain: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      is_custom_chain: false,
      operations: [{ op: "delete_base_chain_description" }],
    });
  }

  async setBaseChainDefaultLog(chain: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      is_custom_chain: false,
      operations: [{ op: "set_base_chain_default_log" }],
    });
  }

  async deleteBaseChainDefaultLog(chain: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain,
      is_custom_chain: false,
      operations: [{ op: "delete_base_chain_default_log" }],
    });
  }

  async setCustomChainDescription(chainName: string, description: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "set_custom_chain_description", value: description }],
    });
  }

  async deleteCustomChainDescription(chainName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "delete_custom_chain_description" }],
    });
  }

  async setCustomChainDefaultLog(chainName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "set_custom_chain_default_log" }],
    });
  }

  async deleteCustomChainDefaultLog(chainName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "delete_custom_chain_default_log" }],
    });
  }

  async setCustomChainDefaultJumpTarget(chainName: string, target: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "set_custom_chain_default_jump_target", value: target }],
    });
  }

  async deleteCustomChainDefaultJumpTarget(chainName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: chainName,
      is_custom_chain: true,
      operations: [{ op: "delete_custom_chain_default_jump_target" }],
    });
  }

  // ========================================================================
  // Prerouting/Raw chain helpers
  // ========================================================================

  async setPreroutingRawDefaultAction(action: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "set_prerouting_raw_default_action", value: action }],
    });
  }

  async setPreroutingRawDescription(description: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "set_prerouting_raw_description", value: description }],
    });
  }

  async deletePreroutingRawDescription(): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "delete_prerouting_raw_description" }],
    });
  }

  async setPreroutingRawDefaultLog(): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "set_prerouting_raw_default_log" }],
    });
  }

  async deletePreroutingRawDefaultLog(): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "delete_prerouting_raw_default_log" }],
    });
  }

  async setPreroutingRawDefaultJumpTarget(target: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "set_prerouting_raw_default_jump_target", value: target }],
    });
  }

  async deletePreroutingRawDefaultJumpTarget(): Promise<VyOSResponse> {
    return this.batchConfigure({
      chain: "prerouting_raw",
      is_custom_chain: false,
      operations: [{ op: "delete_prerouting_raw_default_jump_target" }],
    });
  }
}

export const firewallIPv4Service = new FirewallIPv4Service();
