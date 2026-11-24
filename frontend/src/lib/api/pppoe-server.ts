import { apiClient } from "./client";
import type { ApiError } from "@/lib/types/api";
import {
  advancedOps,
  authOps,
  generalOps,
  GLOBAL_ITEM,
  interfaceOps,
  ipPoolOps,
  ipv6PoolOps,
  localUserOps,
  pppOptionsOps,
  radiusServerOps,
  radiusSettingsOps,
  text,
  type PPPoEAdvancedDraft,
  type PPPoEAuthDraft,
  type PPPoEGeneralDraft,
  type PPPoEInterfaceDraft,
  type PPPoEIPPoolDraft,
  type PPPoEIPv6PoolDraft,
  type PPPoELocalUserDraft,
  type PPPoEPppOptionsDraft,
  type PPPoERadiusServerDraft,
  type PPPoERadiusSettingsDraft,
} from "./pppoe-server-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PPPoELocalUser {
  username: string;
  /** The mask when a password is stored. */
  password?: string | null;
  disabled: boolean;
  static_ip?: string | null;
  rate_limit: {
    download?: string | null;
    upload?: string | null;
  };
}

export interface PPPoEPadoDelay {
  delay: string;
  sessions?: string | null;
}

export interface PPPoEPppOptions {
  ipv4?: string | null;
  ipv6?: string | null;
  mppe?: string | null;
  disable_ccp: boolean;
  interface_cache?: string | null;
  ipv6_interface_id?: string | null;
  ipv6_peer_interface_id?: string | null;
  /** 1.5 only; the mask when stored. */
  ipv6_peer_interface_id_secret?: string | null;
  ipv6_accept_peer_interface_id: boolean;
  lcp_echo_failure?: string | null;
  lcp_echo_interval?: string | null;
  lcp_echo_timeout?: string | null;
  min_mtu?: string | null;
  mru?: string | null;
}

export interface PPPoERadiusServer {
  address: string;
  /** The mask when a key is stored. */
  key?: string | null;
  port?: string | null;
  acct_port?: string | null;
  priority?: string | null;
  fail_time?: string | null;
  disabled: boolean;
  backup: boolean;
  disable_accounting: boolean;
}

export interface PPPoERadiusDynamicAuthor {
  server?: string | null;
  port?: string | null;
  /** The mask when a key is stored. */
  key?: string | null;
}

export interface PPPoERadiusRateLimit {
  enable: boolean;
  attribute?: string | null;
  vendor?: string | null;
  multiplier?: string | null;
}

export interface PPPoERadiusSettings {
  servers: PPPoERadiusServer[];
  source_address?: string | null;
  timeout?: string | null;
  max_try?: string | null;
  nas_identifier?: string | null;
  nas_ip_address?: string | null;
  accounting_interim_interval?: string | null;
  acct_interim_jitter?: string | null;
  acct_timeout?: string | null;
  preallocate_vif: boolean;
  called_sid_format?: string | null;
  dynamic_author: PPPoERadiusDynamicAuthor;
  rate_limit: PPPoERadiusRateLimit;
}

export interface PPPoEAuthentication {
  mode?: string | null;
  protocols: string[];
  any_login: boolean;
  local_users: PPPoELocalUser[];
  radius: PPPoERadiusSettings;
}

export interface PPPoEIPv4Pool {
  name: string;
  ranges: string[];
  next_pool?: string | null;
}

export interface PPPoEIPv6Prefix {
  prefix: string;
  mask?: string | null;
}

export interface PPPoEIPv6Delegate {
  prefix: string;
  delegation_prefix?: string | null;
}

export interface PPPoEIPv6Pool {
  name: string;
  prefixes: PPPoEIPv6Prefix[];
  delegates: PPPoEIPv6Delegate[];
}

export interface PPPoEInterface {
  interface: string;
  vlans: string[];
  vlan_mon: boolean;
  /** Valueless flag. */
  combined: boolean;
}

export interface PPPoEConfigResponse {
  configured: boolean;
  description?: string | null;
  access_concentrator?: string | null;
  service_names: string[];
  gateway_address?: string | null;
  name_servers: string[];
  wins_servers: string[];
  mtu?: string | null;
  max_concurrent_sessions?: string | null;
  thread_count?: string | null;
  default_pool?: string | null;
  default_ipv6_pool?: string | null;
  session_control?: string | null;
  accept_any_service: boolean;
  accept_blank_service: boolean;
  pado_delays: PPPoEPadoDelay[];
  log: { level?: string | null };
  /** `enabled` is the node itself: a bare node turns the module on. */
  shaper: { enabled: boolean; fwmark?: string | null };
  snmp: { enabled: boolean; master_agent: boolean };
  extended_scripts: {
    enabled: boolean;
    on_change?: string | null;
    on_down?: string | null;
    on_pre_up?: string | null;
    on_up?: string | null;
  };
  limits: {
    enabled: boolean;
    burst?: string | null;
    connection_limit?: string | null;
    timeout?: string | null;
  };
  ppp_options: PPPoEPppOptions;
  authentication: PPPoEAuthentication;
  client_ip_pools: PPPoEIPv4Pool[];
  client_ipv6_pools: PPPoEIPv6Pool[];
  interfaces: PPPoEInterface[];
  totals: {
    local_users: number;
    radius_servers: number;
    client_ip_pools: number;
    client_ipv6_pools: number;
    interfaces: number;
  };
}

export interface PPPoESession {
  interface: string;
  username: string;
  ip?: string | null;
  ipv6?: string | null;
  ipv6_delegated?: string | null;
  calling_sid?: string | null;
  rate_limit?: string | null;
  state: string;
  uptime?: string | null;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number | null;
  tx_packets: number | null;
  rx_pps: number | null;
  tx_pps: number | null;
  mtu?: number | null;
}

export interface PPPoESessionsResponse {
  sessions: PPPoESession[];
  total: number;
}

export interface PPPoESessionLabelRule {
  type?: "ratio";
  numerator?: "tx_bytes" | "rx_bytes" | "txRate" | "rxRate";
  denominator?: "tx_bytes" | "rx_bytes" | "txRate" | "rxRate";
  operator?: ">" | ">=" | "<" | "<=";
  factor?: number;
}

/** Column bounds of the session label table; the backend 400s past them. */
export const PPPOE_LABEL_LIMITS = {
  code: 80,
  name: 120,
  priorityMin: -2147483648,
  priorityMax: 2147483647,
} as const;

/** A label priority the table accepts: an integer inside the column range. */
export function labelPriorityValid(priority: number | undefined): boolean {
  const value = priority ?? 10;
  return Number.isInteger(value)
    && value >= PPPOE_LABEL_LIMITS.priorityMin
    && value <= PPPOE_LABEL_LIMITS.priorityMax;
}

export interface PPPoESessionLabelDefinition {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  severity?: string;
  priority?: number;
  enabled?: boolean;
  rules?: PPPoESessionLabelRule | null;
}

export interface PPPoECapabilities {
  version: string;
  features: {
    auth_local: boolean;
    auth_radius: boolean;
    auth_noauth: boolean;
    auth_protocols: boolean;
    /** 1.5 only. */
    auth_any_login: boolean;
    local_users: boolean;
    client_ip_pools: boolean;
    client_ipv6_pools: boolean;
    interfaces: boolean;
    /** 1.5 only. */
    vlan_mon: boolean;
    /** 1.5 only. */
    ipv6_peer_interface_id_secret: boolean;
    ppp_options: boolean;
    pado_delay: boolean;
    session_control: boolean;
    extended_scripts: boolean;
    shaper: boolean;
    snmp: boolean;
    limits: boolean;
    wins_server: boolean;
    called_sid_format: boolean;
  };
  /** Lab ``allowed:`` values for the enumerated leaves. */
  values: {
    auth_modes: string[];
    auth_protocols: string[];
    called_sid_formats: string[];
    /** ``ppp-options ipv4`` and ``ipv6``. */
    ppp_negotiation_modes: string[];
    mppe_modes: string[];
    /** Keywords besides x:x:x:x. */
    ipv6_interface_id_keywords: string[];
    /** Keywords besides x:x:x:x. */
    ipv6_peer_interface_id_keywords: string[];
    session_control_modes: string[];
    /** Keywords besides a number. */
    thread_count_keywords: string[];
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

class PPPoEServerService {
  async getSessionLabelDefinitions(): Promise<PPPoESessionLabelDefinition[]> {
    return apiClient.get<PPPoESessionLabelDefinition[]>("/vyos/pppoe-server/labels");
  }

  async saveSessionLabelDefinitions(labels: PPPoESessionLabelDefinition[]): Promise<PPPoESessionLabelDefinition[]> {
    return apiClient.post<PPPoESessionLabelDefinition[]>("/vyos/pppoe-server/labels", labels);
  }

  async getCapabilities(): Promise<PPPoECapabilities> {
    return apiClient.get<PPPoECapabilities>("/vyos/pppoe-server/capabilities");
  }

  async getConfig(refresh = false): Promise<PPPoEConfigResponse> {
    return apiClient.get<PPPoEConfigResponse>("/vyos/pppoe-server/config", {
      refresh: refresh.toString(),
    });
  }

  async getSessions(
    limit = 500,
    offset = 0,
    filters: Record<string, string | number | undefined> = {},
  ): Promise<PPPoESessionsResponse> {
    return apiClient.get<PPPoESessionsResponse>("/vyos/pppoe-server/sessions", {
      limit: String(limit),
      offset: String(offset),
      ...Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });
  }

  async resetSession(username: string): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>(
      `/vyos/pppoe-server/sessions/${encodeURIComponent(username)}/reset`,
    );
  }

  private async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. A
   * draft that changed nothing has nothing to send, so no POST is made.
   */
  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return { success: true };
    const result = await apiClient.post<VyOSResponse>("/vyos/pppoe-server/batch", {
      item_name: itemName,
      operations,
    });
    if (!result.success) throw { message: result.error || "" } as ApiError;
    // The commit landed; a failed cache refresh must not report it as failed.
    // The page reloads the config after every save anyway.
    try {
      await this.refreshConfig();
    } catch {
      // ignored on purpose
    }
    return result;
  }

  async updateGeneralSettings(current: PPPoEConfigResponse, draft: PPPoEGeneralDraft): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, generalOps(current, draft));
  }

  async updateAuthSettings(
    current: PPPoEAuthentication,
    draft: PPPoEAuthDraft,
    anyLoginSupported: boolean,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, authOps(current, draft, anyLoginSupported));
  }

  async saveLocalUser(current: PPPoELocalUser | null, draft: PPPoELocalUserDraft): Promise<VyOSResponse> {
    return this.batchConfigure(current ? current.username : text(draft.username), localUserOps(current, draft));
  }

  async deleteLocalUser(username: string): Promise<VyOSResponse> {
    return this.batchConfigure(username, [{ op: "delete_local_user" }]);
  }

  async saveRadiusServer(current: PPPoERadiusServer | null, draft: PPPoERadiusServerDraft): Promise<VyOSResponse> {
    return this.batchConfigure(current ? current.address : text(draft.address), radiusServerOps(current, draft));
  }

  async deleteRadiusServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure(address, [{ op: "delete_radius_server" }]);
  }

  async updateRadiusSettings(current: PPPoERadiusSettings, draft: PPPoERadiusSettingsDraft): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, radiusSettingsOps(current, draft));
  }

  async saveIPPool(current: PPPoEIPv4Pool | null, draft: PPPoEIPPoolDraft): Promise<VyOSResponse> {
    return this.batchConfigure(current ? current.name : text(draft.name), ipPoolOps(current, draft));
  }

  async deleteIPPool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_pool" }]);
  }

  async saveIPv6Pool(current: PPPoEIPv6Pool | null, draft: PPPoEIPv6PoolDraft): Promise<VyOSResponse> {
    return this.batchConfigure(current ? current.name : text(draft.name), ipv6PoolOps(current, draft));
  }

  async deleteIPv6Pool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ipv6_pool" }]);
  }

  async saveInterface(
    current: PPPoEInterface | null,
    draft: PPPoEInterfaceDraft,
    vlanMonSupported: boolean,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(current ? current.interface : text(draft.interface), interfaceOps(current, draft, vlanMonSupported));
  }

  async deleteInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure(iface, [{ op: "delete_interface" }]);
  }

  async updatePPPOptions(
    current: PPPoEPppOptions,
    draft: PPPoEPppOptionsDraft,
    secretSupported: boolean,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, pppOptionsOps(current, draft, secretSupported));
  }

  async updateAdvancedSettings(current: PPPoEConfigResponse, draft: PPPoEAdvancedDraft): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, advancedOps(current, draft));
  }

  async deletePPPoEServer(): Promise<VyOSResponse> {
    return this.batchConfigure(GLOBAL_ITEM, [{ op: "delete_pppoe_server" }]);
  }
}

export const pppoeServerService = new PPPoEServerService();
