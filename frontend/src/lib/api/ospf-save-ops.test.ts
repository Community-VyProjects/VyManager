import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_AUTH,
  MASKED_SECRET,
  ospfAccessListOps,
  ospfAdvancedProblem,
  ospfAreaOps,
  ospfAreaProblem,
  ospfAuthDraft,
  ospfAuthFromDraft,
  ospfAuthOps,
  ospfAuthProblem,
  ospfDefaultInformationOps,
  ospfDistanceOps,
  ospfGracefulRestartOps,
  ospfInterfaceOps,
  ospfInterfaceProblem,
  ospfMaxMetricOps,
  ospfMplsTeOps,
  ospfNeighborOps,
  ospfParametersOps,
  ospfRedistributeOps,
  ospfSegmentRoutingOps,
  ospfSummaryAddressOps,
  ospfTimersOps,
} from "./ospf-save-ops";
import { apiClient } from "./client";
import {
  ospfService,
  type OspfArea,
  type OspfBatchOperation,
  type OspfConfig,
  type OspfInterface,
  type OspfSegmentRouting,
} from "./ospf";

const RW = { retransmitWindow: true };
const NO_RW = { retransmitWindow: false };

function iface(partial: Partial<OspfInterface> = {}): OspfInterface {
  return {
    name: "eth0",
    passive_disable: false,
    bfd: false,
    mtu_ignore: false,
    authentication: { ...EMPTY_AUTH },
    ldp_sync: false,
    ldp_sync_disable: false,
    ...partial,
  };
}

function area(partial: Partial<OspfArea> = {}): OspfArea {
  return {
    area_id: "1",
    area_type_no_summary: false,
    networks: [],
    ranges: [],
    virtual_links: [],
    ...partial,
  };
}

function config(partial: Partial<OspfConfig> = {}): OspfConfig {
  return {
    configured: true,
    parameters: { opaque_lsa: false, rfc1583_compatibility: false },
    areas: [],
    interfaces: [],
    redistribute: [],
    default_information: { enabled: false, always: false },
    distance: { ospf: {} },
    timers_throttle_spf: {},
    max_metric_router_lsa: { administrative: false },
    graceful_restart: {
      enabled: false,
      helper: { enable: false, router_ids: [], no_strict_lsa_checking: false, planned_only: false },
    },
    neighbors: [],
    access_lists: [],
    mpls_te: { enable: false },
    summary_addresses: [],
    segment_routing: { prefixes: [] },
    log_adjacency_changes_detail: false,
    passive_interface_default: false,
    capability_opaque: false,
    ...partial,
  };
}

describe("authentication", () => {
  const md5 = { md5_key_ids: { "1": MASKED_SECRET, "2": MASKED_SECRET }, plaintext_password: null, null: false };

  it("keeps a masked key, deletes a removed key, sets a new key, with padded ids trimmed", () => {
    const draft = ospfAuthDraft(md5);
    draft.keys = [{ id: " 1 ", value: MASKED_SECRET }, { id: "3 ", value: " k3 " }];
    assert.equal(ospfAuthProblem(md5, draft), null);
    assert.deepEqual(ospfAuthOps("interface", "eth0", md5, ospfAuthFromDraft(draft)), [
      { op: "delete_interface_authentication_md5_key_id", value: "eth0,2" },
      { op: "set_interface_authentication_md5_key_id", value: "eth0,3" },
      { op: "set_interface_authentication_md5_key_id_md5_key", value: "eth0,3,k3" },
    ]);
  });

  it("rejects a mask typed on a new key id, and a blank or duplicate key", () => {
    const draft = ospfAuthDraft(md5);
    draft.keys = [{ id: "9", value: MASKED_SECRET }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyValueRequired");
    draft.keys = [{ id: "1", value: "" }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyValueRequired");
    draft.keys = [{ id: "1", value: "a" }, { id: " 1", value: "b" }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyIdDuplicate");
    draft.keys = [{ id: "", value: "a" }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyIdRequired");
    draft.keys = [{ id: "256", value: "a" }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyIdRange");
    draft.keys = [{ id: "", value: "" }];
    assert.equal(ospfAuthProblem(md5, draft), "md5KeyRequired");
  });

  it("deletes the old mode node when the mode changes, even when the loaded value is the mask", () => {
    const draft = ospfAuthDraft(md5);
    draft.mode = "plaintext-password";
    draft.password = "pw";
    assert.deepEqual(ospfAuthOps("area_virtual_link", "0,192.0.2.1", md5, ospfAuthFromDraft(draft)), [
      { op: "delete_area_virtual_link_authentication_md5", value: "0,192.0.2.1" },
      { op: "set_area_virtual_link_authentication_plaintext_password", value: "0,192.0.2.1,pw" },
    ]);
    draft.password = MASKED_SECRET;
    assert.equal(ospfAuthProblem(md5, draft), "plaintextPasswordRequired");
  });

  it("skips an unchanged masked password, sets null, and clears with the parent delete", () => {
    const plain = { md5_key_ids: {}, plaintext_password: MASKED_SECRET, null: false };
    assert.deepEqual(ospfAuthOps("interface", "eth0", plain, ospfAuthFromDraft(ospfAuthDraft(plain))), []);
    assert.deepEqual(
      ospfAuthOps("interface", "eth0", plain, { md5_key_ids: {}, plaintext_password: null, null: true }),
      [
        { op: "delete_interface_authentication_plaintext_password", value: "eth0" },
        { op: "set_interface_authentication_null", value: "eth0" },
      ],
    );
    assert.deepEqual(ospfAuthOps("interface", "eth0", plain, { ...EMPTY_AUTH }), [
      { op: "delete_interface_authentication", value: "eth0" },
    ]);
  });
});

describe("interfaces", () => {
  it("sets only changed leaves and deletes cleared ones", () => {
    const before = iface({ cost: 10, dead_interval: 40, bfd: true, bfd_profile: "P1", passive: true });
    const after = iface({ cost: 20, hello_multiplier: 5, bfd: true, bfd_profile: null, passive_disable: true });
    assert.deepEqual(ospfInterfaceOps(before, after, NO_RW), [
      { op: "set_interface_cost", value: "eth0,20" },
      { op: "delete_interface_dead_interval", value: "eth0" },
      { op: "set_interface_hello_multiplier", value: "eth0,5" },
      { op: "set_interface_passive_disable", value: "eth0" },
      { op: "delete_interface_bfd_profile", value: "eth0" },
    ]);
    assert.deepEqual(ospfInterfaceOps(after, { ...after, hello_multiplier: null, bfd: false }, NO_RW), [
      { op: "delete_interface_hello_multiplier", value: "eth0" },
      { op: "delete_interface_bfd", value: "eth0" },
    ]);
  });

  it("does not emit retransmit-window when the device lacks it", () => {
    const after = iface({ retransmit_window: 50 });
    assert.deepEqual(ospfInterfaceOps(iface(), after, NO_RW), []);
    assert.deepEqual(ospfInterfaceOps(iface(), after, RW), [
      { op: "set_interface_retransmit_window", value: "eth0,50" },
    ]);
  });

  it("rejects hello-multiplier with dead-interval", () => {
    assert.equal(ospfInterfaceProblem(iface({ hello_multiplier: 5, dead_interval: 40 })), "helloMultiplierDeadInterval");
  });

  it("rejects a retransmit-window outside the lab range 20-1000", () => {
    assert.equal(ospfInterfaceProblem(iface({ retransmit_window: 19 })), "retransmitWindowRange");
    assert.equal(ospfInterfaceProblem(iface({ retransmit_window: 1001 })), "retransmitWindowRange");
    assert.equal(ospfInterfaceProblem(iface({ retransmit_window: 20 })), null);
    const vl = { address: "192.0.2.1", retransmit_window: 5, authentication: { ...EMPTY_AUTH } };
    assert.equal(ospfAreaProblem(area({ virtual_links: [vl] })), "retransmitWindowRange");
  });
});

describe("areas", () => {
  it("edits ranges and virtual links by key without re-creating them", () => {
    const before = area({
      area_type: "nssa",
      area_type_translate: "always",
      ranges: [{ prefix: "10.0.0.0/16", cost: 5, not_advertise: false, substitute: "10.1.0.0/16" }],
      virtual_links: [{ address: "192.0.2.1", hello_interval: 10, authentication: { ...EMPTY_AUTH } }],
    });
    const after = area({
      area_type: "nssa",
      area_type_translate: null,
      ranges: [{ prefix: " 10.0.0.0/16 ", cost: null, not_advertise: true, substitute: "10.1.0.0/16" }],
      virtual_links: [{ address: "192.0.2.1", hello_interval: null, authentication: { md5_key_ids: {}, plaintext_password: null, null: true } }],
    });
    assert.deepEqual(ospfAreaOps(before, after, NO_RW), [
      { op: "delete_area_type_nssa_translate", value: "1" },
      { op: "delete_area_range_cost", value: "1,10.0.0.0/16" },
      { op: "set_area_range_not_advertise", value: "1,10.0.0.0/16" },
      { op: "delete_area_virtual_link_hello_interval", value: "1,192.0.2.1" },
      { op: "set_area_virtual_link_authentication_null", value: "1,192.0.2.1" },
    ]);
  });

  it("changes area type with its sub-leaves in one batch", () => {
    assert.deepEqual(
      ospfAreaOps(area({ area_type: "stub" }), area({ area_type: "nssa", area_type_default_cost: 20 }), NO_RW),
      [
        { op: "delete_area_type", value: "1" },
        { op: "set_area_type_nssa", value: "1" },
        { op: "set_area_type_nssa_default_cost", value: "1,20" },
      ],
    );
  });

  it("rejects a duplicate range prefix after trim", () => {
    const ranges = [
      { prefix: "10.0.0.0/16", not_advertise: false },
      { prefix: "10.0.0.0/16 ", not_advertise: false },
    ];
    assert.equal(ospfAreaProblem(area({ ranges })), "rangeDuplicate");
  });
});

describe("global sections", () => {
  it("emits deletes for cleared leaves and the section delete when all are cleared", () => {
    assert.deepEqual(ospfTimersOps({ delay: 1, initial_holdtime: 2, max_holdtime: 3 }, {}), [
      { op: "delete_timers_throttle_spf" },
    ]);
    assert.deepEqual(ospfTimersOps({ delay: 1, initial_holdtime: 2 }, { initial_holdtime: 2 }), [
      { op: "delete_timers_throttle_spf_delay" },
    ]);
    assert.deepEqual(ospfDistanceOps({ ospf: { external: 120 } }, { ospf: {} }), [{ op: "delete_distance_ospf" }]);
    assert.deepEqual(
      ospfMaxMetricOps({ administrative: true, on_startup: 60 }, { administrative: false, on_startup: 60 }),
      [{ op: "delete_max_metric_router_lsa_administrative" }],
    );
    assert.deepEqual(ospfMplsTeOps({ enable: true, router_address: "10.0.0.1" }, { enable: true }), [
      { op: "delete_mpls_te_router_address" },
    ]);
  });

  it("default information keeps leaves and deletes cleared ones", () => {
    assert.deepEqual(
      ospfDefaultInformationOps(
        { enabled: true, always: true, metric: 10, route_map: "RM" },
        { enabled: true, always: false, metric: 10, route_map: null },
      ),
      [
        { op: "delete_default_information_originate_always" },
        { op: "delete_default_information_originate_route_map" },
      ],
    );
  });

  it("graceful restart helper delete drops the empty helper node", () => {
    const before = {
      enabled: true,
      helper: { enable: true, router_ids: ["192.0.2.1"], no_strict_lsa_checking: false, planned_only: false },
    };
    const after = {
      enabled: true,
      helper: { enable: false, router_ids: [], no_strict_lsa_checking: false, planned_only: false },
    };
    assert.deepEqual(ospfGracefulRestartOps(before, after), [{ op: "delete_graceful_restart_helper" }]);
  });

  it("log adjacency detail is deleted alone when only detail is cleared", () => {
    const original = config({ log_adjacency_changes: true, log_adjacency_changes_detail: true, default_metric: 5 });
    assert.deepEqual(
      ospfParametersOps(original, {
        opaque_lsa: false,
        rfc1583_compatibility: false,
        passive_interface_default: false,
        log_adjacency_changes: true,
        log_adjacency_changes_detail: false,
        default_metric: null,
      }),
      [{ op: "delete_log_adjacency_changes_detail" }, { op: "delete_default_metric" }],
    );
  });

  it("redistribute edit sets changed leaves and deletes cleared ones", () => {
    assert.deepEqual(
      ospfRedistributeOps(
        { protocol: "table", table: "100", metric: "10", route_map: "RM" },
        { protocol: "table", table: "100", metric: "20", route_map: null },
      ),
      [
        { op: "set_redistribute_table_metric", value: "100,20" },
        { op: "delete_redistribute_table_route_map", value: "100" },
      ],
    );
  });
});

describe("advanced lists", () => {
  it("diffs access-list exports, neighbors, and summary addresses by key", () => {
    assert.deepEqual(
      ospfAccessListOps([{ acl: "10", export: ["bgp", "rip"] }, { acl: "20", export: [] }], [{ acl: "10", export: ["rip", "static"] }]),
      [
        { op: "delete_access_list", value: "20" },
        { op: "delete_access_list_export", value: "10,bgp" },
        { op: "set_access_list_export", value: "10,static" },
      ],
    );
    assert.deepEqual(ospfNeighborOps([{ address: "192.0.2.9", priority: 1 }], [{ address: " 192.0.2.9", priority: null }]), [
      { op: "delete_neighbor_priority", value: "192.0.2.9" },
    ]);
    assert.deepEqual(
      ospfSummaryAddressOps([{ prefix: "10.0.0.0/16", tag: 7, no_advertise: false }], [{ prefix: "10.0.0.0/16", tag: null, no_advertise: true }]),
      [
        { op: "delete_summary_address_tag", value: "10.0.0.0/16" },
        { op: "set_summary_address_no_advertise", value: "10.0.0.0/16" },
      ],
    );
  });

  it("removes a flagged prefix SID in two commits", () => {
    const before: OspfSegmentRouting = {
      global_block_low: 16000,
      global_block_high: 23999,
      prefixes: [{ prefix: "10.0.0.1/32", index_value: 5, explicit_null: false, no_php_flag: true }],
    };
    const after: OspfSegmentRouting = { global_block_low: 16000, global_block_high: 23999, prefixes: [] };
    assert.deepEqual(ospfSegmentRoutingOps(before, after), {
      first: [{ op: "delete_segment_routing_prefix_no_php_flag", value: "10.0.0.1/32" }],
      second: [{ op: "delete_segment_routing_prefix", value: "10.0.0.1/32" }],
    });
    assert.deepEqual(ospfSegmentRoutingOps(before, { prefixes: [] }).second, [{ op: "delete_segment_routing" }]);
  });

  it("rejects combinations the lab rejects", () => {
    const base = { accessLists: [], neighbors: [], summaryAddresses: [], segmentRouting: { prefixes: [] } };
    assert.equal(
      ospfAdvancedProblem({ ...base, summaryAddresses: [{ prefix: "10.0.0.0/8", tag: 1, no_advertise: true }] }),
      "summaryTagNoAdvertise",
    );
    assert.equal(ospfAdvancedProblem({ ...base, segmentRouting: { prefixes: [], local_block_low: 1, local_block_high: 2 } }), "srLocalNeedsGlobal");
    assert.equal(ospfAdvancedProblem({ ...base, segmentRouting: { prefixes: [], global_block_low: 1 } }), "srBlockPair");
    assert.equal(ospfAdvancedProblem({ ...base, neighbors: [{ address: "", priority: 1 }] }), "neighborAddressRequired");
  });
});

describe("service", () => {
  function stub() {
    const sent: OspfBatchOperation[][] = [];
    const service = Object.create(ospfService) as typeof ospfService;
    service.batchConfigure = async (ops: OspfBatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("updateInterface sends the masked diff only", async () => {
    const { service, sent } = stub();
    const loaded = iface({ authentication: { md5_key_ids: { "1": MASKED_SECRET }, plaintext_password: null, null: false } });
    await service.updateInterface(loaded, { ...loaded, cost: 5 }, false);
    assert.deepEqual(sent, [[{ op: "set_interface_cost", value: "eth0,5" }]]);
  });

  it("updateAdvanced sends the flag drop before the prefix delete", async () => {
    const { service, sent } = stub();
    const original = config({
      segment_routing: { prefixes: [{ prefix: "10.0.0.1/32", index_value: 5, explicit_null: true, no_php_flag: false }] },
    });
    await service.updateAdvanced(original, {
      timers: {},
      distance: { ospf: {} },
      maxMetric: { administrative: false },
      gracefulRestart: original.graceful_restart,
      mplsTe: { enable: false },
      misc: { capability_opaque: false },
      accessLists: [],
      neighbors: [],
      summaryAddresses: [],
      segmentRouting: { prefixes: [] },
    });
    assert.deepEqual(sent, [
      [{ op: "delete_segment_routing_prefix_explicit_null", value: "10.0.0.1/32" }],
      [{ op: "delete_segment_routing" }],
    ]);
  });
});

describe("batchConfigure", () => {
  it("throws the device error on success:false and skips an empty batch", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error: "Commit failed" };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await ospfService.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(ospfService.batchConfigure([{ op: "delete_ospf" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/ospf/batch", { operations: [{ op: "delete_ospf" }] }]]);
    } finally {
      apiClient.post = original;
    }
  });
});

describe("independent leaves and the mask", () => {
  it("mpls-te router-address stays when only enable is cleared", () => {
    assert.deepEqual(ospfMplsTeOps({ enable: true, router_address: "10.0.0.1" }, { enable: false, router_address: "10.0.0.1" }), [
      { op: "delete_mpls_te_enable" },
    ]);
    assert.deepEqual(ospfMplsTeOps({ enable: false, router_address: "10.0.0.1" }, { enable: false }), [
      { op: "delete_mpls_te" },
    ]);
  });

  it("never emits the mask as a secret, even on a mode change", () => {
    const masked = { md5_key_ids: { "1": MASKED_SECRET }, plaintext_password: null, null: false };
    const ops = ospfAuthOps("interface", "eth0", null, masked);
    assert.ok(ops.every((op) => !(op.value || "").includes(MASKED_SECRET)));
    const plain = ospfAuthOps("interface", "eth0", masked, { md5_key_ids: {}, plaintext_password: MASKED_SECRET, null: false });
    assert.deepEqual(plain, [{ op: "delete_interface_authentication_md5", value: "eth0" }]);
  });
});
