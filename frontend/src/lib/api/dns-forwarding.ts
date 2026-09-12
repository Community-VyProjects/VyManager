import { apiClient } from "./client";

export interface NameServerEntry {
  ip: string;
  port?: number | null;
}

export interface DomainForwarder {
  domain: string;
  name_servers: NameServerEntry[];
  addnta: boolean;
  recursion_desired: boolean;
}

export interface ARecord {
  hostname: string;
  address?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface AAAARecord {
  hostname: string;
  address?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface CNAMERecord {
  hostname: string;
  target?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface MXServer {
  server: string;
  priority?: number | null;
}

export interface MXRecord {
  hostname: string;
  servers: MXServer[];
  ttl?: number | null;
  disabled: boolean;
}

export interface TXTRecord {
  hostname: string;
  value?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface NSRecord {
  hostname: string;
  target?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface PTRRecord {
  hostname: string;
  target?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface NAPTRRule {
  rule: string;
  order?: number | null;
  preference?: number | null;
  lookup_a: boolean;
  lookup_srv: boolean;
  protocol_specific: boolean;
  resolve_uri: boolean;
  regexp?: string | null;
  replacement?: string | null;
  service?: string | null;
}

export interface NAPTRRecord {
  hostname: string;
  rules: NAPTRRule[];
  ttl?: number | null;
  disabled: boolean;
}

export interface SPFRecord {
  hostname: string;
  value?: string | null;
  ttl?: number | null;
  disabled: boolean;
}

export interface SRVEntry {
  entry: string;
  hostname?: string | null;
  port?: number | null;
  priority?: number | null;
  weight?: number | null;
}

export interface SRVRecord {
  hostname: string;
  entries: SRVEntry[];
  ttl?: number | null;
  disabled: boolean;
}

export interface AuthDomainRecords {
  a: ARecord[];
  aaaa: AAAARecord[];
  cname: CNAMERecord[];
  mx: MXRecord[];
  txt: TXTRecord[];
  ns: NSRecord[];
  ptr: PTRRecord[];
  naptr: NAPTRRecord[];
  spf: SPFRecord[];
  srv: SRVRecord[];
}

export interface AuthoritativeDomain {
  domain: string;
  disabled: boolean;
  records: AuthDomainRecords;
}

export interface ZoneCacheOptions {
  dnssec?: string | null;
  max_zone_size?: number | null;
  refresh_interval?: number | null;
  refresh_on_reload: boolean;
  retry_interval?: number | null;
  timeout?: number | null;
  zonemd?: string | null;
}

export interface ZoneCache {
  zone: string;
  source_url?: string | null;
  source_axfr?: string | null;
  options: ZoneCacheOptions;
}

export interface ECSOptions {
  ecs_add_for: string[];
  ecs_ipv4_bits?: number | null;
  edns_subnet_allow_list: string[];
}

export interface DNSForwardingConfig {
  listen_addresses: string[];
  allow_from: string[];
  name_servers: NameServerEntry[];
  port?: number | null;
  cache_size?: number | null;
  dnssec?: string | null;
  system: boolean;
  negative_ttl?: number | null;
  timeout?: number | null;
  dhcp_interfaces: string[];
  ignore_hosts_file: boolean;
  no_serve_rfc1918: boolean;
  source_addresses: string[];
  serve_stale_extension?: number | null;
  dns64_prefix?: string | null;
  exclude_throttle_addresses: string[];
  domain_forwarders: DomainForwarder[];
  authoritative_domains: AuthoritativeDomain[];
  zone_caches: ZoneCache[];
  ecs_options: ECSOptions;
}

export interface DNSForwardingCapabilities {
  version: string;
  features: {
    listen_address: { supported: boolean; description: string };
    allow_from: { supported: boolean; description: string };
    name_server: { supported: boolean; description: string };
    port: { supported: boolean; description: string; default: number; min: number; max: number };
    cache_size: { supported: boolean; description: string; default: number; min: number; max: number };
    dnssec: { supported: boolean; description: string; options: string[]; default: string };
    system: { supported: boolean; description: string };
    negative_ttl: { supported: boolean; description: string; default: number; min: number; max: number };
    timeout: { supported: boolean; description: string; default: number; min: number; max: number };
    dhcp: { supported: boolean; description: string };
    ignore_hosts_file: { supported: boolean; description: string };
    no_serve_rfc1918: { supported: boolean; description: string };
    source_address: { supported: boolean; description: string };
    serve_stale_extension: { supported: boolean; description: string; default: number; min: number; max: number };
    dns64_prefix: { supported: boolean; description: string };
    exclude_throttle_address: { supported: boolean; description: string };
    domain: { supported: boolean; description: string };
    authoritative_domain: { supported: boolean; description: string };
    auth_naptr: { supported: boolean; description: string };
    auth_spf: { supported: boolean; description: string };
    auth_srv: { supported: boolean; description: string };
    zone_cache: { supported: boolean; description: string };
    options_ecs: { supported: boolean; description: string };
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

class DNSForwardingService {
  async getCapabilities(): Promise<DNSForwardingCapabilities> {
    return apiClient.get<DNSForwardingCapabilities>("/vyos/dns-forwarding/capabilities");
  }

  async getConfig(refresh = false): Promise<DNSForwardingConfig> {
    return apiClient.get<DNSForwardingConfig>("/vyos/dns-forwarding/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/dns-forwarding/batch", {
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async saveSettings(
    config: DNSForwardingConfig,
    caps: DNSForwardingCapabilities
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // Listen addresses: delete all then rebuild
    ops.push({ op: "delete_listen_addresses" });
    for (const addr of config.listen_addresses) {
      ops.push({ op: "set_listen_address", value: addr });
    }

    // Allow from: delete all then rebuild
    ops.push({ op: "delete_allow_from_all" });
    for (const net of config.allow_from) {
      ops.push({ op: "set_allow_from", value: net });
    }

    // Port
    ops.push({ op: "delete_port" });
    if (config.port != null) {
      ops.push({ op: "set_port", value: String(config.port) });
    }

    // Cache size
    ops.push({ op: "delete_cache_size" });
    if (config.cache_size != null) {
      ops.push({ op: "set_cache_size", value: String(config.cache_size) });
    }

    // DNSSEC
    ops.push({ op: "delete_dnssec" });
    if (config.dnssec) {
      ops.push({ op: "set_dnssec", value: config.dnssec });
    }

    // Negative TTL
    ops.push({ op: "delete_negative_ttl" });
    if (config.negative_ttl != null) {
      ops.push({ op: "set_negative_ttl", value: String(config.negative_ttl) });
    }

    // Timeout
    ops.push({ op: "delete_timeout" });
    if (config.timeout != null) {
      ops.push({ op: "set_timeout", value: String(config.timeout) });
    }

    // Serve stale extension
    ops.push({ op: "delete_serve_stale_extension" });
    if (config.serve_stale_extension != null) {
      ops.push({ op: "set_serve_stale_extension", value: String(config.serve_stale_extension) });
    }

    // DNS64 prefix
    ops.push({ op: "delete_dns64_prefix" });
    if (config.dns64_prefix) {
      ops.push({ op: "set_dns64_prefix", value: config.dns64_prefix });
    }

    // Presence flags
    ops.push({ op: "delete_system" });
    if (config.system) ops.push({ op: "set_system" });

    ops.push({ op: "delete_ignore_hosts_file" });
    if (config.ignore_hosts_file) ops.push({ op: "set_ignore_hosts_file" });

    ops.push({ op: "delete_no_serve_rfc1918" });
    if (config.no_serve_rfc1918) ops.push({ op: "set_no_serve_rfc1918" });

    // Source addresses
    ops.push({ op: "delete_source_addresses" });
    for (const addr of config.source_addresses) {
      ops.push({ op: "set_source_address", value: addr });
    }

    // DHCP interfaces
    ops.push({ op: "delete_dhcp_interfaces" });
    for (const iface of config.dhcp_interfaces) {
      ops.push({ op: "set_dhcp_interface", value: iface });
    }

    // Exclude throttle addresses
    ops.push({ op: "delete_exclude_throttle_addresses" });
    for (const addr of config.exclude_throttle_addresses) {
      ops.push({ op: "set_exclude_throttle_address", value: addr });
    }

    // ECS options
    if (caps.features.options_ecs.supported) {
      ops.push({ op: "delete_options_ecs_add_for_all" });
      for (const net of config.ecs_options.ecs_add_for) {
        ops.push({ op: "set_options_ecs_add_for", value: net });
      }

      ops.push({ op: "delete_options_ecs_ipv4_bits" });
      if (config.ecs_options.ecs_ipv4_bits != null) {
        ops.push({ op: "set_options_ecs_ipv4_bits", value: String(config.ecs_options.ecs_ipv4_bits) });
      }

      ops.push({ op: "delete_options_edns_subnet_allow_list_all" });
      for (const item of config.ecs_options.edns_subnet_allow_list) {
        ops.push({ op: "set_options_edns_subnet_allow_list", value: item });
      }
    }

    return this.batch(ops);
  }

  async addNameServer(ip: string, port?: number | null): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "set_name_server", value: ip }];
    if (port != null) {
      ops.push({ op: "set_name_server_port", value: `${ip},${port}` });
    }
    return this.batch(ops);
  }

  async deleteNameServer(ip: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_name_server", value: ip }]);
  }

  async addDomainForwarder(
    domain: string,
    nameServers: NameServerEntry[],
    addnta: boolean,
    recursionDesired: boolean
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    for (const ns of nameServers) {
      ops.push({ op: "set_domain_name_server", value: `${domain},${ns.ip}` });
      if (ns.port != null) {
        ops.push({ op: "set_domain_name_server_port", value: `${domain},${ns.ip},${ns.port}` });
      }
    }
    if (addnta) ops.push({ op: "set_domain_addnta", value: domain });
    if (recursionDesired) ops.push({ op: "set_domain_recursion_desired", value: domain });
    return this.batch(ops);
  }

  async updateDomainForwarder(
    original: DomainForwarder,
    nameServers: NameServerEntry[],
    addnta: boolean,
    recursionDesired: boolean
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_domain", value: original.domain }];
    for (const ns of nameServers) {
      ops.push({ op: "set_domain_name_server", value: `${original.domain},${ns.ip}` });
      if (ns.port != null) {
        ops.push({ op: "set_domain_name_server_port", value: `${original.domain},${ns.ip},${ns.port}` });
      }
    }
    if (addnta) ops.push({ op: "set_domain_addnta", value: original.domain });
    if (recursionDesired) ops.push({ op: "set_domain_recursion_desired", value: original.domain });
    return this.batch(ops);
  }

  async deleteDomainForwarder(domain: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_domain", value: domain }]);
  }

  async saveAuthDomain(
    domain: string,
    disabled: boolean,
    records: AuthDomainRecords
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_authoritative_domain", value: domain }];
    ops.push({ op: "set_authoritative_domain", value: domain });
    if (disabled) ops.push({ op: "set_authoritative_domain_disable", value: domain });

    for (const r of records.a) {
      if (r.address) ops.push({ op: "set_auth_a_address", value: `${domain},${r.hostname},${r.address}` });
      if (r.ttl != null) ops.push({ op: "set_auth_a_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_a_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.aaaa) {
      if (r.address) ops.push({ op: "set_auth_aaaa_address", value: `${domain},${r.hostname},${r.address}` });
      if (r.ttl != null) ops.push({ op: "set_auth_aaaa_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_aaaa_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.cname) {
      if (r.target) ops.push({ op: "set_auth_cname_target", value: `${domain},${r.hostname},${r.target}` });
      if (r.ttl != null) ops.push({ op: "set_auth_cname_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_cname_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.mx) {
      for (const srv of r.servers) {
        const priority = srv.priority ?? 10;
        ops.push({ op: "set_auth_mx_server_priority", value: `${domain},${r.hostname},${srv.server},${priority}` });
      }
      if (r.ttl != null) ops.push({ op: "set_auth_mx_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_mx_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.txt) {
      if (r.value) ops.push({ op: "set_auth_txt_value", value: `${domain},${r.hostname},${r.value}` });
      if (r.ttl != null) ops.push({ op: "set_auth_txt_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_txt_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.ns) {
      if (r.target) ops.push({ op: "set_auth_ns_target", value: `${domain},${r.hostname},${r.target}` });
      if (r.ttl != null) ops.push({ op: "set_auth_ns_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_ns_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.ptr) {
      if (r.target) ops.push({ op: "set_auth_ptr_target", value: `${domain},${r.hostname},${r.target}` });
      if (r.ttl != null) ops.push({ op: "set_auth_ptr_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_ptr_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.naptr) {
      if (r.ttl != null) ops.push({ op: "set_auth_naptr_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_naptr_disable", value: `${domain},${r.hostname}` });
      for (const rule of r.rules) {
        ops.push({ op: "set_auth_naptr_rule", value: `${domain},${r.hostname},${rule.rule}` });
        if (rule.order != null) ops.push({ op: "set_auth_naptr_rule_order", value: `${domain},${r.hostname},${rule.rule},${rule.order}` });
        if (rule.preference != null) ops.push({ op: "set_auth_naptr_rule_preference", value: `${domain},${r.hostname},${rule.rule},${rule.preference}` });
        if (rule.lookup_a) ops.push({ op: "set_auth_naptr_rule_lookup_a", value: `${domain},${r.hostname},${rule.rule}` });
        if (rule.lookup_srv) ops.push({ op: "set_auth_naptr_rule_lookup_srv", value: `${domain},${r.hostname},${rule.rule}` });
        if (rule.protocol_specific) ops.push({ op: "set_auth_naptr_rule_protocol_specific", value: `${domain},${r.hostname},${rule.rule}` });
        if (rule.resolve_uri) ops.push({ op: "set_auth_naptr_rule_resolve_uri", value: `${domain},${r.hostname},${rule.rule}` });
        if (rule.regexp) ops.push({ op: "set_auth_naptr_rule_regexp", value: `${domain},${r.hostname},${rule.rule},${rule.regexp}` });
        if (rule.replacement) ops.push({ op: "set_auth_naptr_rule_replacement", value: `${domain},${r.hostname},${rule.rule},${rule.replacement}` });
        if (rule.service) ops.push({ op: "set_auth_naptr_rule_service", value: `${domain},${r.hostname},${rule.rule},${rule.service}` });
      }
    }
    for (const r of records.spf) {
      if (r.value) ops.push({ op: "set_auth_spf_value", value: `${domain},${r.hostname},${r.value}` });
      if (r.ttl != null) ops.push({ op: "set_auth_spf_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_spf_disable", value: `${domain},${r.hostname}` });
    }
    for (const r of records.srv) {
      if (r.ttl != null) ops.push({ op: "set_auth_srv_ttl", value: `${domain},${r.hostname},${r.ttl}` });
      if (r.disabled) ops.push({ op: "set_auth_srv_disable", value: `${domain},${r.hostname}` });
      for (const e of r.entries) {
        ops.push({ op: "set_auth_srv_entry", value: `${domain},${r.hostname},${e.entry}` });
        if (e.hostname) ops.push({ op: "set_auth_srv_entry_hostname", value: `${domain},${r.hostname},${e.entry},${e.hostname}` });
        if (e.port != null) ops.push({ op: "set_auth_srv_entry_port", value: `${domain},${r.hostname},${e.entry},${e.port}` });
        if (e.priority != null) ops.push({ op: "set_auth_srv_entry_priority", value: `${domain},${r.hostname},${e.entry},${e.priority}` });
        if (e.weight != null) ops.push({ op: "set_auth_srv_entry_weight", value: `${domain},${r.hostname},${e.entry},${e.weight}` });
      }
    }

    return this.batch(ops);
  }

  async deleteAuthDomain(domain: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_authoritative_domain", value: domain }]);
  }

  async saveZoneCache(
    zone: string,
    sourceUrl: string | null,
    sourceAxfr: string | null,
    options: ZoneCacheOptions
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_zone_cache", value: zone }];
    if (sourceUrl) ops.push({ op: "set_zone_cache_url", value: `${zone},${sourceUrl}` });
    if (sourceAxfr) ops.push({ op: "set_zone_cache_axfr", value: `${zone},${sourceAxfr}` });
    if (options.dnssec) ops.push({ op: "set_zone_cache_dnssec", value: `${zone},${options.dnssec}` });
    if (options.max_zone_size != null) ops.push({ op: "set_zone_cache_max_zone_size", value: `${zone},${options.max_zone_size}` });
    if (options.refresh_interval != null) ops.push({ op: "set_zone_cache_refresh_interval", value: `${zone},${options.refresh_interval}` });
    if (options.refresh_on_reload) ops.push({ op: "set_zone_cache_refresh_on_reload", value: zone });
    if (options.retry_interval != null) ops.push({ op: "set_zone_cache_retry_interval", value: `${zone},${options.retry_interval}` });
    if (options.timeout != null) ops.push({ op: "set_zone_cache_timeout", value: `${zone},${options.timeout}` });
    if (options.zonemd) ops.push({ op: "set_zone_cache_zonemd", value: `${zone},${options.zonemd}` });
    return this.batch(ops);
  }

  async deleteZoneCache(zone: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_zone_cache", value: zone }]);
  }
}

export const dnsForwardingService = new DNSForwardingService();
