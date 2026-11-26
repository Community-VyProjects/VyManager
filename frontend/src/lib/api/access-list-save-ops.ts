import type {
  AccessList,
  AccessListBatchOperation,
  AccessListCapabilitiesResponse,
  AccessListRange,
  AccessListRangeKey,
  AccessListRule,
  AccessListType,
} from "./access-list";
import { isIpv4, isIpv6Prefix } from "./ospfv3-save-ops";
import { ipv6Key } from "./pim6-save-ops";

/** Lab `description` bound (list and rule), used when capabilities have not loaded. */
export const DESCRIPTION_MAX_LENGTH = 255;
/** Lab `allowed:` of rule action, used when capabilities have not loaded. */
export const RULE_ACTIONS = ["permit", "deny"];
/** Lab rule and IPv4 list-number bounds, used when capabilities have not loaded. */
export const RANGES: Record<AccessListRangeKey, AccessListRange> = {
  rule: { min: 1, max: 65535 },
  ipv4_list: { min: 0, max: 4294967295 },
};
/** IPv4 list numbers whose rules need a destination, used when capabilities have not loaded. */
export const EXTENDED_RANGES: AccessListRange[] = [
  { min: 100, max: 199 },
  { min: 2000, max: 2699 },
];

type Caps = AccessListCapabilitiesResponse | null;
type Op = AccessListBatchOperation;

// ============================================================================
// Forms
// ============================================================================

/** One source or destination leaf choice: `any` (flag), `host`, or `network`. */
export type EndpointChoice = "any" | "host" | "network";
/** A standard IPv4 list may also leave the destination unset. */
export type DestinationChoice = EndpointChoice | "none";

export interface AccessListForm {
  /** The IPv4 list number or the IPv6 list name. */
  name: string;
  description: string;
}

export interface AccessListRuleForm {
  rule_number: string;
  action: string;
  description: string;
  /** "" only for a loaded rule with no source leaf. */
  source: EndpointChoice | "";
  source_host: string;
  source_network: string;
  source_inverse_mask: string;
  source_exact_match: boolean;
  /** Ignored on IPv6 lists, which have no destination. */
  destination: DestinationChoice;
  destination_host: string;
  destination_network: string;
  destination_inverse_mask: string;
}

/** The source choices of a list type: IPv6 has no host leaf. */
export function sourceChoices(listType: AccessListType): EndpointChoice[] {
  return listType === "ipv6" ? ["any", "network"] : ["any", "host", "network"];
}

/** The destination choices of an IPv4 list: an extended list requires one. */
export function destinationChoices(extended: boolean): DestinationChoice[] {
  return extended ? ["any", "host", "network"] : ["none", "any", "host", "network"];
}

export function emptyRuleForm(ruleNumber: string = "", action: string = ""): AccessListRuleForm {
  return {
    rule_number: ruleNumber,
    action,
    description: "",
    source: "any",
    source_host: "",
    source_network: "",
    source_inverse_mask: "",
    source_exact_match: false,
    destination: "any",
    destination_host: "",
    destination_network: "",
    destination_inverse_mask: "",
  };
}

const str = (value: string | number | null | undefined): string => (value == null ? "" : String(value));

/** The device may hold two source leaves (any + network); FRR uses `any`, so any > host > network. */
function choiceOf(any: boolean, host: string | null, network: string | null): EndpointChoice | "" {
  if (any) return "any";
  if (host) return "host";
  if (network) return "network";
  return "";
}

/** The editable form of a loaded rule. The text of every loaded leaf is kept for a choice switch. */
export function ruleFormFrom(rule: AccessListRule): AccessListRuleForm {
  return {
    rule_number: String(rule.rule_number),
    action: str(rule.action),
    description: str(rule.description),
    source: choiceOf(rule.source_any, rule.source_host, rule.source_network),
    source_host: str(rule.source_host),
    source_network: str(rule.source_network),
    source_inverse_mask: str(rule.source_inverse_mask),
    source_exact_match: rule.source_exact_match,
    destination: choiceOf(rule.destination_any, rule.destination_host, rule.destination_network) || "none",
    destination_host: str(rule.destination_host),
    destination_network: str(rule.destination_network),
    destination_inverse_mask: str(rule.destination_inverse_mask),
  };
}

export function listFormFrom(list: AccessList): AccessListForm {
  return { name: list.number, description: str(list.description) };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

/**
 * Trims every field and keeps only the leaves of the chosen source and
 * destination that the list type has: IPv6 has no host, inverse-mask or
 * destination, and exact-match only goes with a network.
 */
export function normalizeRuleForm(listType: AccessListType, form: AccessListRuleForm): AccessListRuleForm {
  const ipv4 = listType === "ipv4";
  const source = (sourceChoices(listType) as string[]).includes(form.source) ? form.source : "";
  const destination: DestinationChoice = ipv4 && destinationChoices(false).includes(form.destination)
    ? form.destination
    : "none";
  return {
    rule_number: form.rule_number.trim(),
    action: form.action.trim(),
    description: form.description.trim(),
    source,
    source_host: source === "host" ? form.source_host.trim() : "",
    source_network: source === "network" ? form.source_network.trim() : "",
    source_inverse_mask: ipv4 && source === "network" ? form.source_inverse_mask.trim() : "",
    source_exact_match: !ipv4 && source === "network" && form.source_exact_match,
    destination,
    destination_host: destination === "host" ? form.destination_host.trim() : "",
    destination_network: destination === "network" ? form.destination_network.trim() : "",
    destination_inverse_mask: destination === "network" ? form.destination_inverse_mask.trim() : "",
  };
}

export function normalizeListForm(form: AccessListForm): AccessListForm {
  return { name: form.name.trim(), description: form.description.trim() };
}

// ============================================================================
// Emits
// ============================================================================

/** The rule's leaves, one per lab leaf; `destination` is the destination node itself. */
interface RuleLeaves {
  action: string;
  description: string;
  source_any: boolean;
  source_host: string;
  source_network: string;
  source_inverse_mask: string;
  source_exact_match: boolean;
  destination: boolean;
  destination_any: boolean;
  destination_host: string;
  destination_network: string;
  destination_inverse_mask: string;
}

const NO_LEAVES: RuleLeaves = {
  action: "",
  description: "",
  source_any: false,
  source_host: "",
  source_network: "",
  source_inverse_mask: "",
  source_exact_match: false,
  destination: false,
  destination_any: false,
  destination_host: "",
  destination_network: "",
  destination_inverse_mask: "",
};

/** The leaves the device holds, every one of them (two source leaves included). */
function storedLeaves(rule: AccessListRule): RuleLeaves {
  const t = (value: string | null) => str(value).trim();
  const leaves = {
    action: t(rule.action),
    description: t(rule.description),
    source_any: rule.source_any,
    source_host: t(rule.source_host),
    source_network: t(rule.source_network),
    source_inverse_mask: t(rule.source_inverse_mask),
    source_exact_match: rule.source_exact_match,
    destination_any: rule.destination_any,
    destination_host: t(rule.destination_host),
    destination_network: t(rule.destination_network),
    destination_inverse_mask: t(rule.destination_inverse_mask),
  };
  const destination =
    leaves.destination_any || !!(leaves.destination_host || leaves.destination_network || leaves.destination_inverse_mask);
  return { ...leaves, destination };
}

/** The leaves a normalized form asks for. */
function formLeaves(f: AccessListRuleForm): RuleLeaves {
  return {
    action: f.action,
    description: f.description,
    source_any: f.source === "any",
    source_host: f.source_host,
    source_network: f.source_network,
    source_inverse_mask: f.source_inverse_mask,
    source_exact_match: f.source_exact_match,
    destination: f.destination !== "none",
    destination_any: f.destination === "any",
    destination_host: f.destination_host,
    destination_network: f.destination_network,
    destination_inverse_mask: f.destination_inverse_mask,
  };
}

const same = (value: string) => value;

/** Single-value leaf: change = one set (replaces), clear = delete with no value. */
function leaf(setOp: string, deleteOp: string, before: string, after: string, key: (v: string) => string = same): Op[] {
  if (after && (!before || key(after) !== key(before))) return [{ op: setOp, value: after }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** Valueless flag leaf. */
function flag(setOp: string, deleteOp: string, before: boolean, after: boolean): Op[] {
  if (after && !before) return [{ op: setOp }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** Action is required by the lab verify, so it is only ever replaced. */
function required(setOp: string, before: string, after: string): Op[] {
  return after && after !== before ? [{ op: setOp, value: after }] : [];
}

export function listCreateOps(form: AccessListForm): Op[] {
  const f = normalizeListForm(form);
  return [
    { op: "create_access_list" },
    ...leaf("set_access_list_description", "delete_access_list_description", "", f.description),
  ];
}

export function listUpdateOps(original: AccessList, updated: AccessListForm): Op[] {
  const b = normalizeListForm(listFormFrom(original));
  const a = normalizeListForm(updated);
  return leaf("set_access_list_description", "delete_access_list_description", b.description, a.description);
}

export function listDeleteOps(): Op[] {
  return [{ op: "delete_access_list" }];
}

export function ruleDeleteOps(): Op[] {
  return [{ op: "delete_rule" }];
}

function destinationOps(b: RuleLeaves, a: RuleLeaves): Op[] {
  // "none" on a standard list: the whole node goes, whatever leaves it held.
  if (!a.destination) return b.destination ? [{ op: "delete_rule_destination" }] : [];
  return [
    ...flag("set_rule_destination_any", "delete_rule_destination_any", b.destination_any, a.destination_any),
    ...leaf("set_rule_destination_host", "delete_rule_destination_host", b.destination_host, a.destination_host),
    ...leaf(
      "set_rule_destination_network",
      "delete_rule_destination_network",
      b.destination_network,
      a.destination_network,
    ),
    ...leaf(
      "set_rule_destination_inverse_mask",
      "delete_rule_destination_inverse_mask",
      b.destination_inverse_mask,
      a.destination_inverse_mask,
    ),
  ];
}

/**
 * Ops for one rule: create (original null) or the diff of an edit, leaf by
 * leaf against the stored rule. Create and edit share this emit, so the two
 * cannot offer different leaves. A source switch sets the new leaf and
 * deletes the old ones in the same batch (the lab needs a source at commit).
 */
export function ruleSaveOps(listType: AccessListType, original: AccessListRule | null, updated: AccessListRuleForm): Op[] {
  const b = original ? storedLeaves(original) : NO_LEAVES;
  const a = formLeaves(normalizeRuleForm(listType, updated));
  if (listType === "ipv6") {
    return [
      ...(original ? [] : [{ op: "create_rule" }]),
      ...required("set_rule_action", b.action, a.action),
      ...leaf("set_rule_description", "delete_rule_description", b.description, a.description),
      ...flag("set_rule_source_any", "delete_rule_source_any", b.source_any, a.source_any),
      ...leaf("set_rule_source_network", "delete_rule_source_network", b.source_network, a.source_network, ipv6Key),
      ...flag("set_rule_source_exact_match", "delete_rule_source_exact_match", b.source_exact_match, a.source_exact_match),
    ];
  }
  return [
    ...(original ? [] : [{ op: "create_rule" }]),
    ...required("set_rule_action", b.action, a.action),
    ...leaf("set_rule_description", "delete_rule_description", b.description, a.description),
    ...flag("set_rule_source_any", "delete_rule_source_any", b.source_any, a.source_any),
    ...leaf("set_rule_source_host", "delete_rule_source_host", b.source_host, a.source_host),
    ...leaf("set_rule_source_network", "delete_rule_source_network", b.source_network, a.source_network),
    ...leaf("set_rule_source_inverse_mask", "delete_rule_source_inverse_mask", b.source_inverse_mask, a.source_inverse_mask),
    ...destinationOps(b, a),
  ];
}

// ============================================================================
// Save checks
// ============================================================================

export type AccessListRuleProblemKey =
  | "ruleNumberRequired"
  | "ruleNumberRange"
  | "ruleNumberTaken"
  | "actionRequired"
  | "actionInvalid"
  | "descriptionTooLong"
  | "sourceRequired"
  | "sourceHostInvalid"
  | "sourceNetworkInvalid"
  | "sourceNetworkInvalidIpv6"
  | "sourceInverseMaskInvalid"
  | "destinationRequired"
  | "destinationHostInvalid"
  | "destinationNetworkInvalid"
  | "destinationInverseMaskInvalid";

export interface AccessListRuleProblem {
  key: AccessListRuleProblemKey;
  min?: number;
  max?: number;
}

export type AccessListProblemKey = "nameRequired" | "numberInvalid" | "nameInvalid" | "nameTaken" | "descriptionTooLong";

export interface AccessListProblem {
  key: AccessListProblemKey;
  min?: number;
  max?: number;
}

export function accessListRange(caps: Caps, key: AccessListRangeKey): AccessListRange {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : RANGES[key];
}

export function extendedRanges(caps: Caps): AccessListRange[] {
  return caps?.extended_ranges?.length ? caps.extended_ranges : EXTENDED_RANGES;
}

export function descriptionMaxLength(caps: Caps): number {
  return caps?.description_max_length || DESCRIPTION_MAX_LENGTH;
}

export function ruleActions(caps: Caps): string[] {
  return caps?.values?.rule_actions?.length ? caps.values.rule_actions : RULE_ACTIONS;
}

/** ASCII digits (at most 10, as the builder takes them) inside the range. */
function inRange(value: string, range: AccessListRange): boolean {
  if (!/^[0-9]{1,10}$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/** One line, at most the served length in code points (as the builder counts). */
function descriptionValid(value: string, caps: Caps): boolean {
  return !/[\r\n]/.test(value) && [...value].length <= descriptionMaxLength(caps);
}

/** An IPv4 list whose number is in an extended range: every rule needs a destination. */
export function isExtendedList(caps: Caps, listType: AccessListType, name: string): boolean {
  const number = name.trim();
  if (listType !== "ipv4" || !/^[0-9]{1,10}$/.test(number)) return false;
  const n = Number(number);
  return extendedRanges(caps).some((range) => n >= range.min && n <= range.max);
}

/**
 * An IPv6 prefix the lab validator takes: no host bits, no zone index, no
 * dotted IPv4 tail, no leading zero in the length.
 */
export function ipv6NetworkValid(value: string): boolean {
  return !value.split("/")[0].includes(".") && isIpv6Prefix(value);
}

function endpointProblem(
  f: AccessListRuleForm,
  endpoint: "source" | "destination",
  listType: AccessListType,
): AccessListRuleProblem | null {
  const choice = endpoint === "source" ? f.source : f.destination;
  const host = endpoint === "source" ? f.source_host : f.destination_host;
  const network = endpoint === "source" ? f.source_network : f.destination_network;
  const mask = endpoint === "source" ? f.source_inverse_mask : f.destination_inverse_mask;
  if (choice === "host" && !isIpv4(host)) return { key: `${endpoint}HostInvalid` };
  if (choice === "network") {
    if (listType === "ipv6") return ipv6NetworkValid(network) ? null : { key: "sourceNetworkInvalidIpv6" };
    // The lab takes an address plus an inverse-mask, not a CIDR prefix.
    if (!isIpv4(network)) return { key: `${endpoint}NetworkInvalid` };
    if (!isIpv4(mask)) return { key: `${endpoint}InverseMaskInvalid` };
  }
  return null;
}

/** A rule batch the lab would reject, or null. */
export function accessListRuleProblem(
  listType: AccessListType,
  /** The list is an extended IPv4 list (see `isExtendedList`). */
  extended: boolean,
  original: AccessListRule | null,
  updated: AccessListRuleForm,
  caps: Caps,
  /** The list's rules as loaded. */
  existingRules: AccessListRule[],
): AccessListRuleProblem | null {
  const f = normalizeRuleForm(listType, updated);

  if (!original) {
    if (!f.rule_number) return { key: "ruleNumberRequired" };
    const range = accessListRange(caps, "rule");
    if (!inRange(f.rule_number, range)) return { key: "ruleNumberRange", min: range.min, max: range.max };
    if (existingRules.some((r) => r.rule_number === Number(f.rule_number))) return { key: "ruleNumberTaken" };
  }
  // Lab verify: a rule needs an action and a source.
  if (!f.action) return { key: "actionRequired" };
  if (!ruleActions(caps).includes(f.action)) return { key: "actionInvalid" };
  if (!descriptionValid(f.description, caps)) return { key: "descriptionTooLong", max: descriptionMaxLength(caps) };
  if (!f.source) return { key: "sourceRequired" };
  const source = endpointProblem(f, "source", listType);
  if (source) return source;
  if (listType === "ipv4") {
    // An extended list commit fails with "A destination must be specified".
    if (extended && f.destination === "none") return { key: "destinationRequired" };
    const destination = endpointProblem(f, "destination", listType);
    if (destination) return destination;
  }
  return null;
}

/** The IPv4 number or IPv6 name compare key of a list, for the taken check. */
function listKey(listType: AccessListType, name: string): string {
  return listType === "ipv4" && /^[0-9]+$/.test(name) ? String(Number(name)) : name;
}

/**
 * A list create or edit the lab would reject, or null. `existingNames` (same
 * family) is null on edit, where the name is locked.
 */
export function accessListProblem(
  listType: AccessListType,
  form: AccessListForm,
  existingNames: string[] | null,
  caps: Caps,
): AccessListProblem | null {
  const f = normalizeListForm(form);
  if (existingNames) {
    if (!f.name) return { key: "nameRequired" };
    if (listType === "ipv4") {
      // The lab verify calls int() on the number: ASCII digits in the u32 range.
      const range = accessListRange(caps, "ipv4_list");
      if (!inRange(f.name, range)) return { key: "numberInvalid", min: range.min, max: range.max };
    } else if (/\s/.test(f.name)) {
      return { key: "nameInvalid" };
    }
    const key = listKey(listType, f.name);
    if (existingNames.some((name) => listKey(listType, name) === key)) return { key: "nameTaken" };
  }
  if (!descriptionValid(f.description, caps)) return { key: "descriptionTooLong", max: descriptionMaxLength(caps) };
  return null;
}
