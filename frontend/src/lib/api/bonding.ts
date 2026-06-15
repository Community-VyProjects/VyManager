import { apiClient } from "./client";
import type {
  BatchRequest,
  EthernetCapabilities,
  VlanBatchService,
} from "./types/ethernet";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BondingArpMonitor {
  interval: string | null;
  targets: string[];
}

export interface BondingEvpn {
  es_df_pref: string | null;
  es_id: string | null;
  es_sys_mac: string | null;
  uplink: boolean;
}

export interface BondingMirror {
  ingress: string | null;
  egress: string | null;
}

export interface BondingEapol {
  ca_certificate: string | null;
  certificate: string | null;
  passphrase: string | null;
}

export interface BondingIpSettings {
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

export interface BondingIpv6Settings {
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

export interface BondingDhcpOptions {
  client_id: string | null;
  default_route_distance: string | null;
  host_name: string | null;
  mtu: boolean;
  no_default_route: boolean;
  reject: string[];
  user_class: string | null;
  vendor_class_id: string | null;
}

export interface BondingDhcpv6PdInterface {
  name: string;
  address: string | null;
  sla_id: string | null;
}

export interface BondingDhcpv6Pd {
  id: string;
  length: string | null;
  interfaces: BondingDhcpv6PdInterface[];
}

export interface BondingDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  pd: BondingDhcpv6Pd[];
}

export interface BondingVifBaseConfig {
  vlan_id: string;
  addresses: string[];
  description: string | null;
  disable: boolean;
  disable_link_detect: boolean;
  mtu: string | null;
  mac: string | null;
  vrf: string | null;
  redirect: string | null;
  ip: BondingIpSettings | null;
  ipv6: BondingIpv6Settings | null;
  dhcp_options: BondingDhcpOptions | null;
  dhcpv6_options: BondingDhcpv6Options | null;
  mirror: BondingMirror | null;
}

export type BondingVifCConfig = BondingVifBaseConfig;

export interface BondingVifConfig extends BondingVifBaseConfig {
  egress_qos: string | null;
  ingress_qos: string | null;
}

export interface BondingVifSConfig extends BondingVifBaseConfig {
  protocol: string | null;
  vif_c: BondingVifCConfig[];
}

export interface BondingInterface {
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
  mode: string | null;
  hash_policy: string | null;
  lacp_rate: string | null;
  min_links: string | null;
  mii_mon_interval: string | null;
  primary: string | null;
  system_mac: string | null;
  members: string[];
  arp_monitor: BondingArpMonitor;
  evpn: BondingEvpn;
  mirror: BondingMirror;
  eapol: BondingEapol;
  ip: BondingIpSettings;
  ipv6: BondingIpv6Settings;
  dhcp_options: BondingDhcpOptions;
  dhcpv6_options: BondingDhcpv6Options;
  vifs: BondingVifConfig[];
  vif_s: BondingVifSConfig[];
}

export interface BondingConfigResponse {
  interfaces: BondingInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
  by_mode: Record<string, number>;
}

export interface BondingCapabilities {
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

export interface BondingBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class BondingService {
  async getCapabilities(): Promise<BondingCapabilities> {
    return apiClient.get<BondingCapabilities>("/vyos/bonding/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<BondingConfigResponse> {
    return apiClient.get<BondingConfigResponse>("/vyos/bonding/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: BondingBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/bonding/batch", {
      interface_name: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    mode?: string;
    description?: string;
    addresses?: string[];
    members?: string[];
    hash_policy?: string;
    lacp_rate?: string;
    min_links?: string;
    mii_mon_interval?: string;
    primary?: string;
    system_mac?: string;
    mtu?: string;
    vrf?: string;
    mac?: string;
    redirect?: string;
    disabled?: boolean;
    disable_link_detect?: boolean;
    arp_monitor?: {
      interval?: string;
      targets?: string[];
    };
    evpn?: {
      es_df_pref?: string;
      es_id?: string;
      es_sys_mac?: string;
      uplink?: boolean;
    };
    mirror?: {
      ingress?: string;
      egress?: string;
    };
    eapol?: {
      ca_certificate?: string;
      certificate?: string;
      passphrase?: string;
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
    const operations: BondingBatchOperation[] = [];

    // Mode first to bootstrap the interface path
    if (config.mode) operations.push({ op: "set_mode", value: config.mode });

    if (config.description) operations.push({ op: "set_description", value: config.description });
    if (config.hash_policy) operations.push({ op: "set_hash_policy", value: config.hash_policy });
    if (config.lacp_rate) operations.push({ op: "set_lacp_rate", value: config.lacp_rate });
    if (config.min_links) operations.push({ op: "set_min_links", value: config.min_links });
    if (config.mii_mon_interval) operations.push({ op: "set_mii_mon_interval", value: config.mii_mon_interval });
    if (config.primary) operations.push({ op: "set_primary", value: config.primary });
    if (config.system_mac) operations.push({ op: "set_system_mac", value: config.system_mac });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.mac) operations.push({ op: "set_mac", value: config.mac });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.disabled) operations.push({ op: "set_disable" });
    if (config.disable_link_detect) operations.push({ op: "set_disable_link_detect" });

    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    if (config.members) {
      for (const member of config.members) {
        operations.push({ op: "add_member_interface", value: member });
      }
    }

    // ARP Monitor
    if (config.arp_monitor) {
      if (config.arp_monitor.interval) operations.push({ op: "set_arp_monitor_interval", value: config.arp_monitor.interval });
      if (config.arp_monitor.targets) {
        for (const target of config.arp_monitor.targets) {
          operations.push({ op: "add_arp_monitor_target", value: target });
        }
      }
    }

    // EVPN
    if (config.evpn) {
      if (config.evpn.es_df_pref) operations.push({ op: "set_evpn_es_df_pref", value: config.evpn.es_df_pref });
      if (config.evpn.es_id) operations.push({ op: "set_evpn_es_id", value: config.evpn.es_id });
      if (config.evpn.es_sys_mac) operations.push({ op: "set_evpn_es_sys_mac", value: config.evpn.es_sys_mac });
      if (config.evpn.uplink) operations.push({ op: "set_evpn_uplink" });
    }

    // Mirror
    if (config.mirror) {
      if (config.mirror.ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror.ingress });
      if (config.mirror.egress) operations.push({ op: "set_mirror_egress", value: config.mirror.egress });
    }

    // EAPoL
    if (config.eapol) {
      if (config.eapol.ca_certificate) operations.push({ op: "set_eapol_ca_certificate", value: config.eapol.ca_certificate });
      if (config.eapol.certificate) operations.push({ op: "set_eapol_certificate", value: config.eapol.certificate });
      if (config.eapol.passphrase) operations.push({ op: "set_eapol_passphrase", value: config.eapol.passphrase });
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
    current: BondingInterface,
    updated: {
      mode?: string | null;
      description?: string | null;
      addresses?: string[];
      members?: string[];
      hash_policy?: string | null;
      lacp_rate?: string | null;
      min_links?: string | null;
      mii_mon_interval?: string | null;
      primary?: string | null;
      system_mac?: string | null;
      mtu?: string | null;
      vrf?: string | null;
      mac?: string | null;
      redirect?: string | null;
      disabled?: boolean;
      disable_link_detect?: boolean;
      arp_monitor?: {
        interval?: string | null;
        targets?: string[];
      };
      evpn?: {
        es_df_pref?: string | null;
        es_id?: string | null;
        es_sys_mac?: string | null;
        uplink?: boolean;
      };
      mirror?: {
        ingress?: string | null;
        egress?: string | null;
      };
      eapol?: {
        ca_certificate?: string | null;
        certificate?: string | null;
        passphrase?: string | null;
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
    const operations: BondingBatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "mode", setOp: "set_mode", deleteOp: "delete_mode", currentVal: current.mode },
      { key: "description", setOp: "set_description", deleteOp: "delete_description", currentVal: current.description },
      { key: "hash_policy", setOp: "set_hash_policy", deleteOp: "delete_hash_policy", currentVal: current.hash_policy },
      { key: "lacp_rate", setOp: "set_lacp_rate", deleteOp: "delete_lacp_rate", currentVal: current.lacp_rate },
      { key: "min_links", setOp: "set_min_links", deleteOp: "delete_min_links", currentVal: current.min_links },
      { key: "mii_mon_interval", setOp: "set_mii_mon_interval", deleteOp: "delete_mii_mon_interval", currentVal: current.mii_mon_interval },
      { key: "primary", setOp: "set_primary", deleteOp: "delete_primary", currentVal: current.primary },
      { key: "system_mac", setOp: "set_system_mac", deleteOp: "delete_system_mac", currentVal: current.system_mac },
      { key: "mtu", setOp: "set_mtu", deleteOp: "delete_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_vrf", deleteOp: "delete_vrf", currentVal: current.vrf },
      { key: "mac", setOp: "set_mac", deleteOp: "delete_mac", currentVal: current.mac },
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
    if (updated.disabled !== undefined && updated.disabled !== current.disable) {
      operations.push({ op: updated.disabled ? "set_disable" : "delete_disable" });
    }
    if (updated.disable_link_detect !== undefined && updated.disable_link_detect !== current.disable_link_detect) {
      operations.push({ op: updated.disable_link_detect ? "set_disable_link_detect" : "delete_disable_link_detect" });
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

    // Array fields: members
    if (updated.members !== undefined) {
      for (const member of current.members) {
        operations.push({ op: "delete_member_interface", value: member });
      }
      for (const member of updated.members) {
        operations.push({ op: "add_member_interface", value: member });
      }
    }

    // ARP Monitor
    if (updated.arp_monitor) {
      const am = updated.arp_monitor;
      if ("interval" in am) {
        if (am.interval) {
          operations.push({ op: "set_arp_monitor_interval", value: am.interval });
        } else if (current.arp_monitor.interval) {
          operations.push({ op: "delete_arp_monitor_interval" });
        }
      }
      if (am.targets !== undefined) {
        for (const t of current.arp_monitor.targets) {
          operations.push({ op: "delete_arp_monitor_target", value: t });
        }
        for (const t of am.targets) {
          operations.push({ op: "add_arp_monitor_target", value: t });
        }
      }
    }

    // EVPN
    if (updated.evpn) {
      const ev = updated.evpn;
      const cev = current.evpn;
      const evpnStr: { key: keyof typeof ev; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "es_df_pref", setOp: "set_evpn_es_df_pref", deleteOp: "delete_evpn_es_df_pref", currentVal: cev.es_df_pref },
        { key: "es_id", setOp: "set_evpn_es_id", deleteOp: "delete_evpn_es_id", currentVal: cev.es_id },
        { key: "es_sys_mac", setOp: "set_evpn_es_sys_mac", deleteOp: "delete_evpn_es_sys_mac", currentVal: cev.es_sys_mac },
      ];
      for (const field of evpnStr) {
        if (field.key in ev) {
          const newVal = ev[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
        }
      }
      if (ev.uplink !== undefined && ev.uplink !== cev.uplink) {
        operations.push({ op: ev.uplink ? "set_evpn_uplink" : "delete_evpn_uplink" });
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

    // EAPoL
    if (updated.eapol) {
      const eap = updated.eapol;
      const ceap = current.eapol;
      const eapolStr: { key: keyof typeof eap; setOp: string; deleteOp: string; currentVal: string | null }[] = [
        { key: "ca_certificate", setOp: "set_eapol_ca_certificate", deleteOp: "delete_eapol_ca_certificate", currentVal: ceap.ca_certificate },
        { key: "certificate", setOp: "set_eapol_certificate", deleteOp: "delete_eapol_certificate", currentVal: ceap.certificate },
        { key: "passphrase", setOp: "set_eapol_passphrase", deleteOp: "delete_eapol_passphrase", currentVal: ceap.passphrase },
      ];
      for (const field of eapolStr) {
        if (field.key in eap) {
          const newVal = eap[field.key] as string | null | undefined;
          if (newVal) {
            operations.push({ op: field.setOp, value: newVal });
          } else if (field.currentVal) {
            operations.push({ op: field.deleteOp });
          }
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
        for (const prefix of cipv6.address_eui64) {
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
      const cdhcp = current.dhcp_options;

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
        for (const r of cdhcp.reject) {
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
      const cdhcpv6 = current.dhcpv6_options;

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
}

export const bondingService = new BondingService();

// ============================================================================
// VLAN modal integration
//
// The shared Comprehensive VLAN/VIF-S/VIF-C modals are written against the
// ethernet service contract. These adapters let the very same modals drive
// bond VLANs: the wire format (op + comma-packed value) is identical, so we
// only need to map the request shape, synthesize a capabilities object, and
// reconcile the one differing field name in the IPv6 sub-config.
// ============================================================================

/** Adapter exposing the ethernet `VlanBatchService` contract over bondingService. */
export const bondingVlanService: VlanBatchService = {
  // bondingService.batchConfigure already refreshes config internally.
  batchConfigure: (request: BatchRequest) =>
    bondingService.batchConfigure(request.interface, request.operations as BondingBatchOperation[]),
  refreshConfig: async () => ({ success: true }),
};

const BOND_VLAN_FEATURES = [
  "vif_address", "vif_description", "vif_mtu", "vif_mac", "vif_vrf", "vif_redirect",
  "vif_disable", "vif_disable_link_detect", "vif_egress_qos", "vif_ingress_qos",
  "vif_s_protocol", "vif_mirror",
  "vif_ip", "vif_ip_adjust_mss", "vif_ip_arp_cache_timeout", "vif_ip_source_validation",
  "vif_ip_disable_arp_filter", "vif_ip_enable_arp_accept", "vif_ip_enable_arp_announce",
  "vif_ip_enable_arp_ignore", "vif_ip_enable_directed_broadcast",
  "vif_ipv6", "vif_ipv6_accept_dad", "vif_ipv6_adjust_mss", "vif_ipv6_base_reachable_time",
  "vif_ipv6_dup_addr_detect_transmits", "vif_ipv6_source_validation",
  "vif_ipv6_address_no_default_link_local",
  "vif_dhcp_options", "vif_dhcp_options_default_route_distance", "vif_dhcp_options_mtu",
  "vif_dhcp_options_no_default_route", "vif_dhcp_options_reject", "vif_dhcp_options_user_class",
  "vif_dhcp_options_vendor_class_id", "vif_dhcpv6_options",
] as const;

/**
 * Build an ethernet-shaped capabilities object describing what the bond VLAN
 * template tree supports, so the shared modals render the right fields.
 * - QoS exists only on `vif` (not vif-s/vif-c), gated per-scope in those modals.
 * - A few leaves are VyOS 1.5+ only.
 * - `tcp_mss` is intentionally omitted; the clamp value is reachable via the
 *   adjust-mss text field instead.
 */
export function bondingVlanCapabilities(version: string): EthernetCapabilities {
  const is15 = !version.includes("1.4");
  const vlan: Record<string, boolean> = {};
  for (const key of BOND_VLAN_FEATURES) vlan[key] = true;
  vlan.vif_ipv6_address_interface_identifier = is15;
  vlan.vif_dhcpv6_options_no_request_dns = is15;
  vlan.vif_dhcpv6_options_no_request_domain_name = is15;
  // QoS is not part of the vif-s / vif-c template subtree.
  vlan.vif_s_egress_qos = false;
  vlan.vif_s_ingress_qos = false;
  vlan.vif_c_egress_qos = false;
  vlan.vif_c_ingress_qos = false;
  return { version, features: { vlan } } as unknown as EthernetCapabilities;
}

/**
 * Map a bond vif/vif-s/vif-c sub-config onto the ethernet VIFConfig shape the
 * modals read. Field names already match except the IPv6 "no default
 * link-local" flag, so reconcile that one for correct edit-mode prefill.
 */
export function bondVifToVlanShape<T extends { ipv6?: BondingIpv6Settings | null }>(vif: T) {
  return {
    ...vif,
    ipv6: vif.ipv6
      ? { ...vif.ipv6, no_default_link_local: vif.ipv6.address_no_default_link_local }
      : vif.ipv6,
  };
}
