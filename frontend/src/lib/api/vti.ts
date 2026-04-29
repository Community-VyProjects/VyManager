import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VtiInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  mtu: string | null;
  disable: boolean | null;
  vrf: string | null;
  redirect: string | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  ip_adjust_mss: string | null;
  ip_arp_cache_timeout: string | null;
  ip_disable_arp_filter: boolean | null;
  ip_disable_forwarding: boolean | null;
  ip_enable_arp_accept: boolean | null;
  ip_enable_arp_announce: boolean | null;
  ip_enable_arp_ignore: boolean | null;
  ip_enable_directed_broadcast: boolean | null;
  ip_enable_proxy_arp: boolean | null;
  ip_proxy_arp_pvlan: boolean | null;
  ip_source_validation: string | null;
  ipv6_accept_dad: string | null;
  ipv6_address_autoconf: boolean | null;
  ipv6_address_eui64: string[];
  ipv6_address_no_default_link_local: boolean | null;
  ipv6_adjust_mss: string | null;
  ipv6_base_reachable_time: string | null;
  ipv6_disable_forwarding: boolean | null;
  ipv6_dup_addr_detect_transmits: string | null;
  ipv6_source_validation: string | null;
}

export interface VtiConfigResponse {
  interfaces: VtiInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface VtiCapabilities {
  version: string;
  supported: boolean;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: Record<string, { supported: boolean; description: string }>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface VtiBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class VtiService {
  async getCapabilities(): Promise<VtiCapabilities> {
    return apiClient.get<VtiCapabilities>("/vyos/vti/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<VtiConfigResponse> {
    return apiClient.get<VtiConfigResponse>("/vyos/vti/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: VtiBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vti/batch", {
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
    redirect?: string;
    mirror_ingress?: string;
    mirror_egress?: string;
    ip_adjust_mss?: string;
    ip_arp_cache_timeout?: string;
    ip_disable_arp_filter?: boolean;
    ip_disable_forwarding?: boolean;
    ip_enable_arp_accept?: boolean;
    ip_enable_arp_announce?: boolean;
    ip_enable_arp_ignore?: boolean;
    ip_enable_directed_broadcast?: boolean;
    ip_enable_proxy_arp?: boolean;
    ip_proxy_arp_pvlan?: boolean;
    ip_source_validation?: string;
    ipv6_accept_dad?: string;
    ipv6_address_autoconf?: boolean;
    ipv6_address_eui64?: string[];
    ipv6_address_no_default_link_local?: boolean;
    ipv6_adjust_mss?: string;
    ipv6_base_reachable_time?: string;
    ipv6_disable_forwarding?: boolean;
    ipv6_dup_addr_detect_transmits?: string;
    ipv6_source_validation?: string;
  }): Promise<VyOSResponse> {
    const operations: VtiBatchOperation[] = [];

    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }
    if (config.mtu) operations.push({ op: "set_interface_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_interface_vrf", value: config.vrf });
    if (config.disabled) operations.push({ op: "set_interface_disable" });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.ip_adjust_mss) operations.push({ op: "set_ip_adjust_mss", value: config.ip_adjust_mss });
    if (config.ip_arp_cache_timeout) operations.push({ op: "set_ip_arp_cache_timeout", value: config.ip_arp_cache_timeout });
    if (config.ip_disable_arp_filter) operations.push({ op: "set_ip_disable_arp_filter" });
    if (config.ip_disable_forwarding) operations.push({ op: "set_ip_disable_forwarding" });
    if (config.ip_enable_arp_accept) operations.push({ op: "set_ip_enable_arp_accept" });
    if (config.ip_enable_arp_announce) operations.push({ op: "set_ip_enable_arp_announce" });
    if (config.ip_enable_arp_ignore) operations.push({ op: "set_ip_enable_arp_ignore" });
    if (config.ip_enable_directed_broadcast) operations.push({ op: "set_ip_enable_directed_broadcast" });
    if (config.ip_enable_proxy_arp) operations.push({ op: "set_ip_enable_proxy_arp" });
    if (config.ip_proxy_arp_pvlan) operations.push({ op: "set_ip_proxy_arp_pvlan" });
    if (config.ip_source_validation) operations.push({ op: "set_ip_source_validation", value: config.ip_source_validation });
    if (config.ipv6_accept_dad) operations.push({ op: "set_ipv6_accept_dad", value: config.ipv6_accept_dad });
    if (config.ipv6_address_autoconf) operations.push({ op: "set_ipv6_address_autoconf" });
    if (config.ipv6_address_eui64) {
      for (const prefix of config.ipv6_address_eui64) {
        operations.push({ op: "set_ipv6_address_eui64", value: prefix });
      }
    }
    if (config.ipv6_address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
    if (config.ipv6_adjust_mss) operations.push({ op: "set_ipv6_adjust_mss", value: config.ipv6_adjust_mss });
    if (config.ipv6_base_reachable_time) operations.push({ op: "set_ipv6_base_reachable_time", value: config.ipv6_base_reachable_time });
    if (config.ipv6_disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6_dup_addr_detect_transmits) operations.push({ op: "set_ipv6_dup_addr_detect_transmits", value: config.ipv6_dup_addr_detect_transmits });
    if (config.ipv6_source_validation) operations.push({ op: "set_ipv6_source_validation", value: config.ipv6_source_validation });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: VtiInterface,
    updated: {
      description?: string | null;
      addresses?: string[];
      mtu?: string | null;
      vrf?: string | null;
      disabled?: boolean | null;
      redirect?: string | null;
      mirror_ingress?: string | null;
      mirror_egress?: string | null;
      ip_adjust_mss?: string | null;
      ip_arp_cache_timeout?: string | null;
      ip_disable_arp_filter?: boolean | null;
      ip_disable_forwarding?: boolean | null;
      ip_enable_arp_accept?: boolean | null;
      ip_enable_arp_announce?: boolean | null;
      ip_enable_arp_ignore?: boolean | null;
      ip_enable_directed_broadcast?: boolean | null;
      ip_enable_proxy_arp?: boolean | null;
      ip_proxy_arp_pvlan?: boolean | null;
      ip_source_validation?: string | null;
      ipv6_accept_dad?: string | null;
      ipv6_address_autoconf?: boolean | null;
      ipv6_address_eui64?: string[];
      ipv6_address_no_default_link_local?: boolean | null;
      ipv6_adjust_mss?: string | null;
      ipv6_base_reachable_time?: string | null;
      ipv6_disable_forwarding?: boolean | null;
      ipv6_dup_addr_detect_transmits?: string | null;
      ipv6_source_validation?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: VtiBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", currentVal: current.description },
      { key: "mtu", setOp: "set_interface_mtu", deleteOp: "delete_interface_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_interface_vrf", deleteOp: "delete_interface_vrf", currentVal: current.vrf },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", currentVal: current.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", currentVal: current.mirror_egress },
      { key: "ip_adjust_mss", setOp: "set_ip_adjust_mss", deleteOp: "delete_ip_adjust_mss", currentVal: current.ip_adjust_mss },
      { key: "ip_arp_cache_timeout", setOp: "set_ip_arp_cache_timeout", deleteOp: "delete_ip_arp_cache_timeout", currentVal: current.ip_arp_cache_timeout },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: current.ip_source_validation },
      { key: "ipv6_accept_dad", setOp: "set_ipv6_accept_dad", deleteOp: "delete_ipv6_accept_dad", currentVal: current.ipv6_accept_dad },
      { key: "ipv6_adjust_mss", setOp: "set_ipv6_adjust_mss", deleteOp: "delete_ipv6_adjust_mss", currentVal: current.ipv6_adjust_mss },
      { key: "ipv6_base_reachable_time", setOp: "set_ipv6_base_reachable_time", deleteOp: "delete_ipv6_base_reachable_time", currentVal: current.ipv6_base_reachable_time },
      { key: "ipv6_dup_addr_detect_transmits", setOp: "set_ipv6_dup_addr_detect_transmits", deleteOp: "delete_ipv6_dup_addr_detect_transmits", currentVal: current.ipv6_dup_addr_detect_transmits },
      { key: "ipv6_source_validation", setOp: "set_ipv6_source_validation", deleteOp: "delete_ipv6_source_validation", currentVal: current.ipv6_source_validation },
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
    const boolFlags: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: boolean | null }[] = [
      { key: "disabled", setOp: "set_interface_disable", deleteOp: "delete_interface_disable", currentVal: current.disable },
      { key: "ip_disable_arp_filter", setOp: "set_ip_disable_arp_filter", deleteOp: "delete_ip_disable_arp_filter", currentVal: current.ip_disable_arp_filter },
      { key: "ip_disable_forwarding", setOp: "set_ip_disable_forwarding", deleteOp: "delete_ip_disable_forwarding", currentVal: current.ip_disable_forwarding },
      { key: "ip_enable_arp_accept", setOp: "set_ip_enable_arp_accept", deleteOp: "delete_ip_enable_arp_accept", currentVal: current.ip_enable_arp_accept },
      { key: "ip_enable_arp_announce", setOp: "set_ip_enable_arp_announce", deleteOp: "delete_ip_enable_arp_announce", currentVal: current.ip_enable_arp_announce },
      { key: "ip_enable_arp_ignore", setOp: "set_ip_enable_arp_ignore", deleteOp: "delete_ip_enable_arp_ignore", currentVal: current.ip_enable_arp_ignore },
      { key: "ip_enable_directed_broadcast", setOp: "set_ip_enable_directed_broadcast", deleteOp: "delete_ip_enable_directed_broadcast", currentVal: current.ip_enable_directed_broadcast },
      { key: "ip_enable_proxy_arp", setOp: "set_ip_enable_proxy_arp", deleteOp: "delete_ip_enable_proxy_arp", currentVal: current.ip_enable_proxy_arp },
      { key: "ip_proxy_arp_pvlan", setOp: "set_ip_proxy_arp_pvlan", deleteOp: "delete_ip_proxy_arp_pvlan", currentVal: current.ip_proxy_arp_pvlan },
      { key: "ipv6_address_autoconf", setOp: "set_ipv6_address_autoconf", deleteOp: "delete_ipv6_address_autoconf", currentVal: current.ipv6_address_autoconf },
      { key: "ipv6_address_no_default_link_local", setOp: "set_ipv6_address_no_default_link_local", deleteOp: "delete_ipv6_address_no_default_link_local", currentVal: current.ipv6_address_no_default_link_local },
      { key: "ipv6_disable_forwarding", setOp: "set_ipv6_disable_forwarding", deleteOp: "delete_ipv6_disable_forwarding", currentVal: current.ipv6_disable_forwarding },
    ];

    for (const flag of boolFlags) {
      if (flag.key in updated) {
        const was = flag.currentVal ?? false;
        const will = (updated[flag.key] as boolean | null | undefined) ?? false;
        if (will !== was) {
          operations.push({ op: will ? flag.setOp : flag.deleteOp });
        }
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

export const vtiService = new VtiService();
