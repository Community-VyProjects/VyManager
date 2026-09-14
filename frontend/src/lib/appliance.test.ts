import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isApplianceMode, postLoginPath } from "./appliance";

describe("isApplianceMode", () => {
  it("is true only when appliance is true", () => {
    assert.equal(isApplianceMode({ appliance: true }), true);
    assert.equal(isApplianceMode({ appliance: false }), false);
    assert.equal(isApplianceMode({}), false);
    assert.equal(isApplianceMode(null), false);
  });
});

describe("postLoginPath", () => {
  it("lands on dashboard in appliance and sites otherwise", () => {
    assert.equal(postLoginPath(true), "/");
    assert.equal(postLoginPath(false), "/sites");
  });
});
