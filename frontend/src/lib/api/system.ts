/**
 * System Information API Service
 * Handles all system information operations
 */

import { apiClient } from "./client";
import type { NetworkInterface } from "./interfaces";

export interface SystemInfo {
  device_name: string;
  vyos_version: string;
  connection_host: string;
  connected: boolean;
  interfaces?: NetworkInterface[];
}

class SystemService {
  /**
   * Get system information about the VyOS device
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return apiClient.get<SystemInfo>("/vyos/system/info");
  }
}

export const systemService = new SystemService();
