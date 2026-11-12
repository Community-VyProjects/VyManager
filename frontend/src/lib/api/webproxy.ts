import { apiClient } from "./client";
import {
  authenticationOps,
  cachePeerOps,
  listenAddressOps,
  ruleOps,
  settingsOps,
  sourceGroupOps,
  squidGuardGlobalOps,
  timePeriodOps,
} from "./webproxy-save-ops";

// ============================================================================
// Types
// ============================================================================

export interface WebProxyLdap {
  server?: string | null;
  base_dn?: string | null;
  bind_dn?: string | null;
  filter_expression?: string | null;
  password?: string | null;
  username_attribute?: string | null;
  port?: number | null;
  version?: string | null;
  persistent_connection: boolean;
  use_ssl: boolean;
}

export interface WebProxyAuthentication {
  children?: number | null;
  credentials_ttl?: number | null;
  method?: string | null;
  realm?: string | null;
  ldap: WebProxyLdap;
}

export interface CachePeer {
  name: string;
  address?: string | null;
  http_port?: number | null;
  icp_port?: number | null;
  options?: string | null;
  type?: string | null;
}

export interface ListenAddress {
  address: string;
  port?: number | null;
  disable_transparent: boolean;
}

export interface SquidGuardRule {
  number: string;
  allow_categories: string[];
  block_categories: string[];
  log: string[];
  local_block: string[];
  local_block_keyword: string[];
  local_block_url: string[];
  local_ok: string[];
  local_ok_url: string[];
  allow_ipaddr_url: boolean;
  enable_safe_search: boolean;
  default_action?: string | null;
  redirect_url?: string | null;
  source_group?: string | null;
  time_period?: string | null;
}

export interface SquidGuardSourceGroup {
  name: string;
  address: string[];
  domain: string[];
  ldap_ip_search: string[];
  ldap_user_search: string[];
  description?: string | null;
  user?: string | null;
}

export interface TimePeriodDay {
  day: string;
  time?: string | null;
}

export interface SquidGuardTimePeriod {
  name: string;
  description?: string | null;
  days: TimePeriodDay[];
}

export interface SquidGuard {
  allow_categories: string[];
  block_categories: string[];
  log: string[];
  local_block: string[];
  local_block_keyword: string[];
  local_block_url: string[];
  local_ok: string[];
  local_ok_url: string[];
  allow_ipaddr_url: boolean;
  enable_safe_search: boolean;
  default_action?: string | null;
  redirect_url?: string | null;
  auto_update_hour?: number | null;
  rules: SquidGuardRule[];
  source_groups: SquidGuardSourceGroup[];
  time_periods: SquidGuardTimePeriod[];
}

export interface UrlFiltering {
  disable: boolean;
  squidguard: SquidGuard;
}

export interface WebProxyConfig {
  append_domain?: string | null;
  cache_size?: number | null;
  default_port?: number | null;
  maximum_object_size?: number | null;
  mem_cache_size?: number | null;
  minimum_object_size?: number | null;
  outgoing_address?: string | null;
  reply_body_max_size?: number | null;
  disable_access_log: boolean;
  domain_block: string[];
  domain_noncache: string[];
  reply_block_mime: string[];
  safe_ports: string[];
  ssl_safe_ports: string[];
  authentication: WebProxyAuthentication;
  cache_peers: CachePeer[];
  listen_addresses: ListenAddress[];
  url_filtering: UrlFiltering;
}

export interface WebProxyCapabilities {
  version: string;
  features: {
    global_settings: { supported: boolean; description: string };
    authentication: { supported: boolean; description: string };
    cache_peer: { supported: boolean; description: string };
    listen_address: { supported: boolean; description: string };
    url_filtering: { supported: boolean; description: string };
  };
  options: {
    cache_peer_type: string[];
    default_action: string[];
    ldap_version: string[];
    auth_method: string[];
    time_period_days: string[];
    reply_block_mime: string[];
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
// Service
// ============================================================================

class WebProxyService {
  async getCapabilities(): Promise<WebProxyCapabilities> {
    return apiClient.get<WebProxyCapabilities>("/vyos/webproxy/capabilities");
  }

  async getConfig(refresh = false): Promise<WebProxyConfig> {
    return apiClient.get<WebProxyConfig>("/vyos/webproxy/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/webproxy/batch", {
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  /** An edit that changes nothing sends no batch; the router rejects an empty one. */
  private async commit(operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return { success: true };
    return this.batch(operations);
  }

  // ----- Global settings + lists ------------------------------------------

  async saveSettings(original: WebProxyConfig, updated: WebProxyConfig): Promise<VyOSResponse> {
    return this.commit(settingsOps(original, updated));
  }

  // ----- Authentication ----------------------------------------------------

  async saveAuthentication(
    original: WebProxyAuthentication,
    updated: WebProxyAuthentication
  ): Promise<VyOSResponse> {
    return this.commit(authenticationOps(original, updated));
  }

  async clearAuthentication(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_authentication" }]);
  }

  // ----- Cache peers -------------------------------------------------------

  async saveCachePeer(peer: CachePeer, original: CachePeer | null): Promise<VyOSResponse> {
    return this.commit(cachePeerOps(peer, original));
  }

  async deleteCachePeer(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_cache_peer", value: name }]);
  }

  // ----- Listen addresses --------------------------------------------------

  async saveListenAddress(addr: ListenAddress, original: ListenAddress | null): Promise<VyOSResponse> {
    return this.commit(listenAddressOps(addr, original));
  }

  async deleteListenAddress(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_listen_address", value: address }]);
  }

  // ----- URL filtering -----------------------------------------------------

  async setUrlFilteringDisabled(disabled: boolean): Promise<VyOSResponse> {
    return this.batch([
      { op: disabled ? "set_url_filtering_disable" : "delete_url_filtering_disable" },
    ]);
  }

  async saveSquidGuardGlobal(original: SquidGuard, updated: SquidGuard): Promise<VyOSResponse> {
    return this.commit(squidGuardGlobalOps(original, updated));
  }

  // ----- squidGuard rules --------------------------------------------------

  async saveRule(rule: SquidGuardRule, original: SquidGuardRule | null): Promise<VyOSResponse> {
    return this.commit(ruleOps(rule, original));
  }

  async deleteRule(number: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_rule", value: number }]);
  }

  // ----- squidGuard source groups -----------------------------------------

  async saveSourceGroup(
    group: SquidGuardSourceGroup,
    original: SquidGuardSourceGroup | null
  ): Promise<VyOSResponse> {
    return this.commit(sourceGroupOps(group, original));
  }

  async deleteSourceGroup(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_source_group", value: name }]);
  }

  // ----- squidGuard time periods ------------------------------------------

  async saveTimePeriod(
    period: SquidGuardTimePeriod,
    original: SquidGuardTimePeriod | null
  ): Promise<VyOSResponse> {
    return this.commit(timePeriodOps(period, original));
  }

  async deleteTimePeriod(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_time_period", value: name }]);
  }
}

export const webProxyService = new WebProxyService();
