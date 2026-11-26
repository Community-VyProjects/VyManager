import type {
  PrefixList,
  PrefixListBatchOperation,
  PrefixListCapabilitiesResponse,
  PrefixListRange,
  PrefixListRangeKey,
  PrefixListRule,
  PrefixListType,
} from "./prefix-list";
import { isIpv6Prefix } from "./ospfv3-save-ops";
import { ipv6Key } from "./pim6-save-ops";
import { isIPv4Prefix } from "../validators/ipv4-prefix";

/** Lab `description` bound (list and rule), used when capabilities have not loaded. */
export const DESCRIPTION_MAX_LENGTH = 255;
/** Lab tag regex of a prefix-list / prefix-list6 name. */
export const LIST_NAME_PATTERN = /^[-_a-zA-Z0-9]+$/;
/** Lab `allowed:` of rule action, used when capabilities have not loaded. */
export const RULE_ACTIONS = ["permit", "deny"];

type Caps = PrefixListCapabilitiesResponse | null;
type Op = PrefixListBatchOperation;

// ============================================================================
// Forms
// ============================================================================

export interface PrefixListForm {
  name: string;
  description: string;
}

export interface PrefixListRuleForm {
  rule_number: string;
  action: string;
  description: string;
  prefix: string;
  ge: string;
  le: string;
}

export function emptyRuleForm(ruleNumber: string = ""): PrefixListRuleForm {
  return { rule_number: ruleNumber, action: "", description: "", prefix: "", ge: "", le: "" };
}

const str = (value: string | number | null | undefined): string => (value == null ? "" : String(value));

/** The editable form of a loaded rule. */
export function ruleFormFrom(rule: PrefixListRule): PrefixListRuleForm {
  return {
    rule_number: String(rule.rule_number),
    action: str(rule.action),
    description: str(rule.description),
    prefix: str(rule.prefix),
    ge: str(rule.ge),
    le: str(rule.le),
  };
}

export function listFormFrom(list: PrefixList): PrefixListForm {
  return { name: list.name, description: str(list.description) };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

export function normalizeRuleForm(form: PrefixListRuleForm): PrefixListRuleForm {
  return {
    rule_number: form.rule_number.trim(),
    action: form.action.trim(),
    description: form.description.trim(),
    prefix: form.prefix.trim(),
    ge: form.ge.trim(),
    le: form.le.trim(),
  };
}

export function normalizeListForm(form: PrefixListForm): PrefixListForm {
  return { name: form.name.trim(), description: form.description.trim() };
}

// ============================================================================
// Emits
// ============================================================================

/** Single-value leaf: change = one set (replaces), clear = delete with no value. */
function leaf(setOp: string, deleteOp: string, before: string, after: string): Op[] {
  if (after && after !== before) return [{ op: setOp, value: after }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** A required leaf (action, prefix): the lab verify needs it, so it is only ever replaced. */
function required(setOp: string, before: string, after: string): Op[] {
  return after && after !== before ? [{ op: setOp, value: after }] : [];
}

export function listCreateOps(form: PrefixListForm): Op[] {
  const f = normalizeListForm(form);
  return [
    { op: "create_prefix_list" },
    ...leaf("set_prefix_list_description", "delete_prefix_list_description", "", f.description),
  ];
}

export function listUpdateOps(original: PrefixList, updated: PrefixListForm): Op[] {
  const b = normalizeListForm(listFormFrom(original));
  const a = normalizeListForm(updated);
  return leaf("set_prefix_list_description", "delete_prefix_list_description", b.description, a.description);
}

export function listDeleteOps(): Op[] {
  return [{ op: "delete_prefix_list" }];
}

export function ruleDeleteOps(): Op[] {
  return [{ op: "delete_rule" }];
}

/** Ops for one rule: create (original null) or the diff of an edit. */
export function ruleSaveOps(original: PrefixListRule | null, updated: PrefixListRuleForm): Op[] {
  const before = normalizeRuleForm(original ? ruleFormFrom(original) : emptyRuleForm());
  const after = normalizeRuleForm(updated);
  return [
    ...(original ? [] : [{ op: "create_rule" }]),
    ...required("set_rule_action", before.action, after.action),
    ...leaf("set_rule_description", "delete_rule_description", before.description, after.description),
    ...required("set_rule_prefix", before.prefix, after.prefix),
    ...leaf("set_rule_ge", "delete_rule_ge", before.ge, after.ge),
    ...leaf("set_rule_le", "delete_rule_le", before.le, after.le),
  ];
}

// ============================================================================
// Save checks
// ============================================================================

export type PrefixListRuleProblemKey =
  | "ruleNumberRequired"
  | "ruleNumberRange"
  | "ruleNumberTaken"
  | "actionRequired"
  | "actionInvalid"
  | "descriptionTooLong"
  | "prefixRequired"
  | "prefixInvalidIpv4"
  | "prefixInvalidIpv6"
  | "geRange"
  | "leRange"
  | "geBelowLength"
  | "leBelowLength"
  | "geAboveLe"
  | "ruleDuplicate";

export interface PrefixListRuleProblem {
  key: PrefixListRuleProblemKey;
  min?: number;
  max?: number;
  length?: number;
  /** The rule this one duplicates (ruleDuplicate). */
  rule?: number;
}

export type PrefixListProblemKey = "nameRequired" | "nameInvalid" | "nameTaken" | "descriptionTooLong";

export interface PrefixListProblem {
  key: PrefixListProblemKey;
  max?: number;
}

export function prefixListRange(caps: Caps, key: PrefixListRangeKey): PrefixListRange | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

/** The ge / le range of this list type. */
export function lengthRange(caps: Caps, listType: PrefixListType): PrefixListRange | null {
  return prefixListRange(caps, listType === "ipv6" ? "prefix_length_ipv6" : "prefix_length_ipv4");
}

export function descriptionMaxLength(caps: Caps): number {
  return caps?.description_max_length || DESCRIPTION_MAX_LENGTH;
}

export function ruleActions(caps: Caps): string[] {
  return caps?.values?.rule_actions?.length ? caps.values.rule_actions : RULE_ACTIONS;
}

function inRange(value: string, range: PrefixListRange | null): boolean {
  if (!/^\d+$/.test(value)) return false;
  if (!range) return true;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/**
 * A prefix of the list's family the lab validator takes: no host bits, no
 * zone index, and for IPv6 no dotted IPv4 tail (::ffff:10.0.0.0/104 is
 * rejected; the hex form ::ffff:a00:0/104 is valid).
 */
export function prefixValid(listType: PrefixListType, value: string): boolean {
  if (listType === "ipv6") return !value.split("/")[0].includes(".") && isIpv6Prefix(value);
  return isIPv4Prefix(value);
}

/** The length of a `<address>/<length>` prefix, or null when it has none. */
export function prefixLengthOf(prefix: string): number | null {
  const match = /\/(\d{1,3})$/.exec(prefix.trim());
  return match ? Number(match[1]) : null;
}

/** How many rules a pending reorder renumbers: those not already at their sorted slot. */
export function reorderMoveCount(order: number[]): number {
  const slots = [...order].sort((a, b) => a - b);
  return order.filter((number, i) => number !== slots[i]).length;
}

/** A rule batch the lab would reject, or null. */
export function prefixListRuleProblem(
  listType: PrefixListType,
  original: PrefixListRule | null,
  updated: PrefixListRuleForm,
  caps: Caps,
  /** The list's rules as loaded; on edit the edited rule is skipped. */
  existingRules: PrefixListRule[],
): PrefixListRuleProblem | null {
  const f = normalizeRuleForm(updated);
  const existingRuleNumbers = existingRules.map((r) => r.rule_number);

  if (!original) {
    if (!f.rule_number) return { key: "ruleNumberRequired" };
    const ruleRange = prefixListRange(caps, "rule");
    if (!inRange(f.rule_number, ruleRange)) return { key: "ruleNumberRange", min: ruleRange?.min, max: ruleRange?.max };
    if (existingRuleNumbers.includes(Number(f.rule_number))) return { key: "ruleNumberTaken" };
  }
  // Lab verify: a rule needs an action and a prefix.
  if (!f.action) return { key: "actionRequired" };
  if (!ruleActions(caps).includes(f.action)) return { key: "actionInvalid" };
  const maxLength = descriptionMaxLength(caps);
  if (f.description.length > maxLength) return { key: "descriptionTooLong", max: maxLength };
  if (!f.prefix) return { key: "prefixRequired" };
  if (!prefixValid(listType, f.prefix)) return { key: listType === "ipv6" ? "prefixInvalidIpv6" : "prefixInvalidIpv4" };

  const range = lengthRange(caps, listType);
  if (f.ge && !inRange(f.ge, range)) return { key: "geRange", min: range?.min, max: range?.max };
  if (f.le && !inRange(f.le, range)) return { key: "leRange", min: range?.min, max: range?.max };
  // 1.5 verify (1.4 has none, and anything that passes commits there too):
  // ge >= prefix length, le >= prefix length, ge <= le; equal is allowed.
  const length = prefixLengthOf(f.prefix) ?? 0;
  if (f.ge && Number(f.ge) < length) return { key: "geBelowLength", length };
  if (f.le && Number(f.le) < length) return { key: "leBelowLength", length };
  if (f.ge && f.le && Number(f.ge) > Number(f.le)) return { key: "geAboveLe" };
  // Both 1.4 and 1.5 reject a rule whose whole config equals another rule's
  // in the same list.
  const key = ruleCompareKey(listType, f);
  const twin = existingRules.find(
    (r) => r.rule_number !== original?.rule_number && ruleCompareKey(listType, ruleFormFrom(r)) === key,
  );
  if (twin) return { key: "ruleDuplicate", rule: twin.rule_number };
  return null;
}

/**
 * Compare key of a rule's whole config (action, description, prefix, ge, le):
 * IPv6 prefix text lowercased and compressed, ge/le numeric.
 */
export function ruleCompareKey(listType: PrefixListType, form: PrefixListRuleForm): string {
  const f = normalizeRuleForm(form);
  const prefix = listType === "ipv6" ? ipv6Key(f.prefix) : f.prefix.toLowerCase();
  const num = (value: string) => (/^\d+$/.test(value) ? String(Number(value)) : value);
  return JSON.stringify([f.action, f.description, prefix, num(f.ge), num(f.le)]);
}

/** A list create or edit the lab would reject, or null. `existingNames` (same family) is null on edit. */
export function prefixListProblem(form: PrefixListForm, existingNames: string[] | null, caps: Caps): PrefixListProblem | null {
  const f = normalizeListForm(form);
  if (existingNames) {
    if (!f.name) return { key: "nameRequired" };
    if (!LIST_NAME_PATTERN.test(f.name)) return { key: "nameInvalid" };
    if (existingNames.includes(f.name)) return { key: "nameTaken" };
  }
  const maxLength = descriptionMaxLength(caps);
  if (f.description.length > maxLength) return { key: "descriptionTooLong", max: maxLength };
  return null;
}
