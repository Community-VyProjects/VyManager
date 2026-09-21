import type { MatchConditions } from "@/lib/api/route-map";

export interface RouteMapOverviewBadge {
  label: string;
  value: string;
}

export const ROUTE_MAP_MATCH_OVERVIEW_FIELDS: {
  key: keyof MatchConditions;
  label: string;
}[] = [
  { key: "as_path", label: "AS Path" },
  { key: "community_list", label: "Community" },
  { key: "ip_address_prefix_list", label: "IP Prefix" },
  { key: "ipv6_address_prefix_list", label: "IPv6 Prefix" },
  { key: "protocol", label: "Protocol" },
];

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== false && value !== "";
}

export function routeMapMatchOverviewBadges(
  match: MatchConditions,
): RouteMapOverviewBadge[] {
  const badges: RouteMapOverviewBadge[] = [];
  for (const { key, label } of ROUTE_MAP_MATCH_OVERVIEW_FIELDS) {
    const value = match[key];
    if (isPresent(value)) {
      badges.push({ label, value: String(value) });
    }
  }
  return badges;
}
