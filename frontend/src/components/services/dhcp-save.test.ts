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
    it(`${file} returns before close after every failedSaveMessage`, () => {
      const text = readFileSync(join(dir, file), "utf8");
      const guards: number[] = [];
      let from = 0;
      while (from < text.length) {
        const guard = text.indexOf("failedSaveMessage(", from);
        if (guard === -1) break;
        guards.push(guard);
        from = guard + 1;
      }
      assert.ok(guards.length >= 1, `${file} must call failedSaveMessage`);
      if (file === "RangeModal.tsx" || file === "StaticMappingModal.tsx" || file === "DHCPClientClassModal.tsx") {
        assert.ok(guards.length >= 2, `${file} must check both save paths`);
      }
      guards.forEach((guard, index) => {
        const windowEnd = guards[index + 1] ?? text.length;
        const slice = text.slice(guard, windowEnd);
        const stop = slice.indexOf("return;");
        assert.notEqual(stop, -1, `${file} check ${index + 1} must return`);
        const closes = ["handleClose(", "onSuccess(", "onOpenChange(false)"]
          .map((needle) => slice.indexOf(needle))
          .filter((at) => at !== -1);
        if (closes.length > 0) {
          assert.ok(stop < Math.min(...closes), `${file} check ${index + 1} must return before close`);
        }
      });
    });
  }
});
