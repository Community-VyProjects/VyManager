import { apiClient } from "./client";

// ============================================================================
// Response / Config Types
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

export interface IsisSegmentRouting {
  global_block_low: number | null;
  global_block_high: number | null;
  local_block_low: number | null;
  local_block_high: number | null;
  maximum_label_depth: number | null;
  prefixes: IsisSrPrefix[];
  srv6_locator: string | null;
}

export interface IsisTrafficEngineering {
  enabled: boolean;
  address: string | null;
  export: boolean;
}

export interface IsisFrrGlobal {
  lfa_load_sharing_disable_level1: boolean;
  lfa_load_sharing_disable_level2: boolean;
}

export interface IsisConfig {
  enabled: boolean;
  global_config: IsisGlobalConfig;
  interfaces: IsisInterface[];
  redistribute_ipv4: IsisRedistributeEntry[];
  default_info_ipv4: IsisDefaultInfoEntry[];
  segment_routing: IsisSegmentRouting;
  traffic_engineering: IsisTrafficEngineering;
  fast_reroute: IsisFrrGlobal;
}

export interface IsisCapabilities {
  version: string;
  features: {
    isis: { supported: boolean; description: string };
    segment_routing: { supported: boolean; description: string };
    ti_lfa: { supported: boolean; description: string };
    remote_lfa: { supported: boolean; description: string };
    srv6: { supported: boolean; description: string };
    te_export: { supported: boolean; description: string };
    lsp_refresh_min_1: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
}

// ============================================================================
// Service
// ============================================================================

class IsisService {
  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/isis/batch", { operations });
    if (!result.success) {
      throw new Error(result.error || "IS-IS operation failed");
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

  // -------------------------------------------------------------------------
  // Global config
  // -------------------------------------------------------------------------

  async updateGlobalConfig(
    current: IsisGlobalConfig,
    next: {
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
      lsp_mtu: string;
      lsp_gen_interval: string;
      lsp_refresh_interval: string;
      max_lsp_lifetime: string;
      spf_interval: string;
      ldp_sync_holddown: string;
    }
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // NET addresses — remove old ones, add new ones
    for (const net of current.net) {
      if (!next.net.includes(net)) {
        ops.push({ op: "delete_net", value: net });
      }
    }
    for (const net of next.net) {
      if (!current.net.includes(net)) {
        ops.push({ op: "set_net", value: net });
      }
    }

    // Level
    if (next.level && next.level !== current.level) {
      ops.push({ op: "set_level", value: next.level });
    } else if (!next.level && current.level) {
      ops.push({ op: "delete_level" });
    }

    // Metric style
    if (next.metric_style && next.metric_style !== current.metric_style) {
      ops.push({ op: "set_metric_style", value: next.metric_style });
    } else if (!next.metric_style && current.metric_style) {
      ops.push({ op: "delete_metric_style" });
    }

    // Boolean flags
    if (next.dynamic_hostname !== current.dynamic_hostname) {
      ops.push({ op: next.dynamic_hostname ? "set_dynamic_hostname" : "delete_dynamic_hostname" });
    }
    if (next.purge_originator !== current.purge_originator) {
      ops.push({ op: next.purge_originator ? "set_purge_originator" : "delete_purge_originator" });
    }
    if (next.advertise_passive_only !== current.advertise_passive_only) {
      ops.push({ op: next.advertise_passive_only ? "set_advertise_passive_only" : "delete_advertise_passive_only" });
    }
    if (next.advertise_high_metrics !== current.advertise_high_metrics) {
      ops.push({ op: next.advertise_high_metrics ? "set_advertise_high_metrics" : "delete_advertise_high_metrics" });
    }
    if (next.set_attached_bit !== current.set_attached_bit) {
      ops.push({ op: next.set_attached_bit ? "set_attached_bit" : "delete_attached_bit" });
    }
    if (next.set_overload_bit !== current.set_overload_bit) {
      ops.push({ op: next.set_overload_bit ? "set_overload_bit" : "delete_overload_bit" });
    }
    if (next.log_adjacency_changes !== current.log_adjacency_changes) {
      ops.push({ op: next.log_adjacency_changes ? "set_log_adjacency_changes" : "delete_log_adjacency_changes" });
    }

    // Numeric/string values
    const numericFields: Array<{
      key: keyof typeof next;
      setOp: string;
      deleteOp: string;
      currentVal: number | null;
    }> = [
      { key: "lsp_mtu", setOp: "set_lsp_mtu", deleteOp: "delete_lsp_mtu", currentVal: current.lsp_mtu },
      { key: "lsp_gen_interval", setOp: "set_lsp_gen_interval", deleteOp: "delete_lsp_gen_interval", currentVal: current.lsp_gen_interval },
      { key: "lsp_refresh_interval", setOp: "set_lsp_refresh_interval", deleteOp: "delete_lsp_refresh_interval", currentVal: current.lsp_refresh_interval },
      { key: "max_lsp_lifetime", setOp: "set_max_lsp_lifetime", deleteOp: "delete_max_lsp_lifetime", currentVal: current.max_lsp_lifetime },
      { key: "spf_interval", setOp: "set_spf_interval", deleteOp: "delete_spf_interval", currentVal: current.spf_interval },
      { key: "ldp_sync_holddown", setOp: "set_ldp_sync_holddown", deleteOp: "delete_ldp_sync", currentVal: current.ldp_sync_holddown },
    ];

    for (const field of numericFields) {
      const val = (next[field.key] as string).trim();
      const currentStr = field.currentVal != null ? String(field.currentVal) : "";
      if (val && val !== currentStr) {
        ops.push({ op: field.setOp, value: val });
      } else if (!val && field.currentVal != null) {
        ops.push({ op: field.deleteOp });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async updateSpfDelayIetf(
    current: IsisSpfDelayIetf,
    next: { init_delay: string; short_delay: string; long_delay: string; holddown: string; time_to_learn: string }
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    const anySet = next.init_delay.trim() || next.short_delay.trim() || next.long_delay.trim() || next.holddown.trim() || next.time_to_learn.trim();
    const hadAny = current.init_delay != null || current.short_delay != null || current.long_delay != null || current.holddown != null || current.time_to_learn != null;

    if (!anySet && hadAny) {
      ops.push({ op: "delete_spf_delay_ietf" });
    } else if (anySet) {
      if (next.init_delay.trim()) ops.push({ op: "set_spf_delay_ietf_init_delay", value: next.init_delay.trim() });
      if (next.short_delay.trim()) ops.push({ op: "set_spf_delay_ietf_short_delay", value: next.short_delay.trim() });
      if (next.long_delay.trim()) ops.push({ op: "set_spf_delay_ietf_long_delay", value: next.long_delay.trim() });
      if (next.holddown.trim()) ops.push({ op: "set_spf_delay_ietf_holddown", value: next.holddown.trim() });
      if (next.time_to_learn.trim()) ops.push({ op: "set_spf_delay_ietf_time_to_learn", value: next.time_to_learn.trim() });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  // -------------------------------------------------------------------------
  // Interfaces
  // -------------------------------------------------------------------------

  async createInterface(iface: IsisInterface): Promise<VyOSResponse> {
    const ops = this.buildInterfaceOps(iface);
    return this.batch(ops);
  }

  async updateInterface(existing: IsisInterface, next: IsisInterface): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    // Delete and recreate the interface for simplicity
    ops.push({ op: "delete_interface", value: existing.name });
    ops.push(...this.buildInterfaceOps(next));
    return this.batch(ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_interface", value: name }]);
  }

  private buildInterfaceOps(iface: IsisInterface): BatchOperation[] {
    const ops: BatchOperation[] = [];
    ops.push({ op: "set_interface", value: iface.name });

    if (iface.circuit_type) ops.push({ op: "set_interface_circuit_type", value: `${iface.name},${iface.circuit_type}` });
    if (iface.metric != null) ops.push({ op: "set_interface_metric", value: `${iface.name},${iface.metric}` });
    if (iface.hello_interval != null) ops.push({ op: "set_interface_hello_interval", value: `${iface.name},${iface.hello_interval}` });
    if (iface.hello_multiplier != null) ops.push({ op: "set_interface_hello_multiplier", value: `${iface.name},${iface.hello_multiplier}` });
    if (iface.hello_padding) ops.push({ op: "set_interface_hello_padding", value: iface.name });
    if (iface.passive) ops.push({ op: "set_interface_passive", value: iface.name });
    if (iface.point_to_point) ops.push({ op: "set_interface_point_to_point", value: iface.name });
    if (iface.priority != null) ops.push({ op: "set_interface_priority", value: `${iface.name},${iface.priority}` });
    if (iface.psnp_interval != null) ops.push({ op: "set_interface_psnp_interval", value: `${iface.name},${iface.psnp_interval}` });
    if (iface.no_three_way_handshake) ops.push({ op: "set_interface_no_three_way_handshake", value: iface.name });
    if (iface.bfd) ops.push({ op: "set_interface_bfd", value: iface.name });
    if (iface.bfd_profile) ops.push({ op: "set_interface_bfd_profile", value: `${iface.name},${iface.bfd_profile}` });
    if (iface.ldp_sync_holddown != null) ops.push({ op: "set_interface_ldp_sync_holddown", value: `${iface.name},${iface.ldp_sync_holddown}` });
    if (iface.ldp_sync_disable) ops.push({ op: "set_interface_ldp_sync_disable", value: iface.name });
    if (iface.password_md5) ops.push({ op: "set_interface_password_md5", value: `${iface.name},${iface.password_md5}` });
    if (iface.password_plaintext) ops.push({ op: "set_interface_password_plaintext", value: `${iface.name},${iface.password_plaintext}` });

    // LFA
    if (iface.lfa.level1_enabled) ops.push({ op: "set_interface_lfa_level1", value: iface.name });
    if (iface.lfa.level2_enabled) ops.push({ op: "set_interface_lfa_level2", value: iface.name });

    // TI-LFA (v1.5+)
    if (iface.ti_lfa.level1_enabled) ops.push({ op: "set_interface_ti_lfa_level1", value: iface.name });
    if (iface.ti_lfa.level1_node_protection) ops.push({ op: "set_interface_ti_lfa_level1_node_protection", value: iface.name });
    if (iface.ti_lfa.level1_link_fallback) ops.push({ op: "set_interface_ti_lfa_level1_link_fallback", value: iface.name });
    if (iface.ti_lfa.level2_enabled) ops.push({ op: "set_interface_ti_lfa_level2", value: iface.name });
    if (iface.ti_lfa.level2_node_protection) ops.push({ op: "set_interface_ti_lfa_level2_node_protection", value: iface.name });
    if (iface.ti_lfa.level2_link_fallback) ops.push({ op: "set_interface_ti_lfa_level2_link_fallback", value: iface.name });

    // Remote LFA (v1.5+)
    if (iface.remote_lfa.level1_enabled) ops.push({ op: "set_interface_remote_lfa_level1", value: iface.name });
    if (iface.remote_lfa.level1_max_metric != null) ops.push({ op: "set_interface_remote_lfa_level1_max_metric", value: `${iface.name},${iface.remote_lfa.level1_max_metric}` });
    if (iface.remote_lfa.level1_tunnel_mpls_ldp) ops.push({ op: "set_interface_remote_lfa_level1_tunnel_mpls_ldp", value: iface.name });
    if (iface.remote_lfa.level2_enabled) ops.push({ op: "set_interface_remote_lfa_level2", value: iface.name });
    if (iface.remote_lfa.level2_max_metric != null) ops.push({ op: "set_interface_remote_lfa_level2_max_metric", value: `${iface.name},${iface.remote_lfa.level2_max_metric}` });
    if (iface.remote_lfa.level2_tunnel_mpls_ldp) ops.push({ op: "set_interface_remote_lfa_level2_tunnel_mpls_ldp", value: iface.name });

    return ops;
  }

  // -------------------------------------------------------------------------
  // Redistribute
  // -------------------------------------------------------------------------

  async addRedistribute(entry: IsisRedistributeEntry): Promise<VyOSResponse> {
    const key = `${entry.protocol}|${entry.level}`;
    const ops: BatchOperation[] = [{ op: "set_redistribute_ipv4", value: key }];
    if (entry.metric != null) ops.push({ op: "set_redistribute_ipv4_metric", value: `${key},${entry.metric}` });
    if (entry.route_map) ops.push({ op: "set_redistribute_ipv4_route_map", value: `${key},${entry.route_map}` });
    return this.batch(ops);
  }

  async deleteRedistribute(entry: IsisRedistributeEntry): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_redistribute_ipv4", value: `${entry.protocol}|${entry.level}` }]);
  }

  // -------------------------------------------------------------------------
  // Default Information
  // -------------------------------------------------------------------------

  async addDefaultInfo(entry: IsisDefaultInfoEntry): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_default_info_ipv4", value: entry.level }];
    if (entry.always) ops.push({ op: "set_default_info_ipv4_always", value: entry.level });
    if (entry.metric != null) ops.push({ op: "set_default_info_ipv4_metric", value: `${entry.level},${entry.metric}` });
    if (entry.route_map) ops.push({ op: "set_default_info_ipv4_route_map", value: `${entry.level},${entry.route_map}` });
    return this.batch(ops);
  }

  async deleteDefaultInfo(entry: IsisDefaultInfoEntry): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_default_info_ipv4", value: entry.level }]);
  }

  // -------------------------------------------------------------------------
  // Segment Routing
  // -------------------------------------------------------------------------

  async updateSegmentRouting(
    current: IsisSegmentRouting,
    next: { global_block_low: string; global_block_high: string; local_block_low: string; local_block_high: string; maximum_label_depth: string }
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    const numFields: Array<{ key: keyof typeof next; setOp: string; deleteOp: string; cur: number | null }> = [
      { key: "global_block_low", setOp: "set_sr_global_block_low", deleteOp: "delete_sr_global_block", cur: current.global_block_low },
      { key: "global_block_high", setOp: "set_sr_global_block_high", deleteOp: "delete_sr_global_block", cur: current.global_block_high },
      { key: "local_block_low", setOp: "set_sr_local_block_low", deleteOp: "delete_sr_local_block", cur: current.local_block_low },
      { key: "local_block_high", setOp: "set_sr_local_block_high", deleteOp: "delete_sr_local_block", cur: current.local_block_high },
      { key: "maximum_label_depth", setOp: "set_sr_maximum_label_depth", deleteOp: "delete_sr_maximum_label_depth", cur: current.maximum_label_depth },
    ];

    for (const f of numFields) {
      const v = (next[f.key] as string).trim();
      if (v) ops.push({ op: f.setOp, value: v });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }
}

export const isisService = new IsisService();
