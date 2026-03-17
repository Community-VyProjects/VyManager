import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VrrpGroupAddress {
  address: string;
  interface?: string | null;
}

export interface VrrpGroupAuthentication {
  type?: string | null;
  password?: string | null;
}

export interface VrrpGroupHealthCheck {
  failure_count?: string | null;
  interval?: string | null;
  ping?: string | null;
  script?: string | null;
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
  garp?: Record<string, string | null>;
}

export interface VrrpConfig {
  global_parameters: VrrpGlobalParameters;
  snmp: boolean;
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
  version: string;
  features: {
    vrrp: { supported: boolean; description: string };
    virtual_server: { supported: boolean; description: string };
    vrrp_snmp: { supported: boolean; description: string };
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

// ============================================================================
// Operation Builders
// ============================================================================

function buildVrrpGroupOps(group: VrrpGroup): BatchOperation[] {
  const ops: BatchOperation[] = [{ op: "create_vrrp_group" }];

  if (group.vrid) ops.push({ op: "set_vrrp_group_vrid", value: group.vrid });
  if (group.interface) ops.push({ op: "set_vrrp_group_interface", value: group.interface });
  if (group.description) ops.push({ op: "set_vrrp_group_description", value: group.description });
  if (group.priority) ops.push({ op: "set_vrrp_group_priority", value: group.priority });
  if (group.advertise_interval) ops.push({ op: "set_vrrp_group_advertise_interval", value: group.advertise_interval });

  for (const addr of group.addresses) {
    ops.push({ op: "set_vrrp_group_address", value: addr.address });
    if (addr.interface) {
      ops.push({ op: "set_vrrp_group_address_interface", value: `${addr.address}|${addr.interface}` });
    }
  }

  for (const addr of group.excluded_addresses) {
    ops.push({ op: "set_vrrp_group_excluded_address", value: addr.address });
    if (addr.interface) {
      ops.push({ op: "set_vrrp_group_excluded_address_interface", value: `${addr.address}|${addr.interface}` });
    }
  }

  if (group.authentication?.type) {
    ops.push({ op: "set_vrrp_group_auth_type", value: group.authentication.type });
    if (group.authentication.password) {
      ops.push({ op: "set_vrrp_group_auth_password", value: group.authentication.password });
    }
  }

  if (group.preempt_delay) ops.push({ op: "set_vrrp_group_preempt_delay", value: group.preempt_delay });
  if (group.no_preempt) ops.push({ op: "set_vrrp_group_no_preempt" });
  if (group.hello_source_address) ops.push({ op: "set_vrrp_group_hello_source_address", value: group.hello_source_address });
  if (group.rfc3768_compatibility) ops.push({ op: "set_vrrp_group_rfc3768_compatibility" });
  if (group.disabled) ops.push({ op: "set_vrrp_group_disable" });

  for (const peer of group.peer_addresses) {
    ops.push({ op: "set_vrrp_group_peer_address", value: peer });
  }

  for (const iface of group.track.interfaces) {
    ops.push({ op: "set_vrrp_group_track_interface", value: iface });
  }
  if (group.track.exclude_vrrp_interface) {
    ops.push({ op: "set_vrrp_group_track_exclude_vrrp_interface" });
  }

  if (group.health_check.failure_count) ops.push({ op: "set_vrrp_group_health_check_failure_count", value: group.health_check.failure_count });
  if (group.health_check.interval) ops.push({ op: "set_vrrp_group_health_check_interval", value: group.health_check.interval });
  if (group.health_check.ping) ops.push({ op: "set_vrrp_group_health_check_ping", value: group.health_check.ping });
  if (group.health_check.script) ops.push({ op: "set_vrrp_group_health_check_script", value: group.health_check.script });

  return ops;
}

function buildSyncGroupOps(group: VrrpSyncGroup): BatchOperation[] {
  const ops: BatchOperation[] = [{ op: "create_vrrp_sync_group" }];

  for (const member of group.members) {
    ops.push({ op: "set_vrrp_sync_group_member", value: member });
  }

  if (group.health_check.failure_count) ops.push({ op: "set_vrrp_sync_group_health_check_failure_count", value: group.health_check.failure_count });
  if (group.health_check.interval) ops.push({ op: "set_vrrp_sync_group_health_check_interval", value: group.health_check.interval });
  if (group.health_check.ping) ops.push({ op: "set_vrrp_sync_group_health_check_ping", value: group.health_check.ping });
  if (group.health_check.script) ops.push({ op: "set_vrrp_sync_group_health_check_script", value: group.health_check.script });

  return ops;
}

function buildVirtualServerOps(vs: VirtualServer): BatchOperation[] {
  const ops: BatchOperation[] = [{ op: "create_virtual_server" }];

  if (vs.address) ops.push({ op: "set_virtual_server_address", value: vs.address });
  if (vs.port) ops.push({ op: "set_virtual_server_port", value: vs.port });
  if (vs.protocol) ops.push({ op: "set_virtual_server_protocol", value: vs.protocol });
  if (vs.algorithm) ops.push({ op: "set_virtual_server_algorithm", value: vs.algorithm });
  if (vs.forward_method) ops.push({ op: "set_virtual_server_forward_method", value: vs.forward_method });
  if (vs.delay_loop) ops.push({ op: "set_virtual_server_delay_loop", value: vs.delay_loop });
  if (vs.persistence_timeout) ops.push({ op: "set_virtual_server_persistence_timeout", value: vs.persistence_timeout });
  if (vs.fwmark) ops.push({ op: "set_virtual_server_fwmark", value: vs.fwmark });

  for (const rs of vs.real_servers) {
    ops.push({ op: "set_virtual_server_real_server", value: rs.address });
    if (rs.port) ops.push({ op: "set_virtual_server_real_server_port", value: `${rs.address}|${rs.port}` });
    if (rs.connection_timeout) ops.push({ op: "set_virtual_server_real_server_connection_timeout", value: `${rs.address}|${rs.connection_timeout}` });
    if (rs.health_check_script) ops.push({ op: "set_virtual_server_real_server_health_check_script", value: `${rs.address}|${rs.health_check_script}` });
  }

  return ops;
}

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

  private async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/high-availability/batch", {
      item_name: itemName,
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  // ---- VRRP Groups ----

  async createVrrpGroup(group: VrrpGroup): Promise<VyOSResponse> {
    return this.batchConfigure(group.name, buildVrrpGroupOps(group));
  }

  async updateVrrpGroup(original: VrrpGroup, updated: VrrpGroup): Promise<VyOSResponse> {
    if (original.name !== updated.name) {
      // Name changed: two commits
      await this.batchConfigure(original.name, [{ op: "delete_vrrp_group" }]);
      return this.batchConfigure(updated.name, buildVrrpGroupOps(updated));
    }
    // Same name: delete + recreate in single commit
    const ops = [{ op: "delete_vrrp_group" }, ...buildVrrpGroupOps(updated)];
    return this.batchConfigure(updated.name, ops);
  }

  async deleteVrrpGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_vrrp_group" }]);
  }

  async toggleVrrpGroup(name: string, disabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: disabled ? "set_vrrp_group_disable" : "delete_vrrp_group_disable" }]);
  }

  // ---- Sync Groups ----

  async createSyncGroup(group: VrrpSyncGroup): Promise<VyOSResponse> {
    return this.batchConfigure(group.name, buildSyncGroupOps(group));
  }

  async updateSyncGroup(original: VrrpSyncGroup, updated: VrrpSyncGroup): Promise<VyOSResponse> {
    if (original.name !== updated.name) {
      await this.batchConfigure(original.name, [{ op: "delete_vrrp_sync_group" }]);
      return this.batchConfigure(updated.name, buildSyncGroupOps(updated));
    }
    const ops = [{ op: "delete_vrrp_sync_group" }, ...buildSyncGroupOps(updated)];
    return this.batchConfigure(updated.name, ops);
  }

  async deleteSyncGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_vrrp_sync_group" }]);
  }

  // ---- Virtual Servers ----

  async createVirtualServer(vs: VirtualServer): Promise<VyOSResponse> {
    return this.batchConfigure(vs.name, buildVirtualServerOps(vs));
  }

  async updateVirtualServer(original: VirtualServer, updated: VirtualServer): Promise<VyOSResponse> {
    if (original.name !== updated.name) {
      await this.batchConfigure(original.name, [{ op: "delete_virtual_server" }]);
      return this.batchConfigure(updated.name, buildVirtualServerOps(updated));
    }
    const ops = [{ op: "delete_virtual_server" }, ...buildVirtualServerOps(updated)];
    return this.batchConfigure(updated.name, ops);
  }

  async deleteVirtualServer(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_virtual_server" }]);
  }

  // ---- Global Settings ----

  async updateGlobalSettings(settings: {
    startup_delay?: string | null;
    version?: string | null;
    snmp?: boolean;
    disabled?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (settings.startup_delay !== undefined) {
      ops.push(settings.startup_delay
        ? { op: "set_vrrp_global_startup_delay", value: settings.startup_delay }
        : { op: "delete_vrrp_global_startup_delay" });
    }

    if (settings.version !== undefined) {
      ops.push(settings.version
        ? { op: "set_vrrp_global_version", value: settings.version }
        : { op: "delete_vrrp_global_version" });
    }

    if (settings.snmp !== undefined) {
      ops.push({ op: settings.snmp ? "set_vrrp_snmp" : "delete_vrrp_snmp" });
    }

    if (settings.disabled !== undefined) {
      ops.push({ op: settings.disabled ? "set_ha_disable" : "delete_ha_disable" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure("", ops);
  }
}

export const haService = new HighAvailabilityService();
