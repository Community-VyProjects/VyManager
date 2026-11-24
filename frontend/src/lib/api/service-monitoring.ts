import { apiClient } from "./client";
import type { ApiError } from "../types/api";

// ============================================================================
// Interfaces
// ============================================================================

export interface TelegrafInfluxDBAuth {
  token?: string | null;
  organization?: string | null;
}

export interface TelegrafInfluxDB {
  url?: string | null;
  port?: number | null;
  bucket?: string | null;
  authentication: TelegrafInfluxDBAuth;
}

export interface TelegrafLokiAuth {
  username?: string | null;
  password?: string | null;
}

export interface TelegrafLoki {
  url?: string | null;
  port?: number | null;
  metric_name_label?: string | null;
  authentication: TelegrafLokiAuth;
}

export interface TelegrafSplunkAuth {
  token?: string | null;
  insecure: boolean;
}

export interface TelegrafSplunk {
  url?: string | null;
  authentication: TelegrafSplunkAuth;
}

export interface TelegrafAzureAuth {
  client_id?: string | null;
  client_secret?: string | null;
  tenant_id?: string | null;
}

export interface TelegrafAzure {
  url?: string | null;
  database?: string | null;
  table?: string | null;
  group_metrics?: string | null;
  authentication: TelegrafAzureAuth;
}

export interface TelegrafPrometheusClientAuth {
  username?: string | null;
  password?: string | null;
}

export interface TelegrafPrometheusClient {
  port?: number | null;
  listen_address?: string | null;
  metric_version?: number | null;
  allow_from: string[];
  authentication: TelegrafPrometheusClientAuth;
}

export interface TelegrafGlobalTag {
  name: string;
  value?: string | null;
}

export interface TelegrafConfig {
  sources: string[];
  vrf?: string | null;
  /** 1.5 only: relay frr-exporter metrics through Telegraf. */
  frr_metrics: boolean;
  /** 1.5 only: `global-tag <name> value <value>`. */
  global_tags: TelegrafGlobalTag[];
  influxdb?: TelegrafInfluxDB | null;
  loki?: TelegrafLoki | null;
  splunk?: TelegrafSplunk | null;
  azure_data_explorer?: TelegrafAzure | null;
  prometheus_client?: TelegrafPrometheusClient | null;
}

export interface ZabbixAuth {
  mode?: string | null;
  psk_id?: string | null;
  psk_secret?: string | null;
}

export interface ZabbixLimits {
  buffer_flush_interval?: number | null;
  buffer_size?: number | null;
}

export interface ZabbixLog {
  debug_level?: string | null;
  size?: number | null;
  remote_commands: boolean;
}

export interface ZabbixServerActive {
  address: string;
  port?: number | null;
}

export interface ZabbixConfig {
  host_name?: string | null;
  port?: number | null;
  vrf?: string | null;
  listen_addresses: string[];
  directory?: string | null;
  timeout?: number | null;
  servers: string[];
  servers_active: ZabbixServerActive[];
  authentication: ZabbixAuth;
  limits: ZabbixLimits;
  log: ZabbixLog;
}

export interface PrometheusExporterBase {
  port?: number | null;
  listen_addresses: string[];
  vrf?: string | null;
}

export interface PrometheusNodeExporter extends PrometheusExporterBase {
  textfile_collector: boolean;
}

export interface PrometheusFrrExporter extends PrometheusExporterBase {
  /** Valueless `collector <name>` nodes that are set. */
  collectors: string[];
  /** Valueless `collector bgp <option>` nodes that are set. */
  bgp_options: string[];
  bgp_peer_description?: string | null;
  ospf_instances: string[];
}

export interface PrometheusBlackboxICMPModule {
  name: string;
  preferred_ip_protocol?: string | null;
  ip_protocol_fallback: boolean;
  timeout?: number | null;
}

export interface PrometheusBlackboxDNSModule {
  name: string;
  preferred_ip_protocol?: string | null;
  ip_protocol_fallback: boolean;
  timeout?: number | null;
  query_name?: string | null;
  query_type?: string | null;
}

export interface PrometheusBlackboxExporter extends PrometheusExporterBase {
  icmp_modules: PrometheusBlackboxICMPModule[];
  dns_modules: PrometheusBlackboxDNSModule[];
}

export interface PrometheusConfig {
  node_exporter?: PrometheusNodeExporter | null;
  frr_exporter?: PrometheusFrrExporter | null;
  blackbox_exporter?: PrometheusBlackboxExporter | null;
}

export interface NetworkEventConfig {
  log_level?: string | null;
  queue_size?: number | null;
  events: string[];
}

export interface ServiceMonitoringConfig {
  /** `service monitoring` is on the device, even with no children left. */
  configured: boolean;
  telegraf?: TelegrafConfig | null;
  zabbix_agent?: ZabbixConfig | null;
  prometheus?: PrometheusConfig | null;
  network_event?: NetworkEventConfig | null;
}

export interface ServiceMonitoringCapabilities {
  features: {
    telegraf: {
      supported: boolean;
      outputs: {
        influxdb: { supported: boolean; default_port: number };
        loki: { supported: boolean; default_port: number };
        splunk: { supported: boolean };
        azure_data_explorer: { supported: boolean; group_metrics_values: string[] };
        prometheus_client: { supported: boolean; default_port: number; metric_version_values: number[] };
      };
      source_values: string[];
      vrf: { supported: boolean };
      frr_metrics: { supported: boolean };
      global_tag: { supported: boolean };
    };
    zabbix_agent: {
      supported: boolean;
      default_port: number;
      /** Empty when this version has no `zabbix-agent authentication` node. */
      auth_modes: string[];
      vrf: { supported: boolean };
      log_debug_levels: string[];
      limits: {
        buffer_flush_interval: { min: number; max: number; default: number };
        buffer_size: { min: number; max: number; default: number };
      };
      timeout: { min: number; max: number; default: number };
    };
    prometheus: {
      supported: boolean;
      exporters: {
        node_exporter: { default_port: number };
        frr_exporter: {
          default_port: number;
          collectors: string[];
          bgp_options: string[];
          peer_description_values: string[];
        };
        blackbox_exporter: {
          default_port: number;
          preferred_ip_protocol_values: string[];
          dns_query_types: string[];
        };
      };
    };
    network_event: {
      supported: boolean;
      log_level_values: string[];
      event_types: string[];
      queue_size: { min: number; max: number };
    };
  };
}

/** A configured secret comes back as this mask; it is never sent back. */
export const MASKED_SECRET = "***";

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Service
// ============================================================================

class ServiceMonitoringService {
  async getCapabilities(): Promise<ServiceMonitoringCapabilities> {
    return apiClient.get<ServiceMonitoringCapabilities>("/vyos/service-monitoring/capabilities");
  }

  async getConfig(refresh = false): Promise<ServiceMonitoringConfig> {
    return apiClient.get<ServiceMonitoringConfig>("/vyos/service-monitoring/config", {
      refresh: refresh.toString(),
    });
  }

  /** Commit one batch. A rejected commit throws an ApiError carrying the device error. */
  async batchConfigure(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/service-monitoring/batch", {
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return { success: true };
    return this.batchConfigure(operations);
  }

  async deleteServiceMonitoring(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_service_monitoring" }]);
  }

  // --------------------------------------------------------------------------
  // Telegraf general
  // --------------------------------------------------------------------------

  async deleteTelegraf(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf" }]);
  }

  async saveTelegrafSources(
    original: TelegrafConfig | null | undefined,
    data: Pick<TelegrafConfig, "sources" | "vrf" | "frr_metrics" | "global_tags">
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const sources = data.sources;
    const origSources = original?.sources ?? [];
    const removed = origSources.filter((s) => !sources.includes(s));
    const added = sources.filter((s) => !origSources.includes(s));

    if (removed.length > 0 && added.length === 0 && sources.length === 0) {
      ops.push({ op: "delete_telegraf_all_sources" });
    } else {
      for (const s of removed) ops.push({ op: "delete_telegraf_source", value: s });
      for (const s of added) ops.push({ op: "set_telegraf_source", value: s });
    }

    const vrf = data.vrf ?? "";
    const origVrf = original?.vrf ?? "";
    if (vrf !== origVrf) {
      if (vrf) {
        ops.push({ op: "set_telegraf_vrf", value: vrf });
      } else if (origVrf) {
        ops.push({ op: "delete_telegraf_vrf" });
      }
    }

    if (data.frr_metrics !== (original?.frr_metrics ?? false)) {
      ops.push({ op: data.frr_metrics ? "set_telegraf_frr_metrics" : "delete_telegraf_frr_metrics" });
    }

    // A set replaces the value of an existing tag, so only removed names are deleted.
    const origTags = new Map((original?.global_tags ?? []).map((g) => [g.name, g.value ?? ""]));
    const newTags = new Map(data.global_tags.map((g) => [g.name, g.value ?? ""]));
    if (origTags.size > 0 && newTags.size === 0) {
      ops.push({ op: "delete_telegraf_all_global_tags" });
    } else {
      for (const name of origTags.keys()) {
        if (!newTags.has(name)) ops.push({ op: "delete_telegraf_global_tag", value: name });
      }
    }
    for (const [name, value] of newTags) {
      if (origTags.get(name) !== value) ops.push({ op: "set_telegraf_global_tag", value: `${name},${value}` });
    }

    return this.batch(ops);
  }

  // --------------------------------------------------------------------------
  // Telegraf InfluxDB
  // --------------------------------------------------------------------------

  async saveTelegrafInfluxDB(
    original: TelegrafInfluxDB | null | undefined,
    data: TelegrafInfluxDB
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // url, token and organization are required by the lab's verify: the modal
    // requires them, a set replaces them, and the output delete clears them.
    if (data.url && data.url !== (orig?.url ?? null)) {
      ops.push({ op: "set_telegraf_influxdb_url", value: data.url });
    }
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_influxdb_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_influxdb_port" });
    }
    if (data.bucket !== (orig?.bucket ?? null)) {
      if (data.bucket) ops.push({ op: "set_telegraf_influxdb_bucket", value: data.bucket });
      else if (orig?.bucket) ops.push({ op: "delete_telegraf_influxdb_bucket" });
    }
    if (data.authentication.token && data.authentication.token !== MASKED_SECRET) {
      // A blank field keeps the stored token.
      ops.push({ op: "set_telegraf_influxdb_auth_token", value: data.authentication.token });
    }
    const organization = data.authentication.organization;
    if (organization && organization !== (orig?.authentication?.organization ?? null)) {
      ops.push({ op: "set_telegraf_influxdb_auth_organization", value: organization });
    }

    return this.batch(ops);
  }

  async deleteTelegrafInfluxDB(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf_influxdb" }]);
  }

  // --------------------------------------------------------------------------
  // Telegraf Loki
  // --------------------------------------------------------------------------

  async saveTelegrafLoki(
    original: TelegrafLoki | null | undefined,
    data: TelegrafLoki
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // url is required by the lab's verify: the modal requires it and a set replaces it.
    if (data.url && data.url !== (orig?.url ?? null)) {
      ops.push({ op: "set_telegraf_loki_url", value: data.url });
    }
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_loki_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_loki_port" });
    }
    if (data.metric_name_label !== (orig?.metric_name_label ?? null)) {
      if (data.metric_name_label) ops.push({ op: "set_telegraf_loki_metric_name_label", value: data.metric_name_label });
      else if (orig?.metric_name_label) ops.push({ op: "delete_telegraf_loki_metric_name_label" });
    }
    // Verify needs username and password together, so the password is a required
    // secret (blank keeps the stored one) and clearing the username removes the
    // authentication node rather than leaving one leaf behind.
    const username = data.authentication.username ?? null;
    const password = data.authentication.password ?? null;
    const newPassword = password && password !== MASKED_SECRET ? password : null;
    if (!username) {
      if (orig?.authentication?.username || orig?.authentication?.password) {
        ops.push({ op: "delete_telegraf_loki_auth" });
      }
    } else {
      if (username !== (orig?.authentication?.username ?? null)) {
        ops.push({ op: "set_telegraf_loki_auth_username", value: username });
      }
      if (newPassword) {
        ops.push({ op: "set_telegraf_loki_auth_password", value: newPassword });
      }
    }

    return this.batch(ops);
  }

  async deleteTelegrafLoki(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf_loki" }]);
  }

  // --------------------------------------------------------------------------
  // Telegraf Splunk
  // --------------------------------------------------------------------------

  async saveTelegrafSplunk(
    original: TelegrafSplunk | null | undefined,
    data: TelegrafSplunk
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // url and token are required by the lab's verify: a set replaces them and
    // the output delete clears them.
    if (data.url && data.url !== (orig?.url ?? null)) {
      ops.push({ op: "set_telegraf_splunk_url", value: data.url });
    }
    if (data.authentication.token && data.authentication.token !== MASKED_SECRET) {
      // A blank field keeps the stored token.
      ops.push({ op: "set_telegraf_splunk_auth_token", value: data.authentication.token });
    }
    if (data.authentication.insecure !== (orig?.authentication?.insecure ?? false)) {
      if (data.authentication.insecure) ops.push({ op: "set_telegraf_splunk_auth_insecure" });
      else ops.push({ op: "delete_telegraf_splunk_auth_insecure" });
    }

    return this.batch(ops);
  }

  async deleteTelegrafSplunk(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf_splunk" }]);
  }

  // --------------------------------------------------------------------------
  // Telegraf Azure
  // --------------------------------------------------------------------------

  async saveTelegrafAzure(
    original: TelegrafAzure | null | undefined,
    data: TelegrafAzure
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // url, database, client-id, client-secret and tenant-id are required by the
    // lab's verify: a set replaces them and the output delete clears them.
    const auth = data.authentication;
    const origAuth = orig?.authentication;
    if (data.url && data.url !== (orig?.url ?? null)) {
      ops.push({ op: "set_telegraf_azure_url", value: data.url });
    }
    if (data.database && data.database !== (orig?.database ?? null)) {
      ops.push({ op: "set_telegraf_azure_database", value: data.database });
    }
    if (data.table !== (orig?.table ?? null)) {
      if (data.table) ops.push({ op: "set_telegraf_azure_table", value: data.table });
      else if (orig?.table) ops.push({ op: "delete_telegraf_azure_table" });
    }
    if (data.group_metrics !== (orig?.group_metrics ?? null)) {
      if (data.group_metrics) ops.push({ op: "set_telegraf_azure_group_metrics", value: data.group_metrics });
      else if (orig?.group_metrics) ops.push({ op: "delete_telegraf_azure_group_metrics" });
    }
    if (auth.client_id && auth.client_id !== (origAuth?.client_id ?? null)) {
      ops.push({ op: "set_telegraf_azure_auth_client_id", value: auth.client_id });
    }
    if (auth.client_secret && auth.client_secret !== MASKED_SECRET) {
      // A blank field keeps the stored client secret.
      ops.push({ op: "set_telegraf_azure_auth_client_secret", value: auth.client_secret });
    }
    if (auth.tenant_id && auth.tenant_id !== (origAuth?.tenant_id ?? null)) {
      ops.push({ op: "set_telegraf_azure_auth_tenant_id", value: auth.tenant_id });
    }

    return this.batch(ops);
  }

  async deleteTelegrafAzure(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf_azure" }]);
  }

  // --------------------------------------------------------------------------
  // Telegraf Prometheus Client
  // --------------------------------------------------------------------------

  async saveTelegrafPrometheusClient(
    original: TelegrafPrometheusClient | null | undefined,
    data: TelegrafPrometheusClient
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // Every leaf is optional, so a create with none set still writes the node.
    if (!orig) ops.push({ op: "set_telegraf_prometheus_client" });
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_prometheus_client_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_prometheus_client_port" });
    }
    if (data.listen_address !== (orig?.listen_address ?? null)) {
      if (data.listen_address) ops.push({ op: "set_telegraf_prometheus_client_listen_address", value: data.listen_address });
      else if (orig?.listen_address) ops.push({ op: "delete_telegraf_prometheus_client_listen_address" });
    }
    if (data.metric_version !== (orig?.metric_version ?? null)) {
      if (data.metric_version) ops.push({ op: "set_telegraf_prometheus_client_metric_version", value: String(data.metric_version) });
      else if (orig?.metric_version) ops.push({ op: "delete_telegraf_prometheus_client_metric_version" });
    }
    if (data.authentication.username !== (orig?.authentication?.username ?? null)) {
      if (data.authentication.username) ops.push({ op: "set_telegraf_prometheus_client_auth_username", value: data.authentication.username });
      else if (orig?.authentication?.username) ops.push({ op: "delete_telegraf_prometheus_client_auth_username" });
    }
    // The password loads as the mask: unchanged skips, cleared deletes, new text sets.
    const password = data.authentication.password ?? null;
    if (password !== MASKED_SECRET && password !== (orig?.authentication?.password ?? null)) {
      if (password) ops.push({ op: "set_telegraf_prometheus_client_auth_password", value: password });
      else if (orig?.authentication?.password) ops.push({ op: "delete_telegraf_prometheus_client_auth_password" });
    }

    const origAllowFrom = orig?.allow_from ?? [];
    const removedAllowFrom = origAllowFrom.filter((a) => !data.allow_from.includes(a));
    const addedAllowFrom = data.allow_from.filter((a) => !origAllowFrom.includes(a));
    if (removedAllowFrom.length > 0 && data.allow_from.length === 0) {
      ops.push({ op: "delete_telegraf_prometheus_client_all_allow_from" });
    } else {
      for (const a of removedAllowFrom) ops.push({ op: "delete_telegraf_prometheus_client_allow_from", value: a });
      for (const a of addedAllowFrom) ops.push({ op: "set_telegraf_prometheus_client_allow_from", value: a });
    }

    return this.batch(ops);
  }

  async deleteTelegrafPrometheusClient(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_telegraf_prometheus_client" }]);
  }

  // --------------------------------------------------------------------------
  // Zabbix
  // --------------------------------------------------------------------------

  async saveZabbix(
    original: ZabbixConfig | null | undefined,
    data: ZabbixConfig
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    if (data.host_name !== (orig?.host_name ?? null)) {
      if (data.host_name) ops.push({ op: "set_zabbix_host_name", value: data.host_name });
      else if (orig?.host_name) ops.push({ op: "delete_zabbix_host_name" });
    }
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_zabbix_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_zabbix_port" });
    }
    if ((data.vrf ?? null) !== (orig?.vrf ?? null)) {
      if (data.vrf) ops.push({ op: "set_zabbix_vrf", value: data.vrf });
      else if (orig?.vrf) ops.push({ op: "delete_zabbix_vrf" });
    }
    if (data.directory !== (orig?.directory ?? null)) {
      if (data.directory) ops.push({ op: "set_zabbix_directory", value: data.directory });
      else if (orig?.directory) ops.push({ op: "delete_zabbix_directory" });
    }
    if (data.timeout !== (orig?.timeout ?? null)) {
      if (data.timeout) ops.push({ op: "set_zabbix_timeout", value: String(data.timeout) });
      else if (orig?.timeout) ops.push({ op: "delete_zabbix_timeout" });
    }

    const origListenAddrs = orig?.listen_addresses ?? [];
    const removedListen = origListenAddrs.filter((a) => !data.listen_addresses.includes(a));
    const addedListen = data.listen_addresses.filter((a) => !origListenAddrs.includes(a));
    if (removedListen.length > 0 && data.listen_addresses.length === 0) {
      ops.push({ op: "delete_zabbix_all_listen_addresses" });
    } else {
      for (const a of removedListen) ops.push({ op: "delete_zabbix_listen_address", value: a });
      for (const a of addedListen) ops.push({ op: "set_zabbix_listen_address", value: a });
    }

    // At least one server is required by the lab's verify: the modal requires
    // one, and the agent delete clears them all.
    const origServers = orig?.servers ?? [];
    for (const s of origServers) {
      if (!data.servers.includes(s)) ops.push({ op: "delete_zabbix_server", value: s });
    }
    for (const s of data.servers) {
      if (!origServers.includes(s)) ops.push({ op: "set_zabbix_server", value: s });
    }

    const origActiveMap = new Map((orig?.servers_active ?? []).map((s) => [s.address, s]));
    const newActiveMap = new Map(data.servers_active.map((s) => [s.address, s]));
    if (origActiveMap.size > 0 && newActiveMap.size === 0) {
      ops.push({ op: "delete_zabbix_all_server_active" });
    } else {
      for (const addr of origActiveMap.keys()) {
        if (!newActiveMap.has(addr)) {
          ops.push({ op: "delete_zabbix_server_active", value: addr });
        }
      }
    }
    for (const [addr, newEntry] of newActiveMap) {
      if (!origActiveMap.has(addr)) {
        ops.push({ op: "set_zabbix_server_active", value: addr });
        if (newEntry.port) ops.push({ op: "set_zabbix_server_active_port", value: `${addr},${newEntry.port}` });
      } else {
        const origEntry = origActiveMap.get(addr)!;
        if (newEntry.port !== origEntry.port) {
          if (newEntry.port) ops.push({ op: "set_zabbix_server_active_port", value: `${addr},${newEntry.port}` });
          else ops.push({ op: "delete_zabbix_server_active_port", value: addr });
        }
      }
    }

    // Each leaf is set or deleted on its own (the lab commits each alone). The
    // PSK secret loads as the mask: unchanged skips, cleared deletes, new text
    // sets. Clearing every leaf removes the node, so no empty `psk` is left.
    const origAuth = orig?.authentication;
    const mode = data.authentication.mode ?? null;
    const pskId = data.authentication.psk_id ?? null;
    const pskSecret = data.authentication.psk_secret ?? null;
    if (!mode && !pskId && !pskSecret) {
      if (origAuth?.mode || origAuth?.psk_id || origAuth?.psk_secret) {
        ops.push({ op: "delete_zabbix_auth" });
      }
    } else {
      if (mode !== (origAuth?.mode ?? null)) {
        if (mode) ops.push({ op: "set_zabbix_auth_mode", value: mode });
        else ops.push({ op: "delete_zabbix_auth_mode" });
      }
      if (pskId !== (origAuth?.psk_id ?? null)) {
        if (pskId) ops.push({ op: "set_zabbix_auth_psk_id", value: pskId });
        else ops.push({ op: "delete_zabbix_auth_psk_id" });
      }
      if (pskSecret !== MASKED_SECRET) {
        if (pskSecret) ops.push({ op: "set_zabbix_auth_psk_secret", value: pskSecret });
        else if (origAuth?.psk_secret) ops.push({ op: "delete_zabbix_auth_psk_secret" });
      }
    }

    if (data.limits.buffer_flush_interval !== (orig?.limits?.buffer_flush_interval ?? null)) {
      if (data.limits.buffer_flush_interval) ops.push({ op: "set_zabbix_limits_buffer_flush_interval", value: String(data.limits.buffer_flush_interval) });
      else if (orig?.limits?.buffer_flush_interval) ops.push({ op: "delete_zabbix_limits_buffer_flush_interval" });
    }
    if (data.limits.buffer_size !== (orig?.limits?.buffer_size ?? null)) {
      if (data.limits.buffer_size) ops.push({ op: "set_zabbix_limits_buffer_size", value: String(data.limits.buffer_size) });
      else if (orig?.limits?.buffer_size) ops.push({ op: "delete_zabbix_limits_buffer_size" });
    }

    if (data.log.debug_level !== (orig?.log?.debug_level ?? null)) {
      if (data.log.debug_level) ops.push({ op: "set_zabbix_log_debug_level", value: data.log.debug_level });
      else if (orig?.log?.debug_level) ops.push({ op: "delete_zabbix_log_debug_level" });
    }
    // The lab range is 0-1024, so 0 is a real size, not "unset".
    const logSize = data.log.size ?? null;
    if (logSize !== (orig?.log?.size ?? null)) {
      if (logSize !== null) ops.push({ op: "set_zabbix_log_size", value: String(logSize) });
      else ops.push({ op: "delete_zabbix_log_size" });
    }
    if (data.log.remote_commands !== (orig?.log?.remote_commands ?? false)) {
      if (data.log.remote_commands) ops.push({ op: "set_zabbix_log_remote_commands" });
      else ops.push({ op: "delete_zabbix_log_remote_commands" });
    }

    return this.batch(ops);
  }

  async deleteZabbix(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_zabbix" }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus
  // --------------------------------------------------------------------------

  /** `telegraf frr-metrics` needs frr-exporter, so it goes in the same batch first. */
  async deletePrometheus(telegrafFrrMetrics = false): Promise<VyOSResponse> {
    return this.batch([
      ...(telegrafFrrMetrics ? [{ op: "delete_telegraf_frr_metrics" }] : []),
      { op: "delete_prometheus" },
    ]);
  }

  // --------------------------------------------------------------------------
  // Prometheus Node Exporter
  // --------------------------------------------------------------------------

  async savePrometheusNodeExporter(
    original: PrometheusNodeExporter | null | undefined,
    data: PrometheusNodeExporter
  ): Promise<VyOSResponse> {
    const ops = this._exporterBaseOps("node_exporter", original, data);

    if (data.textfile_collector !== (original?.textfile_collector ?? false)) {
      if (data.textfile_collector) ops.push({ op: "set_prometheus_node_exporter_textfile_collector" });
      else ops.push({ op: "delete_prometheus_node_exporter_textfile_collector" });
    }

    return this.batch(ops);
  }

  async deletePrometheusNodeExporter(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_node_exporter" }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus FRR Exporter
  // --------------------------------------------------------------------------

  async savePrometheusFrrExporter(
    original: PrometheusFrrExporter | null | undefined,
    data: PrometheusFrrExporter
  ): Promise<VyOSResponse> {
    const ops = this._exporterBaseOps("frr_exporter", original, data);

    const origCollectors = original?.collectors ?? [];
    for (const c of origCollectors) {
      if (!data.collectors.includes(c)) ops.push({ op: "delete_prometheus_frr_exporter_collector", value: c });
    }
    for (const c of data.collectors) {
      if (!origCollectors.includes(c)) ops.push({ op: "set_prometheus_frr_exporter_collector", value: c });
    }

    const origOptions = original?.bgp_options ?? [];
    for (const o of origOptions) {
      if (!data.bgp_options.includes(o)) ops.push({ op: "delete_prometheus_frr_exporter_bgp_option", value: o });
    }
    for (const o of data.bgp_options) {
      if (!origOptions.includes(o)) ops.push({ op: "set_prometheus_frr_exporter_bgp_option", value: o });
    }

    const peerDescription = data.bgp_peer_description ?? null;
    if (peerDescription !== (original?.bgp_peer_description ?? null)) {
      if (peerDescription) ops.push({ op: "set_prometheus_frr_exporter_bgp_peer_description", value: peerDescription });
      else ops.push({ op: "delete_prometheus_frr_exporter_bgp_peer_description" });
    }

    const origInstances = original?.ospf_instances ?? [];
    const removedInstances = origInstances.filter((i) => !data.ospf_instances.includes(i));
    if (removedInstances.length > 0 && data.ospf_instances.length === 0) {
      ops.push({ op: "delete_prometheus_frr_exporter_all_ospf_instances" });
    } else {
      for (const i of removedInstances) ops.push({ op: "delete_prometheus_frr_exporter_ospf_instance", value: i });
    }
    for (const i of data.ospf_instances) {
      if (!origInstances.includes(i)) ops.push({ op: "set_prometheus_frr_exporter_ospf_instance", value: i });
    }

    return this.batch(ops);
  }

  /** `telegraf frr-metrics` needs frr-exporter, so it goes in the same batch first. */
  async deletePrometheusFrrExporter(telegrafFrrMetrics = false): Promise<VyOSResponse> {
    return this.batch([
      ...(telegrafFrrMetrics ? [{ op: "delete_telegraf_frr_metrics" }] : []),
      { op: "delete_prometheus_frr_exporter" },
    ]);
  }

  // --------------------------------------------------------------------------
  // Prometheus Blackbox Exporter
  // --------------------------------------------------------------------------

  async savePrometheusBlackboxExporter(
    original: PrometheusBlackboxExporter | null | undefined,
    data: PrometheusBlackboxExporter
  ): Promise<VyOSResponse> {
    const ops = this._exporterBaseOps("blackbox_exporter", original, data);
    return this.batch(ops);
  }

  async deletePrometheusBlackboxExporter(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_blackbox_exporter" }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus Blackbox ICMP Module
  // --------------------------------------------------------------------------

  async saveBlackboxICMPModule(
    original: PrometheusBlackboxICMPModule | null | undefined,
    data: PrometheusBlackboxICMPModule
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;
    const name = data.name;

    // Every leaf is optional, so a create with none set still writes the module.
    if (!orig) ops.push({ op: "set_prometheus_blackbox_icmp_module", value: name });
    if (data.preferred_ip_protocol !== (orig?.preferred_ip_protocol ?? null)) {
      if (data.preferred_ip_protocol) ops.push({ op: "set_prometheus_blackbox_icmp_preferred_ip_protocol", value: `${name},${data.preferred_ip_protocol}` });
      else if (orig?.preferred_ip_protocol) ops.push({ op: "delete_prometheus_blackbox_icmp_preferred_ip_protocol", value: name });
    }
    if (data.ip_protocol_fallback !== (orig?.ip_protocol_fallback ?? false)) {
      if (data.ip_protocol_fallback) ops.push({ op: "set_prometheus_blackbox_icmp_ip_protocol_fallback", value: name });
      else ops.push({ op: "delete_prometheus_blackbox_icmp_ip_protocol_fallback", value: name });
    }
    if (data.timeout !== (orig?.timeout ?? null)) {
      if (data.timeout) ops.push({ op: "set_prometheus_blackbox_icmp_timeout", value: `${name},${data.timeout}` });
      else if (orig?.timeout) ops.push({ op: "delete_prometheus_blackbox_icmp_timeout", value: name });
    }

    return this.batch(ops);
  }

  async deleteBlackboxICMPModule(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_blackbox_icmp_module", value: name }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus Blackbox DNS Module
  // --------------------------------------------------------------------------

  async saveBlackboxDNSModule(
    original: PrometheusBlackboxDNSModule | null | undefined,
    data: PrometheusBlackboxDNSModule
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;
    const name = data.name;

    if (data.preferred_ip_protocol !== (orig?.preferred_ip_protocol ?? null)) {
      if (data.preferred_ip_protocol) ops.push({ op: "set_prometheus_blackbox_dns_preferred_ip_protocol", value: `${name},${data.preferred_ip_protocol}` });
      else if (orig?.preferred_ip_protocol) ops.push({ op: "delete_prometheus_blackbox_dns_preferred_ip_protocol", value: name });
    }
    if (data.ip_protocol_fallback !== (orig?.ip_protocol_fallback ?? false)) {
      if (data.ip_protocol_fallback) ops.push({ op: "set_prometheus_blackbox_dns_ip_protocol_fallback", value: name });
      else ops.push({ op: "delete_prometheus_blackbox_dns_ip_protocol_fallback", value: name });
    }
    if (data.timeout !== (orig?.timeout ?? null)) {
      if (data.timeout) ops.push({ op: "set_prometheus_blackbox_dns_timeout", value: `${name},${data.timeout}` });
      else if (orig?.timeout) ops.push({ op: "delete_prometheus_blackbox_dns_timeout", value: name });
    }
    // query-name is required by the lab's verify: the modal requires it, its set
    // creates the module, and the module delete clears it.
    if (data.query_name && data.query_name !== (orig?.query_name ?? null)) {
      ops.push({ op: "set_prometheus_blackbox_dns_query_name", value: `${name},${data.query_name}` });
    }
    if (data.query_type !== (orig?.query_type ?? null)) {
      if (data.query_type) ops.push({ op: "set_prometheus_blackbox_dns_query_type", value: `${name},${data.query_type}` });
      else if (orig?.query_type) ops.push({ op: "delete_prometheus_blackbox_dns_query_type", value: name });
    }

    return this.batch(ops);
  }

  async deleteBlackboxDNSModule(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_blackbox_dns_module", value: name }]);
  }

  // --------------------------------------------------------------------------
  // Network Event
  // --------------------------------------------------------------------------

  async saveNetworkEvent(
    original: NetworkEventConfig | null | undefined,
    data: NetworkEventConfig
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original;

    // Every leaf is optional, so a create with none set still writes the node.
    if (!orig) ops.push({ op: "set_network_event" });
    if (data.log_level !== (orig?.log_level ?? null)) {
      if (data.log_level) ops.push({ op: "set_network_event_log_level", value: data.log_level });
      else if (orig?.log_level) ops.push({ op: "delete_network_event_log_level" });
    }
    if (data.queue_size !== (orig?.queue_size ?? null)) {
      if (data.queue_size) ops.push({ op: "set_network_event_queue_size", value: String(data.queue_size) });
      else if (orig?.queue_size) ops.push({ op: "delete_network_event_queue_size" });
    }

    const origEvents = orig?.events ?? [];
    const removedEvents = origEvents.filter((e) => !data.events.includes(e));
    const addedEvents = data.events.filter((e) => !origEvents.includes(e));
    if (removedEvents.length > 0 && data.events.length === 0) {
      ops.push({ op: "delete_network_event_all_events" });
    } else {
      for (const e of removedEvents) ops.push({ op: "delete_network_event_event", value: e });
    }
    for (const e of addedEvents) ops.push({ op: "set_network_event_event", value: e });

    return this.batch(ops);
  }

  async deleteNetworkEvent(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_network_event" }]);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _exporterBaseOps(
    prefix: "node_exporter" | "frr_exporter" | "blackbox_exporter",
    original: PrometheusExporterBase | null | undefined,
    data: PrometheusExporterBase
  ): BatchOperation[] {
    const ops: BatchOperation[] = [];
    const orig = original;
    const setNode = `set_prometheus_${prefix}`;
    const setPort = `set_prometheus_${prefix}_port`;
    const delPort = `delete_prometheus_${prefix}_port`;
    const setAddr = `set_prometheus_${prefix}_listen_address`;
    const delAddr = `delete_prometheus_${prefix}_listen_address`;
    const delAllAddr = `delete_prometheus_${prefix}_all_listen_addresses`;
    const setVrf = `set_prometheus_${prefix}_vrf`;
    const delVrf = `delete_prometheus_${prefix}_vrf`;

    // Every leaf is optional, so a create with none set still writes the exporter.
    if (!orig) ops.push({ op: setNode });
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: setPort, value: String(data.port) });
      else if (orig?.port) ops.push({ op: delPort });
    }
    if (data.vrf !== (orig?.vrf ?? null)) {
      if (data.vrf) ops.push({ op: setVrf, value: data.vrf });
      else if (orig?.vrf) ops.push({ op: delVrf });
    }

    const origAddrs = orig?.listen_addresses ?? [];
    const removedAddrs = origAddrs.filter((a) => !data.listen_addresses.includes(a));
    const addedAddrs = data.listen_addresses.filter((a) => !origAddrs.includes(a));
    if (removedAddrs.length > 0 && data.listen_addresses.length === 0) {
      ops.push({ op: delAllAddr });
    } else {
      for (const a of removedAddrs) ops.push({ op: delAddr, value: a });
      for (const a of addedAddrs) ops.push({ op: setAddr, value: a });
    }

    return ops;
  }
}

export const serviceMonitoringService = new ServiceMonitoringService();
