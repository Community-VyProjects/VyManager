import type { BatchOperation, HTTPSCapabilities, HTTPSConfig } from "./https";

/** API keys load from GET /config as this mask; the save never sends it. */
export const MASKED_SECRET = "***";

type Capabilities = Pick<HTTPSCapabilities, "features"> | null | undefined;

function feature(capabilities: Capabilities, name: string): Record<string, unknown> | null {
  const value = capabilities?.features?.[name];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function httpsCorsIndependent(capabilities: Capabilities): boolean {
  return feature(capabilities, "api_cors")?.cors_scope === "api";
}

export function httpsRestContainer(capabilities: Capabilities): boolean {
  return feature(capabilities, "api_rest")?.supported === true;
}

export function httpsTlsVersions(capabilities: Capabilities): string[] {
  return stringList(feature(capabilities, "tls_version")?.options);
}

export function httpsGraphqlAuthTypes(capabilities: Capabilities): string[] {
  return stringList(feature(capabilities, "api_graphql_auth")?.auth_types);
}

export interface HttpsSaveOptions {
  capsReady?: boolean;
  corsIndependent?: boolean;
  restContainer?: boolean;
}

function cleanList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function num(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

/** Trim every field the save diffs, so the loaded and edited configs compare. */
export function normalizeHttpsConfig(config: HTTPSConfig): HTTPSConfig {
  const graphql = config.api.graphql;
  return {
    listen_addresses: cleanList(config.listen_addresses),
    allow_client_addresses: cleanList(config.allow_client_addresses),
    port: config.port ?? null,
    request_body_size_limit: config.request_body_size_limit ?? null,
    tls_versions: cleanList(config.tls_versions),
    vrf: text(config.vrf) || null,
    enable_http_redirect: config.enable_http_redirect,
    certificates: {
      certificate: text(config.certificates.certificate) || null,
      ca_certificate: text(config.certificates.ca_certificate) || null,
      dh_params: text(config.certificates.dh_params) || null,
    },
    api: {
      keys: config.api.keys.map((key) => ({ id: key.id.trim(), key: key.key.trim() })),
      rest: { ...config.api.rest },
      graphql: {
        enabled: graphql.enabled,
        introspection: graphql.introspection,
        authentication: {
          auth_type: text(graphql.authentication.auth_type) || null,
          expiration: graphql.authentication.expiration ?? null,
          secret_length: graphql.authentication.secret_length ?? null,
        },
        cors_allow_origins: cleanList(graphql.cors_allow_origins),
      },
    },
  };
}

function apiConfigured(config: HTTPSConfig): boolean {
  return (
    config.api.keys.length > 0 ||
    config.api.rest.enabled ||
    config.api.rest.debug ||
    config.api.rest.strict ||
    config.api.graphql.enabled ||
    config.api.graphql.cors_allow_origins.length > 0
  );
}

export function httpsConfigured(config: HTTPSConfig): boolean {
  return (
    config.listen_addresses.length > 0 ||
    config.allow_client_addresses.length > 0 ||
    config.port != null ||
    config.request_body_size_limit != null ||
    config.tls_versions.length > 0 ||
    !!config.vrf ||
    config.enable_http_redirect ||
    !!config.certificates.certificate ||
    !!config.certificates.ca_certificate ||
    !!config.certificates.dh_params ||
    apiConfigured(config)
  );
}

function diffList(
  ops: BatchOperation[],
  before: string[],
  after: string[],
  setOp: string,
  deleteOp: string,
  deleteAllOp: string,
): void {
  if (after.length === 0 && before.length > 0) {
    ops.push({ op: deleteAllOp });
    return;
  }
  for (const value of before) {
    if (!after.includes(value)) ops.push({ op: deleteOp, value });
  }
  for (const value of after) {
    if (!before.includes(value)) ops.push({ op: setOp, value });
  }
}

function diffValue(
  ops: BatchOperation[],
  before: string,
  after: string,
  setOp: string,
  deleteOp: string,
): void {
  if (before === after) return;
  ops.push(after ? { op: setOp, value: after } : { op: deleteOp });
}

function diffFlag(
  ops: BatchOperation[],
  before: boolean,
  after: boolean,
  setOp: string,
  deleteOp: string,
): void {
  if (before !== after) ops.push({ op: after ? setOp : deleteOp });
}

function diffKeys(ops: BatchOperation[], before: HTTPSConfig, after: HTTPSConfig): void {
  const stored = new Map(before.api.keys.map((key) => [key.id, key.key]));
  const edited = new Map(after.api.keys.map((key) => [key.id, key.key]));
  if (edited.size === 0 && stored.size > 0) {
    ops.push({ op: "delete_api_keys" });
    return;
  }
  for (const id of stored.keys()) {
    if (!edited.has(id)) ops.push({ op: "delete_api_key", value: id });
  }
  for (const [id, key] of edited) {
    // A masked key is the stored one, unchanged.
    if (key === MASKED_SECRET || !key || stored.get(id) === key) continue;
    ops.push({ op: "set_api_key", value: `${id},${key}` });
  }
}

function diffRest(
  ops: BatchOperation[],
  before: HTTPSConfig,
  after: HTTPSConfig,
  restContainer: boolean,
): void {
  const was = before.api.rest;
  const now = after.api.rest;
  if (restContainer) {
    if (was.enabled && !now.enabled) {
      ops.push({ op: "delete_api_rest" });
      return;
    }
    if (!now.enabled) return;
    if (!was.enabled) ops.push({ op: "set_api_rest" });
  }
  diffFlag(ops, was.debug, now.debug, "set_api_debug", "delete_api_debug");
  diffFlag(ops, was.strict, now.strict, "set_api_strict", "delete_api_strict");
}

function diffGraphql(
  ops: BatchOperation[],
  before: HTTPSConfig,
  after: HTTPSConfig,
  corsIndependent: boolean,
): void {
  const was = before.api.graphql;
  const now = after.api.graphql;
  if (was.enabled && !now.enabled) {
    ops.push({ op: "delete_api_graphql" });
  } else if (now.enabled) {
    const wasAuth = was.enabled ? was.authentication : {};
    // The lab sets type key when graphql exists without one.
    const wasType = was.enabled ? text(wasAuth.auth_type) || "key" : "";
    const nowType = text(now.authentication.auth_type) || "key";
    if (wasType !== nowType) ops.push({ op: "set_api_graphql_auth_type", value: nowType });
    diffFlag(
      ops,
      was.enabled && was.introspection,
      now.introspection,
      "set_api_graphql_introspection",
      "delete_api_graphql_introspection",
    );
    diffValue(
      ops,
      num(wasAuth.expiration),
      num(now.authentication.expiration),
      "set_api_graphql_auth_expiration",
      "delete_api_graphql_auth_expiration",
    );
    diffValue(
      ops,
      num(wasAuth.secret_length),
      num(now.authentication.secret_length),
      "set_api_graphql_auth_secret_length",
      "delete_api_graphql_auth_secret_length",
    );
  }

  // 1.4 CORS is an api child. 1.5 CORS lives under graphql, so it goes with
  // the graphql node and is only emitted while GraphQL is on.
  if (!corsIndependent && !now.enabled) return;
  const wasCors = corsIndependent || was.enabled ? was.cors_allow_origins : [];
  diffList(
    ops,
    wasCors,
    now.cors_allow_origins,
    "set_api_cors_allow_origin",
    "delete_api_cors_allow_origin",
    "delete_api_cors_allow_origins",
  );
}

/**
 * Ops that turn the loaded config into the edited one. Only changed leaves
 * are sent, so a masked API key and leaves the screen does not show survive.
 */
export function buildHttpsSaveOps(
  original: HTTPSConfig,
  updated: HTTPSConfig,
  options: HttpsSaveOptions = {},
): BatchOperation[] {
  if (options.capsReady !== true) {
    throw new Error("HTTPS capabilities are required before save");
  }
  const before = normalizeHttpsConfig(original);
  const after = normalizeHttpsConfig(updated);

  if (!httpsConfigured(after)) {
    return httpsConfigured(before) ? [{ op: "delete_https" }] : [];
  }

  const ops: BatchOperation[] = [];
  diffList(ops, before.listen_addresses, after.listen_addresses,
    "set_listen_address", "delete_listen_address", "delete_listen_addresses");
  diffList(ops, before.allow_client_addresses, after.allow_client_addresses,
    "set_allow_client_address", "delete_allow_client_address", "delete_allow_client_addresses");
  diffValue(ops, num(before.port), num(after.port), "set_port", "delete_port");
  diffValue(ops, num(before.request_body_size_limit), num(after.request_body_size_limit),
    "set_request_body_size_limit", "delete_request_body_size_limit");
  diffList(ops, before.tls_versions, after.tls_versions,
    "set_tls_version", "delete_tls_version", "delete_tls_versions");
  diffValue(ops, text(before.vrf), text(after.vrf), "set_vrf", "delete_vrf");
  diffFlag(ops, before.enable_http_redirect, after.enable_http_redirect,
    "set_enable_http_redirect", "delete_enable_http_redirect");
  diffValue(ops, text(before.certificates.certificate), text(after.certificates.certificate),
    "set_certificates_certificate", "delete_certificates_certificate");
  diffValue(ops, text(before.certificates.ca_certificate), text(after.certificates.ca_certificate),
    "set_certificates_ca_certificate", "delete_certificates_ca_certificate");
  diffValue(ops, text(before.certificates.dh_params), text(after.certificates.dh_params),
    "set_certificates_dh_params", "delete_certificates_dh_params");

  if (!apiConfigured(after)) {
    if (apiConfigured(before)) ops.push({ op: "delete_api" });
    return ops;
  }
  diffKeys(ops, before, after);
  diffRest(ops, before, after, options.restContainer === true);
  diffGraphql(ops, before, after, options.corsIndependent === true);
  return ops;
}
