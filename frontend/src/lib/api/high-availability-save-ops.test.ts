import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  haGlobalsDraft,
  haGlobalsSaveOps,
  virtualServerDraft,
  virtualServerProblem,
  virtualServerSaveOps,
  vrrpGroupDraft,
  vrrpGroupProblem,
  vrrpGroupSaveOps,
  vrrpSyncGroupDraft,
  vrrpSyncGroupProblem,
  vrrpSyncGroupSaveOps,
} from "./high-availability-save-ops";
import {
  haService,
  type BatchOperation,
  type HAConfig,
  type VirtualServer,
  type VrrpGroup,
  type VrrpSyncGroup,
} from "./high-availability";

const EMPTY_HC = { failure_count: null, interval: null, ping: null, script: null, timeout: null };
const EMPTY_TS = { backup: null, fault: null, master: null, stop: null };
const EMPTY_GARP = {
  interval: null, master_delay: null, master_refresh: null, master_refresh_repeat: null, master_repeat: null,
};

const GROUP: VrrpGroup = {
  name: "G1",
  vrid: "10",
  interface: "eth1",
  addresses: [{ address: "192.0.2.1/24", interface: "eth1" }, { address: "192.0.2.2/24", interface: null }],
  excluded_addresses: [{ address: "192.0.2.9/24", interface: null }],
  priority: "200",
  advertise_interval: null,
  authentication: { type: "plaintext-password", password: "***" },
  preempt_delay: null,
  no_preempt: false,
  peer_addresses: ["192.0.2.20"],
  hello_source_address: null,
  rfc3768_compatibility: false,
  disabled: false,
  description: "lab",
  garp: { ...EMPTY_GARP, interval: "1" },
  health_check: { ...EMPTY_HC, script: "/config/scripts/hc.sh", interval: "10" },
  track: { interfaces: ["eth2"], exclude_vrrp_interface: false },
  transition_script: { ...EMPTY_TS, master: "/m" },
};

const V14 = { healthCheckTimeout: false };
const V15 = { healthCheckTimeout: true };

describe("vrrpGroupSaveOps", () => {
  it("creates every leaf the draft holds", () => {
    const draft = {
      ...vrrpGroupDraft(null),
      name: " G2 ",
      vrid: "011",
      interface: "eth1",
      description: "lab",
      priority: "150",
      advertise_interval: "2",
      addresses: [{ address: " 192.0.2.1/24 ", interface: "eth1" }, { address: "", interface: "" }],
      excluded_addresses: [{ address: "192.0.2.9/24", interface: "eth2" }],
      auth_type: "ah",
      auth_password: "pw",
      preempt_delay: "5",
      no_preempt: true,
      peer_addresses: [" 192.0.2.20", "192.0.2.20"],
      hello_source_address: "192.0.2.3",
      rfc3768_compatibility: true,
      track_interfaces: ["eth2"],
      track_exclude_vrrp_interface: true,
      health_check: { failure_count: "3", interval: "10", ping: "192.0.2.30", script: "", timeout: "5" },
      garp: { interval: "1", master_delay: "2", master_refresh: "3", master_refresh_repeat: "4", master_repeat: "5" },
      transition_script: { backup: "/b", fault: "/f", master: "/m", stop: "/s" },
    };
    assert.deepEqual(vrrpGroupSaveOps(null, draft, V15), [
      { op: "create_vrrp_group" },
      { op: "set_vrrp_group_vrid", value: "11" },
      { op: "set_vrrp_group_interface", value: "eth1" },
      { op: "set_vrrp_group_description", value: "lab" },
      { op: "set_vrrp_group_priority", value: "150" },
      { op: "set_vrrp_group_advertise_interval", value: "2" },
      { op: "set_vrrp_group_address", value: "192.0.2.1/24" },
      { op: "set_vrrp_group_address_interface", value: "192.0.2.1/24|eth1" },
      { op: "set_vrrp_group_excluded_address", value: "192.0.2.9/24" },
      { op: "set_vrrp_group_excluded_address_interface", value: "192.0.2.9/24|eth2" },
      { op: "set_vrrp_group_auth_type", value: "ah" },
      { op: "set_vrrp_group_auth_password", value: "pw" },
      { op: "set_vrrp_group_preempt_delay", value: "5" },
      { op: "set_vrrp_group_no_preempt" },
      { op: "set_vrrp_group_peer_address", value: "192.0.2.20" },
      { op: "set_vrrp_group_hello_source_address", value: "192.0.2.3" },
      { op: "set_vrrp_group_rfc3768_compatibility" },
      { op: "set_vrrp_group_track_interface", value: "eth2" },
      { op: "set_vrrp_group_track_exclude_vrrp_interface" },
      { op: "set_vrrp_group_health_check_failure_count", value: "3" },
      { op: "set_vrrp_group_health_check_interval", value: "10" },
      { op: "set_vrrp_group_health_check_ping", value: "192.0.2.30" },
      { op: "set_vrrp_group_health_check_timeout", value: "5" },
      { op: "set_vrrp_group_garp_interval", value: "1" },
      { op: "set_vrrp_group_garp_master_delay", value: "2" },
      { op: "set_vrrp_group_garp_master_refresh", value: "3" },
      { op: "set_vrrp_group_garp_master_refresh_repeat", value: "4" },
      { op: "set_vrrp_group_garp_master_repeat", value: "5" },
      { op: "set_vrrp_group_transition_script_backup", value: "/b" },
      { op: "set_vrrp_group_transition_script_fault", value: "/f" },
      { op: "set_vrrp_group_transition_script_master", value: "/m" },
      { op: "set_vrrp_group_transition_script_stop", value: "/s" },
    ]);
  });

  it("never emits the 1.5-only timeout on 1.4", () => {
    const draft = { ...vrrpGroupDraft(GROUP), health_check: { ...vrrpGroupDraft(GROUP).health_check, timeout: "5" } };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, draft, V14), []);
  });

  it("emits nothing for an untouched edit, and keeps the stored password", () => {
    assert.deepEqual(vrrpGroupSaveOps(GROUP, vrrpGroupDraft(GROUP), V15), []);
    assert.equal(vrrpGroupDraft(GROUP).auth_password, "");
  });

  it("sets only a typed password and treats blank as keep", () => {
    const draft = { ...vrrpGroupDraft(GROUP), auth_password: "   " };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, draft, V15), []);
    const typed = { ...vrrpGroupDraft(GROUP), auth_type: "ah", auth_password: " new " };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, typed, V15), [
      { op: "set_vrrp_group_auth_type", value: "ah" },
      { op: "set_vrrp_group_auth_password", value: " new " },
    ]);
  });

  it("deletes authentication when the type is cleared", () => {
    const draft = { ...vrrpGroupDraft(GROUP), auth_type: "" };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, draft, V15), [{ op: "delete_vrrp_group_auth" }]);
  });

  it("diffs addresses by value and their interfaces", () => {
    const draft = {
      ...vrrpGroupDraft(GROUP),
      addresses: [
        { address: "192.0.2.1/24", interface: "" },
        { address: "192.0.2.2/24", interface: "eth3" },
        { address: "192.0.2.5/24", interface: "" },
      ],
      excluded_addresses: [],
    };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, draft, V15), [
      { op: "delete_vrrp_group_address_interface", value: "192.0.2.1/24" },
      { op: "set_vrrp_group_address_interface", value: "192.0.2.2/24|eth3" },
      { op: "set_vrrp_group_address", value: "192.0.2.5/24" },
      { op: "delete_vrrp_group_excluded_address", value: "192.0.2.9/24" },
    ]);
  });

  it("deletes each cleared leaf, and a section it empties", () => {
    const loaded = vrrpGroupDraft(GROUP);
    const draft = {
      ...loaded,
      description: " ",
      priority: "",
      peer_addresses: [],
      track_interfaces: [],
      health_check: { ...loaded.health_check, script: "" },
      garp: { ...loaded.garp, interval: "" },
      transition_script: { ...loaded.transition_script, master: "" },
    };
    assert.deepEqual(vrrpGroupSaveOps(GROUP, draft, V15), [
      { op: "delete_vrrp_group_description" },
      { op: "delete_vrrp_group_priority" },
      { op: "delete_vrrp_group_peer_address", value: "192.0.2.20" },
      { op: "delete_vrrp_group_track" },
      { op: "delete_vrrp_group_health_check_script" },
      { op: "delete_vrrp_group_garp" },
      { op: "delete_vrrp_group_transition_script" },
    ]);
  });

  it("reports the lab's required leaves", () => {
    const blank = vrrpGroupDraft(null);
    assert.equal(vrrpGroupProblem(null, blank, [])?.key, "nameRequired");
    assert.equal(vrrpGroupProblem(null, { ...blank, name: "G1" }, ["G1"])?.key, "nameExists");
    const named = { ...blank, name: "G2", vrid: "1", interface: "eth1" };
    assert.equal(vrrpGroupProblem(null, named, [])?.key, "addressRequired");
    const addressed = { ...named, addresses: [{ address: "192.0.2.1/24", interface: "" }] };
    assert.equal(vrrpGroupProblem(null, { ...addressed, auth_type: "ah" }, [])?.key, "passwordRequired");
    assert.deepEqual(
      vrrpGroupProblem(null, { ...addressed, auth_type: "ah", auth_password: "123456789" }, []),
      { key: "passwordTooLong", max: 8 },
    );
    assert.equal(vrrpGroupProblem(GROUP, { ...vrrpGroupDraft(GROUP), auth_type: "ah" }, []), null);
    assert.deepEqual(
      vrrpGroupProblem(null, {
        ...addressed,
        addresses: [{ address: "192.0.2.1/24", interface: "" }, { address: " 192.0.2.1/24", interface: "" }],
      }, []),
      { key: "duplicateAddress", address: "192.0.2.1/24" },
    );
    assert.equal(
      vrrpGroupProblem(null, { ...addressed, health_check: { ...addressed.health_check, ping: "x", script: "/s" } }, [])?.key,
      "healthCheckPingAndScript",
    );
  });

  it("checks the lab ranges", () => {
    const draft = { ...vrrpGroupDraft(GROUP), vrid: "256" };
    assert.deepEqual(vrrpGroupProblem(GROUP, draft, []), { key: "outOfRange", field: "vrid", min: 1, max: 255 });
    const garp = { ...vrrpGroupDraft(GROUP), garp: { ...vrrpGroupDraft(GROUP).garp, interval: "0.5" } };
    assert.equal(vrrpGroupProblem(GROUP, garp, []), null);
    const bad = { ...vrrpGroupDraft(GROUP), garp: { ...vrrpGroupDraft(GROUP).garp, interval: "1001" } };
    assert.deepEqual(vrrpGroupProblem(GROUP, bad, []), { key: "outOfRange", field: "garp_interval", min: 0, max: 1000 });
  });
});

const SYNC: VrrpSyncGroup = {
  name: "S1",
  members: ["G1"],
  health_check: { ...EMPTY_HC, ping: "192.0.2.30" },
  transition_script: { ...EMPTY_TS, backup: "/b" },
};

describe("vrrpSyncGroupSaveOps", () => {
  it("creates, then diffs members and sections", () => {
    const draft = { ...vrrpSyncGroupDraft(null), name: "S2", members: ["G1", "G2"] };
    assert.deepEqual(vrrpSyncGroupSaveOps(null, draft, V15), [
      { op: "create_vrrp_sync_group" },
      { op: "set_vrrp_sync_group_member", value: "G1" },
      { op: "set_vrrp_sync_group_member", value: "G2" },
    ]);
    const edit = {
      ...vrrpSyncGroupDraft(SYNC),
      members: ["G2"],
      health_check: { ...vrrpSyncGroupDraft(SYNC).health_check, ping: "" },
      transition_script: { backup: "/b", fault: "/f", master: "", stop: "" },
    };
    assert.deepEqual(vrrpSyncGroupSaveOps(SYNC, edit, V15), [
      { op: "delete_vrrp_sync_group_member", value: "G1" },
      { op: "set_vrrp_sync_group_member", value: "G2" },
      { op: "delete_vrrp_sync_group_health_check" },
      { op: "set_vrrp_sync_group_transition_script_fault", value: "/f" },
    ]);
  });

  it("rejects a member that keeps its own health-check", () => {
    const draft = vrrpSyncGroupDraft(SYNC);
    assert.deepEqual(vrrpSyncGroupProblem(SYNC, draft, [], ["G1"]), { key: "memberHasHealthCheck", address: "G1" });
    assert.equal(vrrpSyncGroupProblem(SYNC, draft, [], []), null);
    assert.equal(vrrpSyncGroupProblem(null, { ...draft, members: [] }, [], [])?.key, "membersRequired");
  });
});

const VS: VirtualServer = {
  name: "V1",
  address: "192.0.2.50",
  algorithm: "round-robin",
  delay_loop: null,
  forward_method: "nat",
  fwmark: null,
  persistence_timeout: null,
  port: "80",
  protocol: "tcp",
  real_servers: [
    { address: "192.0.2.60", port: "8080", connection_timeout: "5", health_check_script: "/hc" },
  ],
};

describe("virtualServerSaveOps", () => {
  it("switches port to fwmark and edits real servers in place", () => {
    const loaded = virtualServerDraft(VS);
    const draft = {
      ...loaded,
      address: "",
      port: "",
      fwmark: "5",
      algorithm: "",
      real_servers: [
        { address: "192.0.2.60", port: "8081", connection_timeout: "", health_check_script: "" },
        { address: "192.0.2.61", port: "8080", connection_timeout: "3", health_check_script: "" },
      ],
    };
    assert.deepEqual(virtualServerSaveOps(VS, draft), [
      { op: "delete_virtual_server_address" },
      { op: "delete_virtual_server_port" },
      { op: "set_virtual_server_fwmark", value: "5" },
      { op: "delete_virtual_server_algorithm" },
      { op: "set_virtual_server_real_server_port", value: "192.0.2.60|8081" },
      { op: "delete_virtual_server_real_server_connection_timeout", value: "192.0.2.60" },
      { op: "delete_virtual_server_real_server_health_check", value: "192.0.2.60" },
      { op: "set_virtual_server_real_server", value: "192.0.2.61" },
      { op: "set_virtual_server_real_server_port", value: "192.0.2.61|8080" },
      { op: "set_virtual_server_real_server_connection_timeout", value: "192.0.2.61|3" },
    ]);
  });

  it("deletes a removed real server and emits nothing for an untouched edit", () => {
    assert.deepEqual(virtualServerSaveOps(VS, virtualServerDraft(VS)), []);
    const draft = {
      ...virtualServerDraft(VS),
      real_servers: [{ address: "192.0.2.70", port: "80", connection_timeout: "", health_check_script: "" }],
    };
    assert.deepEqual(virtualServerSaveOps(VS, draft), [
      { op: "delete_virtual_server_real_server", value: "192.0.2.60" },
      { op: "set_virtual_server_real_server", value: "192.0.2.70" },
      { op: "set_virtual_server_real_server_port", value: "192.0.2.70|80" },
    ]);
  });

  it("reports what the lab requires", () => {
    const loaded = virtualServerDraft(VS);
    const v15 = { min: 0, max: 86400 };
    assert.equal(virtualServerProblem(VS, loaded, [], v15), null);
    assert.equal(virtualServerProblem(VS, { ...loaded, address: "", fwmark: "" }, [], v15)?.key, "addressOrFwmarkRequired");
    assert.equal(virtualServerProblem(VS, { ...loaded, port: "" }, [], v15)?.key, "portOrFwmarkRequired");
    assert.equal(virtualServerProblem(VS, { ...loaded, fwmark: "5" }, [], v15)?.key, "portAndFwmark");
    assert.equal(virtualServerProblem(VS, { ...loaded, real_servers: [] }, [], v15)?.key, "realServerRequired");
    assert.deepEqual(
      virtualServerProblem(VS, { ...loaded, real_servers: [{ ...loaded.real_servers[0], port: " " }] }, [], v15),
      { key: "realServerPortRequired", address: "192.0.2.60" },
    );
    assert.deepEqual(
      virtualServerProblem(VS, { ...loaded, real_servers: [loaded.real_servers[0], { ...loaded.real_servers[0] }] }, [], v15),
      { key: "duplicateRealServer", address: "192.0.2.60" },
    );
    assert.equal(virtualServerProblem(VS, { ...loaded, persistence_timeout: "0" }, [], v15), null);
    assert.deepEqual(
      virtualServerProblem(VS, { ...loaded, persistence_timeout: "0" }, [], { min: 1, max: 86400 }),
      { key: "outOfRange", field: "persistence_timeout", min: 1, max: 86400 },
    );
    assert.deepEqual(
      virtualServerProblem(VS, { ...loaded, real_servers: [{ ...loaded.real_servers[0], port: "70000" }] }, [], v15),
      { key: "outOfRange", field: "port", min: 0, max: 65535, address: "192.0.2.60" },
    );
  });
});

const CONFIG: HAConfig = {
  disabled: false,
  vrrp: {
    global_parameters: { startup_delay: "5", version: "3", garp: { ...EMPTY_GARP, interval: "1" } },
    snmp: true,
    snmp_trap: true,
    groups: [],
    sync_groups: [],
  },
  virtual_servers: [],
};

describe("haGlobalsSaveOps", () => {
  it("emits nothing for an untouched edit", () => {
    assert.deepEqual(haGlobalsSaveOps(CONFIG, haGlobalsDraft(CONFIG), { snmpTrap: true }), []);
  });

  it("removes global-parameters when every leaf is cleared, and snmp with its trap", () => {
    const draft = {
      ...haGlobalsDraft(CONFIG),
      startup_delay: "",
      version: "",
      garp: { ...haGlobalsDraft(CONFIG).garp, interval: "" },
      snmp: false,
    };
    assert.deepEqual(haGlobalsSaveOps(CONFIG, draft, { snmpTrap: true }), [
      { op: "delete_vrrp_global_parameters" },
      { op: "delete_vrrp_snmp" },
    ]);
  });

  it("edits leaves and the trap on its own", () => {
    const draft = {
      ...haGlobalsDraft(CONFIG),
      version: "2",
      garp: { ...haGlobalsDraft(CONFIG).garp, interval: "", master_delay: "4" },
      snmp_trap: false,
    };
    assert.deepEqual(haGlobalsSaveOps(CONFIG, draft, { snmpTrap: true }), [
      { op: "set_vrrp_global_version", value: "2" },
      { op: "delete_vrrp_global_garp_interval" },
      { op: "set_vrrp_global_garp_master_delay", value: "4" },
      { op: "delete_vrrp_snmp_trap" },
    ]);
  });

  it("never emits the trap where capabilities lack it", () => {
    const config = { ...CONFIG, vrrp: { ...CONFIG.vrrp, snmp_trap: false } };
    const draft = { ...haGlobalsDraft(config), snmp_trap: true };
    assert.deepEqual(haGlobalsSaveOps(config, draft, { snmpTrap: false }), []);
  });
});

describe("haService", () => {
  function capture() {
    const calls: Array<[string, BatchOperation[]]> = [];
    const service = Object.create(haService) as typeof haService;
    service.batchConfigure = async (itemName: string, operations: BatchOperation[]) => {
      calls.push([itemName, operations]);
      return { success: true };
    };
    return { service, calls };
  }

  it("posts the trimmed object name with the diff ops", async () => {
    const { service, calls } = capture();
    await service.saveVrrpGroup(GROUP, { ...vrrpGroupDraft(GROUP), name: "G1 ", priority: " 0100 " }, V15);
    await service.saveVirtualServer(VS, { ...virtualServerDraft(VS), protocol: "udp" });
    await service.saveGlobals(CONFIG, { ...haGlobalsDraft(CONFIG), startup_delay: "7" }, { snmpTrap: true });
    assert.deepEqual(calls, [
      ["G1", [{ op: "set_vrrp_group_priority", value: "100" }]],
      ["V1", [{ op: "set_virtual_server_protocol", value: "udp" }]],
      ["", [{ op: "set_vrrp_global_startup_delay", value: "7" }]],
    ]);
  });

  it("does not post an empty batch", async () => {
    const result = await haService.batchConfigure("G1", []);
    assert.deepEqual(result, { success: true });
  });
});
