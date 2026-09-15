import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  afterLoginPath,
  hideSiteInventory,
  isApplianceMode,
  isProtectedStackContainer,
  isProtectedStackImage,
  isProtectedStackNetwork,
  isProtectedStackVolumePath,
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

  it("defaults to dashboard when mode is unknown", () => {
    assert.equal(afterLoginPath("/sites", null), "/");
    assert.equal(afterLoginPath("", null), "/");
    assert.equal(afterLoginPath("/firewall/policies", null), "/firewall/policies");
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

describe("hideSiteInventory", () => {
  it("hides inventory only in appliance", () => {
    assert.equal(hideSiteInventory(true), true);
    assert.equal(hideSiteInventory(false), false);
  });
});

describe("appliance stack protection", () => {
  it("protects vymanager-* containers only in appliance", () => {
    assert.equal(isProtectedStackContainer(true, "vymanager-backend"), true);
    assert.equal(isProtectedStackContainer(true, "vymanager-frontend"), true);
    assert.equal(isProtectedStackContainer(true, "vymanager-postgres"), true);
    assert.equal(isProtectedStackContainer(true, "adguard"), false);
    assert.equal(isProtectedStackContainer(false, "vymanager-backend"), false);
  });

  it("protects the vymanager network only in appliance", () => {
    assert.equal(isProtectedStackNetwork(true, "vymanager"), true);
    assert.equal(isProtectedStackNetwork(true, "lan"), false);
    assert.equal(isProtectedStackNetwork(false, "vymanager"), false);
  });

  it("protects stack volume paths only in appliance", () => {
    assert.equal(isProtectedStackVolumePath(true, "/config/containers/vymanager-postgres"), true);
    assert.equal(isProtectedStackVolumePath(true, "/config/containers/vymanager-postgres/data"), true);
    assert.equal(isProtectedStackVolumePath(true, "/config/containers/adguard"), false);
    assert.equal(isProtectedStackVolumePath(false, "/config/containers/vymanager-postgres"), false);
  });

  it("protects stack image refs only in appliance", () => {
    assert.equal(
      isProtectedStackImage(true, "ghcr.io/community-vyprojects/vymanager-backend:beta"),
      true,
    );
    assert.equal(isProtectedStackImage(true, "postgres:16-alpine"), false);
    assert.equal(
      isProtectedStackImage(false, "ghcr.io/community-vyprojects/vymanager-backend:beta"),
      false,
    );
  });
});
