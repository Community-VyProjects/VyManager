import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  StaticRoutesService,
  type ArpBatchRequest,
  type ArpEntry,
  type RoutingTable,
  type RoutingTableBatchRequest,
  type StaticRoute,
  type StaticRoutesBatchRequest,
  type TableRouteBatchRequest,
  type VyOSResponse,
} from "@/lib/api/static-routes";
import {
  arpDraftFrom,
  emptyArpDraft,
  emptyStaticRouteDraft,
  emptyTableRouteDraft,
  staticRouteDraftFrom,
  submitArpCreate,
  submitArpUpdate,
  submitRoutingTableCreate,
  submitRoutingTableUpdate,
  submitStaticRouteCreate,
  submitStaticRouteUpdate,
  submitTableRouteCreate,
  submitTableRouteUpdate,
  tableRouteDraftFrom,
  routingTableDraftFrom,
  validateArpCreate,
  validateRoutingTableCreate,
  validateStaticRouteCreate,
  validateTableRouteCreate,
} from "./static-routes-form";

class RecordingStaticRoutesService extends StaticRoutesService {
  routes: StaticRoutesBatchRequest[] = [];
  arp: ArpBatchRequest[] = [];
  tables: RoutingTableBatchRequest[] = [];
  tableRoutes: TableRouteBatchRequest[] = [];

  async batchConfigure(request: StaticRoutesBatchRequest): Promise<VyOSResponse> {
    this.routes.push(request);
    return { success: true };
  }

  async arpBatchConfigure(request: ArpBatchRequest): Promise<VyOSResponse> {
    this.arp.push(request);
    return { success: true };
  }

  async tableBatchConfigure(request: RoutingTableBatchRequest): Promise<VyOSResponse> {
    this.tables.push(request);
    return { success: true };
  }

  async tableRouteBatchConfigure(request: TableRouteBatchRequest): Promise<VyOSResponse> {
    this.tableRoutes.push(request);
    return { success: true };
  }
}

const storedRoute: StaticRoute = {
  destination: "10.0.0.0/8",
  description: "corp",
  next_hops: [
    {
      address: "192.168.1.1",
      distance: 1,
      disable: false,
      vrf: null,
      interface: null,
      bfd_enable: false,
      bfd_profile: null,
      bfd_multi_hop: false,
      bfd_multi_hop_source: null,
      segments: null,
    },
  ],
  interfaces: [],
  blackhole: false,
  blackhole_distance: null,
  blackhole_tag: null,
  reject: false,
  reject_distance: null,
  reject_tag: null,
  dhcp_interfaces: [],
  route_type: "ipv4",
};

const storedArp: ArpEntry = {
  ip_address: "192.168.1.50",
  mac_address: "00:11:22:33:44:55",
  description: "printer",
};

const storedTable: RoutingTable = {
  table_id: 100,
  description: "pbr",
  ipv4_routes: [],
  ipv6_routes: [],
};

describe("static route create", () => {
  it("rejects a missing destination", () => {
    const draft = emptyStaticRouteDraft("ipv4");
    draft.isBlackhole = true;
    assert.equal(validateStaticRouteCreate(draft), "Destination is required");
  });

  it("rejects an IPv4 route with no routing method", () => {
    const draft = emptyStaticRouteDraft("ipv4");
    draft.destination = "10.0.0.0/8";
    assert.match(validateStaticRouteCreate(draft) ?? "", /routing method/);
  });

  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = emptyStaticRouteDraft("ipv4");
    draft.destination = "10.0.0.0/8";
    draft.description = "corp";
    draft.nextHops = [
      {
        address: "192.168.1.1",
        distance: "1",
        disable: false,
        vrf: "",
        bfd_enable: false,
        bfd_profile: "",
      },
    ];
    await submitStaticRouteCreate(draft, false, service);
    assert.equal(service.routes.length, 1);
    assert.deepEqual(service.routes[0], {
      destination: "10.0.0.0/8",
      route_type: "ipv4",
      operations: [
        { op: "set_ipv4_route" },
        { op: "set_ipv4_route_description", value: "corp" },
        { op: "set_ipv4_route_next_hop", value: "192.168.1.1" },
        { op: "set_ipv4_route_next_hop_distance", value: "192.168.1.1,1" },
      ],
    });
  });
});

describe("static route update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingStaticRoutesService();
    const result = await submitStaticRouteUpdate(
      storedRoute,
      staticRouteDraftFrom(storedRoute),
      false,
      service,
    );
    assert.equal(result, null);
    assert.equal(service.routes.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = staticRouteDraftFrom(storedRoute);
    draft.description = "";
    await submitStaticRouteUpdate(storedRoute, draft, false, service);
    assert.equal(service.routes.length, 1);
    assert.deepEqual(service.routes[0].operations, [
      { op: "delete_ipv4_route_description" },
    ]);
  });

  it("does not emit a delete for an already-empty description", async () => {
    const service = new RecordingStaticRoutesService();
    const current = { ...storedRoute, description: null };
    const draft = staticRouteDraftFrom(current);
    const result = await submitStaticRouteUpdate(current, draft, false, service);
    assert.equal(result, null);
    assert.equal(service.routes.length, 0);
  });

  it("replaces next-hops with delete then set", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = staticRouteDraftFrom(storedRoute);
    draft.nextHops = [
      {
        address: "192.168.1.2",
        distance: "",
        disable: false,
        vrf: "",
        bfd_enable: false,
        bfd_profile: "",
      },
    ];
    await submitStaticRouteUpdate(storedRoute, draft, false, service);
    assert.equal(service.routes.length, 1);
    assert.deepEqual(service.routes[0].operations, [
      { op: "delete_ipv4_route_next_hop", value: "192.168.1.1" },
      { op: "set_ipv4_route_next_hop", value: "192.168.1.2" },
    ]);
  });

  it("writes the stored destination when the draft destination was altered", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = staticRouteDraftFrom(storedRoute);
    draft.destination = "9.9.9.0/24";
    draft.description = "renamed";
    await submitStaticRouteUpdate(storedRoute, draft, false, service);
    assert.equal(service.routes.length, 1);
    assert.equal(service.routes[0].destination, "10.0.0.0/8");
    assert.deepEqual(service.routes[0].operations, [
      { op: "set_ipv4_route_description", value: "renamed" },
    ]);
  });
});

describe("table route", () => {
  it("create emits the filled-in fields", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = emptyTableRouteDraft();
    draft.destination = "10.0.0.0/8";
    draft.isBlackhole = true;
    draft.blackholeDistance = "10";
    await submitTableRouteCreate(100, draft, service);
    assert.equal(service.tableRoutes.length, 1);
    assert.deepEqual(service.tableRoutes[0], {
      table_id: 100,
      destination: "10.0.0.0/8",
      route_type: "ipv4",
      operations: [
        { op: "set_table_ipv4_route" },
        { op: "set_table_ipv4_route_blackhole" },
        { op: "set_table_ipv4_route_blackhole_distance", value: "10" },
      ],
    });
  });

  it("rejects a missing destination on create", () => {
    assert.equal(validateTableRouteCreate(emptyTableRouteDraft()), "Destination is required");
  });

  it("sends nothing when the table route is unchanged", async () => {
    const service = new RecordingStaticRoutesService();
    const result = await submitTableRouteUpdate(
      100,
      storedRoute,
      tableRouteDraftFrom(storedRoute),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.tableRoutes.length, 0);
  });

  it("writes the stored destination when the draft destination was altered", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = tableRouteDraftFrom(storedRoute);
    draft.destination = "1.2.3.0/24";
    draft.description = "moved";
    await submitTableRouteUpdate(100, storedRoute, draft, service);
    assert.equal(service.tableRoutes[0].destination, "10.0.0.0/8");
    assert.equal(service.tableRoutes[0].table_id, 100);
  });
});

describe("arp entry", () => {
  it("create requires interface, ip, and mac", () => {
    const draft = emptyArpDraft();
    assert.equal(validateArpCreate(draft), "Interface is required");
    draft.interfaceName = "eth0";
    assert.equal(validateArpCreate(draft), "IP address is required");
    draft.ipAddress = "192.168.1.50";
    assert.equal(validateArpCreate(draft), "MAC address is required");
  });

  it("create emits only filled-in fields", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = emptyArpDraft();
    draft.interfaceName = "eth0";
    draft.ipAddress = "192.168.1.50";
    draft.macAddress = "00:11:22:33:44:55";
    await submitArpCreate(draft, service);
    assert.deepEqual(service.arp[0], {
      interface: "eth0",
      ip_address: "192.168.1.50",
      operations: [{ op: "set_arp_entry", value: "00:11:22:33:44:55" }],
    });
  });

  it("sends nothing when the arp entry is unchanged", async () => {
    const service = new RecordingStaticRoutesService();
    const result = await submitArpUpdate(
      { interfaceName: "eth0", entry: storedArp },
      arpDraftFrom("eth0", storedArp),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.arp.length, 0);
  });

  it("writes the stored ip when the draft ip was altered", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = arpDraftFrom("eth0", storedArp);
    draft.ipAddress = "10.0.0.9";
    draft.macAddress = "aa:bb:cc:dd:ee:ff";
    await submitArpUpdate({ interfaceName: "eth0", entry: storedArp }, draft, service);
    assert.equal(service.arp[0].ip_address, "192.168.1.50");
    assert.equal(service.arp[0].interface, "eth0");
  });
});

describe("routing table", () => {
  it("create requires a table id in range", () => {
    assert.equal(validateRoutingTableCreate({ tableId: "", description: "" }), "Table ID is required");
    assert.match(
      validateRoutingTableCreate({ tableId: "0", description: "" }) ?? "",
      /between 1 and 200/,
    );
  });

  it("create emits the table and optional description", async () => {
    const service = new RecordingStaticRoutesService();
    await submitRoutingTableCreate({ tableId: "100", description: "pbr" }, service);
    assert.deepEqual(service.tables[0], {
      table_id: 100,
      operations: [
        { op: "set_table" },
        { op: "set_table_description", value: "pbr" },
      ],
    });
  });

  it("sends nothing when the description is unchanged", async () => {
    const service = new RecordingStaticRoutesService();
    const result = await submitRoutingTableUpdate(
      storedTable,
      routingTableDraftFrom(storedTable),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.tables.length, 0);
  });

  it("writes the stored table id when the draft id was altered", async () => {
    const service = new RecordingStaticRoutesService();
    const draft = routingTableDraftFrom(storedTable);
    draft.tableId = "9";
    draft.description = "new";
    await submitRoutingTableUpdate(storedTable, draft, service);
    assert.equal(service.tables[0].table_id, 100);
  });
});
