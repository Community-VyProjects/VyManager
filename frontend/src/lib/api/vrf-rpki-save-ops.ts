import type { VrfBatchOperation, VrfRpkiConfig } from "./vrf";

/** Lab `val_help` ranges under `vrf name <vrf> protocols rpki` (1.5). */
export const RPKI_RANGES = {
  expire: { min: 600, max: 172800 },
  polling: { min: 1, max: 86400 },
  retry: { min: 1, max: 7200 },
  port: { min: 1, max: 65535 },
  preference: { min: 1, max: 255 },
} as const;

export type RpkiRangeField = keyof typeof RPKI_RANGES;

export interface VrfRpkiCacheFields {
  name: string;
  port: string;
  preference: string;
  sourceAddress: string;
  sshUsername: string;
  sshKey: string;
}

export interface VrfRpkiFields {
  expire: string;
  polling: string;
  retry: string;
  caches: VrfRpkiCacheFields[];
}

export type VrfRpkiProblem =
  | { key: "cacheNameRequired" }
  | { key: "cacheNameDuplicate"; name: string }
  | { key: "cacheNameComma"; name: string }
  | { key: "portRequired"; name: string }
  | { key: "preferenceRequired"; name: string }
  | { key: "sshIncomplete"; name: string }
  | { key: "range"; field: RpkiRangeField; min: number; max: number };

/** Every value as both the save check and the emit read it. */
function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function emptyVrfRpkiCache(): VrfRpkiCacheFields {
  return { name: "", port: "", preference: "", sourceAddress: "", sshUsername: "", sshKey: "" };
}

/** Form fields for the RPKI tree the config response returned (null when absent). */
export function vrfRpkiFields(rpki: VrfRpkiConfig | null | undefined): VrfRpkiFields {
  return {
    expire: text(rpki?.expire_interval),
    polling: text(rpki?.polling_period),
    retry: text(rpki?.retry_interval),
    caches: (rpki?.caches ?? []).map((cache) => ({
      name: cache.name,
      port: text(cache.port),
      preference: text(cache.preference),
      sourceAddress: text(cache.source_address),
      sshUsername: text(cache.ssh?.username),
      sshKey: text(cache.ssh?.key),
    })),
  };
}

function normalizeCache(cache: VrfRpkiCacheFields): VrfRpkiCacheFields {
  return {
    name: text(cache.name),
    port: text(cache.port),
    preference: text(cache.preference),
    sourceAddress: text(cache.sourceAddress),
    sshUsername: text(cache.sshUsername),
    sshKey: text(cache.sshKey),
  };
}

function hasData(cache: VrfRpkiCacheFields): boolean {
  return Boolean(
    cache.port || cache.preference || cache.sourceAddress || cache.sshUsername || cache.sshKey,
  );
}

/** Rows the emit keeps: trimmed, with a never-filled blank row dropped. */
function cacheRows(fields: VrfRpkiFields): VrfRpkiCacheFields[] {
  return fields.caches.map(normalizeCache).filter((cache) => cache.name || hasData(cache));
}

function outOfRange(value: string, field: RpkiRangeField): VrfRpkiProblem | null {
  if (!value) return null;
  const { min, max } = RPKI_RANGES[field];
  if (!/^[0-9]{1,6}$/.test(value) || Number(value) < min || Number(value) > max) {
    return { key: "range", field, min, max };
  }
  return null;
}

/**
 * A save the lab commit would reject, or the batch split could not carry:
 * every cache needs `port` and `preference`, SSH needs both `key` and
 * `username`, and a comma would split the cache name from its value.
 */
export function vrfRpkiProblem(fields: VrfRpkiFields): VrfRpkiProblem | null {
  const globals: [string, RpkiRangeField][] = [
    [fields.expire, "expire"],
    [fields.polling, "polling"],
    [fields.retry, "retry"],
  ];
  for (const [value, field] of globals) {
    const problem = outOfRange(text(value), field);
    if (problem) return problem;
  }
  const seen = new Set<string>();
  for (const cache of cacheRows(fields)) {
    if (!cache.name) return { key: "cacheNameRequired" };
    if (cache.name.includes(",")) return { key: "cacheNameComma", name: cache.name };
    if (seen.has(cache.name)) return { key: "cacheNameDuplicate", name: cache.name };
    seen.add(cache.name);
    if (!cache.port) return { key: "portRequired", name: cache.name };
    if (!cache.preference) return { key: "preferenceRequired", name: cache.name };
    const problem = outOfRange(cache.port, "port") || outOfRange(cache.preference, "preference");
    if (problem) return problem;
    if (Boolean(cache.sshUsername) !== Boolean(cache.sshKey)) {
      return { key: "sshIncomplete", name: cache.name };
    }
  }
  return null;
}

/** Optional value leaf: a set replaces it, a cleared field deletes it. */
function leaf(
  ops: VrfBatchOperation[],
  op: string,
  setValue: string,
  deleteValue: string,
  before: string,
  after: string,
): void {
  if (after === before) return;
  ops.push(after ? { op: `set_${op}`, value: `${setValue},${after}` } : { op: `delete_${op}`, value: deleteValue });
}

/** Leaf the lab requires on its parent: only replaced; it goes with the parent delete. */
function requiredLeaf(
  ops: VrfBatchOperation[],
  op: string,
  setValue: string,
  before: string,
  after: string,
): void {
  if (after && after !== before) ops.push({ op: `set_${op}`, value: `${setValue},${after}` });
}

/** Ops that turn the loaded RPKI tree into the edited one, all in one batch. */
export function buildVrfRpkiSaveOps(
  vrfName: string,
  original: VrfRpkiFields,
  updated: VrfRpkiFields,
): VrfBatchOperation[] {
  const ops: VrfBatchOperation[] = [];
  const globals: [string, keyof Omit<VrfRpkiFields, "caches">][] = [
    ["vrf_rpki_expire_interval", "expire"],
    ["vrf_rpki_polling_period", "polling"],
    ["vrf_rpki_retry_interval", "retry"],
  ];
  for (const [op, key] of globals) {
    leaf(ops, op, vrfName, vrfName, text(original[key]), text(updated[key]));
  }

  const before = new Map(cacheRows(original).map((cache) => [cache.name, cache]));
  const after = new Map(cacheRows(updated).map((cache) => [cache.name, cache]));
  for (const name of before.keys()) {
    if (!after.has(name)) ops.push({ op: "delete_vrf_rpki_cache", value: `${vrfName},${name}` });
  }
  for (const [name, cache] of after) {
    const old = before.get(name);
    if (!old) ops.push({ op: "set_vrf_rpki_cache", value: `${vrfName},${name}` });
    const prev = old ?? emptyVrfRpkiCache();
    const key = `${vrfName},${name}`;
    requiredLeaf(ops, "vrf_rpki_cache_port", key, prev.port, cache.port);
    requiredLeaf(ops, "vrf_rpki_cache_preference", key, prev.preference, cache.preference);
    leaf(ops, "vrf_rpki_cache_source_address", key, key, prev.sourceAddress, cache.sourceAddress);
    // The lab requires SSH username and key together: each is replaced by a
    // set, and clearing SSH deletes the `ssh` parent.
    if (!cache.sshUsername && !cache.sshKey) {
      if (prev.sshUsername || prev.sshKey) ops.push({ op: "delete_vrf_rpki_cache_ssh", value: key });
    } else {
      requiredLeaf(ops, "vrf_rpki_cache_ssh_username", key, prev.sshUsername, cache.sshUsername);
      requiredLeaf(ops, "vrf_rpki_cache_ssh_key", key, prev.sshKey, cache.sshKey);
    }
  }
  return ops;
}

export function enableVrfRpkiOps(vrfName: string): VrfBatchOperation[] {
  return [{ op: "set_vrf_rpki", value: vrfName }];
}

export function deleteVrfRpkiOps(vrfName: string): VrfBatchOperation[] {
  return [{ op: "delete_vrf_rpki", value: vrfName }];
}
