import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRpkiCacheAddress,
  rpkiCacheFields,
  rpkiCacheOps,
  rpkiCacheProblem,
  rpkiDeleteOps,
  rpkiTimerFields,
  rpkiTimerOps,
  rpkiTimerProblem,
  type RpkiCacheFields,
} from "./rpki-save-ops";
import {
  rpkiService,
  type RpkiBatchOperation,
  type RpkiCacheServer,
  type RpkiCapabilities,
  type RpkiConfig,
} from "./rpki";
import { apiClient } from "./client";

function caps(sourceAddress: boolean): RpkiCapabilities {
  const flag = { supported: true, description: "" };
  return {
    version: sourceAddress ? "1.5" : "1.4",
    features: {
      cache_servers: flag,
      expire_interval: flag,
      polling_period: flag,
      retry_interval: flag,
      cache_source_address: { supported: sourceAddress, description: "" },
      ssh_transport: flag,
    },
    ranges: {
      expire_interval: { min: 600, max: 172800 },
      polling_period: { min: 1, max: 86400 },
      retry_interval: { min: 1, max: 7200 },
      port: { min: 1, max: 65535 },
      preference: { min: 1, max: 255 },
    },
    defaults: { expire_interval: 7200, polling_period: 300, retry_interval: 600 },
  };
}

const V15 = caps(true);
const V14 = caps(false);

const PLAIN: RpkiCacheServer = {
  address: "192.0.2.1",
  port: 3323,
  preference: 10,
  source_address: null,
  ssh: null,
};

const SSH: RpkiCacheServer = {
  address: "192.0.2.2",
  port: 22,
  preference: 20,
  source_address: "192.0.2.100",
  ssh: { key: "rpki-key", username: "rpki" },
};

function fields(patch: Partial<RpkiCacheFields> = {}, from: RpkiCacheServer | null = null): RpkiCacheFields {
  return { ...rpkiCacheFields(from), ...patch };
}

function config(patch: Partial<RpkiConfig> = {}): RpkiConfig {
  return {
    configured: true,
    cache_servers: [PLAIN, SSH],
    expire_interval: 7200,
    polling_period: null,
    retry_interval: 600,
    ...patch,
  };
}

describe("rpkiCacheOps", () => {
  it("creates a cache with the trimmed leaves in one batch", () => {
    const ops = rpkiCacheOps(
      null,
      fields({
        address: " 198.51.100.1 ",
        port: " 3323 ",
        preference: "5 ",
        sourceAddress: " 192.0.2.9",
        sshEnabled: true,
        sshKey: " rpki-key ",
        sshUsername: " rpki ",
      }),
      V15,
    );
    assert.deepEqual(ops, [
      { op: "set_cache", value: "198.51.100.1" },
      { op: "set_cache_port", value: "198.51.100.1,3323" },
      { op: "set_cache_preference", value: "198.51.100.1,5" },
      { op: "set_cache_source_address", value: "198.51.100.1,192.0.2.9" },
      { op: "set_cache_ssh_key", value: "198.51.100.1,rpki-key" },
      { op: "set_cache_ssh_username", value: "198.51.100.1,rpki" },
    ]);
  });

  it("never emits source-address on a device without the leaf", () => {
    const ops = rpkiCacheOps(null, fields({ address: "rpki.example.com", port: "3323", preference: "1", sourceAddress: "192.0.2.9" }), V14);
    assert.deepEqual(ops, [
      { op: "set_cache", value: "rpki.example.com" },
      { op: "set_cache_port", value: "rpki.example.com,3323" },
      { op: "set_cache_preference", value: "rpki.example.com,1" },
    ]);
    assert.deepEqual(rpkiCacheOps(SSH, fields({ sourceAddress: "" }, SSH), V14), []);
  });

  it("an unchanged edit sends nothing", () => {
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({}, PLAIN), V15), []);
    assert.deepEqual(rpkiCacheOps(SSH, fields({ sshKey: " rpki-key", port: "22 " }, SSH), V15), []);
  });

  it("replaces port and preference with a set and never deletes them alone", () => {
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({ port: "8282", preference: "11" }, PLAIN), V15), [
      { op: "set_cache_port", value: "192.0.2.1,8282" },
      { op: "set_cache_preference", value: "192.0.2.1,11" },
    ]);
    // A cleared required leaf is refused by the save check; the emit never deletes it.
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({ port: "" }, PLAIN), V15), []);
  });

  it("sets and clears the optional source-address", () => {
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({ sourceAddress: "192.0.2.5" }, PLAIN), V15), [
      { op: "set_cache_source_address", value: "192.0.2.1,192.0.2.5" },
    ]);
    assert.deepEqual(rpkiCacheOps(SSH, fields({ sourceAddress: " " }, SSH), V15), [
      { op: "delete_cache_source_address", value: "192.0.2.2" },
    ]);
  });

  it("turning SSH on sets both leaves and deletes nothing", () => {
    assert.deepEqual(
      rpkiCacheOps(PLAIN, fields({ sshEnabled: true, sshKey: "k1", sshUsername: "u1" }, PLAIN), V15),
      [
        { op: "set_cache_ssh_key", value: "192.0.2.1,k1" },
        { op: "set_cache_ssh_username", value: "192.0.2.1,u1" },
      ],
    );
  });

  it("turning SSH off deletes the ssh node, and a changed key is a set", () => {
    assert.deepEqual(rpkiCacheOps(SSH, fields({ sshEnabled: false }, SSH), V15), [
      { op: "delete_cache_ssh", value: "192.0.2.2" },
    ]);
    assert.deepEqual(rpkiCacheOps(SSH, fields({ sshKey: "other" }, SSH), V15), [
      { op: "set_cache_ssh_key", value: "192.0.2.2,other" },
    ]);
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({ sshEnabled: false, sshKey: "x" }, PLAIN), V15), []);
  });

  it("an edit keeps the loaded address even if the field changed", () => {
    assert.deepEqual(rpkiCacheOps(PLAIN, fields({ address: "203.0.113.1", port: "1" }, PLAIN), V15), [
      { op: "set_cache_port", value: "192.0.2.1,1" },
    ]);
  });
});

describe("rpkiCacheProblem", () => {
  const servers = [PLAIN, SSH];
  const ok = fields({ address: "198.51.100.1", port: "3323", preference: "5" });

  it("passes a complete cache", () => {
    assert.equal(rpkiCacheProblem(ok, null, servers, V15), null);
    assert.equal(rpkiCacheProblem(fields({}, PLAIN), PLAIN, servers, V15), null);
  });

  it("requires an address the lab takes", () => {
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, address: " " }), null, servers, V15), { key: "addressRequired" });
    for (const address of ["a,b", "rpki_cache", "-rpki", "fe80::1%eth0", "::ffff:192.0.2.1", "192.0.2.0/24"]) {
      assert.deepEqual(rpkiCacheProblem(fields({ ...ok, address }), null, servers, V15), { key: "addressInvalid" }, address);
    }
    for (const address of ["2001:db8::1", "rpki.example.com", "192.0.2.77"]) {
      assert.equal(isRpkiCacheAddress(address), true, address);
    }
  });

  it("rejects a create for a configured address", () => {
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, address: " 192.0.2.1 " }), null, servers, V15), {
      key: "addressExists",
      name: "192.0.2.1",
    });
  });

  it("requires port and preference, inside the served ranges", () => {
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, port: "" }), null, servers, V15), { key: "portRequired" });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, preference: "" }), null, servers, V15), { key: "preferenceRequired" });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, port: "65536" }), null, servers, V15), {
      key: "range", field: "port", min: 1, max: 65535,
    });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, preference: "0" }), null, servers, V15), {
      key: "range", field: "preference", min: 1, max: 255,
    });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, port: "1.5" }), null, servers, V15), {
      key: "numberInvalid", field: "port",
    });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, preference: "-1" }), null, servers, null), {
      key: "numberInvalid", field: "preference",
    });
  });

  it("rejects a preference another cache already uses", () => {
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, preference: "20" }), null, servers, V15), {
      key: "preferenceTaken",
      name: "192.0.2.2",
    });
    // Keeping its own preference on edit is fine.
    assert.equal(rpkiCacheProblem(fields({ preference: " 10" }, PLAIN), PLAIN, servers, V15), null);
  });

  it("checks source-address only where the leaf exists", () => {
    const bad = fields({ ...ok, sourceAddress: "192.0.2.010" });
    assert.deepEqual(rpkiCacheProblem(bad, null, servers, V15), { key: "sourceAddressInvalid" });
    assert.equal(rpkiCacheProblem(bad, null, servers, V14), null);
  });

  it("needs both an SSH key and a username", () => {
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, sshEnabled: true, sshKey: "k" }), null, servers, V15), {
      key: "sshIncomplete",
    });
    assert.deepEqual(rpkiCacheProblem(fields({ ...ok, sshEnabled: true, sshUsername: "u" }), null, servers, V15), {
      key: "sshIncomplete",
    });
    assert.deepEqual(
      rpkiCacheProblem(fields({ ...ok, sshEnabled: true, sshKey: "k", sshUsername: "é" }), null, servers, V15),
      { key: "usernameInvalid" },
    );
    assert.equal(rpkiCacheProblem(fields({ ...ok, sshEnabled: true, sshKey: "k", sshUsername: "u" }), null, servers, V15), null);
  });
});

describe("timers", () => {
  it("sets a changed timer and deletes a cleared one", () => {
    const loaded = config();
    assert.deepEqual(rpkiTimerOps(loaded, rpkiTimerFields(loaded)), []);
    assert.deepEqual(
      rpkiTimerOps(loaded, { expire_interval: " 900 ", polling_period: "60", retry_interval: "" }),
      [
        { op: "set_expire_interval", value: "900" },
        { op: "set_polling_period", value: "60" },
        { op: "delete_retry_interval" },
      ],
    );
  });

  it("checks each timer against its served range", () => {
    assert.equal(rpkiTimerProblem({ expire_interval: "600", polling_period: "", retry_interval: "7200" }, V15), null);
    assert.deepEqual(rpkiTimerProblem({ expire_interval: "599", polling_period: "", retry_interval: "" }, V15), {
      key: "range", field: "expire_interval", min: 600, max: 172800,
    });
    assert.deepEqual(rpkiTimerProblem({ expire_interval: "", polling_period: "", retry_interval: "x" }, V15), {
      key: "numberInvalid", field: "retry_interval",
    });
    assert.deepEqual(rpkiTimerProblem({ expire_interval: "", polling_period: "99999", retry_interval: "" }, V15), {
      key: "range", field: "polling_period", min: 1, max: 86400,
    });
  });
});

describe("delete ops", () => {
  it("names one cache, or the whole tree", () => {
    assert.deepEqual(rpkiDeleteOps.cache("192.0.2.1"), [{ op: "delete_cache", value: "192.0.2.1" }]);
    assert.deepEqual(rpkiDeleteOps.all(), [{ op: "delete_rpki" }]);
  });
});

describe("service", () => {
  function stub() {
    const sent: RpkiBatchOperation[][] = [];
    const service = Object.create(rpkiService) as typeof rpkiService;
    service.batchConfigure = async (ops: RpkiBatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("an unchanged form sends nothing", async () => {
    const { service, sent } = stub();
    await service.updateCacheServer(SSH, fields({ sshUsername: " rpki " }, SSH), V15);
    await service.updateGlobalSettings(config(), rpkiTimerFields(config()));
    assert.deepEqual(sent, []);
  });

  it("sends each save as one batch", async () => {
    const { service, sent } = stub();
    await service.createCacheServer(fields({ address: "rpki.example.com", port: "323", preference: "3" }), V14);
    await service.updateCacheServer(SSH, fields({ sshEnabled: false, sourceAddress: "" }, SSH), V15);
    await service.updateGlobalSettings(config(), { expire_interval: "", polling_period: "300", retry_interval: "600" });
    await service.deleteCacheServer("192.0.2.1");
    await service.deleteRpki();
    assert.deepEqual(sent, [
      [
        { op: "set_cache", value: "rpki.example.com" },
        { op: "set_cache_port", value: "rpki.example.com,323" },
        { op: "set_cache_preference", value: "rpki.example.com,3" },
      ],
      [
        { op: "delete_cache_source_address", value: "192.0.2.2" },
        { op: "delete_cache_ssh", value: "192.0.2.2" },
      ],
      [{ op: "delete_expire_interval" }, { op: "set_polling_period", value: "300" }],
      [{ op: "delete_cache", value: "192.0.2.1" }],
      [{ op: "delete_rpki" }],
    ]);
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
      assert.deepEqual(await rpkiService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(rpkiService.batchConfigure([{ op: "delete_rpki" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/rpki/batch", { operations: [{ op: "delete_rpki" }] }]]);
      error = null;
      await assert.rejects(rpkiService.batchConfigure([{ op: "delete_rpki" }]), { message: "" });
    } finally {
      apiClient.post = original;
    }
  });
});
