import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface TunnelIpSettings {
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

export interface TunnelIpv6Address {
  autoconf: boolean;
  eui64: string[];
  no_default_link_local: boolean;
}

export interface TunnelIpv6Settings {
  accept_dad: string | null;
  address: TunnelIpv6Address;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface TunnelMirror {
  egress: string | null;
  ingress: string | null;
}

export interface TunnelParametersErspan {
  direction: string | null;
  hw_id: string | null;
  index: string | null;
  version: string | null;
}

export interface TunnelParametersIp {
  ignore_df: boolean;
  key: string | null;
  no_pmtu_discovery: boolean;
  tos: string | null;
  ttl: string | null;
}

export interface TunnelParametersIpv6 {
  encaplimit: string | null;
  flowlabel: string | null;
  hoplimit: string | null;
  tclass: string | null;
}

export interface TunnelParameters {
  erspan: TunnelParametersErspan;
  ip: TunnelParametersIp;
  ipv6: TunnelParametersIpv6;
}

export interface TunnelInterface {
  name: string;
  sixrd_prefix: string | null;
  sixrd_relay_prefix: string | null;
  addresses: string[];
  description: string | null;
  disabled: boolean;
  disable_link_detect: boolean;
  enable_multicast: boolean;
  encapsulation: string | null;
  ip: TunnelIpSettings;
  ipv6: TunnelIpv6Settings;
  mirror: TunnelMirror;
  mtu: string | null;
  parameters: TunnelParameters;
  redirect: string | null;
  remote: string | null;
  source_address: string | null;
  source_interface: string | null;
  vrf: string | null;
}

export interface TunnelConfigResponse {
  interfaces: TunnelInterface[];
  total: number;
}

export interface TunnelCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string; options?: string[] }>;
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

export interface TunnelBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class TunnelService {
  async getCapabilities(): Promise<TunnelCapabilities> {
    return apiClient.get<TunnelCapabilities>("/vyos/tunnel/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<TunnelConfigResponse> {
    return apiClient.get<TunnelConfigResponse>("/vyos/tunnel/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: TunnelBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/tunnel/batch", {
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
    encapsulation?: string;
    description?: string;
    addresses?: string[];
    source_address?: string;
    source_interface?: string;
    remote?: string;
    mtu?: string;
    vrf?: string;
    redirect?: string;
    disabled?: boolean;
    disable_link_detect?: boolean;
    enable_multicast?: boolean;
    sixrd_prefix?: string;
    sixrd_relay_prefix?: string;
    parameters?: {
      erspan_direction?: string;
      erspan_hw_id?: string;
      erspan_index?: string;
      erspan_version?: string;
      ip_ignore_df?: boolean;
      ip_key?: string;
      ip_no_pmtu_discovery?: boolean;
      ip_tos?: string;
      ip_ttl?: string;
      ipv6_encaplimit?: string;
      ipv6_flowlabel?: string;
      ipv6_hoplimit?: string;
      ipv6_tclass?: string;
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
      address_no_default_link_local?: boolean;
    };
  }): Promise<VyOSResponse> {
    const operations: TunnelBatchOperation[] = [];

    operations.push({ op: "set_interface" });

    if (config.encapsulation) operations.push({ op: "set_encapsulation", value: config.encapsulation });
    if (config.description) operations.push({ op: "set_description", value: config.description });
    if (config.source_address) operations.push({ op: "set_source_address", value: config.source_address });
    if (config.source_interface) operations.push({ op: "set_source_interface", value: config.source_interface });
    if (config.remote) operations.push({ op: "set_remote", value: config.remote });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.disabled) operations.push({ op: "set_disable" });
    if (config.disable_link_detect) operations.push({ op: "set_disable_link_detect" });
    if (config.enable_multicast) operations.push({ op: "set_enable_multicast" });
    if (config.sixrd_prefix) operations.push({ op: "set_6rd_prefix", value: config.sixrd_prefix });
    if (config.sixrd_relay_prefix) operations.push({ op: "set_6rd_relay_prefix", value: config.sixrd_relay_prefix });

    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    // Parameters
    if (config.parameters) {
      const p = config.parameters;
      if (p.erspan_direction) operations.push({ op: "set_parameters_erspan_direction", value: p.erspan_direction });
      if (p.erspan_hw_id) operations.push({ op: "set_parameters_erspan_hw_id", value: p.erspan_hw_id });
      if (p.erspan_index) operations.push({ op: "set_parameters_erspan_index", value: p.erspan_index });
      if (p.erspan_version) operations.push({ op: "set_parameters_erspan_version", value: p.erspan_version });
      if (p.ip_ignore_df) operations.push({ op: "set_parameters_ip_ignore_df" });
      if (p.ip_key) operations.push({ op: "set_parameters_ip_key", value: p.ip_key });
      if (p.ip_no_pmtu_discovery) operations.push({ op: "set_parameters_ip_no_pmtu_discovery" });
      if (p.ip_tos) operations.push({ op: "set_parameters_ip_tos", value: p.ip_tos });
      if (p.ip_ttl) operations.push({ op: "set_parameters_ip_ttl", value: p.ip_ttl });
      if (p.ipv6_encaplimit) operations.push({ op: "set_parameters_ipv6_encaplimit", value: p.ipv6_encaplimit });
      if (p.ipv6_flowlabel) operations.push({ op: "set_parameters_ipv6_flowlabel", value: p.ipv6_flowlabel });
      if (p.ipv6_hoplimit) operations.push({ op: "set_parameters_ipv6_hoplimit", value: p.ipv6_hoplimit });
      if (p.ipv6_tclass) operations.push({ op: "set_parameters_ipv6_tclass", value: p.ipv6_tclass });
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
      if (ipv6.address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
    }

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: TunnelInterface,
    updated: {
      description?: string | null;
      addresses?: string[];
      source_address?: string | null;
      source_interface?: string | null;
      remote?: string | null;
      mtu?: string | null;
      vrf?: string | null;
      redirect?: string | null;
      disabled?: boolean;
      disable_link_detect?: boolean;
      enable_multicast?: boolean;
      sixrd_prefix?: string | null;
      sixrd_relay_prefix?: string | null;
      parameters?: {
        erspan_direction?: string | null;
        erspan_hw_id?: string | null;
        erspan_index?: string | null;
        erspan_version?: string | null;
        ip_ignore_df?: boolean;
        ip_key?: string | null;
        ip_no_pmtu_discovery?: boolean;
        ip_tos?: string | null;
        ip_ttl?: string | null;
        ipv6_encaplimit?: string | null;
        ipv6_flowlabel?: string | null;
        ipv6_hoplimit?: string | null;
        ipv6_tclass?: string | null;
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
        address_no_default_link_local?: boolean;
      };
    }
  ): Promise<VyOSResponse> {
    const operations: TunnelBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_description", deleteOp: "delete_description", currentVal: current.description },
      { key: "source_address", setOp: "set_source_address", deleteOp: "delete_source_address", currentVal: current.source_address },
      { key: "source_interface", setOp: "set_source_interface", deleteOp: "delete_source_interface", currentVal: current.source_interface },
      { key: "remote", setOp: "set_remote", deleteOp: "delete_remote", currentVal: current.remote },
      { key: "mtu", setOp: "set_mtu", deleteOp: "delete_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_vrf", deleteOp: "delete_vrf", currentVal: current.vrf },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
      { key: "sixrd_prefix", setOp: "set_6rd_prefix", deleteOp: "delete_6rd_prefix", currentVal: current.sixrd_prefix },
      { key: "sixrd_relay_prefix", setOp: "set_6rd_relay_prefix", deleteOp: "delete_6rd_relay_prefix", currentVal: current.sixrd_relay_prefix },
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
    if (updated.disable_link_detect !== undefined && updated.disable_link_detect !== current.disable_link_detect) {
      operations.push({ op: updated.disable_link_detect ? "set_disable_link_detect" : "delete_disable_link_detect" });
    }
    if (updated.enable_multicast !== undefined && updated.enable_multicast !== current.enable_multicast) {
      operations.push({ op: updated.enable_multicast ? "set_enable_multicast" : "delete_enable_multicast" });
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

    // Parameters
    if (updated.parameters) {
      const p = updated.parameters;
      const cp = current.parameters;

      // ERSPAN string params
      const erspanStr: { key: keyof typeof p; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "erspan_direction", setOp: "set_parameters_erspan_direction", deleteOp: "delete_parameters_erspan_direction", currentVal: cp.erspan.direction },
        { key: "erspan_hw_id", setOp: "set_parameters_erspan_hw_id", deleteOp: "delete_parameters_erspan_hw_id", currentVal: cp.erspan.hw_id },
        { key: "erspan_index", setOp: "set_parameters_erspan_index", deleteOp: "delete_parameters_erspan_index", currentVal: cp.erspan.index },
        { key: "erspan_version", setOp: "set_parameters_erspan_version", deleteOp: "delete_parameters_erspan_version", currentVal: cp.erspan.version },
      ];
      for (const field of erspanStr) {
        if (field.key in p) {
          const newVal = p[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }

      // IP boolean params
      if (p.ip_ignore_df !== undefined && p.ip_ignore_df !== cp.ip.ignore_df) {
        operations.push({ op: p.ip_ignore_df ? "set_parameters_ip_ignore_df" : "delete_parameters_ip_ignore_df" });
      }
      if (p.ip_no_pmtu_discovery !== undefined && p.ip_no_pmtu_discovery !== cp.ip.no_pmtu_discovery) {
        operations.push({ op: p.ip_no_pmtu_discovery ? "set_parameters_ip_no_pmtu_discovery" : "delete_parameters_ip_no_pmtu_discovery" });
      }

      // IP string params
      const ipStr: { key: keyof typeof p; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "ip_key", setOp: "set_parameters_ip_key", deleteOp: "delete_parameters_ip_key", currentVal: cp.ip.key },
        { key: "ip_tos", setOp: "set_parameters_ip_tos", deleteOp: "delete_parameters_ip_tos", currentVal: cp.ip.tos },
        { key: "ip_ttl", setOp: "set_parameters_ip_ttl", deleteOp: "delete_parameters_ip_ttl", currentVal: cp.ip.ttl },
      ];
      for (const field of ipStr) {
        if (field.key in p) {
          const newVal = p[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }

      // IPv6 string params
      const ipv6Str: { key: keyof typeof p; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "ipv6_encaplimit", setOp: "set_parameters_ipv6_encaplimit", deleteOp: "delete_parameters_ipv6_encaplimit", currentVal: cp.ipv6.encaplimit },
        { key: "ipv6_flowlabel", setOp: "set_parameters_ipv6_flowlabel", deleteOp: "delete_parameters_ipv6_flowlabel", currentVal: cp.ipv6.flowlabel },
        { key: "ipv6_hoplimit", setOp: "set_parameters_ipv6_hoplimit", deleteOp: "delete_parameters_ipv6_hoplimit", currentVal: cp.ipv6.hoplimit },
        { key: "ipv6_tclass", setOp: "set_parameters_ipv6_tclass", deleteOp: "delete_parameters_ipv6_tclass", currentVal: cp.ipv6.tclass },
      ];
      for (const field of ipv6Str) {
        if (field.key in p) {
          const newVal = p[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
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

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const tunnelService = new TunnelService();
