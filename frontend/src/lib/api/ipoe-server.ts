import { apiClient } from "./client";
import {
  advancedOps,
  authMacOps,
  authModeOps,
  generalOps,
  GLOBAL_ITEM,
  interfaceOps,
  ipPoolOps,
  ipv6PoolOps,
  radiusServerOps,
  radiusSettingsOps,
  text,
  type IPoEAdvancedDraft,
  type IPoEAuthMacDraft,
  type IPoEGeneralDraft,
  type IPoEInterfaceDraft,
  type IPoEIPPoolDraft,
  type IPoEIPv6PoolDraft,
  type IPoERadiusServerDraft,
  type IPoERadiusSettingsDraft,
} from "./ipoe-server-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface IPoERadiusServer {
  address: string;
  key?: string | null;
  port?: string | null;
  acct_port?: string | null;
  priority?: string | null;
  fail_time?: string | null;
  disabled?: boolean;
  backup?: boolean;
  disable_accounting?: boolean;
}

export interface IPoERadiusDynamicAuthor {
  server?: string | null;
  port?: string | null;
  key?: string | null;
}

export interface IPoERadiusRateLimit {
  enable?: boolean;
  attribute?: string | null;
  vendor?: string | null;
  multiplier?: string | null;
}

export interface IPoERadiusSettings {
  servers: IPoERadiusServer[];
  source_address?: string | null;
  timeout?: string | null;
  max_try?: string | null;
  nas_identifier?: string | null;
  nas_ip_address?: string | null;
  accounting_interim_interval?: string | null;
  acct_interim_jitter?: string | null;
  acct_timeout?: string | null;
  preallocate_vif?: boolean;
  dynamic_author?: IPoERadiusDynamicAuthor;
  rate_limit?: IPoERadiusRateLimit;
}

export interface IPoEAuthMac {
  mac: string;
  ip_address?: string | null;
  vlan?: string | null;
  rate_limit?: {
    download?: string | null;
    upload?: string | null;
  };
}

export interface IPoEAuthInterface {
  interface: string;
  macs: IPoEAuthMac[];
}

export interface IPoEAuthentication {
  mode?: string | null;
  interfaces: IPoEAuthInterface[];
  radius: IPoERadiusSettings;
}

export interface IPoEClientIPPool {
  name: string;
  ranges?: string[];
  next_pool?: string | null;
}

export interface IPoEIPv6Prefix {
  prefix: string;
  mask?: string | null;
}

export interface IPoEIPv6Delegate {
  prefix: string;
  delegation_prefix?: string | null;
}

export interface IPoEClientIPv6Pool {
  name: string;
  prefixes?: IPoEIPv6Prefix[];
  delegates?: IPoEIPv6Delegate[];
}

export interface IPoEInterface {
  interface: string;
  mode?: string | null;
  network?: string | null;
  start_session?: string | null;
  client_subnet?: string | null;
  vlans?: string[];
  vlan_mon?: boolean;
  lua_username?: string | null;
  external_dhcp?: {
    dhcp_relay?: string | null;
    giaddr?: string | null;
  } | null;
}

export interface IPoEConfigResponse {
  configured: boolean;
  description?: string | null;
  default_pool?: string | null;
  default_ipv6_pool?: string | null;
  gateway_addresses?: string[];
  name_servers?: string[];
  max_concurrent_sessions?: string | null;
  thread_count?: string | null;
  lua_file?: string | null;
  idle_timeout?: string | null;
  log: { level?: string | null };
  shaper: { enabled?: boolean; fwmark?: string | null };
  snmp: { enabled?: boolean; master_agent?: boolean };
  extended_scripts: {
    on_change?: string | null;
    on_down?: string | null;
    on_pre_up?: string | null;
    on_up?: string | null;
  };
  limits: {
    enabled?: boolean;
    burst?: string | null;
    connection_limit?: string | null;
    timeout?: string | null;
  };
  authentication: IPoEAuthentication;
  client_ip_pools: IPoEClientIPPool[];
  client_ipv6_pools: IPoEClientIPv6Pool[];
  interfaces: IPoEInterface[];
  totals: {
    auth_interfaces: number;
    radius_servers: number;
    client_ip_pools: number;
    client_ipv6_pools: number;
    interfaces: number;
  };
}

export interface IPoECapabilities {
  version: string;
  features: {
    auth_local: boolean;
    auth_radius: boolean;
    auth_noauth: boolean;
    client_ip_pools: boolean;
    client_ipv6_pools: boolean;
    interfaces: boolean;
    vlan_mon: boolean;
    idle_timeout: boolean;
    extended_scripts: boolean;
    shaper: boolean;
    snmp: boolean;
    limits: boolean;
    lua_support: boolean;
  };
  /** Lab ``allowed:`` values for the enumerated leaves. */
  values: {
    auth_modes: string[];
    interface_modes: string[];
    interface_networks: string[];
    start_session: string[];
    log_levels: string[];
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class IPoEServerService {
  async getCapabilities(): Promise<IPoECapabilities> {
    return apiClient.get<IPoECapabilities>("/vyos/ipoe-server/capabilities");
  }

  async getConfig(refresh = false): Promise<IPoEConfigResponse> {
    return apiClient.get<IPoEConfigResponse>("/vyos/ipoe-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ipoe-server/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  /** Post the ops unless the draft changed nothing (an empty batch is a no-op). */
  private async send(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return { success: true };
    return this.batchConfigure(itemName, operations);
  }

  async updateGeneralSettings(
    current: IPoEConfigResponse,
    draft: IPoEGeneralDraft,
    idleTimeoutSupported: boolean,
  ): Promise<VyOSResponse> {
    return this.send(GLOBAL_ITEM, generalOps(current, draft, idleTimeoutSupported));
  }

  async updateAuthMode(current: string | null | undefined, draft: string): Promise<VyOSResponse> {
    return this.send(GLOBAL_ITEM, authModeOps(current, draft));
  }

  async saveInterface(
    current: IPoEInterface | null,
    draft: IPoEInterfaceDraft,
    vlanMonSupported: boolean,
  ): Promise<VyOSResponse> {
    return this.send(current ? current.interface : text(draft.interface), interfaceOps(current, draft, vlanMonSupported));
  }

  async deleteInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_interface" }]);
  }

  async saveAuthMac(current: IPoEAuthMac | null, draft: IPoEAuthMacDraft): Promise<VyOSResponse> {
    return this.send(text(draft.interface), authMacOps(current, draft));
  }

  async deleteAuthMac(iface: string, mac: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_auth_interface_mac", value: mac }]);
  }

  async deleteAuthInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_auth_interface" }]);
  }

  async saveRadiusServer(current: IPoERadiusServer | null, draft: IPoERadiusServerDraft): Promise<VyOSResponse> {
    return this.send(current ? current.address : text(draft.address), radiusServerOps(current, draft));
  }

  async deleteRadiusServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure(address, [{ op: "delete_radius_server" }]);
  }

  async updateRadiusSettings(current: IPoERadiusSettings, draft: IPoERadiusSettingsDraft): Promise<VyOSResponse> {
    return this.send(GLOBAL_ITEM, radiusSettingsOps(current, draft));
  }

  async saveIPPool(current: IPoEClientIPPool | null, draft: IPoEIPPoolDraft): Promise<VyOSResponse> {
    return this.send(current ? current.name : text(draft.name), ipPoolOps(current, draft));
  }

  async deleteIPPool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_pool" }]);
  }

  async saveIPv6Pool(current: IPoEClientIPv6Pool | null, draft: IPoEIPv6PoolDraft): Promise<VyOSResponse> {
    return this.send(current ? current.name : text(draft.name), ipv6PoolOps(current, draft));
  }

  async deleteIPv6Pool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ipv6_pool" }]);
  }

  async updateAdvancedSettings(current: IPoEConfigResponse, draft: IPoEAdvancedDraft): Promise<VyOSResponse> {
    return this.send(GLOBAL_ITEM, advancedOps(current, draft));
  }

  async deleteIPoEServer(): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, [{ op: "delete_ipoe_server" }]);
  }
}

export const ipoeServerService = new IPoEServerService();
