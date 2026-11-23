import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  conntrackSyncDraft,
  conntrackSyncNumber,
  conntrackSyncProblem,
  conntrackSyncSaveOps,
  type ConntrackSyncDraft,
} from "./conntrack-sync-save-ops";
import { apiClient } from "./client";
import {
  conntrackSyncService,
  type BatchOperation,
  type ConntrackSyncConfig,
  type ConntrackSyncFeatures,
} from "./conntrack-sync";

const CONFIG: ConntrackSyncConfig = {
  configured: true,
  accept_protocols: ["tcp", "udp"],
  disable_external_cache: false,
  disable_syslog: true,
  event_listen_queue_size: 8,
  expect_sync: ["ftp"],
  failover_mechanism: { vrrp: { sync_group: "SG1" } },
  ignore_addresses: ["192.0.2.99"],
  interfaces: [{ name: "eth1", peer: null, port: 3780 }],
  listen_addresses: ["192.0.2.1"],
  mcast_group: "225.0.0.50",
  purge_timeout: null,
  startup_resync: false,
  sync_queue_size: null,
  vrrp_sync_groups: ["SG1", "SG2"],
};

const EMPTY: ConntrackSyncConfig = {
  configured: false,
  accept_protocols: [],
  disable_external_cache: false,
  disable_syslog: false,
  event_listen_queue_size: null,
  expect_sync: [],
  failover_mechanism: null,
  ignore_addresses: [],
  interfaces: [],
  listen_addresses: [],
  mcast_group: null,
  purge_timeout: null,
  startup_resync: false,
  sync_queue_size: null,
  vrrp_sync_groups: ["SG1"],
};

function features(v15: boolean): ConntrackSyncFeatures {
  const families = v15 ? ["ipv4", "ipv6"] : ["ipv4"];
  const u32 = { min: 0, max: 4294967295 };
  return {
    accept_protocol: { supported: true, options: ["tcp", "udp", "icmp", "icmp6", "sctp", "dccp"] },
    disable_external_cache: { supported: true },
    disable_syslog: { supported: true },
    event_listen_queue_size: { supported: true, default: 8, ...u32 },
    expect_sync: { supported: true, options: ["all", "ftp", "sip", "h323", "nfs", "sqlnet"] },
    failover_vrrp: { supported: true },
    ignore_address: { supported: true },
    interface: { supported: true },
    interface_peer: { supported: true, families },
    interface_port: { supported: true, min: 1, max: 65535 },
    listen_address: { supported: true, families },
    mcast_group: { supported: true, default: "225.0.0.50", families },
    purge_timeout: { supported: v15, default: 60, min: 1, max: 2147483647 },
    startup_resync: { supported: true },
    sync_queue_size: { supported: true, default: 1, ...u32 },
  };
}

function draft(patch: Partial<ConntrackSyncDraft> = {}): ConntrackSyncDraft {
  return { ...conntrackSyncDraft(CONFIG), ...patch };
}

describe("conntrackSyncSaveOps", () => {
  it("emits nothing for an untouched draft", () => {
    assert.deepEqual(conntrackSyncSaveOps(CONFIG, conntrackSyncDraft(CONFIG)), []);
  });

  it("creates a new service from an empty config", () => {
    const ops = conntrackSyncSaveOps(EMPTY, {
      ...conntrackSyncDraft(EMPTY),
      interfaces: [{ name: " eth0 ", peer: " 192.0.2.2 ", port: "03780" }],
      sync_group: "SG1",
      accept_protocols: ["tcp"],
      expect_sync: ["all"],
      event_listen_queue_size: "16",
      sync_queue_size: "2",
      purge_timeout: "60",
      mcast_group: "225.0.0.51",
      listen_addresses: [" 192.0.2.1 "],
      ignore_addresses: ["10.0.0.0/8"],
      disable_external_cache: true,
      disable_syslog: true,
      startup_resync: true,
    });
    assert.deepEqual(ops, [
      { op: "set_interface", value: "eth0" },
      { op: "set_interface_peer", value: "eth0,192.0.2.2" },
      { op: "set_interface_port", value: "eth0,3780" },
      { op: "set_accept_protocol", value: "tcp" },
      { op: "set_expect_sync", value: "all" },
      { op: "set_failover_vrrp_sync_group", value: "SG1" },
      { op: "set_event_listen_queue_size", value: "16" },
      { op: "set_sync_queue_size", value: "2" },
      { op: "set_purge_timeout", value: "60" },
      { op: "set_mcast_group", value: "225.0.0.51" },
      { op: "set_listen_address", value: "192.0.2.1" },
      { op: "set_ignore_address", value: "10.0.0.0/8" },
      { op: "set_disable_external_cache" },
      { op: "set_disable_syslog" },
      { op: "set_startup_resync" },
    ]);
  });

  it("emits the bulk delete when a multi-value list is emptied", () => {
    const ops = conntrackSyncSaveOps(CONFIG, draft({
      accept_protocols: [],
      expect_sync: [],
      listen_addresses: [],
      ignore_addresses: [],
    }));
    assert.deepEqual(ops, [
      { op: "delete_accept_protocols" },
      { op: "delete_expect_syncs" },
      { op: "delete_listen_addresses" },
      { op: "delete_ignore_addresses" },
    ]);
  });

  it("deletes and sets single values of a multi-value list", () => {
    const ops = conntrackSyncSaveOps(CONFIG, draft({ accept_protocols: ["tcp", " sctp "] }));
    assert.deepEqual(ops, [
      { op: "delete_accept_protocol", value: "udp" },
      { op: "set_accept_protocol", value: "sctp" },
    ]);
  });

  it("sets a changed value leaf and deletes a cleared one", () => {
    const ops = conntrackSyncSaveOps(CONFIG, draft({
      sync_group: "SG2",
      event_listen_queue_size: "",
      mcast_group: " ",
      sync_queue_size: "0",
      disable_syslog: false,
    }));
    assert.deepEqual(ops, [
      { op: "set_failover_vrrp_sync_group", value: "SG2" },
      { op: "delete_event_listen_queue_size" },
      { op: "set_sync_queue_size", value: "0" },
      { op: "delete_mcast_group" },
      { op: "delete_disable_syslog" },
    ]);
  });

  it("treats leading zeros and padding as the loaded value", () => {
    const ops = conntrackSyncSaveOps(CONFIG, draft({
      interfaces: [{ name: "eth1 ", peer: "", port: "003780" }],
      event_listen_queue_size: " 008 ",
    }));
    assert.deepEqual(ops, []);
  });

  it("edits interface leaves in place and deletes only removed interfaces", () => {
    const original: ConntrackSyncConfig = {
      ...CONFIG,
      interfaces: [
        { name: "eth1", peer: "192.0.2.2", port: 3780 },
        { name: "eth2", peer: "192.0.2.3", port: null },
      ],
    };
    const ops = conntrackSyncSaveOps(original, {
      ...conntrackSyncDraft(original),
      interfaces: [
        { name: "eth1", peer: "192.0.2.9", port: "" },
        { name: "eth3", peer: "192.0.2.4", port: "" },
      ],
    });
    assert.deepEqual(ops, [
      { op: "delete_interface", value: "eth2" },
      { op: "set_interface_peer", value: "eth1,192.0.2.9" },
      { op: "delete_interface_port", value: "eth1" },
      { op: "set_interface", value: "eth3" },
      { op: "set_interface_peer", value: "eth3,192.0.2.4" },
    ]);
  });

  it("deletes a cleared purge timeout", () => {
    const original = { ...CONFIG, purge_timeout: 60 };
    assert.deepEqual(conntrackSyncSaveOps(original, { ...conntrackSyncDraft(original), purge_timeout: "" }), [
      { op: "delete_purge_timeout" },
    ]);
  });
});

describe("conntrackSyncProblem", () => {
  const ok = (d: ConntrackSyncDraft, v15 = false) => conntrackSyncProblem(d, features(v15));

  it("accepts the loaded config", () => {
    assert.equal(ok(draft()), null);
  });

  it("requires an interface and a sync group", () => {
    assert.deepEqual(ok(draft({ interfaces: [] })), { key: "interfaceRequired" });
    assert.deepEqual(ok(draft({ sync_group: " " })), { key: "syncGroupRequired" });
  });

  it("rejects blank and duplicate interface names", () => {
    assert.deepEqual(ok(draft({ interfaces: [{ name: " ", peer: "", port: "" }] })), {
      key: "interfaceNameRequired",
    });
    assert.deepEqual(
      ok(draft({ interfaces: [{ name: "eth1", peer: "", port: "" }, { name: "eth1 ", peer: "", port: "" }] })),
      { key: "duplicateInterface", values: { name: "eth1" } },
    );
  });

  it("checks the port against the capability range", () => {
    for (const port of ["0", "65536", "1e3", "-1"]) {
      assert.deepEqual(ok(draft({ interfaces: [{ name: "eth1", peer: "", port }] })), {
        key: "portRange",
        values: { name: "eth1", min: 1, max: 65535 },
      });
    }
  });

  it("rejects mixed unicast and multicast interfaces", () => {
    const interfaces = [
      { name: "eth1", peer: "192.0.2.2", port: "" },
      { name: "eth2", peer: "", port: "" },
    ];
    assert.deepEqual(ok(draft({ interfaces })), { key: "mixedPeers" });
  });

  it("allows IPv6 addresses only where the device accepts them", () => {
    const v6Peer = draft({ interfaces: [{ name: "eth1", peer: "2001:db8::2", port: "" }], listen_addresses: [] });
    assert.deepEqual(ok(v6Peer), { key: "peerFamily", values: { name: "eth1" } });
    assert.equal(ok(v6Peer, true), null);
    assert.deepEqual(ok(draft({ mcast_group: "ff05::1:3" })), { key: "mcastFamily" });
    assert.equal(ok(draft({ mcast_group: "ff05::1:3" }), true), null);
    assert.deepEqual(ok(draft({ listen_addresses: ["2001:db8::1"] })), {
      key: "listenFamily",
      values: { address: "2001:db8::1" },
    });
  });

  it("rejects a listen address of another family than the peers", () => {
    const d = draft({ interfaces: [{ name: "eth1", peer: "2001:db8::2", port: "" }], listen_addresses: ["192.0.2.1"] });
    assert.deepEqual(ok(d, true), { key: "listenPeerFamily", values: { address: "192.0.2.1" } });
  });

  it("rejects expect-sync all beside another protocol", () => {
    assert.deepEqual(ok(draft({ expect_sync: ["all", "ftp"] })), { key: "expectSyncAll" });
    assert.equal(ok(draft({ expect_sync: ["all"] })), null);
  });

  it("checks queue sizes and purge timeout against the capability ranges", () => {
    assert.deepEqual(ok(draft({ event_listen_queue_size: "4294967296" })), {
      key: "eventQueueRange",
      values: { min: 0, max: 4294967295 },
    });
    assert.deepEqual(ok(draft({ sync_queue_size: "x" })), {
      key: "syncQueueRange",
      values: { min: 0, max: 4294967295 },
    });
    assert.deepEqual(ok(draft({ purge_timeout: "0" }), true), {
      key: "purgeTimeoutRange",
      values: { min: 1, max: 2147483647 },
    });
    assert.equal(ok(draft({ purge_timeout: "000060" }), true), null);
  });

  it("strips leading zeros in the shared number normalizer", () => {
    assert.equal(conntrackSyncNumber(" 0060 "), "60");
    assert.equal(conntrackSyncNumber("0"), "0");
    assert.equal(conntrackSyncNumber("abc"), "abc");
  });
});

describe("conntrackSyncService", () => {
  it("saveConfig sends the save ops through batchConfigure", async () => {
    const sent: BatchOperation[][] = [];
    const service = Object.create(conntrackSyncService) as typeof conntrackSyncService;
    service.batchConfigure = async (ops: BatchOperation[]) => {
      sent.push(ops);
      return { success: true };
    };
    await service.saveConfig(CONFIG, draft({ sync_group: " SG2 ", mcast_group: "" }));
    assert.deepEqual(sent, [[
      { op: "set_failover_vrrp_sync_group", value: "SG2" },
      { op: "delete_mcast_group" },
    ]]);
  });

  it("batchConfigure skips an empty batch and throws the device error", async () => {
    const posted: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posted.push([endpoint, body]);
      return { success: false, error: "Commit failed" };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await conntrackSyncService.batchConfigure([]), { success: true, data: null });
      assert.deepEqual(posted, []);
      await assert.rejects(conntrackSyncService.deleteConntrackSync(), { message: "Commit failed" });
      assert.deepEqual(posted, [[
        "/vyos/conntrack-sync/batch",
        { operations: [{ op: "delete_conntrack_sync" }] },
      ]]);
    } finally {
      apiClient.post = original;
    }
  });

  it("batchConfigure throws an empty message when the device sends none", async () => {
    const original = apiClient.post;
    apiClient.post = (async () => ({ success: false })) as typeof apiClient.post;
    try {
      await assert.rejects(conntrackSyncService.deleteConntrackSync(), (err: unknown) => {
        assert.deepEqual(err, { message: "" });
        return true;
      });
    } finally {
      apiClient.post = original;
    }
  });
});
