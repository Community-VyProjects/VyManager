import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { failedSaveMessage } from "./dhcp-save";

describe("failedSaveMessage", () => {
  it("keeps the modal open when the commit returns success false", () => {
    assert.equal(failedSaveMessage({ success: false, error: "commit failed" }, "Failed to save range"), "commit failed");
    assert.equal(failedSaveMessage({ success: false }, "Failed to save range"), "Failed to save range");
  });

  it("closes the modal when the commit succeeded or nothing was sent", () => {
    assert.equal(failedSaveMessage({ success: true }, "Failed to save range"), null);
    assert.equal(failedSaveMessage(null, "Failed to save range"), null);
  });
});
