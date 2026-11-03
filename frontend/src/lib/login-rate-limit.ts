/**
 * Sign-in attempt cap.
 *
 * The stock server publishes port 3000 with no proxy, so X-Forwarded-For
 * and X-Real-IP are whatever the client sent. Those headers are ignored
 * unless the TCP peer is a trusted proxy and TRUSTED_PROXY_HOPS says how
 * many proxies appended a hop. Loopback is trusted by default. A client
 * who connects straight to the published port is keyed by that peer even
 * if the hop count is set. Count 1 is for a proxy whose TCP peer is
 * loopback, which is not the stock compose bridge. Count 2 is a CDN in
 * front of that proxy. Values above 8 are unset.
 */

export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_WINDOW_MS = 60_000;
/** Header set from the socket peer. Better Auth must not read X-Forwarded-For. */
export const CLIENT_IP_HEADER = "x-vymanager-client-ip";

/** The only IP config Better Auth should use. No trustedProxies: a resolved
 * address that matches a trusted entry is skipped and every such client
 * shares one sign-in bucket. */
export function betterAuthIpAddress(): { ipAddressHeaders: string[] } {
  return { ipAddressHeaders: [CLIENT_IP_HEADER] };
}
/** Map size bound. A new client evicts the oldest key instead of being refused. */
export const LOGIN_RATE_MAX_CLIENTS = 4096;

const MAX_TRUSTED_PROXY_HOPS = 8;
const LOOPBACK_PEERS = ["127.0.0.1", "::1"] as const;

type Attempt = { count: number; resetAt: number; seenAt: number };

export type LoginRateLimiter = {
  allow(ip: string, now: number): boolean;
  /** Stored keys. allow() drops expired keys; this does not. */
  tracked(): number;
};

/** IPv4 clients often show up as ::ffff:a.b.c.d. Keep one key for both. */
export function normalizePeerAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (mapped) return mapped[1];
  return trimmed;
}

/** Bucket IPv6 by /64 so one host cannot mint a new key per address. */
export function rateLimitAddress(value: string): string {
  const normalized = normalizePeerAddress(value);
  if (!normalized || normalized.includes(".")) return normalized ?? value;
  const groups = ipv6Groups(normalized.split("%")[0]);
  if (!groups) return normalized.toLowerCase();
  return groups.slice(0, 4).join(":");
}

function ipv6Groups(address: string): string[] | null {
  const halves = address.toLowerCase().split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && left.length !== 8) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }
  return groups.map((group) => group.padStart(4, "0"));
}

export function trustedProxyHops(
  raw: string | undefined = process.env.TRUSTED_PROXY_HOPS,
): number {
  if (raw == null) return 0;
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return 0;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > MAX_TRUSTED_PROXY_HOPS) return 0;
  return value;
}

type ProxyTrust = {
  exact: Set<string>;
  v4Cidrs: Array<{ base: number; bits: number }>;
};

function ipv4ToInt(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  let packed = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    packed = (packed * 256 + octet) >>> 0;
  }
  return packed;
}

function isIpAddress(value: string): boolean {
  return ipv4ToInt(value) != null || ipv6Groups(value.split("%")[0]) != null;
}

/** Exact addresses and IPv4 CIDRs. Junk, /0, and empty tokens are not trusted. */
export function parseTrustedProxyIps(raw: string | undefined): ProxyTrust {
  const exact = new Set<string>(LOOPBACK_PEERS);
  const v4Cidrs: Array<{ base: number; bits: number }> = [];
  if (!raw) return { exact, v4Cidrs };
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token || token.includes("%")) continue;
    if (token.includes("/")) {
      const [baseRaw, bitsRaw, extra] = token.split("/");
      if (extra != null || !baseRaw || bitsRaw == null) continue;
      const bits = Number(bitsRaw);
      const base = ipv4ToInt(baseRaw);
      if (!Number.isInteger(bits) || bits < 1 || bits > 32 || base == null) continue;
      v4Cidrs.push({ base, bits });
      continue;
    }
    const item = normalizePeerAddress(token);
    if (item && isIpAddress(item)) exact.add(item);
  }
  return { exact, v4Cidrs };
}

export function peerIsTrustedProxy(peer: string, trust: ProxyTrust): boolean {
  const normalized = normalizePeerAddress(peer);
  if (!normalized || !isIpAddress(normalized)) return false;
  if (trust.exact.has(normalized)) return true;
  const packed = ipv4ToInt(normalized);
  if (packed == null) return false;
  return trust.v4Cidrs.some((cidr) => {
    const mask = cidr.bits === 32 ? 0xffffffff : (0xffffffff << (32 - cidr.bits)) >>> 0;
    return (packed & mask) === (cidr.base & mask);
  });
}

function forwardedHopsRightToLeft(header: string | null): string[] {
  if (!header) return [];
  const hops: string[] = [];
  const parts = header.split(",");
  for (let i = parts.length - 1; i >= 0; i--) {
    const hop = normalizePeerAddress(parts[i]);
    if (hop) hops.push(hop);
  }
  return hops;
}

/**
 * Client address for the limiter, or null when a trusted hop count is set
 * but the socket peer was not captured. The route must refuse that attempt.
 * A shared fallback key would let 10 attempts lock every sign-in.
 *
 * Forwarded hops are used only when the peer is loopback or matches
 * TRUSTED_PROXY_IPS (exact address or IPv4 CIDR). Otherwise the peer
 * itself is the key, so a client on the published port cannot choose it.
 */
export function clientIpForRateLimit(input: {
  peerAddress: string | null;
  forwardedFor: string | null;
  trustedProxyHops: number;
  trustedProxyIps?: string;
}): string | null {
  const peer = normalizePeerAddress(input.peerAddress);
  if (!peer) return null;
  const hops = input.trustedProxyHops;
  const trust = parseTrustedProxyIps(
    input.trustedProxyIps !== undefined
      ? input.trustedProxyIps
      : process.env.TRUSTED_PROXY_IPS,
  );
  if (hops <= 0 || !peerIsTrustedProxy(peer, trust)) return peer;
  const addrs = [peer, ...forwardedHopsRightToLeft(input.forwardedFor)];
  let index = 0;
  for (; index < addrs.length - 1; index++) {
    if (index < hops) continue;
    break;
  }
  return addrs[index];
}

export function createLoginRateLimiter(): LoginRateLimiter {
  const attempts = new Map<string, Attempt>();
  return {
    allow(ip: string, now: number): boolean {
      for (const [key, record] of attempts) {
        if (now > record.resetAt) attempts.delete(key);
      }
      const record = attempts.get(ip);
      if (!record) {
        if (attempts.size >= LOGIN_RATE_MAX_CLIENTS) {
          let oldestKey: string | null = null;
          let oldestSeen = Infinity;
          for (const [key, existing] of attempts) {
            if (existing.seenAt < oldestSeen) {
              oldestSeen = existing.seenAt;
              oldestKey = key;
            }
          }
          if (oldestKey) attempts.delete(oldestKey);
        }
        attempts.set(ip, {
          count: 1,
          resetAt: now + LOGIN_RATE_WINDOW_MS,
          seenAt: now,
        });
        return true;
      }
      record.seenAt = now;
      if (record.count >= LOGIN_RATE_LIMIT) return false;
      record.count += 1;
      return true;
    },
    tracked(): number {
      return attempts.size;
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();
