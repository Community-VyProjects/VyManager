/**
 * Draft, validation and submit logic for route-map rules.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so an unchanged rule sends nothing. The write
 * target is the stored rule number, never the draft.
 */

import {
  routeMapService,
  RouteMapService,
  type MatchConditions,
  type RouteMapRule,
  type SetActions,
} from "@/lib/api/route-map";
import type { VyOSResponse } from "@/lib/types/api";

export interface RouteMapRuleDraft {
  ruleNumber: number;
  description: string;
  action: string;
  call: string;
  continueRule: string;
  onMatchGoto: string;
  onMatchNext: boolean;
  match: Partial<MatchConditions>;
  set: Partial<SetActions>;
}

export const emptyRouteMapRuleDraft = (): RouteMapRuleDraft => ({
  ruleNumber: 100,
  description: "",
  action: "permit",
  call: "",
  continueRule: "",
  onMatchGoto: "",
  onMatchNext: false,
  match: {},
  set: {},
});

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

export function routeMapRuleDraftFrom(rule: RouteMapRule): RouteMapRuleDraft {
  return {
    ruleNumber: rule.rule_number,
    description: rule.description ?? "",
    action: rule.action,
    call: rule.call ?? "",
    continueRule: rule.continue_rule != null ? String(rule.continue_rule) : "",
    onMatchGoto: rule.on_match_goto != null ? String(rule.on_match_goto) : "",
    onMatchNext: !!rule.on_match_next,
    match: { ...(rule.match || {}) },
    set: { ...(rule.set || {}) },
  };
}

export function buildRouteMapCreate(draft: RouteMapRuleDraft): Partial<RouteMapRule> {
  return {
    rule_number: draft.ruleNumber,
    description: draft.description.trim() || null,
    action: draft.action,
    call: draft.call.trim() || null,
    continue_rule: draft.continueRule.trim() ? parseInt(draft.continueRule, 10) : null,
    on_match_goto: draft.onMatchGoto.trim() ? parseInt(draft.onMatchGoto, 10) : null,
    on_match_next: draft.onMatchNext,
    match: draft.match,
    set: draft.set,
  };
}

const keyOf = (draft: RouteMapRuleDraft): string =>
  JSON.stringify({
    description: draft.description.trim() || null,
    action: draft.action,
    call: draft.call.trim() || null,
    continue_rule: draft.continueRule.trim() ? parseInt(draft.continueRule, 10) : null,
    on_match_goto: draft.onMatchGoto.trim() ? parseInt(draft.onMatchGoto, 10) : null,
    on_match_next: draft.onMatchNext,
    match: draft.match,
    set: draft.set,
  });

export function buildRouteMapUpdate(
  draft: RouteMapRuleDraft,
  current: RouteMapRule,
): Partial<RouteMapRule> | null {
  if (keyOf(draft) === keyOf(routeMapRuleDraftFrom(current))) return null;
  return buildRouteMapCreate(draft);
}

export function submitRouteMapCreate(
  name: string,
  draft: RouteMapRuleDraft,
  service: RouteMapService = routeMapService,
): Promise<VyOSResponse> {
  return service.addRule(name, buildRouteMapCreate(draft));
}

export async function submitRouteMapUpdate(
  name: string,
  current: RouteMapRule,
  draft: RouteMapRuleDraft,
  service: RouteMapService = routeMapService,
): Promise<VyOSResponse | null> {
  const config = buildRouteMapUpdate(draft, current);
  if (!config) return null;
  return service.updateRule(name, current.rule_number, config);
}
