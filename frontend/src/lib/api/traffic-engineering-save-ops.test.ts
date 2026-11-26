import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminGroupFields,
  adminGroupOps,
  adminGroupProblem,
  teDeleteOps,
  teInterfaceFields,
  teInterfaceOps,
  teInterfaceProblem,
  type TeInterfaceFields,
} from "./traffic-engineering-save-ops";
import {
  trafficEngineeringService,
  type AdminGroup,
  type TeBatchOperation,
  type TeInterface,
  type TrafficEngineeringCapabilities,
} from "./traffic-engineering";
import { apiClient } from "./client";

const flag = { supported: true, description: "" };
const CAPS: TrafficEngineeringCapabilities = {
  version: "1.5",
  features: { traffic_engineering: flag, admin_groups: flag, interface_params: flag },
  ranges: {
    bit_position: { min: 0, max: 31 },
    max_bandwidth: { min: 1, max: 4294967295 },
    max_reservable_bandwidth: { min: 1, max: 4294967295 },
    metric: { min: 1, max: 4294967295 },
  },
};

const GOLD: AdminGroup = { name: "gold", bit_position: 7 };
const SILVER: AdminGroup = { name: "silver", bit_position: 0 };
const GROUPS = [GOLD, SILVER];

const ETH0: TeInterface = {
  name: "eth0",
  admin_groups: ["gold"],
  max_bandwidth: 1000,
  max_reservable_bandwidth: 500,
  metric: 10,
};
const ETH1: TeInterface = {
  name: "eth1",
  admin_groups: ["gold", "silver"],
  max_bandwidth: null,
  max_reservable_bandwidth: null,
  metric: null,
};

function iface(patch: Partial<TeInterfaceFields>, base: TeInterface | null = null): TeInterfaceFields {
  return { ...teInterfaceFields(base), ...patch };
}

describe("admin group save check", () => {
  it("rejects what the lab commit rejects", () => {
    const check = (name: string, bit: string, original: AdminGroup | null = null) =>
      adminGroupProblem({ name, bitPosition: bit }, original, GROUPS, CAPS);
    assert.deepEqual(check("", "1"), { key: "nameRequired" });
    assert.deepEqual(check("a_b", "1"), { key: "nameInvalid" });
    assert.deepEqual(check(" gold ", "1"), { key: "groupExists", name: "gold" });
    assert.deepEqual(check("bronze", ""), { key: "bitRequired" });
    assert.deepEqual(check("bronze", " "), { key: "bitRequired" });
    assert.deepEqual(check("bronze", "1.5"), { key: "numberInvalid", field: "bit_position" });
    assert.deepEqual(check("bronze", "32"), { key: "range", field: "bit_position", min: 0, max: 31 });
    assert.deepEqual(check("bronze", "07"), { key: "bitTaken", name: "gold" });
    assert.equal(check("bronze", "31"), null);
    // An edit keeps its own bit, and may not clear it.
    assert.equal(check("", "7", GOLD), null);
    assert.deepEqual(check("", "", GOLD), { key: "bitRequired" });
    assert.deepEqual(check("", "0", GOLD), { key: "bitTaken", name: "silver" });
  });
});

describe("admin group emit", () => {
  it("creates the group with its bit in one batch, trimmed and without leading zeros", () => {
    assert.deepEqual(adminGroupOps(null, { name: " bronze ", bitPosition: " 05 " }), [
      { op: "set_admin_group", value: "bronze" },
      { op: "set_admin_group_bit_position", value: "bronze,5" },
    ]);
  });

  it("an edit only replaces a changed bit", () => {
    assert.deepEqual(adminGroupOps(GOLD, adminGroupFields(GOLD)), []);
    assert.deepEqual(adminGroupOps(GOLD, { name: "gold", bitPosition: "07" }), []);
    assert.deepEqual(adminGroupOps(GOLD, { name: "renamed", bitPosition: "9" }), [
      { op: "set_admin_group_bit_position", value: "gold,9" },
    ]);
  });

  it("a group delete drops every interface reference in the same batch", () => {
    assert.deepEqual(teDeleteOps.adminGroup("silver", [ETH0, ETH1]), [
      { op: "delete_interface_admin_group", value: "eth1,silver" },
      { op: "delete_admin_group", value: "silver" },
    ]);
    assert.deepEqual(teDeleteOps.adminGroup("gold", [ETH0, ETH1]), [
      { op: "delete_interface_admin_group", value: "eth0,gold" },
      { op: "delete_interface_admin_group", value: "eth1,gold" },
      { op: "delete_admin_group", value: "gold" },
    ]);
  });
});

describe("interface save check", () => {
  it("rejects an empty or configured interface and out-of-range numbers", () => {
    const check = (fields: TeInterfaceFields, original: TeInterface | null = null) =>
      teInterfaceProblem(fields, original, [ETH0, ETH1], CAPS);
    assert.deepEqual(check(iface({ name: " " })), { key: "interfaceRequired" });
    assert.deepEqual(check(iface({ name: "eth0" })), { key: "interfaceExists", name: "eth0" });
    assert.deepEqual(check(iface({ name: "eth2", metric: "0" })), {
      key: "range",
      field: "metric",
      min: 1,
      max: 4294967295,
    });
    assert.deepEqual(check(iface({ name: "eth2", max_bandwidth: "4294967296" })), {
      key: "range",
      field: "max_bandwidth",
      min: 1,
      max: 4294967295,
    });
    assert.deepEqual(check(iface({ name: "eth2", max_reservable_bandwidth: "-1" })), {
      key: "numberInvalid",
      field: "max_reservable_bandwidth",
    });
    assert.equal(check(iface({ name: "eth2", metric: " 4294967295 " })), null);
    assert.equal(check(iface({}, ETH0), ETH0), null);
  });
});

describe("interface emit", () => {
  it("creates the bare node, then each group and number", () => {
    assert.deepEqual(teInterfaceOps(null, iface({ name: " eth2 " })), [{ op: "set_interface", value: "eth2" }]);
    assert.deepEqual(
      teInterfaceOps(
        null,
        iface({ name: "eth2", adminGroups: ["gold", " silver ", "gold", ""], max_bandwidth: " 0100 ", metric: "5" }),
      ),
      [
        { op: "set_interface", value: "eth2" },
        { op: "set_interface_admin_group", value: "eth2,gold" },
        { op: "set_interface_admin_group", value: "eth2,silver" },
        { op: "set_interface_max_bandwidth", value: "eth2,100" },
        { op: "set_interface_metric", value: "eth2,5" },
      ],
    );
  });

  it("an unchanged edit sends nothing", () => {
    assert.deepEqual(teInterfaceOps(ETH0, teInterfaceFields(ETH0)), []);
    assert.deepEqual(teInterfaceOps(ETH0, iface({ metric: " 010 " }, ETH0)), []);
  });

  it("an edit diffs groups by value and sets or deletes each number", () => {
    assert.deepEqual(
      teInterfaceOps(
        ETH0,
        iface({ adminGroups: ["silver"], max_bandwidth: "2000", max_reservable_bandwidth: "", metric: " " }, ETH0),
      ),
      [
        { op: "delete_interface_admin_group", value: "eth0,gold" },
        { op: "set_interface_admin_group", value: "eth0,silver" },
        { op: "set_interface_max_bandwidth", value: "eth0,2000" },
        { op: "delete_interface_max_reservable_bandwidth", value: "eth0" },
        { op: "delete_interface_metric", value: "eth0" },
      ],
    );
    assert.deepEqual(teInterfaceOps(ETH1, iface({ adminGroups: [] }, ETH1)), [
      { op: "delete_interface_admin_group", value: "eth1,gold" },
      { op: "delete_interface_admin_group", value: "eth1,silver" },
    ]);
  });

  it("deletes one interface or the whole tree", () => {
    assert.deepEqual(teDeleteOps.interface("eth0"), [{ op: "delete_interface", value: "eth0" }]);
    assert.deepEqual(teDeleteOps.all(), [{ op: "delete_traffic_engineering" }]);
  });
});

describe("service", () => {
  it("each save method posts the save-ops batch", async () => {
    const sent: TeBatchOperation[][] = [];
    const service = Object.create(trafficEngineeringService) as typeof trafficEngineeringService;
    service.batchConfigure = async (ops: TeBatchOperation[]) => {
      sent.push(ops);
      return { success: true, data: null };
    };
    await service.createAdminGroup({ name: "bronze", bitPosition: "3" });
    await service.updateAdminGroup(GOLD, { name: "gold", bitPosition: "8" });
    await service.deleteAdminGroup("gold", [ETH0]);
    await service.createInterface(iface({ name: "eth2" }));
    await service.updateInterface(ETH0, iface({ metric: "" }, ETH0));
    await service.deleteInterface("eth0");
    await service.deleteTrafficEngineering();
    assert.deepEqual(sent, [
      [
        { op: "set_admin_group", value: "bronze" },
        { op: "set_admin_group_bit_position", value: "bronze,3" },
      ],
      [{ op: "set_admin_group_bit_position", value: "gold,8" }],
      [
        { op: "delete_interface_admin_group", value: "eth0,gold" },
        { op: "delete_admin_group", value: "gold" },
      ],
      [{ op: "set_interface", value: "eth2" }],
      [{ op: "delete_interface_metric", value: "eth0" }],
      [{ op: "delete_interface", value: "eth0" }],
      [{ op: "delete_traffic_engineering" }],
    ]);
  });

  it("batchConfigure throws the device error on success:false and skips an empty batch", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    let error: string | null = "Commit failed";
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await trafficEngineeringService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      const ops = [{ op: "delete_traffic_engineering" }];
      await assert.rejects(trafficEngineeringService.batchConfigure(ops), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/traffic-engineering/batch", { operations: ops }]]);
      error = null;
      await assert.rejects(trafficEngineeringService.batchConfigure(ops), { message: "" });
    } finally {
      apiClient.post = original;
    }
  });
});
