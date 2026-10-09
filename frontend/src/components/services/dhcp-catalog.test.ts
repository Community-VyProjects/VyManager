import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DhcpCatalogLeaf } from "@/lib/api/dhcp";
import { catalogCreateOps, catalogDraftFrom, catalogOps, editMultiRow } from "./dhcp-catalog";

const leaves: DhcpCatalogLeaf[] = [
  {
    token: "ignore-client-id",
    kind: "flag",
    label: "Ignore client ID",
    help: "Ignore the client identifier",
    choices: [],
    group: "Subnet",
  },
  {
    token: "bootfile-size",
    kind: "text",
    label: "Bootfile size",
    help: "Size",
    choices: [],
    group: "Options",
  },
  {
    token: "pop-server",
    kind: "multi",
    label: "POP server",
    help: "POP",
    choices: [],
    group: "Options",
  },
  {
    token: "static-route",
    kind: "route",
    label: "Static route",
    help: "Route",
    choices: [],
    group: "Options",
  },
];

describe("catalogOps", () => {
  it("sets ignore-client-id when the operator turns it on", () => {
    const original = catalogDraftFrom(leaves, {});
    const draft = { ...original, "ignore-client-id": true };
    assert.deepEqual(
      catalogOps("set_subnet_catalog", "delete_subnet_catalog", leaves, original, draft),
      [{ op: "set_subnet_catalog", value: "ignore-client-id" }],
    );
  });

  it("deletes a cleared text leaf and keeps an unchanged one", () => {
    const original = catalogDraftFrom(leaves, { "bootfile-size": "4" });
    const draft = { ...original, "bootfile-size": "" };
    assert.deepEqual(
      catalogOps("set_subnet_catalog", "delete_subnet_catalog", leaves, original, draft),
      [{ op: "delete_subnet_catalog", value: "bootfile-size" }],
    );
  });

  it("diffs multi values and prefixes a range id", () => {
    const original = catalogDraftFrom(leaves, { "pop-server": ["192.0.2.1"] });
    const draft = { ...original, "pop-server": ["192.0.2.2"] };
    assert.deepEqual(
      catalogOps("set_range_catalog", "delete_range_catalog", leaves, original, draft, "0"),
      [
        { op: "delete_range_catalog", value: "0|pop-server|192.0.2.1" },
        { op: "set_range_catalog", value: "0|pop-server|192.0.2.2" },
      ],
    );
  });

  it("emits a static route as prefix and next hop", () => {
    const draft = catalogDraftFrom(leaves, {});
    draft["static-route"] = [{ prefix: "10.0.0.0/24", next_hop: "192.0.2.1" }];
    assert.deepEqual(catalogCreateOps("set_subnet_catalog", leaves, draft), [
      { op: "set_subnet_catalog", value: "static-route|10.0.0.0/24|192.0.2.1" },
    ]);
  });

  it("keeps a blank multi row so the operator can finish typing it", () => {
    assert.deepEqual(editMultiRow(["192.0.2.1", "192.0.2.2"], 1, ""), ["192.0.2.1", ""]);
    assert.deepEqual(editMultiRow(["192.0.2.1", ""], 0, "192.0.2.9"), ["192.0.2.9", ""]);
  });
});
