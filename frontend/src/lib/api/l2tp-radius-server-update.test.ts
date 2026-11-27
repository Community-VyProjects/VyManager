/**
 * Editing an L2TP RADIUS server is one batch: only the changed fields, an
 * empty key keeps the stored one, and a new address swaps servers atomically.
 * Run: npx tsx --test src/lib/api/l2tp-radius-server-update.test.ts
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiClient } from "./client";
import { l2tpService } from "./l2tp";

type Call = { endpoint: string; body: unknown };
let calls: Call[] = [];
const originalPost = apiClient.post.bind(apiClient);

beforeEach(() => {
  calls = [];
  apiClient.post = (async (endpoint: string, body?: unknown) => {
    calls.push({ endpoint, body });
    return { success: true };
  }) as typeof apiClient.post;
});

afterEach(() => {
  apiClient.post = originalPost;
});

const current = {
  address: "10.0.0.5",
  key: "***",
  port: "1812",
  acct_port: "1813",
  priority: "5",
  fail_time: null,
  disabled: false,
  backup: true,
  disable_accounting: false,
};

const unchanged = {
  port: "1812",
  acct_port: "1813",
  priority: "5",
  disabled: false,
  backup: true,
  disable_accounting: false,
};

const batches = () => calls.filter((c) => c.endpoint === "/vyos/vpn/l2tp/batch");
const ops = () => (batches()[0].body as { operations: unknown[] }).operations;

describe("L2TP updateRadiusServer", () => {
  it("sends only the changed field and keeps the key when left blank", async () => {
    await l2tpService.updateRadiusServer(current, "10.0.0.5", { ...unchanged, port: "1645" });
    assert.equal(batches().length, 1);
    assert.deepEqual(ops(), [{ op: "set_radius_server_port", value: "10.0.0.5|1645" }]);
  });

  it("deletes cleared values and flags in the same batch", async () => {
    await l2tpService.updateRadiusServer(current, "10.0.0.5", {
      ...unchanged,
      priority: undefined,
      backup: false,
    });
    assert.deepEqual(ops(), [
      { op: "delete_radius_server_priority", value: "10.0.0.5" },
      { op: "delete_radius_server_backup", value: "10.0.0.5" },
    ]);
  });

  it("creates the new address and deletes the old one in one batch", async () => {
    await l2tpService.updateRadiusServer(current, "10.0.0.6", { ...unchanged, key: "secret" });
    assert.equal(batches().length, 1);
    const sent = ops() as { op: string; value: string }[];
    assert.deepEqual(sent[0], { op: "create_radius_server", value: "10.0.0.6" });
    assert.deepEqual(sent[1], { op: "set_radius_server_key", value: "10.0.0.6|secret" });
    assert.deepEqual(sent[sent.length - 1], { op: "delete_radius_server", value: "10.0.0.5" });
  });

  it("does not touch the router when nothing changed", async () => {
    const result = await l2tpService.updateRadiusServer(current, "10.0.0.5", unchanged);
    assert.equal(result.success, true);
    assert.equal(calls.length, 0);
  });
});
