import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RouteMapService,
  type RouteMapBatchRequest,
} from "@/lib/api/route-map";
import type { VyOSResponse } from "@/lib/types/api";
import {
  emptyEvpnMatchDraft,
  emptyEvpnSetDraft,
  evpnMatchDraftFrom,
  evpnMatchFields,
  evpnSetDraftFrom,
  evpnSetFields,
} from "./route-map-evpn";

class RecordingRouteMap extends RouteMapService {
  calls: RouteMapBatchRequest[] = [];
  async batchConfigure(request: RouteMapBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true } as VyOSResponse;
  }
}

describe("route-map EVPN draft", () => {
  it("omits every field when the draft is empty", () => {
    assert.deepEqual(evpnMatchFields(emptyEvpnMatchDraft()), {});
    assert.deepEqual(evpnSetFields(emptyEvpnSetDraft()), {});
  });

  it("round-trips stored fields", () => {
    const match = { evpn_default_route: true, evpn_rd: "65000:100", evpn_route_type: "macip", evpn_vni: 1 };
    assert.deepEqual(evpnMatchFields(evpnMatchDraftFrom(match)), match);
    const set = { evpn_gateway_ipv4: "192.0.2.1", evpn_gateway_ipv6: "2001:db8::1" };
    assert.deepEqual(evpnSetFields(evpnSetDraftFrom(set)), set);
  });

  it("trims text and drops a non-numeric VNI", () => {
    assert.deepEqual(
      evpnMatchFields({ defaultRoute: false, rd: "  65000:1 ", routeType: "", vni: "abc" }),
      { evpn_rd: "65000:1" },
    );
    assert.deepEqual(evpnSetFields({ gatewayIpv4: " 192.0.2.1 ", gatewayIpv6: "  " }), {
      evpn_gateway_ipv4: "192.0.2.1",
    });
  });
});

describe("route-map EVPN ops", () => {
  it("adds every EVPN leaf on a new rule", async () => {
    const service = new RecordingRouteMap();
    await service.addRule("RM", {
      rule_number: 10,
      action: "permit",
      match: { evpn_default_route: true, evpn_rd: "65000:100", evpn_route_type: "prefix", evpn_vni: 100 },
      set: { evpn_gateway_ipv4: "192.0.2.1", evpn_gateway_ipv6: "2001:db8::1" },
    });
    const ops = service.calls[0].operations;
    for (const expected of [
      { op: "set_match_evpn_default_route" },
      { op: "set_match_evpn_rd", value: "65000:100" },
      { op: "set_match_evpn_route_type", value: "prefix" },
      { op: "set_match_evpn_vni", value: "100" },
      { op: "set_evpn_gateway_ipv4", value: "192.0.2.1" },
      { op: "set_evpn_gateway_ipv6", value: "2001:db8::1" },
    ]) {
      assert.ok(ops.some((o) => o.op === expected.op && o.value === expected.value), expected.op);
    }
  });

  it("clears EVPN subtrees before rewriting an edited rule", async () => {
    const service = new RecordingRouteMap();
    await service.updateRule("RM", 10, { action: "permit", match: {}, set: {} }, {});
    const ops = service.calls[0].operations.map((o) => o.op);
    assert.ok(ops.includes("delete_match_evpn"));
    assert.ok(ops.includes("delete_set_evpn"));
    assert.ok(!ops.some((op) => op.startsWith("set_match_evpn") || op.startsWith("set_evpn")));
  });
});
