/**
 * Form-only helpers of the policy route rule modal. Every emit and save check
 * lives in `@/lib/api/route-save-ops`.
 */

import type { GroupsConfigResponse } from "@/lib/api/types/firewall-groups";
import type { GeoIPMatch, MatchConditions, RouteRange, RoutePolicyType } from "@/lib/api/route";
import type { RouteRuleForm } from "@/lib/api/route-save-ops";

export type GroupKind = "" | "address" | "network" | "domain";
export const GROUP_KINDS = ["address", "network", "domain"] as const;

/** A free rule number: the next after the highest, else the lowest unused one. */
export function nextRuleNumber(numbers: number[], range: RouteRange | null): string {
  const min = range?.min ?? 1;
  const max = range?.max ?? 999999;
  if (numbers.length === 0) return String(Math.min(Math.max(100, min), max));
  const next = Math.max(...numbers) + 1;
  if (next <= max) return String(next);
  for (let n = min; n <= max; n += 1) {
    if (!numbers.includes(n)) return String(n);
  }
  return "";
}

/** A leaf value negated with a leading `!`. */
export function splitInverted(value: string): { name: string; inverted: boolean } {
  return value.startsWith("!") ? { name: value.slice(1), inverted: true } : { name: value, inverted: false };
}

export function joinInverted(name: string, inverted: boolean): string {
  return name ? `${inverted ? "!" : ""}${name}` : "";
}

/** `<n>/<unit>` (1.5 limit rate). */
export function splitLimitRate(value: string): { count: string; unit: string } {
  const [count = "", unit = ""] = value.split("/");
  return { count, unit };
}

export function joinLimitRate(count: string, unit: string): string {
  return count.trim() ? `${count.trim()}/${unit}` : "";
}

/** The address/network/domain group a side uses (the lab takes one of them). */
export function groupKindOf(form: RouteRuleForm, side: "source" | "destination"): GroupKind {
  for (const kind of GROUP_KINDS) {
    if (form[`${side}_group_${kind}`]) return kind;
  }
  return "";
}

/** Configured firewall group names a rule of this family can name, by leaf. */
export function groupNames(
  groups: GroupsConfigResponse | null,
  policyType: RoutePolicyType,
): Record<"address" | "network" | "domain" | "mac" | "port", string[]> {
  const names = (list: { name: string }[] | undefined) => (list ?? []).map((g) => g.name);
  const v6 = policyType === "route6";
  return {
    address: names(v6 ? groups?.ipv6_address_groups : groups?.address_groups),
    network: names(v6 ? groups?.ipv6_network_groups : groups?.network_groups),
    domain: names(groups?.domain_groups),
    mac: names(groups?.mac_groups),
    port: names(groups?.port_groups),
  };
}

/** Match leaves a rule sets (a geoip node counts when it holds anything). */
export function activeMatchEntries(match: MatchConditions | null | undefined): [string, unknown][] {
  return Object.entries(match ?? {}).filter(([, value]) => {
    if (value === null || value === undefined || value === false || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") {
      const geoip = value as GeoIPMatch;
      return geoip.country_code.length > 0 || geoip.asn.length > 0 || geoip.inverse_match;
    }
    return true;
  });
}
