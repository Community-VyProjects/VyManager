import type {
  PolicyRoute,
  PolicyRouteRule,
  RouteBatchOperation,
  RouteCapabilitiesResponse,
  RoutePolicyType,
  RouteRange,
} from "./route";

/** Lab `description` bound, used when capabilities have not loaded. */
export const DESCRIPTION_MAX_LENGTH = 255;
/** Lab tag syntax of a policy route / route6 name. */
export const POLICY_NAME_PATTERN = /^[-_a-zA-Z0-9.]+$/;

// ============================================================================
// Forms
// ============================================================================

export interface PolicyForm {
  name: string;
  description: string;
  default_log: boolean;
  interfaces: string[];
}

export const SINGLE_KEYS = [
  "source_address",
  "source_port",
  "source_mac_address",
  "source_group_address",
  "source_group_domain",
  "source_group_mac",
  "source_group_network",
  "source_group_port",
  "destination_address",
  "destination_port",
  "destination_group_address",
  "destination_group_domain",
  "destination_group_mac",
  "destination_group_network",
  "destination_group_port",
  "protocol",
  "tcp_mss",
  "icmp_code",
  "icmp_type",
  "icmp_type_name",
  "icmpv6_type",
  "ttl_eq",
  "ttl_gt",
  "ttl_lt",
  "hop_limit_eq",
  "hop_limit_gt",
  "hop_limit_lt",
  "packet_type",
  "mark",
  "time_monthdays",
  "time_startdate",
  "time_starttime",
  "time_stopdate",
  "time_stoptime",
  "limit_burst",
  "limit_rate",
  "recent_count",
  "recent_time",
  "set_connection_mark",
  "set_dscp",
  "set_mark",
  "set_table",
  "set_tcp_mss",
  "set_vrf",
] as const;
export type SingleKey = (typeof SINGLE_KEYS)[number];

export const LIST_KEYS = [
  "source_geoip_country_code",
  "source_geoip_asn",
  "destination_geoip_country_code",
  "destination_geoip_asn",
  "tcp_flags",
  "tcp_flags_not",
  "fragment",
  "ipsec",
  "packet_length",
  "packet_length_exclude",
  "dscp",
  "dscp_exclude",
  "state",
  "connection_mark",
  "time_weekdays",
] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export const FLAG_KEYS = ["source_geoip_inverse", "destination_geoip_inverse", "time_utc"] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

export type RouteRuleForm = {
  rule_number: string;
  description: string;
  disable: boolean;
  log: boolean;
  action: string;
} & Record<SingleKey, string> &
  Record<ListKey, string[]> &
  Record<FlagKey, boolean>;

export function emptyRuleForm(ruleNumber: string = ""): RouteRuleForm {
  const form = { rule_number: ruleNumber, description: "", disable: false, log: false, action: "" } as RouteRuleForm;
  for (const key of SINGLE_KEYS) form[key] = "";
  for (const key of LIST_KEYS) form[key] = [];
  for (const key of FLAG_KEYS) form[key] = false;
  return form;
}

const str = (value: string | null | undefined): string => value ?? "";
const list = (value: string[] | null | undefined): string[] => [...(value ?? [])];

/** The editable form of a loaded rule. */
export function ruleFormFrom(rule: PolicyRouteRule): RouteRuleForm {
  const m = rule.match;
  const s = rule.set;
  const form = emptyRuleForm(String(rule.rule_number));
  form.description = str(rule.description);
  form.disable = rule.disable === true;
  form.log = rule.log === true;
  form.action = str(rule.action);
  for (const key of SINGLE_KEYS) {
    if (key.startsWith("set_")) continue;
    form[key] = str((m as unknown as Record<string, string | null>)[key]);
  }
  form.set_connection_mark = str(s.connection_mark);
  form.set_dscp = str(s.dscp);
  form.set_mark = str(s.mark);
  form.set_table = str(s.table);
  form.set_tcp_mss = str(s.tcp_mss);
  form.set_vrf = str(s.vrf);
  form.source_geoip_country_code = list(m.source_geoip?.country_code);
  form.source_geoip_asn = list(m.source_geoip?.asn);
  form.source_geoip_inverse = m.source_geoip?.inverse_match === true;
  form.destination_geoip_country_code = list(m.destination_geoip?.country_code);
  form.destination_geoip_asn = list(m.destination_geoip?.asn);
  form.destination_geoip_inverse = m.destination_geoip?.inverse_match === true;
  for (const key of [
    "tcp_flags",
    "tcp_flags_not",
    "fragment",
    "ipsec",
    "packet_length",
    "packet_length_exclude",
    "dscp",
    "dscp_exclude",
    "state",
    "connection_mark",
  ] as const) {
    form[key] = list(m[key]);
  }
  form.time_weekdays = str(m.time_weekdays)
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);
  form.time_utc = m.time_utc === true;
  return form;
}

export function policyFormFrom(policy: PolicyRoute): PolicyForm {
  return {
    name: policy.name,
    description: str(policy.description),
    default_log: policy.default_log === true,
    interfaces: list(policy.interfaces),
  };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

function uniqueTrimmed(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Weekdays in capability order; a name the list lacks keeps its place at the end. */
function orderedWeekdays(days: string[], caps: RouteCapabilitiesResponse | null): string[] {
  const order = caps?.values?.weekdays || [];
  const known = order.filter((day) => days.includes(day));
  return [...known, ...days.filter((day) => !order.includes(day))];
}

/** Trim every field and dedupe every list, so the check and the emit see the same value. */
export function normalizeRuleForm(form: RouteRuleForm, caps: RouteCapabilitiesResponse | null): RouteRuleForm {
  const out = { ...form } as RouteRuleForm;
  out.rule_number = form.rule_number.trim();
  out.description = form.description.trim();
  out.action = form.action.trim();
  for (const key of SINGLE_KEYS) out[key] = (form[key] ?? "").trim();
  for (const key of LIST_KEYS) out[key] = uniqueTrimmed(form[key] ?? []);
  for (const key of FLAG_KEYS) out[key] = form[key] === true;
  out.source_geoip_country_code = out.source_geoip_country_code.map((c) => c.toLowerCase());
  out.destination_geoip_country_code = out.destination_geoip_country_code.map((c) => c.toLowerCase());
  out.source_geoip_country_code = [...new Set(out.source_geoip_country_code)];
  out.destination_geoip_country_code = [...new Set(out.destination_geoip_country_code)];
  out.time_weekdays = orderedWeekdays(out.time_weekdays, caps);
  return out;
}

export function normalizePolicyForm(form: PolicyForm): PolicyForm {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    default_log: form.default_log === true,
    interfaces: uniqueTrimmed(form.interfaces),
  };
}

// ============================================================================
// Emit helpers
// ============================================================================

type Op = RouteBatchOperation;

/** Single-value leaf: change = one set (replaces), clear = delete with no value. */
function leaf(setOp: string, deleteOp: string, before: string, after: string): Op[] {
  if (after && after !== before) return [{ op: setOp, value: after }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** `multi:` leaf: delete only removed values, set only added values. */
function multi(setOp: string, deleteOp: string, before: string[], after: string[]): Op[] {
  return [
    ...before.filter((v) => !after.includes(v)).map((value) => ({ op: deleteOp, value })),
    ...after.filter((v) => !before.includes(v)).map((value) => ({ op: setOp, value })),
  ];
}

/** Valueless flag. */
function flag(setOp: string, deleteOp: string, before: boolean, after: boolean): Op[] {
  if (after && !before) return [{ op: setOp }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** One field of a rule, as an emit node. */
type Node =
  | { kind: "single"; key: SingleKey; op: string; noSet?: boolean }
  | { kind: "list"; key: ListKey; op: string }
  | { kind: "joined"; key: ListKey; op: string }
  | { kind: "flag"; key: FlagKey; op: string }
  | { kind: "compare"; key: SingleKey; op: string; cmp: string }
  | { kind: "readonly"; key: SingleKey }
  | { kind: "section"; del: string; children: Node[] };

function nodeHasValue(node: Node, form: RouteRuleForm): boolean {
  switch (node.kind) {
    case "single":
    case "compare":
    case "readonly":
      return form[node.key] !== "";
    case "list":
    case "joined":
      return form[node.key].length > 0;
    case "flag":
      return form[node.key];
    case "section":
      return node.children.some((child) => nodeHasValue(child, form));
  }
}

function emitNode(node: Node, before: RouteRuleForm, after: RouteRuleForm): Op[] {
  switch (node.kind) {
    case "single": {
      const ops = leaf(`set_${node.op}`, `delete_${node.op}`, before[node.key], after[node.key]);
      return node.noSet ? ops.filter((o) => o.op.startsWith("delete_")) : ops;
    }
    case "compare": {
      const b = before[node.key];
      const a = after[node.key];
      if (a && a !== b) return [{ op: `set_${node.op}`, value: `${node.cmp}|${a}` }];
      if (!a && b) return [{ op: `delete_${node.op}`, value: node.cmp }];
      return [];
    }
    case "list":
      return multi(`set_${node.op}`, `delete_${node.op}`, before[node.key], after[node.key]);
    case "joined":
      return leaf(`set_${node.op}`, `delete_${node.op}`, before[node.key].join(","), after[node.key].join(","));
    case "flag":
      return flag(`set_${node.op}`, `delete_${node.op}`, before[node.key], after[node.key]);
    case "readonly":
      return [];
    case "section":
      // Every leaf under the node cleared: one section delete, no empty parent left behind.
      if (nodeHasValue(node, before) && !nodeHasValue(node, after)) return [{ op: node.del }];
      return node.children.flatMap((child) => emitNode(child, before, after));
  }
}

function single(key: SingleKey, op: string = `match_${key}`): Node {
  return { kind: "single", key, op };
}

function sideTree(side: "source" | "destination", caps: RouteCapabilitiesResponse | null): Node {
  const geoip: Node[] = caps?.features?.geoip_matching?.supported === true
    ? [
        {
          kind: "section",
          del: `delete_match_${side}_geoip`,
          children: [
            { kind: "list", key: `${side}_geoip_country_code`, op: `match_${side}_geoip_country_code` },
            { kind: "list", key: `${side}_geoip_asn`, op: `match_${side}_geoip_asn` },
            { kind: "flag", key: `${side}_geoip_inverse`, op: `match_${side}_geoip_inverse` },
          ],
        },
      ]
    : [];
  return {
    kind: "section",
    del: `delete_match_${side}`,
    children: [
      single(`${side}_address`),
      ...(side === "source" ? [single("source_mac_address")] : []),
      single(`${side}_port`),
      {
        kind: "section",
        del: `delete_match_${side}_group`,
        children: (["address", "domain", "mac", "network", "port"] as const).map((g) =>
          single(`${side}_group_${g}`),
        ),
      },
      ...geoip,
    ],
  };
}

const COMPARE = ["eq", "gt", "lt"] as const;

/** Every rule leaf this family and version has, grouped by its CLI parent node. */
function ruleTree(policyType: RoutePolicyType, caps: RouteCapabilitiesResponse | null): Node[] {
  const tcpMss: Node[] = caps?.features?.tcp_mss_matching?.supported === true ? [single("tcp_mss")] : [];
  const rateUnits = caps?.features?.limit_rate?.units || [];
  const family: Node[] =
    policyType === "route"
      ? [
          {
            kind: "section",
            del: "delete_match_icmp",
            children: [single("icmp_code"), single("icmp_type"), single("icmp_type_name")],
          },
          {
            kind: "section",
            del: "delete_match_ttl_node",
            children: COMPARE.map((cmp) => ({ kind: "compare", key: `ttl_${cmp}`, op: "match_ttl", cmp }) as Node),
          },
        ]
      : [
          // `icmpv6` has one child (`type`): clearing it deletes the section.
          { kind: "section", del: "delete_match_icmpv6", children: [single("icmpv6_type")] },
          {
            kind: "section",
            del: "delete_match_hop_limit_node",
            children: COMPARE.map(
              (cmp) => ({ kind: "compare", key: `hop_limit_${cmp}`, op: "match_hop_limit", cmp }) as Node,
            ),
          },
        ];
  const vrf: Node[] = caps?.features?.vrf_routing?.supported === true ? [single("set_vrf", "vrf")] : [];
  return [
    sideTree("source", caps),
    sideTree("destination", caps),
    single("protocol"),
    {
      kind: "section",
      del: "delete_match_tcp",
      children: [
        {
          kind: "section",
          del: "delete_match_tcp_flags",
          children: [
            { kind: "list", key: "tcp_flags", op: "match_tcp_flag" },
            {
              kind: "section",
              del: "delete_match_tcp_flags_not",
              children: [{ kind: "list", key: "tcp_flags_not", op: "match_tcp_flag_not" }],
            },
          ],
        },
        ...tcpMss,
      ],
    },
    ...family,
    { kind: "section", del: "delete_match_fragment_node", children: [{ kind: "list", key: "fragment", op: "match_fragment" }] },
    { kind: "section", del: "delete_match_ipsec_node", children: [{ kind: "list", key: "ipsec", op: "match_ipsec" }] },
    single("packet_type"),
    { kind: "list", key: "packet_length", op: "match_packet_length" },
    { kind: "list", key: "packet_length_exclude", op: "match_packet_length_exclude" },
    { kind: "list", key: "dscp", op: "match_dscp" },
    { kind: "list", key: "dscp_exclude", op: "match_dscp_exclude" },
    { kind: "list", key: "state", op: "match_state" },
    single("mark"),
    { kind: "list", key: "connection_mark", op: "match_connection_mark" },
    {
      kind: "section",
      del: "delete_match_time",
      children: [
        single("time_monthdays"),
        single("time_startdate"),
        single("time_starttime"),
        single("time_stopdate"),
        single("time_stoptime"),
        { kind: "joined", key: "time_weekdays", op: "match_time_weekdays" },
        { kind: "flag", key: "time_utc", op: "match_time_utc" },
      ],
    },
    {
      kind: "section",
      del: "delete_match_limit",
      children: [
        single("limit_burst"),
        // 1.4 has no rate unit and fails any rate at apply: it can only be cleared.
        { kind: "single", key: "limit_rate", op: "match_limit_rate", noSet: rateUnits.length === 0 },
      ],
    },
    // count/time fail at apply on both labs; the screen can only remove the node.
    { kind: "section", del: "delete_match_recent", children: [{ kind: "readonly", key: "recent_count" }, { kind: "readonly", key: "recent_time" }] },
    {
      kind: "section",
      del: "delete_set",
      children: [
        single("set_connection_mark", "connection_mark"),
        single("set_dscp", "dscp"),
        single("set_mark", "mark"),
        single("set_table", "table"),
        single("set_tcp_mss", "tcp_mss"),
        ...vrf,
      ],
    },
  ];
}

// ============================================================================
// Emits
// ============================================================================

export function policyCreateOps(form: PolicyForm): Op[] {
  const f = normalizePolicyForm(form);
  return [
    { op: "create_policy" },
    ...leaf("set_policy_description", "delete_policy_description", "", f.description),
    ...flag("set_policy_default_log", "delete_policy_default_log", false, f.default_log),
    ...multi("set_interface_policy", "delete_interface_policy", [], f.interfaces),
  ];
}

export function policyUpdateOps(original: PolicyRoute, updated: PolicyForm): Op[] {
  const b = normalizePolicyForm(policyFormFrom(original));
  const a = normalizePolicyForm(updated);
  return [
    ...leaf("set_policy_description", "delete_policy_description", b.description, a.description),
    ...flag("set_policy_default_log", "delete_policy_default_log", b.default_log, a.default_log),
    ...multi("set_interface_policy", "delete_interface_policy", b.interfaces, a.interfaces),
  ];
}

export function policyDeleteOps(): Op[] {
  return [{ op: "delete_policy" }];
}

export function ruleDeleteOps(): Op[] {
  return [{ op: "delete_rule" }];
}

/** Ops for one rule: create (original null) or the diff of an edit. */
export function ruleSaveOps(
  policyType: RoutePolicyType,
  original: PolicyRouteRule | null,
  updated: RouteRuleForm,
  caps: RouteCapabilitiesResponse | null,
): Op[] {
  const before = normalizeRuleForm(original ? ruleFormFrom(original) : emptyRuleForm(), caps);
  const after = normalizeRuleForm(updated, caps);
  return [
    ...(original ? [] : [{ op: "create_rule" }]),
    ...leaf("set_rule_description", "delete_rule_description", before.description, after.description),
    ...flag("set_rule_disable", "delete_rule_disable", before.disable, after.disable),
    ...flag("set_rule_log", "delete_rule_log", before.log, after.log),
    ...leaf("set_rule_action", "delete_rule_action", before.action, after.action),
    ...ruleTree(policyType, caps).flatMap((node) => emitNode(node, before, after)),
  ];
}

// ============================================================================
// Save checks
// ============================================================================

export type RouteRuleProblemKey =
  | "ruleNumberRequired"
  | "ruleNumberRange"
  | "ruleNumberTaken"
  | "descriptionTooLong"
  | "sourceGroupConflict"
  | "destinationGroupConflict"
  | "portNeedsProtocol"
  | "tcpNeedsProtocolTcp"
  | "tcpFlagConflict"
  | "setTcpMssNeedsSyn"
  | "icmpNeedsProtocolIcmp"
  | "icmpv6NeedsProtocolIcmpv6"
  | "icmpCodeRange"
  | "icmpTypeRange"
  | "ttlRange"
  | "hopLimitRange"
  | "tcpMssRange"
  | "packetLengthRange"
  | "dscpRange"
  | "markRange"
  | "connectionMarkRange"
  | "negationNotAllowed"
  | "limitBurstRange"
  | "limitRateInvalid"
  | "limitRateUnsupported"
  | "geoipCountryUnknown"
  | "geoipAsnRange"
  | "weekdayInvalid"
  | "setConnectionMarkRange"
  | "setDscpRange"
  | "setMarkRange"
  | "setTableRange"
  | "setTcpMssRange";

export interface RouteRuleProblem {
  key: RouteRuleProblemKey;
  min?: number;
  max?: number;
  value?: string;
}

export type PolicyProblemKey = "nameRequired" | "nameInvalid" | "nameTaken" | "descriptionTooLong";

export interface PolicyProblem {
  key: PolicyProblemKey;
  max?: number;
}

export function routeRange(caps: RouteCapabilitiesResponse | null, key: string): RouteRange | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

export function descriptionMaxLength(caps: RouteCapabilitiesResponse | null): number {
  return caps?.description_max_length || DESCRIPTION_MAX_LENGTH;
}

function inRange(value: string, range: RouteRange | null): boolean {
  if (!/^\d+$/.test(value)) return false;
  if (!range) return true;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/**
 * A match value: a number or `<start>-<end>`. Lab: only `mark` also takes a
 * leading `!`; dscp, packet-length and tcp mss reject it (callers check `!`
 * first with its own key).
 */
function matchNumberInRange(value: string, range: RouteRange | null, negatable = false): boolean {
  const body = negatable && value.startsWith("!") ? value.slice(1) : value;
  const parts = body.split("-");
  if (parts.length > 2) return false;
  if (!parts.every((p) => inRange(p, range))) return false;
  return parts.length === 1 || Number(parts[0]) <= Number(parts[1]);
}

function rangeProblem(key: RouteRuleProblemKey, range: RouteRange | null, value?: string): RouteRuleProblem {
  return { key, min: range?.min, max: range?.max, value };
}

/** A rule batch the lab would reject, or null. */
export function routeRuleProblem(
  policyType: RoutePolicyType,
  original: PolicyRouteRule | null,
  updated: RouteRuleForm,
  caps: RouteCapabilitiesResponse | null,
  existingRuleNumbers: number[],
): RouteRuleProblem | null {
  const f = normalizeRuleForm(updated, caps);
  const before = normalizeRuleForm(original ? ruleFormFrom(original) : emptyRuleForm(), caps);

  if (!original) {
    if (!f.rule_number) return { key: "ruleNumberRequired" };
    const ruleRange = routeRange(caps, "rule");
    if (!inRange(f.rule_number, ruleRange)) return rangeProblem("ruleNumberRange", ruleRange);
    if (existingRuleNumbers.includes(Number(f.rule_number))) return { key: "ruleNumberTaken" };
  }
  const maxLength = descriptionMaxLength(caps);
  if (f.description.length > maxLength) return { key: "descriptionTooLong", max: maxLength };

  for (const side of ["source", "destination"] as const) {
    const picked = (["address", "domain", "network"] as const).filter((g) => f[`${side}_group_${g}`]);
    if (picked.length > 1) return { key: side === "source" ? "sourceGroupConflict" : "destinationGroupConflict" };
  }

  const hasPort = f.source_port || f.destination_port || f.source_group_port || f.destination_group_port;
  if (hasPort && !f.protocol) return { key: "portNeedsProtocol" };

  const tcpMssOn = caps?.features?.tcp_mss_matching?.supported === true && f.tcp_mss !== "";
  if ((f.tcp_flags.length > 0 || f.tcp_flags_not.length > 0 || tcpMssOn) && f.protocol !== "tcp") {
    return { key: "tcpNeedsProtocolTcp" };
  }
  const both = f.tcp_flags.find((flagName) => f.tcp_flags_not.includes(flagName));
  if (both) return { key: "tcpFlagConflict", value: both };
  if (f.set_tcp_mss && !f.tcp_flags.includes("syn")) return { key: "setTcpMssNeedsSyn" };

  if (policyType === "route") {
    if ((f.icmp_code || f.icmp_type || f.icmp_type_name) && f.protocol !== "icmp") {
      return { key: "icmpNeedsProtocolIcmp" };
    }
    const icmpCode = routeRange(caps, "icmp_code");
    if (f.icmp_code && !inRange(f.icmp_code, icmpCode)) return rangeProblem("icmpCodeRange", icmpCode);
    const icmpType = routeRange(caps, "icmp_type");
    if (f.icmp_type && !inRange(f.icmp_type, icmpType)) return rangeProblem("icmpTypeRange", icmpType);
    const ttl = routeRange(caps, "ttl");
    for (const cmp of COMPARE) {
      if (f[`ttl_${cmp}`] && !inRange(f[`ttl_${cmp}`], ttl)) return rangeProblem("ttlRange", ttl);
    }
  } else {
    if (f.icmpv6_type && f.protocol !== "icmpv6") return { key: "icmpv6NeedsProtocolIcmpv6" };
    const hop = routeRange(caps, "ttl");
    for (const cmp of COMPARE) {
      if (f[`hop_limit_${cmp}`] && !inRange(f[`hop_limit_${cmp}`], hop)) return rangeProblem("hopLimitRange", hop);
    }
  }

  // Lab: `!` is rejected on these ("'!100' is not a valid number").
  const unnegatable = [
    ...(tcpMssOn ? [f.tcp_mss] : []),
    ...f.packet_length,
    ...f.packet_length_exclude,
    ...f.dscp,
    ...f.dscp_exclude,
  ];
  const negated = unnegatable.find((value) => value.startsWith("!"));
  if (negated) return { key: "negationNotAllowed", value: negated };
  const tcpMss = routeRange(caps, "tcp_mss");
  if (tcpMssOn && !matchNumberInRange(f.tcp_mss, tcpMss)) return rangeProblem("tcpMssRange", tcpMss);
  const packetLength = routeRange(caps, "packet_length");
  for (const value of [...f.packet_length, ...f.packet_length_exclude]) {
    if (!matchNumberInRange(value, packetLength)) return rangeProblem("packetLengthRange", packetLength, value);
  }
  const dscp = routeRange(caps, "dscp");
  for (const value of [...f.dscp, ...f.dscp_exclude]) {
    if (!matchNumberInRange(value, dscp)) return rangeProblem("dscpRange", dscp, value);
  }
  const mark = routeRange(caps, "mark");
  if (f.mark && !matchNumberInRange(f.mark, mark, true)) return rangeProblem("markRange", mark);
  // Lab: a plain number only ("Value must be a number, not a range").
  const connectionMark = routeRange(caps, "connection_mark");
  for (const value of f.connection_mark) {
    if (!inRange(value, connectionMark)) return rangeProblem("connectionMarkRange", connectionMark, value);
  }

  const weekdays = caps?.values?.weekdays || [];
  const badDay = f.time_weekdays.find((day) => !weekdays.includes(day));
  if (badDay && f.time_weekdays.join(",") !== before.time_weekdays.join(",")) {
    return { key: "weekdayInvalid", value: badDay };
  }

  const burst = routeRange(caps, "limit_burst");
  if (f.limit_burst && !inRange(f.limit_burst, burst)) return rangeProblem("limitBurstRange", burst);
  if (f.limit_rate && f.limit_rate !== before.limit_rate) {
    const units = caps?.features?.limit_rate?.units || [];
    if (units.length === 0) return { key: "limitRateUnsupported" };
    const rate = routeRange(caps, "limit_rate");
    const [count, unit, ...rest] = f.limit_rate.split("/");
    if (rest.length > 0 || !units.includes(unit ?? "") || !inRange(count, rate)) {
      return rangeProblem("limitRateInvalid", rate);
    }
  }

  if (caps?.features?.geoip_matching?.supported === true) {
    const codes = caps.features.geoip_matching.country_codes || [];
    const asn = routeRange(caps, "geoip_asn");
    for (const side of ["source", "destination"] as const) {
      const unknown = f[`${side}_geoip_country_code`].find((code) => !codes.includes(code));
      if (unknown) return { key: "geoipCountryUnknown", value: unknown };
      const badAsn = f[`${side}_geoip_asn`].find((value) => !inRange(value, asn));
      if (badAsn) return rangeProblem("geoipAsnRange", asn, badAsn);
    }
  }

  const setChecks: [SingleKey, string, RouteRuleProblemKey][] = [
    ["set_connection_mark", "set_connection_mark", "setConnectionMarkRange"],
    ["set_dscp", "set_dscp", "setDscpRange"],
    ["set_mark", "set_mark", "setMarkRange"],
    ["set_tcp_mss", "set_tcp_mss", "setTcpMssRange"],
  ];
  for (const [key, rangeKey, problem] of setChecks) {
    const range = routeRange(caps, rangeKey);
    if (f[key] && !inRange(f[key], range)) return rangeProblem(problem, range);
  }
  const table = routeRange(caps, "set_table");
  if (f.set_table && f.set_table !== "main" && !inRange(f.set_table, table)) {
    return rangeProblem("setTableRange", table);
  }
  return null;
}

/** A policy create or edit the lab would reject, or null. `existingNames` is null on edit. */
export function policyProblem(
  form: PolicyForm,
  existingNames: string[] | null,
  caps: RouteCapabilitiesResponse | null,
): PolicyProblem | null {
  const f = normalizePolicyForm(form);
  if (existingNames) {
    if (!f.name) return { key: "nameRequired" };
    if (!POLICY_NAME_PATTERN.test(f.name)) return { key: "nameInvalid" };
    if (existingNames.includes(f.name)) return { key: "nameTaken" };
  }
  const maxLength = descriptionMaxLength(caps);
  if (f.description.length > maxLength) return { key: "descriptionTooLong", max: maxLength };
  return null;
}
