import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navigation } from "@/lib/navigation";
import enNavigation from "../../messages/en/navigation.json";
import { navTitleKey } from "./nav-title";

// Names that are the same in every language, so they need no message.
const UNTRANSLATED = new Set(["IPsec", "OpenVPN", "WireGuard", "HAProxy", "QoS", "L2TP", "WAN"]);
const isAcronym = (title: string) => /^[A-Z0-9]+$/.test(title) || UNTRANSLATED.has(title);

function allTitles(): string[] {
  return navigation.flatMap((item) => [item.title, ...(item.children ?? []).map((c) => c.title)]);
}

describe("navTitleKey", () => {
  it("builds camelCase keys", () => {
    assert.equal(navTitleKey("Dashboard"), "dashboard");
    assert.equal(navTitleKey("Static & Failover"), "staticFailover");
    assert.equal(navTitleKey("DHCPv6 Server"), "dhcpv6Server");
    assert.equal(navTitleKey("BGP AS"), "bgpAs");
  });
});

describe("navigation messages", () => {
  it("has an English message for every translatable sidebar title", () => {
    const keys = new Set(Object.keys(enNavigation));
    const missing = allTitles().filter((title) => !isAcronym(title) && !keys.has(navTitleKey(title)));
    assert.deepEqual(missing, []);
  });

  it("keeps English messages identical to the titles in lib/navigation.ts", () => {
    const byKey = new Map(allTitles().map((title) => [navTitleKey(title), title]));
    for (const [key, value] of Object.entries(enNavigation)) {
      if (byKey.has(key)) assert.equal(value, byKey.get(key), key);
    }
  });
});
