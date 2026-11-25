import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRouteOps,
  deleteRouteOps,
  emptyNextHopRow,
  emptyTargetRow,
  failoverForm,
  failoverProblem,
  updateRouteOps,
  type FailoverForm,
  type FailoverNextHopRow,
  type FailoverDhcpRow,
  type FailoverProblemKey,
} from "./failover-save-ops";
import {
  failoverService,
  type FailoverBatchOperation,
  type FailoverCapabilities,
  type FailoverRoute,
} from "./failover";
import { apiClient } from "./client";

function caps(v15: boolean): FailoverCapabilities {
  const f = (supported: boolean) => ({ supported });
  return {
    version: v15 ? "1.5" : "1.4",
    features: {
      routes: f(true),
      next_hop: f(true),
      dhcp_interface: f(v15),
      check_target_interface: f(v15),
      check_target_vrf: f(v15),
      check_policy: { supported: true, values: ["any-available", "all-available"] },
      check_type: { supported: true, values: ["arp", "icmp", "tcp"] },
      check_port: { supported: true, min: 1, max: 65535 },
      check_timeout: { supported: true, min: 1, max: 255 },
      metric: { supported: true, min: 1, max: 255 },
    },
  };
}
const CAPS14 = caps(false);
const CAPS15 = caps(true);

/** A loaded 1.5 route: one next-hop with one target, one DHCP interface with one target. */
function loaded(): FailoverRoute {
  return {
    destination: "10.0.0.0/24",
    next_hops: [
      {
        address: "192.0.2.1",
        interface: "eth0",
        metric: 10,
        onlink: false,
        check: {
          policy: "all-available",
          type: "icmp",
          port: null,
          timeout: 5,
          targets: [{ address: "198.51.100.1", interface: "eth0", vrf: null }],
        },
      },
    ],
    dhcp_interfaces: [
      {
        name: "eth1",
        interface: null,
        metric: null,
        onlink: true,
        check: { policy: null, type: null, port: null, timeout: null, targets: [{ address: "198.51.100.9" }] },
      },
    ],
  };
}

/** A fully filled 1.5 create form. */
function fullForm(): FailoverForm {
  return {
    destination: "10.0.0.0/24",
    next_hops: [
      {
        address: "192.0.2.1",
        interface: "eth0",
        metric: "10",
        onlink: true,
        check: {
          policy: "all-available",
          type: "icmp",
          port: "80",
          timeout: "5",
          targets: [{ address: "198.51.100.1", interface: "eth0", vrf: "blue" }],
        },
      },
    ],
    dhcp_interfaces: [
      {
        name: "eth1",
        interface: "eth2",
        metric: "20",
        onlink: true,
        check: {
          policy: "any-available",
          type: "icmp",
          port: "443",
          timeout: "3",
          targets: [{ address: "198.51.100.9", interface: "eth1", vrf: "red" }],
        },
      },
    ],
  };
}

function edit(change: (f: FailoverForm) => void): FailoverForm {
  const f = failoverForm(loaded());
  change(f);
  return f;
}

const nh = (f: FailoverForm, i = 0): FailoverNextHopRow => f.next_hops[i];
const dh = (f: FailoverForm, i = 0): FailoverDhcpRow => f.dhcp_interfaces[i];

describe("createRouteOps", () => {
  it("emits every leaf of a full 1.5 route", () => {
    assert.deepEqual(createRouteOps(fullForm(), CAPS15), [
      { op: "set_route" },
      { op: "set_next_hop", value: "192.0.2.1" },
      { op: "set_next_hop_interface", value: "192.0.2.1,eth0" },
      { op: "set_next_hop_metric", value: "192.0.2.1,10" },
      { op: "set_next_hop_onlink", value: "192.0.2.1" },
      { op: "set_next_hop_check_policy", value: "192.0.2.1,all-available" },
      { op: "set_next_hop_check_type", value: "192.0.2.1,icmp" },
      { op: "set_next_hop_check_port", value: "192.0.2.1,80" },
      { op: "set_next_hop_check_timeout", value: "192.0.2.1,5" },
      { op: "set_next_hop_check_target", value: "192.0.2.1,198.51.100.1" },
      { op: "set_next_hop_check_target_interface", value: "192.0.2.1,198.51.100.1,eth0" },
      { op: "set_next_hop_check_target_vrf", value: "192.0.2.1,198.51.100.1,blue" },
      { op: "set_dhcp_interface", value: "eth1" },
      { op: "set_dhcp_interface_interface", value: "eth1,eth2" },
      { op: "set_dhcp_interface_metric", value: "eth1,20" },
      { op: "set_dhcp_interface_onlink", value: "eth1" },
      { op: "set_dhcp_interface_check_policy", value: "eth1,any-available" },
      { op: "set_dhcp_interface_check_type", value: "eth1,icmp" },
      { op: "set_dhcp_interface_check_port", value: "eth1,443" },
      { op: "set_dhcp_interface_check_timeout", value: "eth1,3" },
      { op: "set_dhcp_interface_check_target", value: "eth1,198.51.100.9" },
      { op: "set_dhcp_interface_check_target_interface", value: "eth1,198.51.100.9,eth1" },
      { op: "set_dhcp_interface_check_target_vrf", value: "eth1,198.51.100.9,red" },
    ]);
  });

  it("sends no 1.5-only op on 1.4", () => {
    const ops = createRouteOps(fullForm(), CAPS14);
    assert.ok(ops.every((o) => !o.op.includes("dhcp_interface")));
    assert.ok(ops.every((o) => !o.op.startsWith("set_next_hop_check_target_")));
    assert.ok(ops.some((o) => o.op === "set_next_hop_check_target"));
  });

  it("trims padded values and leaves blank optional leaves unset", () => {
    const f: FailoverForm = {
      destination: " 10.0.0.0/24 ",
      next_hops: [
        {
          address: " 192.0.2.1 ",
          interface: " eth0 ",
          metric: " ",
          onlink: false,
          check: { policy: "", type: "", port: "", timeout: "  ", targets: [{ address: " 198.51.100.1 ", interface: " ", vrf: "" }] },
        },
        emptyNextHopRow(),
      ],
      dhcp_interfaces: [],
    };
    assert.deepEqual(createRouteOps(f, CAPS15), [
      { op: "set_route" },
      { op: "set_next_hop", value: "192.0.2.1" },
      { op: "set_next_hop_interface", value: "192.0.2.1,eth0" },
      { op: "set_next_hop_check_target", value: "192.0.2.1,198.51.100.1" },
    ]);
  });
});

describe("updateRouteOps", () => {
  it("emits nothing for an unchanged edit", () => {
    assert.deepEqual(updateRouteOps(loaded(), failoverForm(loaded()), CAPS15), []);
  });

  it("emits nothing when only padding changed", () => {
    const f = edit((f) => {
      nh(f).address = " 192.0.2.1 ";
      nh(f).check.targets[0].address = "198.51.100.1 ";
      dh(f).name = " eth1";
    });
    assert.deepEqual(updateRouteOps(loaded(), f, CAPS15), []);
  });

  it("sets a changed leaf and deletes a cleared one", () => {
    const f = edit((f) => {
      nh(f).metric = "20";
      nh(f).check.timeout = "";
      nh(f).interface = "eth3";
      nh(f).onlink = true;
      dh(f).onlink = false;
      dh(f).metric = "7";
    });
    assert.deepEqual(updateRouteOps(loaded(), f, CAPS15), [
      { op: "set_next_hop_interface", value: "192.0.2.1,eth3" },
      { op: "set_next_hop_metric", value: "192.0.2.1,20" },
      { op: "set_next_hop_onlink", value: "192.0.2.1" },
      { op: "delete_next_hop_check_timeout", value: "192.0.2.1" },
      { op: "set_dhcp_interface_metric", value: "eth1,7" },
      { op: "delete_dhcp_interface_onlink", value: "eth1" },
    ]);
  });

  it("deletes policy and type when they go back to the default item", () => {
    const f = edit((f) => {
      nh(f).check.policy = "";
      nh(f).check.type = "";
    });
    assert.deepEqual(updateRouteOps(loaded(), f, CAPS15), [
      { op: "delete_next_hop_check_policy", value: "192.0.2.1" },
      { op: "delete_next_hop_check_type", value: "192.0.2.1" },
    ]);
  });

  it("deletes a cleared DHCP interface interface and port", () => {
    const original = loaded();
    original.dhcp_interfaces[0].interface = "eth2";
    original.dhcp_interfaces[0].check.port = 80;
    const f = failoverForm(original);
    dh(f).interface = "";
    dh(f).check.port = "";
    assert.deepEqual(updateRouteOps(original, f, CAPS15), [
      { op: "delete_dhcp_interface_interface", value: "eth1" },
      { op: "delete_dhcp_interface_check_port", value: "eth1" },
    ]);
  });

  it("diffs targets by address: add, remove and child change", () => {
    const original = loaded();
    original.next_hops[0].check.targets.push({ address: "198.51.100.2", interface: null, vrf: "blue" });
    const f = failoverForm(original);
    // Remove .1, keep .2 with a changed vrf and a new interface, add .3.
    nh(f).check.targets = [
      { address: "198.51.100.2", interface: "eth0", vrf: "red" },
      { address: "198.51.100.3", interface: "", vrf: "blue" },
    ];
    assert.deepEqual(updateRouteOps(original, f, CAPS15), [
      { op: "delete_next_hop_check_target", value: "192.0.2.1,198.51.100.1" },
      { op: "set_next_hop_check_target_interface", value: "192.0.2.1,198.51.100.2,eth0" },
      { op: "set_next_hop_check_target_vrf", value: "192.0.2.1,198.51.100.2,red" },
      { op: "set_next_hop_check_target", value: "192.0.2.1,198.51.100.3" },
      { op: "set_next_hop_check_target_vrf", value: "192.0.2.1,198.51.100.3,blue" },
    ]);
  });

  it("deletes a cleared target interface and vrf without touching the target", () => {
    const original = loaded();
    original.dhcp_interfaces[0].check.targets[0] = { address: "198.51.100.9", interface: "eth1", vrf: "red" };
    const f = failoverForm(original);
    dh(f).check.targets[0] = { address: "198.51.100.9", interface: "", vrf: "" };
    assert.deepEqual(updateRouteOps(original, f, CAPS15), [
      { op: "delete_dhcp_interface_check_target_interface", value: "eth1,198.51.100.9" },
      { op: "delete_dhcp_interface_check_target_vrf", value: "eth1,198.51.100.9" },
    ]);
  });

  it("adds and removes next-hops by address", () => {
    const f = edit((f) => {
      f.next_hops = [
        {
          address: "192.0.2.2",
          interface: "eth0",
          metric: "",
          onlink: false,
          check: { policy: "", type: "", port: "", timeout: "", targets: [{ address: "198.51.100.1", interface: "", vrf: "" }] },
        },
      ];
    });
    assert.deepEqual(updateRouteOps(loaded(), f, CAPS15), [
      { op: "delete_next_hop", value: "192.0.2.1" },
      { op: "set_next_hop", value: "192.0.2.2" },
      { op: "set_next_hop_interface", value: "192.0.2.2,eth0" },
      { op: "set_next_hop_check_target", value: "192.0.2.2,198.51.100.1" },
    ]);
  });

  it("adds and removes DHCP interfaces by name", () => {
    const f = edit((f) => {
      f.dhcp_interfaces = [
        {
          name: "eth4",
          interface: "",
          metric: "",
          onlink: false,
          check: { policy: "", type: "arp", port: "", timeout: "", targets: [{ address: "198.51.100.4", interface: "eth4", vrf: "" }] },
        },
      ];
    });
    assert.deepEqual(updateRouteOps(loaded(), f, CAPS15), [
      { op: "delete_dhcp_interface", value: "eth1" },
      { op: "set_dhcp_interface", value: "eth4" },
      { op: "set_dhcp_interface_check_type", value: "eth4,arp" },
      { op: "set_dhcp_interface_check_target", value: "eth4,198.51.100.4" },
      { op: "set_dhcp_interface_check_target_interface", value: "eth4,198.51.100.4,eth4" },
    ]);
  });

  it("never emits the lab-refused deletes", () => {
    const f = edit((f) => {
      nh(f).check.targets = [{ address: "198.51.100.5", interface: "", vrf: "" }];
      dh(f).check.targets = [{ address: "198.51.100.6", interface: "", vrf: "" }];
    });
    const names = updateRouteOps(loaded(), f, CAPS15).map((o) => o.op);
    for (const never of ["delete_next_hop_interface", "delete_next_hop_check_target_all", "delete_dhcp_interface_check_target_all"]) {
      assert.ok(!names.includes(never), never);
    }
  });

  it("ignores target interface and vrf on 1.4", () => {
    const original = loaded();
    original.dhcp_interfaces = [];
    original.next_hops[0].check.targets[0].interface = null;
    const f = failoverForm(original);
    nh(f).check.targets[0].interface = "eth0";
    nh(f).check.targets[0].vrf = "blue";
    assert.deepEqual(updateRouteOps(original, f, CAPS14), []);
  });
});

describe("deleteRouteOps", () => {
  it("deletes the route with a destination-only op", () => {
    assert.deepEqual(deleteRouteOps(), [{ op: "delete_route" }]);
  });
});

describe("failoverProblem", () => {
  const key = (original: FailoverRoute | null, f: FailoverForm, c = CAPS15, destinations: string[] = []) =>
    failoverProblem(original, f, c, { destinations })?.key ?? null;
  const problem = (original: FailoverRoute | null, f: FailoverForm, c = CAPS15) =>
    failoverProblem(original, f, c, { destinations: [] });

  it("accepts a full route and an unchanged edit", () => {
    assert.equal(key(null, fullForm()), null);
    assert.equal(key(loaded(), failoverForm(loaded())), null);
  });

  it("checks the destination on create", () => {
    const cases: [string, FailoverProblemKey][] = [
      ["  ", "destinationRequired"],
      ["10.0.0.1/24", "destinationInvalid"],
      ["10.0.0.0", "destinationInvalid"],
      ["300.0.0.0/8", "destinationInvalid"],
    ];
    for (const [destination, expected] of cases) {
      const f = fullForm();
      f.destination = destination;
      assert.equal(key(null, f), expected, destination);
    }
    assert.deepEqual(failoverProblem(null, fullForm(), CAPS15, { destinations: ["10.0.0.0/24"] }), {
      key: "destinationExists",
      values: { destination: "10.0.0.0/24" },
    });
  });

  it("refuses removing the last next-hop (1.4) and the last gateway (1.5)", () => {
    const original14 = loaded();
    original14.dhcp_interfaces = [];
    const f14 = failoverForm(original14);
    f14.next_hops = [];
    assert.deepEqual(problem(original14, f14, CAPS14), {
      key: "nextHopRequired",
      values: { destination: "10.0.0.0/24" },
    });
    const f15 = edit((f) => {
      f.next_hops = [];
      f.dhcp_interfaces = [];
    });
    assert.deepEqual(problem(loaded(), f15), {
      key: "nextHopOrDhcpRequired",
      values: { destination: "10.0.0.0/24" },
    });
    // A DHCP interface alone carries the route on 1.5.
    assert.equal(key(loaded(), edit((f) => { f.next_hops = []; })), null);
  });

  it("drops a blank added row but refuses a cleared address that still holds data", () => {
    assert.equal(key(loaded(), edit((f) => { f.next_hops.push(emptyNextHopRow()); })), null);
    assert.deepEqual(problem(loaded(), edit((f) => { nh(f).address = " "; })), {
      key: "nextHopAddressMissing",
      values: { n: 1 },
    });
    assert.deepEqual(problem(loaded(), edit((f) => { dh(f).name = ""; })), {
      key: "dhcpNameMissing",
      values: { n: 1 },
    });
    assert.deepEqual(
      problem(loaded(), edit((f) => { nh(f).check.targets.push({ address: "", interface: "eth0", vrf: "" }); })),
      { key: "targetAddressMissing", values: { name: "192.0.2.1", n: 2 } },
    );
    // A blank target row is dropped.
    assert.equal(key(loaded(), edit((f) => { nh(f).check.targets.push(emptyTargetRow()); })), null);
  });

  it("refuses duplicates after trim", () => {
    assert.deepEqual(
      problem(loaded(), edit((f) => { f.next_hops.push({ ...nh(f), address: " 192.0.2.1" }); })),
      { key: "nextHopDuplicate", values: { address: "192.0.2.1" } },
    );
    assert.deepEqual(
      problem(loaded(), edit((f) => { f.dhcp_interfaces.push({ ...dh(f), name: "eth1 " }); })),
      { key: "dhcpDuplicate", values: { name: "eth1" } },
    );
    assert.deepEqual(
      problem(loaded(), edit((f) => { nh(f).check.targets.push({ address: "198.51.100.1 ", interface: "", vrf: "" }); })),
      { key: "targetDuplicate", values: { name: "192.0.2.1", address: "198.51.100.1" } },
    );
  });

  it("refuses invalid IPv4 addresses", () => {
    assert.deepEqual(problem(loaded(), edit((f) => { nh(f).address = "192.0.2.300"; })), {
      key: "nextHopAddressInvalid",
      values: { address: "192.0.2.300" },
    });
    assert.deepEqual(problem(loaded(), edit((f) => { nh(f).check.targets[0].address = "2001:db8::1"; })), {
      key: "targetAddressInvalid",
      values: { name: "192.0.2.1", address: "2001:db8::1" },
    });
  });

  it("requires a next-hop interface but not a DHCP interface interface", () => {
    assert.deepEqual(problem(loaded(), edit((f) => { nh(f).interface = ""; })), {
      key: "nextHopInterfaceRequired",
      values: { address: "192.0.2.1" },
    });
    assert.equal(key(loaded(), edit((f) => { dh(f).interface = ""; })), null);
  });

  it("requires at least one check target", () => {
    assert.deepEqual(problem(loaded(), edit((f) => { nh(f).check.targets = []; })), {
      key: "targetRequired",
      values: { name: "192.0.2.1" },
    });
    assert.deepEqual(problem(loaded(), edit((f) => { dh(f).check.targets = [emptyTargetRow()]; })), {
      key: "targetRequired",
      values: { name: "eth1" },
    });
  });

  it("requires a port for tcp", () => {
    assert.deepEqual(problem(loaded(), edit((f) => { dh(f).check.type = "tcp"; })), {
      key: "tcpPortRequired",
      values: { name: "eth1" },
    });
    assert.equal(key(loaded(), edit((f) => { dh(f).check.type = "tcp"; dh(f).check.port = "80"; })), null);
  });

  it("refuses a target interface with tcp and a target vrf with arp on 1.5", () => {
    assert.deepEqual(
      problem(loaded(), edit((f) => { nh(f).check.type = "tcp"; nh(f).check.port = "80"; })),
      { key: "tcpTargetInterface", values: { name: "192.0.2.1", address: "198.51.100.1" } },
    );
    assert.deepEqual(
      problem(loaded(), edit((f) => { nh(f).check.type = "arp"; nh(f).check.targets[0].vrf = "blue"; })),
      { key: "arpTargetVrf", values: { name: "192.0.2.1", address: "198.51.100.1" } },
    );
    // Unset type is icmp: both children are allowed.
    assert.equal(key(loaded(), edit((f) => { nh(f).check.type = ""; nh(f).check.targets[0].vrf = "blue"; })), null);
    // On 1.4 the children are never read.
    const original = loaded();
    original.dhcp_interfaces = [];
    assert.equal(
      key(original, (() => { const f = failoverForm(original); nh(f).check.type = "tcp"; nh(f).check.port = "80"; return f; })(), CAPS14),
      null,
    );
  });

  it("refuses out-of-range and non-integer numbers", () => {
    const cases: [(f: FailoverForm) => void, FailoverProblemKey, number, number][] = [
      [(f) => { nh(f).metric = "0"; }, "metricRange", 1, 255],
      [(f) => { nh(f).metric = "256"; }, "metricRange", 1, 255],
      [(f) => { dh(f).metric = "1.5"; }, "metricRange", 1, 255],
      [(f) => { nh(f).check.port = "65536"; }, "portRange", 1, 65535],
      [(f) => { nh(f).check.port = "1e1"; }, "portRange", 1, 65535],
      [(f) => { nh(f).check.timeout = "300"; }, "timeoutRange", 1, 255],
      [(f) => { dh(f).check.timeout = "0"; }, "timeoutRange", 1, 255],
    ];
    for (const [change, expected, min, max] of cases) {
      const issue = problem(loaded(), edit(change));
      assert.equal(issue?.key, expected);
      assert.equal(issue?.values?.min, min);
      assert.equal(issue?.values?.max, max);
    }
    assert.equal(key(loaded(), edit((f) => { nh(f).metric = "255"; nh(f).check.timeout = "255"; nh(f).check.port = "65535"; })), null);
  });
});

describe("failoverService saves", () => {
  function stubbed() {
    const posted: [string, FailoverBatchOperation[]][] = [];
    const service = Object.create(failoverService) as typeof failoverService;
    service.batchConfigure = async (destination: string, operations: FailoverBatchOperation[]) => {
      posted.push([destination, operations]);
      return { success: true };
    };
    return { service, posted };
  }

  it("posts the trimmed destination and the create ops", async () => {
    const { service, posted } = stubbed();
    const f = fullForm();
    f.destination = " 10.0.0.0/24 ";
    await service.createRoute(f, CAPS14);
    assert.deepEqual(posted, [["10.0.0.0/24", createRouteOps(fullForm(), CAPS14)]]);
  });

  it("posts only the diff on update, under the stored destination", async () => {
    const { service, posted } = stubbed();
    await service.updateRoute(loaded(), edit((f) => { f.destination = "10.9.9.0/24"; nh(f).metric = " 11 "; }), CAPS15);
    assert.deepEqual(posted, [["10.0.0.0/24", [{ op: "set_next_hop_metric", value: "192.0.2.1,11" }]]]);
  });

  it("posts the route delete", async () => {
    const { service, posted } = stubbed();
    await service.deleteRoute("10.0.0.0/24");
    assert.deepEqual(posted, [["10.0.0.0/24", [{ op: "delete_route" }]]]);
  });
});

describe("batchConfigure", () => {
  async function withStubs(
    reply: { success: boolean; error?: string },
    refreshFails: boolean,
    run: (log: { posts: unknown[]; refreshes: number }) => Promise<void>,
  ) {
    const log = { posts: [] as unknown[], refreshes: 0 };
    const originalPost = apiClient.post;
    const originalRefresh = failoverService.refreshConfig;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      log.posts.push([endpoint, body]);
      return reply;
    }) as typeof apiClient.post;
    failoverService.refreshConfig = async () => {
      log.refreshes += 1;
      if (refreshFails) throw new Error("refresh failed");
      return { success: true };
    };
    try {
      await run(log);
    } finally {
      apiClient.post = originalPost;
      failoverService.refreshConfig = originalRefresh;
    }
  }

  it("makes no POST for an unchanged edit", async () => {
    await withStubs({ success: true }, false, async (log) => {
      assert.deepEqual(await failoverService.updateRoute(loaded(), failoverForm(loaded()), CAPS15), { success: true });
      assert.deepEqual(log, { posts: [], refreshes: 0 });
    });
  });

  it("posts the exact body", async () => {
    await withStubs({ success: true }, false, async (log) => {
      await failoverService.updateRoute(loaded(), edit((f) => { dh(f).onlink = false; }), CAPS15);
      assert.deepEqual(log.posts, [
        ["/vyos/failover/batch", { destination: "10.0.0.0/24", operations: [{ op: "delete_dhcp_interface_onlink", value: "eth1" }] }],
      ]);
      assert.equal(log.refreshes, 1);
    });
  });

  it("throws the device error on a rejected commit and does not refresh", async () => {
    await withStubs({ success: false, error: "Commit failed" }, false, async (log) => {
      await assert.rejects(failoverService.deleteRoute("10.0.0.0/24"), { message: "Commit failed" });
      assert.equal(log.refreshes, 0);
    });
  });

  it("throws an empty message when the device gives none", async () => {
    await withStubs({ success: false }, false, async () => {
      await assert.rejects(failoverService.deleteRoute("10.0.0.0/24"), { message: "" });
    });
  });

  it("does not reject when the refresh after a commit fails", async () => {
    await withStubs({ success: true }, true, async (log) => {
      assert.deepEqual(await failoverService.deleteRoute("10.0.0.0/24"), { success: true });
      assert.equal(log.refreshes, 1);
    });
  });
});
