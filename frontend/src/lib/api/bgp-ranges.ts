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
  | "localAs"
  | "remoteAs";

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
  remoteAs: ASN_RANGE,
};

export type PeerGroupRangeField = "ebgpMultihop" | "ttlSecurityHops" | "bfdHoldTime" | "localAs" | "remoteAs";

export const PEER_GROUP_RANGES: Record<PeerGroupRangeField, NumberRange> = {
  ebgpMultihop: EBGP_MULTIHOP_RANGE,
  ttlSecurityHops: TTL_SECURITY_RANGE,
  bfdHoldTime: BFD_HOLD_TIME_RANGE,
  localAs: ASN_RANGE,
  remoteAs: ASN_RANGE,
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

/** Remote-as text to range-check: a number is an ASN; a keyword (the list differs by version) is left to the lab. */
export function remoteAsNumber(value: string): string {
  return /^\d+$/.test(value.trim()) ? value : "";
}

export type PeerProblem =
  | "localAsIsSystemAs"
  | "localAsIsRemoteAs"
  | "localAsNeedsEbgp"
  | "multihopWithTtl"
  | "overrideWithStrict"
  | "passwordWhitespace"
  | "remoteAsRequired"
  | "remoteAsOverridesPeerGroup"
  | "interfaceRemoteAs"
  | "peerGroupMixed"
  | "memberOverridesRemoteAs"
  | "memberNeedsRemoteAs"
  | "memberLocalAsNeedsEbgp"
  | "routeReflectorNeedsIbgp"
  | "interfaceMultihop";

/** A configured neighbor of a peer group, as the verify rules read it. */
export interface PeerGroupMember {
  address: string;
  remoteAs: string | null;
  localAs: string | null;
}

/** Configured neighbors grouped by the peer group they name. */
export function peerGroupMembersOf(
  neighbors: { address: string; remote_as: string | null; peer_group: string | null; local_as: { asn: string | null } }[],
): Record<string, PeerGroupMember[]> {
  const members: Record<string, PeerGroupMember[]> = {};
  for (const n of neighbors) {
    if (n.peer_group) (members[n.peer_group] ??= []).push({ address: n.address, remoteAs: n.remote_as, localAs: n.local_as.asn });
  }
  return members;
}

/**
 * Lab verify rules across neighbor or peer-group leaves, as a `form.*` message key.
 * `neighbor` is set only for a neighbor (`memberRemoteAs`: the own remote-as of the
 * other neighbors in its peer group); `members` only for a peer group (its neighbors).
 */
export function peerProblem(values: {
  localAs: string;
  systemAs: string | null | undefined;
  remoteAs: string;
  ebgpMultihop: string;
  ttlSecurityHops: string;
  overrideCapability: boolean;
  strictCapabilityMatch?: boolean;
  password: string;
  /** Any enabled address family sets route-reflector-client. */
  routeReflectorClient: boolean;
  neighbor?: {
    address: string;
    peerGroup: string;
    peerGroupRemoteAs: string | null | undefined;
    memberRemoteAs: (string | null)[];
  };
  members?: PeerGroupMember[];
}): PeerProblem | null {
  const localAs = values.localAs.trim();
  const systemAs = (values.systemAs ?? "").trim();
  const own = values.remoteAs.trim();
  const neighbor = values.neighbor;
  const isIbgp = (asn: string) => asn === "internal" || asn === systemAs;
  if (localAs && localAs === systemAs) return "localAsIsSystemAs";
  if (neighbor && localAs && localAs === own) return "localAsIsRemoteAs";
  if (values.ebgpMultihop.trim() && values.ttlSecurityHops.trim()) return "multihopWithTtl";
  if (values.overrideCapability && values.strictCapabilityMatch) return "overrideWithStrict";
  if (values.password.trim().includes(" ")) return "passwordWhitespace";
  let effective = own;
  if (neighbor) {
    const inherited = neighbor.peerGroup ? (neighbor.peerGroupRemoteAs ?? "") : "";
    if (!isIPAddress(neighbor.address)) {
      if (own || neighbor.peerGroup) return "interfaceRemoteAs";
      if (values.ebgpMultihop.trim()) return "interfaceMultihop";
    } else {
      if (!own && !inherited) return "remoteAsRequired";
      if (own && inherited) return "remoteAsOverridesPeerGroup";
    }
    if (own && neighbor.peerGroup && neighbor.memberRemoteAs.some((asn) => asn && isIbgp(asn) !== isIbgp(own))) {
      return "peerGroupMixed";
    }
    effective = own || inherited;
  }
  if (localAs && effective && effective === systemAs) return "localAsNeedsEbgp";
  if (values.routeReflectorClient && effective && !isIbgp(effective)) return "routeReflectorNeedsIbgp";
  if (values.members) {
    if (own && values.members.some((m) => m.remoteAs)) return "memberOverridesRemoteAs";
    if (!own && values.members.some((m) => isIPAddress(m.address) && !m.remoteAs)) return "memberNeedsRemoteAs";
    if (own && own === systemAs && values.members.some((m) => m.localAs && !m.remoteAs)) return "memberLocalAsNeedsEbgp";
  }
  return null;
}

/** The family whose unicast and labeled-unicast AFIs are both enabled (lab verify rejects that pair). */
export function labeledUnicastConflict(afis: Iterable<string>): "IPv4" | "IPv6" | null {
  const enabled = new Set(afis);
  if (enabled.has("ipv4-unicast") && enabled.has("ipv4-labeled-unicast")) return "IPv4";
  if (enabled.has("ipv6-unicast") && enabled.has("ipv6-labeled-unicast")) return "IPv6";
  return null;
}

/** Address family of an AFI name (every `ipv6-*` AFI is ipv6; every other network AFI is ipv4). */
export function afiFamily(afi: string): "ipv4" | "ipv6" {
  return afi.startsWith("ipv6") ? "ipv6" : "ipv4";
}

/** A network prefix as the lab's ipaddrcheck `--is-ipv4-net` / `--is-ipv6-net` accepts it (host bits zero). */
export function isNetworkPrefix(value: string, family: "ipv4" | "ipv6"): boolean {
  const parts = value.trim().split("/");
  if (parts.length !== 2 || !/^\d{1,3}$/.test(parts[1])) return false;
  const [address, lengthText] = parts;
  const length = Number(lengthText);
  if (family === "ipv4") {
    if (!address || length > 32 || !isIPv4Address(address)) return false;
    return hostBitsZero(address.split(".").map((octet) => Number(octet).toString(2).padStart(8, "0")), length);
  }
  if (!address || length > 128 || address.includes("%") || address.includes(".") || !isValidIPv6(address)) return false;
  return hostBitsZero(canonicalAddress(address).split(":").map((group) => parseInt(group, 16).toString(2).padStart(16, "0")), length);
}

function hostBitsZero(groups: string[], length: number): boolean {
  return !groups.join("").slice(length).includes("1");
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
