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
   * Generate a new SSH keypair for the active instance
   */
  async generateSSHKey(): Promise<SSHKeyGenerateResponse> {
    return apiClient.post<SSHKeyGenerateResponse>(
      "/vyos/monitoring/ssh-key/generate"
    );
  }

  /**
   * Get SSH key status for the active instance
   */
  async getSSHKeyStatus(): Promise<SSHKeyStatus> {
    return apiClient.get<SSHKeyStatus>("/vyos/monitoring/ssh-key/status");
  }

  /**
   * Mark SSH key as configured on the VyOS device
   */
  async markKeyConfigured(
    configured: boolean = true
  ): Promise<GenericResponse> {
    return apiClient.post<GenericResponse>(
      "/vyos/monitoring/ssh-key/mark-configured",
      { configured }
    );
  }

  /**
   * Remove SSH key from the instance
   */
  async deleteSSHKey(): Promise<GenericResponse> {
    return apiClient.delete<GenericResponse>("/vyos/monitoring/ssh-key");
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
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `ws://${window.location.hostname}:8000`;
    return new WebSocket(`${wsUrl}/vyos/monitoring/ws/monitor`);
  }
}

export const monitoringService = new MonitoringService();
