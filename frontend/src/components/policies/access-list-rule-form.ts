/**
 * Draft, validation and submit logic for access-list rules.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record. The write target is the stored rule number.
 * IPv4 "network" in the form maps to inverse-mask on the wire, as before.
 */

import {
  accessListService,
  AccessListService,
  type AccessListRule,
} from "@/lib/api/access-list";
import type { VyOSResponse } from "@/lib/types/api";

export interface AccessListRuleDraft {
  ruleNumber: number;
  action: "permit" | "deny";
  description: string;
  sourceType: string;
  sourceAddress: string;
  sourceMask: string;
  sourceAny: boolean;
  sourceExactMatch: boolean;
  sourceNetwork: string;
  destinationType: string;
  destinationAddress: string;
  destinationMask: string;
}

export const emptyAccessListRuleDraft = (): AccessListRuleDraft => ({
  ruleNumber: 100,
  action: "permit",
  description: "",
  sourceType: "any",
  sourceAddress: "",
  sourceMask: "",
  sourceAny: false,
  sourceExactMatch: false,
  sourceNetwork: "",
  destinationType: "any",
  destinationAddress: "",
  destinationMask: "",
});

export function accessListRuleDraftFrom(rule: AccessListRule, listType: string): AccessListRuleDraft {
  const draft = emptyAccessListRuleDraft();
  draft.ruleNumber = rule.rule_number;
  draft.action = rule.action === "deny" ? "deny" : "permit";
  draft.description = rule.description ?? "";
  if (listType === "ipv4") {
    const src = rule.source_type || "any";
    draft.sourceType = src === "inverse-mask" ? "network" : src;
    draft.sourceAddress = rule.source_address ?? "";
    draft.sourceMask = rule.source_mask ?? "";
    const dst = rule.destination_type || "any";
    draft.destinationType = dst === "inverse-mask" ? "network" : dst;
    draft.destinationAddress = rule.destination_address ?? "";
    draft.destinationMask = rule.destination_mask ?? "";
  } else {
    draft.sourceAny = rule.source_type === "any";
    draft.sourceExactMatch = !!rule.source_exact_match;
    draft.sourceNetwork = rule.source_address ?? "";
  }
  return draft;
}

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

export function validateAccessListRule(draft: AccessListRuleDraft, listType: string): string | null {
  if (listType === "ipv4") {
    if (draft.sourceType === "host" && !draft.sourceAddress.trim()) {
      return "Please enter a source address for host type";
    }
    if (draft.sourceType === "network" && !draft.sourceAddress.trim()) {
      return "Please enter a source address for network type";
    }
    if (draft.sourceType === "network" && !draft.sourceMask.trim()) {
      return "Please enter a source mask for network type";
    }
    if (draft.destinationType === "host" && !draft.destinationAddress.trim()) {
      return "Please enter a destination address for host type";
    }
    if (draft.destinationType === "network" && !draft.destinationAddress.trim()) {
      return "Please enter a destination address for network type";
    }
    if (draft.destinationType === "network" && !draft.destinationMask.trim()) {
      return "Please enter a destination mask for network type";
    }
    return null;
  }
  if (draft.sourceNetwork.trim() && !draft.sourceNetwork.includes("/")) {
    return "IPv6 network must be in CIDR format (e.g., 2001:db8::/32)";
  }
  if (!draft.sourceAny && !draft.sourceExactMatch && !draft.sourceNetwork.trim()) {
    return "Please select at least one source option (Any, Exact Match, or Network)";
  }
  if (draft.sourceExactMatch && draft.sourceNetwork.trim()) {
    return "Exact Match and Network cannot be used together";
  }
  return null;
}

export function buildAccessListPayload(
  draft: AccessListRuleDraft,
  listType: string,
  includeRuleNumber: boolean,
): Partial<AccessListRule> {
  const payload: Partial<AccessListRule> = {
    action: draft.action,
    description: draft.description.trim() || null,
  };
  if (includeRuleNumber) payload.rule_number = draft.ruleNumber;
  if (listType === "ipv4") {
    payload.source_type = draft.sourceType === "network" ? "inverse-mask" : draft.sourceType;
    payload.source_address = draft.sourceAddress.trim() || null;
    payload.source_mask = draft.sourceMask.trim() || null;
    payload.destination_type = draft.destinationType === "network" ? "inverse-mask" : draft.destinationType;
    payload.destination_address = draft.destinationAddress.trim() || null;
    payload.destination_mask = draft.destinationMask.trim() || null;
  } else {
    if (draft.sourceAny) payload.source_type = "any";
    if (draft.sourceNetwork.trim()) {
      payload.source_address = draft.sourceNetwork.trim();
      if (!draft.sourceAny) payload.source_type = "network";
    }
    if (draft.sourceExactMatch) payload.source_exact_match = true;
  }
  return payload;
}

function payloadKey(payload: Partial<AccessListRule>): string {
  return JSON.stringify({
    action: payload.action,
    description: payload.description ?? null,
    source_type: payload.source_type ?? null,
    source_address: payload.source_address ?? null,
    source_mask: payload.source_mask ?? null,
    source_exact_match: payload.source_exact_match ?? false,
    destination_type: payload.destination_type ?? null,
    destination_address: payload.destination_address ?? null,
    destination_mask: payload.destination_mask ?? null,
  });
}

export function buildAccessListUpdate(
  draft: AccessListRuleDraft,
  current: AccessListRule,
  listType: string,
): Partial<AccessListRule> | null {
  const next = buildAccessListPayload(draft, listType, false);
  const currentAs = buildAccessListPayload(accessListRuleDraftFrom(current, listType), listType, false);
  if (payloadKey(next) === payloadKey(currentAs)) return null;
  return next;
}

export function submitAccessListCreate(
  identifier: string,
  listType: string,
  draft: AccessListRuleDraft,
  service: AccessListService = accessListService,
): Promise<VyOSResponse> {
  return service.addRule(identifier, listType, buildAccessListPayload(draft, listType, true));
}

export async function submitAccessListUpdate(
  identifier: string,
  listType: string,
  current: AccessListRule,
  draft: AccessListRuleDraft,
  service: AccessListService = accessListService,
): Promise<VyOSResponse | null> {
  const config = buildAccessListUpdate(draft, current, listType);
  if (!config) return null;
  return service.updateRule(identifier, listType, current.rule_number, config);
}
