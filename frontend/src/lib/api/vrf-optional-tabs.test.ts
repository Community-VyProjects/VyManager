import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { vrfOptionalTabs, type VrfCapabilities } from "./vrf";

type Features = VrfCapabilities["features"];
const GATED = { rpki: "rpki", failover: "failover", dhcp: "dhcp_server", dhcpv6: "dhcpv6_server" } as const;

function features(on: (keyof Features)[]): Features {
  const leaf = (k: keyof Features) => ({ supported: on.includes(k), description: k });
  return new Proxy({} as Features, { get: (_t, k) => leaf(k as keyof Features) });
}

describe("vrfOptionalTabs", () => {
  it("reads each tab from its own feature flag", () => {
    for (const [tab, flag] of Object.entries(GATED)) {
      const tabs = vrfOptionalTabs(features([flag]));
      for (const [other, value] of Object.entries(tabs)) {
        assert.equal(value, other === tab, `${flag} enables only ${tab}`);
      }
    }
  });

  it("hides every optional tab when the flags are off", () => {
    assert.deepEqual(vrfOptionalTabs(features([])), { rpki: false, failover: false, dhcp: false, dhcpv6: false });
  });
});

describe("VrfContent optional tab wiring", () => {
  const src = readFileSync(new URL("../../components/vrf/VrfContent.tsx", import.meta.url), "utf8");

  it("does not read version_info", () => {
    assert.doesNotMatch(src, /version_info/);
  });

  for (const tab of Object.keys(GATED)) {
    for (const el of ["TabsTrigger", "TabsContent"]) {
      it(`gates the ${tab} ${el} on optionalTabs.${tab}`, () => {
        const opening = new RegExp(`<${el}\\s+value="${tab}"`, "g");
        const hits = [...src.matchAll(opening)];
        assert.equal(hits.length, 1, `one ${el} for ${tab}`);
        const before = src.slice(0, hits[0].index).trimEnd();
        assert.ok(before.endsWith(`{optionalTabs.${tab} && (`), `${el} ${tab} is guarded by its flag`);
      });
    }
  }
});
