/**
 * Batch ops and save checks for the failover route screen. The create and
 * edit dialogs share one form; a create diffs it against nothing, an edit
 * against the loaded route. A changed leaf is set, a cleared leaf is deleted,
 * an untouched leaf emits nothing. Next-hops diff by address, DHCP interfaces
 * by name and check targets by address, so an edit never deletes and re-sets
 * an object. The save check and the emit read every value through the same
 * normalizer.
 *
 * The router binds the destination from the request; `value` fills the op's
 * remaining parameters, `,`-joined (`NH`, `NH,VALUE`, `NH,TARGET,VALUE`).
 *
 * Never emitted (the lab refuses them on their own, kept as builder ops):
 * `delete_next_hop_interface` (a next-hop requires `interface`; the screen
 * changes it with a set), `delete_next_hop_check_target_all` and
 * `delete_dhcp_interface_check_target_all` (every check needs a target; the
 * screen removes targets one by one by address).
 */
import type { FailoverBatchOperation, FailoverCapabilities, FailoverRoute } from "./failover";
import { isValidIPv4 } from "../validators/firewall";
import { isIPv4Prefix } from "../validators/ipv4-prefix";

// ============================================================================
// Lab defaults (an unset leaf behaves as these)
// ============================================================================

/** `check policy` when unset. */
export const DEFAULT_CHECK_POLICY = "any-available";
/** `check type` when unset. */
export const DEFAULT_CHECK_TYPE = "icmp";

// ============================================================================
// Form (what the dialog edits)
// ============================================================================

export interface FailoverTargetRow {
  address: string;
  interface: string;
  vrf: string;
}

export interface FailoverCheckForm {
  policy: string;
  type: string;
  port: string;
  timeout: string;
  targets: FailoverTargetRow[];
}

export interface FailoverNextHopRow {
  address: string;
  interface: string;
  metric: string;
  onlink: boolean;
  check: FailoverCheckForm;
}

export interface FailoverDhcpRow {
  name: string;
  interface: string;
  metric: string;
  onlink: boolean;
  check: FailoverCheckForm;
}

export interface FailoverForm {
  destination: string;
  next_hops: FailoverNextHopRow[];
  dhcp_interfaces: FailoverDhcpRow[];
}

type Caps = FailoverCapabilities | null | undefined;

/** Leaves the screen offers only when the device has them (1.5-only). */
export type FailoverVersionedFeature = "dhcp_interface" | "check_target_interface" | "check_target_vrf";

export function failoverSupports(caps: Caps, flag: FailoverVersionedFeature): boolean {
  return caps?.features?.[flag]?.supported === true;
}

/** The check type the device applies: the set value, or the lab default. */
export function failoverEffectiveCheckType(type: string | null | undefined): string {
  return (type ?? "").trim() || DEFAULT_CHECK_TYPE;
}

export function emptyTargetRow(): FailoverTargetRow {
  return { address: "", interface: "", vrf: "" };
}

function emptyCheck(): FailoverCheckForm {
  return { policy: "", type: "", port: "", timeout: "", targets: [] };
}

export function emptyNextHopRow(): FailoverNextHopRow {
  return { address: "", interface: "", metric: "", onlink: false, check: emptyCheck() };
}

export function emptyDhcpRow(): FailoverDhcpRow {
  return { name: "", interface: "", metric: "", onlink: false, check: emptyCheck() };
}

const s = (value: string | number | null | undefined): string => (value == null ? "" : String(value));

function checkForm(check: FailoverRoute["next_hops"][number]["check"] | undefined): FailoverCheckForm {
  return {
    policy: s(check?.policy),
    type: s(check?.type),
    port: s(check?.port),
    timeout: s(check?.timeout),
    targets: (check?.targets ?? []).map((t) => ({
      address: t.address,
      interface: s(t.interface),
      vrf: s(t.vrf),
    })),
  };
}

/** The dialog's starting form: the loaded route, or a new one with one empty next-hop. */
export function failoverForm(existing: FailoverRoute | null): FailoverForm {
  if (!existing) {
    return { destination: "", next_hops: [emptyNextHopRow()], dhcp_interfaces: [] };
  }
  return {
    destination: existing.destination,
    next_hops: existing.next_hops.map((nh) => ({
      address: nh.address,
      interface: s(nh.interface),
      metric: s(nh.metric),
      onlink: nh.onlink,
      check: checkForm(nh.check),
    })),
    dhcp_interfaces: existing.dhcp_interfaces.map((d) => ({
      name: d.name,
      interface: s(d.interface),
      metric: s(d.metric),
      onlink: d.onlink,
      check: checkForm(d.check),
    })),
  };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

interface NormTarget {
  /** Position of the row in the form (what the screen numbers). */
  index: number;
  address: string;
  interface: string;
  vrf: string;
}

interface NormCheck {
  policy: string;
  type: string;
  port: string;
  timeout: string;
  targets: NormTarget[];
}

interface NormGateway {
  index: number;
  /** Next-hop address or DHCP interface name. */
  key: string;
  interface: string;
  metric: string;
  onlink: boolean;
  check: NormCheck;
}

interface Norm {
  destination: string;
  nextHops: NormGateway[];
  dhcps: NormGateway[];
}

function normCheck(check: FailoverCheckForm, caps: Caps): NormCheck {
  const withInterface = failoverSupports(caps, "check_target_interface");
  const withVrf = failoverSupports(caps, "check_target_vrf");
  return {
    policy: text(check.policy),
    type: text(check.type),
    port: text(check.port),
    timeout: text(check.timeout),
    targets: check.targets
      .map((t, index) => ({
        index,
        address: text(t.address),
        // A 1.5-only leaf the device lacks is never read or sent.
        interface: withInterface ? text(t.interface) : "",
        vrf: withVrf ? text(t.vrf) : "",
      }))
      // A target row the user added and never filled is dropped.
      .filter((t) => t.address || t.interface || t.vrf),
  };
}

function normGateway(
  index: number,
  key: string,
  row: { interface: string; metric: string; onlink: boolean; check: FailoverCheckForm },
  caps: Caps,
): NormGateway {
  return {
    index,
    key: text(key),
    interface: text(row.interface),
    metric: text(row.metric),
    onlink: row.onlink,
    check: normCheck(row.check, caps),
  };
}

/** A row the user added and never filled. */
function blank(g: NormGateway): boolean {
  const c = g.check;
  return (
    !g.key && !g.interface && !g.metric && !g.onlink &&
    !c.policy && !c.type && !c.port && !c.timeout && c.targets.length === 0
  );
}

function normalize(form: FailoverForm, caps: Caps): Norm {
  return {
    destination: text(form.destination),
    nextHops: form.next_hops.map((nh, i) => normGateway(i, nh.address, nh, caps)).filter((g) => !blank(g)),
    // DHCP interfaces are 1.5-only; never read or sent when the device lacks them.
    dhcps: failoverSupports(caps, "dhcp_interface")
      ? form.dhcp_interfaces.map((d, i) => normGateway(i, d.name, d, caps)).filter((g) => !blank(g))
      : [],
  };
}

function byKey<T extends { key: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) if (row.key && !map.has(row.key)) map.set(row.key, row);
  return map;
}

function byAddress(rows: NormTarget[]): Map<string, NormTarget> {
  const map = new Map<string, NormTarget>();
  for (const row of rows) if (row.address && !map.has(row.address)) map.set(row.address, row);
  return map;
}

// ============================================================================
// Save check
// ============================================================================

export type FailoverProblemKey =
  | "destinationRequired"
  | "destinationInvalid"
  | "destinationExists"
  | "nextHopRequired"
  | "nextHopOrDhcpRequired"
  | "nextHopAddressMissing"
  | "nextHopAddressInvalid"
  | "nextHopDuplicate"
  | "nextHopInterfaceRequired"
  | "dhcpNameMissing"
  | "dhcpDuplicate"
  | "metricRange"
  | "portRange"
  | "timeoutRange"
  | "tcpPortRequired"
  | "targetRequired"
  | "targetAddressMissing"
  | "targetAddressInvalid"
  | "targetDuplicate"
  | "tcpTargetInterface"
  | "arpTargetVrf";

export interface FailoverProblem {
  key: FailoverProblemKey;
  values?: Record<string, string | number>;
}

export interface FailoverSaveContext {
  /** Destinations already configured (checked on create). */
  destinations: string[];
}

interface Range {
  min: number;
  max: number;
}

/** Digits only, then the capability range (`parseInt` would take `1.5` as 1). */
function inRange(value: string, range: Range): boolean {
  if (!/^\d{1,6}$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

function range(caps: Caps, leaf: "metric" | "check_port" | "check_timeout"): Range {
  const r = caps?.features?.[leaf];
  return { min: r?.min ?? 1, max: r?.max ?? 0 };
}

function gatewayProblem(g: NormGateway, caps: Caps): FailoverProblem | null {
  const name = g.key;
  const metric = range(caps, "metric");
  if (g.metric && !inRange(g.metric, metric)) return { key: "metricRange", values: { name, ...metric } };
  const c = g.check;
  const port = range(caps, "check_port");
  if (c.port && !inRange(c.port, port)) return { key: "portRange", values: { name, ...port } };
  const timeout = range(caps, "check_timeout");
  if (c.timeout && !inRange(c.timeout, timeout)) return { key: "timeoutRange", values: { name, ...timeout } };
  const type = failoverEffectiveCheckType(c.type);
  if (type === "tcp" && !c.port) return { key: "tcpPortRequired", values: { name } };
  if (c.targets.length === 0) return { key: "targetRequired", values: { name } };
  const seen = new Set<string>();
  for (const t of c.targets) {
    if (!t.address) return { key: "targetAddressMissing", values: { name, n: t.index + 1 } };
    if (!isValidIPv4(t.address)) return { key: "targetAddressInvalid", values: { name, address: t.address } };
    if (seen.has(t.address)) return { key: "targetDuplicate", values: { name, address: t.address } };
    seen.add(t.address);
    if (type === "tcp" && t.interface) return { key: "tcpTargetInterface", values: { name, address: t.address } };
    if (type === "arp" && t.vrf) return { key: "arpTargetVrf", values: { name, address: t.address } };
  }
  return null;
}

/**
 * First reason the device would refuse this save, or null. `original` is the
 * loaded route on edit and null on create.
 */
export function failoverProblem(
  original: FailoverRoute | null,
  form: FailoverForm,
  caps: Caps,
  context: FailoverSaveContext = { destinations: [] },
): FailoverProblem | null {
  const n = normalize(form, caps);
  const destination = original ? original.destination : n.destination;
  if (!original) {
    if (!destination) return { key: "destinationRequired" };
    if (!isIPv4Prefix(destination)) return { key: "destinationInvalid", values: { destination } };
    if (context.destinations.some((d) => d.trim() === destination)) {
      return { key: "destinationExists", values: { destination } };
    }
  }

  const nextHops = new Set<string>();
  for (const nh of n.nextHops) {
    if (!nh.key) return { key: "nextHopAddressMissing", values: { n: nh.index + 1 } };
    if (!isValidIPv4(nh.key)) return { key: "nextHopAddressInvalid", values: { address: nh.key } };
    if (nextHops.has(nh.key)) return { key: "nextHopDuplicate", values: { address: nh.key } };
    nextHops.add(nh.key);
    if (!nh.interface) return { key: "nextHopInterfaceRequired", values: { address: nh.key } };
    const issue = gatewayProblem(nh, caps);
    if (issue) return issue;
  }

  const dhcps = new Set<string>();
  for (const d of n.dhcps) {
    if (!d.key) return { key: "dhcpNameMissing", values: { n: d.index + 1 } };
    if (dhcps.has(d.key)) return { key: "dhcpDuplicate", values: { name: d.key } };
    dhcps.add(d.key);
    const issue = gatewayProblem(d, caps);
    if (issue) return issue;
  }

  if (n.nextHops.length === 0 && n.dhcps.length === 0) {
    return failoverSupports(caps, "dhcp_interface")
      ? { key: "nextHopOrDhcpRequired", values: { destination } }
      : { key: "nextHopRequired", values: { destination } };
  }
  return null;
}

// ============================================================================
// Emit
// ============================================================================

type Kind = "next_hop" | "dhcp_interface";

/** One op; `parts` become the `,`-joined value (none for a destination-only op). */
function op(name: string, ...parts: string[]): FailoverBatchOperation {
  return parts.length ? { op: name, value: parts.join(",") } : { op: name };
}

/** Single-value leaf: set when changed, delete when cleared. */
function leaf(
  ops: FailoverBatchOperation[],
  setOp: string,
  deleteOp: string,
  owner: string[],
  before: string,
  after: string,
): void {
  if (before === after) return;
  ops.push(after ? op(setOp, ...owner, after) : op(deleteOp, ...owner));
}

/** Valueless leaf: set when turned on, delete when turned off. */
function flag(ops: FailoverBatchOperation[], setOp: string, deleteOp: string, owner: string[], before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push(op(after ? setOp : deleteOp, ...owner));
}

function targetCreateOps(ops: FailoverBatchOperation[], kind: Kind, key: string, t: NormTarget): void {
  ops.push(op(`set_${kind}_check_target`, key, t.address));
  if (t.interface) ops.push(op(`set_${kind}_check_target_interface`, key, t.address, t.interface));
  if (t.vrf) ops.push(op(`set_${kind}_check_target_vrf`, key, t.address, t.vrf));
}

const EMPTY_GATEWAY: Omit<NormGateway, "index" | "key"> = {
  interface: "",
  metric: "",
  onlink: false,
  check: { policy: "", type: "", port: "", timeout: "", targets: [] },
};

/**
 * Ops that take `before` (null for a new next-hop or DHCP interface) to
 * `after`. A next-hop's `interface` is required by the lab, so it only ever
 * changes with a set; the save check refuses a cleared one.
 */
function gatewayOps(kind: Kind, before: NormGateway | null, after: NormGateway): FailoverBatchOperation[] {
  const ops: FailoverBatchOperation[] = [];
  const key = after.key;
  const owner = [key];
  const b = before ?? { ...EMPTY_GATEWAY, index: after.index, key };
  if (!before) ops.push(op(`set_${kind}`, key));

  if (kind === "next_hop") {
    if (after.interface && after.interface !== b.interface) ops.push(op("set_next_hop_interface", key, after.interface));
  } else {
    leaf(ops, "set_dhcp_interface_interface", "delete_dhcp_interface_interface", owner, b.interface, after.interface);
  }
  leaf(ops, `set_${kind}_metric`, `delete_${kind}_metric`, owner, b.metric, after.metric);
  flag(ops, `set_${kind}_onlink`, `delete_${kind}_onlink`, owner, b.onlink, after.onlink);
  for (const name of ["policy", "type", "port", "timeout"] as const) {
    leaf(ops, `set_${kind}_check_${name}`, `delete_${kind}_check_${name}`, owner, b.check[name], after.check[name]);
  }

  const oldTargets = byAddress(b.check.targets);
  const newTargets = byAddress(after.check.targets);
  for (const address of oldTargets.keys()) {
    if (!newTargets.has(address)) ops.push(op(`delete_${kind}_check_target`, key, address));
  }
  for (const [address, t] of newTargets) {
    const old = oldTargets.get(address);
    if (!old) {
      targetCreateOps(ops, kind, key, t);
      continue;
    }
    const target = [key, address];
    leaf(ops, `set_${kind}_check_target_interface`, `delete_${kind}_check_target_interface`, target, old.interface, t.interface);
    leaf(ops, `set_${kind}_check_target_vrf`, `delete_${kind}_check_target_vrf`, target, old.vrf, t.vrf);
  }
  return ops;
}

function gatewaysOps(kind: Kind, before: NormGateway[], after: NormGateway[]): FailoverBatchOperation[] {
  const ops: FailoverBatchOperation[] = [];
  const oldMap = byKey(before);
  const newMap = byKey(after);
  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) ops.push(op(`delete_${kind}`, key));
  }
  for (const [key, g] of newMap) ops.push(...gatewayOps(kind, oldMap.get(key) ?? null, g));
  return ops;
}

/** Every op that creates the route in the form. */
export function createRouteOps(form: FailoverForm, caps: Caps): FailoverBatchOperation[] {
  const n = normalize(form, caps);
  return [
    op("set_route"),
    ...gatewaysOps("next_hop", [], n.nextHops),
    ...gatewaysOps("dhcp_interface", [], n.dhcps),
  ];
}

/** Only the ops that take the loaded route to the form; none when nothing changed. */
export function updateRouteOps(original: FailoverRoute, form: FailoverForm, caps: Caps): FailoverBatchOperation[] {
  const before = normalize(failoverForm(original), caps);
  const after = normalize(form, caps);
  return [
    ...gatewaysOps("next_hop", before.nextHops, after.nextHops),
    ...gatewaysOps("dhcp_interface", before.dhcps, after.dhcps),
  ];
}

/** Remove the whole route. */
export function deleteRouteOps(): FailoverBatchOperation[] {
  return [op("delete_route")];
}
