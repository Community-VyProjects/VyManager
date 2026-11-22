import type { FieldSpec } from "@/components/vrf/schema/types";
import type { VrfBatchOperation } from "./vrf";

/** What GET /vyos/vrf/config returns in place of a secret leaf. */
export const MASKED_SECRET = "***";

export type SchemaRaw = Record<string, unknown> | null | undefined;
export type SchemaValue = string | boolean | string[];

// Unique state key per field: fields can share an `op` but differ by `args`
// (e.g. level-1 vs level-2 metric, or per-option generic setters).
export function schemaFieldKey(f: FieldSpec): string {
  return f.args && f.args.length ? `${f.op}::${f.args.join(",")}` : f.op;
}

function readPath(raw: SchemaRaw, path: string[]): unknown {
  let cur: unknown = raw;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function initialSchemaValue(field: FieldSpec, raw: SchemaRaw): SchemaValue {
  const node = readPath(raw, field.path);
  if (field.type === "toggle") {
    return node !== undefined;
  }
  if (field.type === "list") {
    if (Array.isArray(node)) return node.map(String);
    if (typeof node === "string" || typeof node === "number") return [String(node)];
    return [];
  }
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  return "";
}

/** The one normaliser the save check and the emit read a value field through. */
function schemaText(value: SchemaValue | undefined): string {
  return String(value ?? "").trim();
}

/**
 * The first secret field the user changed to the mask itself. The emit skips
 * an unchanged mask, so a typed mask would be committed as the secret.
 */
export function schemaSecretProblem(
  fields: FieldSpec[],
  initial: Record<string, SchemaValue>,
  values: Record<string, SchemaValue>,
): FieldSpec | null {
  for (const f of fields) {
    if (!f.secret) continue;
    const key = schemaFieldKey(f);
    if (values[key] === initial[key]) continue;
    if (schemaText(values[key]) === MASKED_SECRET) return f;
  }
  return null;
}

/** Batch ops for every field whose value differs from the loaded one. */
export function buildSchemaOps(
  fields: FieldSpec[],
  prefix: string[],
  initial: Record<string, SchemaValue>,
  values: Record<string, SchemaValue>,
): VrfBatchOperation[] {
  const ops: VrfBatchOperation[] = [];
  for (const f of fields) {
    const key = schemaFieldKey(f);
    const cur = values[key];
    const orig = initial[key];
    if (cur === orig) continue;
    const delOp = f.delOp || f.op;
    const argv = [...prefix, ...(f.args ?? [])];
    if (f.type === "toggle") {
      ops.push(
        cur
          ? { op: `set_${f.op}`, value: argv.join(",") }
          : { op: `delete_${delOp}`, value: argv.join(",") }
      );
    } else if (f.type === "list") {
      const list = (cur as string[]).map((v) => v.trim()).filter(Boolean);
      const origList = (orig as string[]) ?? [];
      if (f.listClearAll) {
        // Delete clears the whole leaf → clear then re-add.
        ops.push({ op: `delete_${delOp}`, value: argv.join(",") });
        for (const v of list) {
          ops.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
        }
      } else {
        // Per-value add/remove.
        for (const v of list) {
          if (!origList.includes(v)) ops.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
        }
        for (const v of origList) {
          if (!list.includes(v)) ops.push({ op: `delete_${delOp}`, value: [...argv, v].join(",") });
        }
      }
    } else {
      const str = schemaText(cur);
      if (str === schemaText(orig)) continue;
      if (str) {
        ops.push({ op: `set_${f.op}`, value: [...argv, str].join(",") });
      } else {
        ops.push({ op: `delete_${delOp}`, value: argv.join(",") });
      }
    }
  }
  return ops;
}
