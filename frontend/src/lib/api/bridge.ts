import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BridgeMemberInterfaceConfig {
  name: string;
  cost: string | null;
  priority: string | null;
  isolated: boolean;
  native_vlan: string | null;
  allowed_vlan: string[];
  bpdu_guard: boolean;
  root_guard: boolean;
}

export interface BridgeIgmpConfig {
  snooping: boolean;
  querier: boolean;
}

export interface BridgeMirror {
  ingress: string | null;
  egress: string | null;
}

export interface BridgeIpSettings {
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

export interface BridgeIpv6Settings {
  accept_dad: string | null;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
  address_autoconf: boolean;
  address_eui64: string[];
  address_no_default_link_local: boolean;
  address_interface_identifier: string | null;
}

export interface BridgeDhcpOptions {
  client_id: string | null;
  default_route_distance: string | null;
  host_name: string | null;
  mtu: boolean;
  no_default_route: boolean;
  reject: string[];
  user_class: string | null;
  vendor_class_id: string | null;
}

export interface BridgeDhcpv6PdInterface {
  name: string;
  address: string | null;
  sla_id: string | null;
}

export interface BridgeDhcpv6Pd {
  id: string;
  length: string | null;
  interfaces: BridgeDhcpv6PdInterface[];
}

export interface BridgeDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  pd: BridgeDhcpv6Pd[];
}

export interface BridgeVifConfig {
  vlan_id: string;
  addresses: string[];
  description: string | null;
  disable: boolean;
  mtu: string | null;
  vrf: string | null;
  mac: string | null;
  egress_qos: string | null;
  ingress_qos: string | null;
}

export interface BridgeInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  disable: boolean;
  disable_link_detect: boolean;
  mac: string | null;
  mtu: string | null;
  vrf: string | null;
  redirect: string | null;
  // Bridge-specific
  aging: string | null;
  forwarding_delay: string | null;
  hello_time: string | null;
  max_age: string | null;
  priority: string | null;
  stp: boolean;
  enable_vlan: boolean;
  protocol: string | null;
  igmp: BridgeIgmpConfig | null;
  members: BridgeMemberInterfaceConfig[];
  // Sub-configs
  mirror: BridgeMirror | null;
  ip: BridgeIpSettings | null;
  ipv6: BridgeIpv6Settings | null;
  dhcp_options: BridgeDhcpOptions | null;
  dhcpv6_options: BridgeDhcpv6Options | null;
  vifs: BridgeVifConfig[];
}

export interface BridgeConfigResponse {
  interfaces: BridgeInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface BridgeCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string; options?: string[]; default?: string }>;
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

export interface BridgeBatchOperation {
  op: string;
  value?: string;
  member?: string;
  vlan_id?: string;
}

// ============================================================================
// API Service
// ============================================================================

class BridgeService {
  async getCapabilities(): Promise<BridgeCapabilities> {
    return apiClient.get<BridgeCapabilities>("/vyos/bridge/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<BridgeConfigResponse> {
    return apiClient.get<BridgeConfigResponse>("/vyos/bridge/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: BridgeBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/bridge/batch", {
      interface_name: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    description?: string;
    addresses?: string[];
    members?: { name: string; cost?: string; priority?: string; isolated?: boolean; native_vlan?: string; allowed_vlan?: string[]; bpdu_guard?: boolean; root_guard?: boolean }[];
    mtu?: string;
    vrf?: string;
    mac?: string;
    redirect?: string;
    disabled?: boolean;
    disable_link_detect?: boolean;
    // Bridge-specific
    stp?: boolean;
    enable_vlan?: boolean;
    protocol?: string;
    aging?: string;
    forwarding_delay?: string;
    hello_time?: string;
    max_age?: string;
    priority?: string;
    igmp_snooping?: boolean;
    igmp_querier?: boolean;
    mirror?: { ingress?: string; egress?: string };
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
      address_interface_identifier?: string;
    };
    dhcp_options?: {
      client_id?: string;
      default_route_distance?: string;
      host_name?: string;
      mtu?: boolean;
      no_default_route?: boolean;
      reject?: string[];
      user_class?: string;
      vendor_class_id?: string;
    };
    dhcpv6_options?: {
      duid?: string;
      no_release?: boolean;
      parameters_only?: boolean;
      rapid_commit?: boolean;
      temporary?: boolean;
      no_request_dns?: boolean;
      no_request_domain_name?: boolean;
    };
  }): Promise<VyOSResponse> {
    const operations: BridgeBatchOperation[] = [];

    // Bridge-specific settings first
    if (config.stp) operations.push({ op: "set_stp" });
    if (config.enable_vlan) operations.push({ op: "set_enable_vlan" });
    if (config.protocol) operations.push({ op: "set_protocol", value: config.protocol });
    if (config.aging) operations.push({ op: "set_aging", value: config.aging });
    if (config.forwarding_delay) operations.push({ op: "set_forwarding_delay", value: config.forwarding_delay });
    if (config.hello_time) operations.push({ op: "set_hello_time", value: config.hello_time });
    if (config.max_age) operations.push({ op: "set_max_age", value: config.max_age });
    if (config.priority) operations.push({ op: "set_priority", value: config.priority });
    if (config.igmp_snooping) operations.push({ op: "set_igmp_snooping" });
    if (config.igmp_querier) operations.push({ op: "set_igmp_querier" });

    // Common fields
    if (config.description) operations.push({ op: "set_description", value: config.description });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.mac) operations.push({ op: "set_mac", value: config.mac });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.disabled) operations.push({ op: "disable" });
    if (config.disable_link_detect) operations.push({ op: "set_disable_link_detect" });

    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    // Members with sub-properties
    if (config.members) {
      for (const m of config.members) {
        operations.push({ op: "add_member_interface", member: m.name });
        if (m.cost) operations.push({ op: "set_member_interface_cost", member: m.name, value: m.cost });
        if (m.priority) operations.push({ op: "set_member_interface_priority", member: m.name, value: m.priority });
        if (m.isolated) operations.push({ op: "set_member_interface_isolated", member: m.name });
        if (m.native_vlan) operations.push({ op: "set_member_interface_native_vlan", member: m.name, value: m.native_vlan });
        if (m.allowed_vlan) {
          for (const v of m.allowed_vlan) {
            operations.push({ op: "set_member_interface_allowed_vlan", member: m.name, value: v });
          }
        }
        if (m.bpdu_guard) operations.push({ op: "set_member_interface_bpdu_guard", member: m.name });
        if (m.root_guard) operations.push({ op: "set_member_interface_root_guard", member: m.name });
      }
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
      if (ipv6.address_interface_identifier) operations.push({ op: "set_ipv6_address_interface_identifier", value: ipv6.address_interface_identifier });
    }

    // DHCP Options
    if (config.dhcp_options) {
      const dhcp = config.dhcp_options;
      if (dhcp.client_id) operations.push({ op: "set_dhcp_options_client_id", value: dhcp.client_id });
      if (dhcp.default_route_distance) operations.push({ op: "set_dhcp_options_default_route_distance", value: dhcp.default_route_distance });
      if (dhcp.host_name) operations.push({ op: "set_dhcp_options_host_name", value: dhcp.host_name });
      if (dhcp.mtu) operations.push({ op: "set_dhcp_options_mtu" });
      if (dhcp.no_default_route) operations.push({ op: "set_dhcp_options_no_default_route" });
      if (dhcp.reject) {
        for (const r of dhcp.reject) {
          operations.push({ op: "set_dhcp_options_reject", value: r });
        }
      }
      if (dhcp.user_class) operations.push({ op: "set_dhcp_options_user_class", value: dhcp.user_class });
      if (dhcp.vendor_class_id) operations.push({ op: "set_dhcp_options_vendor_class_id", value: dhcp.vendor_class_id });
    }

    // DHCPv6 Options
    if (config.dhcpv6_options) {
      const dhcpv6 = config.dhcpv6_options;
      if (dhcpv6.duid) operations.push({ op: "set_dhcpv6_options_duid", value: dhcpv6.duid });
      if (dhcpv6.no_release) operations.push({ op: "set_dhcpv6_options_no_release" });
      if (dhcpv6.parameters_only) operations.push({ op: "set_dhcpv6_options_parameters_only" });
      if (dhcpv6.rapid_commit) operations.push({ op: "set_dhcpv6_options_rapid_commit" });
      if (dhcpv6.temporary) operations.push({ op: "set_dhcpv6_options_temporary" });
      if (dhcpv6.no_request_dns) operations.push({ op: "set_dhcpv6_options_no_request_dns" });
      if (dhcpv6.no_request_domain_name) operations.push({ op: "set_dhcpv6_options_no_request_domain_name" });
    }

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: BridgeInterface,
    updated: {
      description?: string | null;
      addresses?: string[];
      members?: { name: string; cost?: string | null; priority?: string | null; isolated?: boolean; native_vlan?: string | null; allowed_vlan?: string[]; bpdu_guard?: boolean; root_guard?: boolean }[];
      mtu?: string | null;
      vrf?: string | null;
      mac?: string | null;
      redirect?: string | null;
      disabled?: boolean;
      disable_link_detect?: boolean;
      // Bridge-specific
      stp?: boolean;
      enable_vlan?: boolean;
      protocol?: string | null;
      aging?: string | null;
      forwarding_delay?: string | null;
      hello_time?: string | null;
      max_age?: string | null;
      priority?: string | null;
      igmp_snooping?: boolean;
      igmp_querier?: boolean;
      mirror?: { ingress?: string | null; egress?: string | null };
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
        address_interface_identifier?: string | null;
      };
      dhcp_options?: {
        client_id?: string | null;
        default_route_distance?: string | null;
        host_name?: string | null;
        mtu?: boolean;
        no_default_route?: boolean;
        reject?: string[];
        user_class?: string | null;
        vendor_class_id?: string | null;
      };
      dhcpv6_options?: {
        duid?: string | null;
        no_release?: boolean;
        parameters_only?: boolean;
        rapid_commit?: boolean;
        temporary?: boolean;
        no_request_dns?: boolean;
        no_request_domain_name?: boolean;
      };
    }
  ): Promise<VyOSResponse> {
    const operations: BridgeBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_description", deleteOp: "delete_description", currentVal: current.description },
      { key: "mtu", setOp: "set_mtu", deleteOp: "delete_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_vrf", deleteOp: "delete_vrf", currentVal: current.vrf },
      { key: "mac", setOp: "set_mac", deleteOp: "delete_mac", currentVal: current.mac },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
      { key: "aging", setOp: "set_aging", deleteOp: "delete_aging", currentVal: current.aging },
      { key: "forwarding_delay", setOp: "set_forwarding_delay", deleteOp: "delete_forwarding_delay", currentVal: current.forwarding_delay },
      { key: "hello_time", setOp: "set_hello_time", deleteOp: "delete_hello_time", currentVal: current.hello_time },
      { key: "max_age", setOp: "set_max_age", deleteOp: "delete_max_age", currentVal: current.max_age },
      { key: "priority", setOp: "set_priority", deleteOp: "delete_priority", currentVal: current.priority },
      { key: "protocol", setOp: "set_protocol", deleteOp: "delete_protocol", currentVal: current.protocol },
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
    if (updated.disabled !== undefined && updated.disabled !== current.disable) {
      operations.push({ op: updated.disabled ? "disable" : "enable" });
    }
    if (updated.disable_link_detect !== undefined && updated.disable_link_detect !== current.disable_link_detect) {
      operations.push({ op: updated.disable_link_detect ? "set_disable_link_detect" : "delete_disable_link_detect" });
    }
    if (updated.stp !== undefined && updated.stp !== current.stp) {
      operations.push({ op: updated.stp ? "set_stp" : "delete_stp" });
    }
    if (updated.enable_vlan !== undefined && updated.enable_vlan !== current.enable_vlan) {
      operations.push({ op: updated.enable_vlan ? "set_enable_vlan" : "delete_enable_vlan" });
    }
    if (updated.igmp_snooping !== undefined && updated.igmp_snooping !== (current.igmp?.snooping ?? false)) {
      operations.push({ op: updated.igmp_snooping ? "set_igmp_snooping" : "delete_igmp_snooping" });
    }
    if (updated.igmp_querier !== undefined && updated.igmp_querier !== (current.igmp?.querier ?? false)) {
      operations.push({ op: updated.igmp_querier ? "set_igmp_querier" : "delete_igmp_querier" });
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

    // Members with sub-properties: delete all old members, add new ones
    if (updated.members !== undefined) {
      // Delete all existing members
      if (current.members.length > 0) {
        operations.push({ op: "delete_all_members" });
      }
      // Add new members with properties
      for (const m of updated.members) {
        operations.push({ op: "add_member_interface", member: m.name });
        if (m.cost) operations.push({ op: "set_member_interface_cost", member: m.name, value: m.cost });
        if (m.priority) operations.push({ op: "set_member_interface_priority", member: m.name, value: m.priority });
        if (m.isolated) operations.push({ op: "set_member_interface_isolated", member: m.name });
        if (m.native_vlan) operations.push({ op: "set_member_interface_native_vlan", member: m.name, value: m.native_vlan });
        if (m.allowed_vlan) {
          for (const v of m.allowed_vlan) {
            operations.push({ op: "set_member_interface_allowed_vlan", member: m.name, value: v });
          }
        }
        if (m.bpdu_guard) operations.push({ op: "set_member_interface_bpdu_guard", member: m.name });
        if (m.root_guard) operations.push({ op: "set_member_interface_root_guard", member: m.name });
      }
    }

    // Mirror
    if (updated.mirror) {
      if ("ingress" in updated.mirror) {
        if (updated.mirror.ingress) {
          operations.push({ op: "set_mirror_ingress", value: updated.mirror.ingress });
        } else if (current.mirror?.ingress) {
          operations.push({ op: "delete_mirror_ingress" });
        }
      }
      if ("egress" in updated.mirror) {
        if (updated.mirror.egress) {
          operations.push({ op: "set_mirror_egress", value: updated.mirror.egress });
        } else if (current.mirror?.egress) {
          operations.push({ op: "delete_mirror_egress" });
        }
      }
    }

    // IP settings
    if (updated.ip) {
      const ip = updated.ip;
      const cip = current.ip ?? ({} as BridgeIpSettings);

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
      const cipv6 = current.ipv6 ?? ({} as BridgeIpv6Settings);

      const ipv6Str: { key: keyof typeof ipv6; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "accept_dad", setOp: "set_ipv6_accept_dad", deleteOp: "delete_ipv6_accept_dad", currentVal: cipv6.accept_dad },
        { key: "adjust_mss", setOp: "set_ipv6_adjust_mss", deleteOp: "delete_ipv6_adjust_mss", currentVal: cipv6.adjust_mss },
        { key: "base_reachable_time", setOp: "set_ipv6_base_reachable_time", deleteOp: "delete_ipv6_base_reachable_time", currentVal: cipv6.base_reachable_time },
        { key: "dup_addr_detect_transmits", setOp: "set_ipv6_dup_addr_detect_transmits", deleteOp: "delete_ipv6_dup_addr_detect_transmits", currentVal: cipv6.dup_addr_detect_transmits },
        { key: "source_validation", setOp: "set_ipv6_source_validation", deleteOp: "delete_ipv6_source_validation", currentVal: cipv6.source_validation },
        { key: "address_interface_identifier", setOp: "set_ipv6_address_interface_identifier", deleteOp: "delete_ipv6_address_interface_identifier", currentVal: cipv6.address_interface_identifier },
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
      if (ipv6.address_autoconf !== undefined && ipv6.address_autoconf !== cipv6.address_autoconf) {
        operations.push({ op: ipv6.address_autoconf ? "set_ipv6_address_autoconf" : "delete_ipv6_address_autoconf" });
      }
      if (ipv6.address_no_default_link_local !== undefined && ipv6.address_no_default_link_local !== cipv6.address_no_default_link_local) {
        operations.push({ op: ipv6.address_no_default_link_local ? "set_ipv6_address_no_default_link_local" : "delete_ipv6_address_no_default_link_local" });
      }

      if (ipv6.address_eui64 !== undefined) {
        for (const prefix of cipv6.address_eui64 ?? []) {
          operations.push({ op: "delete_ipv6_address_eui64", value: prefix });
        }
        for (const prefix of ipv6.address_eui64) {
          operations.push({ op: "set_ipv6_address_eui64", value: prefix });
        }
      }
    }

    // DHCP Options
    if (updated.dhcp_options) {
      const dhcp = updated.dhcp_options;
      const cdhcp = current.dhcp_options ?? ({} as BridgeDhcpOptions);

      const dhcpStr: { key: keyof typeof dhcp; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "client_id", setOp: "set_dhcp_options_client_id", deleteOp: "delete_dhcp_options_client_id", currentVal: cdhcp.client_id },
        { key: "default_route_distance", setOp: "set_dhcp_options_default_route_distance", deleteOp: "delete_dhcp_options_default_route_distance", currentVal: cdhcp.default_route_distance },
        { key: "host_name", setOp: "set_dhcp_options_host_name", deleteOp: "delete_dhcp_options_host_name", currentVal: cdhcp.host_name },
        { key: "user_class", setOp: "set_dhcp_options_user_class", deleteOp: "delete_dhcp_options_user_class", currentVal: cdhcp.user_class },
        { key: "vendor_class_id", setOp: "set_dhcp_options_vendor_class_id", deleteOp: "delete_dhcp_options_vendor_class_id", currentVal: cdhcp.vendor_class_id },
      ];
      for (const field of dhcpStr) {
        if (field.key in dhcp) {
          const newVal = dhcp[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }

      if (dhcp.mtu !== undefined && dhcp.mtu !== cdhcp.mtu) {
        operations.push({ op: dhcp.mtu ? "set_dhcp_options_mtu" : "delete_dhcp_options_mtu" });
      }
      if (dhcp.no_default_route !== undefined && dhcp.no_default_route !== cdhcp.no_default_route) {
        operations.push({ op: dhcp.no_default_route ? "set_dhcp_options_no_default_route" : "delete_dhcp_options_no_default_route" });
      }

      if (dhcp.reject !== undefined) {
        for (const r of cdhcp.reject ?? []) {
          operations.push({ op: "delete_dhcp_options_reject", value: r });
        }
        for (const r of dhcp.reject) {
          operations.push({ op: "set_dhcp_options_reject", value: r });
        }
      }
    }

    // DHCPv6 Options
    if (updated.dhcpv6_options) {
      const dhcpv6 = updated.dhcpv6_options;
      const cdhcpv6 = current.dhcpv6_options ?? ({} as BridgeDhcpv6Options);

      if ("duid" in dhcpv6) {
        if (dhcpv6.duid) {
          operations.push({ op: "set_dhcpv6_options_duid", value: dhcpv6.duid });
        } else if (cdhcpv6.duid) {
          operations.push({ op: "delete_dhcpv6_options_duid" });
        }
      }

      const dhcpv6Bool: { key: keyof typeof dhcpv6; setOp: string; deleteOp: string; currentVal: boolean }[] = [
        { key: "no_release", setOp: "set_dhcpv6_options_no_release", deleteOp: "delete_dhcpv6_options_no_release", currentVal: cdhcpv6.no_release },
        { key: "parameters_only", setOp: "set_dhcpv6_options_parameters_only", deleteOp: "delete_dhcpv6_options_parameters_only", currentVal: cdhcpv6.parameters_only },
        { key: "rapid_commit", setOp: "set_dhcpv6_options_rapid_commit", deleteOp: "delete_dhcpv6_options_rapid_commit", currentVal: cdhcpv6.rapid_commit },
        { key: "temporary", setOp: "set_dhcpv6_options_temporary", deleteOp: "delete_dhcpv6_options_temporary", currentVal: cdhcpv6.temporary },
        { key: "no_request_dns", setOp: "set_dhcpv6_options_no_request_dns", deleteOp: "delete_dhcpv6_options_no_request_dns", currentVal: cdhcpv6.no_request_dns },
        { key: "no_request_domain_name", setOp: "set_dhcpv6_options_no_request_domain_name", deleteOp: "delete_dhcpv6_options_no_request_domain_name", currentVal: cdhcpv6.no_request_domain_name },
      ];
      for (const field of dhcpv6Bool) {
        if (field.key in dhcpv6 && dhcpv6[field.key] !== field.currentVal) {
          operations.push({ op: dhcpv6[field.key] ? field.setOp : field.deleteOp });
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

  async createVif(
    interfaceName: string,
    config: {
      vlan_id: string;
      addresses?: string[];
      description?: string;
      mtu?: string;
      vrf?: string;
      disabled?: boolean;
    }
  ): Promise<VyOSResponse> {
    const ops: BridgeBatchOperation[] = [{ op: "set_vif", vlan_id: config.vlan_id }];

    if (config.description) ops.push({ op: "set_vif_description", vlan_id: config.vlan_id, value: config.description });
    if (config.mtu) ops.push({ op: "set_vif_mtu", vlan_id: config.vlan_id, value: config.mtu });
    if (config.vrf) ops.push({ op: "set_vif_vrf", vlan_id: config.vlan_id, value: config.vrf });
    if (config.disabled) ops.push({ op: "set_vif_disable", vlan_id: config.vlan_id });
    for (const addr of config.addresses ?? []) {
      ops.push({ op: "set_vif_address", vlan_id: config.vlan_id, value: addr });
    }

    return this.batchConfigure(interfaceName, ops);
  }

  async updateVif(
    interfaceName: string,
    current: BridgeVifConfig,
    updated: {
      addresses?: string[];
      description?: string | null;
      mtu?: string | null;
      vrf?: string | null;
      disabled?: boolean;
    }
  ): Promise<VyOSResponse> {
    const vlan = current.vlan_id;
    const ops: BridgeBatchOperation[] = [];

    if ("description" in updated) {
      if (updated.description) {
        ops.push({ op: "set_vif_description", vlan_id: vlan, value: updated.description });
      } else if (current.description) {
        ops.push({ op: "delete_vif_description", vlan_id: vlan });
      }
    }

    if ("mtu" in updated) {
      if (updated.mtu) {
        ops.push({ op: "set_vif_mtu", vlan_id: vlan, value: updated.mtu });
      } else if (current.mtu) {
        ops.push({ op: "delete_vif_mtu", vlan_id: vlan });
      }
    }

    if ("vrf" in updated) {
      if (updated.vrf) {
        ops.push({ op: "set_vif_vrf", vlan_id: vlan, value: updated.vrf });
      } else if (current.vrf) {
        ops.push({ op: "delete_vif_vrf", vlan_id: vlan });
      }
    }

    if ("disabled" in updated && updated.disabled !== current.disable) {
      ops.push({ op: updated.disabled ? "set_vif_disable" : "delete_vif_disable", vlan_id: vlan });
    }

    if ("addresses" in updated && updated.addresses !== undefined) {
      for (const addr of current.addresses) {
        ops.push({ op: "delete_vif_address", vlan_id: vlan, value: addr });
      }
      for (const addr of updated.addresses) {
        ops.push({ op: "set_vif_address", vlan_id: vlan, value: addr });
      }
    }

    if (ops.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure(interfaceName, ops);
  }

  async deleteVif(interfaceName: string, vlanId: string): Promise<VyOSResponse> {
    return this.batchConfigure(interfaceName, [{ op: "delete_vif", vlan_id: vlanId }]);
  }
}

export const bridgeService = new BridgeService();
