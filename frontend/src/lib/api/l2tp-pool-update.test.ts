/**
 * Editing an L2TP client pool is one batch with only the changed fields,
 * never a delete commit followed by a recreate commit.
 * Run: npx tsx --test src/lib/api/l2tp-pool-update.test.ts
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

const batches = () => calls.filter((c) => c.endpoint === "/vyos/vpn/l2tp/batch");
const body = () => batches()[0].body as { item_name: string; operations: unknown[] };

describe("L2TP updateIPPool", () => {
  const current = { name: "p1", range: "10.0.0.2-10.0.0.100", next_pool: null };

  it("replaces a changed range in one batch", async () => {
    await l2tpService.updateIPPool(current, { range: "10.0.0.2-10.0.0.50" });
    assert.equal(batches().length, 1);
    assert.equal(body().item_name, "p1");
    assert.deepEqual(body().operations, [
      { op: "delete_client_ip_pool_range" },
      { op: "set_client_ip_pool_range", value: "10.0.0.2-10.0.0.50" },
    ]);
  });

  it("sets a new next-pool and deletes a cleared range", async () => {
    await l2tpService.updateIPPool(current, { next_pool: "p2" });
    assert.deepEqual(body().operations, [
      { op: "delete_client_ip_pool_range" },
      { op: "set_client_ip_pool_next_pool", value: "p2" },
    ]);
  });

  it("does not touch the router when nothing changed", async () => {
    const result = await l2tpService.updateIPPool(current, { range: current.range });
    assert.equal(result.success, true);
    assert.equal(calls.length, 0);
  });
});

describe("L2TP updateIPv6Pool", () => {
  const current = {
    name: "v6",
    prefixes: [
      { prefix: "2001:db8::/48", mask: "64" },
      { prefix: "2001:db9::/48", mask: null },
    ],
    delegates: [{ prefix: "2001:dba::/48", delegation_prefix: "56" }],
  };

  it("deletes removed entries and re-sets changed masks in one batch", async () => {
    await l2tpService.updateIPv6Pool(current, {
      prefixes: [{ prefix: "2001:db8::/48", mask: "56" }],
      delegates: [{ prefix: "2001:dba::/48", delegation_prefix: "56" }],
    });
    assert.equal(batches().length, 1);
    assert.equal(body().item_name, "v6");
    assert.deepEqual(body().operations, [
      { op: "delete_client_ipv6_pool_prefix", value: "2001:db8::/48" },
      { op: "delete_client_ipv6_pool_prefix", value: "2001:db9::/48" },
      { op: "set_client_ipv6_pool_prefix", value: "2001:db8::/48" },
      { op: "set_client_ipv6_pool_prefix_mask", value: "2001:db8::/48|56" },
    ]);
  });

  it("adds a delegate without touching existing prefixes", async () => {
    await l2tpService.updateIPv6Pool(current, {
      prefixes: [{ prefix: "2001:db8::/48", mask: "64" }, { prefix: "2001:db9::/48" }],
      delegates: [
        { prefix: "2001:dba::/48", delegation_prefix: "56" },
        { prefix: "2001:dbb::/48" },
      ],
    });
    assert.deepEqual(body().operations, [
      { op: "set_client_ipv6_pool_delegate", value: "2001:dbb::/48" },
    ]);
  });

  it("does not touch the router when nothing changed", async () => {
    const result = await l2tpService.updateIPv6Pool(current, {
      prefixes: [{ prefix: "2001:db8::/48", mask: "64" }, { prefix: "2001:db9::/48" }],
      delegates: [{ prefix: "2001:dba::/48", delegation_prefix: "56" }],
    });
    assert.equal(result.success, true);
    assert.equal(calls.length, 0);
  });
});
