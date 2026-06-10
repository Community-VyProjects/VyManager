import { apiClient } from "./client";

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
  version_info: { is_1_4: boolean; is_1_5: boolean };
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

  // ----- Global settings + lists ------------------------------------------

  async saveSettings(config: WebProxyConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    const scalar = (op: string, value: number | string | null | undefined) => {
      ops.push({ op: `delete_${op}` });
      if (value !== null && value !== undefined && String(value) !== "") {
        ops.push({ op: `set_${op}`, value: String(value) });
      }
    };

    scalar("append_domain", config.append_domain);
    scalar("cache_size", config.cache_size);
    scalar("default_port", config.default_port);
    scalar("maximum_object_size", config.maximum_object_size);
    scalar("mem_cache_size", config.mem_cache_size);
    scalar("minimum_object_size", config.minimum_object_size);
    scalar("outgoing_address", config.outgoing_address);
    scalar("reply_body_max_size", config.reply_body_max_size);

    ops.push({ op: "delete_disable_access_log" });
    if (config.disable_access_log) ops.push({ op: "set_disable_access_log" });

    const list = (
      addOp: string,
      delAllOp: string,
      values: string[]
    ) => {
      ops.push({ op: delAllOp });
      for (const v of values) ops.push({ op: addOp, value: v });
    };

    list("add_domain_block", "delete_domain_block_all", config.domain_block);
    list("add_domain_noncache", "delete_domain_noncache_all", config.domain_noncache);
    list("add_reply_block_mime", "delete_reply_block_mime_all", config.reply_block_mime);
    list("add_safe_port", "delete_safe_port_all", config.safe_ports);
    list("add_ssl_safe_port", "delete_ssl_safe_port_all", config.ssl_safe_ports);

    return this.batch(ops);
  }

  // ----- Authentication ----------------------------------------------------

  async saveAuthentication(auth: WebProxyAuthentication): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    // Replace the whole authentication subtree for a clean state.
    ops.push({ op: "delete_authentication" });

    const set = (op: string, value: number | string | null | undefined) => {
      if (value !== null && value !== undefined && String(value) !== "") {
        ops.push({ op, value: String(value) });
      }
    };

    set("set_authentication_children", auth.children);
    set("set_authentication_credentials_ttl", auth.credentials_ttl);
    set("set_authentication_method", auth.method);
    set("set_authentication_realm", auth.realm);

    const ldap = auth.ldap;
    set("set_ldap_server", ldap.server);
    set("set_ldap_base_dn", ldap.base_dn);
    set("set_ldap_bind_dn", ldap.bind_dn);
    set("set_ldap_filter_expression", ldap.filter_expression);
    set("set_ldap_password", ldap.password);
    set("set_ldap_username_attribute", ldap.username_attribute);
    set("set_ldap_port", ldap.port);
    set("set_ldap_version", ldap.version);
    if (ldap.persistent_connection) ops.push({ op: "set_ldap_persistent_connection" });
    if (ldap.use_ssl) ops.push({ op: "set_ldap_use_ssl" });

    return this.batch(ops);
  }

  async clearAuthentication(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_authentication" }]);
  }

  // ----- Cache peers -------------------------------------------------------

  async saveCachePeer(peer: CachePeer, isEdit: boolean): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = peer.name;
    if (isEdit) ops.push({ op: "delete_cache_peer", value: name });
    ops.push({ op: "set_cache_peer", value: name });

    const set = (op: string, value: number | string | null | undefined) => {
      if (value !== null && value !== undefined && String(value) !== "") {
        ops.push({ op, value: `${name},${value}` });
      }
    };
    set("set_cache_peer_address", peer.address);
    set("set_cache_peer_http_port", peer.http_port);
    set("set_cache_peer_icp_port", peer.icp_port);
    set("set_cache_peer_options", peer.options);
    set("set_cache_peer_type", peer.type);

    return this.batch(ops);
  }

  async deleteCachePeer(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_cache_peer", value: name }]);
  }

  // ----- Listen addresses --------------------------------------------------

  async saveListenAddress(addr: ListenAddress, isEdit: boolean): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const address = addr.address;
    if (isEdit) ops.push({ op: "delete_listen_address", value: address });
    ops.push({ op: "set_listen_address", value: address });

    if (addr.port !== null && addr.port !== undefined && String(addr.port) !== "") {
      ops.push({ op: "set_listen_address_port", value: `${address},${addr.port}` });
    }
    if (addr.disable_transparent) {
      ops.push({ op: "set_listen_address_disable_transparent", value: address });
    }
    return this.batch(ops);
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

  async saveSquidGuardGlobal(sg: SquidGuard): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    const list = (addOp: string, delAllOp: string, values: string[]) => {
      ops.push({ op: delAllOp });
      for (const v of values) ops.push({ op: addOp, value: v });
    };
    list("add_squidguard_allow_category", "delete_squidguard_allow_category_all", sg.allow_categories);
    list("add_squidguard_block_category", "delete_squidguard_block_category_all", sg.block_categories);
    list("add_squidguard_log", "delete_squidguard_log_all", sg.log);
    list("add_squidguard_local_block", "delete_squidguard_local_block_all", sg.local_block);
    list("add_squidguard_local_block_keyword", "delete_squidguard_local_block_keyword_all", sg.local_block_keyword);
    list("add_squidguard_local_block_url", "delete_squidguard_local_block_url_all", sg.local_block_url);
    list("add_squidguard_local_ok", "delete_squidguard_local_ok_all", sg.local_ok);
    list("add_squidguard_local_ok_url", "delete_squidguard_local_ok_url_all", sg.local_ok_url);

    ops.push({ op: "delete_squidguard_allow_ipaddr_url" });
    if (sg.allow_ipaddr_url) ops.push({ op: "set_squidguard_allow_ipaddr_url" });
    ops.push({ op: "delete_squidguard_enable_safe_search" });
    if (sg.enable_safe_search) ops.push({ op: "set_squidguard_enable_safe_search" });

    ops.push({ op: "delete_squidguard_default_action" });
    if (sg.default_action) ops.push({ op: "set_squidguard_default_action", value: sg.default_action });
    ops.push({ op: "delete_squidguard_redirect_url" });
    if (sg.redirect_url) ops.push({ op: "set_squidguard_redirect_url", value: sg.redirect_url });
    ops.push({ op: "delete_squidguard_auto_update" });
    if (sg.auto_update_hour !== null && sg.auto_update_hour !== undefined) {
      ops.push({ op: "set_squidguard_auto_update_hour", value: String(sg.auto_update_hour) });
    }

    return this.batch(ops);
  }

  // ----- squidGuard rules --------------------------------------------------

  async saveRule(rule: SquidGuardRule, isEdit: boolean): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const n = rule.number;
    if (isEdit) ops.push({ op: "delete_squidguard_rule", value: n });
    ops.push({ op: "set_squidguard_rule", value: n });

    const list = (addOp: string, values: string[]) => {
      for (const v of values) ops.push({ op: addOp, value: `${n},${v}` });
    };
    list("add_squidguard_rule_allow_category", rule.allow_categories);
    list("add_squidguard_rule_block_category", rule.block_categories);
    list("add_squidguard_rule_log", rule.log);
    list("add_squidguard_rule_local_block", rule.local_block);
    list("add_squidguard_rule_local_block_keyword", rule.local_block_keyword);
    list("add_squidguard_rule_local_block_url", rule.local_block_url);
    list("add_squidguard_rule_local_ok", rule.local_ok);
    list("add_squidguard_rule_local_ok_url", rule.local_ok_url);

    if (rule.allow_ipaddr_url) ops.push({ op: "set_squidguard_rule_allow_ipaddr_url", value: n });
    if (rule.enable_safe_search) ops.push({ op: "set_squidguard_rule_enable_safe_search", value: n });

    const set = (op: string, value: string | null | undefined) => {
      if (value) ops.push({ op, value: `${n},${value}` });
    };
    set("set_squidguard_rule_default_action", rule.default_action);
    set("set_squidguard_rule_redirect_url", rule.redirect_url);
    set("set_squidguard_rule_source_group", rule.source_group);
    set("set_squidguard_rule_time_period", rule.time_period);

    return this.batch(ops);
  }

  async deleteRule(number: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_rule", value: number }]);
  }

  // ----- squidGuard source groups -----------------------------------------

  async saveSourceGroup(group: SquidGuardSourceGroup, isEdit: boolean): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = group.name;
    if (isEdit) ops.push({ op: "delete_squidguard_source_group", value: name });
    ops.push({ op: "set_squidguard_source_group", value: name });

    const list = (addOp: string, values: string[]) => {
      for (const v of values) ops.push({ op: addOp, value: `${name},${v}` });
    };
    list("add_squidguard_source_group_address", group.address);
    list("add_squidguard_source_group_domain", group.domain);
    list("add_squidguard_source_group_ldap_ip_search", group.ldap_ip_search);
    list("add_squidguard_source_group_ldap_user_search", group.ldap_user_search);

    if (group.description) {
      ops.push({ op: "set_squidguard_source_group_description", value: `${name},${group.description}` });
    }
    if (group.user) {
      ops.push({ op: "set_squidguard_source_group_user", value: `${name},${group.user}` });
    }
    return this.batch(ops);
  }

  async deleteSourceGroup(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_source_group", value: name }]);
  }

  // ----- squidGuard time periods ------------------------------------------

  async saveTimePeriod(period: SquidGuardTimePeriod, isEdit: boolean): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = period.name;
    if (isEdit) ops.push({ op: "delete_squidguard_time_period", value: name });
    ops.push({ op: "set_squidguard_time_period", value: name });

    if (period.description) {
      ops.push({ op: "set_squidguard_time_period_description", value: `${name},${period.description}` });
    }
    for (const d of period.days) {
      if (d.time) {
        ops.push({ op: "set_squidguard_time_period_day_time", value: `${name},${d.day},${d.time}` });
      }
    }
    return this.batch(ops);
  }

  async deleteTimePeriod(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_squidguard_time_period", value: name }]);
  }
}

export const webProxyService = new WebProxyService();
