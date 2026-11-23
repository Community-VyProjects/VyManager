import type { Flowtable, FlowtableBatchOperation } from "./firewall-flowtables";

/** Lab `firewall flowtable <name>` syntax (VyOS 1.4 and 1.5). */
const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

/** Lab `description` syntax `.{0,255}` (the input caps it). */
export const FLOWTABLE_DESCRIPTION_MAX = 255;

export interface FlowtableDraft {
  name: string;
  description: string;
  interfaces: string[];
  /** "" leaves the leaf unset (the device default). */
  offload: string;
}

export type FlowtableProblem =
  | "nameRequired"
  | "nameInvalid"
  | "nameExists"
  | "interfaceRequired";

export function flowtableDraft(flowtable: Flowtable | null | undefined): FlowtableDraft {
  return {
    name: flowtable?.name ?? "",
    description: flowtable?.description ?? "",
    interfaces: [...(flowtable?.interfaces ?? [])],
    offload: flowtable?.offload ?? "",
  };
}

interface Normalized {
  name: string;
  description: string;
  interfaces: string[];
  offload: string;
}

/** One normalizer for the check and the emit. */
function normalize(draft: FlowtableDraft): Normalized {
  const interfaces: string[] = [];
  for (const raw of draft.interfaces) {
    const iface = raw.trim();
    if (iface && !interfaces.includes(iface)) interfaces.push(iface);
  }
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    interfaces,
    offload: draft.offload.trim(),
  };
}

/** The first reason the lab would reject this save, or null. */
export function flowtableProblem(
  original: Flowtable | null,
  draft: FlowtableDraft,
  existingNames: string[]
): FlowtableProblem | null {
  const next = normalize(draft);
  if (!original) {
    if (!next.name) return "nameRequired";
    if (!NAME_PATTERN.test(next.name)) return "nameInvalid";
    if (existingNames.includes(next.name)) return "nameExists";
  }
  if (next.interfaces.length === 0) return "interfaceRequired";
  return null;
}

/** Batch ops that turn `original` (null for a new flowtable) into `draft`. */
export function flowtableSaveOps(
  original: Flowtable | null,
  draft: FlowtableDraft
): FlowtableBatchOperation[] {
  const before = original ? normalize(flowtableDraft(original)) : null;
  const after = normalize(draft);
  const ops: FlowtableBatchOperation[] = [];

  if (!before) ops.push({ op: "set_flowtable" });

  const oldDescription = before?.description ?? "";
  if (after.description !== oldDescription) {
    ops.push(
      after.description
        ? { op: "set_flowtable_description", value: after.description }
        : { op: "delete_flowtable_description" }
    );
  }

  const oldInterfaces = before?.interfaces ?? [];
  for (const iface of oldInterfaces) {
    if (!after.interfaces.includes(iface)) {
      ops.push({ op: "delete_flowtable_interface", value: iface });
    }
  }
  for (const iface of after.interfaces) {
    if (!oldInterfaces.includes(iface)) {
      ops.push({ op: "set_flowtable_interface", value: iface });
    }
  }

  const oldOffload = before?.offload ?? "";
  if (after.offload !== oldOffload) {
    ops.push(
      after.offload
        ? { op: "set_flowtable_offload", value: after.offload }
        : { op: "delete_flowtable_offload" }
    );
  }

  return ops;
}
