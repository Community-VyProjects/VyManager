import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  isisDefaultInfoOps,
  isisDeleteDefaultInfoOps,
  isisDeleteInterfaceOps,
  isisDeleteIsisOps,
  isisDeleteRedistributeOps,
  isisGeneralOps,
  isisInterfaceOps,
  isisLoadSharingOps,
  isisPriorityLimitOps,
  isisRedistributeOps,
  isisRemotePrefixListOps,
  isisSegmentRoutingOps,
  isisSpfDelayOps,
  isisTeOps,
  isisTiebreakerOps,
  isisTimersOps,
  type IsisDefaultInfoForm,
  type IsisFamily,
  type IsisGeneralForm,
  type IsisInterfaceForm,
  type IsisRedistributeForm,
  type IsisSegmentRoutingForm,
  type IsisSpfDelayForm,
  type IsisTeForm,
  type IsisTimersForm,
} from "./isis-save-ops";

// ============================================================================
// Response / Config Types (GET /vyos/isis/config, backend/routers/isis/isis.py)
// ============================================================================

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface IsisSpfDelayIetf {
  init_delay: number | null;
  short_delay: number | null;
  long_delay: number | null;
  holddown: number | null;
  time_to_learn: number | null;
}

export interface IsisGlobalConfig {
  net: string[];
  level: string | null;
  metric_style: string | null;
  dynamic_hostname: boolean;
  purge_originator: boolean;
  advertise_passive_only: boolean;
  advertise_high_metrics: boolean;
  set_attached_bit: boolean;
  set_overload_bit: boolean;
  log_adjacency_changes: boolean;
  topology: string | null;
  lsp_mtu: number | null;
  lsp_gen_interval: number | null;
  lsp_refresh_interval: number | null;
  max_lsp_lifetime: number | null;
  spf_interval: number | null;
  /** "***" when set, null when absent. Never the secret. */
  area_password_md5: string | null;
  area_password_plaintext: string | null;
  domain_password_md5: string | null;
  domain_password_plaintext: string | null;
  ldp_sync_holddown: number | null;
  spf_delay_ietf: IsisSpfDelayIetf;
}

export interface IsisInterfaceLfa {
  level1_enabled: boolean;
  level1_exclude_interfaces: string[];
  level2_enabled: boolean;
  level2_exclude_interfaces: string[];
}

export interface IsisInterfaceTiLfa {
  enabled: boolean;
  level1_enabled: boolean;
  level1_node_protection: boolean;
  level1_link_fallback: boolean;
  level2_enabled: boolean;
  level2_node_protection: boolean;
  level2_link_fallback: boolean;
}

export interface IsisInterfaceRemoteLfa {
  level1_enabled: boolean;
  level1_max_metric: number | null;
  level1_tunnel_mpls_ldp: boolean;
  level2_enabled: boolean;
  level2_max_metric: number | null;
  level2_tunnel_mpls_ldp: boolean;
}

export interface IsisInterface {
  name: string;
  circuit_type: string | null;
  metric: number | null;
  hello_interval: number | null;
  hello_multiplier: number | null;
  hello_padding: boolean;
  passive: boolean;
  point_to_point: boolean;
  priority: number | null;
  psnp_interval: number | null;
  no_three_way_handshake: boolean;
  /** "***" when set, null when absent. Never the secret. */
  password_md5: string | null;
  password_plaintext: string | null;
  bfd: boolean;
  bfd_profile: string | null;
  ldp_sync_holddown: number | null;
  ldp_sync_disable: boolean;
  lfa: IsisInterfaceLfa;
  ti_lfa: IsisInterfaceTiLfa;
  remote_lfa: IsisInterfaceRemoteLfa;
}

export interface IsisRedistributeEntry {
  protocol: string;
  level: string;
  metric: number | null;
  route_map: string | null;
}

export interface IsisDefaultInfoEntry {
  level: string;
  always: boolean;
  metric: number | null;
  route_map: string | null;
}

export interface IsisSrPrefix {
  prefix: string;
  index_value: number | null;
  index_explicit_null: boolean;
  index_no_php: boolean;
  absolute_value: number | null;
  absolute_explicit_null: boolean;
  absolute_no_php: boolean;
}

export interface IsisSrv6NodeMsd {
  max_end_d: number | null;
  max_end_pop: number | null;
  max_h_encaps: number | null;
  max_segs_left: number | null;
}

export interface IsisSegmentRouting {
  global_block_low: number | null;
  global_block_high: number | null;
  local_block_low: number | null;
  local_block_high: number | null;
  maximum_label_depth: number | null;
  prefixes: IsisSrPrefix[];
  srv6_locator: string | null;
  srv6_interface: string | null;
  srv6_node_msd: IsisSrv6NodeMsd;
}

export interface IsisTrafficEngineering {
  enabled: boolean;
  address: string | null;
  export: boolean;
}

export interface IsisFrrPriorityLimit {
  priority: string;
  level: string;
}

export interface IsisFrrTiebreaker {
  tb_type: string;
  index: string;
  level: string;
}

export interface IsisFrrRemotePrefixList {
  prefix_list: string;
  level: string;
}

export interface IsisFrrGlobal {
  lfa_load_sharing_disable_level1: boolean;
  lfa_load_sharing_disable_level2: boolean;
  lfa_priority_limit: IsisFrrPriorityLimit[];
  lfa_tiebreaker: IsisFrrTiebreaker[];
  lfa_remote_prefix_list: IsisFrrRemotePrefixList[];
}

export interface IsisConfig {
  /** Key membership of ``protocols isis``; a bare node is enabled. */
  enabled: boolean;
  global_config: IsisGlobalConfig;
  interfaces: IsisInterface[];
  redistribute_ipv4: IsisRedistributeEntry[];
  redistribute_ipv6: IsisRedistributeEntry[];
  default_info_ipv4: IsisDefaultInfoEntry[];
  default_info_ipv6: IsisDefaultInfoEntry[];
  segment_routing: IsisSegmentRouting;
  traffic_engineering: IsisTrafficEngineering;
  fast_reroute: IsisFrrGlobal;
  /** Configured ``protocols segment-routing srv6 locator`` names. */
  srv6_locator_names: string[];
}

export interface IsisFeature {
  supported: boolean;
  description: string;
}

export interface IsisValuesFeature extends IsisFeature {
  values: string[];
}

export interface IsisCapabilities {
  version: string;
  features: {
    isis: IsisFeature;
    segment_routing: IsisFeature;
    interface_fast_reroute: IsisFeature;
    srv6: IsisFeature;
    te_export: IsisFeature;
    redistribute_nhrp: IsisFeature;
    lfa_priority_limit: IsisValuesFeature;
    lfa_tiebreaker: IsisValuesFeature;
    lfa_remote_prefix_list: IsisFeature;
  };
  lsp_refresh_interval: { min: number; max: number };
  area_password_modes: string[];
  domain_password_modes: string[];
  srv6_node_msd_types: string[];
  redistribute_protocols: {
    ipv4: string[];
    ipv6: string[];
  };
  instance_name?: string | null;
  instance_id?: string | number | null;
}

// ============================================================================
// Service. Every op comes from isis-save-ops.ts; this file only sends them.
// ============================================================================

const NO_CHANGES: VyOSResponse = { success: true, data: null };

class IsisService {
  /** Skips an empty batch; a rejected commit throws the device error. */
  async batchConfigure(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/isis/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async getCapabilities(): Promise<IsisCapabilities> {
    return apiClient.get<IsisCapabilities>("/vyos/isis/capabilities");
  }

  async getConfig(refresh = false): Promise<IsisConfig> {
    return apiClient.get<IsisConfig>("/vyos/isis/config", {
      refresh: refresh.toString(),
    });
  }

  async deleteIsis(): Promise<VyOSResponse> {
    return this.batchConfigure(isisDeleteIsisOps());
  }

  // -------------------------------------------------------------------------
  // Global sections
  // -------------------------------------------------------------------------

  async updateGeneral(original: IsisGlobalConfig, form: IsisGeneralForm): Promise<VyOSResponse> {
    return this.batchConfigure(isisGeneralOps(original, form));
  }

  async updateTimers(original: IsisGlobalConfig, form: IsisTimersForm): Promise<VyOSResponse> {
    return this.batchConfigure(isisTimersOps(original, form));
  }

  async updateSpfDelay(original: IsisSpfDelayIetf, form: IsisSpfDelayForm): Promise<VyOSResponse> {
    return this.batchConfigure(isisSpfDelayOps(original, form));
  }

  async updateSegmentRouting(
    original: IsisSegmentRouting,
    form: IsisSegmentRoutingForm,
    opts: { srv6: boolean; msdTypes: string[] },
  ): Promise<VyOSResponse> {
    return this.batchConfigure(isisSegmentRoutingOps(original, form, opts));
  }

  async updateTrafficEngineering(
    original: IsisTrafficEngineering,
    form: IsisTeForm,
    opts: { teExport: boolean },
  ): Promise<VyOSResponse> {
    return this.batchConfigure(isisTeOps(original, form, opts));
  }

  // -------------------------------------------------------------------------
  // Interfaces
  // -------------------------------------------------------------------------

  async createInterface(form: IsisInterfaceForm, opts: { fastReroute: boolean }): Promise<VyOSResponse> {
    return this.batchConfigure(isisInterfaceOps(null, form, opts));
  }

  async updateInterface(
    original: IsisInterface,
    form: IsisInterfaceForm,
    opts: { fastReroute: boolean },
  ): Promise<VyOSResponse> {
    return this.batchConfigure(isisInterfaceOps(original, form, opts));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisDeleteInterfaceOps(name));
  }

  // -------------------------------------------------------------------------
  // Redistribute / default-information
  // -------------------------------------------------------------------------

  async saveRedistribute(
    family: IsisFamily,
    original: IsisRedistributeEntry | null,
    form: IsisRedistributeForm,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(isisRedistributeOps(family, original, form));
  }

  async deleteRedistribute(family: IsisFamily, entry: IsisRedistributeEntry): Promise<VyOSResponse> {
    return this.batchConfigure(isisDeleteRedistributeOps(family, entry));
  }

  async saveDefaultInfo(
    family: IsisFamily,
    original: IsisDefaultInfoEntry | null,
    form: IsisDefaultInfoForm,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(isisDefaultInfoOps(family, original, form));
  }

  async deleteDefaultInfo(family: IsisFamily, entry: IsisDefaultInfoEntry): Promise<VyOSResponse> {
    return this.batchConfigure(isisDeleteDefaultInfoOps(family, entry));
  }

  // -------------------------------------------------------------------------
  // Global fast-reroute LFA
  // -------------------------------------------------------------------------

  async setFrrLoadSharingDisable(level: string, disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(isisLoadSharingOps(level, disabled));
  }

  async addFrrPriorityLimit(priority: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisPriorityLimitOps("set", priority, level));
  }

  async deleteFrrPriorityLimit(priority: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisPriorityLimitOps("delete", priority, level));
  }

  async addFrrTiebreaker(tbType: string, index: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisTiebreakerOps("set", tbType, index, level));
  }

  async deleteFrrTiebreaker(tbType: string, index: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisTiebreakerOps("delete", tbType, index, level));
  }

  async addFrrRemotePrefixList(prefixList: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisRemotePrefixListOps("set", prefixList, level));
  }

  async deleteFrrRemotePrefixList(prefixList: string, level: string): Promise<VyOSResponse> {
    return this.batchConfigure(isisRemotePrefixListOps("delete", prefixList, level));
  }
}

export const isisService = new IsisService();
