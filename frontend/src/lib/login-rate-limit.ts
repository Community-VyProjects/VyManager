/**
 * Sign-in attempt cap, keyed by the address a trusted proxy appended.
 *
 * The documented nginx config sets X-Forwarded-For with
 * $proxy_add_x_forwarded_for. That keeps any address the client already
 * sent and appends the hop that connected to the proxy. Counting the
 * first hop lets a client rotate the header and never hit the cap.
 * X-Real-IP is used only when the proxy appended no hop.
 */

export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_WINDOW_MS = 60_000;

type Attempt = { count: number; resetAt: number };

export type LoginRateLimiter = {
  allow(ip: string, now: number): boolean;
  /** Stored keys. allow() drops expired keys; this does not. */
  tracked(): number;
};

export function clientIpFromProxyHeaders(
  forwardedFor: string | null,
  realIp: string | null,
): string {
  if (forwardedFor) {
    const hops = forwardedFor.split(",");
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = hops[i].trim();
      if (hop) return hop;
    }
  }
  const real = realIp?.trim();
  if (real) return real;
  return "unknown";
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
