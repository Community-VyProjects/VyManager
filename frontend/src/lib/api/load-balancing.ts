/**
 * Load Balancing API Service
 * Covers HAProxy (reverse proxy) and WAN load balancing for VyOS
 */

import { apiClient } from "./client";

// ============================================================================
// Shared
// ============================================================================

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
  /** Per-operation entity name override — takes precedence over the request-level item_name */
  item_name?: string | null;
}

// ============================================================================
// Capabilities
// ============================================================================

export interface LBCapabilities {
  version: string;
  rp_key: string;
  features: {
    reverse_proxy: { supported: boolean; description: string };
    wan: { supported: boolean; description: string };
    http_compression: { supported: boolean; description: string };
    server_check_port: { supported: boolean; description: string };
    listen_address_accept_proxy: { supported: boolean; description: string };
    backend_rule_wildcard_domain: { supported: boolean; description: string };
    wan_rule_groups: { supported: boolean; description: string };
  };
}

// ============================================================================
// HAProxy — Backend types
// ============================================================================

export interface LBServer {
  name: string;
  address: string | null;
  port: string | null;
  backup: boolean;
  check: boolean;
  check_port: string | null;
  send_proxy: boolean;
  send_proxy_v2: boolean;
}

export interface LBBackendRule {
  rule_id: string;
  domain_name: string[];
  wildcard_domain: string[];
  ssl: string | null;
  url_path: { begin: string[]; end: string[]; exact: string[] };
  set: { redirect_location: string | null; server: string | null };
}

export interface LBBackend {
  name: string;
  description: string | null;
  balance: string | null;
  mode: string | null;
  health_check: string | null;
  http_check: {
    method: string | null;
    uri: string | null;
    expect: { status: string | null; string: string | null };
  } | null;
  ssl: { ca_certificate: string | null; no_verify: boolean } | null;
  timeout: { check: string | null; connect: string | null; server: string | null };
  servers: LBServer[];
  rules: LBBackendRule[];
}

// ============================================================================
// HAProxy — Service types
// ============================================================================

export interface LBListenAddress {
  address: string;
  accept_proxy: boolean;
}

export interface LBServiceRule {
  rule_id: string;
  domain_name: string[];
  wildcard_domain: string[];
  ssl: string | null;
  url_path: { begin: string[]; end: string[]; exact: string[] };
  set: { redirect_location: string | null; backend: string | null };
}

export interface LBService {
  name: string;
  description: string | null;
  mode: string | null;
  port: string | null;
  listen_addresses: LBListenAddress[];
  backends: string[];
  redirect_http_to_https: boolean;
  ssl: { certificates: string[] } | null;
  http_compression: { algorithm: string | null; mime_types: string[] } | null;
  http_response_headers: Record<string, string | null>;
  logging: Record<string, { level: string | null }>;
  tcp_request: { inspect_delay: string | null } | null;
  timeout: { client: string | null };
  rules: LBServiceRule[];
}

// ============================================================================
// HAProxy — Reverse Proxy config
// ============================================================================

export interface LBReverseProxy {
  global_parameters: {
    max_connections: string | null;
    ssl_bind_ciphers: string[];
    tls_version_min: string | null;
    logging: Record<string, { level: string | null }>;
  };
  timeout: {
    check: string | null;
    client: string | null;
    connect: string | null;
    server: string | null;
  };
  vrf: string | null;
  backends: LBBackend[];
  services: LBService[];
}

// ============================================================================
// WAN types
// ============================================================================

export interface WANHealthTest {
  test_id: string;
  type: string | null;
  target: string | null;
  resp_time: string | null;
  ttl_limit: string | null;
  test_script: string | null;
}

export interface WANInterfaceHealth {
  interface: string;
  nexthop: string | null;
  failure_count: string | null;
  success_count: string | null;
  tests: WANHealthTest[];
}

export interface WANRuleInterface {
  interface: string;
  weight: string | null;
}

export interface WANRule {
  rule_id: string;
  description: string | null;
  inbound_interface: string | null;
  exclude: boolean;
  failover: boolean;
  per_packet_balancing: boolean;
  protocol: string | null;
  interfaces: WANRuleInterface[];
  limit: {
    burst: string | null;
    period: string | null;
    rate: string | null;
    threshold: string | null;
  } | null;
  source: {
    address: string | null;
    port: string | null;
    group: {
      address_group: string | null;
      network_group: string | null;
      domain_group: string | null;
      port_group: string | null;
    } | null;
  } | null;
  destination: {
    address: string | null;
    port: string | null;
    group: {
      address_group: string | null;
      network_group: string | null;
      domain_group: string | null;
      port_group: string | null;
    } | null;
  } | null;
}

export interface WANConfig {
  disable_source_nat: boolean;
  enable_local_traffic: boolean;
  flush_connections: boolean;
  hook: string | null;
  sticky_connections: { inbound: boolean };
  interface_health: WANInterfaceHealth[];
  rules: WANRule[];
}

// ============================================================================
// Root config
// ============================================================================

export interface LBConfig {
  reverse_proxy: LBReverseProxy;
  wan: WANConfig;
}

// ============================================================================
// Service
// ============================================================================

class LoadBalancingService {
  private buildServiceRuleOps(rule: LBServiceRule): BatchOperation[] {
    const id = rule.rule_id;
    const ops: BatchOperation[] = [{ op: "create_rp_service_rule", value: id }];
    for (const d of rule.domain_name)
      ops.push({ op: "set_rp_service_rule_domain_name", value: `${id}|${d}` });
    for (const d of rule.wildcard_domain)
      ops.push({ op: "set_rp_service_rule_wildcard_domain", value: `${id}|${d}` });
    if (rule.ssl)
      ops.push({ op: "set_rp_service_rule_ssl", value: `${id}|${rule.ssl}` });
    for (const p of rule.url_path.begin)
      ops.push({ op: "set_rp_service_rule_url_path_begin", value: `${id}|${p}` });
    for (const p of rule.url_path.end)
      ops.push({ op: "set_rp_service_rule_url_path_end", value: `${id}|${p}` });
    for (const p of rule.url_path.exact)
      ops.push({ op: "set_rp_service_rule_url_path_exact", value: `${id}|${p}` });
    if (rule.set.backend)
      ops.push({ op: "set_rp_service_rule_set_backend", value: `${id}|${rule.set.backend}` });
    if (rule.set.redirect_location)
      ops.push({ op: "set_rp_service_rule_set_redirect_location", value: `${id}|${rule.set.redirect_location}` });
    return ops;
  }

  private buildBackendRuleOps(rule: LBBackendRule): BatchOperation[] {
    const id = rule.rule_id;
    const ops: BatchOperation[] = [{ op: "create_rp_backend_rule", value: id }];
    for (const d of rule.domain_name)
      ops.push({ op: "set_rp_backend_rule_domain_name", value: `${id}|${d}` });
    for (const d of rule.wildcard_domain)
      ops.push({ op: "set_rp_backend_rule_wildcard_domain", value: `${id}|${d}` });
    if (rule.ssl)
      ops.push({ op: "set_rp_backend_rule_ssl", value: `${id}|${rule.ssl}` });
    for (const p of rule.url_path.begin)
      ops.push({ op: "set_rp_backend_rule_url_path_begin", value: `${id}|${p}` });
    for (const p of rule.url_path.end)
      ops.push({ op: "set_rp_backend_rule_url_path_end", value: `${id}|${p}` });
    for (const p of rule.url_path.exact)
      ops.push({ op: "set_rp_backend_rule_url_path_exact", value: `${id}|${p}` });
    if (rule.set.server)
      ops.push({ op: "set_rp_backend_rule_set_server", value: `${id}|${rule.set.server}` });
    if (rule.set.redirect_location)
      ops.push({ op: "set_rp_backend_rule_set_redirect_location", value: `${id}|${rule.set.redirect_location}` });
    return ops;
  }

  private async batchConfigure(
    itemName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>(
      "/vyos/load-balancing/batch",
      { item_name: itemName, operations }
    );
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async getCapabilities(): Promise<LBCapabilities> {
    return apiClient.get<LBCapabilities>("/vyos/load-balancing/capabilities");
  }

  async getConfig(refresh = false): Promise<LBConfig> {
    return apiClient.get<LBConfig>("/vyos/load-balancing/config", {
      refresh: String(refresh),
    });
  }

  // -------------------------------------------------------------------------
  // HAProxy Backend
  // -------------------------------------------------------------------------

  async createBackend(backend: LBBackend): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_rp_backend" }];

    if (backend.description)
      ops.push({ op: "set_rp_backend_description", value: backend.description });
    if (backend.balance)
      ops.push({ op: "set_rp_backend_balance", value: backend.balance });
    if (backend.mode)
      ops.push({ op: "set_rp_backend_mode", value: backend.mode });
    if (backend.health_check)
      ops.push({ op: "set_rp_backend_health_check", value: backend.health_check });

    if (backend.http_check) {
      if (backend.http_check.method)
        ops.push({ op: "set_rp_backend_http_check_method", value: backend.http_check.method });
      if (backend.http_check.uri)
        ops.push({ op: "set_rp_backend_http_check_uri", value: backend.http_check.uri });
      if (backend.http_check.expect?.status)
        ops.push({ op: "set_rp_backend_http_check_expect_status", value: backend.http_check.expect.status });
      if (backend.http_check.expect?.string)
        ops.push({ op: "set_rp_backend_http_check_expect_string", value: backend.http_check.expect.string });
    }

    if (backend.ssl?.ca_certificate)
      ops.push({ op: "set_rp_backend_ssl_ca_certificate", value: backend.ssl.ca_certificate });
    if (backend.ssl?.no_verify)
      ops.push({ op: "set_rp_backend_ssl_no_verify" });

    for (const srv of backend.servers) {
      ops.push({ op: "create_rp_backend_server", value: srv.name });
      if (srv.address)
        ops.push({ op: "set_rp_backend_server_address", value: `${srv.name}|${srv.address}` });
      if (srv.port)
        ops.push({ op: "set_rp_backend_server_port", value: `${srv.name}|${srv.port}` });
      if (srv.backup)
        ops.push({ op: "set_rp_backend_server_backup", value: srv.name });
      if (srv.check)
        ops.push({ op: "set_rp_backend_server_check", value: srv.name });
      if (srv.check_port)
        ops.push({ op: "set_rp_backend_server_check_port", value: `${srv.name}|${srv.check_port}` });
      if (srv.send_proxy)
        ops.push({ op: "set_rp_backend_server_send_proxy", value: srv.name });
    }

    for (const rule of backend.rules)
      ops.push(...this.buildBackendRuleOps(rule));

    return this.batchConfigure(backend.name, ops);
  }

  async updateBackend(original: LBBackend, updated: LBBackend): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // Description
    if (updated.description !== original.description) {
      if (updated.description)
        ops.push({ op: "set_rp_backend_description", value: updated.description });
      else
        ops.push({ op: "delete_rp_backend_description" });
    }

    // Balance
    if (updated.balance !== original.balance) {
      if (updated.balance)
        ops.push({ op: "set_rp_backend_balance", value: updated.balance });
      else
        ops.push({ op: "delete_rp_backend_balance" });
    }

    // Mode
    if (updated.mode !== original.mode) {
      if (updated.mode)
        ops.push({ op: "set_rp_backend_mode", value: updated.mode });
      else
        ops.push({ op: "delete_rp_backend_mode" });
    }

    // Health check
    if (updated.health_check !== original.health_check) {
      if (updated.health_check)
        ops.push({ op: "set_rp_backend_health_check", value: updated.health_check });
      else
        ops.push({ op: "delete_rp_backend_health_check" });
    }

    // HTTP check
    if (JSON.stringify(updated.http_check) !== JSON.stringify(original.http_check)) {
      ops.push({ op: "delete_rp_backend_http_check" });
      if (updated.http_check) {
        if (updated.http_check.method)
          ops.push({ op: "set_rp_backend_http_check_method", value: updated.http_check.method });
        if (updated.http_check.uri)
          ops.push({ op: "set_rp_backend_http_check_uri", value: updated.http_check.uri });
        if (updated.http_check.expect?.status)
          ops.push({ op: "set_rp_backend_http_check_expect_status", value: updated.http_check.expect.status });
        if (updated.http_check.expect?.string)
          ops.push({ op: "set_rp_backend_http_check_expect_string", value: updated.http_check.expect.string });
      }
    }

    // SSL
    if (JSON.stringify(updated.ssl) !== JSON.stringify(original.ssl)) {
      ops.push({ op: "delete_rp_backend_ssl" });
      if (updated.ssl?.ca_certificate)
        ops.push({ op: "set_rp_backend_ssl_ca_certificate", value: updated.ssl.ca_certificate });
      if (updated.ssl?.no_verify)
        ops.push({ op: "set_rp_backend_ssl_no_verify" });
    }

    // Servers: remove old, add new
    for (const srv of original.servers)
      ops.push({ op: "delete_rp_backend_server", value: srv.name });

    for (const srv of updated.servers) {
      ops.push({ op: "create_rp_backend_server", value: srv.name });
      if (srv.address)
        ops.push({ op: "set_rp_backend_server_address", value: `${srv.name}|${srv.address}` });
      if (srv.port)
        ops.push({ op: "set_rp_backend_server_port", value: `${srv.name}|${srv.port}` });
      if (srv.backup)
        ops.push({ op: "set_rp_backend_server_backup", value: srv.name });
      if (srv.check)
        ops.push({ op: "set_rp_backend_server_check", value: srv.name });
      if (srv.check_port)
        ops.push({ op: "set_rp_backend_server_check_port", value: `${srv.name}|${srv.check_port}` });
      if (srv.send_proxy)
        ops.push({ op: "set_rp_backend_server_send_proxy", value: srv.name });
    }

    // Rules: delete all old, recreate new
    if (JSON.stringify(updated.rules) !== JSON.stringify(original.rules)) {
      for (const rule of original.rules)
        ops.push({ op: "delete_rp_backend_rule", value: rule.rule_id });
      for (const rule of updated.rules)
        ops.push(...this.buildBackendRuleOps(rule));
    }

    return this.batchConfigure(updated.name, ops);
  }

  async deleteBackend(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_rp_backend" }]);
  }

  async addBackendRule(backendName: string, rule: LBBackendRule): Promise<VyOSResponse> {
    return this.batchConfigure(backendName, this.buildBackendRuleOps(rule));
  }

  async updateBackendRule(backendName: string, oldRule: LBBackendRule, newRule: LBBackendRule): Promise<VyOSResponse> {
    const ops = [
      { op: "delete_rp_backend_rule", value: oldRule.rule_id },
      ...this.buildBackendRuleOps(newRule),
    ];
    return this.batchConfigure(backendName, ops);
  }

  async deleteBackendRule(backendName: string, ruleId: string, allRules: LBBackendRule[]): Promise<VyOSResponse> {
    const remaining = allRules
      .filter(r => r.rule_id !== ruleId)
      .sort((a, b) => Number(a.rule_id) - Number(b.rule_id));
    const ops: BatchOperation[] = [];
    for (const rule of allRules)
      ops.push({ op: "delete_rp_backend_rule", value: rule.rule_id });
    remaining.forEach((rule, idx) => {
      ops.push(...this.buildBackendRuleOps({ ...rule, rule_id: String(idx + 10) }));
    });
    return this.batchConfigure(backendName, ops);
  }

  // -------------------------------------------------------------------------
  // HAProxy Service
  // -------------------------------------------------------------------------

  async createService(service: LBService): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_rp_service" }];

    if (service.description)
      ops.push({ op: "set_rp_service_description", value: service.description });
    if (service.mode)
      ops.push({ op: "set_rp_service_mode", value: service.mode });
    if (service.port)
      ops.push({ op: "set_rp_service_port", value: service.port });

    for (const la of service.listen_addresses)
      ops.push({ op: "set_rp_service_listen_address", value: la.address });

    for (const be of service.backends)
      ops.push({ op: "set_rp_service_backend", value: be });

    if (service.redirect_http_to_https)
      ops.push({ op: "set_rp_service_redirect_http_to_https" });

    if (service.ssl) {
      for (const cert of service.ssl.certificates)
        ops.push({ op: "set_rp_service_ssl_certificate", value: cert });
    }

    if (service.http_compression) {
      if (service.http_compression.algorithm)
        ops.push({ op: "set_rp_service_http_compression_algorithm", value: service.http_compression.algorithm });
      for (const mt of service.http_compression.mime_types)
        ops.push({ op: "set_rp_service_http_compression_mime_type", value: mt });
    }

    for (const rule of service.rules)
      ops.push(...this.buildServiceRuleOps(rule));

    return this.batchConfigure(service.name, ops);
  }

  async updateService(original: LBService, updated: LBService): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (updated.description !== original.description) {
      if (updated.description)
        ops.push({ op: "set_rp_service_description", value: updated.description });
      else
        ops.push({ op: "delete_rp_service_description" });
    }

    if (updated.mode !== original.mode) {
      if (updated.mode)
        ops.push({ op: "set_rp_service_mode", value: updated.mode });
    }

    if (updated.port !== original.port) {
      if (updated.port)
        ops.push({ op: "set_rp_service_port", value: updated.port });
    }

    // Listen addresses: remove old, add new
    for (const la of original.listen_addresses)
      ops.push({ op: "delete_rp_service_listen_address", value: la.address });
    for (const la of updated.listen_addresses)
      ops.push({ op: "set_rp_service_listen_address", value: la.address });

    // Backends: remove old, add new
    for (const be of original.backends)
      ops.push({ op: "delete_rp_service_backend", value: be });
    for (const be of updated.backends)
      ops.push({ op: "set_rp_service_backend", value: be });

    if (updated.redirect_http_to_https !== original.redirect_http_to_https) {
      if (updated.redirect_http_to_https)
        ops.push({ op: "set_rp_service_redirect_http_to_https" });
      else
        ops.push({ op: "delete_rp_service_redirect_http_to_https" });
    }

    // SSL
    if (JSON.stringify(updated.ssl) !== JSON.stringify(original.ssl)) {
      ops.push({ op: "delete_rp_service_ssl" });
      if (updated.ssl) {
        for (const cert of updated.ssl.certificates)
          ops.push({ op: "set_rp_service_ssl_certificate", value: cert });
      }
    }

    // HTTP Compression
    if (JSON.stringify(updated.http_compression) !== JSON.stringify(original.http_compression)) {
      ops.push({ op: "delete_rp_service_http_compression" });
      if (updated.http_compression) {
        if (updated.http_compression.algorithm)
          ops.push({ op: "set_rp_service_http_compression_algorithm", value: updated.http_compression.algorithm });
        for (const mt of updated.http_compression.mime_types)
          ops.push({ op: "set_rp_service_http_compression_mime_type", value: mt });
      }
    }

    // Rules: delete all old, recreate new
    if (JSON.stringify(updated.rules) !== JSON.stringify(original.rules)) {
      for (const rule of original.rules)
        ops.push({ op: "delete_rp_service_rule", value: rule.rule_id });
      for (const rule of updated.rules)
        ops.push(...this.buildServiceRuleOps(rule));
    }

    return this.batchConfigure(updated.name, ops);
  }

  async deleteService(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_rp_service" }]);
  }

  async addServiceRule(serviceName: string, rule: LBServiceRule): Promise<VyOSResponse> {
    return this.batchConfigure(serviceName, this.buildServiceRuleOps(rule));
  }

  async updateServiceRule(serviceName: string, oldRule: LBServiceRule, newRule: LBServiceRule): Promise<VyOSResponse> {
    const ops = [
      { op: "delete_rp_service_rule", value: oldRule.rule_id },
      ...this.buildServiceRuleOps(newRule),
    ];
    return this.batchConfigure(serviceName, ops);
  }

  async deleteServiceRule(serviceName: string, ruleId: string, allRules: LBServiceRule[]): Promise<VyOSResponse> {
    const remaining = allRules
      .filter(r => r.rule_id !== ruleId)
      .sort((a, b) => Number(a.rule_id) - Number(b.rule_id));
    const ops: BatchOperation[] = [];
    for (const rule of allRules)
      ops.push({ op: "delete_rp_service_rule", value: rule.rule_id });
    remaining.forEach((rule, idx) => {
      ops.push(...this.buildServiceRuleOps({ ...rule, rule_id: String(idx + 10) }));
    });
    return this.batchConfigure(serviceName, ops);
  }

  // -------------------------------------------------------------------------
  // WAN Interface Health
  // -------------------------------------------------------------------------

  async createInterfaceHealth(iface: WANInterfaceHealth): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_wan_interface_health" }];

    if (iface.nexthop)
      ops.push({ op: "set_wan_interface_health_nexthop", value: iface.nexthop });
    if (iface.failure_count)
      ops.push({ op: "set_wan_interface_health_failure_count", value: iface.failure_count });
    if (iface.success_count)
      ops.push({ op: "set_wan_interface_health_success_count", value: iface.success_count });

    for (const test of iface.tests) {
      ops.push({ op: "create_wan_interface_health_test", value: test.test_id });
      if (test.type)
        ops.push({ op: "set_wan_interface_health_test_type", value: `${test.test_id}|${test.type}` });
      if (test.target)
        ops.push({ op: "set_wan_interface_health_test_target", value: `${test.test_id}|${test.target}` });
    }

    return this.batchConfigure(iface.interface, ops);
  }

  async updateInterfaceHealth(original: WANInterfaceHealth, updated: WANInterfaceHealth): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (updated.nexthop !== original.nexthop && updated.nexthop)
      ops.push({ op: "set_wan_interface_health_nexthop", value: updated.nexthop });
    if (updated.failure_count !== original.failure_count) {
      if (updated.failure_count)
        ops.push({ op: "set_wan_interface_health_failure_count", value: updated.failure_count });
      else
        ops.push({ op: "delete_wan_interface_health_failure_count" });
    }
    if (updated.success_count !== original.success_count) {
      if (updated.success_count)
        ops.push({ op: "set_wan_interface_health_success_count", value: updated.success_count });
      else
        ops.push({ op: "delete_wan_interface_health_success_count" });
    }

    // Tests: remove old, add new
    for (const t of original.tests)
      ops.push({ op: "delete_wan_interface_health_test", value: t.test_id });
    for (const t of updated.tests) {
      ops.push({ op: "create_wan_interface_health_test", value: t.test_id });
      if (t.type)
        ops.push({ op: "set_wan_interface_health_test_type", value: `${t.test_id}|${t.type}` });
      if (t.target)
        ops.push({ op: "set_wan_interface_health_test_target", value: `${t.test_id}|${t.target}` });
    }

    return this.batchConfigure(updated.interface, ops);
  }

  async deleteInterfaceHealth(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_wan_interface_health" }]);
  }

  // -------------------------------------------------------------------------
  // WAN Rules
  // -------------------------------------------------------------------------

  async createWANRule(rule: WANRule): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_wan_rule" }];

    if (rule.description)
      ops.push({ op: "set_wan_rule_description", value: rule.description });
    if (rule.inbound_interface)
      ops.push({ op: "set_wan_rule_inbound_interface", value: rule.inbound_interface });
    if (rule.protocol)
      ops.push({ op: "set_wan_rule_protocol", value: rule.protocol });
    if (rule.failover)
      ops.push({ op: "set_wan_rule_failover" });
    if (rule.per_packet_balancing)
      ops.push({ op: "set_wan_rule_per_packet_balancing" });
    if (rule.exclude)
      ops.push({ op: "set_wan_rule_exclude" });

    for (const iface of rule.interfaces) {
      ops.push({ op: "set_wan_rule_interface", value: iface.interface });
      if (iface.weight)
        ops.push({ op: "set_wan_rule_interface_weight", value: `${iface.interface}|${iface.weight}` });
    }

    if (rule.source?.address)
      ops.push({ op: "set_wan_rule_source_address", value: rule.source.address });
    if (rule.source?.port)
      ops.push({ op: "set_wan_rule_source_port", value: rule.source.port });
    if (rule.destination?.address)
      ops.push({ op: "set_wan_rule_destination_address", value: rule.destination.address });
    if (rule.destination?.port)
      ops.push({ op: "set_wan_rule_destination_port", value: rule.destination.port });

    return this.batchConfigure(rule.rule_id, ops);
  }

  async updateWANRule(original: WANRule, updated: WANRule): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (updated.description !== original.description) {
      if (updated.description)
        ops.push({ op: "set_wan_rule_description", value: updated.description });
      else
        ops.push({ op: "delete_wan_rule_description" });
    }

    if (updated.inbound_interface !== original.inbound_interface && updated.inbound_interface)
      ops.push({ op: "set_wan_rule_inbound_interface", value: updated.inbound_interface });

    if (updated.protocol !== original.protocol) {
      if (updated.protocol)
        ops.push({ op: "set_wan_rule_protocol", value: updated.protocol });
      else
        ops.push({ op: "delete_wan_rule_protocol" });
    }

    if (updated.failover !== original.failover) {
      if (updated.failover)
        ops.push({ op: "set_wan_rule_failover" });
      else
        ops.push({ op: "delete_wan_rule_failover" });
    }

    if (updated.per_packet_balancing !== original.per_packet_balancing) {
      if (updated.per_packet_balancing)
        ops.push({ op: "set_wan_rule_per_packet_balancing" });
      else
        ops.push({ op: "delete_wan_rule_per_packet_balancing" });
    }

    // Interfaces: remove old, add new
    for (const iface of original.interfaces)
      ops.push({ op: "delete_wan_rule_interface", value: iface.interface });
    for (const iface of updated.interfaces) {
      ops.push({ op: "set_wan_rule_interface", value: iface.interface });
      if (iface.weight)
        ops.push({ op: "set_wan_rule_interface_weight", value: `${iface.interface}|${iface.weight}` });
    }

    // Source/destination
    if (updated.source?.address !== original.source?.address) {
      if (updated.source?.address)
        ops.push({ op: "set_wan_rule_source_address", value: updated.source.address });
    }
    if (updated.destination?.address !== original.destination?.address) {
      if (updated.destination?.address)
        ops.push({ op: "set_wan_rule_destination_address", value: updated.destination.address });
    }

    return this.batchConfigure(updated.rule_id, ops);
  }

  async deleteWANRule(ruleId: string): Promise<VyOSResponse> {
    return this.batchConfigure(ruleId, [{ op: "delete_wan_rule" }]);
  }

  // -------------------------------------------------------------------------
  // WAN Global Settings
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // HAProxy Quick Setup (create backend + service in one atomic commit)
  // Required because VyOS mandates both "backend" and "service" exist together.
  // -------------------------------------------------------------------------

  async quickSetup(backend: LBBackend, service: LBService): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // --- Backend ---
    ops.push({ op: "create_rp_backend", item_name: backend.name });
    if (backend.description)
      ops.push({ op: "set_rp_backend_description", item_name: backend.name, value: backend.description });
    if (backend.balance)
      ops.push({ op: "set_rp_backend_balance", item_name: backend.name, value: backend.balance });
    if (backend.mode)
      ops.push({ op: "set_rp_backend_mode", item_name: backend.name, value: backend.mode });
    if (backend.health_check)
      ops.push({ op: "set_rp_backend_health_check", item_name: backend.name, value: backend.health_check });

    for (const srv of backend.servers) {
      ops.push({ op: "create_rp_backend_server", item_name: backend.name, value: srv.name });
      if (srv.address)
        ops.push({ op: "set_rp_backend_server_address", item_name: backend.name, value: `${srv.name}|${srv.address}` });
      if (srv.port)
        ops.push({ op: "set_rp_backend_server_port", item_name: backend.name, value: `${srv.name}|${srv.port}` });
      if (srv.backup)
        ops.push({ op: "set_rp_backend_server_backup", item_name: backend.name, value: srv.name });
      if (srv.check)
        ops.push({ op: "set_rp_backend_server_check", item_name: backend.name, value: srv.name });
      if (srv.check_port)
        ops.push({ op: "set_rp_backend_server_check_port", item_name: backend.name, value: `${srv.name}|${srv.check_port}` });
    }

    // --- Service ---
    ops.push({ op: "create_rp_service", item_name: service.name });
    if (service.description)
      ops.push({ op: "set_rp_service_description", item_name: service.name, value: service.description });
    if (service.mode)
      ops.push({ op: "set_rp_service_mode", item_name: service.name, value: service.mode });
    if (service.port)
      ops.push({ op: "set_rp_service_port", item_name: service.name, value: service.port });
    for (const la of service.listen_addresses)
      ops.push({ op: "set_rp_service_listen_address", item_name: service.name, value: la.address });
    for (const be of service.backends)
      ops.push({ op: "set_rp_service_backend", item_name: service.name, value: be });
    if (service.redirect_http_to_https)
      ops.push({ op: "set_rp_service_redirect_http_to_https", item_name: service.name });
    if (service.ssl) {
      for (const cert of service.ssl.certificates)
        ops.push({ op: "set_rp_service_ssl_certificate", item_name: service.name, value: cert });
    }

    const result = await apiClient.post<VyOSResponse>("/vyos/load-balancing/batch", {
      item_name: "",
      operations: ops,
    });
    if (!result.success) {
      throw new Error(result.error || "Quick setup failed");
    }
    return result;
  }

  async updateWANGlobals(settings: {
    disable_source_nat: boolean;
    enable_local_traffic: boolean;
    flush_connections: boolean;
    sticky_inbound: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (settings.disable_source_nat)
      ops.push({ op: "set_wan_disable_source_nat" });
    else
      ops.push({ op: "delete_wan_disable_source_nat" });

    if (settings.enable_local_traffic)
      ops.push({ op: "set_wan_enable_local_traffic" });
    else
      ops.push({ op: "delete_wan_enable_local_traffic" });

    if (settings.flush_connections)
      ops.push({ op: "set_wan_flush_connections" });
    else
      ops.push({ op: "delete_wan_flush_connections" });

    if (settings.sticky_inbound)
      ops.push({ op: "set_wan_sticky_connections_inbound" });
    else
      ops.push({ op: "delete_wan_sticky_connections_inbound" });

    return this.batchConfigure("", ops);
  }
}

export const lbService = new LoadBalancingService();
