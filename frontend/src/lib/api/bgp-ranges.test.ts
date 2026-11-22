import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalPrefix,
  firstRangeProblem,
  isNeighborAddress,
  NEIGHBOR_AF_RANGES,
  NEIGHBOR_RANGES,
  OVERVIEW_RANGES,
  PEER_GROUP_RANGES,
  sameNeighborAddress,
} from "./bgp-ranges.ts";

const EMPTY = {
  ebgpMultihop: "",
  ttlSecurityHops: "",
  port: "",
  advertisementInterval: "",
  connect: "",
  keepalive: "",
  holdtime: "",
  bfdHoldTime: "",
};

describe("BGP ranges", () => {
  it("accepts empty values and the lab bounds", () => {
    assert.equal(firstRangeProblem(EMPTY, NEIGHBOR_RANGES), null);
    assert.equal(
      firstRangeProblem(
        {
          ebgpMultihop: "255",
          ttlSecurityHops: "1",
          port: "65535",
          advertisementInterval: "0",
          connect: "0",
          keepalive: "1",
          holdtime: "0",
          bfdHoldTime: "4294967295",
        },
        NEIGHBOR_RANGES,
      ),
      null,
    );
  });

  it("rejects values outside the lab range or that are not whole numbers", () => {
    assert.equal(firstRangeProblem({ ...EMPTY, ebgpMultihop: "256" }, NEIGHBOR_RANGES)?.field, "ebgpMultihop");
    assert.equal(firstRangeProblem({ ...EMPTY, ttlSecurityHops: "255" }, NEIGHBOR_RANGES)?.field, "ttlSecurityHops");
    assert.equal(firstRangeProblem({ ...EMPTY, port: "0" }, NEIGHBOR_RANGES)?.field, "port");
    assert.equal(firstRangeProblem({ ...EMPTY, advertisementInterval: "601" }, NEIGHBOR_RANGES)?.field, "advertisementInterval");
    assert.equal(firstRangeProblem({ ...EMPTY, keepalive: "0" }, NEIGHBOR_RANGES)?.field, "keepalive");
    assert.equal(firstRangeProblem({ ...EMPTY, holdtime: "1e3" }, NEIGHBOR_RANGES)?.field, "holdtime");
    assert.equal(firstRangeProblem({ ...EMPTY, bfdHoldTime: "0" }, NEIGHBOR_RANGES)?.field, "bfdHoldTime");
    assert.deepEqual(firstRangeProblem({ ...EMPTY, connect: "-1" }, NEIGHBOR_RANGES)?.range, { min: 0, max: 65535 });
    assert.equal(
      firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "1.5" }, PEER_GROUP_RANGES)?.field,
      "bfdHoldTime",
    );
    assert.equal(firstRangeProblem({ keepalive: "65536", holdtime: "" }, OVERVIEW_RANGES)?.field, "keepalive");
  });

  it("checks the neighbor address-family numbers", () => {
    assert.equal(firstRangeProblem({ maximumPrefix: "1", allowasIn: "10", weight: "65535" }, NEIGHBOR_AF_RANGES), null);
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "11", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "allowasIn");
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "", weight: "0" }, NEIGHBOR_AF_RANGES)?.field, "weight");
    assert.equal(firstRangeProblem({ maximumPrefix: "NaN", allowasIn: "", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "maximumPrefix");
  });

  it("accepts only addresses the lab ipaddrcheck accepts", () => {
    assert.equal(isNeighborAddress("192.0.2.1"), true);
    assert.equal(isNeighborAddress("2001:db8::1"), true);
    assert.equal(isNeighborAddress("192.0.2.01"), false);
    assert.equal(isNeighborAddress("fe80::1%eth0"), false);
    assert.equal(isNeighborAddress("foo.bar"), false);
    assert.equal(isNeighborAddress("eth0"), false);
  });

  it("treats other spellings of one address or prefix as the same", () => {
    assert.equal(sameNeighborAddress("2001:DB8::1", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress("2001:db8:0::1", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress("2001:0db8::0001", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress(" 192.0.2.1 ", "192.0.2.1"), true);
    assert.equal(sameNeighborAddress("192.0.2.1", "192.0.2.2"), false);
    assert.equal(canonicalPrefix("2001:DB8:0::/32"), canonicalPrefix("2001:db8::/32"));
    assert.notEqual(canonicalPrefix("10.0.0.0/24"), canonicalPrefix("10.0.0.0/25"));
  });
});
