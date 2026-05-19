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
  inet: string[];
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

export interface FrrConfig {
  profile: string | null;
}

export interface SystemOptions {
  keyboard_layout: string | null;
  time_format: string | null;
  ctrl_alt_delete: string | null;
  startup_beep: boolean;
  disable_usb_autosuspend: boolean;
  reboot_on_panic: boolean;
  root_partition_auto_resize: boolean;
  reboot_on_upgrade_failure: boolean;
  http_client: { source_address: string | null; source_interface: string | null } | null;
  ssh_client: { source_address: string | null; source_interface: string | null } | null;
}

export interface ProxyConfig {
  url: string | null;
  port: number | null;
  username: string | null;
  no_proxy: string[];
}

export interface LogrotateConfig {
  max_size: number | null;
  rotate_count: number | null;
}

export interface LogsConfig {
  atop: LogrotateConfig | null;
  messages: LogrotateConfig | null;
}

export interface UpdateCheckConfig {
  url: string | null;
  auto_install: boolean;
}

export interface SystemConfig {
  hostname: string | null;
  domain_name: string | null;
  domain_search: string[];
  name_servers: string[];
  time_zone: string | null;
  performance: string | null;
  login: LoginConfig;
  max_login_session: number | null;
  syslog: SyslogConfig;
  conntrack: ConntrackConfig;
  config_management: ConfigManagement;
  static_host_mapping: StaticHostEntry[];
  console_devices: ConsoleDevice[];
  sysctl_parameters: SysctlParameter[];
  watchdog: WatchdogConfig | null;
  wireless_country_code: string | null;
  frr: FrrConfig | null;
  options: SystemOptions | null;
  proxy: ProxyConfig | null;
  logs: LogsConfig | null;
  update_check: UpdateCheckConfig | null;
}

// ============================================================================
// Batch operation helper
// ============================================================================

export interface ArchiveFile {
  filename: string;
  modified: string | null;
  size: number | null;
}

export interface ArchiveFilesResponse {
  files: ArchiveFile[];
  archive_location: string;
}

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
    inet: string[],
    aliases?: string[],
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    for (const ip of inet) {
      ops.push({ op: "set_static_host", value: ip });
    }
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

  async listArchiveFiles(archiveLocation: string): Promise<ArchiveFilesResponse> {
    return apiClient.get<ArchiveFilesResponse>("/vyos/system/config/archive-files", {
      archive_location: archiveLocation,
    });
  }

  async restoreFromArchive(archiveLocation: string, filename: string): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/system/config/restore", {
      archive_location: archiveLocation,
      filename,
    });
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

  // --------------------------------------------------------------------------
  // System Options
  // --------------------------------------------------------------------------

  async setKeyboardLayout(layout: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_option_keyboard_layout", value: layout }]);
  }

  async deleteKeyboardLayout(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_option_keyboard_layout" }]);
  }

  async setTimeFormat(format: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_option_time_format", value: format }]);
  }

  async deleteTimeFormat(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_option_time_format" }]);
  }

  async setCtrlAltDelete(action: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_option_ctrl_alt_delete", value: action }]);
  }

  async deleteCtrlAltDelete(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_option_ctrl_alt_delete" }]);
  }

  async setStartupBeep(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_option_startup_beep" : "delete_option_startup_beep" }]);
  }

  async setDisableUsbAutosuspend(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_option_disable_usb_autosuspend" : "delete_option_disable_usb_autosuspend" }]);
  }

  async setRebootOnPanic(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_option_reboot_on_panic" : "delete_option_reboot_on_panic" }]);
  }

  async setRootPartitionAutoResize(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_option_root_partition_auto_resize" : "delete_option_root_partition_auto_resize" }]);
  }

  async setRebootOnUpgradeFailure(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_option_reboot_on_upgrade_failure" : "delete_option_reboot_on_upgrade_failure" }]);
  }

  async updateHttpClientSource(changes: {
    address?: string;
    clearAddress?: boolean;
    iface?: string;
    clearIface?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.address) ops.push({ op: "set_option_http_client_source_address", value: changes.address });
    else if (changes.clearAddress) ops.push({ op: "delete_option_http_client_source_address" });
    if (changes.iface) ops.push({ op: "set_option_http_client_source_interface", value: changes.iface });
    else if (changes.clearIface) ops.push({ op: "delete_option_http_client_source_interface" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async updateSshClientSource(changes: {
    address?: string;
    clearAddress?: boolean;
    iface?: string;
    clearIface?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.address) ops.push({ op: "set_option_ssh_client_source_address", value: changes.address });
    else if (changes.clearAddress) ops.push({ op: "delete_option_ssh_client_source_address" });
    if (changes.iface) ops.push({ op: "set_option_ssh_client_source_interface", value: changes.iface });
    else if (changes.clearIface) ops.push({ op: "delete_option_ssh_client_source_interface" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  // --------------------------------------------------------------------------
  // Proxy
  // --------------------------------------------------------------------------

  async setProxyUrl(url: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_proxy_url", value: url }]);
  }

  async deleteProxyUrl(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_proxy_url" }]);
  }

  async setProxyPort(port: number): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_proxy_port", value: String(port) }]);
  }

  async deleteProxyPort(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_proxy_port" }]);
  }

  async setProxyUsername(username: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_proxy_username", value: username }]);
  }

  async deleteProxyUsername(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_proxy_username" }]);
  }

  async deleteProxy(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_proxy" }]);
  }

  async addProxyNoProxy(host: string): Promise<VyOSResponse> {
    return this.batch(host, [{ op: "add_proxy_no_proxy" }]);
  }

  async deleteProxyNoProxy(host: string): Promise<VyOSResponse> {
    return this.batch(host, [{ op: "delete_proxy_no_proxy" }]);
  }

  // --------------------------------------------------------------------------
  // Logs / logrotate
  // --------------------------------------------------------------------------

  async updateLogrotateAtop(changes: {
    maxSize?: number | null;
    clearMaxSize?: boolean;
    rotate?: number | null;
    clearRotate?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.maxSize != null) ops.push({ op: "set_logrotate_atop_max_size", value: String(changes.maxSize) });
    else if (changes.clearMaxSize) ops.push({ op: "delete_logrotate_atop_max_size" });
    if (changes.rotate != null) ops.push({ op: "set_logrotate_atop_rotate", value: String(changes.rotate) });
    else if (changes.clearRotate) ops.push({ op: "delete_logrotate_atop_rotate" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async updateLogrotateMessages(changes: {
    maxSize?: number | null;
    clearMaxSize?: boolean;
    rotate?: number | null;
    clearRotate?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.maxSize != null) ops.push({ op: "set_logrotate_messages_max_size", value: String(changes.maxSize) });
    else if (changes.clearMaxSize) ops.push({ op: "delete_logrotate_messages_max_size" });
    if (changes.rotate != null) ops.push({ op: "set_logrotate_messages_rotate", value: String(changes.rotate) });
    else if (changes.clearRotate) ops.push({ op: "delete_logrotate_messages_rotate" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  // --------------------------------------------------------------------------
  // Update check
  // --------------------------------------------------------------------------

  async setUpdateCheckUrl(url: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_update_check_url", value: url }]);
  }

  async deleteUpdateCheckUrl(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_update_check_url" }]);
  }

  async setUpdateCheckAutoInstall(enabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: enabled ? "set_update_check_auto_check" : "delete_update_check_auto_check" }]);
  }
}

export const systemSettingsService = new SystemSettingsService();
