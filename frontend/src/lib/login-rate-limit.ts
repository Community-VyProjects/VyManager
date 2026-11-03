/**
 * Sign-in attempt cap.
 *
 * The stock server publishes port 3000 with no proxy, so X-Forwarded-For
 * and X-Real-IP are whatever the client sent. Those headers are ignored
 * unless TRUSTED_PROXY_HOPS says how many proxies appended a hop. The
 * socket peer is always the first address in the chain and is not taken
 * from a header. Count 1 matches the documented nginx and Caddy config.
 * Count 2 is a CDN in front of that proxy. A higher count walks into
 * client-supplied hops, so values above 8 are treated as unset.
 */

export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_WINDOW_MS = 60_000;
/** Distinct clients kept in one window. Further new clients are refused. */
export const LOGIN_RATE_MAX_CLIENTS = 4096;
/** Shared key when no socket peer was captured. Not derived from headers. */
export const DIRECT_CLIENT_KEY = "direct";

const MAX_TRUSTED_PROXY_HOPS = 8;

/** IPv4 clients often show up as ::ffff:a.b.c.d. Keep one key for both. */
export function normalizePeerAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (mapped) return mapped[1];
  return trimmed;
}

type Attempt = { count: number; resetAt: number };

export type LoginRateLimiter = {
  allow(ip: string, now: number): boolean;
  /** Stored keys. allow() drops expired keys; this does not. */
  tracked(): number;
};

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
 * Client address for the limiter.
 *
 * `trustedProxyHops` is how many proxies we trust, including the socket
 * peer. 0 uses only the peer. 1 uses the rightmost forwarded hop (the
 * address the immediate proxy appended). 2 skips that hop too, so a CDN
 * in front of nginx is not the bucket for every user.
 */
export function clientIpForRateLimit(input: {
  peerAddress: string | null;
  forwardedFor: string | null;
  trustedProxyHops: number;
}): string {
  const peer = normalizePeerAddress(input.peerAddress);
  const hops = input.trustedProxyHops;
  if (!peer || hops <= 0) return peer ?? DIRECT_CLIENT_KEY;
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
        if (attempts.size >= LOGIN_RATE_MAX_CLIENTS) return false;
        attempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
        return true;
      }
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
