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

// Backup-related interfaces
export interface ConfigBackup {
  id: string;
  instance_id: string;
  name: string;
  description?: string | null;
  config_size: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface ConfigBackupDetail extends ConfigBackup {
  config: Record<string, any>;
}

export interface BackupListResponse {
  backups: ConfigBackup[];
  total: number;
}

export interface CreateBackupRequest {
  name: string;
  description?: string;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  changes_applied: number;
  error?: string | null;
}

// Instance comparison interfaces
export interface InstanceCompareRequest {
  source_backup_id?: string | null;  // If null, use current running config
  target_instance_id: string;
  target_backup_id?: string | null;  // If null, use latest backup
}

export interface InstanceCompareResponse {
  source_instance_id: string;
  source_instance_name: string;
  target_instance_id: string;
  target_instance_name: string;
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

  // =========================================================================
  // Backup Management
  // =========================================================================

  /**
   * Create a new configuration backup
   */
  async createBackup(data: CreateBackupRequest): Promise<ConfigBackup> {
    return apiClient.post<ConfigBackup>("/vyos/config/backup", data);
  }

  /**
   * List all backups for the current instance
   */
  async listBackups(limit = 50, offset = 0): Promise<BackupListResponse> {
    return apiClient.get<BackupListResponse>("/vyos/config/backups", {
      limit: limit.toString(),
      offset: offset.toString(),
    });
  }

  /**
   * Get a specific backup with full config
   */
  async getBackup(backupId: string): Promise<ConfigBackupDetail> {
    return apiClient.get<ConfigBackupDetail>(`/vyos/config/backup/${backupId}`);
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/vyos/config/backup/${backupId}`);
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupId: string): Promise<RestoreResponse> {
    return apiClient.post<RestoreResponse>(`/vyos/config/backup/${backupId}/restore`);
  }

  /**
   * Compare a backup with current running config
   */
  async diffBackup(backupId: string): Promise<ConfigDiff> {
    return apiClient.get<ConfigDiff>(`/vyos/config/backup/${backupId}/diff`);
  }

  /**
   * Get download URL for a backup
   */
  getBackupDownloadUrl(backupId: string): string {
    return `/api/vyos/config/backup/${backupId}/download`;
  }

  // =========================================================================
  // Cross-Instance Comparison
  // =========================================================================

  /**
   * Compare configuration between the current instance and another instance.
   * Uses backups for comparison. If no backup_id is specified, uses
   * current running config for source and latest backup for target.
   */
  async compareInstances(request: InstanceCompareRequest): Promise<InstanceCompareResponse> {
    return apiClient.post<InstanceCompareResponse>("/vyos/config/compare-instances", request);
  }
}

export const configService = new ConfigService();
