/**
 * Draft, validation and submit logic for prefix-list rules.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so a cleared ge/le/description emits null.
 * The write target is the stored rule number, never the draft.
 */

import {
  prefixListService,
  PrefixListService,
  type PrefixListRule,
} from "@/lib/api/prefix-list";
import type { VyOSResponse } from "@/lib/types/api";

export interface PrefixListRuleDraft {
  ruleNumber: number;
  action: "permit" | "deny";
  description: string;
  prefix: string;
  ge: string;
  le: string;
}

export const emptyPrefixListRuleDraft = (): PrefixListRuleDraft => ({
  ruleNumber: 100,
  action: "permit",
  description: "",
  prefix: "",
  ge: "",
  le: "",
});

export function prefixListRuleDraftFrom(rule: PrefixListRule): PrefixListRuleDraft {
  const draft = emptyPrefixListRuleDraft();
  draft.ruleNumber = rule.rule_number;
  draft.action = rule.action === "deny" ? "deny" : "permit";
  draft.description = rule.description ?? "";
  draft.prefix = rule.prefix ?? "";
  draft.ge = rule.ge != null ? String(rule.ge) : "";
  draft.le = rule.le != null ? String(rule.le) : "";
  return draft;
}

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

const validateCIDR = (prefix: string, listType: string): boolean => {
  if (!prefix.includes("/")) return false;
  const [addr, len] = prefix.split("/");
  const prefixLength = parseInt(len, 10);
  if (isNaN(prefixLength)) return false;
  if (listType === "ipv4") {
    if (prefixLength < 0 || prefixLength > 32) return false;
    const parts = addr.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return n >= 0 && n <= 255;
    });
  }
  return addr.includes(":") && prefixLength >= 0 && prefixLength <= 128;
};

export function validatePrefixListRule(draft: PrefixListRuleDraft, listType: string): string | null {
  if (!draft.prefix.trim()) return "Please enter a prefix in CIDR notation";
  if (!validateCIDR(draft.prefix.trim(), listType)) {
    return `Invalid ${listType.toUpperCase()} CIDR notation. Format: ${listType === "ipv4" ? "192.168.1.0/24" : "2001:db8::/32"}`;
  }
  if (draft.ge && isNaN(parseInt(draft.ge, 10))) return "GE must be a valid number";
  if (draft.le && isNaN(parseInt(draft.le, 10))) return "LE must be a valid number";
  const prefixLength = parseInt(draft.prefix.trim().split("/")[1], 10);
  const maxLength = listType === "ipv4" ? 32 : 128;
  if (draft.ge) {
    const geNum = parseInt(draft.ge, 10);
    if (geNum < prefixLength || geNum > maxLength) {
      return `GE must be between ${prefixLength} (prefix length) and ${maxLength}`;
    }
  }
  if (draft.le) {
    const leNum = parseInt(draft.le, 10);
    if (leNum < prefixLength || leNum > maxLength) {
      return `LE must be between ${prefixLength} (prefix length) and ${maxLength}`;
    }
  }
  if (draft.ge && draft.le && parseInt(draft.ge, 10) > parseInt(draft.le, 10)) {
    return "GE must be less than or equal to LE";
  }
  return null;
}

const geVal = (ge: string): number | null => (ge ? parseInt(ge, 10) : null);
const leVal = (le: string): number | null => (le ? parseInt(le, 10) : null);

export function buildPrefixListCreate(draft: PrefixListRuleDraft): Partial<PrefixListRule> {
  return {
    rule_number: draft.ruleNumber,
    action: draft.action,
    description: draft.description.trim() || null,
    prefix: draft.prefix.trim(),
    ge: geVal(draft.ge),
    le: leVal(draft.le),
  };
}

export function buildPrefixListUpdate(
  draft: PrefixListRuleDraft,
  current: PrefixListRule,
): Partial<PrefixListRule> | null {
  const updated: Partial<PrefixListRule> = {};
  if (draft.action !== current.action) updated.action = draft.action;
  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }
  if (draft.prefix.trim() !== (current.prefix || "")) updated.prefix = draft.prefix.trim();
  if (geVal(draft.ge) !== (current.ge ?? null)) updated.ge = geVal(draft.ge);
  if (leVal(draft.le) !== (current.le ?? null)) updated.le = leVal(draft.le);
  return Object.keys(updated).length > 0 ? updated : null;
}

export function submitPrefixListCreate(
  name: string,
  listType: string,
  draft: PrefixListRuleDraft,
  service: PrefixListService = prefixListService,
): Promise<VyOSResponse> {
  return service.addRule(name, listType, buildPrefixListCreate(draft));
}

export async function submitPrefixListUpdate(
  name: string,
  listType: string,
  current: PrefixListRule,
  draft: PrefixListRuleDraft,
  service: PrefixListService = prefixListService,
): Promise<VyOSResponse | null> {
  const config = buildPrefixListUpdate(draft, current);
  if (!config) return null;
  return service.updateRule(name, listType, current.rule_number, config);
}
