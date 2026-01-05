/**
 * Session Management API Service
 *
 * Handles user sessions with VyOS instances:
 * - Connect/disconnect from instances
 * - List accessible sites and instances
 * - Get current active session
 */

import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Site {
  id: string;
  name: string;
  description?: string | null;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  created_at: string;
  updated_at: string;
}

export interface Instance {
  id: string;
  site_id: string;
  name: string;
  description?: string | null;
  host: string;
  port: number;
  vyos_version?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveSession {
  instance_id: string;
  instance_name: string;
  site_id: string;
  site_name: string;
  host: string;
  port: number;
  connected_at: string;
}

export interface ConnectRequest {
  instance_id: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    instance_id?: string;
    instance_name?: string;
    site_id?: string;
    site_name?: string;
    host?: string;
    port?: number;
  };
}

export interface SiteCreateRequest {
  name: string;
  description?: string | null;
}

export interface SiteUpdateRequest {
  name?: string;
  description?: string | null;
}

export interface InstanceCreateRequest {
  site_id: string;
  name: string;
  description?: string | null;
  host: string;
  port: number;
  api_key: string;
  vyos_version: string;
  protocol?: string;
  verify_ssl?: boolean;
  is_active?: boolean;
}

export interface InstanceUpdateRequest {
  name?: string;
  description?: string | null;
  host?: string;
  port?: number;
  api_key?: string;
  vyos_version?: string;
  protocol?: string;
  verify_ssl?: boolean;
  is_active?: boolean;
  site_id?: string; // For moving instance to different site
}

export interface AuthSessionInfo {
  token: string;
  created_at: string;
  expires_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_current: boolean;
}

export interface ActiveSessionsResponse {
  has_other_sessions: boolean;
  current_session_token: string;
  other_sessions: AuthSessionInfo[];
}

export interface RevokeSessionRequest {
  session_token: string;
}

// ============================================================================
// Session Service
// ============================================================================

class SessionService {
  /**
   * Get the user's current active session
   * Returns null if no active session
   */
  async getCurrentSession(): Promise<ActiveSession | null> {
    try {
      return await apiClient.get<ActiveSession>("/session/current");
    } catch (error: any) {
      // Return null if no session (expected when user hasn't connected)
      if (error.status === 404 || error.status === 400) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Connect to a VyOS instance
   */
  async connect(instanceId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/session/connect", {
      instance_id: instanceId,
    });
  }

  /**
   * Disconnect from the current instance
   */
  async disconnect(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/session/disconnect");
  }

  /**
   * List all sites the user has access to
   */
  async listSites(): Promise<Site[]> {
    return apiClient.get<Site[]>("/session/sites");
  }

  /**
   * List all instances for a specific site
   */
  async listInstances(siteId: string): Promise<Instance[]> {
    return apiClient.get<Instance[]>(`/session/sites/${siteId}/instances`);
  }

  /**
   * Create a new site
   */
  async createSite(data: SiteCreateRequest): Promise<Site> {
    return apiClient.post<Site>("/session/sites", data);
  }

  /**
   * Update a site
   */
  async updateSite(siteId: string, data: SiteUpdateRequest): Promise<Site> {
    return apiClient.put<Site>(`/session/sites/${siteId}`, data);
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/session/sites/${siteId}`);
  }

  /**
   * Create a new instance
   */
  async createInstance(data: InstanceCreateRequest): Promise<Instance> {
    return apiClient.post<Instance>("/session/instances", data);
  }

  /**
   * Update an instance (including moving to different site)
   */
  async updateInstance(instanceId: string, data: InstanceUpdateRequest): Promise<Instance> {
    return apiClient.put<Instance>(`/session/instances/${instanceId}`, data);
  }

  /**
   * Delete an instance
   */
  async deleteInstance(instanceId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/session/instances/${instanceId}`);
  }

  /**
   * Export sites and instances as CSV file
   */
  async exportCSV(): Promise<void> {
    // Use Next.js API proxy to forward request to backend with proper auth
    const response = await fetch("/api/session/export-csv", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${errorText || response.statusText}`);
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "vymanager_export.csv";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Import sites and instances from CSV file
   */
  async importCSV(file: File): Promise<{
    success: boolean;
    message: string;
    data?: {
      sites_created: number;
      instances_created: number;
      errors?: string[] | null;
    };
  }> {
    const formData = new FormData();
    formData.append("file", file);

    // Use Next.js API proxy to forward request to backend with proper auth
    const response = await fetch("/api/session/import-csv", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `Import failed: ${response.statusText}`);
    }

    return data;
  }

  /**
   * Get all active authentication sessions for the current user
   * Used to detect if user is logged in from multiple devices
   */
  async getActiveSessions(): Promise<ActiveSessionsResponse> {
    return apiClient.get<ActiveSessionsResponse>("/session/auth-sessions");
  }

  /**
   * Revoke a specific authentication session
   * This allows a user to force logout from another device
   */
  async revokeSession(sessionToken: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/session/revoke-session", {
      session_token: sessionToken,
    });
  }
}

export const sessionService = new SessionService();
