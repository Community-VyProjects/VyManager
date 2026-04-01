/**
 * Organization Management API Service
 *
 * Handles listing and switching organizations.
 */

import { apiClient } from "./client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_demo: boolean;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgsListResponse {
  orgs: Organization[];
  user_role: string;
}

class OrgService {
  async listOrgs(): Promise<OrgsListResponse> {
    return apiClient.get<OrgsListResponse>("/session/orgs");
  }

  async switchOrg(orgId: string): Promise<{ success: boolean; message: string; data?: { org_id: string; org_name: string } }> {
    return apiClient.post("/session/switch-org", { org_id: orgId });
  }
}

export const orgService = new OrgService();
