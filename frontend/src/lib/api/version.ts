/**
 * Version Check & Self-Update API Service
 */

import { apiClient } from "./client";

export interface VersionCheckResponse {
  current_version: string;
  latest_version: string | null;
  update_available: boolean;
  release_url: string | null;
  published_at: string | null;
  environment: string;
}

export type UpdatePhase =
  | "idle"
  | "pulling_frontend"
  | "pulling_backend"
  | "applying"
  | "rolling_back"
  | "complete"
  | "error";

export interface UpdateStatusResponse {
  phase: UpdatePhase;
  message: string;
  error: string | null;
}

export interface RollbackStatusResponse {
  available: boolean;
  phase: UpdatePhase;
  message: string;
  error: string | null;
}

class VersionService {
  async checkVersion(): Promise<VersionCheckResponse> {
    return apiClient.get<VersionCheckResponse>("/vyos/version/check");
  }

  async getUpdateStatus(): Promise<UpdateStatusResponse> {
    return apiClient.get<UpdateStatusResponse>("/vyos/version/update/status");
  }

  async startUpdate(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/vyos/version/update/start");
  }

  async getRollbackStatus(): Promise<RollbackStatusResponse> {
    return apiClient.get<RollbackStatusResponse>("/vyos/version/rollback/status");
  }

  async startRollback(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/vyos/version/rollback/start");
  }
}

export const versionService = new VersionService();
