import type {
  AdminGroup,
  TeBatchOperation,
  TeInterface,
  TrafficEngineeringCapabilities,
} from "./traffic-engineering";
import { inRange } from "./rip-ranges";

// ============================================================================
// Form fields. Every value the save check and the emit read goes through
// teText / teNumber, so a padded value is checked and sent the same way.
// ============================================================================

export type TeRangeKey = "bit_position" | "max_bandwidth" | "max_reservable_bandwidth" | "metric";
export type TeInterfaceNumberKey = "max_bandwidth" | "max_reservable_bandwidth" | "metric";

export const TE_INTERFACE_NUMBER_KEYS: readonly TeInterfaceNumberKey[] = [
  "max_bandwidth",
  "max_reservable_bandwidth",
  "metric",
];

export interface AdminGroupFields {
  name: string;
  bitPosition: string;
}

export interface TeInterfaceFields extends Record<TeInterfaceNumberKey, string> {
  name: string;
  adminGroups: string[];
}

type Caps = Pick<TrafficEngineeringCapabilities, "ranges"> | null | undefined;

export type TeProblem =
  | { key: "nameRequired" }
  | { key: "nameInvalid" }
  | { key: "groupExists"; name: string }
  | { key: "bitRequired" }
  | { key: "bitTaken"; name: string }
  | { key: "interfaceRequired" }
  | { key: "interfaceExists"; name: string }
  | { key: "numberInvalid"; field: TeRangeKey }
  | { key: "range"; field: TeRangeKey; min: number; max: number };

/** A value as the check and the emit read it: trimmed, "" when unset. */
export function teText(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/** A number as the emit sends it: leading zeros dropped, so "07" and "7" are one bit. */
function teNumber(value: string | number | null | undefined): string {
  const text = teText(value);
  return /^\d{1,10}$/.test(text) ? String(Number(text)) : text;
}

function groupList(names: readonly string[]): string[] {
  return [...new Set(names.map(teText).filter(Boolean))];
}

export function adminGroupFields(group: AdminGroup | null | undefined): AdminGroupFields {
  return { name: teText(group?.name), bitPosition: teText(group?.bit_position) };
}

export function teInterfaceFields(iface: TeInterface | null | undefined): TeInterfaceFields {
  return {
    name: teText(iface?.name),
    adminGroups: groupList(iface?.admin_groups ?? []),
    max_bandwidth: teText(iface?.max_bandwidth),
    max_reservable_bandwidth: teText(iface?.max_reservable_bandwidth),
    metric: teText(iface?.metric),
  };
}

// ============================================================================
// Save checks: what the lab commit would reject (proven on 1.5)
// ============================================================================

export function teRange(caps: Caps, key: TeRangeKey): { min: number; max: number } | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

function rangeProblem(caps: Caps, field: TeRangeKey, value: string): TeProblem | null {
  if (!value) return null;
  if (!/^\d{1,10}$/.test(value)) return { key: "numberInvalid", field };
  const range = teRange(caps, field);
  return !range || inRange(value, range) ? null : { key: "range", field, min: range.min, max: range.max };
}

/**
 * An admin-group save the lab would reject: the name is `[-a-zA-Z0-9]+`,
 * every group needs a bit position, and no two groups share one.
 */
export function adminGroupProblem(
  fields: AdminGroupFields,
  original: AdminGroup | null,
  groups: AdminGroup[],
  caps: Caps,
): TeProblem | null {
  const name = original ? original.name : teText(fields.name);
  if (!original) {
    if (!name) return { key: "nameRequired" };
    if (!/^[-a-zA-Z0-9]+$/.test(name)) return { key: "nameInvalid" };
    if (groups.some((g) => g.name === name)) return { key: "groupExists", name };
  }
  const bit = teText(fields.bitPosition);
  if (!bit) return { key: "bitRequired" };
  const range = rangeProblem(caps, "bit_position", bit);
  if (range) return range;
  const taken = groups.find((g) => g.name !== name && g.bit_position != null && g.bit_position === Number(bit));
  if (taken) return { key: "bitTaken", name: taken.name };
  return null;
}

/** An interface save the lab would reject: a configured interface again, or an out-of-range number. */
export function teInterfaceProblem(
  fields: TeInterfaceFields,
  original: TeInterface | null,
  interfaces: TeInterface[],
  caps: Caps,
): TeProblem | null {
  if (!original) {
    const name = teText(fields.name);
    if (!name) return { key: "interfaceRequired" };
    if (interfaces.some((i) => i.name === name)) return { key: "interfaceExists", name };
  }
  for (const key of TE_INTERFACE_NUMBER_KEYS) {
    const problem = rangeProblem(caps, key, teText(fields[key]));
    if (problem) return problem;
  }
  return null;
}

// ============================================================================
// Emit
// ============================================================================

/** Optional value leaf: a set replaces it, a cleared field deletes it. */
function leaf(ops: TeBatchOperation[], op: string, name: string, before: string, after: string): void {
  if (after === before) return;
  if (after) ops.push({ op: `set_${op}`, value: `${name},${after}` });
  else ops.push({ op: `delete_${op}`, value: name });
}

/**
 * Ops that turn the loaded group (null on create) into the edited one. The
 * name is fixed once the group exists, and bit-position is required, so an
 * edit only ever replaces it with a set.
 */
export function adminGroupOps(original: AdminGroup | null, fields: AdminGroupFields): TeBatchOperation[] {
  const name = original ? original.name : teText(fields.name);
  const ops: TeBatchOperation[] = [];
  if (!original) ops.push({ op: "set_admin_group", value: name });
  const bit = teNumber(fields.bitPosition);
  if (bit && bit !== teNumber(original?.bit_position)) {
    ops.push({ op: "set_admin_group_bit_position", value: `${name},${bit}` });
  }
  return ops;
}

/**
 * Ops that turn the loaded interface (null on create) into the edited one, in
 * one batch: added and removed admin groups by value, each number leaf set or
 * deleted on its own. The bare interface node commits, so create sets it first.
 */
export function teInterfaceOps(original: TeInterface | null, fields: TeInterfaceFields): TeBatchOperation[] {
  const before = teInterfaceFields(original);
  const name = original ? original.name : teText(fields.name);
  const ops: TeBatchOperation[] = [];
  if (!original) ops.push({ op: "set_interface", value: name });

  const after = groupList(fields.adminGroups);
  for (const group of before.adminGroups) {
    if (!after.includes(group)) ops.push({ op: "delete_interface_admin_group", value: `${name},${group}` });
  }
  for (const group of after) {
    if (!before.adminGroups.includes(group)) ops.push({ op: "set_interface_admin_group", value: `${name},${group}` });
  }

  for (const key of TE_INTERFACE_NUMBER_KEYS) {
    leaf(ops, `interface_${key}`, name, teNumber(before[key]), teNumber(fields[key]));
  }
  return ops;
}

export const teDeleteOps = {
  /** An interface still naming the group fails the commit, so its references go first. */
  adminGroup: (name: string, interfaces: TeInterface[]): TeBatchOperation[] => [
    ...interfaces
      .filter((iface) => iface.admin_groups.includes(name))
      .map((iface) => ({ op: "delete_interface_admin_group", value: `${iface.name},${name}` })),
    { op: "delete_admin_group", value: name },
  ],
  interface: (name: string): TeBatchOperation[] => [{ op: "delete_interface", value: name }],
  all: (): TeBatchOperation[] => [{ op: "delete_traffic_engineering" }],
};
