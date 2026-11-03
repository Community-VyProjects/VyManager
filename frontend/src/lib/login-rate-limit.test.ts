import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getIP } from "../../node_modules/@better-auth/core/dist/utils/ip.mjs";
import {
  CLIENT_IP_HEADER,
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_MAX_CLIENTS,
  LOGIN_RATE_WINDOW_MS,
  clientIpForRateLimit,
  createLoginRateLimiter,
  parseTrustedProxyIps,
  peerIsTrustedProxy,
  rateLimitAddress,
  trustedProxyEntries,
  trustedProxyHops,
} from "./login-rate-limit";

describe("trustedProxyHops", () => {
  it("treats unset, junk, and oversized counts as no trusted proxy", () => {
    assert.equal(trustedProxyHops(undefined), 0);
    assert.equal(trustedProxyHops(""), 0);
    assert.equal(trustedProxyHops("nope"), 0);
    assert.equal(trustedProxyHops("-1"), 0);
    assert.equal(trustedProxyHops("9"), 0);
    assert.equal(trustedProxyHops("1"), 1);
    assert.equal(trustedProxyHops(" 2 "), 2);
  });
});

describe("trusted proxy list", () => {
  it("accepts an IPv4 CIDR and rejects junk, /0, and empty tokens", () => {
    const trust = parseTrustedProxyIps("172.18.0.0/16, not-an-ip, 0.0.0.0/0, , 10.1.1.1");
    assert.equal(peerIsTrustedProxy("172.18.0.4", trust), true);
    assert.equal(peerIsTrustedProxy("172.19.0.4", trust), false);
    assert.equal(peerIsTrustedProxy("10.1.1.1", trust), true);
    assert.equal(peerIsTrustedProxy("203.0.113.9", trust), false);
    assert.deepEqual(
      new Set(trustedProxyEntries("10.1.1.1, nope, 0.0.0.0/0")),
      new Set(["::1", "10.1.1.1", "127.0.0.1"]),
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "172.18.0.4",
        forwardedFor: "9.9.9.9, 203.0.113.5",
        trustedProxyHops: 1,
        trustedProxyIps: "172.18.0.0/16",
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "203.0.113.9",
        forwardedFor: "9.9.9.9, 198.51.100.2",
        trustedProxyHops: 1,
        trustedProxyIps: "0.0.0.0/0, nope",
      }),
      "203.0.113.9",
    );
  });
});

describe("clientIpForRateLimit", () => {
  it("ignores forwarded headers when no proxy is trusted", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "203.0.113.10",
        forwardedFor: "1.1.1.1, 198.51.100.8",
        trustedProxyHops: 0,
      }),
      "203.0.113.10",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "::ffff:203.0.113.10",
        forwardedFor: "9.9.9.9",
        trustedProxyHops: 0,
      }),
      "203.0.113.10",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: null,
        forwardedFor: "1.1.1.1, 203.0.113.5",
        trustedProxyHops: 0,
        trustedProxyIps: "",
      }),
      null,
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: null,
        forwardedFor: "203.0.113.5",
        trustedProxyHops: 1,
        trustedProxyIps: "",
      }),
      null,
    );
  });

  it("ignores forwarded headers from a peer that is not a trusted proxy", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "203.0.113.10",
        forwardedFor: "1.1.1.1, 198.51.100.8",
        trustedProxyHops: 1,
        trustedProxyIps: "",
      }),
      "203.0.113.10",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "10.0.0.8",
        forwardedFor: "9.9.9.9, 203.0.113.5",
        trustedProxyHops: 1,
        trustedProxyIps: "10.0.0.8",
      }),
      "203.0.113.5",
    );
  });

  it("keeps a full IPv6 address for the header and buckets the limiter by /64", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "2001:db8:1:2::1",
        forwardedFor: "9.9.9.9",
        trustedProxyHops: 0,
        trustedProxyIps: "",
      }),
      "2001:db8:1:2::1",
    );
    assert.equal(
      rateLimitAddress("2001:db8:1:2::1"),
      rateLimitAddress("2001:db8:1:2::ffff"),
    );
    assert.notEqual(
      rateLimitAddress("2001:db8:1:2::1"),
      rateLimitAddress("2001:db8:1:3::1"),
    );
  });

  it("gives Better Auth a real IPv6 address, not the limiter bucket", () => {
    const options = {
      advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
    };
    const full = clientIpForRateLimit({
      peerAddress: "2001:db8:1:2::1",
      forwardedFor: "9.9.9.9",
      trustedProxyHops: 0,
      trustedProxyIps: "",
    });
    assert.ok(full);
    assert.notEqual(full, rateLimitAddress(full));
    assert.ok(getIP({ headers: { get: (name: string) => (name === CLIENT_IP_HEADER ? full : null) } }, options));
    assert.equal(
      getIP({ headers: { get: () => rateLimitAddress(full as string) } }, options),
      null,
    );
    assert.equal(getIP({ headers: { get: () => "127.0.0.1" } }, options), "127.0.0.1");
    assert.equal(
      getIP(
        { headers: { get: () => "127.0.0.1" } },
        { advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER], trustedProxies: ["127.0.0.1"] } } },
      ),
      null,
    );
  });

  it("uses the hop the immediate proxy appended, not the client prefix", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: "1.1.1.1, 203.0.113.5",
        trustedProxyHops: 1,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: "  1.1.1.1 ,  , 203.0.113.5  ",
        trustedProxyHops: 1,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: null,
        trustedProxyHops: 1,
      }),
      "127.0.0.1",
    );
  });

  it("does not put every user in the CDN bucket when two proxies append", () => {
    const proxies = "10.0.0.2";
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "10.0.0.2",
        forwardedFor: "9.9.9.9, 203.0.113.5, 198.51.100.2",
        trustedProxyHops: 2,
        trustedProxyIps: proxies,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "10.0.0.2",
        forwardedFor: "9.9.9.9, 203.0.113.5, 198.51.100.2",
        trustedProxyHops: 1,
        trustedProxyIps: proxies,
      }),
      "198.51.100.2",
    );
  });
});

describe("login rate limiter", () => {
  it("stops the 11th attempt in the window and still counts a different client", () => {
    const limiter = createLoginRateLimiter();
    const now = 1_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      assert.equal(limiter.allow("203.0.113.5", now), true);
    }
    assert.equal(limiter.allow("203.0.113.5", now), false);
    assert.equal(limiter.allow("203.0.113.6", now), true);
    assert.equal(limiter.tracked(), 2);
  });

  it("drops expired keys so the map cannot grow without bound", () => {
    const limiter = createLoginRateLimiter();
    const start = 5_000_000;
    for (let i = 0; i < 20; i++) {
      assert.equal(limiter.allow(`203.0.113.${i}`, start), true);
    }
    assert.equal(limiter.tracked(), 20);
    const later = start + LOGIN_RATE_WINDOW_MS + 1;
    assert.equal(limiter.allow("203.0.113.50", later), true);
    assert.equal(limiter.tracked(), 1);
  });

  it("evicts the oldest client instead of refusing a new one", () => {
    const limiter = createLoginRateLimiter();
    const now = 7_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      assert.equal(limiter.allow("client-0", now), true);
    }
    assert.equal(limiter.allow("client-0", now), false);
    for (let i = 1; i < LOGIN_RATE_MAX_CLIENTS; i++) {
      assert.equal(limiter.allow(`client-${i}`, now + 1), true);
    }
    assert.equal(limiter.tracked(), LOGIN_RATE_MAX_CLIENTS);
    assert.equal(limiter.allow("one-more", now + 2), true);
    assert.equal(limiter.tracked(), LOGIN_RATE_MAX_CLIENTS);
    assert.equal(limiter.allow("client-0", now + 2), true);
  });

  it("allows the same client again after the window, not at the exact reset", () => {
    const limiter = createLoginRateLimiter();
    const start = 9_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      assert.equal(limiter.allow("203.0.113.5", start), true);
    }
    assert.equal(limiter.allow("203.0.113.5", start + LOGIN_RATE_WINDOW_MS), false);
    assert.equal(limiter.allow("203.0.113.5", start + LOGIN_RATE_WINDOW_MS + 1), true);
    assert.equal(limiter.tracked(), 1);
  });
});
