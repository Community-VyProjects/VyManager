/**
 * Changing the OpenFabric NET is one batch (delete old + set new), so a
 * failed commit can no longer leave the router without a NET.
 * Run: npx tsx --test src/lib/api/openfabric-net-update.test.ts
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiClient } from "./client";
import { openfabricService } from "./openfabric";

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

const OLD = "49.0001.1921.6800.1001.00";
const NEW = "49.0001.1921.6800.1002.00";
const ops = () => (calls[0].body as { operations: unknown[] }).operations;

describe("OpenFabric updateNet", () => {
  it("replaces the NET in a single batch", async () => {
    await openfabricService.updateNet(OLD, NEW);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].endpoint, "/vyos/openfabric/batch");
    assert.deepEqual(ops(), [
      { op: "delete_net", value: OLD },
      { op: "set_net", value: NEW },
    ]);
  });

  it("sets a first NET and clears an emptied one", async () => {
    await openfabricService.updateNet(null, NEW);
    await openfabricService.updateNet(OLD, "");
    assert.deepEqual(
      calls.map((c) => (c.body as { operations: unknown[] }).operations),
      [[{ op: "set_net", value: NEW }], [{ op: "delete_net", value: OLD }]],
    );
  });

  it("does not touch the router when unchanged", async () => {
    const result = await openfabricService.updateNet(OLD, OLD);
    assert.equal(result.success, true);
    assert.equal(calls.length, 0);
  });
});
