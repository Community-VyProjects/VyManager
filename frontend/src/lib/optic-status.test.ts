import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opticColumnLabel, opticDiagnosticsAvailable, opticSeverity } from "./optic-status";

const copper = {
  present: true,
  transceiver: null,
  vendor: null,
  part_number: null,
  serial_number: null,
  measurements: {},
  alarms: [],
  warnings: [],
};

describe("opticSeverity", () => {
  it("does not call a copper or virtual port healthy", () => {
    assert.equal(opticSeverity(copper), "none");
    assert.equal(opticColumnLabel("none"), "N/A");
    assert.notEqual(opticColumnLabel(opticSeverity(copper)), "Healthy");
  });

  it("does not treat a missing module as a warning", () => {
    assert.equal(opticSeverity({ present: false, transceiver: null, alarms: [], warnings: [] }), "none");
    assert.equal(opticSeverity({ present: false, transceiver: "not present", alarms: [], warnings: ["Rx power low"] }), "none");
  });

  it("grades a parsed fiber module", () => {
    const sfp = {
      present: true,
      transceiver: "SFP+",
      alarms: [] as string[],
      warnings: [] as string[],
      measurements: { tx_power: { value: "-2.1 dBm" } },
    };
    assert.equal(opticSeverity(sfp), "ok");
    assert.equal(opticColumnLabel("ok"), "Healthy");
    assert.equal(opticSeverity({ ...sfp, warnings: ["Rx power low"] }), "warning");
    assert.equal(opticSeverity({ ...sfp, alarms: ["Tx power high"] }), "alarm");
  });

  it("hides diagnostics when there is no optical module", () => {
    assert.equal(opticDiagnosticsAvailable(opticSeverity(copper)), false);
    assert.equal(opticDiagnosticsAvailable("none"), false);
    assert.equal(opticDiagnosticsAvailable("ok"), true);
    assert.equal(opticDiagnosticsAvailable("warning"), true);
    assert.equal(opticDiagnosticsAvailable("alarm"), true);
    assert.equal(opticDiagnosticsAvailable("unknown"), true);
  });

  it("leaves an unloaded row unlabeled", () => {
    assert.equal(opticSeverity(null), "unknown");
    assert.equal(opticSeverity(undefined), "unknown");
    assert.equal(opticColumnLabel("unknown"), null);
  });
});
