import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASKED_SECRET,
  authenticationOps,
  cachePeerOps,
  listenAddressOps,
  ruleOps,
  settingsOps,
  sourceGroupOps,
  squidGuardGlobalOps,
  timePeriodOps,
} from "./webproxy-save-ops";
import { webProxyService } from "./webproxy";
import type {
  BatchOperation,
  SquidGuard,
  SquidGuardRule,
  VyOSResponse,
  WebProxyAuthentication,
  WebProxyConfig,
} from "./webproxy";

function squidguard(overrides: Partial<SquidGuard> = {}): SquidGuard {
  return {
    allow_categories: [],
    block_categories: [],
    log: [],
    local_block: [],
    local_block_keyword: [],
    local_block_url: [],
    local_ok: [],
    local_ok_url: [],
    allow_ipaddr_url: false,
    enable_safe_search: false,
    default_action: null,
    redirect_url: null,
    auto_update_hour: null,
    rules: [],
    source_groups: [],
    time_periods: [],
    ...overrides,
  };
}

function auth(overrides: Partial<WebProxyAuthentication["ldap"]> = {}): WebProxyAuthentication {
  return {
    children: null,
    credentials_ttl: null,
    method: "ldap",
    realm: null,
    ldap: {
      server: "ldap.example",
      persistent_connection: false,
      use_ssl: false,
      ...overrides,
    },
  };
}

function config(overrides: Partial<WebProxyConfig> = {}): WebProxyConfig {
  return {
    disable_access_log: false,
    domain_block: [],
    domain_noncache: [],
    reply_block_mime: [],
    safe_ports: [],
    ssl_safe_ports: [],
    authentication: auth(),
    cache_peers: [],
    listen_addresses: [],
    url_filtering: { disable: false, squidguard: squidguard() },
    ...overrides,
  };
}

function rule(overrides: Partial<SquidGuardRule> = {}): SquidGuardRule {
  return {
    number: "10",
    allow_categories: [],
    block_categories: [],
    log: [],
    local_block: [],
    local_block_keyword: [],
    local_block_url: [],
    local_ok: [],
    local_ok_url: [],
    allow_ipaddr_url: false,
    enable_safe_search: false,
    ...overrides,
  };
}

describe("settingsOps", () => {
  it("sets changed leaves, deletes cleared ones, and diffs lists by value", () => {
    const before = config({ default_port: 3128, cache_size: 100, domain_block: ["a.example", "b.example"], safe_ports: ["8080"] });
    const after = config({
      default_port: 3129,
      cache_size: null,
      append_domain: " .example.com ",
      domain_block: [" b.example", "c.example", "c.example", ""],
      safe_ports: [],
      disable_access_log: true,
    });
    assert.deepEqual(settingsOps(before, after), [
      { op: "set_append_domain", value: ".example.com" },
      { op: "delete_cache_size" },
      { op: "set_default_port", value: "3129" },
      { op: "set_disable_access_log" },
      { op: "delete_domain_block", value: "a.example" },
      { op: "add_domain_block", value: "c.example" },
      { op: "delete_safe_port_all" },
    ]);
  });

  it("emits nothing for an untouched save", () => {
    const c = config({ default_port: 3128, domain_block: ["a.example"] });
    assert.deepEqual(settingsOps(c, { ...c, domain_block: ["a.example "] }), []);
  });
});

describe("authenticationOps", () => {
  it("keeps a masked password and never deletes the subtree", () => {
    const before = auth({ password: MASKED_SECRET, port: 389 });
    const after = auth({ password: MASKED_SECRET, port: 636, use_ssl: true });
    assert.deepEqual(authenticationOps(before, after), [
      { op: "set_ldap_port", value: "636" },
      { op: "set_ldap_use_ssl" },
    ]);
  });

  it("deletes a cleared password and sets new text", () => {
    assert.deepEqual(authenticationOps(auth({ password: MASKED_SECRET }), auth({ password: "  " })), [
      { op: "delete_ldap_password" },
    ]);
    assert.deepEqual(authenticationOps(auth({ password: MASKED_SECRET }), auth({ password: "n3w" })), [
      { op: "set_ldap_password", value: "n3w" },
    ]);
    assert.deepEqual(authenticationOps(auth({ password: MASKED_SECRET }), auth({ password: " p w " })), [
      { op: "set_ldap_password", value: " p w " },
    ]);
    assert.deepEqual(authenticationOps(auth(), auth({ password: null })), []);
  });
});

describe("tag object edits", () => {
  it("creates a cache peer and edits only the changed leaves", () => {
    assert.deepEqual(cachePeerOps({ name: "up", address: "192.0.2.1", type: "parent" }, null), [
      { op: "set_cache_peer", value: "up" },
      { op: "set_cache_peer_address", value: "up,192.0.2.1" },
      { op: "set_cache_peer_type", value: "up,parent" },
    ]);
    const original = { name: "up", address: "192.0.2.1", http_port: 3128, options: "no-query", type: "parent" };
    assert.deepEqual(cachePeerOps({ ...original, http_port: null, type: "sibling" }, original), [
      { op: "delete_cache_peer_http_port", value: "up" },
      { op: "set_cache_peer_type", value: "up,sibling" },
    ]);
  });

  it("edits a listen address without deleting it", () => {
    const original = { address: "192.0.2.1", port: 3128, disable_transparent: true };
    assert.deepEqual(listenAddressOps({ ...original, port: null, disable_transparent: false }, original), [
      { op: "delete_listen_address_port", value: "192.0.2.1" },
      { op: "delete_listen_address_disable_transparent", value: "192.0.2.1" },
    ]);
  });

  it("diffs rule lists by value and clears leaves", () => {
    const original = rule({ block_categories: ["ads", "malware"], local_ok: ["192.0.2.8"], source_group: "staff" });
    const updated = rule({ block_categories: ["malware", "porn"], local_ok: [], source_group: null, enable_safe_search: true });
    assert.deepEqual(ruleOps(updated, original), [
      { op: "delete_squidguard_rule_block_category", value: "10,ads" },
      { op: "add_squidguard_rule_block_category", value: "10,porn" },
      { op: "delete_squidguard_rule_local_ok_all", value: "10" },
      { op: "set_squidguard_rule_enable_safe_search", value: "10" },
      { op: "delete_squidguard_rule_source_group", value: "10" },
    ]);
    assert.deepEqual(ruleOps(rule({ default_action: "block" }), null), [
      { op: "set_squidguard_rule", value: "10" },
      { op: "set_squidguard_rule_default_action", value: "10,block" },
    ]);
  });

  it("edits a source group in place", () => {
    const original = { name: "lan", address: ["10.0.0.0/24"], domain: [], ldap_ip_search: [], ldap_user_search: [], description: "LAN", user: null };
    assert.deepEqual(sourceGroupOps({ ...original, address: ["10.0.0.0/24", "10.1.0.0/24"], description: "" }, original), [
      { op: "add_squidguard_source_group_address", value: "lan,10.1.0.0/24" },
      { op: "delete_squidguard_source_group_description", value: "lan" },
    ]);
  });

  it("diffs time period days", () => {
    const original = {
      name: "work",
      description: null,
      days: [
        { day: "Mon", time: "09:00-17:00" },
        { day: "Tue", time: "09:00-17:00" },
        { day: "Sun", time: null },
      ],
    };
    const updated = {
      name: "work",
      description: null,
      days: [
        { day: "Mon", time: "08:00-16:00" },
        { day: "Tue", time: null },
        { day: "Sat", time: null },
      ],
    };
    assert.deepEqual(timePeriodOps(updated, original), [
      { op: "delete_squidguard_time_period_day", value: "work,Sun" },
      { op: "set_squidguard_time_period_day_time", value: "work,Mon,08:00-16:00" },
      { op: "delete_squidguard_time_period_day_time", value: "work,Tue" },
      { op: "set_squidguard_time_period_day", value: "work,Sat" },
    ]);
  });

  it("diffs the squidGuard globals", () => {
    const before = squidguard({ log: ["all"], default_action: "allow", auto_update_hour: 3 });
    const after = squidguard({ log: ["all", "ads"], default_action: "block", auto_update_hour: null });
    assert.deepEqual(squidGuardGlobalOps(before, after), [
      { op: "add_squidguard_log", value: "ads" },
      { op: "set_squidguard_default_action", value: "block" },
      { op: "delete_squidguard_auto_update" },
    ]);
  });
});

describe("webProxyService", () => {
  it("sends the diffed batch and skips an empty one", async () => {
    const sent: BatchOperation[][] = [];
    const service = Object.create(webProxyService) as typeof webProxyService;
    Object.defineProperty(service, "batch", {
      value: async (operations: BatchOperation[]): Promise<VyOSResponse> => {
        sent.push(operations);
        return { success: true };
      },
    });
    const before = auth({ password: MASKED_SECRET });
    await service.saveAuthentication(before, auth({ password: ` ${MASKED_SECRET} ` }));
    assert.deepEqual(sent, []);
    await service.saveAuthentication(before, auth({ password: "", server: " ldap2.example " }));
    assert.deepEqual(sent, [[
      { op: "set_ldap_server", value: "ldap2.example" },
      { op: "delete_ldap_password" },
    ]]);
  });
});
