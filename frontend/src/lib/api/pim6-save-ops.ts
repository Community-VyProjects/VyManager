import type {
  Pim6BatchOperation,
  Pim6Capabilities,
  Pim6Config,
  Pim6MldJoin,
  Pim6RpAddress,
} from "./pim6";
import { first, flag, leaf, pimText, pimValue, rangeProblem } from "./pim-save-ops";
import { ipv6Groups, isIpv6Prefix } from "./ospfv3-save-ops";

type Op = Pim6BatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Save checks. Bounds come from the builder RANGES served in capabilities;
// pimRange, pimProblemArgs, rangeProblem and first are shared with PIM.
// ============================================================================

export type Pim6ProblemKey =
  | "joinPruneRange"
  | "keepAliveRange"
  | "registerSuppressRange"
  | "rpKeepAliveRange"
  | "packetsRange"
  | "drPriorityRange"
  | "helloRange"
  | "mldIntervalRange"
  | "lastMemberQueryCountRange"
  | "mldVersionRange"
  | "selectInterface"
  | "interfaceExists"
  | "joinGroupInvalid"
  | "joinExists"
  | "joinSourceInvalid"
  | "joinSourceExists"
  | "rpAddressInvalid"
  | "rpAddressExists"
  | "groupInvalid"
  | "groupExists"
  | "groupUsed"
  | "groupRequired"
  | "groupLast"
  | "prefixListInvalid"
  | "rpRequired";

/** A keyed error under ``validation``; min and max fill a range message. */
export interface Pim6Problem {
  key: Pim6ProblemKey;
  min?: number;
  max?: number;
}

type Caps = Pick<Pim6Capabilities, "ranges"> | null | undefined;

/** Lowercased, compressed IPv6 text (RFC 5952 style), or null when malformed. */
function compressIpv6(address: string): string | null {
  const groups = ipv6Groups(address);
  if (!groups) return null;
  // The longest run of two or more zero groups becomes "::" (the first on a tie).
  let best = -1;
  let bestLen = 1;
  for (let i = 0; i < 8; ) {
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLen) {
      best = i;
      bestLen = j - i;
    }
    i = j === i ? i + 1 : j;
  }
  const hex = groups.map((g) => g.toString(16));
  if (best < 0) return hex.join(":");
  return `${hex.slice(0, best).join(":")}::${hex.slice(best + bestLen).join(":")}`;
}

/**
 * Compare key for an IPv6 address or prefix: lowercased and compressed, so
 * 2001:DB8::1 and 2001:db8:0::1 are one address. Only duplicate checks and
 * diffs use it; ops carry the user's or the loaded text, so a loaded node is
 * still addressed as the device stored it. Malformed text keys as itself.
 */
export function ipv6Key(value: Scalar): string {
  const text = pimText(value);
  const [address, length, ...rest] = text.split("/");
  const compressed = rest.length === 0 ? compressIpv6(address) : null;
  if (compressed === null) return text.toLowerCase();
  return length === undefined ? compressed : `${compressed}/${length}`;
}

/** Map of compare key to the first text seen for it, for blank-free IPv6 lists. */
function keyed(values: Scalar[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const value of values) {
    const text = pimText(value);
    if (text && !map.has(ipv6Key(text))) map.set(ipv6Key(text), text);
  }
  return map;
}

/** An IPv6 address as the lab takes it: no prefix length and no zone index. */
export function isIpv6Address(value: string): boolean {
  return !value.includes("/") && isIpv6Prefix(`${value}/128`);
}

// The first group is four hex digits starting ff (ff00::/8); "ff::" is 0x00ff.
const MULTICAST_HEAD = /^ff[0-9a-f]{2}:/i;

/** An IPv6 multicast address (inside ff00::/8): the lab rejects any other `mld join` group. */
export function isIpv6Multicast(value: string): boolean {
  return isIpv6Address(value) && MULTICAST_HEAD.test(value);
}

/** An IPv6 multicast group range: a prefix with no host bits inside ff00::/8. */
export function isIpv6MulticastPrefix(value: string): boolean {
  if (!isIpv6Prefix(value)) return false;
  const [address, length] = value.split("/");
  return Number(length) >= 8 && MULTICAST_HEAD.test(address);
}

/** A `policy prefix-list6` name as the lab takes it. */
export function isPrefixList6Name(value: string): boolean {
  return /^[-_a-zA-Z0-9]+$/.test(value);
}

// ============================================================================
// Global settings (General tab, one commit)
// ============================================================================

export interface Pim6GlobalDraft {
  join_prune_interval: Scalar;
  keep_alive_timer: Scalar;
  register_suppress_time: Scalar;
  packets: Scalar;
}

/** The draft the General tab starts from. */
export function pim6GlobalDraft(config: Pim6Config): Pim6GlobalDraft {
  return {
    join_prune_interval: pimText(config.join_prune_interval),
    keep_alive_timer: pimText(config.keep_alive_timer),
    register_suppress_time: pimText(config.register_suppress_time),
    packets: pimText(config.packets),
  };
}

export function pim6GlobalProblem(draft: Pim6GlobalDraft, caps: Caps): Pim6Problem | null {
  return first(
    rangeProblem(caps, "timer", "joinPruneRange", draft.join_prune_interval),
    rangeProblem(caps, "timer", "keepAliveRange", draft.keep_alive_timer),
    rangeProblem(caps, "timer", "registerSuppressRange", draft.register_suppress_time),
    rangeProblem(caps, "packets", "packetsRange", draft.packets),
  );
}

export function pim6GlobalOps(original: Pim6Config, updated: Pim6GlobalDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_join_prune_interval", "delete_join_prune_interval", undefined,
    original.join_prune_interval, updated.join_prune_interval);
  leaf(ops, "set_keep_alive_timer", "delete_keep_alive_timer", undefined, original.keep_alive_timer, updated.keep_alive_timer);
  leaf(ops, "set_register_suppress_time", "delete_register_suppress_time", undefined,
    original.register_suppress_time, updated.register_suppress_time);
  leaf(ops, "set_packets", "delete_packets", undefined, original.packets, updated.packets);
  return ops;
}

// ============================================================================
// RP keep-alive timer (Rendezvous Points tab)
// ============================================================================

/** `rp keep-alive-timer` with no `rp address` fails the commit, so the timer needs an RP address. */
export function pim6RpTimerProblem(value: Scalar, caps: Caps, config?: Pim6Config | null): Pim6Problem | null {
  if (config && pimValue(value) !== null && (config.rp?.addresses.length ?? 0) === 0) return { key: "rpRequired" };
  return rangeProblem(caps, "timer", "rpKeepAliveRange", value);
}

export function pim6RpTimerOps(original: Pim6Config, value: Scalar): Op[] {
  const ops: Op[] = [];
  // Clearing the timer of an `rp` node with no address would leave it empty; delete the node.
  if (pimValue(value) === null && pimValue(original.rp?.keep_alive_timer) !== null
    && (original.rp?.addresses.length ?? 0) === 0) {
    return pim6DeleteOps.rp();
  }
  leaf(ops, "set_rp_keep_alive_timer", "delete_rp_keep_alive_timer", undefined, original.rp?.keep_alive_timer, value);
  return ops;
}

// ============================================================================
// Interfaces (PIMv6 and MLD settings)
// ============================================================================

export interface Pim6MldDraft {
  disabled: boolean;
  interval: Scalar;
  last_member_query_count: Scalar;
  last_member_query_interval: Scalar;
  max_response_time: Scalar;
  version: Scalar;
  joins: Pim6MldJoin[];
}

/** An interface as the modal holds it (strings) or as GET /config returns it. */
export interface Pim6InterfaceDraft {
  name: string;
  dr_priority: Scalar;
  hello: Scalar;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  /** null when the interface has no `mld` node. */
  mld: Pim6MldDraft | null;
}

function joinProblem(joins: Pim6MldJoin[]): Pim6Problem | null {
  const groups = new Set<string>();
  for (const join of joins) {
    const group = pimText(join.group);
    if (!isIpv6Multicast(group)) return { key: "joinGroupInvalid" };
    if (groups.has(ipv6Key(group))) return { key: "joinExists" };
    groups.add(ipv6Key(group));
    const sources = new Set<string>();
    for (const raw of join.sources) {
      const source = pimText(raw);
      if (!isIpv6Address(source)) return { key: "joinSourceInvalid" };
      if (sources.has(ipv6Key(source))) return { key: "joinSourceExists" };
      sources.add(ipv6Key(source));
    }
  }
  return null;
}

export function pim6InterfaceProblem(
  original: Pim6InterfaceDraft | null,
  updated: Pim6InterfaceDraft,
  caps: Caps,
  configured: string[] = [],
): Pim6Problem | null {
  const name = pimText(updated.name);
  if (!name) return { key: "selectInterface" };
  if (original === null && configured.map(pimText).includes(name)) return { key: "interfaceExists" };
  const mld = updated.mld;
  return first(
    rangeProblem(caps, "dr_priority", "drPriorityRange", updated.dr_priority),
    rangeProblem(caps, "hello", "helloRange", updated.hello),
    mld ? rangeProblem(caps, "mld_interval", "mldIntervalRange", mld.interval) : null,
    mld ? rangeProblem(caps, "last_member_query_count", "lastMemberQueryCountRange", mld.last_member_query_count) : null,
    mld ? rangeProblem(caps, "mld_version", "mldVersionRange", mld.version) : null,
    mld ? joinProblem(mld.joins) : null,
  );
}

/**
 * Fold a typed-but-not-added join group into the list. A blank draft leaves
 * the list as is; a bad or duplicate group returns the keyed problem instead.
 */
export function pim6JoinsWithDraft(joins: Pim6MldJoin[], draft: string): { joins: Pim6MldJoin[]; problem: Pim6Problem | null } {
  const group = pimText(draft);
  if (!group) return { joins, problem: null };
  if (!isIpv6Multicast(group)) return { joins, problem: { key: "joinGroupInvalid" } };
  if (joins.some((j) => ipv6Key(j.group) === ipv6Key(group))) return { joins, problem: { key: "joinExists" } };
  return { joins: [...joins, { group, sources: [] }], problem: null };
}

/** Fold a typed-but-not-added source address into one join. */
export function pim6JoinSourcesWithDraft(join: Pim6MldJoin, draft: string): { join: Pim6MldJoin; problem: Pim6Problem | null } {
  const source = pimText(draft);
  if (!source) return { join, problem: null };
  if (!isIpv6Address(source)) return { join, problem: { key: "joinSourceInvalid" } };
  if (join.sources.some((s) => ipv6Key(s) === ipv6Key(source))) return { join, problem: { key: "joinSourceExists" } };
  return { join: { ...join, sources: [...join.sources, source] }, problem: null };
}

/** Joins by group compare key: the group text and its sources (compare key to text). */
function joinMap(joins: Pim6MldJoin[] | undefined): Map<string, { group: string; sources: Map<string, string> }> {
  const map = new Map<string, { group: string; sources: Map<string, string> }>();
  for (const join of joins ?? []) {
    const group = pimText(join.group);
    if (group && !map.has(ipv6Key(group))) map.set(ipv6Key(group), { group, sources: keyed(join.sources) });
  }
  return map;
}

/**
 * MLD leaves the screen does not set. On VyOS 1.4 and 1.5 any value for
 * `mld last-member-query-interval` or `mld max-response-time` crashes the FRR
 * render (pim6d.frr.j2 floor-divides the string), so no set can commit. The
 * builder keeps both ops (they are lab leaves); a loaded value is shown
 * read-only and the only op is its delete.
 */
export const READ_ONLY_MLD_LEAVES = ["last_member_query_interval", "max_response_time"] as const;

/** Delete a loaded leaf the user removed; never set one. */
function removeOnly(ops: Op[], deleteOp: string, target: string, before: Scalar, after: Scalar): void {
  if (pimValue(before) !== null && pimValue(after) === null) ops.push({ op: deleteOp, value: target });
}

function mldOps(ops: Op[], name: string, before: Pim6MldDraft | null, after: Pim6MldDraft | null): void {
  // Turning MLD off deletes the node with every leaf and join under it.
  if (before && !after) {
    ops.push({ op: "delete_interface_mld", value: name });
    return;
  }
  if (!after) return;
  if (!before) ops.push({ op: "set_interface_mld", value: name });
  flag(ops, "set_interface_mld_disable", "delete_interface_mld_disable", name, before?.disabled, after.disabled);
  leaf(ops, "set_interface_mld_interval", "delete_interface_mld_interval", name, before?.interval, after.interval);
  leaf(ops, "set_interface_mld_last_member_query_count", "delete_interface_mld_last_member_query_count", name,
    before?.last_member_query_count, after.last_member_query_count);
  // Set is never sent for these; a loaded value can only be removed.
  for (const key of READ_ONLY_MLD_LEAVES) removeOnly(ops, `delete_interface_mld_${key}`, name, before?.[key], after[key]);
  leaf(ops, "set_interface_mld_version", "delete_interface_mld_version", name, before?.version, after.version);
  // A join group is a tag: a kept group only diffs its sources.
  // Deletes and kept groups use the loaded text so they address the stored node.
  const old = joinMap(before?.joins);
  const next = joinMap(after.joins);
  for (const [key, join] of old) {
    if (!next.has(key)) ops.push({ op: "delete_interface_mld_join", value: `${name},${join.group}` });
  }
  for (const [key, join] of next) {
    const kept = old.get(key);
    const group = kept?.group ?? join.group;
    if (!kept) ops.push({ op: "set_interface_mld_join", value: `${name},${group}` });
    for (const [sourceKey, source] of kept?.sources ?? []) {
      if (!join.sources.has(sourceKey)) {
        ops.push({ op: "delete_interface_mld_join_source", value: `${name},${group},${source}` });
      }
    }
    for (const [sourceKey, source] of join.sources) {
      if (!kept?.sources.has(sourceKey)) {
        ops.push({ op: "set_interface_mld_join_source", value: `${name},${group},${source}` });
      }
    }
  }
}

/** Ops for one interface; ``original`` is null on create. The interface node itself is never re-created. */
export function pim6InterfaceOps(original: Pim6InterfaceDraft | null, updated: Pim6InterfaceDraft): Op[] {
  const ops: Op[] = [];
  const name = pimText(original?.name ?? updated.name);
  if (original === null) ops.push({ op: "set_interface", value: name });
  leaf(ops, "set_interface_dr_priority", "delete_interface_dr_priority", name, original?.dr_priority, updated.dr_priority);
  leaf(ops, "set_interface_hello", "delete_interface_hello", name, original?.hello, updated.hello);
  flag(ops, "set_interface_no_bsm", "delete_interface_no_bsm", name, original?.no_bsm, updated.no_bsm);
  flag(ops, "set_interface_no_unicast_bsm", "delete_interface_no_unicast_bsm", name,
    original?.no_unicast_bsm, updated.no_unicast_bsm);
  flag(ops, "set_interface_passive", "delete_interface_passive", name, original?.passive, updated.passive);
  mldOps(ops, name, original?.mld ?? null, updated.mld);
  return ops;
}

// ============================================================================
// Rendezvous point addresses
// ============================================================================

/**
 * ``others`` are the RP addresses already configured besides this one: a new
 * address may not reuse one, and a group may not be served by two RPs. Every
 * RP address needs at least one group (the lab rejects a prefix-list6 alone);
 * a prefix-list6 is an optional extra next to the groups.
 */
export function pim6RpProblem(
  original: Pim6RpAddress | null,
  updated: Pim6RpAddress,
  others: Pim6RpAddress[] = [],
): Pim6Problem | null {
  const address = pimText(updated.address);
  if (!isIpv6Address(address)) return { key: "rpAddressInvalid" };
  if (original === null && others.some((rp) => ipv6Key(rp.address) === ipv6Key(address))) {
    return { key: "rpAddressExists" };
  }
  const groups = updated.groups.map(pimText).filter(Boolean);
  const prefixList = pimValue(updated.prefix_list6);
  // An edit may not remove the last group: the user deletes the RP instead.
  if (groups.length === 0) return original === null ? { key: "groupRequired" } : { key: "groupLast" };
  if (prefixList !== null && !isPrefixList6Name(prefixList)) return { key: "prefixListInvalid" };
  const used = new Set(others.filter((rp) => ipv6Key(rp.address) !== ipv6Key(address))
    .flatMap((rp) => rp.groups.map(ipv6Key)));
  const seen = new Set<string>();
  for (const group of groups) {
    if (!isIpv6MulticastPrefix(group)) return { key: "groupInvalid" };
    if (seen.has(ipv6Key(group))) return { key: "groupExists" };
    if (used.has(ipv6Key(group))) return { key: "groupUsed" };
    seen.add(ipv6Key(group));
  }
  return null;
}

/** Fold a typed-but-not-added group into the list, or return the keyed problem. */
export function pim6RpGroupsWithDraft(groups: string[], draft: string): { groups: string[]; problem: Pim6Problem | null } {
  const group = pimText(draft);
  if (!group) return { groups, problem: null };
  if (!isIpv6MulticastPrefix(group)) return { groups, problem: { key: "groupInvalid" } };
  if (groups.some((g) => ipv6Key(g) === ipv6Key(group))) return { groups, problem: { key: "groupExists" } };
  return { groups: [...groups, group], problem: null };
}

/**
 * Delete one RP address. An `rp` node left with no address fails the commit
 * (with or without a keep-alive-timer), so the last address deletes the whole
 * `rp` node, which clears the timer with it.
 */
export function pim6RpDeleteOps(config: Pim6Config | null | undefined, address: string): Op[] {
  const others = (config?.rp?.addresses ?? []).filter((rp) => ipv6Key(rp.address) !== ipv6Key(address));
  return config && others.length === 0 ? pim6DeleteOps.rp() : pim6DeleteOps.rpAddress(address);
}

/**
 * Ops for one RP; ``original`` is null on create. The address tag is never
 * deleted and re-created: groups are diffed and the optional prefix-list6 is
 * set, changed or deleted next to them. An edit left with no group sends
 * nothing; pim6RpProblem blocks it (groupLast).
 */
export function pim6RpOps(original: Pim6RpAddress | null, updated: Pim6RpAddress): Op[] {
  const ops: Op[] = [];
  const address = pimText(original?.address ?? updated.address);
  const after = keyed(updated.groups);
  const prefixList = pimValue(updated.prefix_list6);
  if (original !== null && after.size === 0) return ops;
  if (original === null) ops.push({ op: "set_rp_address", value: address });
  const before = keyed(original?.groups ?? []);
  for (const [key, group] of before) {
    if (!after.has(key)) ops.push({ op: "delete_rp_address_group", value: `${address},${group}` });
  }
  if (pimValue(original?.prefix_list6) !== null && prefixList === null) {
    ops.push({ op: "delete_rp_address_prefix_list6", value: address });
  }
  for (const [key, group] of after) {
    if (!before.has(key)) ops.push({ op: "set_rp_address_group", value: `${address},${group}` });
  }
  if (prefixList !== null && prefixList !== pimValue(original?.prefix_list6)) {
    ops.push({ op: "set_rp_address_prefix_list6", value: `${address},${prefixList}` });
  }
  return ops;
}

// ============================================================================
// Whole-object deletes
// ============================================================================

export const pim6DeleteOps = {
  interface: (name: string): Op[] => [{ op: "delete_interface", value: pimText(name) }],
  rpAddress: (address: string): Op[] => [{ op: "delete_rp_address", value: pimText(address) }],
  rp: (): Op[] => [{ op: "delete_rp" }],
  all: (): Op[] => [{ op: "delete_pim6" }],
};
