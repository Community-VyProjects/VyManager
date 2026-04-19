import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Pim6MldJoin {
  group: string;
  sources: string[];
}

export interface Pim6InterfaceMld {
  disabled: boolean;
  interval: number | null;
  last_member_query_count: number | null;
  last_member_query_interval: number | null;
  max_response_time: number | null;
  version: number | null;
  joins: Pim6MldJoin[];
}

export interface Pim6Interface {
  name: string;
  dr_priority: number | null;
  hello: number | null;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  mld: Pim6InterfaceMld | null;
}

export interface Pim6RpAddress {
  address: string;
  groups: string[];
  prefix_list6: string | null;
}

export interface Pim6Rp {
  addresses: Pim6RpAddress[];
  keep_alive_timer: number | null;
}

export interface Pim6Config {
  interfaces: Pim6Interface[];
  join_prune_interval: number | null;
  keep_alive_timer: number | null;
  packets: number | null;
  register_suppress_time: number | null;
  rp: Pim6Rp | null;
}

export interface Pim6Capabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface Pim6BatchOperation {
  op: string;
  value?: string;
}

export interface Pim6BatchGroup {
  interface?: string;
  operations: Pim6BatchOperation[];
}

export interface Pim6BatchRequest {
  groups: Pim6BatchGroup[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Global Settings Shape (for inline edit diffing)
// ============================================================================

export interface Pim6GlobalSettings {
  join_prune_interval: string;
  keep_alive_timer: string;
  register_suppress_time: string;
  packets: string;
}

// ============================================================================
// API Service
// ============================================================================

class Pim6Service {
  async getCapabilities(): Promise<Pim6Capabilities> {
    return apiClient.get<Pim6Capabilities>("/vyos/pim6/capabilities");
  }

  async getConfig(refresh = false): Promise<Pim6Config> {
    return apiClient.get<Pim6Config>("/vyos/pim6/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: Pim6BatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pim6/batch", request);
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
    current: Pim6GlobalSettings,
    next: Pim6GlobalSettings
  ): Promise<VyOSResponse> {
    const ops: Pim6BatchOperation[] = [];

    this.diffStringField(ops, current.join_prune_interval, next.join_prune_interval, "set_join_prune_interval", "delete_join_prune_interval");
    this.diffStringField(ops, current.keep_alive_timer, next.keep_alive_timer, "set_keep_alive_timer", "delete_keep_alive_timer");
    this.diffStringField(ops, current.register_suppress_time, next.register_suppress_time, "set_register_suppress_time", "delete_register_suppress_time");
    this.diffStringField(ops, current.packets, next.packets, "set_packets", "delete_packets");

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure({ groups: [{ operations: ops }] });
  }

  private diffStringField(
    ops: Pim6BatchOperation[],
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

  async createInterface(iface: Pim6Interface): Promise<VyOSResponse> {
    const ops = this.buildInterfaceOps(iface);
    return this.batchConfigure({
      groups: [{ interface: iface.name, operations: ops }],
    });
  }

  async updateInterface(existing: Pim6Interface, updated: Pim6Interface): Promise<VyOSResponse> {
    // Delete-and-recreate is simpler for nested MLD joins
    const deleteOps: Pim6BatchOperation[] = [{ op: "delete_interface" }];
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

  private buildInterfaceOps(iface: Pim6Interface): Pim6BatchOperation[] {
    const ops: Pim6BatchOperation[] = [{ op: "set_interface" }];

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

    if (iface.mld) {
      ops.push({ op: "set_interface_mld" });
      if (iface.mld.disabled) {
        ops.push({ op: "set_interface_mld_disable" });
      }
      if (iface.mld.interval != null) {
        ops.push({ op: "set_interface_mld_interval", value: String(iface.mld.interval) });
      }
      if (iface.mld.last_member_query_count != null) {
        ops.push({ op: "set_interface_mld_last_member_query_count", value: String(iface.mld.last_member_query_count) });
      }
      if (iface.mld.last_member_query_interval != null) {
        ops.push({ op: "set_interface_mld_last_member_query_interval", value: String(iface.mld.last_member_query_interval) });
      }
      if (iface.mld.max_response_time != null) {
        ops.push({ op: "set_interface_mld_max_response_time", value: String(iface.mld.max_response_time) });
      }
      if (iface.mld.version != null) {
        ops.push({ op: "set_interface_mld_version", value: String(iface.mld.version) });
      }
      for (const join of iface.mld.joins) {
        ops.push({ op: "set_interface_mld_join", value: join.group });
        for (const src of join.sources) {
          ops.push({ op: "set_interface_mld_join_source", value: `${join.group},${src}` });
        }
      }
    }

    return ops;
  }

  // ==========================================================================
  // RP Operations
  // ==========================================================================

  async createRpAddress(rp: Pim6RpAddress): Promise<VyOSResponse> {
    const ops: Pim6BatchOperation[] = [{ op: "set_rp_address", value: rp.address }];
    if (rp.prefix_list6) {
      ops.push({ op: "set_rp_address_prefix_list6", value: `${rp.address},${rp.prefix_list6}` });
    } else {
      for (const group of rp.groups) {
        ops.push({ op: "set_rp_address_group", value: `${rp.address},${group}` });
      }
    }
    return this.batchConfigure({ groups: [{ operations: ops }] });
  }

  async updateRpAddress(existing: Pim6RpAddress, updated: Pim6RpAddress): Promise<VyOSResponse> {
    const ops: Pim6BatchOperation[] = [];

    const hadPrefixList = existing.prefix_list6 !== null && existing.prefix_list6 !== "";
    const hasPrefixList = updated.prefix_list6 !== null && updated.prefix_list6 !== "";

    if (hadPrefixList && !hasPrefixList) {
      ops.push({ op: "delete_rp_address_prefix_list6", value: existing.address });
    }
    if (hasPrefixList && updated.prefix_list6 !== existing.prefix_list6) {
      ops.push({ op: "set_rp_address_prefix_list6", value: `${updated.address},${updated.prefix_list6}` });
    }

    // Groups are only active when prefix_list6 is not used
    const oldGroups = hadPrefixList ? [] : existing.groups;
    const newGroups = hasPrefixList ? [] : updated.groups;

    for (const g of oldGroups) {
      if (!newGroups.includes(g)) {
        ops.push({ op: "delete_rp_address_group", value: `${existing.address},${g}` });
      }
    }
    for (const g of newGroups) {
      if (!oldGroups.includes(g)) {
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
    const ops: Pim6BatchOperation[] = [];
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

export const pim6Service = new Pim6Service();
