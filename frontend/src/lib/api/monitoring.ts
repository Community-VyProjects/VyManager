/**
 * Monitoring API Service
 *
 * Handles SSH key management and real-time monitoring WebSocket connections.
 */

import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SSHKeyStatus {
  has_key: boolean;
  public_key: string | null;
  configured: boolean;
  ssh_port: number;
  ssh_username: string | null;
}

export interface SSHKeyGenerateResponse {
  success: boolean;
  public_key: string;
}

export interface GenericResponse {
  success: boolean;
  message: string | null;
}

export interface MonitoringCommandParam {
  required: boolean;
  description: string;
  default?: string | null;
}

export interface MonitoringCommand {
  name: string;
  description: string;
  params: Record<string, MonitoringCommandParam>;
}

export interface MonitoringCommandsResponse {
  commands: MonitoringCommand[];
}

export interface MonitoringStatus {
  configured: boolean;
}

export interface MonitoringMessage {
  type: "ready" | "output" | "status" | "error" | "stopped";
  data?: string;
}

export interface MonitoringStartMessage {
  command: string;
  params: Record<string, string>;
}

// ============================================================================
// Monitoring Service
// ============================================================================

class MonitoringService {
  /**
   * Generate a new SSH keypair for an instance. Requires site ADMIN.
   */
  async generateSSHKey(instanceId: string): Promise<SSHKeyGenerateResponse> {
    return apiClient.post<SSHKeyGenerateResponse>(
      `/vyos/monitoring/instances/${instanceId}/ssh-key/generate`
    );
  }

  /**
   * Get SSH key status for an instance. Requires site ADMIN.
   */
  async getSSHKeyStatus(instanceId: string): Promise<SSHKeyStatus> {
    return apiClient.get<SSHKeyStatus>(
      `/vyos/monitoring/instances/${instanceId}/ssh-key/status`
    );
  }

  /**
   * Mark SSH key as configured on the VyOS device. Requires site ADMIN.
   */
  async markKeyConfigured(
    instanceId: string,
    configured: boolean = true
  ): Promise<GenericResponse> {
    return apiClient.post<GenericResponse>(
      `/vyos/monitoring/instances/${instanceId}/ssh-key/mark-configured`,
      { configured }
    );
  }

  /**
   * Remove SSH key from an instance. Requires site ADMIN.
   */
  async deleteSSHKey(instanceId: string): Promise<GenericResponse> {
    return apiClient.delete<GenericResponse>(
      `/vyos/monitoring/instances/${instanceId}/ssh-key`
    );
  }

  /**
   * Get SSH monitoring availability for the current user's active instance.
   * Accessible to any user with MONITORING read permission (not admin-only).
   */
  async getMonitoringStatus(): Promise<MonitoringStatus> {
    return apiClient.get<MonitoringStatus>("/vyos/monitoring/status");
  }

  /**
   * List available monitoring commands
   */
  async getCommands(): Promise<MonitoringCommandsResponse> {
    return apiClient.get<MonitoringCommandsResponse>(
      "/vyos/monitoring/commands"
    );
  }

  /**
   * Create a WebSocket connection for monitoring.
   * Connects directly to the backend (Next.js cannot proxy WebSockets).
   */
  createMonitoringSocket(): WebSocket {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `${wsProtocol}://${window.location.hostname}:8000`;
    return new WebSocket(`${wsUrl}/vyos/monitoring/ws/monitor`);
  }
}

export const monitoringService = new MonitoringService();
