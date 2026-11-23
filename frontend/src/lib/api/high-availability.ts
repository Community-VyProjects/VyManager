import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  haGlobalsSaveOps,
  virtualServerSaveOps,
  vrrpGroupSaveOps,
  vrrpSyncGroupSaveOps,
  type HAGlobalsDraft,
  type HAGlobalsSaveOptions,
  type VirtualServerDraft,
  type VrrpGroupDraft,
  type VrrpGroupSaveOptions,
  type VrrpSyncGroupDraft,
  type VrrpSyncGroupSaveOptions,
} from "./high-availability-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VrrpGroupAddress {
  address: string;
  interface?: string | null;
}

export interface VrrpGroupAuthentication {
  type?: string | null;
  /** "***" when a password is stored; the config route never returns it. */
  password?: string | null;
}

export interface VrrpGroupHealthCheck {
  failure_count?: string | null;
  interval?: string | null;
  ping?: string | null;
  script?: string | null;
  timeout?: string | null;
}

export interface VrrpGroupTrack {
  interfaces: string[];
  exclude_vrrp_interface: boolean;
}

export interface VrrpGroupTransitionScript {
  backup?: string | null;
  fault?: string | null;
  master?: string | null;
  stop?: string | null;
}

export interface VrrpGarp {
  interval?: string | null;
  master_delay?: string | null;
  master_refresh?: string | null;
  master_refresh_repeat?: string | null;
  master_repeat?: string | null;
}

export interface VrrpGroup {
  name: string;
  vrid?: string | null;
  interface?: string | null;
  addresses: VrrpGroupAddress[];
  excluded_addresses: VrrpGroupAddress[];
  priority?: string | null;
  advertise_interval?: string | null;
  authentication?: VrrpGroupAuthentication | null;
  preempt_delay?: string | null;
  no_preempt: boolean;
  peer_addresses: string[];
  hello_source_address?: string | null;
  rfc3768_compatibility: boolean;
  disabled: boolean;
  description?: string | null;
  garp: VrrpGarp;
  health_check: VrrpGroupHealthCheck;
  track: VrrpGroupTrack;
  transition_script: VrrpGroupTransitionScript;
}

export interface VrrpSyncGroup {
  name: string;
  members: string[];
  health_check: VrrpGroupHealthCheck;
  transition_script: VrrpGroupTransitionScript;
}

export interface VrrpGlobalParameters {
  startup_delay?: string | null;
  version?: string | null;
  garp: VrrpGarp;
}

export interface VrrpConfig {
  global_parameters: VrrpGlobalParameters;
  snmp: boolean;
  snmp_trap: boolean;
  groups: VrrpGroup[];
  sync_groups: VrrpSyncGroup[];
}

export interface RealServer {
  address: string;
  port?: string | null;
  connection_timeout?: string | null;
  health_check_script?: string | null;
}

export interface VirtualServer {
  name: string;
  address?: string | null;
  algorithm?: string | null;
  delay_loop?: string | null;
  forward_method?: string | null;
  fwmark?: string | null;
  persistence_timeout?: string | null;
  port?: string | null;
  protocol?: string | null;
  real_servers: RealServer[];
}

export interface HAConfig {
  disabled: boolean;
  vrrp: VrrpConfig;
  virtual_servers: VirtualServer[];
}

export interface HACapabilities {
  forward_methods: string[];
  algorithms: string[];
  protocols: string[];
  auth_types: string[];
  vrrp_versions: string[];
  features: {
    vrrp_snmp_trap: { supported: boolean; description: string };
    health_check_timeout: { supported: boolean; description: string };
    sync_group_health_check_timeout: { supported: boolean; description: string };
  };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
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

class HighAvailabilityService {
  async getCapabilities(): Promise<HACapabilities> {
    return apiClient.get<HACapabilities>("/vyos/high-availability/capabilities");
  }

  async getConfig(refresh = false): Promise<HAConfig> {
    return apiClient.get<HAConfig>("/vyos/high-availability/config", {
      refresh: refresh.toString(),
    });
  }

  /** One commit for one object (global ops ignore itemName). Throws ApiError on a rejected commit. */
  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/high-availability/batch", {
      item_name: itemName,
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  // ---- VRRP Groups ----

  async saveVrrpGroup(
    original: VrrpGroup | null,
    draft: VrrpGroupDraft,
    options: VrrpGroupSaveOptions,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(draft.name.trim(), vrrpGroupSaveOps(original, draft, options));
  }

  async deleteVrrpGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_vrrp_group" }]);
  }

  async setVrrpGroupDisabled(name: string, disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: disabled ? "set_vrrp_group_disable" : "delete_vrrp_group_disable" }]);
  }

  // ---- Sync Groups ----

  async saveSyncGroup(
    original: VrrpSyncGroup | null,
    draft: VrrpSyncGroupDraft,
    options: VrrpSyncGroupSaveOptions,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(draft.name.trim(), vrrpSyncGroupSaveOps(original, draft, options));
  }

  async deleteSyncGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_vrrp_sync_group" }]);
  }

  // ---- Virtual Servers ----

  async saveVirtualServer(original: VirtualServer | null, draft: VirtualServerDraft): Promise<VyOSResponse> {
    return this.batchConfigure(draft.name.trim(), virtualServerSaveOps(original, draft));
  }

  async deleteVirtualServer(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_virtual_server" }]);
  }

  // ---- Global Settings ----

  async saveGlobals(config: HAConfig, draft: HAGlobalsDraft, options: HAGlobalsSaveOptions): Promise<VyOSResponse> {
    return this.batchConfigure("", haGlobalsSaveOps(config, draft, options));
  }

  async setHaDisabled(disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure("", [{ op: disabled ? "set_ha_disable" : "delete_ha_disable" }]);
  }
}

export const haService = new HighAvailabilityService();
