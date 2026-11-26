/**
 * Form-only helpers of the route-map modals. Every emit and save check lives
 * in `@/lib/api/route-map-save-ops`.
 */

import type { RouteMapCapabilities, RouteMapRule } from "@/lib/api/route-map";
import { routeMapRange, type RouteMapRuleProblem, type RouteMapRuleProblemKey } from "@/lib/api/route-map-save-ops";
import { nextRuleNumber } from "./route-rule-form";

type Caps = RouteMapCapabilities | null;

/** The tabs of the rule field set. */
export type RouteMapRuleTab = "basic" | "match" | "set" | "advanced";

/** A free rule number inside the served rule range. */
export function suggestedRuleNumber(rules: RouteMapRule[], caps: Caps): string {
  return nextRuleNumber(
    rules.map((r) => r.rule_number),
    routeMapRange(caps, "rule"),
  );
}

/**
 * Names of the configured objects a rule can pick, loaded by the page. A
 * picker keeps a loaded value that is not in its list.
 */
export interface RouteMapPickers {
  /** Route-maps a rule can `call` (the edited route-map excluded). */
  routeMaps: string[];
  asPathLists: string[];
  communityLists: string[];
  extcommunityLists: string[];
  largeCommunityLists: string[];
  /** Configured IPv4 access-list numbers. */
  ipv4AccessLists: string[];
  ipv6AccessLists: string[];
  ipv4PrefixLists: string[];
  ipv6PrefixLists: string[];
  /** Configured BGP neighbors (addresses and interfaces) and peer-groups, global and per VRF. */
  bgpPeers: string[];
}

export const NO_PICKERS: RouteMapPickers = {
  routeMaps: [],
  asPathLists: [],
  communityLists: [],
  extcommunityLists: [],
  largeCommunityLists: [],
  ipv4AccessLists: [],
  ipv6AccessLists: [],
  ipv4PrefixLists: [],
  ipv6PrefixLists: [],
  bgpPeers: [],
};

const BASIC: RouteMapRuleProblemKey[] = [
  "ruleNumberRequired",
  "ruleNumberRange",
  "ruleNumberTaken",
  "actionRequired",
  "descriptionTooLong",
];
const ADVANCED: RouteMapRuleProblemKey[] = [
  "continueRange",
  "continueNotAfterRule",
  "onMatchGotoRange",
  "onMatchGotoNotAfterRule",
];
const MATCH: RouteMapRuleProblemKey[] = [
  "matchLocalPreferenceRange",
  "matchMetricRange",
  "matchTagRange",
  "matchPeerInvalid",
  "evpnVniRange",
  "evpnRdInvalid",
  "ipAddressPrefixLenRange",
  "ipv6AddressPrefixLenRange",
  "ipNexthopAddressInvalid",
  "ipNexthopPrefixLenRange",
  "ipv6NexthopAddressInvalid",
];

/** The tab holding the field a save check names, so the submit can switch to it. */
export function problemTab(key: RouteMapRuleProblemKey): RouteMapRuleTab {
  if (BASIC.includes(key)) return "basic";
  if (ADVANCED.includes(key)) return "advanced";
  if (MATCH.includes(key)) return "match";
  return "set";
}

/** The message arguments of a rule save check (every message may name the rule). */
export function ruleProblemArgs(problem: RouteMapRuleProblem): Record<string, string | number> {
  return { ...problem.args, rule: problem.rule, min: problem.min ?? "", max: problem.max ?? "", value: problem.value ?? "" };
}
