import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  openvpnLockedName,
  openvpnModalIsEdit,
  openvpnWriteKind,
} from "./openvpn-modal-mode";

describe("openvpnModalIsEdit", () => {
  it("is false for create (null/undefined) and true when an interface is passed", () => {
    assert.equal(openvpnModalIsEdit(null), false);
    assert.equal(openvpnModalIsEdit(undefined), false);
    assert.equal(openvpnModalIsEdit({ name: "vtun1" }), true);
  });
});

describe("openvpnLockedName", () => {
  it("uses the draft name on create and does not lock", () => {
    assert.deepEqual(openvpnLockedName(null, "vtun0"), {
      value: "vtun0",
      disabled: false,
    });
  });

  it("forces the existing name and locks the field on edit", () => {
    assert.deepEqual(openvpnLockedName({ name: "vtun3" }, "vtun0"), {
      value: "vtun3",
      disabled: true,
    });
  });
});

describe("openvpnWriteKind", () => {
  it("creates when there is no existing interface", () => {
    assert.deepEqual(openvpnWriteKind(null), { kind: "create" });
  });

  it("updates the existing name on edit", () => {
    assert.deepEqual(openvpnWriteKind({ name: "vtun3" }), {
      kind: "update",
      name: "vtun3",
    });
  });
});
