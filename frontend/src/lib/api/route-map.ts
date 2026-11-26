import { apiClient } from "./client";
import type { ApiError, VyOSResponse } from "@/lib/types/api";
import {
  mapCreateOps,
  mapDeleteOps,
  mapUpdateOps,
  ruleDeleteOps,
  ruleSaveOps,
  type RouteMapForm,
  type RouteMapRuleForm,
} from "./route-map-save-ops";

// ============================================================================
// Config (GET /vyos/route-map/config)
// ============================================================================

/** Rule match leaves. */
export interface MatchConditions {
  as_path: string | null;
  community_list: string | null;
  community_exact_match: boolean;
  extcommunity: string | null;
  large_community_list: string | null;
  local_preference: number | null;
  metric: number | null;
  origin: string | null;
  peer: string | null;
  rpki: string | null;
  /** Only devices whose capabilities report `match_rpki_extcommunity`. */
  rpki_extcommunity: string | null;
  /** Only devices whose capabilities report `match_source_peer`. */
  source_peer: string | null;

  evpn_default_route: boolean;
  evpn_rd: string | null;
  evpn_route_type: string | null;
  evpn_vni: number | null;

  ip_address_access_list: string | null;
  ip_address_prefix_list: string | null;
  ip_address_prefix_len: number | null;
  ipv6_address_access_list: string | null;
  ipv6_address_prefix_list: string | null;
  ipv6_address_prefix_len: number | null;

  ip_nexthop_access_list: string | null;
  ip_nexthop_address: string | null;
  ip_nexthop_prefix_len: number | null;
  ip_nexthop_prefix_list: string | null;
  ip_nexthop_type: string | null;
  ipv6_nexthop_access_list: string | null;
  ipv6_nexthop_address: string | null;
  ipv6_nexthop_prefix_list: string | null;
  ipv6_nexthop_type: string | null;

  ip_route_source_access_list: string | null;
  ip_route_source_prefix_list: string | null;

  interface: string | null;
  protocol: string | null;
  source_vrf: string | null;
  tag: number | null;
}

/** Rule set leaves. A `multi:` leaf is a list (`[]` when absent). */
export interface SetActions {
  as_path_exclude: string | null;
  as_path_prepend: string | null;
  as_path_prepend_last_as: number | null;

  community_add_values: string[];
  community_replace_values: string[];
  /** `set community delete`: one community-list name. */
  community_delete: string | null;
  /** `set community none`. */
  community_remove_all: boolean;
  large_community_add_values: string[];
  large_community_replace_values: string[];
  /** `set large-community delete`: one large-community-list name. */
  large_community_delete: string | null;
  /** `set large-community none`. */
  large_community_remove_all: boolean;
  extcommunity_bandwidth: string | null;
  extcommunity_bandwidth_non_transitive: boolean;
  extcommunity_rt: string[];
  extcommunity_soo: string[];
  extcommunity_none: boolean;

  atomic_aggregate: boolean;
  aggregator_as: string | null;
  aggregator_ip: string | null;
  local_preference: number | null;
  origin: string | null;
  originator_id: string | null;
  weight: number | null;

  /** `set ip-next-hop` is one leaf: an address, or one of the two flags. */
  ip_nexthop: string | null;
  ip_nexthop_peer_address: boolean;
  ip_nexthop_unchanged: boolean;
  ipv6_nexthop_global: string | null;
  ipv6_nexthop_local: string | null;
  ipv6_nexthop_peer_address: boolean;
  ipv6_nexthop_prefer_global: boolean;
  l3vpn_nexthop_encapsulation_gre: boolean;

  evpn_gateway_ipv4: string | null;
  evpn_gateway_ipv6: string | null;

  distance: number | null;
  metric: string | null;
  metric_type: string | null;
  src: string | null;
  table: number | null;
  tag: number | null;
}

export interface RouteMapRule {
  rule_number: number;
  description: string | null;
  action: string;
  call: string | null;
  continue_rule: number | null;
  on_match_goto: number | null;
  on_match_next: boolean;
  match: MatchConditions;
  set: SetActions;
}

export interface RouteMap {
  name: string;
  description: string | null;
  rules: RouteMapRule[];
}

export interface RouteMapConfig {
  route_maps: RouteMap[];
  total: number;
}

// ============================================================================
// Capabilities (GET /vyos/route-map/capabilities)
// ============================================================================

export interface RouteMapRange {
  min: number;
  max: number;
}

export type RouteMapRangeKey =
  | "rule"
  | "continue"
  | "on_match_goto"
  | "match_local_preference"
  | "match_metric"
  | "match_tag"
  | "ip_prefix_len"
  | "ipv6_prefix_len"
  | "aggregator_as"
  | "as_number"
  | "as_path_prepend_last_as"
  | "distance"
  | "local_preference"
  | "weight"
  | "metric"
  | "tag"
  | "extcommunity_bandwidth"
  | "community_part"
  | "large_community_part"
  | "extcommunity_asn"
  | "extcommunity_asn_value"
  | "extcommunity_ip_value"
  | "evpn_vni"
  | "table";

interface RouteMapFeature {
  supported: boolean;
  description: string;
}

export interface RouteMapCapabilities {
  version: string;
  features: {
    basic: RouteMapFeature;
    rules: RouteMapFeature;
    match_conditions: RouteMapFeature;
    match_rpki_extcommunity: RouteMapFeature;
    match_source_peer: RouteMapFeature;
    match_evpn: RouteMapFeature & {
      route_types: string[];
      vni_min: number;
      vni_max: number;
    };
    set_actions: RouteMapFeature;
    bgp_attributes: RouteMapFeature;
    call_continue: RouteMapFeature;
    on_match: RouteMapFeature;
  };
  values: {
    rule_actions: string[];
    origins: string[];
    rpki_states: string[];
    metric_types: string[];
    protocols: string[];
    nexthop_types: string[];
    evpn_route_types: string[];
    extcommunity_bandwidth_keywords: string[];
    community_well_known: string[];
  };
  ranges: Record<RouteMapRangeKey, RouteMapRange>;
  /** IPv4 access-list numbers a `match ip ... access-list` takes. */
  ip_access_list_ranges: RouteMapRange[];
  description_max_length: number;
  /** The device rejects `set as-path prepend` together with `prepend-last-as`. */
  as_path_prepend_exclusive: boolean;
  instance_name?: string;
  instance_id?: string;
}

// ============================================================================
// Batch (POST /vyos/route-map/batch)
// ============================================================================

export interface RouteMapBatchOperation {
  op: string;
  value?: string;
}

/**
 * One commit on one route-map. Rule ops need rule_number; route-map ops
 * (`set_route_map`, `delete_route_map`, the description) take none.
 */
export interface RouteMapBatchRequest {
  name: string;
  rule_number?: number;
  operations: RouteMapBatchOperation[];
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

export class RouteMapService {
  async getCapabilities(): Promise<RouteMapCapabilities> {
    return apiClient.get<RouteMapCapabilities>("/vyos/route-map/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<RouteMapConfig> {
    return apiClient.get<RouteMapConfig>("/vyos/route-map/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(request: RouteMapBatchRequest): Promise<VyOSResponse> {
    if (request.operations.length === 0) return NO_CHANGES;
    return throwIfFailed(await apiClient.post<VyOSResponse>("/vyos/route-map/batch", request));
  }

  // ========================================================================
  // Route-map
  // ========================================================================

  async createRouteMap(form: RouteMapForm): Promise<VyOSResponse> {
    return this.batchConfigure({ name: form.name.trim(), operations: mapCreateOps(form) });
  }

  /** Only the route-map leaves the form changed are sent. */
  async updateRouteMap(original: RouteMap, form: RouteMapForm): Promise<VyOSResponse> {
    return this.batchConfigure({ name: original.name, operations: mapUpdateOps(original, form) });
  }

  async deleteRouteMap(routeMap: RouteMap): Promise<VyOSResponse> {
    return this.batchConfigure({ name: routeMap.name, operations: mapDeleteOps() });
  }

  // ========================================================================
  // Rule
  // ========================================================================

  /** Create a rule (original null) or edit one: only changed leaves are sent. */
  async saveRule(
    routeMapName: string,
    ruleNumber: number,
    original: RouteMapRule | null,
    form: RouteMapRuleForm,
    caps: RouteMapCapabilities | null,
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      name: routeMapName,
      rule_number: ruleNumber,
      operations: ruleSaveOps(original, form, caps),
    });
  }

  async deleteRule(routeMapName: string, ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure({ name: routeMapName, rule_number: ruleNumber, operations: ruleDeleteOps() });
  }

  /** New order of every rule of the route-map; a rejected commit throws. */
  async reorderRules(routeMapName: string, ruleNumbers: number[]): Promise<VyOSResponse> {
    return throwIfFailed(
      await apiClient.post<VyOSResponse>("/vyos/route-map/reorder", {
        name: routeMapName,
        rule_numbers: ruleNumbers,
      }),
    );
  }
}

export const routeMapService = new RouteMapService();
