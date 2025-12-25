import { apiClient } from "./client";
import { NetworkInterface } from "./interfaces";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SystemInfo {
  instance_id: string;
  instance_name: string;
  site_name: string;
  vyos_version: string;
  connection_host: string;
  connected: boolean;
  interfaces: NetworkInterface[];
}

export interface SystemConfig {
  hostname: string | null;
  timezone: string | null;
  name_servers: string[];
  domain_name: string | null;
  raw_config: Record<string, any>;
}

// ============================================================================
// API Service
// ============================================================================

class SystemService {
  /**
   * Get system information about the active VyOS instance
   */
  async getInfo(): Promise<SystemInfo> {
    return apiClient.get<SystemInfo>("/vyos/system/info");
  }

  /**
   * Get system configuration (hostname, timezone, name servers, etc.)
   */
  async getConfig(refresh: boolean = false): Promise<SystemConfig> {
    return apiClient.get<SystemConfig>("/vyos/system/config", {
      refresh: refresh.toString(),
    });
  }
}

export const systemService = new SystemService();
