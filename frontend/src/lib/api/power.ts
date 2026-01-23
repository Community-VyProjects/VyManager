import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PowerActionRequest {
  action: "now" | "at" | "in" | "cancel";
  value?: string; // HH:MM for 'at', minutes for 'in'
}

export interface PowerActionResponse {
  success: boolean;
  message: string;
  scheduled_time?: string;
}

export interface PowerStatusResponse {
  scheduled: boolean;
  action_type?: "reboot" | "poweroff";
  scheduled_time?: string;
  scheduled_by?: string;
  scheduled_by_name?: string;
  cancelled?: boolean;
  cancelled_by?: string;
  cancelled_by_name?: string;
}

// ============================================================================
// API Service
// ============================================================================

class PowerService {
  /**
   * Reboot the VyOS system
   */
  async reboot(request: PowerActionRequest): Promise<PowerActionResponse> {
    return apiClient.post<PowerActionResponse>("/vyos/power/reboot", request);
  }

  /**
   * Poweroff the VyOS system
   */
  async poweroff(request: PowerActionRequest): Promise<PowerActionResponse> {
    return apiClient.post<PowerActionResponse>("/vyos/power/poweroff", request);
  }

  /**
   * Get power action status (for polling)
   */
  async getStatus(): Promise<PowerStatusResponse> {
    return apiClient.get<PowerStatusResponse>("/vyos/power/status");
  }
}

export const powerService = new PowerService();
