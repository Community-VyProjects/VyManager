import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commitConfirmActionKey,
  commitConfirmRebootWarns,
  commitConfirmStarter,
  commitConfirmWarnsBeforeArming,
} from "./commit-confirm-banner";

describe("commit-confirm banner", () => {
  it("names the router's action, reboot when the router sets none", () => {
    assert.equal(commitConfirmActionKey("reload"), "actionReload");
    assert.equal(commitConfirmActionKey("reboot"), "actionReboot");
    assert.equal(commitConfirmActionKey(undefined), "actionReboot");
    assert.equal(commitConfirmActionKey(null), "actionReboot");
    assert.equal(commitConfirmActionKey("something-new"), null);
  });

  it("treats only a reboot revert as losing unsaved changes", () => {
    assert.equal(commitConfirmRebootWarns("reboot"), true);
    assert.equal(commitConfirmRebootWarns(null), true);
    assert.equal(commitConfirmRebootWarns("reload"), false);
  });

  it("warns before arming only when this instance arms a reboot-action timer", () => {
    assert.equal(commitConfirmWarnsBeforeArming({ active: false, enabled: true, action: "reboot" }), true);
    assert.equal(commitConfirmWarnsBeforeArming({ active: false, enabled: true, action: null }), true);
    assert.equal(commitConfirmWarnsBeforeArming({ active: false, enabled: true, action: "reload" }), false);
    assert.equal(commitConfirmWarnsBeforeArming({ active: false, enabled: false, action: "reboot" }), false);
    assert.equal(commitConfirmWarnsBeforeArming({ active: true, enabled: true, action: "reboot" }), false);
    assert.equal(commitConfirmWarnsBeforeArming(null), false);
  });

  it("shows the starter's name, or an anonymous starter from another organization", () => {
    assert.deepEqual(
      commitConfirmStarter({ active: true, started_by_known: true, started_by_name: "Alice" }),
      { key: "startedBy", name: "Alice" },
    );
    assert.deepEqual(
      commitConfirmStarter({ active: true, started_by_known: true, started_by_name: null }),
      { key: "startedByOther" },
    );
    assert.equal(commitConfirmStarter({ active: true }), null);
  });
});
