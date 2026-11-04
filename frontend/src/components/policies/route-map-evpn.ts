/**
 * EVPN match and set fields for a route-map rule draft.
 *
 * Both rule modals (create route-map, add/edit rule) hold these as one
 * draft object each, so the conversion to and from the API shape lives here
 * once instead of in two 1000-line components.
 */

import type { MatchConditions, SetActions } from "@/lib/api/route-map";

export interface EvpnMatchDraft {
  defaultRoute: boolean;
  rd: string;
  routeType: string;
  vni: string;
}

export interface EvpnSetDraft {
  gatewayIpv4: string;
  gatewayIpv6: string;
}

export const emptyEvpnMatchDraft = (): EvpnMatchDraft => ({
  defaultRoute: false,
  rd: "",
  routeType: "",
  vni: "",
});

export const emptyEvpnSetDraft = (): EvpnSetDraft => ({
  gatewayIpv4: "",
  gatewayIpv6: "",
});

export function evpnMatchDraftFrom(match: Partial<MatchConditions>): EvpnMatchDraft {
  return {
    defaultRoute: !!match.evpn_default_route,
    rd: match.evpn_rd ?? "",
    routeType: match.evpn_route_type ?? "",
    vni: match.evpn_vni != null ? String(match.evpn_vni) : "",
  };
}

export function evpnSetDraftFrom(set: Partial<SetActions>): EvpnSetDraft {
  return {
    gatewayIpv4: set.evpn_gateway_ipv4 ?? "",
    gatewayIpv6: set.evpn_gateway_ipv6 ?? "",
  };
}

/** The filled-in EVPN match fields, in the API shape. Empty fields are omitted. */
export function evpnMatchFields(draft: EvpnMatchDraft): Partial<MatchConditions> {
  const out: Partial<MatchConditions> = {};
  if (draft.defaultRoute) out.evpn_default_route = true;
  if (draft.rd.trim()) out.evpn_rd = draft.rd.trim();
  if (draft.routeType) out.evpn_route_type = draft.routeType;
  if (draft.vni.trim()) {
    const vni = Number.parseInt(draft.vni.trim(), 10);
    if (!Number.isNaN(vni)) out.evpn_vni = vni;
  }
  return out;
}

/** The filled-in EVPN set fields, in the API shape. Empty fields are omitted. */
export function evpnSetFields(draft: EvpnSetDraft): Partial<SetActions> {
  const out: Partial<SetActions> = {};
  if (draft.gatewayIpv4.trim()) out.evpn_gateway_ipv4 = draft.gatewayIpv4.trim();
  if (draft.gatewayIpv6.trim()) out.evpn_gateway_ipv6 = draft.gatewayIpv6.trim();
  return out;
}
