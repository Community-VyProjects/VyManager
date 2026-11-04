import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RouteMapService, type RouteMapBatchRequest } from "@/lib/api/route-map";
import type { VyOSResponse } from "@/lib/types/api";

class RecordingRouteMap extends RouteMapService {
  calls: RouteMapBatchRequest[] = [];
  async batchConfigure(request: RouteMapBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true } as VyOSResponse;
  }
}

const opNames = (service: RecordingRouteMap) => service.calls[0].operations.map((o) => o.op);

describe("route-map GRE next-hop and non-transitive bandwidth (#976)", () => {
  it("emits both flags on a new rule", async () => {
    const service = new RecordingRouteMap();
    await service.addRule("RM", {
      rule_number: 10,
      action: "permit",
      match: {},
      set: {
        extcommunity_bandwidth: "100",
        extcommunity_bandwidth_non_transitive: true,
        l3vpn_nexthop_encapsulation_gre: true,
      },
    });
    const ops = opNames(service);
    assert.ok(ops.includes("set_extcommunity_bandwidth"));
    assert.ok(ops.includes("set_extcommunity_bandwidth_non_transitive"));
    assert.ok(ops.includes("set_l3vpn_nexthop_encapsulation_gre"));
  });

  it("drops non-transitive without a bandwidth, which VyOS rejects at commit", async () => {
    const service = new RecordingRouteMap();
    await service.addRule("RM", {
      rule_number: 10,
      action: "permit",
      match: {},
      set: { extcommunity_bandwidth_non_transitive: true },
    });
    assert.ok(!opNames(service).includes("set_extcommunity_bandwidth_non_transitive"));
  });

  it("omits both flags when they are off", async () => {
    const service = new RecordingRouteMap();
    await service.addRule("RM", { rule_number: 10, action: "permit", match: {}, set: { extcommunity_bandwidth: "100" } });
    const ops = opNames(service);
    assert.ok(!ops.includes("set_extcommunity_bandwidth_non_transitive"));
    assert.ok(!ops.includes("set_l3vpn_nexthop_encapsulation_gre"));
  });

  it("clears the L3VPN next-hop subtree before rewriting an edited rule", async () => {
    const service = new RecordingRouteMap();
    await service.updateRule("RM", 10, { action: "permit", match: {}, set: {} }, {});
    const ops = opNames(service);
    assert.ok(ops.includes("delete_set_l3vpn_nexthop"));
    assert.ok(ops.includes("delete_set_extcommunity"));
    assert.ok(!ops.includes("set_l3vpn_nexthop_encapsulation_gre"));
  });

  it("clears the L3VPN next-hop subtree when the route-map editor saves a rule", async () => {
    const service = new RecordingRouteMap();
    await service.updateRouteMap("RM", { name: "RM", rules: [] }, null, { action: "permit", match: {}, set: {} }, 10);
    assert.ok(opNames(service).includes("delete_set_l3vpn_nexthop"));
  });
});
