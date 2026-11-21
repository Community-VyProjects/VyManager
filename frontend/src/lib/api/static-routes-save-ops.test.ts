import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arpProblem,
  arpSaveOps,
  deleteArpEntryOps,
  deleteMrouteOps,
  deleteNeighborProxyOps,
  deleteRoutingTableOps,
  deleteStaticRouteOps,
  emptyInterface,
  emptyNextHop,
  mrouteFields,
  mrouteProblem,
  mrouteSaveOps,
  neighborProxyProblem,
  neighborProxySaveOps,
  routeMapSaveOps,
  routingTableProblem,
  routingTableSaveOps,
  staticRouteFields,
  staticRouteProblem,
  staticRouteSaveOps,
  type StaticRouteFeatures,
  type StaticRouteFields,
} from "./static-routes-save-ops";
import { StaticRoutesService, type MulticastRoute, type StaticRoute } from "./static-routes";

const V14: StaticRouteFeatures = { ipv4Segments: false, bfdSourceProfile: true, dhcpInterfaceMulti: false };
const V15: StaticRouteFeatures = { ipv4Segments: true, bfdSourceProfile: false, dhcpInterfaceMulti: true };
const GLOBAL = { kind: "global" as const };

function route(partial: Partial<StaticRoute> = {}): StaticRoute {
  return {
    destination: "198.51.100.0/24",
    description: null,
    next_hops: [],
    interfaces: [],
    blackhole: false,
    reject: false,
    dhcp_interfaces: [],
    route_type: "ipv4",
    ...partial,
  };
}

function nh(address: string, partial: Partial<StaticRoute["next_hops"][number]> = {}) {
  return { address, disable: false, bfd_enable: false, bfd_multi_hop: false, bfd_multi_hop_sources: [], ...partial };
}

function edit(loaded: StaticRoute, change: (f: StaticRouteFields) => StaticRouteFields) {
  const original = staticRouteFields(loaded);
  return { original, updated: change(structuredClone(original)) };
}

describe("static route save ops", () => {
  it("creates a route node first, then its leaves", () => {
    const updated = staticRouteFields(null);
    updated.destination = " 198.51.100.0/24 ";
    updated.description = "T-desc,comma";
    updated.nextHops = [{ ...emptyNextHop(), address: "192.0.2.1", distance: "10" }];
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", null, updated, V15), [
      { op: "set_ipv4_route", value: "198.51.100.0/24" },
      { op: "set_ipv4_route_description", value: "198.51.100.0/24,T-desc,comma" },
      { op: "set_ipv4_route_next_hop", value: "198.51.100.0/24,192.0.2.1" },
      { op: "set_ipv4_route_next_hop_distance", value: "198.51.100.0/24,192.0.2.1,10" },
    ]);
  });

  it("emits nothing for an untouched edit", () => {
    const loaded = route({
      description: "x",
      next_hops: [nh("192.0.2.1", { distance: 5, bfd_enable: true, bfd_profile: "T-P" })],
      interfaces: [{ interface: "eth1", disable: true }],
      blackhole: true,
      blackhole_tag: 7,
      dhcp_interfaces: ["eth2"],
    });
    const { original, updated } = edit(loaded, (f) => f);
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), []);
  });

  it("deletes cleared leaves and keeps the next-hop", () => {
    const loaded = route({ next_hops: [nh("192.0.2.1", { distance: 5, vrf: "T-V", interface: "eth0" })] });
    const { original, updated } = edit(loaded, (f) => {
      f.nextHops[0] = { ...f.nextHops[0], distance: "", vrf: " ", interface: "" };
      return f;
    });
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), [
      { op: "delete_ipv4_route_next_hop_distance", value: "198.51.100.0/24,192.0.2.1" },
      { op: "delete_ipv4_route_next_hop_interface", value: "198.51.100.0/24,192.0.2.1" },
      { op: "delete_ipv4_route_next_hop_vrf", value: "198.51.100.0/24,192.0.2.1" },
    ]);
  });

  it("removes a next-hop and an interface the user dropped", () => {
    const loaded = route({ next_hops: [nh("192.0.2.1"), nh("192.0.2.2")], interfaces: [{ interface: "eth1", disable: false }] });
    const { original, updated } = edit(loaded, (f) => ({ ...f, nextHops: f.nextHops.slice(1), interfaces: [] }));
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), [
      { op: "delete_ipv4_route_next_hop", value: "198.51.100.0/24,192.0.2.1" },
      { op: "delete_ipv4_route_interface", value: "198.51.100.0/24,eth1" },
    ]);
  });

  it("turning BFD off deletes the bfd node only", () => {
    const loaded = route({ next_hops: [nh("192.0.2.1", { bfd_enable: true, bfd_profile: "T-P", bfd_multi_hop: true })] });
    const { original, updated } = edit(loaded, (f) => {
      f.nextHops[0].bfd = false;
      return f;
    });
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), [
      { op: "delete_ipv4_route_next_hop_bfd", value: "198.51.100.0/24,192.0.2.1" },
    ]);
  });

  it("1.5 multi-hop source is one leaf: a set replaces it, a clear deletes it", () => {
    const loaded = route({ next_hops: [nh("192.0.2.1", {
      bfd_enable: true, bfd_multi_hop: true, bfd_multi_hop_sources: [{ address: "192.0.2.9" }],
    })] });
    const changed = edit(loaded, (f) => {
      f.nextHops[0].sources = [{ address: "192.0.2.10", profile: "" }];
      return f;
    });
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", changed.original, changed.updated, V15), [
      { op: "set_ipv4_route_next_hop_bfd_multi_hop_source", value: "198.51.100.0/24,192.0.2.1,192.0.2.10" },
    ]);
    const cleared = edit(loaded, (f) => {
      f.nextHops[0].sources = [];
      return f;
    });
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", cleared.original, cleared.updated, V15), [
      { op: "delete_ipv4_route_next_hop_bfd_multi_hop_source", value: "198.51.100.0/24,192.0.2.1,192.0.2.9" },
    ]);
  });

  it("1.4 multi-hop sources are tags: only the removed one is deleted, profiles diff per source", () => {
    const loaded = route({
      next_hops: [nh("192.0.2.1", {
        bfd_enable: true,
        bfd_multi_hop: true,
        bfd_multi_hop_sources: [
          { address: "192.0.2.9", profile: "T-P" },
          { address: "192.0.2.8", profile: null },
        ],
      })],
    });
    const { original, updated } = edit(loaded, (f) => {
      f.nextHops[0].sources = [
        { address: "192.0.2.8", profile: "T-P" },
        { address: " 192.0.2.10 ", profile: "T-Q" },
      ];
      return f;
    });
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V14), [
      { op: "delete_ipv4_route_next_hop_bfd_multi_hop_source", value: "198.51.100.0/24,192.0.2.1,192.0.2.9" },
      { op: "set_ipv4_route_next_hop_bfd_multi_hop_source_profile", value: "198.51.100.0/24,192.0.2.1,192.0.2.8,T-P" },
      { op: "set_ipv4_route_next_hop_bfd_multi_hop_source", value: "198.51.100.0/24,192.0.2.1,192.0.2.10" },
      { op: "set_ipv4_route_next_hop_bfd_multi_hop_source_profile", value: "198.51.100.0/24,192.0.2.1,192.0.2.10,T-Q" },
    ]);
  });

  it("1.5 source-address must match the route family; 1.4 takes either", () => {
    const f = staticRouteFields(null);
    f.destination = "198.51.100.0/24";
    f.nextHops = [{ ...emptyNextHop(), address: "192.0.2.1", bfd: true, multiHop: true,
      sources: [{ address: "2001:db8::9", profile: "" }] }];
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V15)?.key, "sourceInvalid");
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V14), null);
    f.nextHops[0].sources = [{ address: "192.0.2.9", profile: "" }, { address: "192.0.2.9", profile: "T-P" }];
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V14)?.key, "sourceDuplicate");
    f.nextHops[0].sources = [{ address: "", profile: "T-P" }];
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V14)?.key, "sourceRequired");
  });

  it("IPv4 segments are emitted only where the device has them", () => {
    const updated = staticRouteFields(null);
    updated.destination = "198.51.100.0/24";
    updated.nextHops = [{ ...emptyNextHop(), address: "192.0.2.1", segments: "fc00::1" }];
    const ops14 = staticRouteSaveOps(GLOBAL, "ipv4", null, updated, V14).map((o) => o.op);
    const ops15 = staticRouteSaveOps(GLOBAL, "ipv4", null, updated, V15).map((o) => o.op);
    assert.ok(!ops14.includes("set_ipv4_route_next_hop_segments"));
    assert.ok(ops15.includes("set_ipv4_route_next_hop_segments"));
    const ops6 = staticRouteSaveOps(GLOBAL, "ipv6", null, { ...updated, destination: "2001:db8:100::/48",
      nextHops: [{ ...emptyNextHop(), address: "2001:db8::1", segments: "fc00::1" }] }, V14).map((o) => o.op);
    assert.ok(ops6.includes("set_ipv6_route_next_hop_segments"));
  });

  it("switching blackhole to reject deletes one and sets the other", () => {
    const loaded = route({ blackhole: true, blackhole_distance: 9 });
    const { original, updated } = edit(loaded, (f) => ({ ...f, blackhole: false, reject: true, rejectTag: "3" }));
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), [
      { op: "delete_ipv4_route_blackhole", value: "198.51.100.0/24" },
      { op: "set_ipv4_route_reject", value: "198.51.100.0/24" },
      { op: "set_ipv4_route_reject_tag", value: "198.51.100.0/24,3" },
    ]);
  });

  it("1.4 DHCP interface is one value: a set replaces it, a clear deletes it", () => {
    const loaded = route({ dhcp_interfaces: ["eth1"] });
    const changed = edit(loaded, (f) => ({ ...f, dhcpInterfaces: ["eth2"] }));
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", changed.original, changed.updated, V14), [
      { op: "set_ipv4_route_dhcp_interface", value: "198.51.100.0/24,eth2" },
    ]);
    const cleared = edit(loaded, (f) => ({ ...f, dhcpInterfaces: [] }));
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", cleared.original, cleared.updated, V14), [
      { op: "delete_ipv4_route_dhcp_interface", value: "198.51.100.0/24,eth1" },
    ]);
  });

  it("diffs DHCP interfaces as a multi leaf on 1.5", () => {
    const loaded = route({ dhcp_interfaces: ["eth1", "eth2"] });
    const { original, updated } = edit(loaded, (f) => ({ ...f, dhcpInterfaces: ["eth2", "eth3"] }));
    assert.deepEqual(staticRouteSaveOps(GLOBAL, "ipv4", original, updated, V15), [
      { op: "delete_ipv4_route_dhcp_interface", value: "198.51.100.0/24,eth1" },
      { op: "set_ipv4_route_dhcp_interface", value: "198.51.100.0/24,eth3" },
    ]);
  });

  it("table and VRF scopes prefix the same leaves", () => {
    const updated = staticRouteFields(null);
    updated.destination = "2001:db8:100::/48";
    updated.interfaces = [{ ...emptyInterface(), interface: "eth1", vrf: "default" }];
    assert.deepEqual(staticRouteSaveOps({ kind: "table", tableId: 10 }, "ipv6", null, updated, V15), [
      { op: "set_table_ipv6_route", value: "10,2001:db8:100::/48" },
      { op: "set_table_ipv6_route_interface", value: "10,2001:db8:100::/48,eth1" },
      { op: "set_table_ipv6_route_interface_vrf", value: "10,2001:db8:100::/48,eth1,default" },
    ]);
    assert.deepEqual(staticRouteSaveOps({ kind: "vrf", vrf: "T-V" }, "ipv6", null, updated, V15), [
      { op: "set_vrf_static_route6", value: "T-V,2001:db8:100::/48" },
      { op: "set_vrf_static_route6_interface", value: "T-V,2001:db8:100::/48,eth1" },
      { op: "set_vrf_static_route6_interface_vrf", value: "T-V,2001:db8:100::/48,eth1,default" },
    ]);
    assert.deepEqual(deleteStaticRouteOps({ kind: "vrf", vrf: "T-V" }, "ipv4", "198.51.100.0/24"), [
      { op: "delete_vrf_static_route", value: "T-V,198.51.100.0/24" },
    ]);
  });

  it("rejects what the lab would refuse", () => {
    const f = staticRouteFields(null);
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V15)?.key, "destinationRequired");
    f.destination = "198.51.100.0/24";
    assert.equal(staticRouteProblem(null, f, "ipv4", ["198.51.100.0/24"], V15)?.key, "destinationExists");
    f.nextHops = [{ ...emptyNextHop(), address: "192.0.2.1", distance: "256" }];
    assert.deepEqual(staticRouteProblem(null, f, "ipv4", [], V15), {
      key: "range", field: "distance", min: 1, max: 255, name: "192.0.2.1",
    });
    f.nextHops = [{ ...emptyNextHop(), address: "192.0.2.1" }, { ...emptyNextHop(), address: " 192.0.2.1" }];
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V15)?.key, "nextHopDuplicate");
    f.nextHops = [{ ...emptyNextHop(), distance: "4" }];
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V15)?.key, "nextHopAddressRequired");
    f.nextHops = [];
    for (const [family, destination] of [["ipv4", "198.51.100.1/24"], ["ipv6", "2001:db8:100::1/48"]] as const) {
      assert.equal(staticRouteProblem(null, { ...f, destination }, family, [], V15)?.key, "destinationInvalid");
    }
    for (const [family, destination] of [["ipv4", "198.51.100.0/24"], ["ipv6", "2001:db8:100::/48"], ["ipv6", "::/0"]] as const) {
      assert.equal(staticRouteProblem(null, { ...f, destination }, family, [], V15), null);
    }
    f.blackhole = true;
    f.reject = true;
    assert.equal(staticRouteProblem(null, f, "ipv4", [], V15)?.key, "blackholeAndReject");
  });
});

describe("routing table, route-map, ARP and neighbor proxy ops", () => {
  it("table create and description clear", () => {
    assert.deepEqual(routingTableSaveOps(null, { tableId: "010", description: "x" }), [
      { op: "set_table", value: "10" },
      { op: "set_table_description", value: "10,x" },
    ]);
    assert.deepEqual(routingTableSaveOps({ tableId: "10", description: "x" }, { tableId: "10", description: "" }), [
      { op: "delete_table_description", value: "10" },
    ]);
    assert.equal(routingTableProblem(null, { tableId: "201", description: "" }, [])?.key, "tableIdRange");
    assert.equal(routingTableProblem(null, { tableId: "10", description: "" }, [10])?.key, "tableExists");
    assert.deepEqual(deleteRoutingTableOps(10), [{ op: "delete_table", value: "10" }]);
  });

  it("route-map set and clear", () => {
    assert.deepEqual(routeMapSaveOps("", "T-RM"), [{ op: "set_route_map", value: "T-RM" }]);
    assert.deepEqual(routeMapSaveOps("T-RM", ""), [{ op: "delete_route_map" }]);
    assert.deepEqual(routeMapSaveOps("T-RM", "T-RM "), []);
  });

  it("ARP create, edit, and last-entry delete", () => {
    const fields = { interface: "eth1", address: "192.0.2.5", mac: "00:11:22:33:44:55", description: "" };
    assert.deepEqual(arpSaveOps(null, fields), [
      { op: "set_arp_interface", value: "eth1" },
      { op: "set_arp_entry", value: "eth1,192.0.2.5,00:11:22:33:44:55" },
    ]);
    assert.deepEqual(arpSaveOps({ ...fields, description: "d" }, fields), [
      { op: "delete_arp_entry_description", value: "eth1,192.0.2.5" },
    ]);
    assert.deepEqual(deleteArpEntryOps("eth1", "192.0.2.5", 1), [{ op: "delete_arp_interface", value: "eth1" }]);
    assert.deepEqual(deleteArpEntryOps("eth1", "192.0.2.5", 2), [{ op: "delete_arp_entry", value: "eth1,192.0.2.5" }]);
    assert.equal(arpProblem(null, fields, ["eth1|192.0.2.5"])?.key, "arpEntryExists");
    assert.equal(arpProblem(null, { ...fields, mac: "00-11-22-33-44-55" }, [])?.key, "invalidMacAddress");
  });

  it("neighbor proxy interfaces are diffed", () => {
    const before = { kind: "nd" as const, address: "2001:db8::5", interfaces: ["eth1", "eth2"] };
    assert.deepEqual(neighborProxySaveOps(before, { ...before, interfaces: ["eth2", "eth3"] }), [
      { op: "delete_neighbor_proxy_nd_interface", value: "2001:db8::5,eth1" },
      { op: "set_neighbor_proxy_nd", value: "2001:db8::5,eth3" },
    ]);
    assert.equal(neighborProxyProblem(before, { ...before, interfaces: [] }, [])?.key, "interfaceRequired");
    assert.deepEqual(deleteNeighborProxyOps("arp", "192.0.2.5"), [
      { op: "delete_neighbor_proxy_arp", value: "192.0.2.5" },
    ]);
  });
});

describe("multicast route ops", () => {
  const loaded: MulticastRoute = {
    prefix: "233.252.0.0/24",
    next_hops: [{ address: "192.0.2.1", distance: 5, disable: false }],
    interfaces: [{ interface: "eth1", disable: true }],
    next_hops_configured: true,
    interfaces_configured: true,
  };

  it("1.5 creates the mroute node and edits disable", () => {
    const create = mrouteFields(null);
    create.prefix = "233.252.0.0/24";
    assert.deepEqual(mrouteSaveOps(null, create, { mroute: true }), [{ op: "set_mroute", value: "233.252.0.0/24" }]);
    const updated = mrouteFields(loaded);
    updated.interfaces[0].disable = false;
    assert.deepEqual(mrouteSaveOps(loaded, updated, { mroute: true }), [
      { op: "delete_mroute_interface_disable", value: "233.252.0.0/24,eth1" },
    ]);
  });

  it("removing the last next-hop deletes its holder node", () => {
    const updated = mrouteFields(loaded);
    updated.nextHops = [];
    assert.deepEqual(mrouteSaveOps(loaded, updated, { mroute: false }), [
      { op: "delete_mroute_next_hops", value: "233.252.0.0/24" },
    ]);
  });

  it("1.4 needs a target and deletes through the holder nodes", () => {
    const create = mrouteFields(null);
    create.prefix = "233.252.0.0/24";
    assert.equal(mrouteProblem(null, create, [], { mroute: false })?.key, "targetRequired");
    assert.equal(mrouteProblem(null, create, [], { mroute: true }), null);
    const emptied = mrouteFields(loaded);
    emptied.nextHops = [];
    emptied.interfaces = [];
    assert.equal(mrouteProblem(mrouteFields(loaded), emptied, [], { mroute: false })?.key, "targetRequired");
    assert.equal(mrouteProblem(mrouteFields(loaded), emptied, [], { mroute: true }), null);
    assert.deepEqual(deleteMrouteOps(loaded, { mroute: false }), [
      { op: "delete_mroute_next_hops", value: "233.252.0.0/24" },
      { op: "delete_mroute_interfaces", value: "233.252.0.0/24" },
    ]);
    assert.deepEqual(deleteMrouteOps(loaded, { mroute: true }), [{ op: "delete_mroute", value: "233.252.0.0/24" }]);
  });
});

describe("service", () => {
  it("skips the request when nothing changed and posts the diff otherwise", async () => {
    const sent: unknown[] = [];
    const service = Object.create(new StaticRoutesService()) as StaticRoutesService;
    service.batchConfigure = async (ops) => {
      sent.push(ops);
      return { success: true };
    };
    const original = staticRouteFields(route({ description: "a" }));
    assert.equal(await service.saveRoute(null, "ipv4", original, structuredClone(original), V15), null);
    assert.equal(sent.length, 0);
    await service.saveRoute(7, "ipv4", original, { ...original, description: " b " }, V15);
    assert.deepEqual(sent, [[{ op: "set_table_ipv4_route_description", value: "7,198.51.100.0/24,b" }]]);
  });
});
