import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pppoeLockedName,
  pppoeModalIsEdit,
  pppoeWriteKind,
} from "./pppoe-modal-mode";

describe("pppoeModalIsEdit", () => {
  it("is false for create (null/undefined) and true when an interface is passed", () => {
    assert.equal(pppoeModalIsEdit(null), false);
    assert.equal(pppoeModalIsEdit(undefined), false);
    assert.equal(pppoeModalIsEdit({ name: "pppoe1" }), true);
  });
});

describe("pppoeLockedName", () => {
  it("uses the draft name on create and does not lock", () => {
    assert.deepEqual(pppoeLockedName(null, "pppoe0"), {
      value: "pppoe0",
      disabled: false,
    });
  });

  it("forces the existing name and locks the field on edit", () => {
    assert.deepEqual(pppoeLockedName({ name: "pppoe3" }, "pppoe0"), {
      value: "pppoe3",
      disabled: true,
    });
  });
});

describe("pppoeWriteKind", () => {
  it("creates when there is no existing interface", () => {
    assert.deepEqual(pppoeWriteKind(null), { kind: "create" });
  });

  it("updates the existing name on edit", () => {
    assert.deepEqual(pppoeWriteKind({ name: "pppoe3" }), {
      kind: "update",
      name: "pppoe3",
    });
  });
});
