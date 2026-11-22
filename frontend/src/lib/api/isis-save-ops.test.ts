import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyIsisSrPrefix,
  isisDefaultInfoForm,
  isisDefaultInfoOps,
  isisDefaultInfoProblem,
  isisDeleteDefaultInfoOps,
  isisDeleteInterfaceOps,
  isisDeleteIsisOps,
  isisDeleteRedistributeOps,
  isisGeneralForm,
  isisGeneralOps,
  isisGeneralProblem,
  isisInterfaceForm,
  isisInterfaceOps,
  isisInterfaceProblem,
  isisLoadSharingOps,
  isisPasswordForMode,
  isisPasswordModes,
  isisPriorityLimitOps,
  isisRedistributeForm,
  isisRedistributeOps,
  isisRedistributeProblem,
  isisRemotePrefixListOps,
  isisRemotePrefixListProblem,
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
    net: [],
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

describe("interface passwords", () => {
  const md5 = iface({ password_md5: MASKED_SECRET });

  it("loads the mask; an unchanged mask sends nothing", () => {
    const form = isisInterfaceForm(md5);
    assert.deepEqual(form.password, { mode: "md5", password: MASKED_SECRET });
    assert.deepEqual(isisInterfaceOps(md5, form, FRR), []);
    assert.equal(isisInterfaceProblem(md5, form, FRR), null);
  });

  it("a cleared mask deletes that mode; new padded text sets the trimmed value", () => {
    const form = isisInterfaceForm(md5);
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password: { mode: "md5", password: "  " } }, FRR), [
      { op: "delete_interface_password_md5", value: "eth0" },
    ]);
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password: { mode: "md5", password: " s3cret " } }, FRR), [
      { op: "set_interface_password_md5", value: "eth0,s3cret" },
    ]);
  });

  it("none deletes the whole password node", () => {
    const form = isisInterfaceForm(md5);
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password: { mode: "", password: "" } }, FRR), [
      { op: "delete_interface_password", value: "eth0" },
    ]);
  });

  it("deletes every stored mode other than the target, read from a both-modes original", () => {
    const both = iface({ password_md5: MASKED_SECRET, password_plaintext: MASKED_SECRET });
    const form = isisInterfaceForm(both);
    assert.equal(form.password.mode, "md5");
    assert.deepEqual(isisInterfaceOps(both, form, FRR), [
      { op: "delete_interface_password_plaintext", value: "eth0" },
    ]);
    const plain = isisPasswordForMode(both.password_md5, both.password_plaintext, "plaintext-password");
    assert.deepEqual(plain, { mode: "plaintext-password", password: MASKED_SECRET });
    assert.deepEqual(isisInterfaceOps(both, { ...form, password: plain }, FRR), [
      { op: "delete_interface_password_md5", value: "eth0" },
    ]);
  });

  it("switching mode deletes the old mode and sets the new one in one batch", () => {
    const form = isisInterfaceForm(md5);
    const draft = isisPasswordForMode(md5.password_md5, md5.password_plaintext, "plaintext-password");
    assert.equal(draft.password, "");
    assert.deepEqual(isisInterfaceOps(md5, { ...form, password: { ...draft, password: "pw" } }, FRR), [
      { op: "delete_interface_password_md5", value: "eth0" },
      { op: "set_interface_password_plaintext", value: "eth0,pw" },
    ]);
  });

  it("rejects the mask typed for a mode that has no stored secret, and a blank new password", () => {
    const form = isisInterfaceForm(md5);
    const mask = { ...form, password: { mode: "plaintext-password" as const, password: ` ${MASKED_SECRET} ` } };
    assert.deepEqual(isisInterfaceProblem(md5, mask, FRR), { key: "passwordMask", label: "interfacePassword" });
    const blank = { ...form, password: { mode: "plaintext-password" as const, password: "" } };
    assert.deepEqual(isisInterfaceProblem(md5, blank, FRR), { key: "passwordRequired", label: "interfacePassword" });
    assert.ok(isisInterfaceOps(md5, mask, FRR).every((op) => !(op.value || "").includes(MASKED_SECRET)));
  });

  it("offers a stored mode the device list lacks", () => {
    assert.deepEqual(isisPasswordModes(["plaintext-password"], MASKED_SECRET, null), ["plaintext-password", "md5"]);
    assert.deepEqual(isisPasswordModes(["md5", "plaintext-password"], null, null), ["md5", "plaintext-password"]);
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
      password: { mode: "md5" as const, password: "k" },
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
});

describe("global settings", () => {
  it("an unchanged form sends nothing", () => {
    const g = global({ net: ["49.0001.0000.0000.0001.00"], level: "level-2", topology: "ipv6-unicast", area_password_md5: MASKED_SECRET });
    assert.deepEqual(isisGeneralOps(g, isisGeneralForm(g)), []);
    assert.deepEqual(isisTimersOps(g, isisTimersForm(g)), []);
    assert.deepEqual(isisSpfDelayOps(g.spf_delay_ietf, isisSpfDelayForm(g.spf_delay_ietf)), []);
  });

  it("topology is single-value: a change sets, a clear deletes with no value", () => {
    const g = global({ topology: "ipv6-unicast" });
    assert.deepEqual(isisGeneralOps(g, { ...isisGeneralForm(g), topology: "ipv4-mgmt" }), [
      { op: "set_topology", value: "ipv4-mgmt" },
    ]);
    assert.deepEqual(isisGeneralOps(g, { ...isisGeneralForm(g), topology: "" }), [{ op: "delete_topology" }]);
  });

  it("NETs diff by trimmed value; flags set and delete", () => {
    const g = global({ net: ["49.0001.0000.0000.0001.00"], set_overload_bit: true });
    const form = { ...isisGeneralForm(g), net: [" 49.0001.0000.0000.0002.00 "], set_overload_bit: false, set_attached_bit: true };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "delete_net", value: "49.0001.0000.0000.0001.00" },
      { op: "set_net", value: "49.0001.0000.0000.0002.00" },
      { op: "set_attached_bit" },
      { op: "delete_overload_bit" },
    ]);
    assert.deepEqual(isisGeneralProblem(g, { ...form, net: ["a", " a"] }), { key: "netDuplicate", name: "a" });
  });

  it("area and domain password mode switch deletes the old mode and sets the new one", () => {
    const g = global({ area_password_md5: MASKED_SECRET, domain_password_plaintext: MASKED_SECRET });
    const form = isisGeneralForm(g);
    form.area_password = { mode: "plaintext-password", password: "pw" };
    form.domain_password = { mode: "md5", password: "dm" };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "delete_area_password_md5" },
      { op: "set_area_password_plaintext", value: "pw" },
      { op: "delete_domain_password_plaintext" },
      { op: "set_domain_password_md5", value: "dm" },
    ]);
    form.area_password = { mode: "", password: "" };
    form.domain_password = { mode: "plaintext-password", password: "" };
    assert.deepEqual(isisGeneralOps(g, form), [
      { op: "delete_area_password" },
      { op: "delete_domain_password_plaintext" },
    ]);
    form.area_password = { mode: "md5", password: MASKED_SECRET };
    form.domain_password = { mode: "plaintext-password", password: MASKED_SECRET };
    assert.deepEqual(isisGeneralProblem(g, form), null);
    assert.deepEqual(isisGeneralOps(g, form), []);
    form.area_password = { mode: "plaintext-password", password: MASKED_SECRET };
    assert.deepEqual(isisGeneralProblem(g, form), { key: "passwordMask", label: "areaPassword" });
    form.area_password = { mode: "md5", password: MASKED_SECRET };
    form.domain_password = { mode: "md5", password: "" };
    assert.deepEqual(isisGeneralProblem(g, form), { key: "passwordRequired", label: "domainPassword" });
  });

  it("timers: cleared ldp-sync holddown deletes ldp-sync; ranges use the capability for lsp refresh", () => {
    const g = global({ lsp_mtu: 1497, ldp_sync_holddown: 10 });
    const form = { ...isisTimersForm(g), lsp_mtu: " 1400 ", ldp_sync_holddown: "", spf_interval: "5" };
    assert.deepEqual(isisTimersOps(g, form), [
      { op: "set_lsp_mtu", value: "1400" },
      { op: "set_spf_interval", value: "5" },
      { op: "delete_ldp_sync" },
    ]);
    const lsp14 = { min: 1, max: 65235 };
    const lsp15 = { min: 2, max: 65235 };
    assert.equal(isisTimersProblem({ ...form, lsp_refresh_interval: "1" }, lsp14), null);
    assert.deepEqual(isisTimersProblem({ ...form, lsp_refresh_interval: "1" }, lsp15), {
      key: "range", label: "lspRefreshInterval", ...lsp15,
    });
    assert.equal(isisTimersProblem({ ...form, lsp_mtu: "127" }, lsp15)?.label, "lspMtu");
    assert.equal(isisTimersProblem({ ...form, lsp_gen_interval: "121" }, lsp15)?.label, "lspGenInterval");
    assert.equal(isisTimersProblem({ ...form, max_lsp_lifetime: "349" }, lsp15)?.label, "maxLspLifetime");
    assert.equal(isisTimersProblem({ ...form, spf_interval: "121" }, lsp15)?.label, "spfInterval");
    assert.equal(isisTimersProblem({ ...form, spf_interval: "1.5" }, lsp15)?.label, "spfInterval");
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
    assert.deepEqual(isisSegmentRoutingOps(sr(), { ...isisSegmentRoutingForm(sr()), srv6_locator: "L" }, SRV6), [
      { op: "set_sr_srv6_locator", value: "L" },
    ]);
  });

  it("checks blocks, prefix SIDs and node MSD the lab rejects", () => {
    const form = isisSegmentRoutingForm(blocks);
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

  it("redistribute checks", () => {
    const form = { protocol: "bgp", level: "level-1", metric: "", route_map: "" };
    const existing = [{ protocol: "bgp", level: "level-1", metric: null, route_map: null }];
    assert.deepEqual(isisRedistributeProblem(null, { ...form, protocol: "" }, []), { key: "protocolRequired" });
    assert.deepEqual(isisRedistributeProblem(null, { ...form, level: "" }, []), { key: "levelRequired" });
    assert.deepEqual(isisRedistributeProblem(null, form, existing), { key: "redistributeDuplicate", name: "bgp", level: "level-1" });
    assert.equal(isisRedistributeProblem(existing[0], form, existing), null);
    assert.equal(isisRedistributeProblem(null, { ...form, metric: "16777216" }, [])?.key, "range");
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
  it("page control ops", () => {
    assert.deepEqual(isisLoadSharingOps("level-1", true), [{ op: "set_frr_lfa_load_sharing_disable_level1" }]);
    assert.deepEqual(isisLoadSharingOps("level-2", false), [{ op: "delete_frr_lfa_load_sharing_disable_level2" }]);
    assert.deepEqual(isisPriorityLimitOps("set", "high", "level-1"), [{ op: "set_frr_lfa_priority_limit", value: "high,level-1" }]);
    assert.deepEqual(isisTiebreakerOps("delete", "downstream", " 2 ", "level-2"), [
      { op: "delete_frr_lfa_tiebreaker_index", value: "downstream,2,level-2" },
    ]);
    assert.deepEqual(isisRemotePrefixListOps("set", "PL", "level-1"), [{ op: "set_frr_lfa_remote_prefix_list", value: "PL,level-1" }]);
    assert.deepEqual(isisDeleteIsisOps(), [{ op: "delete_isis" }]);
    assert.deepEqual(isisDeleteInterfaceOps(" eth0 "), [{ op: "delete_interface", value: "eth0" }]);
  });

  it("tiebreaker index range and one type per index; prefix list required", () => {
    const existing = [{ tb_type: "downstream", index: "1", level: "level-1" }];
    assert.deepEqual(isisTiebreakerProblem(existing, "node-protecting", "1", "level-1"), {
      key: "tiebreakerIndexTaken", name: "1", level: "level-1",
    });
    assert.equal(isisTiebreakerProblem(existing, "node-protecting", "1", "level-2"), null);
    assert.deepEqual(isisTiebreakerProblem(existing, "downstream", "256", "level-1"), {
      key: "range", label: "tiebreakerIndex", ...ISIS_TIEBREAKER_INDEX,
    });
    assert.equal(isisTiebreakerProblem(existing, "downstream", "", "level-1")?.key, "range");
    assert.deepEqual(isisRemotePrefixListProblem(" "), { key: "prefixListRequired" });
    assert.equal(isisRemotePrefixListProblem("PL"), null);
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
    const loaded = iface({ password_md5: MASKED_SECRET, metric: 10 });
    await service.updateInterface(loaded, { ...isisInterfaceForm(loaded), metric: "5" }, FRR);
    assert.deepEqual(sent, [[{ op: "set_interface_metric", value: "eth0,5" }]]);
  });

  it("saveRedistribute sends the three-value ops", async () => {
    const { service, sent } = stub();
    const stored = { protocol: "bgp", level: "level-1", metric: 10, route_map: null };
    await service.saveRedistribute("ipv4", stored, { ...isisRedistributeForm(stored), metric: "20" });
    assert.deepEqual(sent, [[{ op: "set_redistribute_ipv4_metric", value: "bgp,level-1,20" }]]);
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
      const g = global({ area_password_md5: MASKED_SECRET });
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
