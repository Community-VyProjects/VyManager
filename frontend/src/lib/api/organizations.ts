/**
 * Organization Management API Service
 *
 * System-administrator management of organizations and their members. Distinct
 * from the read-only `/session/organizations` (the caller's own memberships +
 * switcher). These call the backend `/organizations` management endpoints.
 */
import { apiClient } from "./client";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  userId: string;
  email: string;
  name: string | null;
  orgRole: OrgRole;
  createdAt: string;
}

class OrgManagementService {
  async list(): Promise<Organization[]> {
    const data = await apiClient.get<{ organizations: Organization[] }>("/organizations");
    return data.organizations;
  }

  async create(name: string, description?: string): Promise<Organization> {
    const data = await apiClient.post<{ organization: Organization }>("/organizations", {
      name,
      description: description || null,
    });
    return data.organization;
  }

  async update(
    id: string,
    patch: { name?: string; description?: string | null },
  ): Promise<Organization> {
    const data = await apiClient.patch<{ organization: Organization }>(
      `/organizations/${encodeURIComponent(id)}`,
      patch,
    );
    return data.organization;
  }

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/organizations/${encodeURIComponent(id)}`);
  }

  async listMembers(id: string): Promise<OrgMember[]> {
    const data = await apiClient.get<{ members: OrgMember[] }>(
      `/organizations/${encodeURIComponent(id)}/members`,
    );
    return data.members;
  }

  async addMember(id: string, userId: string, orgRole: OrgRole): Promise<void> {
    await apiClient.post(`/organizations/${encodeURIComponent(id)}/members`, {
      userId,
      orgRole,
    });
  }

  async setMemberRole(id: string, userId: string, orgRole: OrgRole): Promise<void> {
    await apiClient.patch(
      `/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
      { orgRole },
    );
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await apiClient.delete(
      `/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    );
  }
}

export const orgManagementService = new OrgManagementService();
