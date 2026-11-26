/**
 * Form-only helpers of the prefix-list modals. Every emit and save check
 * lives in `@/lib/api/prefix-list-save-ops`.
 */

import type { PrefixListCapabilitiesResponse, PrefixListRule, PrefixListType } from "@/lib/api/prefix-list";
import { lengthRange, prefixListRange, prefixLengthOf } from "@/lib/api/prefix-list-save-ops";
import { nextRuleNumber } from "./route-rule-form";

type Caps = PrefixListCapabilitiesResponse | null;

/** The family label the page, the badges and the dialogs show. */
export function familyLabel(listType: PrefixListType): "IPv4" | "IPv6" {
  return listType === "ipv6" ? "IPv6" : "IPv4";
}

/** A free rule number inside the served rule range. */
export function suggestedRuleNumber(rules: PrefixListRule[], caps: Caps): string {
  return nextRuleNumber(
    rules.map((r) => r.rule_number),
    prefixListRange(caps, "rule"),
  );
}

/** The ge/le input bounds: from the typed prefix length up to the family maximum. */
export function geLeBounds(listType: PrefixListType, prefix: string, caps: Caps): { min?: number; max?: number } {
  const range = lengthRange(caps, listType);
  return { min: prefixLengthOf(prefix) ?? range?.min, max: range?.max };
}
