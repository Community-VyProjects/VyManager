import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  afterLoginPath,
  isApplianceMode,
  postLoginPath,
  shouldRedirectToSites,
} from "./appliance";

describe("isApplianceMode", () => {
  it("is true only when appliance is true", () => {
    assert.equal(isApplianceMode({ appliance: true }), true);
    assert.equal(isApplianceMode({ appliance: false }), false);
    assert.equal(isApplianceMode({}), false);
    assert.equal(isApplianceMode(null), false);
  });
});

describe("afterLoginPath", () => {
  it("lands on dashboard in appliance even if from is /sites", () => {
    assert.equal(afterLoginPath("/sites", true), "/");
    assert.equal(afterLoginPath("", true), "/");
    assert.equal(afterLoginPath("/firewall/policies", true), "/firewall/policies");
  });

  it("keeps /sites as the VPS default", () => {
    assert.equal(afterLoginPath("/sites", false), "/sites");
    assert.equal(afterLoginPath("", false), "/sites");
    assert.equal(afterLoginPath("/firewall/policies", false), "/firewall/policies");
  });
});

describe("postLoginPath", () => {
  it("lands on dashboard in appliance and sites otherwise", () => {
    assert.equal(postLoginPath(true), "/");
    assert.equal(postLoginPath(false), "/sites");
  });
});

describe("shouldRedirectToSites", () => {
  it("does not bounce to /sites in appliance, including after a failed connect", () => {
    assert.equal(shouldRedirectToSites(true, false), false);
    assert.equal(shouldRedirectToSites(true, true), false);
    assert.equal(shouldRedirectToSites(false, false), true);
    assert.equal(shouldRedirectToSites(false, true), false);
  });
});
