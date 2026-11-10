import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sstpcLockedName,
  sstpcModalIsEdit,
  sstpcWriteKind,
} from "./sstpc-modal-mode";

describe("sstpcModalIsEdit", () => {
  it("is false for create (null/undefined) and true when an interface is passed", () => {
    assert.equal(sstpcModalIsEdit(null), false);
    assert.equal(sstpcModalIsEdit(undefined), false);
    assert.equal(sstpcModalIsEdit({ name: "sstpc1" }), true);
  });
});

describe("sstpcLockedName", () => {
  it("uses the draft name on create and does not lock", () => {
    assert.deepEqual(sstpcLockedName(null, "sstpc0"), {
      value: "sstpc0",
      disabled: false,
    });
  });

  it("forces the existing name and locks the field on edit", () => {
    assert.deepEqual(sstpcLockedName({ name: "sstpc3" }, "sstpc0"), {
      value: "sstpc3",
      disabled: true,
    });
  });
});

describe("sstpcWriteKind", () => {
  it("creates when there is no existing interface", () => {
    assert.deepEqual(sstpcWriteKind(null), { kind: "create" });
  });

  it("updates the existing name on edit", () => {
    assert.deepEqual(sstpcWriteKind({ name: "sstpc3" }), {
      kind: "update",
      name: "sstpc3",
    });
  });
});
