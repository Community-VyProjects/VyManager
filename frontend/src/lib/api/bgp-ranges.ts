import { isValidIPv4, isValidIPv6 } from "../validators/firewall";
import { inRange, type NumberRange } from "./rip-ranges";

export { inRange };

// Lab val_help bounds for BGP numeric leaves (the same on VyOS 1.4 and 1.5).
export const EBGP_MULTIHOP_RANGE: NumberRange = { min: 1, max: 255 };
export const TTL_SECURITY_RANGE: NumberRange = { min: 1, max: 254 };
export const PORT_RANGE: NumberRange = { min: 1, max: 65535 };
export const ADVERTISEMENT_INTERVAL_RANGE: NumberRange = { min: 0, max: 600 };
export const CONNECT_TIMER_RANGE: NumberRange = { min: 0, max: 65535 };
export const KEEPALIVE_RANGE: NumberRange = { min: 1, max: 65535 };
export const HOLDTIME_RANGE: NumberRange = { min: 0, max: 65535 };
export const BFD_HOLD_TIME_RANGE: NumberRange = { min: 1, max: 4294967295 };
export const MAXIMUM_PREFIX_RANGE: NumberRange = { min: 1, max: 4294967295 };
export const ALLOWAS_IN_RANGE: NumberRange = { min: 1, max: 10 };
export const WEIGHT_RANGE: NumberRange = { min: 1, max: 65535 };
export const ASN_RANGE: NumberRange = { min: 1, max: 4294967294 };
export const REDISTRIBUTE_METRIC_RANGE: NumberRange = { min: 1, max: 4294967295 };
export const BMP_MIN_RETRY_RANGE: NumberRange = { min: 100, max: 86400000 };
export const BMP_MAX_RETRY_RANGE: NumberRange = { min: 100, max: 4294967295 };
export const BMP_MIRROR_BUFFER_RANGE: NumberRange = { min: 0, max: 4294967294 };
export const LOCAL_PREF_RANGE: NumberRange = { min: 0, max: 4294967295 };
export const DISTANCE_RANGE: NumberRange = { min: 1, max: 255 };
export const QUEUE_LIMIT_RANGE: NumberRange = { min: 1, max: 4294967295 };
export const UPDATE_DELAY_ESTABLISH_WAIT_RANGE: NumberRange = { min: 1, max: 3600 };
export const UPDATE_DELAY_MAX_DELAY_RANGE: NumberRange = { min: 0, max: 3600 };

export type RangeProblem<F extends string> = { field: F; range: NumberRange } | null;

/** First field whose text is outside its range. Empty text is unset and passes. */
export function firstRangeProblem<F extends string>(
  values: Record<F, string>,
  ranges: Record<F, NumberRange>,
): RangeProblem<F> {
  for (const field of Object.keys(ranges) as F[]) {
    if (!inRange(values[field], ranges[field])) return { field, range: ranges[field] };
  }
  return null;
}

export type NeighborRangeField =
  | "ebgpMultihop"
  | "ttlSecurityHops"
  | "port"
  | "advertisementInterval"
  | "connect"
  | "keepalive"
  | "holdtime"
  | "bfdHoldTime"
  | "localAs";

export const NEIGHBOR_RANGES: Record<NeighborRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  port: PORT_RANGE,
  advertisementInterval: ADVERTISEMENT_INTERVAL_RANGE,
  connect: CONNECT_TIMER_RANGE,
  keepalive: KEEPALIVE_RANGE,
  holdtime: HOLDTIME_RANGE,
  bfdHoldTime: BFD_HOLD_TIME_RANGE,
  localAs: ASN_RANGE,
};

export type PeerGroupRangeField = "ebgpMultihop" | "ttlSecurityHops" | "bfdHoldTime" | "localAs";

export const PEER_GROUP_RANGES: Record<PeerGroupRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  bfdHoldTime: BFD_HOLD_TIME_RANGE,
  localAs: ASN_RANGE,
};

export type OverviewRangeField = "systemAs" | "keepalive" | "holdtime";

export const OVERVIEW_RANGES: Record<OverviewRangeField, NumberRange> = {
  systemAs: ASN_RANGE,
  keepalive: KEEPALIVE_RANGE,
  holdtime: HOLDTIME_RANGE,
};

export type BmpTargetRangeField = "port" | "minRetry" | "maxRetry";

export const BMP_TARGET_RANGES: Record<BmpTargetRangeField, NumberRange> = {
  port: PORT_RANGE,
  minRetry: BMP_MIN_RETRY_RANGE,
  maxRetry: BMP_MAX_RETRY_RANGE,
};

export type ParametersRangeField =
  | "defaultLocalPref"
  | "inputQueueLimit"
  | "outputQueueLimit"
  | "updateDelayEstablishWait"
  | "updateDelayMaxDelay"
  | "distanceExternal"
  | "distanceInternal"
  | "distanceLocal";

export const PARAMETERS_RANGES: Record<ParametersRangeField, NumberRange> = {
  defaultLocalPref: LOCAL_PREF_RANGE,
  inputQueueLimit: QUEUE_LIMIT_RANGE,
  outputQueueLimit: QUEUE_LIMIT_RANGE,
  updateDelayEstablishWait: UPDATE_DELAY_ESTABLISH_WAIT_RANGE,
  updateDelayMaxDelay: UPDATE_DELAY_MAX_DELAY_RANGE,
  distanceExternal: DISTANCE_RANGE,
  distanceInternal: DISTANCE_RANGE,
  distanceLocal: DISTANCE_RANGE,
};

/** Text of an optional numeric value, for a range check ("" when unset). */
export function numberText(value: number | string | null | undefined): string {
  return value == null ? "" : String(value);
}

/** Lab verify rules across parameter leaves, as a `content.params.*` message key. */
export function parametersProblem(values: {
  distanceExternal: number | null | undefined;
  distanceInternal: number | null | undefined;
  distanceLocal: number | null | undefined;
  updateDelayEstablishWait: number | null | undefined;
  updateDelayMaxDelay: number | null | undefined;
}): "distanceIncomplete" | "updateDelayNeedsMaxDelay" | "updateDelayEstablishTooLarge" | null {
  const distances = [values.distanceExternal, values.distanceInternal, values.distanceLocal];
  const setCount = distances.filter((d) => d != null).length;
  if (setCount > 0 && setCount < distances.length) return "distanceIncomplete";
  const establish = values.updateDelayEstablishWait;
  const maxDelay = values.updateDelayMaxDelay;
  if (establish != null && maxDelay == null) return "updateDelayNeedsMaxDelay";
  if (establish != null && maxDelay != null && establish > maxDelay) return "updateDelayEstablishTooLarge";
  return null;
}

export type NeighborAfRangeField = "maximumPrefix" | "allowasIn" | "weight";

export const NEIGHBOR_AF_RANGES: Record<NeighborAfRangeField, NumberRange> = {
  maximumPrefix: MAXIMUM_PREFIX_RANGE,
  allowasIn: ALLOWAS_IN_RANGE,
  weight: WEIGHT_RANGE,
};

/** A single IPv4 or IPv6 address as the lab's ipaddrcheck accepts it (no leading-zero octet, no zone). */
export function isIPAddress(value: string): boolean {
  const text = value.trim();
  if (text.includes("%")) return false;
  if (isValidIPv4(text)) return isIPv4Address(text);
  return isValidIPv6(text);
}

/** A single IPv4 address with no leading-zero octet (router-id, cluster-id). */
export function isIPv4Address(value: string): boolean {
  const text = value.trim();
  return isValidIPv4(text) && text.split(".").every((octet) => octet === "0" || !octet.startsWith("0"));
}

/** One spelling per address: IPv6 lowercased and fully expanded without leading zeros. */
export function canonicalAddress(value: string): string {
  const text = value.trim().toLowerCase();
  if (!text.includes(":") || text.includes(".")) return text;
  const [head, tail] = text.includes("::") ? text.split("::") : [text, null];
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === null ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return groups.map((group) => group.replace(/^0+(?=.)/, "")).join(":");
}

/** One spelling per prefix: the canonical address plus the prefix length. */
export function canonicalPrefix(value: string): string {
  const [address, length] = value.trim().split("/");
  return length === undefined ? canonicalAddress(address) : `${canonicalAddress(address)}/${length}`;
}

export function sameNeighborAddress(a: string, b: string): boolean {
  return canonicalAddress(a) === canonicalAddress(b);
}
