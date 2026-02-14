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

/** Performance option from GET /vyos/system/capabilities (version-dependent) */
export interface PerformanceOption {
  value: string;
  label: string;
  description: string;
}

export interface SystemCapabilities {
  version: string;
  performance_options: PerformanceOption[];
}

export interface SystemConfig {
  hostname: string | null;
  timezone: string | null;
  name_servers: string[];
  domain_name: string | null;
  performance: string | null;
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
   * Get system configuration (hostname, timezone, name servers, performance, etc.)
   */
  async getConfig(refresh: boolean = false): Promise<SystemConfig> {
    return apiClient.get<SystemConfig>("/vyos/system/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Get system capabilities (e.g. performance_options) for the active instance.
   * Options depend on VyOS version (1.4: throughput, latency; 1.5: five profiles).
   */
  async getCapabilities(): Promise<SystemCapabilities> {
    return apiClient.get<SystemCapabilities>("/vyos/system/capabilities");
  }

  /**
   * Update system option performance profile.
   * Valid values depend on VyOS version (see getCapabilities()).
   * Pass null or empty string to clear.
   */
  async updatePerformance(performance: string | null): Promise<{ success: boolean; message: string; error?: string }> {
    return apiClient.patch<{ success: boolean; message: string; error?: string }>(
      "/vyos/system/config/performance",
      { performance: performance || null }
    );
  }
}

export const systemService = new SystemService();
