import type {
  Ospfv3Area,
  Ospfv3AreaRange,
  Ospfv3BatchOperation,
  Ospfv3Capabilities,
  Ospfv3Config,
  Ospfv3DefaultInformation,
  Ospfv3Distance,
  Ospfv3GracefulRestart,
  Ospfv3Interface,
  Ospfv3RangeKey,
  Ospfv3Redistribute,
} from "./ospfv3";

type Op = Ospfv3BatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read values through these.
// ============================================================================

export function ospfv3Text(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function ospfv3Num(value: Scalar): string | null {
  const text = ospfv3Text(value);
  return text === "" ? null : text;
}

/** Form text to a model number: null when blank, NaN when not a plain decimal. */
export function ospfv3Int(value: string): number | null {
  const text = value.trim();
  if (text === "") return null;
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(ops: Op[], setOp: string, deleteOp: string, target: string | undefined, before: Scalar, after: Scalar): void {
  const b = ospfv3Num(before);
  const a = ospfv3Num(after);
  if (a === b) return;
  if (a === null) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: withTarget(target, a) });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: boolean | null | undefined,
  after: boolean | null | undefined,
): void {
  if (!!before === !!after) return;
  const op = after ? setOp : deleteOp;
  ops.push(target === undefined ? { op } : { op, value: target });
}

function keyed<T>(items: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(ospfv3Text(key(item)), item);
  return map;
}

function anyValue(values: Scalar[]): boolean {
  return values.some((v) => ospfv3Num(v) !== null);
}

// ============================================================================
// Save checks. Bounds come from the builder RANGES served in capabilities.
// ============================================================================

export type Ospfv3ProblemKey =
  | "routerIdInvalid"
  | "referenceBandwidthRange"
  | "metricRange"
  | "distanceRange"
  | "gracePeriodRange"
  | "supportedGraceTimeRange"
  | "helperRouterIdInvalid"
  | "helperRouterIdDuplicate"
  | "areaIdRequired"
  | "areaIdInvalid"
  | "areaIdExists"
  | "rangePrefixInvalid"
  | "rangeDuplicate"
  | "interfaceRequired"
  | "interfaceAreaInvalid"
  | "costRange"
  | "priorityRange"
  | "helloIntervalRange"
  | "deadIntervalRange"
  | "retransmitIntervalRange"
  | "transmitDelayRange"
  | "ifmtuRange"
  | "instanceIdRange"
  | "protocolRequired";

/** A keyed error under ``validation``; min and max fill a range message. */
export interface Ospfv3Problem {
  key: Ospfv3ProblemKey;
  min?: number;
  max?: number;
}

/** Values for a ``validation.*`` message; a range key always has min and max. */
export function ospfv3ProblemArgs(problem: Ospfv3Problem): { min: string; max: string } {
  return { min: String(problem.min ?? ""), max: String(problem.max ?? "") };
}

type Caps = Pick<Ospfv3Capabilities, "ranges"> | null | undefined;

export function ospfv3Range(caps: Caps, key: Ospfv3RangeKey): { min: number; max: number } | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

/** A blank value passes; otherwise a plain decimal inside the served range. */
function rangeProblem(caps: Caps, key: Ospfv3RangeKey, problem: Ospfv3ProblemKey, value: Scalar): Ospfv3Problem | null {
  const text = ospfv3Num(value);
  if (text === null) return null;
  const range = ospfv3Range(caps, key);
  const n = Number(text);
  if (!/^\d+$/.test(text) || (range && (n < range.min || n > range.max))) {
    return { key: problem, min: range?.min, max: range?.max };
  }
  return null;
}

function first(...problems: (Ospfv3Problem | null)[]): Ospfv3Problem | null {
  return problems.find((p) => p !== null) ?? null;
}

/** Dotted IPv4 as Python ipaddress takes it: four 0-255 octets, no leading zeros. */
export function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((p) => /^(0|[1-9]\d{0,2})$/.test(p) && Number(p) <= 255);
}

/** The area ID problem with the served bounds, for the keyed message. */
function areaIdProblem(caps: Caps, key: "areaIdInvalid" | "interfaceAreaInvalid"): Ospfv3Problem {
  const range = ospfv3Range(caps, "area_id");
  return { key, min: range?.min, max: range?.max };
}

/** Area ID as the lab takes it: a decimal in range or an IPv4 address. */
function areaIdOk(caps: Caps, value: string): boolean {
  if (/^\d+$/.test(value)) {
    const range = ospfv3Range(caps, "area_id");
    return !range || (Number(value) >= range.min && Number(value) <= range.max);
  }
  return isIpv4(value);
}

/** The eight 16-bit groups of an IPv6 address, or null when it is malformed. */
function ipv6Groups(addr: string): number[] | null {
  if (!/^[0-9a-fA-F:]+$/.test(addr) || !addr.includes(":")) return null;
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string): string[] | null => {
    if (part === "") return [];
    const groups = part.split(":");
    return groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g)) ? groups : null;
  };
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  if (!head || !tail) return null;
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const zeros = Array<string>(8 - head.length - tail.length).fill("0");
  return [...head, ...zeros, ...tail].map((g) => parseInt(g, 16));
}

/**
 * IPv6 prefix as the lab takes it: a valid address, /0-128, and every bit
 * past the prefix length zero (2001:db8::1/48 is rejected).
 */
export function isIpv6Prefix(value: string): boolean {
  const match = /^([^/]+)\/(\d{1,3})$/.exec(value);
  if (!match) return false;
  const length = Number(match[2]);
  const groups = ipv6Groups(match[1]);
  if (!groups || length > 128) return false;
  return groups.every((group, i) => {
    const kept = Math.min(16, Math.max(0, length - i * 16));
    const hostMask = kept === 16 ? 0 : 0xffff >> kept;
    return (group & hostMask) === 0;
  });
}

// ============================================================================
// Global parameters (overview)
// ============================================================================

export interface Ospfv3ParametersDraft {
  router_id?: string | null;
  log_adjacency_changes: boolean;
  log_adjacency_changes_detail: boolean;
  auto_cost_reference_bandwidth?: number | null;
}

export function ospfv3ParametersProblem(draft: Ospfv3ParametersDraft, caps: Caps): Ospfv3Problem | null {
  const rid = ospfv3Text(draft.router_id);
  if (rid && !isIpv4(rid)) return { key: "routerIdInvalid" };
  return rangeProblem(caps, "reference_bandwidth", "referenceBandwidthRange", draft.auto_cost_reference_bandwidth);
}

export function ospfv3ParametersOps(original: Ospfv3Config, updated: Ospfv3ParametersDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_router_id", "delete_router_id", undefined, original.parameters?.router_id, updated.router_id);

  const logBefore = original.log_adjacency_changes === true;
  if (!updated.log_adjacency_changes) {
    if (logBefore) ops.push({ op: "delete_log_adjacency_changes" });
  } else {
    if (!logBefore) ops.push({ op: "set_log_adjacency_changes" });
    flag(ops, "set_log_adjacency_changes_detail", "delete_log_adjacency_changes_detail", undefined,
      logBefore && original.log_adjacency_changes_detail, updated.log_adjacency_changes_detail);
  }

  leaf(ops, "set_auto_cost_reference_bandwidth", "delete_auto_cost_reference_bandwidth", undefined,
    original.auto_cost_reference_bandwidth, updated.auto_cost_reference_bandwidth);
  return ops;
}

// ============================================================================
// Default information originate
// ============================================================================

export function ospfv3DefaultInformationProblem(updated: Ospfv3DefaultInformation, caps: Caps): Ospfv3Problem | null {
  if (!updated.enabled) return null;
  return rangeProblem(caps, "metric", "metricRange", updated.metric);
}

export function ospfv3DefaultInformationOps(original: Ospfv3DefaultInformation, updated: Ospfv3DefaultInformation): Op[] {
  const ops: Op[] = [];
  if (!updated.enabled) {
    if (original.enabled) ops.push({ op: "delete_default_information_originate" });
    return ops;
  }
  const kept = original.enabled ? original : null;
  if (!kept) ops.push({ op: "set_default_information_originate" });
  flag(ops, "set_default_information_originate_always", "delete_default_information_originate_always", undefined,
    kept?.always, updated.always);
  leaf(ops, "set_default_information_originate_metric", "delete_default_information_originate_metric", undefined,
    kept?.metric, updated.metric);
  leaf(ops, "set_default_information_originate_metric_type", "delete_default_information_originate_metric_type",
    undefined, kept?.metric_type, updated.metric_type);
  leaf(ops, "set_default_information_originate_route_map", "delete_default_information_originate_route_map",
    undefined, kept?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Advanced: distance and graceful restart
// ============================================================================

const DISTANCE_FIELDS = ["external", "inter_area", "intra_area"] as const;

export function ospfv3DistanceProblem(updated: Ospfv3Distance, caps: Caps): Ospfv3Problem | null {
  return first(
    rangeProblem(caps, "distance", "distanceRange", updated.global_value),
    ...DISTANCE_FIELDS.map((f) => rangeProblem(caps, "distance", "distanceRange", updated.ospfv3[f])),
  );
}

export function ospfv3DistanceOps(original: Ospfv3Distance, updated: Ospfv3Distance): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_distance_global", "delete_distance_global", undefined, original.global_value, updated.global_value);
  if (!anyValue(DISTANCE_FIELDS.map((f) => updated.ospfv3[f]))) {
    if (anyValue(DISTANCE_FIELDS.map((f) => original.ospfv3?.[f]))) ops.push({ op: "delete_distance_ospfv3" });
    return ops;
  }
  for (const f of DISTANCE_FIELDS) {
    leaf(ops, `set_distance_ospfv3_${f}`, `delete_distance_ospfv3_${f}`, undefined,
      original.ospfv3?.[f], updated.ospfv3[f]);
  }
  return ops;
}

export function ospfv3GracefulRestartProblem(updated: Ospfv3GracefulRestart, caps: Caps): Ospfv3Problem | null {
  if (!updated.enabled) return null;
  const ids = updated.helper.enable ? (updated.helper.router_ids || []).map(ospfv3Text) : [];
  if (ids.some((id) => !isIpv4(id))) return { key: "helperRouterIdInvalid" };
  if (new Set(ids).size !== ids.length) return { key: "helperRouterIdDuplicate" };
  return first(
    rangeProblem(caps, "grace_period", "gracePeriodRange", updated.grace_period),
    rangeProblem(caps, "supported_grace_time", "supportedGraceTimeRange", updated.helper.supported_grace_time),
  );
}

/**
 * Fold a typed-but-not-added helper router ID into the list. A blank draft
 * leaves the list as is; a bad or duplicate ID returns the keyed problem.
 */
export function ospfv3RouterIdsWithDraft(
  ids: string[],
  draft: string,
): { ids: string[]; problem: Ospfv3Problem | null } {
  const id = draft.trim();
  if (!id) return { ids, problem: null };
  if (!isIpv4(id)) return { ids, problem: { key: "helperRouterIdInvalid" } };
  if (ids.includes(id)) return { ids, problem: { key: "helperRouterIdDuplicate" } };
  return { ids: [...ids, id], problem: null };
}

export function ospfv3GracefulRestartOps(original: Ospfv3GracefulRestart, updated: Ospfv3GracefulRestart): Op[] {
  const ops: Op[] = [];
  if (!updated.enabled) {
    if (original.enabled) ops.push({ op: "delete_graceful_restart" });
    return ops;
  }
  const kept = original.enabled ? original : null;
  if (!kept) ops.push({ op: "set_graceful_restart" });
  leaf(ops, "set_graceful_restart_grace_period", "delete_graceful_restart_grace_period", undefined,
    kept?.grace_period, updated.grace_period);

  const h = updated.helper;
  const hb = kept?.helper;
  const helperSet = (x: Ospfv3GracefulRestart["helper"] | undefined) =>
    !!x && (x.enable || x.lsa_check_disable || x.planned_only || ospfv3Num(x.supported_grace_time) !== null);
  if (!helperSet(h)) {
    if (helperSet(hb)) ops.push({ op: "delete_graceful_restart_helper" });
    return ops;
  }
  if (!h.enable) {
    if (hb?.enable) ops.push({ op: "delete_graceful_restart_helper_enable" });
  } else {
    if (!hb?.enable) ops.push({ op: "set_graceful_restart_helper_enable" });
    const ridsBefore = new Set(hb?.enable ? (hb.router_ids || []).map(ospfv3Text) : []);
    const ridsAfter = new Set((h.router_ids || []).map(ospfv3Text));
    for (const rid of ridsBefore) {
      if (!ridsAfter.has(rid)) ops.push({ op: "delete_graceful_restart_helper_enable_router_id", value: rid });
    }
    for (const rid of ridsAfter) {
      if (!ridsBefore.has(rid)) ops.push({ op: "set_graceful_restart_helper_enable_router_id", value: rid });
    }
  }
  flag(ops, "set_graceful_restart_helper_lsa_check_disable", "delete_graceful_restart_helper_lsa_check_disable",
    undefined, hb?.lsa_check_disable, h.lsa_check_disable);
  flag(ops, "set_graceful_restart_helper_planned_only", "delete_graceful_restart_helper_planned_only", undefined,
    hb?.planned_only, h.planned_only);
  leaf(ops, "set_graceful_restart_helper_supported_grace_time", "delete_graceful_restart_helper_supported_grace_time",
    undefined, hb?.supported_grace_time, h.supported_grace_time);
  return ops;
}

// ============================================================================
// Areas and ranges
// ============================================================================

/** Range mode: the lab has advertise and not-advertise as separate leaves; the screen picks one. */
export type Ospfv3RangeMode = "" | "advertise" | "not-advertise";

export function ospfv3RangeMode(range: Pick<Ospfv3AreaRange, "advertise" | "not_advertise">): Ospfv3RangeMode {
  if (range.not_advertise) return "not-advertise";
  if (range.advertise) return "advertise";
  return "";
}

export function ospfv3AreaProblem(
  updated: Ospfv3Area,
  caps: Caps,
  opts: { existingIds?: string[] } = {},
): Ospfv3Problem | null {
  const id = ospfv3Text(updated.area_id);
  if (!id) return { key: "areaIdRequired" };
  if (!areaIdOk(caps, id)) return areaIdProblem(caps, "areaIdInvalid");
  if (opts.existingIds?.includes(id)) return { key: "areaIdExists" };
  const seen = new Set<string>();
  for (const range of updated.ranges) {
    const prefix = ospfv3Text(range.prefix);
    if (!isIpv6Prefix(prefix)) return { key: "rangePrefixInvalid" };
    if (seen.has(prefix)) return { key: "rangeDuplicate" };
    seen.add(prefix);
  }
  return null;
}

function rangeOps(ops: Op[], id: string, original: Ospfv3AreaRange | null, updated: Ospfv3AreaRange): void {
  const target = `${id},${ospfv3Text(updated.prefix)}`;
  if (!original) ops.push({ op: "set_area_range", value: target });
  // Clear the old mode before setting the new one.
  if (original?.advertise && !updated.advertise) ops.push({ op: "delete_area_range_advertise", value: target });
  if (original?.not_advertise && !updated.not_advertise) {
    ops.push({ op: "delete_area_range_not_advertise", value: target });
  }
  if (updated.advertise && !original?.advertise) ops.push({ op: "set_area_range_advertise", value: target });
  if (updated.not_advertise && !original?.not_advertise) {
    ops.push({ op: "set_area_range_not_advertise", value: target });
  }
}

/**
 * Fold a typed-but-not-added range into the list. A blank draft leaves the
 * list as is; a bad or duplicate prefix returns the keyed problem instead.
 */
export function ospfv3RangesWithDraft(
  ranges: Ospfv3AreaRange[],
  draft: string,
  mode: Ospfv3RangeMode,
): { ranges: Ospfv3AreaRange[]; problem: Ospfv3Problem | null } {
  const prefix = draft.trim();
  if (!prefix) return { ranges, problem: null };
  if (!isIpv6Prefix(prefix)) return { ranges, problem: { key: "rangePrefixInvalid" } };
  if (ranges.some((r) => ospfv3Text(r.prefix) === prefix)) return { ranges, problem: { key: "rangeDuplicate" } };
  return {
    ranges: [...ranges, { prefix, advertise: mode === "advertise", not_advertise: mode === "not-advertise" }],
    problem: null,
  };
}

/**
 * Ops for one area. An area-type change deletes the old type first (the lab
 * allows one area-type per area); "normal" is no area-type at all.
 */
export function ospfv3AreaOps(original: Ospfv3Area | null, updated: Ospfv3Area): Op[] {
  const ops: Op[] = [];
  const id = ospfv3Text(original?.area_id ?? updated.area_id);
  // An area named only by `interface <if> area` has no area node yet.
  if (!original || original.configured === false) ops.push({ op: "set_area", value: id });

  const typeBefore = ospfv3Text(original?.area_type);
  const typeAfter = ospfv3Text(updated.area_type);
  const kept = typeBefore === typeAfter ? original : null;
  if (typeBefore !== typeAfter) {
    if (typeBefore) ops.push({ op: "delete_area_type", value: id });
    if (typeAfter) ops.push({ op: `set_area_type_${typeAfter}`, value: id });
  }
  if (typeAfter === "stub" || typeAfter === "nssa") {
    flag(ops, `set_area_type_${typeAfter}_no_summary`, `delete_area_type_${typeAfter}_no_summary`, id,
      kept?.area_type_no_summary, updated.area_type_no_summary);
  }
  if (typeAfter === "nssa") {
    flag(ops, "set_area_type_nssa_default_information_originate", "delete_area_type_nssa_default_information_originate",
      id, kept?.nssa_default_information_originate, updated.nssa_default_information_originate);
  }

  const rangesBefore = keyed(original?.ranges || [], (r) => r.prefix);
  const rangesAfter = keyed(updated.ranges, (r) => r.prefix);
  for (const prefix of rangesBefore.keys()) {
    if (!rangesAfter.has(prefix)) ops.push({ op: "delete_area_range", value: `${id},${prefix}` });
  }
  for (const [prefix, range] of rangesAfter) rangeOps(ops, id, rangesBefore.get(prefix) ?? null, range);

  leaf(ops, "set_area_export_list", "delete_area_export_list", id, original?.export_list, updated.export_list);
  leaf(ops, "set_area_import_list", "delete_area_import_list", id, original?.import_list, updated.import_list);
  return ops;
}

// ============================================================================
// Interfaces
// ============================================================================

const INTERFACE_LEAVES: [keyof Ospfv3Interface, string][] = [
  ["area", "area"],
  ["cost", "cost"],
  ["priority", "priority"],
  ["hello_interval", "hello_interval"],
  ["dead_interval", "dead_interval"],
  ["retransmit_interval", "retransmit_interval"],
  ["transmit_delay", "transmit_delay"],
  ["network", "network"],
  ["ifmtu", "ifmtu"],
  ["instance_id", "instance_id"],
];

const INTERFACE_RANGES: [keyof Ospfv3Interface, Ospfv3RangeKey, Ospfv3ProblemKey][] = [
  ["cost", "cost", "costRange"],
  ["priority", "priority", "priorityRange"],
  ["hello_interval", "hello_interval", "helloIntervalRange"],
  ["dead_interval", "dead_interval", "deadIntervalRange"],
  ["retransmit_interval", "retransmit_interval", "retransmitIntervalRange"],
  ["transmit_delay", "transmit_delay", "transmitDelayRange"],
  ["ifmtu", "ifmtu", "ifmtuRange"],
  ["instance_id", "instance_id", "instanceIdRange"],
];

export function ospfv3InterfaceProblem(updated: Ospfv3Interface, caps: Caps): Ospfv3Problem | null {
  if (!ospfv3Text(updated.name)) return { key: "interfaceRequired" };
  const area = ospfv3Text(updated.area);
  if (area && !areaIdOk(caps, area)) return areaIdProblem(caps, "interfaceAreaInvalid");
  return first(...INTERFACE_RANGES.map(([field, key, problem]) =>
    rangeProblem(caps, key, problem, updated[field] as Scalar)));
}

export function ospfv3InterfaceOps(original: Ospfv3Interface | null, updated: Ospfv3Interface): Op[] {
  const ops: Op[] = [];
  const name = ospfv3Text(original?.name ?? updated.name);
  if (!original) ops.push({ op: "set_interface", value: name });
  for (const [field, op] of INTERFACE_LEAVES) {
    leaf(ops, `set_interface_${op}`, `delete_interface_${op}`, name,
      original?.[field] as Scalar, updated[field] as Scalar);
  }
  flag(ops, "set_interface_passive", "delete_interface_passive", name, original?.passive, updated.passive);
  if (!updated.bfd) {
    if (original?.bfd) ops.push({ op: "delete_interface_bfd", value: name });
  } else {
    if (!original?.bfd) ops.push({ op: "set_interface_bfd", value: name });
    leaf(ops, "set_interface_bfd_profile", "delete_interface_bfd_profile", name,
      original?.bfd ? original.bfd_profile : null, updated.bfd_profile);
  }
  flag(ops, "set_interface_mtu_ignore", "delete_interface_mtu_ignore", name, original?.mtu_ignore, updated.mtu_ignore);
  return ops;
}

// ============================================================================
// Redistribute
// ============================================================================

export function ospfv3RedistributeProblem(updated: Ospfv3Redistribute, caps: Caps): Ospfv3Problem | null {
  if (!ospfv3Text(updated.protocol)) return { key: "protocolRequired" };
  return rangeProblem(caps, "metric", "metricRange", updated.metric);
}

export function ospfv3RedistributeOps(original: Ospfv3Redistribute | null, updated: Ospfv3Redistribute): Op[] {
  const ops: Op[] = [];
  const target = ospfv3Text(updated.protocol);
  if (!original) ops.push({ op: "set_redistribute", value: target });
  leaf(ops, "set_redistribute_metric", "delete_redistribute_metric", target, original?.metric, updated.metric);
  leaf(ops, "set_redistribute_metric_type", "delete_redistribute_metric_type", target,
    original?.metric_type, updated.metric_type);
  leaf(ops, "set_redistribute_route_map", "delete_redistribute_route_map", target,
    original?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Whole-object deletes
// ============================================================================

export const ospfv3DeleteOps = {
  area: (areaId: string): Op[] => [{ op: "delete_area", value: areaId }],
  interface: (name: string): Op[] => [{ op: "delete_interface", value: name }],
  redistribute: (protocol: string): Op[] => [{ op: "delete_redistribute", value: protocol }],
  all: (): Op[] => [{ op: "delete_ospfv3" }],
};
