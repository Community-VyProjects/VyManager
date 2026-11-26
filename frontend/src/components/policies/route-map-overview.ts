import type { MatchConditions, RouteMapRule } from "@/lib/api/route-map";

/** Message key under `routeMap.overview` for a badge label. */
export type RouteMapOverviewLabelKey = "asPath" | "community" | "ipPrefix" | "ipv6Prefix" | "protocol";

export interface RouteMapOverviewBadge {
  labelKey: RouteMapOverviewLabelKey;
  value: string;
}

export const ROUTE_MAP_MATCH_OVERVIEW_FIELDS: {
  key: keyof MatchConditions;
  labelKey: RouteMapOverviewLabelKey;
}[] = [
  { key: "as_path", labelKey: "asPath" },
  { key: "community_list", labelKey: "community" },
  { key: "ip_address_prefix_list", labelKey: "ipPrefix" },
  { key: "ipv6_address_prefix_list", labelKey: "ipv6Prefix" },
  { key: "protocol", labelKey: "protocol" },
];

/** A leaf the device holds: a value, a set flag, or a non-empty `multi:` list. */
function isPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== false && value !== "";
}

export function routeMapMatchOverviewBadges(match: Partial<MatchConditions>): RouteMapOverviewBadge[] {
  const badges: RouteMapOverviewBadge[] = [];
  for (const { key, labelKey } of ROUTE_MAP_MATCH_OVERVIEW_FIELDS) {
    const value = match[key];
    if (isPresent(value)) badges.push({ labelKey, value: String(value) });
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
