/** Display labels of the EVPN route types a device serves. */

/** Message key under `routeMapRuleModal` for a route type's name. */
export type EvpnRouteTypeLabelKey =
  | "evpn.routeTypeEad"
  | "evpn.routeTypeMacip"
  | "evpn.routeTypeMulticast"
  | "evpn.routeTypeEs"
  | "evpn.routeTypePrefix";

const ROUTE_TYPE_LABELS: Record<string, EvpnRouteTypeLabelKey> = {
  ead: "evpn.routeTypeEad",
  macip: "evpn.routeTypeMacip",
  multicast: "evpn.routeTypeMulticast",
  es: "evpn.routeTypeEs",
  prefix: "evpn.routeTypePrefix",
};

/** The numeric aliases 1.5 serves beside the names (RFC 7432 / 9136 type numbers). */
const NUMBERED: Record<string, EvpnRouteTypeLabelKey> = {
  "1": "evpn.routeTypeEad",
  "2": "evpn.routeTypeMacip",
  "3": "evpn.routeTypeMulticast",
  "4": "evpn.routeTypeEs",
  "5": "evpn.routeTypePrefix",
};

const own = (map: Record<string, EvpnRouteTypeLabelKey>, type: string) =>
  Object.prototype.hasOwnProperty.call(map, type) ? map[type] : null;

/**
 * The label of a served route type: the named type's key, plus the number for
 * a numeric alias (shown as `{number}: {name}`). Null for a value with no
 * known name, which then shows as itself.
 */
export function evpnRouteTypeLabel(type: string): { key: EvpnRouteTypeLabelKey; alias: string | null } | null {
  const named = own(ROUTE_TYPE_LABELS, type);
  if (named) return { key: named, alias: null };
  const numbered = own(NUMBERED, type);
  return numbered ? { key: numbered, alias: type } : null;
}
