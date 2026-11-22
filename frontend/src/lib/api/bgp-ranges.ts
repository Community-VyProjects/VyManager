import { inRange, type NumberRange } from "./rip-ranges";

export { inRange };

// Lab val_help bounds for BGP neighbor and peer-group numeric leaves (the same on VyOS 1.4 and 1.5).
export const EBGP_MULTIHOP_RANGE: NumberRange = { min: 1, max: 255 };
export const TTL_SECURITY_RANGE: NumberRange = { min: 1, max: 254 };
export const PORT_RANGE: NumberRange = { min: 1, max: 65535 };
export const ADVERTISEMENT_INTERVAL_RANGE: NumberRange = { min: 0, max: 600 };
export const CONNECT_TIMER_RANGE: NumberRange = { min: 0, max: 65535 };
export const KEEPALIVE_RANGE: NumberRange = { min: 1, max: 65535 };
export const HOLDTIME_RANGE: NumberRange = { min: 0, max: 65535 };

export type NeighborRangeField =
  | "ebgpMultihop"
  | "ttlSecurityHops"
  | "port"
  | "advertisementInterval"
  | "connect"
  | "keepalive"
  | "holdtime";

const NEIGHBOR_RANGES: Record<NeighborRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  port: PORT_RANGE,
  advertisementInterval: ADVERTISEMENT_INTERVAL_RANGE,
  connect: CONNECT_TIMER_RANGE,
  keepalive: KEEPALIVE_RANGE,
  holdtime: HOLDTIME_RANGE,
};

/** First neighbor field whose value is outside its lab range, with that range. */
export function neighborRangeProblem(
  values: Record<NeighborRangeField, string>,
): { field: NeighborRangeField; range: NumberRange } | null {
  for (const field of Object.keys(NEIGHBOR_RANGES) as NeighborRangeField[]) {
    const range = NEIGHBOR_RANGES[field];
    if (!inRange(values[field], range)) return { field, range };
  }
  return null;
}

/** Same address in another spelling (IPv6 case) counts as the same neighbor. */
export function sameNeighborAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
