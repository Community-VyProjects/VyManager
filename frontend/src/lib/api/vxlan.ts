/**
 * VXLAN Interface API Service
 * Handles all VXLAN interface related API operations
 * Supports unicast, multicast, and EVPN-based VXLAN configurations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface VLANToVNIMapping {
  vlan: string;
  vni?: string;
}

export interface VXLANInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string;
  vrf?: string;
  mtu?: string;
  mac?: string;
  disable: boolean;
  // VXLAN-specific
  vni?: string;
  port?: string;
  source_address?: string;
  source_interface?: string;
  remote?: string;
  group?: string;
  gpe: boolean;
  // Parameters (EVPN)
  external: boolean;
  nolearning: boolean;
  neighbor_suppress: boolean;
  vni_filter: boolean;
  // SVD mappings
  vlan_to_vni: VLANToVNIMapping[];
  // IP settings
  ip_disable_forwarding: boolean;
  ipv6_disable_forwarding: boolean;
}

export interface VXLANInterfacesConfig {
  interfaces: VXLANInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
  by_mode: Record<string, number>;
}

export interface VXLANMode {
  value: string;
  label: string;
  description: string;
}

export interface VXLANCapabilities {
  modes: VXLANMode[];
  default_port: number;
  standard_port: number;
  supports_svd: boolean;
  supports_gpe: boolean;
  evpn_features: string[];
  version: string;
}

export interface VXLANOperation {
  op: string;
  value?: string | number | { vlan: string; vni: string };
}

export interface VXLANBatchRequest {
  interface: string;
  operations: VXLANOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class VXLANService {
  /**
   * Get all VXLAN interface configurations
   */
  async getConfig(): Promise<VXLANInterfacesConfig> {
    return apiClient.get<VXLANInterfacesConfig>("/vyos/vxlan/config");
  }

  /**
   * Get VXLAN capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<VXLANCapabilities> {
    return apiClient.get<VXLANCapabilities>("/vyos/vxlan/capabilities");
  }

  /**
   * Configure VXLAN interface using batch operations
   */
  async configureBatch(request: VXLANBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/vxlan/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a unicast VXLAN interface
   */
  async createUnicastVXLAN(
    name: string,
    options: {
      vni: string | number;
      sourceAddress: string;
      remote: string;
      port?: string | number;
      address?: string;
      description?: string;
      mtu?: string | number;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [
      { op: "set_vni", value: String(options.vni) },
      { op: "set_source_address", value: options.sourceAddress },
      { op: "set_remote", value: options.remote },
    ];

    if (options.port) {
      operations.push({ op: "set_port", value: String(options.port) });
    }

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.mtu) {
      operations.push({ op: "set_mtu", value: String(options.mtu) });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Create a multicast VXLAN interface
   */
  async createMulticastVXLAN(
    name: string,
    options: {
      vni: string | number;
      sourceInterface: string;
      group: string;
      port?: string | number;
      address?: string;
      description?: string;
      mtu?: string | number;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [
      { op: "set_vni", value: String(options.vni) },
      { op: "set_source_interface", value: options.sourceInterface },
      { op: "set_group", value: options.group },
    ];

    if (options.port) {
      operations.push({ op: "set_port", value: String(options.port) });
    }

    if (options.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.mtu) {
      operations.push({ op: "set_mtu", value: String(options.mtu) });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Create an EVPN VXLAN interface
   */
  async createEvpnVXLAN(
    name: string,
    options: {
      vni: string | number;
      sourceAddress: string;
      port?: string | number;
      nolearning?: boolean;
      neighborSuppress?: boolean;
      description?: string;
      mtu?: string | number;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [
      { op: "set_vni", value: String(options.vni) },
      { op: "set_source_address", value: options.sourceAddress },
      { op: "enable_external" },
    ];

    if (options.port) {
      operations.push({ op: "set_port", value: String(options.port) });
    }

    if (options.nolearning !== false) {
      operations.push({ op: "enable_nolearning" });
    }

    if (options.neighborSuppress) {
      operations.push({ op: "enable_neighbor_suppress" });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options.mtu) {
      operations.push({ op: "set_mtu", value: String(options.mtu) });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Create a Single VXLAN Device (SVD) for EVPN
   */
  async createSVD(
    name: string,
    options: {
      sourceInterface: string;
      vlanToVni: Array<{ vlan: string; vni: string }>;
      port?: string | number;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [
      { op: "set_source_interface", value: options.sourceInterface },
      { op: "enable_external" },
    ];

    if (options.port) {
      operations.push({ op: "set_port", value: String(options.port) });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    // Add VLAN-to-VNI mappings
    for (const mapping of options.vlanToVni) {
      operations.push({
        op: "set_vlan_to_vni",
        value: { vlan: mapping.vlan, vni: mapping.vni },
      });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Add VLAN-to-VNI mapping to SVD
   */
  async addVlanToVniMapping(
    name: string,
    vlan: string,
    vni: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_vlan_to_vni", value: { vlan, vni } }],
    });
  }

  /**
   * Remove VLAN-to-VNI mapping from SVD
   */
  async removeVlanToVniMapping(name: string, vlan: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_vlan_to_vni", value: vlan }],
    });
  }

  /**
   * Delete a VXLAN interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Enable/disable interface
   */
  async setEnabled(name: string, enabled: boolean): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: enabled ? "enable" : "disable" }],
    });
  }

  /**
   * Update VXLAN interface settings
   */
  async updateInterface(
    name: string,
    options: {
      description?: string | null;
      mtu?: string | number | null;
      port?: string | number | null;
      sourceAddress?: string | null;
      sourceInterface?: string | null;
      remote?: string | null;
      group?: string | null;
      vrf?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [];

    if (options.description !== undefined) {
      if (options.description === null) {
        operations.push({ op: "delete_description" });
      } else {
        operations.push({ op: "set_description", value: options.description });
      }
    }

    if (options.mtu !== undefined) {
      if (options.mtu === null) {
        operations.push({ op: "delete_mtu" });
      } else {
        operations.push({ op: "set_mtu", value: String(options.mtu) });
      }
    }

    if (options.port !== undefined) {
      if (options.port === null) {
        operations.push({ op: "delete_port" });
      } else {
        operations.push({ op: "set_port", value: String(options.port) });
      }
    }

    if (options.sourceAddress !== undefined) {
      if (options.sourceAddress === null) {
        operations.push({ op: "delete_source_address" });
      } else {
        operations.push({ op: "set_source_address", value: options.sourceAddress });
      }
    }

    if (options.sourceInterface !== undefined) {
      if (options.sourceInterface === null) {
        operations.push({ op: "delete_source_interface" });
      } else {
        operations.push({ op: "set_source_interface", value: options.sourceInterface });
      }
    }

    if (options.remote !== undefined) {
      if (options.remote === null) {
        operations.push({ op: "delete_remote" });
      } else {
        operations.push({ op: "set_remote", value: options.remote });
      }
    }

    if (options.group !== undefined) {
      if (options.group === null) {
        operations.push({ op: "delete_group" });
      } else {
        operations.push({ op: "set_group", value: options.group });
      }
    }

    if (options.vrf !== undefined) {
      if (options.vrf === null) {
        operations.push({ op: "delete_vrf" });
      } else {
        operations.push({ op: "set_vrf", value: options.vrf });
      }
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Toggle EVPN features
   */
  async setEvpnFeatures(
    name: string,
    options: {
      external?: boolean;
      nolearning?: boolean;
      neighborSuppress?: boolean;
      vniFilter?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: VXLANOperation[] = [];

    if (options.external !== undefined) {
      operations.push({ op: options.external ? "enable_external" : "disable_external" });
    }

    if (options.nolearning !== undefined) {
      operations.push({ op: options.nolearning ? "enable_nolearning" : "disable_nolearning" });
    }

    if (options.neighborSuppress !== undefined) {
      operations.push({
        op: options.neighborSuppress ? "enable_neighbor_suppress" : "disable_neighbor_suppress",
      });
    }

    if (options.vniFilter !== undefined) {
      operations.push({ op: options.vniFilter ? "enable_vni_filter" : "disable_vni_filter" });
    }

    return this.configureBatch({ interface: name, operations });
  }

  /**
   * Add IP address to interface
   */
  async addAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "set_address", value: address }],
    });
  }

  /**
   * Remove IP address from interface
   */
  async removeAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: name,
      operations: [{ op: "delete_address", value: address }],
    });
  }
}

export const vxlanService = new VXLANService();
