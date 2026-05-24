import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface IPoERadiusServer {
  address: string;
  key?: string | null;
  port?: string | null;
  acct_port?: string | null;
  priority?: string | null;
  fail_time?: string | null;
  disabled?: boolean;
  backup?: boolean;
  disable_accounting?: boolean;
}

export interface IPoERadiusDynamicAuthor {
  server?: string | null;
  port?: string | null;
  key?: string | null;
}

export interface IPoERadiusRateLimit {
  enable?: boolean;
  attribute?: string | null;
  vendor?: string | null;
  multiplier?: string | null;
}

export interface IPoERadiusSettings {
  servers: IPoERadiusServer[];
  source_address?: string | null;
  timeout?: string | null;
  max_try?: string | null;
  nas_identifier?: string | null;
  nas_ip_address?: string | null;
  accounting_interim_interval?: string | null;
  acct_interim_jitter?: string | null;
  acct_timeout?: string | null;
  preallocate_vif?: boolean;
  dynamic_author?: IPoERadiusDynamicAuthor;
  rate_limit?: IPoERadiusRateLimit;
}

export interface IPoEAuthMac {
  mac: string;
  ip_address?: string | null;
  vlan?: string | null;
  rate_limit?: {
    download?: string | null;
    upload?: string | null;
  };
}

export interface IPoEAuthInterface {
  interface: string;
  macs: IPoEAuthMac[];
}

export interface IPoEAuthentication {
  mode?: string | null;
  interfaces: IPoEAuthInterface[];
  radius: IPoERadiusSettings;
}

export interface IPoEClientIPPool {
  name: string;
  ranges?: string[];
  next_pool?: string | null;
}

export interface IPoEIPv6Prefix {
  prefix: string;
  mask?: string | null;
}

export interface IPoEIPv6Delegate {
  prefix: string;
  delegation_prefix?: string | null;
}

export interface IPoEClientIPv6Pool {
  name: string;
  prefixes?: IPoEIPv6Prefix[];
  delegates?: IPoEIPv6Delegate[];
}

export interface IPoEInterface {
  interface: string;
  mode?: string | null;
  network?: string | null;
  start_session?: string | null;
  client_subnet?: string | null;
  vlans?: string[];
  vlan_mon?: boolean;
  lua_username?: string | null;
  external_dhcp?: {
    dhcp_relay?: string | null;
    giaddr?: string | null;
  };
}

export interface IPoEConfigResponse {
  configured: boolean;
  description?: string | null;
  default_pool?: string | null;
  default_ipv6_pool?: string | null;
  gateway_addresses?: string[];
  name_servers?: string[];
  max_concurrent_sessions?: string | null;
  thread_count?: string | null;
  lua_file?: string | null;
  log: { level?: string | null };
  shaper: { fwmark?: string | null };
  snmp: { master_agent?: boolean };
  extended_scripts: {
    on_change?: string | null;
    on_down?: string | null;
    on_pre_up?: string | null;
    on_up?: string | null;
  };
  limits: {
    burst?: string | null;
    connection_limit?: string | null;
    timeout?: string | null;
  };
  authentication: IPoEAuthentication;
  client_ip_pools: IPoEClientIPPool[];
  client_ipv6_pools: IPoEClientIPv6Pool[];
  interfaces: IPoEInterface[];
  totals: {
    auth_interfaces: number;
    radius_servers: number;
    client_ip_pools: number;
    client_ipv6_pools: number;
    interfaces: number;
  };
}

export interface IPoECapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: {
    auth_local: boolean;
    auth_radius: boolean;
    auth_noauth: boolean;
    client_ip_pools: boolean;
    client_ipv6_pools: boolean;
    interfaces: boolean;
    vlan_mon: boolean;
    extended_scripts: boolean;
    shaper: boolean;
    snmp: boolean;
    limits: boolean;
    lua_support: boolean;
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class IPoEServerService {
  async getCapabilities(): Promise<IPoECapabilities> {
    return apiClient.get<IPoECapabilities>("/vyos/ipoe-server/capabilities");
  }

  async getConfig(refresh = false): Promise<IPoEConfigResponse> {
    return apiClient.get<IPoEConfigResponse>("/vyos/ipoe-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ipoe-server/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // General Settings
  // ==========================================================================

  async updateGeneralSettings(current: IPoEConfigResponse, config: {
    description?: string;
    default_pool?: string;
    default_ipv6_pool?: string;
    gateway_addresses?: string[];
    name_servers?: string[];
    max_concurrent_sessions?: string;
    thread_count?: string;
    lua_file?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.description !== undefined) {
      if (config.description) ops.push({ op: "set_description", value: config.description });
      else if (current.description) ops.push({ op: "delete_description" });
    }
    if (config.default_pool !== undefined) {
      if (config.default_pool) ops.push({ op: "set_default_pool", value: config.default_pool });
      else if (current.default_pool) ops.push({ op: "delete_default_pool" });
    }
    if (config.default_ipv6_pool !== undefined) {
      if (config.default_ipv6_pool) ops.push({ op: "set_default_ipv6_pool", value: config.default_ipv6_pool });
      else if (current.default_ipv6_pool) ops.push({ op: "delete_default_ipv6_pool" });
    }
    if (config.gateway_addresses !== undefined) {
      ops.push({ op: "delete_all_gateway_addresses" });
      for (const addr of config.gateway_addresses) {
        ops.push({ op: "set_gateway_address", value: addr });
      }
    }
    if (config.name_servers !== undefined) {
      for (const ns of current.name_servers || []) {
        ops.push({ op: "delete_name_server", value: ns });
      }
      for (const ns of config.name_servers) {
        ops.push({ op: "set_name_server", value: ns });
      }
    }
    if (config.max_concurrent_sessions !== undefined) {
      if (config.max_concurrent_sessions) ops.push({ op: "set_max_concurrent_sessions", value: config.max_concurrent_sessions });
      else if (current.max_concurrent_sessions) ops.push({ op: "delete_max_concurrent_sessions" });
    }
    if (config.thread_count !== undefined) {
      if (config.thread_count) ops.push({ op: "set_thread_count", value: config.thread_count });
      else if (current.thread_count) ops.push({ op: "delete_thread_count" });
    }
    if (config.lua_file !== undefined) {
      if (config.lua_file) ops.push({ op: "set_lua_file", value: config.lua_file });
      else if (current.lua_file) ops.push({ op: "delete_lua_file" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("ipoe", ops);
  }

  // ==========================================================================
  // Authentication mode
  // ==========================================================================

  async updateAuthMode(mode: string): Promise<VyOSResponse> {
    return this.batchConfigure("ipoe", [{ op: "set_auth_mode", value: mode }]);
  }

  // ==========================================================================
  // Server interfaces
  // ==========================================================================

  async createInterface(iface: string, opts: {
    mode?: string;
    network?: string;
    start_session?: string;
    client_subnet?: string;
    vlans?: string[];
    vlan_mon?: boolean;
    lua_username?: string;
    dhcp_relay?: string;
    giaddr?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_interface" }];
    if (opts.mode) ops.push({ op: "set_interface_mode", value: opts.mode });
    if (opts.network) ops.push({ op: "set_interface_network", value: opts.network });
    if (opts.start_session) ops.push({ op: "set_interface_start_session", value: opts.start_session });
    if (opts.client_subnet) ops.push({ op: "set_interface_client_subnet", value: opts.client_subnet });
    for (const vlan of opts.vlans || []) {
      ops.push({ op: "set_interface_vlan", value: vlan });
    }
    if (opts.vlan_mon) ops.push({ op: "set_interface_vlan_mon" });
    if (opts.lua_username) ops.push({ op: "set_interface_lua_username", value: opts.lua_username });
    if (opts.dhcp_relay) ops.push({ op: "set_interface_external_dhcp_relay", value: opts.dhcp_relay });
    if (opts.giaddr) ops.push({ op: "set_interface_external_dhcp_giaddr", value: opts.giaddr });
    return this.batchConfigure(iface, ops);
  }

  async updateInterface(iface: string, current: IPoEInterface, opts: {
    mode?: string;
    network?: string;
    start_session?: string;
    client_subnet?: string;
    vlans?: string[];
    vlan_mon?: boolean;
    lua_username?: string;
    dhcp_relay?: string;
    giaddr?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (opts.mode !== undefined) {
      if (opts.mode) ops.push({ op: "set_interface_mode", value: opts.mode });
      else if (current.mode) ops.push({ op: "delete_interface_mode" });
    }
    if (opts.network !== undefined) {
      if (opts.network) ops.push({ op: "set_interface_network", value: opts.network });
      else if (current.network) ops.push({ op: "delete_interface_network" });
    }
    if (opts.start_session !== undefined) {
      if (opts.start_session) ops.push({ op: "set_interface_start_session", value: opts.start_session });
      else if (current.start_session) ops.push({ op: "delete_interface_start_session" });
    }
    if (opts.client_subnet !== undefined) {
      if (opts.client_subnet) ops.push({ op: "set_interface_client_subnet", value: opts.client_subnet });
      else if (current.client_subnet) ops.push({ op: "delete_interface_client_subnet" });
    }
    if (opts.vlans !== undefined) {
      ops.push({ op: "delete_interface_all_vlans" });
      for (const vlan of opts.vlans) {
        ops.push({ op: "set_interface_vlan", value: vlan });
      }
    }
    if (opts.vlan_mon !== undefined) {
      if (opts.vlan_mon) ops.push({ op: "set_interface_vlan_mon" });
      else if (current.vlan_mon) ops.push({ op: "delete_interface_vlan_mon" });
    }
    if (opts.lua_username !== undefined) {
      if (opts.lua_username) ops.push({ op: "set_interface_lua_username", value: opts.lua_username });
      else if (current.lua_username) ops.push({ op: "delete_interface_lua_username" });
    }
    if (opts.dhcp_relay !== undefined) {
      if (opts.dhcp_relay) ops.push({ op: "set_interface_external_dhcp_relay", value: opts.dhcp_relay });
      else if (current.external_dhcp?.dhcp_relay) ops.push({ op: "delete_interface_external_dhcp_relay" });
    }
    if (opts.giaddr !== undefined) {
      if (opts.giaddr) ops.push({ op: "set_interface_external_dhcp_giaddr", value: opts.giaddr });
      else if (current.external_dhcp?.giaddr) ops.push({ op: "delete_interface_external_dhcp_giaddr" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(iface, ops);
  }

  async deleteInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_interface" }]);
  }

  // ==========================================================================
  // Auth MAC operations
  // ==========================================================================

  async createAuthMac(iface: string, mac: string, opts: {
    ip_address?: string;
    vlan?: string;
    rate_download?: string;
    rate_upload?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_auth_interface_mac", value: mac }];
    if (opts.ip_address) ops.push({ op: "set_auth_mac_ip_address", value: `${mac}|${opts.ip_address}` });
    if (opts.vlan) ops.push({ op: "set_auth_mac_vlan", value: `${mac}|${opts.vlan}` });
    if (opts.rate_download) ops.push({ op: "set_auth_mac_rate_limit_download", value: `${mac}|${opts.rate_download}` });
    if (opts.rate_upload) ops.push({ op: "set_auth_mac_rate_limit_upload", value: `${mac}|${opts.rate_upload}` });
    return this.batchConfigure(iface, ops);
  }

  async updateAuthMac(iface: string, mac: string, current: IPoEAuthMac, opts: {
    ip_address?: string;
    vlan?: string;
    rate_download?: string;
    rate_upload?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (opts.ip_address !== undefined) {
      if (opts.ip_address) ops.push({ op: "set_auth_mac_ip_address", value: `${mac}|${opts.ip_address}` });
      else if (current.ip_address) ops.push({ op: "delete_auth_mac_ip_address", value: mac });
    }
    if (opts.vlan !== undefined) {
      if (opts.vlan) ops.push({ op: "set_auth_mac_vlan", value: `${mac}|${opts.vlan}` });
      else if (current.vlan) ops.push({ op: "delete_auth_mac_vlan", value: mac });
    }
    if (opts.rate_download !== undefined) {
      if (opts.rate_download) ops.push({ op: "set_auth_mac_rate_limit_download", value: `${mac}|${opts.rate_download}` });
      else if (current.rate_limit?.download) ops.push({ op: "delete_auth_mac_rate_limit_download", value: mac });
    }
    if (opts.rate_upload !== undefined) {
      if (opts.rate_upload) ops.push({ op: "set_auth_mac_rate_limit_upload", value: `${mac}|${opts.rate_upload}` });
      else if (current.rate_limit?.upload) ops.push({ op: "delete_auth_mac_rate_limit_upload", value: mac });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(iface, ops);
  }

  async deleteAuthMac(iface: string, mac: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_auth_interface_mac", value: mac }]);
  }

  async deleteAuthInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_auth_interface" }]);
  }

  // ==========================================================================
  // RADIUS Server operations
  // ==========================================================================

  async createRadiusServer(address: string, opts: {
    key?: string;
    port?: string;
    acct_port?: string;
    priority?: string;
    fail_time?: string;
    disabled?: boolean;
    backup?: boolean;
    disable_accounting?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_radius_server" }];
    if (opts.key) ops.push({ op: "set_radius_server_key", value: opts.key });
    if (opts.port) ops.push({ op: "set_radius_server_port", value: opts.port });
    if (opts.acct_port) ops.push({ op: "set_radius_server_acct_port", value: opts.acct_port });
    if (opts.priority) ops.push({ op: "set_radius_server_priority", value: opts.priority });
    if (opts.fail_time) ops.push({ op: "set_radius_server_fail_time", value: opts.fail_time });
    if (opts.disabled) ops.push({ op: "set_radius_server_disable" });
    if (opts.backup) ops.push({ op: "set_radius_server_backup" });
    if (opts.disable_accounting) ops.push({ op: "set_radius_server_disable_accounting" });
    return this.batchConfigure(address, ops);
  }

  async deleteRadiusServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure(address, [{ op: "delete_radius_server" }]);
  }

  // ==========================================================================
  // RADIUS global settings
  // ==========================================================================

  async updateRadiusSettings(current: IPoERadiusSettings, config: {
    source_address?: string;
    timeout?: string;
    max_try?: string;
    nas_identifier?: string;
    nas_ip_address?: string;
    preallocate_vif?: boolean;
    accounting_interim_interval?: string;
    acct_interim_jitter?: string;
    acct_timeout?: string;
    dae_server?: string;
    dae_port?: string;
    dae_key?: string;
    rate_limit_enable?: boolean;
    rate_limit_attribute?: string;
    rate_limit_vendor?: string;
    rate_limit_multiplier?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.source_address !== undefined) {
      if (config.source_address) ops.push({ op: "set_radius_source_address", value: config.source_address });
      else if (current.source_address) ops.push({ op: "delete_radius_source_address" });
    }
    if (config.timeout !== undefined) {
      if (config.timeout) ops.push({ op: "set_radius_timeout", value: config.timeout });
      else if (current.timeout) ops.push({ op: "delete_radius_timeout" });
    }
    if (config.max_try !== undefined) {
      if (config.max_try) ops.push({ op: "set_radius_max_try", value: config.max_try });
      else if (current.max_try) ops.push({ op: "delete_radius_max_try" });
    }
    if (config.nas_identifier !== undefined) {
      if (config.nas_identifier) ops.push({ op: "set_radius_nas_identifier", value: config.nas_identifier });
      else if (current.nas_identifier) ops.push({ op: "delete_radius_nas_identifier" });
    }
    if (config.nas_ip_address !== undefined) {
      if (config.nas_ip_address) ops.push({ op: "set_radius_nas_ip_address", value: config.nas_ip_address });
      else if (current.nas_ip_address) ops.push({ op: "delete_radius_nas_ip_address" });
    }
    if (config.preallocate_vif !== undefined) {
      if (config.preallocate_vif) ops.push({ op: "set_radius_preallocate_vif" });
      else if (current.preallocate_vif) ops.push({ op: "delete_radius_preallocate_vif" });
    }
    if (config.accounting_interim_interval !== undefined) {
      if (config.accounting_interim_interval) ops.push({ op: "set_radius_accounting_interim_interval", value: config.accounting_interim_interval });
      else if (current.accounting_interim_interval) ops.push({ op: "delete_radius_accounting_interim_interval" });
    }
    if (config.acct_interim_jitter !== undefined) {
      if (config.acct_interim_jitter) ops.push({ op: "set_radius_acct_interim_jitter", value: config.acct_interim_jitter });
      else if (current.acct_interim_jitter) ops.push({ op: "delete_radius_acct_interim_jitter" });
    }
    if (config.acct_timeout !== undefined) {
      if (config.acct_timeout) ops.push({ op: "set_radius_acct_timeout", value: config.acct_timeout });
      else if (current.acct_timeout) ops.push({ op: "delete_radius_acct_timeout" });
    }
    // DAE
    if (config.dae_server !== undefined) {
      if (config.dae_server) ops.push({ op: "set_radius_dynamic_author_server", value: config.dae_server });
      else if (current.dynamic_author?.server) ops.push({ op: "delete_radius_dynamic_author_server" });
    }
    if (config.dae_port !== undefined) {
      if (config.dae_port) ops.push({ op: "set_radius_dynamic_author_port", value: config.dae_port });
      else if (current.dynamic_author?.port) ops.push({ op: "delete_radius_dynamic_author_port" });
    }
    if (config.dae_key) {
      ops.push({ op: "set_radius_dynamic_author_key", value: config.dae_key });
    }
    // Rate limit
    if (config.rate_limit_enable !== undefined) {
      if (config.rate_limit_enable) ops.push({ op: "set_radius_rate_limit_enable" });
      else if (current.rate_limit?.enable) ops.push({ op: "delete_radius_rate_limit" });
    }
    if (config.rate_limit_attribute !== undefined) {
      if (config.rate_limit_attribute) ops.push({ op: "set_radius_rate_limit_attribute", value: config.rate_limit_attribute });
      else if (current.rate_limit?.attribute) ops.push({ op: "delete_radius_rate_limit_attribute" });
    }
    if (config.rate_limit_vendor !== undefined) {
      if (config.rate_limit_vendor) ops.push({ op: "set_radius_rate_limit_vendor", value: config.rate_limit_vendor });
      else if (current.rate_limit?.vendor) ops.push({ op: "delete_radius_rate_limit_vendor" });
    }
    if (config.rate_limit_multiplier !== undefined) {
      if (config.rate_limit_multiplier) ops.push({ op: "set_radius_rate_limit_multiplier", value: config.rate_limit_multiplier });
      else if (current.rate_limit?.multiplier) ops.push({ op: "delete_radius_rate_limit_multiplier" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("ipoe", ops);
  }

  // ==========================================================================
  // Client IP Pool operations
  // ==========================================================================

  async createIPPool(name: string, ranges: string[], next_pool?: string): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_pool" }];
    for (const range of ranges) {
      ops.push({ op: "set_pool_range", value: range });
    }
    if (next_pool) ops.push({ op: "set_pool_next_pool", value: next_pool });
    return this.batchConfigure(name, ops);
  }

  async updateIPPool(name: string, current: IPoEClientIPPool, newRanges: string[], nextPool?: string): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    for (const range of current.ranges || []) {
      ops.push({ op: "delete_pool_range", value: range });
    }
    for (const range of newRanges) {
      ops.push({ op: "set_pool_range", value: range });
    }

    if (nextPool !== undefined) {
      if (nextPool) ops.push({ op: "set_pool_next_pool", value: nextPool });
      else if (current.next_pool) ops.push({ op: "delete_pool_next_pool" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteIPPool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_pool" }]);
  }

  // ==========================================================================
  // Client IPv6 Pool operations
  // ==========================================================================

  async createIPv6Pool(name: string, prefixes: Array<{ prefix: string; mask?: string }>, delegates: Array<{ prefix: string; delegation_prefix?: string }>): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_ipv6_pool" }];
    for (const p of prefixes) {
      if (p.prefix && p.mask) {
        ops.push({ op: "set_ipv6_pool_prefix", value: `${p.prefix}|${p.mask}` });
      }
    }
    for (const d of delegates) {
      if (d.prefix && d.delegation_prefix) {
        ops.push({ op: "set_ipv6_pool_delegate", value: `${d.prefix}|${d.delegation_prefix}` });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async deleteIPv6Pool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ipv6_pool" }]);
  }

  // ==========================================================================
  // Advanced settings
  // ==========================================================================

  async updateAdvancedSettings(current: IPoEConfigResponse, config: {
    log_level?: string;
    shaper_fwmark?: string;
    snmp_master_agent?: boolean;
    limits_burst?: string;
    limits_connection_limit?: string;
    limits_timeout?: string;
    scripts_on_change?: string;
    scripts_on_down?: string;
    scripts_on_pre_up?: string;
    scripts_on_up?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.log_level !== undefined) {
      if (config.log_level) ops.push({ op: "set_log_level", value: config.log_level });
      else if (current.log?.level) ops.push({ op: "delete_log_level" });
    }
    if (config.shaper_fwmark !== undefined) {
      if (config.shaper_fwmark) ops.push({ op: "set_shaper_fwmark", value: config.shaper_fwmark });
      else if (current.shaper?.fwmark) ops.push({ op: "delete_shaper_fwmark" });
    }
    if (config.snmp_master_agent !== undefined) {
      if (config.snmp_master_agent) ops.push({ op: "set_snmp_master_agent" });
      else if (current.snmp?.master_agent) ops.push({ op: "delete_snmp" });
    }
    if (config.limits_burst !== undefined) {
      if (config.limits_burst) ops.push({ op: "set_limits_burst", value: config.limits_burst });
      else if (current.limits?.burst) ops.push({ op: "delete_limits_burst" });
    }
    if (config.limits_connection_limit !== undefined) {
      if (config.limits_connection_limit) ops.push({ op: "set_limits_connection_limit", value: config.limits_connection_limit });
      else if (current.limits?.connection_limit) ops.push({ op: "delete_limits_connection_limit" });
    }
    if (config.limits_timeout !== undefined) {
      if (config.limits_timeout) ops.push({ op: "set_limits_timeout", value: config.limits_timeout });
      else if (current.limits?.timeout) ops.push({ op: "delete_limits_timeout" });
    }
    if (config.scripts_on_change !== undefined) {
      if (config.scripts_on_change) ops.push({ op: "set_script_on_change", value: config.scripts_on_change });
      else if (current.extended_scripts?.on_change) ops.push({ op: "delete_script_on_change" });
    }
    if (config.scripts_on_down !== undefined) {
      if (config.scripts_on_down) ops.push({ op: "set_script_on_down", value: config.scripts_on_down });
      else if (current.extended_scripts?.on_down) ops.push({ op: "delete_script_on_down" });
    }
    if (config.scripts_on_pre_up !== undefined) {
      if (config.scripts_on_pre_up) ops.push({ op: "set_script_on_pre_up", value: config.scripts_on_pre_up });
      else if (current.extended_scripts?.on_pre_up) ops.push({ op: "delete_script_on_pre_up" });
    }
    if (config.scripts_on_up !== undefined) {
      if (config.scripts_on_up) ops.push({ op: "set_script_on_up", value: config.scripts_on_up });
      else if (current.extended_scripts?.on_up) ops.push({ op: "delete_script_on_up" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("ipoe", ops);
  }

  // ==========================================================================
  // Delete entire IPoE config
  // ==========================================================================

  async deleteIPoEServer(): Promise<VyOSResponse> {
    return this.batchConfigure("ipoe", [{ op: "delete_ipoe_server" }]);
  }
}

export const ipoeServerService = new IPoEServerService();
