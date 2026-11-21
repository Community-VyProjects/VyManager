import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scheduleRequest } from "./power-schedule";

describe("scheduleRequest", () => {
  it("sends now without a value", () => {
    assert.deepEqual(scheduleRequest("now", "19:30", "5"), { request: { action: "now" } });
  });

  it("sends a trimmed HH:MM for at", () => {
    for (const value of ["19:30", "0:00", "9:5", "23:59"]) {
      assert.deepEqual(scheduleRequest("at", ` ${value} `, ""), {
        request: { action: "at", value },
      });
    }
  });

  it("asks for a time when at is blank", () => {
    assert.deepEqual(scheduleRequest("at", "  ", ""), { problem: "enterTime" });
  });

  it("rejects an at value the backend returns 400 for", () => {
    for (const value of ["1930", "24:00", "19:60", "1\u0665:30", "19:30 date 01/01/2030", "7pm"]) {
      assert.deepEqual(scheduleRequest("at", value, ""), { problem: "invalidTime" }, value);
    }
  });

  it("sends a trimmed minute count without leading zeros for in", () => {
    for (const [raw, value] of [["5", "5"], ["05", "5"], ["1440", "1440"], ["9999999", "9999999"]]) {
      assert.deepEqual(scheduleRequest("in", "", ` ${raw} `), {
        request: { action: "in", value },
      });
    }
  });

  it("asks for minutes when in is blank", () => {
    assert.deepEqual(scheduleRequest("in", "", ""), { problem: "enterMinutes" });
  });

  it("rejects an in value the backend returns 400 for", () => {
    for (const value of ["0", "00", "-5", "1.5", "1e3", "five", "\u0665", "10000000", "1".repeat(5000)]) {
      assert.deepEqual(scheduleRequest("in", "", value), { problem: "invalidMinutes" }, value);
    }
  });
});
