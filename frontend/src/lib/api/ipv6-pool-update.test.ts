/**
 * Editing a PPPoE or IPoE client IPv6 pool is one batch with only the
 * changed prefixes/delegates, never a delete commit plus a recreate commit.
 * Run: npx tsx --test src/lib/api/ipv6-pool-update.test.ts
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
  name: "v6",
  prefixes: [
    { prefix: "2001:db8::/48", mask: "64" },
    { prefix: "2001:db9::/48", mask: "64" },
  ],
  delegates: [{ prefix: "2001:dba::/48", delegation_prefix: "56" }],
};

for (const [label, service, endpoint] of [
  ["PPPoE", pppoeServerService, "/vyos/pppoe-server/batch"],
  ["IPoE", ipoeServerService, "/vyos/ipoe-server/batch"],
] as const) {
  describe(`${label} updateIPv6Pool`, () => {
    const batches = () => calls.filter((c) => c.endpoint === endpoint);
    const body = () => batches()[0].body as { item_name: string; operations: unknown[] };

    it("replaces a changed mask and drops a removed prefix in one batch", async () => {
      await service.updateIPv6Pool(
        current,
        [{ prefix: "2001:db8::/48", mask: "56" }],
        [{ prefix: "2001:dba::/48", delegation_prefix: "56" }],
      );
      assert.equal(batches().length, 1);
      assert.equal(body().item_name, "v6");
      assert.deepEqual(body().operations, [
        { op: "delete_ipv6_pool_prefix", value: "2001:db8::/48" },
        { op: "delete_ipv6_pool_prefix", value: "2001:db9::/48" },
        { op: "set_ipv6_pool_prefix", value: "2001:db8::/48|56" },
      ]);
    });

    it("adds a delegate without touching the prefixes", async () => {
      await service.updateIPv6Pool(current, current.prefixes, [
        ...current.delegates,
        { prefix: "2001:dbb::/48", delegation_prefix: "60" },
      ]);
      assert.deepEqual(body().operations, [
        { op: "set_ipv6_pool_delegate", value: "2001:dbb::/48|60" },
      ]);
    });

    it("does not touch the router when nothing changed", async () => {
      const result = await service.updateIPv6Pool(current, current.prefixes, current.delegates);
      assert.equal(result.success, true);
      assert.equal(calls.length, 0);
    });
  });
}
