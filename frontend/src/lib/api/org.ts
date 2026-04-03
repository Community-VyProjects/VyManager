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

export interface OrgMember {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_role: string;
  org_role: string;
  joined_at: string;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrgRequest {
  name?: string;
  description?: string;
}

class OrgService {
  async listOrgs(): Promise<OrgsListResponse> {
    return apiClient.get<OrgsListResponse>("/session/orgs");
  }

  async switchOrg(orgId: string): Promise<{ success: boolean; message: string; data?: { org_id: string; org_name: string } }> {
    return apiClient.post("/session/switch-org", { org_id: orgId });
  }

  async createOrg(data: CreateOrgRequest): Promise<Organization> {
    return apiClient.post<Organization>("/session/orgs", data);
  }

  async updateOrg(orgId: string, data: UpdateOrgRequest): Promise<Organization> {
    return apiClient.put<Organization>(`/session/orgs/${orgId}`, data);
  }

  async deleteOrg(orgId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/session/orgs/${orgId}`);
  }

  async listOrgMembers(orgId: string): Promise<OrgMember[]> {
    return apiClient.get<OrgMember[]>(`/session/orgs/${orgId}/members`);
  }

  async addOrgMember(orgId: string, userId: string, role: string = "MEMBER"): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/session/orgs/${orgId}/members`, { user_id: userId, role });
  }

  async removeOrgMember(orgId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/session/orgs/${orgId}/members/${userId}`);
  }
}

export const orgService = new OrgService();
