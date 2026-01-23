/**
 * VLAN Interface API Service
 * Handles all VLAN (802.1q) sub-interface related API operations
 * Supports standard VLANs (vif) and QinQ (vif-s/vif-c)
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface VLANInterface {
  name: string;
  vlan_id: string;
  vlan_type: "vif" | "vif-s" | "vif-c";
  parent_type: "ethernet" | "bonding" | "bridge";
  parent_interface: string;
  s_vlan_id?: string;
  addresses: string[];
  description?: string;
  mtu?: string;
  mac?: string;
  vrf?: string;
  disable: boolean;
}

export interface VLANConfig {
  vlans: VLANInterface[];
  total: number;
  by_parent_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface VLANCapabilities {
  parent_types: { value: string; label: string; description: string }[];
  vlan_types: { value: string; label: string; description: string }[];
  vlan_id_range: { min: number; max: number };
  version: string;
}

export interface VLANOperation {
  op: string;
  value?: string | number;
}

export interface VLANBatchRequest {
  parent_type: string;
  parent_interface: string;
  vlan_id: string;
  vlan_type: string;
  s_vlan_id?: string;
  operations: VLANOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class VLANService {
  /**
   * Get all VLAN interface configurations
   */
  async getConfig(): Promise<VLANConfig> {
    return apiClient.get<VLANConfig>("/vyos/vlan/config");
  }

  /**
   * Get VLAN capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<VLANCapabilities> {
    return apiClient.get<VLANCapabilities>("/vyos/vlan/capabilities");
  }

  /**
   * Configure VLAN interface using batch operations
   */
  async configureBatch(request: VLANBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/vlan/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Create a standard VLAN interface (vif)
   */
  async createVLAN(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    options?: {
      address?: string;
      description?: string;
      mtu?: number;
      vrf?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: VLANOperation[] = [{ op: "create" }];

    if (options?.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options?.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options?.mtu) {
      operations.push({ op: "set_mtu", value: options.mtu });
    }

    if (options?.vrf) {
      operations.push({ op: "set_vrf", value: options.vrf });
    }

    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: "vif",
      operations,
    });
  }

  /**
   * Create a QinQ service VLAN (vif-s)
   */
  async createServiceVLAN(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    options?: {
      address?: string;
      description?: string;
      mtu?: number;
    }
  ): Promise<VyOSResponse> {
    const operations: VLANOperation[] = [{ op: "create" }];

    if (options?.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options?.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options?.mtu) {
      operations.push({ op: "set_mtu", value: options.mtu });
    }

    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: "vif-s",
      operations,
    });
  }

  /**
   * Create a QinQ customer VLAN (vif-c)
   */
  async createCustomerVLAN(
    parentType: string,
    parentInterface: string,
    serviceVlanId: string,
    customerVlanId: string,
    options?: {
      address?: string;
      description?: string;
      mtu?: number;
    }
  ): Promise<VyOSResponse> {
    const operations: VLANOperation[] = [{ op: "create" }];

    if (options?.address) {
      operations.push({ op: "set_address", value: options.address });
    }

    if (options?.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    if (options?.mtu) {
      operations.push({ op: "set_mtu", value: options.mtu });
    }

    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: customerVlanId,
      vlan_type: "vif-c",
      s_vlan_id: serviceVlanId,
      operations,
    });
  }

  /**
   * Delete a VLAN interface
   */
  async deleteVLAN(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "delete" }],
    });
  }

  /**
   * Add an IP address to a VLAN interface
   */
  async addAddress(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    address: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "set_address", value: address }],
    });
  }

  /**
   * Remove an IP address from a VLAN interface
   */
  async removeAddress(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    address: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "delete_address", value: address }],
    });
  }

  /**
   * Set VLAN description
   */
  async setDescription(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    description: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "set_description", value: description }],
    });
  }

  /**
   * Set VLAN MTU
   */
  async setMTU(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    mtu: number,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "set_mtu", value: mtu }],
    });
  }

  /**
   * Assign VLAN to VRF
   */
  async setVRF(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vrf: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "set_vrf", value: vrf }],
    });
  }

  /**
   * Remove VLAN from VRF
   */
  async removeVRF(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "delete_vrf" }],
    });
  }

  /**
   * Disable VLAN interface
   */
  async disableVLAN(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "disable" }],
    });
  }

  /**
   * Enable VLAN interface
   */
  async enableVLAN(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "enable" }],
    });
  }

  /**
   * Enable DHCP on VLAN interface
   */
  async enableDHCP(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "enable_dhcp" }],
    });
  }

  /**
   * Disable DHCP on VLAN interface
   */
  async disableDHCP(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    vlanType: string = "vif",
    serviceVlanId?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: vlanType,
      s_vlan_id: serviceVlanId,
      operations: [{ op: "disable_dhcp" }],
    });
  }

  /**
   * Set MAC address on VLAN interface
   */
  async setMAC(
    parentType: string,
    parentInterface: string,
    vlanId: string,
    mac: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      parent_type: parentType,
      parent_interface: parentInterface,
      vlan_id: vlanId,
      vlan_type: "vif",
      operations: [{ op: "set_mac", value: mac }],
    });
  }
}

export const vlanService = new VLANService();
