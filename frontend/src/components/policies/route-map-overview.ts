import type { MatchConditions } from "@/lib/api/route-map";

/** Message key under `routeMap.overview` for a badge label. */
export type RouteMapOverviewLabelKey =
  | "asPath"
  | "community"
  | "ipPrefix"
  | "ipv6Prefix"
  | "protocol";

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

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== false && value !== "";
}

export function routeMapMatchOverviewBadges(
  match: MatchConditions,
): RouteMapOverviewBadge[] {
  const badges: RouteMapOverviewBadge[] = [];
  for (const { key, labelKey } of ROUTE_MAP_MATCH_OVERVIEW_FIELDS) {
    const value = match[key];
    if (isPresent(value)) {
      badges.push({ labelKey, value: String(value) });
    }
  }
  return badges;
}
