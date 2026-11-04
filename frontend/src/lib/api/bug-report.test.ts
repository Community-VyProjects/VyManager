import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { browserDiagnostics, DIAGNOSTIC_LIMITS } from "./bug-report";

describe("browserDiagnostics", () => {
  it("passes short values through", () => {
    assert.deepEqual(browserDiagnostics("Mozilla/5.0", "/firewall"), {
      browser: "Mozilla/5.0",
      page: "/firewall",
    });
  });

  it("clips the user agent and path to the backend limits", () => {
    const result = browserDiagnostics("u".repeat(5000), "/" + "p".repeat(5000));
    assert.equal(result.browser, "u".repeat(DIAGNOSTIC_LIMITS.browser));
    assert.equal(result.page, ("/" + "p".repeat(5000)).slice(0, DIAGNOSTIC_LIMITS.page));
  });

  it("keeps values that are exactly at the limit", () => {
    const browser = "u".repeat(DIAGNOSTIC_LIMITS.browser);
    const page = "p".repeat(DIAGNOSTIC_LIMITS.page);
    assert.deepEqual(browserDiagnostics(browser, page), { browser, page });
  });

  it("leaves missing values missing", () => {
    assert.deepEqual(browserDiagnostics(undefined, undefined), { browser: undefined, page: undefined });
  });
});
