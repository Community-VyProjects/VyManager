import type { VrfBatchOperation } from "./vrf";

/** What GET /vyos/vrf/config returns in place of a secret leaf. */
export const MASKED_SECRET = "***";

/**
 * Schema ops whose leaf the VRF config read masks (backend
 * vyos_mappers/vrf/config_parse.py `_SECRET_PATHS`).
 */
export const SECRET_OPS: ReadonlySet<string> = new Set([
  "vrf_bgp_neighbor_password",
  "vrf_bgp_peer_group_password",
  "vrf_isis_area_password_md5",
  "vrf_isis_area_password_plaintext_password",
  "vrf_isis_domain_password_md5",
  "vrf_isis_domain_password_plaintext_password",
  "vrf_isis_interface_password_md5",
  "vrf_isis_interface_password_plaintext_password",
  "vrf_ospf_interface_authentication_plaintext_password",
  "vrf_ospf_interface_authentication_md5_key_id_md5_key",
  "vrf_ospf_area_virtual_link_authentication_plaintext_password",
  "vrf_ospf_area_virtual_link_authentication_md5_key_id_md5_key",
]);

/** The parts of a schema field (components/vrf/schema FieldSpec) the save reads. */
export interface SchemaField {
  op: string;
  delOp?: string;
  type: "text" | "number" | "select" | "toggle" | "list";
  path: string[];
  args?: string[];
  listClearAll?: boolean;
}

export type SchemaRaw = Record<string, unknown> | null | undefined;
export type SchemaValue = string | boolean | string[];

export function isSecretField(f: SchemaField): boolean {
  return SECRET_OPS.has(f.op);
}

// Unique state key per field: fields can share an `op` but differ by `args`
// (e.g. level-1 vs level-2 metric, or per-option generic setters).
export function schemaFieldKey(f: SchemaField): string {
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

export function initialSchemaValue(field: SchemaField, raw: SchemaRaw): SchemaValue {
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

function schemaList(value: SchemaValue | undefined): string[] {
  return Array.isArray(value) ? value.map((v) => v.trim()).filter(Boolean) : [];
}

function unchanged(f: SchemaField, cur: SchemaValue | undefined, orig: SchemaValue | undefined): boolean {
  if (f.type === "toggle") return Boolean(cur) === Boolean(orig);
  if (f.type === "list") {
    const a = schemaList(cur);
    const b = schemaList(orig);
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return schemaText(cur) === schemaText(orig);
}

/**
 * The first secret field the user changed to the mask itself. The emit skips
 * an unchanged mask, so a typed mask would be committed as the secret.
 */
export function schemaSecretProblem<F extends SchemaField>(
  fields: F[],
  initial: Record<string, SchemaValue>,
  values: Record<string, SchemaValue>,
): F | null {
  for (const f of fields) {
    if (!isSecretField(f)) continue;
    const key = schemaFieldKey(f);
    if (unchanged(f, values[key], initial[key])) continue;
    if (schemaText(values[key]) === MASKED_SECRET) return f;
  }
  return null;
}

/**
 * Batch ops for every field whose value differs from the loaded one. Deletes
 * come first: a field's delete may be a shared parent (`delOp`), and running
 * it after a sibling's set would remove the value just set.
 */
export function buildSchemaOps(
  fields: SchemaField[],
  prefix: string[],
  initial: Record<string, SchemaValue>,
  values: Record<string, SchemaValue>,
): VrfBatchOperation[] {
  const deletes: VrfBatchOperation[] = [];
  const sets: VrfBatchOperation[] = [];
  for (const f of fields) {
    const key = schemaFieldKey(f);
    const cur = values[key];
    const orig = initial[key];
    if (unchanged(f, cur, orig)) continue;
    const delOp = f.delOp || f.op;
    const argv = [...prefix, ...(f.args ?? [])];
    if (f.type === "toggle") {
      if (cur) sets.push({ op: `set_${f.op}`, value: argv.join(",") });
      else deletes.push({ op: `delete_${delOp}`, value: argv.join(",") });
    } else if (f.type === "list") {
      const list = schemaList(cur);
      const origList = schemaList(orig);
      if (f.listClearAll) {
        // Delete clears the whole leaf → clear then re-add.
        deletes.push({ op: `delete_${delOp}`, value: argv.join(",") });
        for (const v of list) sets.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
      } else {
        // Per-value add/remove.
        for (const v of origList) {
          if (!list.includes(v)) deletes.push({ op: `delete_${delOp}`, value: [...argv, v].join(",") });
        }
        for (const v of list) {
          if (!origList.includes(v)) sets.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
        }
      }
    } else {
      const str = schemaText(cur);
      if (str) sets.push({ op: `set_${f.op}`, value: [...argv, str].join(",") });
      else deletes.push({ op: `delete_${delOp}`, value: argv.join(",") });
    }
  }
  return [...deletes, ...sets];
}
