import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advancedOps,
  advancedProblem,
  authOps,
  authProblem,
  generalOps,
  generalProblem,
  interfaceOps,
  interfaceProblem,
  ipPoolOps,
  ipPoolProblem,
  ipv6PoolOps,
  ipv6PoolProblem,
  isVlanValue,
  localUserOps,
  localUserProblem,
  MASKED_SECRET,
  pppOptionsOps,
  pppOptionsProblem,
  radiusServerOps,
  radiusServerProblem,
  radiusSettingsOps,
  radiusSettingsProblem,
  type PPPoEAdvancedDraft,
  type PPPoEGeneralDraft,
  type PPPoELocalUserDraft,
  type PPPoEPppOptionsDraft,
  type PPPoERadiusServerDraft,
  type PPPoERadiusSettingsDraft,
} from "./pppoe-server-save-ops";
import {
  pppoeServerService,
  type BatchOperation,
  type PPPoEConfigResponse,
  type PPPoELocalUser,
  type PPPoEPppOptions,
  type PPPoERadiusServer,
  type PPPoERadiusSettings,
} from "./pppoe-server";
import { apiClient } from "./client";

const THREAD_KEYWORDS = ["all", "half"];

function radius(overrides: Partial<PPPoERadiusSettings> = {}): PPPoERadiusSettings {
  return {
    servers: [],
    preallocate_vif: false,
    dynamic_author: {},
    rate_limit: { enable: false },
    ...overrides,
  };
}

function pppOptions(overrides: Partial<PPPoEPppOptions> = {}): PPPoEPppOptions {
  return { disable_ccp: false, ipv6_accept_peer_interface_id: false, ...overrides };
}

function config(overrides: Partial<PPPoEConfigResponse> = {}): PPPoEConfigResponse {
  return {
    configured: true,
    service_names: [],
    name_servers: [],
    wins_servers: [],
    accept_any_service: false,
    accept_blank_service: false,
    pado_delays: [],
    log: {},
    shaper: { enabled: false },
    snmp: { enabled: false, master_agent: false },
    extended_scripts: { enabled: false },
    limits: { enabled: false },
    ppp_options: pppOptions(),
    authentication: { protocols: [], any_login: false, local_users: [], radius: radius() },
    client_ip_pools: [],
    client_ipv6_pools: [],
    interfaces: [],
    totals: { local_users: 0, radius_servers: 0, client_ip_pools: 0, client_ipv6_pools: 0, interfaces: 0 },
    ...overrides,
  };
}

function generalDraft(current: PPPoEConfigResponse, overrides: Partial<PPPoEGeneralDraft> = {}): PPPoEGeneralDraft {
  return {
    description: current.description || "",
    access_concentrator: current.access_concentrator || "",
    service_names: current.service_names,
    gateway_address: current.gateway_address || "",
    name_servers: current.name_servers,
    wins_servers: current.wins_servers,
    mtu: current.mtu || "",
    max_concurrent_sessions: current.max_concurrent_sessions || "",
    thread_count: current.thread_count || "",
    default_pool: current.default_pool || "",
    default_ipv6_pool: current.default_ipv6_pool || "",
    session_control: current.session_control || "",
    accept_any_service: current.accept_any_service,
    accept_blank_service: current.accept_blank_service,
    ...overrides,
  };
}

function userDraft(current: PPPoELocalUser | null, overrides: Partial<PPPoELocalUserDraft> = {}): PPPoELocalUserDraft {
  return {
    username: current?.username || "",
    password: "",
    static_ip: current?.static_ip || "",
    rate_download: current?.rate_limit.download || "",
    rate_upload: current?.rate_limit.upload || "",
    disabled: current?.disabled || false,
    ...overrides,
  };
}

function serverDraft(current: PPPoERadiusServer | null, overrides: Partial<PPPoERadiusServerDraft> = {}): PPPoERadiusServerDraft {
  return {
    address: current?.address || "",
    key: "",
    port: current?.port || "",
    acct_port: current?.acct_port || "",
    priority: current?.priority || "",
    fail_time: current?.fail_time || "",
    disabled: current?.disabled || false,
    backup: current?.backup || false,
    disable_accounting: current?.disable_accounting || false,
    ...overrides,
  };
}

function radiusDraft(current: PPPoERadiusSettings, overrides: Partial<PPPoERadiusSettingsDraft> = {}): PPPoERadiusSettingsDraft {
  return {
    source_address: current.source_address || "",
    timeout: current.timeout || "",
    max_try: current.max_try || "",
    nas_identifier: current.nas_identifier || "",
    nas_ip_address: current.nas_ip_address || "",
    preallocate_vif: current.preallocate_vif,
    accounting_interim_interval: current.accounting_interim_interval || "",
    acct_interim_jitter: current.acct_interim_jitter || "",
    acct_timeout: current.acct_timeout || "",
    called_sid_format: current.called_sid_format || "",
    dae_server: current.dynamic_author.server || "",
    dae_port: current.dynamic_author.port || "",
    dae_key: current.dynamic_author.key || "",
    rate_limit_enable: current.rate_limit.enable,
    rate_limit_attribute: current.rate_limit.attribute || "",
    rate_limit_vendor: current.rate_limit.vendor || "",
    rate_limit_multiplier: current.rate_limit.multiplier || "",
    ...overrides,
  };
}

function pppDraft(current: PPPoEPppOptions, overrides: Partial<PPPoEPppOptionsDraft> = {}): PPPoEPppOptionsDraft {
  return {
    ipv4: current.ipv4 || "",
    ipv6: current.ipv6 || "",
    mppe: current.mppe || "",
    disable_ccp: current.disable_ccp,
    interface_cache: current.interface_cache || "",
    min_mtu: current.min_mtu || "",
    mru: current.mru || "",
    lcp_echo_failure: current.lcp_echo_failure || "",
    lcp_echo_interval: current.lcp_echo_interval || "",
    lcp_echo_timeout: current.lcp_echo_timeout || "",
    ipv6_interface_id: current.ipv6_interface_id || "",
    ipv6_peer_interface_id: current.ipv6_peer_interface_id || "",
    ipv6_peer_interface_id_secret: current.ipv6_peer_interface_id_secret || "",
    ipv6_accept_peer_interface_id: current.ipv6_accept_peer_interface_id,
    ...overrides,
  };
}

function advancedDraft(current: PPPoEConfigResponse, overrides: Partial<PPPoEAdvancedDraft> = {}): PPPoEAdvancedDraft {
  return {
    log_level: current.log.level || "",
    pado_delays: current.pado_delays.map((d) => ({ delay: d.delay, sessions: d.sessions || "" })),
    limits_enabled: current.limits.enabled,
    limits_burst: current.limits.burst || "",
    limits_connection_limit: current.limits.connection_limit || "",
    limits_timeout: current.limits.timeout || "",
    shaper_enabled: current.shaper.enabled,
    shaper_fwmark: current.shaper.fwmark || "",
    snmp_enabled: current.snmp.enabled,
    snmp_master_agent: current.snmp.master_agent,
    scripts_enabled: current.extended_scripts.enabled,
    scripts_on_change: current.extended_scripts.on_change || "",
    scripts_on_down: current.extended_scripts.on_down || "",
    scripts_on_pre_up: current.extended_scripts.on_pre_up || "",
    scripts_on_up: current.extended_scripts.on_up || "",
    ...overrides,
  };
}

function capture() {
  const sent: [string, BatchOperation[]][] = [];
  const service = Object.create(pppoeServerService) as typeof pppoeServerService;
  service.batchConfigure = async (itemName: string, operations: BatchOperation[]) => {
    sent.push([itemName, operations]);
    return { success: true };
  };
  return { service, sent };
}

describe("generalOps", () => {
  const current = config({
    description: "isp",
    service_names: ["isp", "backup"],
    gateway_address: "10.0.0.1",
    name_servers: ["192.0.2.53"],
    wins_servers: ["192.0.2.80"],
    thread_count: "half",
    accept_any_service: true,
  });

  it("sends nothing for an untouched save", () => {
    assert.deepEqual(generalOps(current, generalDraft(current)), []);
  });

  it("diffs service names per value and sets the single gateway", () => {
    const ops = generalOps(current, generalDraft(current, {
      description: " ",
      service_names: ["backup", " gold "],
      gateway_address: "10.0.0.254",
      name_servers: [],
      wins_servers: ["192.0.2.80", "192.0.2.81"],
      thread_count: "4",
      accept_any_service: false,
      accept_blank_service: true,
    }));
    assert.deepEqual(ops, [
      { op: "delete_description" },
      { op: "delete_service_name", value: "isp" },
      { op: "set_service_name", value: "gold" },
      { op: "set_gateway_address", value: "10.0.0.254" },
      { op: "delete_name_server", value: "192.0.2.53" },
      { op: "set_wins_server", value: "192.0.2.81" },
      { op: "set_thread_count", value: "4" },
      { op: "delete_accept_any_service" },
      { op: "set_accept_blank_service" },
    ]);
  });

  it("deletes a cleared gateway by leaf, with no value", () => {
    assert.deepEqual(generalOps(current, generalDraft(current, { gateway_address: "" })), [
      { op: "delete_gateway_address" },
    ]);
  });

  it("checks ranges, thread keywords and resolver limits", () => {
    const base = generalDraft(current);
    assert.equal(generalProblem(base, THREAD_KEYWORDS), null);
    assert.deepEqual(generalProblem({ ...base, max_concurrent_sessions: "70000" }, THREAD_KEYWORDS),
      { problem: "maxSessionsRange", params: { min: 0, max: 65535 } });
    assert.equal(generalProblem({ ...base, thread_count: "1e1" }, THREAD_KEYWORDS)?.problem, "threadCountInvalid");
    assert.equal(generalProblem({ ...base, thread_count: "all" }, THREAD_KEYWORDS), null);
    assert.equal(generalProblem({ ...base, thread_count: "all" }, [])?.problem, "threadCountInvalid");
    assert.equal(generalProblem({ ...base, name_servers: ["1.1.1.1", "8.8.8.8", "9.9.9.9"] }, THREAD_KEYWORDS)?.problem,
      "tooManyIpv4NameServers");
    assert.equal(generalProblem({ ...base, wins_servers: ["192.0.2.1", "192.0.2.2", "192.0.2.3"] }, THREAD_KEYWORDS)?.problem,
      "tooManyWinsServers");
  });
});

describe("authOps", () => {
  const auth = config({
    authentication: {
      mode: "local",
      protocols: ["chap", "pap"],
      any_login: false,
      local_users: [],
      radius: radius(),
    },
  }).authentication;

  it("diffs protocols per value and deletes the mode for the default", () => {
    assert.deepEqual(authOps(auth, { mode: "", protocols: ["chap", "mschap-v2"], any_login: true }, true), [
      { op: "delete_auth_mode" },
      { op: "delete_auth_protocol", value: "pap" },
      { op: "set_auth_protocol", value: "mschap-v2" },
      { op: "set_auth_any_login" },
    ]);
  });

  it("deletes every protocol once when the list is emptied, and skips any-login on 1.4", () => {
    assert.deepEqual(authOps(auth, { mode: "radius", protocols: [], any_login: true }, false), [
      { op: "set_auth_mode", value: "radius" },
      { op: "delete_all_auth_protocols" },
    ]);
  });

  it("turns any-login off", () => {
    assert.deepEqual(authOps({ ...auth, any_login: true }, { mode: "local", protocols: ["chap", "pap"], any_login: false }, true), [
      { op: "delete_auth_any_login" },
    ]);
  });

  it("rejects a mode the lab verify refuses with nothing configured for it", () => {
    assert.equal(authProblem(auth, { mode: "local", protocols: [], any_login: false })?.problem, "localModeNeedsUser");
    assert.equal(authProblem(auth, { mode: "radius", protocols: [], any_login: false })?.problem, "radiusModeNeedsServer");
    assert.equal(authProblem(auth, { mode: "noauth", protocols: [], any_login: false }), null);
  });

  it("treats an unset mode as local, any-login included", () => {
    const auth = config().authentication;
    assert.equal(authProblem(auth, { mode: "", protocols: [], any_login: false })?.problem, "localModeNeedsUser");
    assert.equal(authProblem(auth, { mode: "  ", protocols: [], any_login: true })?.problem, "localModeNeedsUser");
    const withUser = { ...auth, local_users: [{ username: "u" } as PPPoELocalUser] };
    assert.equal(authProblem(withUser, { mode: "", protocols: [], any_login: false }), null);
  });
});

describe("localUserOps", () => {
  const alice: PPPoELocalUser = {
    username: "alice",
    password: MASKED_SECRET,
    disabled: true,
    static_ip: "10.0.0.5",
    rate_limit: { download: "1000", upload: "500" },
  };

  it("creates a user with its password and leaves", () => {
    const draft = userDraft(null, { username: " bob ", password: "s3cret", rate_download: "10", rate_upload: "5" });
    assert.equal(localUserProblem(null, draft, ["alice"]), null);
    assert.deepEqual(localUserOps(null, draft), [
      { op: "create_local_user" },
      { op: "set_local_user_password", value: "s3cret" },
      { op: "set_local_user_rate_limit_download", value: "10" },
      { op: "set_local_user_rate_limit_upload", value: "5" },
    ]);
  });

  it("edits in place: a blank password keeps the stored one", () => {
    assert.deepEqual(localUserOps(alice, userDraft(alice)), []);
    assert.deepEqual(localUserOps(alice, userDraft(alice, {
      static_ip: "", rate_download: "", rate_upload: "", disabled: false,
    })), [
      { op: "delete_local_user_static_ip" },
      { op: "delete_local_user_rate_limit" },
      { op: "delete_local_user_disable" },
    ]);
  });

  it("rejects a duplicate, a missing password, the mask and a one-way rate limit", () => {
    assert.equal(localUserProblem(null, userDraft(null, { username: "alice ", password: "x" }), ["alice"])?.problem, "userExists");
    assert.equal(localUserProblem(null, userDraft(null, { username: "bob" }), [])?.problem, "passwordRequired");
    assert.equal(localUserProblem(alice, userDraft(alice, { password: MASKED_SECRET }), [])?.problem, "passwordIsMask");
    assert.equal(localUserProblem(alice, userDraft(alice, { rate_upload: "" }), [])?.problem, "rateLimitBothDirections");
    assert.equal(localUserProblem(alice, userDraft(alice), []), null);
  });
});

describe("radiusServerOps", () => {
  const stored: PPPoERadiusServer = {
    address: "192.0.2.1",
    key: MASKED_SECRET,
    port: "1812",
    acct_port: "1813",
    priority: "1",
    fail_time: "30",
    disabled: false,
    backup: true,
    disable_accounting: true,
  };

  it("edits in place: a blank key keeps the stored one and nothing is deleted", () => {
    assert.deepEqual(radiusServerOps(stored, serverDraft(stored)), []);
    assert.deepEqual(radiusServerOps(stored, serverDraft(stored, {
      port: "", acct_port: "", priority: "", fail_time: "", disabled: true, backup: false, disable_accounting: false,
    })), [
      { op: "delete_radius_server_port" },
      { op: "delete_radius_server_acct_port" },
      { op: "delete_radius_server_priority" },
      { op: "delete_radius_server_fail_time" },
      { op: "set_radius_server_disable" },
      { op: "delete_radius_server_backup" },
      { op: "delete_radius_server_disable_accounting" },
    ]);
  });

  it("creates with the key and checks ranges", () => {
    const draft = serverDraft(null, { address: "192.0.2.9", key: "k", port: "1812", backup: true });
    assert.equal(radiusServerProblem(null, draft, ["192.0.2.1"]), null);
    assert.deepEqual(radiusServerOps(null, draft), [
      { op: "set_radius_server" },
      { op: "set_radius_server_key", value: "k" },
      { op: "set_radius_server_port", value: "1812" },
      { op: "set_radius_server_backup" },
    ]);
    assert.equal(radiusServerProblem(null, { ...draft, key: "" }, [])?.problem, "keyRequired");
    assert.equal(radiusServerProblem(null, { ...draft, key: MASKED_SECRET }, [])?.problem, "keyIsMask");
    assert.equal(radiusServerProblem(null, { ...draft, address: "192.0.2.1" }, ["192.0.2.1"])?.problem, "addressExists");
    assert.deepEqual(radiusServerProblem(null, { ...draft, priority: "256" }, []),
      { problem: "priorityRange", params: { min: 1, max: 255 } });
    assert.equal(radiusServerProblem(null, { ...draft, fail_time: "601" }, [])?.problem, "failTimeRange");
  });
});

describe("radiusSettingsOps", () => {
  const current = radius({
    timeout: "3",
    dynamic_author: { server: "192.0.2.2", port: "3799", key: MASKED_SECRET },
    rate_limit: { enable: true, attribute: "Filter-Id", multiplier: "1" },
  });

  it("sends nothing for an untouched save and keeps the stored DAE key", () => {
    assert.deepEqual(radiusSettingsOps(current, radiusDraft(current)), []);
    assert.equal(radiusSettingsProblem(current, radiusDraft(current)), null);
  });

  it("deletes each cleared DAE leaf and the key by leaf", () => {
    const draft = radiusDraft(current, { dae_server: "", dae_port: "", dae_key: "" });
    assert.equal(radiusSettingsProblem(current, draft), null);
    assert.deepEqual(radiusSettingsOps(current, draft), [
      { op: "delete_radius_dynamic_author_server" },
      { op: "delete_radius_dynamic_author_port" },
      { op: "delete_radius_dynamic_author_key" },
    ]);
  });

  it("clearing the DAE server alone deletes the stored port and mask key too", () => {
    // The port and key inputs are disabled without a server, so they keep their loaded values.
    const draft = radiusDraft(current, { dae_server: "" });
    assert.equal(draft.dae_key, MASKED_SECRET);
    assert.equal(radiusSettingsProblem(current, draft), null);
    assert.deepEqual(radiusSettingsOps(current, draft), [
      { op: "delete_radius_dynamic_author_server" },
      { op: "delete_radius_dynamic_author_port" },
      { op: "delete_radius_dynamic_author_key" },
    ]);
    // Leftovers of a server-only delete are cleaned with no server stored.
    const leftover = radius({ dynamic_author: { server: "", port: "3799", key: MASKED_SECRET } });
    assert.deepEqual(radiusSettingsOps(leftover, radiusDraft(leftover)), [
      { op: "delete_radius_dynamic_author_port" },
      { op: "delete_radius_dynamic_author_key" },
    ]);
    // Only what is stored is deleted, and port/key typed without a server are discarded.
    const serverOnly = radius({ dynamic_author: { server: "192.0.2.2", port: "", key: "" } });
    const typed = radiusDraft(serverOnly, { dae_server: "", dae_port: "99999", dae_key: "k" });
    assert.equal(radiusSettingsProblem(serverOnly, typed), null);
    assert.deepEqual(radiusSettingsOps(serverOnly, typed), [{ op: "delete_radius_dynamic_author_server" }]);
  });

  it("requires a DAE key for a server and rejects the typed mask", () => {
    assert.equal(radiusSettingsProblem(current, radiusDraft(current, { dae_key: "" }))?.problem, "daeKeyRequired");
    const empty = radius();
    assert.equal(radiusSettingsProblem(empty, radiusDraft(empty, { dae_server: "192.0.2.2", dae_key: MASKED_SECRET }))?.problem,
      "daeKeyIsMask");
    assert.equal(radiusSettingsProblem(empty, radiusDraft(empty, { dae_server: "192.0.2.2", dae_key: "k", dae_port: "0" }))?.problem,
      "daePortRange");
    assert.deepEqual(radiusSettingsOps(empty, radiusDraft(empty, { dae_server: "192.0.2.2", dae_key: "k" })), [
      { op: "set_radius_dynamic_author_server", value: "192.0.2.2" },
      { op: "set_radius_dynamic_author_key", value: "k" },
    ]);
  });

  it("turns rate-limit enable off alone and deletes the section once it is empty", () => {
    assert.deepEqual(radiusSettingsOps(current, radiusDraft(current, { rate_limit_enable: false, called_sid_format: "ifname" })), [
      { op: "set_radius_called_sid_format", value: "ifname" },
      { op: "delete_radius_rate_limit_enable" },
    ]);
    assert.deepEqual(radiusSettingsOps(current, radiusDraft(current, {
      rate_limit_enable: false, rate_limit_attribute: "", rate_limit_multiplier: "",
    })), [{ op: "delete_radius_rate_limit" }]);
  });

  it("checks the lab ranges, decimals included", () => {
    assert.deepEqual(radiusSettingsProblem(current, radiusDraft(current, { timeout: "61" })),
      { problem: "timeoutRange", params: { min: 1, max: 60 } });
    assert.equal(radiusSettingsProblem(current, radiusDraft(current, { rate_limit_multiplier: "0.5" })), null);
    assert.equal(radiusSettingsProblem(current, radiusDraft(current, { rate_limit_multiplier: "1e3" }))?.problem, "multiplierRange");
  });
});

describe("pools", () => {
  it("diffs IPv4 ranges by value and picks the next pool", () => {
    const pool = { name: "p1", ranges: ["10.0.0.0/24", "10.0.1.0/24"], next_pool: "p2" };
    assert.deepEqual(ipPoolOps(pool, { name: "p1", ranges: ["10.0.1.0/24", "10.0.2.0/24"], next_pool: "" }), [
      { op: "delete_pool_range", value: "10.0.0.0/24" },
      { op: "set_pool_range", value: "10.0.2.0/24" },
      { op: "delete_pool_next_pool" },
    ]);
    assert.deepEqual(ipPoolOps(null, { name: "p3", ranges: ["10.0.3.0/24"], next_pool: "p1" }), [
      { op: "create_pool" },
      { op: "set_pool_range", value: "10.0.3.0/24" },
      { op: "set_pool_next_pool", value: "p1" },
    ]);
    assert.equal(ipPoolProblem(null, { name: "p1", ranges: [], next_pool: "" }, ["p1"])?.problem, "poolExists");
    assert.equal(ipPoolProblem(null, { name: "p3", ranges: [], next_pool: "p1" }, ["p1"])?.problem, "nextPoolWithoutRange");
  });

  it("edits an IPv6 pool in place keyed by prefix", () => {
    const pool = {
      name: "v6",
      prefixes: [{ prefix: "2001:db8::/48", mask: "64" }, { prefix: "2001:db8:1::/48", mask: "64" }],
      delegates: [{ prefix: "2001:db8:f::/48", delegation_prefix: "56" }, { prefix: "2001:db8:e::/48", delegation_prefix: "56" }],
    };
    assert.deepEqual(ipv6PoolOps(pool, {
      name: "v6",
      prefixes: [{ prefix: "2001:db8::/48", mask: "" }, { prefix: "2001:db8:2::/48", mask: "" }],
      delegates: [{ prefix: "2001:db8:f::/48", delegation_prefix: "60" }],
    }), [
      { op: "delete_ipv6_pool_prefix", value: "2001:db8:1::/48" },
      { op: "delete_ipv6_pool_prefix_mask", value: "2001:db8::/48" },
      { op: "set_ipv6_pool_prefix", value: "2001:db8:2::/48" },
      { op: "delete_ipv6_pool_delegate", value: "2001:db8:e::/48" },
      { op: "set_ipv6_pool_delegate", value: "2001:db8:f::/48|60" },
    ]);
    assert.deepEqual(ipv6PoolOps(null, {
      name: "new",
      prefixes: [{ prefix: "2001:db8::/48", mask: "64" }],
      delegates: [],
    }), [
      { op: "create_ipv6_pool" },
      { op: "set_ipv6_pool_prefix_mask", value: "2001:db8::/48|64" },
    ]);
  });

  it("names the row an IPv6 check fails on", () => {
    const draft = { name: "v6", prefixes: [{ prefix: "2001:db8::/48", mask: "40" }], delegates: [] };
    assert.deepEqual(ipv6PoolProblem(null, draft, []),
      { problem: "maskRange", params: { min: 48, max: 128, prefix: "2001:db8::/48" } });
    assert.deepEqual(ipv6PoolProblem(null, {
      name: "v6", prefixes: [{ prefix: "2001:db8::/48", mask: "" }], delegates: [{ prefix: "2001:db8:f::/48", delegation_prefix: "" }],
    }, []), { problem: "delegationPrefixRequired", params: { prefix: "2001:db8:f::/48" } });
    assert.equal(ipv6PoolProblem(null, {
      name: "v6", prefixes: [], delegates: [{ prefix: "2001:db8:f::/48", delegation_prefix: "56" }],
    }, [])?.problem, "delegateWithoutPrefix");
  });

  it("rejects a | in a prefix or a delegate prefix, naming it", () => {
    assert.deepEqual(ipv6PoolProblem(null, {
      name: "v6", prefixes: [{ prefix: "2001:db8::/48|64", mask: "" }], delegates: [],
    }, []), { problem: "prefixHasPipe", params: { prefix: "2001:db8::/48|64" } });
    assert.deepEqual(ipv6PoolProblem(null, {
      name: "v6",
      prefixes: [{ prefix: "2001:db8::/48", mask: "" }],
      delegates: [{ prefix: "2001:db8:f::/48|56", delegation_prefix: "56" }],
    }, []), { problem: "delegatePrefixHasPipe", params: { prefix: "2001:db8:f::/48|56" } });
  });
});

describe("interfaceOps", () => {
  const eth1 = { interface: "eth1", vlans: ["10", "20-30"], vlan_mon: true, combined: true };

  it("creates with valueless combined and vlan-mon flags", () => {
    assert.deepEqual(interfaceOps(null, { interface: "eth2", vlans: ["100"], vlan_mon: true, combined: true }, true), [
      { op: "create_interface" },
      { op: "set_interface_vlan", value: "100" },
      { op: "set_interface_vlan_mon" },
      { op: "set_interface_combined" },
    ]);
  });

  it("deletes one VLAN by value and every VLAN at once when emptied", () => {
    assert.deepEqual(interfaceOps(eth1, { ...eth1, vlans: ["20-30", "40"] }, true), [
      { op: "delete_interface_vlan", value: "10" },
      { op: "set_interface_vlan", value: "40" },
    ]);
    assert.deepEqual(interfaceOps(eth1, { ...eth1, vlans: [], vlan_mon: false, combined: false }, true), [
      { op: "delete_interface_all_vlans" },
      { op: "delete_interface_vlan_mon" },
      { op: "delete_interface_combined" },
    ]);
  });

  it("never emits vlan-mon where the leaf does not exist", () => {
    assert.deepEqual(interfaceOps(null, { interface: "eth2", vlans: [], vlan_mon: true, combined: false }, false), [
      { op: "create_interface" },
    ]);
  });

  it("checks VLAN ids and ranges", () => {
    assert.ok(isVlanValue("1") && isVlanValue("4094") && isVlanValue("100-200"));
    assert.ok(!isVlanValue("0") && !isVlanValue("4095") && !isVlanValue("200-100") && !isVlanValue("1e2"));
    assert.equal(interfaceProblem({ ...eth1, vlans: ["5000"] }, true)?.problem, "vlanInvalid");
    assert.equal(interfaceProblem({ ...eth1, vlans: [] }, true)?.problem, "vlanMonWithoutVlan");
    assert.equal(interfaceProblem({ ...eth1, vlans: [] }, false), null);
  });
});

describe("pppOptionsOps", () => {
  const current = pppOptions({
    mppe: "prefer",
    min_mtu: "1280",
    ipv6_peer_interface_id: "calling-sid",
    ipv6_peer_interface_id_secret: MASKED_SECRET,
  });

  it("keeps the stored peer secret on an untouched save", () => {
    assert.deepEqual(pppOptionsOps(current, pppDraft(current), true), []);
    assert.equal(pppOptionsProblem(current, pppDraft(current), true), null);
  });

  it("deletes the secret by leaf when calling-sid is left", () => {
    assert.deepEqual(pppOptionsOps(current, pppDraft(current, { ipv6_peer_interface_id: "random" }), true), [
      { op: "set_ppp_ipv6_peer_interface_id", value: "random" },
      { op: "delete_ppp_ipv6_peer_interface_id_secret" },
    ]);
  });

  it("checks the 1.5 secret and sets a typed one", () => {
    const empty = pppOptions();
    const draft = pppDraft(empty, { ipv6_peer_interface_id: "calling-sid" });
    assert.equal(pppOptionsProblem(empty, draft, true)?.problem, "peerSecretRequired");
    assert.equal(pppOptionsProblem(empty, draft, false), null);
    assert.equal(pppOptionsProblem(empty, { ...draft, ipv6_peer_interface_id_secret: MASKED_SECRET }, true)?.problem,
      "peerSecretIsMask");
    assert.deepEqual(pppOptionsProblem(empty, { ...draft, ipv6_peer_interface_id_secret: "short" }, true),
      { problem: "peerSecretInvalid", params: { min: 16, max: 128 } });
    assert.equal(pppOptionsProblem(empty, { ...draft, ipv6_peer_interface_id_secret: "has a space in it!!" }, true)?.problem,
      "peerSecretInvalid");
    const secret = "0123456789abcdef";
    assert.deepEqual(pppOptionsOps(empty, { ...draft, ipv6_peer_interface_id_secret: secret }, true), [
      { op: "set_ppp_ipv6_peer_interface_id", value: "calling-sid" },
      { op: "set_ppp_ipv6_peer_interface_id_secret", value: secret },
    ]);
    assert.deepEqual(pppOptionsOps(empty, draft, false), [
      { op: "set_ppp_ipv6_peer_interface_id", value: "calling-sid" },
    ]);
  });

  it("sets and clears every leaf, and drops the node once all are cleared", () => {
    const full = pppOptions({
      ipv4: "allow", ipv6: "deny", mppe: "require", disable_ccp: true, interface_cache: "10", min_mtu: "1280",
      mru: "1492", lcp_echo_failure: "3", lcp_echo_interval: "30", lcp_echo_timeout: "0", ipv6_interface_id: "random",
      ipv6_peer_interface_id: "ipv4-addr", ipv6_accept_peer_interface_id: true,
    });
    assert.equal(pppOptionsOps(pppOptions(), pppDraft(full), true).length, 13);
    assert.deepEqual(pppOptionsOps(full, pppDraft(full, { mru: "", disable_ccp: false }), true), [
      { op: "delete_ppp_disable_ccp" },
      { op: "delete_ppp_mru" },
    ]);
    assert.deepEqual(pppOptionsOps(full, pppDraft(pppOptions()), true), [{ op: "delete_ppp_options" }]);
    assert.equal(pppOptionsProblem(full, pppDraft(full, { interface_cache: "0" }), true)?.problem, "interfaceCacheRange");
  });
});

describe("advancedOps", () => {
  const current = config({
    log: { level: "3" },
    pado_delays: [{ delay: "100", sessions: "64" }, { delay: "200", sessions: "128" }, { delay: "300" }],
    limits: { enabled: true, burst: "3", timeout: "60" },
    shaper: { enabled: true, fwmark: "5" },
    snmp: { enabled: true, master_agent: true },
    extended_scripts: { enabled: true, on_up: "/config/up.sh" },
  });

  it("sends nothing for an untouched save", () => {
    assert.deepEqual(advancedOps(current, advancedDraft(current)), []);
    assert.equal(advancedProblem(advancedDraft(current)), null);
  });

  it("edits PADO delays in one batch keyed by delay", () => {
    const ops = advancedOps(current, advancedDraft(current, {
      pado_delays: [
        { delay: "100", sessions: "" },
        { delay: "200", sessions: "256" },
        { delay: " 400 ", sessions: "512" },
      ],
    }));
    assert.deepEqual(ops, [
      { op: "delete_pado_delay", value: "300" },
      { op: "delete_pado_delay_sessions", value: "100" },
      { op: "set_pado_delay_sessions", value: "200|256" },
      { op: "set_pado_delay_sessions", value: "400|512" },
    ]);
    assert.deepEqual(advancedOps(config(), advancedDraft(config(), { pado_delays: [{ delay: "50", sessions: "" }] })), [
      { op: "set_pado_delay", value: "50" },
    ]);
    assert.deepEqual(advancedOps(current, advancedDraft(current, { pado_delays: [] })), [
      { op: "delete_all_pado_delays" },
    ]);
  });

  it("rejects the PADO combinations the lab verify refuses", () => {
    const draft = (rows: { delay: string; sessions: string }[]) => advancedDraft(config(), { pado_delays: rows });
    assert.equal(advancedProblem(draft([{ delay: "disable", sessions: "" }]))?.problem, "padoDisableNeedsSessions");
    assert.equal(advancedProblem(draft([{ delay: "1", sessions: "" }, { delay: "2", sessions: "" }]))?.problem,
      "padoOneWithoutSessions");
    assert.deepEqual(advancedProblem(draft([{ delay: "disable", sessions: "100" }, { delay: "5", sessions: "200" }])),
      { problem: "padoAfterDisable", params: { delay: "5" } });
    assert.equal(advancedProblem(draft([{ delay: "5", sessions: "1" }, { delay: "5 ", sessions: "2" }]))?.problem,
      "duplicatePadoDelay");
    assert.equal(advancedProblem(draft([{ delay: "0", sessions: "1" }]))?.problem, "padoDelayInvalid");
    assert.equal(advancedProblem(draft([{ delay: "", sessions: "1" }]))?.problem, "padoDelayRequired");
    assert.equal(advancedProblem(draft([{ delay: "disable", sessions: "300" }, { delay: "5", sessions: "200" }])), null);
  });

  it("turns a bare section on with its node and off with one delete", () => {
    const off = config();
    assert.deepEqual(advancedOps(off, advancedDraft(off, {
      limits_enabled: true, shaper_enabled: true, snmp_enabled: true, scripts_enabled: true,
    })), [
      { op: "set_limits" },
      { op: "set_shaper" },
      { op: "set_snmp" },
      { op: "set_extended_scripts" },
    ]);
    assert.deepEqual(advancedOps(current, advancedDraft(current, {
      limits_enabled: false, shaper_enabled: false, snmp_enabled: false, scripts_enabled: false, log_level: "",
    })), [
      { op: "delete_log_level" },
      { op: "delete_limits" },
      { op: "delete_shaper" },
      { op: "delete_snmp" },
      { op: "delete_extended_scripts" },
    ]);
  });

  it("sets a child without the bare node and deletes a child alone", () => {
    const off = config();
    assert.deepEqual(advancedOps(off, advancedDraft(off, {
      limits_enabled: true, limits_connection_limit: "20/min", shaper_enabled: true, shaper_fwmark: "7",
      snmp_enabled: true, snmp_master_agent: true, scripts_enabled: true, scripts_on_change: "/c", scripts_on_down: "/d",
      scripts_on_pre_up: "/p",
    })), [
      { op: "set_limits_connection_limit", value: "20/min" },
      { op: "set_shaper_fwmark", value: "7" },
      { op: "set_snmp_master_agent" },
      { op: "set_script_on_change", value: "/c" },
      { op: "set_script_on_down", value: "/d" },
      { op: "set_script_on_pre_up", value: "/p" },
    ]);
    assert.deepEqual(advancedOps(current, advancedDraft(current, {
      limits_burst: "", limits_timeout: "", shaper_fwmark: "", snmp_master_agent: false, scripts_on_up: "",
    })), [
      { op: "delete_limits_burst" },
      { op: "delete_limits_timeout" },
      { op: "delete_shaper_fwmark" },
      { op: "delete_snmp_master_agent" },
      { op: "delete_script_on_up" },
    ]);
    assert.equal(advancedProblem(advancedDraft(current, { shaper_fwmark: "0" }))?.problem, "fwmarkRange");
  });
});

describe("service saves", () => {
  it("posts object edits under the trimmed object name, in one batch", async () => {
    const { service, sent } = capture();
    await service.saveLocalUser(null, userDraft(null, { username: " bob ", password: "pw" }));
    await service.saveRadiusServer(null, serverDraft(null, { address: " 192.0.2.9 ", key: "k" }));
    await service.saveInterface(null, { interface: " eth3 ", vlans: [], vlan_mon: false, combined: true }, true);
    await service.saveIPPool(null, { name: " p9 ", ranges: [], next_pool: "" });
    assert.deepEqual(sent.map(([item]) => item), ["bob", "192.0.2.9", "eth3", "p9"]);
    assert.deepEqual(sent[0][1], [{ op: "create_local_user" }, { op: "set_local_user_password", value: "pw" }]);
  });

  it("throws the commit error of a rejected batch without refreshing, and skips an empty one", async () => {
    const posts: string[] = [];
    const original = apiClient.post;
    apiClient.post = (async (url: string) => {
      posts.push(url);
      return url.endsWith("/batch") ? { success: false, error: "Commit failed" } : { success: true };
    }) as typeof apiClient.post;
    try {
      await assert.rejects(pppoeServerService.deleteInterface("eth1"), { message: "Commit failed" });
      assert.deepEqual(posts, ["/vyos/pppoe-server/batch"]);
      // An untouched save posts nothing.
      const current = config();
      await pppoeServerService.updateGeneralSettings(current, generalDraft(current));
      await pppoeServerService.updateAdvancedSettings(current, advancedDraft(current));
      assert.equal(posts.length, 1);
    } finally {
      apiClient.post = original;
    }
  });

  it("keeps a landed commit successful when the cache refresh fails", async () => {
    const posts: string[] = [];
    const original = apiClient.post;
    apiClient.post = (async (url: string) => {
      posts.push(url);
      if (url.endsWith("/refresh")) throw { message: "refresh down" };
      return { success: true };
    }) as typeof apiClient.post;
    try {
      const result = await pppoeServerService.deleteInterface("eth1");
      assert.equal(result.success, true);
      assert.deepEqual(posts, ["/vyos/pppoe-server/batch", "/vyos/config/refresh"]);
    } finally {
      apiClient.post = original;
    }
  });
});
