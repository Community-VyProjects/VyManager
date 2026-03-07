import { apiClient } from "./client";

// ============================================================================
// Response types
// ============================================================================

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Capabilities
// ============================================================================

export interface PerformanceOption {
  value: string;
  label: string;
  description: string;
}

export interface SystemCapabilities {
  version: string;
  syslog: {
    local_target: string;
    remote_target: string;
    supports_console: boolean;
    supports_file: boolean;
    supports_user: boolean;
    facilities: string[];
    levels: string[];
  };
  conntrack: {
    available_modules: string[];
    supports_global_timeouts: boolean;
  };
  login: {
    supports_operator_group: boolean;
  };
  features: {
    watchdog: { supported: boolean };
    wireless: { supported: boolean };
    frr_profile: { supported: boolean };
    operator_group: { supported: boolean };
  };
  performance_options: PerformanceOption[];
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
}

// ============================================================================
// Config types
// ============================================================================

export interface LoginSshKey {
  key_name: string;
  key_type: string | null;
}

export interface LoginUser {
  username: string;
  full_name: string | null;
  has_password: boolean;
  ssh_keys: LoginSshKey[];
}

export interface LoginBanners {
  pre_login: string | null;
  post_login: string | null;
}

export interface LoginConfig {
  users: LoginUser[];
  timeout: number | null;
  banners: LoginBanners;
  operator_groups: string[];
}

export interface SyslogFacility {
  facility: string;
  level: string;
}

export interface SyslogRemoteHost {
  host: string;
  facilities: SyslogFacility[];
  port: number | null;
  protocol: string | null;
}

export interface SyslogFileEntry {
  filename: string;
  facilities: SyslogFacility[];
}

export interface SyslogUserEntry {
  username: string;
  facilities: SyslogFacility[];
}

export interface SyslogConfig {
  local_facilities: SyslogFacility[];
  preserve_fqdn: boolean;
  remote_hosts: SyslogRemoteHost[];
  console_facilities: SyslogFacility[];
  files: SyslogFileEntry[];
  users: SyslogUserEntry[];
}

export interface ConntrackConfig {
  modules: string[];
  table_size: number | null;
  hash_size: number | null;
  expect_table_size: number | null;
  tcp_loose: string | null;
  tcp_half_open_connections: number | null;
  tcp_max_retrans: number | null;
}

export interface ConfigManagement {
  commit_revisions: number | null;
  archive_locations: string[];
}

export interface StaticHostEntry {
  hostname: string;
  inet: string | null;
  aliases: string[];
}

export interface ConsoleDevice {
  device: string;
  speed: string | null;
  powersave: boolean;
}

export interface SysctlParameter {
  parameter: string;
  value: string;
}

export interface WatchdogConfig {
  timeout: number | null;
  reboot_timeout: number | null;
}

export interface SystemConfig {
  hostname: string | null;
  domain_name: string | null;
  domain_search: string[];
  name_servers: string[];
  time_zone: string | null;
  performance: string | null;
  login: LoginConfig;
  syslog: SyslogConfig;
  conntrack: ConntrackConfig;
  config_management: ConfigManagement;
  static_host_mapping: StaticHostEntry[];
  console_devices: ConsoleDevice[];
  sysctl_parameters: SysctlParameter[];
  watchdog: WatchdogConfig | null;
  wireless_country_code: string | null;
  frr_profile: string | null;
}

// ============================================================================
// Batch operation helper
// ============================================================================

interface BatchOp {
  op: string;
  value?: string | null;
}

// ============================================================================
// Service
// ============================================================================

class SystemSettingsService {
  async getCapabilities(): Promise<SystemCapabilities> {
    return apiClient.get<SystemCapabilities>("/vyos/system/capabilities");
  }

  async getConfig(refresh = false): Promise<SystemConfig> {
    return apiClient.get<SystemConfig>("/vyos/system/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(itemName: string, ops: BatchOp[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/system/batch", {
      item_name: itemName,
      operations: ops,
    });
  }

  // --------------------------------------------------------------------------
  // General (single atomic commit via dedicated endpoint)
  // --------------------------------------------------------------------------

  async updateGeneralSettings(changes: {
    hostname?: string;
    clearHostname?: boolean;
    domainName?: string;
    clearDomainName?: boolean;
    timeZone?: string;
    clearTimeZone?: boolean;
    performance?: string;
    clearPerformance?: boolean;
    nameServersAdd?: string[];
    nameServersRemove?: string[];
  }): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/system/general", {
      hostname: changes.hostname ?? null,
      clear_hostname: changes.clearHostname ?? false,
      domain_name: changes.domainName ?? null,
      clear_domain_name: changes.clearDomainName ?? false,
      time_zone: changes.timeZone ?? null,
      clear_time_zone: changes.clearTimeZone ?? false,
      performance: changes.performance ?? null,
      clear_performance: changes.clearPerformance ?? false,
      name_servers_add: changes.nameServersAdd ?? [],
      name_servers_remove: changes.nameServersRemove ?? [],
    });
  }

  // --------------------------------------------------------------------------
  // Login / Users
  // --------------------------------------------------------------------------

  async createUser(
    username: string,
    fullName?: string,
    plaintextPassword?: string,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_login_user" }];
    if (fullName) ops.push({ op: "set_user_full_name", value: fullName });
    if (plaintextPassword) ops.push({ op: "set_user_plaintext_password", value: plaintextPassword });
    return this.batch(username, ops);
  }

  async updateUser(
    username: string,
    fullName?: string | null,
    plaintextPassword?: string | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (fullName !== undefined && fullName !== null) {
      ops.push({ op: "set_user_full_name", value: fullName });
    }
    if (plaintextPassword) {
      ops.push({ op: "set_user_plaintext_password", value: plaintextPassword });
    }
    if (ops.length === 0) return { success: true };
    return this.batch(username, ops);
  }

  async deleteUser(username: string): Promise<VyOSResponse> {
    return this.batch(username, [{ op: "delete_login_user" }]);
  }

  async addSshKey(
    username: string,
    keyName: string,
    keyType: string,
    keyData: string,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [
      { op: "set_user_public_key_type", value: `${keyName},${keyType}` },
      { op: "set_user_public_key", value: `${keyName},${keyData}` },
    ];
    return this.batch(username, ops);
  }

  async deleteSshKey(username: string, keyName: string): Promise<VyOSResponse> {
    return this.batch(username, [{ op: "delete_user_public_key", value: keyName }]);
  }

  async updateLoginSettings(changes: {
    timeout?: number | null;
    clearTimeout?: boolean;
    preLoginBanner?: string | null;
    clearPreLoginBanner?: boolean;
    postLoginBanner?: string | null;
    clearPostLoginBanner?: boolean;
  }): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/system/login-settings", {
      timeout: changes.timeout ?? null,
      clear_timeout: changes.clearTimeout ?? false,
      pre_login_banner: changes.preLoginBanner ?? null,
      clear_pre_login_banner: changes.clearPreLoginBanner ?? false,
      post_login_banner: changes.postLoginBanner ?? null,
      clear_post_login_banner: changes.clearPostLoginBanner ?? false,
    });
  }

  // --------------------------------------------------------------------------
  // Syslog
  // --------------------------------------------------------------------------

  async setSyslogLocalFacility(facility: string, level: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_syslog_local_facility", value: `${facility},${level}` }]);
  }

  async setSyslogPreserveFqdn(preserve: boolean): Promise<VyOSResponse> {
    if (preserve) return this.batch("_", [{ op: "set_syslog_preserve_fqdn" }]);
    return this.batch("_", [{ op: "delete_syslog_preserve_fqdn" }]);
  }

  async setSyslogRemoteHostFacility(
    host: string,
    facility: string,
    level: string,
    port?: number | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [
      { op: "set_syslog_remote_facility", value: `${facility},${level}` },
    ];
    if (port) ops.push({ op: "set_syslog_remote_port", value: String(port) });
    return this.batch(host, ops);
  }

  async createSyslogRemoteHost(
    host: string,
    facilities: { facility: string; level: string }[],
    port?: number | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = facilities.map((f) => ({
      op: "set_syslog_remote_facility",
      value: `${f.facility},${f.level}`,
    }));
    if (port) ops.push({ op: "set_syslog_remote_port", value: String(port) });
    return this.batch(host, ops);
  }

  async deleteSyslogRemoteHost(host: string): Promise<VyOSResponse> {
    return this.batch(host, [{ op: "delete_syslog_remote_host" }]);
  }

  async setSyslogConsoleFacility(facility: string, level: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_syslog_console_facility", value: `${facility},${level}` }]);
  }

  // --------------------------------------------------------------------------
  // Conntrack
  // --------------------------------------------------------------------------

  async addConntrackModule(module: string): Promise<VyOSResponse> {
    return this.batch(module, [{ op: "add_conntrack_module" }]);
  }

  async deleteConntrackModule(module: string): Promise<VyOSResponse> {
    return this.batch(module, [{ op: "delete_conntrack_module" }]);
  }

  async updateConntrackSizes(
    tableSize?: number | null,
    hashSize?: number | null,
    expectTableSize?: number | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (tableSize !== undefined && tableSize !== null) {
      ops.push({ op: "set_conntrack_table_size", value: String(tableSize) });
    }
    if (hashSize !== undefined && hashSize !== null) {
      ops.push({ op: "set_conntrack_hash_size", value: String(hashSize) });
    }
    if (expectTableSize !== undefined && expectTableSize !== null) {
      ops.push({ op: "set_conntrack_expect_table_size", value: String(expectTableSize) });
    }
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async updateConntrackTcp(
    loose?: string | null,
    halfOpen?: number | null,
    maxRetrans?: number | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (loose !== undefined && loose !== null) {
      ops.push({ op: "set_conntrack_tcp_loose", value: loose });
    }
    if (halfOpen !== undefined && halfOpen !== null) {
      ops.push({ op: "set_conntrack_tcp_half_open", value: String(halfOpen) });
    }
    if (maxRetrans !== undefined && maxRetrans !== null) {
      ops.push({ op: "set_conntrack_tcp_max_retrans", value: String(maxRetrans) });
    }
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  // --------------------------------------------------------------------------
  // Static host mapping
  // --------------------------------------------------------------------------

  async createStaticHost(
    hostname: string,
    inet: string,
    aliases?: string[],
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_static_host", value: inet }];
    for (const alias of aliases ?? []) {
      ops.push({ op: "add_static_host_alias", value: alias });
    }
    return this.batch(hostname, ops);
  }

  async deleteStaticHost(hostname: string): Promise<VyOSResponse> {
    return this.batch(hostname, [{ op: "delete_static_host" }]);
  }

  async updateStaticHostAliases(
    hostname: string,
    current: string[],
    next: string[],
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    for (const a of current) ops.push({ op: "delete_static_host_alias", value: a });
    for (const a of next) ops.push({ op: "add_static_host_alias", value: a });
    return this.batch(hostname, ops);
  }

  // --------------------------------------------------------------------------
  // Config management
  // --------------------------------------------------------------------------

  async setCommitRevisions(revisions: number): Promise<VyOSResponse> {
    return this.batch(String(revisions), [{ op: "set_commit_revisions" }]);
  }

  async addArchiveLocation(url: string): Promise<VyOSResponse> {
    return this.batch(url, [{ op: "add_commit_archive_location" }]);
  }

  async deleteArchiveLocation(url: string): Promise<VyOSResponse> {
    return this.batch(url, [{ op: "delete_commit_archive_location" }]);
  }

  // --------------------------------------------------------------------------
  // Sysctl parameters
  // --------------------------------------------------------------------------

  async setSysctlParameter(param: string, value: string): Promise<VyOSResponse> {
    return this.batch(param, [{ op: "set_sysctl_parameter", value }]);
  }

  async deleteSysctlParameter(param: string): Promise<VyOSResponse> {
    return this.batch(param, [{ op: "delete_sysctl_parameter" }]);
  }

  // --------------------------------------------------------------------------
  // Watchdog (1.5 only)
  // --------------------------------------------------------------------------

  async setWatchdogTimeout(seconds: number): Promise<VyOSResponse> {
    return this.batch(String(seconds), [{ op: "set_watchdog_timeout" }]);
  }

  async setWatchdogRebootTimeout(seconds: number): Promise<VyOSResponse> {
    return this.batch(String(seconds), [{ op: "set_watchdog_reboot_timeout" }]);
  }

  async deleteWatchdogTimeout(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_watchdog_timeout" }]);
  }

  async updateWatchdogSettings(changes: {
    timeout?: number | null;
    clearTimeout?: boolean;
    rebootTimeout?: number | null;
    clearRebootTimeout?: boolean;
  }): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/system/watchdog-settings", {
      timeout: changes.timeout ?? null,
      clear_timeout: changes.clearTimeout ?? false,
      reboot_timeout: changes.rebootTimeout ?? null,
      clear_reboot_timeout: changes.clearRebootTimeout ?? false,
    });
  }

  // --------------------------------------------------------------------------
  // Wireless (1.5 only)
  // --------------------------------------------------------------------------

  async setWirelessCountryCode(code: string): Promise<VyOSResponse> {
    return this.batch(code, [{ op: "set_wireless_country_code" }]);
  }

  async deleteWirelessCountryCode(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_wireless_country_code" }]);
  }

  // --------------------------------------------------------------------------
  // FRR Profile (1.5 only)
  // --------------------------------------------------------------------------

  async setFrrProfile(profile: string): Promise<VyOSResponse> {
    return this.batch(profile, [{ op: "set_frr_profile" }]);
  }

  async deleteFrrProfile(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_frr_profile" }]);
  }

  // --------------------------------------------------------------------------
  // Console devices
  // --------------------------------------------------------------------------

  async setConsoleSpeed(device: string, speed: string): Promise<VyOSResponse> {
    return this.batch(device, [{ op: "set_console_speed", value: speed }]);
  }

  async deleteConsoleDevice(device: string): Promise<VyOSResponse> {
    return this.batch(device, [{ op: "delete_console_device" }]);
  }

  /** Powersave is a global console setting (not per-device) */
  async setConsolePowersave(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_console_powersave" : "delete_console_powersave" }]);
  }
}

export const systemSettingsService = new SystemSettingsService();
