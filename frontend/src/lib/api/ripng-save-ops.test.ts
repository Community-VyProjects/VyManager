import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ripngDeleteOps,
  ripngDistributeListGlobalOps,
  ripngDistributeListInterfaceEmpty,
  ripngDistributeListInterfaceOps,
  ripngDistributeListInterfaceProblem,
  ripngInterfaceOps,
  ripngInterfaceProblem,
  ripngListOps,
  ripngListProblem,
  ripngListWithDraft,
  ripngProblemArgs,
  ripngRedistributeOps,
  ripngRedistributeProblem,
  ripngSettingsOps,
  ripngSettingsProblem,
  ripngTimersOps,
} from "./ripng-save-ops";
import { apiClient } from "./client";
import { ripNgService, type RipNgBatchOperation, type RipNgCapabilities, type RipNgConfig } from "./ripng";

const CAPS: Pick<RipNgCapabilities, "ranges"> = {
  ranges: { metric: { min: 1, max: 16 }, timer: { min: 5, max: 2147483647 } },
};

function config(over: Partial<RipNgConfig> = {}): RipNgConfig {
  return {
    configured: true,
    default_information_originate: false,
    default_metric: null,
    route_map: null,
    aggregate_addresses: [],
    networks: [],
    routes: [],
    passive_interfaces: [],
    distribute_list: { global_filters: {}, interface_filters: [] },
    interfaces: [],
    redistribute: [],
    timers: { update: null, timeout: null, garbage_collection: null },
    ...over,
  };
}

const FILLED = config({
  default_information_originate: true,
  default_metric: 3,
  route_map: "RM",
  timers: { update: 30, timeout: 180, garbage_collection: 120 },
});

function draft(over: Record<string, unknown> = {}) {
  return {
    default_metric: "3",
    route_map: "RM",
    default_information_originate: true,
    timers: { update: "30", timeout: "180", garbage_collection: "120" },
    ...over,
  };
}

describe("settings", () => {
  it("an unchanged form sends nothing", () => {
    assert.deepEqual(ripngSettingsOps(FILLED, draft()), []);
    assert.deepEqual(ripngSettingsOps(FILLED, draft({ default_metric: " 3 ", route_map: "RM " })), []);
  });

  it("sets every leaf from an empty config", () => {
    assert.deepEqual(ripngSettingsOps(config(), draft()), [
      { op: "set_default_metric", value: "3" },
      { op: "set_route_map", value: "RM" },
      { op: "set_default_information_originate" },
      { op: "set_timers_update", value: "30" },
      { op: "set_timers_timeout", value: "180" },
      { op: "set_timers_garbage_collection", value: "120" },
    ]);
  });

  it("a cleared leaf sends its leaf delete", () => {
    assert.deepEqual(ripngSettingsOps(FILLED, draft({ default_metric: "", route_map: "" })), [
      { op: "delete_default_metric" },
      { op: "delete_route_map" },
    ]);
    assert.deepEqual(ripngSettingsOps(FILLED, draft({ default_information_originate: false })), [
      { op: "delete_default_information_originate" },
    ]);
  });

  it("clears one timer by its leaf and every timer by the timers node", () => {
    assert.deepEqual(ripngTimersOps(FILLED.timers, { update: "", timeout: "180", garbage_collection: "120" }), [
      { op: "delete_timers_update" },
    ]);
    assert.deepEqual(ripngTimersOps(FILLED.timers, { update: "", timeout: "", garbage_collection: "" }), [
      { op: "delete_timers" },
    ]);
    assert.deepEqual(ripngTimersOps(config().timers, { update: "", timeout: "", garbage_collection: "" }), []);
  });

  it("checks the served ranges with strict digits", () => {
    assert.equal(ripngSettingsProblem(draft(), CAPS), null);
    assert.equal(ripngSettingsProblem(draft({ default_metric: "" }), CAPS), null);
    for (const bad of ["0", "17", "1e1", "3.0", "-1", "3abc", "0x3", "٣", "３"]) {
      assert.deepEqual(ripngSettingsProblem(draft({ default_metric: bad }), CAPS), { key: "metricRange", min: 1, max: 16 }, bad);
    }
    assert.deepEqual(
      ripngSettingsProblem(draft({ timers: { update: "4", timeout: "", garbage_collection: "" } }), CAPS),
      { key: "timerRange", min: 5, max: 2147483647 },
    );
    assert.deepEqual(
      ripngSettingsProblem(draft({ timers: { update: "30", timeout: "2147483648", garbage_collection: "" } }), CAPS)?.key,
      "timerRange",
    );
    assert.deepEqual(ripngProblemArgs({ key: "metricRange", min: 1, max: 16 }), { min: "1", max: "16" });
  });
});

describe("lists", () => {
  it("adds and removes single values; kept values send nothing", () => {
    assert.deepEqual(ripngListOps("network", ["2001:db8::/32"], ["2001:db8::/32", "2001:db8:1::/48"]), [
      { op: "set_network", value: "2001:db8:1::/48" },
    ]);
    assert.deepEqual(ripngListOps("aggregateAddress", ["2001:db8::/48"], []), [
      { op: "delete_aggregate_address", value: "2001:db8::/48" },
    ]);
    assert.deepEqual(ripngListOps("route", [], [" 2001:db8::/64 "]), [{ op: "set_route", value: "2001:db8::/64" }]);
    assert.deepEqual(ripngListOps("passiveInterface", ["eth0"], ["eth1"]), [
      { op: "delete_passive_interface", value: "eth0" },
      { op: "set_passive_interface", value: "eth1" },
    ]);
    assert.deepEqual(ripngListOps("network", ["2001:db8::/32"], ["2001:db8::/32"]), []);
  });

  it("rejects host bits, IPv4 and duplicates with keyed errors", () => {
    assert.equal(ripngListProblem("network", [], "2001:db8::/32"), null);
    assert.deepEqual(ripngListProblem("network", [], "2001:db8::1/32"), { key: "prefixInvalid" });
    assert.deepEqual(ripngListProblem("route", [], "10.0.0.0/8"), { key: "prefixInvalid" });
    assert.deepEqual(ripngListProblem("aggregateAddress", [], "2001:db8::"), { key: "prefixInvalid" });
    assert.deepEqual(ripngListProblem("network", [], "2001:db8::/032"), { key: "prefixInvalid" });
    assert.deepEqual(ripngListProblem("route", [], "fe80::%eth0/64"), { key: "prefixInvalid" });
    assert.deepEqual(ripngListProblem("network", ["2001:db8::/32"], " 2001:db8::/32"), { key: "prefixExists" });
    assert.deepEqual(ripngListProblem("passiveInterface", [], ""), { key: "selectInterface" });
    assert.deepEqual(ripngListProblem("passiveInterface", ["eth0"], "eth0"), { key: "interfaceExists" });
  });

  it("folds a typed value into the list or blocks with the keyed problem", () => {
    assert.deepEqual(ripngListWithDraft("network", ["2001:db8::/32"], " 2001:db8:1::/48 "), {
      items: ["2001:db8::/32", "2001:db8:1::/48"],
      problem: null,
    });
    assert.deepEqual(ripngListWithDraft("network", ["a"], ""), { items: ["a"], problem: null });
    assert.deepEqual(ripngListWithDraft("route", [], "2001:db8::1/48"), { items: [], problem: { key: "prefixInvalid" } });
  });
});

describe("interfaces", () => {
  it("creates the tag and the split-horizon mode", () => {
    assert.deepEqual(ripngInterfaceOps(null, { name: "eth0", split_horizon: "poison-reverse" }), [
      { op: "set_interface", value: "eth0" },
      { op: "set_interface_split_horizon_poison_reverse", value: "eth0" },
    ]);
  });

  it("switches mode without re-creating the interface", () => {
    assert.deepEqual(
      ripngInterfaceOps({ name: "eth0", split_horizon: "poison-reverse" }, { name: "eth0", split_horizon: "disable" }),
      [
        { op: "delete_interface_split_horizon", value: "eth0" },
        { op: "set_interface_split_horizon_disable", value: "eth0" },
      ],
    );
    assert.deepEqual(
      ripngInterfaceOps({ name: "eth0", split_horizon: "disable" }, { name: "eth0", split_horizon: null }),
      [{ op: "delete_interface_split_horizon", value: "eth0" }],
    );
    assert.deepEqual(ripngInterfaceOps({ name: "eth0", split_horizon: null }, { name: "eth0", split_horizon: "" }), []);
  });

  it("requires an interface not yet configured on Add", () => {
    assert.deepEqual(ripngInterfaceProblem(null, { name: "" }), { key: "selectInterface" });
    assert.deepEqual(ripngInterfaceProblem(null, { name: "eth0" }, ["eth0"]), { key: "interfaceExists" });
    assert.equal(ripngInterfaceProblem({ name: "eth0" }, { name: "eth0" }, ["eth0"]), null);
  });
});

describe("redistribute", () => {
  it("creates the source with metric and route-map", () => {
    assert.deepEqual(ripngRedistributeOps(null, { protocol: "static", metric: "2", route_map: "RM" }), [
      { op: "set_redistribute", value: "static" },
      { op: "set_redistribute_metric", value: "static,2" },
      { op: "set_redistribute_route_map", value: "static,RM" },
    ]);
  });

  it("a cleared leaf is a leaf delete; the source is never deleted and re-created", () => {
    const stored = { protocol: "static", metric: 2, route_map: "RM" };
    assert.deepEqual(ripngRedistributeOps(stored, { protocol: "static", metric: "", route_map: null }), [
      { op: "delete_redistribute_metric", value: "static" },
      { op: "delete_redistribute_route_map", value: "static" },
    ]);
    assert.deepEqual(ripngRedistributeOps(stored, { protocol: "static", metric: "2", route_map: "RM" }), []);
    assert.deepEqual(ripngRedistributeOps(stored, { protocol: "static", metric: "5", route_map: "RM2" }), [
      { op: "set_redistribute_metric", value: "static,5" },
      { op: "set_redistribute_route_map", value: "static,RM2" },
    ]);
  });

  it("checks protocol and metric range", () => {
    assert.deepEqual(ripngRedistributeProblem({ protocol: "" }, CAPS), { key: "selectProtocol" });
    assert.deepEqual(ripngRedistributeProblem({ protocol: "bgp", metric: "17" }, CAPS), { key: "metricRange", min: 1, max: 16 });
    assert.deepEqual(ripngRedistributeProblem({ protocol: "bgp", metric: "1.5" }, CAPS)?.key, "metricRange");
    assert.equal(ripngRedistributeProblem({ protocol: "bgp", metric: "16" }, CAPS), null);
  });
});

describe("distribute lists", () => {
  it("diffs each global direction", () => {
    assert.deepEqual(ripngDistributeListGlobalOps({}, { access_list_in: "A", prefix_list_out: "P" }), [
      { op: "set_distribute_list_access_list_in", value: "A" },
      { op: "set_distribute_list_prefix_list_out", value: "P" },
    ]);
    assert.deepEqual(
      ripngDistributeListGlobalOps(
        { access_list_in: "A", access_list_out: "B", prefix_list_in: "C", prefix_list_out: "D" },
        { access_list_in: "A", access_list_out: null, prefix_list_in: "", prefix_list_out: "D" },
      ),
      [{ op: "delete_distribute_list_access_list_out" }, { op: "delete_distribute_list_prefix_list_in" }],
    );
  });

  it("diffs each per-interface direction without re-creating the interface tag", () => {
    assert.deepEqual(
      ripngDistributeListInterfaceOps(null, { interface: "eth0", access_list_in: "A", access_list_out: "B", prefix_list_in: "C", prefix_list_out: "D" }),
      [
        { op: "set_distribute_list_interface_access_list_in", value: "eth0,A" },
        { op: "set_distribute_list_interface_access_list_out", value: "eth0,B" },
        { op: "set_distribute_list_interface_prefix_list_in", value: "eth0,C" },
        { op: "set_distribute_list_interface_prefix_list_out", value: "eth0,D" },
      ],
    );
    assert.deepEqual(
      ripngDistributeListInterfaceOps(
        { interface: "eth0", access_list_in: "A", access_list_out: "B", prefix_list_in: "C", prefix_list_out: "D" },
        { interface: "eth0", access_list_in: null, access_list_out: "B", prefix_list_in: "C2", prefix_list_out: "" },
      ),
      [
        { op: "delete_distribute_list_interface_access_list_in", value: "eth0" },
        { op: "set_distribute_list_interface_prefix_list_in", value: "eth0,C2" },
        { op: "delete_distribute_list_interface_prefix_list_out", value: "eth0" },
      ],
    );
  });

  it("an edit that clears all four lists deletes the interface node", () => {
    const stored = { interface: "eth0", access_list_in: "A", access_list_out: null, prefix_list_in: "C", prefix_list_out: null };
    const cleared = { interface: "eth0", access_list_in: "", access_list_out: null, prefix_list_in: " ", prefix_list_out: null };
    assert.deepEqual(ripngDistributeListInterfaceOps(stored, cleared), [
      { op: "delete_distribute_list_interface", value: "eth0" },
    ]);
    assert.deepEqual(ripngDistributeListInterfaceOps(stored, cleared), ripngDeleteOps.interfaceFilter("eth0"));
    // A bare stored node cleared again is still removed, not left behind.
    assert.deepEqual(ripngDistributeListInterfaceOps({ interface: "eth0" }, { interface: "eth0" }), [
      { op: "delete_distribute_list_interface", value: "eth0" },
    ]);
    assert.equal(ripngDistributeListInterfaceProblem(stored, cleared, ["eth0"]), null);
  });

  it("requires an interface, a free one on Add, and at least one list", () => {
    assert.equal(ripngDistributeListInterfaceEmpty({ interface: "eth0", access_list_in: " " }), true);
    assert.deepEqual(ripngDistributeListInterfaceProblem(null, { interface: "" }), { key: "selectInterface" });
    assert.deepEqual(
      ripngDistributeListInterfaceProblem(null, { interface: "eth0", access_list_in: "A" }, ["eth0"]),
      { key: "interfaceExists" },
    );
    assert.deepEqual(ripngDistributeListInterfaceProblem(null, { interface: "eth1" }), { key: "selectList" });
    assert.equal(
      ripngDistributeListInterfaceProblem({ interface: "eth0" }, { interface: "eth0", prefix_list_in: "P" }, ["eth0"]),
      null,
    );
  });
});

describe("whole-object deletes", () => {
  it("names one object each", () => {
    assert.deepEqual(ripngDeleteOps.listItem("network", "2001:db8::/32"), [{ op: "delete_network", value: "2001:db8::/32" }]);
    assert.deepEqual(ripngDeleteOps.listItem("aggregateAddress", "2001:db8::/48"), [
      { op: "delete_aggregate_address", value: "2001:db8::/48" },
    ]);
    assert.deepEqual(ripngDeleteOps.listItem("route", "2001:db8::/64"), [{ op: "delete_route", value: "2001:db8::/64" }]);
    assert.deepEqual(ripngDeleteOps.listItem("passiveInterface", "eth0"), [{ op: "delete_passive_interface", value: "eth0" }]);
    assert.deepEqual(ripngDeleteOps.interface("eth0"), [{ op: "delete_interface", value: "eth0" }]);
    assert.deepEqual(ripngDeleteOps.redistribute("bgp"), [{ op: "delete_redistribute", value: "bgp" }]);
    assert.deepEqual(ripngDeleteOps.interfaceFilter("eth0"), [{ op: "delete_distribute_list_interface", value: "eth0" }]);
    assert.deepEqual(ripngDeleteOps.all(), [{ op: "delete_ripng" }]);
  });
});

describe("service", () => {
  function stub() {
    const sent: RipNgBatchOperation[][] = [];
    const service = Object.create(ripNgService) as typeof ripNgService;
    service.batchConfigure = async (ops: RipNgBatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("sends global settings and timers in one batch", async () => {
    const { service, sent } = stub();
    await service.updateSettings(FILLED, draft({ default_metric: "", timers: { update: "60", timeout: "180", garbage_collection: "120" } }));
    assert.deepEqual(sent, [[{ op: "delete_default_metric" }, { op: "set_timers_update", value: "60" }]]);
  });

  it("an unchanged form sends nothing", async () => {
    const { service, sent } = stub();
    await service.updateSettings(FILLED, draft());
    await service.updateInterface({ name: "eth0", split_horizon: "disable" }, { name: "eth0", split_horizon: "disable" });
    await service.updateRedistribute({ protocol: "bgp", metric: 1 }, { protocol: "bgp", metric: "1" });
    await service.updateDistributeListGlobal({ access_list_in: "A" }, { access_list_in: "A" });
    await service.updateList("network", ["2001:db8::/32"], ["2001:db8::/32"]);
    assert.deepEqual(sent, []);
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
      assert.deepEqual(await ripNgService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(ripNgService.batchConfigure([{ op: "delete_ripng" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/ripng/batch", { operations: [{ op: "delete_ripng" }] }]]);
      error = null;
      await assert.rejects(ripNgService.batchConfigure([{ op: "delete_ripng" }]), { message: "" });
      assert.equal(posts.length, 2, "no config refresh after the batch");
    } finally {
      apiClient.post = original;
    }
  });
});

describe("screens", () => {
  const FRONTEND = fileURLToPath(new URL("../../..", import.meta.url));
  const read = (file: string) => readFileSync(join(FRONTEND, "src/components/ripng", file), "utf8");

  it("the client only posts and does not refresh the config", () => {
    const client = readFileSync(join(FRONTEND, "src/lib/api/ripng.ts"), "utf8");
    assert.doesNotMatch(client, /config\/refresh|refreshConfig|version_info/);
  });

  it("dialogs cannot close mid-save and scroll inside an 85vh frame", () => {
    for (const file of ["RipngInterfaceModal.tsx", "RipngRedistributeModal.tsx", "RipngDistributeListInterfaceModal.tsx", "DeleteRipngModal.tsx"]) {
      const src = read(file);
      assert.match(src, /onOpenChange=\{handleOpenChange\}/, file);
      assert.match(src, /if \((!next && )?loading\) return;/, file);
    }
    for (const file of ["RipngInterfaceModal.tsx", "RipngRedistributeModal.tsx", "RipngDistributeListInterfaceModal.tsx"]) {
      const src = read(file);
      assert.match(src, /DialogContent className="[^"]*max-h-\[85vh\] flex flex-col overflow-hidden"/, file);
      assert.match(src, /ScrollArea className="flex-1 min-h-0/, file);
    }
  });

  it("the per-interface filter delete sends the same node delete as a full clear", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /interfaceFilter: \(name\) => ripNgService\.deleteDistributeListInterface\(name\)/);
    const client = readFileSync(join(FRONTEND, "src/lib/api/ripng.ts"), "utf8");
    assert.match(client, /deleteDistributeListInterface\(iface: string\)[^}]*ripngDeleteOps\.interfaceFilter\(iface\)/);
  });

  it("the delete dialog stays open with the device error", () => {
    const src = read("DeleteRipngModal.tsx");
    assert.match(src, /event\.preventDefault\(\)/);
    assert.match(src, /setError\(\(err as ApiError\)\.message \|\| tc\("operationFailed"\)\)/);
    const page = read("RipngContent.tsx");
    // The commit runs before the close, so a failed commit leaves the dialog open.
    assert.match(page, /await DELETE_ACTIONS\[deleteTarget\.kind\]\(deleteTarget\.name\);\n[^\n]*\n\s*setDeleteOpen\(false\);/);
  });

  it("list removes go through the confirm dialog and wait while a commit runs", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /onClick=\{\(\) => openDelete\(kind, item\)\}/);
    assert.doesNotMatch(page, /onRemove/);
    assert.match(page, /const busy = listBusy !== null \|\| refreshing;/);
    assert.equal(page.match(/disabled=\{busy\}/g)?.length, 3);
    assert.match(page, /disabled=\{busy \|\| !inputValue\.trim\(\)\}/);
    assert.match(page, /if \(inputValue\.trim\(\) && !busy\)/);
  });

  it("a list commit gates every other write control on the page", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /const writeBusy = refreshing \|\| listBusy !== null;/);
    // Only the Refresh button waits on the re-read alone.
    assert.equal(page.match(/disabled=\{refreshing\}/g)?.length, 1);
    // header delete, overview edit, 2 interface adds, 2 redistribute adds, global-filter edit, per-interface add,
    // and the edit/delete pair on each of the three tables
    assert.equal(page.match(/disabled=\{writeBusy\}/g)?.length, 14);
    assert.match(page, /onClick=\{saveOverview\} disabled=\{overviewSaving \|\| writeBusy\}/);
    assert.match(page, /onClick=\{saveDlGlobal\} disabled=\{dlGlobalSaving \|\| writeBusy\}/);
  });

  it("clears a list section error when its draft changes or one of its items is deleted", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /setListDrafts\(\(prev\) => \(\{ \.\.\.prev, \[kind\]: v \}\)\);\n\s*setListError\(kind, null\);/);
    assert.match(page, /if \(isListKind\(deleteTarget\.kind\)\) setListError\(deleteTarget\.kind, null\);/);
  });

  it("labels the passive-interface default option from the shared catalog", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /\{ label: tc\("shown\.default"\), value: "default" \}/);
  });

  it("reports a failed picker list load unless it is a 403", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /\(err as ApiError\)\.status !== 403/);
    for (const key of ["loadRouteMapsFailed", "loadAccessListsFailed", "loadPrefixListsFailed"]) {
      assert.match(page, new RegExp(`t\\("errors\\.${key}"\\)`), key);
    }
    assert.doesNotMatch(page, /\.catch\(\(\) => \[\]/);
  });

  it("reads redistribute sources only from capabilities and offers only unconfigured interfaces on Add", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /protocols=\{capabilities\?\.features\.redistribute\.protocols \|\| \[\]\}/);
    assert.doesNotMatch(page, /"babel", "bgp"/);
    assert.match(page, /configuredInterfaces=\{config\?\.interfaces\.map\(\(i\) => i\.name\) \?\? \[\]\}/);
    const modal = read("RipngInterfaceModal.tsx");
    assert.match(modal, /filter=\{\(item\) => isEditMode \|\| !configuredInterfaces\.includes\(item\.name\)\}/);
    assert.doesNotMatch(modal, /showService/);
  });

  it("offers the whole-protocol delete when RIPng is configured", () => {
    const page = read("RipngContent.tsx");
    assert.match(page, /config\?\.configured && \(/);
    assert.match(page, /openDelete\("ripng", ""\)/);
  });

  it("has no parseInt in the save path", () => {
    for (const file of ["RipngContent.tsx", "RipngRedistributeModal.tsx"]) {
      assert.doesNotMatch(read(file), /parseInt/, file);
    }
  });
});
