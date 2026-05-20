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
    supports_marker_disable: boolean;
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
    standalone_sflow: { supported: boolean };
    resource_limits: { supported: boolean };
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

export interface SyslogMarker {
  interval: number | null;
  disabled: boolean;
}

export interface RadiusServer {
  server: string;
  port: number | null;
  timeout: number | null;
}

export interface RadiusConfig {
  servers: RadiusServer[];
  source_address: string | null;
  timeout: number | null;
}

export interface TacacsServer {
  server: string;
  port: number | null;
  timeout: number | null;
}

export interface TacacsConfig {
  servers: TacacsServer[];
  source_address: string | null;
  timeout: number | null;
}

export interface IpSettings {
  arp_ndp_table_size: number | null;
  disable_forwarding: boolean;
  multipath_ignore_unreachable: boolean;
  multipath_layer4_hashing: boolean;
  nht_no_resolve_via_default: boolean;
}

export interface Ipv6Settings {
  disable_forwarding: boolean;
  multipath_layer4_hashing: boolean;
  nht_no_resolve_via_default: boolean;
  strict_dad: boolean;
  neighbor_table_size: number | null;
}

export interface ConntrackIgnoreRule {
  rule_id: number;
  ip_version: string;
  protocol: string | null;
  source_address: string | null;
  source_port: string | null;
  destination_address: string | null;
  destination_port: string | null;
  inbound_interface: string | null;
}

export interface ConntrackTimeoutRuleProtocol {
  close: number | null;
  close_wait: number | null;
  established: number | null;
  fin_wait: number | null;
  last_ack: number | null;
  syn_recv: number | null;
  syn_sent: number | null;
  time_wait: number | null;
  other: number | null;
  stream: number | null;
}

export interface ConntrackLogEntry {
  event: string;
  protocol: string;
}

export interface ConntrackLog {
  entries: ConntrackLogEntry[];
}

export interface ConntrackTcpTimeouts {
  close: number | null;
  close_wait: number | null;
  established: number | null;
  fin_wait: number | null;
  last_ack: number | null;
  syn_recv: number | null;
  syn_sent: number | null;
  time_wait: number | null;
}

export interface ConntrackUdpTimeouts {
  other: number | null;
  stream: number | null;
}

export interface ConntrackGlobalTimeouts {
  icmp: number | null;
  other: number | null;
  tcp: ConntrackTcpTimeouts;
  udp: ConntrackUdpTimeouts;
}

export interface ConntrackTimeoutCustomRule {
  rule_id: number;
  ip_version: string;
  protocol: string | null;
  source_address: string | null;
  destination_address: string | null;
  tcp: ConntrackTimeoutRuleProtocol | null;
  udp: ConntrackTimeoutRuleProtocol | null;
}

export interface NetflowServer {
  server: string;
  port: number | null;
}

export interface NetflowTimeouts {
  expiry_interval: number | null;
  flow_generic: number | null;
  icmp: number | null;
  max_active_life: number | null;
  tcp_fin: number | null;
  tcp_generic: number | null;
  udp: number | null;
}

export interface NetflowConfig {
  engine_id: number | null;
  max_flows: number | null;
  sampling_rate: number | null;
  source_address: string | null;
  version: string | null;
  servers: NetflowServer[];
  timeouts: NetflowTimeouts | null;
}

export interface SflowServer {
  server: string;
  port: number | null;
}

export interface SflowConfig {
  agent_address: string | null;
  sampling_rate: number | null;
  servers: SflowServer[];
}

export interface FlowAccountingConfig {
  interfaces: string[];
  netflow: NetflowConfig | null;
  sflow: SflowConfig | null;
}

export interface TaskSchedulerTask {
  name: string;
  crontab_spec: string | null;
  interval: string | null;
  executable_path: string | null;
  executable_arguments: string | null;
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

export interface FrrBmpTarget {
  name: string;
  address: string | null;
  port: number | null;
}

export interface FrrConfig {
  profile: string | null;
  bmp: { targets: FrrBmpTarget[] } | null;
}

export interface KernelCpuOptions {
  disable_nmi_watchdog: boolean;
  isolate_cpus: string | null;
  nohz_full: string | null;
  rcu_no_cbs: string | null;
}

export interface KernelMemoryOptions {
  default_hugepage_size: string | null;
  disable_numa_balancing: boolean;
  hugepage_size: string | null;
}

export interface KernelOptions {
  disable_hpet: boolean;
  disable_mce: boolean;
  disable_softlockup: boolean;
  cpu: KernelCpuOptions | null;
  memory: KernelMemoryOptions | null;
}

export interface ResourceLimits {
  max_map_count: number | null;
  shmmax: number | null;
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
  kernel: KernelOptions | null;
  resource_limits: ResourceLimits | null;
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
  login_radius: RadiusConfig | null;
  login_tacacs: TacacsConfig | null;
  syslog: SyslogConfig;
  syslog_marker: SyslogMarker | null;
  conntrack: ConntrackConfig;
  conntrack_log: ConntrackLog | null;
  conntrack_ignore: ConntrackIgnoreRule[];
  conntrack_global_timeouts: ConntrackGlobalTimeouts | null;
  conntrack_timeout_custom: ConntrackTimeoutCustomRule[];
  ip: IpSettings | null;
  ipv6: Ipv6Settings | null;
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
  flow_accounting: FlowAccountingConfig | null;
  sflow: SflowConfig | null;
  task_scheduler: TaskSchedulerTask[];
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

  async addFrrBmpTarget(name: string, address?: string | null, port?: number | null): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_frr_bmp_target" }];
    if (address) ops.push({ op: "set_frr_bmp_target_address", value: address });
    if (port) ops.push({ op: "set_frr_bmp_target_port", value: String(port) });
    return this.batch(name, ops);
  }

  async deleteFrrBmpTarget(name: string): Promise<VyOSResponse> {
    return this.batch(name, [{ op: "delete_frr_bmp_target" }]);
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

  // --------------------------------------------------------------------------
  // RADIUS
  // --------------------------------------------------------------------------

  async addRadiusServer(server: string, port?: number | null, timeout?: number | null, key?: string | null): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_radius_server" }];
    if (port) ops.push({ op: "set_radius_server_port", value: String(port) });
    if (timeout) ops.push({ op: "set_radius_server_timeout", value: String(timeout) });
    if (key) ops.push({ op: "set_radius_server_key", value: key });
    return this.batch(server, ops);
  }

  async deleteRadiusServer(server: string): Promise<VyOSResponse> {
    return this.batch(server, [{ op: "delete_radius_server" }]);
  }

  async setRadiusSourceAddress(addr: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_radius_source_address", value: addr }]);
  }

  async deleteRadiusSourceAddress(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_radius_source_address" }]);
  }

  // --------------------------------------------------------------------------
  // TACACS
  // --------------------------------------------------------------------------

  async addTacacsServer(server: string, port?: number | null, timeout?: number | null, key?: string | null): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_tacacs_server" }];
    if (port) ops.push({ op: "set_tacacs_server_port", value: String(port) });
    if (timeout) ops.push({ op: "set_tacacs_server_timeout", value: String(timeout) });
    if (key) ops.push({ op: "set_tacacs_server_key", value: key });
    return this.batch(server, ops);
  }

  async deleteTacacsServer(server: string): Promise<VyOSResponse> {
    return this.batch(server, [{ op: "delete_tacacs_server" }]);
  }

  async setTacacsSourceAddress(addr: string): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_tacacs_source_address", value: addr }]);
  }

  async deleteTacacsSourceAddress(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_tacacs_source_address" }]);
  }

  async setTacacsTimeout(timeout: number): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_tacacs_timeout", value: String(timeout) }]);
  }

  async deleteTacacsTimeout(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_tacacs_timeout" }]);
  }

  // --------------------------------------------------------------------------
  // Syslog Marker
  // --------------------------------------------------------------------------

  async setSyslogMarkerInterval(interval: number): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_syslog_marker_interval", value: String(interval) }]);
  }

  async deleteSyslogMarkerInterval(): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "delete_syslog_marker_interval" }]);
  }

  async setSyslogMarkerDisable(disabled: boolean): Promise<VyOSResponse> {
    return this.batch("_", [{ op: disabled ? "set_syslog_marker_disable" : "delete_syslog_marker_disable" }]);
  }

  // --------------------------------------------------------------------------
  // IP Settings
  // --------------------------------------------------------------------------

  async updateIpSettings(changes: {
    arpNdpTableSize?: number | null;
    clearArpNdpTableSize?: boolean;
    disableForwarding?: boolean;
    multipathIgnoreUnreachable?: boolean;
    multipathLayer4Hashing?: boolean;
    nhtNoResolveViaDefault?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.arpNdpTableSize != null) ops.push({ op: "set_ip_arp_table_size", value: String(changes.arpNdpTableSize) });
    else if (changes.clearArpNdpTableSize) ops.push({ op: "delete_ip_arp_table_size" });
    if (changes.disableForwarding !== undefined) ops.push({ op: changes.disableForwarding ? "set_ip_disable_forwarding" : "delete_ip_disable_forwarding" });
    if (changes.multipathIgnoreUnreachable !== undefined) ops.push({ op: changes.multipathIgnoreUnreachable ? "set_ip_multipath_ignore_unreachable" : "delete_ip_multipath_ignore_unreachable" });
    if (changes.multipathLayer4Hashing !== undefined) ops.push({ op: changes.multipathLayer4Hashing ? "set_ip_multipath_layer4_hashing" : "delete_ip_multipath_layer4_hashing" });
    if (changes.nhtNoResolveViaDefault !== undefined) ops.push({ op: changes.nhtNoResolveViaDefault ? "set_ip_nht_no_resolve_via_default" : "delete_ip_nht_no_resolve_via_default" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async updateIpv6Settings(changes: {
    neighborTableSize?: number | null;
    clearNeighborTableSize?: boolean;
    disableForwarding?: boolean;
    multipathLayer4Hashing?: boolean;
    nhtNoResolveViaDefault?: boolean;
    strictDad?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.neighborTableSize != null) ops.push({ op: "set_ipv6_neighbor_table_size", value: String(changes.neighborTableSize) });
    else if (changes.clearNeighborTableSize) ops.push({ op: "delete_ipv6_neighbor_table_size" });
    if (changes.disableForwarding !== undefined) ops.push({ op: changes.disableForwarding ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding" });
    if (changes.multipathLayer4Hashing !== undefined) ops.push({ op: changes.multipathLayer4Hashing ? "set_ipv6_multipath_layer4_hashing" : "delete_ipv6_multipath_layer4_hashing" });
    if (changes.nhtNoResolveViaDefault !== undefined) ops.push({ op: changes.nhtNoResolveViaDefault ? "set_ipv6_nht_no_resolve_via_default" : "delete_ipv6_nht_no_resolve_via_default" });
    if (changes.strictDad !== undefined) ops.push({ op: changes.strictDad ? "set_ipv6_strict_dad" : "delete_ipv6_strict_dad" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  // --------------------------------------------------------------------------
  // Conntrack Log
  // --------------------------------------------------------------------------

  async addConntrackLogEvent(event: string, protocol: string): Promise<VyOSResponse> {
    return this.batch(event, [{ op: "set_conntrack_log_event", value: protocol }]);
  }

  async deleteConntrackLogEvent(event: string, protocol: string): Promise<VyOSResponse> {
    return this.batch(event, [{ op: "delete_conntrack_log_event", value: protocol }]);
  }

  // --------------------------------------------------------------------------
  // Conntrack Global Timeouts (1.4 only)
  // --------------------------------------------------------------------------

  async setConntrackGlobalTcpTimeout(state: string, value: number): Promise<VyOSResponse> {
    return this.batch(state, [{ op: "set_conntrack_timeout_tcp", value: String(value) }]);
  }

  async setConntrackGlobalUdpTimeout(subtype: string, value: number): Promise<VyOSResponse> {
    return this.batch(subtype, [{ op: "set_conntrack_timeout_udp", value: String(value) }]);
  }

  async setConntrackGlobalIcmpTimeout(value: number): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_conntrack_timeout_icmp", value: String(value) }]);
  }

  async setConntrackGlobalOtherTimeout(value: number): Promise<VyOSResponse> {
    return this.batch("_", [{ op: "set_conntrack_timeout_other", value: String(value) }]);
  }

  // --------------------------------------------------------------------------
  // Flow Accounting
  // --------------------------------------------------------------------------

  async addFlowAccountingInterface(iface: string): Promise<VyOSResponse> {
    return this.batch(iface, [{ op: "set_flow_accounting_interface" }]);
  }

  async deleteFlowAccountingInterface(iface: string): Promise<VyOSResponse> {
    return this.batch(iface, [{ op: "delete_flow_accounting_interface" }]);
  }

  async saveNetflowConfig(changes: {
    version?: string | null; clearVersion?: boolean;
    engineId?: number | null; clearEngineId?: boolean;
    maxFlows?: number | null; clearMaxFlows?: boolean;
    samplingRate?: number | null; clearSamplingRate?: boolean;
    sourceAddress?: string | null; clearSourceAddress?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.version) ops.push({ op: "set_flow_accounting_netflow_version", value: changes.version });
    else if (changes.clearVersion) ops.push({ op: "delete_flow_accounting_netflow_version" });
    if (changes.engineId != null) ops.push({ op: "set_flow_accounting_netflow_engine_id", value: String(changes.engineId) });
    else if (changes.clearEngineId) ops.push({ op: "delete_flow_accounting_netflow_engine_id" });
    if (changes.maxFlows != null) ops.push({ op: "set_flow_accounting_netflow_max_flows", value: String(changes.maxFlows) });
    else if (changes.clearMaxFlows) ops.push({ op: "delete_flow_accounting_netflow_max_flows" });
    if (changes.samplingRate != null) ops.push({ op: "set_flow_accounting_netflow_sampling_rate", value: String(changes.samplingRate) });
    else if (changes.clearSamplingRate) ops.push({ op: "delete_flow_accounting_netflow_sampling_rate" });
    if (changes.sourceAddress) ops.push({ op: "set_flow_accounting_netflow_source_address", value: changes.sourceAddress });
    else if (changes.clearSourceAddress) ops.push({ op: "delete_flow_accounting_netflow_source_address" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async addNetflowServer(server: string, port?: number | null): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_flow_accounting_netflow_server" }];
    if (port) ops.push({ op: "set_flow_accounting_netflow_server_port", value: String(port) });
    return this.batch(server, ops);
  }

  async deleteNetflowServer(server: string): Promise<VyOSResponse> {
    return this.batch(server, [{ op: "delete_flow_accounting_netflow_server" }]);
  }

  async saveSflowConfig(changes: {
    agentAddress?: string | null; clearAgentAddress?: boolean;
    samplingRate?: number | null; clearSamplingRate?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.agentAddress) ops.push({ op: "set_sflow_agent_address", value: changes.agentAddress });
    else if (changes.clearAgentAddress) ops.push({ op: "delete_sflow_agent_address" });
    if (changes.samplingRate != null) ops.push({ op: "set_sflow_sampling_rate", value: String(changes.samplingRate) });
    else if (changes.clearSamplingRate) ops.push({ op: "delete_sflow_sampling_rate" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async addSflowServer(server: string, port?: number | null): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_sflow_server" }];
    if (port) ops.push({ op: "set_sflow_server_port", value: String(port) });
    return this.batch(server, ops);
  }

  async deleteSflowServer(server: string): Promise<VyOSResponse> {
    return this.batch(server, [{ op: "delete_sflow_server" }]);
  }

  // --------------------------------------------------------------------------
  // Kernel Options
  // --------------------------------------------------------------------------

  async saveKernelOptions(prev: KernelOptions | null, next: {
    disableHpet: boolean; disableMce: boolean; disableSoftlockup: boolean;
    disableNmiWatchdog: boolean;
    isolateCpus: string; nohzFull: string; rcuNoCbs: string;
    defaultHugepageSize: string; disableNumaBalancing: boolean; hugepageSize: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    const p = prev;

    const boolFlag = (cur: boolean, was: boolean, setOp: string, delOp: string) => {
      if (cur && !was) ops.push({ op: setOp });
      else if (!cur && was) ops.push({ op: delOp });
    };
    const valField = (cur: string, was: string | null | undefined, setOp: string, delOp: string) => {
      if (cur && cur !== (was ?? "")) ops.push({ op: setOp, value: cur });
      else if (!cur && was) ops.push({ op: delOp });
    };

    boolFlag(next.disableHpet, p?.disable_hpet ?? false, "set_option_kernel_disable_hpet", "delete_option_kernel_disable_hpet");
    boolFlag(next.disableMce, p?.disable_mce ?? false, "set_option_kernel_disable_mce", "delete_option_kernel_disable_mce");
    boolFlag(next.disableSoftlockup, p?.disable_softlockup ?? false, "set_option_kernel_disable_softlockup", "delete_option_kernel_disable_softlockup");
    boolFlag(next.disableNmiWatchdog, p?.cpu?.disable_nmi_watchdog ?? false, "set_option_kernel_cpu_disable_nmi_watchdog", "delete_option_kernel_cpu_disable_nmi_watchdog");
    valField(next.isolateCpus, p?.cpu?.isolate_cpus, "set_option_kernel_cpu_isolate", "delete_option_kernel_cpu_isolate");
    valField(next.nohzFull, p?.cpu?.nohz_full, "set_option_kernel_cpu_nohz_full", "delete_option_kernel_cpu_nohz_full");
    valField(next.rcuNoCbs, p?.cpu?.rcu_no_cbs, "set_option_kernel_cpu_rcu_no_cbs", "delete_option_kernel_cpu_rcu_no_cbs");
    boolFlag(next.disableNumaBalancing, p?.memory?.disable_numa_balancing ?? false, "set_option_kernel_memory_disable_numa_balancing", "delete_option_kernel_memory_disable_numa_balancing");
    valField(next.defaultHugepageSize, p?.memory?.default_hugepage_size, "set_option_kernel_memory_default_hugepage_size", "delete_option_kernel_memory_default_hugepage_size");
    valField(next.hugepageSize, p?.memory?.hugepage_size, "set_option_kernel_memory_hugepage_size", "delete_option_kernel_memory_hugepage_size");

    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  async saveResourceLimits(prev: ResourceLimits | null, next: {
    maxMapCount: string; shmmax: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    const prevMax = prev?.max_map_count ? String(prev.max_map_count) : "";
    const prevShm = prev?.shmmax ? String(prev.shmmax) : "";
    if (next.maxMapCount && next.maxMapCount !== prevMax) ops.push({ op: "set_option_resource_limits_max_map_count", value: next.maxMapCount });
    else if (!next.maxMapCount && prevMax) ops.push({ op: "delete_option_resource_limits_max_map_count" });
    if (next.shmmax && next.shmmax !== prevShm) ops.push({ op: "set_option_resource_limits_shmmax", value: next.shmmax });
    else if (!next.shmmax && prevShm) ops.push({ op: "delete_option_resource_limits_shmmax" });
    if (ops.length === 0) return { success: true };
    return this.batch("_", ops);
  }

  // --------------------------------------------------------------------------
  // Task Scheduler
  // --------------------------------------------------------------------------

  async createTask(
    name: string,
    cronSpec?: string | null,
    interval?: string | null,
    execPath?: string | null,
    execArgs?: string | null,
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [{ op: "set_task_scheduler_task" }];
    if (cronSpec) ops.push({ op: "set_task_crontab_spec", value: cronSpec });
    if (interval) ops.push({ op: "set_task_interval", value: interval });
    if (execPath) ops.push({ op: "set_task_executable_path", value: execPath });
    if (execArgs) ops.push({ op: "set_task_executable_arguments", value: execArgs });
    return this.batch(name, ops);
  }

  async deleteTask(name: string): Promise<VyOSResponse> {
    return this.batch(name, [{ op: "delete_task_scheduler_task" }]);
  }

  // --------------------------------------------------------------------------
  // Conntrack Ignore Rules
  // --------------------------------------------------------------------------

  async createIgnoreRule(
    ipVersion: string,
    ruleId: number,
    opts: {
      protocol?: string;
      srcAddress?: string;
      srcPort?: string;
      dstAddress?: string;
      dstPort?: string;
      inboundInterface?: string;
    } = {},
  ): Promise<VyOSResponse> {
    const ruleStr = String(ruleId);
    const ops: BatchOp[] = [{ op: "set_conntrack_ignore_rule", value: ruleStr }];
    if (opts.protocol) ops.push({ op: "set_conntrack_ignore_rule_protocol", value: `${ruleStr},${opts.protocol}` });
    if (opts.srcAddress) ops.push({ op: "set_conntrack_ignore_rule_src_address", value: `${ruleStr},${opts.srcAddress}` });
    if (opts.srcPort) ops.push({ op: "set_conntrack_ignore_rule_src_port", value: `${ruleStr},${opts.srcPort}` });
    if (opts.dstAddress) ops.push({ op: "set_conntrack_ignore_rule_dst_address", value: `${ruleStr},${opts.dstAddress}` });
    if (opts.dstPort) ops.push({ op: "set_conntrack_ignore_rule_dst_port", value: `${ruleStr},${opts.dstPort}` });
    if (opts.inboundInterface) ops.push({ op: "set_conntrack_ignore_rule_inbound_interface", value: `${ruleStr},${opts.inboundInterface}` });
    return this.batch(ipVersion, ops);
  }

  async deleteIgnoreRuleAndRenumber(
    ipVersion: string,
    ruleId: number,
    allRules: ConntrackIgnoreRule[],
  ): Promise<VyOSResponse> {
    const sorted = allRules
      .filter((r) => r.ip_version === ipVersion)
      .sort((a, b) => a.rule_id - b.rule_id);
    const ops: BatchOp[] = [{ op: "delete_conntrack_ignore_rule", value: String(ruleId) }];
    for (const r of sorted) {
      if (r.rule_id > ruleId) {
        const newId = r.rule_id - 1;
        ops.push({ op: "delete_conntrack_ignore_rule", value: String(r.rule_id) });
        ops.push({ op: "set_conntrack_ignore_rule", value: String(newId) });
        if (r.protocol) ops.push({ op: "set_conntrack_ignore_rule_protocol", value: `${newId},${r.protocol}` });
        if (r.source_address) ops.push({ op: "set_conntrack_ignore_rule_src_address", value: `${newId},${r.source_address}` });
        if (r.source_port) ops.push({ op: "set_conntrack_ignore_rule_src_port", value: `${newId},${r.source_port}` });
        if (r.destination_address) ops.push({ op: "set_conntrack_ignore_rule_dst_address", value: `${newId},${r.destination_address}` });
        if (r.destination_port) ops.push({ op: "set_conntrack_ignore_rule_dst_port", value: `${newId},${r.destination_port}` });
        if (r.inbound_interface) ops.push({ op: "set_conntrack_ignore_rule_inbound_interface", value: `${newId},${r.inbound_interface}` });
      }
    }
    return this.batch(ipVersion, ops);
  }

  // --------------------------------------------------------------------------
  // Conntrack Custom Timeout Rules
  // --------------------------------------------------------------------------

  async createTimeoutCustomRule(
    ipVersion: string,
    ruleId: number,
    opts: {
      srcAddress?: string;
      dstAddress?: string;
      tcpStates?: Partial<Record<string, number>>;
      udpStates?: Partial<Record<string, number>>;
    } = {},
  ): Promise<VyOSResponse> {
    const ruleStr = String(ruleId);
    const ops: BatchOp[] = [{ op: "set_conntrack_timeout_custom_rule", value: ruleStr }];
    if (opts.srcAddress) ops.push({ op: "set_conntrack_timeout_custom_rule_src_address", value: `${ruleStr},${opts.srcAddress}` });
    if (opts.dstAddress) ops.push({ op: "set_conntrack_timeout_custom_rule_dst_address", value: `${ruleStr},${opts.dstAddress}` });
    for (const [state, val] of Object.entries(opts.tcpStates ?? {})) {
      if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_tcp_state", value: `${ruleStr},${state},${val}` });
    }
    for (const [subtype, val] of Object.entries(opts.udpStates ?? {})) {
      if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_udp_state", value: `${ruleStr},${subtype},${val}` });
    }
    return this.batch(ipVersion, ops);
  }

  async deleteTimeoutCustomRuleAndRenumber(
    ipVersion: string,
    ruleId: number,
    allRules: ConntrackTimeoutCustomRule[],
  ): Promise<VyOSResponse> {
    const sorted = allRules
      .filter((r) => r.ip_version === ipVersion)
      .sort((a, b) => a.rule_id - b.rule_id);
    const ops: BatchOp[] = [{ op: "delete_conntrack_timeout_custom_rule", value: String(ruleId) }];
    for (const r of sorted) {
      if (r.rule_id > ruleId) {
        const newId = r.rule_id - 1;
        ops.push({ op: "delete_conntrack_timeout_custom_rule", value: String(r.rule_id) });
        ops.push({ op: "set_conntrack_timeout_custom_rule", value: String(newId) });
        if (r.source_address) ops.push({ op: "set_conntrack_timeout_custom_rule_src_address", value: `${newId},${r.source_address}` });
        if (r.destination_address) ops.push({ op: "set_conntrack_timeout_custom_rule_dst_address", value: `${newId},${r.destination_address}` });
        if (r.tcp) {
          for (const [state, val] of Object.entries(r.tcp)) {
            if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_tcp_state", value: `${newId},${state},${val}` });
          }
        }
        if (r.udp) {
          for (const [subtype, val] of Object.entries(r.udp)) {
            if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_udp_state", value: `${newId},${subtype},${val}` });
          }
        }
      }
    }
    return this.batch(ipVersion, ops);
  }

  async reorderIgnoreRules(ipVersion: string, rules: ConntrackIgnoreRule[]): Promise<VyOSResponse> {
    if (rules.length === 0) return { success: true };
    const ops: BatchOp[] = [];
    for (const r of rules) {
      ops.push({ op: "delete_conntrack_ignore_rule", value: String(r.rule_id) });
    }
    rules.forEach((r, idx) => {
      const newId = idx + 1;
      ops.push({ op: "set_conntrack_ignore_rule", value: String(newId) });
      if (r.protocol) ops.push({ op: "set_conntrack_ignore_rule_protocol", value: `${newId},${r.protocol}` });
      if (r.source_address) ops.push({ op: "set_conntrack_ignore_rule_src_address", value: `${newId},${r.source_address}` });
      if (r.source_port) ops.push({ op: "set_conntrack_ignore_rule_src_port", value: `${newId},${r.source_port}` });
      if (r.destination_address) ops.push({ op: "set_conntrack_ignore_rule_dst_address", value: `${newId},${r.destination_address}` });
      if (r.destination_port) ops.push({ op: "set_conntrack_ignore_rule_dst_port", value: `${newId},${r.destination_port}` });
      if (r.inbound_interface) ops.push({ op: "set_conntrack_ignore_rule_inbound_interface", value: `${newId},${r.inbound_interface}` });
    });
    return this.batch(ipVersion, ops);
  }

  async reorderTimeoutCustomRules(ipVersion: string, rules: ConntrackTimeoutCustomRule[]): Promise<VyOSResponse> {
    if (rules.length === 0) return { success: true };
    const ops: BatchOp[] = [];
    for (const r of rules) {
      ops.push({ op: "delete_conntrack_timeout_custom_rule", value: String(r.rule_id) });
    }
    rules.forEach((r, idx) => {
      const newId = idx + 1;
      ops.push({ op: "set_conntrack_timeout_custom_rule", value: String(newId) });
      if (r.source_address) ops.push({ op: "set_conntrack_timeout_custom_rule_src_address", value: `${newId},${r.source_address}` });
      if (r.destination_address) ops.push({ op: "set_conntrack_timeout_custom_rule_dst_address", value: `${newId},${r.destination_address}` });
      if (r.tcp) {
        for (const [state, val] of Object.entries(r.tcp)) {
          if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_tcp_state", value: `${newId},${state},${val}` });
        }
      }
      if (r.udp) {
        for (const [subtype, val] of Object.entries(r.udp)) {
          if (val != null) ops.push({ op: "set_conntrack_timeout_custom_rule_udp_state", value: `${newId},${subtype},${val}` });
        }
      }
    });
    return this.batch(ipVersion, ops);
  }

  async updateTask(
    name: string,
    changes: {
      cronSpec?: string | null;
      clearCronSpec?: boolean;
      interval?: string | null;
      clearInterval?: boolean;
      execPath?: string | null;
      clearExecPath?: boolean;
      execArgs?: string | null;
      clearExecArgs?: boolean;
    },
  ): Promise<VyOSResponse> {
    const ops: BatchOp[] = [];
    if (changes.cronSpec) ops.push({ op: "set_task_crontab_spec", value: changes.cronSpec });
    else if (changes.clearCronSpec) ops.push({ op: "delete_task_crontab_spec" });
    if (changes.interval) ops.push({ op: "set_task_interval", value: changes.interval });
    else if (changes.clearInterval) ops.push({ op: "delete_task_interval" });
    if (changes.execPath) ops.push({ op: "set_task_executable_path", value: changes.execPath });
    else if (changes.clearExecPath) ops.push({ op: "delete_task_executable_path" });
    if (changes.execArgs) ops.push({ op: "set_task_executable_arguments", value: changes.execArgs });
    else if (changes.clearExecArgs) ops.push({ op: "delete_task_executable_arguments" });
    if (ops.length === 0) return { success: true };
    return this.batch(name, ops);
  }
}

export const systemSettingsService = new SystemSettingsService();
