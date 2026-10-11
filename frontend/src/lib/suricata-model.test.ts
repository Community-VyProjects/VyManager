import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockers,
  buildOps,
  buildSetupConfig,
  configsEqual,
  editorDraft,
  findCycles,
  isAddress,
  isPort,
  mergeMissingStandardGroups,
  reviewConfig,
  setLoggingEnabled,
  variableName,
} from "./suricata-model.ts";

describe("suricata setup", () => {
  it("creates the variables rules and the capture config need", () => {
    const config = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["192.0.2.0/24"],
      includeStandardVariables: true,
      logAlerts: true,
    });
    const home = config.address_groups.find((group) => group.name === "home-net");
    assert.deepEqual(home?.members.map((member) => member.value), ["192.0.2.0/24"]);
    assert.equal(
      config.address_groups.find((group) => group.name === "external-net")?.groups[0]?.exclude,
      true,
    );
    for (const name of ["geneve-ports", "vxlan-ports", "teredo-ports", "http-ports"]) {
      assert.ok(config.port_groups.some((group) => group.name === name), name);
    }
    assert.equal(variableName("home-net"), "HOME_NET");
    assert.deepEqual(blockers(config), []);
  });

  it("still creates the capture port groups when the extra variables are off", () => {
    const config = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.1.0.0/16"],
      includeStandardVariables: false,
      logAlerts: false,
    });
    assert.deepEqual(
      config.port_groups.map((group) => group.name).sort(),
      ["geneve-ports", "teredo-ports", "vxlan-ports"],
    );
    assert.equal(config.address_groups.length, 2);
    assert.equal(config.log.enabled, false);
  });
});

describe("suricata review", () => {
  it("blocks a save the device would reject", () => {
    const reasons = blockers(buildSetupConfig({
      interfaces: [],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: false,
    }));
    assert.ok(reasons.some((reason) => reason.includes("interface")));
  });

  it("warns when the capture variables are missing but does not block a custom group", () => {
    const config = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: false,
    });
    config.port_groups = [{ name: "http-ports", members: [{ value: "80", exclude: false }], groups: [] }];
    const issues = reviewConfig(config);
    assert.equal(issues.some((issue) => issue.level === "block"), false);
    assert.ok(issues.some((issue) => issue.message.includes("$GENEVE_PORTS")));
  });

  it("rejects a prefix with host bits and an inverted port range", () => {
    assert.equal(isAddress("192.168.1.1/24"), false);
    assert.equal(isAddress("10.0.0.0/8"), true);
    assert.equal(isAddress("2001:db8::1"), true);
    assert.equal(isAddress("fe80::1%eth0"), false);
    assert.equal(isPort("1005-1001"), false);
    assert.equal(isPort("80"), true);
    assert.equal(isPort("65535"), true);
    assert.equal(isPort("65536"), false);
    assert.equal(isPort("70000"), false);
    assert.equal(isPort("99999"), false);
  });

  it("names a group cycle", () => {
    const cycle = findCycles([
      { name: "a", members: [], groups: [{ value: "b", exclude: false }] },
      { name: "b", members: [], groups: [{ value: "a", exclude: true }] },
    ]);
    assert.match(cycle ?? "", /refers to itself/);
  });
});

describe("suricata ops", () => {
  it("emits nothing when the draft matches", () => {
    const config = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    assert.deepEqual(buildOps(config, structuredClone(config)), []);
  });

  it("does not invent an alert type when the device left it implicit", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    original.log.types = [];
    original.log.types_set = false;
    const draft = editorDraft(original);
    assert.deepEqual(buildOps(original, draft), []);
  });

  it("does not write default log file fields the user did not change", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    original.log.filename = null;
    original.log.filetype = null;
    original.log.types = [];
    original.log.types_set = false;
    const draft = editorDraft(original);
    assert.equal(draft.log.filename, null);
    assert.equal(draft.log.filetype, null);
    assert.deepEqual(buildOps(original, draft), []);
  });

  it("clearing a custom log file resets it to eve.json", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    original.log.filename = "alerts.json";
    const cleared = structuredClone(original);
    cleared.log.filename = "";
    assert.equal(configsEqual(original, cleared), false);
    assert.deepEqual(
      buildOps(original, cleared).filter((op) => op.op === "set_log_eve_filename"),
      [{ op: "set_log_eve_filename", value: "eve.json" }],
    );
  });

  it("turning logging off and back on does not invent file defaults", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    original.log.filename = null;
    original.log.filetype = null;
    const back = setLoggingEnabled(setLoggingEnabled(original, false), true);
    assert.equal(back.log.filename, null);
    assert.equal(back.log.filetype, null);
    assert.equal(configsEqual(original, back), true);
    assert.deepEqual(buildOps(original, back), []);
  });

  it("turning logging off again drops unsaved log edits", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: false,
    });
    const edited = setLoggingEnabled(original, true);
    edited.log.filename = "alerts.json";
    edited.log.types = ["alert"];
    edited.log.types_set = true;
    const back = setLoggingEnabled(edited, false);
    assert.equal(configsEqual(original, back), true);
    assert.deepEqual(buildOps(original, back), []);
  });

  it("sets alert explicitly once another event type is added", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: true,
    });
    original.log.types = [];
    original.log.types_set = false;
    const updated = structuredClone(original);
    updated.log.types = ["alert", "http"];
    updated.log.types_set = true;
    const ops = buildOps(original, updated).filter((op) => op.op.includes("type"));
    assert.deepEqual(ops.map((op) => op.value).sort(), ["alert", "http"]);
  });

  it("adds a watched interface and an excluded address", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["10.0.0.0/8"],
      includeStandardVariables: false,
      logAlerts: false,
    });
    const updated = structuredClone(original);
    updated.interfaces.push("eth1");
    updated.address_groups[0].members.push({ value: "192.0.2.1", exclude: true });
    const ops = buildOps(original, updated);
    assert.deepEqual(ops, [
      { op: "set_interface", value: "eth1" },
      { op: "set_address", value: "home-net,!192.0.2.1" },
    ]);
  });

  it("fills missing standard groups without replacing home-net", () => {
    const original = buildSetupConfig({
      interfaces: ["eth0"],
      homeNet: ["192.0.2.0/24"],
      includeStandardVariables: false,
      logAlerts: false,
    });
    const merged = mergeMissingStandardGroups(original);
    const home = merged.address_groups.find((group) => group.name === "home-net");
    assert.deepEqual(home?.members.map((member) => member.value), ["192.0.2.0/24"]);
    assert.ok(merged.address_groups.some((group) => group.name === "dns-servers"));
    assert.ok(merged.port_groups.some((group) => group.name === "ssh-ports"));
  });
});
