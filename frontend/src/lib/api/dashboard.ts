import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DashboardCard {
  id: string;
  type: string; // "interface-statistics", etc.
  column: number; // 0, 1, or 2
  position: number; // position within column
  span?: number; // how many columns this card spans (1, 2, or 3) - defaults to 1
  config?: Record<string, any>; // card-specific configuration
}

export interface DashboardLayout {
  cards: DashboardCard[];
}

export interface DashboardLayoutResponse {
  layout: DashboardLayout | null;
  exists: boolean;
}

// Dashboard Overview Types
export interface InstanceStatus {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  vyosVersion?: string;
  isActive: boolean;
  siteId: string;
  siteName: string;
  isConnected: boolean;
  connectedAt?: string;
  connectedBy?: string;
}

export interface SiteOverview {
  id: string;
  name: string;
  description?: string;
  instanceCount: number;
  activeInstanceCount: number;
  connectedInstanceCount: number;
  instances: InstanceStatus[];
}

export interface AlertsSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
}

export interface DashboardOverview {
  sites: SiteOverview[];
  totalSites: number;
  totalInstances: number;
  activeInstances: number;
  connectedInstances: number;
  alerts: AlertsSummary;
}

// ============================================================================
// API Service
// ============================================================================

class DashboardService {
  /**
   * Get the user's dashboard layout for the current instance
   */
  async getLayout(): Promise<DashboardLayoutResponse> {
    return apiClient.get<DashboardLayoutResponse>("/dashboard/layout");
  }

  /**
   * Save the user's dashboard layout
   */
  async saveLayout(layout: DashboardLayout): Promise<any> {
    return apiClient.post("/dashboard/layout", { layout });
  }

  /**
   * Get dashboard overview with all sites and instances
   */
  async getOverview(): Promise<DashboardOverview> {
    return apiClient.get<DashboardOverview>("/dashboard/overview");
  }
}

export const dashboardService = new DashboardService();
