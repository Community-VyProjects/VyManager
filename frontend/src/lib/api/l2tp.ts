import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface L2TPLocalUser {
  username: string;
  password?: string | null;
  static_ip?: string | null;
  rate_limit_download?: string | null;
  rate_limit_upload?: string | null;
  disabled?: boolean;
}

export interface L2TPRadiusServer {
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

export interface L2TPRadiusDynamicAuthor {
  server?: string | null;
  port?: string | null;
  key?: string | null;
}

export interface L2TPRadiusRateLimit {
  enable?: boolean;
  attribute?: string | null;
  vendor?: string | null;
  multiplier?: string | null;
}

export interface L2TPRadiusSettings {
  servers: L2TPRadiusServer[];
  source_address?: string | null;
  timeout?: string | null;
  max_try?: string | null;
  nas_identifier?: string | null;
  nas_ip_address?: string | null;
  preallocate_vif?: boolean;
  accounting_interim_interval?: string | null;
  acct_interim_jitter?: string | null;
  acct_timeout?: string | null;
  dynamic_author?: L2TPRadiusDynamicAuthor;
  rate_limit?: L2TPRadiusRateLimit;
}

export interface L2TPAuthentication {
  mode?: string | null;
  protocols?: string[];
  local_users: L2TPLocalUser[];
  radius: L2TPRadiusSettings;
}

export interface L2TPIPSecSettings {
  auth_mode?: string | null;
  psk?: string | null;
  x509_ca_certificate?: string | null;
  x509_certificate?: string | null;
  x509_passphrase?: string | null;
  ike_group?: string | null;
  esp_group?: string | null;
  ike_lifetime?: string | null;
  lifetime?: string | null;
}

export interface L2TPClientIPPool {
  name: string;
  range?: string | null;
  next_pool?: string | null;
}

export interface L2TPClientIPv6Pool {
  name: string;
  prefixes?: Array<{ prefix: string; mask?: string | null }>;
  delegates?: Array<{ prefix: string; delegation_prefix?: string | null }>;
}

export interface L2TPPPPOptions {
  disable_ccp?: boolean;
  interface_cache?: string | null;
  ipv4?: string | null;
  ipv6?: string | null;
  ipv6_interface_id?: string | null;
  ipv6_peer_interface_id?: string | null;
  ipv6_accept_peer_interface_id?: boolean;
  mppe?: string | null;
  lcp_echo_failure?: string | null;
  lcp_echo_interval?: string | null;
  lcp_echo_timeout?: string | null;
  min_mtu?: string | null;
  mru?: string | null;
}

export interface L2TPLNSSettings {
  host_name?: string | null;
  shared_secret?: string | null;
}

export interface L2TPLimits {
  connection_limit?: string | null;
  burst?: string | null;
  timeout?: string | null;
}

export interface L2TPExtendedScripts {
  on_change?: string | null;
  on_down?: string | null;
  on_pre_up?: string | null;
  on_up?: string | null;
}

export interface L2TPConfigResponse {
  configured: boolean;
  description?: string | null;
  outside_address?: string | null;
  gateway_address?: string | null;
  mtu?: string | null;
  name_servers: string[];
  wins_servers: string[];
  default_pool?: string | null;
  default_ipv6_pool?: string | null;
  max_concurrent_sessions?: string | null;
  thread_count?: string | null;
  authentication: L2TPAuthentication;
  ipsec_settings: L2TPIPSecSettings;
  client_ip_pools: L2TPClientIPPool[];
  client_ipv6_pools: L2TPClientIPv6Pool[];
  ppp_options: L2TPPPPOptions;
  lns: L2TPLNSSettings;
  limits: L2TPLimits;
  log: { level?: string | null };
  extended_scripts: L2TPExtendedScripts;
  shaper: { fwmark?: string | null };
  snmp: { master_agent?: boolean };
  totals: {
    local_users: number;
    radius_servers: number;
    client_ip_pools: number;
    client_ipv6_pools: number;
  };
}

export interface L2TPCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: {
    general: { supported: boolean; description: string; settings: string[] };
    authentication: { supported: boolean; description: string; modes: string[]; protocols: string[] };
    local_users: { supported: boolean; description: string };
    radius: { supported: boolean; description: string; features: string[] };
    ipsec_settings: { supported: boolean; description: string; auth_modes: string[] };
    client_ip_pools: { supported: boolean; description: string };
    client_ipv6_pools: { supported: boolean; description: string };
    ppp_options: { supported: boolean; description: string; ipv4_modes: string[]; ipv6_modes: string[]; mppe_modes: string[] };
    lns: { supported: boolean; description: string };
    limits: { supported: boolean; description: string };
    log: { supported: boolean; description: string; levels: string[] };
    extended_scripts: { supported: boolean; description: string; events: string[] };
    shaper: { supported: boolean; description: string };
    snmp: { supported: boolean; description: string };
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

class L2TPService {
  async getCapabilities(): Promise<L2TPCapabilities> {
    return apiClient.get<L2TPCapabilities>("/vyos/vpn/l2tp/capabilities");
  }

  async getConfig(refresh = false): Promise<L2TPConfigResponse> {
    return apiClient.get<L2TPConfigResponse>("/vyos/vpn/l2tp/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/l2tp/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // General Settings
  // ==========================================================================

  async updateGeneralSettings(current: L2TPConfigResponse, config: {
    description?: string;
    outside_address?: string;
    gateway_address?: string;
    mtu?: string;
    name_servers?: string[];
    wins_servers?: string[];
    default_pool?: string;
    default_ipv6_pool?: string;
    max_concurrent_sessions?: string;
    thread_count?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // Description
    if (config.description !== undefined) {
      if (config.description) ops.push({ op: "set_description", value: config.description });
      else if (current.description) ops.push({ op: "delete_description" });
    }
    // Outside address
    if (config.outside_address !== undefined) {
      if (config.outside_address) ops.push({ op: "set_outside_address", value: config.outside_address });
      else if (current.outside_address) ops.push({ op: "delete_outside_address" });
    }
    // Gateway address
    if (config.gateway_address !== undefined) {
      if (config.gateway_address) ops.push({ op: "set_gateway_address", value: config.gateway_address });
      else if (current.gateway_address) ops.push({ op: "delete_gateway_address" });
    }
    // MTU
    if (config.mtu !== undefined) {
      if (config.mtu) ops.push({ op: "set_mtu", value: config.mtu });
      else if (current.mtu) ops.push({ op: "delete_mtu" });
    }
    // Name servers (array update)
    if (config.name_servers !== undefined) {
      for (const ns of current.name_servers || []) {
        ops.push({ op: "delete_name_server", value: ns });
      }
      for (const ns of config.name_servers) {
        ops.push({ op: "set_name_server", value: ns });
      }
    }
    // WINS servers
    if (config.wins_servers !== undefined) {
      for (const ws of current.wins_servers || []) {
        ops.push({ op: "delete_wins_server", value: ws });
      }
      for (const ws of config.wins_servers) {
        ops.push({ op: "set_wins_server", value: ws });
      }
    }
    // Default pool
    if (config.default_pool !== undefined) {
      if (config.default_pool) ops.push({ op: "set_default_pool", value: config.default_pool });
      else if (current.default_pool) ops.push({ op: "delete_default_pool" });
    }
    // Default IPv6 pool
    if (config.default_ipv6_pool !== undefined) {
      if (config.default_ipv6_pool) ops.push({ op: "set_default_ipv6_pool", value: config.default_ipv6_pool });
      else if (current.default_ipv6_pool) ops.push({ op: "delete_default_ipv6_pool" });
    }
    // Max concurrent sessions
    if (config.max_concurrent_sessions !== undefined) {
      if (config.max_concurrent_sessions) ops.push({ op: "set_max_concurrent_sessions", value: config.max_concurrent_sessions });
      else if (current.max_concurrent_sessions) ops.push({ op: "delete_max_concurrent_sessions" });
    }
    // Thread count
    if (config.thread_count !== undefined) {
      if (config.thread_count) ops.push({ op: "set_thread_count", value: config.thread_count });
      else if (current.thread_count) ops.push({ op: "delete_thread_count" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // Local User Operations
  // ==========================================================================

  async createLocalUser(username: string, config: {
    password?: string;
    static_ip?: string;
    rate_limit_download?: string;
    rate_limit_upload?: string;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_local_user" }];
    if (config.password) ops.push({ op: "set_local_user_password", value: config.password });
    if (config.static_ip) ops.push({ op: "set_local_user_static_ip", value: config.static_ip });
    if (config.rate_limit_download) ops.push({ op: "set_local_user_rate_limit_download", value: config.rate_limit_download });
    if (config.rate_limit_upload) ops.push({ op: "set_local_user_rate_limit_upload", value: config.rate_limit_upload });
    if (config.disabled) ops.push({ op: "set_local_user_disable" });
    return this.batchConfigure(username, ops);
  }

  async updateLocalUser(username: string, current: L2TPLocalUser, config: {
    password?: string;
    static_ip?: string;
    rate_limit_download?: string;
    rate_limit_upload?: string;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    if (config.password) ops.push({ op: "set_local_user_password", value: config.password });
    // Static IP
    if (config.static_ip !== undefined) {
      if (config.static_ip) ops.push({ op: "set_local_user_static_ip", value: config.static_ip });
      else if (current.static_ip) ops.push({ op: "delete_local_user_static_ip" });
    }
    // Rate limits
    if (config.rate_limit_download !== undefined) {
      if (config.rate_limit_download) ops.push({ op: "set_local_user_rate_limit_download", value: config.rate_limit_download });
      else if (current.rate_limit_download) ops.push({ op: "delete_local_user_rate_limit_download" });
    }
    if (config.rate_limit_upload !== undefined) {
      if (config.rate_limit_upload) ops.push({ op: "set_local_user_rate_limit_upload", value: config.rate_limit_upload });
      else if (current.rate_limit_upload) ops.push({ op: "delete_local_user_rate_limit_upload" });
    }
    // Disabled toggle
    if (config.disabled !== undefined) {
      if (config.disabled) ops.push({ op: "set_local_user_disable" });
      else if (current.disabled) ops.push({ op: "delete_local_user_disable" });
    }
    if (ops.length === 0) return { success: true };
    return this.batchConfigure(username, ops);
  }

  async deleteLocalUser(username: string): Promise<VyOSResponse> {
    return this.batchConfigure(username, [{ op: "delete_local_user" }]);
  }

  // ==========================================================================
  // Client IP Pool Operations
  // ==========================================================================

  async createIPPool(name: string, config: {
    range?: string;
    next_pool?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_client_ip_pool" }];
    if (config.range) ops.push({ op: "set_client_ip_pool_range", value: config.range });
    if (config.next_pool) ops.push({ op: "set_client_ip_pool_next_pool", value: config.next_pool });
    return this.batchConfigure(name, ops);
  }

  async deleteIPPool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_client_ip_pool" }]);
  }

  // ==========================================================================
  // Client IPv6 Pool Operations
  // ==========================================================================

  async createIPv6Pool(name: string, config: {
    prefixes?: Array<{ prefix: string; mask?: string }>;
    delegates?: Array<{ prefix: string; delegation_prefix?: string }>;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_client_ipv6_pool" }];
    if (config.prefixes) {
      for (const p of config.prefixes) {
        ops.push({ op: "set_client_ipv6_pool_prefix", value: p.prefix });
        if (p.mask) ops.push({ op: "set_client_ipv6_pool_prefix_mask", value: `${p.prefix}|${p.mask}` });
      }
    }
    if (config.delegates) {
      for (const d of config.delegates) {
        ops.push({ op: "set_client_ipv6_pool_delegate", value: d.prefix });
        if (d.delegation_prefix) ops.push({ op: "set_client_ipv6_pool_delegate_prefix", value: `${d.prefix}|${d.delegation_prefix}` });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async deleteIPv6Pool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_client_ipv6_pool" }]);
  }

  // ==========================================================================
  // IPSec Settings
  // ==========================================================================

  async updateIPSecSettings(current: L2TPIPSecSettings, config: {
    auth_mode?: string;
    psk?: string;
    x509_ca_certificate?: string;
    x509_certificate?: string;
    x509_passphrase?: string;
    ike_group?: string;
    esp_group?: string;
    ike_lifetime?: string;
    lifetime?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.auth_mode !== undefined) {
      if (config.auth_mode) ops.push({ op: "set_ipsec_auth_mode", value: config.auth_mode });
      else if (current.auth_mode) ops.push({ op: "delete_ipsec_auth_mode" });
    }
    if (config.psk !== undefined) {
      if (config.psk) ops.push({ op: "set_ipsec_psk", value: config.psk });
      else if (current.psk) ops.push({ op: "delete_ipsec_psk" });
    }
    if (config.x509_ca_certificate !== undefined) {
      if (config.x509_ca_certificate) ops.push({ op: "set_ipsec_x509_ca_certificate", value: config.x509_ca_certificate });
      else if (current.x509_ca_certificate) ops.push({ op: "delete_ipsec_x509_ca_certificate" });
    }
    if (config.x509_certificate !== undefined) {
      if (config.x509_certificate) ops.push({ op: "set_ipsec_x509_certificate", value: config.x509_certificate });
      else if (current.x509_certificate) ops.push({ op: "delete_ipsec_x509_certificate" });
    }
    if (config.x509_passphrase !== undefined) {
      if (config.x509_passphrase) ops.push({ op: "set_ipsec_x509_passphrase", value: config.x509_passphrase });
      else if (current.x509_passphrase) ops.push({ op: "delete_ipsec_x509_passphrase" });
    }
    if (config.ike_group !== undefined) {
      if (config.ike_group) ops.push({ op: "set_ipsec_ike_group", value: config.ike_group });
      else if (current.ike_group) ops.push({ op: "delete_ipsec_ike_group" });
    }
    if (config.esp_group !== undefined) {
      if (config.esp_group) ops.push({ op: "set_ipsec_esp_group", value: config.esp_group });
      else if (current.esp_group) ops.push({ op: "delete_ipsec_esp_group" });
    }
    if (config.ike_lifetime !== undefined) {
      if (config.ike_lifetime) ops.push({ op: "set_ipsec_ike_lifetime", value: config.ike_lifetime });
      else if (current.ike_lifetime) ops.push({ op: "delete_ipsec_ike_lifetime" });
    }
    if (config.lifetime !== undefined) {
      if (config.lifetime) ops.push({ op: "set_ipsec_lifetime", value: config.lifetime });
      else if (current.lifetime) ops.push({ op: "delete_ipsec_lifetime" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // RADIUS Server Operations
  // ==========================================================================

  async createRadiusServer(address: string, config: {
    key?: string;
    port?: string;
    acct_port?: string;
    priority?: string;
    fail_time?: string;
    disabled?: boolean;
    backup?: boolean;
    disable_accounting?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_radius_server", value: address }];
    if (config.key) ops.push({ op: "set_radius_server_key", value: `${address}|${config.key}` });
    if (config.port) ops.push({ op: "set_radius_server_port", value: `${address}|${config.port}` });
    if (config.acct_port) ops.push({ op: "set_radius_server_acct_port", value: `${address}|${config.acct_port}` });
    if (config.priority) ops.push({ op: "set_radius_server_priority", value: `${address}|${config.priority}` });
    if (config.fail_time) ops.push({ op: "set_radius_server_fail_time", value: `${address}|${config.fail_time}` });
    if (config.disabled) ops.push({ op: "set_radius_server_disable", value: address });
    if (config.backup) ops.push({ op: "set_radius_server_backup", value: address });
    if (config.disable_accounting) ops.push({ op: "set_radius_server_disable_accounting", value: address });
    return this.batchConfigure("l2tp", ops);
  }

  async deleteRadiusServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure("l2tp", [{ op: "delete_radius_server", value: address }]);
  }

  // ==========================================================================
  // RADIUS Global Settings
  // ==========================================================================

  async updateRadiusSettings(current: L2TPRadiusSettings, config: {
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
      if (config.dae_server) ops.push({ op: "set_radius_dae_server", value: config.dae_server });
      else if (current.dynamic_author?.server) ops.push({ op: "delete_radius_dae_server" });
    }
    if (config.dae_port !== undefined) {
      if (config.dae_port) ops.push({ op: "set_radius_dae_port", value: config.dae_port });
      else if (current.dynamic_author?.port) ops.push({ op: "delete_radius_dae_port" });
    }
    if (config.dae_key !== undefined) {
      if (config.dae_key) ops.push({ op: "set_radius_dae_key", value: config.dae_key });
      else if (current.dynamic_author?.key) ops.push({ op: "delete_radius_dae_key" });
    }
    // Rate limit
    if (config.rate_limit_enable !== undefined) {
      if (config.rate_limit_enable) ops.push({ op: "set_radius_rate_limit_enable" });
      else if (current.rate_limit?.enable) ops.push({ op: "delete_radius_rate_limit_enable" });
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
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // PPP Options
  // ==========================================================================

  async updatePPPOptions(current: L2TPPPPOptions, config: {
    ipv4?: string;
    ipv6?: string;
    mppe?: string;
    disable_ccp?: boolean;
    lcp_echo_failure?: string;
    lcp_echo_interval?: string;
    lcp_echo_timeout?: string;
    min_mtu?: string;
    mru?: string;
    interface_cache?: string;
    ipv6_interface_id?: string;
    ipv6_peer_interface_id?: string;
    ipv6_accept_peer_interface_id?: boolean;
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

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // Advanced Settings (LNS, Limits, Log, Scripts, Shaper, SNMP)
  // ==========================================================================

  async updateAdvancedSettings(current: L2TPConfigResponse, config: {
    lns_host_name?: string;
    lns_shared_secret?: string;
    limits_connection_limit?: string;
    limits_burst?: string;
    limits_timeout?: string;
    log_level?: string;
    shaper_fwmark?: string;
    snmp_master_agent?: boolean;
    scripts_on_change?: string;
    scripts_on_down?: string;
    scripts_on_pre_up?: string;
    scripts_on_up?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // LNS
    if (config.lns_host_name !== undefined) {
      if (config.lns_host_name) ops.push({ op: "set_lns_host_name", value: config.lns_host_name });
      else if (current.lns?.host_name) ops.push({ op: "delete_lns_host_name" });
    }
    if (config.lns_shared_secret !== undefined) {
      if (config.lns_shared_secret) ops.push({ op: "set_lns_shared_secret", value: config.lns_shared_secret });
      else if (current.lns?.shared_secret) ops.push({ op: "delete_lns_shared_secret" });
    }
    // Limits
    if (config.limits_connection_limit !== undefined) {
      if (config.limits_connection_limit) ops.push({ op: "set_limits_connection_limit", value: config.limits_connection_limit });
      else if (current.limits?.connection_limit) ops.push({ op: "delete_limits_connection_limit" });
    }
    if (config.limits_burst !== undefined) {
      if (config.limits_burst) ops.push({ op: "set_limits_burst", value: config.limits_burst });
      else if (current.limits?.burst) ops.push({ op: "delete_limits_burst" });
    }
    if (config.limits_timeout !== undefined) {
      if (config.limits_timeout) ops.push({ op: "set_limits_timeout", value: config.limits_timeout });
      else if (current.limits?.timeout) ops.push({ op: "delete_limits_timeout" });
    }
    // Log
    if (config.log_level !== undefined) {
      if (config.log_level) ops.push({ op: "set_log_level", value: config.log_level });
      else if (current.log?.level) ops.push({ op: "delete_log_level" });
    }
    // Shaper
    if (config.shaper_fwmark !== undefined) {
      if (config.shaper_fwmark) ops.push({ op: "set_shaper_fwmark", value: config.shaper_fwmark });
      else if (current.shaper?.fwmark) ops.push({ op: "delete_shaper_fwmark" });
    }
    // SNMP
    if (config.snmp_master_agent !== undefined) {
      if (config.snmp_master_agent) ops.push({ op: "set_snmp_master_agent" });
      else if (current.snmp?.master_agent) ops.push({ op: "delete_snmp_master_agent" });
    }
    // Scripts
    if (config.scripts_on_change !== undefined) {
      if (config.scripts_on_change) ops.push({ op: "set_extended_scripts_on_change", value: config.scripts_on_change });
      else if (current.extended_scripts?.on_change) ops.push({ op: "delete_extended_scripts_on_change" });
    }
    if (config.scripts_on_down !== undefined) {
      if (config.scripts_on_down) ops.push({ op: "set_extended_scripts_on_down", value: config.scripts_on_down });
      else if (current.extended_scripts?.on_down) ops.push({ op: "delete_extended_scripts_on_down" });
    }
    if (config.scripts_on_pre_up !== undefined) {
      if (config.scripts_on_pre_up) ops.push({ op: "set_extended_scripts_on_pre_up", value: config.scripts_on_pre_up });
      else if (current.extended_scripts?.on_pre_up) ops.push({ op: "delete_extended_scripts_on_pre_up" });
    }
    if (config.scripts_on_up !== undefined) {
      if (config.scripts_on_up) ops.push({ op: "set_extended_scripts_on_up", value: config.scripts_on_up });
      else if (current.extended_scripts?.on_up) ops.push({ op: "delete_extended_scripts_on_up" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // Authentication Settings
  // ==========================================================================

  async updateAuthSettings(current: L2TPAuthentication, config: {
    mode?: string;
    protocols?: string[];
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.mode !== undefined) {
      if (config.mode) ops.push({ op: "set_auth_mode", value: config.mode });
      else if (current.mode) ops.push({ op: "delete_auth_mode" });
    }
    if (config.protocols !== undefined) {
      // Delete old protocols
      for (const p of current.protocols || []) {
        ops.push({ op: "delete_auth_protocols", value: p });
      }
      // Set new protocols
      for (const p of config.protocols) {
        ops.push({ op: "set_auth_protocols", value: p });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("l2tp", ops);
  }

  // ==========================================================================
  // Delete entire L2TP config
  // ==========================================================================

  async deleteL2TP(): Promise<VyOSResponse> {
    return this.batchConfigure("l2tp", [{ op: "delete_l2tp" }]);
  }
}

export const l2tpService = new L2TPService();
