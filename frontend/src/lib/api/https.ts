import { apiClient } from "./client";
import { buildHttpsSaveOps } from "./https-save-ops";

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
    const result = await apiClient.post<VyOSResponse>("/vyos/https/batch", {
      operations: buildHttpsSaveOps(config),
    });
    return result;
  }
}

export const httpsService = new HTTPSService();
