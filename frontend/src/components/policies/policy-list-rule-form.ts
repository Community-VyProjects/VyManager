/**
 * Draft, validation and submit logic for regex policy-list rules.
 *
 * AS-path, community, large-community, and extcommunity add/edit were the
 * same form twice. Create sends the fields the operator filled in. Update
 * diffs the draft against the stored record so a cleared description emits
 * null (delete) and an untouched field is not rewritten. The write target
 * is the stored rule number, never the draft.
 */

import {
  asPathListService,
  AsPathListService,
  type AsPathListRule,
} from "@/lib/api/as-path-list";
import {
  communityListService,
  extcommunityListService,
  largeCommunityListService,
  PolicyListService,
  type PolicyListRule,
} from "@/lib/api/policy-list";
import type { VyOSResponse } from "@/lib/types/api";

export interface RegexListRuleDraft {
  ruleNumber: number;
  description: string;
  action: "permit" | "deny";
  regex: string;
}

export const emptyRegexListRuleDraft = (): RegexListRuleDraft => ({
  ruleNumber: 100,
  description: "",
  action: "permit",
  regex: "",
});

export function regexListRuleDraftFrom(
  rule: AsPathListRule | PolicyListRule,
): RegexListRuleDraft {
  const draft = emptyRegexListRuleDraft();
  draft.ruleNumber = rule.rule_number;
  draft.description = rule.description ?? "";
  draft.action = rule.action === "deny" ? "deny" : "permit";
  draft.regex = rule.regex ?? "";
  return draft;
}

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

export function validateRegexListRule(draft: RegexListRuleDraft): string | null {
  if (!draft.regex.trim()) {
    return "Regex pattern is required";
  }
  return null;
}

export function validateLargeCommunityRule(draft: RegexListRuleDraft): string | null {
  const required = validateRegexListRule(draft);
  if (required) return required;
  const parts = draft.regex.trim().split(":");
  if (parts.length !== 3) {
    return "Large community must be in format ASN:NN:NN or IP:NN:NN (e.g., 4242420696:10[0-1]:.*)";
  }
  return null;
}

export type ExtMatchType = "rt" | "soo" | "regex";

export interface ExtCommunityRuleDraft {
  ruleNumber: number;
  description: string;
  action: "permit" | "deny";
  matchType: ExtMatchType;
  adminField: string;
  assignedNum1: string;
  assignedNum2: string;
  rawRegex: string;
}

export const emptyExtCommunityRuleDraft = (): ExtCommunityRuleDraft => ({
  ruleNumber: 100,
  description: "",
  action: "permit",
  matchType: "rt",
  adminField: "",
  assignedNum1: "",
  assignedNum2: "",
  rawRegex: "",
});

export function parseExtCommunityRegex(regex: string): Pick<
  ExtCommunityRuleDraft,
  "matchType" | "adminField" | "assignedNum1" | "assignedNum2" | "rawRegex"
> {
  if (!regex) {
    return { matchType: "rt", adminField: "", assignedNum1: "", assignedNum2: "", rawRegex: "" };
  }
  const rtMatch = regex.match(/^rt\s+(\d+):(\d+):(\d+)$/);
  if (rtMatch) {
    return {
      matchType: "rt",
      adminField: rtMatch[1],
      assignedNum1: rtMatch[2],
      assignedNum2: rtMatch[3],
      rawRegex: "",
    };
  }
  const sooMatch = regex.match(/^soo\s+(\d+):(\d+):(\d+)$/);
  if (sooMatch) {
    return {
      matchType: "soo",
      adminField: sooMatch[1],
      assignedNum1: sooMatch[2],
      assignedNum2: sooMatch[3],
      rawRegex: "",
    };
  }
  return { matchType: "regex", adminField: "", assignedNum1: "", assignedNum2: "", rawRegex: regex };
}

export function extCommunityRuleDraftFrom(rule: PolicyListRule): ExtCommunityRuleDraft {
  const draft = emptyExtCommunityRuleDraft();
  draft.ruleNumber = rule.rule_number;
  draft.description = rule.description ?? "";
  draft.action = rule.action === "deny" ? "deny" : "permit";
  Object.assign(draft, parseExtCommunityRegex(rule.regex ?? ""));
  return draft;
}

export function buildExtCommunityRegex(draft: ExtCommunityRuleDraft): string {
  if (draft.matchType === "regex") {
    return draft.rawRegex.trim();
  }
  return `${draft.matchType} ${draft.adminField.trim()}:${draft.assignedNum1.trim()}:${draft.assignedNum2.trim()}`;
}

export function validateExtCommunityRule(draft: ExtCommunityRuleDraft): string | null {
  if (draft.matchType === "regex") {
    if (!draft.rawRegex.trim()) {
      return "Regex pattern is required";
    }
    return null;
  }
  if (!draft.adminField.trim()) {
    return "Administrator field (AS Number) is required";
  }
  if (!draft.assignedNum1.trim()) {
    return "Assigned Number 1 is required";
  }
  if (!draft.assignedNum2.trim()) {
    return "Assigned Number 2 is required";
  }
  if (!/^\d+$/.test(draft.adminField.trim())) {
    return "Administrator field must be a valid number (e.g., 65000)";
  }
  if (!/^\d+$/.test(draft.assignedNum1.trim())) {
    return "Assigned Number 1 must be a valid number";
  }
  if (!/^\d+$/.test(draft.assignedNum2.trim())) {
    return "Assigned Number 2 must be a valid number";
  }
  return null;
}

type RegexRulePayload = {
  rule_number?: number;
  description?: string | null;
  action?: string;
  regex?: string | null;
};

export function buildRegexListCreate(draft: RegexListRuleDraft): RegexRulePayload {
  return {
    rule_number: draft.ruleNumber,
    description: draft.description.trim() || null,
    action: draft.action,
    regex: draft.regex.trim(),
  };
}

export function buildRegexListUpdate(
  draft: RegexListRuleDraft,
  current: AsPathListRule | PolicyListRule,
): RegexRulePayload | null {
  const updated: RegexRulePayload = {};
  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }
  if (draft.action !== current.action) {
    updated.action = draft.action;
  }
  if (draft.regex.trim() !== (current.regex || "")) {
    updated.regex = draft.regex.trim() || null;
  }
  return Object.keys(updated).length > 0 ? updated : null;
}

interface RegexListWriter {
  addRule(name: string, rule: RegexRulePayload): Promise<VyOSResponse>;
  updateRule(name: string, ruleNumber: number, rule: RegexRulePayload): Promise<VyOSResponse>;
}

export function submitRegexListCreate(
  listName: string,
  draft: RegexListRuleDraft,
  service: RegexListWriter,
): Promise<VyOSResponse> {
  return service.addRule(listName, buildRegexListCreate(draft));
}

export async function submitRegexListUpdate(
  listName: string,
  current: AsPathListRule | PolicyListRule,
  draft: RegexListRuleDraft,
  service: RegexListWriter,
): Promise<VyOSResponse | null> {
  const config = buildRegexListUpdate(draft, current);
  if (!config) return null;
  return service.updateRule(listName, current.rule_number, config);
}

export function submitAsPathRuleCreate(
  listName: string,
  draft: RegexListRuleDraft,
  service: AsPathListService = asPathListService,
): Promise<VyOSResponse> {
  return submitRegexListCreate(listName, draft, service);
}

export function submitAsPathRuleUpdate(
  listName: string,
  current: AsPathListRule,
  draft: RegexListRuleDraft,
  service: AsPathListService = asPathListService,
): Promise<VyOSResponse | null> {
  return submitRegexListUpdate(listName, current, draft, service);
}

export function submitCommunityRuleCreate(
  listName: string,
  draft: RegexListRuleDraft,
  service: PolicyListService = communityListService,
): Promise<VyOSResponse> {
  return submitRegexListCreate(listName, draft, service);
}

export function submitCommunityRuleUpdate(
  listName: string,
  current: PolicyListRule,
  draft: RegexListRuleDraft,
  service: PolicyListService = communityListService,
): Promise<VyOSResponse | null> {
  return submitRegexListUpdate(listName, current, draft, service);
}

export function submitLargeCommunityRuleCreate(
  listName: string,
  draft: RegexListRuleDraft,
  service: PolicyListService = largeCommunityListService,
): Promise<VyOSResponse> {
  return submitRegexListCreate(listName, draft, service);
}

export function submitLargeCommunityRuleUpdate(
  listName: string,
  current: PolicyListRule,
  draft: RegexListRuleDraft,
  service: PolicyListService = largeCommunityListService,
): Promise<VyOSResponse | null> {
  return submitRegexListUpdate(listName, current, draft, service);
}

export function buildExtCommunityCreate(draft: ExtCommunityRuleDraft): RegexRulePayload {
  return {
    rule_number: draft.ruleNumber,
    description: draft.description.trim() || null,
    action: draft.action,
    regex: buildExtCommunityRegex(draft),
  };
}

export function buildExtCommunityUpdate(
  draft: ExtCommunityRuleDraft,
  current: PolicyListRule,
): RegexRulePayload | null {
  const regex = buildExtCommunityRegex(draft);
  const updated: RegexRulePayload = {};
  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }
  if (draft.action !== current.action) {
    updated.action = draft.action;
  }
  if (regex !== (current.regex || "")) {
    updated.regex = regex || null;
  }
  return Object.keys(updated).length > 0 ? updated : null;
}

export function submitExtCommunityRuleCreate(
  listName: string,
  draft: ExtCommunityRuleDraft,
  service: PolicyListService = extcommunityListService,
): Promise<VyOSResponse> {
  return service.addRule(listName, buildExtCommunityCreate(draft));
}

export async function submitExtCommunityRuleUpdate(
  listName: string,
  current: PolicyListRule,
  draft: ExtCommunityRuleDraft,
  service: PolicyListService = extcommunityListService,
): Promise<VyOSResponse | null> {
  const config = buildExtCommunityUpdate(draft, current);
  if (!config) return null;
  return service.updateRule(listName, current.rule_number, config);
}
