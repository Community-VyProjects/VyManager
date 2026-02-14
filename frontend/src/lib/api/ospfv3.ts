import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces (matching backend Pydantic models)
// ============================================================================

export interface Ospfv3Parameters {
  router_id?: string | null;
}

export interface Ospfv3AreaRange {
  prefix: string;
  advertise: boolean;
  not_advertise: boolean;
}

export interface Ospfv3Area {
  area_id: string;
  area_type?: string | null;
  area_type_no_summary: boolean;
  area_type_default_cost?: number | null;
  nssa_default_information_originate: boolean;
  ranges: Ospfv3AreaRange[];
  export_list?: string | null;
  import_list?: string | null;
}

export interface Ospfv3Interface {
  name: string;
  area?: string | null;
  cost?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  dead_interval?: number | null;
  retransmit_interval?: number | null;
  transmit_delay?: number | null;
  network?: string | null;
  passive: boolean;
  bfd: boolean;
  bfd_profile?: string | null;
  mtu_ignore: boolean;
  ifmtu?: number | null;
  instance_id?: number | null;
}

export interface Ospfv3Redistribute {
  protocol: string;
  metric?: string | null;
  metric_type?: string | null;
  route_map?: string | null;
}

export interface Ospfv3DefaultInformation {
  enabled: boolean;
  always: boolean;
  metric?: number | null;
  metric_type?: number | null;
  route_map?: string | null;
}

export interface Ospfv3DistanceOspfv3 {
  external?: number | null;
  inter_area?: number | null;
  intra_area?: number | null;
}

export interface Ospfv3Distance {
  global_value?: number | null;
  ospfv3: Ospfv3DistanceOspfv3;
}

export interface Ospfv3GracefulRestartHelper {
  enable: boolean;
  router_ids: string[];
  lsa_check_disable: boolean;
  planned_only: boolean;
  supported_grace_time?: number | null;
}

export interface Ospfv3GracefulRestart {
  enabled: boolean;
  grace_period?: number | null;
  helper: Ospfv3GracefulRestartHelper;
}

export interface Ospfv3Config {
  parameters: Ospfv3Parameters;
  areas: Ospfv3Area[];
  interfaces: Ospfv3Interface[];
  redistribute: Ospfv3Redistribute[];
  default_information: Ospfv3DefaultInformation;
  distance: Ospfv3Distance;
  graceful_restart: Ospfv3GracefulRestart;
  auto_cost_reference_bandwidth?: number | null;
  log_adjacency_changes?: boolean | null;
  log_adjacency_changes_detail: boolean;
}

export interface Ospfv3Capabilities {
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

export interface Ospfv3BatchOperation {
  op: string;
  value?: string;
}

export interface Ospfv3BatchRequest {
  operations: Ospfv3BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class Ospfv3Service {
  async getCapabilities(): Promise<Ospfv3Capabilities> {
    return apiClient.get<Ospfv3Capabilities>("/vyos/ospfv3/capabilities");
  }

  async getConfig(refresh = false): Promise<Ospfv3Config> {
    return apiClient.get<Ospfv3Config>("/vyos/ospfv3/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: Ospfv3BatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ospfv3/batch", request);
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Area Operations
  // ==========================================================================

  async createArea(area: Ospfv3Area): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [
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
      if (area.nssa_default_information_originate) {
        ops.push({ op: "set_area_type_nssa_default_information_originate", value: area.area_id });
      }
    } else if (area.area_type === "normal") {
      ops.push({ op: "set_area_type_normal", value: area.area_id });
    }

    for (const range of area.ranges) {
      ops.push({ op: "set_area_range", value: `${area.area_id},${range.prefix}` });
      if (range.advertise) {
        ops.push({ op: "set_area_range_advertise", value: `${area.area_id},${range.prefix}` });
      }
      if (range.not_advertise) {
        ops.push({ op: "set_area_range_not_advertise", value: `${area.area_id},${range.prefix}` });
      }
    }

    if (area.export_list) {
      ops.push({ op: "set_area_export_list", value: `${area.area_id},${area.export_list}` });
    }
    if (area.import_list) {
      ops.push({ op: "set_area_import_list", value: `${area.area_id},${area.import_list}` });
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateArea(original: Ospfv3Area, updated: Ospfv3Area): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];
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

    // NSSA default information originate
    if (updated.area_type === "nssa" && updated.nssa_default_information_originate !== original.nssa_default_information_originate) {
      if (updated.nssa_default_information_originate) {
        ops.push({ op: "set_area_type_nssa_default_information_originate", value: id });
      }
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
      if (range.advertise) {
        ops.push({ op: "set_area_range_advertise", value: `${id},${range.prefix}` });
      }
      if (range.not_advertise) {
        ops.push({ op: "set_area_range_not_advertise", value: `${id},${range.prefix}` });
      }
    }

    // Export/Import lists
    if (updated.export_list !== original.export_list) {
      if (updated.export_list) {
        ops.push({ op: "set_area_export_list", value: `${id},${updated.export_list}` });
      } else {
        ops.push({ op: "delete_area_export_list", value: id });
      }
    }
    if (updated.import_list !== original.import_list) {
      if (updated.import_list) {
        ops.push({ op: "set_area_import_list", value: `${id},${updated.import_list}` });
      } else {
        ops.push({ op: "delete_area_import_list", value: id });
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

  async createInterface(iface: Ospfv3Interface): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [
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
    if (iface.bfd_profile) ops.push({ op: "set_interface_bfd_profile", value: `${iface.name},${iface.bfd_profile}` });
    if (iface.mtu_ignore) ops.push({ op: "set_interface_mtu_ignore", value: iface.name });
    if (iface.ifmtu != null) ops.push({ op: "set_interface_ifmtu", value: `${iface.name},${iface.ifmtu}` });
    if (iface.instance_id != null) ops.push({ op: "set_interface_instance_id", value: `${iface.name},${iface.instance_id}` });

    return this.batchConfigure({ operations: ops });
  }

  async updateInterface(original: Ospfv3Interface, updated: Ospfv3Interface): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];
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
      ops.push({ op: updated.passive ? "set_interface_passive" : "delete_interface_passive", value: name });
    }
    if (updated.bfd !== original.bfd) {
      ops.push({ op: updated.bfd ? "set_interface_bfd" : "delete_interface_bfd", value: name });
    }
    if (updated.bfd_profile !== original.bfd_profile) {
      if (updated.bfd_profile) {
        ops.push({ op: "set_interface_bfd_profile", value: `${name},${updated.bfd_profile}` });
      } else {
        ops.push({ op: "delete_interface_bfd_profile", value: name });
      }
    }
    if (updated.mtu_ignore !== original.mtu_ignore) {
      ops.push({ op: updated.mtu_ignore ? "set_interface_mtu_ignore" : "delete_interface_mtu_ignore", value: name });
    }
    if (updated.ifmtu !== original.ifmtu) {
      if (updated.ifmtu != null) {
        ops.push({ op: "set_interface_ifmtu", value: `${name},${updated.ifmtu}` });
      } else {
        ops.push({ op: "delete_interface_ifmtu", value: name });
      }
    }
    if (updated.instance_id !== original.instance_id) {
      if (updated.instance_id != null) {
        ops.push({ op: "set_interface_instance_id", value: `${name},${updated.instance_id}` });
      } else {
        ops.push({ op: "delete_interface_instance_id", value: name });
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

  async addRedistribute(entry: Ospfv3Redistribute): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [
      { op: "set_redistribute", value: entry.protocol },
    ];

    if (entry.metric) ops.push({ op: "set_redistribute_metric", value: `${entry.protocol},${entry.metric}` });
    if (entry.metric_type) ops.push({ op: "set_redistribute_metric_type", value: `${entry.protocol},${entry.metric_type}` });
    if (entry.route_map) ops.push({ op: "set_redistribute_route_map", value: `${entry.protocol},${entry.route_map}` });

    return this.batchConfigure({ operations: ops });
  }

  async removeRedistribute(protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_redistribute", value: protocol }],
    });
  }

  // ==========================================================================
  // Parameters & Global Settings
  // ==========================================================================

  async updateParameters(original: Ospfv3Config, updated: {
    router_id?: string | null;
    log_adjacency_changes?: boolean | null;
    log_adjacency_changes_detail?: boolean;
    auto_cost_reference_bandwidth?: number | null;
  }): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];

    if (updated.router_id !== original.parameters.router_id) {
      if (updated.router_id) {
        ops.push({ op: "set_router_id", value: updated.router_id });
      } else {
        ops.push({ op: "delete_router_id" });
      }
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

  async updateDefaultInformation(original: Ospfv3DefaultInformation, updated: Ospfv3DefaultInformation): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];

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

  async updateDistance(original: Ospfv3Distance, updated: Ospfv3Distance): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];

    if (updated.global_value !== original.global_value) {
      if (updated.global_value != null) {
        ops.push({ op: "set_distance_global", value: String(updated.global_value) });
      } else {
        ops.push({ op: "delete_distance_global" });
      }
    }
    if (updated.ospfv3.external !== original.ospfv3.external) {
      if (updated.ospfv3.external != null) {
        ops.push({ op: "set_distance_ospfv3_external", value: String(updated.ospfv3.external) });
      }
    }
    if (updated.ospfv3.inter_area !== original.ospfv3.inter_area) {
      if (updated.ospfv3.inter_area != null) {
        ops.push({ op: "set_distance_ospfv3_inter_area", value: String(updated.ospfv3.inter_area) });
      }
    }
    if (updated.ospfv3.intra_area !== original.ospfv3.intra_area) {
      if (updated.ospfv3.intra_area != null) {
        ops.push({ op: "set_distance_ospfv3_intra_area", value: String(updated.ospfv3.intra_area) });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations: ops });
  }

  async updateGracefulRestart(original: Ospfv3GracefulRestart, updated: Ospfv3GracefulRestart): Promise<VyOSResponse> {
    const ops: Ospfv3BatchOperation[] = [];

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
    if (updated.helper.lsa_check_disable !== original.helper.lsa_check_disable) {
      if (updated.helper.lsa_check_disable) {
        ops.push({ op: "set_graceful_restart_helper_lsa_check_disable" });
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
}

export const ospfv3Service = new Ospfv3Service();
