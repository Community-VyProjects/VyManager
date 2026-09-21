import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeMapMatchOverviewBadges } from "./route-map-overview";

describe("routeMapMatchOverviewBadges", () => {
  it("shows an IPv4 prefix-list match as IP Prefix", () => {
    const badges = routeMapMatchOverviewBadges({
      ip_address_prefix_list: "PL4",
    });
    assert.deepEqual(badges, [{ label: "IP Prefix", value: "PL4" }]);
  });

  it("shows an IPv6 prefix-list match the same way as IPv4", () => {
    const badges = routeMapMatchOverviewBadges({
      ipv6_address_prefix_list: "PL6",
    });
    assert.deepEqual(badges, [{ label: "IPv6 Prefix", value: "PL6" }]);
  });

  it("shows IPv4 and IPv6 prefix-list matches together", () => {
    const badges = routeMapMatchOverviewBadges({
      ip_address_prefix_list: "PL4",
      ipv6_address_prefix_list: "PL6",
    });
    assert.deepEqual(badges, [
      { label: "IP Prefix", value: "PL4" },
      { label: "IPv6 Prefix", value: "PL6" },
    ]);
  });

  it("keeps AS Path, community, and protocol badges", () => {
    const badges = routeMapMatchOverviewBadges({
      as_path: "AS1",
      community_list: "CL1",
      protocol: "bgp",
    });
    assert.deepEqual(badges, [
      { label: "AS Path", value: "AS1" },
      { label: "Community", value: "CL1" },
      { label: "Protocol", value: "bgp" },
    ]);
  });

  it("omits empty prefix-list matches", () => {
    const badges = routeMapMatchOverviewBadges({
      ip_address_prefix_list: "",
      ipv6_address_prefix_list: null,
    });
    assert.deepEqual(badges, []);
  });
});
