import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeMapMatchOverviewBadges, routeMapRuleCounts, type RouteMapOverviewLabel } from "./route-map-overview";

const RM = (key: Extract<RouteMapOverviewLabel, { catalog: "routeMap" }>["key"]): RouteMapOverviewLabel => ({ catalog: "routeMap", key });

describe("routeMapMatchOverviewBadges", () => {
  it("shows an IPv4 prefix-list match as ipPrefix", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ ip_address_prefix_list: "PL4" }), [
      { label: RM("overview.ipPrefix"), value: "PL4" },
    ]);
  });

  it("shows an IPv6 prefix-list match the same way as IPv4", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ ipv6_address_prefix_list: "PL6" }), [
      { label: RM("overview.ipv6Prefix"), value: "PL6" },
    ]);
  });

  it("shows IPv4 and IPv6 prefix-list matches together", () => {
    assert.deepEqual(
      routeMapMatchOverviewBadges({ ip_address_prefix_list: "PL4", ipv6_address_prefix_list: "PL6" }),
      [
        { label: RM("overview.ipPrefix"), value: "PL4" },
        { label: RM("overview.ipv6Prefix"), value: "PL6" },
      ],
    );
  });

  it("keeps AS Path and community badges; protocol uses the rule modal's field label", () => {
    assert.deepEqual(routeMapMatchOverviewBadges({ as_path: "AS1", community_list: "CL1", protocol: "bgp" }), [
      { label: RM("overview.asPath"), value: "AS1" },
      { label: RM("overview.community"), value: "CL1" },
      { label: { catalog: "routeMapRuleModal", key: "field.protocol" }, value: "bgp" },
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
