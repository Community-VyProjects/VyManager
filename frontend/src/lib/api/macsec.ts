import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MacsecMkaConfig {
  cak: string | null;
  ckn: string | null;
  priority: string | null;
}

export interface MacsecStaticPeer {
  name: string;
  key: string | null;
  mac: string | null;
  disable: boolean;
}

export interface MacsecStaticConfig {
  key: string | null;
  peers: MacsecStaticPeer[];
}

export interface MacsecSecurityConfig {
  cipher: string | null;
  encrypt: boolean;
  replay_window: string | null;
  mka: MacsecMkaConfig | null;
  static: MacsecStaticConfig | null;
}

export interface MacsecIpSettings {
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

export interface MacsecIpv6Settings {
  accept_dad: string | null;
  address_autoconf: boolean;
  address_eui64: string | null;
  address_no_default_link_local: boolean;
  address_interface_identifier: string | null;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface MacsecDhcpOptions {
  client_id: string | null;
  default_route_distance: string | null;
  host_name: string | null;
  mtu: boolean;
  no_default_route: boolean;
  reject: string | null;
  user_class: string | null;
  vendor_class_id: string | null;
}

export interface MacsecDhcpv6PdInterface {
  address: string | null;
  sla_id: string | null;
}

export interface MacsecDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  pd: Record<string, { length: string | null; interfaces: Record<string, MacsecDhcpv6PdInterface> }> | null;
}

export interface MacsecInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  disabled: boolean;
  mtu: string | null;
  source_interface: string | null;
  vrf: string | null;
  security: MacsecSecurityConfig | null;
  ip: MacsecIpSettings | null;
  ipv6: MacsecIpv6Settings | null;
  dhcp_options: MacsecDhcpOptions | null;
  dhcpv6_options: MacsecDhcpv6Options | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  redirect: string | null;
}

export interface MacsecConfigResponse {
  interfaces: MacsecInterface[];
  total: number;
}

export interface MacsecCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface MacsecBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class MacsecService {
  async getCapabilities(): Promise<MacsecCapabilities> {
    return apiClient.get<MacsecCapabilities>("/vyos/macsec/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<MacsecConfigResponse> {
    return apiClient.get<MacsecConfigResponse>("/vyos/macsec/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: MacsecBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/macsec/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    source_interface: string;
    description?: string;
    mtu?: string;
    vrf?: string;
    disabled?: boolean;
    addresses?: string[];
    security?: {
      cipher?: string;
      encrypt?: boolean;
      replay_window?: string;
      mka?: { cak?: string; ckn?: string; priority?: string };
      static_key?: string;
      static_peers?: { name: string; key?: string; mac?: string; disable?: boolean }[];
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
      address_autoconf?: boolean;
      address_eui64?: string;
      address_no_default_link_local?: boolean;
      address_interface_identifier?: string;
      adjust_mss?: string;
      base_reachable_time?: string;
      disable_forwarding?: boolean;
      dup_addr_detect_transmits?: string;
      source_validation?: string;
    };
    dhcp_options?: {
      client_id?: string;
      default_route_distance?: string;
      host_name?: string;
      mtu?: boolean;
      no_default_route?: boolean;
      reject?: string;
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
    mirror_ingress?: string;
    mirror_egress?: string;
    redirect?: string;
  }): Promise<VyOSResponse> {
    const operations: MacsecBatchOperation[] = [];

    // Source interface is required
    operations.push({ op: "set_source_interface", value: config.source_interface });

    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.disabled) operations.push({ op: "set_interface_disable" });

    // Addresses
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }

    // Security
    if (config.security) {
      if (config.security.cipher) operations.push({ op: "set_security_cipher", value: config.security.cipher });
      if (config.security.encrypt) operations.push({ op: "set_security_encrypt" });
      if (config.security.replay_window) operations.push({ op: "set_security_replay_window", value: config.security.replay_window });

      // MKA
      if (config.security.mka) {
        if (config.security.mka.cak) operations.push({ op: "set_security_mka_cak", value: config.security.mka.cak });
        if (config.security.mka.ckn) operations.push({ op: "set_security_mka_ckn", value: config.security.mka.ckn });
        if (config.security.mka.priority) operations.push({ op: "set_security_mka_priority", value: config.security.mka.priority });
      }

      // Static
      if (config.security.static_key) operations.push({ op: "set_security_static_key", value: config.security.static_key });
      if (config.security.static_peers) {
        for (const peer of config.security.static_peers) {
          operations.push({ op: "set_security_static_peer", value: peer.name });
          if (peer.key) operations.push({ op: "set_security_static_peer_key", value: `${peer.name}:${peer.key}` });
          if (peer.mac) operations.push({ op: "set_security_static_peer_mac", value: `${peer.name}:${peer.mac}` });
          if (peer.disable) operations.push({ op: "set_security_static_peer_disable", value: peer.name });
        }
      }
    }

    // IP settings
    if (config.ip) {
      if (config.ip.adjust_mss) operations.push({ op: "set_ip_adjust_mss", value: config.ip.adjust_mss });
      if (config.ip.arp_cache_timeout) operations.push({ op: "set_ip_arp_cache_timeout", value: config.ip.arp_cache_timeout });
      if (config.ip.disable_arp_filter) operations.push({ op: "set_ip_disable_arp_filter" });
      if (config.ip.disable_forwarding) operations.push({ op: "set_ip_disable_forwarding" });
      if (config.ip.enable_arp_accept) operations.push({ op: "set_ip_enable_arp_accept" });
      if (config.ip.enable_arp_announce) operations.push({ op: "set_ip_enable_arp_announce" });
      if (config.ip.enable_arp_ignore) operations.push({ op: "set_ip_enable_arp_ignore" });
      if (config.ip.enable_directed_broadcast) operations.push({ op: "set_ip_enable_directed_broadcast" });
      if (config.ip.enable_proxy_arp) operations.push({ op: "set_ip_enable_proxy_arp" });
      if (config.ip.proxy_arp_pvlan) operations.push({ op: "set_ip_proxy_arp_pvlan" });
      if (config.ip.source_validation) operations.push({ op: "set_ip_source_validation", value: config.ip.source_validation });
    }

    // IPv6 settings
    if (config.ipv6) {
      if (config.ipv6.accept_dad) operations.push({ op: "set_ipv6_accept_dad", value: config.ipv6.accept_dad });
      if (config.ipv6.address_autoconf) operations.push({ op: "set_ipv6_address_autoconf" });
      if (config.ipv6.address_eui64) operations.push({ op: "set_ipv6_address_eui64", value: config.ipv6.address_eui64 });
      if (config.ipv6.address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
      if (config.ipv6.address_interface_identifier) operations.push({ op: "set_ipv6_address_interface_identifier", value: config.ipv6.address_interface_identifier });
      if (config.ipv6.adjust_mss) operations.push({ op: "set_ipv6_adjust_mss", value: config.ipv6.adjust_mss });
      if (config.ipv6.base_reachable_time) operations.push({ op: "set_ipv6_base_reachable_time", value: config.ipv6.base_reachable_time });
      if (config.ipv6.disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
      if (config.ipv6.dup_addr_detect_transmits) operations.push({ op: "set_ipv6_dup_addr_detect_transmits", value: config.ipv6.dup_addr_detect_transmits });
      if (config.ipv6.source_validation) operations.push({ op: "set_ipv6_source_validation", value: config.ipv6.source_validation });
    }

    // DHCP options
    if (config.dhcp_options) {
      if (config.dhcp_options.client_id) operations.push({ op: "set_dhcp_options_client_id", value: config.dhcp_options.client_id });
      if (config.dhcp_options.default_route_distance) operations.push({ op: "set_dhcp_options_default_route_distance", value: config.dhcp_options.default_route_distance });
      if (config.dhcp_options.host_name) operations.push({ op: "set_dhcp_options_host_name", value: config.dhcp_options.host_name });
      if (config.dhcp_options.mtu) operations.push({ op: "set_dhcp_options_mtu" });
      if (config.dhcp_options.no_default_route) operations.push({ op: "set_dhcp_options_no_default_route" });
      if (config.dhcp_options.reject) operations.push({ op: "set_dhcp_options_reject", value: config.dhcp_options.reject });
      if (config.dhcp_options.user_class) operations.push({ op: "set_dhcp_options_user_class", value: config.dhcp_options.user_class });
      if (config.dhcp_options.vendor_class_id) operations.push({ op: "set_dhcp_options_vendor_class_id", value: config.dhcp_options.vendor_class_id });
    }

    // DHCPv6 options
    if (config.dhcpv6_options) {
      if (config.dhcpv6_options.duid) operations.push({ op: "set_dhcpv6_options_duid", value: config.dhcpv6_options.duid });
      if (config.dhcpv6_options.no_release) operations.push({ op: "set_dhcpv6_options_no_release" });
      if (config.dhcpv6_options.parameters_only) operations.push({ op: "set_dhcpv6_options_parameters_only" });
      if (config.dhcpv6_options.rapid_commit) operations.push({ op: "set_dhcpv6_options_rapid_commit" });
      if (config.dhcpv6_options.temporary) operations.push({ op: "set_dhcpv6_options_temporary" });
      if (config.dhcpv6_options.no_request_dns) operations.push({ op: "set_dhcpv6_options_no_request_dns" });
      if (config.dhcpv6_options.no_request_domain_name) operations.push({ op: "set_dhcpv6_options_no_request_domain_name" });
    }

    // Mirror & Redirect
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: MacsecInterface,
    updated: Omit<Partial<MacsecInterface>, "security"> & {
      security_mode?: "mka" | "static";
      security?: Partial<MacsecSecurityConfig> & {
        mka?: Partial<MacsecMkaConfig> | null;
        static?: Partial<MacsecStaticConfig> | null;
      };
    }
  ): Promise<VyOSResponse> {
    const operations: MacsecBatchOperation[] = [];

    // Basic fields
    if (updated.description !== undefined) {
      if (updated.description) operations.push({ op: "set_interface_description", value: updated.description });
      else operations.push({ op: "delete_interface_description" });
    }
    if (updated.source_interface !== undefined) {
      if (updated.source_interface) operations.push({ op: "set_source_interface", value: updated.source_interface });
      else operations.push({ op: "delete_source_interface" });
    }
    if (updated.mtu !== undefined) {
      if (updated.mtu) operations.push({ op: "set_mtu", value: updated.mtu });
      else operations.push({ op: "delete_mtu" });
    }
    if (updated.vrf !== undefined) {
      if (updated.vrf) operations.push({ op: "set_vrf", value: updated.vrf });
      else operations.push({ op: "delete_vrf" });
    }
    if (updated.disabled !== undefined) {
      if (updated.disabled) operations.push({ op: "set_interface_disable" });
      else operations.push({ op: "delete_interface_disable" });
    }

    // Addresses (delete old, set new)
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) {
        operations.push({ op: "delete_interface_address", value: old });
      }
      for (const addr of updated.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }

    // Security
    if (updated.security !== undefined) {
      if (updated.security.cipher !== undefined) {
        if (updated.security.cipher) operations.push({ op: "set_security_cipher", value: updated.security.cipher });
        else operations.push({ op: "delete_security_cipher" });
      }
      if (updated.security.encrypt !== undefined) {
        if (updated.security.encrypt) operations.push({ op: "set_security_encrypt" });
        else operations.push({ op: "delete_security_encrypt" });
      }
      if (updated.security.replay_window !== undefined) {
        if (updated.security.replay_window) operations.push({ op: "set_security_replay_window", value: updated.security.replay_window });
        else operations.push({ op: "delete_security_replay_window" });
      }

      // MKA
      if (updated.security.mka !== undefined) {
        if (updated.security.mka === null) {
          // Clear MKA
          operations.push({ op: "delete_security_mka_cak" });
          operations.push({ op: "delete_security_mka_ckn" });
          operations.push({ op: "delete_security_mka_priority" });
        } else {
          if (updated.security.mka.cak !== undefined) {
            if (updated.security.mka.cak) operations.push({ op: "set_security_mka_cak", value: updated.security.mka.cak });
            else operations.push({ op: "delete_security_mka_cak" });
          }
          if (updated.security.mka.ckn !== undefined) {
            if (updated.security.mka.ckn) operations.push({ op: "set_security_mka_ckn", value: updated.security.mka.ckn });
            else operations.push({ op: "delete_security_mka_ckn" });
          }
          if (updated.security.mka.priority !== undefined) {
            if (updated.security.mka.priority) operations.push({ op: "set_security_mka_priority", value: updated.security.mka.priority });
            else operations.push({ op: "delete_security_mka_priority" });
          }
        }
      }

      // Static
      if (updated.security.static !== undefined) {
        if (updated.security.static === null) {
          // Clear static
          operations.push({ op: "delete_security_static_key" });
          if (current.security?.static?.peers) {
            for (const peer of current.security.static.peers) {
              operations.push({ op: "delete_security_static_peer", value: peer.name });
            }
          }
        } else {
          if (updated.security.static.key !== undefined) {
            if (updated.security.static.key) operations.push({ op: "set_security_static_key", value: updated.security.static.key });
            else operations.push({ op: "delete_security_static_key" });
          }
          if (updated.security.static.peers !== undefined) {
            // Delete old peers
            if (current.security?.static?.peers) {
              for (const peer of current.security.static.peers) {
                operations.push({ op: "delete_security_static_peer", value: peer.name });
              }
            }
            // Set new peers
            for (const peer of updated.security.static.peers) {
              operations.push({ op: "set_security_static_peer", value: peer.name });
              if (peer.key) operations.push({ op: "set_security_static_peer_key", value: `${peer.name}:${peer.key}` });
              if (peer.mac) operations.push({ op: "set_security_static_peer_mac", value: `${peer.name}:${peer.mac}` });
              if (peer.disable) operations.push({ op: "set_security_static_peer_disable", value: peer.name });
            }
          }
        }
      }
    }

    // Mirror
    if (updated.mirror_ingress !== undefined) {
      if (updated.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: updated.mirror_ingress });
      else operations.push({ op: "delete_mirror_ingress" });
    }
    if (updated.mirror_egress !== undefined) {
      if (updated.mirror_egress) operations.push({ op: "set_mirror_egress", value: updated.mirror_egress });
      else operations.push({ op: "delete_mirror_egress" });
    }
    if (updated.redirect !== undefined) {
      if (updated.redirect) operations.push({ op: "set_redirect", value: updated.redirect });
      else operations.push({ op: "delete_redirect" });
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes detected" } };
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const macsecService = new MacsecService();
