import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BROADCAST_RELAY_DESCRIPTION_MAX,
  broadcastRelayCreateOps,
  broadcastRelayProblem,
  broadcastRelayRanges,
  broadcastRelayUpdateOps,
  draftFromInstance,
  normalizeBroadcastRelayDraft,
  type BroadcastRelayDraft,
} from "./broadcast-relay-save-ops";
import { broadcastRelayService, type BatchOperation, type BroadcastRelayInstance } from "./broadcast-relay";
import { apiClient } from "./client";

const RANGES = { id: { min: 1, max: 99 }, port: { min: 1, max: 65535 } };

const STORED: BroadcastRelayInstance = {
  id: "5",
  address: "192.0.2.1",
  description: "wol",
  disabled: false,
  interfaces: ["eth0", "eth1"],
  port: 9,
};

function draft(patch: Partial<BroadcastRelayDraft> = {}): BroadcastRelayDraft {
  return { ...draftFromInstance(STORED), ...patch };
}

function edit(patch: Partial<BroadcastRelayDraft>): BatchOperation[] {
  return broadcastRelayUpdateOps(STORED, normalizeBroadcastRelayDraft(draft(patch)));
}

describe("ranges", () => {
  it("reads the id and port bounds from capabilities", () => {
    const caps = {
      features: {
        instance_id_range: { supported: true, description: "", min: 1, max: 99 },
        port: { supported: true, description: "", min: 1, max: 65535 },
      },
    } as unknown as Parameters<typeof broadcastRelayRanges>[0];
    assert.deepEqual(broadcastRelayRanges(caps), RANGES);
  });

  it("is null when capabilities lack a bound", () => {
    assert.equal(broadcastRelayRanges(null), null);
    const caps = {
      features: { instance_id_range: { min: 1, max: 99 }, port: { supported: true } },
    } as unknown as Parameters<typeof broadcastRelayRanges>[0];
    assert.equal(broadcastRelayRanges(caps), null);
  });
});

describe("create", () => {
  it("emits every set for a full instance", () => {
    const instance = normalizeBroadcastRelayDraft({
      id: " 7 ",
      port: " 67 ",
      interfaces: [" eth0 ", "eth1", "eth1"],
      address: " 10.0.0.1 ",
      description: " lab relay, west ",
      disabled: true,
    });
    assert.deepEqual(broadcastRelayCreateOps(instance), [
      { op: "set_instance", value: "7" },
      { op: "set_instance_port", value: "7,67" },
      { op: "set_instance_interface", value: "7,eth0" },
      { op: "set_instance_interface", value: "7,eth1" },
      { op: "set_instance_address", value: "7,10.0.0.1" },
      { op: "set_instance_description", value: "7,lab relay, west" },
      { op: "set_instance_disable", value: "7" },
    ]);
  });

  it("skips blank optional leaves", () => {
    const instance = normalizeBroadcastRelayDraft({
      id: "7",
      port: "67",
      interfaces: ["eth0", "eth1"],
      address: "  ",
      description: "",
      disabled: false,
    });
    assert.deepEqual(broadcastRelayCreateOps(instance), [
      { op: "set_instance", value: "7" },
      { op: "set_instance_port", value: "7,67" },
      { op: "set_instance_interface", value: "7,eth0" },
      { op: "set_instance_interface", value: "7,eth1" },
    ]);
  });
});

describe("update", () => {
  it("emits nothing for an untouched or padded-only edit", () => {
    assert.deepEqual(edit({}), []);
    assert.deepEqual(edit({ address: " 192.0.2.1 ", description: "wol ", port: " 9", interfaces: ["eth1", "eth0"] }), []);
  });

  it("changes a single-value leaf with one set and no delete", () => {
    assert.deepEqual(edit({ port: "137" }), [{ op: "set_instance_port", value: "5,137" }]);
    assert.deepEqual(edit({ address: "192.0.2.9" }), [{ op: "set_instance_address", value: "5,192.0.2.9" }]);
    assert.deepEqual(edit({ description: "new, text" }), [
      { op: "set_instance_description", value: "5,new, text" },
    ]);
  });

  it("deletes a cleared optional leaf by name only", () => {
    assert.deepEqual(edit({ address: " ", description: "" }), [
      { op: "delete_instance_address", value: "5" },
      { op: "delete_instance_description", value: "5" },
    ]);
  });

  it("diffs interfaces by name", () => {
    assert.deepEqual(edit({ interfaces: ["eth1", "eth2"] }), [
      { op: "delete_instance_interface", value: "5,eth0" },
      { op: "set_instance_interface", value: "5,eth2" },
    ]);
  });

  it("toggles the instance disable flag", () => {
    assert.deepEqual(edit({ disabled: true }), [{ op: "set_instance_disable", value: "5" }]);
    const disabled = { ...STORED, disabled: true };
    assert.deepEqual(
      broadcastRelayUpdateOps(disabled, normalizeBroadcastRelayDraft({ ...draftFromInstance(disabled), disabled: false })),
      [{ op: "delete_instance_disable", value: "5" }],
    );
  });

  it("sets a description that was absent on the device", () => {
    const bare = { ...STORED, description: null, address: null };
    assert.deepEqual(
      broadcastRelayUpdateOps(bare, normalizeBroadcastRelayDraft({ ...draftFromInstance(bare), description: "x" })),
      [{ op: "set_instance_description", value: "5,x" }],
    );
  });
});

describe("problem", () => {
  const key = (patch: Partial<BroadcastRelayDraft>, existing: string[] = []) =>
    broadcastRelayProblem(draft(patch), RANGES, existing)?.key ?? null;

  it("accepts a valid instance", () => {
    assert.equal(key({}), null);
    assert.equal(key({ address: "" }), null);
  });

  it("checks the id against the capability range and configured ids", () => {
    for (const id of ["", "0", "100", "1e1", "2.5", "-1", "abc"]) assert.equal(key({ id }), "idRange", id);
    assert.equal(key({ id: "99" }), null);
    assert.equal(key({ id: "5" }, ["5"]), "idExists");
    assert.equal(key({ id: " 05" }, ["5"]), "idExists");
    assert.deepEqual(broadcastRelayProblem(draft({ id: "0" }), RANGES)?.values, { min: 1, max: 99 });
  });

  it("requires a port in range", () => {
    for (const port of ["", "0", "65536", "1e2", "8.5"]) assert.equal(key({ port }), "portRange", port);
    assert.equal(key({ port: "65535" }), null);
  });

  it("requires two interfaces even when the instance is disabled", () => {
    assert.equal(key({ interfaces: ["eth0"] }), "interfacesRequired");
    assert.equal(key({ interfaces: ["eth0", " eth0 "], disabled: true }), "interfacesRequired");
    assert.equal(key({ interfaces: [] }), "interfacesRequired");
  });

  it("checks the source address the way the lab validator does", () => {
    for (const address of ["010.1.1.1", "1.2.3", "300.1.1.1", "2001:db8::1"]) {
      assert.equal(key({ address }), "addressInvalid", address);
    }
    assert.equal(key({ address: " 10.1.1.1 " }), null);
  });

  it("bounds the description length", () => {
    assert.equal(key({ description: "x".repeat(BROADCAST_RELAY_DESCRIPTION_MAX) }), null);
    assert.equal(key({ description: "x".repeat(BROADCAST_RELAY_DESCRIPTION_MAX + 1) }), "descriptionTooLong");
  });
});

type Post = (path: string, body?: unknown) => Promise<unknown>;

function stubPost(result: unknown): { calls: [string, unknown][]; restore: () => void } {
  const calls: [string, unknown][] = [];
  const client = apiClient as unknown as { post: Post };
  const original = client.post;
  client.post = async (path: string, body?: unknown) => {
    calls.push([path, body]);
    return result;
  };
  return { calls, restore: () => (client.post = original) };
}

describe("client", () => {
  it("posts the update ops and skips an empty batch", async () => {
    const stub = stubPost({ success: true });
    try {
      await broadcastRelayService.updateInstance(STORED, normalizeBroadcastRelayDraft(draft({ port: "10" })));
      assert.deepEqual(stub.calls, [
        ["/vyos/broadcast-relay/batch", { operations: [{ op: "set_instance_port", value: "5,10" }] }],
      ]);
      const result = await broadcastRelayService.updateInstance(STORED, normalizeBroadcastRelayDraft(draft()));
      assert.deepEqual(result, { success: true });
      assert.equal(stub.calls.length, 1);
    } finally {
      stub.restore();
    }
  });

  it("emits the service, global and instance ops", async () => {
    const stub = stubPost({ success: true });
    try {
      await broadcastRelayService.setGlobalDisable();
      await broadcastRelayService.deleteGlobalDisable();
      await broadcastRelayService.deleteService();
      await broadcastRelayService.deleteInstance("5");
      assert.deepEqual(
        stub.calls.map(([, body]) => (body as { operations: BatchOperation[] }).operations),
        [
          [{ op: "set_global_disable" }],
          [{ op: "delete_global_disable" }],
          [{ op: "delete_broadcast_relay" }],
          [{ op: "delete_instance", value: "5" }],
        ],
      );
    } finally {
      stub.restore();
    }
  });

  it("throws an ApiError with the device text on a rejected commit", async () => {
    const stub = stubPost({ success: false, error: "Commit failed" });
    try {
      await assert.rejects(broadcastRelayService.deleteService(), (err: unknown) => {
        assert.ok(!(err instanceof Error));
        assert.deepEqual(err, { message: "Commit failed" });
        return true;
      });
    } finally {
      stub.restore();
    }
    const empty = stubPost({ success: false, error: null });
    try {
      await assert.rejects(broadcastRelayService.deleteInstance("5"), (err: unknown) => {
        assert.deepEqual(err, { message: "" });
        return true;
      });
    } finally {
      empty.restore();
    }
  });
});
