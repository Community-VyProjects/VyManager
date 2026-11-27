import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commitConfirmActionKey,
  commitConfirmRebootWarns,
  commitConfirmStarter,
} from "./commit-confirm-banner";

describe("commit-confirm banner", () => {
  it("names the router's action, reboot when the router sets none", () => {
    assert.equal(commitConfirmActionKey("reload"), "actionReload");
    assert.equal(commitConfirmActionKey("reboot"), "actionReboot");
    assert.equal(commitConfirmActionKey(undefined), "actionReboot");
    assert.equal(commitConfirmActionKey(null), "actionReboot");
    assert.equal(commitConfirmActionKey("something-new"), null);
  });

  it("warns that unsaved changes are lost only when the router reboots", () => {
    assert.equal(commitConfirmRebootWarns("reboot"), true);
    assert.equal(commitConfirmRebootWarns(null), true);
    assert.equal(commitConfirmRebootWarns("reload"), false);
  });

  it("shows the starter's name, or an anonymous starter from another organization", () => {
    assert.deepEqual(
      commitConfirmStarter({ active: true, started_by_id: "u1", started_by_name: "Alice" }),
      { key: "startedBy", name: "Alice" },
    );
    assert.deepEqual(
      commitConfirmStarter({ active: true, started_by_id: "u2", started_by_name: null }),
      { key: "startedByOther" },
    );
    assert.equal(commitConfirmStarter({ active: true }), null);
  });
});
