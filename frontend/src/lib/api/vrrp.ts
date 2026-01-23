/**
 * VRRP/High Availability API Service
 * Handles all VRRP and HA related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface VRRPTrack {
  interfaces: string[];
  exclude_vrrp_interface: boolean;
}

export interface VRRPHealthCheck {
  script?: string;
  interval?: string;
  failure_count?: string;
}

export interface VRRPTransitionScripts {
  master?: string;
  backup?: string;
  fault?: string;
  stop?: string;
}

export interface VRRPAuthentication {
  type?: string;
  password?: string;
}

export interface VRRPGroup {
  name: string;
  vrid?: string;
  interface?: string;
  addresses: string[];
  excluded_addresses: string[];
  priority: string;
  disable: boolean;
  no_preempt: boolean;
  preempt_delay?: string;
  rfc3768_compatibility: boolean;
  description?: string;
  hello_source_address?: string;
  peer_addresses: string[];
  track?: VRRPTrack;
  health_check?: VRRPHealthCheck;
  transition_scripts?: VRRPTransitionScripts;
  authentication?: VRRPAuthentication;
}

export interface SyncGroupTransitionScripts {
  master?: string;
  backup?: string;
  fault?: string;
}

export interface VRRPSyncGroup {
  name: string;
  members: string[];
  transition_scripts?: SyncGroupTransitionScripts;
}

export interface VRRPGarp {
  interval?: string;
  master_delay?: string;
  master_refresh?: string;
  master_refresh_repeat?: string;
  master_repeat?: string;
}

export interface VRRPGlobalParameters {
  startup_delay?: string;
  version?: string;
  garp?: VRRPGarp;
}

export interface VirtualServerRealServer {
  address: string;
  port?: string;
}

export interface VirtualServer {
  address: string;
  algorithm?: string;
  forward_method?: string;
  port?: string;
  protocol?: string;
  fwmark?: string;
  delay_loop?: string;
  persistence_timeout?: string;
  real_servers: VirtualServerRealServer[];
}

export interface VRRPConfig {
  configured: boolean;
  groups: VRRPGroup[];
  sync_groups: VRRPSyncGroup[];
  global_parameters?: VRRPGlobalParameters;
  virtual_servers: VirtualServer[];
}

export interface VRRPStatusGroup {
  name: string;
  interface?: string;
  vrid?: string;
  state: string;  // MASTER, BACKUP, FAULT, INIT
  priority?: string;
  effective_priority?: string;
  virtual_address?: string;
  master_ip?: string;
  advertisement_interval?: string;
  last_transition?: string;
}

export interface VRRPStatusResponse {
  success: boolean;
  groups: VRRPStatusGroup[];
  error?: string;
}

export interface VRRPCapabilities {
  authentication_types: { value: string; label: string; description: string }[];
  vrrp_versions: { value: string; label: string; description: string }[];
  vs_algorithms: { value: string; label: string; description: string }[];
  vs_forward_methods: { value: string; label: string; description: string }[];
  vs_protocols: { value: string; label: string; description: string }[];
  priority_range: { min: number; max: number; default: number };
  vrid_range: { min: number; max: number };
  version: string;
}

export interface VRRPOperation {
  op: string;
  name?: string;
  value?: string | number;
  address?: string;
  interface?: string;
  member?: string;
  script?: string;
  auth_type?: string;
  password?: string;
  real_server?: string;
  port?: string | number;
}

export interface VRRPBatchRequest {
  operations: VRRPOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class VRRPService {
  /**
   * Get VRRP/HA configuration
   */
  async getConfig(): Promise<VRRPConfig> {
    return apiClient.get<VRRPConfig>("/vyos/ha/config");
  }

  /**
   * Get VRRP capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<VRRPCapabilities> {
    return apiClient.get<VRRPCapabilities>("/vyos/ha/capabilities");
  }

  /**
   * Get VRRP status (runtime state)
   */
  async getStatus(): Promise<VRRPStatusResponse> {
    return apiClient.get<VRRPStatusResponse>("/vyos/ha/status");
  }

  /**
   * Get virtual server status
   */
  async getVirtualServerStatus(): Promise<{ success: boolean; data: Record<string, unknown>; error?: string }> {
    return apiClient.get("/vyos/ha/virtual-server/status");
  }

  /**
   * Configure VRRP using batch operations
   */
  async configureBatch(request: VRRPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ha/batch", request);
  }

  // =========================================================================
  // VRRP Group Helper Methods
  // =========================================================================

  /**
   * Create a VRRP group
   */
  async createVRRPGroup(
    name: string,
    options: {
      vrid: number;
      interface: string;
      addresses: string[];
      priority?: number;
      description?: string;
      noPreempt?: boolean;
      preemptDelay?: number;
      rfc3768Compatibility?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [
      { op: "create_vrrp_group", name },
      { op: "set_vrrp_group_vrid", name, value: options.vrid },
      { op: "set_vrrp_group_interface", name, value: options.interface },
    ];

    // Add addresses
    for (const address of options.addresses) {
      operations.push({ op: "add_vrrp_group_address", name, value: address });
    }

    if (options.priority) {
      operations.push({ op: "set_vrrp_group_priority", name, value: options.priority });
    }

    if (options.description) {
      operations.push({ op: "set_vrrp_group_description", name, value: options.description });
    }

    if (options.noPreempt) {
      operations.push({ op: "enable_vrrp_group_no_preempt", name });
    }

    if (options.preemptDelay) {
      operations.push({ op: "set_vrrp_group_preempt_delay", name, value: options.preemptDelay });
    }

    if (options.rfc3768Compatibility) {
      operations.push({ op: "enable_vrrp_group_rfc3768", name });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete a VRRP group
   */
  async deleteVRRPGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrrp_group", name }],
    });
  }

  /**
   * Update VRRP group settings
   */
  async updateVRRPGroup(
    name: string,
    options: {
      priority?: number;
      description?: string;
      noPreempt?: boolean;
      preemptDelay?: number;
      rfc3768Compatibility?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [];

    if (options.priority !== undefined) {
      operations.push({ op: "set_vrrp_group_priority", name, value: options.priority });
    }

    if (options.description !== undefined) {
      if (options.description) {
        operations.push({ op: "set_vrrp_group_description", name, value: options.description });
      } else {
        operations.push({ op: "delete_vrrp_group_description", name });
      }
    }

    if (options.noPreempt !== undefined) {
      operations.push({
        op: options.noPreempt ? "enable_vrrp_group_no_preempt" : "disable_vrrp_group_no_preempt",
        name,
      });
    }

    if (options.preemptDelay !== undefined) {
      if (options.preemptDelay > 0) {
        operations.push({ op: "set_vrrp_group_preempt_delay", name, value: options.preemptDelay });
      } else {
        operations.push({ op: "delete_vrrp_group_preempt_delay", name });
      }
    }

    if (options.rfc3768Compatibility !== undefined) {
      operations.push({
        op: options.rfc3768Compatibility ? "enable_vrrp_group_rfc3768" : "disable_vrrp_group_rfc3768",
        name,
      });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Enable a VRRP group
   */
  async enableVRRPGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_vrrp_group", name }],
    });
  }

  /**
   * Disable a VRRP group
   */
  async disableVRRPGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_vrrp_group", name }],
    });
  }

  /**
   * Add an address to a VRRP group
   */
  async addVRRPGroupAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_vrrp_group_address", name, value: address }],
    });
  }

  /**
   * Remove an address from a VRRP group
   */
  async removeVRRPGroupAddress(name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrrp_group_address", name, value: address }],
    });
  }

  /**
   * Configure VRRP group unicast mode
   */
  async configureVRRPGroupUnicast(
    name: string,
    options: {
      peerAddress: string;
      helloSourceAddress?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [
      { op: "set_vrrp_group_peer_address", name, value: options.peerAddress },
    ];

    if (options.helloSourceAddress) {
      operations.push({
        op: "set_vrrp_group_hello_source_address",
        name,
        value: options.helloSourceAddress,
      });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Configure VRRP group interface tracking
   */
  async addVRRPGroupTrackInterface(name: string, trackInterface: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_vrrp_group_track_interface", name, interface: trackInterface }],
    });
  }

  /**
   * Remove interface tracking from VRRP group
   */
  async removeVRRPGroupTrackInterface(name: string, trackInterface: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrrp_group_track_interface", name, interface: trackInterface }],
    });
  }

  /**
   * Configure VRRP group health check
   */
  async configureVRRPGroupHealthCheck(
    name: string,
    options: {
      script: string;
      interval?: number;
      failureCount?: number;
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [
      { op: "set_vrrp_group_health_check_script", name, script: options.script },
    ];

    if (options.interval) {
      operations.push({ op: "set_vrrp_group_health_check_interval", name, value: options.interval });
    }

    if (options.failureCount) {
      operations.push({ op: "set_vrrp_group_health_check_failure_count", name, value: options.failureCount });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Remove health check from VRRP group
   */
  async removeVRRPGroupHealthCheck(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrrp_group_health_check", name }],
    });
  }

  /**
   * Configure VRRP group transition scripts
   */
  async configureVRRPGroupTransitionScripts(
    name: string,
    scripts: {
      master?: string;
      backup?: string;
      fault?: string;
      stop?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [];

    if (scripts.master) {
      operations.push({ op: "set_vrrp_group_transition_script_master", name, script: scripts.master });
    }

    if (scripts.backup) {
      operations.push({ op: "set_vrrp_group_transition_script_backup", name, script: scripts.backup });
    }

    if (scripts.fault) {
      operations.push({ op: "set_vrrp_group_transition_script_fault", name, script: scripts.fault });
    }

    if (scripts.stop) {
      operations.push({ op: "set_vrrp_group_transition_script_stop", name, script: scripts.stop });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Configure VRRP group authentication
   */
  async configureVRRPGroupAuthentication(
    name: string,
    authType: string,
    password: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "set_vrrp_group_authentication",
        name,
        auth_type: authType,
        password,
      }],
    });
  }

  /**
   * Remove authentication from VRRP group
   */
  async removeVRRPGroupAuthentication(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_vrrp_group_authentication", name }],
    });
  }

  // =========================================================================
  // Sync Group Helper Methods
  // =========================================================================

  /**
   * Create a sync group
   */
  async createSyncGroup(name: string, members: string[]): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [{ op: "create_sync_group", name }];

    for (const member of members) {
      operations.push({ op: "add_sync_group_member", name, member });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete a sync group
   */
  async deleteSyncGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_sync_group", name }],
    });
  }

  /**
   * Add a member to a sync group
   */
  async addSyncGroupMember(name: string, member: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_sync_group_member", name, member }],
    });
  }

  /**
   * Remove a member from a sync group
   */
  async removeSyncGroupMember(name: string, member: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_sync_group_member", name, member }],
    });
  }

  // =========================================================================
  // Global Parameters Helper Methods
  // =========================================================================

  /**
   * Set global VRRP version
   */
  async setGlobalVersion(version: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_global_version", value: version }],
    });
  }

  /**
   * Set global startup delay
   */
  async setGlobalStartupDelay(delay: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_global_startup_delay", value: delay }],
    });
  }

  /**
   * Configure global GARP settings
   */
  async configureGlobalGarp(options: {
    interval?: number;
    masterDelay?: number;
    masterRefresh?: number;
    masterRefreshRepeat?: number;
    masterRepeat?: number;
  }): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [];

    if (options.interval !== undefined) {
      operations.push({ op: "set_global_garp_interval", value: options.interval });
    }

    if (options.masterDelay !== undefined) {
      operations.push({ op: "set_global_garp_master_delay", value: options.masterDelay });
    }

    if (options.masterRefresh !== undefined) {
      operations.push({ op: "set_global_garp_master_refresh", value: options.masterRefresh });
    }

    if (options.masterRefreshRepeat !== undefined) {
      operations.push({ op: "set_global_garp_master_refresh_repeat", value: options.masterRefreshRepeat });
    }

    if (options.masterRepeat !== undefined) {
      operations.push({ op: "set_global_garp_master_repeat", value: options.masterRepeat });
    }

    return this.configureBatch({ operations });
  }

  // =========================================================================
  // Virtual Server Helper Methods
  // =========================================================================

  /**
   * Create a virtual server
   */
  async createVirtualServer(
    address: string,
    options: {
      port: number;
      protocol: string;
      algorithm?: string;
      forwardMethod?: string;
      realServers?: { address: string; port?: number }[];
    }
  ): Promise<VyOSResponse> {
    const operations: VRRPOperation[] = [
      { op: "create_virtual_server", address },
      { op: "set_vs_port", address, value: options.port },
      { op: "set_vs_protocol", address, value: options.protocol },
    ];

    if (options.algorithm) {
      operations.push({ op: "set_vs_algorithm", address, value: options.algorithm });
    }

    if (options.forwardMethod) {
      operations.push({ op: "set_vs_forward_method", address, value: options.forwardMethod });
    }

    if (options.realServers) {
      for (const rs of options.realServers) {
        operations.push({
          op: "add_vs_real_server",
          address,
          real_server: rs.address,
          port: rs.port,
        });
      }
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete a virtual server
   */
  async deleteVirtualServer(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_virtual_server", address }],
    });
  }

  /**
   * Add a real server to virtual server
   */
  async addVirtualServerRealServer(
    vsAddress: string,
    realServer: string,
    port?: number
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_vs_real_server",
        address: vsAddress,
        real_server: realServer,
        port,
      }],
    });
  }

  /**
   * Remove a real server from virtual server
   */
  async removeVirtualServerRealServer(vsAddress: string, realServer: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "delete_vs_real_server",
        address: vsAddress,
        real_server: realServer,
      }],
    });
  }
}

export const vrrpService = new VRRPService();
