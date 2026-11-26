import type { MatchConditions, RouteMapRule } from "@/lib/api/route-map";

/**
 * A badge label: a `routeMap.overview` key, or a `routeMapRuleModal` field
 * label where the rule modal already names the leaf.
 */
export type RouteMapOverviewLabel =
  | { catalog: "routeMap"; key: "overview.asPath" | "overview.community" | "overview.ipPrefix" | "overview.ipv6Prefix" }
  | { catalog: "routeMapRuleModal"; key: "field.protocol" };

export interface RouteMapOverviewBadge {
  label: RouteMapOverviewLabel;
  value: string;
}

export const ROUTE_MAP_MATCH_OVERVIEW_FIELDS: {
  key: keyof MatchConditions;
  label: RouteMapOverviewLabel;
}[] = [
  { key: "as_path", label: { catalog: "routeMap", key: "overview.asPath" } },
  { key: "community_list", label: { catalog: "routeMap", key: "overview.community" } },
  { key: "ip_address_prefix_list", label: { catalog: "routeMap", key: "overview.ipPrefix" } },
  { key: "ipv6_address_prefix_list", label: { catalog: "routeMap", key: "overview.ipv6Prefix" } },
  { key: "protocol", label: { catalog: "routeMapRuleModal", key: "field.protocol" } },
];

/** A leaf the device holds: a value, a set flag, or a non-empty `multi:` list. */
function isPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== false && value !== "";
}

export function routeMapMatchOverviewBadges(match: Partial<MatchConditions>): RouteMapOverviewBadge[] {
  const badges: RouteMapOverviewBadge[] = [];
  for (const { key, label } of ROUTE_MAP_MATCH_OVERVIEW_FIELDS) {
    const value = match[key];
    if (isPresent(value)) badges.push({ label, value: String(value) });
  }
  return badges;
}

/** How many match leaves and set leaves a rule holds (an empty list is not one). */
export function routeMapRuleCounts(rule: Pick<RouteMapRule, "match" | "set">): { match: number; set: number } {
  return {
    match: Object.values(rule.match).filter(isPresent).length,
    set: Object.values(rule.set).filter(isPresent).length,
  };
}
