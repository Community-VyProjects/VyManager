import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PimIgmpJoin {
  group: string;
  source_addresses: string[];
}

export interface PimInterfaceIgmp {
  disabled: boolean;
  joins: PimIgmpJoin[];
  query_interval: number | null;
  query_max_response_time: number | null;
  version: number | null;
}

export interface PimInterface {
  name: string;
  bfd: boolean;
  bfd_profile: string | null;
  dr_priority: number | null;
  hello: number | null;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  source_address: string | null;
  igmp: PimInterfaceIgmp | null;
}

export interface PimRpAddress {
  address: string;
  groups: string[];
}

export interface PimRp {
  addresses: PimRpAddress[];
  keep_alive_timer: number | null;
}

export interface PimSptSwitchover {
  infinity_and_beyond: boolean;
  prefix_list: string | null;
}

export interface PimConfig {
  ecmp: boolean;
  ecmp_rebalance: boolean;
  igmp_watermark_warning: number | null;
  interfaces: PimInterface[];
  join_prune_interval: number | null;
  keep_alive_timer: number | null;
  no_v6_secondary: boolean;
  packets: number | null;
  register_accept_list_prefix_list: string | null;
  register_suppress_time: number | null;
  rp: PimRp | null;
  spt_switchover: PimSptSwitchover | null;
  ssm_prefix_list: string | null;
}

export interface PimCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface PimBatchOperation {
  op: string;
  value?: string;
}

export interface PimBatchGroup {
  interface?: string;
  operations: PimBatchOperation[];
}

export interface PimBatchRequest {
  groups: PimBatchGroup[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Global Settings Shape (for inline edit diffing)
// ============================================================================

export interface PimGlobalSettings {
  ecmp: boolean;
  ecmp_rebalance: boolean;
  igmp_watermark_warning: string;
  join_prune_interval: string;
  keep_alive_timer: string;
  no_v6_secondary: boolean;
  packets: string;
  register_accept_list_prefix_list: string;
  register_suppress_time: string;
  spt_infinity_and_beyond: boolean;
  spt_prefix_list: string;
  ssm_prefix_list: string;
}

// ============================================================================
// API Service
// ============================================================================

class PimService {
  async getCapabilities(): Promise<PimCapabilities> {
    return apiClient.get<PimCapabilities>("/vyos/pim/capabilities");
  }

  async getConfig(refresh = false): Promise<PimConfig> {
    return apiClient.get<PimConfig>("/vyos/pim/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: PimBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pim/batch", request);
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Global Settings
  // ==========================================================================

  async updateGlobalSettings(
    current: PimGlobalSettings,
    next: PimGlobalSettings
  ): Promise<VyOSResponse> {
    const ops: PimBatchOperation[] = [];

    // ECMP
    if (next.ecmp !== current.ecmp) {
      ops.push({ op: next.ecmp ? "set_ecmp" : "delete_ecmp" });
    }
    // ECMP rebalance
    if (next.ecmp_rebalance !== current.ecmp_rebalance) {
      ops.push({ op: next.ecmp_rebalance ? "set_ecmp_rebalance" : "delete_ecmp_rebalance" });
    }
    // If ECMP turned off, also delete rebalance
    if (!next.ecmp && current.ecmp_rebalance) {
      ops.push({ op: "delete_ecmp_rebalance" });
    }

    // no_v6_secondary
    if (next.no_v6_secondary !== current.no_v6_secondary) {
      ops.push({ op: next.no_v6_secondary ? "set_no_v6_secondary" : "delete_no_v6_secondary" });
    }

    // Timers (string fields)
    this.diffStringField(ops, current.join_prune_interval, next.join_prune_interval, "set_join_prune_interval", "delete_join_prune_interval");
    this.diffStringField(ops, current.keep_alive_timer, next.keep_alive_timer, "set_keep_alive_timer", "delete_keep_alive_timer");
    this.diffStringField(ops, current.register_suppress_time, next.register_suppress_time, "set_register_suppress_time", "delete_register_suppress_time");
    this.diffStringField(ops, current.packets, next.packets, "set_packets", "delete_packets");
    this.diffStringField(ops, current.igmp_watermark_warning, next.igmp_watermark_warning, "set_igmp_watermark_warning", "delete_igmp_watermark_warning");

    // Prefix lists
    this.diffStringField(ops, current.register_accept_list_prefix_list, next.register_accept_list_prefix_list, "set_register_accept_list_prefix_list", "delete_register_accept_list_prefix_list");
    this.diffStringField(ops, current.ssm_prefix_list, next.ssm_prefix_list, "set_ssm_prefix_list", "delete_ssm_prefix_list");

    // SPT switchover
    if (next.spt_infinity_and_beyond !== current.spt_infinity_and_beyond) {
      if (next.spt_infinity_and_beyond) {
        ops.push({ op: "set_spt_switchover_infinity" });
      } else {
        ops.push({ op: "delete_spt_switchover" });
      }
    }
    if (next.spt_infinity_and_beyond) {
      this.diffStringField(ops, current.spt_prefix_list, next.spt_prefix_list, "set_spt_switchover_infinity_prefix_list", "delete_spt_switchover_infinity_prefix_list");
    } else if (current.spt_prefix_list) {
      // Clearing prefix list when infinity unchecked is handled by delete_spt_switchover above
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ groups: [{ operations: ops }] });
  }

  private diffStringField(
    ops: PimBatchOperation[],
    currentVal: string,
    nextVal: string,
    setOp: string,
    deleteOp: string
  ) {
    if (nextVal !== currentVal) {
      if (nextVal.trim()) {
        ops.push({ op: setOp, value: nextVal.trim() });
      } else if (currentVal.trim()) {
        ops.push({ op: deleteOp });
      }
    }
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  async createInterface(iface: PimInterface): Promise<VyOSResponse> {
    const ops = this.buildInterfaceOps(iface);
    return this.batchConfigure({
      groups: [{ interface: iface.name, operations: ops }],
    });
  }

  async updateInterface(existing: PimInterface, updated: PimInterface): Promise<VyOSResponse> {
    // Delete-and-recreate is simpler for nested IGMP joins
    const deleteOps: PimBatchOperation[] = [{ op: "delete_interface" }];
    const createOps = this.buildInterfaceOps(updated);
    return this.batchConfigure({
      groups: [
        { interface: existing.name, operations: deleteOps },
        { interface: updated.name, operations: createOps },
      ],
    });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ interface: name, operations: [{ op: "delete_interface" }] }],
    });
  }

  private buildInterfaceOps(iface: PimInterface): PimBatchOperation[] {
    const ops: PimBatchOperation[] = [{ op: "set_interface" }];

    if (iface.bfd) {
      ops.push({ op: "set_interface_bfd" });
      if (iface.bfd_profile) {
        ops.push({ op: "set_interface_bfd_profile", value: iface.bfd_profile });
      }
    }
    if (iface.dr_priority != null) {
      ops.push({ op: "set_interface_dr_priority", value: String(iface.dr_priority) });
    }
    if (iface.hello != null) {
      ops.push({ op: "set_interface_hello", value: String(iface.hello) });
    }
    if (iface.no_bsm) {
      ops.push({ op: "set_interface_no_bsm" });
    }
    if (iface.no_unicast_bsm) {
      ops.push({ op: "set_interface_no_unicast_bsm" });
    }
    if (iface.passive) {
      ops.push({ op: "set_interface_passive" });
    }
    if (iface.source_address) {
      ops.push({ op: "set_interface_source_address", value: iface.source_address });
    }

    // IGMP
    if (iface.igmp) {
      ops.push({ op: "set_interface_igmp" });
      if (iface.igmp.disabled) {
        ops.push({ op: "set_interface_igmp_disable" });
      }
      if (iface.igmp.query_interval != null) {
        ops.push({ op: "set_interface_igmp_query_interval", value: String(iface.igmp.query_interval) });
      }
      if (iface.igmp.query_max_response_time != null) {
        ops.push({ op: "set_interface_igmp_query_max_response_time", value: String(iface.igmp.query_max_response_time) });
      }
      if (iface.igmp.version != null) {
        ops.push({ op: "set_interface_igmp_version", value: String(iface.igmp.version) });
      }
      for (const join of iface.igmp.joins) {
        ops.push({ op: "set_interface_igmp_join", value: join.group });
        for (const src of join.source_addresses) {
          ops.push({ op: "set_interface_igmp_join_source", value: `${join.group},${src}` });
        }
      }
    }

    return ops;
  }

  // ==========================================================================
  // RP Operations
  // ==========================================================================

  async createRpAddress(rp: PimRpAddress): Promise<VyOSResponse> {
    const ops: PimBatchOperation[] = [{ op: "set_rp_address", value: rp.address }];
    for (const group of rp.groups) {
      ops.push({ op: "set_rp_address_group", value: `${rp.address},${group}` });
    }
    return this.batchConfigure({ groups: [{ operations: ops }] });
  }

  async updateRpAddress(existing: PimRpAddress, updated: PimRpAddress): Promise<VyOSResponse> {
    const ops: PimBatchOperation[] = [];

    // Remove old groups
    for (const g of existing.groups) {
      if (!updated.groups.includes(g)) {
        ops.push({ op: "delete_rp_address_group", value: `${existing.address},${g}` });
      }
    }
    // Add new groups
    for (const g of updated.groups) {
      if (!existing.groups.includes(g)) {
        ops.push({ op: "set_rp_address_group", value: `${updated.address},${g}` });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure({ groups: [{ operations: ops }] });
  }

  async deleteRpAddress(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      groups: [{ operations: [{ op: "delete_rp_address", value: address }] }],
    });
  }

  async updateRpKeepAliveTimer(value: string, currentValue: string): Promise<VyOSResponse> {
    const ops: PimBatchOperation[] = [];
    if (value.trim() !== currentValue.trim()) {
      if (value.trim()) {
        ops.push({ op: "set_rp_keep_alive_timer", value: value.trim() });
      } else if (currentValue.trim()) {
        ops.push({ op: "delete_rp_keep_alive_timer" });
      }
    }
    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure({ groups: [{ operations: ops }] });
  }
}

export const pimService = new PimService();
