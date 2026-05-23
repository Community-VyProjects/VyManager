import { apiClient } from "./client";

export interface HTTPSCertificates {
  certificate?: string | null;
  ca_certificate?: string | null;
  dh_params?: string | null;
}

export interface HTTPSApiKey {
  id: string;
  key: string;
}

export interface HTTPSGraphQLAuth {
  auth_type?: string | null;
  expiration?: number | null;
  secret_length?: number | null;
}

export interface HTTPSGraphQL {
  enabled: boolean;
  introspection: boolean;
  authentication: HTTPSGraphQLAuth;
  cors_allow_origins: string[];
}

export interface HTTPSRestAPI {
  enabled: boolean;
  debug: boolean;
  strict: boolean;
}

export interface HTTPSApi {
  keys: HTTPSApiKey[];
  graphql: HTTPSGraphQL;
  rest: HTTPSRestAPI;
}

export interface HTTPSConfig {
  listen_addresses: string[];
  allow_client_addresses: string[];
  port?: number | null;
  request_body_size_limit?: number | null;
  tls_versions: string[];
  vrf?: string | null;
  enable_http_redirect: boolean;
  certificates: HTTPSCertificates;
  api: HTTPSApi;
}

export interface HTTPSCapabilities {
  version: string;
  features: Record<string, unknown>;
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

class HTTPSService {
  async getCapabilities(): Promise<HTTPSCapabilities> {
    return apiClient.get<HTTPSCapabilities>("/vyos/https/capabilities");
  }

  async getConfig(refresh = false): Promise<HTTPSConfig> {
    return apiClient.get<HTTPSConfig>("/vyos/https/config", {
      refresh: refresh.toString(),
    });
  }

  async saveConfig(config: HTTPSConfig): Promise<VyOSResponse> {
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
      ops.push({ op: "set_request_body_size_limit", value: String(config.request_body_size_limit) });
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
      ops.push({ op: "set_certificates_certificate", value: config.certificates.certificate });
    }
    if (config.certificates.ca_certificate) {
      ops.push({ op: "set_certificates_ca_certificate", value: config.certificates.ca_certificate });
    }
    if (config.certificates.dh_params) {
      ops.push({ op: "set_certificates_dh_params", value: config.certificates.dh_params });
    }
    for (const k of config.api.keys) {
      ops.push({ op: "set_api_key", value: `${k.id},${k.key}` });
    }
    if (config.api.rest.enabled) {
      ops.push({ op: "set_api_rest" });
      if (config.api.rest.debug) {
        ops.push({ op: "set_api_debug" });
      }
      if (config.api.rest.strict) {
        ops.push({ op: "set_api_strict" });
      }
    }
    if (config.api.graphql.enabled) {
      if (config.api.graphql.introspection) {
        ops.push({ op: "set_api_graphql_introspection" });
      }
      const authType = config.api.graphql.authentication.auth_type || "key";
      ops.push({ op: "set_api_graphql_auth_type", value: authType });
      if (config.api.graphql.authentication.expiration != null) {
        ops.push({ op: "set_api_graphql_auth_expiration", value: String(config.api.graphql.authentication.expiration) });
      }
      if (config.api.graphql.authentication.secret_length != null) {
        ops.push({ op: "set_api_graphql_auth_secret_length", value: String(config.api.graphql.authentication.secret_length) });
      }
      for (const origin of config.api.graphql.cors_allow_origins) {
        ops.push({ op: "set_api_cors_allow_origin", value: origin });
      }
    }

    const result = await apiClient.post<VyOSResponse>("/vyos/https/batch", { operations: ops });
    return result;
  }
}

export const httpsService = new HTTPSService();
