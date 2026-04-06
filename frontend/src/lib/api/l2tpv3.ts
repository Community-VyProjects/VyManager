import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface L2TPv3Interface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  vrf: string | null;
  mtu: string | null;
  disable: boolean | null;
  // L2TPv3-specific tunnel settings
  remote: string | null;
  source_address: string | null;
  tunnel_id: string | null;
  peer_tunnel_id: string | null;
  session_id: string | null;
  peer_session_id: string | null;
  encapsulation: string | null;
  destination_port: string | null;
  source_port: string | null;
  // IP settings
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
  // IPv6 settings
  ipv6_accept_dad: string | null;
  ipv6_address_autoconf: boolean | null;
  ipv6_address_eui64: string[];
  ipv6_address_interface_identifier: string | null;
  ipv6_address_no_default_link_local: boolean | null;
  ipv6_adjust_mss: string | null;
  ipv6_base_reachable_time: string | null;
  ipv6_disable_forwarding: boolean | null;
  ipv6_dup_addr_detect_transmits: string | null;
  ipv6_source_validation: string | null;
  // Mirror
  mirror_ingress: string | null;
  mirror_egress: string | null;
}

export interface L2TPv3ConfigResponse {
  interfaces: L2TPv3Interface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface L2TPv3Capabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  version_info?: {
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

export interface L2TPv3BatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class L2TPv3Service {
  async getCapabilities(): Promise<L2TPv3Capabilities> {
    return apiClient.get<L2TPv3Capabilities>("/vyos/l2tpv3/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<L2TPv3ConfigResponse> {
    return apiClient.get<L2TPv3ConfigResponse>("/vyos/l2tpv3/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: L2TPv3BatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/l2tpv3/batch", {
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
    // L2TPv3-specific
    remote?: string;
    source_address?: string;
    tunnel_id?: string;
    peer_tunnel_id?: string;
    session_id?: string;
    peer_session_id?: string;
    encapsulation?: string;
    destination_port?: string;
    source_port?: string;
    // IP settings
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
    // IPv6 settings
    ipv6_accept_dad?: string;
    ipv6_adjust_mss?: string;
    ipv6_base_reachable_time?: string;
    ipv6_disable_forwarding?: boolean;
    ipv6_dup_addr_detect_transmits?: string;
    ipv6_source_validation?: string;
    ipv6_address_autoconf?: boolean;
    ipv6_address_eui64?: string[];
    ipv6_address_no_default_link_local?: boolean;
    ipv6_address_interface_identifier?: string;
    // Mirror
    mirror_ingress?: string;
    mirror_egress?: string;
  }): Promise<VyOSResponse> {
    const operations: L2TPv3BatchOperation[] = [];

    // L2TPv3-specific tunnel settings
    if (config.remote) operations.push({ op: "set_remote", value: config.remote });
    if (config.source_address) operations.push({ op: "set_source_address", value: config.source_address });
    if (config.tunnel_id) operations.push({ op: "set_tunnel_id", value: config.tunnel_id });
    if (config.peer_tunnel_id) operations.push({ op: "set_peer_tunnel_id", value: config.peer_tunnel_id });
    if (config.session_id) operations.push({ op: "set_session_id", value: config.session_id });
    if (config.peer_session_id) operations.push({ op: "set_peer_session_id", value: config.peer_session_id });
    if (config.encapsulation) operations.push({ op: "set_encapsulation", value: config.encapsulation });
    if (config.destination_port) operations.push({ op: "set_destination_port", value: config.destination_port });
    if (config.source_port) operations.push({ op: "set_source_port", value: config.source_port });

    // Basic
    if (config.description) operations.push({ op: "set_interface_description", value: config.description });
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }
    if (config.mtu) operations.push({ op: "set_interface_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_interface_vrf", value: config.vrf });
    if (config.disabled) operations.push({ op: "set_interface_disable" });

    // IP settings
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

    // IPv6 settings
    if (config.ipv6_accept_dad) operations.push({ op: "set_ipv6_accept_dad", value: config.ipv6_accept_dad });
    if (config.ipv6_adjust_mss) operations.push({ op: "set_ipv6_adjust_mss", value: config.ipv6_adjust_mss });
    if (config.ipv6_base_reachable_time) operations.push({ op: "set_ipv6_base_reachable_time", value: config.ipv6_base_reachable_time });
    if (config.ipv6_disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6_dup_addr_detect_transmits) operations.push({ op: "set_ipv6_dup_addr_detect_transmits", value: config.ipv6_dup_addr_detect_transmits });
    if (config.ipv6_source_validation) operations.push({ op: "set_ipv6_source_validation", value: config.ipv6_source_validation });
    if (config.ipv6_address_autoconf) operations.push({ op: "set_ipv6_address_autoconf" });
    if (config.ipv6_address_eui64) {
      for (const prefix of config.ipv6_address_eui64) {
        operations.push({ op: "set_ipv6_address_eui64", value: prefix });
      }
    }
    if (config.ipv6_address_no_default_link_local) operations.push({ op: "set_ipv6_address_no_default_link_local" });
    if (config.ipv6_address_interface_identifier) operations.push({ op: "set_ipv6_address_interface_identifier", value: config.ipv6_address_interface_identifier });

    // Mirror
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: L2TPv3Interface,
    updated: {
      description?: string | null;
      addresses?: string[];
      mtu?: string | null;
      vrf?: string | null;
      disabled?: boolean | null;
      remote?: string | null;
      source_address?: string | null;
      tunnel_id?: string | null;
      peer_tunnel_id?: string | null;
      session_id?: string | null;
      peer_session_id?: string | null;
      encapsulation?: string | null;
      destination_port?: string | null;
      source_port?: string | null;
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
      ipv6_adjust_mss?: string | null;
      ipv6_base_reachable_time?: string | null;
      ipv6_disable_forwarding?: boolean | null;
      ipv6_dup_addr_detect_transmits?: string | null;
      ipv6_source_validation?: string | null;
      ipv6_address_autoconf?: boolean | null;
      ipv6_address_eui64?: string[];
      ipv6_address_no_default_link_local?: boolean | null;
      ipv6_address_interface_identifier?: string | null;
      mirror_ingress?: string | null;
      mirror_egress?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: L2TPv3BatchOperation[] = [];

    // Simple string fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", currentVal: current.description },
      { key: "mtu", setOp: "set_interface_mtu", deleteOp: "delete_interface_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_interface_vrf", deleteOp: "delete_interface_vrf", currentVal: current.vrf },
      { key: "remote", setOp: "set_remote", deleteOp: "delete_remote", currentVal: current.remote },
      { key: "source_address", setOp: "set_source_address", deleteOp: "delete_source_address", currentVal: current.source_address },
      { key: "tunnel_id", setOp: "set_tunnel_id", deleteOp: "delete_tunnel_id", currentVal: current.tunnel_id },
      { key: "peer_tunnel_id", setOp: "set_peer_tunnel_id", deleteOp: "delete_peer_tunnel_id", currentVal: current.peer_tunnel_id },
      { key: "session_id", setOp: "set_session_id", deleteOp: "delete_session_id", currentVal: current.session_id },
      { key: "peer_session_id", setOp: "set_peer_session_id", deleteOp: "delete_peer_session_id", currentVal: current.peer_session_id },
      { key: "encapsulation", setOp: "set_encapsulation", deleteOp: "delete_encapsulation", currentVal: current.encapsulation },
      { key: "destination_port", setOp: "set_destination_port", deleteOp: "delete_destination_port", currentVal: current.destination_port },
      { key: "source_port", setOp: "set_source_port", deleteOp: "delete_source_port", currentVal: current.source_port },
      { key: "ip_adjust_mss", setOp: "set_ip_adjust_mss", deleteOp: "delete_ip_adjust_mss", currentVal: current.ip_adjust_mss },
      { key: "ip_arp_cache_timeout", setOp: "set_ip_arp_cache_timeout", deleteOp: "delete_ip_arp_cache_timeout", currentVal: current.ip_arp_cache_timeout },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: current.ip_source_validation },
      { key: "ipv6_accept_dad", setOp: "set_ipv6_accept_dad", deleteOp: "delete_ipv6_accept_dad", currentVal: current.ipv6_accept_dad },
      { key: "ipv6_adjust_mss", setOp: "set_ipv6_adjust_mss", deleteOp: "delete_ipv6_adjust_mss", currentVal: current.ipv6_adjust_mss },
      { key: "ipv6_base_reachable_time", setOp: "set_ipv6_base_reachable_time", deleteOp: "delete_ipv6_base_reachable_time", currentVal: current.ipv6_base_reachable_time },
      { key: "ipv6_dup_addr_detect_transmits", setOp: "set_ipv6_dup_addr_detect_transmits", deleteOp: "delete_ipv6_dup_addr_detect_transmits", currentVal: current.ipv6_dup_addr_detect_transmits },
      { key: "ipv6_source_validation", setOp: "set_ipv6_source_validation", deleteOp: "delete_ipv6_source_validation", currentVal: current.ipv6_source_validation },
      { key: "ipv6_address_interface_identifier", setOp: "set_ipv6_address_interface_identifier", deleteOp: "delete_ipv6_address_interface_identifier", currentVal: current.ipv6_address_interface_identifier },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", currentVal: current.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", currentVal: current.mirror_egress },
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
    const booleanFields: { key: keyof typeof updated; currentKey: keyof L2TPv3Interface; setOp: string; deleteOp: string }[] = [
      { key: "disabled", currentKey: "disable", setOp: "set_interface_disable", deleteOp: "delete_interface_disable" },
      { key: "ip_disable_arp_filter", currentKey: "ip_disable_arp_filter", setOp: "set_ip_disable_arp_filter", deleteOp: "delete_ip_disable_arp_filter" },
      { key: "ip_disable_forwarding", currentKey: "ip_disable_forwarding", setOp: "set_ip_disable_forwarding", deleteOp: "delete_ip_disable_forwarding" },
      { key: "ip_enable_arp_accept", currentKey: "ip_enable_arp_accept", setOp: "set_ip_enable_arp_accept", deleteOp: "delete_ip_enable_arp_accept" },
      { key: "ip_enable_arp_announce", currentKey: "ip_enable_arp_announce", setOp: "set_ip_enable_arp_announce", deleteOp: "delete_ip_enable_arp_announce" },
      { key: "ip_enable_arp_ignore", currentKey: "ip_enable_arp_ignore", setOp: "set_ip_enable_arp_ignore", deleteOp: "delete_ip_enable_arp_ignore" },
      { key: "ip_enable_directed_broadcast", currentKey: "ip_enable_directed_broadcast", setOp: "set_ip_enable_directed_broadcast", deleteOp: "delete_ip_enable_directed_broadcast" },
      { key: "ip_enable_proxy_arp", currentKey: "ip_enable_proxy_arp", setOp: "set_ip_enable_proxy_arp", deleteOp: "delete_ip_enable_proxy_arp" },
      { key: "ip_proxy_arp_pvlan", currentKey: "ip_proxy_arp_pvlan", setOp: "set_ip_proxy_arp_pvlan", deleteOp: "delete_ip_proxy_arp_pvlan" },
      { key: "ipv6_disable_forwarding", currentKey: "ipv6_disable_forwarding", setOp: "set_ipv6_disable_forwarding", deleteOp: "delete_ipv6_disable_forwarding" },
      { key: "ipv6_address_autoconf", currentKey: "ipv6_address_autoconf", setOp: "set_ipv6_address_autoconf", deleteOp: "delete_ipv6_address_autoconf" },
      { key: "ipv6_address_no_default_link_local", currentKey: "ipv6_address_no_default_link_local", setOp: "set_ipv6_address_no_default_link_local", deleteOp: "delete_ipv6_address_no_default_link_local" },
    ];

    for (const field of booleanFields) {
      if (updated[field.key] !== undefined) {
        const was = (current[field.currentKey] as boolean | null) ?? false;
        const will = (updated[field.key] as boolean | null) ?? false;
        if (will !== was) {
          operations.push({ op: will ? field.setOp : field.deleteOp });
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

export const l2tpv3Service = new L2TPv3Service();
