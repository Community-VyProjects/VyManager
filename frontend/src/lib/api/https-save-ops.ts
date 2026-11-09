import type { BatchOperation, HTTPSCapabilities, HTTPSConfig } from "./https";

type CorsFeature = { cors_scope?: string };

export function httpsCorsIndependent(
  capabilities: Pick<HTTPSCapabilities, "features"> | null | undefined,
): boolean {
  const feature = capabilities?.features?.api_cors;
  if (!feature || typeof feature !== "object") return false;
  return (feature as CorsFeature).cors_scope === "api";
}

export interface HttpsSaveOptions {
  corsIndependent?: boolean;
  restContainer?: boolean;
}

export function httpsRestContainer(
  capabilities: Pick<HTTPSCapabilities, "features"> | null | undefined,
): boolean {
  const feature = capabilities?.features?.api_rest;
  if (!feature || typeof feature !== "object") return false;
  return (feature as { supported?: boolean }).supported === true;
}

export function buildHttpsSaveOps(
  config: HTTPSConfig,
  options: HttpsSaveOptions = {},
): BatchOperation[] {
  const ops: BatchOperation[] = [{ op: "delete_https" }];

  for (const addr of config.listen_addresses) {
    ops.push({ op: "set_listen_address", value: addr });
  }
  for (const addr of config.allow_client_addresses) {
    ops.push({ op: "set_allow_client_address", value: addr });
  }
  if (config.port != null) {
    ops.push({ op: "set_port", value: String(config.port) });
  }
  if (config.request_body_size_limit != null) {
    ops.push({
      op: "set_request_body_size_limit",
      value: String(config.request_body_size_limit),
    });
  }
  for (const ver of config.tls_versions) {
    ops.push({ op: "set_tls_version", value: ver });
  }
  if (config.vrf) {
    ops.push({ op: "set_vrf", value: config.vrf });
  }
  if (config.enable_http_redirect) {
    ops.push({ op: "set_enable_http_redirect" });
  }
  if (config.certificates.certificate) {
    ops.push({
      op: "set_certificates_certificate",
      value: config.certificates.certificate,
    });
  }
  if (config.certificates.ca_certificate) {
    ops.push({
      op: "set_certificates_ca_certificate",
      value: config.certificates.ca_certificate,
    });
  }
  if (config.certificates.dh_params) {
    ops.push({
      op: "set_certificates_dh_params",
      value: config.certificates.dh_params,
    });
  }
  for (const k of config.api.keys) {
    ops.push({ op: "set_api_key", value: `${k.id},${k.key}` });
  }
  const restContainer = options.restContainer === true;
  if (restContainer && config.api.rest.enabled) {
    ops.push({ op: "set_api_rest" });
  }
  const emitRestFlags = restContainer ? config.api.rest.enabled : true;
  if (emitRestFlags && config.api.rest.debug) {
    ops.push({ op: "set_api_debug" });
  }
  if (emitRestFlags && config.api.rest.strict) {
    ops.push({ op: "set_api_strict" });
  }
  if (config.api.graphql.enabled) {
    if (config.api.graphql.introspection) {
      ops.push({ op: "set_api_graphql_introspection" });
    }
    const authType = config.api.graphql.authentication.auth_type || "key";
    ops.push({ op: "set_api_graphql_auth_type", value: authType });
    if (config.api.graphql.authentication.expiration != null) {
      ops.push({
        op: "set_api_graphql_auth_expiration",
        value: String(config.api.graphql.authentication.expiration),
      });
    }
    if (config.api.graphql.authentication.secret_length != null) {
      ops.push({
        op: "set_api_graphql_auth_secret_length",
        value: String(config.api.graphql.authentication.secret_length),
      });
    }
  }
  // 1.4 CORS is an api child. 1.5 CORS lives under graphql, so emitting it
  // while GraphQL is off creates the graphql node.
  const emitCors = options.corsIndependent === true || config.api.graphql.enabled;
  if (emitCors) {
    for (const origin of config.api.graphql.cors_allow_origins) {
      ops.push({ op: "set_api_cors_allow_origin", value: origin });
    }
  }

  return ops;
}
