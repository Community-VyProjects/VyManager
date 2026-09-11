/** Query-param tab helpers for routing pages. Nav emits `section` for static
 *  routes and `tab` for BGP; pages must consume the name nav actually sends. */

export const STATIC_ROUTE_TABS = [
  "routes",
  "arp",
  "mroute",
  "neighbor-proxy",
  "tables",
] as const;

export type StaticRouteTab = (typeof STATIC_ROUTE_TABS)[number];

export function staticRouteTabFromSearch(
  get: (key: string) => string | null,
): StaticRouteTab | null {
  const value = get("section") ?? get("tab");
  return (STATIC_ROUTE_TABS as readonly string[]).includes(value ?? "")
    ? (value as StaticRouteTab)
    : null;
}

export const BGP_TABS = [
  "overview",
  "neighbors",
  "peer-groups",
  "address-families",
  "parameters",
] as const;

export type BgpTab = (typeof BGP_TABS)[number];

export function bgpTabFromSearch(
  get: (key: string) => string | null,
): BgpTab | null {
  const value = get("tab");
  return (BGP_TABS as readonly string[]).includes(value ?? "")
    ? (value as BgpTab)
    : null;
}
