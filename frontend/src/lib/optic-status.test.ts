import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opticColumnLabel, opticDiagnosticsAvailable, opticSeverity } from "./optic-status";

const copper = {
  present: false,
  unsupported: true,
  transceiver: null,
  vendor: null,
  part_number: null,
  serial_number: null,
  measurements: {},
  alarms: [],
  warnings: [],
  raw: "netlink error: Operation not supported",
};

const emptyCage = {
  present: false,
  unsupported: false,
  transceiver: null,
  alarms: [],
  warnings: [],
  raw: "Transceiver: not present",
};

describe("opticSeverity", () => {
  it("does not call a copper or virtual port healthy", () => {
    assert.equal(opticSeverity(copper), "none");
    assert.equal(opticColumnLabel("none"), "N/A");
    assert.notEqual(opticColumnLabel(opticSeverity(copper)), "Healthy");
    assert.equal(opticDiagnosticsAvailable(opticSeverity(copper)), false);
  });

  it("keeps a pulled module as a warning with diagnostics", () => {
    assert.equal(opticSeverity(emptyCage), "absent");
    assert.equal(opticColumnLabel("absent"), "Warning");
    assert.equal(opticDiagnosticsAvailable("absent"), true);
    assert.notEqual(opticColumnLabel(opticSeverity(emptyCage)), opticColumnLabel(opticSeverity(copper)));
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
    assert.equal(opticDiagnosticsAvailable("ok"), true);
    assert.equal(opticDiagnosticsAvailable("warning"), true);
    assert.equal(opticDiagnosticsAvailable("alarm"), true);
  });

  it("leaves an unloaded row unlabeled and still openable", () => {
    assert.equal(opticSeverity(null), "unknown");
    assert.equal(opticSeverity(undefined), "unknown");
    assert.equal(opticColumnLabel("unknown"), null);
    assert.equal(opticDiagnosticsAvailable("unknown"), true);
  });
});
