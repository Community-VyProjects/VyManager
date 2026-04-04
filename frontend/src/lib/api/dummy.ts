import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DummyInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  vrf: string | null;
  mtu: string | null;
  disable: boolean | null;
  ip_disable_forwarding: boolean | null;
  ip_source_validation: string | null;
  ipv6_disable_forwarding: boolean | null;
  ipv6_address_eui64: string[];
  ipv6_address_no_default_link_local: boolean | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  redirect: string | null;
  mac: string | null;
  netns: string | null;
}

export interface DummyConfigResponse {
  interfaces: DummyInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface DummyCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface DummyBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class DummyService {
  async getCapabilities(): Promise<DummyCapabilities> {
    return apiClient.get<DummyCapabilities>("/vyos/dummy/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<DummyConfigResponse> {
    return apiClient.get<DummyConfigResponse>("/vyos/dummy/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: DummyBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/dummy/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    description?: string;
    addresses?: string[];
    mtu?: string;
    vrf?: string;
    disabled?: boolean;
    ip_disable_forwarding?: boolean;
    ip_source_validation?: string;
    ipv6_disable_forwarding?: boolean;
    ipv6_address_eui64?: string[];
    ipv6_address_no_default_link_local?: boolean;
    mirror_ingress?: string;
    mirror_egress?: string;
    redirect?: string;
    mac?: string;
    netns?: string;
  }): Promise<VyOSResponse> {
    const operations: DummyBatchOperation[] = [];

    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }
    if (config.mtu) operations.push({ op: "set_interface_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_interface_vrf", value: config.vrf });
    if (config.disabled) operations.push({ op: "set_interface_disable" });
    if (config.ip_disable_forwarding) operations.push({ op: "set_ip_disable_forwarding" });
    if (config.ip_source_validation) operations.push({ op: "set_ip_source_validation", value: config.ip_source_validation });
    if (config.ipv6_disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6_address_eui64) {
      for (const prefix of config.ipv6_address_eui64) {
        operations.push({ op: "set_ipv6_address_eui64", value: prefix });
      }
    }
    if (config.ipv6_address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.mac) operations.push({ op: "set_mac", value: config.mac });
    if (config.netns) operations.push({ op: "set_netns", value: config.netns });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: DummyInterface,
    updated: {
      description?: string | null;
      addresses?: string[];
      mtu?: string | null;
      vrf?: string | null;
      disabled?: boolean | null;
      ip_disable_forwarding?: boolean | null;
      ip_source_validation?: string | null;
      ipv6_disable_forwarding?: boolean | null;
      ipv6_address_eui64?: string[];
      ipv6_address_no_default_link_local?: boolean | null;
      mirror_ingress?: string | null;
      mirror_egress?: string | null;
      redirect?: string | null;
      mac?: string | null;
      netns?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: DummyBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", currentVal: current.description },
      { key: "mtu", setOp: "set_interface_mtu", deleteOp: "delete_interface_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_interface_vrf", deleteOp: "delete_interface_vrf", currentVal: current.vrf },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: current.ip_source_validation },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", currentVal: current.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", currentVal: current.mirror_egress },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
      { key: "mac", setOp: "set_mac", deleteOp: "delete_mac", currentVal: current.mac },
      { key: "netns", setOp: "set_netns", deleteOp: "delete_netns", currentVal: current.netns },
    ];

    for (const field of stringFields) {
      if (field.key in updated) {
        const newVal = updated[field.key] as string | null | undefined;
        if (newVal) {
          operations.push({ op: field.setOp, value: newVal });
        } else if (field.currentVal) {
          operations.push({ op: field.deleteOp });
        }
      }
    }

    // Boolean flags
    if (updated.disabled !== undefined) {
      const wasDisabled = current.disable ?? false;
      const willDisable = updated.disabled ?? false;
      if (willDisable !== wasDisabled) {
        operations.push({ op: willDisable ? "set_interface_disable" : "delete_interface_disable" });
      }
    }
    if (updated.ip_disable_forwarding !== undefined) {
      const was = current.ip_disable_forwarding ?? false;
      const will = updated.ip_disable_forwarding ?? false;
      if (will !== was) {
        operations.push({ op: will ? "set_ip_disable_forwarding" : "delete_ip_disable_forwarding" });
      }
    }
    if (updated.ipv6_disable_forwarding !== undefined) {
      const was = current.ipv6_disable_forwarding ?? false;
      const will = updated.ipv6_disable_forwarding ?? false;
      if (will !== was) {
        operations.push({ op: will ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding" });
      }
    }
    if (updated.ipv6_address_no_default_link_local !== undefined) {
      const was = current.ipv6_address_no_default_link_local ?? false;
      const will = updated.ipv6_address_no_default_link_local ?? false;
      if (will !== was) {
        operations.push({ op: will ? "set_ipv6_address_no_default_link_local" : "delete_ipv6_address_no_default_link_local" });
      }
    }

    // Array: addresses
    if (updated.addresses !== undefined) {
      for (const addr of current.addresses) {
        operations.push({ op: "delete_interface_address", value: addr });
      }
      for (const addr of updated.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }

    // Array: ipv6 eui64
    if (updated.ipv6_address_eui64 !== undefined) {
      for (const prefix of current.ipv6_address_eui64) {
        operations.push({ op: "delete_ipv6_address_eui64", value: prefix });
      }
      for (const prefix of updated.ipv6_address_eui64) {
        operations.push({ op: "set_ipv6_address_eui64", value: prefix });
      }
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const dummyService = new DummyService();
