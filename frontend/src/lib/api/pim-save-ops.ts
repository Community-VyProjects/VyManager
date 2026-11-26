import type {
  PimBatchOperation,
  PimCapabilities,
  PimConfig,
  PimIgmpJoin,
  PimRangeKey,
  PimRpAddress,
} from "./pim";
import { isIpv4 } from "./ospfv3-save-ops";
import { isIPv4Prefix } from "../validators/ipv4-prefix";

type Op = PimBatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read values through these.
// ============================================================================

export function pimText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function pimValue(value: Scalar): string | null {
  const text = pimText(value);
  return text === "" ? null : text;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(ops: Op[], setOp: string, deleteOp: string, target: string | undefined, before: Scalar, after: Scalar): void {
  const b = pimValue(before);
  const a = pimValue(after);
  if (a === b) return;
  if (a === null) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: withTarget(target, a) });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(ops: Op[], setOp: string, deleteOp: string, target: string | undefined,
  before: boolean | null | undefined, after: boolean): void {
  if (!!before === after) return;
  const op = after ? setOp : deleteOp;
  ops.push(target === undefined ? { op } : { op, value: target });
}

// ============================================================================
// Save checks. Bounds come from the builder RANGES served in capabilities.
// ============================================================================

export type PimProblemKey =
  | "joinPruneRange"
  | "keepAliveRange"
  | "registerSuppressRange"
  | "rpKeepAliveRange"
  | "packetsRange"
  | "watermarkRange"
  | "drPriorityRange"
  | "helloRange"
  | "queryIntervalRange"
  | "queryMaxResponseRange"
  | "igmpVersionRange"
  | "sourceAddressInvalid"
  | "selectInterface"
  | "interfaceExists"
  | "joinGroupInvalid"
  | "joinExists"
  | "joinGroupReserved"
  | "joinSourceInvalid"
  | "joinSourceExists"
  | "rpAddressInvalid"
  | "rpAddressExists"
  | "groupInvalid"
  | "groupExists"
  | "groupUsed"
  | "groupRequired"
  | "groupLast"
  | "interfaceRequired"
  | "lastInterface"
  | "rpRequired";

/** A keyed error under ``validation``; min and max fill a range message. */
export interface PimProblem {
  key: PimProblemKey;
  min?: number;
  max?: number;
}

/** Values for a ``validation.*`` message; a range key always has min and max. */
export function pimProblemArgs(problem: PimProblem): { min: string; max: string } {
  return { min: String(problem.min ?? ""), max: String(problem.max ?? "") };
}

type Caps = Pick<PimCapabilities, "ranges"> | null | undefined;

export function pimRange(caps: Caps, key: PimRangeKey): { min: number; max: number } | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

/** A blank value passes; otherwise a plain decimal inside the served range (no parseInt). */
function rangeProblem(caps: Caps, key: PimRangeKey, problem: PimProblemKey, value: Scalar): PimProblem | null {
  const text = pimValue(value);
  if (text === null) return null;
  const range = pimRange(caps, key);
  const n = Number(text);
  if (!/^\d{1,10}$/.test(text) || (range && (n < range.min || n > range.max))) {
    return { key: problem, min: range?.min, max: range?.max };
  }
  return null;
}

function first(...problems: (PimProblem | null)[]): PimProblem | null {
  return problems.find((p) => p !== null) ?? null;
}

/** 224.0.0.0/24 is reserved: both labs reject an `igmp join` group inside it. */
export function isReservedJoinGroup(value: string): boolean {
  return isIpv4(value) && /^224\.0\.0\.\d+$/.test(value);
}

/** An IPv4 multicast group address (224.0.0.0/4). */
export function isIpv4Multicast(value: string): boolean {
  if (!isIpv4(value)) return false;
  const octet = Number(value.split(".")[0]);
  return octet >= 224 && octet <= 239;
}

/** An IPv4 multicast group range: a prefix with no host bits inside 224.0.0.0/4. */
export function isIpv4MulticastPrefix(value: string): boolean {
  if (!isIPv4Prefix(value)) return false;
  const [address, length] = value.split("/");
  return Number(length) >= 4 && isIpv4Multicast(address);
}

// ============================================================================
// Global settings (General tab, one commit)
// ============================================================================

export interface PimGlobalDraft {
  ecmp: boolean;
  ecmp_rebalance: boolean;
  no_v6_secondary: boolean;
  join_prune_interval: Scalar;
  keep_alive_timer: Scalar;
  register_suppress_time: Scalar;
  packets: Scalar;
  igmp_watermark_warning: Scalar;
  register_accept_list_prefix_list: Scalar;
  ssm_prefix_list: Scalar;
  spt_infinity_and_beyond: boolean;
  spt_prefix_list: Scalar;
}

/** The draft the General tab starts from. */
export function pimGlobalDraft(config: PimConfig): PimGlobalDraft {
  const str = (v: Scalar) => pimText(v);
  return {
    ecmp: config.ecmp,
    ecmp_rebalance: config.ecmp_rebalance,
    no_v6_secondary: config.no_v6_secondary,
    join_prune_interval: str(config.join_prune_interval),
    keep_alive_timer: str(config.keep_alive_timer),
    register_suppress_time: str(config.register_suppress_time),
    packets: str(config.packets),
    igmp_watermark_warning: str(config.igmp_watermark_warning),
    register_accept_list_prefix_list: str(config.register_accept_list_prefix_list),
    ssm_prefix_list: str(config.ssm_prefix_list),
    spt_infinity_and_beyond: config.spt_switchover?.infinity_and_beyond ?? false,
    spt_prefix_list: str(config.spt_switchover?.prefix_list),
  };
}

/** True when the draft sets any global leaf. */
function globalDraftSet(draft: PimGlobalDraft): boolean {
  return draft.ecmp || draft.no_v6_secondary || draft.spt_infinity_and_beyond || [
    draft.join_prune_interval, draft.keep_alive_timer, draft.register_suppress_time, draft.packets,
    draft.igmp_watermark_warning, draft.register_accept_list_prefix_list, draft.ssm_prefix_list,
  ].some((v) => pimValue(v) !== null);
}

/**
 * ``config`` is the device config: `protocols pim` with no interface fails
 * the commit ("PIM require defined interfaces!"), so a global setting needs one.
 */
export function pimGlobalProblem(draft: PimGlobalDraft, caps: Caps, config?: PimConfig | null): PimProblem | null {
  if (config && config.interfaces.length === 0 && globalDraftSet(draft)) return { key: "interfaceRequired" };
  return first(
    rangeProblem(caps, "timer", "joinPruneRange", draft.join_prune_interval),
    rangeProblem(caps, "timer", "keepAliveRange", draft.keep_alive_timer),
    rangeProblem(caps, "timer", "registerSuppressRange", draft.register_suppress_time),
    rangeProblem(caps, "packets", "packetsRange", draft.packets),
    rangeProblem(caps, "watermark_warning", "watermarkRange", draft.igmp_watermark_warning),
  );
}

export function pimGlobalOps(original: PimConfig, updated: PimGlobalDraft): Op[] {
  const ops: Op[] = [];
  // ecmp off drops rebalance with it; rebalance is only diffed while ecmp stays on.
  if (original.ecmp && !updated.ecmp) {
    ops.push({ op: "delete_ecmp" });
  } else if (updated.ecmp) {
    if (!original.ecmp) ops.push({ op: "set_ecmp" });
    flag(ops, "set_ecmp_rebalance", "delete_ecmp_rebalance", undefined,
      original.ecmp && original.ecmp_rebalance, updated.ecmp_rebalance);
  }
  flag(ops, "set_no_v6_secondary", "delete_no_v6_secondary", undefined, original.no_v6_secondary, updated.no_v6_secondary);
  leaf(ops, "set_join_prune_interval", "delete_join_prune_interval", undefined,
    original.join_prune_interval, updated.join_prune_interval);
  leaf(ops, "set_keep_alive_timer", "delete_keep_alive_timer", undefined, original.keep_alive_timer, updated.keep_alive_timer);
  leaf(ops, "set_register_suppress_time", "delete_register_suppress_time", undefined,
    original.register_suppress_time, updated.register_suppress_time);
  leaf(ops, "set_packets", "delete_packets", undefined, original.packets, updated.packets);
  leaf(ops, "set_igmp_watermark_warning", "delete_igmp_watermark_warning", undefined,
    original.igmp_watermark_warning, updated.igmp_watermark_warning);
  leaf(ops, "set_register_accept_list_prefix_list", "delete_register_accept_list_prefix_list", undefined,
    original.register_accept_list_prefix_list, updated.register_accept_list_prefix_list);
  leaf(ops, "set_ssm_prefix_list", "delete_ssm_prefix_list", undefined, original.ssm_prefix_list, updated.ssm_prefix_list);
  // infinity-and-beyond is the only child of spt-switchover, so turning it off deletes the node.
  const sptBefore = original.spt_switchover?.infinity_and_beyond ?? false;
  if (sptBefore && !updated.spt_infinity_and_beyond) {
    ops.push({ op: "delete_spt_switchover" });
  } else if (updated.spt_infinity_and_beyond) {
    if (!sptBefore) ops.push({ op: "set_spt_switchover_infinity" });
    leaf(ops, "set_spt_switchover_infinity_prefix_list", "delete_spt_switchover_infinity_prefix_list", undefined,
      sptBefore ? original.spt_switchover?.prefix_list : null, updated.spt_prefix_list);
  }
  return ops;
}

// ============================================================================
// RP keep-alive timer (Rendezvous Points tab)
// ============================================================================

/** `rp keep-alive-timer` with no `rp address` fails the commit, so the timer needs an RP address. */
export function pimRpTimerProblem(value: Scalar, caps: Caps, config?: PimConfig | null): PimProblem | null {
  if (config && pimValue(value) !== null) {
    if (config.interfaces.length === 0) return { key: "interfaceRequired" };
    if ((config.rp?.addresses.length ?? 0) === 0) return { key: "rpRequired" };
  }
  return rangeProblem(caps, "timer", "rpKeepAliveRange", value);
}

export function pimRpTimerOps(original: PimConfig, value: Scalar): Op[] {
  const ops: Op[] = [];
  // Clearing the timer of an `rp` node with no address would leave it empty; delete the node.
  if (pimValue(value) === null && pimValue(original.rp?.keep_alive_timer) !== null
    && (original.rp?.addresses.length ?? 0) === 0) {
    return pimDeleteOps.rp();
  }
  leaf(ops, "set_rp_keep_alive_timer", "delete_rp_keep_alive_timer", undefined, original.rp?.keep_alive_timer, value);
  return ops;
}

// ============================================================================
// Interfaces (PIM and IGMP settings)
// ============================================================================

export interface PimIgmpDraft {
  disabled: boolean;
  joins: PimIgmpJoin[];
  query_interval: Scalar;
  query_max_response_time: Scalar;
  version: Scalar;
}

/** An interface as the modal holds it (strings) or as GET /config returns it. */
export interface PimInterfaceDraft {
  name: string;
  bfd: boolean;
  bfd_profile: Scalar;
  dr_priority: Scalar;
  hello: Scalar;
  no_bsm: boolean;
  no_unicast_bsm: boolean;
  passive: boolean;
  source_address: Scalar;
  /** null when the interface has no `igmp` node. */
  igmp: PimIgmpDraft | null;
}

function joinProblem(joins: PimIgmpJoin[]): PimProblem | null {
  const groups = new Set<string>();
  for (const join of joins) {
    const group = pimText(join.group);
    if (!isIpv4(group)) return { key: "joinGroupInvalid" };
    if (isReservedJoinGroup(group)) return { key: "joinGroupReserved" };
    if (groups.has(group)) return { key: "joinExists" };
    groups.add(group);
    const sources = new Set<string>();
    for (const raw of join.source_addresses) {
      const source = pimText(raw);
      if (!isIpv4(source)) return { key: "joinSourceInvalid" };
      if (sources.has(source)) return { key: "joinSourceExists" };
      sources.add(source);
    }
  }
  return null;
}

export function pimInterfaceProblem(
  original: PimInterfaceDraft | null,
  updated: PimInterfaceDraft,
  caps: Caps,
  configured: string[] = [],
): PimProblem | null {
  const name = pimText(updated.name);
  if (!name) return { key: "selectInterface" };
  if (original === null && configured.map(pimText).includes(name)) return { key: "interfaceExists" };
  const source = pimValue(updated.source_address);
  if (source !== null && !isIpv4(source)) return { key: "sourceAddressInvalid" };
  const igmp = updated.igmp;
  return first(
    rangeProblem(caps, "dr_priority", "drPriorityRange", updated.dr_priority),
    rangeProblem(caps, "hello", "helloRange", updated.hello),
    igmp ? rangeProblem(caps, "query_interval", "queryIntervalRange", igmp.query_interval) : null,
    igmp ? rangeProblem(caps, "query_max_response_time", "queryMaxResponseRange", igmp.query_max_response_time) : null,
    igmp ? rangeProblem(caps, "igmp_version", "igmpVersionRange", igmp.version) : null,
    igmp ? joinProblem(igmp.joins) : null,
  );
}

/**
 * Fold a typed-but-not-added join group into the list. A blank draft leaves
 * the list as is; a bad or duplicate group returns the keyed problem instead.
 */
export function pimJoinsWithDraft(joins: PimIgmpJoin[], draft: string): { joins: PimIgmpJoin[]; problem: PimProblem | null } {
  const group = pimText(draft);
  if (!group) return { joins, problem: null };
  if (!isIpv4(group)) return { joins, problem: { key: "joinGroupInvalid" } };
  if (isReservedJoinGroup(group)) return { joins, problem: { key: "joinGroupReserved" } };
  if (joins.some((j) => pimText(j.group) === group)) return { joins, problem: { key: "joinExists" } };
  return { joins: [...joins, { group, source_addresses: [] }], problem: null };
}

/** Fold a typed-but-not-added source address into one join. */
export function pimJoinSourcesWithDraft(join: PimIgmpJoin, draft: string): { join: PimIgmpJoin; problem: PimProblem | null } {
  const source = pimText(draft);
  if (!source) return { join, problem: null };
  if (!isIpv4(source)) return { join, problem: { key: "joinSourceInvalid" } };
  if (join.source_addresses.map(pimText).includes(source)) return { join, problem: { key: "joinSourceExists" } };
  return { join: { ...join, source_addresses: [...join.source_addresses, source] }, problem: null };
}

function joinMap(joins: PimIgmpJoin[] | undefined): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const join of joins ?? []) {
    const group = pimText(join.group);
    if (group) map.set(group, new Set(join.source_addresses.map(pimText).filter(Boolean)));
  }
  return map;
}

function igmpOps(ops: Op[], name: string, before: PimIgmpDraft | null, after: PimIgmpDraft | null): void {
  // Turning IGMP off deletes the node with every leaf and join under it.
  if (before && !after) {
    ops.push({ op: "delete_interface_igmp", value: name });
    return;
  }
  if (!after) return;
  if (!before) ops.push({ op: "set_interface_igmp", value: name });
  flag(ops, "set_interface_igmp_disable", "delete_interface_igmp_disable", name, before?.disabled, after.disabled);
  leaf(ops, "set_interface_igmp_query_interval", "delete_interface_igmp_query_interval", name,
    before?.query_interval, after.query_interval);
  leaf(ops, "set_interface_igmp_query_max_response_time", "delete_interface_igmp_query_max_response_time", name,
    before?.query_max_response_time, after.query_max_response_time);
  leaf(ops, "set_interface_igmp_version", "delete_interface_igmp_version", name, before?.version, after.version);
  // A join group is a tag: a kept group only diffs its source addresses.
  const old = joinMap(before?.joins);
  const next = joinMap(after.joins);
  for (const group of old.keys()) {
    if (!next.has(group)) ops.push({ op: "delete_interface_igmp_join", value: `${name},${group}` });
  }
  for (const [group, sources] of next) {
    const kept = old.get(group);
    if (!kept) ops.push({ op: "set_interface_igmp_join", value: `${name},${group}` });
    for (const source of kept ?? []) {
      if (!sources.has(source)) ops.push({ op: "delete_interface_igmp_join_source", value: `${name},${group},${source}` });
    }
    for (const source of sources) {
      if (!kept?.has(source)) ops.push({ op: "set_interface_igmp_join_source", value: `${name},${group},${source}` });
    }
  }
}

/** Ops for one interface; ``original`` is null on create. The interface node itself is never re-created. */
export function pimInterfaceOps(original: PimInterfaceDraft | null, updated: PimInterfaceDraft): Op[] {
  const ops: Op[] = [];
  const name = pimText(original?.name ?? updated.name);
  if (original === null) ops.push({ op: "set_interface", value: name });
  // BFD off drops its profile with it; the profile is only diffed while BFD stays on.
  if (original?.bfd && !updated.bfd) {
    ops.push({ op: "delete_interface_bfd", value: name });
  } else if (updated.bfd) {
    if (!original?.bfd) ops.push({ op: "set_interface_bfd", value: name });
    leaf(ops, "set_interface_bfd_profile", "delete_interface_bfd_profile", name,
      original?.bfd ? original.bfd_profile : null, updated.bfd_profile);
  }
  leaf(ops, "set_interface_dr_priority", "delete_interface_dr_priority", name, original?.dr_priority, updated.dr_priority);
  leaf(ops, "set_interface_hello", "delete_interface_hello", name, original?.hello, updated.hello);
  leaf(ops, "set_interface_source_address", "delete_interface_source_address", name,
    original?.source_address, updated.source_address);
  flag(ops, "set_interface_no_bsm", "delete_interface_no_bsm", name, original?.no_bsm, updated.no_bsm);
  flag(ops, "set_interface_no_unicast_bsm", "delete_interface_no_unicast_bsm", name,
    original?.no_unicast_bsm, updated.no_unicast_bsm);
  flag(ops, "set_interface_passive", "delete_interface_passive", name, original?.passive, updated.passive);
  igmpOps(ops, name, original?.igmp ?? null, updated.igmp);
  return ops;
}

// ============================================================================
// Rendezvous point addresses
// ============================================================================

/**
 * ``others`` are the RP addresses already configured besides this one: a new
 * address may not reuse one, and a group may not be served by two RPs.
 */
export function pimRpProblem(
  original: PimRpAddress | null,
  updated: PimRpAddress,
  others: PimRpAddress[] = [],
  interfaces: string[] | null = null,
): PimProblem | null {
  // `protocols pim` with no interface fails the commit; an RP needs one first.
  if (interfaces !== null && interfaces.length === 0) return { key: "interfaceRequired" };
  const address = pimText(updated.address);
  if (!isIpv4(address)) return { key: "rpAddressInvalid" };
  if (original === null && others.some((rp) => pimText(rp.address) === address)) return { key: "rpAddressExists" };
  const groups = updated.groups.map(pimText).filter(Boolean);
  // An RP needs a group. An edit may not remove the last one: the user deletes the RP instead.
  if (groups.length === 0) return original === null ? { key: "groupRequired" } : { key: "groupLast" };
  const used = new Set(others.filter((rp) => pimText(rp.address) !== address).flatMap((rp) => rp.groups.map(pimText)));
  const seen = new Set<string>();
  for (const group of groups) {
    if (!isIpv4MulticastPrefix(group)) return { key: "groupInvalid" };
    if (seen.has(group)) return { key: "groupExists" };
    if (used.has(group)) return { key: "groupUsed" };
    seen.add(group);
  }
  return null;
}

/** Fold a typed-but-not-added group into the list, or return the keyed problem. */
export function pimRpGroupsWithDraft(groups: string[], draft: string): { groups: string[]; problem: PimProblem | null } {
  const group = pimText(draft);
  if (!group) return { groups, problem: null };
  if (!isIpv4MulticastPrefix(group)) return { groups, problem: { key: "groupInvalid" } };
  if (groups.map(pimText).includes(group)) return { groups, problem: { key: "groupExists" } };
  return { groups: [...groups, group], problem: null };
}

/**
 * Delete one RP address. An `rp` node left with no address fails the commit
 * (with or without a keep-alive-timer), so the last address deletes the whole
 * `rp` node, which clears the timer with it.
 */
export function pimRpDeleteOps(config: PimConfig | null | undefined, address: string): Op[] {
  const others = (config?.rp?.addresses ?? []).filter((rp) => pimText(rp.address) !== pimText(address));
  return config && others.length === 0 ? pimDeleteOps.rp() : pimDeleteOps.rpAddress(address);
}

/**
 * Ops for one RP; ``original`` is null on create. The address tag is never
 * deleted and re-created. An edit with no group left sends nothing: the lab
 * rejects an RP with no group, and pimRpProblem blocks it (groupLast) so the
 * user deletes the RP instead of it being deleted silently.
 */
export function pimRpOps(original: PimRpAddress | null, updated: PimRpAddress): Op[] {
  const ops: Op[] = [];
  const address = pimText(original?.address ?? updated.address);
  if (original !== null && updated.groups.map(pimText).filter(Boolean).length === 0) return ops;
  if (original === null) ops.push({ op: "set_rp_address", value: address });
  const before = new Set((original?.groups ?? []).map(pimText).filter(Boolean));
  const after = new Set(updated.groups.map(pimText).filter(Boolean));
  for (const group of before) {
    if (!after.has(group)) ops.push({ op: "delete_rp_address_group", value: `${address},${group}` });
  }
  for (const group of after) {
    if (!before.has(group)) ops.push({ op: "set_rp_address_group", value: `${address},${group}` });
  }
  return ops;
}

// ============================================================================
// Whole-object deletes
// ============================================================================

/** True when `protocols pim` holds anything besides its interfaces. */
export function pimHasOtherConfig(config: PimConfig): boolean {
  return globalDraftSet(pimGlobalDraft(config)) || config.rp !== null;
}

/**
 * The last interface cannot go while other PIM config remains (the lab
 * rejects `protocols pim` with no interface). With nothing else left, its
 * delete removes all of `protocols pim`.
 */
export function pimInterfaceDeleteProblem(config: PimConfig, name: string): PimProblem | null {
  const others = config.interfaces.filter((i) => i.name !== pimText(name));
  return others.length === 0 && pimHasOtherConfig(config) ? { key: "lastInterface" } : null;
}

export function pimInterfaceDeleteOps(config: PimConfig, name: string): Op[] {
  const others = config.interfaces.filter((i) => i.name !== pimText(name));
  return others.length === 0 ? pimDeleteOps.all() : pimDeleteOps.interface(name);
}

export const pimDeleteOps = {
  interface: (name: string): Op[] => [{ op: "delete_interface", value: pimText(name) }],
  rpAddress: (address: string): Op[] => [{ op: "delete_rp_address", value: pimText(address) }],
  rp: (): Op[] => [{ op: "delete_rp" }],
  all: (): Op[] => [{ op: "delete_pim" }],
};
