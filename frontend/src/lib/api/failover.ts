import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import { createRouteOps, deleteRouteOps, updateRouteOps, type FailoverForm } from "./failover-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface FailoverCheckTarget {
  address: string;
  interface?: string | null;
  vrf?: string | null;
}

export interface FailoverCheck {
  policy?: string | null;
  port?: number | null;
  targets: FailoverCheckTarget[];
  timeout?: number | null;
  type?: string | null;
}

export interface FailoverNextHop {
  address: string;
  check: FailoverCheck;
  interface?: string | null;
  metric?: number | null;
  onlink: boolean;
}

export interface FailoverDhcpInterface {
  name: string;
  check: FailoverCheck;
  interface?: string | null;
  metric?: number | null;
  onlink: boolean;
}

export interface FailoverRoute {
  destination: string;
  next_hops: FailoverNextHop[];
  dhcp_interfaces: FailoverDhcpInterface[];
}

export interface FailoverConfig {
  routes: FailoverRoute[];
}

export interface FailoverFeatureFlag {
  supported: boolean;
}

export interface FailoverValuesFeature extends FailoverFeatureFlag {
  values: string[];
}

export interface FailoverRangeFeature extends FailoverFeatureFlag {
  min: number;
  max: number;
}

export interface FailoverCapabilities {
  version: string;
  features: {
    routes: FailoverFeatureFlag;
    next_hop: FailoverFeatureFlag;
    /** 1.5 only. */
    dhcp_interface: FailoverFeatureFlag;
    /** 1.5 only. */
    check_target_interface: FailoverFeatureFlag;
    /** 1.5 only. */
    check_target_vrf: FailoverFeatureFlag;
    check_policy: FailoverValuesFeature;
    check_type: FailoverValuesFeature;
    check_port: FailoverRangeFeature;
    check_timeout: FailoverRangeFeature;
    metric: FailoverRangeFeature;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface FailoverBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true };

// ============================================================================
// API Service
// ============================================================================

class FailoverService {
  async getCapabilities(): Promise<FailoverCapabilities> {
    return apiClient.get<FailoverCapabilities>("/vyos/failover/capabilities");
  }

  async getConfig(refresh = false): Promise<FailoverConfig> {
    return apiClient.get<FailoverConfig>("/vyos/failover/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  /**
   * Commit one batch for a route; a rejected commit throws its error as an
   * ApiError. An empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(destination: string, operations: FailoverBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/failover/batch", {
      destination,
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    // The commit landed; a failed cache refresh must not report it as failed.
    // The page reloads the config after every save anyway.
    try {
      await this.refreshConfig();
    } catch {
      // ignored on purpose
    }
    return result;
  }

  /** Create a route from the form in one batch. */
  async createRoute(form: FailoverForm, caps: FailoverCapabilities | null): Promise<VyOSResponse> {
    return this.batchConfigure(form.destination.trim(), createRouteOps(form, caps));
  }

  /** Edit a route: only the leaves the form changed are sent. */
  async updateRoute(
    original: FailoverRoute,
    form: FailoverForm,
    caps: FailoverCapabilities | null
  ): Promise<VyOSResponse> {
    return this.batchConfigure(original.destination, updateRouteOps(original, form, caps));
  }

  async deleteRoute(destination: string): Promise<VyOSResponse> {
    return this.batchConfigure(destination, deleteRouteOps());
  }
}

export const failoverService = new FailoverService();
