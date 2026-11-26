import type {
  BatchOperation,
  BroadcastRelayCapabilities,
  BroadcastRelayInstance,
} from "./broadcast-relay";
import { isIPv4Address } from "./bgp-ranges";

/** Lab `description` syntax is `.{0,255}` on both versions. */
export const BROADCAST_RELAY_DESCRIPTION_MAX = 255;

/**
 * Lab verify (both versions): every instance needs a port and at least two
 * interfaces, and `disable` does not exempt it.
 */
export const BROADCAST_RELAY_MIN_INTERFACES = 2;

export interface BroadcastRelayRange {
  min: number;
  max: number;
}

export interface BroadcastRelayRanges {
  id: BroadcastRelayRange;
  port: BroadcastRelayRange;
}

function range(node: unknown): BroadcastRelayRange | null {
  if (!node || typeof node !== "object") return null;
  const { min, max } = node as { min?: unknown; max?: unknown };
  return typeof min === "number" && typeof max === "number" ? { min, max } : null;
}

/** The id and port bounds from capabilities, or null when they are missing. */
export function broadcastRelayRanges(
  capabilities: Pick<BroadcastRelayCapabilities, "features"> | null | undefined,
): BroadcastRelayRanges | null {
  const id = range(capabilities?.features?.instance_id_range);
  const port = range(capabilities?.features?.port);
  return id && port ? { id, port } : null;
}

/** The modal's raw field values. */
export interface BroadcastRelayDraft {
  id: string;
  port: string;
  interfaces: string[];
  address: string;
  description: string;
  disabled: boolean;
}

export function draftFromInstance(instance: BroadcastRelayInstance | null): BroadcastRelayDraft {
  return {
    id: instance?.id ?? "",
    port: instance?.port != null ? String(instance.port) : "",
    interfaces: [...(instance?.interfaces ?? [])],
    address: instance?.address ?? "",
    description: instance?.description ?? "",
    disabled: instance?.disabled ?? false,
  };
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function cleanList(values: readonly string[]): string[] {
  return [...new Set(values.map(text).filter(Boolean))];
}

/** A decimal integer with digits only (no sign, exponent or fraction). */
function integer(value: string): number | null {
  const trimmed = text(value);
  return /^\d{1,9}$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * The one normalizer the save check and the emit both read: trimmed text,
 * blank optional leaves as null, interfaces trimmed and de-duplicated.
 */
export function normalizeBroadcastRelayDraft(draft: BroadcastRelayDraft): BroadcastRelayInstance {
  const id = integer(draft.id);
  return {
    id: id != null ? String(id) : text(draft.id),
    port: integer(draft.port),
    interfaces: cleanList(draft.interfaces),
    address: text(draft.address) || null,
    description: text(draft.description) || null,
    disabled: draft.disabled,
  };
}

function inRange(value: number | null, bounds: BroadcastRelayRange): boolean {
  return value != null && value >= bounds.min && value <= bounds.max;
}

export type BroadcastRelayProblem =
  | { key: "idRange"; values: { min: number; max: number } }
  | { key: "idExists"; values: { id: string } }
  | { key: "portRange"; values: { min: number; max: number } }
  | { key: "interfacesRequired"; values: { min: number } }
  | { key: "addressInvalid"; values: Record<string, never> }
  | { key: "descriptionTooLong"; values: { max: number } };

/**
 * The first reason the lab would reject this instance, or null.
 * `existingIds` are the configured instance ids; pass them only on create.
 */
export function broadcastRelayProblem(
  draft: BroadcastRelayDraft,
  ranges: BroadcastRelayRanges,
  existingIds: readonly string[] = [],
): BroadcastRelayProblem | null {
  const instance = normalizeBroadcastRelayDraft(draft);
  if (!inRange(integer(draft.id), ranges.id)) {
    return { key: "idRange", values: { min: ranges.id.min, max: ranges.id.max } };
  }
  if (existingIds.includes(instance.id)) {
    return { key: "idExists", values: { id: instance.id } };
  }
  if (!inRange(instance.port ?? null, ranges.port)) {
    return { key: "portRange", values: { min: ranges.port.min, max: ranges.port.max } };
  }
  if (instance.interfaces.length < BROADCAST_RELAY_MIN_INTERFACES) {
    return { key: "interfacesRequired", values: { min: BROADCAST_RELAY_MIN_INTERFACES } };
  }
  if (instance.address && !isIPv4Address(instance.address)) {
    return { key: "addressInvalid", values: {} };
  }
  if ((instance.description ?? "").length > BROADCAST_RELAY_DESCRIPTION_MAX) {
    return { key: "descriptionTooLong", values: { max: BROADCAST_RELAY_DESCRIPTION_MAX } };
  }
  return null;
}

/** Every op for a new instance. */
export function broadcastRelayCreateOps(instance: BroadcastRelayInstance): BatchOperation[] {
  const id = instance.id;
  const ops: BatchOperation[] = [{ op: "set_instance", value: id }];
  if (instance.port != null) ops.push({ op: "set_instance_port", value: `${id},${instance.port}` });
  for (const iface of instance.interfaces) {
    ops.push({ op: "set_instance_interface", value: `${id},${iface}` });
  }
  if (instance.address) ops.push({ op: "set_instance_address", value: `${id},${instance.address}` });
  if (instance.description) {
    ops.push({ op: "set_instance_description", value: `${id},${instance.description}` });
  }
  if (instance.disabled) ops.push({ op: "set_instance_disable", value: id });
  return ops;
}

/**
 * One single-value leaf: a set replaces the stored value, so the delete is
 * emitted only when the field is cleared.
 */
function leaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  id: string,
  before: string | null,
  after: string | null,
): void {
  if (before === after) return;
  if (after) ops.push({ op: setOp, value: `${id},${after}` });
  else ops.push({ op: deleteOp, value: id });
}

/** The ops that turn `original` into `updated`; empty when nothing changed. */
export function broadcastRelayUpdateOps(
  original: BroadcastRelayInstance,
  updated: BroadcastRelayInstance,
): BatchOperation[] {
  const id = original.id;
  const ops: BatchOperation[] = [];
  const port = (value: number | null | undefined) => (value != null ? String(value) : null);
  leaf(ops, "set_instance_port", "delete_instance_port", id, port(original.port), port(updated.port));

  const before = cleanList(original.interfaces);
  const after = cleanList(updated.interfaces);
  for (const iface of before.filter((name) => !after.includes(name))) {
    ops.push({ op: "delete_instance_interface", value: `${id},${iface}` });
  }
  for (const iface of after.filter((name) => !before.includes(name))) {
    ops.push({ op: "set_instance_interface", value: `${id},${iface}` });
  }

  leaf(ops, "set_instance_address", "delete_instance_address", id, text(original.address) || null, updated.address ?? null);
  leaf(
    ops,
    "set_instance_description",
    "delete_instance_description",
    id,
    text(original.description) || null,
    updated.description ?? null,
  );

  if (updated.disabled !== original.disabled) {
    ops.push({ op: updated.disabled ? "set_instance_disable" : "delete_instance_disable", value: id });
  }
  return ops;
}
