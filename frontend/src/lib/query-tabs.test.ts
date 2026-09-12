import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bgpTabFromSearch,
  conntrackSectionFromSearch,
  containerTabFromSearch,
  staticRouteTabFromSearch,
} from "./query-tabs";

function params(record: Record<string, string>): (key: string) => string | null {
  return (key) => record[key] ?? null;
}

describe("staticRouteTabFromSearch", () => {
  it("reads section as nav and search emit it", () => {
    assert.equal(staticRouteTabFromSearch(params({ section: "arp" })), "arp");
    assert.equal(staticRouteTabFromSearch(params({ section: "mroute" })), "mroute");
    assert.equal(staticRouteTabFromSearch(params({ section: "tables" })), "tables");
  });

  it("falls back to tab when section is absent", () => {
    assert.equal(staticRouteTabFromSearch(params({ tab: "neighbor-proxy" })), "neighbor-proxy");
  });

  it("prefers section over tab", () => {
    assert.equal(
      staticRouteTabFromSearch(params({ section: "arp", tab: "routes" })),
      "arp",
    );
  });

  it("ignores unknown values", () => {
    assert.equal(staticRouteTabFromSearch(params({ section: "overview" })), null);
    assert.equal(staticRouteTabFromSearch(params({})), null);
  });
});

describe("bgpTabFromSearch", () => {
  it("reads tab as nav emits it", () => {
    assert.equal(bgpTabFromSearch(params({ tab: "neighbors" })), "neighbors");
    assert.equal(bgpTabFromSearch(params({ tab: "peer-groups" })), "peer-groups");
  });

  it("does not treat section as a BGP tab", () => {
    assert.equal(bgpTabFromSearch(params({ section: "neighbors" })), null);
  });

  it("ignores unknown tabs", () => {
    assert.equal(bgpTabFromSearch(params({ tab: "arp" })), null);
  });
});

describe("containerTabFromSearch", () => {
  it("maps nav running to the containers tab", () => {
    assert.equal(containerTabFromSearch(params({ tab: "running" })), "containers");
  });

  it("reads images and networks as nav emits them", () => {
    assert.equal(containerTabFromSearch(params({ tab: "images" })), "images");
    assert.equal(containerTabFromSearch(params({ tab: "networks" })), "networks");
  });

  it("ignores unknown tabs", () => {
    assert.equal(containerTabFromSearch(params({ tab: "overview" })), null);
    assert.equal(containerTabFromSearch(params({})), null);
  });
});

describe("conntrackSectionFromSearch", () => {
  it("reads section as search emits it", () => {
    assert.equal(conntrackSectionFromSearch(params({ section: "table-sizes" })), "table-sizes");
    assert.equal(conntrackSectionFromSearch(params({ section: "tcp-settings" })), "tcp-settings");
  });

  it("ignores unknown sections", () => {
    assert.equal(conntrackSectionFromSearch(params({ section: "ignore" })), null);
    assert.equal(conntrackSectionFromSearch(params({ tab: "conntrack" })), null);
  });
});
