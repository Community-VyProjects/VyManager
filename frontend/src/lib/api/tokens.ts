import { apiClient } from "./client";

export interface ApiTokenMetadata {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  allowed_instance_ids: string[];
  allowed_site_ids: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CreateTokenRequest {
  name: string;
  expires_in_days?: number | null;
  scopes?: string[];
  allowed_instance_ids?: string[];
  allowed_site_ids?: string[];
}

export interface CreateTokenResponse {
  token: string; // plaintext, shown exactly once
  metadata: ApiTokenMetadata;
}

class TokenService {
  async list(): Promise<ApiTokenMetadata[]> {
    return apiClient.get<ApiTokenMetadata[]>("/tokens");
  }

  async create(body: CreateTokenRequest): Promise<CreateTokenResponse> {
    return apiClient.post<CreateTokenResponse>("/tokens", body);
  }

  async revoke(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/tokens/${id}`);
  }
}

export const tokenService = new TokenService();
