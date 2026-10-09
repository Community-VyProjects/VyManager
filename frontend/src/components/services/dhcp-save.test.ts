import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { failedSaveMessage } from "./dhcp-save";

const dir = dirname(fileURLToPath(import.meta.url));

const modals = [
  "RangeModal.tsx",
  "StaticMappingModal.tsx",
  "CreateDHCPServerModal.tsx",
  "EditDHCPServerModal.tsx",
  "DHCPNetworkOptionsModal.tsx",
  "DHCPClientClassModal.tsx",
  "DHCPServerSettingsModal.tsx",
];

describe("failedSaveMessage", () => {
  it("keeps the modal open when the commit returns success false", () => {
    assert.equal(failedSaveMessage({ success: false, error: "commit failed" }, "Failed to save range"), "commit failed");
    assert.equal(failedSaveMessage({ success: false }, "Failed to save range"), "Failed to save range");
  });

  it("closes the modal when the commit succeeded or nothing was sent", () => {
    assert.equal(failedSaveMessage({ success: true }, "Failed to save range"), null);
    assert.equal(failedSaveMessage(null, "Failed to save range"), null);
  });

  for (const file of modals) {
    it(`${file} returns the failed-save message before it closes`, () => {
      const text = readFileSync(join(dir, file), "utf8");
      const guard = text.indexOf("failedSaveMessage(");
      assert.notEqual(guard, -1, `${file} must call failedSaveMessage`);
      const stop = text.indexOf("return;", guard);
      const closeAt = ["handleClose(", "onSuccess(", "onOpenChange(false)"]
        .map((needle) => text.indexOf(needle, guard))
        .filter((at) => at !== -1);
      assert.notEqual(stop, -1);
      assert.ok(closeAt.length > 0, `${file} must close after a successful save`);
      assert.ok(stop < Math.min(...closeAt), `${file} must return before close when the save failed`);
    });
  }
});
