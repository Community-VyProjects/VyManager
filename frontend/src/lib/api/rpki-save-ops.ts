import type { RpkiBatchOperation, RpkiCacheServer, RpkiCapabilities, RpkiConfig } from "./rpki";
import { isIpv4, isIpv6Prefix } from "./ospfv3-save-ops";
import { inRange } from "./rip-ranges";

// ============================================================================
// Form fields. Every value the save check and the emit read goes through
// rpkiText, so a padded value is checked and sent the same way.
// ============================================================================

export type RpkiRangeKey = "expire_interval" | "polling_period" | "retry_interval" | "port" | "preference";
export type RpkiTimerKey = "expire_interval" | "polling_period" | "retry_interval";

export const RPKI_TIMER_KEYS: readonly RpkiTimerKey[] = ["expire_interval", "polling_period", "retry_interval"];

export interface RpkiCacheFields {
  address: string;
  port: string;
  preference: string;
  sourceAddress: string;
  sshEnabled: boolean;
  sshKey: string;
  sshUsername: string;
}

export type RpkiTimerFields = Record<RpkiTimerKey, string>;

type Caps = Pick<RpkiCapabilities, "ranges" | "features"> | null | undefined;

export type RpkiProblem =
  | { key: "addressRequired" }
  | { key: "addressInvalid" }
  | { key: "addressExists"; name: string }
  | { key: "portRequired" }
  | { key: "preferenceRequired" }
  | { key: "preferenceTaken"; name: string }
  | { key: "sourceAddressInvalid" }
  | { key: "sshIncomplete" }
  | { key: "usernameInvalid" }
  | { key: "numberInvalid"; field: RpkiRangeKey }
  | { key: "range"; field: RpkiRangeKey; min: number; max: number };

/** A value as the check and the emit read it: trimmed, "" when unset. */
export function rpkiText(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function rpkiCacheFields(server: RpkiCacheServer | null | undefined): RpkiCacheFields {
  return {
    address: rpkiText(server?.address),
    port: rpkiText(server?.port),
    preference: rpkiText(server?.preference),
    sourceAddress: rpkiText(server?.source_address),
    sshEnabled: server?.ssh != null,
    sshKey: rpkiText(server?.ssh?.key),
    sshUsername: rpkiText(server?.ssh?.username),
  };
}

function normalizeCache(fields: RpkiCacheFields): RpkiCacheFields {
  return {
    address: rpkiText(fields.address),
    port: rpkiText(fields.port),
    preference: rpkiText(fields.preference),
    sourceAddress: rpkiText(fields.sourceAddress),
    sshEnabled: fields.sshEnabled,
    sshKey: rpkiText(fields.sshKey),
    sshUsername: rpkiText(fields.sshUsername),
  };
}

export function rpkiTimerFields(config: RpkiConfig | null | undefined): RpkiTimerFields {
  return {
    expire_interval: rpkiText(config?.expire_interval),
    polling_period: rpkiText(config?.polling_period),
    retry_interval: rpkiText(config?.retry_interval),
  };
}

// ============================================================================
// Save checks: what the lab commit would reject (proven on 1.4 and 1.5)
// ============================================================================

export function rpkiRange(caps: Caps, key: RpkiRangeKey): { min: number; max: number } | null {
  const range = caps?.ranges?.[key];
  return range && typeof range.min === "number" && typeof range.max === "number" ? range : null;
}

function rangeProblem(caps: Caps, field: RpkiRangeKey, value: string): RpkiProblem | null {
  const range = rpkiRange(caps, field);
  if (!range) return /^\d{0,10}$/.test(value) ? null : { key: "numberInvalid", field };
  return inRange(value, range) ? null : { key: "range", field, min: range.min, max: range.max };
}

/** Cache tag as the lab takes it: an IP address (no zone index, no dotted IPv6 tail) or the fqdn regex. */
export function isRpkiCacheAddress(value: string): boolean {
  if (value.includes(":")) {
    return !value.includes("%") && !value.includes(".") && !value.includes("/") && isIpv6Prefix(`${value}/128`);
  }
  return /^[A-Za-z0-9][-.A-Za-z0-9]*$/.test(value);
}

/**
 * A cache save the lab would reject: port and preference are required on
 * every cache, no two caches share a preference, SSH needs both a key and a
 * username, and source-address is an IPv4 address. A comma would split the
 * address from its value in the batch, which the address check rules out.
 */
export function rpkiCacheProblem(
  fields: RpkiCacheFields,
  original: RpkiCacheServer | null,
  servers: RpkiCacheServer[],
  caps: Caps,
): RpkiProblem | null {
  const cache = normalizeCache(fields);
  if (!cache.address) return { key: "addressRequired" };
  if (!isRpkiCacheAddress(cache.address)) return { key: "addressInvalid" };
  if (!original && servers.some((s) => s.address === cache.address)) {
    return { key: "addressExists", name: cache.address };
  }
  if (!cache.port) return { key: "portRequired" };
  const port = rangeProblem(caps, "port", cache.port);
  if (port) return port;
  if (!cache.preference) return { key: "preferenceRequired" };
  const preference = rangeProblem(caps, "preference", cache.preference);
  if (preference) return preference;
  const self = original?.address ?? cache.address;
  const taken = servers.find((s) => s.address !== self && s.preference != null && Number(s.preference) === Number(cache.preference));
  if (taken) return { key: "preferenceTaken", name: taken.address };
  if (caps?.features.cache_source_address.supported && cache.sourceAddress && !isIpv4(cache.sourceAddress)) {
    return { key: "sourceAddressInvalid" };
  }
  if (cache.sshEnabled) {
    if (!cache.sshKey || !cache.sshUsername) return { key: "sshIncomplete" };
    if (!/^[\x00-\x7f]{1,128}$/.test(cache.sshUsername)) return { key: "usernameInvalid" };
  }
  return null;
}

export function rpkiTimerProblem(fields: RpkiTimerFields, caps: Caps): RpkiProblem | null {
  for (const key of RPKI_TIMER_KEYS) {
    const problem = rangeProblem(caps, key, rpkiText(fields[key]));
    if (problem) return problem;
  }
  return null;
}

// ============================================================================
// Emit
// ============================================================================

/** Optional value leaf: a set replaces it, a cleared field deletes it. */
function leaf(
  ops: RpkiBatchOperation[],
  op: string,
  name: string | null,
  before: string,
  after: string,
): void {
  if (after === before) return;
  if (after) ops.push({ op: `set_${op}`, value: name === null ? after : `${name},${after}` });
  else ops.push(name === null ? { op: `delete_${op}` } : { op: `delete_${op}`, value: name });
}

/** Leaf the lab requires on its parent: only replaced by a set; it goes with the parent delete. */
function requiredLeaf(ops: RpkiBatchOperation[], op: string, name: string, before: string, after: string): void {
  if (after && after !== before) ops.push({ op: `set_${op}`, value: `${name},${after}` });
}

/**
 * Ops that turn the loaded cache (null on create) into the edited one, in
 * one batch. Port, preference and the SSH key and username are never
 * deleted alone (the lab refuses each); turning SSH off deletes `ssh`.
 */
export function rpkiCacheOps(
  original: RpkiCacheServer | null,
  fields: RpkiCacheFields,
  caps: Caps,
): RpkiBatchOperation[] {
  const cache = normalizeCache(fields);
  const before = rpkiCacheFields(original);
  const name = original ? before.address : cache.address;
  const ops: RpkiBatchOperation[] = [];
  if (!original) ops.push({ op: "set_cache", value: name });
  requiredLeaf(ops, "cache_port", name, before.port, cache.port);
  requiredLeaf(ops, "cache_preference", name, before.preference, cache.preference);
  if (caps?.features.cache_source_address.supported) {
    leaf(ops, "cache_source_address", name, before.sourceAddress, cache.sourceAddress);
  }
  if (!cache.sshEnabled) {
    if (before.sshEnabled) ops.push({ op: "delete_cache_ssh", value: name });
  } else {
    requiredLeaf(ops, "cache_ssh_key", name, before.sshKey, cache.sshKey);
    requiredLeaf(ops, "cache_ssh_username", name, before.sshUsername, cache.sshUsername);
  }
  return ops;
}

export function rpkiTimerOps(config: RpkiConfig, fields: RpkiTimerFields): RpkiBatchOperation[] {
  const before = rpkiTimerFields(config);
  const ops: RpkiBatchOperation[] = [];
  for (const key of RPKI_TIMER_KEYS) {
    leaf(ops, key, null, before[key], rpkiText(fields[key]));
  }
  return ops;
}

export const rpkiDeleteOps = {
  cache: (address: string): RpkiBatchOperation[] => [{ op: "delete_cache", value: address }],
  all: (): RpkiBatchOperation[] => [{ op: "delete_rpki" }],
};
