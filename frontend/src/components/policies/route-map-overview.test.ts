import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeMapMatchOverviewBadges, routeMapRuleCounts } from "./route-map-overview";

describe("routeMapMatchOverviewBadges", () => {
  it("shows an IPv4 prefix-list match as ipPrefix", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ ip_address_prefix_list: "PL4" }), [
      { labelKey: "ipPrefix", value: "PL4" },
    ]);
  });

  it("shows an IPv6 prefix-list match the same way as IPv4", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ ipv6_address_prefix_list: "PL6" }), [
      { labelKey: "ipv6Prefix", value: "PL6" },
    ]);
  });

  it("shows IPv4 and IPv6 prefix-list matches together", () => {
    assert.deepEqual(
      routeMapMatchOverviewBadges({ ip_address_prefix_list: "PL4", ipv6_address_prefix_list: "PL6" }),
      [
        { labelKey: "ipPrefix", value: "PL4" },
        { labelKey: "ipv6Prefix", value: "PL6" },
      ],
    );
  });

  it("keeps AS Path, community, and protocol badges", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ as_path: "AS1", community_list: "CL1", protocol: "bgp" }), [
      { labelKey: "asPath", value: "AS1" },
      { labelKey: "community", value: "CL1" },
      { labelKey: "protocol", value: "bgp" },
    ]);
  });

  it("omits empty prefix-list matches", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ ip_address_prefix_list: "", ipv6_address_prefix_list: null }), []);
  });
});

describe("routeMapRuleCounts", () => {
  it("counts values and set flags, not empty lists, false flags or nulls", () => {
    const counts = routeMapRuleCounts({
      match: { as_path: "AS1", community_exact_match: true, evpn_default_route: false, tag: null },
      set: { community_add_values: [], extcommunity_rt: ["65000:1"], atomic_aggregate: false, weight: 0 },
    } as never);
    assert.deepEqual(counts, { match: 2, set: 2 });
  });
});
