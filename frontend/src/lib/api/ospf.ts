import { apiClient } from "./client";

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

export interface OspfVirtualLink {
  address: string;
  dead_interval?: number | null;
  hello_interval?: number | null;
  retransmit_interval?: number | null;
  transmit_delay?: number | null;
}

export interface OspfArea {
  area_id: string;
  area_type?: string | null;
  area_type_no_summary: boolean;
  area_type_default_cost?: number | null;
  networks: string[];
  ranges: OspfAreaRange[];
  authentication?: string | null;
  shortcut?: string | null;
  export_list?: string | null;
  import_list?: string | null;
  virtual_links: OspfVirtualLink[];
}

export interface OspfInterfaceAuthentication {
  md5_key_ids: Record<string, string>;
  plaintext_password?: string | null;
}

export interface OspfInterface {
  name: string;
  area?: string | null;
  cost?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  dead_interval?: number | null;
  retransmit_interval?: number | null;
  transmit_delay?: number | null;
  network?: string | null;
  passive?: boolean | null;
  passive_disable: boolean;
  bfd: boolean;
  mtu_ignore: boolean;
  bandwidth?: number | null;
  hello_multiplier?: number | null;
  authentication: OspfInterfaceAuthentication;
  ldp_sync: boolean;
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

export interface OspfMplsTe {
  enable: boolean;
  router_address?: string | null;
}

export interface OspfSummaryAddress {
  prefix: string;
  no_advertise: boolean;
  tag?: number | null;
}

export interface OspfSegmentRouting {
  global_block_low?: number | null;
  global_block_high?: number | null;
  local_block_low?: number | null;
  local_block_high?: number | null;
  maximum_label_depth?: number | null;
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

export interface OspfCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  redistribute_protocols: string[];
  network_types: string[];
  area_types: string[];
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface OspfBatchOperation {
  op: string;
  value?: string;
}

export interface OspfBatchRequest {
  operations: OspfBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

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

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: OspfBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ospf/batch", request);
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Area Operations
  // ==========================================================================

  async createArea(area: OspfArea): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [
      { op: "set_area", value: area.area_id },
    ];

    if (area.area_type === "stub") {
      ops.push({ op: "set_area_type_stub", value: area.area_id });
      if (area.area_type_no_summary) {
        ops.push({ op: "set_area_type_stub_no_summary", value: area.area_id });
      }
      if (area.area_type_default_cost != null) {
        ops.push({ op: "set_area_type_stub_default_cost", value: `${area.area_id},${area.area_type_default_cost}` });
      }
    } else if (area.area_type === "nssa") {
      ops.push({ op: "set_area_type_nssa", value: area.area_id });
      if (area.area_type_no_summary) {
        ops.push({ op: "set_area_type_nssa_no_summary", value: area.area_id });
      }
      if (area.area_type_default_cost != null) {
        ops.push({ op: "set_area_type_nssa_default_cost", value: `${area.area_id},${area.area_type_default_cost}` });
      }
    } else if (area.area_type === "normal") {
      ops.push({ op: "set_area_type_normal", value: area.area_id });
    }

    for (const net of area.networks) {
      ops.push({ op: "set_area_network", value: `${area.area_id},${net}` });
    }

    for (const range of area.ranges) {
      ops.push({ op: "set_area_range", value: `${area.area_id},${range.prefix}` });
      if (range.cost != null) {
        ops.push({ op: "set_area_range_cost", value: `${area.area_id},${range.prefix},${range.cost}` });
      }
      if (range.not_advertise) {
        ops.push({ op: "set_area_range_not_advertise", value: `${area.area_id},${range.prefix}` });
      }
      if (range.substitute) {
        ops.push({ op: "set_area_range_substitute", value: `${area.area_id},${range.prefix},${range.substitute}` });
      }
    }

    if (area.authentication) {
      ops.push({ op: "set_area_authentication", value: `${area.area_id},${area.authentication}` });
    }
    if (area.shortcut) {
      ops.push({ op: "set_area_shortcut", value: `${area.area_id},${area.shortcut}` });
    }
    if (area.export_list) {
      ops.push({ op: "set_area_export_list", value: `${area.area_id},${area.export_list}` });
    }
    if (area.import_list) {
      ops.push({ op: "set_area_import_list", value: `${area.area_id},${area.import_list}` });
    }

    for (const vl of area.virtual_links) {
      ops.push({ op: "set_area_virtual_link", value: `${area.area_id},${vl.address}` });
      if (vl.dead_interval != null) {
        ops.push({ op: "set_area_virtual_link_dead_interval", value: `${area.area_id},${vl.address},${vl.dead_interval}` });
      }
      if (vl.hello_interval != null) {
        ops.push({ op: "set_area_virtual_link_hello_interval", value: `${area.area_id},${vl.address},${vl.hello_interval}` });
      }
      if (vl.retransmit_interval != null) {
        ops.push({ op: "set_area_virtual_link_retransmit_interval", value: `${area.area_id},${vl.address},${vl.retransmit_interval}` });
      }
      if (vl.transmit_delay != null) {
        ops.push({ op: "set_area_virtual_link_transmit_delay", value: `${area.area_id},${vl.address},${vl.transmit_delay}` });
      }
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateArea(original: OspfArea, updated: OspfArea): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];
    const id = original.area_id;

    // Area type change
    if (updated.area_type !== original.area_type) {
      ops.push({ op: "delete_area_type", value: id });
      if (updated.area_type === "stub") {
        ops.push({ op: "set_area_type_stub", value: id });
      } else if (updated.area_type === "nssa") {
        ops.push({ op: "set_area_type_nssa", value: id });
      } else if (updated.area_type === "normal") {
        ops.push({ op: "set_area_type_normal", value: id });
      }
    }

    // No summary
    if (updated.area_type_no_summary !== original.area_type_no_summary && (updated.area_type === "stub" || updated.area_type === "nssa")) {
      if (updated.area_type_no_summary) {
        const prefix = updated.area_type === "stub" ? "set_area_type_stub_no_summary" : "set_area_type_nssa_no_summary";
        ops.push({ op: prefix, value: id });
      }
    }

    // Default cost
    if (updated.area_type_default_cost !== original.area_type_default_cost && (updated.area_type === "stub" || updated.area_type === "nssa")) {
      if (updated.area_type_default_cost != null) {
        const prefix = updated.area_type === "stub" ? "set_area_type_stub_default_cost" : "set_area_type_nssa_default_cost";
        ops.push({ op: prefix, value: `${id},${updated.area_type_default_cost}` });
      }
    }

    // Networks: delete old, add new
    const removedNetworks = original.networks.filter(n => !updated.networks.includes(n));
    const addedNetworks = updated.networks.filter(n => !original.networks.includes(n));
    for (const n of removedNetworks) {
      ops.push({ op: "delete_area_network", value: `${id},${n}` });
    }
    for (const n of addedNetworks) {
      ops.push({ op: "set_area_network", value: `${id},${n}` });
    }

    // Ranges: delete old, add new
    const origRangePrefixes = original.ranges.map(r => r.prefix);
    const updRangePrefixes = updated.ranges.map(r => r.prefix);
    for (const p of origRangePrefixes) {
      if (!updRangePrefixes.includes(p)) {
        ops.push({ op: "delete_area_range", value: `${id},${p}` });
      }
    }
    for (const range of updated.ranges) {
      if (!origRangePrefixes.includes(range.prefix)) {
        ops.push({ op: "set_area_range", value: `${id},${range.prefix}` });
      }
      if (range.cost != null) {
        ops.push({ op: "set_area_range_cost", value: `${id},${range.prefix},${range.cost}` });
      }
      if (range.not_advertise) {
        ops.push({ op: "set_area_range_not_advertise", value: `${id},${range.prefix}` });
      }
      if (range.substitute) {
        ops.push({ op: "set_area_range_substitute", value: `${id},${range.prefix},${range.substitute}` });
      }
    }

    // Authentication
    if (updated.authentication !== original.authentication) {
      if (updated.authentication) {
        ops.push({ op: "set_area_authentication", value: `${id},${updated.authentication}` });
      } else {
        ops.push({ op: "delete_area_authentication", value: id });
      }
    }

    // Shortcut
    if (updated.shortcut !== original.shortcut) {
      if (updated.shortcut) {
        ops.push({ op: "set_area_shortcut", value: `${id},${updated.shortcut}` });
      } else {
        ops.push({ op: "delete_area_shortcut", value: id });
      }
    }

    // Export list
    if (updated.export_list !== original.export_list) {
      if (updated.export_list) {
        ops.push({ op: "set_area_export_list", value: `${id},${updated.export_list}` });
      } else {
        ops.push({ op: "delete_area_export_list", value: id });
      }
    }

    // Import list
    if (updated.import_list !== original.import_list) {
      if (updated.import_list) {
        ops.push({ op: "set_area_import_list", value: `${id},${updated.import_list}` });
      } else {
        ops.push({ op: "delete_area_import_list", value: id });
      }
    }

    // Virtual links: delete removed, add new
    const origVlAddrs = original.virtual_links.map(v => v.address);
    const updVlAddrs = updated.virtual_links.map(v => v.address);
    for (const addr of origVlAddrs) {
      if (!updVlAddrs.includes(addr)) {
        ops.push({ op: "delete_area_virtual_link", value: `${id},${addr}` });
      }
    }
    for (const vl of updated.virtual_links) {
      ops.push({ op: "set_area_virtual_link", value: `${id},${vl.address}` });
      if (vl.dead_interval != null) {
        ops.push({ op: "set_area_virtual_link_dead_interval", value: `${id},${vl.address},${vl.dead_interval}` });
      }
      if (vl.hello_interval != null) {
        ops.push({ op: "set_area_virtual_link_hello_interval", value: `${id},${vl.address},${vl.hello_interval}` });
      }
      if (vl.retransmit_interval != null) {
        ops.push({ op: "set_area_virtual_link_retransmit_interval", value: `${id},${vl.address},${vl.retransmit_interval}` });
      }
      if (vl.transmit_delay != null) {
        ops.push({ op: "set_area_virtual_link_transmit_delay", value: `${id},${vl.address},${vl.transmit_delay}` });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async deleteArea(areaId: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_area", value: areaId }],
    });
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  async createInterface(iface: OspfInterface): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [
      { op: "set_interface", value: iface.name },
    ];

    if (iface.area) ops.push({ op: "set_interface_area", value: `${iface.name},${iface.area}` });
    if (iface.cost != null) ops.push({ op: "set_interface_cost", value: `${iface.name},${iface.cost}` });
    if (iface.priority != null) ops.push({ op: "set_interface_priority", value: `${iface.name},${iface.priority}` });
    if (iface.hello_interval != null) ops.push({ op: "set_interface_hello_interval", value: `${iface.name},${iface.hello_interval}` });
    if (iface.dead_interval != null) ops.push({ op: "set_interface_dead_interval", value: `${iface.name},${iface.dead_interval}` });
    if (iface.retransmit_interval != null) ops.push({ op: "set_interface_retransmit_interval", value: `${iface.name},${iface.retransmit_interval}` });
    if (iface.transmit_delay != null) ops.push({ op: "set_interface_transmit_delay", value: `${iface.name},${iface.transmit_delay}` });
    if (iface.network) ops.push({ op: "set_interface_network", value: `${iface.name},${iface.network}` });
    if (iface.passive) ops.push({ op: "set_interface_passive", value: iface.name });
    if (iface.bfd) ops.push({ op: "set_interface_bfd", value: iface.name });
    if (iface.mtu_ignore) ops.push({ op: "set_interface_mtu_ignore", value: iface.name });
    if (iface.ldp_sync) ops.push({ op: "set_interface_ldp_sync", value: iface.name });
    if (iface.bandwidth != null) ops.push({ op: "set_interface_bandwidth", value: `${iface.name},${iface.bandwidth}` });

    // Authentication
    if (iface.authentication.plaintext_password) {
      ops.push({ op: "set_interface_authentication_plaintext_password", value: `${iface.name},${iface.authentication.plaintext_password}` });
    }
    for (const [keyId, keyValue] of Object.entries(iface.authentication.md5_key_ids)) {
      ops.push({ op: "set_interface_authentication_md5_key_id", value: `${iface.name},${keyId}` });
      if (keyValue) {
        ops.push({ op: "set_interface_authentication_md5_key_id_md5_key", value: `${iface.name},${keyId},${keyValue}` });
      }
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateInterface(original: OspfInterface, updated: OspfInterface): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];
    const name = original.name;

    if (updated.area !== original.area) {
      if (updated.area) {
        ops.push({ op: "set_interface_area", value: `${name},${updated.area}` });
      } else {
        ops.push({ op: "delete_interface_area", value: name });
      }
    }
    if (updated.cost !== original.cost) {
      if (updated.cost != null) {
        ops.push({ op: "set_interface_cost", value: `${name},${updated.cost}` });
      } else {
        ops.push({ op: "delete_interface_cost", value: name });
      }
    }
    if (updated.priority !== original.priority) {
      if (updated.priority != null) {
        ops.push({ op: "set_interface_priority", value: `${name},${updated.priority}` });
      } else {
        ops.push({ op: "delete_interface_priority", value: name });
      }
    }
    if (updated.hello_interval !== original.hello_interval) {
      if (updated.hello_interval != null) {
        ops.push({ op: "set_interface_hello_interval", value: `${name},${updated.hello_interval}` });
      } else {
        ops.push({ op: "delete_interface_hello_interval", value: name });
      }
    }
    if (updated.dead_interval !== original.dead_interval) {
      if (updated.dead_interval != null) {
        ops.push({ op: "set_interface_dead_interval", value: `${name},${updated.dead_interval}` });
      } else {
        ops.push({ op: "delete_interface_dead_interval", value: name });
      }
    }
    if (updated.retransmit_interval !== original.retransmit_interval) {
      if (updated.retransmit_interval != null) {
        ops.push({ op: "set_interface_retransmit_interval", value: `${name},${updated.retransmit_interval}` });
      } else {
        ops.push({ op: "delete_interface_retransmit_interval", value: name });
      }
    }
    if (updated.transmit_delay !== original.transmit_delay) {
      if (updated.transmit_delay != null) {
        ops.push({ op: "set_interface_transmit_delay", value: `${name},${updated.transmit_delay}` });
      } else {
        ops.push({ op: "delete_interface_transmit_delay", value: name });
      }
    }
    if (updated.network !== original.network) {
      if (updated.network) {
        ops.push({ op: "set_interface_network", value: `${name},${updated.network}` });
      } else {
        ops.push({ op: "delete_interface_network", value: name });
      }
    }
    if (updated.passive !== original.passive) {
      if (updated.passive) {
        ops.push({ op: "set_interface_passive", value: name });
      } else if (updated.passive === false && updated.passive_disable) {
        ops.push({ op: "set_interface_passive_disable", value: name });
      } else {
        ops.push({ op: "delete_interface_passive", value: name });
      }
    }
    if (updated.bfd !== original.bfd) {
      ops.push({ op: updated.bfd ? "set_interface_bfd" : "delete_interface_bfd", value: name });
    }
    if (updated.mtu_ignore !== original.mtu_ignore) {
      ops.push({ op: updated.mtu_ignore ? "set_interface_mtu_ignore" : "delete_interface_mtu_ignore", value: name });
    }
    if (updated.ldp_sync !== original.ldp_sync) {
      ops.push({ op: updated.ldp_sync ? "set_interface_ldp_sync" : "delete_interface_ldp_sync", value: name });
    }
    if (updated.bandwidth !== original.bandwidth) {
      if (updated.bandwidth != null) {
        ops.push({ op: "set_interface_bandwidth", value: `${name},${updated.bandwidth}` });
      } else {
        ops.push({ op: "delete_interface_bandwidth", value: name });
      }
    }

    // Authentication: delete old, set new
    const origAuth = original.authentication;
    const updAuth = updated.authentication;
    const authChanged = origAuth.plaintext_password !== updAuth.plaintext_password ||
      JSON.stringify(origAuth.md5_key_ids) !== JSON.stringify(updAuth.md5_key_ids);

    if (authChanged) {
      ops.push({ op: "delete_interface_authentication", value: name });
      if (updAuth.plaintext_password) {
        ops.push({ op: "set_interface_authentication_plaintext_password", value: `${name},${updAuth.plaintext_password}` });
      }
      for (const [keyId, keyValue] of Object.entries(updAuth.md5_key_ids)) {
        ops.push({ op: "set_interface_authentication_md5_key_id", value: `${name},${keyId}` });
        if (keyValue) {
          ops.push({ op: "set_interface_authentication_md5_key_id_md5_key", value: `${name},${keyId},${keyValue}` });
        }
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_interface", value: name }],
    });
  }

  // ==========================================================================
  // Redistribute Operations
  // ==========================================================================

  async addRedistribute(entry: OspfRedistribute): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (entry.protocol === "table" && entry.table) {
      ops.push({ op: "set_redistribute_table", value: entry.table });
      if (entry.metric) ops.push({ op: "set_redistribute_table_metric", value: `${entry.table},${entry.metric}` });
      if (entry.metric_type) ops.push({ op: "set_redistribute_table_metric_type", value: `${entry.table},${entry.metric_type}` });
      if (entry.route_map) ops.push({ op: "set_redistribute_table_route_map", value: `${entry.table},${entry.route_map}` });
    } else {
      ops.push({ op: "set_redistribute", value: entry.protocol });
      if (entry.metric) ops.push({ op: "set_redistribute_metric", value: `${entry.protocol},${entry.metric}` });
      if (entry.metric_type) ops.push({ op: "set_redistribute_metric_type", value: `${entry.protocol},${entry.metric_type}` });
      if (entry.route_map) ops.push({ op: "set_redistribute_route_map", value: `${entry.protocol},${entry.route_map}` });
    }

    return this.batchConfigure({ operations: ops });
  }

  async removeRedistribute(entry: OspfRedistribute): Promise<VyOSResponse> {
    if (entry.protocol === "table" && entry.table) {
      return this.batchConfigure({
        operations: [{ op: "delete_redistribute_table", value: entry.table }],
      });
    }
    return this.batchConfigure({
      operations: [{ op: "delete_redistribute", value: entry.protocol }],
    });
  }

  // ==========================================================================
  // Parameters & Global Settings
  // ==========================================================================

  async updateParameters(original: OspfConfig, updated: {
    router_id?: string | null;
    abr_type?: string | null;
    opaque_lsa?: boolean;
    rfc1583_compatibility?: boolean;
    passive_interface_default?: boolean;
    log_adjacency_changes?: boolean | null;
    log_adjacency_changes_detail?: boolean;
    maximum_paths?: number | null;
    auto_cost_reference_bandwidth?: number | null;
  }): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.router_id !== original.parameters.router_id) {
      if (updated.router_id) {
        ops.push({ op: "set_router_id", value: updated.router_id });
      } else {
        ops.push({ op: "delete_router_id" });
      }
    }
    if (updated.abr_type !== original.parameters.abr_type) {
      if (updated.abr_type) {
        ops.push({ op: "set_abr_type", value: updated.abr_type });
      } else {
        ops.push({ op: "delete_abr_type" });
      }
    }
    if (updated.opaque_lsa !== original.parameters.opaque_lsa) {
      ops.push({ op: updated.opaque_lsa ? "set_opaque_lsa" : "delete_opaque_lsa" });
    }
    if (updated.rfc1583_compatibility !== original.parameters.rfc1583_compatibility) {
      ops.push({ op: updated.rfc1583_compatibility ? "set_rfc1583_compatibility" : "delete_rfc1583_compatibility" });
    }
    if (updated.passive_interface_default !== original.passive_interface_default) {
      ops.push({ op: updated.passive_interface_default ? "set_passive_interface_default" : "delete_passive_interface_default" });
    }
    if (updated.log_adjacency_changes !== original.log_adjacency_changes) {
      if (updated.log_adjacency_changes) {
        ops.push({ op: "set_log_adjacency_changes" });
      } else {
        ops.push({ op: "delete_log_adjacency_changes" });
      }
    }
    if (updated.log_adjacency_changes_detail !== original.log_adjacency_changes_detail) {
      if (updated.log_adjacency_changes_detail) {
        ops.push({ op: "set_log_adjacency_changes_detail" });
      }
    }
    if (updated.maximum_paths !== original.maximum_paths) {
      if (updated.maximum_paths != null) {
        ops.push({ op: "set_maximum_paths", value: String(updated.maximum_paths) });
      } else {
        ops.push({ op: "delete_maximum_paths" });
      }
    }
    if (updated.auto_cost_reference_bandwidth !== original.auto_cost_reference_bandwidth) {
      if (updated.auto_cost_reference_bandwidth != null) {
        ops.push({ op: "set_auto_cost_reference_bandwidth", value: String(updated.auto_cost_reference_bandwidth) });
      } else {
        ops.push({ op: "delete_auto_cost_reference_bandwidth" });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  // ==========================================================================
  // Default Information
  // ==========================================================================

  async updateDefaultInformation(original: OspfDefaultInformation, updated: OspfDefaultInformation): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (!updated.enabled && original.enabled) {
      ops.push({ op: "delete_default_information_originate" });
    } else if (updated.enabled) {
      if (!original.enabled) {
        ops.push({ op: "set_default_information_originate" });
      }
      if (updated.always !== original.always) {
        if (updated.always) ops.push({ op: "set_default_information_originate_always" });
      }
      if (updated.metric !== original.metric) {
        if (updated.metric != null) {
          ops.push({ op: "set_default_information_originate_metric", value: String(updated.metric) });
        }
      }
      if (updated.metric_type !== original.metric_type) {
        if (updated.metric_type != null) {
          ops.push({ op: "set_default_information_originate_metric_type", value: String(updated.metric_type) });
        }
      }
      if (updated.route_map !== original.route_map) {
        if (updated.route_map) {
          ops.push({ op: "set_default_information_originate_route_map", value: updated.route_map });
        }
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  // ==========================================================================
  // Advanced Settings
  // ==========================================================================

  async updateTimers(original: OspfTimersThrottleSpf, updated: OspfTimersThrottleSpf): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.delay !== original.delay) {
      if (updated.delay != null) {
        ops.push({ op: "set_timers_throttle_spf_delay", value: String(updated.delay) });
      }
    }
    if (updated.initial_holdtime !== original.initial_holdtime) {
      if (updated.initial_holdtime != null) {
        ops.push({ op: "set_timers_throttle_spf_initial_holdtime", value: String(updated.initial_holdtime) });
      }
    }
    if (updated.max_holdtime !== original.max_holdtime) {
      if (updated.max_holdtime != null) {
        ops.push({ op: "set_timers_throttle_spf_max_holdtime", value: String(updated.max_holdtime) });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateDistance(original: OspfDistance, updated: OspfDistance): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.global_value !== original.global_value) {
      if (updated.global_value != null) {
        ops.push({ op: "set_distance_global", value: String(updated.global_value) });
      } else {
        ops.push({ op: "delete_distance_global" });
      }
    }
    if (updated.ospf.external !== original.ospf.external) {
      if (updated.ospf.external != null) {
        ops.push({ op: "set_distance_ospf_external", value: String(updated.ospf.external) });
      }
    }
    if (updated.ospf.inter_area !== original.ospf.inter_area) {
      if (updated.ospf.inter_area != null) {
        ops.push({ op: "set_distance_ospf_inter_area", value: String(updated.ospf.inter_area) });
      }
    }
    if (updated.ospf.intra_area !== original.ospf.intra_area) {
      if (updated.ospf.intra_area != null) {
        ops.push({ op: "set_distance_ospf_intra_area", value: String(updated.ospf.intra_area) });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateMaxMetric(original: OspfMaxMetricRouterLsa, updated: OspfMaxMetricRouterLsa): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.administrative !== original.administrative) {
      ops.push({ op: updated.administrative ? "set_max_metric_router_lsa_administrative" : "delete_max_metric_router_lsa" });
    }
    if (updated.on_shutdown !== original.on_shutdown) {
      if (updated.on_shutdown != null) {
        ops.push({ op: "set_max_metric_router_lsa_on_shutdown", value: String(updated.on_shutdown) });
      }
    }
    if (updated.on_startup !== original.on_startup) {
      if (updated.on_startup != null) {
        ops.push({ op: "set_max_metric_router_lsa_on_startup", value: String(updated.on_startup) });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateGracefulRestart(original: OspfGracefulRestart, updated: OspfGracefulRestart): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.enabled && !original.enabled) {
      ops.push({ op: "set_graceful_restart" });
    } else if (!updated.enabled && original.enabled) {
      ops.push({ op: "delete_graceful_restart" });
      return this.batchConfigure({ operations: ops });
    }

    if (updated.grace_period !== original.grace_period) {
      if (updated.grace_period != null) {
        ops.push({ op: "set_graceful_restart_grace_period", value: String(updated.grace_period) });
      }
    }
    if (updated.helper.enable !== original.helper.enable) {
      if (updated.helper.enable) {
        ops.push({ op: "set_graceful_restart_helper_enable" });
      }
    }
    if (updated.helper.no_strict_lsa_checking !== original.helper.no_strict_lsa_checking) {
      if (updated.helper.no_strict_lsa_checking) {
        ops.push({ op: "set_graceful_restart_helper_no_strict_lsa_checking" });
      }
    }
    if (updated.helper.planned_only !== original.helper.planned_only) {
      if (updated.helper.planned_only) {
        ops.push({ op: "set_graceful_restart_helper_planned_only" });
      }
    }
    if (updated.helper.supported_grace_time !== original.helper.supported_grace_time) {
      if (updated.helper.supported_grace_time != null) {
        ops.push({ op: "set_graceful_restart_helper_supported_grace_time", value: String(updated.helper.supported_grace_time) });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateMplsTe(original: OspfMplsTe, updated: OspfMplsTe): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.enable !== original.enable) {
      if (updated.enable) {
        ops.push({ op: "set_mpls_te_enable" });
      } else {
        ops.push({ op: "delete_mpls_te" });
        return this.batchConfigure({ operations: ops });
      }
    }
    if (updated.router_address !== original.router_address) {
      if (updated.router_address) {
        ops.push({ op: "set_mpls_te_router_address", value: updated.router_address });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateMiscAdvanced(original: OspfConfig, updated: {
    ldp_sync_holddown?: number | null;
    refresh_timers?: number | null;
    aggregation_timer?: number | null;
    capability_opaque?: boolean;
  }): Promise<VyOSResponse> {
    const ops: OspfBatchOperation[] = [];

    if (updated.ldp_sync_holddown !== original.ldp_sync_holddown) {
      if (updated.ldp_sync_holddown != null) {
        ops.push({ op: "set_ldp_sync_holddown", value: String(updated.ldp_sync_holddown) });
      } else {
        ops.push({ op: "delete_ldp_sync_holddown" });
      }
    }
    if (updated.refresh_timers !== original.refresh_timers) {
      if (updated.refresh_timers != null) {
        ops.push({ op: "set_refresh_timers", value: String(updated.refresh_timers) });
      } else {
        ops.push({ op: "delete_refresh_timers" });
      }
    }
    if (updated.aggregation_timer !== original.aggregation_timer) {
      if (updated.aggregation_timer != null) {
        ops.push({ op: "set_aggregation_timer", value: String(updated.aggregation_timer) });
      } else {
        ops.push({ op: "delete_aggregation_timer" });
      }
    }
    if (updated.capability_opaque !== original.capability_opaque) {
      ops.push({ op: updated.capability_opaque ? "set_capability_opaque" : "delete_capability_opaque" });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }
}

export const ospfService = new OspfService();
