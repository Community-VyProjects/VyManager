import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyIsisSrPrefix,
  isIsisIpNetwork,
  isisCreateInterfaceOps,
  isisDefaultInfoForm,
  isisDefaultInfoFreeLevels,
  isisDefaultInfoOps,
  isisDefaultInfoProblem,
  isisDeleteDefaultInfoOps,
  isisDeleteInterfaceOps,
  isisDeleteInterfaceProblem,
  isisDeleteIsisOps,
  isisDeleteRedistributeOps,
  isisGeneralForm,
  isisGeneralOps,
  isisGeneralProblem,
  isisInterfaceForm,
  isisInterfaceOps,
  isisInterfaceProblem,
  isisLoadSharingOps,
  isisNetProblem,
  isisPasswordForMode,
  isisPasswordModes,
  isisPriorityLimitFreeLevels,
  isisPriorityLimitOps,
  isisPriorityLimitProblem,
  isisRedistributeForm,
  isisRedistributeFreeLevels,
  isisRedistributeFreeProtocols,
  isisRedistributeOps,
  isisRedistributeProblem,
  isisRemotePrefixListOps,
  isisRemotePrefixListFreeLevels,
  isisRemotePrefixListProblem,
  isisRemotePrefixListRemoveOps,
  isisPriorityLimitRemoveOps,
  isisTiebreakerRemoveOps,
  isisSetupProblem,
  isisSegmentRoutingForm,
  isisSegmentRoutingOps,
  isisSegmentRoutingProblem,
  isisSpfDelayForm,
  isisSpfDelayOps,
  isisSpfDelayProblem,
  isisTeForm,
  isisTeOps,
  isisTeProblem,
  isisTiebreakerOps,
  isisTiebreakerProblem,
  isisTimersForm,
  isisTimersOps,
  isisTimersProblem,
  ISIS_HELLO_INTERVAL,
  ISIS_INTERFACE_METRIC,
  ISIS_REMOTE_LFA_MAX_METRIC,
  ISIS_SR_PREFIX_INDEX,
  ISIS_SPF_DELAY,
  ISIS_TIEBREAKER_INDEX,
  MASKED_SECRET,
} from "./isis-save-ops";
import { apiClient } from "./client";
import {
  isisService,
  type BatchOperation,
  type IsisGlobalConfig,
  type IsisInterface,
  type IsisSegmentRouting,
} from "./isis";

const FRR = { fastReroute: true };
const NO_FRR = { fastReroute: false };
const SRV6 = { srv6: true, msdTypes: ["max-end-d", "max-end-pop", "max-h-encaps", "max-segs-left"] };
const NO_SRV6 = { srv6: false, msdTypes: [] };
const NET = "49.0001.0000.0000.0001.00";
const LSP14 = { min: 1, max: 65235 };
const LSP15 = { min: 2, max: 65235 };
const DEFAULTS = { lsp_gen_interval: 30, lsp_refresh_interval: 900, max_lsp_lifetime: 1200 };
/** Capabilities: 1.5 runs verify's LSP timer cross-checks, 1.4 does not. */
const DEFAULTS15 = { lsp_timer_checks: true, lsp_timer_defaults: DEFAULTS };
const CAPS14 = { lsp_timer_checks: false, lsp_timer_defaults: DEFAULTS };
const ONE_IFACE = { interfaceCount: 1 };

function iface(partial: Partial<IsisInterface> = {}): IsisInterface {
  return {
    name: "eth0",
    circuit_type: null,
    metric: null,
    hello_interval: null,
    hello_multiplier: null,
    hello_padding: false,
    passive: false,
    point_to_point: false,
    priority: null,
    psnp_interval: null,
    no_three_way_handshake: false,
    password_md5: null,
    password_plaintext: null,
    bfd: false,
    bfd_profile: null,
    ldp_sync_holddown: null,
    ldp_sync_disable: false,
    lfa: { level1_enabled: false, level1_exclude_interfaces: [], level2_enabled: false, level2_exclude_interfaces: [] },
    ti_lfa: {
      enabled: false,
      level1_enabled: false,
      level1_node_protection: false,
      level1_link_fallback: false,
      level2_enabled: false,
      level2_node_protection: false,
      level2_link_fallback: false,
    },
    remote_lfa: {
      level1_enabled: false,
      level1_max_metric: null,
      level1_tunnel_mpls_ldp: false,
      level2_enabled: false,
      level2_max_metric: null,
      level2_tunnel_mpls_ldp: false,
    },
    ...partial,
  };
}

function global(partial: Partial<IsisGlobalConfig> = {}): IsisGlobalConfig {
  return {
    net: null,
    level: null,
    metric_style: null,
    dynamic_hostname: false,
    purge_originator: false,
    advertise_passive_only: false,
    advertise_high_metrics: false,
    set_attached_bit: false,
    set_overload_bit: false,
    log_adjacency_changes: false,
    topology: null,
    lsp_mtu: null,
    lsp_gen_interval: null,
    lsp_refresh_interval: null,
    max_lsp_lifetime: null,
    spf_interval: null,
    area_password_md5: null,
    area_password_plaintext: null,
    domain_password_md5: null,
    domain_password_plaintext: null,
    ldp_sync: false,
    ldp_sync_holddown: null,
    spf_delay_ietf: { init_delay: null, short_delay: null, long_delay: null, holddown: null, time_to_learn: null },
    ...partial,
  };
}

function sr(partial: Partial<IsisSegmentRouting> = {}): IsisSegmentRouting {
  return {
    global_block_low: null,
    global_block_high: null,
    local_block_low: null,
    local_block_high: null,
    maximum_label_depth: null,
    prefixes: [],
    srv6_locator: null,
    srv6_interface: null,
    srv6_node_msd: { max_end_d: null, max_end_pop: null, max_h_encaps: null, max_segs_left: null },
    ...partial,
  };
}

describe("interface passwords (md5 and plaintext-password are independent)", () => {
  const md5 = iface({ password_md5: MASKED_SECRET });
  const both = iface({ password_md5: MASKED_SECRET, password_plaintext: MASKED_SECRET });

  it("loads the mask; an unchanged mask sends nothing", () => {
    const form = isisInterfaceForm(md5);
    assert.equal(form.password_md5, MASKED_SECRET);
    assert.equal(form.password_plaintext, "");
    assert.deepEqual(isisInterfaceOps(md5, form, FRR), []);
    assert.equal(isisInterfaceProblem(md5, form, FRR), null);
  });

  it("an unchanged both-modes save emits no password op", () => {
    const form = isisInterfaceForm(both);
    assert.deepEqual([form.password_md5, form.password_plaintext], [MASKED_SECRET, MASKED_SECRET]);
    assert.deepEqual(isisInterfaceOps(both, form, FRR), []);
    assert.equal(isisInterfaceProblem(both, form, FRR), null);
  });

  it("clearing one stored mode deletes only that one; never because the other is set", () => {
    const form = isisInterfaceForm(both);
    assert.deepEqual(isisInterfaceOps(both, { ...form, password_plaintext: "  " }, FRR), [
      { op: "delete_interface_password_plaintext", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(both, { ...form, password_md5: "" }, FRR), [
      { op: "delete_interface_password_md5", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(both, { ...form, password_md5: "", password_plaintext: "" }, FRR), [
      { op: "delete_interface_password", value: "eth0" },
    ]);
  });

  it("setting the other mode keeps the stored one", () => {
    const form = isisInterfaceForm(md5);
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password_plaintext: "pw" }, FRR), [
      { op: "set_interface_password_plaintext", value: "eth0,pw" },
    ]);
  });

  it("sends a secret exactly as typed, padding included", () => {
    const form = isisInterfaceForm(md5);
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password_md5: " s3cret " }, FRR), [
      { op: "set_interface_password_md5", value: "eth0, s3cret " },
    ]);
  });

  it("rejects the mask typed where nothing is stored, and never sends it", () => {
    const form = { ...isisInterfaceForm(md5), password_plaintext: ` ${MASKED_SECRET} ` };
    assert.deepEqual(isisInterfaceProblem(md5, form, FRR), { key: "passwordMask", label: "interfacePlaintextPassword" });
    assert.ok(isisInterfaceOps(md5, form, FRR).every((op) => !(op.value || "").includes(MASKED_SECRET)));
    const fresh = { ...isisInterfaceForm(null), name: "eth1", password_md5: MASKED_SECRET };
    assert.deepEqual(isisInterfaceProblem(null, fresh, FRR), { key: "passwordMask", label: "interfaceMd5Password" });
  });
});

describe("area and domain password (single mode)", () => {
  it("offers a stored mode the device list lacks", () => {
    assert.deepEqual(isisPasswordModes(["plaintext-password"], MASKED_SECRET, null), ["plaintext-password", "md5"]);
    assert.deepEqual(isisPasswordModes(["md5", "plaintext-password"], null, null), ["md5", "plaintext-password"]);
  });

  it("mode switch deletes the old mode and sets the new one; secrets are not trimmed", () => {
    const g = global({ net: NET, area_password_md5: MASKED_SECRET, domain_password_plaintext: MASKED_SECRET });
    const form = isisGeneralForm(g);
    form.area_password = { mode: "plaintext-password", password: " pw " };
    form.domain_password = { mode: "md5", password: "dm" };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "delete_area_password_md5" },
      { op: "set_area_password_plaintext", value: " pw " },
      { op: "delete_domain_password_plaintext" },
      { op: "set_domain_password_md5", value: "dm" },
    ]);
    form.area_password = { mode: "", password: "" };
    form.domain_password = { mode: "plaintext-password", password: "" };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "delete_area_password" },
      { op: "delete_domain_password_plaintext" },
    ]);
  });

  it("an unchanged mask sends nothing; the mask on a new mode and a blank new password are rejected", () => {
    const g = global({ net: NET, area_password_md5: MASKED_SECRET, domain_password_plaintext: MASKED_SECRET });
    const form = isisGeneralForm(g);
    assert.deepEqual(isisGeneralProblem(g, form, ONE_IFACE), null);
    assert.deepEqual(isisGeneralOps(g, form), []);
    const draft = isisPasswordForMode(g.area_password_md5, g.area_password_plaintext, "plaintext-password");
    assert.deepEqual(draft, { mode: "plaintext-password", password: "" });
    assert.deepEqual(isisGeneralProblem(g, { ...form, area_password: { ...draft, password: MASKED_SECRET } }, ONE_IFACE), {
      key: "passwordMask", label: "areaPassword",
    });
    assert.deepEqual(isisGeneralProblem(g, { ...form, domain_password: { mode: "md5", password: " " } }, ONE_IFACE), {
      key: "passwordRequired", label: "domainPassword",
    });
  });
});

describe("interface diff", () => {
  it("create diffs against null and sets only filled leaves", () => {
    const form = {
      ...isisInterfaceForm(null),
      name: " eth1 ",
      circuit_type: "level-2-only",
      metric: " 10 ",
      passive: true,
      bfd: true,
      bfd_profile: "fast",
      password_md5: "k",
    };
    assert.deepEqual(isisInterfaceOps(null, form, NO_FRR), [
      { op: "set_interface", value: "eth1" },
      { op: "set_interface_circuit_type", value: "eth1,level-2-only" },
      { op: "set_interface_metric", value: "eth1,10" },
      { op: "set_interface_passive", value: "eth1" },
      { op: "set_interface_bfd", value: "eth1" },
      { op: "set_interface_bfd_profile", value: "eth1,fast" },
      { op: "set_interface_password_md5", value: "eth1,k" },
    ]);
  });

  it("the first interface carries the NET in the same batch", () => {
    const form = { ...isisInterfaceForm(null), name: "eth1" };
    assert.deepEqual(isisCreateInterfaceOps(form, NO_FRR, ` ${NET} `), [
      { op: "set_net", value: NET },
      { op: "set_interface", value: "eth1" },
    ]);
    assert.deepEqual(isisCreateInterfaceOps(form, NO_FRR, null), [{ op: "set_interface", value: "eth1" }]);
  });

  it("edit never deletes the interface; a cleared leaf deletes, a changed leaf sets", () => {
    const loaded = iface({ metric: 10, hello_interval: 3, passive: true, password_md5: MASKED_SECRET, bfd: true, bfd_profile: "p" });
    const form = { ...isisInterfaceForm(loaded), metric: "20", hello_interval: " ", passive: false, bfd_profile: "" };
    const ops = isisInterfaceOps(loaded, form, FRR);
    assert.deepEqual(ops, [
      { op: "set_interface_metric", value: "eth0,20" },
      { op: "delete_interface_hello_interval", value: "eth0" },
      { op: "delete_interface_passive", value: "eth0" },
      { op: "delete_interface_bfd_profile", value: "eth0" },
    ]);
    assert.ok(ops.every((op) => op.op !== "delete_interface"));
    assert.deepEqual(isisInterfaceOps(loaded, { ...form, bfd: false }, FRR).at(-1), {
      op: "delete_interface_bfd", value: "eth0",
    });
  });

  it("ldp-sync holddown deletes alone; clearing both deletes the node", () => {
    const loaded = iface({ ldp_sync_holddown: 50, ldp_sync_disable: true });
    const form = isisInterfaceForm(loaded);
    assert.deepEqual(isisInterfaceOps(loaded, { ...form, ldp_sync_holddown: "" }, FRR), [
      { op: "delete_interface_ldp_sync_holddown", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(loaded, { ...form, ldp_sync_disable: false }, FRR), [
      { op: "delete_interface_ldp_sync_disable", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(loaded, { ...form, ldp_sync_holddown: "", ldp_sync_disable: false }, FRR), [
      { op: "delete_interface_ldp_sync", value: "eth0" },
    ]);
  });

  it("diffs LFA exclude interfaces by value and sets a bare ti-lfa node", () => {
    const loaded = iface({
      lfa: { level1_enabled: true, level1_exclude_interfaces: ["eth1", "eth2"], level2_enabled: false, level2_exclude_interfaces: [] },
    });
    const form = isisInterfaceForm(loaded);
    form.level1 = { ...form.level1, exclude: ["eth2", " eth3 "] };
    form.tiLfa = true;
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), [
      { op: "delete_interface_lfa_level1_exclude", value: "eth0,eth1" },
      { op: "set_interface_lfa_level1_exclude", value: "eth0,eth3" },
      { op: "set_interface_ti_lfa", value: "eth0" },
    ]);
  });

  it("removing the last TI-LFA level keeps ti-lfa as a bare node", () => {
    const loaded = iface({
      ti_lfa: {
        enabled: true,
        level1_enabled: false,
        level1_node_protection: false,
        level1_link_fallback: false,
        level2_enabled: true,
        level2_node_protection: false,
        level2_link_fallback: false,
      },
    });
    const form = isisInterfaceForm(loaded);
    assert.equal(form.tiLfa, true);
    form.level2 = { ...form.level2, tiLfa: false };
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), [
      { op: "set_interface_ti_lfa", value: "eth0" },
      { op: "delete_interface_ti_lfa_level2", value: "eth0" },
    ]);
  });

  it("creating remote LFA sets the node, max-metric and the MPLS LDP tunnel", () => {
    const loaded = iface({
      lfa: { level1_enabled: true, level1_exclude_interfaces: [], level2_enabled: false, level2_exclude_interfaces: [] },
    });
    const form = isisInterfaceForm(loaded);
    form.level1 = { ...form.level1, remoteLfa: true, remoteMaxMetric: " 100 ", remoteTunnelMplsLdp: true };
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), [
      { op: "set_interface_remote_lfa_level1", value: "eth0" },
      { op: "set_interface_remote_lfa_level1_max_metric", value: "eth0,100" },
      { op: "set_interface_remote_lfa_level1_tunnel_mpls_ldp", value: "eth0" },
    ]);
    assert.equal(isisInterfaceProblem(loaded, form, FRR), null);
  });

  it("TI-LFA levels, protection and remote LFA leaves diff one by one", () => {
    const loaded = iface({
      lfa: { level1_enabled: false, level1_exclude_interfaces: [], level2_enabled: true, level2_exclude_interfaces: [] },
      ti_lfa: {
        enabled: true,
        level1_enabled: true,
        level1_node_protection: true,
        level1_link_fallback: true,
        level2_enabled: false,
        level2_node_protection: false,
        level2_link_fallback: false,
      },
      remote_lfa: {
        level1_enabled: false,
        level1_max_metric: null,
        level1_tunnel_mpls_ldp: false,
        level2_enabled: true,
        level2_max_metric: 100,
        level2_tunnel_mpls_ldp: true,
      },
    });
    const form = isisInterfaceForm(loaded);
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), []);
    form.level1 = { ...form.level1, linkFallback: false };
    form.level2 = { ...form.level2, remoteMaxMetric: "", remoteTunnelMplsLdp: false };
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), [
      { op: "delete_interface_ti_lfa_level1_link_fallback", value: "eth0" },
      { op: "delete_interface_remote_lfa_level2_max_metric", value: "eth0" },
      { op: "delete_interface_remote_lfa_level2_tunnel_mpls_ldp", value: "eth0" },
    ]);
    form.level1 = { ...form.level1, nodeProtection: false };
    form.level2 = { ...form.level2, remoteLfa: false };
    assert.deepEqual(isisInterfaceOps(loaded, form, FRR), [
      { op: "delete_interface_ti_lfa_level1_node_protection", value: "eth0" },
      { op: "delete_interface_remote_lfa_level2", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(loaded, { ...form, tiLfa: false }, FRR)[0], {
      op: "delete_interface_ti_lfa", value: "eth0",
    });
  });

  it("emits no fast-reroute op when the device has no interface fast-reroute", () => {
    const form = isisInterfaceForm(null);
    form.name = "eth0";
    form.level1 = { ...form.level1, lfa: true };
    form.tiLfa = true;
    assert.deepEqual(isisInterfaceOps(null, form, NO_FRR), [{ op: "set_interface", value: "eth0" }]);
  });

  it("interface checks: name, ranges, LFA vs TI-LFA, remote LFA needs LFA, exclude duplicates", () => {
    const base = { ...isisInterfaceForm(null), name: "eth0" };
    assert.deepEqual(isisInterfaceProblem(null, { ...base, name: " " }, FRR), { key: "interfaceRequired" });
    assert.deepEqual(isisInterfaceProblem(null, { ...base, hello_interval: "601" }, FRR), {
      key: "range", label: "helloInterval", ...ISIS_HELLO_INTERVAL,
    });
    assert.deepEqual(isisInterfaceProblem(null, { ...base, metric: "16777216" }, FRR), {
      key: "range", label: "metric", ...ISIS_INTERFACE_METRIC,
    });
    assert.equal(isisInterfaceProblem(null, { ...base, metric: " 0 " }, FRR), null);
    assert.equal(isisInterfaceProblem(null, { ...base, priority: "128" }, FRR)?.label, "priority");
    assert.equal(isisInterfaceProblem(null, { ...base, psnp_interval: "128" }, FRR)?.label, "psnpInterval");
    assert.equal(isisInterfaceProblem(null, { ...base, hello_multiplier: "1" }, FRR)?.label, "helloMultiplier");
    assert.equal(isisInterfaceProblem(null, { ...base, ldp_sync_holddown: "10001" }, FRR)?.label, "ldpSyncHolddown");
    const conflict = { ...base, tiLfa: true, level1: { ...base.level1, lfa: true, tiLfa: true } };
    assert.deepEqual(isisInterfaceProblem(null, conflict, FRR), { key: "lfaTiLfaConflict", level: "level-1" });
    assert.equal(isisInterfaceProblem(null, conflict, NO_FRR), null);
    const rlfa = { ...base, level2: { ...base.level2, remoteLfa: true } };
    assert.deepEqual(isisInterfaceProblem(null, rlfa, FRR), { key: "remoteLfaNeedsLfa", level: "level-2" });
    const metric = { ...base, level2: { ...base.level2, lfa: true, remoteLfa: true, remoteMaxMetric: "0" } };
    assert.deepEqual(isisInterfaceProblem(null, metric, FRR), {
      key: "rowRange", label: "remoteLfaMaxMetric", name: "level-2", ...ISIS_REMOTE_LFA_MAX_METRIC,
    });
    const dup = { ...base, level1: { ...base.level1, exclude: ["eth1", " eth1"] } };
    assert.deepEqual(isisInterfaceProblem(null, dup, FRR), { key: "excludeDuplicate", level: "level-1", name: "eth1" });
  });

  it("the last interface cannot be deleted while IS-IS is configured", () => {
    assert.deepEqual(isisDeleteInterfaceProblem(1), { key: "lastInterface" });
    assert.equal(isisDeleteInterfaceProblem(2), null);
  });
});

describe("global settings", () => {
  it("an unchanged form sends nothing", () => {
    const g = global({ net: NET, level: "level-2", topology: "ipv6-unicast", area_password_md5: MASKED_SECRET, ldp_sync: true });
    assert.deepEqual(isisGeneralOps(g, isisGeneralForm(g)), []);
    assert.deepEqual(isisTimersOps(g, isisTimersForm(g)), []);
    assert.deepEqual(isisSpfDelayOps(g.spf_delay_ietf, isisSpfDelayForm(g.spf_delay_ietf)), []);
  });

  it("topology is single-value: a change sets, a clear deletes with no value", () => {
    const g = global({ net: NET, topology: "ipv6-unicast" });
    assert.deepEqual(isisGeneralOps(g, { ...isisGeneralForm(g), topology: "ipv4-mgmt" }), [
      { op: "set_topology", value: "ipv4-mgmt" },
    ]);
    assert.deepEqual(isisGeneralOps(g, { ...isisGeneralForm(g), topology: "" }), [{ op: "delete_topology" }]);
  });

  it("NET is one leaf: a change sets (the set replaces it), a clear deletes with no value; flags set and delete", () => {
    const g = global({ net: NET, set_overload_bit: true });
    const form = { ...isisGeneralForm(g), net: " 49.0001.0000.0000.0002.00 ", set_overload_bit: false, set_attached_bit: true };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "set_net", value: "49.0001.0000.0000.0002.00" },
      { op: "set_attached_bit" },
      { op: "delete_overload_bit" },
    ]);
    assert.deepEqual(isisGeneralOps(g, { ...isisGeneralForm(g), net: " " }), [{ op: "delete_net" }]);
  });

  it("NET checks: required while configured, selector byte 00", () => {
    const g = global({ net: NET });
    assert.deepEqual(isisGeneralProblem(g, { ...isisGeneralForm(g), net: "" }, ONE_IFACE), { key: "netRequired" });
    assert.deepEqual(isisGeneralProblem(g, { ...isisGeneralForm(g), net: "49.0001.0000.0000.0001.01" }, ONE_IFACE), {
      key: "netSelector",
    });
    assert.deepEqual(isisNetProblem("", true), { key: "netRequired" });
    assert.equal(isisNetProblem("", false), null);
    assert.equal(isisNetProblem(` ${NET} `, true), null);
  });

  it("general settings need an interface first (verify needs one in every commit)", () => {
    const g = global();
    assert.deepEqual(isisGeneralProblem(g, { ...isisGeneralForm(g), net: NET }, { interfaceCount: 0 }), {
      key: "generalNeedsInterface",
    });
  });

  it("a single global level is blocked while redistribute (ipv4 or ipv6) sits at the other level", () => {
    const g = global({ net: NET });
    const form = isisGeneralForm(g);
    const at = (level: string) => ({ protocol: "bgp", level, metric: null, route_map: null });
    const opts = (redistribute: ReturnType<typeof at>[]) => ({ interfaceCount: 1, redistribute });
    assert.deepEqual(isisGeneralProblem(g, { ...form, level: "level-1" }, opts([at("level-1"), at("level-2")])), {
      key: "levelRedistributeConflict", name: "level-1", level: "level-2",
    });
    assert.deepEqual(isisGeneralProblem(g, { ...form, level: " level-2 " }, opts([at("level-1")])), {
      key: "levelRedistributeConflict", name: "level-2", level: "level-1",
    });
    assert.equal(isisGeneralProblem(g, { ...form, level: "level-1" }, opts([at("level-1")])), null);
    assert.equal(isisGeneralProblem(g, { ...form, level: "level-1-2" }, opts([at("level-1"), at("level-2")])), null);
    assert.equal(isisGeneralProblem(g, { ...form, level: "" }, opts([at("level-1"), at("level-2")])), null);
  });

  it("timers: ranges use the capability for lsp refresh", () => {
    const g = global({ lsp_mtu: 1497 });
    const form = { ...isisTimersForm(g), lsp_mtu: " 1400 ", spf_interval: "5" };
    assert.deepEqual(isisTimersOps(g, form), [
      { op: "set_lsp_mtu", value: "1400" },
      { op: "set_spf_interval", value: "5" },
    ]);
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "1" }, LSP14, null), null);
    assert.deepEqual(isisTimersProblem({ ...form, lsp_refresh_interval: "1" }, LSP15, null), {
      key: "range", label: "lspRefreshInterval", ...LSP15,
    });
    assert.equal(isisTimersProblem({ ...form, lsp_mtu: "127" }, LSP15, null)?.label, "lspMtu");
    assert.equal(isisTimersProblem({ ...form, lsp_gen_interval: "121" }, LSP15, null)?.label, "lspGenInterval");
    assert.equal(isisTimersProblem({ ...form, max_lsp_lifetime: "349" }, LSP15, null)?.label, "maxLspLifetime");
    assert.equal(isisTimersProblem({ ...form, spf_interval: "121" }, LSP15, null)?.label, "spfInterval");
    assert.equal(isisTimersProblem({ ...form, spf_interval: "1.5" }, LSP15, null)?.label, "spfInterval");
  });

  it("1.5 LSP timer cross-checks fill unset timers with the defaults; 1.4 skips them", () => {
    const form = isisTimersForm(global());
    assert.equal(isisTimersProblem(form, LSP15, DEFAULTS15), null);
    // gen 30 (default) is not below refresh 20.
    assert.deepEqual(isisTimersProblem({ ...form, lsp_refresh_interval: "20" }, LSP15, DEFAULTS15), {
      key: "lspGenNotBelowRefresh", max: 19,
    });
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "20" }, LSP14, null), null);
    // 1.4 caps carry the defaults too, but lsp_timer_checks false skips the cross-checks.
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "20" }, LSP14, CAPS14), null);
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "1000" }, LSP14, CAPS14), null);
    assert.deepEqual(isisTimersProblem({ ...form, lsp_gen_interval: "60", lsp_refresh_interval: "60" }, LSP15, DEFAULTS15), {
      key: "lspGenNotBelowRefresh", max: 59,
    });
    // lifetime 1200 (default) < refresh 1000 + 300.
    assert.deepEqual(isisTimersProblem({ ...form, lsp_refresh_interval: "1000" }, LSP15, DEFAULTS15), {
      key: "lspLifetimeTooShort", min: 1300,
    });
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "1000", max_lsp_lifetime: "1300" }, LSP15, DEFAULTS15), null);
    assert.equal(isisTimersProblem({ ...form, max_lsp_lifetime: "1199" }, LSP15, DEFAULTS15)?.key, "lspLifetimeTooShort");
  });

  it("ldp-sync: bare node, holddown alone, and the toggle", () => {
    const off = global();
    assert.deepEqual(isisTimersOps(off, { ...isisTimersForm(off), ldp_sync: true }), [{ op: "set_ldp_sync" }]);
    assert.deepEqual(isisTimersOps(off, { ...isisTimersForm(off), ldp_sync: true, ldp_sync_holddown: "10" }), [
      { op: "set_ldp_sync_holddown", value: "10" },
    ]);
    const withHold = global({ ldp_sync: true, ldp_sync_holddown: 10 });
    assert.equal(isisTimersForm(withHold).ldp_sync, true);
    assert.deepEqual(isisTimersOps(withHold, { ...isisTimersForm(withHold), ldp_sync_holddown: "" }), [
      { op: "delete_ldp_sync_holddown" },
    ]);
    assert.deepEqual(isisTimersOps(withHold, { ...isisTimersForm(withHold), ldp_sync_holddown: "20" }), [
      { op: "set_ldp_sync_holddown", value: "20" },
    ]);
    assert.deepEqual(isisTimersOps(withHold, { ...isisTimersForm(withHold), ldp_sync: false }), [{ op: "delete_ldp_sync" }]);
    const bare = global({ ldp_sync: true });
    assert.deepEqual(isisTimersOps(bare, { ...isisTimersForm(bare), ldp_sync: false }), [{ op: "delete_ldp_sync" }]);
    // The holddown is ignored (and not range-checked) while the toggle is off.
    const offForm = { ...isisTimersForm(off), ldp_sync_holddown: "99999" };
    assert.equal(isisTimersProblem(offForm, LSP15, null), null);
    assert.deepEqual(isisTimersOps(off, offForm), []);
    assert.equal(isisTimersProblem({ ...offForm, ldp_sync: true }, LSP15, null)?.label, "ldpSyncHolddown");
  });

  it("spf-delay-ietf: all five or none", () => {
    const empty = global().spf_delay_ietf;
    const all = { init_delay: "10", short_delay: "20", long_delay: "30", holddown: "40", time_to_learn: "50" };
    assert.deepEqual(isisSpfDelayOps(empty, all).map((op) => op.op), [
      "set_spf_delay_ietf_init_delay",
      "set_spf_delay_ietf_short_delay",
      "set_spf_delay_ietf_long_delay",
      "set_spf_delay_ietf_holddown",
      "set_spf_delay_ietf_time_to_learn",
    ]);
    assert.deepEqual(isisSpfDelayProblem({ ...all, holddown: " " }), { key: "spfDelayAllOrNone" });
    assert.deepEqual(isisSpfDelayProblem({ ...all, holddown: "60001" }), {
      key: "range", label: "holddown", ...ISIS_SPF_DELAY,
    });
    const stored = { init_delay: 10, short_delay: 20, long_delay: 30, holddown: 40, time_to_learn: 50 };
    const cleared = { init_delay: "", short_delay: "", long_delay: "", holddown: "", time_to_learn: "" };
    assert.equal(isisSpfDelayProblem(cleared), null);
    assert.deepEqual(isisSpfDelayOps(stored, cleared), [{ op: "delete_spf_delay_ietf" }]);
    assert.deepEqual(isisSpfDelayOps(stored, { ...all, init_delay: "11" }), [
      { op: "set_spf_delay_ietf_init_delay", value: "11" },
    ]);
  });
});

describe("segment routing", () => {
  const blocks = sr({ global_block_low: 16000, global_block_high: 23999, local_block_low: 15000, local_block_high: 15999 });

  it("creates blocks and a prefix SID from an empty tree", () => {
    const form = {
      ...isisSegmentRoutingForm(sr()),
      global_block_low: "16000",
      global_block_high: "23999",
      local_block_low: "15000",
      local_block_high: "15999",
      prefixes: [{ prefix: "10.0.0.1/32", kind: "index" as const, value: "1", explicit_null: true, no_php: false }],
    };
    assert.equal(isisSegmentRoutingProblem(form, NO_SRV6), null);
    assert.deepEqual(isisSegmentRoutingOps(sr(), form, NO_SRV6), [
      { op: "set_sr_global_block_low", value: "16000" },
      { op: "set_sr_global_block_high", value: "23999" },
      { op: "set_sr_local_block_low", value: "15000" },
      { op: "set_sr_local_block_high", value: "15999" },
      { op: "set_sr_prefix_index", value: "10.0.0.1/32,1" },
      { op: "set_sr_prefix_index_explicit_null", value: "10.0.0.1/32" },
    ]);
  });

  it("clearing both fields of a block deletes the block; label depth uses the max_label_depth op", () => {
    const form = { ...isisSegmentRoutingForm(blocks), local_block_low: "", local_block_high: " ", maximum_label_depth: "8" };
    assert.deepEqual(isisSegmentRoutingOps(blocks, form, NO_SRV6), [
      { op: "delete_sr_local_block" },
      { op: "set_sr_max_label_depth", value: "8" },
    ]);
    const loaded = sr({ maximum_label_depth: 8 });
    assert.deepEqual(isisSegmentRoutingOps(loaded, { ...isisSegmentRoutingForm(loaded), maximum_label_depth: "" }, NO_SRV6), [
      { op: "delete_sr_max_label_depth" },
    ]);
    assert.deepEqual(isisSegmentRoutingOps(blocks, { ...isisSegmentRoutingForm(blocks), global_block_high: "24999" }, NO_SRV6), [
      { op: "set_sr_global_block_high", value: "24999" },
    ]);
  });

  it("switching index to absolute deletes the old kind and sets the new one in one batch", () => {
    const loaded = sr({
      ...blocks,
      prefixes: [{
        prefix: "10.0.0.1/32", index_value: 5, index_explicit_null: true, index_no_php: false,
        absolute_value: null, absolute_explicit_null: false, absolute_no_php: false,
      }],
    });
    const form = isisSegmentRoutingForm(loaded);
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, NO_SRV6), []);
    form.prefixes = [{ prefix: "10.0.0.1/32", kind: "absolute", value: "16005", explicit_null: false, no_php: true }];
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, NO_SRV6), [
      { op: "delete_sr_prefix_index", value: "10.0.0.1/32" },
      { op: "set_sr_prefix_absolute", value: "10.0.0.1/32,16005" },
      { op: "set_sr_prefix_absolute_no_php", value: "10.0.0.1/32" },
    ]);
    form.prefixes = [{ prefix: "10.0.0.1/32", kind: "index", value: "6", explicit_null: false, no_php: true }];
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, NO_SRV6), [
      { op: "set_sr_prefix_index", value: "10.0.0.1/32,6" },
      { op: "delete_sr_prefix_index_explicit_null", value: "10.0.0.1/32" },
      { op: "set_sr_prefix_index_no_php", value: "10.0.0.1/32" },
    ]);
    form.prefixes = [];
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, NO_SRV6), [{ op: "delete_sr_prefix", value: "10.0.0.1/32" }]);
  });

  it("SRv6 locator, interface and node MSD diff; clearing all deletes srv6", () => {
    const loaded = sr({ srv6_locator: "LOC1", srv6_interface: "sr0", srv6_node_msd: { max_end_d: 4, max_end_pop: null, max_h_encaps: null, max_segs_left: null } });
    const form = isisSegmentRoutingForm(loaded);
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, SRV6), []);
    form.srv6_locator = "LOC2";
    form.srv6_interface = "";
    form.srv6_node_msd = { ...form.srv6_node_msd, "max-end-d": "", "max-segs-left": "3" };
    assert.deepEqual(isisSegmentRoutingOps(loaded, form, SRV6), [
      { op: "set_sr_srv6_locator", value: "LOC2" },
      { op: "delete_sr_srv6_interface" },
      { op: "delete_sr_srv6_node_msd", value: "max-end-d" },
      { op: "set_sr_srv6_node_msd", value: "max-segs-left,3" },
    ]);
    const none = { ...form, srv6_locator: "", srv6_interface: "", srv6_node_msd: {} };
    assert.deepEqual(isisSegmentRoutingOps(loaded, none, SRV6), [{ op: "delete_sr_srv6" }]);
    assert.deepEqual(isisSegmentRoutingOps(loaded, none, NO_SRV6), []);
    assert.deepEqual(isisSegmentRoutingOps(sr(), { ...isisSegmentRoutingForm(sr()), srv6_locator: "L", srv6_interface: "sr0" }, SRV6), [
      { op: "set_sr_srv6_locator", value: "L" },
      { op: "set_sr_srv6_interface", value: "sr0" },
    ]);
  });

  it("SRv6 needs its interface whenever a locator or node-msd is set", () => {
    const empty = isisSegmentRoutingForm(sr());
    assert.deepEqual(isisSegmentRoutingProblem({ ...empty, srv6_locator: "L" }, SRV6), { key: "srv6InterfaceRequired" });
    assert.deepEqual(
      isisSegmentRoutingProblem({ ...empty, srv6_node_msd: { ...empty.srv6_node_msd, "max-end-d": "4" } }, SRV6),
      { key: "srv6InterfaceRequired" },
    );
    assert.equal(isisSegmentRoutingProblem({ ...empty, srv6_locator: "L", srv6_interface: "sr0" }, SRV6), null);
    assert.equal(isisSegmentRoutingProblem({ ...empty, srv6_locator: "L" }, NO_SRV6), null);
  });

  it("prefix SID prefix must be an IPv4 or IPv6 network", () => {
    for (const ok of ["10.0.0.1/32", "0.0.0.0/0", "2001:db8::1/128", "::/0", "fe80::1:2:3:4/64", "::ffff:10.0.0.1/128"]) {
      assert.equal(isIsisIpNetwork(ok), true, ok);
    }
    for (const bad of ["10.0.0.1", "10.0.0.256/32", "10.0.0.1/33", "2001:db8::1/129", "2001:db8:::1/64", "1:2:3:4:5:6:7:8:9/64", "abc/8"]) {
      assert.equal(isIsisIpNetwork(bad), false, bad);
    }
    const form = { ...isisSegmentRoutingForm(sr()), prefixes: [{ ...emptyIsisSrPrefix(), prefix: "10.0.0.1", value: "1" }] };
    assert.deepEqual(isisSegmentRoutingProblem(form, NO_SRV6), { key: "srPrefixInvalid", name: "10.0.0.1" });
  });

  it("checks blocks, prefix SIDs and node MSD the lab rejects", () => {
    const form = { ...isisSegmentRoutingForm(blocks), srv6_interface: "sr0" };
    assert.equal(isisSegmentRoutingProblem(form, SRV6), null);
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, global_block_high: "" }, SRV6), { key: "srBlockPair", label: "globalBlock" });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, local_block_low: "16000", local_block_high: "16000" }, SRV6), {
      key: "srBlockOrder", label: "localBlock",
    });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, global_block_low: "", global_block_high: "" }, SRV6), {
      key: "srLocalNeedsGlobal",
    });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, local_block_low: "23000", local_block_high: "25000" }, SRV6), {
      key: "srBlockOverlap",
    });
    assert.equal(isisSegmentRoutingProblem({ ...form, global_block_low: "15" }, SRV6)?.key, "range");
    assert.equal(isisSegmentRoutingProblem({ ...form, maximum_label_depth: "17" }, SRV6)?.label, "maximumLabelDepth");

    const row = { ...emptyIsisSrPrefix(), prefix: "10.0.0.1/32", value: "1" };
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, prefix: " " }] }, SRV6), { key: "srPrefixRequired" });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [row, { ...row, prefix: " 10.0.0.1/32 " }] }, SRV6), {
      key: "srPrefixDuplicate", name: "10.0.0.1/32",
    });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, value: "" }] }, SRV6), {
      key: "srPrefixValueRequired", name: "10.0.0.1/32",
    });
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, value: "7999" }] }, SRV6), null);
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, value: "8000" }] }, SRV6), {
      key: "srPrefixIndexTooLarge", name: "10.0.0.1/32", max: 7999,
    });
    const noBlocks = isisSegmentRoutingForm(sr());
    assert.deepEqual(isisSegmentRoutingProblem({ ...noBlocks, prefixes: [{ ...row, value: "65536" }] }, SRV6), {
      key: "rowRange", label: "prefixIndex", name: "10.0.0.1/32", ...ISIS_SR_PREFIX_INDEX,
    });
    assert.equal(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, kind: "absolute", value: "15" }] }, SRV6)?.label, "prefixAbsolute");
    assert.deepEqual(isisSegmentRoutingProblem({ ...form, prefixes: [{ ...row, explicit_null: true, no_php: true }] }, SRV6), {
      key: "srPrefixFlags", name: "10.0.0.1/32",
    });
    assert.deepEqual(
      isisSegmentRoutingProblem({ ...form, srv6_node_msd: { ...form.srv6_node_msd, "max-end-pop": "256" } }, SRV6),
      { key: "rowRange", label: "nodeMsd", name: "max-end-pop", min: 0, max: 255 },
    );
  });
});

describe("traffic engineering", () => {
  it("address commits without enable; clearing everything deletes traffic-engineering", () => {
    const off = { enabled: false, address: null, export: false };
    assert.deepEqual(isisTeOps(off, { enabled: false, address: " 10.0.0.1 ", export: false }, { teExport: true }), [
      { op: "set_te_address", value: "10.0.0.1" },
    ]);
    const on = { enabled: true, address: "10.0.0.1", export: true };
    assert.deepEqual(isisTeOps(on, { ...isisTeForm(on), enabled: false }, { teExport: true }), [{ op: "delete_te_enable" }]);
    assert.deepEqual(isisTeOps(on, { ...isisTeForm(on), export: false }, { teExport: true }), [{ op: "delete_te_export" }]);
    assert.deepEqual(isisTeOps(on, { enabled: false, address: "", export: false }, { teExport: true }), [{ op: "delete_te" }]);
    assert.deepEqual(isisTeOps(off, { enabled: true, address: "", export: true }, { teExport: true }), [
      { op: "set_te_enable" },
      { op: "set_te_export" },
    ]);
    assert.deepEqual(isisTeOps(off, { enabled: true, address: "", export: true }, { teExport: false }), [{ op: "set_te_enable" }]);
    assert.deepEqual(isisTeOps(on, { ...isisTeForm(on), address: "10.0.0.2" }, { teExport: true }), [
      { op: "set_te_address", value: "10.0.0.2" },
    ]);
    assert.deepEqual(isisTeProblem({ enabled: true, address: "10.0.0", export: false }), { key: "teAddressInvalid" });
    assert.equal(isisTeProblem({ enabled: true, address: "", export: false }), null);
  });
});

describe("redistribute and default-information", () => {
  it("metric and route-map carry three values; deletes carry protocol,level", () => {
    assert.deepEqual(isisRedistributeOps("ipv4", null, { protocol: "bgp", level: "level-1", metric: " 10 ", route_map: "RM" }), [
      { op: "set_redistribute_ipv4", value: "bgp,level-1" },
      { op: "set_redistribute_ipv4_metric", value: "bgp,level-1,10" },
      { op: "set_redistribute_ipv4_route_map", value: "bgp,level-1,RM" },
    ]);
    const stored = { protocol: "ospf6", level: "level-2", metric: 10, route_map: "RM" };
    assert.deepEqual(isisRedistributeOps("ipv6", stored, isisRedistributeForm(stored)), []);
    assert.deepEqual(isisRedistributeOps("ipv6", stored, { ...isisRedistributeForm(stored), metric: "", route_map: "" }), [
      { op: "delete_redistribute_ipv6_metric", value: "ospf6,level-2" },
      { op: "delete_redistribute_ipv6_route_map", value: "ospf6,level-2" },
    ]);
    assert.deepEqual(isisDeleteRedistributeOps("ipv6", stored), [{ op: "delete_redistribute_ipv6", value: "ospf6,level-2" }]);
  });

  it("redistribute checks, including the global level", () => {
    const form = { protocol: "bgp", level: "level-1", metric: "", route_map: "" };
    const existing = [{ protocol: "bgp", level: "level-1", metric: null, route_map: null }];
    assert.deepEqual(isisRedistributeProblem(null, { ...form, protocol: "" }, [], null), { key: "protocolRequired" });
    assert.deepEqual(isisRedistributeProblem(null, { ...form, level: "" }, [], null), { key: "levelRequired" });
    assert.deepEqual(isisRedistributeProblem(null, form, existing, null), { key: "redistributeDuplicate", name: "bgp", level: "level-1" });
    assert.equal(isisRedistributeProblem(existing[0], form, existing, null), null);
    assert.equal(isisRedistributeProblem(null, { ...form, metric: "16777216" }, [], null)?.key, "range");
    assert.deepEqual(isisRedistributeProblem(null, form, [], "level-2"), {
      key: "redistributeLevelMismatch", name: "level-2", level: "level-1",
    });
    assert.deepEqual(isisRedistributeProblem(null, { ...form, level: "level-2" }, [], "level-1"), {
      key: "redistributeLevelMismatch", name: "level-1", level: "level-2",
    });
    assert.equal(isisRedistributeProblem(null, form, [], "level-1"), null);
    assert.equal(isisRedistributeProblem(null, form, [], "level-1-2"), null);
  });

  it("Add offers only combinations that are not configured yet", () => {
    const existing = [
      { protocol: "bgp", level: "level-1", metric: null, route_map: null },
      { protocol: "bgp", level: "level-2", metric: null, route_map: null },
      { protocol: "ospf", level: "level-2", metric: null, route_map: null },
    ];
    assert.deepEqual(isisRedistributeFreeProtocols(existing, ["bgp", "ospf", "static"]), ["ospf", "static"]);
    assert.deepEqual(isisRedistributeFreeLevels(existing, "ospf"), ["level-1"]);
    assert.deepEqual(isisRedistributeFreeLevels(existing, "static"), ["level-1", "level-2"]);
    assert.deepEqual(isisDefaultInfoFreeLevels([{ level: "level-2", always: false, metric: null, route_map: null }]), ["level-1"]);
  });

  it("a single global level leaves only that level, and hides protocols with none left", () => {
    const existing = [{ protocol: "ospf", level: "level-2", metric: null, route_map: null }];
    assert.deepEqual(isisRedistributeFreeLevels([], "bgp", "level-1"), ["level-1"]);
    assert.deepEqual(isisRedistributeFreeLevels([], "bgp", "level-1-2"), ["level-1", "level-2"]);
    assert.deepEqual(isisRedistributeFreeLevels(existing, "ospf", "level-2"), []);
    assert.deepEqual(isisRedistributeFreeProtocols(existing, ["bgp", "ospf"], "level-2"), ["bgp"]);
    assert.deepEqual(isisRedistributeFreeProtocols(existing, ["bgp", "ospf"], "level-1"), ["bgp", "ospf"]);
    assert.deepEqual(isisRedistributeFreeProtocols(existing, ["bgp", "ospf"], null), ["bgp", "ospf"]);
  });

  it("default-information edits always, metric and route-map", () => {
    const stored = { level: "level-2", always: true, metric: 5, route_map: null };
    assert.deepEqual(isisDefaultInfoOps("ipv4", stored, isisDefaultInfoForm(stored)), []);
    assert.deepEqual(isisDefaultInfoOps("ipv4", stored, { ...isisDefaultInfoForm(stored), always: false, metric: "", route_map: "RM" }), [
      { op: "delete_default_info_ipv4_always", value: "level-2" },
      { op: "delete_default_info_ipv4_metric", value: "level-2" },
      { op: "set_default_info_ipv4_route_map", value: "level-2,RM" },
    ]);
    assert.deepEqual(isisDefaultInfoOps("ipv6", null, { level: "level-1", always: true, metric: "3", route_map: "" }), [
      { op: "set_default_info_ipv6", value: "level-1" },
      { op: "set_default_info_ipv6_always", value: "level-1" },
      { op: "set_default_info_ipv6_metric", value: "level-1,3" },
    ]);
    assert.deepEqual(isisDeleteDefaultInfoOps("ipv6", stored), [{ op: "delete_default_info_ipv6", value: "level-2" }]);
    assert.deepEqual(isisDefaultInfoProblem("ipv4", null, isisDefaultInfoForm(stored), [stored]), {
      key: "defaultInfoDuplicate", name: "ipv4", level: "level-2",
    });
    assert.deepEqual(isisDefaultInfoProblem("ipv4", null, isisDefaultInfoForm(null), []), { key: "levelRequired" });
    assert.equal(isisDefaultInfoProblem("ipv4", stored, { ...isisDefaultInfoForm(stored), metric: "-1" }, [stored])?.key, "range");
  });
});

describe("global fast-reroute and deletes", () => {
  it("load-sharing: per level and the bare all-levels node", () => {
    assert.deepEqual(isisLoadSharingOps("level-1", true), [{ op: "set_frr_lfa_load_sharing_disable_level1" }]);
    assert.deepEqual(isisLoadSharingOps("level-2", false), [{ op: "delete_frr_lfa_load_sharing_disable_level2" }]);
    assert.deepEqual(isisLoadSharingOps(null, true), [{ op: "set_frr_lfa_load_sharing_disable" }]);
    assert.deepEqual(isisLoadSharingOps(null, false), [{ op: "delete_frr_lfa_load_sharing_disable" }]);
  });

  it("priority-limit, tiebreaker and remote prefix-list set and delete", () => {
    assert.deepEqual(isisPriorityLimitOps("set", "high", "level-1"), [{ op: "set_frr_lfa_priority_limit", value: "high,level-1" }]);
    assert.deepEqual(isisPriorityLimitOps("delete", "high", "level-1"), [
      { op: "delete_frr_lfa_priority_limit", value: "high,level-1" },
    ]);
    assert.deepEqual(isisTiebreakerOps("delete", "downstream", " 2 ", "level-2"), [
      { op: "delete_frr_lfa_tiebreaker_index", value: "downstream,2,level-2" },
    ]);
    assert.deepEqual(isisRemotePrefixListOps("set", "PL", "level-1"), [{ op: "set_frr_lfa_remote_prefix_list", value: "PL,level-1" }]);
    assert.deepEqual(isisRemotePrefixListOps("delete", "PL", "level-2"), [
      { op: "delete_frr_lfa_remote_prefix_list", value: "PL,level-2" },
    ]);
    assert.deepEqual(isisRemotePrefixListOps("set", "PL", null), [{ op: "set_frr_lfa_remote_prefix_list_all_levels", value: "PL" }]);
    assert.deepEqual(isisRemotePrefixListOps("delete", "PL", null), [
      { op: "delete_frr_lfa_remote_prefix_list_all_levels", value: "PL" },
    ]);
    assert.deepEqual(isisDeleteIsisOps(), [{ op: "delete_isis" }]);
    assert.deepEqual(isisDeleteInterfaceOps(" eth0 "), [{ op: "delete_interface", value: "eth0" }]);
  });

  it("tiebreaker: one TYPE per index across levels; same type on another level is fine", () => {
    const existing = [{ tb_type: "downstream", index: "1", level: "level-1" }];
    assert.deepEqual(isisTiebreakerProblem(existing, "node-protecting", "1", "level-1"), { key: "tiebreakerIndexTaken", name: "1" });
    assert.deepEqual(isisTiebreakerProblem(existing, "node-protecting", "1", "level-2"), { key: "tiebreakerIndexTaken", name: "1" });
    assert.equal(isisTiebreakerProblem(existing, "downstream", "1", "level-2"), null);
    assert.deepEqual(isisTiebreakerProblem(existing, "downstream", " 1 ", "level-1"), { key: "tiebreakerDuplicate", name: "1" });
    assert.equal(isisTiebreakerProblem(existing, "downstream", "2", "level-1"), null);
    assert.equal(isisTiebreakerProblem(existing, "node-protecting", "2", "level-1"), null);
    // A bare leftover index (null level) still holds its index in verify.
    const bare = [{ tb_type: "downstream", index: "3", level: null }];
    assert.deepEqual(isisTiebreakerProblem(bare, "node-protecting", "3", "level-1"), { key: "tiebreakerIndexTaken", name: "3" });
    assert.equal(isisTiebreakerProblem(bare, "downstream", "3", "level-1"), null);
    assert.deepEqual(isisTiebreakerProblem(existing, "downstream", "256", "level-1"), {
      key: "range", label: "tiebreakerIndex", ...ISIS_TIEBREAKER_INDEX,
    });
    assert.equal(isisTiebreakerProblem(existing, "downstream", "", "level-1")?.key, "range");
  });

  it("priority-limit: one per level; a bare leftover holds no level", () => {
    const existing = [{ priority: "high", level: "level-1" }];
    assert.deepEqual(isisPriorityLimitFreeLevels(existing), ["level-2"]);
    assert.deepEqual(isisPriorityLimitFreeLevels([]), ["level-1", "level-2"]);
    assert.deepEqual(isisPriorityLimitFreeLevels([{ priority: "high", level: null }]), ["level-1", "level-2"]);
    assert.deepEqual(isisPriorityLimitProblem(existing, "level-1"), { key: "priorityLimitLevelTaken", level: "level-1" });
    assert.equal(isisPriorityLimitProblem(existing, "level-2"), null);
  });

  it("remote prefix-list: one name; its levels, or all levels, never both", () => {
    const perLevel = [{ prefix_list: "PL", level: "level-1" }];
    const bare = [{ prefix_list: "PL", level: null }];
    assert.deepEqual(isisRemotePrefixListProblem(bare, "OTHER", "level-1"), { key: "remotePrefixListExists", name: "PL" });
    assert.deepEqual(isisRemotePrefixListProblem(perLevel, "OTHER", "level-2"), { key: "remotePrefixListExists", name: "PL" });
    assert.equal(isisRemotePrefixListProblem(perLevel, "PL", "level-2"), null);
    assert.deepEqual(isisRemotePrefixListProblem(perLevel, "PL", "level-1"), { key: "remotePrefixListLevelTaken", name: "PL" });
    assert.deepEqual(isisRemotePrefixListProblem(perLevel, "PL", null), { key: "remotePrefixListLevelTaken", name: "PL" });
    assert.deepEqual(isisRemotePrefixListProblem(bare, "PL", "level-1"), { key: "remotePrefixListLevelTaken", name: "PL" });
    assert.deepEqual(isisRemotePrefixListProblem([], " ", null), { key: "prefixListRequired" });
    assert.equal(isisRemotePrefixListProblem([], "PL", null), null);
    assert.equal(isisRemotePrefixListProblem([], "PL", "level-2"), null);
    assert.deepEqual(isisRemotePrefixListFreeLevels([]), [null, "level-1", "level-2"]);
    assert.deepEqual(isisRemotePrefixListFreeLevels(perLevel), ["level-2"]);
    assert.deepEqual(isisRemotePrefixListFreeLevels(bare), []);
  });

  it("removing the last level (or a bare chip) deletes the parent node", () => {
    const pl = [{ priority: "high", level: "level-1" }, { priority: "high", level: "level-2" }];
    assert.deepEqual(isisPriorityLimitRemoveOps(pl, pl[0]), [{ op: "delete_frr_lfa_priority_limit", value: "high,level-1" }]);
    assert.deepEqual(isisPriorityLimitRemoveOps([pl[1]], pl[1]), [
      { op: "delete_frr_lfa_priority_limit_all_levels", value: "high" },
    ]);
    // A different priority on the other level does not keep this parent alive.
    const mixed = [{ priority: "high", level: "level-1" }, { priority: "medium", level: "level-2" }];
    assert.deepEqual(isisPriorityLimitRemoveOps(mixed, mixed[0]), [
      { op: "delete_frr_lfa_priority_limit_all_levels", value: "high" },
    ]);
    const plBare = { priority: "high", level: null };
    assert.deepEqual(isisPriorityLimitRemoveOps([plBare], plBare), [
      { op: "delete_frr_lfa_priority_limit_all_levels", value: "high" },
    ]);

    const tb = [
      { tb_type: "downstream", index: "1", level: "level-1" },
      { tb_type: "downstream", index: "1", level: "level-2" },
      { tb_type: "downstream", index: "2", level: "level-1" },
    ];
    assert.deepEqual(isisTiebreakerRemoveOps(tb, tb[0]), [
      { op: "delete_frr_lfa_tiebreaker_index", value: "downstream,1,level-1" },
    ]);
    assert.deepEqual(isisTiebreakerRemoveOps(tb, tb[2]), [
      { op: "delete_frr_lfa_tiebreaker_index_all_levels", value: "downstream,2" },
    ]);
    const tbBare = { tb_type: "downstream", index: "3", level: null };
    assert.deepEqual(isisTiebreakerRemoveOps([...tb, tbBare], tbBare), [
      { op: "delete_frr_lfa_tiebreaker_index_all_levels", value: "downstream,3" },
    ]);

    const rpl = [{ prefix_list: "PL", level: "level-1" }, { prefix_list: "PL", level: "level-2" }];
    assert.deepEqual(isisRemotePrefixListRemoveOps(rpl, rpl[1]), [
      { op: "delete_frr_lfa_remote_prefix_list", value: "PL,level-2" },
    ]);
    assert.deepEqual(isisRemotePrefixListRemoveOps([rpl[0]], rpl[0]), [
      { op: "delete_frr_lfa_remote_prefix_list_all_levels", value: "PL" },
    ]);
    const rplBare = { prefix_list: "PL", level: null };
    assert.deepEqual(isisRemotePrefixListRemoveOps([rplBare], rplBare), [
      { op: "delete_frr_lfa_remote_prefix_list_all_levels", value: "PL" },
    ]);
  });

  it("every save but Add Interface is blocked until IS-IS has an interface", () => {
    assert.deepEqual(isisSetupProblem(0), { key: "generalNeedsInterface" });
    assert.equal(isisSetupProblem(1), null);
  });
});

describe("service", () => {
  function stub() {
    const sent: BatchOperation[][] = [];
    const service = Object.create(isisService) as typeof isisService;
    service.batchConfigure = async (ops: BatchOperation[]) => {
      sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("updateInterface sends the masked diff only", async () => {
    const { service, sent } = stub();
    const loaded = iface({ password_md5: MASKED_SECRET, password_plaintext: MASKED_SECRET, metric: 10 });
    await service.updateInterface(loaded, { ...isisInterfaceForm(loaded), metric: "5" }, FRR);
    assert.deepEqual(sent, [[{ op: "set_interface_metric", value: "eth0,5" }]]);
  });

  it("createInterface sends the NET with the first interface in one batch", async () => {
    const { service, sent } = stub();
    await service.createInterface({ ...isisInterfaceForm(null), name: "eth0" }, NO_FRR, NET);
    assert.deepEqual(sent, [[{ op: "set_net", value: NET }, { op: "set_interface", value: "eth0" }]]);
  });

  it("saveRedistribute sends the three-value ops", async () => {
    const { service, sent } = stub();
    const stored = { protocol: "bgp", level: "level-1", metric: 10, route_map: null };
    await service.saveRedistribute("ipv4", stored, { ...isisRedistributeForm(stored), metric: "20" });
    assert.deepEqual(sent, [[{ op: "set_redistribute_ipv4_metric", value: "bgp,level-1,20" }]]);
  });

  it("FRR page controls send the bare all-levels and parent ops", async () => {
    const { service, sent } = stub();
    await service.setFrrLoadSharingDisable(null, true);
    const rpl = { prefix_list: "PL", level: null };
    await service.removeFrrRemotePrefixList([rpl], rpl);
    const tb = { tb_type: "downstream", index: "1", level: "level-1" };
    await service.removeFrrTiebreaker([tb], tb);
    const pl = { priority: "high", level: "level-2" };
    await service.removeFrrPriorityLimit([pl], pl);
    assert.deepEqual(sent, [
      [{ op: "set_frr_lfa_load_sharing_disable" }],
      [{ op: "delete_frr_lfa_remote_prefix_list_all_levels", value: "PL" }],
      [{ op: "delete_frr_lfa_tiebreaker_index_all_levels", value: "downstream,1" }],
      [{ op: "delete_frr_lfa_priority_limit_all_levels", value: "high" }],
    ]);
  });
});

describe("batchConfigure", () => {
  it("throws the device error on success:false and skips an empty batch", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error: "Commit failed" };
    }) as typeof apiClient.post;
    try {
      const g = global({ net: NET, area_password_md5: MASKED_SECRET });
      assert.deepEqual(await isisService.updateGeneral(g, isisGeneralForm(g)), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(isisService.deleteIsis(), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/isis/batch", { operations: [{ op: "delete_isis" }] }]]);
      apiClient.post = (async () => ({ success: false })) as typeof apiClient.post;
      await assert.rejects(isisService.deleteIsis(), (err: unknown) => (err as { message: string }).message === "");
    } finally {
      apiClient.post = original;
    }
  });
});
