import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firewallActionSupported,
  firewallFeatureSupported,
} from "./firewall-capability-gates";

describe("firewallFeatureSupported", () => {
  it("reads features.bridged_traffic from the backend-shaped payload", () => {
    const caps = {
      features: { bridged_traffic: { supported: true } },
      version_notes: { has_bridged_traffic: true, has_timeouts: true },
    };
    assert.equal(firewallFeatureSupported(caps, "bridged_traffic"), true);
    assert.equal(firewallFeatureSupported(caps, "timeouts"), false);
  });

  it("ignores version_notes keys the UI used to read", () => {
    const caps = {
      version_notes: {
        is_v15_or_later: true,
        bridged_traffic_available: true,
        timeouts_available: true,
        full_support: true,
      },
    };
    assert.equal(firewallFeatureSupported(caps, "bridged_traffic"), false);
    assert.equal(firewallFeatureSupported(caps, "timeouts"), false);
    assert.equal(firewallFeatureSupported(caps, "protocol_matching"), false);
  });

  it("hides a feature when supported is false", () => {
    const caps = {
      features: { bridged_traffic: { supported: false, description: "x" } },
    };
    assert.equal(firewallFeatureSupported(caps, "bridged_traffic"), false);
  });
});

describe("firewallActionSupported", () => {
  it("uses supported_actions, not a version boolean", () => {
    const caps = { supported_actions: ["accept", "drop", "notrack"] };
    assert.equal(firewallActionSupported(caps, "notrack"), true);
    assert.equal(firewallActionSupported(caps, "queue"), false);
  });
});
