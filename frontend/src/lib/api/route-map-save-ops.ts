import type {
  MatchConditions,
  RouteMap,
  RouteMapBatchOperation,
  RouteMapCapabilities,
  RouteMapRange,
  RouteMapRangeKey,
  RouteMapRule,
  SetActions,
} from "./route-map";
import { isIpv4 } from "./ospfv3-save-ops";
import { ipv6Key, isIpv6Address } from "./pim6-save-ops";

type Caps = RouteMapCapabilities | null;
type Op = RouteMapBatchOperation;

/** Lab tag syntax of a route-map name (`[-_a-zA-Z0-9][\w\-\.\+]*`, ASCII). */
export const ROUTE_MAP_NAME_PATTERN = /^[-_a-zA-Z0-9][\w\-.+]*$/;

// ============================================================================
// Forms
// ============================================================================

export interface RouteMapForm {
  name: string;
  description: string;
}

/** Single-value leaves of a rule (text as typed; numbers as digits). */
export const SINGLE_KEYS = [
  // Rule
  "rule_number",
  "action",
  "description",
  "call",
  "continue_rule",
  "on_match_goto",
  // Match
  "match_as_path",
  "match_community_list",
  "match_extcommunity",
  "match_large_community_list",
  "match_local_preference",
  "match_metric",
  "match_origin",
  "match_peer",
  "match_rpki",
  "match_rpki_extcommunity",
  "match_source_peer",
  "match_evpn_rd",
  "match_evpn_route_type",
  "match_evpn_vni",
  "match_ip_address_access_list",
  "match_ip_address_prefix_list",
  "match_ip_address_prefix_len",
  "match_ipv6_address_access_list",
  "match_ipv6_address_prefix_list",
  "match_ipv6_address_prefix_len",
  "match_ip_nexthop_access_list",
  "match_ip_nexthop_address",
  "match_ip_nexthop_prefix_len",
  "match_ip_nexthop_prefix_list",
  "match_ip_nexthop_type",
  "match_ipv6_nexthop_access_list",
  "match_ipv6_nexthop_address",
  "match_ipv6_nexthop_prefix_list",
  "match_ipv6_nexthop_type",
  "match_ip_route_source_access_list",
  "match_ip_route_source_prefix_list",
  "match_interface",
  "match_protocol",
  "match_source_vrf",
  "match_tag",
  // Set
  "set_as_path_exclude",
  "set_as_path_prepend",
  "set_as_path_prepend_last_as",
  "set_community_delete",
  "set_large_community_delete",
  "set_extcommunity_bandwidth",
  "set_aggregator_as",
  "set_aggregator_ip",
  "set_local_preference",
  "set_origin",
  "set_originator_id",
  "set_weight",
  /** The `set ip-next-hop` value: an IPv4 address, `peer-address` or `unchanged`. */
  "set_ip_nexthop",
  "set_ipv6_nexthop_global",
  "set_ipv6_nexthop_local",
  "set_evpn_gateway_ipv4",
  "set_evpn_gateway_ipv6",
  "set_distance",
  "set_metric",
  "set_metric_type",
  "set_src",
  "set_table",
  "set_tag",
] as const;
export type SingleKey = (typeof SINGLE_KEYS)[number];

/** `multi:` leaves: one set per added value, one per-value delete per removed value. */
export const LIST_KEYS = [
  "set_community_add",
  "set_community_replace",
  "set_large_community_add",
  "set_large_community_replace",
  "set_extcommunity_rt",
  "set_extcommunity_soo",
] as const;
export type ListKey = (typeof LIST_KEYS)[number];

/** Valueless leaves. */
export const FLAG_KEYS = [
  "on_match_next",
  "match_community_exact_match",
  "match_evpn_default_route",
  "set_community_none",
  "set_large_community_none",
  "set_extcommunity_none",
  "set_extcommunity_bandwidth_non_transitive",
  "set_atomic_aggregate",
  "set_ipv6_nexthop_peer_address",
  "set_ipv6_nexthop_prefer_global",
  "set_l3vpn_nexthop_encapsulation_gre",
] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

export type RouteMapRuleForm = Record<SingleKey, string> & Record<ListKey, string[]> & Record<FlagKey, boolean>;

/** The two keywords `set ip-next-hop` takes beside an IPv4 address. */
export const IP_NEXTHOP_PEER_ADDRESS = "peer-address";
export const IP_NEXTHOP_UNCHANGED = "unchanged";

export function emptyRuleForm(ruleNumber: string = "", action: string = ""): RouteMapRuleForm {
  const form = {} as RouteMapRuleForm;
  for (const key of SINGLE_KEYS) form[key] = "";
  for (const key of LIST_KEYS) form[key] = [];
  for (const key of FLAG_KEYS) form[key] = false;
  form.rule_number = ruleNumber;
  form.action = action;
  return form;
}

const str = (value: string | number | null | undefined): string => (value == null ? "" : String(value));
const list = (value: string[] | null | undefined): string[] => [...(value ?? [])];

/** Match leaves the form reads under the same name (`match_<field>`). */
const MATCH_FIELDS = SINGLE_KEYS.filter((key) => key.startsWith("match_")).map((key) =>
  key.slice("match_".length),
) as (keyof MatchConditions)[];

/** Set leaves the form reads under the same name (`set_<field>`); ip-next-hop is read on its own. */
const SET_FIELDS = SINGLE_KEYS.filter((key) => key.startsWith("set_") && key !== "set_ip_nexthop").map((key) =>
  key.slice("set_".length),
) as (keyof SetActions)[];

function ipNexthopValue(set: SetActions): string {
  if (set.ip_nexthop_peer_address) return IP_NEXTHOP_PEER_ADDRESS;
  if (set.ip_nexthop_unchanged) return IP_NEXTHOP_UNCHANGED;
  return str(set.ip_nexthop);
}

/** The editable form of a loaded rule. */
export function ruleFormFrom(rule: RouteMapRule): RouteMapRuleForm {
  const m = rule.match;
  const s = rule.set;
  const form = emptyRuleForm(String(rule.rule_number), str(rule.action));
  form.description = str(rule.description);
  form.call = str(rule.call);
  form.continue_rule = str(rule.continue_rule);
  form.on_match_goto = str(rule.on_match_goto);
  form.on_match_next = rule.on_match_next === true;
  const record = form as unknown as Record<string, string>;
  for (const field of MATCH_FIELDS) record[`match_${field}`] = str(m[field] as string | number | null);
  for (const field of SET_FIELDS) record[`set_${field}`] = str(s[field] as string | number | null);
  form.set_ip_nexthop = ipNexthopValue(s);
  form.match_community_exact_match = m.community_exact_match === true;
  form.match_evpn_default_route = m.evpn_default_route === true;
  form.set_community_add = list(s.community_add_values);
  form.set_community_replace = list(s.community_replace_values);
  form.set_large_community_add = list(s.large_community_add_values);
  form.set_large_community_replace = list(s.large_community_replace_values);
  form.set_extcommunity_rt = list(s.extcommunity_rt);
  form.set_extcommunity_soo = list(s.extcommunity_soo);
  form.set_community_none = s.community_remove_all === true;
  form.set_large_community_none = s.large_community_remove_all === true;
  form.set_extcommunity_none = s.extcommunity_none === true;
  form.set_extcommunity_bandwidth_non_transitive = s.extcommunity_bandwidth_non_transitive === true;
  form.set_atomic_aggregate = s.atomic_aggregate === true;
  form.set_ipv6_nexthop_peer_address = s.ipv6_nexthop_peer_address === true;
  form.set_ipv6_nexthop_prefer_global = s.ipv6_nexthop_prefer_global === true;
  form.set_l3vpn_nexthop_encapsulation_gre = s.l3vpn_nexthop_encapsulation_gre === true;
  return form;
}

export function mapFormFrom(routeMap: RouteMap): RouteMapForm {
  return { name: routeMap.name, description: str(routeMap.description) };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

function uniqueTrimmed(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** `set as-path prepend|exclude` is ONE value of AS numbers separated by single spaces. */
const AS_PATH_KEYS: SingleKey[] = ["set_as_path_exclude", "set_as_path_prepend"];

/** Trim every field and dedupe every list, so the check and the emit see the same value. */
export function normalizeRuleForm(form: RouteMapRuleForm): RouteMapRuleForm {
  const out = { ...form } as RouteMapRuleForm;
  for (const key of SINGLE_KEYS) out[key] = (form[key] ?? "").trim();
  for (const key of AS_PATH_KEYS) out[key] = out[key].split(/\s+/).filter(Boolean).join(" ");
  for (const key of LIST_KEYS) out[key] = uniqueTrimmed(form[key] ?? []);
  for (const key of FLAG_KEYS) out[key] = form[key] === true;
  return out;
}

export function normalizeMapForm(form: RouteMapForm): RouteMapForm {
  return { name: form.name.trim(), description: form.description.trim() };
}

// ============================================================================
// Emit helpers
// ============================================================================

const same = (value: string) => value;
/** IPv6 text compares compressed and lowercased; ops still carry the typed or loaded text. */
const ipKey = (value: string) => (value.includes(":") ? ipv6Key(value) : value);

/** Single-value leaf: change = one set (replaces), clear = delete with no value. */
function leaf(setOp: string, deleteOp: string, before: string, after: string, key: (v: string) => string = same): Op[] {
  if (after && (!before || key(after) !== key(before))) return [{ op: setOp, value: after }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** Valueless flag. */
function flag(setOp: string, deleteOp: string, before: boolean, after: boolean): Op[] {
  if (after && !before) return [{ op: setOp }];
  if (!after && before) return [{ op: deleteOp }];
  return [];
}

/** `multi:` leaf: delete only the removed values, set only the added ones (never the node). */
function multi(setOp: string, deleteOp: string, before: string[], after: string[]): Op[] {
  return [
    ...before.filter((v) => !after.includes(v)).map((value) => ({ op: deleteOp, value })),
    ...after.filter((v) => !before.includes(v)).map((value) => ({ op: setOp, value })),
  ];
}

/** `set ip-next-hop`: one leaf; a set of any of its three forms replaces the others. */
function ipNexthop(before: string, after: string): Op[] {
  if (after && after !== before) {
    if (after === IP_NEXTHOP_PEER_ADDRESS) return [{ op: "set_ip_nexthop_peer_address" }];
    if (after === IP_NEXTHOP_UNCHANGED) return [{ op: "set_ip_nexthop_unchanged" }];
    return [{ op: "set_ip_nexthop", value: after }];
  }
  if (!after && before) return [{ op: "delete_set_ip_nexthop" }];
  return [];
}

/** One field of a rule, as an emit node. */
type Node =
  | { kind: "single"; key: SingleKey; set: string; del: string; cmp?: (v: string) => string }
  | { kind: "flag"; key: FlagKey; set: string; del: string }
  | { kind: "list"; key: ListKey; set: string; del: string }
  | { kind: "ipNexthop" }
  /** A version-gated leaf this device does not offer: never emitted. */
  | { kind: "gated"; child: Node }
  /** A plain parent node: when the edit leaves it empty, its delete replaces every delete under it. */
  | { kind: "section"; del: string; children: Node[] };

function nodeHasValue(node: Node, form: RouteMapRuleForm): boolean {
  switch (node.kind) {
    case "single":
      return form[node.key] !== "";
    case "flag":
      return form[node.key];
    case "list":
      return form[node.key].length > 0;
    case "ipNexthop":
      return form.set_ip_nexthop !== "";
    case "gated":
      return nodeHasValue(node.child, form);
    case "section":
      return node.children.some((child) => nodeHasValue(child, form));
  }
}

function emitNode(node: Node, before: RouteMapRuleForm, after: RouteMapRuleForm): Op[] {
  switch (node.kind) {
    case "single":
      return leaf(node.set, node.del, before[node.key], after[node.key], node.cmp);
    case "flag":
      return flag(node.set, node.del, before[node.key], after[node.key]);
    case "list":
      return multi(node.set, node.del, before[node.key], after[node.key]);
    case "ipNexthop":
      return ipNexthop(before.set_ip_nexthop, after.set_ip_nexthop);
    case "gated":
      return [];
    case "section":
      if (nodeHasValue(node, before) && !nodeHasValue(node, after)) return [{ op: node.del }];
      return node.children.flatMap((child) => emitNode(child, before, after));
  }
}

/** Leaf `match_<x>` emitted by `set_match_<x>` / `delete_match_<x>`. */
function m(field: string, cmp?: (v: string) => string): Node {
  return { kind: "single", key: `match_${field}` as SingleKey, set: `set_match_${field}`, del: `delete_match_${field}`, cmp };
}

/** Leaf `set_<x>` emitted by `set_<x>` / `delete_set_<x>`. */
function s(field: string, cmp?: (v: string) => string): Node {
  return { kind: "single", key: `set_${field}` as SingleKey, set: `set_${field}`, del: `delete_set_${field}`, cmp };
}

function sFlag(field: string): Node {
  return { kind: "flag", key: `set_${field}` as FlagKey, set: `set_${field}`, del: `delete_set_${field}` };
}

function sList(field: string): Node {
  return { kind: "list", key: `set_${field}` as ListKey, set: `set_${field}`, del: `delete_set_${field}` };
}

function gate(on: boolean, node: Node): Node {
  return on ? node : { kind: "gated", child: node };
}

/** A plain CLI node with no value of its own. */
function section(del: string, children: Node[]): Node {
  return { kind: "section", del, children };
}

/**
 * Every leaf of a rule, nested exactly as the CLI nests it below the rule;
 * leaves this version lacks are gated. A child delete leaves its empty parent
 * on the device at every level (lab), so the emit deletes the highest node
 * the edit leaves empty and nothing under it.
 */
function ruleTree(caps: Caps): Node[] {
  const features = caps?.features;
  return [
    { kind: "single", key: "description", set: "set_rule_description", del: "delete_rule_description" },
    { kind: "single", key: "call", set: "set_rule_call", del: "delete_rule_call" },
    { kind: "single", key: "continue_rule", set: "set_rule_continue", del: "delete_rule_continue" },
    section("delete_rule_on_match", [
      { kind: "single", key: "on_match_goto", set: "set_rule_on_match_goto", del: "delete_rule_on_match_goto" },
      { kind: "flag", key: "on_match_next", set: "set_rule_on_match_next", del: "delete_rule_on_match_next" },
    ]),

    section("delete_match", [
      m("as_path"),
      section("delete_match_community", [
        { kind: "single", key: "match_community_list", set: "set_match_community", del: "delete_match_community_list" },
        {
          kind: "flag",
          key: "match_community_exact_match",
          set: "set_match_community_exact_match",
          del: "delete_match_community_exact_match",
        },
      ]),
      m("extcommunity"),
      section("delete_match_large_community", [
        {
          kind: "single",
          key: "match_large_community_list",
          set: "set_match_large_community",
          del: "delete_match_large_community_list",
        },
      ]),
      m("local_preference"),
      m("metric"),
      m("origin"),
      m("peer", ipKey),
      m("rpki"),
      gate(features?.match_rpki_extcommunity?.supported === true, m("rpki_extcommunity")),
      gate(features?.match_source_peer?.supported === true, m("source_peer", ipKey)),
      gate(
        features?.match_evpn?.supported === true,
        section("delete_match_evpn", [
          {
            kind: "flag",
            key: "match_evpn_default_route",
            set: "set_match_evpn_default_route",
            del: "delete_match_evpn_default_route",
          },
          m("evpn_rd"),
          m("evpn_route_type"),
          m("evpn_vni"),
        ]),
      ),
      section("delete_match_ip", [
        section("delete_match_ip_address", [
          m("ip_address_access_list"),
          m("ip_address_prefix_list"),
          m("ip_address_prefix_len"),
        ]),
        section("delete_match_ip_nexthop", [
          m("ip_nexthop_access_list"),
          m("ip_nexthop_address"),
          m("ip_nexthop_prefix_len"),
          m("ip_nexthop_prefix_list"),
          m("ip_nexthop_type"),
        ]),
        section("delete_match_ip_route_source", [m("ip_route_source_access_list"), m("ip_route_source_prefix_list")]),
      ]),
      section("delete_match_ipv6", [
        section("delete_match_ipv6_address", [
          m("ipv6_address_access_list"),
          m("ipv6_address_prefix_list"),
          m("ipv6_address_prefix_len"),
        ]),
        section("delete_match_ipv6_nexthop", [
          m("ipv6_nexthop_access_list"),
          m("ipv6_nexthop_address", ipv6Key),
          m("ipv6_nexthop_prefix_list"),
          m("ipv6_nexthop_type"),
        ]),
      ]),
      m("interface"),
      m("protocol"),
      m("source_vrf"),
      m("tag"),
    ]),

    section("delete_set", [
      section("delete_set_as_path", [s("as_path_exclude"), s("as_path_prepend"), s("as_path_prepend_last_as")]),
      section("delete_set_community", [
        sList("community_add"),
        sList("community_replace"),
        s("community_delete"),
        sFlag("community_none"),
      ]),
      section("delete_set_large_community", [
        sList("large_community_add"),
        sList("large_community_replace"),
        s("large_community_delete"),
        sFlag("large_community_none"),
      ]),
      section("delete_set_extcommunity", [
        s("extcommunity_bandwidth"),
        sFlag("extcommunity_bandwidth_non_transitive"),
        sList("extcommunity_rt"),
        sList("extcommunity_soo"),
        sFlag("extcommunity_none"),
      ]),
      sFlag("atomic_aggregate"),
      section("delete_set_aggregator", [s("aggregator_as"), s("aggregator_ip")]),
      s("local_preference"),
      s("origin"),
      s("originator_id"),
      s("weight"),
      { kind: "ipNexthop" },
      section("delete_set_ipv6_nexthop", [
        s("ipv6_nexthop_global", ipv6Key),
        s("ipv6_nexthop_local", ipv6Key),
        sFlag("ipv6_nexthop_peer_address"),
        sFlag("ipv6_nexthop_prefer_global"),
      ]),
      // `set l3vpn-nexthop encapsulation gre`: `encapsulation` has no op of its own,
      // and with one child it is empty exactly when `l3vpn-nexthop` is.
      section("delete_set_l3vpn_nexthop", [sFlag("l3vpn_nexthop_encapsulation_gre")]),
      // `set evpn gateway ipv4|ipv6`: likewise for `gateway`.
      section("delete_set_evpn", [s("evpn_gateway_ipv4"), s("evpn_gateway_ipv6", ipv6Key)]),
      s("distance"),
      s("metric"),
      s("metric_type"),
      s("src", ipKey),
      s("table"),
      s("tag"),
    ]),
  ];
}

// ============================================================================
// Emits
// ============================================================================

/** Route-map ops: sent without a rule number. */
export function mapCreateOps(form: RouteMapForm): Op[] {
  const f = normalizeMapForm(form);
  return [
    { op: "set_route_map" },
    ...leaf("set_route_map_description", "delete_route_map_description", "", f.description),
  ];
}

export function mapUpdateOps(original: RouteMap, updated: RouteMapForm): Op[] {
  const b = normalizeMapForm(mapFormFrom(original));
  const a = normalizeMapForm(updated);
  return leaf("set_route_map_description", "delete_route_map_description", b.description, a.description);
}

export function mapDeleteOps(): Op[] {
  return [{ op: "delete_route_map" }];
}

export function ruleDeleteOps(): Op[] {
  return [{ op: "delete_rule" }];
}

/**
 * Ops for one rule: create (original null) or the diff of an edit, leaf by
 * leaf against the stored rule. Create and edit share this emit. An edit never
 * deletes the rule; a cleared leaf sends, in the same batch, the delete of the
 * highest node the edit leaves empty below the rule (the leaf itself when a
 * sibling remains).
 * `set_rule` creates the route-map too, so a create needs no route-map op.
 */
export function ruleSaveOps(original: RouteMapRule | null, updated: RouteMapRuleForm, caps: Caps): Op[] {
  const before = normalizeRuleForm(original ? ruleFormFrom(original) : emptyRuleForm());
  const after = normalizeRuleForm(updated);
  return [
    ...(original ? [] : [{ op: "set_rule" }]),
    // Action is required by the lab verify, so it is only ever replaced.
    ...(after.action && after.action !== before.action ? [{ op: "set_rule_action", value: after.action }] : []),
    ...ruleTree(caps).flatMap((node) => emitNode(node, before, after)),
  ];
}

// ============================================================================
// Save checks
// ============================================================================

export type RouteMapRuleProblemKey =
  | "ruleNumberRequired"
  | "ruleNumberRange"
  | "ruleNumberTaken"
  | "actionRequired"
  | "descriptionTooLong"
  | "continueRange"
  | "continueNotAfterRule"
  | "onMatchGotoRange"
  | "onMatchGotoNotAfterRule"
  | "matchLocalPreferenceRange"
  | "matchMetricRange"
  | "matchTagRange"
  | "matchPeerInvalid"
  | "matchSourcePeerInvalid"
  | "evpnVniRange"
  | "evpnRdInvalid"
  | "ipAddressPrefixLenRange"
  | "ipv6AddressPrefixLenRange"
  | "ipNexthopAddressInvalid"
  | "ipNexthopPrefixLenRange"
  | "ipv6NexthopAddressInvalid"
  | "asPathExcludeInvalid"
  | "asPathPrependInvalid"
  | "asPathPrependLastAsRange"
  | "asPathPrependWithLastAs"
  | "communityNoneConflict"
  | "communityAddReplaceConflict"
  | "communityValueInvalid"
  | "largeCommunityNoneConflict"
  | "largeCommunityAddReplaceConflict"
  | "largeCommunityValueInvalid"
  | "extcommunityNoneConflict"
  | "extcommunityBandwidthInvalid"
  | "bandwidthNonTransitiveNeedsBandwidth"
  | "extcommunityRtInvalid"
  | "extcommunityRtRange"
  | "extcommunitySooInvalid"
  | "extcommunitySooRange"
  | "aggregatorAsRange"
  | "aggregatorIpInvalid"
  | "setLocalPreferenceRange"
  | "originatorIdInvalid"
  | "weightRange"
  | "ipNexthopInvalid"
  | "ipv6NexthopGlobalInvalid"
  | "ipv6NexthopLocalInvalid"
  | "evpnGatewayIpv4Invalid"
  | "evpnGatewayIpv6Invalid"
  | "distanceRange"
  | "metricInvalid"
  | "srcInvalid"
  | "tableRange"
  | "setTagRange";

export interface RouteMapRuleProblem {
  key: RouteMapRuleProblemKey;
  /** The rule the problem is in (its number as typed). */
  rule: string;
  min?: number;
  max?: number;
  value?: string;
  /** Further message arguments (the three route-distinguisher forms and their bounds). */
  args?: Record<string, number | string>;
}

export type RouteMapProblemKey = "nameRequired" | "nameInvalid" | "nameTaken" | "descriptionTooLong";

export interface RouteMapProblem {
  key: RouteMapProblemKey;
  max?: number;
}

/** A served range, or null before capabilities load (the check then takes any digits). */
export function routeMapRange(caps: Caps, key: RouteMapRangeKey): RouteMapRange | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

export function descriptionMaxLength(caps: Caps): number | undefined {
  return caps?.description_max_length || undefined;
}

export function ruleActions(caps: Caps): string[] {
  return caps?.values?.rule_actions || [];
}

/** Decimal digits with no leading zero (at most 10, as the builder takes them). */
const DECIMAL = /^(0|[1-9][0-9]{0,9})$/;

function inRange(value: string, range: RouteMapRange | null): boolean {
  if (!DECIMAL.test(value)) return false;
  if (!range) return true;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/** One line, at most the served length in code points (as the builder counts). */
function descriptionValid(value: string, caps: Caps): boolean {
  const max = descriptionMaxLength(caps);
  return !/[\r\n]/.test(value) && (max === undefined || [...value].length <= max);
}

function isIp(value: string): boolean {
  return isIpv4(value) || isIpv6Address(value);
}

/** Space-separated AS numbers in the served range (a comma list is rejected by the lab). */
function asListValid(value: string, caps: Caps): boolean {
  const range = routeMapRange(caps, "as_number");
  return value.split(" ").every((asn) => inRange(asn, range));
}

function partsInRange(value: string, count: number, range: RouteMapRange | null): boolean {
  const parts = value.split(":");
  return parts.length === count && parts.every((part) => inRange(part, range));
}

/** `AA:NN` or a well-known community from the served list. */
function communityValid(value: string, caps: Caps): boolean {
  if ((caps?.values?.community_well_known || []).includes(value)) return true;
  return partsInRange(value, 2, routeMapRange(caps, "community_part"));
}

/** Why an `ASN:NN` / `IPv4:NN` value fails: its format, or the part out of its served range. */
type PartProblem = { kind: "format" } | { kind: "range"; part: string; min?: number; max?: number };

function partProblem(part: string, range: RouteMapRange | null): PartProblem | null {
  return inRange(part, range) ? null : { kind: "range", part, min: range?.min, max: range?.max };
}

/** `ASN:NN` or `IPv4:NN` (set extcommunity rt|soo). */
function extcommunityProblem(value: string, caps: Caps): PartProblem | null {
  const at = value.lastIndexOf(":");
  const head = value.slice(0, at);
  const tail = value.slice(at + 1);
  if (at <= 0 || !DECIMAL.test(tail)) return { kind: "format" };
  if (DECIMAL.test(head)) {
    return (
      partProblem(head, routeMapRange(caps, "extcommunity_asn")) ??
      partProblem(tail, routeMapRange(caps, "extcommunity_asn_value"))
    );
  }
  if (!isIpv4(head)) return { kind: "format" };
  return partProblem(tail, routeMapRange(caps, "extcommunity_ip_value"));
}

/** `ASN:NN`, `ASN4:NN` or `IPv4:NN` (match evpn rd), each part in its served range. */
function routeDistinguisherValid(value: string, caps: Caps): boolean {
  const at = value.lastIndexOf(":");
  const head = value.slice(0, at);
  const tail = value.slice(at + 1);
  if (at <= 0 || !DECIMAL.test(tail)) return false;
  if (DECIMAL.test(head)) {
    const asn2 = inRange(head, routeMapRange(caps, "extcommunity_asn")) && inRange(tail, routeMapRange(caps, "extcommunity_asn_value"));
    const asn4 = inRange(head, routeMapRange(caps, "evpn_rd_asn4")) && inRange(tail, routeMapRange(caps, "evpn_rd_asn4_value"));
    return asn2 || asn4;
  }
  return isIpv4(head) && inRange(tail, routeMapRange(caps, "extcommunity_ip_value"));
}

/** The bounds the route-distinguisher message names. */
function routeDistinguisherArgs(caps: Caps): Record<string, number | string> {
  const bound = (key: RouteMapRangeKey) => routeMapRange(caps, key) ?? { min: "", max: "" };
  const asn = bound("extcommunity_asn");
  const asnValue = bound("extcommunity_asn_value");
  const asn4 = bound("evpn_rd_asn4");
  const asn4Value = bound("evpn_rd_asn4_value");
  const ipValue = bound("extcommunity_ip_value");
  return {
    asnMin: asn.min,
    asnMax: asn.max,
    asnValueMin: asnValue.min,
    asnValueMax: asnValue.max,
    asn4Min: asn4.min,
    asn4Max: asn4.max,
    asn4ValueMin: asn4Value.min,
    asn4ValueMax: asn4Value.max,
    ipValueMin: ipValue.min,
    ipValueMax: ipValue.max,
  };
}

/** One CLI word, as the builder takes a name: no whitespace or control character. */
function isWord(value: string): boolean {
  return !/[\s\u0000-\u001f\u007f-\u009f]/.test(value);
}

/** `[+-]<number>` or `[+-]rtt`. */
function metricValid(value: string, caps: Caps): boolean {
  const body = value.startsWith("+") || value.startsWith("-") ? value.slice(1) : value;
  return body === "rtt" || inRange(body, routeMapRange(caps, "metric"));
}

/**
 * A rule batch the lab would reject, or null. On edit the stored rule number
 * is the rule (the form's number is locked); `existingRuleNumbers` are the
 * route-map's rules as loaded.
 */
export function routeMapRuleProblem(
  original: RouteMapRule | null,
  updated: RouteMapRuleForm,
  caps: Caps,
  existingRuleNumbers: number[],
): RouteMapRuleProblem | null {
  const f = normalizeRuleForm(updated);
  const rule = original ? String(original.rule_number) : f.rule_number;
  const problem = (key: RouteMapRuleProblemKey, extra: Partial<RouteMapRuleProblem> = {}): RouteMapRuleProblem => ({
    key,
    rule,
    ...extra,
  });
  const rangeProblem = (key: RouteMapRuleProblemKey, rangeKey: RouteMapRangeKey, value?: string) => {
    const range = routeMapRange(caps, rangeKey);
    return problem(key, { min: range?.min, max: range?.max, value });
  };
  const checkRange = (key: SingleKey, rangeKey: RouteMapRangeKey, problemKey: RouteMapRuleProblemKey) =>
    f[key] && !inRange(f[key], routeMapRange(caps, rangeKey)) ? rangeProblem(problemKey, rangeKey) : null;
  const checkValue = (key: SingleKey, ok: (v: string) => boolean, problemKey: RouteMapRuleProblemKey) =>
    f[key] && !ok(f[key]) ? problem(problemKey) : null;

  if (!original) {
    if (!f.rule_number) return problem("ruleNumberRequired");
    if (!inRange(f.rule_number, routeMapRange(caps, "rule"))) return rangeProblem("ruleNumberRange", "rule");
    if (existingRuleNumbers.includes(Number(f.rule_number))) return problem("ruleNumberTaken");
  }
  // Lab verify: every rule needs an action.
  if (!f.action) return problem("actionRequired");
  if (!descriptionValid(f.description, caps)) return problem("descriptionTooLong", { max: descriptionMaxLength(caps) });

  // Lab: continue and on-match goto must point past the rule itself.
  const own = Number(rule);
  const flow = [
    checkRange("continue_rule", "continue", "continueRange"),
    f.continue_rule && Number(f.continue_rule) <= own ? problem("continueNotAfterRule") : null,
    checkRange("on_match_goto", "on_match_goto", "onMatchGotoRange"),
    f.on_match_goto && Number(f.on_match_goto) <= own ? problem("onMatchGotoNotAfterRule") : null,
  ];

  const sourcePeer = caps?.features?.match_source_peer?.supported === true;
  const evpn = caps?.features?.match_evpn?.supported === true;
  const match = [
    checkRange("match_local_preference", "match_local_preference", "matchLocalPreferenceRange"),
    checkRange("match_metric", "match_metric", "matchMetricRange"),
    checkRange("match_tag", "match_tag", "matchTagRange"),
    checkValue("match_peer", isIp, "matchPeerInvalid"),
    sourcePeer ? checkValue("match_source_peer", isWord, "matchSourcePeerInvalid") : null,
    evpn ? checkRange("match_evpn_vni", "evpn_vni", "evpnVniRange") : null,
    evpn && f.match_evpn_rd && !routeDistinguisherValid(f.match_evpn_rd, caps)
      ? problem("evpnRdInvalid", { args: routeDistinguisherArgs(caps) })
      : null,
    checkRange("match_ip_address_prefix_len", "ip_prefix_len", "ipAddressPrefixLenRange"),
    checkRange("match_ipv6_address_prefix_len", "ipv6_prefix_len", "ipv6AddressPrefixLenRange"),
    checkValue("match_ip_nexthop_address", isIpv4, "ipNexthopAddressInvalid"),
    checkRange("match_ip_nexthop_prefix_len", "ip_prefix_len", "ipNexthopPrefixLenRange"),
    checkValue("match_ipv6_nexthop_address", isIpv6Address, "ipv6NexthopAddressInvalid"),
  ];

  const asRange = routeMapRange(caps, "as_number");
  const asPath = [
    f.set_as_path_exclude && f.set_as_path_exclude !== "all" && !asListValid(f.set_as_path_exclude, caps)
      ? problem("asPathExcludeInvalid", { min: asRange?.min, max: asRange?.max })
      : null,
    f.set_as_path_prepend && !asListValid(f.set_as_path_prepend, caps)
      ? problem("asPathPrependInvalid", { min: asRange?.min, max: asRange?.max })
      : null,
    checkRange("set_as_path_prepend_last_as", "as_path_prepend_last_as", "asPathPrependLastAsRange"),
    // Lab (exclusive devices): prepend together with prepend-last-as fails the commit.
    caps?.as_path_prepend_exclusive === true && f.set_as_path_prepend && f.set_as_path_prepend_last_as
      ? problem("asPathPrependWithLastAs")
      : null,
  ];

  const communityRange = routeMapRange(caps, "community_part");
  const largeRange = routeMapRange(caps, "large_community_part");
  const badCommunity = [...f.set_community_add, ...f.set_community_replace].find((v) => !communityValid(v, caps));
  const badLarge = [...f.set_large_community_add, ...f.set_large_community_replace].find(
    (v) => !partsInRange(v, 3, largeRange),
  );
  /** The first rt/soo value the builder rejects: a format error, or the out-of-range part. */
  const extcommunityListProblem = (values: string[], formatKey: RouteMapRuleProblemKey, rangeKey: RouteMapRuleProblemKey) => {
    for (const value of values) {
      const bad = extcommunityProblem(value, caps);
      if (bad?.kind === "format") return problem(formatKey, { value });
      if (bad?.kind === "range") {
        return problem(rangeKey, { value: bad.part, min: bad.min, max: bad.max, args: { entry: value } });
      }
    }
    return null;
  };
  const bandwidthRange = routeMapRange(caps, "extcommunity_bandwidth");
  const bandwidthKeywords = caps?.values?.extcommunity_bandwidth_keywords || [];
  const communities = [
    // Lab: `none` excludes `add` and `replace`; `add` excludes `replace`.
    f.set_community_none && (f.set_community_add.length > 0 || f.set_community_replace.length > 0)
      ? problem("communityNoneConflict")
      : null,
    f.set_community_add.length > 0 && f.set_community_replace.length > 0 ? problem("communityAddReplaceConflict") : null,
    badCommunity
      ? problem("communityValueInvalid", { value: badCommunity, min: communityRange?.min, max: communityRange?.max })
      : null,
    f.set_large_community_none && (f.set_large_community_add.length > 0 || f.set_large_community_replace.length > 0)
      ? problem("largeCommunityNoneConflict")
      : null,
    f.set_large_community_add.length > 0 && f.set_large_community_replace.length > 0
      ? problem("largeCommunityAddReplaceConflict")
      : null,
    badLarge ? problem("largeCommunityValueInvalid", { value: badLarge, min: largeRange?.min, max: largeRange?.max }) : null,
    // Lab: extcommunity `none` excludes rt, soo and bandwidth; non-transitive needs a bandwidth.
    f.set_extcommunity_none &&
    (f.set_extcommunity_rt.length > 0 || f.set_extcommunity_soo.length > 0 || f.set_extcommunity_bandwidth)
      ? problem("extcommunityNoneConflict")
      : null,
    f.set_extcommunity_bandwidth &&
    !bandwidthKeywords.includes(f.set_extcommunity_bandwidth) &&
    !inRange(f.set_extcommunity_bandwidth, bandwidthRange)
      ? problem("extcommunityBandwidthInvalid", { min: bandwidthRange?.min, max: bandwidthRange?.max })
      : null,
    f.set_extcommunity_bandwidth_non_transitive && !f.set_extcommunity_bandwidth
      ? problem("bandwidthNonTransitiveNeedsBandwidth")
      : null,
    extcommunityListProblem(f.set_extcommunity_rt, "extcommunityRtInvalid", "extcommunityRtRange"),
    extcommunityListProblem(f.set_extcommunity_soo, "extcommunitySooInvalid", "extcommunitySooRange"),
  ];

  const nexthop = f.set_ip_nexthop;
  const sets = [
    checkRange("set_aggregator_as", "aggregator_as", "aggregatorAsRange"),
    checkValue("set_aggregator_ip", isIpv4, "aggregatorIpInvalid"),
    checkRange("set_local_preference", "local_preference", "setLocalPreferenceRange"),
    checkValue("set_originator_id", isIpv4, "originatorIdInvalid"),
    checkRange("set_weight", "weight", "weightRange"),
    nexthop && nexthop !== IP_NEXTHOP_PEER_ADDRESS && nexthop !== IP_NEXTHOP_UNCHANGED && !isIpv4(nexthop)
      ? problem("ipNexthopInvalid")
      : null,
    checkValue("set_ipv6_nexthop_global", isIpv6Address, "ipv6NexthopGlobalInvalid"),
    checkValue("set_ipv6_nexthop_local", isIpv6Address, "ipv6NexthopLocalInvalid"),
    checkValue("set_evpn_gateway_ipv4", isIpv4, "evpnGatewayIpv4Invalid"),
    checkValue("set_evpn_gateway_ipv6", isIpv6Address, "evpnGatewayIpv6Invalid"),
    checkRange("set_distance", "distance", "distanceRange"),
    f.set_metric && !metricValid(f.set_metric, caps) ? rangeProblem("metricInvalid", "metric") : null,
    checkValue("set_src", isIp, "srcInvalid"),
    checkRange("set_table", "table", "tableRange"),
    checkRange("set_tag", "tag", "setTagRange"),
  ];

  return [...flow, ...match, ...asPath, ...communities, ...sets].find((p) => p !== null) ?? null;
}

/**
 * A route-map create or edit the lab would reject, or null. `existingNames`
 * is null on edit, where the name is locked.
 */
export function routeMapProblem(form: RouteMapForm, existingNames: string[] | null, caps: Caps): RouteMapProblem | null {
  const f = normalizeMapForm(form);
  if (existingNames) {
    if (!f.name) return { key: "nameRequired" };
    if (!ROUTE_MAP_NAME_PATTERN.test(f.name)) return { key: "nameInvalid" };
    // VyOS tag names are case-sensitive: the taken check is exact.
    if (existingNames.includes(f.name)) return { key: "nameTaken" };
  }
  if (!descriptionValid(f.description, caps)) return { key: "descriptionTooLong", max: descriptionMaxLength(caps) };
  return null;
}
