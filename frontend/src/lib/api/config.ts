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

export interface CommitConfirmStatus {
  active: boolean;
  instance_id?: string | null;
  confirm_time_minutes?: number | null;
  action?: string | null;
  seconds_remaining?: number | null;
  expires_at?: string | null;
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
   * Discard all unsaved configuration changes by reverting to the last saved state
   */
  async discardConfig(): Promise<SaveConfigResponse> {
    return apiClient.post<SaveConfigResponse>("/vyos/config/discard");
  }

  /**
   * Force refresh the configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean; message: string }> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Get the current commit-confirm status for the active instance
   */
  async getCommitConfirmStatus(): Promise<CommitConfirmStatus> {
    return apiClient.get<CommitConfirmStatus>("/vyos/config/commit-confirm/status");
  }

  /**
   * Confirm an active commit-confirm, stopping the rollback timer and saving to disk
   */
  async confirmCommit(): Promise<SaveConfigResponse> {
    return apiClient.post<SaveConfigResponse>("/vyos/config/commit-confirm/confirm");
  }
}

export const configService = new ConfigService();
