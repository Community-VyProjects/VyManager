import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MplsParameters {
  maximum_ttl: number | null;
  no_propagate_ttl: boolean;
}

export interface MplsLdpDiscovery {
  hello_ipv4_holdtime: number | null;
  hello_ipv4_interval: number | null;
  hello_ipv6_holdtime: number | null;
  hello_ipv6_interval: number | null;
  session_ipv4_holdtime: number | null;
  session_ipv6_holdtime: number | null;
  transport_ipv4_address: string | null;
  transport_ipv6_address: string | null;
}

export interface MplsLdpAllocation {
  ipv4_access_list: string | null;
  ipv6_access_list: string | null;
}

export interface MplsLdpExportFilter {
  filter_access_list: string | null;
  neighbor_access_list: string | null;
}

export interface MplsLdpExport {
  ipv4_explicit_null: boolean;
  ipv4_export_filter: MplsLdpExportFilter;
  ipv6_explicit_null: boolean;
  ipv6_export_filter: MplsLdpExportFilter;
}

export interface MplsLdpImportFilter {
  filter_access_list: string | null;
  neighbor_access_list: string | null;
}

export interface MplsLdpImportConfig {
  ipv4_import_filter: MplsLdpImportFilter;
  ipv6_import_filter: MplsLdpImportFilter;
}

export interface MplsLdpNeighbor {
  address: string;
  password: string | null;
  session_holdtime: number | null;
  ttl_security: string | null;
}

export interface MplsLdpInterface {
  name: string;
  disable_establish_hello: boolean;
}

export interface MplsLdpTargetedNeighborIpv4 {
  enable: boolean;
  addresses: string[];
  hello_holdtime: number | null;
  hello_interval: number | null;
}

export interface MplsLdpTargetedNeighborIpv6 {
  enable: boolean;
  addresses: string[];
  hello_holdtime: number | null;
  hello_interval: number | null;
}

export interface MplsLdpParameters {
  cisco_interop_tlv: boolean;
  ordered_control: boolean;
  transport_prefer_ipv4: boolean;
}

export interface MplsLdpConfig {
  router_id: string | null;
  interfaces: MplsLdpInterface[];
  neighbors: MplsLdpNeighbor[];
  discovery: MplsLdpDiscovery;
  allocation: MplsLdpAllocation;
  export: MplsLdpExport;
  ldp_import: MplsLdpImportConfig;
  targeted_neighbor_ipv4: MplsLdpTargetedNeighborIpv4;
  targeted_neighbor_ipv6: MplsLdpTargetedNeighborIpv6;
  parameters: MplsLdpParameters;
}

export interface MplsConfig {
  enabled: boolean;
  interfaces: string[];
  parameters: MplsParameters;
  ldp: MplsLdpConfig | null;
}

export interface MplsCapabilities {
  version: string;
  features: {
    mpls: { supported: boolean; description: string };
    ldp: { supported: boolean; description: string };
    ldp_discovery: { supported: boolean; description: string };
    ldp_allocation: { supported: boolean; description: string };
    ldp_export: { supported: boolean; description: string };
    ldp_import: { supported: boolean; description: string };
    ldp_targeted_neighbor: { supported: boolean; description: string };
    ldp_neighbors: { supported: boolean; description: string };
    parameters: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface MplsBatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class MplsService {
  async getCapabilities(): Promise<MplsCapabilities> {
    return apiClient.get<MplsCapabilities>("/vyos/mpls/capabilities");
  }

  async getConfig(refresh = false): Promise<MplsConfig> {
    return apiClient.get<MplsConfig>("/vyos/mpls/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(ops: MplsBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/mpls/batch", {
      operations: ops,
    });
    if (!result.success) {
      throw new Error(result.error || "MPLS operation failed");
    }
    return result;
  }

  // ==========================================================================
  // Global Interface Operations
  // ==========================================================================

  async setGlobalInterface(iface: string): Promise<VyOSResponse> {
    return this.batch([{ op: "set_interface", value: iface }]);
  }

  async deleteGlobalInterface(iface: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_interface", value: iface }]);
  }

  // ==========================================================================
  // Parameters Operations
  // ==========================================================================

  async updateParameters(
    current: MplsParameters,
    next: MplsParameters
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];

    if (next.maximum_ttl !== current.maximum_ttl) {
      if (next.maximum_ttl != null) {
        ops.push({ op: "set_parameters_maximum_ttl", value: String(next.maximum_ttl) });
      } else {
        ops.push({ op: "delete_parameters_maximum_ttl" });
      }
    }

    if (next.no_propagate_ttl !== current.no_propagate_ttl) {
      ops.push({
        op: next.no_propagate_ttl
          ? "set_parameters_no_propagate_ttl"
          : "delete_parameters_no_propagate_ttl",
      });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  // ==========================================================================
  // LDP General (Router ID + Discovery + Parameters)
  // ==========================================================================

  async updateLdpGeneral(
    current: MplsLdpConfig,
    next: MplsLdpConfig
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];

    // Router ID
    if (next.router_id !== current.router_id) {
      if (next.router_id) {
        ops.push({ op: "set_ldp_router_id", value: next.router_id });
      } else {
        ops.push({ op: "delete_ldp_router_id" });
      }
    }

    // Discovery fields
    const cd = current.discovery;
    const nd = next.discovery;

    const discoveryFields: Array<{
      key: keyof MplsLdpDiscovery;
      setOp: string;
      delOp: string;
    }> = [
      { key: "hello_ipv4_holdtime", setOp: "set_ldp_discovery_hello_ipv4_holdtime", delOp: "delete_ldp_discovery_hello_ipv4_holdtime" },
      { key: "hello_ipv4_interval", setOp: "set_ldp_discovery_hello_ipv4_interval", delOp: "delete_ldp_discovery_hello_ipv4_interval" },
      { key: "hello_ipv6_holdtime", setOp: "set_ldp_discovery_hello_ipv6_holdtime", delOp: "delete_ldp_discovery_hello_ipv6_holdtime" },
      { key: "hello_ipv6_interval", setOp: "set_ldp_discovery_hello_ipv6_interval", delOp: "delete_ldp_discovery_hello_ipv6_interval" },
      { key: "session_ipv4_holdtime", setOp: "set_ldp_discovery_session_ipv4_holdtime", delOp: "delete_ldp_discovery_session_ipv4_holdtime" },
      { key: "session_ipv6_holdtime", setOp: "set_ldp_discovery_session_ipv6_holdtime", delOp: "delete_ldp_discovery_session_ipv6_holdtime" },
      { key: "transport_ipv4_address", setOp: "set_ldp_discovery_transport_ipv4_address", delOp: "delete_ldp_discovery_transport_ipv4_address" },
      { key: "transport_ipv6_address", setOp: "set_ldp_discovery_transport_ipv6_address", delOp: "delete_ldp_discovery_transport_ipv6_address" },
    ];

    for (const { key, setOp, delOp } of discoveryFields) {
      if (nd[key] !== cd[key]) {
        const val = nd[key];
        if (val != null && val !== "") {
          ops.push({ op: setOp, value: String(val) });
        } else {
          ops.push({ op: delOp });
        }
      }
    }

    // LDP Parameters (flags)
    const cp = current.parameters;
    const np = next.parameters;

    if (np.cisco_interop_tlv !== cp.cisco_interop_tlv) {
      ops.push({ op: np.cisco_interop_tlv ? "set_ldp_parameters_cisco_interop_tlv" : "delete_ldp_parameters_cisco_interop_tlv" });
    }
    if (np.ordered_control !== cp.ordered_control) {
      ops.push({ op: np.ordered_control ? "set_ldp_parameters_ordered_control" : "delete_ldp_parameters_ordered_control" });
    }
    if (np.transport_prefer_ipv4 !== cp.transport_prefer_ipv4) {
      ops.push({ op: np.transport_prefer_ipv4 ? "set_ldp_parameters_transport_prefer_ipv4" : "delete_ldp_parameters_transport_prefer_ipv4" });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  // ==========================================================================
  // LDP Interface Operations
  // ==========================================================================

  async createLdpInterface(iface: MplsLdpInterface): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [
      { op: "set_ldp_interface", value: iface.name },
    ];
    if (iface.disable_establish_hello) {
      ops.push({ op: "set_ldp_interface_disable_hello", value: iface.name });
    }
    return this.batch(ops);
  }

  async updateLdpInterface(
    original: MplsLdpInterface,
    updated: MplsLdpInterface
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];

    if (updated.disable_establish_hello !== original.disable_establish_hello) {
      ops.push({
        op: updated.disable_establish_hello
          ? "set_ldp_interface_disable_hello"
          : "delete_ldp_interface_disable_hello",
        value: original.name,
      });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteLdpInterface(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_ldp_interface", value: name }]);
  }

  // ==========================================================================
  // LDP Neighbor Operations
  // ==========================================================================

  async createLdpNeighbor(neighbor: MplsLdpNeighbor): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [
      { op: "set_ldp_neighbor", value: neighbor.address },
    ];
    if (neighbor.password) {
      ops.push({ op: "set_ldp_neighbor_password", value: `${neighbor.address},${neighbor.password}` });
    }
    if (neighbor.session_holdtime != null) {
      ops.push({ op: "set_ldp_neighbor_session_holdtime", value: `${neighbor.address},${neighbor.session_holdtime}` });
    }
    if (neighbor.ttl_security) {
      ops.push({ op: "set_ldp_neighbor_ttl_security", value: `${neighbor.address},${neighbor.ttl_security}` });
    }
    return this.batch(ops);
  }

  async updateLdpNeighbor(
    original: MplsLdpNeighbor,
    updated: MplsLdpNeighbor
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];
    const addr = original.address;

    if (updated.password !== original.password) {
      if (updated.password) {
        ops.push({ op: "set_ldp_neighbor_password", value: `${addr},${updated.password}` });
      } else {
        ops.push({ op: "delete_ldp_neighbor_password", value: addr });
      }
    }

    if (updated.session_holdtime !== original.session_holdtime) {
      if (updated.session_holdtime != null) {
        ops.push({ op: "set_ldp_neighbor_session_holdtime", value: `${addr},${updated.session_holdtime}` });
      } else {
        ops.push({ op: "delete_ldp_neighbor_session_holdtime", value: addr });
      }
    }

    if (updated.ttl_security !== original.ttl_security) {
      if (updated.ttl_security) {
        ops.push({ op: "set_ldp_neighbor_ttl_security", value: `${addr},${updated.ttl_security}` });
      } else {
        ops.push({ op: "delete_ldp_neighbor_ttl_security", value: addr });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteLdpNeighbor(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_ldp_neighbor", value: address }]);
  }

  // ==========================================================================
  // LDP Filters (Allocation + Export + Import)
  // ==========================================================================

  async updateLdpFilters(
    current: MplsLdpConfig,
    next: MplsLdpConfig
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];

    // Allocation
    if (next.allocation.ipv4_access_list !== current.allocation.ipv4_access_list) {
      if (next.allocation.ipv4_access_list) {
        ops.push({ op: "set_ldp_allocation_ipv4_access_list", value: next.allocation.ipv4_access_list });
      } else {
        ops.push({ op: "delete_ldp_allocation_ipv4" });
      }
    }
    if (next.allocation.ipv6_access_list !== current.allocation.ipv6_access_list) {
      if (next.allocation.ipv6_access_list) {
        ops.push({ op: "set_ldp_allocation_ipv6_access_list", value: next.allocation.ipv6_access_list });
      } else {
        ops.push({ op: "delete_ldp_allocation_ipv6" });
      }
    }

    // Export
    if (next.export.ipv4_explicit_null !== current.export.ipv4_explicit_null) {
      ops.push({ op: next.export.ipv4_explicit_null ? "set_ldp_export_ipv4_explicit_null" : "delete_ldp_export_ipv4_explicit_null" });
    }
    if (next.export.ipv4_export_filter.filter_access_list !== current.export.ipv4_export_filter.filter_access_list) {
      if (next.export.ipv4_export_filter.filter_access_list) {
        ops.push({ op: "set_ldp_export_ipv4_filter_access_list", value: next.export.ipv4_export_filter.filter_access_list });
      } else {
        ops.push({ op: "delete_ldp_export_ipv4_filter" });
      }
    }
    if (next.export.ipv4_export_filter.neighbor_access_list !== current.export.ipv4_export_filter.neighbor_access_list) {
      if (next.export.ipv4_export_filter.neighbor_access_list) {
        ops.push({ op: "set_ldp_export_ipv4_neighbor_access_list", value: next.export.ipv4_export_filter.neighbor_access_list });
      } else {
        ops.push({ op: "delete_ldp_export_ipv4_filter" });
      }
    }
    if (next.export.ipv6_explicit_null !== current.export.ipv6_explicit_null) {
      ops.push({ op: next.export.ipv6_explicit_null ? "set_ldp_export_ipv6_explicit_null" : "delete_ldp_export_ipv6_explicit_null" });
    }
    if (next.export.ipv6_export_filter.filter_access_list !== current.export.ipv6_export_filter.filter_access_list) {
      if (next.export.ipv6_export_filter.filter_access_list) {
        ops.push({ op: "set_ldp_export_ipv6_filter_access_list", value: next.export.ipv6_export_filter.filter_access_list });
      } else {
        ops.push({ op: "delete_ldp_export_ipv6_filter" });
      }
    }
    if (next.export.ipv6_export_filter.neighbor_access_list !== current.export.ipv6_export_filter.neighbor_access_list) {
      if (next.export.ipv6_export_filter.neighbor_access_list) {
        ops.push({ op: "set_ldp_export_ipv6_neighbor_access_list", value: next.export.ipv6_export_filter.neighbor_access_list });
      } else {
        ops.push({ op: "delete_ldp_export_ipv6_filter" });
      }
    }

    // Import
    if (next.ldp_import.ipv4_import_filter.filter_access_list !== current.ldp_import.ipv4_import_filter.filter_access_list) {
      if (next.ldp_import.ipv4_import_filter.filter_access_list) {
        ops.push({ op: "set_ldp_import_ipv4_filter_access_list", value: next.ldp_import.ipv4_import_filter.filter_access_list });
      } else {
        ops.push({ op: "delete_ldp_import_ipv4" });
      }
    }
    if (next.ldp_import.ipv4_import_filter.neighbor_access_list !== current.ldp_import.ipv4_import_filter.neighbor_access_list) {
      if (next.ldp_import.ipv4_import_filter.neighbor_access_list) {
        ops.push({ op: "set_ldp_import_ipv4_neighbor_access_list", value: next.ldp_import.ipv4_import_filter.neighbor_access_list });
      } else {
        ops.push({ op: "delete_ldp_import_ipv4" });
      }
    }
    if (next.ldp_import.ipv6_import_filter.filter_access_list !== current.ldp_import.ipv6_import_filter.filter_access_list) {
      if (next.ldp_import.ipv6_import_filter.filter_access_list) {
        ops.push({ op: "set_ldp_import_ipv6_filter_access_list", value: next.ldp_import.ipv6_import_filter.filter_access_list });
      } else {
        ops.push({ op: "delete_ldp_import_ipv6" });
      }
    }
    if (next.ldp_import.ipv6_import_filter.neighbor_access_list !== current.ldp_import.ipv6_import_filter.neighbor_access_list) {
      if (next.ldp_import.ipv6_import_filter.neighbor_access_list) {
        ops.push({ op: "set_ldp_import_ipv6_neighbor_access_list", value: next.ldp_import.ipv6_import_filter.neighbor_access_list });
      } else {
        ops.push({ op: "delete_ldp_import_ipv6" });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  // ==========================================================================
  // LDP Targeted Neighbors
  // ==========================================================================

  async updateTargetedNeighbors(
    current: MplsLdpConfig,
    next: MplsLdpConfig
  ): Promise<VyOSResponse> {
    const ops: MplsBatchOperation[] = [];

    // IPv4 targeted neighbor
    const ci4 = current.targeted_neighbor_ipv4;
    const ni4 = next.targeted_neighbor_ipv4;

    if (ni4.enable !== ci4.enable) {
      ops.push({ op: ni4.enable ? "set_ldp_targeted_neighbor_ipv4_enable" : "delete_ldp_targeted_neighbor_ipv4_enable" });
    }

    // Remove old IPv4 addresses not in new list
    for (const addr of ci4.addresses) {
      if (!ni4.addresses.includes(addr)) {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv4_address", value: addr });
      }
    }
    // Add new IPv4 addresses
    for (const addr of ni4.addresses) {
      if (!ci4.addresses.includes(addr)) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv4_address", value: addr });
      }
    }

    if (ni4.hello_holdtime !== ci4.hello_holdtime) {
      if (ni4.hello_holdtime != null) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv4_hello_holdtime", value: String(ni4.hello_holdtime) });
      } else {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv4_hello_holdtime" });
      }
    }
    if (ni4.hello_interval !== ci4.hello_interval) {
      if (ni4.hello_interval != null) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv4_hello_interval", value: String(ni4.hello_interval) });
      } else {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv4_hello_interval" });
      }
    }

    // IPv6 targeted neighbor
    const ci6 = current.targeted_neighbor_ipv6;
    const ni6 = next.targeted_neighbor_ipv6;

    if (ni6.enable !== ci6.enable) {
      ops.push({ op: ni6.enable ? "set_ldp_targeted_neighbor_ipv6_enable" : "delete_ldp_targeted_neighbor_ipv6_enable" });
    }

    // Remove old IPv6 addresses not in new list
    for (const addr of ci6.addresses) {
      if (!ni6.addresses.includes(addr)) {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv6_address", value: addr });
      }
    }
    // Add new IPv6 addresses
    for (const addr of ni6.addresses) {
      if (!ci6.addresses.includes(addr)) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv6_address", value: addr });
      }
    }

    if (ni6.hello_holdtime !== ci6.hello_holdtime) {
      if (ni6.hello_holdtime != null) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv6_hello_holdtime", value: String(ni6.hello_holdtime) });
      } else {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv6_hello_holdtime" });
      }
    }
    if (ni6.hello_interval !== ci6.hello_interval) {
      if (ni6.hello_interval != null) {
        ops.push({ op: "set_ldp_targeted_neighbor_ipv6_hello_interval", value: String(ni6.hello_interval) });
      } else {
        ops.push({ op: "delete_ldp_targeted_neighbor_ipv6_hello_interval" });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  // ==========================================================================
  // Delete Operations
  // ==========================================================================

  async deleteLdp(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_ldp" }]);
  }

  async deleteMpls(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_mpls" }]);
  }
}

export const mplsService = new MplsService();
