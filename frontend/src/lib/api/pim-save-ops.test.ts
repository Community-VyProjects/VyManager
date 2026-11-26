import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isIpv4Multicast,
  isIpv4MulticastPrefix,
  pimDeleteOps,
  pimGlobalDraft,
  pimGlobalOps,
  pimGlobalProblem,
  pimInterfaceDeleteOps,
  pimInterfaceDeleteProblem,
  pimInterfaceOps,
  pimInterfaceProblem,
  pimJoinSourcesWithDraft,
  pimJoinsWithDraft,
  pimProblemArgs,
  pimRpGroupsWithDraft,
  pimRpDeleteOps,
  pimRpOps,
  pimRpProblem,
  pimRpTimerOps,
  pimRpTimerProblem,
  type PimGlobalDraft,
  type PimInterfaceDraft,
} from "./pim-save-ops";
import { apiClient } from "./client";
import { pimService, type PimBatchOperation, type PimCapabilities, type PimConfig, type PimInterface } from "./pim";

const CAPS: Pick<PimCapabilities, "ranges"> = {
  ranges: {
    timer: { min: 1, max: 65535 },
    packets: { min: 1, max: 255 },
    watermark_warning: { min: 1, max: 65535 },
    dr_priority: { min: 1, max: 4294967295 },
    hello: { min: 1, max: 180 },
    query_interval: { min: 1, max: 1800 },
    query_max_response_time: { min: 10, max: 250 },
    igmp_version: { min: 2, max: 3 },
  },
};

function config(over: Partial<PimConfig> = {}): PimConfig {
  return {
    configured: true,
    ecmp: false,
    ecmp_rebalance: false,
    igmp_watermark_warning: null,
    interfaces: [],
    join_prune_interval: null,
    keep_alive_timer: null,
    no_v6_secondary: false,
    packets: null,
    register_accept_list_prefix_list: null,
    register_suppress_time: null,
    rp: null,
    spt_switchover: null,
    ssm_prefix_list: null,
    ...over,
  };
}

const FILLED = config({
  interfaces: [],
  ecmp: true,
  ecmp_rebalance: true,
  igmp_watermark_warning: 100,
  join_prune_interval: 60,
  keep_alive_timer: 210,
  no_v6_secondary: true,
  packets: 3,
  register_accept_list_prefix_list: "REG",
  register_suppress_time: 60,
  rp: { addresses: [], keep_alive_timer: 180 },
  spt_switchover: { infinity_and_beyond: true, prefix_list: "SPT" },
  ssm_prefix_list: "SSM",
});

function draft(over: Partial<PimGlobalDraft> = {}): PimGlobalDraft {
  return { ...pimGlobalDraft(FILLED), ...over };
}

const IFACE: PimInterface = {
  name: "eth0",
  bfd: true,
  bfd_profile: "fast",
  dr_priority: 5,
  hello: 30,
  no_bsm: true,
  no_unicast_bsm: true,
  passive: true,
  source_address: "192.0.2.1",
  igmp: {
    disabled: true,
    joins: [{ group: "239.1.1.1", source_addresses: ["192.0.2.10", "192.0.2.11"] }],
    query_interval: 125,
    query_max_response_time: 100,
    version: 3,
  },
};

function ifaceDraft(over: Partial<PimInterfaceDraft> = {}): PimInterfaceDraft {
  return {
    name: "eth0",
    bfd: true,
    bfd_profile: "fast",
    dr_priority: "5",
    hello: "30",
    no_bsm: true,
    no_unicast_bsm: true,
    passive: true,
    source_address: "192.0.2.1",
    igmp: {
      disabled: true,
      joins: [{ group: "239.1.1.1", source_addresses: ["192.0.2.10", "192.0.2.11"] }],
      query_interval: "125",
      query_max_response_time: "100",
      version: "3",
    },
    ...over,
  };
}

describe("global settings", () => {
  it("an unchanged form sends nothing", () => {
    assert.deepEqual(pimGlobalOps(FILLED, draft()), []);
    assert.deepEqual(pimGlobalOps(FILLED, draft({ packets: " 3 ", ssm_prefix_list: "SSM " })), []);
    assert.deepEqual(pimGlobalOps(config(), pimGlobalDraft(config())), []);
  });

  it("sets every leaf from an empty config", () => {
    assert.deepEqual(pimGlobalOps(config(), draft()), [
      { op: "set_ecmp" },
      { op: "set_ecmp_rebalance" },
      { op: "set_no_v6_secondary" },
      { op: "set_join_prune_interval", value: "60" },
      { op: "set_keep_alive_timer", value: "210" },
      { op: "set_register_suppress_time", value: "60" },
      { op: "set_packets", value: "3" },
      { op: "set_igmp_watermark_warning", value: "100" },
      { op: "set_register_accept_list_prefix_list", value: "REG" },
      { op: "set_ssm_prefix_list", value: "SSM" },
      { op: "set_spt_switchover_infinity" },
      { op: "set_spt_switchover_infinity_prefix_list", value: "SPT" },
    ]);
  });

  it("a cleared leaf sends its leaf delete", () => {
    const cleared = draft({
      join_prune_interval: "", keep_alive_timer: "", register_suppress_time: "", packets: "",
      igmp_watermark_warning: "", register_accept_list_prefix_list: "", ssm_prefix_list: "", spt_prefix_list: "",
      ecmp_rebalance: false, no_v6_secondary: false,
    });
    assert.deepEqual(pimGlobalOps(FILLED, cleared), [
      { op: "delete_ecmp_rebalance" },
      { op: "delete_no_v6_secondary" },
      { op: "delete_join_prune_interval" },
      { op: "delete_keep_alive_timer" },
      { op: "delete_register_suppress_time" },
      { op: "delete_packets" },
      { op: "delete_igmp_watermark_warning" },
      { op: "delete_register_accept_list_prefix_list" },
      { op: "delete_ssm_prefix_list" },
      { op: "delete_spt_switchover_infinity_prefix_list" },
    ]);
  });

  it("turning ecmp or infinity-and-beyond off deletes the node once, not its child too", () => {
    assert.deepEqual(pimGlobalOps(FILLED, draft({ ecmp: false })), [{ op: "delete_ecmp" }]);
    assert.deepEqual(pimGlobalOps(FILLED, draft({ ecmp: false, ecmp_rebalance: false })), [{ op: "delete_ecmp" }]);
    assert.deepEqual(pimGlobalOps(FILLED, draft({ spt_infinity_and_beyond: false })), [{ op: "delete_spt_switchover" }]);
    // Rebalance left checked with ecmp off is not sent.
    assert.deepEqual(pimGlobalOps(config(), pimGlobalDraft(config({ ecmp_rebalance: true }))), []);
  });

  it("a bare ecmp or infinity-and-beyond only adds its child", () => {
    const bare = config({ ecmp: true, spt_switchover: { infinity_and_beyond: true, prefix_list: null } });
    assert.deepEqual(pimGlobalOps(bare, { ...pimGlobalDraft(bare), ecmp_rebalance: true, spt_prefix_list: "SPT" }), [
      { op: "set_ecmp_rebalance" },
      { op: "set_spt_switchover_infinity_prefix_list", value: "SPT" },
    ]);
  });

  it("checks the served ranges with strict digits", () => {
    assert.equal(pimGlobalProblem(draft(), CAPS), null);
    assert.equal(pimGlobalProblem(draft({ packets: "" }), CAPS), null);
    for (const bad of ["0", "256", "1e1", "3.0", "-1", "3abc", "0x3", "٣", "３"]) {
      assert.deepEqual(pimGlobalProblem(draft({ packets: bad }), CAPS), { key: "packetsRange", min: 1, max: 255 }, bad);
    }
    assert.deepEqual(pimGlobalProblem(draft({ keep_alive_timer: "65536" }), CAPS), { key: "timerRange", min: 1, max: 65535 });
    assert.deepEqual(pimGlobalProblem(draft({ igmp_watermark_warning: "0" }), CAPS)?.key, "watermarkRange");
    assert.deepEqual(pimProblemArgs({ key: "packetsRange", min: 1, max: 255 }), { min: "1", max: "255" });
  });
});

describe("rp keep-alive timer", () => {
  it("diffs the one leaf", () => {
    assert.deepEqual(pimRpTimerOps(FILLED, "180"), []);
    assert.deepEqual(pimRpTimerOps(FILLED, ""), [{ op: "delete_rp" }], "a timer-only rp node is deleted whole");
    const withRp = config({ rp: { addresses: [{ address: "192.0.2.50", groups: ["224.0.0.0/4"] }], keep_alive_timer: 180 } });
    assert.deepEqual(pimRpTimerOps(withRp, ""), [{ op: "delete_rp_keep_alive_timer" }]);
    assert.deepEqual(pimRpTimerOps(config(), "90"), [{ op: "set_rp_keep_alive_timer", value: "90" }]);
    assert.deepEqual(pimRpTimerProblem("0", CAPS), { key: "timerRange", min: 1, max: 65535 });
    assert.equal(pimRpTimerProblem("", CAPS), null);
  });

  it("blocks a keep-alive-timer while no RP address exists", () => {
    const eth0 = config({ interfaces: [IFACE] });
    assert.deepEqual(pimRpTimerProblem("90", CAPS, eth0), { key: "rpRequired" });
    assert.deepEqual(pimRpTimerProblem("90", CAPS, { ...eth0, rp: { addresses: [], keep_alive_timer: 90 } }), { key: "rpRequired" });
    const withRp = { ...eth0, rp: { addresses: [{ address: "192.0.2.50", groups: ["224.0.0.0/4"] }], keep_alive_timer: null } };
    assert.equal(pimRpTimerProblem("90", CAPS, withRp), null);
    assert.equal(pimRpTimerProblem("", CAPS, eth0), null);
  });
});

describe("interfaces", () => {
  it("creates every leaf and igmp join from scratch", () => {
    assert.deepEqual(pimInterfaceOps(null, ifaceDraft()), [
      { op: "set_interface", value: "eth0" },
      { op: "set_interface_bfd", value: "eth0" },
      { op: "set_interface_bfd_profile", value: "eth0,fast" },
      { op: "set_interface_dr_priority", value: "eth0,5" },
      { op: "set_interface_hello", value: "eth0,30" },
      { op: "set_interface_source_address", value: "eth0,192.0.2.1" },
      { op: "set_interface_no_bsm", value: "eth0" },
      { op: "set_interface_no_unicast_bsm", value: "eth0" },
      { op: "set_interface_passive", value: "eth0" },
      { op: "set_interface_igmp", value: "eth0" },
      { op: "set_interface_igmp_disable", value: "eth0" },
      { op: "set_interface_igmp_query_interval", value: "eth0,125" },
      { op: "set_interface_igmp_query_max_response_time", value: "eth0,100" },
      { op: "set_interface_igmp_version", value: "eth0,3" },
      { op: "set_interface_igmp_join", value: "eth0,239.1.1.1" },
      { op: "set_interface_igmp_join_source", value: "eth0,239.1.1.1,192.0.2.10" },
      { op: "set_interface_igmp_join_source", value: "eth0,239.1.1.1,192.0.2.11" },
    ]);
  });

  it("an unchanged form sends nothing", () => {
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft()), []);
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({ dr_priority: " 5 " })), []);
  });

  it("a cleared leaf sends its leaf delete and never re-creates the interface", () => {
    const igmp = ifaceDraft().igmp!;
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({
      bfd_profile: "", dr_priority: "", hello: "", source_address: "",
      no_bsm: false, no_unicast_bsm: false, passive: false,
      igmp: { ...igmp, disabled: false, query_interval: "", query_max_response_time: "", version: "" },
    })), [
      { op: "delete_interface_bfd_profile", value: "eth0" },
      { op: "delete_interface_dr_priority", value: "eth0" },
      { op: "delete_interface_hello", value: "eth0" },
      { op: "delete_interface_source_address", value: "eth0" },
      { op: "delete_interface_no_bsm", value: "eth0" },
      { op: "delete_interface_no_unicast_bsm", value: "eth0" },
      { op: "delete_interface_passive", value: "eth0" },
      { op: "delete_interface_igmp_disable", value: "eth0" },
      { op: "delete_interface_igmp_query_interval", value: "eth0" },
      { op: "delete_interface_igmp_query_max_response_time", value: "eth0" },
      { op: "delete_interface_igmp_version", value: "eth0" },
    ]);
  });

  it("turning bfd or igmp off deletes that node once", () => {
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({ bfd: false })), [{ op: "delete_interface_bfd", value: "eth0" }]);
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({ igmp: null })), [{ op: "delete_interface_igmp", value: "eth0" }]);
  });

  it("a bare bfd or igmp is kept and only gains its leaves", () => {
    const bare: PimInterface = { ...IFACE, bfd: true, bfd_profile: null, igmp: { disabled: false, joins: [], query_interval: null, query_max_response_time: null, version: null } };
    assert.deepEqual(pimInterfaceOps(bare, ifaceDraft({ igmp: { ...ifaceDraft().igmp!, disabled: false, joins: [], query_interval: "", query_max_response_time: "", version: "2" } })), [
      { op: "set_interface_bfd_profile", value: "eth0,fast" },
      { op: "set_interface_igmp_version", value: "eth0,2" },
    ]);
  });

  it("diffs joins and their sources without deleting and re-creating a kept join", () => {
    const igmp = ifaceDraft().igmp!;
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({
      igmp: {
        ...igmp,
        joins: [
          { group: "239.1.1.1", source_addresses: ["192.0.2.11", "192.0.2.12"] },
          { group: "239.2.2.2", source_addresses: ["192.0.2.20"] },
        ],
      },
    })), [
      { op: "delete_interface_igmp_join_source", value: "eth0,239.1.1.1,192.0.2.10" },
      { op: "set_interface_igmp_join_source", value: "eth0,239.1.1.1,192.0.2.12" },
      { op: "set_interface_igmp_join", value: "eth0,239.2.2.2" },
      { op: "set_interface_igmp_join_source", value: "eth0,239.2.2.2,192.0.2.20" },
    ]);
    assert.deepEqual(pimInterfaceOps(IFACE, ifaceDraft({ igmp: { ...igmp, joins: [] } })), [
      { op: "delete_interface_igmp_join", value: "eth0,239.1.1.1" },
    ]);
  });

  it("checks ranges, addresses, join groups and a free interface on Add", () => {
    assert.equal(pimInterfaceProblem(null, ifaceDraft(), CAPS, ["eth1"]), null);
    assert.deepEqual(pimInterfaceProblem(null, ifaceDraft({ name: "" }), CAPS), { key: "selectInterface" });
    assert.deepEqual(pimInterfaceProblem(null, ifaceDraft(), CAPS, ["eth0"]), { key: "interfaceExists" });
    assert.equal(pimInterfaceProblem(IFACE, ifaceDraft(), CAPS, ["eth0"]), null);
    assert.deepEqual(pimInterfaceProblem(null, ifaceDraft({ dr_priority: "4294967296" }), CAPS),
      { key: "drPriorityRange", min: 1, max: 4294967295 });
    assert.deepEqual(pimInterfaceProblem(null, ifaceDraft({ hello: "181" }), CAPS)?.key, "helloRange");
    assert.deepEqual(pimInterfaceProblem(null, ifaceDraft({ source_address: "192.0.2.256" }), CAPS), { key: "sourceAddressInvalid" });
    const igmp = ifaceDraft().igmp!;
    const withIgmp = (over: Partial<typeof igmp>) => ifaceDraft({ igmp: { ...igmp, ...over } });
    assert.deepEqual(pimInterfaceProblem(null, withIgmp({ query_interval: "1801" }), CAPS)?.key, "queryIntervalRange");
    assert.deepEqual(pimInterfaceProblem(null, withIgmp({ query_max_response_time: "9" }), CAPS)?.key, "queryMaxResponseRange");
    assert.deepEqual(pimInterfaceProblem(null, withIgmp({ version: "4" }), CAPS)?.key, "igmpVersionRange");
    assert.deepEqual(pimInterfaceProblem(null, withIgmp({ joins: [{ group: "10.0.0", source_addresses: [] }] }), CAPS)?.key, "joinGroupInvalid");
    // The lab takes a unicast join group.
    assert.equal(pimInterfaceProblem(null, withIgmp({ joins: [{ group: "10.0.0.1", source_addresses: ["192.0.2.1"] }] }), CAPS), null);
    assert.deepEqual(pimInterfaceProblem(null, withIgmp({ joins: [{ group: "239.1.1.1", source_addresses: ["x"] }] }), CAPS)?.key, "joinSourceInvalid");
    // A disabled IGMP section is not checked.
    assert.equal(pimInterfaceProblem(null, ifaceDraft({ igmp: null }), CAPS), null);
  });

  it("folds a typed join group or source, or blocks with the keyed problem", () => {
    const joins = [{ group: "239.1.1.1", source_addresses: [] as string[] }];
    assert.deepEqual(pimJoinsWithDraft(joins, " "), { joins, problem: null });
    assert.deepEqual(pimJoinsWithDraft(joins, " 239.2.2.2 ").joins.map((j) => j.group), ["239.1.1.1", "239.2.2.2"]);
    assert.deepEqual(pimJoinsWithDraft(joins, "239.1.1.1").problem, { key: "joinExists" });
    assert.deepEqual(pimJoinsWithDraft(joins, "192.0.2.256").problem, { key: "joinGroupInvalid" });
    assert.equal(pimJoinsWithDraft(joins, "192.0.2.1").problem, null);
    assert.deepEqual(pimJoinSourcesWithDraft(joins[0], "192.0.2.1").join.source_addresses, ["192.0.2.1"]);
    assert.deepEqual(pimJoinSourcesWithDraft({ ...joins[0], source_addresses: ["192.0.2.1"] }, "192.0.2.1").problem, { key: "joinSourceExists" });
    assert.deepEqual(pimJoinSourcesWithDraft(joins[0], "192.0.2.01").problem, { key: "joinSourceInvalid" });
  });
});

describe("rp addresses", () => {
  const RP = { address: "192.0.2.50", groups: ["224.0.0.0/4"] };

  it("creates the address with every group", () => {
    assert.deepEqual(pimRpOps(null, { address: "192.0.2.50", groups: ["224.0.0.0/4", "239.0.0.0/8"] }), [
      { op: "set_rp_address", value: "192.0.2.50" },
      { op: "set_rp_address_group", value: "192.0.2.50,224.0.0.0/4" },
      { op: "set_rp_address_group", value: "192.0.2.50,239.0.0.0/8" },
    ]);
  });

  const RP2 = { address: "192.0.2.51", groups: ["239.0.0.0/8"] };
  const two = config({ interfaces: [IFACE], rp: { addresses: [RP, RP2], keep_alive_timer: 180 } });
  const last = (timer: number | null) => config({ interfaces: [IFACE], rp: { addresses: [RP], keep_alive_timer: timer } });

  it("removing the last group deletes the RP address", () => {
    assert.deepEqual(pimRpOps(RP, { ...RP, groups: [] }, two), [{ op: "delete_rp_address", value: "192.0.2.50" }]);
  });

  it("the last RP address deletes the whole rp node, with or without a keep-alive-timer", () => {
    // An `rp` node with no address fails the commit; delete_rp also clears the timer.
    assert.deepEqual(pimRpDeleteOps(last(null), "192.0.2.50"), [{ op: "delete_rp" }]);
    assert.deepEqual(pimRpDeleteOps(last(180), "192.0.2.50"), [{ op: "delete_rp" }]);
    assert.deepEqual(pimRpOps(RP, { ...RP, groups: [] }, last(180)), [{ op: "delete_rp" }]);
    assert.deepEqual(pimRpDeleteOps(two, "192.0.2.50"), [{ op: "delete_rp_address", value: "192.0.2.50" }]);
  });

  it("diffs groups without deleting and re-creating the address", () => {
    assert.deepEqual(pimRpOps(RP, { ...RP }), []);
    assert.deepEqual(pimRpOps(RP, { ...RP, groups: ["239.0.0.0/8"] }), [
      { op: "delete_rp_address_group", value: "192.0.2.50,224.0.0.0/4" },
      { op: "set_rp_address_group", value: "192.0.2.50,239.0.0.0/8" },
    ]);
  });

  it("checks address, groups (multicast, no host bits, unique, at least one) and reuse", () => {
    assert.equal(pimRpProblem(null, RP, []), null);
    assert.deepEqual(pimRpProblem(null, { ...RP, address: "192.0.2" }), { key: "rpAddressInvalid" });
    assert.deepEqual(pimRpProblem(null, RP, [RP]), { key: "rpAddressExists" });
    assert.deepEqual(pimRpProblem(null, { ...RP, groups: [] }), { key: "groupRequired" });
    assert.deepEqual(pimRpProblem(null, { ...RP, groups: ["224.0.0.1/4"] }), { key: "groupInvalid" });
    // An edit may remove the last group: that deletes the RP.
    assert.equal(pimRpProblem(RP, { ...RP, groups: [] }), null);
    assert.deepEqual(pimRpProblem(null, RP, [], []), { key: "interfaceRequired" });
    assert.equal(pimRpProblem(null, RP, [], ["eth0"]), null);
    assert.deepEqual(pimRpProblem(null, { ...RP, groups: ["224.1.1.1/16"] }), { key: "groupInvalid" });
    assert.deepEqual(pimRpProblem(null, { ...RP, groups: ["10.0.0.0/8"] }), { key: "groupInvalid" });
    assert.deepEqual(pimRpProblem(null, { ...RP, groups: ["224.0.0.0/4", "224.0.0.0/4"] }), { key: "groupExists" });
    assert.deepEqual(pimRpProblem(null, { address: "192.0.2.51", groups: ["224.0.0.0/4"] }, [RP]), { key: "groupUsed" });
    assert.deepEqual(pimRpGroupsWithDraft([], " 239.0.0.0/8 "), { groups: ["239.0.0.0/8"], problem: null });
    assert.deepEqual(pimRpGroupsWithDraft(["239.0.0.0/8"], "239.0.0.0/8").problem, { key: "groupExists" });
    assert.deepEqual(pimRpGroupsWithDraft([], "239.0.0.1/8").problem, { key: "groupInvalid" });
  });

  it("tells multicast addresses and prefixes apart", () => {
    assert.ok(isIpv4Multicast("224.0.0.1") && isIpv4Multicast("239.255.255.255"));
    assert.ok(!isIpv4Multicast("240.0.0.1") && !isIpv4Multicast("223.0.0.1") && !isIpv4Multicast("239.1.1"));
    assert.ok(isIpv4MulticastPrefix("224.0.0.0/4") && isIpv4MulticastPrefix("232.1.1.1/32"));
    assert.ok(!isIpv4MulticastPrefix("0.0.0.0/0") && !isIpv4MulticastPrefix("224.0.0.0/3") && !isIpv4MulticastPrefix("224.0.0.0/04"));
  });
});

describe("no interface", () => {
  const ETH0 = { ...IFACE };
  it("blocks global and rp-timer saves that set something while no interface exists", () => {
    assert.deepEqual(pimGlobalProblem(draft(), CAPS, config()), { key: "interfaceRequired" });
    assert.equal(pimGlobalProblem(draft(), CAPS, config({ interfaces: [ETH0] })), null);
    const empty = pimGlobalDraft(config());
    assert.equal(pimGlobalProblem(empty, CAPS, config()), null, "clearing everything is allowed");
    assert.deepEqual(pimRpTimerProblem("90", CAPS, config()), { key: "interfaceRequired" });
    assert.equal(pimRpTimerProblem("", CAPS, config()), null);
  });

  it("blocks deleting the last interface while other PIM config remains", () => {
    const withRp = config({ interfaces: [ETH0], rp: { addresses: [{ address: "192.0.2.50", groups: ["224.0.0.0/4"] }], keep_alive_timer: null } });
    assert.deepEqual(pimInterfaceDeleteProblem(withRp, "eth0"), { key: "lastInterface" });
    assert.deepEqual(pimInterfaceDeleteProblem(config({ interfaces: [ETH0], packets: 3 }), "eth0"), { key: "lastInterface" });
    assert.equal(pimInterfaceDeleteProblem(config({ interfaces: [ETH0, { ...ETH0, name: "eth1" }], packets: 3 }), "eth0"), null);
    assert.equal(pimInterfaceDeleteProblem(config({ interfaces: [ETH0] }), "eth0"), null);
  });

  it("the last interface with nothing else deletes all of protocols pim", () => {
    assert.deepEqual(pimInterfaceDeleteOps(config({ interfaces: [ETH0] }), "eth0"), [{ op: "delete_pim" }]);
    assert.deepEqual(pimInterfaceDeleteOps(config({ interfaces: [ETH0, { ...ETH0, name: "eth1" }] }), "eth0"),
      [{ op: "delete_interface", value: "eth0" }]);
  });
});

describe("whole-object deletes", () => {
  it("names one object each", () => {
    assert.deepEqual(pimDeleteOps.interface(" eth0 "), [{ op: "delete_interface", value: "eth0" }]);
    assert.deepEqual(pimDeleteOps.rpAddress("192.0.2.50"), [{ op: "delete_rp_address", value: "192.0.2.50" }]);
    assert.deepEqual(pimDeleteOps.all(), [{ op: "delete_pim" }]);
    assert.deepEqual(pimDeleteOps.rp(), [{ op: "delete_rp" }]);
  });
});

describe("service", () => {
  function stub() {
    const sent: PimBatchOperation[][] = [];
    const service = Object.create(pimService) as typeof pimService;
    service.batchConfigure = async (ops: PimBatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("an unchanged form sends nothing", async () => {
    const { service, sent } = stub();
    await service.updateGlobalSettings(FILLED, draft());
    await service.updateRpKeepAliveTimer(FILLED, "180");
    await service.updateInterface(IFACE, ifaceDraft());
    await service.updateRpAddress(FILLED, { address: "192.0.2.50", groups: ["224.0.0.0/4"] }, { address: "192.0.2.50", groups: ["224.0.0.0/4"] });
    assert.deepEqual(sent, []);
  });

  it("sends each save as one batch", async () => {
    const { service, sent } = stub();
    await service.updateGlobalSettings(FILLED, draft({ packets: "", ecmp: false }));
    await service.deleteInterface(config({ interfaces: [IFACE, { ...IFACE, name: "eth1" }] }), "eth0");
    await service.deletePim();
    await service.deleteRpAddress(config({ rp: { addresses: [{ address: "192.0.2.50", groups: ["224.0.0.0/4"] }], keep_alive_timer: 180 } }), "192.0.2.50");
    assert.deepEqual(sent, [
      [{ op: "delete_ecmp" }, { op: "delete_packets" }],
      [{ op: "delete_interface", value: "eth0" }],
      [{ op: "delete_pim" }],
      [{ op: "delete_rp" }],
    ]);
  });
});

describe("batchConfigure", () => {
  it("throws the device error (or an empty message) on success:false and skips an empty batch", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    let error: string | null = "Commit failed";
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await pimService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(pimService.batchConfigure([{ op: "delete_pim" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/pim/batch", { operations: [{ op: "delete_pim" }] }]]);
      error = null;
      await assert.rejects(pimService.batchConfigure([{ op: "delete_pim" }]), { message: "" });
      assert.equal(posts.length, 2, "no config refresh after the batch");
    } finally {
      apiClient.post = original;
    }
  });
});

describe("screens", () => {
  const FRONTEND = fileURLToPath(new URL("../../..", import.meta.url));
  const read = (file: string) => readFileSync(join(FRONTEND, "src/components/pim", file), "utf8");

  it("the client only posts and does not refresh the config", () => {
    const client = readFileSync(join(FRONTEND, "src/lib/api/pim.ts"), "utf8");
    assert.doesNotMatch(client, /config\/refresh|refreshConfig|version_info|Operation failed/);
  });

  it("dialogs cannot close mid-save and scroll inside an 85vh frame", () => {
    for (const file of ["PimInterfaceModal.tsx", "PimRpAddressModal.tsx", "DeletePimItemModal.tsx"]) {
      const src = read(file);
      assert.match(src, /onOpenChange=\{handleOpenChange\}/, file);
      assert.match(src, /if \((!next && )?loading\) return;/, file);
    }
    for (const file of ["PimInterfaceModal.tsx", "PimRpAddressModal.tsx"]) {
      const src = read(file);
      assert.match(src, /DialogContent className="[^"]*max-h-\[85vh\] flex flex-col overflow-hidden"/, file);
      assert.match(src, /ScrollArea className="flex-1 min-h-0/, file);
    }
  });

  it("the delete dialog stays open with the device error", () => {
    const src = read("DeletePimItemModal.tsx");
    assert.match(src, /event\.preventDefault\(\)/);
    assert.match(src, /setError\(\(err as ApiError\)\.message \|\| t\(`deleteModal\.\$\{itemType\}\.failed`\)\)/);
    const page = read("PimContent.tsx");
    assert.match(page, /await DELETE_ACTIONS\[deleteTarget\.kind\]\(deleteTarget\.name, config\);\n[^\n]*\n\s*setDeleteOpen\(false\);/);
    // The last-interface block throws before the commit, so it shows in the open dialog.
    assert.match(page, /if \(problem\) throw \{ message: problemText\(problem\) \} satisfies ApiError;/);
  });

  it("every write control waits while a commit runs", () => {
    const page = read("PimContent.tsx");
    assert.match(page, /const writeBusy = refreshing \|\| generalSaving \|\| rpTimerSaving;/);
    // header delete, general edit, rp-timer edit, 2 interface adds, 2 rp adds, edit/delete on each table row
    assert.equal(page.match(/disabled=\{writeBusy\}/g)?.length, 11);
    for (const file of ["PimInterfaceModal.tsx", "PimRpAddressModal.tsx"]) {
      assert.match(read(file), /if \(loading\) return;/, file);
    }
  });

  it("uses the shared pickers and reports a failed picker load unless it is a 403", () => {
    const page = read("PimContent.tsx");
    assert.match(page, /\(err as ApiError\)\.status !== 403/);
    for (const key of ["loadPrefixListsFailed", "loadBfdProfilesFailed"]) {
      assert.match(page, new RegExp(`t\\("errors\\.${key}"\\)`), key);
    }
    assert.equal(page.match(/<NamedListSelect/g)?.length, 3);
    const modal = read("PimInterfaceModal.tsx");
    assert.match(modal, /<NamedListSelect\n\s*id="pim-bfd-profile"/);
    assert.match(modal, /filter=\{\(item\) => isEditMode \|\| !configuredInterfaces\.includes\(item\.name\)\}/);
    assert.doesNotMatch(modal, /showService/);
  });

  it("adds a typed-but-not-added value on save or blocks it", () => {
    assert.match(read("PimInterfaceModal.tsx"), /const folded = igmpEnabled \? foldJoinDrafts\(\)/);
    assert.match(read("PimRpAddressModal.tsx"), /const folded = pimRpGroupsWithDraft\(groups, newGroup\);/);
  });

  it("offers the whole-protocol delete when PIM is configured", () => {
    const page = read("PimContent.tsx");
    assert.match(page, /config\?\.configured && \(/);
    assert.match(page, /openDelete\("pim", ""\)/);
  });

  it("has no parseInt or English error fallback in the save path", () => {
    for (const file of ["PimContent.tsx", "PimInterfaceModal.tsx", "PimRpAddressModal.tsx", "DeletePimItemModal.tsx"]) {
      const src = read(file);
      assert.doesNotMatch(src, /parseInt|err instanceof Error/, file);
    }
  });
});
