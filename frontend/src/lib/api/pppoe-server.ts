import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PPPoELocalUser {
  username: string;
  password?: string | null;
  disabled?: boolean;
  static_ip?: string | null;
  rate_limit?: {
    download?: string | null;
    upload?: string | null;
  };
}

export interface PPPoEPadoDelay {
  delay: string;
  sessions?: string | null;
}

export interface PPPoEPppOptions {
  ipv4?: string | null;
  ipv6?: string | null;
  mppe?: string | null;
  disable_ccp?: boolean;
  interface_cache?: string | null;
  ipv6_interface_id?: string | null;
  ipv6_peer_interface_id?: string | null;
  ipv6_accept_peer_interface_id?: boolean;
  lcp_echo_failure?: string | null;
  lcp_echo_interval?: string | null;
  lcp_echo_timeout?: string | null;
  min_mtu?: string | null;
  mru?: string | null;
}

export interface PPPoERadiusServer {
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

export interface PPPoERadiusDynamicAuthor {
  server?: string | null;
  port?: string | null;
  key?: string | null;
}

export interface PPPoERadiusRateLimit {
  enable?: boolean;
  attribute?: string | null;
  vendor?: string | null;
  multiplier?: string | null;
}

export interface PPPoERadiusSettings {
  servers: PPPoERadiusServer[];
  source_address?: string | null;
  timeout?: string | null;
  max_try?: string | null;
  nas_identifier?: string | null;
  nas_ip_address?: string | null;
  accounting_interim_interval?: string | null;
  acct_interim_jitter?: string | null;
  acct_timeout?: string | null;
  preallocate_vif?: boolean;
  called_sid_format?: string | null;
  dynamic_author?: PPPoERadiusDynamicAuthor;
  rate_limit?: PPPoERadiusRateLimit;
}

export interface PPPoEAuthentication {
  mode?: string | null;
  protocols?: string[];
  local_users: PPPoELocalUser[];
  radius: PPPoERadiusSettings;
}

export interface PPPoEIPv4Pool {
  name: string;
  ranges?: string[];
  next_pool?: string | null;
}

export interface PPPoEIPv6Prefix {
  prefix: string;
  mask?: string | null;
}

export interface PPPoEIPv6Delegate {
  prefix: string;
  delegation_prefix?: string | null;
}

export interface PPPoEIPv6Pool {
  name: string;
  prefixes?: PPPoEIPv6Prefix[];
  delegates?: PPPoEIPv6Delegate[];
}

export interface PPPoEInterface {
  interface: string;
  vlans?: string[];
  vlan_mon?: boolean;
  combined?: string | null;
}

export interface PPPoEConfigResponse {
  configured: boolean;
  description?: string | null;
  access_concentrator?: string | null;
  service_name?: string | null;
  gateway_addresses?: string[];
  name_servers?: string[];
  wins_servers?: string[];
  mtu?: string | null;
  max_concurrent_sessions?: string | null;
  thread_count?: string | null;
  default_pool?: string | null;
  default_ipv6_pool?: string | null;
  session_control?: string | null;
  accept_any_service?: boolean;
  accept_blank_service?: boolean;
  pado_delays?: PPPoEPadoDelay[];
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
  ppp_options: PPPoEPppOptions;
  authentication: PPPoEAuthentication;
  client_ip_pools: PPPoEIPv4Pool[];
  client_ipv6_pools: PPPoEIPv6Pool[];
  interfaces: PPPoEInterface[];
  totals: {
    local_users: number;
    radius_servers: number;
    client_ip_pools: number;
    client_ipv6_pools: number;
    interfaces: number;
  };
}

export interface PPPoECapabilities {
  version: string;
  features: {
    auth_local: boolean;
    auth_radius: boolean;
    auth_noauth: boolean;
    auth_protocols: boolean;
    local_users: boolean;
    client_ip_pools: boolean;
    client_ipv6_pools: boolean;
    interfaces: boolean;
    vlan_mon: boolean;
    ppp_options: boolean;
    pado_delay: boolean;
    session_control: boolean;
    extended_scripts: boolean;
    shaper: boolean;
    snmp: boolean;
    limits: boolean;
    wins_server: boolean;
    called_sid_format: boolean;
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
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

class PPPoEServerService {
  async getCapabilities(): Promise<PPPoECapabilities> {
    return apiClient.get<PPPoECapabilities>("/vyos/pppoe-server/capabilities");
  }

  async getConfig(refresh = false): Promise<PPPoEConfigResponse> {
    return apiClient.get<PPPoEConfigResponse>("/vyos/pppoe-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pppoe-server/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // General Settings
  // ==========================================================================

  async updateGeneralSettings(current: PPPoEConfigResponse, config: {
    description?: string;
    access_concentrator?: string;
    service_name?: string;
    gateway_addresses?: string[];
    name_servers?: string[];
    wins_servers?: string[];
    mtu?: string;
    max_concurrent_sessions?: string;
    thread_count?: string;
    default_pool?: string;
    default_ipv6_pool?: string;
    session_control?: string;
    accept_any_service?: boolean;
    accept_blank_service?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.description !== undefined) {
      if (config.description) ops.push({ op: "set_description", value: config.description });
      else if (current.description) ops.push({ op: "delete_description" });
    }
    if (config.access_concentrator !== undefined) {
      if (config.access_concentrator) ops.push({ op: "set_access_concentrator", value: config.access_concentrator });
      else if (current.access_concentrator) ops.push({ op: "delete_access_concentrator" });
    }
    if (config.service_name !== undefined) {
      if (config.service_name) ops.push({ op: "set_service_name", value: config.service_name });
      else if (current.service_name) ops.push({ op: "delete_service_name" });
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
    if (config.wins_servers !== undefined) {
      for (const ws of current.wins_servers || []) {
        ops.push({ op: "delete_wins_server", value: ws });
      }
      for (const ws of config.wins_servers) {
        ops.push({ op: "set_wins_server", value: ws });
      }
    }
    if (config.mtu !== undefined) {
      if (config.mtu) ops.push({ op: "set_mtu", value: config.mtu });
      else if (current.mtu) ops.push({ op: "delete_mtu" });
    }
    if (config.max_concurrent_sessions !== undefined) {
      if (config.max_concurrent_sessions) ops.push({ op: "set_max_concurrent_sessions", value: config.max_concurrent_sessions });
      else if (current.max_concurrent_sessions) ops.push({ op: "delete_max_concurrent_sessions" });
    }
    if (config.thread_count !== undefined) {
      if (config.thread_count) ops.push({ op: "set_thread_count", value: config.thread_count });
      else if (current.thread_count) ops.push({ op: "delete_thread_count" });
    }
    if (config.default_pool !== undefined) {
      if (config.default_pool) ops.push({ op: "set_default_pool", value: config.default_pool });
      else if (current.default_pool) ops.push({ op: "delete_default_pool" });
    }
    if (config.default_ipv6_pool !== undefined) {
      if (config.default_ipv6_pool) ops.push({ op: "set_default_ipv6_pool", value: config.default_ipv6_pool });
      else if (current.default_ipv6_pool) ops.push({ op: "delete_default_ipv6_pool" });
    }
    if (config.session_control !== undefined) {
      if (config.session_control) ops.push({ op: "set_session_control", value: config.session_control });
      else if (current.session_control) ops.push({ op: "delete_session_control" });
    }
    if (config.accept_any_service !== undefined) {
      if (config.accept_any_service) ops.push({ op: "set_accept_any_service" });
      else if (current.accept_any_service) ops.push({ op: "delete_accept_any_service" });
    }
    if (config.accept_blank_service !== undefined) {
      if (config.accept_blank_service) ops.push({ op: "set_accept_blank_service" });
      else if (current.accept_blank_service) ops.push({ op: "delete_accept_blank_service" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("pppoe", ops);
  }

  // ==========================================================================
  // Authentication settings
  // ==========================================================================

  async updateAuthSettings(current: PPPoEAuthentication, config: {
    mode?: string;
    protocols?: string[];
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.mode !== undefined) {
      ops.push({ op: "set_auth_mode", value: config.mode });
    }
    if (config.protocols !== undefined) {
      ops.push({ op: "delete_all_auth_protocols" });
      for (const p of config.protocols) {
        ops.push({ op: "set_auth_protocol", value: p });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("pppoe", ops);
  }

  // ==========================================================================
  // Local users
  // ==========================================================================

  async createLocalUser(username: string, data: {
    password?: string;
    static_ip?: string;
    rate_download?: string;
    rate_upload?: string;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_local_user" }];
    if (data.password) ops.push({ op: "set_local_user_password", value: data.password });
    if (data.static_ip) ops.push({ op: "set_local_user_static_ip", value: data.static_ip });
    if (data.rate_download) ops.push({ op: "set_local_user_rate_limit_download", value: data.rate_download });
    if (data.rate_upload) ops.push({ op: "set_local_user_rate_limit_upload", value: data.rate_upload });
    if (data.disabled) ops.push({ op: "set_local_user_disable" });
    return this.batchConfigure(username, ops);
  }

  async updateLocalUser(username: string, current: PPPoELocalUser, data: {
    password?: string;
    static_ip?: string;
    rate_download?: string;
    rate_upload?: string;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (data.password) ops.push({ op: "set_local_user_password", value: data.password });
    if (data.static_ip !== undefined) {
      if (data.static_ip) ops.push({ op: "set_local_user_static_ip", value: data.static_ip });
      else if (current.static_ip) ops.push({ op: "delete_local_user_static_ip" });
    }
    if (data.rate_download !== undefined) {
      if (data.rate_download) ops.push({ op: "set_local_user_rate_limit_download", value: data.rate_download });
      else if (current.rate_limit?.download) ops.push({ op: "delete_local_user_rate_limit_download" });
    }
    if (data.rate_upload !== undefined) {
      if (data.rate_upload) ops.push({ op: "set_local_user_rate_limit_upload", value: data.rate_upload });
      else if (current.rate_limit?.upload) ops.push({ op: "delete_local_user_rate_limit_upload" });
    }
    if (data.disabled !== undefined) {
      if (data.disabled) ops.push({ op: "set_local_user_disable" });
      else if (current.disabled) ops.push({ op: "delete_local_user_disable" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(username, ops);
  }

  async deleteLocalUser(username: string): Promise<VyOSResponse> {
    return this.batchConfigure(username, [{ op: "delete_local_user" }]);
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

  async updateRadiusSettings(current: PPPoERadiusSettings, config: {
    source_address?: string;
    timeout?: string;
    max_try?: string;
    nas_identifier?: string;
    nas_ip_address?: string;
    preallocate_vif?: boolean;
    accounting_interim_interval?: string;
    acct_interim_jitter?: string;
    acct_timeout?: string;
    called_sid_format?: string;
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
    if (config.called_sid_format !== undefined) {
      if (config.called_sid_format) ops.push({ op: "set_radius_called_sid_format", value: config.called_sid_format });
      else if (current.called_sid_format) ops.push({ op: "delete_radius_called_sid_format" });
    }
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
    return this.batchConfigure("pppoe", ops);
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

  async updateIPPool(name: string, current: PPPoEIPv4Pool, newRanges: string[], nextPool?: string): Promise<VyOSResponse> {
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

  async createIPv6Pool(
    name: string,
    prefixes: Array<{ prefix: string; mask?: string }>,
    delegates: Array<{ prefix: string; delegation_prefix?: string }>
  ): Promise<VyOSResponse> {
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
  // Interface operations
  // ==========================================================================

  async createInterface(iface: string, opts: {
    vlans?: string[];
    vlan_mon?: boolean;
    combined?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_interface" }];
    for (const vlan of opts.vlans || []) {
      ops.push({ op: "set_interface_vlan", value: vlan });
    }
    if (opts.vlan_mon) ops.push({ op: "set_interface_vlan_mon" });
    if (opts.combined) ops.push({ op: "set_interface_combined", value: opts.combined });
    return this.batchConfigure(iface, ops);
  }

  async updateInterface(iface: string, current: PPPoEInterface, opts: {
    vlans?: string[];
    vlan_mon?: boolean;
    combined?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

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
    if (opts.combined !== undefined) {
      if (opts.combined) ops.push({ op: "set_interface_combined", value: opts.combined });
      else if (current.combined) ops.push({ op: "delete_interface_combined" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(iface, ops);
  }

  async deleteInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_interface" }]);
  }

  // ==========================================================================
  // PPP Options
  // ==========================================================================

  async updatePPPOptions(current: PPPoEPppOptions, config: {
    ipv4?: string;
    ipv6?: string;
    mppe?: string;
    disable_ccp?: boolean;
    interface_cache?: string;
    ipv6_interface_id?: string;
    ipv6_peer_interface_id?: string;
    ipv6_accept_peer_interface_id?: boolean;
    lcp_echo_failure?: string;
    lcp_echo_interval?: string;
    lcp_echo_timeout?: string;
    min_mtu?: string;
    mru?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.ipv4 !== undefined) {
      if (config.ipv4) ops.push({ op: "set_ppp_ipv4", value: config.ipv4 });
      else if (current.ipv4) ops.push({ op: "delete_ppp_ipv4" });
    }
    if (config.ipv6 !== undefined) {
      if (config.ipv6) ops.push({ op: "set_ppp_ipv6", value: config.ipv6 });
      else if (current.ipv6) ops.push({ op: "delete_ppp_ipv6" });
    }
    if (config.mppe !== undefined) {
      if (config.mppe) ops.push({ op: "set_ppp_mppe", value: config.mppe });
      else if (current.mppe) ops.push({ op: "delete_ppp_mppe" });
    }
    if (config.disable_ccp !== undefined) {
      if (config.disable_ccp) ops.push({ op: "set_ppp_disable_ccp" });
      else if (current.disable_ccp) ops.push({ op: "delete_ppp_disable_ccp" });
    }
    if (config.interface_cache !== undefined) {
      if (config.interface_cache) ops.push({ op: "set_ppp_interface_cache", value: config.interface_cache });
      else if (current.interface_cache) ops.push({ op: "delete_ppp_interface_cache" });
    }
    if (config.ipv6_interface_id !== undefined) {
      if (config.ipv6_interface_id) ops.push({ op: "set_ppp_ipv6_interface_id", value: config.ipv6_interface_id });
      else if (current.ipv6_interface_id) ops.push({ op: "delete_ppp_ipv6_interface_id" });
    }
    if (config.ipv6_peer_interface_id !== undefined) {
      if (config.ipv6_peer_interface_id) ops.push({ op: "set_ppp_ipv6_peer_interface_id", value: config.ipv6_peer_interface_id });
      else if (current.ipv6_peer_interface_id) ops.push({ op: "delete_ppp_ipv6_peer_interface_id" });
    }
    if (config.ipv6_accept_peer_interface_id !== undefined) {
      if (config.ipv6_accept_peer_interface_id) ops.push({ op: "set_ppp_ipv6_accept_peer_interface_id" });
      else if (current.ipv6_accept_peer_interface_id) ops.push({ op: "delete_ppp_ipv6_accept_peer_interface_id" });
    }
    if (config.lcp_echo_failure !== undefined) {
      if (config.lcp_echo_failure) ops.push({ op: "set_ppp_lcp_echo_failure", value: config.lcp_echo_failure });
      else if (current.lcp_echo_failure) ops.push({ op: "delete_ppp_lcp_echo_failure" });
    }
    if (config.lcp_echo_interval !== undefined) {
      if (config.lcp_echo_interval) ops.push({ op: "set_ppp_lcp_echo_interval", value: config.lcp_echo_interval });
      else if (current.lcp_echo_interval) ops.push({ op: "delete_ppp_lcp_echo_interval" });
    }
    if (config.lcp_echo_timeout !== undefined) {
      if (config.lcp_echo_timeout) ops.push({ op: "set_ppp_lcp_echo_timeout", value: config.lcp_echo_timeout });
      else if (current.lcp_echo_timeout) ops.push({ op: "delete_ppp_lcp_echo_timeout" });
    }
    if (config.min_mtu !== undefined) {
      if (config.min_mtu) ops.push({ op: "set_ppp_min_mtu", value: config.min_mtu });
      else if (current.min_mtu) ops.push({ op: "delete_ppp_min_mtu" });
    }
    if (config.mru !== undefined) {
      if (config.mru) ops.push({ op: "set_ppp_mru", value: config.mru });
      else if (current.mru) ops.push({ op: "delete_ppp_mru" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("pppoe", ops);
  }

  // ==========================================================================
  // Advanced Settings (log, shaper, snmp, limits, scripts, PADO delays)
  // ==========================================================================

  async updateAdvancedSettings(current: PPPoEConfigResponse, config: {
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
    pado_delays?: PPPoEPadoDelay[];
  }): Promise<VyOSResponse> {
    // Handle PADO delays first (each requires its own batch call with delay as item_name)
    if (config.pado_delays !== undefined) {
      await this.batchConfigure("pppoe", [{ op: "delete_all_pado_delays" }]);
      for (const d of config.pado_delays) {
        if (!d.delay) continue;
        const delayOps: BatchOperation[] = [{ op: "set_pado_delay" }];
        if (d.sessions) delayOps.push({ op: "set_pado_delay_sessions", value: d.sessions });
        await this.batchConfigure(d.delay, delayOps);
      }
    }

    // Handle other advanced settings
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
    return this.batchConfigure("pppoe", ops);
  }

  // ==========================================================================
  // Delete entire PPPoE server config
  // ==========================================================================

  async deletePPPoEServer(): Promise<VyOSResponse> {
    return this.batchConfigure("pppoe", [{ op: "delete_pppoe_server" }]);
  }
}

export const pppoeServerService = new PPPoEServerService();
