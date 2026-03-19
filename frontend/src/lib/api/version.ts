/**
 * Version Check API Service
 * Checks for available VyManager updates against GitHub releases.
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

class VersionService {
  async checkVersion(): Promise<VersionCheckResponse> {
    return apiClient.get<VersionCheckResponse>("/vyos/version/check");
  }
}

export const versionService = new VersionService();
