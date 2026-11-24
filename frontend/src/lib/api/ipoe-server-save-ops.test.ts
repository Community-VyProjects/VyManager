import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advancedOps,
  authMacOps,
  authMacProblem,
  authModeOps,
  generalOps,
  interfaceOps,
  interfaceProblem,
  ipPoolOps,
  ipPoolProblem,
  ipv6PoolOps,
  ipv6PoolProblem,
  radiusServerOps,
  radiusServerProblem,
  radiusSettingsOps,
  radiusSettingsProblem,
  type IPoEAdvancedDraft,
  type IPoEGeneralDraft,
  type IPoEInterfaceDraft,
  type IPoERadiusServerDraft,
  type IPoERadiusSettingsDraft,
} from "./ipoe-server-save-ops";
import {
  ipoeServerService,
  type BatchOperation,
  type IPoEConfigResponse,
  type IPoEInterface,
  type IPoERadiusServer,
  type IPoERadiusSettings,
} from "./ipoe-server";

/** What the config response returns for a stored secret. */
const MASK = "***";

function config(overrides: Partial<IPoEConfigResponse> = {}): IPoEConfigResponse {
  return {
    configured: true,
    log: {},
    shaper: { enabled: false },
    snmp: { enabled: false, master_agent: false },
    extended_scripts: {},
    limits: { enabled: false },
    authentication: { interfaces: [], radius: { servers: [] } },
    client_ip_pools: [],
    client_ipv6_pools: [],
    interfaces: [],
    totals: { auth_interfaces: 0, radius_servers: 0, client_ip_pools: 0, client_ipv6_pools: 0, interfaces: 0 },
    ...overrides,
  };
}

function generalDraft(current: IPoEConfigResponse, overrides: Partial<IPoEGeneralDraft> = {}): IPoEGeneralDraft {
  return {
    description: current.description || "",
    default_pool: current.default_pool || "",
    default_ipv6_pool: current.default_ipv6_pool || "",
    gateway_addresses: current.gateway_addresses || [],
    name_servers: current.name_servers || [],
    max_concurrent_sessions: current.max_concurrent_sessions || "",
    thread_count: current.thread_count || "",
    lua_file: current.lua_file || "",
    idle_timeout: current.idle_timeout || "",
    ...overrides,
  };
}

function interfaceDraft(current: IPoEInterface | null, overrides: Partial<IPoEInterfaceDraft> = {}): IPoEInterfaceDraft {
  return {
    interface: current?.interface || "",
    mode: current?.mode || "",
    network: current?.network || "",
    start_session: current?.start_session || "",
    client_subnet: current?.client_subnet || "",
    vlans: current?.vlans || [],
    vlan_mon: current?.vlan_mon || false,
    lua_username: current?.lua_username || "",
    dhcp_relay: current?.external_dhcp?.dhcp_relay || "",
    giaddr: current?.external_dhcp?.giaddr || "",
    ...overrides,
  };
}

function stubbed(): { service: typeof ipoeServerService; sent: Array<[string, BatchOperation[]]> } {
  const sent: Array<[string, BatchOperation[]]> = [];
  const service = Object.create(ipoeServerService) as typeof ipoeServerService;
  service.batchConfigure = async (itemName: string, operations: BatchOperation[]) => {
    sent.push([itemName, operations]);
    return { success: true };
  };
  return { service, sent };
}

describe("generalOps", () => {
  const current = config({
    description: "lab",
    default_pool: "p1",
    gateway_addresses: ["192.0.2.1/24", "198.51.100.1/24"],
    name_servers: ["192.0.2.53"],
    thread_count: "half",
    idle_timeout: "300",
  });

  it("sends nothing for an untouched save", () => {
    assert.deepEqual(generalOps(current, generalDraft(current), true), []);
  });

  it("sets changed leaves, deletes cleared ones and diffs multi values", () => {
    const ops = generalOps(current, generalDraft(current, {
      description: " ",
      default_pool: "p2",
      gateway_addresses: ["198.51.100.1/24", " 203.0.113.1/24 "],
      name_servers: [],
      thread_count: "4",
      idle_timeout: "",
    }), true);
    assert.deepEqual(ops, [
      { op: "delete_description" },
      { op: "set_default_pool", value: "p2" },
      { op: "delete_gateway_address", value: "192.0.2.1/24" },
      { op: "set_gateway_address", value: "203.0.113.1/24" },
      { op: "delete_name_server", value: "192.0.2.53" },
      { op: "set_thread_count", value: "4" },
      { op: "delete_idle_timeout" },
    ]);
  });

  it("deletes the whole gateway list once when it is emptied", () => {
    const ops = generalOps(current, generalDraft(current, { gateway_addresses: [] }), true);
    assert.deepEqual(ops, [{ op: "delete_all_gateway_addresses" }]);
  });

  it("never emits idle-timeout where the leaf does not exist", () => {
    const ops = generalOps(config(), generalDraft(config(), { idle_timeout: "60" }), false);
    assert.deepEqual(ops, []);
    assert.deepEqual(generalOps(config(), generalDraft(config(), { idle_timeout: " 60 " }), true), [
      { op: "set_idle_timeout", value: "60" },
    ]);
  });
});

describe("authModeOps", () => {
  it("sets a picked mode, deletes for the default, and skips an untouched one", () => {
    assert.deepEqual(authModeOps(null, "radius"), [{ op: "set_auth_mode", value: "radius" }]);
    assert.deepEqual(authModeOps("radius", ""), [{ op: "delete_auth_mode" }]);
    assert.deepEqual(authModeOps(null, ""), []);
    assert.deepEqual(authModeOps("local", "local"), []);
  });
});

describe("interfaceOps", () => {
  const current: IPoEInterface = {
    interface: "eth1",
    mode: "l3",
    vlans: ["10", "20-30"],
    vlan_mon: true,
    external_dhcp: { dhcp_relay: "192.0.2.4", giaddr: "192.0.2.1" },
  };

  it("creates with only the leaves the user set (no default written)", () => {
    const ops = interfaceOps(null, interfaceDraft(null, { interface: "eth2", client_subnet: "10.0.0.0/24" }), true);
    assert.deepEqual(ops, [
      { op: "create_interface" },
      { op: "set_interface_client_subnet", value: "10.0.0.0/24" },
    ]);
  });

  it("sends nothing for an untouched edit", () => {
    assert.deepEqual(interfaceOps(current, interfaceDraft(current), true), []);
  });

  it("deletes one VLAN by value and the default mode by leaf", () => {
    const ops = interfaceOps(current, interfaceDraft(current, { mode: "", vlans: ["20-30", "40"] }), true);
    assert.deepEqual(ops, [
      { op: "delete_interface_mode" },
      { op: "delete_interface_vlan", value: "10" },
      { op: "set_interface_vlan", value: "40" },
    ]);
  });

  it("clears every VLAN and vlan-mon in one batch", () => {
    const ops = interfaceOps(current, interfaceDraft(current, { vlans: [], vlan_mon: false }), true);
    assert.deepEqual(ops, [{ op: "delete_interface_vlan_mon" }, { op: "delete_interface_all_vlans" }]);
  });

  it("deletes external-dhcp as a section when both leaves are cleared", () => {
    const ops = interfaceOps(current, interfaceDraft(current, { dhcp_relay: "", giaddr: " " }), true);
    assert.deepEqual(ops, [{ op: "delete_interface_external_dhcp" }]);
    const one = interfaceOps(current, interfaceDraft(current, { dhcp_relay: "", giaddr: "192.0.2.9" }), true);
    assert.deepEqual(one, [
      { op: "delete_interface_external_dhcp_relay" },
      { op: "set_interface_external_dhcp_giaddr", value: "192.0.2.9" },
    ]);
  });

  it("never emits vlan-mon where the leaf does not exist", () => {
    const ops = interfaceOps(null, interfaceDraft(null, { interface: "eth2", vlans: ["5"], vlan_mon: true }), false);
    assert.deepEqual(ops, [{ op: "create_interface" }, { op: "set_interface_vlan", value: "5" }]);
  });

  it("rejects the combinations the lab verify refuses", () => {
    const check = (draft: Partial<IPoEInterfaceDraft>, existing: IPoEInterface | null = null) =>
      interfaceProblem(existing, interfaceDraft(existing, { interface: "eth2", ...draft }), ["eth1"]);
    assert.equal(check({ interface: " " }), "interfaceRequired");
    assert.equal(check({ interface: "eth1" }), "interfaceExists");
    assert.equal(check({ client_subnet: "10.0.0.0/24", vlans: ["5"] }), "subnetWithVlan");
    assert.equal(check({ vlan_mon: true }), "vlanMonWithoutVlan");
    assert.equal(check({ dhcp_relay: "192.0.2.4" }), "relayWithoutGiaddr");
    assert.equal(check({}, current), null);
  });
});

describe("authMacOps", () => {
  it("creates the MAC with each leaf under it", () => {
    const ops = authMacOps(null, {
      interface: "eth1", mac: " 00:11:22:33:44:55 ", ip_address: "192.0.2.10", vlan: "", rate_download: "100", rate_upload: "",
    });
    assert.deepEqual(ops, [
      { op: "set_auth_interface_mac", value: "00:11:22:33:44:55" },
      { op: "set_auth_mac_ip_address", value: "00:11:22:33:44:55|192.0.2.10" },
      { op: "set_auth_mac_rate_limit_download", value: "00:11:22:33:44:55|100" },
    ]);
  });

  it("deletes a cleared leaf by MAC and skips untouched ones", () => {
    const current = { mac: "00:11:22:33:44:55", ip_address: "192.0.2.10", vlan: "10", rate_limit: { download: "100" } };
    const ops = authMacOps(current, {
      interface: "eth1", mac: current.mac, ip_address: "192.0.2.10", vlan: "", rate_download: "200", rate_upload: "",
    });
    assert.deepEqual(ops, [
      { op: "delete_auth_mac_vlan", value: "00:11:22:33:44:55" },
      { op: "set_auth_mac_rate_limit_download", value: "00:11:22:33:44:55|200" },
    ]);
  });

  it("drops the rate-limit node once both directions are cleared", () => {
    const current = { mac: "00:11:22:33:44:55", rate_limit: { download: "100", upload: "50" } };
    const base = { interface: "eth1", mac: current.mac, ip_address: "", vlan: "" };
    assert.deepEqual(authMacOps(current, { ...base, rate_download: "", rate_upload: "" }), [
      { op: "delete_auth_mac_rate_limit", value: "00:11:22:33:44:55" },
    ]);
    assert.deepEqual(authMacOps(current, { ...base, rate_download: "100", rate_upload: "" }), [
      { op: "delete_auth_mac_rate_limit_upload", value: "00:11:22:33:44:55" },
    ]);
  });

  it("rejects a MAC already on the interface, in any case", () => {
    const draft = { interface: "eth1", mac: "AA:BB:CC:DD:EE:FF", ip_address: "", vlan: "", rate_download: "", rate_upload: "" };
    assert.equal(authMacProblem(null, draft, ["aa:bb:cc:dd:ee:ff"]), "macExists");
    assert.equal(authMacProblem(null, { ...draft, interface: "" }, []), "interfaceRequired");
    assert.equal(authMacProblem(null, { ...draft, mac: " " }, []), "macRequired");
  });
});

describe("radiusServerOps", () => {
  const current: IPoERadiusServer = { address: "192.0.2.2", key: MASK, port: "1812", priority: "1", backup: true };
  const draft = (overrides: Partial<IPoERadiusServerDraft> = {}): IPoERadiusServerDraft => ({
    address: "192.0.2.2", key: "", port: "1812", acct_port: "", priority: "1", fail_time: "",
    disabled: false, backup: true, disable_accounting: false, ...overrides,
  });

  it("edits in place: a blank key keeps the stored one and nothing is deleted", () => {
    assert.deepEqual(radiusServerOps(current, draft()), []);
    assert.deepEqual(radiusServerOps(current, draft({ port: "", acct_port: "1813", backup: false, disabled: true })), [
      { op: "delete_radius_server_port" },
      { op: "set_radius_server_acct_port", value: "1813" },
      { op: "set_radius_server_disable" },
      { op: "delete_radius_server_backup" },
    ]);
  });

  it("sets a typed key as entered", () => {
    assert.deepEqual(radiusServerOps(current, draft({ key: " new key " })), [
      { op: "set_radius_server_key", value: " new key " },
    ]);
  });

  it("creates with the key and requires one", () => {
    const create = draft({ address: "192.0.2.3", key: "s3cret", port: "", priority: "", backup: false });
    assert.deepEqual(radiusServerOps(null, create), [
      { op: "set_radius_server" },
      { op: "set_radius_server_key", value: "s3cret" },
    ]);
    assert.equal(radiusServerProblem(null, { ...create, key: "" }, []), "keyRequired");
    assert.equal(radiusServerProblem(null, create, ["192.0.2.3"]), "addressExists");
    assert.equal(radiusServerProblem(current, draft(), ["192.0.2.2"]), null);
  });

  it("saves through one batch keyed on the address", async () => {
    const { service, sent } = stubbed();
    await service.saveRadiusServer(current, draft({ priority: "" }));
    assert.deepEqual(sent, [["192.0.2.2", [{ op: "delete_radius_server_priority" }]]]);
    await service.saveRadiusServer(current, draft());
    assert.equal(sent.length, 1);
  });
});

describe("radiusSettingsOps", () => {
  const current: IPoERadiusSettings = {
    servers: [],
    timeout: "3",
    dynamic_author: { server: "192.0.2.3", port: "3799", key: MASK },
    rate_limit: { enable: true, attribute: "Filter-Id" },
  };
  const draft = (overrides: Partial<IPoERadiusSettingsDraft> = {}): IPoERadiusSettingsDraft => ({
    source_address: "", timeout: "3", max_try: "", nas_identifier: "", nas_ip_address: "", preallocate_vif: false,
    accounting_interim_interval: "", acct_interim_jitter: "", acct_timeout: "",
    dae_server: "192.0.2.3", dae_port: "3799", dae_key: "",
    rate_limit_enable: true, rate_limit_attribute: "Filter-Id", rate_limit_vendor: "", rate_limit_multiplier: "",
    ...overrides,
  });

  it("sends nothing for an untouched save and keeps the stored DAE key", () => {
    assert.deepEqual(radiusSettingsOps(current, draft()), []);
  });

  it("drops the DAE node once every leaf is cleared, and the key with its server", () => {
    assert.deepEqual(radiusSettingsOps(current, draft({ dae_server: "", dae_port: "" })), [
      { op: "delete_radius_dynamic_author" },
    ]);
    assert.deepEqual(radiusSettingsOps(current, draft({ dae_server: "" })), [
      { op: "delete_radius_dynamic_author_server" },
      { op: "delete_radius_dynamic_author_key" },
    ]);
  });

  it("requires a key for a new DAE server", () => {
    const empty: IPoERadiusSettings = { servers: [] };
    assert.equal(radiusSettingsProblem(empty, draft({ dae_key: "" })), "daeKeyRequired");
    assert.equal(radiusSettingsProblem(current, draft()), null);
  });

  it("turns rate-limit enable off alone and deletes the section once it is empty", () => {
    assert.deepEqual(radiusSettingsOps(current, draft({ rate_limit_enable: false })), [
      { op: "delete_radius_rate_limit_enable" },
    ]);
    assert.deepEqual(radiusSettingsOps(current, draft({ rate_limit_enable: false, rate_limit_attribute: "" })), [
      { op: "delete_radius_rate_limit" },
    ]);
  });
});

describe("pools", () => {
  it("diffs IPv4 ranges by value and picks the next pool", () => {
    const current = { name: "p1", ranges: ["10.0.0.0/24", "10.0.1.0/24"], next_pool: "p2" };
    assert.deepEqual(ipPoolOps(current, { name: "p1", ranges: ["10.0.1.0/24", "10.0.2.0/24"], next_pool: "" }), [
      { op: "delete_pool_range", value: "10.0.0.0/24" },
      { op: "set_pool_range", value: "10.0.2.0/24" },
      { op: "delete_pool_next_pool" },
    ]);
    assert.equal(ipPoolProblem(null, { name: "p1", ranges: [], next_pool: "" }, ["p1"]), "poolExists");
    assert.equal(ipPoolProblem(null, { name: "p3", ranges: [], next_pool: "p3" }, []), "nextPoolSelf");
  });

  it("edits an IPv6 pool in place keyed by prefix", () => {
    const current = {
      name: "v6",
      prefixes: [{ prefix: "2001:db8::/48", mask: "64" }, { prefix: "2001:db8:2::/48", mask: "64" }],
      delegates: [{ prefix: "2001:db8:1::/48", delegation_prefix: "56" }],
    };
    const ops = ipv6PoolOps(current, {
      name: "v6",
      prefixes: [{ prefix: " 2001:db8::/48 ", mask: "60" }, { prefix: "", mask: "" }],
      delegates: [{ prefix: "2001:db8:1::/48", delegation_prefix: "56" }],
    });
    assert.deepEqual(ops, [
      { op: "delete_ipv6_pool_prefix", value: "2001:db8:2::/48" },
      { op: "set_ipv6_pool_prefix", value: "2001:db8::/48|60" },
    ]);
  });

  it("names the row a check fails on", () => {
    const draft = (prefixes: Array<{ prefix: string; mask: string }>) => ({ name: "v6", prefixes, delegates: [] });
    assert.deepEqual(ipv6PoolProblem(null, draft([{ prefix: "2001:db8::/48", mask: "" }]), []),
      { problem: "maskRequired", prefix: "2001:db8::/48" });
    assert.deepEqual(ipv6PoolProblem(null, draft([{ prefix: "", mask: "64" }]), []),
      { problem: "prefixRequired", prefix: "" });
    assert.deepEqual(ipv6PoolProblem(null, draft([
      { prefix: "2001:db8::/48", mask: "64" }, { prefix: "2001:db8::/48 ", mask: "60" },
    ]), []), { problem: "duplicatePrefix", prefix: "2001:db8::/48" });
    assert.deepEqual(ipv6PoolProblem(null, draft([]), ["v6"]), { problem: "poolExists", prefix: "" });
    assert.equal(ipv6PoolProblem(null, draft([{ prefix: "", mask: "" }]), []), null);
    assert.deepEqual(ipv6PoolProblem(null, {
      name: "v6", prefixes: [], delegates: [{ prefix: "2001:db8:1::/48", delegation_prefix: "56" }],
    }, []), { problem: "delegateWithoutPrefix", prefix: "" });
  });
});

describe("advancedOps", () => {
  const draft = (current: IPoEConfigResponse, overrides: Partial<IPoEAdvancedDraft> = {}): IPoEAdvancedDraft => ({
    log_level: current.log.level || "",
    shaper_enabled: !!current.shaper.enabled,
    shaper_fwmark: current.shaper.fwmark || "",
    snmp_enabled: !!current.snmp.enabled,
    snmp_master_agent: !!current.snmp.master_agent,
    limits_enabled: !!current.limits.enabled,
    limits_burst: current.limits.burst || "",
    limits_connection_limit: current.limits.connection_limit || "",
    limits_timeout: current.limits.timeout || "",
    scripts_on_change: "",
    scripts_on_down: "",
    scripts_on_pre_up: "",
    scripts_on_up: "",
    ...overrides,
  });

  it("turns a bare section on with its node and off with one delete", () => {
    const off = config();
    assert.deepEqual(advancedOps(off, draft(off, { shaper_enabled: true, snmp_enabled: true, limits_enabled: true })), [
      { op: "set_shaper" },
      { op: "set_snmp" },
      { op: "set_limits" },
    ]);
    const on = config({
      shaper: { enabled: true, fwmark: "5" },
      snmp: { enabled: true, master_agent: true },
      limits: { enabled: true, burst: "3" },
    });
    assert.deepEqual(advancedOps(on, draft(on, { shaper_enabled: false, snmp_enabled: false, limits_enabled: false })), [
      { op: "delete_shaper" },
      { op: "delete_snmp" },
      { op: "delete_limits" },
    ]);
  });

  it("sets a child without the bare node and deletes a child alone", () => {
    const off = config();
    assert.deepEqual(advancedOps(off, draft(off, { shaper_enabled: true, shaper_fwmark: "7", snmp_enabled: true, snmp_master_agent: true })), [
      { op: "set_shaper_fwmark", value: "7" },
      { op: "set_snmp_master_agent" },
    ]);
    const on = config({
      shaper: { enabled: true, fwmark: "5" },
      snmp: { enabled: true, master_agent: true },
      limits: { enabled: true, burst: "3", timeout: "60" },
      log: { level: "3" },
    });
    assert.deepEqual(advancedOps(on, draft(on, { shaper_fwmark: "", snmp_master_agent: false, limits_burst: "", log_level: "" })), [
      { op: "delete_log_level" },
      { op: "delete_shaper_fwmark" },
      { op: "delete_snmp_master_agent" },
      { op: "delete_limits_burst" },
    ]);
  });
});

describe("service saves", () => {
  it("skips the post when nothing changed", async () => {
    const { service, sent } = stubbed();
    const current = config({ description: "lab" });
    const result = await service.updateGeneralSettings(current, generalDraft(current), true);
    assert.deepEqual(result, { success: true });
    assert.deepEqual(sent, []);
  });

  it("posts interface and pool edits under the object name", async () => {
    const { service, sent } = stubbed();
    await service.saveInterface({ interface: "eth1" }, interfaceDraft({ interface: "eth1" }, { mode: "l3" }), true);
    await service.saveIPPool(null, { name: " p9 ", ranges: ["10.9.0.0/24"], next_pool: "" });
    assert.deepEqual(sent, [
      ["eth1", [{ op: "set_interface_mode", value: "l3" }]],
      ["p9", [{ op: "create_pool" }, { op: "set_pool_range", value: "10.9.0.0/24" }]],
    ]);
  });
});
