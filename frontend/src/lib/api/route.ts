import { apiClient } from "./client";
import type { ApiError, VyOSResponse } from "@/lib/types/api";
import {
  policyCreateOps,
  policyDeleteOps,
  policyUpdateOps,
  ruleDeleteOps,
  ruleSaveOps,
  type PolicyForm,
  type RouteRuleForm,
} from "./route-save-ops";

// ============================================================================
// Config read (GET /vyos/route/config)
// ============================================================================

export type RoutePolicyType = "route" | "route6";

/** Source or destination geoip match (1.5 only; empty on 1.4). */
export interface GeoIPMatch {
  country_code: string[];
  asn: string[];
  inverse_match: boolean;
}

/** Rule match leaves. A `multi:` leaf is a list. */
export interface MatchConditions {
  connection_mark: string[];
  destination_address: string | null;
  destination_geoip: GeoIPMatch;
  destination_group_address: string | null;
  destination_group_domain: string | null;
  destination_group_mac: string | null;
  destination_group_network: string | null;
  destination_group_port: string | null;
  destination_port: string | null;
  dscp: string[];
  dscp_exclude: string[];
  fragment: string[];
  hop_limit_eq: string | null;
  hop_limit_gt: string | null;
  hop_limit_lt: string | null;
  icmp_code: string | null;
  icmp_type: string | null;
  icmp_type_name: string | null;
  icmpv6_type: string | null;
  ipsec: string[];
  limit_burst: string | null;
  limit_rate: string | null;
  mark: string | null;
  packet_length: string[];
  packet_length_exclude: string[];
  packet_type: string | null;
  protocol: string | null;
  recent_count: string | null;
  recent_time: string | null;
  source_address: string | null;
  source_geoip: GeoIPMatch;
  source_group_address: string | null;
  source_group_domain: string | null;
  source_group_mac: string | null;
  source_group_network: string | null;
  source_group_port: string | null;
  source_mac_address: string | null;
  source_port: string | null;
  state: string[];
  tcp_flags: string[];
  tcp_flags_not: string[];
  tcp_mss: string | null;
  time_monthdays: string | null;
  time_startdate: string | null;
  time_starttime: string | null;
  time_stopdate: string | null;
  time_stoptime: string | null;
  time_utc: boolean;
  time_weekdays: string | null;
  ttl_eq: string | null;
  ttl_gt: string | null;
  ttl_lt: string | null;
}

export interface SetActions {
  connection_mark: string | null;
  dscp: string | null;
  mark: string | null;
  table: string | null;
  tcp_mss: string | null;
  vrf: string | null;
}

export interface PolicyRouteRule {
  rule_number: number;
  description: string | null;
  disable: boolean;
  log: boolean;
  action: string | null;
  match: MatchConditions;
  set: SetActions;
}

export interface PolicyRoute {
  name: string;
  policy_type: RoutePolicyType;
  description: string | null;
  default_log: boolean;
  interfaces: string[];
  rules: PolicyRouteRule[];
}

export interface RouteConfigResponse {
  ipv4_policies: PolicyRoute[];
  ipv6_policies: PolicyRoute[];
  total_ipv4: number;
  total_ipv6: number;
}

// ============================================================================
// Capabilities (GET /vyos/route/capabilities)
// ============================================================================

export interface RouteRange {
  min: number;
  max: number;
}

/** The val_help bounds the capabilities carry. */
export type RouteRangeKey =
  | "rule"
  | "ttl"
  | "icmp_code"
  | "icmp_type"
  | "icmpv6_type"
  | "protocol"
  | "packet_length"
  | "dscp"
  | "mark"
  | "connection_mark"
  | "limit_burst"
  | "limit_rate"
  | "recent_count"
  | "recent_time"
  | "tcp_mss"
  | "geoip_asn"
  | "set_connection_mark"
  | "set_dscp"
  | "set_mark"
  | "set_table"
  | "set_tcp_mss";

export interface RouteCapabilitiesResponse {
  version: string;
  features: {
    ipv4_policy_route: { supported: boolean };
    ipv6_policy_route: { supported: boolean };
    geoip_matching: { supported: boolean; country_codes: string[] };
    tcp_mss_matching: { supported: boolean };
    vrf_routing: { supported: boolean };
    ipsec_matching: { supported: boolean; values: string[] };
    limit_rate: { supported: boolean; units: string[] };
  };
  values: {
    rule_actions: string[];
    packet_types: string[];
    states: string[];
    fragments: string[];
    weekdays: string[];
    tcp_flags: string[];
    compare_ops: string[];
    protocols: string[];
    icmp_type_names: string[];
    icmpv6_types: string[];
  };
  ranges: Partial<Record<RouteRangeKey, RouteRange>>;
  description_max_length: number;
  instance_name?: string;
  instance_id?: string;
}

// ============================================================================
// Batch (POST /vyos/route/batch)
// ============================================================================

export interface RouteBatchOperation {
  op: string;
  value?: string;
}

/** One commit on one policy. Rule ops need rule_number; policy ops take none. */
export interface RouteBatchRequest {
  policy_type: RoutePolicyType;
  name: string;
  rule_number?: number;
  operations: RouteBatchOperation[];
}

const NO_CHANGES: VyOSResponse = { success: true };

function throwIfFailed(result: VyOSResponse): VyOSResponse {
  if (!result.success) {
    const error: ApiError = { message: result.error || "" };
    throw error;
  }
  return result;
}

// ============================================================================
// API Service
// ============================================================================

export class RouteService {
  async getCapabilities(): Promise<RouteCapabilitiesResponse> {
    return apiClient.get<RouteCapabilitiesResponse>("/vyos/route/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<RouteConfigResponse> {
    return apiClient.get<RouteConfigResponse>("/vyos/route/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(request: RouteBatchRequest): Promise<VyOSResponse> {
    if (request.operations.length === 0) return NO_CHANGES;
    return throwIfFailed(await apiClient.post<VyOSResponse>("/vyos/route/batch", request));
  }

  // ========================================================================
  // Policy
  // ========================================================================

  async createPolicy(policyType: RoutePolicyType, form: PolicyForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      policy_type: policyType,
      name: form.name.trim(),
      operations: policyCreateOps(form),
    });
  }

  /** Only the policy leaves the form changed are sent. */
  async updatePolicy(original: PolicyRoute, form: PolicyForm): Promise<VyOSResponse> {
    return this.batchConfigure({
      policy_type: original.policy_type,
      name: original.name,
      operations: policyUpdateOps(original, form),
    });
  }

  async deletePolicy(policy: PolicyRoute): Promise<VyOSResponse> {
    return this.batchConfigure({
      policy_type: policy.policy_type,
      name: policy.name,
      operations: policyDeleteOps(),
    });
  }

  // ========================================================================
  // Rule
  // ========================================================================

  /** Create a rule (original null) or edit one: only changed leaves are sent. */
  async saveRule(
    policyType: RoutePolicyType,
    policyName: string,
    ruleNumber: number,
    original: PolicyRouteRule | null,
    form: RouteRuleForm,
    caps: RouteCapabilitiesResponse | null,
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      rule_number: ruleNumber,
      operations: ruleSaveOps(policyType, original, form, caps),
    });
  }

  async deleteRule(policyType: RoutePolicyType, policyName: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      policy_type: policyType,
      name: policyName,
      rule_number: ruleNumber,
      operations: ruleDeleteOps(),
    });
  }

  /** New order of every rule of the policy; a rejected commit throws. */
  async reorderRules(policyType: RoutePolicyType, policyName: string, ruleNumbers: number[]): Promise<VyOSResponse> {
    return throwIfFailed(
      await apiClient.post<VyOSResponse>("/vyos/route/reorder", {
        policy_type: policyType,
        policy_name: policyName,
        rule_numbers: ruleNumbers,
      }),
    );
  }
}

export const routeService = new RouteService();
