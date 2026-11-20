import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  ospfAccessListOps,
  ospfAreaOps,
  ospfDefaultInformationOps,
  ospfDistanceOps,
  ospfGracefulRestartOps,
  ospfInterfaceOps,
  ospfMaxMetricOps,
  ospfMiscOps,
  ospfMplsTeOps,
  ospfNeighborOps,
  ospfParametersOps,
  ospfRedistributeOps,
  ospfSegmentRoutingOps,
  ospfSummaryAddressOps,
  ospfTimersOps,
  type OspfMiscDraft,
  type OspfParametersDraft,
} from "./ospf-save-ops";

// ============================================================================
// TypeScript Interfaces (matching backend Pydantic models)
// ============================================================================

export interface OspfParameters {
  router_id?: string | null;
  abr_type?: string | null;
  opaque_lsa: boolean;
  rfc1583_compatibility: boolean;
}

export interface OspfAreaRange {
  prefix: string;
  cost?: number | null;
  not_advertise: boolean;
  substitute?: string | null;
}

/** Interface or virtual-link authentication. Secrets load as ``***``. */
export interface OspfAuthentication {
  md5_key_ids: Record<string, string>;
  plaintext_password?: string | null;
  null: boolean;
}

export interface OspfVirtualLink {
  address: string;
  dead_interval?: number | null;
  hello_interval?: number | null;
  retransmit_interval?: number | null;
  retransmit_window?: number | null;
  transmit_delay?: number | null;
  authentication: OspfAuthentication;
}

export interface OspfArea {
  area_id: string;
  /** False for an area that only an interface names; it has no area node to delete. */
  configured?: boolean;
  area_type?: string | null;
  area_type_no_summary: boolean;
  area_type_default_cost?: number | null;
  area_type_translate?: string | null;
  networks: string[];
  ranges: OspfAreaRange[];
  authentication?: string | null;
  shortcut?: string | null;
  export_list?: string | null;
  import_list?: string | null;
  virtual_links: OspfVirtualLink[];
}

export interface OspfInterface {
  name: string;
  area?: string | null;
  cost?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  dead_interval?: number | null;
  retransmit_interval?: number | null;
  retransmit_window?: number | null;
  transmit_delay?: number | null;
  network?: string | null;
  passive?: boolean | null;
  passive_disable: boolean;
  bfd: boolean;
  bfd_profile?: string | null;
  mtu_ignore: boolean;
  bandwidth?: number | null;
  hello_multiplier?: number | null;
  authentication: OspfAuthentication;
  ldp_sync: boolean;
  ldp_sync_disable: boolean;
  ldp_sync_holddown?: number | null;
}

export interface OspfRedistribute {
  protocol: string;
  metric?: string | null;
  metric_type?: string | null;
  route_map?: string | null;
  table?: string | null;
}

export interface OspfDefaultInformation {
  enabled: boolean;
  always: boolean;
  metric?: number | null;
  metric_type?: number | null;
  route_map?: string | null;
}

export interface OspfDistanceOspf {
  external?: number | null;
  inter_area?: number | null;
  intra_area?: number | null;
}

export interface OspfDistance {
  global_value?: number | null;
  ospf: OspfDistanceOspf;
}

export interface OspfTimersThrottleSpf {
  delay?: number | null;
  initial_holdtime?: number | null;
  max_holdtime?: number | null;
}

export interface OspfMaxMetricRouterLsa {
  administrative: boolean;
  on_shutdown?: number | null;
  on_startup?: number | null;
}

export interface OspfGracefulRestartHelper {
  enable: boolean;
  router_ids: string[];
  no_strict_lsa_checking: boolean;
  planned_only: boolean;
  supported_grace_time?: number | null;
}

export interface OspfGracefulRestart {
  enabled: boolean;
  grace_period?: number | null;
  helper: OspfGracefulRestartHelper;
}

export interface OspfNeighbor {
  address: string;
  poll_interval?: number | null;
  priority?: number | null;
}

export interface OspfAccessList {
  acl: string;
  export: string[];
}

export interface OspfMplsTe {
  enable: boolean;
  router_address?: string | null;
}

export interface OspfSummaryAddress {
  prefix: string;
  no_advertise: boolean;
  tag?: number | null;
}

export interface OspfSegmentRoutingPrefix {
  prefix: string;
  index_value?: number | null;
  explicit_null: boolean;
  no_php_flag: boolean;
}

export interface OspfSegmentRouting {
  global_block_low?: number | null;
  global_block_high?: number | null;
  local_block_low?: number | null;
  local_block_high?: number | null;
  maximum_label_depth?: number | null;
  prefixes: OspfSegmentRoutingPrefix[];
}

export interface OspfConfig {
  parameters: OspfParameters;
  areas: OspfArea[];
  interfaces: OspfInterface[];
  redistribute: OspfRedistribute[];
  default_information: OspfDefaultInformation;
  distance: OspfDistance;
  timers_throttle_spf: OspfTimersThrottleSpf;
  max_metric_router_lsa: OspfMaxMetricRouterLsa;
  graceful_restart: OspfGracefulRestart;
  neighbors: OspfNeighbor[];
  access_lists: OspfAccessList[];
  default_metric?: number | null;
  mpls_te: OspfMplsTe;
  summary_addresses: OspfSummaryAddress[];
  segment_routing: OspfSegmentRouting;
  auto_cost_reference_bandwidth?: number | null;
  log_adjacency_changes?: boolean | null;
  log_adjacency_changes_detail: boolean;
  passive_interface_default: boolean;
  maximum_paths?: number | null;
  ldp_sync_holddown?: number | null;
  refresh_timers?: number | null;
  aggregation_timer?: number | null;
  capability_opaque: boolean;
}

interface OspfFeature {
  supported: boolean;
  description: string;
}

export interface OspfCapabilities {
  version: string;
  features: {
    parameters: OspfFeature & { abr_types: string[] };
    areas: OspfFeature & {
      area_types: string[];
      authentication_values: string[];
      shortcut_values: string[];
      nssa_translate_values: string[];
    };
    virtual_links: OspfFeature & { retransmit_window: boolean; authentication_modes: string[] };
    interfaces: OspfFeature & {
      network_types: string[];
      retransmit_window: boolean;
      authentication_modes: string[];
    };
    redistribute: OspfFeature & { protocols: string[]; metric_types: string[] };
    access_list: OspfFeature & { export_values: string[] };
    neighbors: OspfFeature;
    summary_addresses: OspfFeature;
    default_information: OspfFeature & { metric_types: string[] };
    graceful_restart: OspfFeature;
    segment_routing: OspfFeature & { prefix_flags: string[] };
    mpls_te: OspfFeature;
    max_metric: OspfFeature;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface OspfBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface OspfAdvancedDraft {
  timers: OspfTimersThrottleSpf;
  distance: OspfDistance;
  maxMetric: OspfMaxMetricRouterLsa;
  gracefulRestart: OspfGracefulRestart;
  mplsTe: OspfMplsTe;
  misc: OspfMiscDraft;
  accessLists: OspfAccessList[];
  neighbors: OspfNeighbor[];
  summaryAddresses: OspfSummaryAddress[];
  segmentRouting: OspfSegmentRouting;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

// ============================================================================
// API Service
// ============================================================================

class OspfService {
  async getCapabilities(): Promise<OspfCapabilities> {
    return apiClient.get<OspfCapabilities>("/vyos/ospf/capabilities");
  }

  async getConfig(refresh = false): Promise<OspfConfig> {
    return apiClient.get<OspfConfig>("/vyos/ospf/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * POST one batch. A rejected commit comes back as HTTP 200 with
   * ``success: false``; that throws an ApiError carrying the device error so
   * the caller stays open and shows it. An empty batch is not sent. Callers
   * reload with getConfig(true), which re-reads the device.
   */
  async batchConfigure(operations: OspfBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/ospf/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  // ==========================================================================
  // Areas
  // ==========================================================================

  async createArea(area: OspfArea, retransmitWindow: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(ospfAreaOps(null, area, { retransmitWindow }));
  }

  async updateArea(original: OspfArea, updated: OspfArea, retransmitWindow: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(ospfAreaOps(original, updated, { retransmitWindow }));
  }

  async deleteArea(areaId: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_area", value: areaId }]);
  }

  // ==========================================================================
  // Interfaces
  // ==========================================================================

  async createInterface(iface: OspfInterface, retransmitWindow: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(ospfInterfaceOps(null, iface, { retransmitWindow }));
  }

  async updateInterface(
    original: OspfInterface,
    updated: OspfInterface,
    retransmitWindow: boolean,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ospfInterfaceOps(original, updated, { retransmitWindow }));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_interface", value: name }]);
  }

  // ==========================================================================
  // Redistribute
  // ==========================================================================

  async addRedistribute(entry: OspfRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ospfRedistributeOps(null, entry));
  }

  async updateRedistribute(original: OspfRedistribute, updated: OspfRedistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ospfRedistributeOps(original, updated));
  }

  async removeRedistribute(entry: OspfRedistribute): Promise<VyOSResponse> {
    if (entry.protocol === "table" && entry.table) {
      return this.batchConfigure([{ op: "delete_redistribute_table", value: entry.table }]);
    }
    return this.batchConfigure([{ op: "delete_redistribute", value: entry.protocol }]);
  }

  // ==========================================================================
  // Overview
  // ==========================================================================

  async updateParameters(original: OspfConfig, updated: OspfParametersDraft): Promise<VyOSResponse> {
    return this.batchConfigure(ospfParametersOps(original, updated));
  }

  async updateDefaultInformation(
    original: OspfDefaultInformation,
    updated: OspfDefaultInformation,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ospfDefaultInformationOps(original, updated));
  }

  async deleteOspf(): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_ospf" }]);
  }

  // ==========================================================================
  // Advanced
  // ==========================================================================

  /**
   * Save the advanced tab. Segment routing needs a first commit that drops
   * prefix-SID flags before those prefixes can be removed; everything else
   * goes in one batch.
   */
  async updateAdvanced(original: OspfConfig, updated: OspfAdvancedDraft): Promise<VyOSResponse> {
    const sr = ospfSegmentRoutingOps(original.segment_routing, updated.segmentRouting);
    const ops = [
      ...ospfTimersOps(original.timers_throttle_spf, updated.timers),
      ...ospfDistanceOps(original.distance, updated.distance),
      ...ospfMaxMetricOps(original.max_metric_router_lsa, updated.maxMetric),
      ...ospfGracefulRestartOps(original.graceful_restart, updated.gracefulRestart),
      ...ospfMplsTeOps(original.mpls_te, updated.mplsTe),
      ...ospfMiscOps(original, updated.misc),
      ...ospfAccessListOps(original.access_lists, updated.accessLists),
      ...ospfNeighborOps(original.neighbors, updated.neighbors),
      ...ospfSummaryAddressOps(original.summary_addresses, updated.summaryAddresses),
      ...sr.second,
    ];
    await this.batchConfigure(sr.first);
    return this.batchConfigure(ops);
  }
}

export const ospfService = new OspfService();
