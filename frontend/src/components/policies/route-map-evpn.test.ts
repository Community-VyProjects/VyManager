import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evpnRouteTypeLabelKey } from "./route-map-evpn";

describe("evpnRouteTypeLabelKey", () => {
  it("labels every named 1.4 and 1.5 route type", () => {
    assert.equal(evpnRouteTypeLabelKey("ead"), "evpn.routeTypeEad");
    assert.equal(evpnRouteTypeLabelKey("macip"), "evpn.routeTypeMacip");
    assert.equal(evpnRouteTypeLabelKey("multicast"), "evpn.routeTypeMulticast");
    assert.equal(evpnRouteTypeLabelKey("es"), "evpn.routeTypeEs");
    assert.equal(evpnRouteTypeLabelKey("prefix"), "evpn.routeTypePrefix");
  });

  it("leaves numbered types and unknown names to the numbered label", () => {
    for (const type of ["1", "5", "toString", "constructor"]) {
      assert.equal(evpnRouteTypeLabelKey(type), null, type);
    }
  });
});
