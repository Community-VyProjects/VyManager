import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ConfigSnapshot {
  config: Record<string, any>;
  timestamp?: string | null;
  saved: boolean;
}

export interface ConfigDiff {
  has_changes: boolean;
  added: Record<string, any>;
  removed: Record<string, any>;
  modified: Record<string, any>;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

export interface SaveConfigResponse {
  success: boolean;
  message: string;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class ConfigService {
  /**
   * Get the last saved configuration snapshot
   */
  async getSnapshot(): Promise<ConfigSnapshot> {
    return apiClient.get<ConfigSnapshot>("/vyos/config/snapshot");
  }

  /**
   * Get configuration differences between current and saved state
   */
  async getDiff(): Promise<ConfigDiff> {
    return apiClient.get<ConfigDiff>("/vyos/config/diff");
  }

  /**
   * Save the current configuration to disk
   */
  async saveConfig(file?: string): Promise<SaveConfigResponse> {
    const params = file ? { file } : {};
    return apiClient.post<SaveConfigResponse>("/vyos/config/save", params);
  }

  /**
   * Force refresh the configuration cache
   */
  async refreshConfig(): Promise<any> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Initialize the snapshot with current config
   */
  async initializeSnapshot(): Promise<any> {
    return apiClient.post("/vyos/config/initialize-snapshot");
  }
}

export const configService = new ConfigService();
