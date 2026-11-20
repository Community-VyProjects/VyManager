/**
 * Editing a PPPoE / IPoE RADIUS server is one batch with only the changed
 * fields; an empty key keeps the stored one.
 * Run: npx tsx --test src/lib/api/radius-server-update.test.ts
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiClient } from "./client";
import { ipoeServerService } from "./ipoe-server";
import { pppoeServerService } from "./pppoe-server";

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
  key: "stored-secret",
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

for (const [name, service, endpoint] of [
  ["PPPoE", pppoeServerService, "/vyos/pppoe-server/batch"],
  ["IPoE", ipoeServerService, "/vyos/ipoe-server/batch"],
] as const) {
  describe(`${name} updateRadiusServer`, () => {
    it("sends only the changed field and keeps the key when left blank", async () => {
      await service.updateRadiusServer(current, { ...unchanged, port: "1645" });
      const batches = calls.filter((c) => c.endpoint === endpoint);
      assert.equal(batches.length, 1);
      assert.deepEqual(batches[0].body, {
        item_name: "10.0.0.5",
        operations: [{ op: "set_radius_server_port", value: "1645" }],
      });
    });

    it("deletes cleared values and flags, sets a new key, in the same batch", async () => {
      await service.updateRadiusServer(current, {
        ...unchanged,
        key: "new-secret",
        priority: undefined,
        backup: false,
        disabled: true,
      });
      const batches = calls.filter((c) => c.endpoint === endpoint);
      assert.equal(batches.length, 1);
      assert.deepEqual((batches[0].body as { operations: unknown[] }).operations, [
        { op: "set_radius_server_key", value: "new-secret" },
        { op: "delete_radius_server_priority" },
        { op: "set_radius_server_disable" },
        { op: "delete_radius_server_backup" },
      ]);
    });

    it("does not touch the router when nothing changed", async () => {
      const result = await service.updateRadiusServer(current, unchanged);
      assert.equal(result.success, true);
      assert.equal(calls.length, 0);
    });
  });
}
