import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isIpv6Address,
  isIpv6Multicast,
  isIpv6MulticastPrefix,
  pim6DeleteOps,
  pim6GlobalDraft,
  pim6GlobalOps,
  pim6GlobalProblem,
  pim6InterfaceOps,
  pim6InterfaceProblem,
  pim6JoinSourcesWithDraft,
  pim6JoinsWithDraft,
  pim6ProblemArgs,
  pim6RpDeleteOps,
  pim6RpGroupsWithDraft,
  pim6RpOps,
  pim6RpProblem,
  pim6RpTimerOps,
  pim6RpTimerProblem,
  READ_ONLY_MLD_LEAVES,
  type Pim6GlobalDraft,
  type Pim6InterfaceDraft,
} from "./pim6-save-ops";
import { apiClient } from "./client";
import {
  pim6Service,
  type Pim6BatchOperation,
  type Pim6Capabilities,
  type Pim6Config,
  type Pim6Interface,
  type Pim6RpAddress,
} from "./pim6";

const CAPS: Pick<Pim6Capabilities, "ranges"> = {
  ranges: {
    timer: { min: 1, max: 65535 },
    packets: { min: 1, max: 255 },
    dr_priority: { min: 1, max: 4294967295 },
    hello: { min: 1, max: 180 },
    mld_interval: { min: 1, max: 65535 },
    last_member_query_count: { min: 1, max: 255 },
    last_member_query_interval: { min: 100, max: 6553500 },
    max_response_time: { min: 100, max: 6553500 },
    mld_version: { min: 1, max: 2 },
  },
};

function config(over: Partial<Pim6Config> = {}): Pim6Config {
  return {
    configured: true,
    interfaces: [],
    join_prune_interval: null,
    keep_alive_timer: null,
    packets: null,
    register_suppress_time: null,
    rp: null,
    ...over,
  };
}

const FILLED = config({
  join_prune_interval: 60,
  keep_alive_timer: 210,
  packets: 3,
  register_suppress_time: 60,
  rp: { addresses: [], keep_alive_timer: 180 },
});

function draft(over: Partial<Pim6GlobalDraft> = {}): Pim6GlobalDraft {
  return { ...pim6GlobalDraft(FILLED), ...over };
}

const G = "ff0e::1:3";
const S1 = "2001:db8::10";
const S2 = "2001:db8::11";

const IFACE: Pim6Interface = {
  name: "eth0",
  dr_priority: 5,
  hello: 30,
  no_bsm: true,
  no_unicast_bsm: true,
  passive: true,
  mld: {
    disabled: true,
    interval: 125,
    last_member_query_count: 2,
    last_member_query_interval: 1000,
    max_response_time: 5000,
    version: 2,
    joins: [{ group: G, sources: [S1, S2] }],
  },
};

function ifaceDraft(over: Partial<Pim6InterfaceDraft> = {}): Pim6InterfaceDraft {
  return {
    name: "eth0",
    dr_priority: "5",
    hello: "30",
    no_bsm: true,
    no_unicast_bsm: true,
    passive: true,
    mld: {
      disabled: true,
      interval: "125",
      last_member_query_count: "2",
      last_member_query_interval: "1000",
      max_response_time: "5000",
      version: "2",
      joins: [{ group: G, sources: [S1, S2] }],
    },
    ...over,
  };
}

const RP = "2001:db8::50";
const RP_GROUPS: Pim6RpAddress = { address: RP, groups: ["ff0e::/16", "ff3e::/32"], prefix_list6: null };
const RP_LIST: Pim6RpAddress = { address: RP, groups: ["ff0e::/16", "ff3e::/32"], prefix_list6: "RP-PL6" };

describe("global settings", () => {
  it("an unchanged form sends nothing", () => {
    assert.deepEqual(pim6GlobalOps(FILLED, draft()), []);
    assert.deepEqual(pim6GlobalOps(FILLED, draft({ packets: " 3 " })), []);
    assert.deepEqual(pim6GlobalOps(config(), pim6GlobalDraft(config())), []);
  });

  it("sets every leaf from an empty config", () => {
    assert.deepEqual(pim6GlobalOps(config(), draft()), [
      { op: "set_join_prune_interval", value: "60" },
      { op: "set_keep_alive_timer", value: "210" },
      { op: "set_register_suppress_time", value: "60" },
      { op: "set_packets", value: "3" },
    ]);
  });

  it("a cleared leaf sends its leaf delete", () => {
    assert.deepEqual(pim6GlobalOps(FILLED, pim6GlobalDraft(config())), [
      { op: "delete_join_prune_interval" },
      { op: "delete_keep_alive_timer" },
      { op: "delete_register_suppress_time" },
      { op: "delete_packets" },
    ]);
  });

  it("checks the served ranges with plain digits and needs no interface", () => {
    assert.equal(pim6GlobalProblem(draft(), CAPS), null);
    assert.deepEqual(pim6GlobalProblem(draft({ packets: "256" }), CAPS), { key: "packetsRange", min: 1, max: 255 });
    assert.deepEqual(pim6GlobalProblem(draft({ packets: "3.0" }), CAPS), { key: "packetsRange", min: 1, max: 255 });
    assert.deepEqual(pim6GlobalProblem(draft({ join_prune_interval: "0" }), CAPS)?.key, "joinPruneRange");
    assert.deepEqual(pim6GlobalProblem(draft({ keep_alive_timer: "1e3" }), CAPS)?.key, "keepAliveRange");
    assert.deepEqual(pim6GlobalProblem(draft({ register_suppress_time: "65536" }), CAPS)?.key, "registerSuppressRange");
    assert.deepEqual(pim6ProblemArgs({ key: "packetsRange", min: 1, max: 255 }), { min: "1", max: "255" });
  });
});

describe("rp keep-alive timer", () => {
  const withRp = config({ rp: { addresses: [RP_GROUPS], keep_alive_timer: null } });

  it("needs an RP address", () => {
    assert.deepEqual(pim6RpTimerProblem("90", CAPS, config()), { key: "rpRequired" });
    assert.equal(pim6RpTimerProblem("", CAPS, config()), null);
    assert.equal(pim6RpTimerProblem("90", CAPS, withRp), null);
    assert.deepEqual(pim6RpTimerProblem("0", CAPS, withRp)?.key, "rpKeepAliveRange");
  });

  it("diffs the timer and drops an rp node that would be left empty", () => {
    assert.deepEqual(pim6RpTimerOps(withRp, "90"), [{ op: "set_rp_keep_alive_timer", value: "90" }]);
    const timerOnly = config({ rp: { addresses: [], keep_alive_timer: 90 } });
    assert.deepEqual(pim6RpTimerOps(timerOnly, ""), [{ op: "delete_rp" }]);
    const both = config({ rp: { addresses: [RP_GROUPS], keep_alive_timer: 90 } });
    assert.deepEqual(pim6RpTimerOps(both, ""), [{ op: "delete_rp_keep_alive_timer" }]);
    assert.deepEqual(pim6RpTimerOps(both, " 90 "), []);
  });
});

describe("interfaces", () => {
  it("an unchanged form sends nothing", () => {
    assert.deepEqual(pim6InterfaceOps(IFACE, ifaceDraft()), []);
    assert.deepEqual(pim6InterfaceOps(IFACE, ifaceDraft({ hello: " 30 " })), []);
  });

  it("creates every leaf", () => {
    const i = "eth0";
    assert.deepEqual(pim6InterfaceOps(null, ifaceDraft()), [
      { op: "set_interface", value: i },
      { op: "set_interface_dr_priority", value: `${i},5` },
      { op: "set_interface_hello", value: `${i},30` },
      { op: "set_interface_no_bsm", value: i },
      { op: "set_interface_no_unicast_bsm", value: i },
      { op: "set_interface_passive", value: i },
      { op: "set_interface_mld", value: i },
      { op: "set_interface_mld_disable", value: i },
      { op: "set_interface_mld_interval", value: `${i},125` },
      { op: "set_interface_mld_last_member_query_count", value: `${i},2` },
      { op: "set_interface_mld_version", value: `${i},2` },
      { op: "set_interface_mld_join", value: `${i},${G}` },
      { op: "set_interface_mld_join_source", value: `${i},${G},${S1}` },
      { op: "set_interface_mld_join_source", value: `${i},${G},${S2}` },
    ]);
  });

  it("a cleared leaf sends its leaf delete and never re-creates the interface", () => {
    const cleared: Pim6InterfaceDraft = {
      name: "eth0", dr_priority: "", hello: "", no_bsm: false, no_unicast_bsm: false, passive: false,
      mld: { disabled: false, interval: "", last_member_query_count: "", last_member_query_interval: "",
        max_response_time: "", version: "", joins: [] },
    };
    const i = "eth0";
    assert.deepEqual(pim6InterfaceOps(IFACE, cleared), [
      { op: "delete_interface_dr_priority", value: i },
      { op: "delete_interface_hello", value: i },
      { op: "delete_interface_no_bsm", value: i },
      { op: "delete_interface_no_unicast_bsm", value: i },
      { op: "delete_interface_passive", value: i },
      { op: "delete_interface_mld_disable", value: i },
      { op: "delete_interface_mld_interval", value: i },
      { op: "delete_interface_mld_last_member_query_count", value: i },
      { op: "delete_interface_mld_last_member_query_interval", value: i },
      { op: "delete_interface_mld_max_response_time", value: i },
      { op: "delete_interface_mld_version", value: i },
      { op: "delete_interface_mld_join", value: `${i},${G}` },
    ]);
  });

  it("turning MLD off deletes the node; a kept join only diffs its sources", () => {
    assert.deepEqual(pim6InterfaceOps(IFACE, ifaceDraft({ mld: null })), [{ op: "delete_interface_mld", value: "eth0" }]);
    const base = ifaceDraft();
    const sources = ifaceDraft({ mld: { ...base.mld!, joins: [{ group: G, sources: [S2, "2001:db8::12"] }] } });
    assert.deepEqual(pim6InterfaceOps(IFACE, sources), [
      { op: "delete_interface_mld_join_source", value: `eth0,${G},${S1}` },
      { op: "set_interface_mld_join_source", value: `eth0,${G},2001:db8::12` },
    ]);
    const bare = { ...IFACE, mld: null };
    assert.deepEqual(pim6InterfaceOps(bare, ifaceDraft({ mld: { ...base.mld!, disabled: false, interval: "",
      last_member_query_count: "", last_member_query_interval: "", max_response_time: "", version: "", joins: [] } })),
    [{ op: "set_interface_mld", value: "eth0" }]);
  });

  it("never sets last-member-query-interval or max-response-time; a loaded value can only be removed", () => {
    assert.deepEqual([...READ_ONLY_MLD_LEAVES], ["last_member_query_interval", "max_response_time"]);
    const base = ifaceDraft().mld!;
    const noMld = { ...IFACE, mld: null };
    const typed = [
      pim6InterfaceOps(null, ifaceDraft({ mld: { ...base, last_member_query_interval: "200", max_response_time: "300" } })),
      pim6InterfaceOps(IFACE, ifaceDraft({ mld: { ...base, last_member_query_interval: "2000", max_response_time: "6000" } })),
      pim6InterfaceOps(noMld, ifaceDraft()),
      pim6InterfaceOps({ ...IFACE, mld: { ...IFACE.mld!, last_member_query_interval: null, max_response_time: null } },
        ifaceDraft()),
    ].flat();
    for (const op of typed) {
      assert.ok(!/^set_interface_mld_(last_member_query_interval|max_response_time)$/.test(op.op), op.op);
    }
    assert.deepEqual(pim6InterfaceOps(IFACE, ifaceDraft({ mld: { ...base, last_member_query_interval: "", max_response_time: "" } })), [
      { op: "delete_interface_mld_last_member_query_interval", value: "eth0" },
      { op: "delete_interface_mld_max_response_time", value: "eth0" },
    ]);
    // The modal sends the loaded value back unchanged unless removed.
    const modal = readFileSync(join(fileURLToPath(new URL("../../..", import.meta.url)),
      "src/components/pim6/Pim6InterfaceModal.tsx"), "utf8");
    assert.match(modal, /last_member_query_interval: removeLmqi \? "" : loadedLmqi,/);
    assert.match(modal, /max_response_time: removeMaxResponse \? "" : loadedMaxResponse,/);
    assert.doesNotMatch(modal, /numberInput\("mld-(lmqi|max-response)"/);
  });

  it("checks names, ranges and joins with keyed problems", () => {
    assert.equal(pim6InterfaceProblem(null, ifaceDraft(), CAPS, ["eth1"]), null);
    assert.deepEqual(pim6InterfaceProblem(null, ifaceDraft({ name: " " }), CAPS), { key: "selectInterface" });
    assert.deepEqual(pim6InterfaceProblem(null, ifaceDraft(), CAPS, ["eth0"]), { key: "interfaceExists" });
    assert.equal(pim6InterfaceProblem(IFACE, ifaceDraft(), CAPS, ["eth0"]), null);
    const base = ifaceDraft().mld!;
    const cases: [Partial<Pim6InterfaceDraft>, string][] = [
      [{ dr_priority: "4294967296" }, "drPriorityRange"],
      [{ hello: "181" }, "helloRange"],
      [{ mld: { ...base, interval: "0" } }, "mldIntervalRange"],
      [{ mld: { ...base, last_member_query_count: "256" } }, "lastMemberQueryCountRange"],
      [{ mld: { ...base, version: "3" } }, "mldVersionRange"],
      [{ mld: { ...base, joins: [{ group: "2001:db8::1", sources: [] }] } }, "joinGroupInvalid"],
      [{ mld: { ...base, joins: [{ group: G, sources: [] }, { group: G, sources: [] }] } }, "joinExists"],
      [{ mld: { ...base, joins: [{ group: G, sources: ["192.0.2.1"] }] } }, "joinSourceInvalid"],
      [{ mld: { ...base, joins: [{ group: G, sources: [S1, S1] }] } }, "joinSourceExists"],
    ];
    for (const [over, key] of cases) {
      assert.equal(pim6InterfaceProblem(IFACE, ifaceDraft(over), CAPS)?.key, key, key);
    }
    // An MLD tab that is off is not checked.
    assert.equal(pim6InterfaceProblem(IFACE, ifaceDraft({ mld: null }), CAPS), null);
  });

  it("folds typed joins and sources or returns the problem", () => {
    assert.deepEqual(pim6JoinsWithDraft([], " ff02::1 "), { joins: [{ group: "ff02::1", sources: [] }], problem: null });
    assert.deepEqual(pim6JoinsWithDraft([], "").problem, null);
    assert.deepEqual(pim6JoinsWithDraft([], "2001:db8::1").problem, { key: "joinGroupInvalid" });
    assert.deepEqual(pim6JoinsWithDraft([{ group: G, sources: [] }], G).problem, { key: "joinExists" });
    const join = { group: G, sources: [S1] };
    assert.deepEqual(pim6JoinSourcesWithDraft(join, S2).join.sources, [S1, S2]);
    assert.deepEqual(pim6JoinSourcesWithDraft(join, S1).problem, { key: "joinSourceExists" });
    assert.deepEqual(pim6JoinSourcesWithDraft(join, "fe80::1%eth0").problem, { key: "joinSourceInvalid" });
  });
});

describe("rp addresses", () => {
  it("an unchanged form sends nothing", () => {
    assert.deepEqual(pim6RpOps(RP_GROUPS, { ...RP_GROUPS }), []);
    assert.deepEqual(pim6RpOps(RP_LIST, { ...RP_LIST, prefix_list6: " RP-PL6 " }), []);
  });

  it("creates groups with an optional prefix-list6 next to them", () => {
    assert.deepEqual(pim6RpOps(null, RP_GROUPS), [
      { op: "set_rp_address", value: RP },
      { op: "set_rp_address_group", value: `${RP},ff0e::/16` },
      { op: "set_rp_address_group", value: `${RP},ff3e::/32` },
    ]);
    assert.deepEqual(pim6RpOps(null, RP_LIST), [
      { op: "set_rp_address", value: RP },
      { op: "set_rp_address_group", value: `${RP},ff0e::/16` },
      { op: "set_rp_address_group", value: `${RP},ff3e::/32` },
      { op: "set_rp_address_prefix_list6", value: `${RP},RP-PL6` },
    ]);
  });

  it("diffs groups and the prefix-list6 without re-creating the address", () => {
    assert.deepEqual(pim6RpOps(RP_GROUPS, { ...RP_GROUPS, groups: ["ff3e::/32", "ff05::/16"] }), [
      { op: "delete_rp_address_group", value: `${RP},ff0e::/16` },
      { op: "set_rp_address_group", value: `${RP},ff05::/16` },
    ]);
    assert.deepEqual(pim6RpOps(RP_GROUPS, RP_LIST), [{ op: "set_rp_address_prefix_list6", value: `${RP},RP-PL6` }]);
    // Deleting the prefix-list6 keeps the groups.
    assert.deepEqual(pim6RpOps(RP_LIST, RP_GROUPS), [{ op: "delete_rp_address_prefix_list6", value: RP }]);
    assert.deepEqual(pim6RpOps(RP_LIST, { ...RP_LIST, prefix_list6: "OTHER" }), [
      { op: "set_rp_address_prefix_list6", value: `${RP},OTHER` },
    ]);
    // An edit left with no group sends nothing, even with a prefix-list6; the check blocks it.
    assert.deepEqual(pim6RpOps(RP_GROUPS, { ...RP_GROUPS, groups: [] }), []);
    assert.deepEqual(pim6RpOps(RP_LIST, { ...RP_LIST, groups: [] }), []);
  });

  it("checks the lab verify rules with keyed problems", () => {
    const other: Pim6RpAddress = { address: "2001:db8::51", groups: ["ff0e::/16"], prefix_list6: null };
    assert.equal(pim6RpProblem(null, RP_GROUPS, []), null);
    assert.equal(pim6RpProblem(null, RP_LIST, []), null);
    assert.deepEqual(pim6RpProblem(null, { ...RP_GROUPS, address: "192.0.2.1" }), { key: "rpAddressInvalid" });
    assert.deepEqual(pim6RpProblem(null, RP_GROUPS, [{ ...RP_LIST }]), { key: "rpAddressExists" });
    assert.deepEqual(pim6RpProblem(null, { ...RP_LIST, prefix_list6: "PL.1" }), { key: "prefixListInvalid" });
    // The lab rejects a prefix-list6 with no group ("group should be defined").
    assert.deepEqual(pim6RpProblem(null, { ...RP_GROUPS, groups: [] }), { key: "groupRequired" });
    assert.deepEqual(pim6RpProblem(null, { ...RP_LIST, groups: [] }), { key: "groupRequired" });
    assert.deepEqual(pim6RpProblem(RP_GROUPS, { ...RP_GROUPS, groups: [] }), { key: "groupLast" });
    assert.deepEqual(pim6RpProblem(RP_LIST, { ...RP_LIST, groups: [] }), { key: "groupLast" });
    assert.deepEqual(pim6RpProblem(null, { ...RP_GROUPS, groups: ["ff0e::1/16"] }), { key: "groupInvalid" });
    assert.deepEqual(pim6RpProblem(null, { ...RP_GROUPS, groups: ["2001:db8::/32"] }), { key: "groupInvalid" });
    assert.deepEqual(pim6RpProblem(null, { ...RP_GROUPS, groups: ["ff0e::/16", "ff0e::/16"] }), { key: "groupExists" });
    assert.deepEqual(pim6RpProblem(null, RP_GROUPS, [other]), { key: "groupUsed" });
  });

  it("folds a typed group or returns the problem", () => {
    assert.deepEqual(pim6RpGroupsWithDraft([], " ff0e::/16 "), { groups: ["ff0e::/16"], problem: null });
    assert.deepEqual(pim6RpGroupsWithDraft(["ff0e::/16"], "ff0e::/16").problem, { key: "groupExists" });
    assert.deepEqual(pim6RpGroupsWithDraft([], "ff0e::1/16").problem, { key: "groupInvalid" });
  });

  it("the last RP address deletes the rp node", () => {
    const one = config({ rp: { addresses: [RP_GROUPS], keep_alive_timer: 180 } });
    assert.deepEqual(pim6RpDeleteOps(one, RP), [{ op: "delete_rp" }]);
    const two = config({ rp: { addresses: [RP_GROUPS, { ...RP_LIST, address: "2001:db8::51", groups: ["ff05::/16"] }],
      keep_alive_timer: null } });
    assert.deepEqual(pim6RpDeleteOps(two, RP), [{ op: "delete_rp_address", value: RP }]);
  });

  it("address helpers follow the lab", () => {
    assert.ok(isIpv6Address("2001:db8::1") && isIpv6Address("::1") && !isIpv6Address("192.0.2.1"));
    assert.ok(!isIpv6Address("fe80::1%eth0") && !isIpv6Address("2001:db8::/32"));
    assert.ok(isIpv6Multicast("ff02::1") && isIpv6Multicast("FF0E::1:3"));
    assert.ok(!isIpv6Multicast("ff::1") && !isIpv6Multicast("2001:db8::1"));
    assert.ok(isIpv6MulticastPrefix("ff00::/8") && isIpv6MulticastPrefix("ff0e::/16"));
    assert.ok(!isIpv6MulticastPrefix("fe00::/7") && !isIpv6MulticastPrefix("ff0e::1/16") && !isIpv6MulticastPrefix("ff0e::/016"));
  });
});

describe("whole-object deletes", () => {
  it("names one object each and an interface delete never widens", () => {
    assert.deepEqual(pim6DeleteOps.interface(" eth0 "), [{ op: "delete_interface", value: "eth0" }]);
    assert.deepEqual(pim6DeleteOps.rpAddress(RP), [{ op: "delete_rp_address", value: RP }]);
    assert.deepEqual(pim6DeleteOps.all(), [{ op: "delete_pim6" }]);
    assert.deepEqual(pim6DeleteOps.rp(), [{ op: "delete_rp" }]);
  });
});

describe("service", () => {
  function stub() {
    const sent: Pim6BatchOperation[][] = [];
    const service = Object.create(pim6Service) as typeof pim6Service;
    service.batchConfigure = async (ops: Pim6BatchOperation[]) => {
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
    await service.updateRpAddress(RP_GROUPS, { ...RP_GROUPS });
    assert.deepEqual(sent, []);
  });

  it("sends each save as one batch", async () => {
    const { service, sent } = stub();
    await service.updateGlobalSettings(FILLED, draft({ packets: "" }));
    await service.deleteInterface("eth0");
    await service.deletePim6();
    await service.deleteRpAddress(config({ rp: { addresses: [RP_GROUPS], keep_alive_timer: 180 } }), RP);
    assert.deepEqual(sent, [
      [{ op: "delete_packets" }],
      [{ op: "delete_interface", value: "eth0" }],
      [{ op: "delete_pim6" }],
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
      assert.deepEqual(await pim6Service.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(pim6Service.batchConfigure([{ op: "delete_pim6" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/pim6/batch", { operations: [{ op: "delete_pim6" }] }]]);
      error = null;
      await assert.rejects(pim6Service.batchConfigure([{ op: "delete_pim6" }]), { message: "" });
      assert.equal(posts.length, 2, "no config refresh after the batch");
    } finally {
      apiClient.post = original;
    }
  });
});

describe("screens", () => {
  const FRONTEND = fileURLToPath(new URL("../../..", import.meta.url));
  const read = (file: string) => readFileSync(join(FRONTEND, "src/components/pim6", file), "utf8");

  it("the client only posts flat operations and does not refresh the config", () => {
    const client = readFileSync(join(FRONTEND, "src/lib/api/pim6.ts"), "utf8");
    assert.doesNotMatch(client, /config\/refresh|refreshConfig|version_info|Operation failed|groups: \[/);
  });

  it("dialogs cannot close mid-save and scroll inside an 85vh frame", () => {
    for (const file of ["Pim6InterfaceModal.tsx", "Pim6RpAddressModal.tsx", "DeletePim6ItemModal.tsx"]) {
      const src = read(file);
      assert.match(src, /onOpenChange=\{handleOpenChange\}/, file);
      assert.match(src, /if \((!next && )?loading\) return;/, file);
    }
    for (const file of ["Pim6InterfaceModal.tsx", "Pim6RpAddressModal.tsx"]) {
      const src = read(file);
      assert.match(src, /DialogContent className="[^"]*max-h-\[85vh\] flex flex-col overflow-hidden"/, file);
      assert.match(src, /ScrollArea className="flex-1 min-h-0/, file);
    }
  });

  it("the delete dialog stays open with the device error", () => {
    const src = read("DeletePim6ItemModal.tsx");
    assert.match(src, /event\.preventDefault\(\)/);
    assert.match(src, /setError\(\(err as ApiError\)\.message \|\| t\(`deleteModal\.\$\{itemType\}\.failed`\)\)/);
    const page = read("Pim6Content.tsx");
    assert.match(page, /await DELETE_ACTIONS\[deleteTarget\.kind\]\(deleteTarget\.name, config\);\n[^\n]*\n\s*setDeleteOpen\(false\);/);
  });

  it("every write control waits while a commit runs", () => {
    const page = read("Pim6Content.tsx");
    assert.match(page, /const writeBusy = refreshing \|\| generalSaving \|\| rpTimerSaving;/);
    // header delete, general edit, rp-timer edit, 2 interface adds, 2 rp adds, edit/delete on each table row
    assert.equal(page.match(/disabled=\{writeBusy\}/g)?.length, 11);
    for (const file of ["Pim6InterfaceModal.tsx", "Pim6RpAddressModal.tsx"]) {
      assert.match(read(file), /if \(loading\) return;/, file);
    }
  });

  it("uses the shared pickers and reports a failed picker load unless it is a 403", () => {
    const page = read("Pim6Content.tsx");
    assert.match(page, /\(err as ApiError\)\.status !== 403/);
    assert.match(page, /t\("errors\.loadPrefixListsFailed"\)/);
    assert.match(page, /ipv6_lists/);
    const rp = read("Pim6RpAddressModal.tsx");
    assert.match(rp, /<NamedListSelect\n\s*id="pim6-rp-prefix-list6"/);
    // Groups and the prefix-list6 are both always shown: no mode switch.
    assert.doesNotMatch(rp, /RadioGroup|mode ===|setMode/);
    assert.match(rp, /prefix_list6: prefixList\.trim\(\) \|\| null,/);
    const modal = read("Pim6InterfaceModal.tsx");
    assert.match(modal, /filter=\{\(item\) => isEditMode \|\| !configuredInterfaces\.includes\(item\.name\)\}/);
  });

  it("adds a typed-but-not-added value on save or blocks it", () => {
    assert.match(read("Pim6InterfaceModal.tsx"), /const folded = mldEnabled \? foldJoinDrafts\(\)/);
    assert.match(read("Pim6RpAddressModal.tsx"), /pim6RpGroupsWithDraft\(groups, newGroup\)/);
  });

  it("switches to the tab of any problem's field", () => {
    const modal = read("Pim6InterfaceModal.tsx");
    assert.equal(modal.match(/setActiveTab\(pim6ProblemTab\(/g)?.length, 2);
    for (const key of ["mldIntervalRange", "lastMemberQueryCountRange", "mldVersionRange", "joinGroupInvalid",
      "joinExists", "joinSourceInvalid", "joinSourceExists"]) {
      assert.match(modal, new RegExp(`"${key}",`), key);
    }
  });

  it("the last RP address delete says it clears the keep-alive timer", () => {
    const page = read("Pim6Content.tsx");
    assert.match(page, /clearsRpTimer=\{deleteTarget\?\.kind === "rpAddress" && lastRpWithTimer\}/);
    assert.match(read("DeletePim6ItemModal.tsx"), /t\("deleteModal\.rpAddress\.descriptionLast"\)/);
  });

  it("labels carry no hardcoded ranges and both locales hold the same keys", () => {
    const flat = (node: Record<string, unknown>, prefix = ""): string[] => Object.entries(node).flatMap(([k, v]) =>
      v && typeof v === "object" ? flat(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]);
    const locales = ["en", "zh-CN"].map((locale) =>
      JSON.parse(readFileSync(join(FRONTEND, "messages", locale, "pim6.json"), "utf8")));
    assert.deepEqual(flat(locales[0]), flat(locales[1]));
    for (const messages of locales) {
      for (const key of ["joinPruneInterval", "keepAliveTimer", "registerSuppressTime", "packets", "rpKeepAliveTimer"]) {
        assert.doesNotMatch(messages.content[key], /\d+-\d+/, key);
      }
      assert.ok(messages.deleteModal.rpAddress.descriptionLast);
      assert.equal(messages.content.allGroups, undefined);
      assert.equal(messages.validation.groupOrPrefixList, undefined);
      assert.equal(messages.rpModal.modePrefixList, undefined);
    }
  });

  it("offers the whole-protocol delete when PIMv6 is configured", () => {
    const page = read("Pim6Content.tsx");
    assert.match(page, /config\?\.configured && \(/);
    assert.match(page, /openDelete\("pim6", ""\)/);
  });

  it("has no parseInt or English error fallback in the save path", () => {
    for (const file of ["Pim6Content.tsx", "Pim6InterfaceModal.tsx", "Pim6RpAddressModal.tsx", "DeletePim6ItemModal.tsx"]) {
      assert.doesNotMatch(read(file), /parseInt|err instanceof Error/, file);
    }
  });
});
