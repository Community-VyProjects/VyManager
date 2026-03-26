import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VxlanIpSettings {
  adjust_mss: string | null;
  arp_cache_timeout: string | null;
  disable_arp_filter: boolean;
  disable_forwarding: boolean;
  enable_arp_accept: boolean;
  enable_arp_announce: boolean;
  enable_arp_ignore: boolean;
  enable_directed_broadcast: boolean;
  enable_proxy_arp: boolean;
  proxy_arp_pvlan: boolean;
  source_validation: string | null;
}

export interface VxlanIpv6Address {
  autoconf: boolean;
  eui64: string[];
  interface_identifier: string | null;
  no_default_link_local: boolean;
}

export interface VxlanIpv6Settings {
  accept_dad: string | null;
  address: VxlanIpv6Address;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface VxlanMirror {
  egress: string | null;
  ingress: string | null;
}

export interface VxlanParametersIp {
  df: string | null;
  tos: string | null;
  ttl: string | null;
}

export interface VxlanParametersIpv6 {
  flowlabel: string | null;
}

export interface VxlanParameters {
  external: boolean;
  ip: VxlanParametersIp;
  ipv6: VxlanParametersIpv6;
  neighbor_suppress: boolean;
  nolearning: boolean;
  vni_filter: boolean;
}

export interface VxlanVlanToVniEntry {
  vlan_id: string;
  vni: string | null;
  description: string | null;
}

export interface VxlanInterface {
  name: string;
  addresses: string[];
  description: string | null;
  disabled: boolean;
  gpe: boolean;
  group: string | null;
  ip: VxlanIpSettings;
  ipv6: VxlanIpv6Settings;
  mac: string | null;
  mirror: VxlanMirror;
  mtu: string | null;
  parameters: VxlanParameters;
  port: string | null;
  redirect: string | null;
  remotes: string[];
  source_address: string | null;
  source_interface: string | null;
  vlan_to_vni: VxlanVlanToVniEntry[];
  vni: string | null;
  vrf: string | null;
}

export interface VxlanConfigResponse {
  interfaces: VxlanInterface[];
  total: number;
}

export interface VxlanCapabilities {
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

export interface VxlanBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class VxlanService {
  async getCapabilities(): Promise<VxlanCapabilities> {
    return apiClient.get<VxlanCapabilities>("/vyos/vxlan/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<VxlanConfigResponse> {
    return apiClient.get<VxlanConfigResponse>("/vyos/vxlan/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: VxlanBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vxlan/batch", {
      interface_name: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  async createInterface(config: {
    name: string;
    vni?: string;
    description?: string;
    addresses?: string[];
    source_address?: string;
    source_interface?: string;
    group?: string;
    remotes?: string[];
    port?: string;
    mtu?: string;
    mac?: string;
    vrf?: string;
    redirect?: string;
    disabled?: boolean;
    gpe?: boolean;
    parameters?: {
      external?: boolean;
      nolearning?: boolean;
      neighbor_suppress?: boolean;
      vni_filter?: boolean;
      ip_df?: string;
      ip_tos?: string;
      ip_ttl?: string;
      ipv6_flowlabel?: string;
    };
    mirror?: {
      ingress?: string;
      egress?: string;
    };
    ip?: {
      adjust_mss?: string;
      arp_cache_timeout?: string;
      disable_arp_filter?: boolean;
      disable_forwarding?: boolean;
      enable_arp_accept?: boolean;
      enable_arp_announce?: boolean;
      enable_arp_ignore?: boolean;
      enable_directed_broadcast?: boolean;
      enable_proxy_arp?: boolean;
      proxy_arp_pvlan?: boolean;
      source_validation?: string;
    };
    ipv6?: {
      accept_dad?: string;
      adjust_mss?: string;
      base_reachable_time?: string;
      disable_forwarding?: boolean;
      dup_addr_detect_transmits?: string;
      source_validation?: string;
      address_autoconf?: boolean;
      address_eui64?: string[];
      address_interface_identifier?: string;
      address_no_default_link_local?: boolean;
    };
    vlan_to_vni?: { vlan_id: string; vni: string; description?: string }[];
  }): Promise<VyOSResponse> {
    const operations: VxlanBatchOperation[] = [];

    operations.push({ op: "set_interface" });

    if (config.vni) operations.push({ op: "set_vni", value: config.vni });
    if (config.description) operations.push({ op: "set_description", value: config.description });
    if (config.source_address) operations.push({ op: "set_source_address", value: config.source_address });
    if (config.source_interface) operations.push({ op: "set_source_interface", value: config.source_interface });
    if (config.group) operations.push({ op: "set_group", value: config.group });
    if (config.port) operations.push({ op: "set_port", value: config.port });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.mac) operations.push({ op: "set_mac", value: config.mac });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.disabled) operations.push({ op: "set_disable" });
    if (config.gpe) operations.push({ op: "set_gpe" });

    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    if (config.remotes) {
      for (const remote of config.remotes) {
        operations.push({ op: "set_remote", value: remote });
      }
    }

    // Parameters
    if (config.parameters) {
      const p = config.parameters;
      if (p.external) operations.push({ op: "set_parameters_external" });
      if (p.nolearning) operations.push({ op: "set_parameters_nolearning" });
      if (p.neighbor_suppress) operations.push({ op: "set_parameters_neighbor_suppress" });
      if (p.vni_filter) operations.push({ op: "set_parameters_vni_filter" });
      if (p.ip_df) operations.push({ op: "set_parameters_ip_df", value: p.ip_df });
      if (p.ip_tos) operations.push({ op: "set_parameters_ip_tos", value: p.ip_tos });
      if (p.ip_ttl) operations.push({ op: "set_parameters_ip_ttl", value: p.ip_ttl });
      if (p.ipv6_flowlabel) operations.push({ op: "set_parameters_ipv6_flowlabel", value: p.ipv6_flowlabel });
    }

    // Mirror
    if (config.mirror) {
      if (config.mirror.ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror.ingress });
      if (config.mirror.egress) operations.push({ op: "set_mirror_egress", value: config.mirror.egress });
    }

    // IP settings
    if (config.ip) {
      const ip = config.ip;
      if (ip.adjust_mss) operations.push({ op: "set_ip_adjust_mss", value: ip.adjust_mss });
      if (ip.arp_cache_timeout) operations.push({ op: "set_ip_arp_cache_timeout", value: ip.arp_cache_timeout });
      if (ip.disable_arp_filter) operations.push({ op: "set_ip_disable_arp_filter" });
      if (ip.disable_forwarding) operations.push({ op: "set_ip_disable_forwarding" });
      if (ip.enable_arp_accept) operations.push({ op: "set_ip_enable_arp_accept" });
      if (ip.enable_arp_announce) operations.push({ op: "set_ip_enable_arp_announce" });
      if (ip.enable_arp_ignore) operations.push({ op: "set_ip_enable_arp_ignore" });
      if (ip.enable_directed_broadcast) operations.push({ op: "set_ip_enable_directed_broadcast" });
      if (ip.enable_proxy_arp) operations.push({ op: "set_ip_enable_proxy_arp" });
      if (ip.proxy_arp_pvlan) operations.push({ op: "set_ip_proxy_arp_pvlan" });
      if (ip.source_validation) operations.push({ op: "set_ip_source_validation", value: ip.source_validation });
    }

    // IPv6 settings
    if (config.ipv6) {
      const ipv6 = config.ipv6;
      if (ipv6.accept_dad) operations.push({ op: "set_ipv6_accept_dad", value: ipv6.accept_dad });
      if (ipv6.adjust_mss) operations.push({ op: "set_ipv6_adjust_mss", value: ipv6.adjust_mss });
      if (ipv6.base_reachable_time) operations.push({ op: "set_ipv6_base_reachable_time", value: ipv6.base_reachable_time });
      if (ipv6.disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
      if (ipv6.dup_addr_detect_transmits) operations.push({ op: "set_ipv6_dup_addr_detect_transmits", value: ipv6.dup_addr_detect_transmits });
      if (ipv6.source_validation) operations.push({ op: "set_ipv6_source_validation", value: ipv6.source_validation });
      if (ipv6.address_autoconf) operations.push({ op: "set_ipv6_address_autoconf" });
      if (ipv6.address_eui64) {
        for (const prefix of ipv6.address_eui64) {
          operations.push({ op: "set_ipv6_address_eui64", value: prefix });
        }
      }
      if (ipv6.address_interface_identifier) operations.push({ op: "set_ipv6_address_interface_identifier", value: ipv6.address_interface_identifier });
      if (ipv6.address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
    }

    // VLAN-to-VNI mappings
    if (config.vlan_to_vni) {
      for (const mapping of config.vlan_to_vni) {
        operations.push({ op: "set_vlan_to_vni", value: mapping.vlan_id });
        if (mapping.vni) {
          operations.push({ op: "set_vlan_to_vni_vni", value: `${mapping.vlan_id}:${mapping.vni}` });
        }
        if (mapping.description) {
          operations.push({ op: "set_vlan_to_vni_description", value: `${mapping.vlan_id}:${mapping.description}` });
        }
      }
    }

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: VxlanInterface,
    updated: {
      vni?: string | null;
      description?: string | null;
      addresses?: string[];
      source_address?: string | null;
      source_interface?: string | null;
      group?: string | null;
      remotes?: string[];
      port?: string | null;
      mtu?: string | null;
      mac?: string | null;
      vrf?: string | null;
      redirect?: string | null;
      disabled?: boolean;
      gpe?: boolean;
      parameters?: {
        external?: boolean;
        nolearning?: boolean;
        neighbor_suppress?: boolean;
        vni_filter?: boolean;
        ip_df?: string | null;
        ip_tos?: string | null;
        ip_ttl?: string | null;
        ipv6_flowlabel?: string | null;
      };
      mirror?: {
        ingress?: string | null;
        egress?: string | null;
      };
      ip?: {
        adjust_mss?: string | null;
        arp_cache_timeout?: string | null;
        disable_arp_filter?: boolean;
        disable_forwarding?: boolean;
        enable_arp_accept?: boolean;
        enable_arp_announce?: boolean;
        enable_arp_ignore?: boolean;
        enable_directed_broadcast?: boolean;
        enable_proxy_arp?: boolean;
        proxy_arp_pvlan?: boolean;
        source_validation?: string | null;
      };
      ipv6?: {
        accept_dad?: string | null;
        adjust_mss?: string | null;
        base_reachable_time?: string | null;
        disable_forwarding?: boolean;
        dup_addr_detect_transmits?: string | null;
        source_validation?: string | null;
        address_autoconf?: boolean;
        address_eui64?: string[];
        address_interface_identifier?: string | null;
        address_no_default_link_local?: boolean;
      };
      vlan_to_vni?: { vlan_id: string; vni: string | null; description?: string | null }[];
    }
  ): Promise<VyOSResponse> {
    const operations: VxlanBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "vni", setOp: "set_vni", deleteOp: "delete_vni", currentVal: current.vni },
      { key: "description", setOp: "set_description", deleteOp: "delete_description", currentVal: current.description },
      { key: "source_address", setOp: "set_source_address", deleteOp: "delete_source_address", currentVal: current.source_address },
      { key: "source_interface", setOp: "set_source_interface", deleteOp: "delete_source_interface", currentVal: current.source_interface },
      { key: "group", setOp: "set_group", deleteOp: "delete_group", currentVal: current.group },
      { key: "port", setOp: "set_port", deleteOp: "delete_port", currentVal: current.port },
      { key: "mtu", setOp: "set_mtu", deleteOp: "delete_mtu", currentVal: current.mtu },
      { key: "mac", setOp: "set_mac", deleteOp: "delete_mac", currentVal: current.mac },
      { key: "vrf", setOp: "set_vrf", deleteOp: "delete_vrf", currentVal: current.vrf },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
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
    if (updated.disabled !== undefined && updated.disabled !== current.disabled) {
      operations.push({ op: updated.disabled ? "set_disable" : "delete_disable" });
    }
    if (updated.gpe !== undefined && updated.gpe !== current.gpe) {
      operations.push({ op: updated.gpe ? "set_gpe" : "delete_gpe" });
    }

    // Array fields: addresses
    if (updated.addresses !== undefined) {
      for (const addr of current.addresses) {
        operations.push({ op: "delete_address", value: addr });
      }
      for (const addr of updated.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    // Array fields: remotes
    if (updated.remotes !== undefined) {
      for (const remote of current.remotes) {
        operations.push({ op: "delete_remote", value: remote });
      }
      for (const remote of updated.remotes) {
        operations.push({ op: "set_remote", value: remote });
      }
    }

    // Parameters
    if (updated.parameters) {
      const p = updated.parameters;
      const cp = current.parameters;

      const boolParams: { key: keyof typeof p; setOp: string; deleteOp: string; currentVal: boolean }[] = [
        { key: "external", setOp: "set_parameters_external", deleteOp: "delete_parameters_external", currentVal: cp.external },
        { key: "nolearning", setOp: "set_parameters_nolearning", deleteOp: "delete_parameters_nolearning", currentVal: cp.nolearning },
        { key: "neighbor_suppress", setOp: "set_parameters_neighbor_suppress", deleteOp: "delete_parameters_neighbor_suppress", currentVal: cp.neighbor_suppress },
        { key: "vni_filter", setOp: "set_parameters_vni_filter", deleteOp: "delete_parameters_vni_filter", currentVal: cp.vni_filter },
      ];

      for (const param of boolParams) {
        if (param.key in p && p[param.key] !== param.currentVal) {
          operations.push({ op: p[param.key] ? param.setOp : param.deleteOp });
        }
      }

      const strParams: { key: keyof typeof p; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "ip_df", setOp: "set_parameters_ip_df", deleteOp: "delete_parameters_ip_df", currentVal: cp.ip.df },
        { key: "ip_tos", setOp: "set_parameters_ip_tos", deleteOp: "delete_parameters_ip_tos", currentVal: cp.ip.tos },
        { key: "ip_ttl", setOp: "set_parameters_ip_ttl", deleteOp: "delete_parameters_ip_ttl", currentVal: cp.ip.ttl },
        { key: "ipv6_flowlabel", setOp: "set_parameters_ipv6_flowlabel", deleteOp: "delete_parameters_ipv6_flowlabel", currentVal: cp.ipv6.flowlabel },
      ];

      for (const param of strParams) {
        if (param.key in p) {
          const newVal = p[param.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: param.setOp, value: newVal });
          } else if (param.currentVal) {
            operations.push({ op: param.deleteOp });
          }
        }
      }
    }

    // Mirror
    if (updated.mirror) {
      if ("ingress" in updated.mirror) {
        if (updated.mirror.ingress) {
          operations.push({ op: "set_mirror_ingress", value: updated.mirror.ingress });
        } else if (current.mirror.ingress) {
          operations.push({ op: "delete_mirror_ingress" });
        }
      }
      if ("egress" in updated.mirror) {
        if (updated.mirror.egress) {
          operations.push({ op: "set_mirror_egress", value: updated.mirror.egress });
        } else if (current.mirror.egress) {
          operations.push({ op: "delete_mirror_egress" });
        }
      }
    }

    // IP settings
    if (updated.ip) {
      const ip = updated.ip;
      const cip = current.ip;

      const ipStr: { key: keyof typeof ip; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "adjust_mss", setOp: "set_ip_adjust_mss", deleteOp: "delete_ip_adjust_mss", currentVal: cip.adjust_mss },
        { key: "arp_cache_timeout", setOp: "set_ip_arp_cache_timeout", deleteOp: "delete_ip_arp_cache_timeout", currentVal: cip.arp_cache_timeout },
        { key: "source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: cip.source_validation },
      ];
      for (const field of ipStr) {
        if (field.key in ip) {
          const newVal = ip[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }

      const ipBool: { key: keyof typeof ip; setOp: string; deleteOp: string; currentVal: boolean }[] = [
        { key: "disable_arp_filter", setOp: "set_ip_disable_arp_filter", deleteOp: "delete_ip_disable_arp_filter", currentVal: cip.disable_arp_filter },
        { key: "disable_forwarding", setOp: "set_ip_disable_forwarding", deleteOp: "delete_ip_disable_forwarding", currentVal: cip.disable_forwarding },
        { key: "enable_arp_accept", setOp: "set_ip_enable_arp_accept", deleteOp: "delete_ip_enable_arp_accept", currentVal: cip.enable_arp_accept },
        { key: "enable_arp_announce", setOp: "set_ip_enable_arp_announce", deleteOp: "delete_ip_enable_arp_announce", currentVal: cip.enable_arp_announce },
        { key: "enable_arp_ignore", setOp: "set_ip_enable_arp_ignore", deleteOp: "delete_ip_enable_arp_ignore", currentVal: cip.enable_arp_ignore },
        { key: "enable_directed_broadcast", setOp: "set_ip_enable_directed_broadcast", deleteOp: "delete_ip_enable_directed_broadcast", currentVal: cip.enable_directed_broadcast },
        { key: "enable_proxy_arp", setOp: "set_ip_enable_proxy_arp", deleteOp: "delete_ip_enable_proxy_arp", currentVal: cip.enable_proxy_arp },
        { key: "proxy_arp_pvlan", setOp: "set_ip_proxy_arp_pvlan", deleteOp: "delete_ip_proxy_arp_pvlan", currentVal: cip.proxy_arp_pvlan },
      ];
      for (const field of ipBool) {
        if (field.key in ip && ip[field.key] !== field.currentVal) {
          operations.push({ op: ip[field.key] ? field.setOp : field.deleteOp });
        }
      }
    }

    // IPv6 settings
    if (updated.ipv6) {
      const ipv6 = updated.ipv6;
      const cipv6 = current.ipv6;

      const ipv6Str: { key: keyof typeof ipv6; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "accept_dad", setOp: "set_ipv6_accept_dad", deleteOp: "delete_ipv6_accept_dad", currentVal: cipv6.accept_dad },
        { key: "adjust_mss", setOp: "set_ipv6_adjust_mss", deleteOp: "delete_ipv6_adjust_mss", currentVal: cipv6.adjust_mss },
        { key: "base_reachable_time", setOp: "set_ipv6_base_reachable_time", deleteOp: "delete_ipv6_base_reachable_time", currentVal: cipv6.base_reachable_time },
        { key: "dup_addr_detect_transmits", setOp: "set_ipv6_dup_addr_detect_transmits", deleteOp: "delete_ipv6_dup_addr_detect_transmits", currentVal: cipv6.dup_addr_detect_transmits },
        { key: "source_validation", setOp: "set_ipv6_source_validation", deleteOp: "delete_ipv6_source_validation", currentVal: cipv6.source_validation },
        { key: "address_interface_identifier", setOp: "set_ipv6_address_interface_identifier", deleteOp: "delete_ipv6_address_interface_identifier", currentVal: cipv6.address.interface_identifier },
      ];
      for (const field of ipv6Str) {
        if (field.key in ipv6) {
          const newVal = ipv6[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }

      if (ipv6.disable_forwarding !== undefined && ipv6.disable_forwarding !== cipv6.disable_forwarding) {
        operations.push({ op: ipv6.disable_forwarding ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding" });
      }
      if (ipv6.address_autoconf !== undefined && ipv6.address_autoconf !== cipv6.address.autoconf) {
        operations.push({ op: ipv6.address_autoconf ? "set_ipv6_address_autoconf" : "delete_ipv6_address_autoconf" });
      }
      if (ipv6.address_no_default_link_local !== undefined && ipv6.address_no_default_link_local !== cipv6.address.no_default_link_local) {
        operations.push({ op: ipv6.address_no_default_link_local ? "set_ipv6_address_no_default_link_local" : "delete_ipv6_address_no_default_link_local" });
      }

      // EUI64 array
      if (ipv6.address_eui64 !== undefined) {
        for (const prefix of cipv6.address.eui64) {
          operations.push({ op: "delete_ipv6_address_eui64", value: prefix });
        }
        for (const prefix of ipv6.address_eui64) {
          operations.push({ op: "set_ipv6_address_eui64", value: prefix });
        }
      }
    }

    // VLAN-to-VNI mappings
    if (updated.vlan_to_vni !== undefined) {
      // Delete all existing mappings
      if (current.vlan_to_vni.length > 0) {
        operations.push({ op: "delete_all_vlan_to_vni" });
      }
      // Set new mappings
      for (const mapping of updated.vlan_to_vni) {
        operations.push({ op: "set_vlan_to_vni", value: mapping.vlan_id });
        if (mapping.vni) {
          operations.push({ op: "set_vlan_to_vni_vni", value: `${mapping.vlan_id}:${mapping.vni}` });
        }
        if (mapping.description) {
          operations.push({ op: "set_vlan_to_vni_description", value: `${mapping.vlan_id}:${mapping.description}` });
        }
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const vxlanService = new VxlanService();
