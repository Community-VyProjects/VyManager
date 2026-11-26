/** Display labels of the EVPN route types a device serves. */

/** Message key under `routeMapRuleModal` for a named route type. */
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

/** The label key of a named route type; null for a numbered one (`1`..`5`). */
export function evpnRouteTypeLabelKey(type: string): EvpnRouteTypeLabelKey | null {
  return Object.prototype.hasOwnProperty.call(ROUTE_TYPE_LABELS, type) ? ROUTE_TYPE_LABELS[type] : null;
}
