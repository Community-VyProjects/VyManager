import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "./modal-mode";

describe("modalIsEdit", () => {
  it("is false for create (null/undefined) and true when a record is passed", () => {
    assert.equal(modalIsEdit(null), false);
    assert.equal(modalIsEdit(undefined), false);
    assert.equal(modalIsEdit({ name: "tun0" }), true);
  });
});

describe("lockedIdentity", () => {
  it("uses the draft value on create and does not lock", () => {
    assert.deepEqual(
      lockedIdentity(null, (r: { name: string }) => r.name, "tun0"),
      { value: "tun0", disabled: false },
    );
  });

  it("forces the stored value and locks the field on edit", () => {
    assert.deepEqual(
      lockedIdentity({ name: "tun3" }, (r) => r.name, "tun0"),
      { value: "tun3", disabled: true },
    );
  });

  it("locks a second identity field read off the same record", () => {
    assert.deepEqual(
      lockedIdentity({ encapsulation: "gre" }, (r) => r.encapsulation, "ipip"),
      { value: "gre", disabled: true },
    );
  });

  it("renders a null stored value as empty and still locks", () => {
    assert.deepEqual(
      lockedIdentity({ encapsulation: null }, (r) => r.encapsulation, "gre"),
      { value: "", disabled: true },
    );
  });
});

describe("modalWriteKind", () => {
  it("creates when there is no existing record", () => {
    assert.deepEqual(modalWriteKind(null), { kind: "create" });
  });

  it("updates the stored name on edit", () => {
    assert.deepEqual(modalWriteKind({ name: "tun3" }), {
      kind: "update",
      name: "tun3",
    });
  });
});
