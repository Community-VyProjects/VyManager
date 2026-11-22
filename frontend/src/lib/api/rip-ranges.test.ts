import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISTANCE_RANGE,
  METRIC_RANGE,
  TIMER_RANGE,
  inRange,
  overviewProblem,
} from "./rip-ranges.ts";

describe("rip ranges", () => {
  it("accepts empty values and plain integers inside the lab range", () => {
    assert.equal(inRange("", METRIC_RANGE), true);
    assert.equal(inRange("  ", METRIC_RANGE), true);
    assert.equal(inRange("1", METRIC_RANGE), true);
    assert.equal(inRange(" 16 ", METRIC_RANGE), true);
    assert.equal(inRange("255", DISTANCE_RANGE), true);
    assert.equal(inRange("2147483647", TIMER_RANGE), true);
  });

  it("rejects out-of-range values and number-input forms parseInt would truncate", () => {
    assert.equal(inRange("0", METRIC_RANGE), false);
    assert.equal(inRange("17", METRIC_RANGE), false);
    assert.equal(inRange("1e1", METRIC_RANGE), false);
    assert.equal(inRange("2.5", METRIC_RANGE), false);
    assert.equal(inRange("-1", METRIC_RANGE), false);
    assert.equal(inRange("256", DISTANCE_RANGE), false);
    assert.equal(inRange("4", TIMER_RANGE), false);
    assert.equal(inRange("2147483648", TIMER_RANGE), false);
    assert.equal(inRange("12345678901", TIMER_RANGE), false);
  });

  it("names the first overview problem", () => {
    assert.equal(overviewProblem("", "", ["", "", ""]), null);
    assert.equal(overviewProblem("0", "17", ["4"]), "distanceRange");
    assert.equal(overviewProblem("120", "17", ["4"]), "metricRange");
    assert.equal(overviewProblem("120", "1", ["30", "4", "120"]), "timerRange");
  });
});
