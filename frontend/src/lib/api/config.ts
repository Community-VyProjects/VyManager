import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ConfigDiff {
  has_changes: boolean;
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  modified: Record<string, unknown>;
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
  started_by_id?: string | null;
  /** Left out when another organization's instance row shares the router. */
  started_by_name?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class ConfigService {
  /**
   * Get configuration differences between current and saved state
   */
  async getDiff(): Promise<ConfigDiff> {
    return apiClient.get<ConfigDiff>("/vyos/config/diff");
  }

  /**
   * Save the current configuration to disk
   */
  async saveConfig(): Promise<SaveConfigResponse> {
    return apiClient.post<SaveConfigResponse>("/vyos/config/save");
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
   * Confirm an active commit-confirm, stopping the rollback timer. Does not save to disk.
   */
  async confirmCommit(): Promise<SaveConfigResponse> {
    return apiClient.post<SaveConfigResponse>("/vyos/config/commit-confirm/confirm");
  }
}

export const configService = new ConfigService();
