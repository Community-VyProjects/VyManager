import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { neighborRangeProblem, sameNeighborAddress } from "./bgp-ranges.ts";

const EMPTY = {
  ebgpMultihop: "",
  ttlSecurityHops: "",
  port: "",
  advertisementInterval: "",
  connect: "",
  keepalive: "",
  holdtime: "",
};

describe("BGP neighbor ranges", () => {
  it("accepts empty values and the lab bounds", () => {
    assert.equal(neighborRangeProblem(EMPTY), null);
    assert.equal(
      neighborRangeProblem({
        ebgpMultihop: "255",
        ttlSecurityHops: "1",
        port: "65535",
        advertisementInterval: "0",
        connect: "0",
        keepalive: "1",
        holdtime: "0",
      }),
      null,
    );
  });

  it("rejects values outside the lab range or that are not whole numbers", () => {
    assert.equal(neighborRangeProblem({ ...EMPTY, ebgpMultihop: "256" })?.field, "ebgpMultihop");
    assert.equal(neighborRangeProblem({ ...EMPTY, ttlSecurityHops: "255" })?.field, "ttlSecurityHops");
    assert.equal(neighborRangeProblem({ ...EMPTY, port: "0" })?.field, "port");
    assert.equal(neighborRangeProblem({ ...EMPTY, advertisementInterval: "601" })?.field, "advertisementInterval");
    assert.equal(neighborRangeProblem({ ...EMPTY, keepalive: "0" })?.field, "keepalive");
    assert.equal(neighborRangeProblem({ ...EMPTY, holdtime: "1e3" })?.field, "holdtime");
    assert.deepEqual(neighborRangeProblem({ ...EMPTY, connect: "-1" })?.range, { min: 0, max: 65535 });
  });

  it("treats IPv6 case variants as the same neighbor", () => {
    assert.equal(sameNeighborAddress("2001:DB8::1", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress(" 192.0.2.1 ", "192.0.2.1"), true);
    assert.equal(sameNeighborAddress("192.0.2.1", "192.0.2.2"), false);
  });
});
