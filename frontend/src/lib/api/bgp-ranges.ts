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
  | "bfdHoldTime";

export const NEIGHBOR_RANGES: Record<NeighborRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  port: PORT_RANGE,
  advertisementInterval: ADVERTISEMENT_INTERVAL_RANGE,
  connect: CONNECT_TIMER_RANGE,
  keepalive: KEEPALIVE_RANGE,
  holdtime: HOLDTIME_RANGE,
  bfdHoldTime: BFD_HOLD_TIME_RANGE,
};

export type PeerGroupRangeField = "ebgpMultihop" | "ttlSecurityHops" | "bfdHoldTime";

export const PEER_GROUP_RANGES: Record<PeerGroupRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  bfdHoldTime: BFD_HOLD_TIME_RANGE,
};

export type OverviewRangeField = "keepalive" | "holdtime";

export const OVERVIEW_RANGES: Record<OverviewRangeField, NumberRange> = {
  keepalive: KEEPALIVE_RANGE,
  holdtime: HOLDTIME_RANGE,
};

export type NeighborAfRangeField = "maximumPrefix" | "allowasIn" | "weight";

export const NEIGHBOR_AF_RANGES: Record<NeighborAfRangeField, NumberRange> = {
  maximumPrefix: MAXIMUM_PREFIX_RANGE,
  allowasIn: ALLOWAS_IN_RANGE,
  weight: WEIGHT_RANGE,
};

/** A single IPv4 or IPv6 address as the lab's ipaddrcheck accepts it (no leading-zero octet, no zone). */
export function isNeighborAddress(value: string): boolean {
  const text = value.trim();
  if (text.includes("%")) return false;
  if (isValidIPv4(text)) return text.split(".").every((octet) => octet === "0" || !octet.startsWith("0"));
  return isValidIPv6(text);
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
