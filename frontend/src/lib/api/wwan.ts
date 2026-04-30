import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DhcpPdInterface {
  interface: string;
  address: string[];
  sla_id: string | null;
}

export interface DhcpPrefixDelegation {
  id: string;
  length: string | null;
  interfaces: DhcpPdInterface[];
}

export interface WwanInterface {
  name: string;
  type: string;
  description: string | null;
  mtu: string | null;
  disable: boolean;
  disable_link_detect: boolean;
  connect_on_demand: boolean;
  vrf: string | null;
  redirect: string | null;
  apn: string | null;
  auth_username: string | null;
  auth_password: string | null;
  addresses: string[];
  dhcp_client_id: string | null;
  dhcp_default_route_distance: string | null;
  dhcp_host_name: string | null;
  dhcp_mtu: string | null;
  dhcp_no_default_route: boolean;
  dhcp_reject: string[];
  dhcp_user_class: string | null;
  dhcp_vendor_class_id: string | null;
  dhcpv6_duid: string | null;
  dhcpv6_no_release: boolean;
  dhcpv6_no_request_dns: boolean | null;
  dhcpv6_no_request_domain_name: boolean | null;
  dhcpv6_parameters_only: boolean;
  dhcpv6_rapid_commit: boolean;
  dhcpv6_temporary: boolean;
  dhcpv6_pd: DhcpPrefixDelegation[];
  mirror_ingress: string | null;
  mirror_egress: string | null;
  ip_adjust_mss: string | null;
  ip_arp_cache_timeout: string | null;
  ip_disable_arp_filter: boolean;
  ip_disable_forwarding: boolean;
  ip_enable_arp_accept: boolean;
  ip_enable_arp_announce: boolean;
  ip_enable_arp_ignore: boolean;
  ip_enable_directed_broadcast: boolean;
  ip_enable_proxy_arp: boolean;
  ip_proxy_arp_pvlan: boolean;
  ip_source_validation: string | null;
  ipv6_accept_dad: string | null;
  ipv6_address_autoconf: boolean;
  ipv6_address_eui64: string[];
  ipv6_address_no_default_link_local: boolean;
  ipv6_address_interface_identifier: string | null;
  ipv6_adjust_mss: string | null;
  ipv6_base_reachable_time: string | null;
  ipv6_disable_forwarding: boolean;
  ipv6_dup_addr_detect_transmits: string | null;
  ipv6_source_validation: string | null;
}

export interface WwanConfigResponse {
  interfaces: WwanInterface[];
  total: number;
  by_vrf: Record<string, number>;
}

export interface WwanCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface WwanBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class WwanService {
  async getCapabilities(): Promise<WwanCapabilities> {
    return apiClient.get<WwanCapabilities>("/vyos/wwan/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<WwanConfigResponse> {
    return apiClient.get<WwanConfigResponse>("/vyos/wwan/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: WwanBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/wwan/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    description?: string;
    apn?: string;
    auth_username?: string;
    auth_password?: string;
    connect_on_demand?: boolean;
    disable?: boolean;
    disable_link_detect?: boolean;
    mtu?: string;
    vrf?: string;
    addresses?: string[];
    redirect?: string;
    mirror_ingress?: string;
    mirror_egress?: string;
    dhcp_client_id?: string;
    dhcp_default_route_distance?: string;
    dhcp_host_name?: string;
    dhcp_mtu?: string;
    dhcp_no_default_route?: boolean;
    dhcp_reject?: string[];
    dhcp_user_class?: string;
    dhcp_vendor_class_id?: string;
    dhcpv6_duid?: string;
    dhcpv6_no_release?: boolean;
    dhcpv6_parameters_only?: boolean;
    dhcpv6_rapid_commit?: boolean;
    dhcpv6_temporary?: boolean;
    dhcpv6_no_request_dns?: boolean;
    dhcpv6_no_request_domain_name?: boolean;
    dhcpv6_pd?: string[];
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
    ipv6_address_interface_identifier?: string;
    ipv6_adjust_mss?: string;
    ipv6_base_reachable_time?: string;
    ipv6_disable_forwarding?: boolean;
    ipv6_dup_addr_detect_transmits?: string;
    ipv6_source_validation?: string;
  }): Promise<VyOSResponse> {
    const operations: WwanBatchOperation[] = [{ op: "set_interface" }];

    if (config.description) operations.push({ op: "set_description", value: config.description });
    if (config.apn) operations.push({ op: "set_apn", value: config.apn });
    if (config.auth_username) operations.push({ op: "set_auth_username", value: config.auth_username });
    if (config.auth_password) operations.push({ op: "set_auth_password", value: config.auth_password });
    if (config.connect_on_demand) operations.push({ op: "set_connect_on_demand" });
    if (config.disable) operations.push({ op: "set_disable" });
    if (config.disable_link_detect) operations.push({ op: "set_disable_link_detect" });
    if (config.mtu) operations.push({ op: "set_mtu", value: config.mtu });
    if (config.vrf) operations.push({ op: "set_vrf", value: config.vrf });
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }
    if (config.redirect) operations.push({ op: "set_redirect", value: config.redirect });
    if (config.mirror_ingress) operations.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) operations.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.dhcp_client_id) operations.push({ op: "set_dhcp_client_id", value: config.dhcp_client_id });
    if (config.dhcp_default_route_distance) operations.push({ op: "set_dhcp_default_route_distance", value: config.dhcp_default_route_distance });
    if (config.dhcp_host_name) operations.push({ op: "set_dhcp_host_name", value: config.dhcp_host_name });
    if (config.dhcp_mtu) operations.push({ op: "set_dhcp_mtu", value: config.dhcp_mtu });
    if (config.dhcp_no_default_route) operations.push({ op: "set_dhcp_no_default_route" });
    if (config.dhcp_reject) {
      for (const r of config.dhcp_reject) {
        operations.push({ op: "set_dhcp_reject", value: r });
      }
    }
    if (config.dhcp_user_class) operations.push({ op: "set_dhcp_user_class", value: config.dhcp_user_class });
    if (config.dhcp_vendor_class_id) operations.push({ op: "set_dhcp_vendor_class_id", value: config.dhcp_vendor_class_id });
    if (config.dhcpv6_duid) operations.push({ op: "set_dhcpv6_duid", value: config.dhcpv6_duid });
    if (config.dhcpv6_no_release) operations.push({ op: "set_dhcpv6_no_release" });
    if (config.dhcpv6_parameters_only) operations.push({ op: "set_dhcpv6_parameters_only" });
    if (config.dhcpv6_rapid_commit) operations.push({ op: "set_dhcpv6_rapid_commit" });
    if (config.dhcpv6_temporary) operations.push({ op: "set_dhcpv6_temporary" });
    if (config.dhcpv6_no_request_dns) operations.push({ op: "set_dhcpv6_no_request_dns" });
    if (config.dhcpv6_no_request_domain_name) operations.push({ op: "set_dhcpv6_no_request_domain_name" });
    if (config.dhcpv6_pd) {
      for (const pd of config.dhcpv6_pd) {
        operations.push({ op: "set_dhcpv6_pd_instance", value: pd });
      }
    }
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
    if (config.ipv6_address_interface_identifier) operations.push({ op: "set_ipv6_address_interface_identifier", value: config.ipv6_address_interface_identifier });
    if (config.ipv6_adjust_mss) operations.push({ op: "set_ipv6_adjust_mss", value: config.ipv6_adjust_mss });
    if (config.ipv6_base_reachable_time) operations.push({ op: "set_ipv6_base_reachable_time", value: config.ipv6_base_reachable_time });
    if (config.ipv6_disable_forwarding) operations.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6_dup_addr_detect_transmits) operations.push({ op: "set_ipv6_dup_addr_detect_transmits", value: config.ipv6_dup_addr_detect_transmits });
    if (config.ipv6_source_validation) operations.push({ op: "set_ipv6_source_validation", value: config.ipv6_source_validation });

    return this.batchConfigure(config.name, operations);
  }

  async updateInterface(
    name: string,
    current: WwanInterface,
    updated: {
      description?: string | null;
      apn?: string | null;
      auth_username?: string | null;
      auth_password?: string | null;
      connect_on_demand?: boolean;
      disable?: boolean;
      disable_link_detect?: boolean;
      mtu?: string | null;
      vrf?: string | null;
      addresses?: string[];
      redirect?: string | null;
      mirror_ingress?: string | null;
      mirror_egress?: string | null;
      dhcp_client_id?: string | null;
      dhcp_default_route_distance?: string | null;
      dhcp_host_name?: string | null;
      dhcp_mtu?: string | null;
      dhcp_no_default_route?: boolean;
      dhcp_reject?: string[];
      dhcp_user_class?: string | null;
      dhcp_vendor_class_id?: string | null;
      dhcpv6_duid?: string | null;
      dhcpv6_no_release?: boolean;
      dhcpv6_parameters_only?: boolean;
      dhcpv6_rapid_commit?: boolean;
      dhcpv6_temporary?: boolean;
      dhcpv6_no_request_dns?: boolean;
      dhcpv6_no_request_domain_name?: boolean;
      dhcpv6_pd?: string[];
      ip_adjust_mss?: string | null;
      ip_arp_cache_timeout?: string | null;
      ip_disable_arp_filter?: boolean;
      ip_disable_forwarding?: boolean;
      ip_enable_arp_accept?: boolean;
      ip_enable_arp_announce?: boolean;
      ip_enable_arp_ignore?: boolean;
      ip_enable_directed_broadcast?: boolean;
      ip_enable_proxy_arp?: boolean;
      ip_proxy_arp_pvlan?: boolean;
      ip_source_validation?: string | null;
      ipv6_accept_dad?: string | null;
      ipv6_address_autoconf?: boolean;
      ipv6_address_eui64?: string[];
      ipv6_address_no_default_link_local?: boolean;
      ipv6_address_interface_identifier?: string | null;
      ipv6_adjust_mss?: string | null;
      ipv6_base_reachable_time?: string | null;
      ipv6_disable_forwarding?: boolean;
      ipv6_dup_addr_detect_transmits?: string | null;
      ipv6_source_validation?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: WwanBatchOperation[] = [];

    // String fields
    const stringFields: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: string | null }[] = [
      { key: "description", setOp: "set_description", deleteOp: "delete_description", currentVal: current.description },
      { key: "apn", setOp: "set_apn", deleteOp: "delete_apn", currentVal: current.apn },
      { key: "auth_username", setOp: "set_auth_username", deleteOp: "delete_auth_username", currentVal: current.auth_username },
      { key: "auth_password", setOp: "set_auth_password", deleteOp: "delete_auth_password", currentVal: current.auth_password },
      { key: "mtu", setOp: "set_mtu", deleteOp: "delete_mtu", currentVal: current.mtu },
      { key: "vrf", setOp: "set_vrf", deleteOp: "delete_vrf", currentVal: current.vrf },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", currentVal: current.redirect },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", currentVal: current.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", currentVal: current.mirror_egress },
      { key: "dhcp_client_id", setOp: "set_dhcp_client_id", deleteOp: "delete_dhcp_client_id", currentVal: current.dhcp_client_id },
      { key: "dhcp_default_route_distance", setOp: "set_dhcp_default_route_distance", deleteOp: "delete_dhcp_default_route_distance", currentVal: current.dhcp_default_route_distance },
      { key: "dhcp_host_name", setOp: "set_dhcp_host_name", deleteOp: "delete_dhcp_host_name", currentVal: current.dhcp_host_name },
      { key: "dhcp_mtu", setOp: "set_dhcp_mtu", deleteOp: "delete_dhcp_mtu", currentVal: current.dhcp_mtu },
      { key: "dhcp_user_class", setOp: "set_dhcp_user_class", deleteOp: "delete_dhcp_user_class", currentVal: current.dhcp_user_class },
      { key: "dhcp_vendor_class_id", setOp: "set_dhcp_vendor_class_id", deleteOp: "delete_dhcp_vendor_class_id", currentVal: current.dhcp_vendor_class_id },
      { key: "dhcpv6_duid", setOp: "set_dhcpv6_duid", deleteOp: "delete_dhcpv6_duid", currentVal: current.dhcpv6_duid },
      { key: "ip_adjust_mss", setOp: "set_ip_adjust_mss", deleteOp: "delete_ip_adjust_mss", currentVal: current.ip_adjust_mss },
      { key: "ip_arp_cache_timeout", setOp: "set_ip_arp_cache_timeout", deleteOp: "delete_ip_arp_cache_timeout", currentVal: current.ip_arp_cache_timeout },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", currentVal: current.ip_source_validation },
      { key: "ipv6_accept_dad", setOp: "set_ipv6_accept_dad", deleteOp: "delete_ipv6_accept_dad", currentVal: current.ipv6_accept_dad },
      { key: "ipv6_adjust_mss", setOp: "set_ipv6_adjust_mss", deleteOp: "delete_ipv6_adjust_mss", currentVal: current.ipv6_adjust_mss },
      { key: "ipv6_base_reachable_time", setOp: "set_ipv6_base_reachable_time", deleteOp: "delete_ipv6_base_reachable_time", currentVal: current.ipv6_base_reachable_time },
      { key: "ipv6_dup_addr_detect_transmits", setOp: "set_ipv6_dup_addr_detect_transmits", deleteOp: "delete_ipv6_dup_addr_detect_transmits", currentVal: current.ipv6_dup_addr_detect_transmits },
      { key: "ipv6_source_validation", setOp: "set_ipv6_source_validation", deleteOp: "delete_ipv6_source_validation", currentVal: current.ipv6_source_validation },
      { key: "ipv6_address_interface_identifier", setOp: "set_ipv6_address_interface_identifier", deleteOp: "delete_ipv6_address_interface_identifier", currentVal: current.ipv6_address_interface_identifier },
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
    const boolFlags: { key: keyof typeof updated; setOp: string; deleteOp: string; currentVal: boolean }[] = [
      { key: "disable", setOp: "set_disable", deleteOp: "delete_disable", currentVal: current.disable },
      { key: "disable_link_detect", setOp: "set_disable_link_detect", deleteOp: "delete_disable_link_detect", currentVal: current.disable_link_detect },
      { key: "connect_on_demand", setOp: "set_connect_on_demand", deleteOp: "delete_connect_on_demand", currentVal: current.connect_on_demand },
      { key: "dhcp_no_default_route", setOp: "set_dhcp_no_default_route", deleteOp: "delete_dhcp_no_default_route", currentVal: current.dhcp_no_default_route },
      { key: "dhcpv6_no_release", setOp: "set_dhcpv6_no_release", deleteOp: "delete_dhcpv6_no_release", currentVal: current.dhcpv6_no_release },
      { key: "dhcpv6_parameters_only", setOp: "set_dhcpv6_parameters_only", deleteOp: "delete_dhcpv6_parameters_only", currentVal: current.dhcpv6_parameters_only },
      { key: "dhcpv6_rapid_commit", setOp: "set_dhcpv6_rapid_commit", deleteOp: "delete_dhcpv6_rapid_commit", currentVal: current.dhcpv6_rapid_commit },
      { key: "dhcpv6_temporary", setOp: "set_dhcpv6_temporary", deleteOp: "delete_dhcpv6_temporary", currentVal: current.dhcpv6_temporary },
      { key: "dhcpv6_no_request_dns", setOp: "set_dhcpv6_no_request_dns", deleteOp: "delete_dhcpv6_no_request_dns", currentVal: current.dhcpv6_no_request_dns ?? false },
      { key: "dhcpv6_no_request_domain_name", setOp: "set_dhcpv6_no_request_domain_name", deleteOp: "delete_dhcpv6_no_request_domain_name", currentVal: current.dhcpv6_no_request_domain_name ?? false },
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
        const was = flag.currentVal;
        const will = (updated[flag.key] as boolean | undefined) ?? false;
        if (will !== was) {
          operations.push({ op: will ? flag.setOp : flag.deleteOp });
        }
      }
    }

    // Array: addresses
    if (updated.addresses !== undefined) {
      for (const addr of current.addresses) {
        operations.push({ op: "delete_address", value: addr });
      }
      for (const addr of updated.addresses) {
        operations.push({ op: "set_address", value: addr });
      }
    }

    // Array: dhcp_reject
    if (updated.dhcp_reject !== undefined) {
      for (const r of current.dhcp_reject) {
        operations.push({ op: "delete_dhcp_reject", value: r });
      }
      for (const r of updated.dhcp_reject) {
        operations.push({ op: "set_dhcp_reject", value: r });
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

    // Array: dhcpv6_pd
    if (updated.dhcpv6_pd !== undefined) {
      for (const pd of current.dhcpv6_pd) {
        operations.push({ op: "delete_dhcpv6_pd_instance", value: pd.id });
      }
      for (const pd of updated.dhcpv6_pd) {
        operations.push({ op: "set_dhcpv6_pd_instance", value: pd });
      }
    }

    return this.batchConfigure(name, operations);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const wwanService = new WwanService();
