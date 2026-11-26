import type {
  RipNgBatchOperation,
  RipNgCapabilities,
  RipNgConfig,
  RipNgDistributeListGlobal,
  RipNgDistributeListInterface,
  RipNgInterface,
  RipNgRangeKey,
  RipNgRedistribute,
} from "./ripng";
import { isIpv6Prefix } from "./ospfv3-save-ops";

type Op = RipNgBatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read values through these.
// ============================================================================

export function ripngText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function ripngValue(value: Scalar): string | null {
  const text = ripngText(value);
  return text === "" ? null : text;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(ops: Op[], setOp: string, deleteOp: string, target: string | undefined, before: Scalar, after: Scalar): void {
  const b = ripngValue(before);
  const a = ripngValue(after);
  if (a === b) return;
  if (a === null) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: withTarget(target, a) });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(ops: Op[], setOp: string, deleteOp: string, before: boolean | null | undefined, after: boolean): void {
  if (!!before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

// ============================================================================
// Save checks. Bounds come from the builder RANGES served in capabilities.
// ============================================================================

export type RipNgProblemKey =
  | "metricRange"
  | "timerRange"
  | "prefixInvalid"
  | "prefixExists"
  | "selectInterface"
  | "interfaceExists"
  | "selectProtocol"
  | "selectList";

/** A keyed error under ``validation``; min and max fill a range message. */
export interface RipNgProblem {
  key: RipNgProblemKey;
  min?: number;
  max?: number;
}

/** Values for a ``validation.*`` message; a range key always has min and max. */
export function ripngProblemArgs(problem: RipNgProblem): { min: string; max: string } {
  return { min: String(problem.min ?? ""), max: String(problem.max ?? "") };
}

type Caps = Pick<RipNgCapabilities, "ranges"> | null | undefined;

export function ripngRange(caps: Caps, key: RipNgRangeKey): { min: number; max: number } | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

/** A blank value passes; otherwise a plain decimal inside the served range (no parseInt). */
function rangeProblem(caps: Caps, key: RipNgRangeKey, problem: RipNgProblemKey, value: Scalar): RipNgProblem | null {
  const text = ripngValue(value);
  if (text === null) return null;
  const range = ripngRange(caps, key);
  const n = Number(text);
  if (!/^\d{1,10}$/.test(text) || (range && (n < range.min || n > range.max))) {
    return { key: problem, min: range?.min, max: range?.max };
  }
  return null;
}

function first(...problems: (RipNgProblem | null)[]): RipNgProblem | null {
  return problems.find((p) => p !== null) ?? null;
}

// ============================================================================
// Global settings and timers (one commit)
// ============================================================================

/** Timer fields as the overview form holds them (strings) or as GET /config returns them. */
export interface RipNgTimersDraft {
  update?: Scalar;
  timeout?: Scalar;
  garbage_collection?: Scalar;
}

export interface RipNgSettingsDraft {
  default_metric: Scalar;
  route_map: Scalar;
  default_information_originate: boolean;
  timers: RipNgTimersDraft;
}

export function ripngSettingsProblem(draft: RipNgSettingsDraft, caps: Caps): RipNgProblem | null {
  return first(
    rangeProblem(caps, "metric", "metricRange", draft.default_metric),
    rangeProblem(caps, "timer", "timerRange", draft.timers.update),
    rangeProblem(caps, "timer", "timerRange", draft.timers.timeout),
    rangeProblem(caps, "timer", "timerRange", draft.timers.garbage_collection),
  );
}

export function ripngTimersOps(original: RipNgTimersDraft, updated: RipNgTimersDraft): Op[] {
  const ops: Op[] = [];
  const before = [original.update, original.timeout, original.garbage_collection].map(ripngValue);
  const after = [updated.update, updated.timeout, updated.garbage_collection].map(ripngValue);
  // Clearing every timer drops the ``timers`` node instead of leaving it bare.
  if (after.every((v) => v === null)) {
    if (before.some((v) => v !== null)) ops.push({ op: "delete_timers" });
    return ops;
  }
  leaf(ops, "set_timers_update", "delete_timers_update", undefined, original.update, updated.update);
  leaf(ops, "set_timers_timeout", "delete_timers_timeout", undefined, original.timeout, updated.timeout);
  leaf(ops, "set_timers_garbage_collection", "delete_timers_garbage_collection", undefined,
    original.garbage_collection, updated.garbage_collection);
  return ops;
}

export function ripngSettingsOps(original: RipNgConfig, updated: RipNgSettingsDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_default_metric", "delete_default_metric", undefined, original.default_metric, updated.default_metric);
  leaf(ops, "set_route_map", "delete_route_map", undefined, original.route_map, updated.route_map);
  flag(ops, "set_default_information_originate", "delete_default_information_originate",
    original.default_information_originate, updated.default_information_originate);
  ops.push(...ripngTimersOps(original.timers, updated.timers));
  return ops;
}

// ============================================================================
// Multi-value lists: network, aggregate-address, route, passive-interface
// ============================================================================

export type RipNgListKind = "network" | "aggregateAddress" | "route" | "passiveInterface";

const LIST_OP: Record<RipNgListKind, string> = {
  network: "network",
  aggregateAddress: "aggregate_address",
  route: "route",
  passiveInterface: "passive_interface",
};

/** `validation.*` key for a value the list would reject, or null. */
export function ripngListProblem(kind: RipNgListKind, items: string[], value: string): RipNgProblem | null {
  const text = ripngText(value);
  const stored = items.map(ripngText);
  if (kind === "passiveInterface") {
    if (!text) return { key: "selectInterface" };
    return stored.includes(text) ? { key: "interfaceExists" } : null;
  }
  if (!isIpv6Prefix(text)) return { key: "prefixInvalid" };
  return stored.includes(text) ? { key: "prefixExists" } : null;
}

/**
 * Fold a typed-but-not-added value into the list. A blank draft leaves the
 * list as is; a bad or duplicate value returns the keyed problem instead.
 */
export function ripngListWithDraft(
  kind: RipNgListKind,
  items: string[],
  draft: string,
): { items: string[]; problem: RipNgProblem | null } {
  const text = ripngText(draft);
  if (!text) return { items, problem: null };
  const problem = ripngListProblem(kind, items, text);
  return problem ? { items, problem } : { items: [...items, text], problem: null };
}

/** Delete the values that left the list and set the new ones; kept values send nothing. */
export function ripngListOps(kind: RipNgListKind, original: string[], updated: string[]): Op[] {
  const ops: Op[] = [];
  const before = new Set(original.map(ripngText).filter(Boolean));
  const after = new Set(updated.map(ripngText).filter(Boolean));
  for (const value of before) {
    if (!after.has(value)) ops.push({ op: `delete_${LIST_OP[kind]}`, value });
  }
  for (const value of after) {
    if (!before.has(value)) ops.push({ op: `set_${LIST_OP[kind]}`, value });
  }
  return ops;
}

// ============================================================================
// Interfaces (split-horizon)
// ============================================================================

const SPLIT_HORIZON_SET: Record<string, string> = {
  disable: "set_interface_split_horizon_disable",
  "poison-reverse": "set_interface_split_horizon_poison_reverse",
};

export function ripngInterfaceProblem(
  original: RipNgInterface | null,
  updated: RipNgInterface,
  configured: string[] = [],
): RipNgProblem | null {
  const name = ripngText(updated.name);
  if (!name) return { key: "selectInterface" };
  if (original === null && configured.map(ripngText).includes(name)) return { key: "interfaceExists" };
  return null;
}

/** Ops for one interface; ``original`` is null on create. The interface node itself is never re-created. */
export function ripngInterfaceOps(original: RipNgInterface | null, updated: RipNgInterface): Op[] {
  const ops: Op[] = [];
  const name = ripngText(original?.name ?? updated.name);
  if (original === null) ops.push({ op: "set_interface", value: name });
  // disable and poison-reverse cannot both be set, so a switch deletes the old one in the same commit.
  const beforeSplit = ripngText(original?.split_horizon);
  const afterSplit = ripngText(updated.split_horizon);
  if (beforeSplit !== afterSplit) {
    if (beforeSplit) ops.push({ op: "delete_interface_split_horizon", value: name });
    if (afterSplit && SPLIT_HORIZON_SET[afterSplit]) ops.push({ op: SPLIT_HORIZON_SET[afterSplit], value: name });
  }
  return ops;
}

// ============================================================================
// Redistribute
// ============================================================================

export function ripngRedistributeProblem(updated: RipNgRedistribute, caps: Caps): RipNgProblem | null {
  if (!ripngText(updated.protocol)) return { key: "selectProtocol" };
  return rangeProblem(caps, "metric", "metricRange", updated.metric);
}

/** Ops for one source; ``original`` is null on create. A cleared leaf is deleted, the source is kept. */
export function ripngRedistributeOps(original: RipNgRedistribute | null, updated: RipNgRedistribute): Op[] {
  const ops: Op[] = [];
  const proto = ripngText(original?.protocol ?? updated.protocol);
  if (original === null) ops.push({ op: "set_redistribute", value: proto });
  leaf(ops, "set_redistribute_metric", "delete_redistribute_metric", proto, original?.metric, updated.metric);
  leaf(ops, "set_redistribute_route_map", "delete_redistribute_route_map", proto, original?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Distribute lists
// ============================================================================

const LIST_FIELDS = ["access_list_in", "access_list_out", "prefix_list_in", "prefix_list_out"] as const;

export function ripngDistributeListGlobalOps(
  original: RipNgDistributeListGlobal,
  updated: RipNgDistributeListGlobal,
): Op[] {
  const ops: Op[] = [];
  for (const field of LIST_FIELDS) {
    leaf(ops, `set_distribute_list_${field}`, `delete_distribute_list_${field}`, undefined, original[field], updated[field]);
  }
  return ops;
}

/** True when the per-interface filter names no list, so a save would emit nothing. */
export function ripngDistributeListInterfaceEmpty(entry: RipNgDistributeListInterface): boolean {
  return LIST_FIELDS.every((field) => ripngValue(entry[field]) === null);
}

export function ripngDistributeListInterfaceProblem(
  original: RipNgDistributeListInterface | null,
  updated: RipNgDistributeListInterface,
  configured: string[] = [],
): RipNgProblem | null {
  const iface = ripngText(updated.interface);
  if (!iface) return { key: "selectInterface" };
  if (original !== null) return null;
  if (configured.map(ripngText).includes(iface)) return { key: "interfaceExists" };
  // An edit may clear every list (that deletes the entry); a new entry must name one.
  if (ripngDistributeListInterfaceEmpty(updated)) return { key: "selectList" };
  return null;
}

/**
 * Ops for one interface filter; ``original`` is null on create. The interface
 * tag is never re-created. An edit that clears all four lists deletes the
 * ``distribute-list interface <if>`` node, which VyOS would otherwise leave bare.
 */
export function ripngDistributeListInterfaceOps(
  original: RipNgDistributeListInterface | null,
  updated: RipNgDistributeListInterface,
): Op[] {
  const ops: Op[] = [];
  const iface = ripngText(original?.interface ?? updated.interface);
  if (original !== null && ripngDistributeListInterfaceEmpty(updated)) {
    return ripngDeleteOps.interfaceFilter(iface);
  }
  for (const field of LIST_FIELDS) {
    leaf(ops, `set_distribute_list_interface_${field}`, `delete_distribute_list_interface_${field}`, iface,
      original?.[field], updated[field]);
  }
  return ops;
}

// ============================================================================
// Whole-object deletes
// ============================================================================

export const ripngDeleteOps = {
  listItem: (kind: RipNgListKind, value: string): Op[] => [{ op: `delete_${LIST_OP[kind]}`, value: ripngText(value) }],
  interface: (name: string): Op[] => [{ op: "delete_interface", value: name }],
  redistribute: (protocol: string): Op[] => [{ op: "delete_redistribute", value: protocol }],
  interfaceFilter: (iface: string): Op[] => [{ op: "delete_distribute_list_interface", value: iface }],
  all: (): Op[] => [{ op: "delete_ripng" }],
};
