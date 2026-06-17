import { createSearchResult, buildHref } from "./utils";
import { humanizeToken } from "./labels";
import type { SearchEntityKind, SearchResult } from "./types";

// Keys the generic walker skips entirely — arrays like "interfaces" and "rules" are
// handled by curated indexers (firewall-indexer, network-indexer, etc.) which produce
// richer, more accurately linked results. The walker covers named scalars and settings.
const SKIP_KEYS = new Set([
  "capabilities",
  "features",
  "version",
  "version_info",
  "statistics",
  "operations",
  "device_name",
  "total",
  "by_type",
  "has_config",
  "transition_script",
  "health_check",
  "track",
  "authentication",
  "addresses",
  "excluded_addresses",
  "peer_addresses",
  "rules",
  "members",
  "servers",
  "proposals",
  "tunnels",
  "next_hops",
  "interfaces",
  "ranges",
  "static_mappings",
  "subnets",
  "facilities",
  "ssh_keys",
]);

const NAME_KEYS = [
  "id",
  "name",
  "username",
  "hostname",
  "host",
  "parameter",
  "number",
  "address",
  "range_id",
  "rule_id",
  "rule_number",
  "table_id",
] as const;

const SETTINGS_SEGMENT_LABELS: Record<string, string> = {
  global_parameters: "Global Settings",
  global_config: "Global Settings",
  timeouts: "Connection Timeouts",
  state_policy_established: "State Policy · Established",
  state_policy_invalid: "State Policy · Invalid",
  state_policy_related: "State Policy · Related",
  bridged_traffic: "Bridged Traffic",
  snmp: "SNMP",
  failover: "Failover",
  login: "Users & Login",
  syslog: "Syslog",
  conntrack: "Conntrack",
};

const ARRAY_ENTITY_KEYS = new Set([
  "groups",
  "sync_groups",
  "virtual_servers",
  "neighbors",
  "peer_groups",
  "instances",
  "interfaces",
  "areas",
  "containers",
  "networks",
  "registries",
  "rules",
  "certificates",
  "tunnels",
  "peers",
  "users",
  "subnets",
  "ranges",
  "static_mappings",
  "servers",
  "remote_hosts",
  "sysctl_parameters",
  "archive_locations",
  "backends",
  "services",
  "frontends",
  "ipv4_lists",
  "ipv6_lists",
  "address_groups",
  "port_groups",
  "zones",
  "chains",
  "custom_chains",
  "shared_networks",
  "real_servers",
  "members",
  "ike_groups",
  "esp_groups",
  "site_to_site",
  "remote_access",
  "pools",
  "external_pools",
  "internal_pools",
  "source_rules",
  "destination_rules",
  "static_rules",
  "routes",
  "tables",
  "pre_shared_keys",
  "rsa_keys",
  "certificates",
]);

/** Scalar fields to show as `Label: value` (in order) */
const DESCRIPTION_SCALAR_KEYS = [
  "description",
  "interface",
  "vrid",
  "priority",
  "remote_as",
  "local_as",
  "peer_group",
  "update_source",
  "subnet",
  "destination",
  "hostname",
  "image",
  "protocol",
  "mode",
  "balance",
  "algorithm",
  "port",
  "full_name",
  "rule_number",
  "table",
  "advertise_interval",
  "hello_source_address",
];

const FIELD_TITLE_OVERRIDES: Record<string, string> = {
  console_facilities: "Console Logging",
  console_devices: "Console Devices",
  preserve_fqdn: "Preserve FQDN",
  log_martians: "Log Martians",
  source_validation: "Source Validation",
  syn_cookies: "SYN Cookies",
  twa_hazards_protection: "TWA Hazards Protection",
};

const FIELD_ID_OVERRIDES: Record<string, string> = {
  "state_policy_established.action": "established-action",
  "state_policy_established.log": "est-log",
  "state_policy_established.log_level": "established-log-level",
  "state_policy_invalid.action": "invalid-action",
  "state_policy_invalid.log": "inv-log",
  "state_policy_invalid.log_level": "invalid-log-level",
  "state_policy_related.action": "related-action",
  "state_policy_related.log": "rel-log",
  "state_policy_related.log_level": "related-log-level",
};

const BOOLEAN_TRUE_LABELS: Record<string, string> = {
  disabled: "Disabled",
  no_preempt: "No preempt",
  log: "Logging enabled",
  backup: "Backup",
  check: "Health check",
  passive: "Passive",
  shutdown: "Shutdown",
  authoritative: "Authoritative",
  rfc3768_compatibility: "RFC3768 compatibility",
};

function formulaicFieldTitle(path: string[], key: string): string {
  const fullPath = [...path, key].join(".");
  if (FIELD_TITLE_OVERRIDES[fullPath]) return FIELD_TITLE_OVERRIDES[fullPath];
  if (FIELD_TITLE_OVERRIDES[key]) return FIELD_TITLE_OVERRIDES[key];

  for (const segment of path) {
    if (segment.startsWith("state_policy_")) {
      const prefix = humanizeToken(segment.replace("state_policy_", ""));
      if (["action", "log", "log_level"].includes(key)) {
        return `${prefix} ${humanize(key)}`;
      }
    }
  }

  return humanize(key);
}

function findSectionLabel(path: string[], key?: string): string {
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i];
    if (SETTINGS_SEGMENT_LABELS[segment]) return SETTINGS_SEGMENT_LABELS[segment];
  }

  const combined = [...path, key].filter(Boolean).join(".").toLowerCase();
  if (combined.includes("redirect")) return "ICMP Redirects";
  if (combined.includes("ping")) return "ICMP Settings";
  if (combined.includes("src_route") || combined.includes("source_route")) return "Source Routing";
  if (combined.includes("state_policy")) {
    if (combined.includes("established")) return "State Policy · Established";
    if (combined.includes("invalid")) return "State Policy · Invalid";
    if (combined.includes("related")) return "State Policy · Related";
    return "State Policies";
  }
  if (combined.includes("bridged")) return "Bridged Traffic";
  if (combined.includes("timeout") || combined.includes("tcp_") || combined.includes("udp_")) return "Connection Timeouts";
  if (combined.includes("log_martians") || combined.includes("source_validation") || combined.includes("syn_cookies") || combined.includes("twa_hazards")) {
    return "Security Options";
  }

  return humanize(path[path.length - 1] ?? key ?? "");
}

function pageTitleFromHrefBase(hrefBase: string): string {
  const segments = hrefBase.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  const last = segments[segments.length - 1];
  if (last === "settings" && segments.length > 1) {
    return `${humanizeToken(segments[segments.length - 2])} ${humanizeToken(last)}`;
  }
  return humanizeToken(last);
}

function kebabCase(value: string): string {
  return value.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase();
}

function fieldIdFromPath(path: string[], key: string): string {
  const fullPath = [...path, key].join(".");
  if (FIELD_ID_OVERRIDES[fullPath]) return FIELD_ID_OVERRIDES[fullPath];
  return kebabCase(key);
}

function isScalarField(key: string, value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return !NAME_KEYS.includes(key as typeof NAME_KEYS[number]);
  }
  return false;
}

function buildFieldTypeLabel(value: unknown): string {
  if (typeof value === "boolean") return "Toggle";
  return "Setting";
}

export interface ConfigWalkOptions {
  sourceId: string;
  feature: string;
  hrefBase: string;
  hrefParams?: (path: string[]) => Record<string, string>;
  kind?: SearchEntityKind;
}

function humanize(segment: string): string {
  return humanizeToken(segment);
}

function slugPath(path: string[]): string {
  return path.filter((p) => !/^\d+$/.test(p)).join("-").slice(0, 120);
}

function contextSegments(path: string[], sourceId: string): string[] {
  return path
    .filter((p) => p !== sourceId && !/^\d+$/.test(p))
    .map(humanize);
}

function extractTitle(obj: Record<string, unknown>): string | null {
  for (const key of NAME_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  if (typeof obj.rule_number === "number") {
    return obj.description && typeof obj.description === "string"
      ? obj.description
      : `Rule ${obj.rule_number}`;
  }
  if (typeof obj.destination === "string") return obj.destination;
  if (typeof obj.subnet === "string") return obj.subnet;
  if (typeof obj.description === "string" && obj.description.trim()) {
    return obj.description.trim();
  }
  return null;
}

function formatScalarLabel(key: string): string {
  const acronyms: Record<string, string> = {
    vrid: "VRID",
    remote_as: "Remote AS",
    local_as: "Local AS",
    vrf: "VRF",
  };
  if (acronyms[key]) return acronyms[key];
  return humanize(key);
}

function buildEntityDescription(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  const usedDescription =
    typeof obj.description === "string" && obj.description.trim()
      ? obj.description.trim()
      : null;

  if (usedDescription) {
    parts.push(usedDescription);
  }

  for (const key of DESCRIPTION_SCALAR_KEYS) {
    if (key === "description" || !(key in obj)) continue;
    const v = obj[key];
    if (v == null || v === "") continue;
    if (typeof v === "string" || typeof v === "number") {
      const label = formatScalarLabel(key);
      const text = `${label}: ${v}`;
      if (!parts.includes(text) && text !== usedDescription) parts.push(text);
    }
  }

  for (const [key, v] of Object.entries(obj)) {
    if (!BOOLEAN_TRUE_LABELS[key] || v !== true) continue;
    const label = BOOLEAN_TRUE_LABELS[key];
    if (!parts.includes(label)) parts.push(label);
  }

  if (Array.isArray(obj.addresses) && obj.addresses.length > 0) {
    const addrs = obj.addresses
      .map((a) => {
        if (a && typeof a === "object" && "address" in a) {
          return String((a as { address?: string }).address ?? "");
        }
        return typeof a === "string" ? a : "";
      })
      .filter(Boolean);
    if (addrs.length) parts.push(`VIP: ${addrs.slice(0, 3).join(", ")}`);
  }

  return parts.slice(0, 6).join(" · ");
}

function inferKind(path: string[]): SearchEntityKind {
  const p = path.join(".").toLowerCase();
  if (p.includes("vrrp") && p.includes("groups")) return "config-entity";
  if (p.includes("pre_shared")) return "config-entity";
  if (p.includes("rule")) return "firewall-rule";
  if (p.includes("neighbor")) return "bgp-neighbor";
  if (p.includes("peer_group")) return "bgp-peer-group";
  if (p.includes("interface")) return "interface";
  if (p.includes("zone")) return "firewall-zone";
  if (p.includes("container")) return "container";
  if (p.includes("user") || p.includes("login.users")) return "system-user";
  return "config-entity";
}

function inferTypeLabel(path: string[], sourceId: string): string {
  const segments = contextSegments(path, sourceId);
  const last = segments[segments.length - 1];
  if (!last) return "Configuration";
  if (last.endsWith("s")) {
    return last.slice(0, -1);
  }
  return last;
}

function shouldEmitEntity(path: string[], obj: Record<string, unknown>, title: string): boolean {
  if (title.length < 1 || title.length > 120) return false;
  const parent = path[path.length - 2] ?? "";
  if (ARRAY_ENTITY_KEYS.has(parent)) return true;
  if (path.some((s) => ARRAY_ENTITY_KEYS.has(s))) return true;
  if ("rule_number" in obj || "rule_id" in obj) return true;
  if ("destination" in obj && path.some((s) => s.includes("route"))) return true;
  if ("subnet" in obj) return true;
  if ("hostname" in obj || "username" in obj) return true;
  return path.length >= 1 && "name" in obj;
}

function shouldEmitSettingsSection(path: string[], key: string): boolean {
  return SETTINGS_SEGMENT_LABELS[key] !== undefined && path.length <= 4;
}

function walkValue(
  value: unknown,
  path: string[],
  options: ConfigWalkOptions,
  results: SearchResult[],
  depth: number
): void {
  if (depth > 14 || value == null) return;

  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      walkValue(item, [...path, String(i)], options, results, depth + 1);
    });
    return;
  }

  if (typeof value !== "object") return;

  const obj = value as Record<string, unknown>;
  const lastKey = path[path.length - 1] ?? "";

  if (shouldEmitSettingsSection(path, lastKey) && !Array.isArray(obj)) {
    const label = SETTINGS_SEGMENT_LABELS[lastKey] ?? humanize(lastKey);
    const ctx = contextSegments(path, options.sourceId);
    const contextPath = ctx.join(" · ");
    const subcategory = [options.feature, contextPath, label].filter(Boolean).join(" · ");

    results.push(
      createSearchResult({
        id: `cfg-${options.sourceId}-settings-${slugPath(path)}`,
        title: label,
        subtitle: subcategory,
        description: buildEntityDescription(obj) || label,
        kind: "section",
        typeLabel: label,
        feature: options.feature,
        subcategory,
        href: buildHref(options.hrefBase, options.hrefParams?.(path) ?? {}),
        keywords: [label, contextPath, options.sourceId, lastKey],
        data: { path, settings: lastKey },
      })
    );
  }

  const title = extractTitle(obj);
  if (title && shouldEmitEntity(path, obj, title)) {
    const ctx = contextSegments(path, options.sourceId);
    const parentLabel = ctx.length ? ctx.join(" · ") : options.feature;
    const subcategory = `${options.feature} · ${parentLabel}`;
    const typeLabel = inferTypeLabel(path, options.sourceId);
    const description = buildEntityDescription(obj) || parentLabel;
    const id = `cfg-${options.sourceId}-${slugPath(path)}-${title}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    results.push(
      createSearchResult({
        id,
        title,
        subtitle: subcategory,
        description,
        kind: options.kind ?? inferKind(path),
        typeLabel,
        feature: options.feature,
        subcategory,
        href: buildHref(options.hrefBase, options.hrefParams?.(path) ?? {}),
        keywords: [title, typeLabel, parentLabel, options.sourceId, ...ctx],
        data: { path, entity: obj },
      })
    );
  }

  for (const [key, child] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key)) continue;

    if (isScalarField(key, child)) {
      const fieldPath = [...path, key];
      const fieldTitle = formulaicFieldTitle(path, key);
      const sectionLabel = findSectionLabel(path, key);
      const pageTitle = pageTitleFromHrefBase(options.hrefBase);
      const hrefParams = { ...options.hrefParams?.(fieldPath), field: fieldIdFromPath(path, key) };
      const fieldId = `cfg-${options.sourceId}-field-${slugPath(fieldPath)}`;
      const subcategory = `${options.feature} · ${sectionLabel}`;

      results.push(
        createSearchResult({
          id: `${fieldId}`,
          title: fieldTitle,
          subtitle: subcategory,
          description: `${fieldTitle} setting from ${sectionLabel} in ${pageTitle}`,
          kind: "ui-field",
          typeLabel: buildFieldTypeLabel(child),
          feature: options.feature,
          category: options.feature,
          subcategory,
          href: buildHref(options.hrefBase, hrefParams),
          keywords: [fieldTitle, sectionLabel, pageTitle, options.feature, options.sourceId, key, ...contextSegments(path, options.sourceId)],
          data: { path: fieldPath, value: child },
        })
      );
    }

    walkValue(child, [...path, key], options, results, depth + 1);
  }
}

export function unwrapConfigPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const o = data as Record<string, unknown>;
  if ("config" in o && o.config && typeof o.config === "object" && !Array.isArray(o.config)) {
    if ("has_config" in o || "interfaces" in o.config || "groups" in o.config) {
      return o.config;
    }
  }
  if ("reverse_proxy" in o || "vrrp" in o || "shared_networks" in o) return o;
  return o;
}

export function walkConfig(data: unknown, options: ConfigWalkOptions): SearchResult[] {
  const results: SearchResult[] = [];
  const payload = unwrapConfigPayload(data);
  walkValue(payload, [], options, results, 0);
  return results;
}
