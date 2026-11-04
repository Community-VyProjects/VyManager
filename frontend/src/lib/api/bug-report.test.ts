import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { browserDiagnostics, DIAGNOSTIC_LIMITS } from "./bug-report";

describe("DIAGNOSTIC_LIMITS", () => {
  it("matches the Diagnostics model in backend/routers/bug_report/bug_report.py", () => {
    // Pinned as numbers, not read from the constant: raising one here without
    // the backend model turns long values into a 422. Change both together;
    // backend/tests/test_bug_report_field_limits.py checks the other side.
    assert.deepEqual(DIAGNOSTIC_LIMITS, { browser: 1024, page: 2048 });
  });
});

describe("browserDiagnostics", () => {
  it("passes short values through", () => {
    assert.deepEqual(browserDiagnostics("Mozilla/5.0", "/firewall"), {
      browser: "Mozilla/5.0",
      page: "/firewall",
    });
  });

  it("clips the user agent and path to the backend limits", () => {
    const result = browserDiagnostics("u".repeat(5000), "/" + "p".repeat(5000));
    assert.equal(result.browser, "u".repeat(1024));
    assert.equal(result.page, "/" + "p".repeat(2047));
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
