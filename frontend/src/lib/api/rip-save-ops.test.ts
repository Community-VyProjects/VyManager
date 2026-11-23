import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASKED_SECRET,
  ripDistributeListGlobalOps,
  ripDistributeListInterfaceEmpty,
  ripDistributeListInterfaceOps,
  ripInterfaceOps,
  ripInterfaceProblem,
  ripNetworkDistanceOps,
  ripNextKeyId,
  ripRedistributeOps,
  ripSettingsOps,
  ripTimersOps,
} from "./rip-save-ops";
import { apiClient } from "./client";
import { ripService, type RipBatchOperation, type RipConfig, type RipInterface } from "./rip";

const CONFIG: RipConfig = {
  configured: true,
  default_distance: 120,
  default_information_originate: false,
  default_metric: null,
  route_map: "RM",
  version: "2",
  networks: [],
  neighbors: [],
  routes: [],
  passive_interfaces: [],
  distribute_list: { global_filters: {}, interface_filters: [] },
  interfaces: [],
  network_distances: [],
  redistribute: [],
  timers: { update: 30, timeout: 180, garbage_collection: null },
};

const SETTINGS = {
  version: "2",
  default_distance: "120",
  default_metric: "",
  route_map: "RM",
  default_information_originate: false,
  timers: { update: "30", timeout: "180", garbage_collection: "" },
};

function iface(over: Partial<RipInterface> = {}): RipInterface {
  return {
    name: "eth0",
    authentication_type: null,
    md5_keys: [],
    plaintext_password: null,
    send_version: null,
    receive_version: null,
    split_horizon: null,
    ...over,
  };
}

const MD5_STORED = iface({
  authentication_type: "md5",
  md5_keys: [
    { key_id: "1", password: MASKED_SECRET },
    { key_id: "2", password: MASKED_SECRET },
  ],
});

const PLAIN_STORED = iface({ authentication_type: "plaintext", plaintext_password: MASKED_SECRET });

describe("global settings and timers", () => {
  it("emits nothing for an untouched form", () => {
    assert.deepEqual(ripSettingsOps(CONFIG, SETTINGS), []);
  });

  it("sets changed leaves, deletes cleared ones and toggles originate in one batch", () => {
    assert.deepEqual(
      ripSettingsOps(CONFIG, {
        ...SETTINGS,
        version: "",
        default_distance: " 100 ",
        default_metric: "3",
        route_map: "",
        default_information_originate: true,
        timers: { update: "", timeout: "200", garbage_collection: "120" },
      }),
      [
        { op: "delete_version" },
        { op: "set_default_distance", value: "100" },
        { op: "set_default_metric", value: "3" },
        { op: "delete_route_map" },
        { op: "set_default_information_originate" },
        { op: "delete_timers_update" },
        { op: "set_timers_timeout", value: "200" },
        { op: "set_timers_garbage_collection", value: "120" },
      ],
    );
  });

  it("clearing every timer deletes the timers node", () => {
    assert.deepEqual(ripTimersOps(CONFIG.timers, { update: "", timeout: " ", garbage_collection: "" }), [
      { op: "delete_timers" },
    ]);
    assert.deepEqual(ripTimersOps({}, { update: "", timeout: "", garbage_collection: "" }), []);
  });

  it("turning originate off deletes it", () => {
    assert.deepEqual(
      ripSettingsOps({ ...CONFIG, default_information_originate: true }, SETTINGS),
      [{ op: "delete_default_information_originate" }],
    );
  });
});

describe("interface authentication", () => {
  it("creates an interface with trimmed md5 keys", () => {
    assert.deepEqual(
      ripInterfaceOps(null, iface({
        name: " eth0 ",
        authentication_type: "md5",
        md5_keys: [{ key_id: " 1 ", password: " K,1 " }, { key_id: "", password: "" }],
        send_version: "2",
        split_horizon: "poison-reverse",
      })),
      [
        { op: "set_interface", value: "eth0" },
        { op: "set_interface_authentication_md5_key", value: "eth0,1,K,1" },
        { op: "set_interface_send_version", value: "eth0,2" },
        { op: "set_interface_split_horizon_poison_reverse", value: "eth0" },
      ],
    );
  });

  it("keeps masked keys, deletes removed keys and sets new ones", () => {
    assert.deepEqual(
      ripInterfaceOps(MD5_STORED, iface({
        authentication_type: "md5",
        md5_keys: [
          { key_id: "1", password: MASKED_SECRET },
          { key_id: "3", password: "K3" },
        ],
      })),
      [
        { op: "delete_interface_authentication_md5", value: "eth0,2" },
        { op: "set_interface_authentication_md5_key", value: "eth0,3,K3" },
      ],
    );
  });

  it("replaces a stored key's password when the user types a new one", () => {
    assert.deepEqual(
      ripInterfaceOps(MD5_STORED, iface({ ...MD5_STORED, md5_keys: [MD5_STORED.md5_keys[0], { key_id: "2", password: "NEW" }] })),
      [{ op: "set_interface_authentication_md5_key", value: "eth0,2,NEW" }],
    );
  });

  it("emits nothing for an untouched masked interface", () => {
    assert.deepEqual(ripInterfaceOps(MD5_STORED, { ...MD5_STORED }), []);
    assert.deepEqual(ripInterfaceOps(PLAIN_STORED, { ...PLAIN_STORED }), []);
  });

  it("md5 to plaintext deletes every stored key in the same batch", () => {
    assert.deepEqual(
      ripInterfaceOps(MD5_STORED, iface({ authentication_type: "plaintext", plaintext_password: "P1" })),
      [
        { op: "delete_interface_authentication_md5", value: "eth0,1" },
        { op: "delete_interface_authentication_md5", value: "eth0,2" },
        { op: "set_interface_authentication_plaintext", value: "eth0,P1" },
      ],
    );
  });

  it("plaintext to md5 deletes the plaintext password", () => {
    assert.deepEqual(
      ripInterfaceOps(PLAIN_STORED, iface({ authentication_type: "md5", md5_keys: [{ key_id: "4", password: "K4" }] })),
      [
        { op: "delete_interface_authentication_plaintext", value: "eth0" },
        { op: "set_interface_authentication_md5_key", value: "eth0,4,K4" },
      ],
    );
  });

  it("a stored node holding both modes keeps only the target mode", () => {
    const both = iface({ ...MD5_STORED, plaintext_password: MASKED_SECRET });
    assert.deepEqual(ripInterfaceOps(both, { ...MD5_STORED }), [
      { op: "delete_interface_authentication_plaintext", value: "eth0" },
    ]);
  });

  it("choosing none deletes the authentication node", () => {
    assert.deepEqual(ripInterfaceOps(MD5_STORED, iface()), [
      { op: "delete_interface_authentication", value: "eth0" },
    ]);
    assert.deepEqual(ripInterfaceOps(PLAIN_STORED, iface()), [
      { op: "delete_interface_authentication", value: "eth0" },
    ]);
    assert.deepEqual(ripInterfaceOps(iface(), iface()), []);
  });

  it("a new plaintext password replaces the masked one", () => {
    assert.deepEqual(ripInterfaceOps(PLAIN_STORED, { ...PLAIN_STORED, plaintext_password: " P2 " }), [
      { op: "set_interface_authentication_plaintext", value: "eth0,P2" },
    ]);
  });
});

describe("interface versions and split horizon", () => {
  it("deletes a cleared version and switches split horizon in one commit", () => {
    const stored = iface({ send_version: "1", receive_version: "2", split_horizon: "disable" });
    assert.deepEqual(
      ripInterfaceOps(stored, iface({ send_version: "", receive_version: "1", split_horizon: "poison-reverse" })),
      [
        { op: "delete_interface_send_version", value: "eth0" },
        { op: "set_interface_receive_version", value: "eth0,1" },
        { op: "delete_interface_split_horizon", value: "eth0" },
        { op: "set_interface_split_horizon_poison_reverse", value: "eth0" },
      ],
    );
    assert.deepEqual(ripInterfaceOps(stored, iface({ send_version: "1", receive_version: "2" })), [
      { op: "delete_interface_split_horizon", value: "eth0" },
    ]);
  });
});

describe("interface save check", () => {
  const md5 = (keys: { key_id: string; password: string }[]) => iface({ authentication_type: "md5", md5_keys: keys });

  it("requires an interface", () => {
    assert.equal(ripInterfaceProblem(null, iface({ name: " " })), "selectInterface");
  });

  it("checks md5 rows through the same normalizer as the emit", () => {
    assert.equal(ripInterfaceProblem(null, md5([])), "md5KeyRequired");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "", password: "" }])), "md5KeyRequired");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "", password: "K" }])), "md5KeyIdRequired");
    for (const id of ["0", "256", "01", "1.5", "1e1"]) {
      assert.equal(ripInterfaceProblem(null, md5([{ key_id: id, password: "K" }])), "md5KeyIdRange", id);
    }
    assert.equal(
      ripInterfaceProblem(null, md5([{ key_id: "1", password: "A" }, { key_id: " 1 ", password: "B" }])),
      "md5KeyIdDuplicate",
    );
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "1", password: " " }])), "md5PasswordRequired");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "1", password: "a b" }])), "md5PasswordInvalid");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "1", password: "x".repeat(17) }])), "md5PasswordInvalid");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "255", password: " " + "x".repeat(16) + " " }])), null);
  });

  it("accepts the mask only on a key that stores a password", () => {
    assert.equal(ripInterfaceProblem(MD5_STORED, { ...MD5_STORED }), null);
    assert.equal(ripInterfaceProblem(MD5_STORED, md5([{ key_id: "3", password: MASKED_SECRET }])), "md5PasswordRequired");
    assert.equal(ripInterfaceProblem(null, md5([{ key_id: "1", password: MASKED_SECRET }])), "md5PasswordRequired");
    const noPassword = md5([{ key_id: "1", password: "" }]);
    assert.equal(ripInterfaceProblem(noPassword, md5([{ key_id: "1", password: MASKED_SECRET }])), "md5PasswordRequired");
  });

  it("checks the plaintext password and its mask", () => {
    const plain = (password: string) => iface({ authentication_type: "plaintext", plaintext_password: password });
    assert.equal(ripInterfaceProblem(null, plain(" ")), "plaintextRequired");
    assert.equal(ripInterfaceProblem(null, plain(MASKED_SECRET)), "plaintextRequired");
    assert.equal(ripInterfaceProblem(MD5_STORED, plain(MASKED_SECRET)), "plaintextRequired");
    assert.equal(ripInterfaceProblem(PLAIN_STORED, plain(MASKED_SECRET)), null);
    assert.equal(ripInterfaceProblem(null, plain("a b")), "plaintextInvalid");
    assert.equal(ripInterfaceProblem(null, plain("x".repeat(17))), "plaintextInvalid");
    assert.equal(ripInterfaceProblem(null, plain("P1")), null);
  });
});

describe("next md5 key id", () => {
  it("skips ids used by a row or a stored key", () => {
    assert.equal(ripNextKeyId([], []), "1");
    assert.equal(ripNextKeyId([{ key_id: "1", password: "" }, { key_id: "3", password: "" }], []), "2");
    // Key 2 was removed in this edit; reusing it would read as the stored key kept.
    assert.equal(ripNextKeyId([{ key_id: "1", password: MASKED_SECRET }], MD5_STORED.md5_keys), "3");
  });
});

describe("redistribute", () => {
  it("creates with optional leaves", () => {
    assert.deepEqual(ripRedistributeOps(null, { protocol: "ospf", metric: 3, route_map: "" }), [
      { op: "set_redistribute", value: "ospf" },
      { op: "set_redistribute_metric", value: "ospf,3" },
    ]);
  });

  it("deletes a cleared metric or route-map leaf without touching the parent", () => {
    const stored = { protocol: "bgp", metric: 3, route_map: "RM" };
    assert.deepEqual(ripRedistributeOps(stored, { protocol: "bgp", metric: null, route_map: null }), [
      { op: "delete_redistribute_metric", value: "bgp" },
      { op: "delete_redistribute_route_map", value: "bgp" },
    ]);
    assert.deepEqual(ripRedistributeOps(stored, { protocol: "bgp", metric: 5, route_map: "RM2" }), [
      { op: "set_redistribute_metric", value: "bgp,5" },
      { op: "set_redistribute_route_map", value: "bgp,RM2" },
    ]);
    assert.deepEqual(ripRedistributeOps(stored, { ...stored }), []);
  });
});

describe("network distance", () => {
  it("creates and edits leaves in place", () => {
    assert.deepEqual(ripNetworkDistanceOps(null, { prefix: "10.0.0.0/8", distance: 50, access_list: "10" }), [
      { op: "set_network_distance", value: "10.0.0.0/8" },
      { op: "set_network_distance_value", value: "10.0.0.0/8,50" },
      { op: "set_network_distance_access_list", value: "10.0.0.0/8,10" },
    ]);
    const stored = { prefix: "10.0.0.0/8", distance: 50, access_list: "10" };
    assert.deepEqual(ripNetworkDistanceOps(stored, { ...stored, distance: 60, access_list: null }), [
      { op: "set_network_distance_value", value: "10.0.0.0/8,60" },
      { op: "delete_network_distance_access_list", value: "10.0.0.0/8" },
    ]);
    assert.deepEqual(ripNetworkDistanceOps(stored, { ...stored }), []);
  });
});

describe("distribute lists", () => {
  it("diffs the global lists", () => {
    assert.deepEqual(
      ripDistributeListGlobalOps({ access_list_in: "10", prefix_list_out: "PL" }, { access_list_in: null, access_list_out: "20", prefix_list_out: "PL" }),
      [
        { op: "delete_distribute_list_access_list_in" },
        { op: "set_distribute_list_access_list_out", value: "20" },
      ],
    );
  });

  it("diffs the per-interface lists", () => {
    assert.deepEqual(ripDistributeListInterfaceOps(null, { interface: "eth0", access_list_in: "10" }), [
      { op: "set_distribute_list_interface_access_list_in", value: "eth0,10" },
    ]);
    assert.deepEqual(
      ripDistributeListInterfaceOps({ interface: "eth0", access_list_in: "10" }, { interface: "eth0", prefix_list_in: "PL" }),
      [
        { op: "delete_distribute_list_interface_access_list_in", value: "eth0" },
        { op: "set_distribute_list_interface_prefix_list_in", value: "eth0,PL" },
      ],
    );
    assert.equal(ripDistributeListInterfaceEmpty({ interface: "eth0", access_list_in: " " }), true);
    assert.equal(ripDistributeListInterfaceEmpty({ interface: "eth0", prefix_list_out: "PL" }), false);
  });
});

describe("service", () => {
  function stubbed() {
    const sent: RipBatchOperation[][] = [];
    const service = Object.create(ripService) as typeof ripService;
    service.batchConfigure = async (ops: RipBatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("updateInterface sends the normalized diff and never the mask", async () => {
    const { service, sent } = stubbed();
    await service.updateInterface(MD5_STORED, iface({
      authentication_type: "md5",
      md5_keys: [
        { key_id: " 1 ", password: ` ${MASKED_SECRET} ` },
        { key_id: "5", password: " K5 " },
        { key_id: "", password: "" },
      ],
    }));
    assert.deepEqual(sent, [[
      { op: "delete_interface_authentication_md5", value: "eth0,2" },
      { op: "set_interface_authentication_md5_key", value: "eth0,5,K5" },
    ]]);
    assert.ok(!JSON.stringify(sent).includes(MASKED_SECRET));
  });

  it("updateSettings sends global settings and timers as one batch", async () => {
    const { service, sent } = stubbed();
    await service.updateSettings(CONFIG, { ...SETTINGS, version: "1", timers: { update: "", timeout: "", garbage_collection: "" } });
    assert.deepEqual(sent, [[{ op: "set_version", value: "1" }, { op: "delete_timers" }]]);
  });

  it("batchConfigure skips an empty batch and throws the device error", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error: "Commit failed" };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await ripService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(ripService.batchConfigure([{ op: "delete_rip" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/rip/batch", { operations: [{ op: "delete_rip" }] }]]);
    } finally {
      apiClient.post = original;
    }
  });
});
