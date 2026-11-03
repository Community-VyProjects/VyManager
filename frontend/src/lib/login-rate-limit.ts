/**
 * Sign-in attempt cap.
 *
 * The stock server publishes port 3000 with no proxy, so X-Forwarded-For
 * and X-Real-IP are whatever the client sent. Those headers are ignored
 * unless the TCP peer is a trusted proxy and TRUSTED_PROXY_HOPS says how
 * many proxies appended a hop. Loopback is trusted by default. A client
 * who connects straight to the published port is keyed by that peer even
 * if the hop count is set. Count 1 matches nginx or Caddy on the same
 * host. Count 2 is a CDN in front of that proxy. Values above 8 are unset.
 */

export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_WINDOW_MS = 60_000;
/** Map size bound. A new client evicts the oldest key instead of being refused. */
export const LOGIN_RATE_MAX_CLIENTS = 4096;
/** Shared key when no socket peer was captured and no proxy is trusted. */
export const DIRECT_CLIENT_KEY = "direct";

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

export function trustedProxyPeers(
  raw: string | undefined = process.env.TRUSTED_PROXY_IPS,
): ReadonlySet<string> {
  const peers = new Set<string>(LOOPBACK_PEERS);
  if (!raw) return peers;
  for (const part of raw.split(",")) {
    const item = normalizePeerAddress(part);
    if (item) peers.add(item);
  }
  return peers;
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
 * but the socket peer was not captured. Null must not share one bucket:
 * that would let 10 attempts lock every sign-in.
 *
 * Forwarded hops are used only when the peer is loopback or listed in
 * TRUSTED_PROXY_IPS. Otherwise the peer itself is the key.
 */
export function clientIpForRateLimit(input: {
  peerAddress: string | null;
  forwardedFor: string | null;
  trustedProxyHops: number;
  trustedProxyPeers?: ReadonlySet<string>;
}): string | null {
  const peer = normalizePeerAddress(input.peerAddress);
  const hops = input.trustedProxyHops;
  if (!peer) return hops <= 0 ? DIRECT_CLIENT_KEY : null;
  const proxies = input.trustedProxyPeers ?? trustedProxyPeers();
  if (hops <= 0 || !proxies.has(peer)) return rateLimitAddress(peer);
  const addrs = [peer, ...forwardedHopsRightToLeft(input.forwardedFor)];
  let index = 0;
  for (; index < addrs.length - 1; index++) {
    if (index < hops) continue;
    break;
  }
  return rateLimitAddress(addrs[index]);
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
