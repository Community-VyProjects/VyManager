import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BMP_MIRROR_BUFFER_RANGE,
  BMP_TARGET_RANGES,
  canonicalPrefix,
  firstRangeProblem,
  inRange,
  isIPv4Address,
  isNeighborAddress,
  NEIGHBOR_AF_RANGES,
  NEIGHBOR_RANGES,
  numberText,
  OVERVIEW_RANGES,
  PARAMETERS_RANGES,
  PEER_GROUP_RANGES,
  REDISTRIBUTE_METRIC_RANGE,
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
  localAs: "",
};

const EMPTY_PARAMS = {
  defaultLocalPref: "",
  inputQueueLimit: "",
  outputQueueLimit: "",
  updateDelayEstablishWait: "",
  updateDelayMaxDelay: "",
  distanceExternal: "",
  distanceInternal: "",
  distanceLocal: "",
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
          localAs: "4294967294",
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
    assert.equal(firstRangeProblem({ ...EMPTY, localAs: "4294967295" }, NEIGHBOR_RANGES)?.field, "localAs");
    assert.deepEqual(firstRangeProblem({ ...EMPTY, connect: "-1" }, NEIGHBOR_RANGES)?.range, { min: 0, max: 65535 });
    assert.equal(
      firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "1.5", localAs: "" }, PEER_GROUP_RANGES)?.field,
      "bfdHoldTime",
    );
    assert.equal(
      firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "", localAs: "0" }, PEER_GROUP_RANGES)?.field,
      "localAs",
    );
    assert.equal(firstRangeProblem({ systemAs: "", keepalive: "65536", holdtime: "" }, OVERVIEW_RANGES)?.field, "keepalive");
    assert.equal(firstRangeProblem({ systemAs: "4294967295", keepalive: "", holdtime: "" }, OVERVIEW_RANGES)?.field, "systemAs");
  });

  it("checks the neighbor address-family numbers", () => {
    assert.equal(firstRangeProblem({ maximumPrefix: "1", allowasIn: "10", weight: "65535" }, NEIGHBOR_AF_RANGES), null);
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "11", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "allowasIn");
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "", weight: "0" }, NEIGHBOR_AF_RANGES)?.field, "weight");
    assert.equal(firstRangeProblem({ maximumPrefix: "NaN", allowasIn: "", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "maximumPrefix");
  });

  it("checks the page parameters, redistribute metric and BMP numbers", () => {
    assert.equal(firstRangeProblem(EMPTY_PARAMS, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, defaultLocalPref: "0" }, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, distanceInternal: "256" }, PARAMETERS_RANGES)?.field, "distanceInternal");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, inputQueueLimit: "0" }, PARAMETERS_RANGES)?.field, "inputQueueLimit");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, updateDelayEstablishWait: "3601" }, PARAMETERS_RANGES)?.field, "updateDelayEstablishWait");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, updateDelayMaxDelay: "0" }, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, distanceLocal: numberText(1.5) }, PARAMETERS_RANGES)?.field, "distanceLocal");
    assert.equal(numberText(null), "");
    assert.equal(inRange("0", REDISTRIBUTE_METRIC_RANGE), false);
    assert.equal(inRange("4294967295", REDISTRIBUTE_METRIC_RANGE), true);
    assert.equal(inRange("4294967295", BMP_MIRROR_BUFFER_RANGE), false);
    assert.equal(firstRangeProblem({ port: "", minRetry: "99", maxRetry: "" }, BMP_TARGET_RANGES)?.field, "minRetry");
    assert.equal(firstRangeProblem({ port: "", minRetry: "", maxRetry: "4294967295" }, BMP_TARGET_RANGES), null);
    assert.equal(firstRangeProblem({ port: "65536", minRetry: "", maxRetry: "" }, BMP_TARGET_RANGES)?.field, "port");
  });

  it("accepts only addresses the lab ipaddrcheck accepts", () => {
    assert.equal(isNeighborAddress("192.0.2.1"), true);
    assert.equal(isNeighborAddress("2001:db8::1"), true);
    assert.equal(isNeighborAddress("192.0.2.01"), false);
    assert.equal(isNeighborAddress("fe80::1%eth0"), false);
    assert.equal(isNeighborAddress("foo.bar"), false);
    assert.equal(isNeighborAddress("eth0"), false);
    assert.equal(isIPv4Address("10.0.0.1"), true);
    assert.equal(isIPv4Address("10.0.0.01"), false);
    assert.equal(isIPv4Address("2001:db8::1"), false);
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
