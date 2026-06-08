/**
 * System Updates API Service
 *
 * Read-only visibility into available VyOS image updates:
 *  - per-instance check for the active session (`show system updates`)
 *  - site-level fan-out rollup across all instances the user can see
 *
 * The reported update URL is for display only; nothing here applies an update.
 */

import { apiClient } from "./client";

/** Result of `show system updates` for a single instance. */
export interface SystemUpdatesInfo {
  /** update-check url is configured and the command returned usable output */
  configured: boolean;
  current_version: string | null;
  update_available: boolean;
  available_version: string | null;
  update_url: string | null;
}

/** Per-instance status within a site rollup. */
export type InstanceUpdateState =
  | "ok"
  | "not_configured"
  | "unreachable"
  | "error"
  | "inactive";

export interface InstanceUpdateStatus {
  instance_id: string;
  name: string;
  host: string;
  is_active: boolean;
  status: InstanceUpdateState;
  current_version: string | null;
  update_available: boolean;
  available_version: string | null;
  update_url: string | null;
  checked_at: string;
  cached: boolean;
}

export interface SiteUpdatesSummary {
  site_id: string;
  total: number;
  with_updates: number;
  up_to_date: number;
  not_configured: number;
  unreachable: number;
  inactive: number;
  instances: InstanceUpdateStatus[];
  generated_at: string;
}

class SystemUpdatesService {
  /** Update info for the currently-connected instance. */
  async getActiveInstanceUpdates(): Promise<SystemUpdatesInfo> {
    return apiClient.get<SystemUpdatesInfo>("/vyos/show/system-updates");
  }

  /** Fleet rollup of update status across all visible instances in a site. */
  async getSiteUpdates(
    siteId: string,
    refresh = false
  ): Promise<SiteUpdatesSummary> {
    return apiClient.get<SiteUpdatesSummary>(
      `/vyos/sites/${siteId}/updates`,
      { refresh: refresh.toString() }
    );
  }
}

export const systemUpdatesService = new SystemUpdatesService();
