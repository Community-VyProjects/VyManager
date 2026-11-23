import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLOWTABLE_DESCRIPTION_MAX,
  flowtableDraft,
  flowtableProblem,
  flowtableSaveOps,
} from "./firewall-flowtables-save-ops";
import {
  flowtablesService,
  type Flowtable,
  type FlowtableBatchRequest,
  type VyOSResponse,
} from "./firewall-flowtables";
import { apiClient } from "./client";

const FT: Flowtable = {
  name: "FT1",
  description: "LAN",
  interfaces: ["eth0", "eth1"],
  offload: "hardware",
};

describe("flowtableSaveOps", () => {
  it("creates every set leaf after the flowtable node", () => {
    const draft = { name: " FT2 ", description: " edge ", interfaces: ["eth0", " eth2 "], offload: "software" };
    assert.deepEqual(flowtableSaveOps(null, draft), [
      { op: "set_flowtable" },
      { op: "set_flowtable_description", value: "edge" },
      { op: "set_flowtable_interface", value: "eth0" },
      { op: "set_flowtable_interface", value: "eth2" },
      { op: "set_flowtable_offload", value: "software" },
    ]);
  });

  it("leaves an unset offload and blank description out of a create", () => {
    const draft = { name: "FT2", description: "  ", interfaces: ["eth0"], offload: "" };
    assert.deepEqual(flowtableSaveOps(null, draft), [
      { op: "set_flowtable" },
      { op: "set_flowtable_interface", value: "eth0" },
    ]);
  });

  it("emits nothing for an untouched edit, including an unset offload", () => {
    assert.deepEqual(flowtableSaveOps(FT, flowtableDraft(FT)), []);
    const bare: Flowtable = { name: "FT3", description: null, interfaces: ["eth0"], offload: null };
    assert.deepEqual(flowtableSaveOps(bare, flowtableDraft(bare)), []);
  });

  it("diffs interfaces and changes single leaves with a set", () => {
    const draft = { ...flowtableDraft(FT), description: "WAN", interfaces: ["eth1", "eth2"], offload: "software" };
    assert.deepEqual(flowtableSaveOps(FT, draft), [
      { op: "set_flowtable_description", value: "WAN" },
      { op: "delete_flowtable_interface", value: "eth0" },
      { op: "set_flowtable_interface", value: "eth2" },
      { op: "set_flowtable_offload", value: "software" },
    ]);
  });

  it("deletes cleared description and offload", () => {
    const draft = { ...flowtableDraft(FT), description: " ", offload: "" };
    assert.deepEqual(flowtableSaveOps(FT, draft), [
      { op: "delete_flowtable_description" },
      { op: "delete_flowtable_offload" },
    ]);
  });

  it("treats padded and duplicate interfaces as the loaded ones", () => {
    const draft = { ...flowtableDraft(FT), interfaces: [" eth0", "eth1 ", "eth1"] };
    assert.deepEqual(flowtableSaveOps(FT, draft), []);
  });
});

describe("flowtableProblem", () => {
  const draft = (patch: Partial<ReturnType<typeof flowtableDraft>>) => ({
    ...flowtableDraft(null),
    name: "FT2",
    interfaces: ["eth0"],
    ...patch,
  });

  it("accepts the lab name syntax", () => {
    for (const name of ["FT2", "1ft", "ft.lan", "ft_lan-2", " FT2 "]) {
      assert.equal(flowtableProblem(null, draft({ name }), ["FT1"]), null, name);
    }
  });

  it("rejects names the lab rejects", () => {
    assert.equal(flowtableProblem(null, draft({ name: "  " }), []), "nameRequired");
    for (const name of ["-ft", ".ft", "f t", "ft/1", "ft:1"]) {
      assert.equal(flowtableProblem(null, draft({ name }), []), "nameInvalid", name);
    }
  });

  it("rejects an existing name on create only, case-sensitively", () => {
    assert.equal(flowtableProblem(null, draft({ name: " FT1 " }), ["FT1"]), "nameExists");
    assert.equal(flowtableProblem(null, draft({ name: "ft1" }), ["FT1"]), null);
    assert.equal(flowtableProblem(FT, flowtableDraft(FT), ["FT1"]), null);
  });

  it("requires an interface after trimming", () => {
    assert.equal(flowtableProblem(null, draft({ interfaces: [" "] }), []), "interfaceRequired");
    assert.equal(flowtableProblem(FT, { ...flowtableDraft(FT), interfaces: [] }, []), "interfaceRequired");
  });

  it("bounds the description at the lab limit", () => {
    const ok = "x".repeat(FLOWTABLE_DESCRIPTION_MAX);
    assert.equal(flowtableProblem(null, draft({ description: ok }), []), null);
    assert.equal(flowtableProblem(null, draft({ description: ok + "x" }), []), "descriptionTooLong");
  });
});

describe("flowtablesService", () => {
  function stub(result: VyOSResponse) {
    const sent: FlowtableBatchRequest[] = [];
    const service = Object.create(flowtablesService) as typeof flowtablesService;
    service.batchConfigure = async (request: FlowtableBatchRequest) => {
      sent.push(request);
      return result;
    };
    return { service, sent };
  }

  it("saves a new flowtable under the trimmed name", async () => {
    const { service, sent } = stub({ success: true });
    await service.saveFlowtable(null, { name: " FT2 ", description: "", interfaces: ["eth0"], offload: "" });
    assert.deepEqual(sent, [{
      flowtable_name: "FT2",
      operations: [{ op: "set_flowtable" }, { op: "set_flowtable_interface", value: "eth0" }],
    }]);
  });

  it("saves an edit under the loaded name", async () => {
    const { service, sent } = stub({ success: true });
    await service.saveFlowtable(FT, { ...flowtableDraft(FT), offload: "" });
    assert.deepEqual(sent, [{ flowtable_name: "FT1", operations: [{ op: "delete_flowtable_offload" }] }]);
  });

  it("deletes through the batch delete_flowtable op", async () => {
    const { service, sent } = stub({ success: true });
    await service.deleteFlowtable("FT1");
    assert.deepEqual(sent, [{ flowtable_name: "FT1", operations: [{ op: "delete_flowtable" }] }]);
  });

  it("throws an ApiError with the device detail on a rejected commit", async () => {
    const post = apiClient.post;
    const calls: unknown[] = [];
    apiClient.post = (async (endpoint: string, body: unknown) => {
      calls.push([endpoint, body]);
      return { success: false, data: null, error: "Commit failed\nverify" };
    }) as typeof apiClient.post;
    try {
      await assert.rejects(flowtablesService.deleteFlowtable("FT1"), { message: "Commit failed\nverify" });
      apiClient.post = (async () => ({ success: false, error: null })) as typeof apiClient.post;
      await assert.rejects(flowtablesService.deleteFlowtable("FT1"), { message: "" });
    } finally {
      apiClient.post = post;
    }
    assert.deepEqual(calls, [[
      "/vyos/firewall/flowtables/batch",
      { flowtable_name: "FT1", operations: [{ op: "delete_flowtable" }] },
    ]]);
  });

  it("skips the POST for an empty batch", async () => {
    const result = await flowtablesService.batchConfigure({ flowtable_name: "FT1", operations: [] });
    assert.equal(result.success, true);
  });
});
