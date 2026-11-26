import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evpnRouteTypeLabel } from "./route-map-evpn";

describe("evpnRouteTypeLabel", () => {
  it("labels every named 1.4 and 1.5 route type", () => {
    assert.deepEqual(evpnRouteTypeLabel("ead"), { key: "evpn.routeTypeEad", alias: null });
    assert.deepEqual(evpnRouteTypeLabel("macip"), { key: "evpn.routeTypeMacip", alias: null });
    assert.deepEqual(evpnRouteTypeLabel("multicast"), { key: "evpn.routeTypeMulticast", alias: null });
    assert.deepEqual(evpnRouteTypeLabel("es"), { key: "evpn.routeTypeEs", alias: null });
    assert.deepEqual(evpnRouteTypeLabel("prefix"), { key: "evpn.routeTypePrefix", alias: null });
  });

  it("labels the 1.5 numeric aliases with their type's name and number", () => {
    assert.deepEqual(evpnRouteTypeLabel("1"), { key: "evpn.routeTypeEad", alias: "1" });
    assert.deepEqual(evpnRouteTypeLabel("2"), { key: "evpn.routeTypeMacip", alias: "2" });
    assert.deepEqual(evpnRouteTypeLabel("3"), { key: "evpn.routeTypeMulticast", alias: "3" });
    assert.deepEqual(evpnRouteTypeLabel("4"), { key: "evpn.routeTypeEs", alias: "4" });
    assert.deepEqual(evpnRouteTypeLabel("5"), { key: "evpn.routeTypePrefix", alias: "5" });
  });

  it("leaves an unknown value to show as itself", () => {
    for (const type of ["6", "0", "toString", "constructor"]) {
      assert.equal(evpnRouteTypeLabel(type), null, type);
    }
  });
});
