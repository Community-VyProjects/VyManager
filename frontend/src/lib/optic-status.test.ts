import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opticColumnLabel, opticDiagnosticsAvailable, opticReadError, opticSeverity, dashboardOpticSeverity } from "./optic-status";

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

  it("shows a read error instead of an unloaded row", () => {
    const ioError = {
      present: false,
      unsupported: false,
      transceiver: null,
      alarms: [],
      warnings: [],
      raw: "netlink error: Input/output error",
    };
    assert.equal(opticSeverity(ioError), "error");
    assert.equal(opticColumnLabel("error"), "Error");
    assert.equal(opticDiagnosticsAvailable("error"), true);
    assert.equal(opticReadError(ioError), "netlink error: Input/output error");
    assert.notEqual(opticColumnLabel(opticSeverity(ioError)), opticColumnLabel("unknown"));
  });

  it("leaves an unloaded row unlabeled and still openable", () => {
    assert.equal(opticSeverity(null), "unknown");
    assert.equal(opticSeverity(undefined), "unknown");
    assert.equal(opticColumnLabel("unknown"), null);
    assert.equal(opticDiagnosticsAvailable("unknown"), true);
  });

  it("grades dashboard copper from the unsupported flag, not raw text", () => {
    const sseCopper = {
      present: false,
      unsupported: true,
      transceiver: null,
      alarms: [] as string[],
      warnings: [] as string[],
    };
    assert.equal("raw" in sseCopper, false);
    assert.equal(dashboardOpticSeverity(sseCopper), "none");
    assert.equal(dashboardOpticSeverity({
      present: false,
      unsupported: false,
      transceiver: null,
      alarms: [],
      warnings: [],
    }), "absent");
    assert.equal(dashboardOpticSeverity({
      present: true,
      unsupported: false,
      transceiver: null,
      vendor: "Acme",
      alarms: [],
      warnings: [],
    }), "absent");
  });
});
