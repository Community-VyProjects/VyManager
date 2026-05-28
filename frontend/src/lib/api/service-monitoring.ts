import { apiClient } from "./client";

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

export interface TelegrafConfig {
  sources: string[];
  vrf?: string | null;
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
  frr_exporter?: PrometheusExporterBase | null;
  blackbox_exporter?: PrometheusBlackboxExporter | null;
}

export interface NetworkEventConfig {
  log_level?: string | null;
  queue_size?: number | null;
  events: string[];
}

export interface ServiceMonitoringConfig {
  telegraf?: TelegrafConfig | null;
  zabbix_agent?: ZabbixConfig | null;
  prometheus?: PrometheusConfig | null;
  network_event?: NetworkEventConfig | null;
}

export interface ServiceMonitoringCapabilities {
  version: string;
  features: {
    telegraf: {
      supported: boolean;
      description: string;
      outputs: {
        influxdb: { supported: boolean; description: string; default_port: number };
        loki: { supported: boolean; description: string; default_port: number };
        splunk: { supported: boolean; description: string };
        azure_data_explorer: { supported: boolean; description: string; group_metrics_values: string[] };
        prometheus_client: { supported: boolean; description: string; default_port: number; metric_version_values: number[] };
      };
      source_values: string[];
      vrf: { supported: boolean };
    };
    zabbix_agent: {
      supported: boolean;
      description: string;
      default_port: number;
      auth_modes: string[];
      log_debug_levels: string[];
      limits: {
        buffer_flush_interval: { min: number; max: number; default: number };
        buffer_size: { min: number; max: number; default: number };
      };
      timeout: { min: number; max: number; default: number };
    };
    prometheus: {
      supported: boolean;
      description: string;
      exporters: {
        node_exporter: { description: string; default_port: number };
        frr_exporter: { description: string; default_port: number };
        blackbox_exporter: {
          description: string;
          default_port: number;
          module_types: string[];
          preferred_ip_protocol_values: string[];
          dns_query_types: string[];
        };
      };
    };
    network_event: {
      supported: boolean;
      description: string;
      log_level_values: string[];
      event_types: string[];
      queue_size: { min: number; max: number };
    };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

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

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/service-monitoring/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  // --------------------------------------------------------------------------
  // Telegraf general
  // --------------------------------------------------------------------------

  async saveTelegrafSources(
    original: TelegrafConfig | null | undefined,
    sources: string[],
    vrf: string
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const origSources = original?.sources ?? [];
    const removed = origSources.filter((s) => !sources.includes(s));
    const added = sources.filter((s) => !origSources.includes(s));

    if (removed.length > 0 && added.length === 0 && sources.length === 0) {
      ops.push({ op: "delete_telegraf_all_sources" });
    } else {
      for (const s of removed) ops.push({ op: "delete_telegraf_source", value: s });
      for (const s of added) ops.push({ op: "set_telegraf_source", value: s });
    }

    const origVrf = original?.vrf ?? "";
    if (vrf !== origVrf) {
      if (vrf) {
        ops.push({ op: "set_telegraf_vrf", value: vrf });
      } else if (origVrf) {
        ops.push({ op: "delete_telegraf_vrf" });
      }
    }

    if (ops.length === 0) return { success: true };
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

    if (data.url !== (orig?.url ?? null)) {
      if (data.url) ops.push({ op: "set_telegraf_influxdb_url", value: data.url });
      else if (orig?.url) ops.push({ op: "delete_telegraf_influxdb_url" });
    }
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_influxdb_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_influxdb_port" });
    }
    if (data.bucket !== (orig?.bucket ?? null)) {
      if (data.bucket) ops.push({ op: "set_telegraf_influxdb_bucket", value: data.bucket });
      else if (orig?.bucket) ops.push({ op: "delete_telegraf_influxdb_bucket" });
    }
    if (data.authentication.token !== (orig?.authentication?.token ?? null)) {
      if (data.authentication.token) ops.push({ op: "set_telegraf_influxdb_auth_token", value: data.authentication.token });
      else if (orig?.authentication?.token) ops.push({ op: "delete_telegraf_influxdb_auth_token" });
    }
    if (data.authentication.organization !== (orig?.authentication?.organization ?? null)) {
      if (data.authentication.organization) ops.push({ op: "set_telegraf_influxdb_auth_organization", value: data.authentication.organization });
      else if (orig?.authentication?.organization) ops.push({ op: "delete_telegraf_influxdb_auth_organization" });
    }

    if (ops.length === 0) return { success: true };
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

    if (data.url !== (orig?.url ?? null)) {
      if (data.url) ops.push({ op: "set_telegraf_loki_url", value: data.url });
      else if (orig?.url) ops.push({ op: "delete_telegraf_loki_url" });
    }
    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_loki_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_loki_port" });
    }
    if (data.metric_name_label !== (orig?.metric_name_label ?? null)) {
      if (data.metric_name_label) ops.push({ op: "set_telegraf_loki_metric_name_label", value: data.metric_name_label });
      else if (orig?.metric_name_label) ops.push({ op: "delete_telegraf_loki_metric_name_label" });
    }
    if (data.authentication.username !== (orig?.authentication?.username ?? null)) {
      if (data.authentication.username) ops.push({ op: "set_telegraf_loki_auth_username", value: data.authentication.username });
      else if (orig?.authentication?.username) ops.push({ op: "delete_telegraf_loki_auth_username" });
    }
    if (data.authentication.password !== (orig?.authentication?.password ?? null)) {
      if (data.authentication.password) ops.push({ op: "set_telegraf_loki_auth_password", value: data.authentication.password });
      else if (orig?.authentication?.password) ops.push({ op: "delete_telegraf_loki_auth_password" });
    }

    if (ops.length === 0) return { success: true };
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

    if (data.url !== (orig?.url ?? null)) {
      if (data.url) ops.push({ op: "set_telegraf_splunk_url", value: data.url });
      else if (orig?.url) ops.push({ op: "delete_telegraf_splunk_url" });
    }
    if (data.authentication.token !== (orig?.authentication?.token ?? null)) {
      if (data.authentication.token) ops.push({ op: "set_telegraf_splunk_auth_token", value: data.authentication.token });
      else if (orig?.authentication?.token) ops.push({ op: "delete_telegraf_splunk_auth_token" });
    }
    if (data.authentication.insecure !== (orig?.authentication?.insecure ?? false)) {
      if (data.authentication.insecure) ops.push({ op: "set_telegraf_splunk_auth_insecure" });
      else ops.push({ op: "delete_telegraf_splunk_auth_insecure" });
    }

    if (ops.length === 0) return { success: true };
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

    if (data.url !== (orig?.url ?? null)) {
      if (data.url) ops.push({ op: "set_telegraf_azure_url", value: data.url });
      else if (orig?.url) ops.push({ op: "delete_telegraf_azure_url" });
    }
    if (data.database !== (orig?.database ?? null)) {
      if (data.database) ops.push({ op: "set_telegraf_azure_database", value: data.database });
      else if (orig?.database) ops.push({ op: "delete_telegraf_azure_database" });
    }
    if (data.table !== (orig?.table ?? null)) {
      if (data.table) ops.push({ op: "set_telegraf_azure_table", value: data.table });
      else if (orig?.table) ops.push({ op: "delete_telegraf_azure_table" });
    }
    if (data.group_metrics !== (orig?.group_metrics ?? null)) {
      if (data.group_metrics) ops.push({ op: "set_telegraf_azure_group_metrics", value: data.group_metrics });
      else if (orig?.group_metrics) ops.push({ op: "delete_telegraf_azure_group_metrics" });
    }
    if (data.authentication.client_id !== (orig?.authentication?.client_id ?? null)) {
      if (data.authentication.client_id) ops.push({ op: "set_telegraf_azure_auth_client_id", value: data.authentication.client_id });
      else if (orig?.authentication?.client_id) ops.push({ op: "delete_telegraf_azure_auth_client_id" });
    }
    if (data.authentication.client_secret !== (orig?.authentication?.client_secret ?? null)) {
      if (data.authentication.client_secret) ops.push({ op: "set_telegraf_azure_auth_client_secret", value: data.authentication.client_secret });
      else if (orig?.authentication?.client_secret) ops.push({ op: "delete_telegraf_azure_auth_client_secret" });
    }
    if (data.authentication.tenant_id !== (orig?.authentication?.tenant_id ?? null)) {
      if (data.authentication.tenant_id) ops.push({ op: "set_telegraf_azure_auth_tenant_id", value: data.authentication.tenant_id });
      else if (orig?.authentication?.tenant_id) ops.push({ op: "delete_telegraf_azure_auth_tenant_id" });
    }

    if (ops.length === 0) return { success: true };
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

    if (data.port !== (orig?.port ?? null)) {
      if (data.port) ops.push({ op: "set_telegraf_prometheus_client_port", value: String(data.port) });
      else if (orig?.port) ops.push({ op: "delete_telegraf_prometheus_client_port" });
    }
    if (data.metric_version !== (orig?.metric_version ?? null)) {
      if (data.metric_version) ops.push({ op: "set_telegraf_prometheus_client_metric_version", value: String(data.metric_version) });
      else if (orig?.metric_version) ops.push({ op: "delete_telegraf_prometheus_client_metric_version" });
    }
    if (data.authentication.username !== (orig?.authentication?.username ?? null)) {
      if (data.authentication.username) ops.push({ op: "set_telegraf_prometheus_client_auth_username", value: data.authentication.username });
      else if (orig?.authentication?.username) ops.push({ op: "delete_telegraf_prometheus_client_auth_username" });
    }
    if (data.authentication.password !== (orig?.authentication?.password ?? null)) {
      if (data.authentication.password) ops.push({ op: "set_telegraf_prometheus_client_auth_password", value: data.authentication.password });
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

    if (ops.length === 0) return { success: true };
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

    const origServers = orig?.servers ?? [];
    const removedServers = origServers.filter((s) => !data.servers.includes(s));
    const addedServers = data.servers.filter((s) => !origServers.includes(s));
    if (removedServers.length > 0 && data.servers.length === 0) {
      ops.push({ op: "delete_zabbix_all_servers" });
    } else {
      for (const s of removedServers) ops.push({ op: "delete_zabbix_server", value: s });
      for (const s of addedServers) ops.push({ op: "set_zabbix_server", value: s });
    }

    const origActiveMap = new Map((orig?.servers_active ?? []).map((s) => [s.address, s]));
    const newActiveMap = new Map(data.servers_active.map((s) => [s.address, s]));
    for (const addr of origActiveMap.keys()) {
      if (!newActiveMap.has(addr)) {
        ops.push({ op: "delete_zabbix_server_active", value: addr });
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

    if (data.authentication.mode !== (orig?.authentication?.mode ?? null)) {
      if (data.authentication.mode) ops.push({ op: "set_zabbix_auth_mode", value: data.authentication.mode });
      else if (orig?.authentication?.mode) ops.push({ op: "delete_zabbix_auth_mode" });
    }
    if (data.authentication.psk_id !== (orig?.authentication?.psk_id ?? null)) {
      if (data.authentication.psk_id) ops.push({ op: "set_zabbix_auth_psk_id", value: data.authentication.psk_id });
      else if (orig?.authentication?.psk_id) ops.push({ op: "delete_zabbix_auth_psk_id" });
    }
    if (data.authentication.psk_secret !== (orig?.authentication?.psk_secret ?? null)) {
      if (data.authentication.psk_secret) ops.push({ op: "set_zabbix_auth_psk_secret", value: data.authentication.psk_secret });
      else if (orig?.authentication?.psk_secret) ops.push({ op: "delete_zabbix_auth_psk_secret" });
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
    if (data.log.size !== (orig?.log?.size ?? null)) {
      if (data.log.size) ops.push({ op: "set_zabbix_log_size", value: String(data.log.size) });
      else if (orig?.log?.size) ops.push({ op: "delete_zabbix_log_size" });
    }
    if (data.log.remote_commands !== (orig?.log?.remote_commands ?? false)) {
      if (data.log.remote_commands) ops.push({ op: "set_zabbix_log_remote_commands" });
      else ops.push({ op: "delete_zabbix_log_remote_commands" });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteZabbix(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_zabbix" }]);
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

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deletePrometheusNodeExporter(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_node_exporter" }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus FRR Exporter
  // --------------------------------------------------------------------------

  async savePrometheusFrrExporter(
    original: PrometheusExporterBase | null | undefined,
    data: PrometheusExporterBase
  ): Promise<VyOSResponse> {
    const ops = this._exporterBaseOps("frr_exporter", original, data);
    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deletePrometheusFrrExporter(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_prometheus_frr_exporter" }]);
  }

  // --------------------------------------------------------------------------
  // Prometheus Blackbox Exporter
  // --------------------------------------------------------------------------

  async savePrometheusBlackboxExporter(
    original: PrometheusBlackboxExporter | null | undefined,
    data: PrometheusBlackboxExporter
  ): Promise<VyOSResponse> {
    const ops = this._exporterBaseOps("blackbox_exporter", original, data);
    if (ops.length === 0) return { success: true };
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

    if (ops.length === 0) return { success: true };
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
    if (data.query_name !== (orig?.query_name ?? null)) {
      if (data.query_name) ops.push({ op: "set_prometheus_blackbox_dns_query_name", value: `${name},${data.query_name}` });
      else if (orig?.query_name) ops.push({ op: "delete_prometheus_blackbox_dns_query_name", value: name });
    }
    if (data.query_type !== (orig?.query_type ?? null)) {
      if (data.query_type) ops.push({ op: "set_prometheus_blackbox_dns_query_type", value: `${name},${data.query_type}` });
      else if (orig?.query_type) ops.push({ op: "delete_prometheus_blackbox_dns_query_type", value: name });
    }

    if (ops.length === 0) return { success: true };
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
    for (const e of removedEvents) ops.push({ op: "delete_network_event_event", value: e });
    for (const e of addedEvents) ops.push({ op: "set_network_event_event", value: e });

    if (ops.length === 0) return { success: true };
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
    const setPort = `set_prometheus_${prefix}_port`;
    const delPort = `delete_prometheus_${prefix}_port`;
    const setAddr = `set_prometheus_${prefix}_listen_address`;
    const delAddr = `delete_prometheus_${prefix}_listen_address`;
    const delAllAddr = `delete_prometheus_${prefix}_all_listen_addresses`;
    const setVrf = `set_prometheus_${prefix}_vrf`;
    const delVrf = `delete_prometheus_${prefix}_vrf`;

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
